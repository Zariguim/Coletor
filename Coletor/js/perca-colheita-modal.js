// ===================================================================================
//  MÓDULO PARA GERENCIAR O MODAL DE PERCA NA COLHEITA
// ===================================================================================

const PercaColheitaModal = {
    // --- ESTADO ---
    state: {
        currentTalhao: null,
        amostras: [], // Array de perdas em kg/ha
    },

    // --- ELEMENTOS DO DOM (Serão populados no init) ---
    dom: {},

    init() {
        this.createModal(); // Cria a estrutura HTML do modal

        // Popula o objeto dom com os elementos recém-criados
        this.dom = {
            modal: document.getElementById('perca-colheita-modal'),
            closeBtn: document.getElementById('perca-colheita-close-btn'),
            larguraInput: document.getElementById('perca-largura-input'),
            comprimentoInput: document.getElementById('perca-comprimento-input'),
            pmgInput: document.getElementById('perca-pmg-input'),
            sementesInput: document.getElementById('perca-sementes-input'),
            pesoAmostraInput: document.getElementById('perca-peso-amostra-input'),
            descriptionInput: document.getElementById('perca-description-input'), // NOVO CAMPO
            addAmostraBtn: document.getElementById('add-perca-amostra-btn'),
            amostrasList: document.getElementById('perca-amostras-list'),
            mediaResult: document.getElementById('media-perca-result'),
            saveBtn: document.getElementById('save-perca-btn'),
        };
        
        // Adiciona os event listeners
        this.dom.closeBtn.addEventListener('click', () => this.close());
        this.dom.addAmostraBtn.addEventListener('click', () => this.addAmostra());
        this.dom.saveBtn.addEventListener('click', () => this.save());

        // Listeners para cálculo automático do peso da amostra
        this.dom.pmgInput.addEventListener('input', () => this.calcularPesoAmostra());
        this.dom.sementesInput.addEventListener('input', () => this.calcularPesoAmostra());
        
        // Listener para desabilitar os outros campos se o peso for preenchido manualmente
        this.dom.pesoAmostraInput.addEventListener('input', () => {
            const pesoAmostra = this.dom.pesoAmostraInput.value.trim();
            if (pesoAmostra !== '') {
                this.dom.pmgInput.disabled = true;
                this.dom.sementesInput.disabled = true;
            } else {
                this.dom.pmgInput.disabled = false;
                this.dom.sementesInput.disabled = false;
            }
        });
    },

    createModal() {
        const container = document.getElementById('perca-colheita-modal-container');
        if (container.innerHTML !== '') return; // Previne recriação

        container.innerHTML = `
        <div id="perca-colheita-modal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-70 z-[1004] flex justify-center items-end sm:items-center">
            <div class="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-t-lg sm:rounded-lg">
                <div class="flex justify-between items-center p-4 border-b flex-shrink-0">
                    <h2 class="text-xl font-bold">Aferição de Perca na Colheita</h2>
                    <button id="perca-colheita-close-btn" class="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
                </div>
                <div class="p-4 flex-grow overflow-y-auto">
                    <div class="bg-gray-50 p-3 rounded-lg border mb-4">
                        <h3 class="font-semibold mb-2 text-gray-800">Área da Amostra</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="perca-largura-input" class="block text-sm font-medium text-gray-700">Largura (m)</label>
                                <input type="number" id="perca-largura-input" placeholder="Ex: 0.5" class="w-full p-2 border rounded-md mt-1">
                            </div>
                            <div>
                                <label for="perca-comprimento-input" class="block text-sm font-medium text-gray-700">Comprimento (m)</label>
                                <input type="number" id="perca-comprimento-input" placeholder="Ex: 0.5" class="w-full p-2 border rounded-md mt-1">
                            </div>
                        </div>
                    </div>
                     <div class="bg-gray-50 p-3 rounded-lg border mb-4">
                        <h3 class="font-semibold mb-2 text-gray-800">Dados da Amostra</h3>
                         <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                            <div>
                                <label for="perca-pmg-input" class="block text-sm font-medium text-gray-700">PMG (g)</label>
                                <input type="number" id="perca-pmg-input" placeholder="Ex: 180" class="w-full p-2 border rounded-md mt-1">
                            </div>
                            <div>
                                <label for="perca-sementes-input" class="block text-sm font-medium text-gray-700">Grãos Coletados</label>
                                <input type="number" id="perca-sementes-input" placeholder="Ex: 3" class="w-full p-2 border rounded-md mt-1">
                            </div>
                        </div>
                        <p class="text-center text-sm text-gray-500 my-2">OU</p>
                        <div>
                            <label for="perca-peso-amostra-input" class="block text-sm font-medium text-gray-700">Peso da Amostra (g)</label>
                            <input type="number" id="perca-peso-amostra-input" placeholder="Preencha diretamente" class="w-full p-2 border rounded-md mt-1">
                        </div>
                    </div>

                    <button id="add-perca-amostra-btn" class="w-full bg-blue-600 text-white p-2 rounded-md whitespace-nowrap">Adicionar Amostra</button>

                    <h3 class="font-semibold text-lg mt-6 mb-2">Amostras Adicionadas</h3>
                    <div id="perca-amostras-list" class="space-y-2 mb-4">
                        <p class="text-center text-gray-500">Nenhuma amostra adicionada.</p>
                    </div>
                    
                    <div class="mt-4">
                        <label for="perca-description-input" class="block text-sm font-medium text-gray-700">Descrição</label>
                        <input type="text" id="perca-description-input" placeholder="Ex: Área com plantas daninhas" class="w-full p-2 border rounded-md mt-1">
                    </div>

                    <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md mt-4">
                        <p class="font-bold">Média de Perda</p>
                        <p class="text-2xl"><span id="media-perca-result">0</span> kg/ha</p>
                    </div>
                </div>
                <div class="p-4 border-t flex-shrink-0">
                    <button id="save-perca-btn" class="w-full bg-green-600 text-white p-2 rounded-md" disabled>Salvar Aferição</button>
                </div>
            </div>
        </div>`;
    },

    open(talhao) {
        this.resetModal();
        this.state.currentTalhao = talhao;
        this.dom.modal.classList.remove('hidden');
        this.dom.larguraInput.focus();
    },

    close() {
        this.dom.modal.classList.add('hidden');
        this.state.currentTalhao = null;
    },
    
    resetModal() {
        this.state.amostras = [];
        this.dom.larguraInput.value = '';
        this.dom.comprimentoInput.value = '';
        this.dom.pmgInput.value = '';
        this.dom.sementesInput.value = '';
        this.dom.pesoAmostraInput.value = '';
        this.dom.descriptionInput.value = ''; // Limpa a descrição
        this.dom.pmgInput.disabled = false;
        this.dom.sementesInput.disabled = false;
        this.renderAmostras();
    },

    calcularPesoAmostra() {
        const pmg = parseFloat(this.dom.pmgInput.value.replace(',', '.'));
        const sementes = parseInt(this.dom.sementesInput.value);

        if (!isNaN(pmg) && pmg > 0 && !isNaN(sementes) && sementes >= 0) {
            const pesoAmostra = (sementes * pmg) / 1000;
            this.dom.pesoAmostraInput.value = pesoAmostra.toFixed(2);
            this.dom.pesoAmostraInput.disabled = true;
        } else {
             this.dom.pesoAmostraInput.disabled = false;
        }
    },
    
    addAmostra() {
        const largura = parseFloat(this.dom.larguraInput.value.replace(',', '.'));
        const comprimento = parseFloat(this.dom.comprimentoInput.value.replace(',', '.'));
        const pesoAmostraGramas = parseFloat(this.dom.pesoAmostraInput.value.replace(',', '.'));

        if (isNaN(largura) || largura <= 0) { alert("Informe uma largura válida."); return; }
        if (isNaN(comprimento) || comprimento <= 0) { alert("Informe um comprimento válido."); return; }
        if (isNaN(pesoAmostraGramas) || pesoAmostraGramas < 0) { alert("Informe um peso de amostra válido."); return; }

        const areaAmostraM2 = largura * comprimento;
        const pesoAmostraKg = pesoAmostraGramas / 1000;
        
        const percaKgHa = (pesoAmostraKg * 10000) / areaAmostraM2;

        this.state.amostras.push(percaKgHa);
        this.renderAmostras();
        
        // Limpa apenas os campos da amostra
        this.dom.pmgInput.value = '';
        this.dom.sementesInput.value = '';
        this.dom.pesoAmostraInput.value = '';
        this.dom.pmgInput.disabled = false;
        this.dom.sementesInput.disabled = false;
        this.dom.pesoAmostraInput.disabled = false;
        this.dom.pmgInput.focus();
    },
    
    removeAmostra(index) {
        this.state.amostras.splice(index, 1);
        this.renderAmostras();
    },

    renderAmostras() {
        this.dom.amostrasList.innerHTML = '';
        if (this.state.amostras.length === 0) {
            this.dom.amostrasList.innerHTML = `<p class="text-center text-gray-500">Nenhuma amostra adicionada.</p>`;
            this.dom.mediaResult.textContent = '0';
            this.dom.saveBtn.disabled = true;
            return;
        }

        this.state.amostras.forEach((amostra, index) => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center bg-gray-100 p-2 rounded';
            item.innerHTML = `
                <span>Amostra ${index + 1}: ${amostra.toFixed(2)} kg/ha</span>
                <button data-index="${index}" class="remove-amostra-btn text-red-500 font-bold">&times;</button>
            `;
            this.dom.amostrasList.appendChild(item);
        });
        
        this.dom.amostrasList.querySelectorAll('.remove-amostra-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.removeAmostra(parseInt(e.target.dataset.index)));
        });

        const soma = this.state.amostras.reduce((acc, curr) => acc + curr, 0);
        const media = soma / this.state.amostras.length;
        this.dom.mediaResult.textContent = media.toFixed(2);
        this.dom.saveBtn.disabled = false;
    },

    async save() {
        if (this.state.amostras.length === 0 || !this.state.currentTalhao) {
            alert("Adicione amostras ou verifique o talhão selecionado.");
            return;
        }
        
        const description = this.dom.descriptionInput.value.trim();
        if (!description) {
            alert("Por favor, forneça uma descrição para a aferição.");
            return;
        }

        const soma = this.state.amostras.reduce((acc, curr) => acc + curr, 0);
        const media = (soma / this.state.amostras.length).toFixed(2);
        const largura = parseFloat(this.dom.larguraInput.value.replace(',', '.'));
        const comprimento = parseFloat(this.dom.comprimentoInput.value.replace(',', '.'));
        const numeroDeAmostras = this.state.amostras.length;
        
        const header = 'largura_m,comprimento_m,numero_amostras,perda_media_kg_ha,descricao';
        const row = `${largura},${comprimento},${numeroDeAmostras},${media},"${description.replace(/"/g, '""')}"`;
        const csvContent = `${header}\n${row}`;

        const recordToSync = {
            fazenda: this.state.currentTalhao.Fazenda || 'Sem Fazenda',
            talhao: this.state.currentTalhao.nome_talhao,
            data: new Date().toISOString(),
            tag: 'Perca na colheita',
            csv: csvContent
        };

        try {
            await savePendingCsv(recordToSync);
            UI.setSyncStatus("Aferição de perca salva com sucesso!", 'success');
            window.dispatchEvent(new Event('monitoringUpdated'));
            DataManager.syncAll();
            this.close();
        } catch (error) {
            console.error("Erro ao salvar aferição de perca:", error);
            alert("Ocorreu um erro ao salvar a aferição.");
        }
    },
};