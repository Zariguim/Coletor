// ===================================================================================
//  MÓDULO DE GERENCIAMENTO DO MAPA (LEAFLET)
// ===================================================================================

const MapManager = {
    // --- ESTADO DO MAPA ---
    map: null,
    kmlLayersGroup: null,
    monitoringPinsGroup: null,
    demarcationPreviewGroup: null, 
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
    isDrawing: false, 

    // NOVO: Estado para Demarcação A B
    isAbDemarcating: false,
    abPointA: null,
    abPointB: null,
    abTempLayers: null,
    abSplitPolygons: [],
    selectedSplitPolygon: null,
    abSliceCallback: null,

    // --- DADOS ---
    kmlDatabase: [],

    // --- ESTILOS ---
    defaultStyle: { color: '#3388ff', weight: 2, fillOpacity: 0.2 },
    selectedStyle: { fillColor: '#fef08a', color: '#ca8a04', weight: 4, fillOpacity: 0.7 },
    previewStyle: { color: '#ff00ff', weight: 3, fillOpacity: 0.5 },
    splitPolygonStyleA: { color: 'blue', weight: 3, fillOpacity: 0.5 },
    splitPolygonStyleB: { color: 'orange', weight: 3, fillOpacity: 0.5 },
    selectedSplitPolygonStyle: { color: 'green', fillColor: 'green', weight: 4, fillOpacity: 0.7 },


    /**
     * Inicializa o mapa Leaflet.
     * @param {HTMLElement} mapContainer - O elemento DOM onde o mapa será renderizado.
     */
    init(mapContainer) {
        this.map = L.map(mapContainer, { zoomControl: false }).setView([-14.235, -51.925], 4);
        L.tileLayer('https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        }).addTo(this.map);
        this.kmlLayersGroup = L.featureGroup().addTo(this.map);
        this.monitoringPinsGroup = L.featureGroup().addTo(this.map);
        this.demarcationPreviewGroup = L.featureGroup().addTo(this.map);
        this.abTempLayers = L.featureGroup().addTo(this.map); // Camada para demarcação A B

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
        });

        this.map.on('draw:drawstop', () => {
            this.stopManualDemarcation();
        });
    },

    // ===================================================================================
    //  NOVAS FUNÇÕES - DEMARCAÇÃO A B
    // ===================================================================================
    
    startAbDemarcation() {
        this.isAbDemarcating = true;
        this.abPointA = null;
        this.abPointB = null;
        this.abTempLayers.clearLayers();
        this.abSplitPolygons = [];
        this.selectedSplitPolygon = null;
    },

    setAbPoint(pointType, callback) {
        const setPoint = (latlng) => {
            if (pointType === 'A') {
                this.abPointA = latlng;
                L.marker(latlng, { title: 'Ponto A' }).addTo(this.abTempLayers);
            } else {
                this.abPointB = latlng;
                L.marker(latlng, { title: 'Ponto B' }).addTo(this.abTempLayers);
            }
            if(callback) callback(true);
        };

        if (this.isLocating && this.isUserInsideSelectedTalhao()) {
            setPoint(this.getCurrentUserLocation());
        } else {
            alert("Mova o pino para a posição desejada e confirme.");
            this.startManualPlacement((talhao, locationProvider) => {
                setPoint(locationProvider());
                this.cancelPlacement(); // Finaliza o modo de pino
            });
        }
    },

    slicePolygonByAbPoints(callback) {
        this.abSliceCallback = callback;
        if (!this.abPointA || !this.abPointB || !this.selectedLayer) {
            alert("Erro: Pontos A e B e um talhão selecionado são necessários.");
            if(this.abSliceCallback) this.abSliceCallback(null);
            return;
        }

        try {
            const originalPolygon = this.selectedLayer.toGeoJSON();
            const turfPointA = turf.point([this.abPointA.lng, this.abPointA.lat]);
            const turfPointB = turf.point([this.abPointB.lng, this.abPointB.lat]);
            const bbox = turf.bbox(originalPolygon);
            const extendedLine = this.createExtendedLine(turfPointA, turfPointB, bbox);

            const splitResult = this.splitPolygonByLine(originalPolygon, extendedLine, bbox);

            if (!splitResult || splitResult.length < 2) {
                throw new Error('Não foi possível dividir o polígono. A linha pode não cruzar a área. Tente pontos diferentes.');
            }

            this.kmlLayersGroup.setStyle({ opacity: 0.1, fillOpacity: 0.1 });
            this.abTempLayers.clearLayers(); // Limpa os marcadores A e B

            splitResult.forEach((poly, index) => {
                if (poly) {
                    const style = index === 0 ? this.splitPolygonStyleA : this.splitPolygonStyleB;
                    const polyLayer = L.geoJSON(poly, { style }).addTo(this.abTempLayers);

                    polyLayer.on('click', (e) => {
                        L.DomEvent.stop(e);
                        this.handleSideSelection(poly, polyLayer);
                    });

                    this.abSplitPolygons.push({ geojson: poly, layer: polyLayer });
                }
            });

            if (this.abSplitPolygons.length < 2) {
                throw new Error('A divisão resultou em uma geometria inválida.');
            }

        } catch (error) {
            alert(`Erro ao processar: ${error.message}`);
            this.cancelAbDemarcation();
            if(this.abSliceCallback) this.abSliceCallback(null);
        }
    },

    handleSideSelection(polygonGeoJSON, polygonLayer) {
        this.abSplitPolygons.forEach((p, index) => {
            const originalStyle = index === 0 ? this.splitPolygonStyleA : this.splitPolygonStyleB;
            p.layer.setStyle(originalStyle);
        });

        polygonLayer.setStyle(this.selectedSplitPolygonStyle);
        this.selectedSplitPolygon = polygonGeoJSON;
        if (this.abSliceCallback) this.abSliceCallback(polygonGeoJSON);
    },

    createExtendedLine(pointA, pointB, bbox) {
        const bearing = turf.bearing(pointA, pointB);
        const diagonal = turf.distance(turf.point([bbox[0], bbox[1]]), turf.point([bbox[2], bbox[3]]));
        const extendedPointA = turf.destination(pointA, diagonal * 1.5, bearing + 180, { units: 'kilometers' });
        const extendedPointB = turf.destination(pointB, diagonal * 1.5, bearing, { units: 'kilometers' });
        return turf.lineString([extendedPointA.geometry.coordinates, extendedPointB.geometry.coordinates]);
    },
    
    splitPolygonByLine(polygon, line, bbox) {
        try {
            const expandedBbox = [bbox[0] - 1, bbox[1] - 1, bbox[2] + 1, bbox[3] + 1];
            const leftSide = this.createSidePolygon(line, expandedBbox, 'left');
            const rightSide = this.createSidePolygon(line, expandedBbox, 'right');
            const leftIntersection = turf.intersect(polygon, leftSide);
            const rightIntersection = turf.intersect(polygon, rightSide);
            const result = [];
            if (leftIntersection) result.push(leftIntersection);
            if (rightIntersection) result.push(rightIntersection);
            return result.length > 1 ? result : null;
        } catch (e) {
            console.error("Erro na função splitPolygonByLine:", e);
            return null;
        }
    },

    createSidePolygon(line, bbox, side) {
        const coords = line.geometry.coordinates;
        const start = coords[0];
        const end = coords[1];
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const perpX = -dy;
        const perpY = dx;
        const length = Math.sqrt(perpX * perpX + perpY * perpY);
        if (length === 0) return null;
        const unitPerpX = perpX / length;
        const unitPerpY = perpY / length;
        const offset = side === 'left' ? 1 : -1;
        const scale = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]) * 2;
        const sideCoords = [
            start, end,
            [end[0] + offset * unitPerpX * scale, end[1] + offset * unitPerpY * scale],
            [start[0] + offset * unitPerpX * scale, start[1] + offset * unitPerpY * scale],
            start
        ];
        return turf.polygon([sideCoords]);
    },

    cancelAbDemarcation() {
        this.isAbDemarcating = false;
        this.abTempLayers.clearLayers();
        this.kmlLayersGroup.eachLayer(layer => {
            if (layer === this.selectedLayer) {
                layer.setStyle(this.selectedStyle);
            } else {
                layer.setStyle(this.defaultStyle);
            }
        });
        this.abPointA = null;
        this.abPointB = null;
        this.abSplitPolygons = [];
        this.selectedSplitPolygon = null;
        this.abSliceCallback = null;
    },

    // ===================================================================================
    //  FUNÇÕES EXISTENTES (sem modificações significativas)
    // ===================================================================================

    drawKmlOnMap(encodedKmlString) {
        if (!encodedKmlString) return;
        
        UI.collapseInfoModal();
        const kmlString = decodeURIComponent(encodedKmlString);
        this.demarcationPreviewGroup.clearLayers();

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
                URL.revokeObjectURL(url);
            })
            .on('error', (e) => {
                console.error("Erro ao carregar KML da demarcação:", e);
                URL.revokeObjectURL(url);
            });
    },

    startManualDemarcation(onFinish, onCancel) {
        this.isDrawing = true;
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

    stopManualDemarcation() {
        if (!this.isDrawing) return; 

        this.isDrawing = false;
        if (this.drawControl) {
            this.drawControl.disable();
            this.drawControl = null;
        }

        if (this.drawnLayers.getLayers().length === 0 && this.manualDemarcationCancelCallback) {
            this.manualDemarcationCancelCallback();
        }
        
        this.drawnLayers.clearLayers();
        this.manualDemarcationFinishCallback = null;
        this.manualDemarcationCancelCallback = null;
    },

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

    hideTalhaoInfo() {
        if (this.selectedLayer) {
            this.selectedLayer.setStyle(this.defaultStyle);
            this.selectedLayer = null;
        }
        this.demarcationPreviewGroup.clearLayers();
        UI.hideTalhaoInfo();
        this.cancelPlacement();
    },
    
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

    startAutomaticDemarcation(areaCallback) {
        this.isDemarcating = true;
        this.demarcationPoints = [];
        this.demarcationAreaCallback = areaCallback;
        if (this.demarcationPolygon) {
            this.map.removeLayer(this.demarcationPolygon);
        }
        this.demarcationPolygon = L.polygon([], { color: 'red', weight: 2 }).addTo(this.map);
    },

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

    stopAutomaticDemarcation() {
        this.isDemarcating = false;
        this.demarcationAreaCallback = null;
        if (this.demarcationPolygon) {
            this.map.removeLayer(this.demarcationPolygon);
            this.demarcationPolygon = null;
        }
        return [...this.demarcationPoints];
    },

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

    confirmPlacement() {
        if (!this.placementMarker || !this.selectedLayer || !this.onPlacementConfirm) return;
        
        const talhao = this.selectedLayer.talhaoData;
        const fixedLocation = this.placementMarker.getLatLng();
        const locationProvider = () => fixedLocation;

        this.onPlacementConfirm(talhao, locationProvider);
        
        this.cancelPlacement();
    },

    cancelPlacement() {
        if (this.placementMarker) {
            this.map.removeLayer(this.placementMarker);
            this.placementMarker = null;
        }
        this.onPlacementConfirm = null;
        UI.endManualPlacementMode(() => { UI.dom.fabContainer.classList.toggle('open'); });
    },
    
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
    
    getCurrentUserLocation() {
        return this.userLocationMarker ? this.userLocationMarker.getLatLng() : null;
    },

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