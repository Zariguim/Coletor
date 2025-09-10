// ===================================================================================
//  MÓDULO PARA GERENCIAR A DEMARCAÇÃO DE ÁREAS
// ===================================================================================

const DemarcacaoModal = {
    // --- ELEMENTOS DO DOM ---
    dom: {
        choiceModal: document.getElementById('demarcacao-choice-modal'),
        descriptionModal: document.getElementById('demarcacao-description-modal'),
        autoBtn: document.getElementById('demarcacao-auto-btn'),
        manualBtn: document.getElementById('demarcacao-manual-btn'),
        choiceCloseBtn: document.getElementById('demarcacao-choice-close-btn'),
        descriptionCloseBtn: document.getElementById('demarcacao-description-close-btn'),
        saveDescriptionBtn: document.getElementById('save-demarcacao-btn'),
        descriptionInput: document.getElementById('demarcacao-description-input'),
        demarcacaoControls: document.getElementById('demarcacao-controls'),
        areaDisplay: document.getElementById('demarcacao-area'),
        finalizeBtn: document.getElementById('demarcacao-finalize-btn'),
    },

    // --- ESTADO ---
    state: {
        currentTalhao: null,
        demarcatedPoints: [],
    },

    /**
     * Inicializa o módulo, adicionando os eventos.
     */
    init() {
        this.dom.choiceCloseBtn.addEventListener('click', () => this.closeChoiceModal());
        this.dom.descriptionCloseBtn.addEventListener('click', () => this.closeDescriptionModal());
        this.dom.autoBtn.addEventListener('click', () => this.startAutoDemarcation());
        this.dom.manualBtn.addEventListener('click', () => this.startManualDemarcation());
        this.dom.finalizeBtn.addEventListener('click', () => this.finalizeAutoDemarcation());
        this.dom.saveDescriptionBtn.addEventListener('click', () => this.saveDemarcation());
    },

    /**
     * Abre o modal de escolha (Automática/Manual).
     * @param {object} talhao - O objeto de dados do talhão selecionado.
     */
    openChoiceModal(talhao) {
        this.state.currentTalhao = talhao;
        this.dom.choiceModal.classList.remove('hidden');
    },

    closeChoiceModal() {
        this.dom.choiceModal.classList.add('hidden');
    },

    /**
     * Inicia o processo de demarcação automática.
     */
    startAutoDemarcation() {
        this.closeChoiceModal();
        if (!MapManager.isLocating) {
            alert("Por favor, ative a localização em tempo real (botão de pino) para iniciar a demarcação automática.");
            this.state.currentTalhao = null;
            return;
        }
        MapManager.startAutomaticDemarcation((area) => {
            this.dom.areaDisplay.textContent = `${area.toFixed(4)} ha`;
        });
        this.dom.demarcacaoControls.classList.remove('hidden');
    },

    /**
     * Inicia o processo de demarcação manual.
     */
    startManualDemarcation() {
        this.closeChoiceModal();
        UI.setSyncStatus("Clique no mapa para adicionar pontos. Clique no primeiro ponto para finalizar.", 'syncing', false);
        MapManager.startManualDemarcation((points) => {
            // Callback para quando o desenho for finalizado
            this.finalizeManualDemarcation(points);
        }, () => {
            // Callback para cancelar
            this.cancelDemarcation();
        });
    },

    /**
     * Finaliza a coleta de pontos da demarcação automática.
     */
    finalizeAutoDemarcation() {
        this.demarcatedPoints = MapManager.stopAutomaticDemarcation();
        if (this.demarcatedPoints.length < 3) {
            alert("A demarcação precisa de pelo menos 3 pontos para formar uma área.");
            this.cancelDemarcation();
            return;
        }
        this.dom.demarcacaoControls.classList.add('hidden');
        this.openDescriptionModal();
    },

    /**
     * Finaliza a coleta de pontos da demarcação manual.
     */
    finalizeManualDemarcation(points) {
        this.demarcatedPoints = points;
        UI.setSyncStatus('', null);
        this.openDescriptionModal();
    },

    cancelDemarcation() {
        UI.setSyncStatus('', null);
        this.dom.demarcacaoControls.classList.add('hidden');
        this.state.currentTalhao = null;
    },

    openDescriptionModal() {
        this.dom.descriptionModal.classList.remove('hidden');
        this.dom.descriptionInput.focus();
    },

    closeDescriptionModal() {
        this.dom.descriptionModal.classList.add('hidden');
        this.dom.descriptionInput.value = '';
        this.demarcatedPoints = [];
        this.state.currentTalhao = null;
    },

    /**
     * Salva a demarcação finalizada.
     */
    async saveDemarcation() {
        const description = this.dom.descriptionInput.value.trim();
        if (!description) {
            alert("Por favor, forneça uma descrição para a demarcação.");
            return;
        }

        if (!this.state.currentTalhao || this.demarcatedPoints.length === 0) {
            alert("Erro: Dados da demarcação não encontrados.");
            return;
        }

        try {
            const closedLoop = [...this.demarcatedPoints, this.demarcatedPoints[0]];
            const turfPoints = closedLoop.map(p => [p[1], p[0]]); // Turf precisa de [lng, lat]
            const polygon = turf.polygon([turfPoints]);
            const areaEmMetros = turf.area(polygon);
            const areaEmHectares = (areaEmMetros / 10000).toFixed(2);
            
            await DataManager.saveDemarcation(this.state.currentTalhao, this.demarcatedPoints, description, areaEmHectares);
            
            UI.setSyncStatus("Demarcação salva com sucesso!", 'success');
            this.closeDescriptionModal();
            
            // Dispara o evento após um curto intervalo para garantir que o IndexedDB finalize a transação.
            setTimeout(() => window.dispatchEvent(new Event('monitoringUpdated')), 100);

        } catch (error) {
            console.error("Erro ao salvar demarcação:", error);
            alert("Ocorreu um erro ao salvar a demarcação.");
        }
    }
};

// Inicializa o módulo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    DemarcacaoModal.init();
});