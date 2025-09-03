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
        downloadCsvBtn: document.getElementById('download-csv-btn'),
        modalHeader: document.getElementById('modal-header-clickable'),
        monitoringHistory: document.getElementById('monitoring-history'),
    },

    mainFabOriginalIcon: null,
    activeSwipeCard: null,

    /**
     * Inicializa o módulo da UI.
     */
    init() {
        this.mainFabOriginalIcon = this.dom.mainFabBtn.innerHTML;
        this.dom.fazendaSelect.classList.add('select-placeholder');
        this.initModalToggle();
        if (navigator.onLine) DataManager.fetchAndCacheAllHistory();

        document.addEventListener('click', (e) => {
            if (this.activeSwipeCard && !this.activeSwipeCard.contains(e.target)) {
                this.closeActiveSwipeCard();
            }
        });
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
    
    /**
     * Exibe o histórico combinado de monitoramentos e anotações para um talhão.
     */
    async displayHistory(talhaoName, fazendaName, talhaoId) {
        this.dom.monitoringHistory.innerHTML = '<p class="text-center text-gray-500">Carregando histórico...</p>';
        try {
            // 1. Busca todos os registros: os sincronizados (histórico) e os que só existem localmente (anotações).
            // Graças à nova lógica de dados, essas duas fontes não terão duplicatas.
            const [localHistory, localAnotacoes] = await Promise.all([
                getHistory(),
                getAnotacoes(talhaoId)
            ]);

            const relevantHistory = localHistory.filter(r => r.talhao === talhaoName && r.fazenda === fazendaName);

            // 2. Mapeia os registros sincronizados para o formato de card.
            const syncedRecords = relevantHistory.map(r => {
                const isAnnotation = r.tag === 'Anotação';
                let textContent = null;

                if (isAnnotation && r.csv) {
                    const lines = r.csv.split('\n');
                    if (lines.length > 1) {
                        const content = lines[1].split(',').slice(2).join(',');
                        textContent = content.startsWith('"') && content.endsWith('"')
                            ? content.slice(1, -1).replace(/""/g, '"')
                            : content;
                    }
                }
                return {
                    id: r.id,
                    type: isAnnotation ? 'annotation' : 'monitoring',
                    data: r.data,
                    tag: r.tag,
                    csv: r.csv,
                    texto: textContent,
                    talhaoId: talhaoId
                };
            });

            // 3. Mapeia as anotações que só existem localmente.
            const localAnnotationRecords = (localAnotacoes || []).map(a => ({ 
                ...a, 
                type: 'annotation' 
            }));

            // 4. Combina as duas listas e ordena por data.
            const allRecords = [...syncedRecords, ...localAnnotationRecords];
            allRecords.sort((a, b) => new Date(b.data) - new Date(a.data));

            if (allRecords.length === 0) {
                this.dom.monitoringHistory.innerHTML = '<p class="text-center text-gray-500">Nenhum registro para este talhão.</p>';
                return;
            }

            // 5. Renderiza os cards na interface.
            let historyHtml = '';
            allRecords.forEach(record => {
                if (record.type === 'monitoring') {
                    historyHtml += this.createMonitoringCard(record, fazendaName, talhaoName);
                } else if (record.type === 'annotation') {
                    historyHtml += this.createAnnotationCard(record, fazendaName, talhaoName);
                }
            });
            
            this.dom.monitoringHistory.innerHTML = historyHtml;
            this.initSwipeToDelete();

        } catch (error) {
            console.error("Erro ao carregar histórico:", error);
            this.dom.monitoringHistory.innerHTML = '<p class="text-center text-red-500">Erro ao carregar histórico.</p>';
        }
    },

    /**
     * Cria o HTML para um card de anotação.
     */
    createAnnotationCard(record, fazendaName, talhaoName) {
        const annotationDate = new Date(record.data).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit'
        });

        // Prepara o ID para ser usado no JS. Se for string ('anot_...'), precisa de aspas na chamada da função.
        const recordIdString = typeof record.id === 'string' ? `'${record.id}'` : record.id;
        const deleteAction = `UI.handleDeleteRecord(${recordIdString}, '${record.talhaoId}', 'annotation', this)`;
        
        const sharePayload = {
            fazenda: fazendaName,
            talhao: talhaoName,
            date: annotationDate,
            text: record.texto
        };

        const payloadString = JSON.stringify(sharePayload).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

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
                        <button class="share-btn" onclick='UI.shareAnnotationData(\`${payloadString}\`)'>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                        </button>
                    </div>
                    <p class="whitespace-pre-wrap">${record.texto}</p>
                </div>
            </div>
        `;
    },

    /**
     * Cria o HTML para um card de monitoramento.
     */
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
        
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'monitoring', this)`;
        
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

    shareAnnotationData(payloadString) {
        try {
            const data = JSON.parse(payloadString);
            let message = `*Anotação Realizada*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n\n*Anotação:*\n${data.text}`;
            const encodedMessage = encodeURIComponent(message);
            window.open(`https://api.whatsapp.com/send?text=${encodedMessage}`, '_blank');
        } catch (error) {
            console.error("Erro ao compartilhar dados de anotação:", error);
            alert("Não foi possível compartilhar os dados da anotação.");
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
            setTimeout(() => {
                cardWrapper.remove();
            }, 300);
        }
    },

    /**
     * Função unificada para deletar qualquer tipo de registro.
     */
    async handleDeleteRecord(recordId, talhaoId, recordType, buttonElement) {
        const isSynced = typeof recordId === 'number';
        const confirmationMessage = recordType === 'annotation' 
            ? 'Tem certeza que deseja excluir esta anotação?'
            : 'Tem certeza que deseja excluir este monitoramento? Esta ação não pode ser desfeita.';

        if (confirm(confirmationMessage)) {
            this.removeCardFromUI(buttonElement);

            if (isSynced) {
                // Deleta do Supabase (e do cache local de histórico)
                DataManager.deleteMonitoringRecord(recordId);
            } else {
                // Deleta a anotação que só existe localmente
                if (recordType === 'annotation' && talhaoId) {
                    await deleteAnotacao(talhaoId, recordId);
                    // Dispara o evento para a UI redesenhar a lista de histórico sem o item deletado.
                    window.dispatchEvent(new Event('monitoringUpdated'));
                }
            }
        }
    }
};