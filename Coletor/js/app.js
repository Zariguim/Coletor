// ===================================================================================
//  PONTO DE ENTRADA E ORQUESTRADOR PRINCIPAL DA APLICAÇÃO
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

    function initializeApp() {
        UI.init();
        MapManager.init(UI.dom.mapContainer);
        DataManager.loadData();
        
        registerServiceWorker();
        UI.updateFinalizeButtonVisibility();
        MapManager.drawMonitoringPins(); 

        // --- EVENT LISTENERS ---

        UI.dom.fazendaSelect.addEventListener('change', (e) => {
            MapManager.loadFazendaOnMap(e.target.value);
            if (e.target.value) {
                e.target.classList.remove('select-placeholder');
            } else {
                e.target.classList.add('select-placeholder');
            }
        });

        UI.dom.locateBtn.addEventListener('click', () => MapManager.toggleRealtimeLocation());
        UI.dom.downloadCsvBtn.addEventListener('click', () => DataManager.finalizeAllMonitoring());
        
        UI.dom.mainFabBtn.onclick = () => {
            UI.dom.fabContainer.classList.toggle('open');
        };
        
        UI.dom.alvoBtn.addEventListener('click', () => {
            if (!MapManager.selectedLayer || !MapManager.selectedLayer.talhaoData) return;
            const talhao = MapManager.selectedLayer.talhaoData;
            
            if (MapManager.isLocating && MapManager.isUserInsideSelectedTalhao()) {
                AlvoModal.open(talhao.id, MapManager.getCurrentUserLocation);
            } else {
                const alvoCallback = (talhaoData, locationProvider) => {
                    AlvoModal.open(talhaoData.id, locationProvider);
                };
                MapManager.startManualPlacement(alvoCallback);
            }
        });

        UI.dom.anotacaoBtn.addEventListener('click', () => {
            if (!MapManager.selectedLayer || !MapManager.selectedLayer.talhaoData) return;
            const talhao = MapManager.selectedLayer.talhaoData;
            
            if (MapManager.isLocating && MapManager.isUserInsideSelectedTalhao()) {
                AnotacaoModal.open(talhao.id, MapManager.getCurrentUserLocation);
            } else {
                const anotacaoCallback = (talhaoData, locationProvider) => {
                    AnotacaoModal.open(talhaoData.id, locationProvider);
                };
                MapManager.startManualPlacement(anotacaoCallback);
            }
        });


        MapManager.kmlLayersGroup.on('click', (e) => {
            if (e.layer.talhaoData) {
                L.DomEvent.stopPropagation(e);
                MapManager.showTalhaoInfo(e.layer);
            }
        });

        MapManager.map.on('click', () => {
            MapManager.hideTalhaoInfo();
        });
        
        MapManager.map.on('locationerror', e => {
            UI.setStatus(true, e.message, false);
            setTimeout(() => UI.setStatus(false), 3000);
            MapManager.isLocating = false;
            UI.toggleLocateButton(false);
        });

        // ATUALIZADO: Agora chama a função geral de sincronização
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
        
        setInterval(syncAll, 30000); // Sincroniza tudo periodicamente
        
        MapManager.toggleRealtimeLocation();
    }

    // --- INICIALIZAÇÃO ---
    initializeApp();
});