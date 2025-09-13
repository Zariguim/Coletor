// ===================================================================================
//  MÓDULO PARA GERENCIAR O MODAL DE GERAÇÃO DE RELATÓRIOS
// ===================================================================================

const RelatorioModal = {
    // --- ESTADO ---
    state: {
        currentTalhao: null,
        allRecords: [],
    },

    // --- ELEMENTOS DO DOM ---
    dom: {},

    init() {
        this.createModal(); // Garante que o HTML do modal exista

        this.dom = {
            modal: document.getElementById('relatorio-modal'),
            closeBtn: document.getElementById('relatorio-modal-close-btn'),
            talhaoNomeTitle: document.getElementById('relatorio-talhao-nome'),
            dateStartInput: document.getElementById('report-date-start'),
            dateEndInput: document.getElementById('report-date-end'),
            fetchRecordsBtn: document.getElementById('fetch-records-btn'),
            plotsContainer: document.getElementById('plots-container'),
            generateReportBtn: document.getElementById('generate-report-btn'),
            selectedCountSpan: document.getElementById('selected-count'),
            reportContent: document.getElementById('report-content-to-print'), // Área a ser impressa
        };
        
        this.dom.closeBtn.addEventListener('click', () => this.close());
        this.dom.fetchRecordsBtn.addEventListener('click', () => this.fetchAndDisplayRecords());
        this.dom.generateReportBtn.addEventListener('click', () => this.generatePdf());

        // Ação de clique para checkboxes e botões de IA
        this.dom.plotsContainer.addEventListener('click', async (e) => {
            const aiButton = e.target.closest('.generate-ai-summary');
            const checkbox = e.target.closest('input[type="checkbox"]');

            if (checkbox) {
                this.handleCheckboxChange(checkbox);
            } else if (aiButton) {
                e.preventDefault();
                await this.handleAiButtonClick(aiButton);
            }
        });
    },

    createModal() {
        const container = document.getElementById('relatorio-modal-container');
        if (container.innerHTML !== '') return;

        // Estrutura do modal baseada no HTML fornecido pelo usuário
        container.innerHTML = `
        <div id="relatorio-modal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-70 z-[1004] flex justify-center items-end sm:items-center">
            <div class="bg-gray-100 w-full h-full max-w-4xl max-h-[95vh] flex flex-col rounded-t-lg sm:rounded-lg">
                <div class="flex justify-between items-center p-4 border-b bg-white flex-shrink-0 rounded-t-lg">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Gerador de Relatório</h1>
                        <p id="relatorio-talhao-nome" class="text-gray-600"></p>
                    </div>
                    <button id="relatorio-modal-close-btn" class="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
                </div>
                <div class="flex-grow overflow-y-auto p-4 md:p-6">
                    <div class="bg-white p-6 rounded-xl shadow-md mb-8">
                        <h2 class="text-xl font-semibold mb-4 border-b pb-2">1. Selecione o Período</h2>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label for="report-date-start" class="block text-sm font-medium text-gray-700">Data de Início</label>
                                <input type="date" id="report-date-start" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
                            </div>
                            <div>
                                <label for="report-date-end" class="block text-sm font-medium text-gray-700">Data Final</label>
                                <input type="date" id="report-date-end" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
                            </div>
                            <button id="fetch-records-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 h-10">Buscar Registros</button>
                        </div>
                    </div>
                    <div id="report-content-to-print">
                        <div class="bg-white p-6 rounded-xl shadow-md">
                            <h2 class="text-xl font-semibold mb-4 border-b pb-2">2. Seleção de Apontamentos</h2>
                            <div class="space-y-4" id="plots-container">
                               <p class="text-center text-gray-500">Aguardando a seleção do período...</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="p-4 bg-white border-t flex-shrink-0 flex justify-end">
                     <button id="generate-report-btn" class="bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all duration-300 disabled:bg-gray-400" disabled>
                        Gerar Relatório (<span id="selected-count">0</span> itens)
                    </button>
                </div>
            </div>
        </div>`;
    },

    open(talhao) {
        this.resetModal();
        this.state.currentTalhao = talhao;
        this.dom.talhaoNomeTitle.textContent = `Talhão: ${talhao.nome_talhao}`;
        this.dom.modal.classList.remove('hidden');
    },

    close() {
        this.dom.modal.classList.add('hidden');
        this.resetModal();
    },

    resetModal() {
        this.state.currentTalhao = null;
        this.state.allRecords = [];
        this.dom.talhaoNomeTitle.textContent = '';
        this.dom.dateStartInput.value = '';
        this.dom.dateEndInput.valueAsDate = new Date(); // Data de hoje como padrão
        this.dom.plotsContainer.innerHTML = '<p class="text-center text-gray-500">Aguardando a seleção do período...</p>';
        this.updateSelectedCount();
    },

    async fetchAndDisplayRecords() {
        const startDate = this.dom.dateStartInput.value;
        const endDate = this.dom.dateEndInput.value;

        if (!startDate || !endDate) {
            alert("Por favor, selecione as datas de início e fim.");
            return;
        }

        const startDateObj = new Date(startDate + 'T00:00:00');
        const endDateObj = new Date(endDate + 'T23:59:59');

        this.dom.plotsContainer.innerHTML = '<p class="text-center text-gray-500">Buscando registros...</p>';
        
        try {
            const allHistory = await getHistory(); // Pega do IndexedDB
            const filteredRecords = allHistory.filter(r => {
                const recordDate = new Date(r.data);
                return r.talhao === this.state.currentTalhao.nome_talhao &&
                       recordDate >= startDateObj &&
                       recordDate <= endDateObj;
            });

            this.state.allRecords = filteredRecords.sort((a, b) => new Date(b.data) - new Date(a.data));

            if (this.state.allRecords.length === 0) {
                this.dom.plotsContainer.innerHTML = '<p class="text-center text-gray-500">Nenhum registro encontrado para este período.</p>';
                return;
            }

            this.renderRecords();
        } catch (error) {
            console.error("Erro ao buscar registros:", error);
            this.dom.plotsContainer.innerHTML = '<p class="text-center text-red-500">Erro ao carregar os registros.</p>';
        }
    },
    
    renderRecords() {
        let html = `
        <details class="group bg-gray-50 rounded-lg border border-gray-200" open>
            <summary class="flex items-center justify-between p-4 cursor-pointer list-none">
                <div class="flex items-center">
                    <input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mr-4 select-all-plot">
                    <h3 class="text-lg font-semibold">${this.state.currentTalhao.nome_talhao}</h3>
                </div>
                <div class="flex items-center text-sm text-gray-500">
                   <span class="mr-2">Expandir</span>
                   <svg class="w-5 h-5 transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </summary>
            <div class="details-content p-4 border-t border-gray-200 bg-white">
                <div class="space-y-3">
                    ${this.state.allRecords.map(record => this.createRecordItemHtml(record)).join('')}
                </div>
                <div class="summary-section hidden mt-4 pt-4 border-t border-gray-200">
                    <div class="flex justify-between items-center mb-1">
                        <label for="summary-plot-1" class="block text-sm font-medium text-gray-700">Resumo do Talhão (opcional)</label>
                        <button class="generate-ai-summary text-xs bg-green-100 text-green-800 hover:bg-green-200 font-semibold py-1 px-2 rounded-md flex items-center">
                            <span class="mr-1">Gerar com IA ✨</span>
                            <div class="spinner hidden h-3 w-3 border-2 border-green-500 border-t-transparent rounded-full"></div>
                        </button>
                    </div>
                    <textarea id="summary-plot-1" rows="3" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500" placeholder="Adicione observações ou um resumo..."></textarea>
                </div>
            </div>
        </details>`;
        this.dom.plotsContainer.innerHTML = html;
        this.updateSelectedCount();
    },
    
    createRecordItemHtml(record) {
        const recordDate = new Date(record.data).toLocaleDateString('pt-BR');
        let title = record.tag;
        let details = 'Dados não puderam ser lidos.';
        let imageUrl = null;

         try {
            if (record.csv) {
                const lines = record.csv.split('\n');
                const header = lines[0].split(',');
                const data = lines.length > 1 ? lines[1].split(',') : [];
                const getVal = (key) => data[header.indexOf(key)]?.replace(/"/g, '') || 'N/D';
                
                switch(record.tag) {
                    case 'Monitoramento':
                        details = `Pontos de monitoramento: ${lines.length - 1}.`;
                        break;
                    case 'Anotação':
                        details = `${getVal('anotacao')}`;
                        imageUrl = getVal('foto_url');
                        break;
                    case 'População':
                        details = `Média de ${parseInt(getVal('plantas_por_ha')).toLocaleString('pt-BR')} plantas/ha`;
                        break;
                    case 'Demarcação':
                        details = getVal('description') || `Área de ${parseFloat(getVal('area_ha')).toFixed(2)} ha`;
                        break;
                    case 'Recomendação':
                        details = `Para ${getVal('talhoes_selecionados').split(';').length} talhão(ões), totalizando ${getVal('area_total_ha')} ha.`;
                        break;
                    default:
                        details = getVal('descricao') || `Registro de ${record.tag}`;
                }
            }
        } catch(e) { console.warn("Erro ao parsear CSV para item de relatório", e); }

        const imageHtml = imageUrl ? `<img src="${imageUrl}" alt="Foto" class="mt-2 rounded-md w-24 h-auto">` : '';

        return `
        <div class="flex items-start p-3 rounded-md hover:bg-gray-50">
            <input type="checkbox" class="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 mt-1 select-item" data-record-id="${record.id}">
            <div class="ml-3 text-sm flex-grow">
                <div class="font-medium text-gray-900">${title}</div>
                <p class="text-gray-500">${details}</p>
                ${imageHtml}
            </div>
            <span class="text-xs text-gray-400">${recordDate}</span>
        </div>`;
    },

    updateSelectedCount() {
        const selectedItems = this.dom.plotsContainer.querySelectorAll('.select-item:checked');
        const count = selectedItems.length;
        this.dom.selectedCountSpan.textContent = count;
        this.dom.generateReportBtn.disabled = count === 0;
    },

    handleCheckboxChange(checkbox) {
        const detailsElement = checkbox.closest('details');
        if (!detailsElement) return;

        if (checkbox.classList.contains('select-all-plot')) {
            detailsElement.querySelectorAll('.select-item').forEach(cb => { cb.checked = checkbox.checked; });
        }
        
        const allItems = detailsElement.querySelectorAll('.select-item');
        const checkedItems = detailsElement.querySelectorAll('.select-item:checked');
        detailsElement.querySelector('.select-all-plot').checked = allItems.length > 0 && allItems.length === checkedItems.length;
        
        const summarySection = detailsElement.querySelector('.summary-section');
        if (checkedItems.length > 0) {
            summarySection.classList.remove('hidden');
        } else {
            summarySection.classList.add('hidden');
        }
        this.updateSelectedCount();
    },

    async handleAiButtonClick(button) {
        const detailsElement = button.closest('details');
        const textarea = detailsElement.querySelector('textarea');
        const spinner = button.querySelector('.spinner');
        const buttonText = button.querySelector('span');
        
        let context = [];
        detailsElement.querySelectorAll('.select-item:checked').forEach(item => {
            const parent = item.closest('.flex.items-start');
            const title = parent.querySelector('.font-medium').textContent.trim();
            const description = parent.querySelector('p.text-gray-500').textContent.trim();
            context.push(`${title}: ${description}`);
        });

        if (context.length === 0) {
            textarea.value = "Selecione pelo menos um apontamento para gerar o resumo.";
            return;
        }

        button.disabled = true;
        buttonText.textContent = "Gerando...";
        spinner.classList.remove('hidden');
        textarea.value = "Aguarde, a IA está trabalhando...";

        const result = await this.callGeminiAPI(context.join('\n'));
        
        textarea.value = result;
        button.disabled = false;
        buttonText.textContent = "Gerar com IA ✨";
        spinner.classList.add('hidden');
    },

    async callGeminiAPI(context) {
        const apiKey = "AIzaSyD6oyzpQjuLmewiDV_0oKtL4ujw18rcG2Y"; // SUA CHAVE API FOI INSERIDA AQUI

        if (!apiKey) {
            return "ERRO: A Chave de API do Gemini não foi configurada. Por favor, adicione sua chave no arquivo js/relatorio-modal.js";
        }
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const systemPrompt = "Você é um agrônomo especialista. Sua tarefa é analisar os apontamentos de um talhão de lavoura e criar um resumo técnico e objetivo. O resumo deve ser em um único parágrafo, direto ao ponto, destacando os problemas mais críticos e o estado geral da área.";
        const userQuery = `Com base nos seguintes apontamentos, gere o resumo do talhão:\n\n${context}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: userQuery }] }], systemInstruction: { parts: [{ text: systemPrompt }] } })
            });
            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error("API Error Response:", errorBody);
                 throw new Error(`API Error: ${response.statusText}`);
            }
            const result = await response.json();
            return result.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar o resumo. A resposta da IA foi inesperada.";
        } catch (error) {
            console.error("Fetch Error:", error);
            return "Erro de conexão ao tentar gerar o resumo. Verifique sua chave de API e conexão com a internet.";
        }
    },

    async generatePdf() {
        UI.setStatus(true, 'Gerando PDF do relatório...', true);
        const reportElement = this.dom.reportContent;
        const { jsPDF } = window.jspdf;

        try {
            // Esconde temporariamente os checkboxes para não aparecerem no PDF
            reportElement.querySelectorAll('input[type="checkbox"]').forEach(el => el.style.visibility = 'hidden');

            const canvas = await html2canvas(reportElement, { scale: 2 });
            
            // Mostra os checkboxes novamente
            reportElement.querySelectorAll('input[type="checkbox"]').forEach(el => el.style.visibility = 'visible');

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            // ***** LINHA CORRIGIDA *****
            const pdfBlob = pdf.output('blob');
            // ***************************

            await this.uploadAndSaveReport(pdfBlob);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            reportElement.querySelectorAll('input[type="checkbox"]').forEach(el => el.style.visibility = 'visible');
            UI.setStatus(true, 'Erro ao gerar PDF.', false);
            setTimeout(() => UI.setStatus(false), 3000);
        }
    },

    async uploadAndSaveReport(pdfBlob) {
        UI.setStatus(true, 'Enviando relatório para a nuvem...', true);
        const fileName = `relatorio_${this.state.currentTalhao.nome_talhao.replace(/\s/g, '_')}_${Date.now()}.pdf`;

        try {
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('relatorios')
                .upload(fileName, pdfBlob, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: 'application/pdf'
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage.from('relatorios').getPublicUrl(uploadData.path);
            const publicUrl = urlData.publicUrl;

            // Salvar o registro no histórico
            const reportCsv = `descricao,pdf_url\n"Relatório de Atividades do Talhão","${publicUrl}"`;
            const recordToSync = {
                fazenda: this.state.currentTalhao.Fazenda || 'Sem Fazenda',
                talhao: this.state.currentTalhao.nome_talhao,
                data: new Date().toISOString(),
                tag: 'Relatório',
                csv: reportCsv
            };
            await savePendingCsv(recordToSync);
            
            UI.setSyncStatus("Relatório salvo e na fila para sincronização!", 'success');
            window.dispatchEvent(new Event('monitoringUpdated'));
            DataManager.syncAll();
            this.close();
            UI.setStatus(false);

        } catch (error) {
            console.error("Erro ao fazer upload ou salvar relatório:", error);
            UI.setStatus(true, 'Erro ao salvar relatório na nuvem.', false);
            setTimeout(() => UI.setStatus(false), 3000);
        }
    }
};