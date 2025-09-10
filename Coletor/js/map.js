// ===================================================================================
//  MÓDULO DE GERENCIAMENTO DO MAPA (LEAFLET)
// ===================================================================================

const MapManager = {
    // --- ESTADO DO MAPA ---
    map: null,
    kmlLayersGroup: null,
    monitoringPinsGroup: null,
    demarcationPreviewGroup: null, // Grupo para a visualização
    selectedLayer: null,
    userLocationMarker: null,
    placementMarker: null,
    isLocating: false,
    initialLocationSet: false,
    onPlacementConfirm: null,
    
    // Estado para demarcação automática
    isDemarcating: false,
    demarcationPoints: [],
    demarcationPolygon: null,
    demarcationAreaCallback: null,

    // Estado para demarcação manual com Leaflet.draw
    drawControl: null,
    drawnLayers: null,
    manualDemarcationFinishCallback: null,
    manualDemarcationCancelCallback: null,
    isDrawing: false, // NOVO ESTADO: Controla se o desenho manual está ativo

    // --- DADOS ---
    kmlDatabase: [],

    // --- ESTILOS ---
    defaultStyle: { color: '#3388ff', weight: 2, fillOpacity: 0.2 },
    selectedStyle: { fillColor: '#fef08a', color: '#ca8a04', weight: 4, fillOpacity: 0.7 },
    previewStyle: { color: '#ff00ff', weight: 3, fillOpacity: 0.5 }, // Estilo para a visualização

    /**
     * Inicializa o mapa Leaflet.
     * @param {HTMLElement} mapContainer - O elemento DOM onde o mapa será renderizado.
     */
    init(mapContainer) {
        this.map = L.map(mapContainer, { zoomControl: false }).setView([-14.235, -51.925], 4);
        L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        }).addTo(this.map);
        this.kmlLayersGroup = L.featureGroup().addTo(this.map);
        this.monitoringPinsGroup = L.featureGroup().addTo(this.map);
        this.demarcationPreviewGroup = L.featureGroup().addTo(this.map);

        this.drawnLayers = new L.FeatureGroup();
        this.map.addLayer(this.drawnLayers);

        this.map.on(L.Draw.Event.CREATED, (event) => {
            const layer = event.layer;
            this.drawnLayers.addLayer(layer);
            const latLngs = layer.getLatLngs()[0];
            const points = latLngs.map(latlng => [latlng.lat, latlng.lng]);
            
            if (this.manualDemarcationFinishCallback) {
                this.manualDemarcationFinishCallback(points);
            }
            // A finalização agora é tratada pelo evento 'draw:drawstop'
        });

        // NOVO: Listener para centralizar o fim do desenho (concluído ou cancelado)
        this.map.on('draw:drawstop', () => {
            this.stopManualDemarcation();
        });
    },

    /**
     * Desenha um polígono KML no mapa.
     * @param {string} encodedKmlString - A string KML codificada.
     */
    drawKmlOnMap(encodedKmlString) {
        if (!encodedKmlString) return;
        
        UI.collapseInfoModal(); // Recolhe o painel de informações
        const kmlString = decodeURIComponent(encodedKmlString);
        this.demarcationPreviewGroup.clearLayers();

        // CORREÇÃO: Usa um Blob e createObjectURL para carregar o KML de forma assíncrona e segura
        const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
        const url = URL.createObjectURL(blob);
        
        const kmlLayer = omnivore.kml(url, null, L.geoJson(null, { style: this.previewStyle }))
            .on('ready', () => {
                this.demarcationPreviewGroup.addLayer(kmlLayer);
                if (this.demarcationPreviewGroup.getLayers().length > 0) {
                    try {
                        const bounds = this.demarcationPreviewGroup.getBounds();
                        if(bounds.isValid()){
                           this.map.fitBounds(bounds.pad(0.1));
                        }
                    } catch(e){
                        console.error("Não foi possível ajustar o zoom para a demarcação.", e);
                    }
                }
                URL.revokeObjectURL(url); // Libera a memória
            })
            .on('error', (e) => {
                console.error("Erro ao carregar KML da demarcação:", e);
                URL.revokeObjectURL(url);
            });
    },

    /**
     * Inicia a demarcação manual.
     */
    startManualDemarcation(onFinish, onCancel) {
        this.isDrawing = true; // ATIVA O MODO DE DESENHO
        this.manualDemarcationFinishCallback = onFinish;
        this.manualDemarcationCancelCallback = onCancel;
        
        this.drawControl = new L.Draw.Polygon(this.map, {
            shapeOptions: { color: '#f00' },
            showArea: true,
            metric: ['ha', 'm'],
        });
        
        L.drawLocal.draw.toolbar.actions.title = 'Cancelar desenho';
        L.drawLocal.draw.toolbar.actions.text = 'Cancelar';
        L.drawLocal.draw.toolbar.finish.title = 'Finalizar desenho';
        L.drawLocal.draw.toolbar.finish.text = 'Finalizar';
        L.drawLocal.draw.handlers.polygon.tooltip.start = 'Clique no mapa para começar a desenhar.';
        L.drawLocal.draw.handlers.polygon.tooltip.cont = 'Clique para continuar desenhando.';
        L.drawLocal.draw.handlers.polygon.tooltip.end = 'Clique no primeiro ponto para fechar a área.';

        this.drawControl.enable();
    },

    /**
     * Para e limpa a demarcação manual.
     */
    stopManualDemarcation() {
        if (!this.isDrawing) return; // Evita chamadas múltiplas acidentais

        this.isDrawing = false; // DESATIVA O MODO DE DESENHO
        if (this.drawControl) {
            this.drawControl.disable();
            this.drawControl = null;
        }

        // Se nenhuma camada foi desenhada, significa que o usuário cancelou
        if (this.drawnLayers.getLayers().length === 0 && this.manualDemarcationCancelCallback) {
            this.manualDemarcationCancelCallback();
        }
        
        this.drawnLayers.clearLayers();
        this.manualDemarcationFinishCallback = null;
        this.manualDemarcationCancelCallback = null;
    },

    /**
     * Carrega os talhões de uma fazenda selecionada no mapa.
     */
    loadFazendaOnMap(selectedFazenda) {
        this.kmlLayersGroup.clearLayers();
        this.demarcationPreviewGroup.clearLayers();
        this.hideTalhaoInfo();
        
        if (!selectedFazenda) {
            this.map.setView([-14.235, -51.925], 4);
            return;
        }

        const talhoesDaFazenda = this.kmlDatabase.filter(t => (t.Fazenda || 'Sem Fazenda') === selectedFazenda);
        if (talhoesDaFazenda.length === 0) return;

        const promises = talhoesDaFazenda.map(talhao => {
            return new Promise((resolve) => {
                if (talhao.conteudo_kml) {
                    const blob = new Blob([talhao.conteudo_kml], { type: 'application/vnd.google-earth.kml+xml' });
                    const url = URL.createObjectURL(blob);
                    omnivore.kml(url).on('ready', function() {
                        this.eachLayer(layer => {
                            layer.talhaoData = talhao;
                            layer.setStyle(MapManager.defaultStyle);
                            MapManager.kmlLayersGroup.addLayer(layer);
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
            if (this.kmlLayersGroup.getLayers().length > 0) {
                this.map.fitBounds(this.kmlLayersGroup.getBounds().pad(0.1));
            }
            this.checkUserPositionAgainstAllTalhoes();
        });
    },

    /**
     * Exibe as informações de um talhão clicado.
     */
    showTalhaoInfo(clickedLayer) {
        if (this.selectedLayer && this.selectedLayer !== clickedLayer) {
            this.selectedLayer.setStyle(this.defaultStyle);
        }
        this.demarcationPreviewGroup.clearLayers();
        clickedLayer.setStyle(this.selectedStyle);
        this.selectedLayer = clickedLayer;
        this.map.fitBounds(clickedLayer.getBounds());
        
        const geojson = clickedLayer.toGeoJSON();
        const areaEmMetros = turf.area(geojson);
        const areaEmHectares = (areaEmMetros / 10000).toFixed(2);
        
        UI.showTalhaoInfo(clickedLayer.talhaoData, areaEmHectares);
    },

    /**
     * Esconde as informações do talhão e reverte o estilo.
     */
    hideTalhaoInfo() {
        if (this.selectedLayer) {
            this.selectedLayer.setStyle(this.defaultStyle);
            this.selectedLayer = null;
        }
        this.demarcationPreviewGroup.clearLayers();
        UI.hideTalhaoInfo();
        this.cancelPlacement();
    },
    
    /**
     * Ativa ou desativa o rastreamento da localização do usuário.
     */
    toggleRealtimeLocation() {
        if (this.isLocating) {
            this.map.stopLocate();
            if (this.userLocationMarker) {
                this.map.removeLayer(this.userLocationMarker);
                this.userLocationMarker = null;
            }
            this.isLocating = false;
            this.initialLocationSet = false;
            UI.toggleLocateButton(false);
            this.map.off('locationfound', this.onLocationFound.bind(this));
            UI.setStatus(false);
            if (this.kmlLayersGroup.getLayers().length > 0 && !this.selectedLayer) {
                this.map.fitBounds(this.kmlLayersGroup.getBounds().pad(0.1));
            }
        } else {
            UI.setStatus(true, 'Iniciando rastreamento...', true);
            this.initialLocationSet = false;
            this.map.locate({ watch: true, setView: false, maxZoom: 18, enableHighAccuracy: true });
            UI.toggleLocateButton(true);
            this.isLocating = true;
            this.map.on('locationfound', this.onLocationFound.bind(this));
        }
    },
    
    /**
     * Callback para quando a localização é encontrada.
     */
    onLocationFound(e) {
        UI.setStatus(false);
        const latlng = e.latlng;
        if (!this.initialLocationSet) {
            this.map.setView(latlng, 18);
            this.initialLocationSet = true;
        }
        if (!this.userLocationMarker) {
            const locationIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div class="pulse"></div><div class="dot"></div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });
            this.userLocationMarker = L.marker(latlng, { icon: locationIcon }).addTo(this.map);
        } else {
            this.userLocationMarker.setLatLng(latlng);
        }
        
        if (this.isDemarcating) {
            this.demarcationPoints.push([latlng.lat, latlng.lng]);
            this.updateDemarcationPolygon();
        }

        this.checkUserPositionAgainstAllTalhoes();
    },

    /**
     * Inicia a demarcação automática.
     */
    startAutomaticDemarcation(areaCallback) {
        this.isDemarcating = true;
        this.demarcationPoints = [];
        this.demarcationAreaCallback = areaCallback;
        if (this.demarcationPolygon) {
            this.map.removeLayer(this.demarcationPolygon);
        }
        this.demarcationPolygon = L.polygon([], { color: 'red', weight: 2 }).addTo(this.map);
    },

    /**
     * Atualiza o polígono da demarcação no mapa e calcula a área.
     */
    updateDemarcationPolygon() {
        if (!this.demarcationPolygon) return;
        
        this.demarcationPolygon.setLatLngs(this.demarcationPoints);
        
        if (this.demarcationPoints.length > 2) {
            const turfPoints = this.demarcationPoints.map(p => [p[1], p[0]]);
            turfPoints.push(turfPoints[0]); 
            
            try {
                const polygon = turf.polygon([turfPoints]);
                const areaEmMetros = turf.area(polygon);
                const areaEmHectares = areaEmMetros / 10000;
                
                if (this.demarcationAreaCallback) {
                    this.demarcationAreaCallback(areaEmHectares);
                }
            } catch (e) {
                console.warn("Não foi possível calcular a área ainda (provavelmente polígono inválido).");
            }
        }
    },

    /**
     * Para a demarcação automática e retorna os pontos coletados.
     */
    stopAutomaticDemarcation() {
        this.isDemarcating = false;
        this.demarcationAreaCallback = null;
        if (this.demarcationPolygon) {
            this.map.removeLayer(this.demarcationPolygon);
            this.demarcationPolygon = null;
        }
        return [...this.demarcationPoints];
    },

    /**
     * Verifica se a posição do usuário está dentro de algum dos talhões carregados.
     */
    checkUserPositionAgainstAllTalhoes() {
        const userLatLng = this.getCurrentUserLocation();
        if (!userLatLng) return;
        const userPoint = turf.point([userLatLng.lng, userLatLng.lat]);
        let talhaoEncontrado = false;
        this.kmlLayersGroup.eachLayer(layer => {
            if (talhaoEncontrado) return;
            const geojson = layer.toGeoJSON();
            let isInside = false;
            turf.geomEach(geojson, (geom) => {
                if (turf.booleanPointInPolygon(userPoint, geom)) {
                    isInside = true;
                }
            });
            if (isInside) {
                if (this.selectedLayer !== layer) {
                    this.showTalhaoInfo(layer);
                }
                talhaoEncontrado = true;
            }
        });
    },
    
    /**
     * Inicia o modo de posicionamento manual de um pino no mapa.
     */
    startManualPlacement(onConfirmCallback) {
        if (this.placementMarker || !this.selectedLayer) return;
        
        this.onPlacementConfirm = onConfirmCallback;
        
        UI.startManualPlacementMode();
        UI.dom.mainFabBtn.onclick = this.confirmPlacement.bind(this);
        
        const center = this.selectedLayer.getBounds().getCenter();
        this.placementMarker = L.marker(center, { 
            draggable: true,
            icon: L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            })
        }).addTo(this.map);

        this.placementMarker.on('dragend', () => {
            const position = this.placementMarker.getLatLng();
            const point = turf.point([position.lng, position.lat]);
            const talhaoGeoJSON = this.selectedLayer.toGeoJSON();
            let isInside = false;
            turf.geomEach(talhaoGeoJSON, (geom) => {
                if (turf.booleanPointInPolygon(point, geom)) isInside = true;
            });
            if (!isInside) {
                this.placementMarker.setLatLng(this.selectedLayer.getBounds().getCenter());
                alert("O pino deve permanecer dentro dos limites do talhão.");
            }
        });
    },

    /**
     * Confirma a posição do pino manual e executa o callback.
     */
    confirmPlacement() {
        if (!this.placementMarker || !this.selectedLayer || !this.onPlacementConfirm) return;
        
        const talhao = this.selectedLayer.talhaoData;
        const fixedLocation = this.placementMarker.getLatLng();
        const locationProvider = () => fixedLocation;

        this.onPlacementConfirm(talhao, locationProvider);
        
        this.cancelPlacement();
    },

    /**
     * Cancela o modo de posicionamento manual.
     */
    cancelPlacement() {
        if (this.placementMarker) {
            this.map.removeLayer(this.placementMarker);
            this.placementMarker = null;
        }
        this.onPlacementConfirm = null;
        UI.endManualPlacementMode(() => { UI.dom.fabContainer.classList.toggle('open'); });
    },
    
    /**
     * Desenha os pinos de monitorias já realizadas no mapa.
     */
    drawMonitoringPins() {
        this.monitoringPinsGroup.clearLayers();
        const greenIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('registros_')) {
                const records = JSON.parse(localStorage.getItem(key));
                if (records && records.length > 0) {
                    records.forEach(record => {
                        if (record.lat && record.lng) {
                            const marker = L.marker([record.lat, record.lng], { icon: greenIcon });
                            const alvosHtml = record.alvos.map(alvo => `<li>${alvo.name}: ${alvo.incidence}</li>`).join('');
                            const popupContent = `<b>Alvos Registrados:</b><br><ul>${alvosHtml}</ul>`;
                            marker.bindPopup(popupContent);
                            this.monitoringPinsGroup.addLayer(marker);
                        }
                    });
                }
            }
        }
    },
    
    /**
     * Retorna a localização atual do usuário.
     */
    getCurrentUserLocation() {
        return this.userLocationMarker ? this.userLocationMarker.getLatLng() : null;
    },

    /**
     * Verifica se o usuário está dentro do talhão atualmente selecionado.
     */
    isUserInsideSelectedTalhao() {
        if (!this.isLocating || !this.userLocationMarker || !this.selectedLayer) return false;
        
        const userLatLng = this.userLocationMarker.getLatLng();
        const userPoint = turf.point([userLatLng.lng, userLatLng.lat]);
        const talhaoGeoJSON = this.selectedLayer.toGeoJSON();
        let isInside = false;
        
        turf.geomEach(talhaoGeoJSON, (geom) => {
            if (turf.booleanPointInPolygon(userPoint, geom)) isInside = true;
        });
        return isInside;
    }
};