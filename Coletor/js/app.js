// ===================================================================================
//  PONTO DE ENTRADA E ORQUESTRADOR PRINCIPAL DA APLICAÇÃO
// ===================================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    /**
     * Registra o Service Worker para funcionalidades offline.
     */
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => console.log('Service Worker registrado com sucesso:', registration.scope))
                    .catch(error => console.log('Falha ao registrar o Service Worker:', error));
            });
        }
    }

    /**
     * Inicializa todos os módulos e configura os eventos da aplicação.
     */
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

        UI.dom.closeModalBtn.addEventListener('click', () => MapManager.hideTalhaoInfo());
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
                MapManager.startManualPlacement();
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

        window.addEventListener('online', () => DataManager.syncPendingCsvs());
        window.addEventListener('monitoringUpdated', () => {
            UI.updateFinalizeButtonVisibility();
            MapManager.drawMonitoringPins();
        });
        
        // Sincroniza periodicamente
        setInterval(() => DataManager.syncPendingCsvs(), 30000);
        
        // Inicia a localização automaticamente
        MapManager.toggleRealtimeLocation();
    }

    // --- INICIALIZAÇÃO ---
    initializeApp();
});