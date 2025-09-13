// ===================================================================================
//  MÓDULO PARA GERENCIAR O MODAL DE AFERIÇÕES
// ===================================================================================

const AfericaoModal = {
    // --- ELEMENTOS DO DOM ---
    dom: {
        choiceModal: document.getElementById('afericao-choice-modal'),
        choiceCloseBtn: document.getElementById('afericao-choice-close-btn'),
        standPlantasBtn: document.getElementById('stand-plantas-btn'),

        standModal: document.getElementById('stand-plantas-modal'),
        standCloseBtn: document.getElementById('stand-plantas-close-btn'),
        standSaveBtn: document.getElementById('save-stand-btn'),
        
        espacamentoInput: document.getElementById('espacamento-input'),
        metrosAvaliadosInput: document.getElementById('metros-avaliados-input'),
        plantasEncontradasInput: document.getElementById('plantas-encontradas-input'),
        addMedicaoBtn: document.getElementById('add-medicao-btn'),
        
        medicoesList: document.getElementById('medicoes-list'),
        mediaResult: document.getElementById('media-plantas-result'),
    },

    // --- ESTADO ---
    state: {
        currentTalhao: null,
        medicoes: [], // Array de valores de plantas/ha
    },

    /**
     * Inicializa o módulo, adicionando os eventos.
     */
    init() {
        // Modal de Escolha
        this.dom.choiceCloseBtn.addEventListener('click', () => this.closeChoiceModal(true));
        this.dom.standPlantasBtn.addEventListener('click', () => this.openStandModal());

        // Modal do Stand de Plantas
        this.dom.standCloseBtn.addEventListener('click', () => this.closeStandModal());
        this.dom.addMedicaoBtn.addEventListener('click', () => this.addMedicao());
        this.dom.standSaveBtn.addEventListener('click', () => this.save());
    },

    /**
     * Abre o modal de escolha de aferição.
     * @param {object} talhao - O objeto de dados do talhão selecionado.
     */
    openChoiceModal(talhao) {
        this.state.currentTalhao = talhao;
        this.dom.choiceModal.classList.remove('hidden');
    },

    /**
     * Fecha o modal de escolha.
     * @param {boolean} clearTalhao - Se deve limpar a referência do talhão.
     */
    closeChoiceModal(clearTalhao = false) {
        this.dom.choiceModal.classList.add('hidden');
        if (clearTalhao) {
            this.state.currentTalhao = null;
        }
    },

    /**
     * Abre o modal de Stand de Plantas.
     */
    openStandModal() {
        this.closeChoiceModal(false); // Fecha o modal anterior sem limpar o talhão
        this.dom.standModal.classList.remove('hidden');
        this.dom.espacamentoInput.focus();
    },

    /**
     * Fecha o modal de Stand de Plantas e limpa o estado.
     */
    closeStandModal() {
        this.dom.standModal.classList.add('hidden');
        this.state.medicoes = [];
        this.state.currentTalhao = null; // Limpa o talhão aqui
        this.dom.espacamentoInput.value = '';
        this.dom.metrosAvaliadosInput.value = '';
        this.dom.plantasEncontradasInput.value = '';
        this.renderMedicoes();
    },

    /**
     * Adiciona uma nova medição à lista.
     */
    addMedicao() {
        const espacamento = parseFloat(this.dom.espacamentoInput.value.replace(',', '.'));
        const metrosAvaliados = parseFloat(this.dom.metrosAvaliadosInput.value.replace(',', '.'));
        const plantasEncontradas = parseInt(this.dom.plantasEncontradasInput.value);

        if (isNaN(espacamento) || espacamento <= 0) {
            alert("Por favor, informe um espaçamento válido.");
            return;
        }
        if (isNaN(metrosAvaliados) || metrosAvaliados <= 0) {
            alert("Por favor, informe um valor válido para os metros avaliados.");
            return;
        }
        if (isNaN(plantasEncontradas) || plantasEncontradas < 0) {
            alert("Por favor, informe um número válido de plantas.");
            return;
        }

        // Cálculos
        const metrosLinearesPorHectare = 10000 / espacamento;
        const plantasPorMetro = plantasEncontradas / metrosAvaliados;
        const plantasPorHectare = plantasPorMetro * metrosLinearesPorHectare;

        this.state.medicoes.push(plantasPorHectare);
        this.renderMedicoes();

        // Limpa apenas o campo de plantas para a próxima medição
        this.dom.plantasEncontradasInput.value = '';
        this.dom.plantasEncontradasInput.focus();
    },

    /**
     * Remove uma medição da lista.
     * @param {number} index - O índice da medição a ser removida.
     */
    removeMedicao(index) {
        this.state.medicoes.splice(index, 1);
        this.renderMedicoes();
    },
    
    /**
     * Renderiza a lista de medições e a média na tela.
     */
    renderMedicoes() {
        this.dom.medicoesList.innerHTML = '';
        if (this.state.medicoes.length === 0) {
            this.dom.medicoesList.innerHTML = `<p class="text-center text-gray-500">Nenhuma medição adicionada.</p>`;
            this.dom.mediaResult.textContent = '0';
            this.dom.standSaveBtn.disabled = true;
            return;
        }

        this.state.medicoes.forEach((medicao, index) => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center bg-gray-100 p-2 rounded';
            item.innerHTML = `
                <span>Medição ${index + 1}: ${Math.round(medicao).toLocaleString('pt-BR')} plantas/ha</span>
                <button data-index="${index}" class="remove-medicao-btn text-red-500 font-bold">&times;</button>
            `;
            this.dom.medicoesList.appendChild(item);
        });
        
        // Adiciona evento aos botões de remoção
        this.dom.medicoesList.querySelectorAll('.remove-medicao-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.removeMedicao(parseInt(e.target.dataset.index)));
        });

        // Calcula e exibe a média
        const soma = this.state.medicoes.reduce((acc, curr) => acc + curr, 0);
        const media = soma / this.state.medicoes.length;
        this.dom.mediaResult.textContent = Math.round(media).toLocaleString('pt-BR');
        this.dom.standSaveBtn.disabled = false;
    },

    /**
     * Salva a média de população como um novo registro.
     */
    async save() {
        if (this.state.medicoes.length === 0) {
            alert("Adicione pelo menos uma medição para salvar.");
            return;
        }
        if (!this.state.currentTalhao) {
            alert("Erro: Talhão não identificado.");
            return;
        }

        const soma = this.state.medicoes.reduce((acc, curr) => acc + curr, 0);
        const media = Math.round(soma / this.state.medicoes.length);
        const espacamento = parseFloat(this.dom.espacamentoInput.value.replace(',', '.'));
        const metrosAvaliados = parseFloat(this.dom.metrosAvaliadosInput.value.replace(',', '.'));
        const numeroDeAmostras = this.state.medicoes.length;

        // Cria o conteúdo do CSV
        const header = 'espacamento_m,metros_avaliados_amostra,numero_amostras,plantas_por_ha';
        const row = `${espacamento},${metrosAvaliados},${numeroDeAmostras},${media}`;
        const csvContent = `${header}\n${row}`;

        const recordToSync = {
            fazenda: this.state.currentTalhao.Fazenda || 'Sem Fazenda',
            talhao: this.state.currentTalhao.nome_talhao,
            data: new Date().toISOString(),
            tag: 'População',
            csv: csvContent
        };

        try {
            await savePendingCsv(recordToSync);
            
            UI.setSyncStatus("Aferição de população salva com sucesso!", 'success');
            window.dispatchEvent(new Event('monitoringUpdated'));
            DataManager.syncAll();
            this.closeStandModal();
            
        } catch (error) {
            console.error("Erro ao salvar aferição de população:", error);
            alert("Ocorreu um erro ao salvar a aferição.");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AfericaoModal.init();
});