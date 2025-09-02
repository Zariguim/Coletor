// ===================================================================================
//  MÓDULO DE GERENCIAMENTO DA INTERFACE DO USUÁRIO (UI)
// ===================================================================================

const UI = {
    // ... (propriedades do DOM permanecem as mesmas) ...
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
        anotacaoBtn: document.getElementById('anotacao-btn'), // ID do novo botão
        downloadCsvBtn: document.getElementById('download-csv-btn'),
        modalHeader: document.getElementById('modal-header-clickable'),
        monitoringHistory: document.getElementById('monitoring-history'),
    },

    mainFabOriginalIcon: null,
    activeSwipeCard: null, // Guarda a referência do card que está "aberto"

    /**
     * Inicializa o módulo da UI.
     */
    init() {
        this.mainFabOriginalIcon = this.dom.mainFabBtn.innerHTML;
        this.dom.fazendaSelect.classList.add('select-placeholder');
        this.initModalToggle();
        if (navigator.onLine) DataManager.fetchAndCacheAllHistory();

        // Adiciona um listener global para fechar o swipe ao clicar em qualquer outro lugar
        document.addEventListener('click', (e) => {
            if (this.activeSwipeCard && !this.activeSwipeCard.contains(e.target)) {
                this.closeActiveSwipeCard();
            }
        });
    },
    
    // ... (setStatus, setSyncStatus, updateSyncProgress, populateFazendaSelect, showTalhaoInfo, hideTalhaoInfo, toggleLocateButton, updateFinalizeButtonVisibility, startManualPlacementMode, endManualPlacementMode, initModalToggle permanecem iguais) ...

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
        if (type) {
            this.dom.syncStatusBar.classList.add(type);
        }
        if (showProgressBar) {
            this.dom.syncProgressBarContainer.classList.remove('hidden');
        } else {
            this.dom.syncProgressBarContainer.classList.add('hidden');
            this.dom.syncProgressBar.style.width = '0%';
        }
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
        if(isLocating) {
            this.dom.locateBtn.classList.add('locate-btn-active');
        } else {
            this.dom.locateBtn.classList.remove('locate-btn-active');
        }
    },
    
    updateFinalizeButtonVisibility() {
        let hasPendingRecords = false;
        for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i).startsWith('registros_')) {
                hasPendingRecords = true;
                break;
            }
        }

        if (hasPendingRecords) {
            this.dom.downloadCsvBtn.classList.remove('hidden');
        } else {
            this.dom.downloadCsvBtn.classList.add('hidden');
        }
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
            // Busca todos os tipos de registros
            const [localPendingCsvs, localHistoryCsvs, localAnotacoes] = await Promise.all([
                getPendingCsvs(), 
                getHistory(),
                getAnotacoes(talhaoId)
            ]);

            const relevantPending = localPendingCsvs.filter(csv => csv.talhao === talhaoName && csv.fazenda === fazendaName);
            const relevantHistory = localHistoryCsvs.filter(csv => csv.talhao === talhaoName && csv.fazenda === fazendaName);
            
            // Mapeia os CSVs para um formato unificado
            const monitoramentos = [...relevantPending, ...relevantHistory].map(r => ({ ...r, type: 'monitoring' }));
            
            // Mapeia as anotações para o mesmo formato
            const anotacoes = (localAnotacoes || []).map(a => ({ ...a, type: 'annotation' }));

            // Combina, ordena por data e remove duplicatas
            const allRecordsMap = new Map();
            [...monitoramentos, ...anotacoes].forEach(record => {
                const key = record.id || record.data;
                if (!allRecordsMap.has(key)) allRecordsMap.set(key, record);
            });
            const allRecords = Array.from(allRecordsMap.values());
            allRecords.sort((a, b) => new Date(b.data) - new Date(a.data));

            if (allRecords.length === 0) {
                this.dom.monitoringHistory.innerHTML = '<p class="text-center text-gray-500">Nenhum registro para este talhão.</p>';
                return;
            }
            
            let historyHtml = '';
            allRecords.forEach(record => {
                if (record.type === 'monitoring') {
                    historyHtml += this.createMonitoringCard(record, fazendaName, talhaoName);
                } else if (record.type === 'annotation') {
                    historyHtml += this.createAnnotationCard(record);
                }
            });
            
            this.dom.monitoringHistory.innerHTML = historyHtml;
            this.initSwipeToDelete();

        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
            this.dom.monitoringHistory.innerHTML = '<p class="text-center text-red-500">Erro ao carregar histórico.</p>';
        }
    },

    createAnnotationCard(record) {
        const annotationDate = new Date(record.data).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit'
        });

        // Simula a função de delete para anotações
        const deleteAction = `UI.handleDeleteAnotacao('${record.id}', '${record.talhaoId}', this)`;

        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header">
                        <h4>Anotação - ${annotationDate}</h4>
                    </div>
                    <p class="whitespace-pre-wrap">${record.texto}</p>
                </div>
            </div>
        `;
    },

    createMonitoringCard(record, fazendaName, talhaoName) {
        if (!record.csv) return '';
        const lines = record.csv.trim().split('\n');
        if (lines.length <= 1) return '';

        const header = lines[0].split(',');
        const dataRows = lines.slice(1);
        
        const numPoints = dataRows.length;
        if (numPoints === 0) return '';

        const alvos = header.slice(2);
        const alvoSums = {};
        alvos.forEach(alvo => { alvoSums[alvo] = 0; });

        dataRows.forEach(rowStr => {
            const values = rowStr.split(',');
            alvos.forEach((alvoName, index) => {
                const incidence = parseFloat(values[index + 2]);
                if (!isNaN(incidence)) {
                    alvoSums[alvoName] += incidence;
                }
            });
        });

        let averagesHtml = '';
        let averagesTextForShare = '';
        let hasAverages = false;

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

        const monitoringDate = new Date(record.data).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit'
        });

        const sharePayload = {
            fazenda: fazendaName,
            talhao: talhaoName,
            date: monitoringDate,
            points: numPoints,
            averages: averagesTextForShare.trim()
        };
        
        const payloadString = JSON.stringify(sharePayload).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        
        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="UI.handleDeleteMonitoring(${record.id}, this)">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header">
                        <h4>${record.tag || 'Monitoramento'} - ${monitoringDate}</h4>
                        <button class="share-btn" onclick='UI.shareMonitoringData(\`${payloadString}\`)'>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                        </button>
                    </div>
                    <p><strong>Número de pontos:</strong> ${numPoints}</p>
                    <div class="averages-list">
                        <p><strong>Médias:</strong></p>
                        ${averagesHtml}
                    </div>
                </div>
            </div>
        `;
    },

    shareMonitoringData(payloadString) {
        try {
            const data = JSON.parse(payloadString);
            let message = `*Monitoramento Realizado*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n*Nº de Pontos:* ${data.points}\n\n*Médias de Incidência:*\n${data.averages}`;
            const encodedMessage = encodeURIComponent(message);
            window.open(`https://api.whatsapp.com/send?text=${encodedMessage}`, '_blank');
        } catch (error) {
            console.error("Erro ao compartilhar dados:", error);
            alert("Não foi possível compartilhar os dados.");
        }
    },

    /**
     * Inicia os listeners de eventos para a funcionalidade de arrastar para excluir.
     */
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

    /**
     * Fecha o card que está com a opção de exclusão visível.
     */
    closeActiveSwipeCard() {
        if (this.activeSwipeCard) {
            this.activeSwipeCard.querySelector('.swipe-card-content').style.transform = 'translateX(0)';
            this.activeSwipeCard = null;
        }
    },
    
    /**
     * Lida com o clique no botão de exclusão de um monitoramento.
     * @param {number} recordId - O ID do registro a ser excluído.
     * @param {HTMLElement} buttonElement - O elemento do botão que foi clicado.
     */
    handleDeleteMonitoring(recordId, buttonElement) {
        if (confirm('Tem certeza que deseja excluir este monitoramento? Esta ação não pode ser desfeita.')) {
            const cardWrapper = buttonElement.closest('.swipe-card-wrapper');
            cardWrapper.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            cardWrapper.style.opacity = '0';
            cardWrapper.style.transform = 'scale(0.9)';

            setTimeout(() => {
                cardWrapper.remove();
            }, 300);

            DataManager.deleteMonitoringRecord(recordId);
        }
    },

    /**
     * Lida com o clique no botão de exclusão de uma anotação.
     * @param {string} recordId - O ID da anotação a ser excluída.
     * @param {string} talhaoId - O ID do talhão ao qual a anotação pertence.
     * @param {HTMLElement} buttonElement - O elemento do botão que foi clicado.
     */
    async handleDeleteAnotacao(recordId, talhaoId, buttonElement) {
        if (confirm('Tem certeza que deseja excluir esta anotação?')) {
            const cardWrapper = buttonElement.closest('.swipe-card-wrapper');
            cardWrapper.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            cardWrapper.style.opacity = '0';
            cardWrapper.style.transform = 'scale(0.9)';

            setTimeout(() => cardWrapper.remove(), 300);
            
            await deleteAnotacao(talhaoId, recordId);
            const event = new Event('monitoringUpdated');
            window.dispatchEvent(event);
        }
    }
};