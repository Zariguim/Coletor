// ===================================================================================
//  MÓDULO PARA GERENCIAR O MODAL DE AFERIÇÃO DE PLANTIO (CV)
// ===================================================================================

const CvModal = {
    // --- ESTADO ---
    state: {
        currentTalhao: null,
        sementes: [0], // Semente 1 sempre começa no marco 0
        results: null,
    },

    // --- ELEMENTOS DO DOM (Serão populados no init) ---
    dom: {},

    init() {
        this.createModal(); // Cria a estrutura HTML do modal primeiro

        // Agora popula o objeto dom com os elementos recém-criados
        this.dom = {
            modal: document.getElementById('afericao-plantio-modal'),
            closeBtn: document.getElementById('afericao-plantio-close-btn'),
            posicaoSementeInput: document.getElementById('posicao-semente-input'),
            addSementeBtn: document.getElementById('add-semente-btn'),
            errorMsg: document.getElementById('cv-error-msg'),
            listaSementes: document.getElementById('lista-sementes'),
            resultsDiv: document.getElementById('cv-results'),
            sementesDuplasEl: document.getElementById('sementes-duplas'),
            sementesArrastadasEl: document.getElementById('sementes-arrastadas'),
            sementesFalhasEl: document.getElementById('sementes-falhas'),
            cvFinalEl: document.getElementById('cv-final'),
            limparBtn: document.getElementById('cv-limpar-btn'),
            salvarBtn: document.getElementById('cv-salvar-btn'),
        };
        
        // Adiciona os event listeners
        this.dom.closeBtn.addEventListener('click', () => this.close());
        this.dom.addSementeBtn.addEventListener('click', () => this.adicionarSemente());
        this.dom.posicaoSementeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.adicionarSemente(); });
        this.dom.limparBtn.addEventListener('click', () => this.limparTudo());
        this.dom.salvarBtn.addEventListener('click', () => this.save());
    },

    createModal() {
        const container = document.getElementById('afericao-plantio-modal-container');
        if (container.innerHTML !== '') return; // Previne recriação

        container.innerHTML = `
        <div id="afericao-plantio-modal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-70 z-[1004] flex justify-center items-end sm:items-center">
            <div class="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-t-lg sm:rounded-lg">
                <div class="flex justify-between items-center p-4 border-b flex-shrink-0">
                    <h2 class="text-xl font-bold">Aferição de Plantio (CV)</h2>
                    <button id="afericao-plantio-close-btn" class="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
                </div>
                <div class="p-4 flex-grow overflow-y-auto">
                    <div class="space-y-4">
                        <label for="posicao-semente-input" class="block text-sm font-medium text-gray-700">Posição da nova semente (cm)</label>
                        <div class="flex space-x-3">
                            <input type="number" id="posicao-semente-input" placeholder="Ex: 5.2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition">
                            <button id="add-semente-btn" class="bg-green-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-green-700">Adicionar</button>
                        </div>
                        <p id="cv-error-msg" class="text-red-500 text-sm mt-1 h-4"></p>
                    </div>
                    <div class="mt-8">
                        <h3 class="text-lg font-semibold text-gray-700 mb-3">Sementes Adicionadas</h3>
                        <div id="lista-sementes-container" class="bg-gray-50 p-4 rounded-lg h-40 overflow-y-auto border">
                            <ol id="lista-sementes" class="list-decimal list-inside space-y-2 text-gray-600"></ol>
                        </div>
                    </div>
                    <div id="cv-results" class="mt-6 border-t pt-6 hidden">
                        <h3 class="text-xl font-bold text-gray-800 text-center mb-4">Resultados da Análise</h3>
                        <div class="space-y-3 bg-blue-50 p-4 rounded-lg">
                            <div class="flex justify-between items-center text-md"><span class="text-gray-600">% Sementes Duplas:</span><span id="sementes-duplas" class="font-bold text-red-600"></span></div>
                            <div class="flex justify-between items-center text-md"><span class="text-gray-600">% Sementes com Arraste:</span><span id="sementes-arrastadas" class="font-bold text-orange-600"></span></div>
                            <div class="flex justify-between items-center text-md"><span class="text-gray-600">% Sementes Falhas:</span><span id="sementes-falhas" class="font-bold text-purple-600"></span></div>
                            <div class="border-t my-2"></div>
                            <div class="flex justify-between items-center text-xl bg-blue-200 p-2 rounded-md"><span class="font-bold text-blue-800">CV (%):</span><span id="cv-final" class="font-extrabold text-blue-800"></span></div>
                        </div>
                    </div>
                </div>
                <div class="p-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
                    <button id="cv-limpar-btn" class="w-full bg-gray-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600">Limpar</button>
                    <button id="cv-salvar-btn" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700" disabled>Salvar</button>
                </div>
            </div>
        </div>`;
    },

    open(talhao) {
        this.limparTudo();
        this.state.currentTalhao = talhao;
        this.dom.modal.classList.remove('hidden');
        this.dom.posicaoSementeInput.focus();
    },

    close() {
        this.dom.modal.classList.add('hidden');
        this.state.currentTalhao = null;
    },

    adicionarSemente() {
        this.dom.errorMsg.textContent = '';
        const novaPosicao = parseFloat(this.dom.posicaoSementeInput.value);

        if (isNaN(novaPosicao)) {
            this.dom.errorMsg.textContent = 'Por favor, insira um número válido.'; return;
        }

        const ultimaPosicao = this.state.sementes[this.state.sementes.length - 1];
        if (novaPosicao <= ultimaPosicao) {
            this.dom.errorMsg.textContent = `A posição deve ser maior que ${ultimaPosicao} cm.`; return;
        }

        this.state.sementes.push(novaPosicao);
        this.dom.posicaoSementeInput.value = '';
        this.dom.posicaoSementeInput.focus();
        this.dom.resultsDiv.classList.add('hidden');
        this.dom.salvarBtn.disabled = true;
        this.atualizarLista();
        this.calcular();
    },

    atualizarLista() {
        this.dom.listaSementes.innerHTML = '';
        this.state.sementes.forEach((pos, index) => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center p-1';
            
            const span = document.createElement('span');
            span.textContent = `Semente ${index + 1}: ${pos} cm`;
            li.appendChild(span);

            if (index > 0) {
                const editBtn = document.createElement('button');
                editBtn.className = 'icon-btn ml-4';
                editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500 hover:text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>`;
                editBtn.onclick = () => this.editSemente(index);
                li.appendChild(editBtn);
            }
            
            this.dom.listaSementes.appendChild(li);
        });
        const container = document.getElementById('lista-sementes-container');
        container.scrollTop = container.scrollHeight;
    },

    editSemente(index) {
        this.atualizarLista();
        const li = this.dom.listaSementes.children[index];
        const originalPos = this.state.sementes[index];
        li.innerHTML = ''; 

        const inputContainer = document.createElement('div');
        inputContainer.className = 'flex items-center space-x-2 w-full';

        const input = document.createElement('input');
        input.type = 'number';
        input.value = originalPos;
        input.className = 'w-full px-2 py-1 border border-gray-300 rounded-md';

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Salvar';
        saveBtn.className = 'bg-blue-500 text-white px-3 py-1 text-sm rounded-md hover:bg-blue-600';

        inputContainer.appendChild(input);
        inputContainer.appendChild(saveBtn);
        li.appendChild(inputContainer);
        input.focus();
        input.select();

        const handleSave = () => {
            const novaPosicao = parseFloat(input.value);
            this.dom.errorMsg.textContent = '';

            if (isNaN(novaPosicao)) {
                this.dom.errorMsg.textContent = 'Posição inválida.'; return;
            }

            const posAnterior = this.state.sementes[index - 1];
            if (novaPosicao <= posAnterior) {
                this.dom.errorMsg.textContent = `A posição deve ser > ${posAnterior.toFixed(2)} cm.`; return;
            }

            const posSeguinte = this.state.sementes[index + 1];
            if (posSeguinte !== undefined && novaPosicao >= posSeguinte) {
                this.dom.errorMsg.textContent = `A posição deve ser < ${posSeguinte.toFixed(2)} cm.`; return;
            }
            
            this.state.sementes[index] = novaPosicao;
            this.dom.resultsDiv.classList.add('hidden');
            this.dom.salvarBtn.disabled = true;
            this.atualizarLista();
            this.calcular();
        };
        
        saveBtn.onclick = handleSave;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') saveBtn.click();
            if (e.key === 'Escape') this.atualizarLista();
        };
    },

    calcular() {
        if (this.state.sementes.length < 4) {
             this.dom.resultsDiv.classList.add('hidden');
             this.dom.salvarBtn.disabled = true;
             return;
        }

        const espacamentos = [];
        for (let i = 1; i < this.state.sementes.length; i++) {
            espacamentos.push(this.state.sementes[i] - this.state.sementes[i - 1]);
        }

        if(espacamentos.length === 0) return;
        
        const soma = espacamentos.reduce((acc, val) => acc + val, 0);
        const media = soma / espacamentos.length;
        const sortedEspacamentos = [...espacamentos].sort((a, b) => a - b);
        const mid = Math.floor(sortedEspacamentos.length / 2);
        const mediana = sortedEspacamentos.length % 2 !== 0 ? sortedEspacamentos[mid] : (sortedEspacamentos[mid - 1] + sortedEspacamentos[mid]) / 2;
        const mediaNormal = mediana; 
        const somaDosQuadrados = espacamentos.reduce((acc, val) => acc + Math.pow(val - media, 2), 0);
        const desvioPadrao = Math.sqrt(somaDosQuadrados / (espacamentos.length - 1));
        const cv = (media === 0) ? 0 : (desvioPadrao / media) * 100;
        const grandeThreshold = 1.5 * mediaNormal;
        const duplaThreshold = 0.5 * mediaNormal;
        const classification = new Array(espacamentos.length).fill('normal');

        espacamentos.forEach((e, index) => {
            if (e > grandeThreshold) {
                const fator = e / mediaNormal;
                const n_slots = Math.round(fator);
                const error = Math.abs(fator - n_slots);
                if (n_slots >= 2 && error < 0.30) { 
                    classification[index] = 'falha';
                } else {
                    classification[index] = 'arraste';
                }
                if (index + 1 < espacamentos.length) {
                    classification[index + 1] = 'ignorado';
                }
            }
        });
        espacamentos.forEach((e, index) => {
            if (classification[index] === 'normal' && e < duplaThreshold) {
                classification[index] = 'dupla';
            }
        });
        
        const duplasCount = classification.filter(c => c === 'dupla').length;
        const arrasteCount = classification.filter(c => c === 'arraste').length;
        const falhasCount = classification.filter(c => c === 'falha').length;
        const totalSementesConsideradas = this.state.sementes.length; 
        const percentualDuplas = totalSementesConsideradas > 0 ? (duplasCount / totalSementesConsideradas) * 100 : 0;
        const percentualArrastadas = totalSementesConsideradas > 0 ? (arrasteCount / totalSementesConsideradas) * 100 : 0;
        const percentualFalhas = totalSementesConsideradas > 0 ? (falhasCount / totalSementesConsideradas) * 100 : 0;

        this.state.results = {
            cv: cv.toFixed(1),
            duplas: percentualDuplas.toFixed(1),
            arraste: percentualArrastadas.toFixed(1),
            falhas: percentualFalhas.toFixed(1),
        };

        this.dom.sementesDuplasEl.textContent = `${this.state.results.duplas} %`;
        this.dom.sementesArrastadasEl.textContent = `${this.state.results.arraste} %`;
        this.dom.sementesFalhasEl.textContent = `${this.state.results.falhas} %`;
        this.dom.cvFinalEl.textContent = `${this.state.results.cv} %`;
        
        this.dom.resultsDiv.classList.remove('hidden');
        this.dom.salvarBtn.disabled = false;
    },

    limparTudo() {
        this.state.sementes = [0];
        this.state.results = null;
        this.dom.posicaoSementeInput.value = '';
        this.dom.errorMsg.textContent = '';
        this.dom.resultsDiv.classList.add('hidden');
        this.dom.salvarBtn.disabled = true;
        this.atualizarLista();
        this.dom.posicaoSementeInput.focus();
    },

    async save() {
        if (!this.state.results || !this.state.currentTalhao) {
            alert("Calcule os resultados ou verifique o talhão selecionado.");
            return;
        }

        const { cv, duplas, arraste, falhas } = this.state.results;
        const header = 'cv,duplas_pct,arraste_pct,falhas_pct';
        const row = `${cv},${duplas},${arraste},${falhas}`;
        const csvContent = `${header}\n${row}`;

        const recordToSync = {
            fazenda: this.state.currentTalhao.Fazenda || 'Sem Fazenda',
            talhao: this.state.currentTalhao.nome_talhao,
            data: new Date().toISOString(),
            tag: 'Aferição de plantio',
            csv: csvContent
        };

        try {
            await savePendingCsv(recordToSync);
            UI.setSyncStatus("Aferição de plantio salva com sucesso!", 'success');
            window.dispatchEvent(new Event('monitoringUpdated'));
            DataManager.syncAll();
            this.close();
        } catch (error) {
            console.error("Erro ao salvar aferição de plantio:", error);
            alert("Ocorreu um erro ao salvar a aferição.");
        }
    }
};