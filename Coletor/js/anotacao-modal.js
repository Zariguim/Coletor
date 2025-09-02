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
    },

    // --- ESTADO ---
    state: {
        currentTalhaoId: null,
        getCurrentLocation: null,
    },

    /**
     * Inicializa o modal, adicionando os eventos.
     */
    init() {
        this.dom.closeBtn.addEventListener('click', () => this.close());
        this.dom.saveBtn.addEventListener('click', () => this.save());
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
     * Fecha o modal.
     */
    close() {
        this.dom.modal.classList.add('hidden');
        this.dom.anotacaoText.value = ''; // Limpa o campo de texto
        this.state.currentTalhaoId = null;
        this.state.getCurrentLocation = null;
    },

    /**
     * Salva a anotação no localStorage e a coloca na fila para sincronização.
     */
    async save() {
        if (!this.state.currentTalhaoId) return;

        const anotacao = this.dom.anotacaoText.value.trim();
        if (!anotacao) {
            alert("Por favor, escreva uma anotação antes de salvar.");
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
            data: new Date().toISOString()
        };

        try {
            // 1. Salva a anotação no banco de dados local (IndexedDB)
            await saveAnotacao(this.state.currentTalhaoId, newRecord);

            // 2. Prepara os dados e salva na fila de sincronização
            const talhaoData = MapManager.kmlDatabase.find(t => t.id.toString() === this.state.currentTalhaoId.toString());
            if (talhaoData) {
                const csvContent = `latitude,longitude,anotacao\n${lat},${lng},"${anotacao.replace(/"/g, '""')}"`;
                const anotacaoToSync = {
                    fazenda: talhaoData.Fazenda || 'Sem Fazenda',
                    talhao: talhaoData.nome_talhao,
                    data: newRecord.data,
                    tag: 'Anotação', // Tag conforme solicitado
                    csv: csvContent
                };
                await savePendingAnotacao(anotacaoToSync);
            }

            // 3. Dispara um evento para notificar a aplicação
            const event = new Event('monitoringUpdated');
            window.dispatchEvent(event);

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