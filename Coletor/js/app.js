// ===================================================================================
//  LÓGICA PRINCIPAL DA APLICAÇÃO (ATUALIZADA)
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
        infoModal: document.getElementById('info-modal'),
        talhaoNome: document.getElementById('talhao-nome'),
        talhaoHectares: document.getElementById('talhao-hectares'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        locateBtn: document.getElementById('locate-btn'),
        fabContainer: document.getElementById('fab-container'),
        mainFabBtn: document.getElementById('main-fab-btn'),
        alvoBtn: document.getElementById('alvo-btn'), // NOVO: Botão alvo
    };

    // --- ESTADO DA APLICAÇÃO ---
    let map = null;
    let kmlLayersGroup = null;
    let kmlDatabase = [];
    let selectedLayer = null;
    let userLocationMarker = null;
    let isLocating = false;

    // --- ESTILOS ---
    const defaultStyle = { color: '#3388ff', weight: 2, fillOpacity: 0.2 };
    const selectedStyle = { fillColor: '#fef08a', color: '#ca8a04', weight: 4, fillOpacity: 0.7 };


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
    
    function setSyncStatus(text, type = null) {
        dom.syncStatusText.textContent = text;
        dom.syncStatusBar.className = 'w-full text-center text-white p-1 text-sm fixed top-0 z-[1001] transition-transform duration-300';
        if (type) {
            dom.syncStatusBar.classList.add(type);
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
            dom.locateBtn.classList.remove('locate-btn-active');
            map.off('locationfound', onLocationFound);
            setStatus(false);
            
            if (kmlLayersGroup.getLayers().length > 0) {
                map.fitBounds(kmlLayersGroup.getBounds().pad(0.1));
            }

        } else {
            setStatus(true, 'Iniciando rastreamento...', true);
            map.locate({ watch: true, setView: true, maxZoom: 18, enableHighAccuracy: true });
            dom.locateBtn.classList.add('locate-btn-active');
            isLocating = true;
            map.on('locationfound', onLocationFound);
        }
    }

    function onLocationFound(e) {
        setStatus(false);
        const latlng = e.latlng;
        const userPoint = turf.point([latlng.lng, latlng.lat]);
        
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
        
        let foundTalhao = false;
        kmlLayersGroup.eachLayer(layerGroup => {
            layerGroup.eachLayer(layer => {
                if (foundTalhao) return;
                const talhaoGeoJSON = layer.toGeoJSON();
                turf.geomEach(talhaoGeoJSON, (geom) => {
                    if (turf.booleanPointInPolygon(userPoint, geom)) {
                        if (selectedLayer !== layer) {
                            showTalhaoInfo(layer.talhaoData, layer);
                        }
                        foundTalhao = true;
                    }
                });
            });
        });
    }

    async function loadData() {
        setStatus(true, 'Carregando dados...');
        setSyncStatus('Carregando dados locais...', 'syncing');
        let hasLocalData = false;

        try {
            const localData = await getTalhoes();
            if (localData && localData.length > 0) {
                kmlDatabase = localData;
                populateFazendaSelect();
                hasLocalData = true;
                setSyncStatus('Dados locais carregados.', 'success');
                setTimeout(() => setSyncStatus('', null), 3000); 
            }
        } catch (error) {
            console.error("Não foi possível carregar dados locais:", error);
        }

        if (navigator.onLine) {
            try {
                setSyncStatus('Sincronizando com o servidor...', 'syncing');
                const { data: remoteData, error } = await supabaseClient
                    .from('talhoes')
                    .select('id, nome_talhao, conteudo_kml, Fazenda');
                if (error) throw error;
                await saveTalhoes(remoteData);
                kmlDatabase = remoteData;
                populateFazendaSelect();
                setSyncStatus('Dados sincronizados! Pronto para uso offline.', 'success');
                setTimeout(() => setSyncStatus('', null), 3000);
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
    }
    
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('Service Worker registrado com sucesso:', registration.scope);
                    })
                    .catch(error => {
                        console.log('Falha ao registrar o Service Worker:', error);
                    });
            });
        }
    }

    // --- INICIALIZAÇÃO E EVENTOS ---
    initMap();
    loadData();
    registerServiceWorker();

    dom.fazendaSelect.addEventListener('change', loadFazendaOnMap);
    dom.closeModalBtn.addEventListener('click', hideTalhaoInfo);
    dom.locateBtn.addEventListener('click', toggleRealtimeLocation);
    
    dom.mainFabBtn.addEventListener('click', () => {
        dom.fabContainer.classList.toggle('open');
    });
    
    // NOVO: Evento para o botão Alvo
    dom.alvoBtn.addEventListener('click', () => {
        if (selectedLayer && selectedLayer.talhaoData) {
            AlvoModal.open(selectedLayer.talhaoData.id);
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
});