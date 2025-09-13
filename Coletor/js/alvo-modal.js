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
        alvos: [], // Array de objetos { name: 'Buva', incidence: 1 }
        getCurrentLocation: null, // Armazena a função para buscar a localização
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
     * @param {function} getCurrentLocationFn - Função para obter a localização atual do app.js.
     */
    open(talhaoId, getCurrentLocationFn) {
        this.state.currentTalhaoId = talhaoId;
        this.state.getCurrentLocation = getCurrentLocationFn; // Armazena a função
        this.loadAlvos(); // Carrega os alvos do último ponto
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
        this.state.getCurrentLocation = null;
    },

    /**
     * Salva a lista de alvos atual como um novo registro no localStorage.
     */
    save() {
        if (!this.state.currentTalhaoId) return;

        // 1. Obter a localização atual usando a função passada pelo app.js
        if (!this.state.getCurrentLocation) {
            alert("Erro: Função de geolocalização não foi inicializada.");
            return;
        }
        // CORREÇÃO: A função getCurrentLocation pode retornar null, então tratamos isso.
        const location = this.state.getCurrentLocation();
        if (!location) {
            alert("Localização do usuário não encontrada. Ative a função 'Localizar' e tente novamente.");
            return;
        }

        const { lat, lng } = location;

        // 2. Criar o novo registro
        const newRecord = {
            lat: lat,
            lng: lng,
            alvos: this.state.alvos // Salva o objeto completo {name, incidence}
        };

        // 3. Adicionar o novo registro aos registros existentes no localStorage
        const storageKey = `registros_${this.state.currentTalhaoId}`;
        const existingRecordsJSON = localStorage.getItem(storageKey);
        const records = existingRecordsJSON ? JSON.parse(existingRecordsJSON) : [];
        
        records.push(newRecord);
        
        localStorage.setItem(storageKey, JSON.stringify(records));

        // 4. Dispara um evento para notificar a aplicação que os dados foram atualizados
        const event = new Event('monitoringUpdated');
        window.dispatchEvent(event);

        alert("Ponto salvo com sucesso!");
        this.close();
    },

    /**
     * Carrega uma lista única de todos os alvos já registrados para o talhão atual.
     */
    loadAlvos() {
        const storageKey = `registros_${this.state.currentTalhaoId}`;
        const existingRecordsJSON = localStorage.getItem(storageKey);
        const records = existingRecordsJSON ? JSON.parse(existingRecordsJSON) : [];

        if (records.length > 0) {
            const allAlvoNames = new Set();
            // Itera sobre TODOS os registros para coletar todos os nomes de alvos
            records.forEach(record => {
                if (record.alvos && record.alvos.length > 0) {
                    record.alvos.forEach(alvo => {
                        allAlvoNames.add(alvo.name);
                    });
                }
            });

            // Converte o Set de nomes únicos para o formato de objeto esperado, com incidência 1
            this.state.alvos = Array.from(allAlvoNames).map(name => ({ name: name, incidence: 1 }));
        } else {
            // Se não houver registros, a lista de alvos começa vazia
            this.state.alvos = [];
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
    
                // Adiciona eventos aos botões do item recém-criado
                item.querySelector('.alvo-item-delete-btn').addEventListener('click', () => this.removeAlvo(alvo.name));
                item.querySelector('.dec-btn').addEventListener('click', () => this.changeIncidence(alvo.name, -1));
                item.querySelector('.inc-btn').addEventListener('click', () => this.changeIncidence(alvo.name, 1));
            });
        }
    },
};

// Inicializa o módulo
AlvoModal.init();