// ===================================================================================
//  MÓDULO DE GERENCIAMENTO DA INTERFACE DO USUÁRIO (UI)
// ===================================================================================

const UI = {
    // --- PROPRIEDADES DO DOM ---
    dom: {
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
        locateBtn: document.getElementById('locate-btn'),
        fabContainer: document.getElementById('fab-container'),
        mainFabBtn: document.getElementById('main-fab-btn'),
        alvoBtn: document.getElementById('alvo-btn'),
        anotacaoBtn: document.getElementById('anotacao-btn'),
        demarcacaoBtn: document.getElementById('demarcacao-btn'),
        afericaoBtn: document.getElementById('afericao-btn'),
        downloadCsvBtn: document.getElementById('download-csv-btn'),
        modalHeader: document.getElementById('modal-header-clickable'),
        monitoringHistory: document.getElementById('monitoring-history'),
        fullscreenViewer: document.getElementById('fullscreen-viewer'),
        fullscreenImage: document.getElementById('fullscreen-image'),
        fullscreenCloseBtn: document.getElementById('fullscreen-close-btn'),
        historyFilter: document.getElementById('history-filter'),
    },

    mainFabOriginalIcon: null,
    activeSwipeCard: null,

    init() {
        this.mainFabOriginalIcon = this.dom.mainFabBtn.innerHTML;
        this.dom.fazendaSelect.classList.add('select-placeholder');
        this.initModalToggle();
        
        this.dom.fullscreenCloseBtn.addEventListener('click', () => this.hideFullscreenImage());
        this.dom.fullscreenViewer.addEventListener('click', (e) => {
            if (e.target === this.dom.fullscreenViewer) this.hideFullscreenImage();
        });

        this.dom.historyFilter.addEventListener('change', () => {
            if (MapManager.selectedLayer) {
                const talhao = MapManager.selectedLayer.talhaoData;
                this.displayHistory(talhao.nome_talhao, talhao.Fazenda || 'Sem Fazenda', talhao.id);
            }
        });

        if (navigator.onLine) DataManager.fetchAndCacheAllHistory();

        document.addEventListener('click', (e) => {
            if (this.activeSwipeCard && !this.activeSwipeCard.contains(e.target)) {
                this.closeActiveSwipeCard();
            }
        });
    },
    
    showFullscreenImage(imageUrl) {
        if (!imageUrl) return;
        this.dom.fullscreenImage.src = imageUrl;
        this.dom.fullscreenViewer.classList.remove('hidden');
    },

    hideFullscreenImage() {
        this.dom.fullscreenViewer.classList.add('hidden');
        this.dom.fullscreenImage.src = '';
    },
    
    setStatus(show, text = '', showSpinner = true) {
        this.dom.statusText.textContent = text;
        this.dom.spinner.style.display = showSpinner ? 'block' : 'none';
        if (show) {
            this.dom.statusOverlay.classList.remove('hidden');
            setTimeout(() => this.dom.statusOverlay.classList.add('show'), 10);
        } else {
            this.dom.statusOverlay.classList.remove('show');
            setTimeout(() => this.dom.statusOverlay.classList.add('hidden'), 300);
        }
    },

    setSyncStatus(text, type = null, autoHide = true, showProgressBar = false) {
        this.dom.syncStatusText.textContent = text;
        this.dom.syncStatusBar.className = 'w-full text-white text-sm fixed top-0 z-[1001] transition-transform duration-300';
        if (type) this.dom.syncStatusBar.classList.add(type);
        
        this.dom.syncProgressBarContainer.classList.toggle('hidden', !showProgressBar);
        this.dom.syncProgressBar.style.width = '0%';
        
        if (text && autoHide) {
             setTimeout(() => this.setSyncStatus('', null), 4000);
        }
    },
    
    updateSyncProgress(progress) {
        this.dom.syncProgressBar.style.width = `${progress}%`;
    },

    populateFazendaSelect(fazendas) {
        this.dom.fazendaSelect.innerHTML = '<option value="" selected>Fazenda</option>';
        fazendas.sort().forEach(fazenda => {
            const option = document.createElement('option');
            option.value = fazenda;
            option.textContent = fazenda;
            this.dom.fazendaSelect.appendChild(option);
        });
        this.dom.fazendaSelect.classList.add('select-placeholder');
    },

    showTalhaoInfo(talhao, areaEmHectares) {
        this.dom.talhaoNome.textContent = talhao.nome_talhao;
        this.dom.talhaoHectares.textContent = `${areaEmHectares} ha`;
        this.dom.infoModal.classList.add('show');
        this.dom.fabContainer.classList.remove('hidden');
        this.displayHistory(talhao.nome_talhao, talhao.Fazenda || 'Sem Fazenda', talhao.id);
    },
    
    hideTalhaoInfo() {
        this.dom.infoModal.classList.remove('show');
        this.dom.infoModal.classList.remove('expanded');
        this.dom.fabContainer.classList.add('hidden');
        this.dom.fabContainer.classList.remove('open');
    },

    collapseInfoModal() {
        this.dom.infoModal.classList.remove('expanded');
    },

    toggleLocateButton(isLocating) {
        this.dom.locateBtn.classList.toggle('locate-btn-active', isLocating);
    },
    
    updateFinalizeButtonVisibility() {
        let hasPendingRecords = false;
        for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i).startsWith('registros_')) {
                hasPendingRecords = true;
                break;
            }
        }
        this.dom.downloadCsvBtn.classList.toggle('hidden', !hasPendingRecords);
    },

    startManualPlacementMode() {
        this.dom.fabContainer.classList.remove('open');
        this.setSyncStatus('Arraste o pino para o local e confirme no botão (✓)', 'syncing', false);
        this.dom.mainFabBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
    },
    
    endManualPlacementMode(callback) {
        this.dom.mainFabBtn.innerHTML = this.mainFabOriginalIcon;
        this.dom.mainFabBtn.onclick = callback;
        this.setSyncStatus('', null);
    },

    initModalToggle() {
        this.dom.modalHeader.addEventListener('click', () => {
            this.dom.infoModal.classList.toggle('expanded');
        });
    },
    
    async displayHistory(talhaoName, fazendaName, talhaoId) {
        this.dom.monitoringHistory.innerHTML = '<p class="text-center text-gray-500">Carregando histórico...</p>';
        const filterValue = this.dom.historyFilter.value;

        try {
            const [syncedHistory, localAnotacoes, pendingCsvs] = await Promise.all([
                getHistory(),
                getAnotacoes(talhaoId),
                getPendingCsvs()
            ]);

            const relevantSyncedHistory = syncedHistory.filter(r => r.talhao === talhaoName && r.fazenda === fazendaName);
            const relevantPendingCsvs = pendingCsvs.filter(r => r.talhao === talhaoName && r.fazenda === fazendaName).map(p => ({ ...p, isPending: true }));
            
            const allHistory = [...relevantSyncedHistory, ...relevantPendingCsvs];

            const typedRecords = allHistory.map(r => {
                let type = 'monitoring'; // default
                if (r.tag === 'Anotação') type = 'annotation';
                else if (r.tag === 'Demarcação') type = 'demarcation';
                else if (r.tag === 'População') type = 'population';
                else if (r.tag === 'Aferição de plantio') type = 'planting_assessment';
                else if (r.tag === 'Perca na colheita') type = 'harvest_loss';
                else if (r.tag === 'Estimativa de produtividade') type = 'productivity_estimation'; // NOVO
                return { ...r, type };
            });
            const localAnnotationRecords = (localAnotacoes || []).map(a => ({ ...a, type: 'annotation', isLocal: true }));
            const allRecords = [...typedRecords, ...localAnnotationRecords];
            allRecords.sort((a, b) => new Date(b.data) - new Date(a.data));

            const filteredRecords = (filterValue === 'all')
                ? allRecords
                : allRecords.filter(record => record.type === filterValue);

            if (filteredRecords.length === 0) {
                this.dom.monitoringHistory.innerHTML = '<p class="text-center text-gray-500">Nenhum registro encontrado para este filtro.</p>';
                return;
            }

            const historyHtml = filteredRecords.map(record => {
                if (record.type === 'monitoring') return this.createMonitoringCard(record);
                if (record.type === 'annotation') return this.createAnnotationCard(record);
                if (record.type === 'demarcation') return this.createDemarcationCard(record);
                if (record.type === 'population') return this.createPopulationCard(record);
                if (record.type === 'planting_assessment') return this.createPlantingAssessmentCard(record);
                if (record.type === 'harvest_loss') return this.createHarvestLossCard(record);
                if (record.type === 'productivity_estimation') return this.createEstimativaProdutividadeCard(record); // NOVO
                return '';
            }).join('');
            
            this.dom.monitoringHistory.innerHTML = historyHtml;
            this.initSwipeToDelete();
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
            this.dom.monitoringHistory.innerHTML = '<p class="text-center text-red-500">Erro ao carregar histórico.</p>';
        }
    },

    // ===================================================================================
    // NOVAS FUNÇÕES PARA ESTIMATIVA DE PRODUTIVIDADE
    // ===================================================================================
    createEstimativaProdutividadeCard(record) {
        if (!record.csv) return '';
        const recordDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'productivity_estimation', this, ${record.isPending || false})`;

        const lines = record.csv.split('\n');
        const header = lines[0].split(',');
        const data = lines.length > 1 ? lines[1].split(',') : [];
        
        const cultura = data[header.indexOf('cultura')] || 'N/D';
        const produtividade = data[header.indexOf('produtividade_sc_ha')] || 'N/D';
        const descricaoIndex = header.indexOf('descricao');
        const description = (descricaoIndex !== -1 && data[descricaoIndex]) ? data[descricaoIndex].replace(/^"|"$/g, '').replace(/""/g, '"') : 'Sem descrição';

        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: recordDate, cultura, produtividade, description };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UI.shareEstimativaProdutividadeData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;
        const descriptionHtml = `<p class="whitespace-pre-wrap mt-2">${description}</p>`;
        const culturaEmoji = cultura.toLowerCase() === 'soja' ? '🌱' : '🌽';

        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>Estimativa de Produtividade - ${recordDate}</h4>${shareButtonHtml}</div>
                    <p class="font-semibold text-lg text-gray-800">${produtividade} sc/ha</p>
                    <div class="text-sm text-gray-600 mt-2">
                        <p><strong>Cultura:</strong> ${culturaEmoji} ${cultura}</p>
                    </div>
                    ${descriptionHtml}
                </div>
            </div>`;
    },

    shareEstimativaProdutividadeData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const culturaEmoji = data.cultura.toLowerCase() === 'soja' ? '🌱' : '🌽';
            const message = `*Estimativa de Produtividade*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n*Cultura:* ${culturaEmoji} ${data.cultura}\n*Produtividade Estimada:* ${data.produtividade} sc/ha\n\n*Descrição:*\n${data.description}`;
            if (navigator.share) { navigator.share({ text: message }); } 
            else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank'); }
        } catch (error) {
            console.error("Erro ao compartilhar dados de estimativa:", error);
            alert("Não foi possível compartilhar os dados.");
        }
    },


    createHarvestLossCard(record) {
        if (!record.csv) return '';
        const recordDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'harvest_loss', this, ${record.isPending || false})`;

        const lines = record.csv.split('\n');
        const header = lines[0].split(',');
        const data = lines.length > 1 ? lines[1].split(',') : [];
        
        const mediaPerca = data[header.indexOf('perda_media_kg_ha')] || 'N/D';
        const numAmostras = data[header.indexOf('numero_amostras')] || 'N/D';
        const largura = data[header.indexOf('largura_m')] || 'N/D';
        const comprimento = data[header.indexOf('comprimento_m')] || 'N/D';
        const descricaoIndex = header.indexOf('descricao');
        const description = (descricaoIndex !== -1 && data[descricaoIndex]) ? data[descricaoIndex].replace(/^"|"$/g, '').replace(/""/g, '"') : 'Sem descrição';

        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: recordDate, media: mediaPerca, amostras: numAmostras, largura, comprimento, description };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UI.shareHarvestLossData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;
        const descriptionHtml = `<p class="whitespace-pre-wrap mt-2">${description}</p>`;

        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>Perca na Colheita - ${recordDate}</h4>${shareButtonHtml}</div>
                    <p class="font-semibold text-lg text-gray-800">${mediaPerca} kg/ha</p>
                    <div class="text-sm text-gray-600 mt-2">
                        <p><strong>Área da Amostra:</strong> ${largura}m x ${comprimento}m</p>
                        <p><strong>Nº de Amostras:</strong> ${numAmostras}</p>
                    </div>
                    ${descriptionHtml}
                </div>
            </div>`;
    },

    createPlantingAssessmentCard(record) {
        if (!record.csv) return '';
        const recordDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'planting_assessment', this, ${record.isPending || false})`;

        const lines = record.csv.split('\n');
        const header = lines[0].split(',');
        const data = lines.length > 1 ? lines[1].split(',') : [];
        
        const cv = data[header.indexOf('cv')] || 'N/D';
        const duplas = data[header.indexOf('duplas_pct')] || 'N/D';
        const arraste = data[header.indexOf('arraste_pct')] || 'N/D';
        const falhas = data[header.indexOf('falhas_pct')] || 'N/D';

        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: recordDate, cv, duplas, arraste, falhas };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UI.sharePlantingAssessmentData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;

        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>Aferição de Plantio - ${recordDate}</h4>${shareButtonHtml}</div>
                    <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                        <div class="text-center bg-blue-100 p-2 rounded-lg">
                            <p class="text-sm font-bold text-blue-800">CV</p>
                            <p class="text-xl font-bold text-blue-800">${cv}%</p>
                        </div>
                        <div class="text-center bg-red-100 p-2 rounded-lg">
                            <p class="text-sm font-bold text-red-800">Duplas</p>
                            <p class="text-lg font-bold text-red-800">${duplas}%</p>
                        </div>
                        <div class="text-center bg-orange-100 p-2 rounded-lg">
                            <p class="text-sm font-bold text-orange-800">Arraste</p>
                            <p class="text-lg font-bold text-orange-800">${arraste}%</p>
                        </div>
                        <div class="text-center bg-purple-100 p-2 rounded-lg">
                            <p class="text-sm font-bold text-purple-800">Falhas</p>
                            <p class="text-lg font-bold text-purple-800">${falhas}%</p>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    createPopulationCard(record) {
        if (!record.csv) return '';
        const recordDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'population', this, ${record.isPending || false})`;

        const lines = record.csv.split('\n');
        const header = lines[0].split(',');
        const data = lines.length > 1 ? lines[1].split(',') : [];
        
        const espacamento = data[header.indexOf('espacamento_m')] || 'N/D';
        const numAmostras = data[header.indexOf('numero_amostras')] || 'N/D';
        const mediaPlantas = parseInt(data[header.indexOf('plantas_por_ha')]) || 0;
        const metrosAvaliados = data[header.indexOf('metros_avaliados_amostra')] || 'N/D';
        
        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: recordDate, media: mediaPlantas.toLocaleString('pt-BR'), espacamento, amostras: numAmostras, metros: metrosAvaliados };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UI.sharePopulationData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;

        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>População - ${recordDate}</h4>${shareButtonHtml}</div>
                    <p class="font-semibold text-lg text-gray-800">${mediaPlantas.toLocaleString('pt-BR')} plantas/ha</p>
                    <div class="text-sm text-gray-600 mt-2">
                        <p><strong>Espaçamento:</strong> ${espacamento} m</p>
                        <p><strong>Metros por amostra:</strong> ${metrosAvaliados} m</p>
                        <p><strong>Nº de Amostras:</strong> ${numAmostras}</p>
                    </div>
                </div>
            </div>`;
    },

    createDemarcationCard(record) {
        if (!record.csv) return '';
        const demarcationDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'demarcation', this, ${record.isPending || false})`;
        let description = 'Demarcação de área', kmlContent = '', areaHa = null;
        const lines = record.csv.split('\n');
        if (lines.length > 1) {
            const dataLine = lines[1];
            const firstSeparator = dataLine.indexOf('","');
            const secondSeparator = dataLine.indexOf('","', firstSeparator + 1);
            if (firstSeparator > 0 && secondSeparator > 0) {
                description = dataLine.substring(1, firstSeparator).replace(/""/g, '"');
                kmlContent = dataLine.substring(firstSeparator + 3, secondSeparator).replace(/""/g, '"');
                areaHa = dataLine.substring(secondSeparator + 3, dataLine.length - 1).replace(/""/g, '"');
            }
        }
        const areaHtml = areaHa ? `<p class="font-semibold text-gray-700">${areaHa} ha</p>` : '';
        const safeKmlContent = encodeURIComponent(kmlContent);
        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete"><button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>
                <div class="monitoring-card swipe-card-content" onclick="MapManager.drawKmlOnMap('${safeKmlContent}')">
                    <div class="monitoring-card-header"><h4>Demarcação - ${demarcationDate}</h4>${areaHtml}</div>
                    <p class="whitespace-pre-wrap">${description}</p>
                </div>
            </div>`;
    },

    createAnnotationCard(record) {
        const annotationDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const recordIdString = typeof record.id === 'string' ? `'${record.id}'` : record.id;
        const deleteAction = `UI.handleDeleteRecord(${recordIdString}, '${record.talhaoId}', 'annotation', this, ${record.isPending || false}, ${record.isLocal || false})`;
        let textContent = record.texto || '', imageUrl = record.foto || '';
        if (record.csv) {
            const lines = record.csv.split('\n');
            const header = lines[0].split(',');
            const data = lines.length > 1 ? lines[1].split(',') : [];
            const anotacaoIndex = header.indexOf('anotacao');
            const fotoUrlIndex = header.indexOf('foto_url');
            if (anotacaoIndex !== -1 && data[anotacaoIndex]) textContent = data[anotacaoIndex].replace(/^"|"$/g, '').replace(/""/g, '"');
            if (fotoUrlIndex !== -1 && data[fotoUrlIndex]) { const url = data[fotoUrlIndex].replace(/"/g, ''); if (url) imageUrl = url; }
        }
        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: annotationDate, text: textContent, imageUrl: imageUrl };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const imageHtml = imageUrl ? `<img src="${imageUrl}" alt="Foto da anotação" class="annotation-photo" loading="lazy" onclick="event.stopPropagation(); UI.showFullscreenImage('${imageUrl}')">` : '';
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UI.shareAnnotationData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;
        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete"><button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>Anotação - ${annotationDate}</h4>${shareButtonHtml}</div>
                    ${textContent ? `<p class="whitespace-pre-wrap">${textContent}</p>` : ''}
                    ${imageHtml}
                </div>
            </div>`;
    },

    createMonitoringCard(record) {
        if (!record.csv) return '';
        const lines = record.csv.trim().split('\n');
        if (lines.length <= 1) return '';
        const header = lines[0].split(',');
        const dataRows = lines.slice(1);
        if (dataRows.length === 0) return '';
        const numPoints = dataRows.length, alvos = header.slice(2), alvoSums = {};
        dataRows.forEach(rowStr => { const values = rowStr.split(','); alvos.forEach((alvoName, index) => { const incidence = parseFloat(values[index + 2]); if (!isNaN(incidence)) alvoSums[alvoName] = (alvoSums[alvoName] || 0) + incidence; }); });
        let averagesHtml = '', averagesTextForShare = '', hasAverages = false;
        for (const alvoName in alvoSums) { const totalIncidence = alvoSums[alvoName]; if (totalIncidence > 0) { const average = (totalIncidence / numPoints).toFixed(1).replace('.', ','); averagesHtml += `<p>${alvoName}: ${average}</p>`; averagesTextForShare += `${alvoName}: ${average}\n`; hasAverages = true; } }
        if (!hasAverages) { averagesHtml = '<p class="text-sm text-gray-500">Nenhuma praga encontrada.</p>'; averagesTextForShare = 'Nenhuma praga encontrada.'; }
        const monitoringDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: monitoringDate, points: numPoints, averages: averagesTextForShare.trim() };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'monitoring', this, ${record.isPending || false})`;
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UI.shareMonitoringData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;
        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete"><button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>${record.tag || 'Monitoramento'} - ${monitoringDate}</h4>${shareButtonHtml}</div>
                    <p><strong>Número de pontos:</strong> ${numPoints}</p>
                    <div class="averages-list"><p><strong>Médias:</strong></p>${averagesHtml}</div>
                </div>
            </div>`;
    },
    
    shareHarvestLossData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const message = `*Aferição de Perca na Colheita*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n*Perca Média:* ${data.media} kg/ha\n*Nº de Amostras:* ${data.amostras}\n*Área da Amostra:* ${data.largura}m x ${data.comprimento}m\n\n*Descrição:*\n${data.description}`;
            if (navigator.share) { navigator.share({ text: message }); } 
            else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank'); }
        } catch (error) {
            console.error("Erro ao compartilhar dados de perca na colheita:", error);
            alert("Não foi possível compartilhar os dados.");
        }
    },

    sharePlantingAssessmentData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const message = `*Aferição de Plantio*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n*CV:* ${data.cv}%\n*Duplas:* ${data.duplas}%\n*Arrastes:* ${data.arraste}%\n*Falhas:* ${data.falhas}%`;
            if (navigator.share) { navigator.share({ text: message }); } 
            else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank'); }
        } catch (error) {
            console.error("Erro ao compartilhar dados de aferição:", error);
            alert("Não foi possível compartilhar os dados.");
        }
    },

    sharePopulationData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const message = `*Aferição de População*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n*Média:* ${data.media} plantas/ha\n*Espaçamento:* ${data.espacamento} m\n*Nº de Amostras:* ${data.amostras}`;
            if (navigator.share) { navigator.share({ text: message }); } 
            else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank'); }
        } catch (error) {
            console.error("Erro ao compartilhar dados de população:", error);
            alert("Não foi possível compartilhar os dados.");
        }
    },

    shareMonitoringData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const message = `*Monitoramento Realizado*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n*Nº de Pontos:* ${data.points}\n\n*Médias de Incidência:*\n${data.averages}`;
            if (navigator.share) { navigator.share({ text: message }); } 
            else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank'); }
        } catch (error) {
            console.error("Erro ao compartilhar dados:", error);
            alert("Não foi possível compartilhar os dados.");
        }
    },

    async shareAnnotationData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const message = `*Anotação Realizada*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n\n*Anotação:*\n${data.text}`;
            if (navigator.share && data.imageUrl) {
                try {
                    const response = await fetch(data.imageUrl);
                    const blob = await response.blob();
                    const file = new File([blob], 'foto.jpg', { type: 'image/jpeg' });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ text: message, files: [file] });
                        return;
                    }
                } catch (shareError) { console.error("Erro no compartilhamento nativo com imagem:", shareError); }
            }
            const messageWithImageLink = data.imageUrl ? `${message}\n\n*Foto:* ${data.imageUrl}` : message;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(messageWithImageLink)}`, '_blank');
        } catch (error) {
            console.error("Erro ao compartilhar dados de anotação:", error);
            alert("Não foi possível compartilhar os dados da anotação.");
        }
    },

    initSwipeToDelete() { /* ... código existente sem alterações ... */ },
    closeActiveSwipeCard() { /* ... código existente sem alterações ... */ },
    removeCardFromUI(buttonElement) { /* ... código existente sem alterações ... */ },

    async handleDeleteRecord(recordId, talhaoId, recordType, buttonElement, isPending, isLocal) {
        const confirmationMessage = `Tem certeza que deseja excluir est${recordType === 'annotation' ? 'a anotação' : 'e registro'}?`;
        if (confirm(confirmationMessage)) {
            this.removeCardFromUI(buttonElement);
            if (recordType === 'annotation') {
                if (isLocal) { await deleteAnotacao(talhaoId, recordId); } 
                else {
                    await deletePendingAnotacaoByLocalId(recordId);
                    await DataManager.deleteMonitoringRecord(recordId);
                }
            } else if (isPending) { await deletePendingCsv(recordId); } 
            else { await DataManager.deleteMonitoringRecord(recordId); }
            window.dispatchEvent(new Event('monitoringUpdated'));
        }
    }
};

UI.initSwipeToDelete = function() {
    const cards = document.querySelectorAll('.swipe-card-content'); let startX, currentX, isDragging;
    const handleDragStart = (e) => { if (this.activeSwipeCard && this.activeSwipeCard !== e.currentTarget.parentElement) this.closeActiveSwipeCard(); isDragging = true; startX = e.pageX || e.touches[0].pageX; e.currentTarget.style.transition = 'none'; };
    const handleDragMove = (e) => { if (!isDragging) return; currentX = e.pageX || e.touches[0].pageX; const deltaX = currentX - startX; if (deltaX < 0) e.currentTarget.style.transform = `translateX(${Math.max(-80, deltaX)}px)`; };
    const handleDragEnd = (e) => { if (!isDragging) return; isDragging = false; const cardContent = e.currentTarget; cardContent.style.transition = 'transform 0.3s ease'; const deltaX = currentX - startX; if (deltaX < -40) { cardContent.style.transform = 'translateX(-80px)'; this.activeSwipeCard = cardContent.parentElement; } else { cardContent.style.transform = 'translateX(0)'; if (this.activeSwipeCard === cardContent.parentElement) this.activeSwipeCard = null; } startX = null; currentX = null; };
    cards.forEach(card => { card.addEventListener('mousedown', handleDragStart); card.addEventListener('touchstart', handleDragStart, { passive: true }); card.addEventListener('mousemove', handleDragMove); card.addEventListener('touchmove', handleDragMove, { passive: true }); card.addEventListener('mouseup', handleDragEnd); card.addEventListener('mouseleave', handleDragEnd); card.addEventListener('touchend', handleDragEnd); });
};
UI.closeActiveSwipeCard = function() { if (this.activeSwipeCard) { this.activeSwipeCard.querySelector('.swipe-card-content').style.transform = 'translateX(0)'; this.activeSwipeCard = null; } };
UI.removeCardFromUI = function(buttonElement) { const cardWrapper = buttonElement.closest('.swipe-card-wrapper'); if (cardWrapper) { cardWrapper.style.transition = 'opacity 0.3s ease, transform 0.3s ease'; cardWrapper.style.opacity = '0'; cardWrapper.style.transform = 'scale(0.9)'; setTimeout(() => cardWrapper.remove(), 300); } };