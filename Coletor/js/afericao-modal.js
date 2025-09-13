// ===================================================================================
//  MÓDULO PARA GERENCIAR O MODAL DE AFERIÇÕES
// ===================================================================================

const AfericaoModal = {
    // --- ELEMENTOS DO DOM ---
    dom: {
        choiceModal: document.getElementById('afericao-choice-modal'),
        choiceCloseBtn: document.getElementById('afericao-choice-close-btn'),
        standPlantasBtn: document.getElementById('stand-plantas-btn'),
        afericaoPlantioBtn: document.getElementById('afericao-plantio-btn'),

        standModal: document.getElementById('stand-plantas-modal'),
        standCloseBtn: document.getElementById('stand-plantas-close-btn'),
        standSaveBtn: document.getElementById('save-stand-btn'),
        espacamentoInput: document.getElementById('espacamento-input'),
        metrosAvaliadosInput: document.getElementById('metros-avaliados-input'),
        plantasEncontradasInput: document.getElementById('plantas-encontradas-input'),
        addMedicaoBtn: document.getElementById('add-medicao-btn'),
        medicoesList: document.getElementById('medicoes-list'),
        mediaResult: document.getElementById('media-plantas-result'),
    },

    // --- ESTADO ---
    state: {
        currentTalhao: null,
        medicoes: [], 
    },

    /**
     * Inicializa o módulo, adicionando os eventos.
     */
    init() {
        // Modal de Escolha
        this.dom.choiceCloseBtn.addEventListener('click', () => this.closeChoiceModal(true));
        this.dom.standPlantasBtn.addEventListener('click', () => this.openStandModal());
        this.dom.afericaoPlantioBtn.addEventListener('click', () => this.openPlantioModal());

        // Modal do Stand de Plantas
        this.dom.standCloseBtn.addEventListener('click', () => this.closeStandModal());
        this.dom.addMedicaoBtn.addEventListener('click', () => this.addMedicao());
        this.dom.standSaveBtn.addEventListener('click', () => this.saveStand());
    },

    openChoiceModal(talhao) {
        this.state.currentTalhao = talhao;
        this.dom.choiceModal.classList.remove('hidden');
    },

    closeChoiceModal(clearTalhao = false) {
        this.dom.choiceModal.classList.add('hidden');
        if (clearTalhao) {
            this.state.currentTalhao = null;
        }
    },
    
    // ===================================================================================
    //  STAND DE PLANTAS
    // ===================================================================================

    openStandModal() {
        this.closeChoiceModal(false);
        this.dom.standModal.classList.remove('hidden');
        this.dom.espacamentoInput.focus();
    },

    closeStandModal() {
        this.dom.standModal.classList.add('hidden');
        this.state.medicoes = [];
        this.state.currentTalhao = null;
        this.dom.espacamentoInput.value = '';
        this.dom.metrosAvaliadosInput.value = '';
        this.dom.plantasEncontradasInput.value = '';
        this.renderMedicoes();
    },

    addMedicao() {
        const espacamento = parseFloat(this.dom.espacamentoInput.value.replace(',', '.'));
        const metrosAvaliados = parseFloat(this.dom.metrosAvaliadosInput.value.replace(',', '.'));
        const plantasEncontradas = parseInt(this.dom.plantasEncontradasInput.value);

        if (isNaN(espacamento) || espacamento <= 0) { alert("Informe um espaçamento válido."); return; }
        if (isNaN(metrosAvaliados) || metrosAvaliados <= 0) { alert("Informe metros avaliados válidos."); return; }
        if (isNaN(plantasEncontradas) || plantasEncontradas < 0) { alert("Informe um número de plantas válido."); return; }

        const metrosLinearesPorHectare = 10000 / espacamento;
        const plantasPorMetro = plantasEncontradas / metrosAvaliados;
        const plantasPorHectare = plantasPorMetro * metrosLinearesPorHectare;

        this.state.medicoes.push(plantasPorHectare);
        this.renderMedicoes();

        this.dom.plantasEncontradasInput.value = '';
        this.dom.plantasEncontradasInput.focus();
    },
    
    removeMedicao(index) {
        this.state.medicoes.splice(index, 1);
        this.renderMedicoes();
    },

    renderMedicoes() {
        this.dom.medicoesList.innerHTML = '';
        if (this.state.medicoes.length === 0) {
            this.dom.medicoesList.innerHTML = `<p class="text-center text-gray-500">Nenhuma medição adicionada.</p>`;
            this.dom.mediaResult.textContent = '0';
            this.dom.standSaveBtn.disabled = true;
            return;
        }

        this.state.medicoes.forEach((medicao, index) => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center bg-gray-100 p-2 rounded';
            item.innerHTML = `
                <span>Medição ${index + 1}: ${Math.round(medicao).toLocaleString('pt-BR')} plantas/ha</span>
                <button data-index="${index}" class="remove-medicao-btn text-red-500 font-bold">&times;</button>
            `;
            this.dom.medicoesList.appendChild(item);
        });
        
        this.dom.medicoesList.querySelectorAll('.remove-medicao-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.removeMedicao(parseInt(e.target.dataset.index)));
        });

        const soma = this.state.medicoes.reduce((acc, curr) => acc + curr, 0);
        const media = soma / this.state.medicoes.length;
        this.dom.mediaResult.textContent = Math.round(media).toLocaleString('pt-BR');
        this.dom.standSaveBtn.disabled = false;
    },

    async saveStand() {
        if (this.state.medicoes.length === 0 || !this.state.currentTalhao) {
            alert("Adicione medições ou verifique o talhão selecionado.");
            return;
        }

        const soma = this.state.medicoes.reduce((acc, curr) => acc + curr, 0);
        const media = Math.round(soma / this.state.medicoes.length);
        const espacamento = parseFloat(this.dom.espacamentoInput.value.replace(',', '.'));
        const metrosAvaliados = parseFloat(this.dom.metrosAvaliadosInput.value.replace(',', '.'));
        const numeroDeAmostras = this.state.medicoes.length;
        
        const header = 'espacamento_m,metros_avaliados_amostra,numero_amostras,plantas_por_ha';
        const row = `${espacamento},${metrosAvaliados},${numeroDeAmostras},${media}`;
        const csvContent = `${header}\n${row}`;

        const recordToSync = {
            fazenda: this.state.currentTalhao.Fazenda || 'Sem Fazenda',
            talhao: this.state.currentTalhao.nome_talhao,
            data: new Date().toISOString(),
            tag: 'População',
            csv: csvContent
        };

        try {
            await savePendingCsv(recordToSync);
            UI.setSyncStatus("Aferição de população salva com sucesso!", 'success');
            window.dispatchEvent(new Event('monitoringUpdated'));
            DataManager.syncAll();
            this.closeStandModal();
        } catch (error) {
            console.error("Erro ao salvar aferição de população:", error);
            alert("Ocorreu um erro ao salvar a aferição.");
        }
    },

    // ===================================================================================
    //  AFERIÇÃO DE PLANTIO (CV) - CHAMADA
    // ===================================================================================
    
    openPlantioModal() {
        this.closeChoiceModal(false);
        // A lógica agora está no CvModal
        CvModal.open(this.state.currentTalhao);
    },
};