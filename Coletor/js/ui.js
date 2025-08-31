// ===================================================================================
//  MÓDULO DE GERENCIAMENTO DA INTERFACE DO USUÁRIO (UI)
// ===================================================================================

const UI = {
    // --- ELEMENTOS DO DOM ---
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
        closeModalBtn: document.getElementById('close-modal-btn'),
        locateBtn: document.getElementById('locate-btn'),
        fabContainer: document.getElementById('fab-container'),
        mainFabBtn: document.getElementById('main-fab-btn'),
        alvoBtn: document.getElementById('alvo-btn'),
        downloadCsvBtn: document.getElementById('download-csv-btn'),
    },

    mainFabOriginalIcon: null,

    /**
     * Inicializa o módulo da UI.
     */
    init() {
        this.mainFabOriginalIcon = this.dom.mainFabBtn.innerHTML;
        this.dom.fazendaSelect.classList.add('select-placeholder');
    },

    /**
     * Define o status de carregamento geral da aplicação.
     * @param {boolean} show - Se deve mostrar ou esconder o overlay.
     * @param {string} text - O texto a ser exibido.
     * @param {boolean} showSpinner - Se deve mostrar o ícone de carregamento.
     */
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

    /**
     * Define o status da barra de sincronização no topo da tela.
     * @param {string} text - O texto a ser exibido.
     * @param {string|null} type - O tipo de status ('syncing', 'success', 'warning').
     * @param {boolean} autoHide - Se a barra deve desaparecer automaticamente.
     * @param {boolean} showProgressBar - Se deve mostrar a barra de progresso.
     */
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
    
    /**
     * Atualiza a barra de progresso da sincronização.
     * @param {number} progress - O progresso de 0 a 100.
     */
    updateSyncProgress(progress) {
        this.dom.syncProgressBar.style.width = `${progress}%`;
    },

    /**
     * Popula o seletor de fazendas.
     * @param {Array<string>} fazendas - Uma lista com os nomes das fazendas.
     */
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

    /**
     * Exibe o modal com as informações do talhão.
     * @param {object} talhao - O objeto de dados do talhão.
     * @param {number} areaEmHectares - A área calculada do talhão.
     */
    showTalhaoInfo(talhao, areaEmHectares) {
        this.dom.talhaoNome.textContent = talhao.nome_talhao;
        this.dom.talhaoHectares.textContent = `${areaEmHectares} ha`;
        this.dom.infoModal.classList.add('show');
        this.dom.fabContainer.classList.remove('hidden');
    },
    
    /**
     * Esconde o modal de informações do talhão.
     */
    hideTalhaoInfo() {
        this.dom.infoModal.classList.remove('show');
        this.dom.fabContainer.classList.add('hidden');
        this.dom.fabContainer.classList.remove('open');
    },

    /**
     * Alterna o estado visual do botão de localização.
     * @param {boolean} isLocating - Se a localização está ativa.
     */
    toggleLocateButton(isLocating) {
        if(isLocating) {
            this.dom.locateBtn.classList.add('locate-btn-active');
        } else {
            this.dom.locateBtn.classList.remove('locate-btn-active');
        }
    },
    
    /**
     * Atualiza a visibilidade do botão "Finalizar monitoria".
     */
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

    /**
     * Prepara a UI para o modo de posicionamento manual de pino.
     */
    startManualPlacementMode() {
        this.dom.fabContainer.classList.remove('open');
        this.setSyncStatus('Arraste o pino para o local e confirme no botão (✓)', 'syncing', false);
        this.dom.mainFabBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
    },
    
    /**
     * Restaura a UI ao estado normal após o posicionamento manual.
     */
    endManualPlacementMode(callback) {
        this.dom.mainFabBtn.innerHTML = this.mainFabOriginalIcon;
        this.dom.mainFabBtn.onclick = callback;
        this.setSyncStatus('', null);
    }
};