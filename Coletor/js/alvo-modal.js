// ===================================================================================
//  MÓDULO PARA GERENCIAR O MODAL DE ALVOS (ATUALIZADO)
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
        alvos: [],
        getCurrentLocation: null,
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

    // ... (todo o resto do código do AlvoModal permanece o mesmo) ...
    render() {
        this.dom.alvoList.innerHTML = '';
        if (this.state.alvos.length === 0) {
            this.dom.alvoList.innerHTML = `<p class="text-center text-gray-500">Nenhum alvo adicionado.</p>`;
        } else {
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
    
                item.querySelector('.alvo-item-delete-btn').addEventListener('click', () => this.removeAlvo(alvo.name));
                item.querySelector('.dec-btn').addEventListener('click', () => this.changeIncidence(alvo.name, -1));
                item.querySelector('.inc-btn').addEventListener('click', () => this.changeIncidence(alvo.name, 1));
            });
        }
    },
};

// A LINHA ABAIXO FOI REMOVIDA
// AlvoModal.init();