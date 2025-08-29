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
    };

    // --- ESTADO DA APLICAÇÃO ---
    let map = null;
    let kmlLayersGroup = null;
    let kmlDatabase = [];
    let selectedLayer = null;

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

    /**
     * Inicializa o mapa Leaflet.
     */
    function initMap() {
        // ATUALIZADO: zoomControl: false para remover os botões +/-
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
        if (selectedLayer) {
            selectedLayer.setStyle(defaultStyle);
        }
        
        clickedLayer.setStyle(selectedStyle);
        selectedLayer = clickedLayer;

        const geojson = clickedLayer.toGeoJSON();
        const areaEmMetros = turf.area(geojson);
        const areaEmHectares = (areaEmMetros / 10000).toFixed(2);

        dom.talhaoNome.textContent = talhao.nome_talhao;
        dom.talhaoHectares.textContent = `${areaEmHectares} ha`;
        dom.infoModal.classList.add('show');
    }
    
    function hideTalhaoInfo() {
        if (selectedLayer) {
            selectedLayer.setStyle(defaultStyle);
            selectedLayer = null;
        }
        dom.infoModal.classList.remove('show');
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
                // ATUALIZADO: Faz a notificação sumir após 3 segundos
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
    
    kmlLayersGroup.on('click', (e) => {
        const clickedLayer = e.layer;
        if (clickedLayer.talhaoData) {
            showTalhaoInfo(clickedLayer.talhaoData, clickedLayer);
        }
    });

    map.on('click', (e) => {
        if (e.originalEvent.target === map.getContainer()) {
            hideTalhaoInfo();
        }
    });
});