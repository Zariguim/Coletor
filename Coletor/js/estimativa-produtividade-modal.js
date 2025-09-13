// ===================================================================================
//  MÓDULO PARA GERENCIAR O MODAL DE ESTIMATIVA DE PRODUTIVIDADE
// ===================================================================================

const EstimativaProdutividadeModal = {
    // --- ESTADO ---
    state: {
        currentTalhao: null,
        activeCalculator: null,
    },

    // --- ELEMENTOS DO DOM ---
    dom: {},

    init() {
        this.createModal(); // Cria a estrutura HTML do modal

        // Popula o objeto dom
        this.dom = {
            modal: document.getElementById('estimativa-produtividade-modal'),
            closeBtn: document.getElementById('estimativa-produtividade-close-btn'),
            saveBtn: document.getElementById('estimativa-produtividade-save-btn'),
            descriptionInput: document.getElementById('estimativa-produtividade-description-input'),
            cropSelector: document.getElementById('estimativa-crop-selector'),
            sojaCalculator: document.getElementById('soja-calculator'),
            milhoCalculator: document.getElementById('milho-calculator'),
            sojaResultDiv: document.getElementById('soja-result'),
            milhoResultDiv: document.getElementById('milho-result'),
            sojaMetodoCalculo: document.getElementById('soja-metodo-calculo'),
            sojaAmostrasMediaContainer: document.getElementById('soja-amostras-media-container'),
            sojaAmostrasContagemContainer: document.getElementById('soja-amostras-contagem-container'),
            sojaMediasDiv: document.getElementById('soja-medias'),
            milhoAmostrasContainer: document.getElementById('milho-amostras-container'),
            milhoMediasDiv: document.getElementById('milho-medias'),
        };
        
        // Adiciona os event listeners
        this.dom.closeBtn.addEventListener('click', () => this.close());
        this.dom.saveBtn.addEventListener('click', () => this.save());
        this.dom.cropSelector.addEventListener('change', () => this.toggleCalculator());

        // Listeners específicos da Soja
        this.dom.sojaMetodoCalculo.addEventListener('change', () => this.handleSojaMethodChange());
        document.getElementById('add-amostra-soja-btn').addEventListener('click', () => this.adicionarAmostraSoja());

        // Listeners específicos do Milho
        document.getElementById('add-amostra-milho-btn').addEventListener('click', () => this.adicionarAmostraMilho());
        
        // Adiciona listeners a todos os inputs para recalcular automaticamente
        this.dom.modal.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => this.calcular());
        });
    },

    createModal() {
        const container = document.getElementById('estimativa-produtividade-modal-container');
        if (container.innerHTML !== '') return;

        container.innerHTML = `
        <div id="estimativa-produtividade-modal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-70 z-[1004] flex justify-center items-end sm:items-center">
            <div class="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-t-lg sm:rounded-lg">
                <div class="flex justify-between items-center p-4 border-b flex-shrink-0">
                    <h2 class="text-xl font-bold">Estimativa de Produtividade</h2>
                    <button id="estimativa-produtividade-close-btn" class="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
                </div>
                <div class="p-4 flex-grow overflow-y-auto">
                    <div class="mb-6">
                        <label for="estimativa-crop-selector" class="block text-sm font-medium text-gray-700 mb-2">1. Selecione a Cultura</label>
                        <select id="estimativa-crop-selector" class="w-full p-3 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
                            <option value="">-- Escolha uma cultura --</option>
                            <option value="soja">🌱 Soja</option>
                            <option value="milho">🌽 Milho</option>
                        </select>
                    </div>

                    <div id="soja-calculator" class="hidden calculator space-y-4">
                        <h2 class="text-xl font-semibold text-gray-700 border-b pb-2">2. Dados Gerais (Soja)</h2>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><label for="soja-populacao" class="block text-sm font-medium text-gray-600">População (plantas/ha)</label><input type="number" id="soja-populacao" value="240000" class="mt-1 w-full p-3 bg-gray-50 border rounded-lg"></div>
                            <div><label for="soja-pmg" class="block text-sm font-medium text-gray-600">PMG (g)</label><input type="number" id="soja-pmg" placeholder="Ex: 160" class="mt-1 w-full p-3 bg-gray-50 border rounded-lg"></div>
                            <div><label for="soja-fator-correcao" class="block text-sm font-medium text-gray-600">Perdas (%)</label><input type="number" id="soja-fator-correcao" value="10" class="mt-1 w-full p-3 bg-gray-50 border rounded-lg"></div>
                        </div>
                        <h2 class="text-xl font-semibold text-gray-700 border-b pb-2 pt-4">3. Método de Amostragem</h2>
                        <div><select id="soja-metodo-calculo" class="w-full p-3 bg-gray-50 border rounded-lg"><option value="media">Média de Grãos por Vagem</option><option value="contagem">Contagem de Grãos por Vagem</option></select></div>
                        <div id="soja-amostras-media-container" class="amostragem-container space-y-2 max-h-48 overflow-y-auto pr-2"></div>
                        <div id="soja-amostras-contagem-container" class="amostragem-container space-y-2 max-h-48 overflow-y-auto pr-2 hidden"></div>
                        <button id="add-amostra-soja-btn" class="w-full text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition">+ Adicionar Amostra</button>
                        <div id="soja-medias" class="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg min-h-[40px]"></div>
                        <div id="soja-result" class="mt-4 text-center text-lg font-semibold text-gray-800 p-4 bg-blue-50 rounded-lg min-h-[56px] border border-blue-200"></div>
                    </div>

                    <div id="milho-calculator" class="hidden calculator space-y-4">
                         <h2 class="text-xl font-semibold text-gray-700 border-b pb-2">2. Dados Gerais (Milho)</h2>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><label for="milho-pmg" class="block text-sm font-medium text-gray-600">PMG (g)</label><input type="number" id="milho-pmg" placeholder="Ex: 320" class="mt-1 w-full p-3 bg-gray-50 border rounded-lg"></div>
                            <div><label for="milho-fator-correcao" class="block text-sm font-medium text-gray-600">Perdas (%)</label><input type="number" id="milho-fator-correcao" value="15" class="mt-1 w-full p-3 bg-gray-50 border rounded-lg"></div>
                            <div><label for="milho-espacamento" class="block text-sm font-medium text-gray-600">Espaçamento (m)</label><input type="number" step="0.01" id="milho-espacamento" placeholder="Ex: 0.50" class="mt-1 w-full p-3 bg-gray-50 border rounded-lg"></div>
                        </div>
                        <h2 class="text-xl font-semibold text-gray-700 border-b pb-2 pt-4">3. Classificação das Espigas</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="p-4 bg-blue-50 rounded-lg border">
                                <h3 class="font-semibold text-blue-800">Espiga Grande</h3>
                                <div class="mt-2"><label for="milho-fileiras-grande" class="block text-xs font-medium text-gray-600">Nº de fileiras</label><input type="number" id="milho-fileiras-grande" placeholder="Ex: 18" class="mt-1 w-full p-2 bg-white border rounded-md"></div>
                                <div class="mt-2"><label for="milho-graos-grande" class="block text-xs font-medium text-gray-600">Nº de grãos/fileira</label><input type="number" id="milho-graos-grande" placeholder="Ex: 40" class="mt-1 w-full p-2 bg-white border rounded-md"></div>
                            </div>
                            <div class="p-4 bg-yellow-50 rounded-lg border">
                                <h3 class="font-semibold text-yellow-800">Espiga Pequena</h3>
                                <div class="mt-2"><label for="milho-fileiras-pequena" class="block text-xs font-medium text-gray-600">Nº de fileiras</label><input type="number" id="milho-fileiras-pequena" placeholder="Ex: 14" class="mt-1 w-full p-2 bg-white border rounded-md"></div>
                                <div class="mt-2"><label for="milho-graos-pequena" class="block text-xs font-medium text-gray-600">Nº de grãos/fileira</label><input type="number" id="milho-graos-pequena" placeholder="Ex: 30" class="mt-1 w-full p-2 bg-white border rounded-md"></div>
                            </div>
                        </div>
                        <h2 class="text-xl font-semibold text-gray-700 border-b pb-2 pt-4">4. Amostragens de Campo</h2>
                        <div id="milho-amostras-container" class="space-y-2 max-h-48 overflow-y-auto pr-2"></div>
                        <button id="add-amostra-milho-btn" class="w-full text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition">+ Adicionar Amostragem</button>
                        <div id="milho-medias" class="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg"></div>
                        <div id="milho-result" class="mt-4 text-center text-lg font-semibold text-gray-800 p-4 bg-green-50 rounded-lg min-h-[56px] border border-green-200"></div>
                    </div>

                     <div class="mt-6">
                        <label for="estimativa-produtividade-description-input" class="block text-sm font-medium text-gray-700">Descrição da Estimativa</label>
                        <input type="text" id="estimativa-produtividade-description-input" placeholder="Ex: Soja 2º safra, área de sequeiro" class="mt-1 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>
                <div class="p-4 border-t flex-shrink-0">
                    <button id="estimativa-produtividade-save-btn" class="w-full bg-green-600 text-white p-3 rounded-lg font-bold">Salvar Estimativa</button>
                </div>
            </div>
        </div>`;
    },

    open(talhao) {
        this.resetModal();
        this.state.currentTalhao = talhao;
        this.dom.modal.classList.remove('hidden');
    },

    close() {
        this.dom.modal.classList.add('hidden');
        this.state.currentTalhao = null;
    },
    
    resetModal() {
        this.dom.modal.querySelectorAll('input, select').forEach(el => {
            if (el.tagName === 'SELECT') {
                el.selectedIndex = 0;
            } else if (el.type !== 'button') {
                el.value = '';
            }
        });

        this.dom.sojaCalculator.classList.add('hidden');
        this.dom.milhoCalculator.classList.add('hidden');
        this.dom.sojaAmostrasMediaContainer.innerHTML = '';
        this.dom.sojaAmostrasContagemContainer.innerHTML = '';
        this.dom.milhoAmostrasContainer.innerHTML = '';
        this.dom.sojaResultDiv.innerHTML = '';
        this.dom.milhoResultDiv.innerHTML = '';
        this.dom.sojaMediasDiv.innerHTML = '';
        this.dom.milhoMediasDiv.innerHTML = '';
        
        // Reseta valores padrão da Soja
        document.getElementById('soja-populacao').value = "240000";
        document.getElementById('soja-fator-correcao').value = "10";
        // Reseta valores padrão do Milho
        document.getElementById('milho-fator-correcao').value = "15";
    },

    toggleCalculator() {
        const selectedCrop = this.dom.cropSelector.value;
        this.state.activeCalculator = selectedCrop;
        this.dom.sojaCalculator.classList.add('hidden');
        this.dom.milhoCalculator.classList.add('hidden');

        if (selectedCrop === 'soja') {
            this.dom.sojaCalculator.classList.remove('hidden');
            this.handleSojaMethodChange();
        } else if (selectedCrop === 'milho') {
            this.dom.milhoCalculator.classList.remove('hidden');
            if (this.dom.milhoAmostrasContainer.children.length === 0) {
                this.adicionarAmostraMilho();
            }
        }
        this.calcular();
    },

    // --- MÉTODOS DE CÁLCULO ---
    calcular() {
        if (this.state.activeCalculator === 'soja') {
            this.calcularSoja();
        } else if (this.state.activeCalculator === 'milho') {
            this.calcularMilho();
        }
    },

    // --- MÉTODOS DA SOJA ---
    handleSojaMethodChange() {
        this.dom.sojaAmostrasMediaContainer.innerHTML = '';
        this.dom.sojaAmostrasContagemContainer.innerHTML = '';
        this.dom.sojaResultDiv.innerHTML = '';
        if (this.dom.sojaMetodoCalculo.value === 'media') {
            this.dom.sojaAmostrasMediaContainer.classList.remove('hidden');
            this.dom.sojaAmostrasContagemContainer.classList.add('hidden');
        } else {
            this.dom.sojaAmostrasMediaContainer.classList.add('hidden');
            this.dom.sojaAmostrasContagemContainer.classList.remove('hidden');
        }
        this.adicionarAmostraSoja();
    },

    adicionarAmostraSoja() {
        const metodo = this.dom.sojaMetodoCalculo.value;
        const container = metodo === 'media' ? this.dom.sojaAmostrasMediaContainer : this.dom.sojaAmostrasContagemContainer;
        const amostraCount = container.children.length + 1;
        const item = document.createElement('div');
        
        if (metodo === 'media') {
            item.className = 'flex items-center space-x-2 p-2 bg-white border rounded-lg';
            item.innerHTML = `
                <span class="font-semibold text-gray-600 w-10 text-center">#${amostraCount}</span>
                <input type="number" placeholder="Vagens/Planta" class="w-full p-2 border-gray-300 rounded-md soja-vagem-amostra">
                <input type="number" step="0.1" placeholder="Grãos/Vagem" class="w-full p-2 border-gray-300 rounded-md soja-grao-amostra">`;
        } else {
            item.className = 'grid grid-cols-5 gap-2 items-center p-2 bg-white border rounded-lg';
            item.innerHTML = `
                <span class="font-semibold text-gray-600 text-center col-span-1">#${amostraCount}</span>
                <input type="number" placeholder="Vagens c/ 4g" class="w-full p-2 border-gray-300 rounded-md soja-contagem-4g text-sm">
                <input type="number" placeholder="Vagens c/ 3g" class="w-full p-2 border-gray-300 rounded-md soja-contagem-3g text-sm">
                <input type="number" placeholder="Vagens c/ 2g" class="w-full p-2 border-gray-300 rounded-md soja-contagem-2g text-sm">
                <input type="number" placeholder="Vagens c/ 1g" class="w-full p-2 border-gray-300 rounded-md soja-contagem-1g text-sm">`;
        }
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'text-red-500 hover:text-red-700 p-1 rounded-full';
        removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>`;
        removeBtn.onclick = () => { item.remove(); this.renumerarAmostras(container); this.calcularSoja(); };
        
        item.appendChild(removeBtn);
        container.appendChild(item);
        this.calcularSoja();
    },
    
    calcularSoja() {
        const populacao = parseFloat(document.getElementById('soja-populacao').value) || 0;
        const pmg = parseFloat(document.getElementById('soja-pmg').value) || 0;
        const fatorCorrecao = parseFloat(document.getElementById('soja-fator-correcao').value) || 0;
        if (populacao <= 0 || pmg <= 0) { this.dom.sojaResultDiv.innerHTML = `Aguardando dados...`; return; }

        const metodo = this.dom.sojaMetodoCalculo.value;
        let resultadoBruto = 0;

        if (metodo === 'media') {
            let totalVagens = 0, countVagens = 0, totalGraos = 0, countGraos = 0;
            this.dom.sojaAmostrasMediaContainer.querySelectorAll('.soja-vagem-amostra').forEach(i => { const v = parseFloat(i.value); if(!isNaN(v) && v > 0) { totalVagens += v; countVagens++; }});
            this.dom.sojaAmostrasMediaContainer.querySelectorAll('.soja-grao-amostra').forEach(i => { const v = parseFloat(i.value); if(!isNaN(v) && v > 0) { totalGraos += v; countGraos++; }});
            const mediaVagens = countVagens > 0 ? totalVagens / countVagens : 0;
            const mediaGraos = countGraos > 0 ? totalGraos / countGraos : 0;
            this.dom.sojaMediasDiv.innerHTML = `<span>Média Vagens/Planta: <strong>${mediaVagens.toFixed(2)}</strong></span> | <span>Média Grãos/Vagem: <strong>${mediaGraos.toFixed(2)}</strong></span>`;
            if (mediaVagens <= 0 || mediaGraos <= 0) { this.dom.sojaResultDiv.innerHTML = `Aguardando dados...`; return; }
            resultadoBruto = (populacao * mediaVagens * mediaGraos * pmg) / 60000000;
        } else {
            let totalGraos = 0;
            const amostras = this.dom.sojaAmostrasContagemContainer.children;
            if (amostras.length === 0) { this.dom.sojaResultDiv.innerHTML = `Aguardando dados...`; return; }
            Array.from(amostras).forEach(a => {
                totalGraos += (parseFloat(a.querySelector('.soja-contagem-4g').value) || 0) * 4;
                totalGraos += (parseFloat(a.querySelector('.soja-contagem-3g').value) || 0) * 3;
                totalGraos += (parseFloat(a.querySelector('.soja-contagem-2g').value) || 0) * 2;
                totalGraos += (parseFloat(a.querySelector('.soja-contagem-1g').value) || 0) * 1;
            });
            const mediaGraosPorPlanta = totalGraos / amostras.length;
            this.dom.sojaMediasDiv.innerHTML = `<span>Média de Grãos por Planta: <strong>${mediaGraosPorPlanta.toFixed(2)}</strong></span>`;
            if (mediaGraosPorPlanta <= 0) { this.dom.sojaResultDiv.innerHTML = `Aguardando dados...`; return; }
            resultadoBruto = (populacao * mediaGraosPorPlanta * pmg) / 60000000;
        }
        
        const resultadoFinal = resultadoBruto * (1 - (fatorCorrecao / 100));
        this.dom.sojaResultDiv.innerHTML = `Produtividade Estimada: <span class="text-blue-600">${resultadoFinal.toFixed(2)} sc/ha</span>`;
    },

    // --- MÉTODOS DO MILHO ---
    adicionarAmostraMilho() {
        const container = this.dom.milhoAmostrasContainer;
        const amostraCount = container.children.length + 1;
        const item = document.createElement('div');
        item.className = 'flex items-center space-x-2 p-2 bg-white border rounded-lg';
        item.innerHTML = `
            <span class="font-semibold text-gray-600 w-10 text-center">#${amostraCount}</span>
            <input type="number" step="0.1" placeholder="Metragem (m)" class="w-full p-2 border-gray-300 rounded-md milho-metragem-amostra">
            <input type="number" placeholder="Espigas Grandes" class="w-full p-2 border-gray-300 rounded-md milho-grandes-amostra">
            <input type="number" placeholder="Espigas Pequenas" class="w-full p-2 border-gray-300 rounded-md milho-pequenas-amostra">
            <button type="button" class="text-red-500 hover:text-red-700 p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg></button>`;
        const removeBtn = item.querySelector('button');
        removeBtn.onclick = () => { item.remove(); this.renumerarAmostras(container); this.calcularMilho(); };
        container.appendChild(item);
        this.calcularMilho();
    },

    calcularMilho() {
        const pmg = parseFloat(document.getElementById('milho-pmg').value) || 0;
        const fatorCorrecao = parseFloat(document.getElementById('milho-fator-correcao').value) || 0;
        const espacamento = parseFloat(document.getElementById('milho-espacamento').value) || 0;
        const fileirasG = parseFloat(document.getElementById('milho-fileiras-grande').value) || 0;
        const graosG = parseFloat(document.getElementById('milho-graos-grande').value) || 0;
        const fileirasP = parseFloat(document.getElementById('milho-fileiras-pequena').value) || 0;
        const graosP = parseFloat(document.getElementById('milho-graos-pequena').value) || 0;
        if (pmg <= 0 || espacamento <= 0) { this.dom.milhoResultDiv.innerHTML = `Aguardando dados...`; return; }

        let totalMetragem = 0, totalGrandes = 0, totalPequenas = 0;
        Array.from(this.dom.milhoAmostrasContainer.children).forEach(amostra => {
            const metragem = parseFloat(amostra.querySelector('.milho-metragem-amostra').value) || 0;
            if (metragem > 0) {
                totalMetragem += metragem;
                totalGrandes += parseFloat(amostra.querySelector('.milho-grandes-amostra').value) || 0;
                totalPequenas += parseFloat(amostra.querySelector('.milho-pequenas-amostra').value) || 0;
            }
        });
        const mediaGrandesM = totalMetragem > 0 ? totalGrandes / totalMetragem : 0;
        const mediaPequenasM = totalMetragem > 0 ? totalPequenas / totalMetragem : 0;
        this.dom.milhoMediasDiv.innerHTML = `<span>Total: <strong>${totalMetragem.toFixed(2)} m</strong></span> | <span>Média G: <strong>${mediaGrandesM.toFixed(2)} esp/m</strong></span> | <span>Média P: <strong>${mediaPequenasM.toFixed(2)} esp/m</strong></span>`;
        if ((mediaGrandesM <= 0 && mediaPequenasM <= 0)) { this.dom.milhoResultDiv.innerHTML = `Aguardando dados...`; return; }

        const metrosLinearesHa = 10000 / espacamento;
        const espigasGrandesHa = fileirasG > 0 ? mediaGrandesM * metrosLinearesHa : 0;
        const espigasPequenasHa = fileirasP > 0 ? mediaPequenasM * metrosLinearesHa : 0;
        const scHaGrandes = (espigasGrandesHa * fileirasG * graosG * pmg) / 60000000;
        const scHaPequenas = (espigasPequenasHa * fileirasP * graosP * pmg) / 60000000;
        const resultadoBruto = scHaGrandes + scHaPequenas;
        const resultadoFinal = resultadoBruto * (1 - (fatorCorrecao / 100));
        this.dom.milhoResultDiv.innerHTML = `Produtividade Estimada: <span class="text-green-600">${resultadoFinal.toFixed(2)} sc/ha</span>`;
    },
    
    renumerarAmostras(container) {
        Array.from(container.children).forEach((item, index) => {
            item.querySelector('span').textContent = `#${index + 1}`;
        });
    },

    async save() {
        const cultura = this.state.activeCalculator;
        if (!cultura) {
            alert("Por favor, selecione uma cultura e preencha os dados.");
            return;
        }

        const description = this.dom.descriptionInput.value.trim();
        if (!description) {
            alert("Por favor, forneça uma descrição para a estimativa.");
            return;
        }
        
        let resultado, header, row, csvContent;

        if (cultura === 'soja') {
            const resultadoText = this.dom.sojaResultDiv.textContent;
            resultado = parseFloat(resultadoText.replace(/[^0-9.,]/g, '').replace(',', '.'));
            if (isNaN(resultado) || resultado <= 0) { alert("Calcule uma estimativa válida antes de salvar."); return; }
            header = 'cultura,produtividade_sc_ha,descricao';
            row = `Soja,${resultado.toFixed(2)},"${description.replace(/"/g, '""')}"`;
        } else { // milho
            const resultadoText = this.dom.milhoResultDiv.textContent;
            resultado = parseFloat(resultadoText.replace(/[^0-9.,]/g, '').replace(',', '.'));
            if (isNaN(resultado) || resultado <= 0) { alert("Calcule uma estimativa válida antes de salvar."); return; }
            header = 'cultura,produtividade_sc_ha,descricao';
            row = `Milho,${resultado.toFixed(2)},"${description.replace(/"/g, '""')}"`;
        }
        
        csvContent = `${header}\n${row}`;

        const recordToSync = {
            fazenda: this.state.currentTalhao.Fazenda || 'Sem Fazenda',
            talhao: this.state.currentTalhao.nome_talhao,
            data: new Date().toISOString(),
            tag: 'Estimativa de produtividade',
            csv: csvContent
        };

        try {
            await savePendingCsv(recordToSync);
            UI.setSyncStatus("Estimativa salva com sucesso!", 'success');
            window.dispatchEvent(new Event('monitoringUpdated'));
            DataManager.syncAll();
            this.close();
        } catch (error) {
            console.error("Erro ao salvar estimativa:", error);
            alert("Ocorreu um erro ao salvar a estimativa.");
        }
    }
};