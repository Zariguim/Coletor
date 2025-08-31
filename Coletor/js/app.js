// ===================================================================================
//  LÓGICA PRINCIPAL DA APLICAÇÃO (ATUALIZADA E CORRIGIDA)
// ===================================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // --- ELEMENTOS DO DOM ---
    const dom = {
        fazendaSelect: document.getElementById('fazendaSelect'),
        mapContainer: document.getElementById('map'),
        statusOverlay: document.getElementById('status-overlay'),
        statusText: document.getElementById('status-text'),
        spinner: document.getElementById('spinner'),
        syncStatusBar: document.getElementById('sync-status-bar'),
        syncStatusText: document.getElementById('sync-status-text'),
        syncProgressBarContainer: document.getElementById('sync-progress-bar-container'),
        syncProgressBar: document.getElementById('sync-progress-bar'),
        infoModal: document.getElementById('info-modal'),
        talhaoNome: document.getElementById('talhao-nome'),
        talhaoHectares: document.getElementById('talhao-hectares'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        locateBtn: document.getElementById('locate-btn'),
        fabContainer: document.getElementById('fab-container'),
        mainFabBtn: document.getElementById('main-fab-btn'),
        alvoBtn: document.getElementById('alvo-btn'),
        downloadCsvBtn: document.getElementById('download-csv-btn'),
    };

    // --- ESTADO DA APLICAÇÃO ---
    let map = null;
    let kmlLayersGroup = null;
    let kmlDatabase = [];
    let selectedLayer = null;
    let userLocationMarker = null;
    let isLocating = false;
    let placementMarker = null;
    let initialLocationSet = false;
    let isSyncing = false;

    const mainFabOriginalIcon = dom.mainFabBtn.innerHTML;

    // --- ESTILOS ---
    const defaultStyle = { color: '#3388ff', weight: 2, fillOpacity: 0.2 };
    const selectedStyle = { fillColor: '#fef08a', color: '#ca8a04', weight: 4, fillOpacity: 0.7 };

    // --- FUNÇÕES DE LÓGICA ---

    function getCurrentUserLocation() {
        return userLocationMarker ? userLocationMarker.getLatLng() : null;
    }

    function isUserInsideSelectedTalhao() {
        if (!isLocating || !userLocationMarker || !selectedLayer) {
            return false;
        }
        const userLatLng = userLocationMarker.getLatLng();
        const userPoint = turf.point([userLatLng.lng, userLatLng.lat]);
        const talhaoGeoJSON = selectedLayer.toGeoJSON();
        let isInside = false;
        
        turf.geomEach(talhaoGeoJSON, (geom) => {
            if (turf.booleanPointInPolygon(userPoint, geom)) {
                isInside = true;
            }
        });
        return isInside;
    }

    function startManualPlacement() {
        if (placementMarker || !selectedLayer) return;
        dom.fabContainer.classList.remove('open');
        const center = selectedLayer.getBounds().getCenter();
        placementMarker = L.marker(center, { 
            draggable: true,
            icon: L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            })
        }).addTo(map);
        setSyncStatus('Arraste o pino para o local e confirme no botão (✓)', 'syncing', false);
        dom.mainFabBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
        dom.mainFabBtn.onclick = confirmPlacement;
        placementMarker.on('dragend', () => {
            const position = placementMarker.getLatLng();
            const point = turf.point([position.lng, position.lat]);
            const talhaoGeoJSON = selectedLayer.toGeoJSON();
            let isInside = false;
            turf.geomEach(talhaoGeoJSON, (geom) => {
                if (turf.booleanPointInPolygon(point, geom)) {
                    isInside = true;
                }
            });
            if (!isInside) {
                placementMarker.setLatLng(selectedLayer.getBounds().getCenter());
                alert("O pino deve permanecer dentro dos limites do talhão.");
            }
        });
    }

    function confirmPlacement() {
        if (!placementMarker || !selectedLayer) return;
        const talhao = selectedLayer.talhaoData;
        const fixedLocation = placementMarker.getLatLng();
        const locationProvider = () => fixedLocation;
        AlvoModal.open(talhao.id, locationProvider);
        cancelPlacement();
    }

    function cancelPlacement() {
        if (placementMarker) {
            map.removeLayer(placementMarker);
            placementMarker = null;
        }
        dom.mainFabBtn.innerHTML = mainFabOriginalIcon;
        dom.mainFabBtn.onclick = () => { dom.fabContainer.classList.toggle('open'); };
        setSyncStatus('', null);
    }
    
    function setStatus(show, text = '', showSpinner = true) {
        dom.statusText.textContent = text;
        dom.spinner.style.display = showSpinner ? 'block' : 'none';
        if (show) {
            dom.statusOverlay.classList.remove('hidden');
            setTimeout(() => dom.statusOverlay.classList.add('show'), 10);
        } else {
            dom.statusOverlay.classList.remove('show');
            setTimeout(() => dom.statusOverlay.classList.add('hidden'), 300);
        }
    }
    
    function setSyncStatus(text, type = null, autoHide = true, showProgressBar = false) {
        dom.syncStatusText.textContent = text;
        dom.syncStatusBar.className = 'w-full text-white text-sm fixed top-0 z-[1001] transition-transform duration-300';
        if (type) {
            dom.syncStatusBar.classList.add(type);
        }
        if (showProgressBar) {
            dom.syncProgressBarContainer.classList.remove('hidden');
        } else {
            dom.syncProgressBarContainer.classList.add('hidden');
            dom.syncProgressBar.style.width = '0%';
        }
        if (text && autoHide) {
             setTimeout(() => setSyncStatus('', null), 4000);
        }
    }

    function initMap() {
        map = L.map(dom.mapContainer, { zoomControl: false }).setView([-14.235, -51.925], 4);
        L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        }).addTo(map);
        kmlLayersGroup = L.featureGroup().addTo(map);
    }

    function populateFazendaSelect() {
        const fazendas = [...new Set(kmlDatabase.map(item => item.Fazenda || 'Sem Fazenda'))];
        dom.fazendaSelect.innerHTML = '<option value="" selected>Fazenda</option>';
        fazendas.sort().forEach(fazenda => {
            const option = document.createElement('option');
            option.value = fazenda;
            option.textContent = fazenda;
            dom.fazendaSelect.appendChild(option);
        });
        dom.fazendaSelect.classList.add('select-placeholder');
    }

    function showTalhaoInfo(talhao, clickedLayer) {
        if (selectedLayer && selectedLayer !== clickedLayer) {
            selectedLayer.setStyle(defaultStyle);
        }
        clickedLayer.setStyle(selectedStyle);
        selectedLayer = clickedLayer;
        map.fitBounds(clickedLayer.getBounds());
        const geojson = clickedLayer.toGeoJSON();
        const areaEmMetros = turf.area(geojson);
        const areaEmHectares = (areaEmMetros / 10000).toFixed(2);
        dom.talhaoNome.textContent = talhao.nome_talhao;
        dom.talhaoHectares.textContent = `${areaEmHectares} ha`;
        dom.infoModal.classList.add('show');
        dom.fabContainer.classList.remove('hidden');
    }
    
    function hideTalhaoInfo() {
        if (selectedLayer) {
            selectedLayer.setStyle(defaultStyle);
            selectedLayer = null;
        }
        dom.infoModal.classList.remove('show');
        dom.fabContainer.classList.add('hidden');
        dom.fabContainer.classList.remove('open');
        cancelPlacement();
    }
    
    function loadFazendaOnMap() {
        kmlLayersGroup.clearLayers();
        hideTalhaoInfo();
        const selectedFazenda = dom.fazendaSelect.value;
        if (selectedFazenda) {
            dom.fazendaSelect.classList.remove('select-placeholder');
        } else {
            dom.fazendaSelect.classList.add('select-placeholder');
        }
        if (!selectedFazenda) {
            map.setView([-14.235, -51.925], 4);
            return;
        }
        const talhoesDaFazenda = kmlDatabase.filter(t => (t.Fazenda || 'Sem Fazenda') === selectedFazenda);
        if (talhoesDaFazenda.length === 0) {
            map.setView([-14.235, -51.925], 4);
            return;
        }
        const promises = talhoesDaFazenda.map(talhao => {
            return new Promise((resolve) => {
                if (talhao.conteudo_kml) {
                    const blob = new Blob([talhao.conteudo_kml], { type: 'application/vnd.google-earth.kml+xml' });
                    const url = URL.createObjectURL(blob);
                    omnivore.kml(url).on('ready', function() {
                        this.eachLayer(layer => {
                            layer.talhaoData = talhao;
                            layer.setStyle(defaultStyle);
                            kmlLayersGroup.addLayer(layer);
                        });
                        URL.revokeObjectURL(url);
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
        Promise.all(promises).then(() => {
            if (kmlLayersGroup.getLayers().length > 0) {
                map.fitBounds(kmlLayersGroup.getBounds().pad(0.1));
            }
            checkUserPositionAgainstAllTalhoes();
        });
    }

    function toggleRealtimeLocation() {
        if (isLocating) {
            map.stopLocate();
            if (userLocationMarker) {
                map.removeLayer(userLocationMarker);
                userLocationMarker = null;
            }
            isLocating = false;
            initialLocationSet = false;
            dom.locateBtn.classList.remove('locate-btn-active');
            map.off('locationfound', onLocationFound);
            setStatus(false);
            if (kmlLayersGroup.getLayers().length > 0 && !selectedLayer) {
                map.fitBounds(kmlLayersGroup.getBounds().pad(0.1));
            }
        } else {
            setStatus(true, 'Iniciando rastreamento...', true);
            initialLocationSet = false;
            map.locate({ watch: true, setView: false, maxZoom: 18, enableHighAccuracy: true });
            dom.locateBtn.classList.add('locate-btn-active');
            isLocating = true;
            map.on('locationfound', onLocationFound);
        }
    }
    
    function checkUserPositionAgainstAllTalhoes() {
        const userLatLng = getCurrentUserLocation();
        if (!userLatLng) return;
        const userPoint = turf.point([userLatLng.lng, userLatLng.lat]);
        let talhaoEncontrado = false;
        kmlLayersGroup.eachLayer(layer => {
            if (talhaoEncontrado) return;
            const geojson = layer.toGeoJSON();
            let isInside = false;
            turf.geomEach(geojson, (geom) => {
                if (turf.booleanPointInPolygon(userPoint, geom)) {
                    isInside = true;
                }
            });
            if (isInside) {
                if (selectedLayer !== layer) {
                    showTalhaoInfo(layer.talhaoData, layer);
                }
                talhaoEncontrado = true;
            }
        });
    }

    function onLocationFound(e) {
        setStatus(false);
        const latlng = e.latlng;
        if (!initialLocationSet) {
            map.setView(latlng, 18);
            initialLocationSet = true;
        }
        if (!userLocationMarker) {
            const locationIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div class="pulse"></div><div class="dot"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            userLocationMarker = L.marker(latlng, { icon: locationIcon }).addTo(map);
        } else {
            userLocationMarker.setLatLng(latlng);
        }
        checkUserPositionAgainstAllTalhoes();
    }

    async function loadData() {
        setStatus(true, 'Carregando dados...');
        setSyncStatus('Carregando dados locais...', 'syncing', false);
        let hasLocalData = false;
        try {
            const localData = await getTalhoes();
            if (localData && localData.length > 0) {
                kmlDatabase = localData;
                populateFazendaSelect();
                hasLocalData = true;
                setSyncStatus('Dados locais carregados.', 'success');
            }
        } catch (error) {
            console.error("Não foi possível carregar dados locais:", error);
        }
        if (navigator.onLine) {
            try {
                setSyncStatus('Sincronizando com o servidor...', 'syncing', false);
                const { data: remoteData, error } = await supabaseClient
                    .from('talhoes')
                    .select('id, nome_talhao, conteudo_kml, Fazenda');
                if (error) throw error;
                await saveTalhoes(remoteData);
                kmlDatabase = remoteData;
                populateFazendaSelect();
                setSyncStatus('Dados sincronizados! Pronto para uso offline.', 'success');
            } catch (error) {
                console.error("Erro ao buscar dados do Supabase:", error);
                if (hasLocalData) {
                    setSyncStatus('Falha na sincronização. Usando dados offline.', 'warning');
                } else {
                    setStatus(true, 'Falha ao buscar dados. Verifique a conexão.', false);
                    return;
                }
            }
        }
        if (kmlDatabase.length === 0) {
            setStatus(true, 'Nenhum dado encontrado. Conecte-se à internet para carregar.', false);
        } else {
            setStatus(false);
        }
        syncPendingCsvs();
    }
    
    function updateFinalizeButtonVisibility() {
        let hasPendingRecords = false;
        for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i).startsWith('registros_')) {
                hasPendingRecords = true;
                break;
            }
        }

        if (hasPendingRecords) {
            dom.downloadCsvBtn.classList.remove('hidden');
        } else {
            dom.downloadCsvBtn.classList.add('hidden');
        }
    }

    async function finalizeAllMonitoring() {
        const monitoringKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i).startsWith('registros_')) {
                monitoringKeys.push(localStorage.key(i));
            }
        }

        if (monitoringKeys.length === 0) {
            alert('Não há nenhuma monitoria pendente para finalizar.');
            return;
        }

        setStatus(true, `Finalizando ${monitoringKeys.length} talhão(ões)...`);

        let processedCount = 0;
        for (const key of monitoringKeys) {
            try {
                const talhaoId = key.replace('registros_', '');
                const talhaoData = kmlDatabase.find(t => t.id.toString() === talhaoId);

                if (!talhaoData) {
                    console.warn(`Dados para o talhão ID ${talhaoId} não encontrados no banco de dados. Pulando.`);
                    continue;
                }
                
                const dataJSON = localStorage.getItem(key);
                const records = JSON.parse(dataJSON);

                if (!records || records.length === 0) continue;

                const allAlvos = new Set();
                records.forEach(record => { record.alvos.forEach(alvo => allAlvos.add(alvo)); });
                const sortedAlvosHeader = Array.from(allAlvos).sort();
                const header = ['latitude', 'longitude', ...sortedAlvosHeader];
                let csvContent = header.join(',') + '\n';
                records.forEach(record => {
                    const row = [record.lat, record.lng];
                    sortedAlvosHeader.forEach(alvoName => {
                        row.push(record.alvos.includes(alvoName) ? 1 : 0);
                    });
                    csvContent += row.join(',') + '\n';
                });

                const csvDataToSync = {
                    fazenda: talhaoData.Fazenda || 'Sem Fazenda',
                    talhao: talhaoData.nome_talhao,
                    data: new Date().toISOString(),
                    tag: 'monitoramento',
                    csv: csvContent
                };

                await savePendingCsv(csvDataToSync);
                localStorage.removeItem(key);
                processedCount++;

            } catch(error) {
                console.error(`Erro ao processar a monitoria para a chave ${key}:`, error);
                setSyncStatus(`Erro ao processar ${key}.`, 'warning');
            }
        }

        setStatus(false);
        setSyncStatus(`${processedCount} monitoria(s) finalizada(s) e na fila para sincronização.`, 'success');
        updateFinalizeButtonVisibility();
        syncPendingCsvs();
    }

    async function syncPendingCsvs() {
        if (isSyncing) return;
        if (!navigator.onLine) {
            const pendingCsvs = await getPendingCsvs();
            if (pendingCsvs.length > 0) {
                setSyncStatus(`${pendingCsvs.length} CSV(s) aguardando para sincronizar.`, 'warning', false);
            }
            return;
        }
        const pendingCsvs = await getPendingCsvs();
        if (pendingCsvs.length === 0) {
            return;
        }
        isSyncing = true;
        let successCount = 0;
        const totalCount = pendingCsvs.length;
        setSyncStatus(`Sincronizando ${totalCount} CSV(s)...`, 'syncing', false, true);
        dom.syncProgressBar.style.width = '0%';
        for (const record of pendingCsvs) {
            try {
                const { error } = await supabaseClient
                    .from('registros_csv')
                    .insert({
                        fazenda: record.fazenda,
                        talhao: record.talhao,
                        data: record.data,
                        tag: record.tag,
                        csv: record.csv
                    });
                if (error) {
                    throw new Error(`Supabase error: ${error.message}`);
                }
                await deletePendingCsv(record.id);
                successCount++;
                console.log(`CSV ID ${record.id} sincronizado e removido da fila.`);
            } catch (error) {
                console.error(`Falha ao sincronizar CSV ID ${record.id}:`, error);
            }
            const progress = ((successCount + (pendingCsvs.indexOf(record) + 1 - successCount)) / totalCount) * 100;
            dom.syncProgressBar.style.width = `${progress}%`;
        }
        if (successCount === totalCount) {
            setSyncStatus('Sincronização de CSVs concluída!', 'success', true);
        } else {
            const remainingCount = totalCount - successCount;
            setSyncStatus(`Falha ao enviar ${remainingCount} CSV(s). Nova tentativa será feita quando houver conexão.`, 'warning', false);
        }
        isSyncing = false;
    }

    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => console.log('Service Worker registrado com sucesso:', registration.scope))
                    .catch(error => console.log('Falha ao registrar o Service Worker:', error));
            });
        }
    }

    // --- INICIALIZAÇÃO E EVENTOS ---
    initMap();
    loadData();
    registerServiceWorker();
    updateFinalizeButtonVisibility();

    dom.fazendaSelect.addEventListener('change', loadFazendaOnMap);
    dom.closeModalBtn.addEventListener('click', hideTalhaoInfo);
    dom.locateBtn.addEventListener('click', toggleRealtimeLocation);
    dom.downloadCsvBtn.addEventListener('click', finalizeAllMonitoring);
    
    dom.mainFabBtn.onclick = () => {
        dom.fabContainer.classList.toggle('open');
    };
    
    dom.alvoBtn.addEventListener('click', () => {
        if (!selectedLayer || !selectedLayer.talhaoData) return;
        const talhao = selectedLayer.talhaoData;
        const userIsInside = isUserInsideSelectedTalhao();
        if (isLocating && userIsInside) {
            AlvoModal.open(talhao.id, getCurrentUserLocation);
        } else {
            startManualPlacement();
        }
    });

    kmlLayersGroup.on('click', (e) => {
        const clickedLayer = e.layer;
        if (clickedLayer.talhaoData) {
            L.DomEvent.stopPropagation(e);
            showTalhaoInfo(clickedLayer.talhaoData, clickedLayer);
        }
    });

    map.on('click', () => {
        hideTalhaoInfo();
    });
    
    map.on('locationerror', e => {
        setStatus(true, e.message, false);
        setTimeout(() => setStatus(false), 3000);
        isLocating = false;
        dom.locateBtn.classList.remove('locate-btn-active');
    });

    window.addEventListener('online', syncPendingCsvs);
    window.addEventListener('monitoringUpdated', updateFinalizeButtonVisibility);
    setInterval(syncPendingCsvs, 30000);

    toggleRealtimeLocation();
});