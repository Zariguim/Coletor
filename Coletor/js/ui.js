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
        recomendacaoBtn: document.getElementById('recomendacao-btn'),
        downloadCsvBtn: document.getElementById('download-csv-btn'),
        modalHeader: document.getElementById('modal-header-clickable'),
        monitoringHistory: document.getElementById('monitoring-history'),
        fullscreenViewer: document.getElementById('fullscreen-viewer'),
        fullscreenImage: document.getElementById('fullscreen-image'),
        fullscreenCloseBtn: document.getElementById('fullscreen-close-btn'),
        historyFilter: document.getElementById('history-filter'),
        openRelatorioBtn: document.getElementById('open-relatorio-modal-btn'),
    },

    mainFabOriginalIcon: null,
    activeSwipeCard: null,

    init() {
        this.mainFabOriginalIcon = this.dom.mainFabBtn.innerHTML;
        this.dom.fazendaSelect.classList.add('select-placeholder');
        this.initModalToggle();
        
        this.dom.openRelatorioBtn.addEventListener('click', () => {
             if (MapManager.selectedLayer) {
                RelatorioModal.open(MapManager.selectedLayer.talhaoData);
            } else {
                alert("Selecione um talhão para gerar um relatório.");
            }
        });

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
                let type = 'monitoring';
                if (r.tag === 'Anotação') type = 'annotation';
                else if (r.tag === 'Demarcação') type = 'demarcation';
                else if (r.tag === 'População') type = 'population';
                else if (r.tag === 'Aferição de plantio') type = 'planting_assessment';
                else if (r.tag === 'Perca na colheita') type = 'harvest_loss';
                else if (r.tag === 'Estimativa de produtividade') type = 'productivity_estimation';
                else if (r.tag === 'Recomendação') type = 'recomendacao';
                else if (r.tag === 'Relatório') type = 'Relatório';
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
                if (record.type === 'monitoring') return UICards.createMonitoringCard(record);
                if (record.type === 'annotation') return UICards.createAnnotationCard(record);
                if (record.type === 'demarcation') return UICards.createDemarcationCard(record);
                if (record.type === 'population') return UICards.createPopulationCard(record);
                if (record.type === 'planting_assessment') return UICards.createPlantingAssessmentCard(record);
                if (record.type === 'harvest_loss') return UICards.createHarvestLossCard(record);
                if (record.type === 'productivity_estimation') return UICards.createEstimativaProdutividadeCard(record);
                if (record.type === 'recomendacao') return UICards.createRecomendacaoCard(record);
                if (record.type === 'Relatório') return UICards.createRelatorioCard(record);
                return '';
            }).join('');
            
            this.dom.monitoringHistory.innerHTML = historyHtml;
            this.initSwipeToDelete();
        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
            this.dom.monitoringHistory.innerHTML = '<p class="text-center text-red-500">Erro ao carregar histórico.</p>';
        }
    },

    initSwipeToDelete() {
        const cards = document.querySelectorAll('.swipe-card-content');
        let startX, currentX, isDragging;
        
        const handleDragStart = (e) => {
            if (this.activeSwipeCard && this.activeSwipeCard !== e.currentTarget.parentElement) {
                this.closeActiveSwipeCard();
            }
            isDragging = true;
            startX = e.pageX || e.touches[0].pageX;
            e.currentTarget.style.transition = 'none';
        };
        
        const handleDragMove = (e) => {
            if (!isDragging) return;
            currentX = e.pageX || e.touches[0].pageX;
            const deltaX = currentX - startX;
            if (deltaX < 0) {
                e.currentTarget.style.transform = `translateX(${Math.max(-80, deltaX)}px)`;
            }
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
                if (this.activeSwipeCard === cardContent.parentElement) {
                    this.activeSwipeCard = null;
                }
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
    },

    closeActiveSwipeCard() {
        if (this.activeSwipeCard) {
            this.activeSwipeCard.querySelector('.swipe-card-content').style.transform = 'translateX(0)';
            this.activeSwipeCard = null;
        }
    },

    removeCardFromUI(buttonElement) {
        const cardWrapper = buttonElement.closest('.swipe-card-wrapper');
        if (cardWrapper) {
            cardWrapper.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            cardWrapper.style.opacity = '0';
            cardWrapper.style.transform = 'scale(0.9)';
            setTimeout(() => cardWrapper.remove(), 300);
        }
    },

    async handleDeleteRecord(recordId, talhaoId, recordType, buttonElement, isPending, isLocal) {
        const confirmationMessage = `Tem certeza que deseja excluir est${recordType === 'annotation' ? 'a anotação' : 'e registro'}?`;
        if (confirm(confirmationMessage)) {
            this.removeCardFromUI(buttonElement);
            if (recordType === 'annotation') {
                if (isLocal) {
                    await deleteAnotacao(talhaoId, recordId);
                } else {
                    await deletePendingAnotacaoByLocalId(recordId);
                    await DataManager.deleteMonitoringRecord(recordId);
                }
            } else if (isPending) {
                await deletePendingCsv(recordId);
            } else {
                await DataManager.deleteMonitoringRecord(recordId);
            }
            window.dispatchEvent(new Event('monitoringUpdated'));
        }
    }
};