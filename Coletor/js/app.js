// ===================================================================================
//  PONTO DE ENTRADA E ORQUESTRADOR PRINCIPAL DA APLIÇÃO
// ===================================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => console.log('Service Worker registrado com sucesso:', registration.scope))
                    .catch(error => console.log('Falha ao registrar o Service Worker:', error));
            });
        }
    }

    async function initializeApp() {
        UI.init();
        MapManager.init(UI.dom.mapContainer);
        AfericaoModal.init();
        CvModal.init();
        PercaColheitaModal.init();
        EstimativaProdutividadeModal.init();
        RecomendacaoModal.init();
        RelatorioModal.init();
        await DataManager.loadData(); // Espera o carregamento inicial dos dados
        
        registerServiceWorker();
        UI.updateFinalizeButtonVisibility();
        MapManager.drawMonitoringPins(); 

        // --- EVENT LISTENERS ---

        UI.dom.fazendaSelect.addEventListener('change', (e) => {
            const selectedFazenda = e.target.value;
            MapManager.loadFazendaOnMap(selectedFazenda);
            if (selectedFazenda) {
                e.target.classList.remove('select-placeholder');
                // Exibe o histórico para a fazenda selecionada, mas sem um talhão específico ainda
                UI.displayHistory(null, selectedFazenda, null);
            } else {
                e.target.classList.add('select-placeholder');
                UI.hideTalhaoInfo(); // Limpa o painel se nenhuma fazenda for selecionada
            }
        });

        UI.dom.locateBtn.addEventListener('click', () => MapManager.toggleRealtimeLocation());
        UI.dom.downloadCsvBtn.addEventListener('click', () => DataManager.finalizeAllMonitoring());
        
        UI.dom.mainFabBtn.onclick = () => {
            UI.dom.fabContainer.classList.toggle('open');
        };
        
        UI.dom.alvoBtn.addEventListener('click', () => {
            if (!MapManager.selectedLayer || !MapManager.selectedLayer.talhaoData) return;
            UI.dom.fabContainer.classList.remove('open');
            const talhao = MapManager.selectedLayer.talhaoData;
            
            if (MapManager.isLocating && MapManager.isUserInsideSelectedTalhao()) {
                // CORREÇÃO: Garante o contexto correto do 'this' ao passar a função
                AlvoModal.open(talhao.id, MapManager.getCurrentUserLocation.bind(MapManager));
            } else {
                const alvoCallback = (talhaoData, locationProvider) => {
                    AlvoModal.open(talhaoData.id, locationProvider);
                };
                MapManager.startManualPlacement(alvoCallback);
            }
        });

        UI.dom.anotacaoBtn.addEventListener('click', () => {
            if (!MapManager.selectedLayer || !MapManager.selectedLayer.talhaoData) return;
            UI.dom.fabContainer.classList.remove('open');
            const talhao = MapManager.selectedLayer.talhaoData;
            
            if (MapManager.isLocating && MapManager.isUserInsideSelectedTalhao()) {
                // CORREÇÃO: Garante o contexto correto do 'this' ao passar a função
                AnotacaoModal.open(talhao.id, MapManager.getCurrentUserLocation.bind(MapManager));
            } else {
                const anotacaoCallback = (talhaoData, locationProvider) => {
                    AnotacaoModal.open(talhaoData.id, locationProvider);
                };
                MapManager.startManualPlacement(anotacaoCallback);
            }
        });

        UI.dom.demarcacaoBtn.addEventListener('click', () => {
            if (!MapManager.selectedLayer || !MapManager.selectedLayer.talhaoData) {
                alert("Selecione um talhão para iniciar a demarcação.");
                return;
            }
            UI.dom.fabContainer.classList.remove('open');
            const talhao = MapManager.selectedLayer.talhaoData;
            DemarcacaoModal.openChoiceModal(talhao);
        });

        UI.dom.afericaoBtn.addEventListener('click', () => {
            if (!MapManager.selectedLayer || !MapManager.selectedLayer.talhaoData) {
                alert("Selecione um talhão para iniciar uma aferição.");
                return;
            }
            UI.dom.fabContainer.classList.remove('open');
            const talhao = MapManager.selectedLayer.talhaoData;
            AfericaoModal.openChoiceModal(talhao);
        });
        
        UI.dom.recomendacaoBtn.addEventListener('click', () => {
            const selectedFazenda = UI.dom.fazendaSelect.value;
            if (!selectedFazenda) {
                alert("Selecione uma fazenda para criar uma recomendação.");
                return;
            }
            
            const talhoesDaFazenda = MapManager.kmlDatabase
                .filter(t => (t.Fazenda || 'Sem Fazenda') === selectedFazenda)
                .map(t => {
                    const layer = MapManager.kmlLayersGroup.getLayers().find(l => l.talhaoData.id === t.id);
                    return { ...t, layer };
                });

            if (talhoesDaFazenda.length === 0) {
                 alert("Nenhum talhão carregado para esta fazenda.");
                 return;
            }

            UI.dom.fabContainer.classList.remove('open');
            RecomendacaoModal.open(talhoesDaFazenda);
        });


        MapManager.kmlLayersGroup.on('click', (e) => {
            if (e.layer.talhaoData) {
                L.DomEvent.stopPropagation(e);
                MapManager.showTalhaoInfo(e.layer);
            }
        });

        MapManager.map.on('click', () => {
            if (MapManager.isDrawing || MapManager.isAbDemarcating) {
                return;
            }
            MapManager.hideTalhaoInfo();
        });
        
        MapManager.map.on('locationerror', e => {
            UI.setStatus(true, e.message, false);
            setTimeout(() => UI.setStatus(false), 3000);
            MapManager.isLocating = false;
            UI.toggleLocateButton(false);
        });

        const syncAll = () => {
            DataManager.syncAll();
        };

        window.addEventListener('online', syncAll);
        window.addEventListener('monitoringUpdated', () => {
            UI.updateFinalizeButtonVisibility();
            MapManager.drawMonitoringPins();
            if(UI.dom.infoModal.classList.contains('show') && MapManager.selectedLayer) {
                const talhao = MapManager.selectedLayer.talhaoData;
                UI.displayHistory(talhao.nome_talhao, talhao.Fazenda || 'Sem Fazenda', talhao.id);
            }
        });
        
        setInterval(syncAll, 30000);
        
        MapManager.toggleRealtimeLocation();
    }

    initializeApp();
});