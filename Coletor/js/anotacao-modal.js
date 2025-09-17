// ===================================================================================
//  MÓDULO PARA GERENCIAR O MODAL DE ANOTAÇÕES
// ===================================================================================

const AnotacaoModal = {
    // --- ELEMENTOS DO DOM ---
    dom: {
        modal: document.getElementById('anotacao-modal'),
        closeBtn: document.getElementById('anotacao-modal-close-btn'),
        anotacaoText: document.getElementById('anotacao-text'),
        saveBtn: document.getElementById('save-anotacao-btn'),
        fotoInput: document.getElementById('anotacao-foto-input'),
        fotoPreviewContainer: document.getElementById('anotacao-foto-preview-container'),
        fotoPreview: document.getElementById('anotacao-foto-preview'),
        removeFotoBtn: document.getElementById('remove-foto-btn'),
    },

    // --- ESTADO ---
    state: {
        currentTalhaoId: null,
        getCurrentLocation: null,
        foto: null, // Armazena a imagem como base64
    },

    /**
     * Inicializa o modal, adicionando os eventos.
     */
    init() {
        this.dom.closeBtn.addEventListener('click', () => this.close());
        this.dom.saveBtn.addEventListener('click', () => this.save());
        this.dom.fotoInput.addEventListener('change', (e) => this.handleFotoSelect(e));
        this.dom.removeFotoBtn.addEventListener('click', () => this.removeFoto());
    },

    /**
     * Abre o modal.
     * @param {string} talhaoId - O ID do talhão.
     * @param {function} getCurrentLocationFn - Função para obter a localização atual.
     */
    open(talhaoId, getCurrentLocationFn) {
        this.state.currentTalhaoId = talhaoId;
        this.state.getCurrentLocation = getCurrentLocationFn;
        this.dom.modal.classList.remove('hidden');
        this.dom.anotacaoText.focus();
    },

    /**
     * Fecha o modal e limpa o estado.
     */
    close() {
        this.dom.modal.classList.add('hidden');
        this.dom.anotacaoText.value = '';
        this.removeFoto();
        this.state.currentTalhaoId = null;
        this.state.getCurrentLocation = null;
    },

    /**
     * Lida com a seleção de uma foto, redimensiona e mostra a pré-visualização.
     */
    handleFotoSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                this.state.foto = canvas.toDataURL('image/jpeg', 0.8);
                this.dom.fotoPreview.src = this.state.foto;
                this.dom.fotoPreviewContainer.classList.remove('hidden');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    /**
     * Remove a foto selecionada.
     */
    removeFoto() {
        this.state.foto = null;
        this.dom.fotoInput.value = '';
        this.dom.fotoPreview.src = '#';
        this.dom.fotoPreviewContainer.classList.add('hidden');
    },

    /**
     * Salva a anotação (com ou sem foto) no IndexedDB e a coloca na fila para sincronização.
     */
    async save() {
        if (!this.state.currentTalhaoId) return;

        const anotacao = this.dom.anotacaoText.value.trim();
        if (!anotacao && !this.state.foto) {
            alert("Por favor, escreva uma anotação ou adicione uma foto antes de salvar.");
            return;
        }

        if (!this.state.getCurrentLocation) {
            alert("Erro: Função de geolocalização não foi inicializada.");
            return;
        }
        const location = this.state.getCurrentLocation();
        if (!location) {
            alert("Localização do usuário não encontrada. Ative a função 'Localizar' ou posicione o pino no mapa.");
            return;
        }

        const { lat, lng } = location;

        const newRecord = {
            id: `anot_${new Date().getTime()}`,
            lat: lat,
            lng: lng,
            texto: anotacao,
            foto: this.state.foto,
            data: new Date().toISOString()
        };

        try {
            // 1. Salva a anotação completa (com foto em base64) no banco de dados local
            await saveAnotacao(this.state.currentTalhaoId, newRecord);

            // 2. Prepara os dados e salva na fila de sincronização
            const talhaoData = MapManager.kmlDatabase.find(t => t.id.toString() === this.state.currentTalhaoId.toString());
            if (talhaoData) {
                // Prepara a anotação para a fila, incluindo a imagem em base64
                const anotacaoToSync = {
                    fazenda: talhaoData.Fazenda || 'Sem Fazenda',
                    talhao: talhaoData.nome_talhao,
                    data: newRecord.data,
                    tag: 'Anotação',
                    lat: lat,
                    lng: lng,
                    texto: anotacao,
                    foto: this.state.foto, // Envia a foto junto
                    localId: newRecord.id,
                    talhaoId: this.state.currentTalhaoId
                };
                await savePendingAnotacao(anotacaoToSync);
            }

            // 3. Dispara um evento para notificar a aplicação e atualizar a UI
            window.dispatchEvent(new Event('monitoringUpdated'));

            alert("Anotação salva com sucesso!");
            this.close();
            
            // 4. Inicia a sincronização
            DataManager.syncAll();

        } catch (error) {
            console.error("Erro ao salvar anotação:", error);
            alert("Ocorreu um erro ao salvar a anotação.");
        }
    },
};

AnotacaoModal.init();