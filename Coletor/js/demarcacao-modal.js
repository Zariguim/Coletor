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
        abBtn: document.getElementById('demarcacao-ab-btn'), // Novo botão
        choiceCloseBtn: document.getElementById('demarcacao-choice-close-btn'),
        descriptionCloseBtn: document.getElementById('demarcacao-description-close-btn'),
        saveDescriptionBtn: document.getElementById('save-demarcacao-btn'),
        descriptionInput: document.getElementById('demarcacao-description-input'),
        demarcacaoControls: document.getElementById('demarcacao-controls'),
        areaDisplay: document.getElementById('demarcacao-area'),
        finalizeBtn: document.getElementById('demarcacao-finalize-btn'),
        demarcacaoAbControls: document.getElementById('demarcacao-ab-controls'), // Controles A B
        pontoABtn: document.getElementById('demarcacao-ab-ponto-a-btn'),
        pontoBBtn: document.getElementById('demarcacao-ab-ponto-b-btn'),
        finalizeAbBtn: document.getElementById('demarcacao-ab-finalize-btn'),
    },

    // --- ESTADO ---
    state: {
        currentTalhao: null,
        demarcatedPoints: [],
        demarcationType: null, // 'auto', 'manual', 'ab'
        selectedSplitPolygon: null,
    },

    /**
     * Inicializa o módulo, adicionando os eventos.
     */
    init() {
        this.dom.choiceCloseBtn.addEventListener('click', () => this.closeChoiceModal());
        this.dom.descriptionCloseBtn.addEventListener('click', () => this.closeDescriptionModal());
        this.dom.autoBtn.addEventListener('click', () => this.startAutoDemarcation());
        this.dom.manualBtn.addEventListener('click', () => this.startManualDemarcation());
        this.dom.abBtn.addEventListener('click', () => this.startAbDemarcation());
        this.dom.finalizeBtn.addEventListener('click', () => this.finalizeAutoDemarcation());
        this.dom.saveDescriptionBtn.addEventListener('click', () => this.saveDemarcation());

        // Eventos para Demarcação A B
        this.dom.pontoABtn.addEventListener('click', () => this.handlePontoA());
        this.dom.pontoBBtn.addEventListener('click', () => this.handlePontoB());
        this.dom.finalizeAbBtn.addEventListener('click', () => this.finalizeAbDemarcation());
    },

    /**
     * Abre o modal de escolha (Automática/Manual/A B).
     * @param {object} talhao - O objeto de dados do talhão selecionado.
     */
    openChoiceModal(talhao) {
        this.state.currentTalhao = talhao;
        this.dom.choiceModal.classList.remove('hidden');
    },

    closeChoiceModal() {
        this.dom.choiceModal.classList.add('hidden');
    },

    startAutoDemarcation() {
        this.closeChoiceModal();
        this.state.demarcationType = 'auto';
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

    startManualDemarcation() {
        this.closeChoiceModal();
        this.state.demarcationType = 'manual';
        UI.setSyncStatus("Clique no mapa para adicionar pontos. Clique no primeiro ponto para finalizar.", 'syncing', false);
        MapManager.startManualDemarcation((points) => {
            this.finalizeManualDemarcation(points);
        }, () => {
            this.cancelDemarcation();
        });
    },

    startAbDemarcation() {
        this.closeChoiceModal();
        this.state.demarcationType = 'ab';
        MapManager.startAbDemarcation();
        this.dom.demarcacaoAbControls.classList.remove('hidden');
        this.dom.pontoBBtn.disabled = true;
        this.dom.finalizeAbBtn.classList.add('hidden');
        UI.setSyncStatus("Defina o Ponto A.", 'syncing', false);
    },

    handlePontoA() {
        MapManager.setAbPoint('A', (success) => {
            if (success) {
                this.dom.pontoABtn.disabled = true;
                this.dom.pontoBBtn.disabled = false;
                UI.setSyncStatus("Ponto A definido. Agora, defina o Ponto B.", 'syncing', false);
            }
        });
    },

    handlePontoB() {
        MapManager.setAbPoint('B', (success) => {
            if (success) {
                this.dom.pontoBBtn.disabled = true;
                UI.setSyncStatus("Ponto B definido. Calculando corte...", 'syncing', false);
                MapManager.slicePolygonByAbPoints((polygon) => {
                    if (polygon) {
                        this.state.selectedSplitPolygon = polygon;
                        this.dom.finalizeAbBtn.classList.remove('hidden');
                        UI.setSyncStatus("Corte realizado. Selecione a área no mapa e clique em Finalizar.", 'success');
                    } else {
                        // Reset se o corte falhar
                        this.cancelDemarcation();
                    }
                });
            }
        });
    },

    finalizeAbDemarcation() {
        if (MapManager.selectedSplitPolygon) {
            this.state.selectedSplitPolygon = MapManager.selectedSplitPolygon;
            this.dom.demarcacaoAbControls.classList.add('hidden');
            this.openDescriptionModal();
        } else {
            alert("Por favor, selecione uma das áreas divididas no mapa primeiro.");
        }
    },

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

    finalizeManualDemarcation(points) {
        this.demarcatedPoints = points;
        UI.setSyncStatus('', null);
        this.openDescriptionModal();
    },

    cancelDemarcation() {
        UI.setSyncStatus('', null);
        this.dom.demarcacaoControls.classList.add('hidden');
        this.dom.demarcacaoAbControls.classList.add('hidden');
        // CORREÇÃO: Reseta o estado dos botões A/B ao cancelar
        this.dom.pontoABtn.disabled = false;
        this.dom.pontoBBtn.disabled = true;
        this.state.currentTalhao = null;
        this.state.demarcationType = null;
        MapManager.cancelAbDemarcation(); // Limpa o estado no mapa
    },

    openDescriptionModal() {
        this.dom.descriptionModal.classList.remove('hidden');
        this.dom.descriptionInput.focus();
    },

    closeDescriptionModal() {
        this.dom.descriptionModal.classList.add('hidden');
        this.dom.descriptionInput.value = '';
        this.demarcatedPoints = [];
        this.state.selectedSplitPolygon = null;
         // CORREÇÃO: Reseta o estado dos botões A/B ao fechar o modal de descrição (após salvar ou cancelar)
        this.dom.pontoABtn.disabled = false;
        this.dom.pontoBBtn.disabled = true;
    },

    async saveDemarcation() {
        const description = this.dom.descriptionInput.value.trim();
        if (!description) {
            alert("Por favor, forneça uma descrição para a demarcação.");
            return;
        }

        if (!this.state.currentTalhao) {
            alert("Erro: Talhão não encontrado.");
            return;
        }

        try {
            let pointsToSave, areaInHectares;

            if (this.state.demarcationType === 'ab') {
                if (!this.state.selectedSplitPolygon) {
                     alert("Erro: Nenhum polígono selecionado da divisão.");
                     return;
                }
                const coords = this.state.selectedSplitPolygon.geometry.coordinates[0];
                
                // CORREÇÃO: Adiciona uma verificação para garantir que a geometria é válida antes de salvar
                if (!coords || coords.length < 4) { // Um polígono válido precisa de pelo menos 4 pontos (o último é igual ao primeiro)
                    alert("Erro: A área selecionada é inválida e não pode ser salva. Tente novamente.");
                    this.cancelDemarcation();
                    this.closeDescriptionModal();
                    return;
                }

                pointsToSave = coords.slice(0, -1).map(p => [p[1], p[0]]); 
                const areaEmMetros = turf.area(this.state.selectedSplitPolygon);
                areaInHectares = (areaEmMetros / 10000).toFixed(2);
            } else {
                if (this.demarcatedPoints.length === 0) {
                     alert("Erro: Dados da demarcação não encontrados.");
                     return;
                }
                pointsToSave = this.demarcatedPoints;
                const closedLoop = [...pointsToSave, pointsToSave[0]];
                const turfPoints = closedLoop.map(p => [p[1], p[0]]);
                const polygon = turf.polygon([turfPoints]);
                const areaEmMetros = turf.area(polygon);
                areaInHectares = (areaEmMetros / 10000).toFixed(2);
            }
            
            await DataManager.saveDemarcation(this.state.currentTalhao, pointsToSave, description, areaInHectares);
            
            UI.setSyncStatus("Demarcação salva com sucesso!", 'success');
            this.closeDescriptionModal();
            
            window.dispatchEvent(new Event('monitoringUpdated'));
            MapManager.cancelAbDemarcation(); // Limpa a demarcação A B do mapa

        } catch (error) {
            console.error("Erro ao salvar demarcação:", error);
            alert("Ocorreu um erro ao salvar a demarcação.");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    DemarcacaoModal.init();
});