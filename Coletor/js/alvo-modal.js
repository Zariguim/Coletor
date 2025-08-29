// ===================================================================================
//  MÓDULO PARA GERENCIAR O MODAL DE ALVOS
// ===================================================================================

const AlvoModal = {
    // --- ELEMENTOS DO DOM ---
    dom: {
        modal: document.getElementById('alvo-modal'),
        closeBtn: document.getElementById('alvo-modal-close-btn'),
        alvoInput: document.getElementById('alvo-input'),
        addAlvoBtn: document.getElementById('add-alvo-btn'),
        alvoList: document.getElementById('alvo-list'),
        saveBtn: document.getElementById('save-alvos-btn'),
    },

    // --- ESTADO ---
    state: {
        currentTalhaoId: null,
        alvos: [], // Array de objetos { name: 'Buva', incidence: 1 }
    },

    /**
     * Inicializa o modal, adicionando os eventos.
     */
    init() {
        this.dom.closeBtn.addEventListener('click', () => this.close());
        this.dom.saveBtn.addEventListener('click', () => this.save());
        this.dom.addAlvoBtn.addEventListener('click', () => this.addAlvoFromInput());
        this.dom.alvoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addAlvoFromInput();
        });
    },

    /**
     * Abre o modal, carrega os dados do talhão selecionado.
     * @param {string} talhaoId - O ID do talhão cujos alvos serão editados.
     */
    open(talhaoId) {
        this.state.currentTalhaoId = talhaoId;
        this.loadAlvos();
        this.render();
        this.dom.modal.classList.remove('hidden');
        this.dom.alvoInput.focus();
    },

    /**
     * Fecha o modal.
     */
    close() {
        this.dom.modal.classList.add('hidden');
        this.state.currentTalhaoId = null;
        this.state.alvos = [];
    },

    /**
     * Salva a lista de alvos atual no localStorage.
     */
    save() {
        if (this.state.currentTalhaoId) {
            // Usamos um prefixo para evitar colisões no localStorage
            const key = `alvos_${this.state.currentTalhaoId}`;
            localStorage.setItem(key, JSON.stringify(this.state.alvos));
        }
        this.close();
    },

    /**
     * Carrega a lista de alvos do localStorage para o estado do modal.
     */
    loadAlvos() {
        if (this.state.currentTalhaoId) {
            const key = `alvos_${this.state.currentTalhaoId}`;
            const savedData = localStorage.getItem(key);
            this.state.alvos = savedData ? JSON.parse(savedData) : [];
        }
    },

    /**
     * Adiciona um novo alvo à lista a partir do campo de input.
     */
    addAlvoFromInput() {
        const nomeAlvo = this.dom.alvoInput.value.trim();
        if (nomeAlvo && !this.state.alvos.some(a => a.name === nomeAlvo)) {
            this.state.alvos.unshift({ name: nomeAlvo, incidence: 1 });
            this.dom.alvoInput.value = '';
            this.render();
        }
    },

    /**
     * Remove um alvo da lista.
     * @param {string} nomeAlvo - O nome do alvo a ser removido.
     */
    removeAlvo(nomeAlvo) {
        this.state.alvos = this.state.alvos.filter(a => a.name !== nomeAlvo);
        this.render();
    },

    /**
     * Altera a incidência de um alvo.
     * @param {string} nomeAlvo - O nome do alvo a ser alterado.
     * @param {number} amount - O valor a ser adicionado (1 ou -1).
     */
    changeIncidence(nomeAlvo, amount) {
        const alvo = this.state.alvos.find(a => a.name === nomeAlvo);
        if (alvo) {
            alvo.incidence = Math.max(1, alvo.incidence + amount); // Garante que o mínimo seja 1
            this.render();
        }
    },

    /**
     * Renderiza a lista de alvos na tela.
     */
    render() {
        this.dom.alvoList.innerHTML = '';
        this.state.alvos.forEach(alvo => {
            const item = document.createElement('div');
            item.className = 'alvo-item';
            item.innerHTML = `
                <button class="alvo-item-btn alvo-item-delete-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                </button>
                <span class="font-semibold">${alvo.name}</span>
                <button class="alvo-item-btn dec-btn">-</button>
                <input type="number" class="alvo-item-incidencia" value="${alvo.incidence}" readonly>
                <button class="alvo-item-btn inc-btn">+</button>
            `;
            this.dom.alvoList.appendChild(item);

            // Adiciona eventos aos botões do item recém-criado
            item.querySelector('.alvo-item-delete-btn').addEventListener('click', () => this.removeAlvo(alvo.name));
            item.querySelector('.dec-btn').addEventListener('click', () => this.changeIncidence(alvo.name, -1));
            item.querySelector('.inc-btn').addEventListener('click', () => this.changeIncidence(alvo.name, 1));
        });
    },
};

// Inicializa o módulo
AlvoModal.init();