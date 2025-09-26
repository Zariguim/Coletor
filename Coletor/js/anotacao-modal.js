// ===================================================================================
//  MÓDULO PARA GERENCIAR O MODAL DE ANOTAÇÕES
// ===================================================================================

const AnotacaoModal = {
    // ... (código do AnotacaoModal) ...
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
            await saveAnotacao(this.state.currentTalhaoId, newRecord);

            const talhaoData = MapManager.kmlDatabase.find(t => t.id.toString() === this.state.currentTalhaoId.toString());
            if (talhaoData) {
                const anotacaoToSync = {
                    fazenda: talhaoData.Fazenda || 'Sem Fazenda',
                    talhao: talhaoData.nome_talhao,
                    data: newRecord.data,
                    tag: 'Anotação',
                    lat: lat,
                    lng: lng,
                    texto: anotacao,
                    foto: this.state.foto,
                    localId: newRecord.id,
                    talhaoId: this.state.currentTalhaoId
                };
                await savePendingAnotacao(anotacaoToSync);
            }

            window.dispatchEvent(new Event('monitoringUpdated'));

            alert("Anotação salva com sucesso!");
            this.close();
            
            DataManager.syncAll();

        } catch (error) {
            console.error("Erro ao salvar anotação:", error);
            alert("Ocorreu um erro ao salvar a anotação.");
        }
    },
};

// A LINHA ABAIXO FOI REMOVIDA
// AnotacaoModal.init();