// ===================================================================================
//  MÓDULO PARA GERENCIAR O MODAL DE RECOMENDAÇÃO DE PULVERIZAÇÃO
// ===================================================================================

const RecomendacaoModal = {
    // --- ESTADO ---
    state: {
        etapa: 1,
        allTalhoes: [],
        talhoes: [],
        remonte: 3.0,
        produtos: [],
        capacidade: 3000,
        vazao: 60,
        obs: '',
        sortable: null,
    },

    // --- ELEMENTOS DO DOM ---
    dom: {},

    init() {
        this.createModal(); // Garante que o HTML do modal exista

        this.dom = {
            modal: document.getElementById('recomendacao-modal'),
            closeBtn: document.getElementById('recomendacao-modal-close-btn'),
            stepIndicator: document.getElementById('recomendacao-step-indicator'),
            stepContent: document.getElementById('recomendacao-step-content'),
        };
        
        this.dom.closeBtn.addEventListener('click', () => this.close());
    },

    createModal() {
        const container = document.getElementById('recomendacao-modal-container');
        if (container.innerHTML !== '') return;

        container.innerHTML = `
        <div id="recomendacao-modal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-70 z-[1004] flex justify-center items-end sm:items-center">
            <div class="bg-gray-100 w-full h-full max-w-2xl max-h-[95vh] flex flex-col rounded-t-lg sm:rounded-lg">
                <div class="flex justify-between items-center p-4 border-b bg-white flex-shrink-0 rounded-t-lg sm:rounded-t-lg">
                     <div class="flex items-center space-x-3">
                        <h1 class="text-2xl font-bold text-gray-800">Recomendação de Pulverização</h1>
                    </div>
                    <button id="recomendacao-modal-close-btn" class="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
                </div>
                <div id="recomendacao-step-indicator" class="p-4 bg-white"></div>
                <div id="recomendacao-step-content" class="flex-grow overflow-y-auto bg-gray-50"></div>
            </div>
        </div>`;
    },

    open(talhoesDaFazenda) {
        // Mapeia os dados dos talhões para o formato esperado pelo modal
        this.state.allTalhoes = talhoesDaFazenda.map(t => {
            const geojson = t.layer.toGeoJSON();
            const areaEmMetros = turf.area(geojson);
            return {
                id: t.id,
                nome: t.nome_talhao,
                area: parseFloat((areaEmMetros / 10000).toFixed(2)),
                selecionado: false, // Começam desmarcados
                fazenda: t.Fazenda || 'Sem Fazenda'
            };
        });

        this.state.etapa = 1;
        this.render();
        this.dom.modal.classList.remove('hidden');
    },

    close() {
        this.dom.modal.classList.add('hidden');
        // Reseta o estado para a próxima abertura
        this.state = {
            etapa: 1,
            allTalhoes: [],
            talhoes: [],
            remonte: 3.0,
            produtos: [],
            capacidade: 3000,
            vazao: 60,
            obs: '',
            sortable: null,
        };
    },
    
    _navigate(etapa) {
        this.state.etapa = etapa;
        this.render();
        document.getElementById('recomendacao-step-content').scrollTop = 0;
    },

    render() {
        this._renderStepIndicator();
        this._renderStepContent();
    },

    _renderStepIndicator() {
        const steps = ['Talhões', 'Produtos', 'Aplicação', 'Revisão'];
        const progressWidth = ((this.state.etapa - 1) / (steps.length - 1)) * 100 + '%';
        let html = `
            <div class="w-full max-w-2xl mx-auto">
                <div class="relative flex justify-between mb-2">
                    <div class="absolute top-4 left-0 right-0 h-0.5 bg-gray-200"></div>
                    <div class="absolute top-4 left-0 h-0.5 bg-green-500 transition-all duration-300" style="width: ${progressWidth};"></div>
        `;
        steps.forEach((label, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber <= this.state.etapa;
            html += `
                <div class="z-10 flex flex-col items-center">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${isActive ? 'bg-green-500 text-white border-2 border-green-500' : 'bg-white text-gray-400 border-2 border-gray-300'}">
                        ${stepNumber}
                    </div>
                    <span class="text-xs mt-2 text-center ${isActive ? 'text-green-600 font-semibold' : 'text-gray-500'}">${label}</span>
                </div>`;
        });
        html += `</div></div>`;
        this.dom.stepIndicator.innerHTML = html;
    },

    _renderStepContent() {
        switch (this.state.etapa) {
            case 1: this._renderTalhoesScreen(); break;
            case 2: this._renderProdutosScreen(); break;
            case 3: this._renderAplicacaoScreen(); break;
            case 4: this._renderRevisaoScreen(); break;
        }
    },
    
    // RENDERIZAÇÃO DA TELA 1: TALHÕES
    _renderTalhoesScreen() {
        const areaTotalSelecionada = this.state.allTalhoes
            .filter(t => t.selecionado)
            .reduce((acc, t) => acc + (t.area * (1 + this.state.remonte / 100)), 0);

        let talhoesHtml = this.state.allTalhoes.map(talhao => `
            <div key="${talhao.id}" class="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <input type="checkbox" data-id="${talhao.id}" class="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 talhao-checkbox" ${talhao.selecionado ? 'checked' : ''}>
                    <label class="font-medium text-gray-800">${talhao.nome}</label>
                </div>
                <div class="flex items-center space-x-2">
                    <input type="number" data-id="${talhao.id}" value="${talhao.area}" class="w-24 p-1 border border-gray-300 rounded-md text-right focus:ring-green-500 focus:border-green-500 talhao-area">
                    <span class="text-sm text-gray-500">ha</span>
                </div>
            </div>
        `).join('');

        this.dom.stepContent.innerHTML = `
            <div class="p-4 md:p-6">
                <div class="mb-6 bg-white p-4 rounded-lg shadow">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Acréscimo por Remonte (%)</label>
                    <input type="number" id="remonte-input" value="${this.state.remonte}" class="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500">
                </div>
                <div class="space-y-3">${talhoesHtml}</div>
                <div class="mt-8 sticky bottom-0 bg-white/80 backdrop-blur-sm -m-6 p-4 rounded-t-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <div class="flex justify-between items-center mb-4">
                        <span class="text-lg font-semibold text-gray-800">Área Total:</span>
                        <span class="text-xl font-bold text-green-600">${areaTotalSelecionada.toFixed(2)} ha</span>
                    </div>
                    <button id="talhoes-next-btn" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700">Próximo</button>
                </div>
            </div>`;
        
        // Event Listeners
        document.getElementById('remonte-input').addEventListener('input', e => {
            this.state.remonte = parseFloat(e.target.value) || 0;
            this._renderTalhoesScreen();
        });
        document.querySelectorAll('.talhao-checkbox').forEach(el => el.addEventListener('change', e => {
            const id = parseInt(e.target.dataset.id);
            const talhao = this.state.allTalhoes.find(t => t.id === id);
            if (talhao) talhao.selecionado = e.target.checked;
            this._renderTalhoesScreen();
        }));
         document.querySelectorAll('.talhao-area').forEach(el => el.addEventListener('input', e => {
            const id = parseInt(e.target.dataset.id);
            const talhao = this.state.allTalhoes.find(t => t.id === id);
            if (talhao) talhao.area = parseFloat(e.target.value) || 0;
            this._renderTalhoesScreen();
        }));
        document.getElementById('talhoes-next-btn').addEventListener('click', () => {
             this.state.talhoes = this.state.allTalhoes.filter(t => t.selecionado);
             if (this.state.talhoes.length === 0) {
                 alert('Selecione pelo menos um talhão para continuar.');
                 return;
             }
            this._navigate(2);
        });
    },

    // RENDERIZAÇÃO DA TELA 2: PRODUTOS
    _renderProdutosScreen() {
        let produtosHtml = this.state.produtos.length === 0
            ? `<div class="text-center text-gray-500 bg-white p-6 rounded-lg">Nenhum produto adicionado ainda.</div>`
            : this.state.produtos.map(p => `
                <div data-id="${p.id}" class="bg-white p-3 rounded-lg shadow-sm flex items-center justify-between cursor-grab product-item">
                    <div class="flex items-center space-x-3 flex-grow">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="text-gray-400 flex-shrink-0" viewBox="0 0 16 16"><path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>
                        <p class="font-medium text-gray-800">${p.nome}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <input type="number" step="0.01" value="${p.dose}" data-id="${p.id}" data-field="dose" class="w-20 p-1 border border-gray-300 rounded-md text-right product-input">
                        <select data-id="${p.id}" data-field="unidade" class="p-1 border border-gray-300 rounded-md bg-white product-input">
                            <option value="L/ha" ${p.unidade === 'L/ha' ? 'selected' : ''}>L/ha</option>
                            <option value="Kg/ha" ${p.unidade === 'Kg/ha' ? 'selected' : ''}>Kg/ha</option>
                        </select>
                        <button data-id="${p.id}" class="text-red-500 hover:text-red-700 p-1 remove-product-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                        </button>
                    </div>
                </div>`).join('');

        this.dom.stepContent.innerHTML = `
            <div class="p-4 md:p-6">
                <form id="add-product-form" class="bg-white p-4 rounded-lg shadow mb-6 flex gap-2">
                    <input id="nomeProduto" type="text" class="flex-grow w-full p-2 border border-gray-300 rounded-md" placeholder="Nome do Produto" required>
                    <button type="submit" class="bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600">Adicionar</button>
                </form>
                <h3 class="text-lg font-semibold text-gray-800 mb-2">Ordem de Mistura no Tanque</h3>
                <p class="text-sm text-gray-500 mb-4">Arraste os produtos para reordenar.</p>
                <div id="product-list" class="space-y-3 mb-24">${produtosHtml}</div>
                <div class="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <div class="max-w-2xl mx-auto flex gap-4">
                        <button id="produtos-back-btn" class="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300">Voltar</button>
                        <button id="produtos-next-btn" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700">Próximo</button>
                    </div>
                </div>
            </div>`;
            
        this._initSortable();

        // Event Listeners
        document.getElementById('add-product-form').addEventListener('submit', e => {
            e.preventDefault();
            const nomeInput = document.getElementById('nomeProduto');
            if (nomeInput.value) {
                this.state.produtos.push({ id: Date.now(), nome: nomeInput.value, dose: 1, unidade: 'L/ha' });
                nomeInput.value = '';
                this._renderProdutosScreen();
            }
        });
        document.querySelectorAll('.remove-product-btn').forEach(btn => btn.addEventListener('click', e => {
            const id = parseInt(e.currentTarget.dataset.id);
            this.state.produtos = this.state.produtos.filter(p => p.id !== id);
            this._renderProdutosScreen();
        }));
        document.querySelectorAll('.product-input').forEach(el => el.addEventListener('change', e => {
            const id = parseInt(e.target.dataset.id);
            const field = e.target.dataset.field;
            const value = field === 'dose' ? parseFloat(e.target.value) || 0 : e.target.value;
            const produto = this.state.produtos.find(p => p.id === id);
            if(produto) produto[field] = value;
        }));
        document.getElementById('produtos-back-btn').addEventListener('click', () => this._navigate(1));
        document.getElementById('produtos-next-btn').addEventListener('click', () => this._navigate(3));
    },

    _initSortable() {
        const list = document.getElementById('product-list');
        if (this.state.sortable) {
            this.state.sortable.destroy();
        }
        if (list) {
            this.state.sortable = Sortable.create(list, {
                animation: 200,
                ghostClass: 'bg-green-100',
                onEnd: (evt) => {
                    const [movedItem] = this.state.produtos.splice(evt.oldIndex, 1);
                    this.state.produtos.splice(evt.newIndex, 0, movedItem);
                },
            });
        }
    },
    
    // RENDERIZAÇÃO DA TELA 3: APLICAÇÃO
    _renderAplicacaoScreen() {
        const hectaresPorTanque = (this.state.capacidade > 0 && this.state.vazao > 0) ? (this.state.capacidade / this.state.vazao) : 0;
        this.dom.stepContent.innerHTML = `
            <div class="p-4 md:p-6 space-y-6">
                <div class="bg-white p-4 rounded-lg shadow space-y-4">
                     <h3 class="text-lg font-semibold text-gray-800">Dados do Pulverizador</h3>
                    <div>
                         <label class="block text-sm font-medium text-gray-700 mb-1">Capacidade do Tanque (Litros)</label>
                         <input id="capacidade-input" type="number" value="${this.state.capacidade}" class="w-full p-2 border border-gray-300 rounded-md">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Taxa de Aplicação / Vazão (L/ha)</label>
                        <input id="vazao-input" type="number" value="${this.state.vazao}" class="w-full p-2 border border-gray-300 rounded-md">
                    </div>
                </div>
                ${hectaresPorTanque > 0 ? `
                <div class="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                    <p class="text-sm text-green-700">Cada tanque fará <span class="font-bold">${hectaresPorTanque.toFixed(2)}</span> hectares.</p>
                </div>` : ''}
                 <div class="bg-white p-4 rounded-lg shadow">
                     <label class="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                     <textarea id="obs-input" rows="4" class="w-full p-2 border border-gray-300 rounded-md">${this.state.obs}</textarea>
                 </div>
                 <div class="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                     <div class="max-w-2xl mx-auto flex gap-4">
                       <button id="aplicacao-back-btn" class="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg">Voltar</button>
                       <button id="aplicacao-next-btn" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg">Revisar Recomendação</button>
                    </div>
                </div>
             </div>`;
             
        document.getElementById('capacidade-input').addEventListener('input', e => this.state.capacidade = parseFloat(e.target.value) || 0);
        document.getElementById('vazao-input').addEventListener('input', e => this.state.vazao = parseFloat(e.target.value) || 0);
        document.getElementById('obs-input').addEventListener('input', e => this.state.obs = e.target.value);
        document.getElementById('aplicacao-back-btn').addEventListener('click', () => this._navigate(2));
        document.getElementById('aplicacao-next-btn').addEventListener('click', () => this._navigate(4));
    },

    // RENDERIZAÇÃO DA TELA 4: REVISÃO
    _renderRevisaoScreen() {
        const areaTotal = this.state.talhoes.reduce((acc, t) => acc + (t.area * (1 + this.state.remonte / 100)), 0);
        const hectaresPorTanque = (this.state.capacidade > 0 && this.state.vazao > 0) ? (this.state.capacidade / this.state.vazao) : 0;
        const tanquesNecessarios = hectaresPorTanque > 0 ? (areaTotal / hectaresPorTanque) : 0;
        const tanquesCheios = Math.floor(tanquesNecessarios);
        const proporcaoTanqueParcial = tanquesNecessarios - tanquesCheios;

        let html = `
            <div class="p-4 md:p-6 pb-24 space-y-6">
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-xl font-bold text-green-700 mb-3 border-b pb-2">Resumo da Área</h3>
                    <div class="space-y-3 text-gray-700">
                         <div>
                            <span class="font-medium text-gray-800">Talhões a aplicar:</span>
                            <ul class="list-disc list-inside mt-1 pl-2 text-sm text-gray-600">
                                ${this.state.talhoes.map(t => `<li>${t.nome} (${t.area.toFixed(1)} ha)</li>`).join('')}
                            </ul>
                        </div>
                        <div class="flex justify-between border-t pt-3 mt-3">
                            <span class="font-semibold">Área Total (c/ remonte ${this.state.remonte}%):</span> 
                            <span class="font-semibold">${areaTotal.toFixed(2)} ha</span>
                        </div>
                        <div class="flex justify-between"><span>Rendimento p/ Tanque:</span><span class="font-semibold">${hectaresPorTanque > 0 ? hectaresPorTanque.toFixed(2) : 'N/A'} ha</span></div>
                        <p class="pt-2 text-center text-lg">Serão necessários <span class="font-bold text-green-600">${tanquesCheios}</span> tanques cheios e <span class="font-bold text-green-600">${proporcaoTanqueParcial > 0.01 ? 1 : 0}</span> tanque parcial com <span class="font-bold text-green-600">${(proporcaoTanqueParcial * 100).toFixed(0)}%</span> do volume.</p>
                    </div>
                </div>`;

        if (this.state.produtos.length > 0) {
            html += `
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-xl font-bold text-green-700 mb-3 border-b pb-2">Produtos e Doses por Hectare</h3>
                    <ul class="divide-y divide-gray-200">
                        ${this.state.produtos.map(p => `<li class="py-2 flex justify-between"><span>${p.nome}</span><span class="font-bold">${p.dose.toFixed(2)} ${p.unidade}</span></li>`).join('')}
                    </ul>
                </div>`;
        }

        if (tanquesCheios > 0) {
            html += `
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-xl font-bold text-green-700 mb-3 border-b pb-2">Dosagem por Tanque Cheio</h3>
                     <p class="text-sm text-gray-500 mb-3">Cálculo para ${hectaresPorTanque > 0 ? hectaresPorTanque.toFixed(2) : 'N/A'} ha</p>
                    <ul class="divide-y divide-gray-200">
                        ${this.state.produtos.map(p => `<li class="py-2 flex justify-between"><span>${p.nome}</span><span class="font-bold">${(p.dose * hectaresPorTanque).toFixed(2)} ${p.unidade.split('/')[0]}</span></li>`).join('')}
                    </ul>
                </div>`;
        }
        
        if (proporcaoTanqueParcial > 0.01) {
            html += `
                 <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-xl font-bold text-green-700 mb-3 border-b pb-2">Dosagem para Tanque Parcial</h3>
                    <p class="text-sm text-gray-500 mb-3">Cálculo para ${(hectaresPorTanque * proporcaoTanqueParcial).toFixed(2)} ha</p>
                    <ul class="divide-y divide-gray-200">
                         ${this.state.produtos.map(p => `<li class="py-2 flex justify-between"><span>${p.nome}</span><span class="font-bold">${(p.dose * hectaresPorTanque * proporcaoTanqueParcial).toFixed(2)} ${p.unidade.split('/')[0]}</span></li>`).join('')}
                        <li class="py-3 flex justify-between items-center border-t-2 border-blue-200 mt-2 pt-3"><span class="font-semibold text-blue-800">Volume de Água</span><span class="font-bold text-blue-800 text-lg">${(this.state.capacidade * proporcaoTanqueParcial).toFixed(2)} Litros</span></li>
                    </ul>
                </div>`;
        }

        if (this.state.obs) {
            html += `
                <div class="bg-white p-4 rounded-lg shadow">
                   <h3 class="text-xl font-bold text-green-700 mb-2">Observações</h3>
                   <p class="text-gray-600 whitespace-pre-wrap">${this.state.obs}</p>
                </div>`;
        }

        html += `
             <div class="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                 <div class="max-w-2xl mx-auto flex gap-4">
                   <button id="revisao-back-btn" class="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg">Voltar e Editar</button>
                   <button id="revisao-save-btn" class="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg">Salvar Recomendação</button>
                </div>
            </div>
        </div>`;

        this.dom.stepContent.innerHTML = html;
        document.getElementById('revisao-back-btn').addEventListener('click', () => this._navigate(3));
        document.getElementById('revisao-save-btn').addEventListener('click', () => this.save());
    },
    
    async save() {
        const description = prompt("Por favor, insira uma descrição para esta recomendação:", "");
        if (description === null || description.trim() === "") {
            alert("A descrição é obrigatória para salvar.");
            return;
        }

        const areaTotal = this.state.talhoes.reduce((acc, t) => acc + (t.area * (1 + this.state.remonte / 100)), 0);
        const hectaresPorTanque = (this.state.capacidade > 0 && this.state.vazao > 0) ? (this.state.capacidade / this.state.vazao) : 0;
        const tanquesNecessarios = hectaresPorTanque > 0 ? (areaTotal / hectaresPorTanque).toFixed(2) : 0;
        
        const produtosString = this.state.produtos.map(p => `${p.nome} (${p.dose} ${p.unidade})`).join('; ');
        const talhoesNomes = this.state.talhoes.map(t => t.nome).join('; ');
        const dosagemTanqueCheio = this.state.produtos.map(p => `${p.nome} (${(p.dose * hectaresPorTanque).toFixed(2)} ${p.unidade.split('/')[0]})`).join('; ');
        
        // CSV Header and content
        const header = 'descricao,area_total_ha,remonte_pct,produtos,capacidade_tanque_l,vazao_l_ha,tanques_necessarios,observacoes,talhoes_selecionados,dosagem_tanque_cheio';
        const row = [
            `"${description.replace(/"/g, '""')}"`,
            areaTotal.toFixed(2),
            this.state.remonte,
            `"${produtosString.replace(/"/g, '""')}"`,
            this.state.capacidade,
            this.state.vazao,
            tanquesNecessarios,
            `"${this.state.obs.replace(/"/g, '""')}"`,
            `"${talhoesNomes.replace(/"/g, '""')}"`,
            `"${dosagemTanqueCheio.replace(/"/g, '""')}"`
        ].join(',');
        
        const csvContent = `${header}\n${row}`;

        UI.setStatus(true, `Salvando recomendação em ${this.state.talhoes.length} talhão(ões)...`);

        for (const talhao of this.state.talhoes) {
             const recordToSync = {
                fazenda: talhao.fazenda,
                talhao: talhao.nome,
                data: new Date().toISOString(),
                tag: 'Recomendação',
                csv: csvContent
            };
            try {
                await savePendingCsv(recordToSync);
            } catch (error) {
                console.error(`Erro ao salvar recomendação para o talhão ${talhao.nome}:`, error);
                UI.setSyncStatus(`Erro ao salvar em ${talhao.nome}.`, 'warning');
            }
        }
        
        UI.setStatus(false);
        UI.setSyncStatus("Recomendação salva com sucesso e na fila para sincronização!", 'success');
        window.dispatchEvent(new Event('monitoringUpdated'));
        DataManager.syncAll();
        this.close();
    }
};