// ===================================================================================
//  MÓDULO PARA GERENCIAR A DEMARCAÇÃO DE ÁREAS
// ===================================================================================

const DemarcacaoModal = {
    // ... (código do DemarcacaoModal) ...
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
                
                if (!coords || coords.length < 4) {
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
            MapManager.cancelAbDemarcation();

        } catch (error) {
            console.error("Erro ao salvar demarcação:", error);
            alert("Ocorreu um erro ao salvar a demarcação.");
        }
    }
};

// A LINHA ABAIXO FOI REMOVIDA
// document.addEventListener('DOMContentLoaded', () => { DemarcacaoModal.init(); });