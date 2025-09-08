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
        downloadCsvBtn: document.getElementById('download-csv-btn'),
        modalHeader: document.getElementById('modal-header-clickable'),
        monitoringHistory: document.getElementById('monitoring-history'),
        fullscreenViewer: document.getElementById('fullscreen-viewer'),
        fullscreenImage: document.getElementById('fullscreen-image'),
        fullscreenCloseBtn: document.getElementById('fullscreen-close-btn'),
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
        try {
            const [syncedHistory, localAnotacoes, pendingCsvs] = await Promise.all([
                getHistory(),
                getAnotacoes(talhaoId),
                getPendingCsvs()
            ]);

            const relevantSyncedHistory = syncedHistory.filter(r => r.talhao === talhaoName && r.fazenda === fazendaName);
            const relevantPendingCsvs = pendingCsvs.filter(r => r.talhao === talhaoName && r.fazenda === fazendaName).map(p => ({ ...p, isPending: true }));
            
            const allHistory = [...relevantSyncedHistory, ...relevantPendingCsvs];

            const typedRecords = allHistory.map(r => ({ ...r, type: r.tag === 'Anotação' ? 'annotation' : (r.tag === 'Demarcação' ? 'demarcation' : 'monitoring') }));
            const localAnnotationRecords = (localAnotacoes || []).map(a => ({ ...a, type: 'annotation' }));
            const allRecords = [...typedRecords, ...localAnnotationRecords];
            allRecords.sort((a, b) => new Date(b.data) - new Date(a.data));

            if (allRecords.length === 0) {
                this.dom.monitoringHistory.innerHTML = '<p class="text-center text-gray-500">Nenhum registro para este talhão.</p>';
                return;
            }

            const historyHtml = allRecords.map(record => {
                if (record.type === 'monitoring') return this.createMonitoringCard(record);
                if (record.type === 'annotation') return this.createAnnotationCard(record);
                if (record.type === 'demarcation') return this.createDemarcationCard(record);
                return '';
            }).join('');
            
            this.dom.monitoringHistory.innerHTML = historyHtml;
            this.initSwipeToDelete();
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
            this.dom.monitoringHistory.innerHTML = '<p class="text-center text-red-500">Erro ao carregar histórico.</p>';
        }
    },

    createDemarcationCard(record) {
        if (!record.csv) return '';
        const demarcationDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'demarcation', this, ${record.isPending || false})`;

        let description = 'Demarcação de área';
        let kmlContent = '';
        const parts = record.csv.split('\n');
        if (parts.length > 1 && parts[0].includes('description')) {
            const data = parts[1].split('","');
            description = data[0].replace(/^"/, '');
            kmlContent = data[1].replace(/"$/, '').replace(/""/g, '"');
        }
        
        const safeKmlContent = encodeURIComponent(kmlContent);
        
        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div class="monitoring-card swipe-card-content" onclick="MapManager.drawKmlOnMap('${safeKmlContent}')">
                    <div class="monitoring-card-header">
                        <h4>Demarcação - ${demarcationDate}</h4>
                    </div>
                    <p class="whitespace-pre-wrap">${description}</p>
                </div>
            </div>`;
    },

    createAnnotationCard(record) {
        const annotationDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const recordIdString = typeof record.id === 'string' ? `'${record.id}'` : record.id;
        const deleteAction = `UI.handleDeleteRecord(${recordIdString}, '${record.talhaoId}', 'annotation', this, false)`;

        let textContent = record.texto || '';
        let imageUrl = record.foto || '';

        if (record.csv) {
            const lines = record.csv.split('\n');
            const header = lines[0].split(',');
            const data = lines.length > 1 ? lines[1].split(',') : [];
            const anotacaoIndex = header.indexOf('anotacao');
            const fotoUrlIndex = header.indexOf('foto_url');
            if (anotacaoIndex !== -1 && data[anotacaoIndex]) textContent = data[anotacaoIndex].replace(/^"|"$/g, '').replace(/""/g, '"');
            if (fotoUrlIndex !== -1 && data[fotoUrlIndex]) {
                const url = data[fotoUrlIndex].replace(/"/g, '');
                if (url) imageUrl = url;
            }
        }
        
        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: annotationDate, text: textContent, imageUrl: imageUrl };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        
        const imageHtml = imageUrl ? `<img src="${imageUrl}" alt="Foto da anotação" class="annotation-photo" loading="lazy" onclick="event.stopPropagation(); UI.showFullscreenImage('${imageUrl}')">` : '';
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UI.shareAnnotationData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;

        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
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
        
        const numPoints = dataRows.length;
        const alvos = header.slice(2);
        const alvoSums = {};
        
        dataRows.forEach(rowStr => {
            const values = rowStr.split(',');
            alvos.forEach((alvoName, index) => {
                const incidence = parseFloat(values[index + 2]);
                if (!isNaN(incidence)) alvoSums[alvoName] = (alvoSums[alvoName] || 0) + incidence;
            });
        });

        let averagesHtml = '', averagesTextForShare = '', hasAverages = false;
        for (const alvoName in alvoSums) {
            const totalIncidence = alvoSums[alvoName];
            if (totalIncidence > 0) {
                const average = (totalIncidence / numPoints).toFixed(1).replace('.', ',');
                averagesHtml += `<p>${alvoName}: ${average}</p>`;
                averagesTextForShare += `${alvoName}: ${average}\n`;
                hasAverages = true;
            }
        }
        if (!hasAverages) {
            averagesHtml = '<p class="text-sm text-gray-500">Nenhuma praga encontrada.</p>';
            averagesTextForShare = 'Nenhuma praga encontrada.';
        }

        const monitoringDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: monitoringDate, points: numPoints, averages: averagesTextForShare.trim() };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'monitoring', this, ${record.isPending || false})`;
        const shareButtonHtml = `<button class="share-btn" onclick="UI.shareMonitoringData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;
        
        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>${record.tag || 'Monitoramento'} - ${monitoringDate}</h4>${shareButtonHtml}</div>
                    <p><strong>Número de pontos:</strong> ${numPoints}</p>
                    <div class="averages-list"><p><strong>Médias:</strong></p>${averagesHtml}</div>
                </div>
            </div>`;
    },

    shareMonitoringData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const message = `*Monitoramento Realizado*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n*Nº de Pontos:* ${data.points}\n\n*Médias de Incidência:*\n${data.averages}`;
            if (navigator.share) {
                navigator.share({ text: message });
            } else {
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
            }
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
                } catch (shareError) {
                    console.error("Erro no compartilhamento nativo com imagem, usando fallback:", shareError);
                }
            }

            const messageWithImageLink = data.imageUrl ? `${message}\n\n*Foto:* ${data.imageUrl}` : message;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(messageWithImageLink)}`, '_blank');
        } catch (error) {
            console.error("Erro ao compartilhar dados de anotação:", error);
            alert("Não foi possível compartilhar os dados da anotação.");
        }
    },

    initSwipeToDelete() {
        // ... (código existente sem alterações)
    },

    closeActiveSwipeCard() {
        // ... (código existente sem alterações)
    },
    
    removeCardFromUI(buttonElement) {
        // ... (código existente sem alterações)
    },

    async handleDeleteRecord(recordId, talhaoId, recordType, buttonElement, isPending) {
        const confirmationMessage = `Tem certeza que deseja excluir est${recordType === 'annotation' ? 'a anotação' : 'e registro'}?`;

        if (confirm(confirmationMessage)) {
            this.removeCardFromUI(buttonElement);
            
            if (recordType === 'annotation') {
                await deleteAnotacao(talhaoId, recordId);
            } else if (isPending) {
                await deletePendingCsv(recordId);
            } else {
                await DataManager.deleteMonitoringRecord(recordId);
            }
            
            window.dispatchEvent(new Event('monitoringUpdated'));
        }
    }
};

UI.initSwipeToDelete = function() {
    const cards = document.querySelectorAll('.swipe-card-content');
    let startX, currentX, isDragging;
    const handleDragStart = (e) => {
        if (this.activeSwipeCard && this.activeSwipeCard !== e.currentTarget.parentElement) this.closeActiveSwipeCard();
        isDragging = true;
        startX = e.pageX || e.touches[0].pageX;
        e.currentTarget.style.transition = 'none';
    };
    const handleDragMove = (e) => {
        if (!isDragging) return;
        currentX = e.pageX || e.touches[0].pageX;
        const deltaX = currentX - startX;
        if (deltaX < 0) e.currentTarget.style.transform = `translateX(${Math.max(-80, deltaX)}px)`;
    };
    const handleDragEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        const cardContent = e.currentTarget;
        cardContent.style.transition = 'transform 0.3s ease';
        const deltaX = currentX - startX;
        if (deltaX < -40) {
            cardContent.style.transform = 'translateX(-80px)';
            this.activeSwipeCard = cardContent.parentElement;
        } else {
            cardContent.style.transform = 'translateX(0)';
            if (this.activeSwipeCard === cardContent.parentElement) this.activeSwipeCard = null;
        }
        startX = null;
        currentX = null;
    };
    cards.forEach(card => {
        card.addEventListener('mousedown', handleDragStart);
        card.addEventListener('touchstart', handleDragStart, { passive: true });
        card.addEventListener('mousemove', handleDragMove);
        card.addEventListener('touchmove', handleDragMove, { passive: true });
        card.addEventListener('mouseup', handleDragEnd);
        card.addEventListener('mouseleave', handleDragEnd);
        card.addEventListener('touchend', handleDragEnd);
    });
};
UI.closeActiveSwipeCard = function() {
    if (this.activeSwipeCard) {
        this.activeSwipeCard.querySelector('.swipe-card-content').style.transform = 'translateX(0)';
        this.activeSwipeCard = null;
    }
};
UI.removeCardFromUI = function(buttonElement) {
    const cardWrapper = buttonElement.closest('.swipe-card-wrapper');
    if (cardWrapper) {
        cardWrapper.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        cardWrapper.style.opacity = '0';
        cardWrapper.style.transform = 'scale(0.9)';
        setTimeout(() => cardWrapper.remove(), 300);
    }
};