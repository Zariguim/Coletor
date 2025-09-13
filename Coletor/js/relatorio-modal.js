// ===================================================================================
//  MÓDULO PARA GERENCIAR O MODAL DE GERAÇÃO DE RELATÓRIOS
// ===================================================================================

const RelatorioModal = {
    // --- ESTADO ---
    state: {
        currentFazenda: null,
        allRecords: [], // Todos os registros do período para a fazenda
        recordsByTalhao: {}, // Registros agrupados por talhão
    },

    // --- ELEMENTOS DO DOM ---
    dom: {},

    init() {
        this.createModal(); 

        this.dom = {
            modal: document.getElementById('relatorio-modal'),
            closeBtn: document.getElementById('relatorio-modal-close-btn'),
            fazendaNomeTitle: document.getElementById('relatorio-fazenda-nome'),
            dateStartInput: document.getElementById('report-date-start'),
            dateEndInput: document.getElementById('report-date-end'),
            fetchRecordsBtn: document.getElementById('fetch-records-btn'),
            plotsContainer: document.getElementById('plots-container'),
            generateReportBtn: document.getElementById('generate-report-btn'),
            selectedCountSpan: document.getElementById('selected-count'),
        };
        
        this.dom.closeBtn.addEventListener('click', () => this.close());
        this.dom.fetchRecordsBtn.addEventListener('click', () => this.fetchAndDisplayRecords());
        this.dom.generateReportBtn.addEventListener('click', () => this.generatePdf());

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

        container.innerHTML = `
        <div id="relatorio-modal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-70 z-[1004] flex justify-center items-end sm:items-center">
            <div class="bg-gray-100 w-full h-full max-w-4xl max-h-[95vh] flex flex-col rounded-t-lg sm:rounded-lg">
                <div class="flex justify-between items-center p-4 border-b bg-white flex-shrink-0 rounded-t-lg">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Gerador de Relatório</h1>
                        <p id="relatorio-fazenda-nome" class="text-gray-600"></p>
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
                    <div id="plots-container" class="space-y-4">
                       <p class="text-center text-gray-500 bg-white p-6 rounded-xl shadow-md">Aguardando a seleção do período...</p>
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

    open(fazendaName) {
        this.resetModal();
        this.state.currentFazenda = fazendaName;
        this.dom.fazendaNomeTitle.textContent = `Fazenda: ${fazendaName}`;
        this.dom.modal.classList.remove('hidden');
    },

    close() {
        this.dom.modal.classList.add('hidden');
        this.resetModal();
    },

    resetModal() {
        this.state.currentFazenda = null;
        this.state.allRecords = [];
        this.state.recordsByTalhao = {};
        this.dom.fazendaNomeTitle.textContent = '';
        this.dom.dateStartInput.value = '';
        this.dom.dateEndInput.valueAsDate = new Date();
        this.dom.plotsContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-xl shadow-md">Aguardando a seleção do período...</p>';
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
            const allHistory = await getHistory();
            const filteredRecords = allHistory.filter(r => {
                const recordDate = new Date(r.data);
                const isExcludedTag = r.tag === 'Relatório' || r.tag === 'Demarcação';
                return r.fazenda === this.state.currentFazenda &&
                       recordDate >= startDateObj &&
                       recordDate <= endDateObj &&
                       !isExcludedTag;
            });
            
            this.state.allRecords = filteredRecords.sort((a, b) => new Date(b.data) - new Date(a.data));
            
            this.state.recordsByTalhao = this.state.allRecords.reduce((acc, record) => {
                (acc[record.talhao] = acc[record.talhao] || []).push(record);
                return acc;
            }, {});

            if (Object.keys(this.state.recordsByTalhao).length === 0) {
                this.dom.plotsContainer.innerHTML = '<p class="text-center text-gray-500 bg-white p-6 rounded-xl shadow-md">Nenhum registro encontrado para esta fazenda no período selecionado.</p>';
                return;
            }

            this.renderRecords();
        } catch (error) {
            console.error("Erro ao buscar registros:", error);
            this.dom.plotsContainer.innerHTML = '<p class="text-center text-red-500">Erro ao carregar os registros.</p>';
        }
    },
    
    renderRecords() {
        let html = Object.entries(this.state.recordsByTalhao).map(([talhaoName, records]) => `
            <details class="group bg-white rounded-xl shadow-md border border-gray-200" open data-talhao="${talhaoName}">
                <summary class="flex items-center justify-between p-4 cursor-pointer list-none">
                    <div class="flex items-center">
                        <input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 mr-4 select-all-plot">
                        <h3 class="text-lg font-semibold">${talhaoName}</h3>
                    </div>
                    <div class="flex items-center text-sm text-gray-500">
                       <span class="mr-2">${records.length} registro(s)</span>
                       <svg class="w-5 h-5 transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </summary>
                <div class="details-content p-4 border-t border-gray-200 bg-white">
                    <div class="space-y-3">
                        ${records.map(record => this.createRecordItemHtml(record)).join('')}
                    </div>
                    <div class="summary-section hidden mt-4 pt-4 border-t border-gray-200">
                        <div class="flex justify-between items-center mb-1">
                            <label class="block text-sm font-medium text-gray-700">Resumo do Talhão (opcional)</label>
                            <button class="generate-ai-summary text-xs bg-green-100 text-green-800 hover:bg-green-200 font-semibold py-1 px-2 rounded-md flex items-center">
                                <span class="mr-1">Gerar com IA ✨</span>
                                <div class="spinner hidden h-3 w-3 border-2 border-green-500 border-t-transparent rounded-full"></div>
                            </button>
                        </div>
                        <textarea rows="3" class="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500" placeholder="Adicione observações ou um resumo..."></textarea>
                    </div>
                </div>
            </details>
        `).join('');

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
                const data = lines[1]?.split(',') || [];
                const getVal = (key) => data[header.indexOf(key)]?.replace(/"/g, '') || 'N/D';
                
                switch(record.tag) {
                    case 'Monitoramento': details = `Pontos de monitoramento: ${lines.length - 1}.`; break;
                    case 'Anotação': details = `${getVal('anotacao')}`; imageUrl = getVal('foto_url'); break;
                    case 'População': details = `Média de ${parseInt(getVal('plantas_por_ha')).toLocaleString('pt-BR')} plantas/ha`; break;
                    case 'Recomendação': details = `Recomendação: ${getVal('descricao')}`; break;
                    default: details = getVal('descricao') || `Registro de ${record.tag}`;
                }
            }
        } catch(e) { console.warn("Erro ao parsear CSV", e); }

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
        summarySection.classList.toggle('hidden', checkedItems.length === 0);
        
        this.updateSelectedCount();
    },

    getShareableTextForRecord(record) {
        if (!record.csv) return `Registro de ${record.tag} (dados indisponíveis).`;
        const recordDate = new Date(record.data).toLocaleDateString('pt-BR');
        const lines = record.csv.split('\n');
        const header = lines[0].split(',');
        const data = lines[1]?.split(',') || [];
        const getCsvValue = (key) => data[header.indexOf(key)]?.replace(/^"|"$/g, '').replace(/""/g, '"') || 'N/D';

        switch (record.tag) {
            case 'Anotação':
                const text = getCsvValue('anotacao');
                const imageUrl = getCsvValue('foto_url');
                return `Anotação em ${recordDate}:\n- ${text}${imageUrl ? `\n- Foto anexa.` : ''}`;
            
            case 'Recomendação':
                const desc = getCsvValue('descricao');
                const area = getCsvValue('area_total_ha');
                const produtos = getCsvValue('produtos').replace(/; /g, '\n  - ');
                return `Recomendação em ${recordDate} (${desc}):\n- Área Total: ${area} ha\n- Produtos por Hectare:\n  - ${produtos}`;

            case 'Monitoramento':
                const numPoints = lines.length - 1;
                const alvos = header.slice(2);
                const alvoSums = {};
                lines.slice(1).forEach(rowStr => {
                    const values = rowStr.split(',');
                    alvos.forEach((alvoName, index) => {
                        const incidence = parseFloat(values[index + 2]);
                        if (!isNaN(incidence)) alvoSums[alvoName] = (alvoSums[alvoName] || 0) + incidence;
                    });
                });
                let averagesText = Object.entries(alvoSums)
                    .filter(([, sum]) => sum > 0)
                    .map(([name, sum]) => `\n- Média de ${name}: ${(sum / numPoints).toFixed(1)}`)
                    .join('');
                return `Monitoramento em ${recordDate}:\n- ${numPoints} pontos coletados.${averagesText || '\n- Nenhuma praga com incidência encontrada.'}`;
            
            case 'População':
                 return `Aferição de População em ${recordDate}:\n- Média de ${parseInt(getCsvValue('plantas_por_ha')).toLocaleString('pt-BR')} plantas/ha.`;

            case 'Perca na colheita':
                return `Aferição de Perca na Colheita em ${recordDate}:\n- Média de perca: ${getCsvValue('perda_media_kg_ha')} kg/ha.\n- Descrição: ${getCsvValue('descricao')}`;

            case 'Aferição de plantio':
                return `Aferição de Plantio em ${recordDate}:\n- CV: ${getCsvValue('cv')}%\n- Sementes Duplas: ${getCsvValue('duplas_pct')}%\n- Falhas: ${getCsvValue('falhas_pct')}%`;

            case 'Estimativa de produtividade':
                return `Estimativa (${getCsvValue('cultura')}) em ${recordDate}:\n- Potencial de ${getCsvValue('produtividade_sc_ha')} sc/ha.\n- Descrição: ${getCsvValue('descricao')}`;

            default:
                return `Registro de ${record.tag} em ${recordDate}:\n- Descrição: ${getCsvValue('descricao') || 'Não especificada.'}`;
        }
    },

    async handleAiButtonClick(button) {
        const detailsElement = button.closest('details');
        const textarea = detailsElement.querySelector('textarea');
        const spinner = button.querySelector('.spinner');
        const buttonText = button.querySelector('span');
        
        let context = [];
        const selectedCheckboxes = detailsElement.querySelectorAll('.select-item:checked');
        if (selectedCheckboxes.length === 0) {
            textarea.value = "Selecione pelo menos um apontamento para gerar o resumo.";
            return;
        }

        selectedCheckboxes.forEach(cb => {
            const recordId = parseInt(cb.dataset.recordId);
            const record = this.state.allRecords.find(r => r.id === recordId);
            if (record) context.push(this.getShareableTextForRecord(record));
        });

        button.disabled = true;
        buttonText.textContent = "Gerando...";
        spinner.classList.remove('hidden');
        textarea.value = "Aguarde, a IA está trabalhando...";
        const result = await this.callGeminiAPI(context.join('\n\n'));
        textarea.value = result;
        button.disabled = false;
        buttonText.textContent = "Gerar com IA ✨";
        spinner.classList.add('hidden');
    },

    async callGeminiAPI(context) {
        const apiKey = "AIzaSyD6oyzpQjuLmewiDV_0oKtL4ujw18rcG2Y";
        if (!apiKey) return "ERRO: A Chave de API do Gemini não foi configurada.";
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
        const systemPrompt = "Você é um agrônomo especialista. Sua tarefa é analisar os apontamentos de um talhão de lavoura e criar um resumo técnico e objetivo. O resumo deve ser em um único parágrafo, direto ao ponto, contextualizando as anotações de forma agronômica e evitando um tom alarmista. Destaque os problemas mais críticos e o estado geral da área com uma linguagem profissional.";
        const userQuery = `Com base nos seguintes apontamentos, gere o resumo do talhão:\n\n${context}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: userQuery }] }], systemInstruction: { parts: [{ text: systemPrompt }] } })
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const result = await response.json();
            return result.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar o resumo.";
        } catch (error) {
            console.error("Fetch Error:", error);
            return "Erro de conexão ao tentar gerar o resumo.";
        }
    },
    
    async addRecordBox(pdf, record, y, checkPageBreak) {
        const margin = 15;
        const maxWidth = pdf.internal.pageSize.width - margin * 2;
        const boxPadding = 4;
        const contentWidth = maxWidth - boxPadding * 2;

        const textContent = this.getShareableTextForRecord(record);
        const textLines = pdf.setFontSize(10).splitTextToSize(textContent, contentWidth);
        const textHeight = textLines.length * (10 * 0.35);

        let imageUrl = null, imageHeight = 0;
        if (record.tag === 'Anotação' && record.csv) {
            const data = record.csv.split('\n')[1]?.split(',') || [];
            const header = record.csv.split('\n')[0].split(',');
            const url = data[header.indexOf('foto_url')]?.replace(/"/g, '');
            if (url) { imageUrl = url; imageHeight = 50; }
        }

        const totalBoxHeight = textHeight + imageHeight + boxPadding * 2 + (imageUrl ? 5 : 0);
        y = checkPageBreak(totalBoxHeight + 5);

        pdf.setFillColor(248, 249, 250).setDrawColor(222, 226, 230);
        pdf.roundedRect(margin, y, maxWidth, totalBoxHeight, 3, 3, 'FD');
        let contentY = y + boxPadding + 3;

        pdf.setTextColor(52, 58, 64).text(textLines, margin + boxPadding, contentY);
        contentY += textHeight + 2;

        if (imageUrl) {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const imageBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                const imageProps = pdf.getImageProperties(imageBase64);
                const imageWidth = Math.min(imageHeight * (imageProps.width / imageProps.height), contentWidth);
                pdf.addImage(imageBase64, 'JPEG', margin + boxPadding, contentY, imageWidth, imageHeight);
            } catch (error) {
                console.error("Falha ao carregar imagem para o PDF:", error);
                pdf.setFontSize(8).setTextColor(255, 0, 0).text('[Erro ao carregar imagem]', margin + boxPadding, contentY);
            }
        }
        
        return y + totalBoxHeight + 5;
    },

    async generatePdf() {
        UI.setStatus(true, 'Gerando PDF do relatório...', true);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        try {
            const fazenda = this.state.currentFazenda;
            const startDate = new Date(this.dom.dateStartInput.value + 'T00:00:00').toLocaleDateString('pt-BR');
            const endDate = new Date(this.dom.dateEndInput.value + 'T23:59:59').toLocaleDateString('pt-BR');

            const allSelectedIds = Array.from(this.dom.plotsContainer.querySelectorAll('.select-item:checked')).map(cb => parseInt(cb.dataset.recordId));
            const allSelectedRecords = this.state.allRecords.filter(r => allSelectedIds.includes(r.id));
            
            const selectedRecordsByTalhao = allSelectedRecords.reduce((acc, record) => {
                (acc[record.talhao] = acc[record.talhao] || []).push(record);
                return acc;
            }, {});

            let y = 15;
            const pageHeight = pdf.internal.pageSize.height, margin = 15;
            const checkPageBreak = (neededHeight) => {
                if (y + neededHeight > pageHeight - margin) {
                    pdf.addPage();
                    return margin;
                }
                return y;
            };
            const addText = (text, size, style) => {
                const maxWidth = pdf.internal.pageSize.width - margin * 2;
                const lines = pdf.splitTextToSize(text, maxWidth);
                const textHeight = lines.length * (size * 0.35);
                y = checkPageBreak(textHeight);
                pdf.setFontSize(size).setFont('helvetica', style).text(lines, margin, y);
                y += textHeight + 2;
            };
            const addLine = () => {
                y = checkPageBreak(5);
                pdf.setDrawColor(220, 220, 220).line(margin, y, pdf.internal.pageSize.width - margin, y);
                y += 5;
            };

            pdf.setFontSize(22).setFont('helvetica', 'bold').text("Relatório de Atividades", pdf.internal.pageSize.width / 2, y, { align: 'center' });
            y += 12;
            addText(`Fazenda: ${fazenda}`, 12, 'bold');
            addText(`Período: ${startDate} a ${endDate}`, 11, 'normal');
            y += 4;
            
            let isFirstTalhao = true;
            for (const talhaoName in selectedRecordsByTalhao) {
                if (!isFirstTalhao) pdf.addPage(); y = margin;
                isFirstTalhao = false;

                addLine();
                addText(`Talhão: ${talhaoName}`, 18, 'bold');
                addLine();

                const talhaoDetailsElement = document.querySelector(`details[data-talhao="${talhaoName}"]`);
                const aiSummary = talhaoDetailsElement?.querySelector('textarea')?.value || '';
                
                if (aiSummary.trim()) {
                    addText('Resumo da Análise (IA)', 14, 'bold');
                    y += 1;
                    addText(aiSummary, 11, 'normal');
                    y += 5;
                    addLine();
                }

                const groupedRecords = selectedRecordsByTalhao[talhaoName].reduce((acc, record) => {
                    (acc[record.tag] = acc[record.tag] || []).push(record);
                    return acc;
                }, {});

                const tagOrder = ['Anotação', 'Monitoramento', 'População', 'Aferição de plantio', 'Perca na colheita', 'Estimativa de produtividade', 'Recomendação'];
                for (const tag of tagOrder) {
                    if (groupedRecords[tag]) {
                        y = checkPageBreak(20);
                        addText(tag, 14, 'bold');
                        y += 2;
                        for (const record of groupedRecords[tag]) {
                            y = await this.addRecordBox(pdf, record, y, checkPageBreak);
                        }
                    }
                }
            }

            const pdfBlob = pdf.output('blob');
            await this.uploadAndSaveReport(pdfBlob);

        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            UI.setStatus(true, 'Erro ao gerar PDF.', false);
            setTimeout(() => UI.setStatus(false), 3000);
        }
    },

    async uploadAndSaveReport(pdfBlob) {
        UI.setStatus(true, 'Enviando relatório para a nuvem...', true);
        const fileName = `relatorio_${this.state.currentFazenda.replace(/\s/g, '_')}_${Date.now()}.pdf`;

        try {
            const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('relatorios').upload(fileName, pdfBlob, { upsert: false, contentType: 'application/pdf' });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabaseClient.storage.from('relatorios').getPublicUrl(uploadData.path);
            
            const reportCsv = `descricao,pdf_url\n"Relatório de Atividades da Fazenda","${urlData.publicUrl}"`;
            const recordToSync = {
                fazenda: this.state.currentFazenda,
                talhao: "Todos", // O relatório agora é da fazenda
                data: new Date().toISOString(),
                tag: 'Relatório',
                csv: reportCsv
            };
            await savePendingCsv(recordToSync);
            
            UI.setSyncStatus("Relatório salvo e na fila para sincronização!", 'success');
            window.dispatchEvent(new Event('monitoringUpdated'));
            DataManager.syncAll();
            this.close();
        } catch (error) {
            console.error("Erro ao fazer upload ou salvar relatório:", error);
            UI.setStatus(true, 'Erro ao salvar relatório na nuvem.', false);
        } finally {
            UI.setStatus(false);
        }
    }
};