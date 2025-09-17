// ===================================================================================
//  MÓDULO PARA CRIAÇÃO DOS CARDS DE HISTÓRICO DA UI
// ===================================================================================

const UICards = {
    createRelatorioCard(record) {
        if (!record.csv) return '';
        const recordDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'relatorio', this, ${record.isPending || false})`;

        const lines = record.csv.split('\n');
        const header = lines[0].split(',');
        const data = lines.length > 1 ? lines[1].split(',') : [];
        const getCsvValue = (key) => data[header.indexOf(key)]?.replace(/^"|"$/g, '').replace(/""/g, '"') || 'N/D';
        
        const description = getCsvValue('descricao');
        const pdfUrl = getCsvValue('pdf_url');

        const shareButtonHtml = `<a href="${pdfUrl}" target="_blank" class="share-btn" onclick="event.stopPropagation(); window.open('${pdfUrl}', '_blank');"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></a>`;

        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>Relatório - ${recordDate}</h4>${shareButtonHtml}</div>
                    <p class="font-semibold text-md text-gray-800">${description}</p>
                    <a href="${pdfUrl}" target="_blank" class="text-sm text-blue-600 hover:underline">Visualizar/Baixar PDF</a>
                </div>
            </div>`;
    },

    createRecomendacaoCard(record) {
        if (!record.csv) return '';
        const recordDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'recomendacao', this, ${record.isPending || false})`;

        const lines = record.csv.split('\n');
        const header = lines[0].split(',');
        const data = lines.length > 1 ? lines[1].split(',') : [];

        const getCsvValue = (key) => data[header.indexOf(key)]?.replace(/^"|"$/g, '').replace(/""/g, '"') || 'N/D';

        const descricao = getCsvValue('descricao');
        const areaTotal = getCsvValue('area_total_ha');
        const produtos = getCsvValue('produtos');
        const tanques = getCsvValue('tanques_necessarios');
        const vazao = getCsvValue('vazao_l_ha');
        const talhoes = getCsvValue('talhoes_selecionados').split('; ').join(', ');
        const dosagemTanqueCheio = getCsvValue('dosagem_tanque_cheio');
        const observacoes = getCsvValue('observacoes');

        const sharePayload = { fazenda: record.fazenda, date: recordDate, descricao, areaTotal, produtos, tanques, vazao, talhoes, dosagemTanqueCheio, observacoes };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UIShare.shareRecomendacaoData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;

        const produtosHtml = produtos.split('; ').map(p => `<li>- ${p}</li>`).join('');

        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>Recomendação - ${recordDate}</h4>${shareButtonHtml}</div>
                    <p class="font-semibold text-md text-gray-800">${descricao}</p>
                    <div class="text-sm text-gray-600 mt-2">
                        <p><strong>Talhões:</strong> ${talhoes}</p>
                        <div class="grid grid-cols-2 gap-2 mt-1">
                           <p><strong>Área Total:</strong> ${areaTotal} ha</p>
                           <p><strong>Tanques:</strong> ${tanques}</p>
                        </div>
                    </div>
                    <div class="mt-2 text-sm">
                        <p class="font-medium text-gray-700"><strong>Produtos (Dose/ha):</strong></p>
                        <ul class="list-none pl-2 text-gray-600">${produtosHtml}</ul>
                    </div>
                </div>
            </div>`;
    },

    createEstimativaProdutividadeCard(record) {
        if (!record.csv) return '';
        const recordDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'productivity_estimation', this, ${record.isPending || false})`;

        const lines = record.csv.split('\n');
        const header = lines[0].split(',');
        const data = lines.length > 1 ? lines[1].split(',') : [];
        
        const cultura = data[header.indexOf('cultura')] || 'N/D';
        const produtividade = data[header.indexOf('produtividade_sc_ha')] || 'N/D';
        const descricaoIndex = header.indexOf('descricao');
        const description = (descricaoIndex !== -1 && data[descricaoIndex]) ? data[descricaoIndex].replace(/^"|"$/g, '').replace(/""/g, '"') : 'Sem descrição';

        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: recordDate, cultura, produtividade, description };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UIShare.shareEstimativaProdutividadeData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;
        const descriptionHtml = `<p class="whitespace-pre-wrap mt-2">${description}</p>`;
        const culturaEmoji = cultura.toLowerCase() === 'soja' ? '🌱' : '🌽';

        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>Estimativa de Produtividade - ${recordDate}</h4>${shareButtonHtml}</div>
                    <p class="font-semibold text-lg text-gray-800">${produtividade} sc/ha</p>
                    <div class="text-sm text-gray-600 mt-2">
                        <p><strong>Cultura:</strong> ${culturaEmoji} ${cultura}</p>
                    </div>
                    ${descriptionHtml}
                </div>
            </div>`;
    },
    
    createHarvestLossCard(record) {
        if (!record.csv) return '';
        const recordDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'harvest_loss', this, ${record.isPending || false})`;

        const lines = record.csv.split('\n');
        const header = lines[0].split(',');
        const data = lines.length > 1 ? lines[1].split(',') : [];
        
        const mediaPerca = data[header.indexOf('perda_media_kg_ha')] || 'N/D';
        const numAmostras = data[header.indexOf('numero_amostras')] || 'N/D';
        const largura = data[header.indexOf('largura_m')] || 'N/D';
        const comprimento = data[header.indexOf('comprimento_m')] || 'N/D';
        const descricaoIndex = header.indexOf('descricao');
        const description = (descricaoIndex !== -1 && data[descricaoIndex]) ? data[descricaoIndex].replace(/^"|"$/g, '').replace(/""/g, '"') : 'Sem descrição';

        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: recordDate, media: mediaPerca, amostras: numAmostras, largura, comprimento, description };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UIShare.shareHarvestLossData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;
        const descriptionHtml = `<p class="whitespace-pre-wrap mt-2">${description}</p>`;

        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>Perca na Colheita - ${recordDate}</h4>${shareButtonHtml}</div>
                    <p class="font-semibold text-lg text-gray-800">${mediaPerca} kg/ha</p>
                    <div class="text-sm text-gray-600 mt-2">
                        <p><strong>Área da Amostra:</strong> ${largura}m x ${comprimento}m</p>
                        <p><strong>Nº de Amostras:</strong> ${numAmostras}</p>
                    </div>
                    ${descriptionHtml}
                </div>
            </div>`;
    },

    createPlantingAssessmentCard(record) {
        if (!record.csv) return '';
        const recordDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'planting_assessment', this, ${record.isPending || false})`;

        const lines = record.csv.split('\n');
        const header = lines[0].split(',');
        const data = lines.length > 1 ? lines[1].split(',') : [];
        
        const cv = data[header.indexOf('cv')] || 'N/D';
        const duplas = data[header.indexOf('duplas_pct')] || 'N/D';
        const arraste = data[header.indexOf('arraste_pct')] || 'N/D';
        const falhas = data[header.indexOf('falhas_pct')] || 'N/D';

        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: recordDate, cv, duplas, arraste, falhas };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UIShare.sharePlantingAssessmentData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;

        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>Aferição de Plantio - ${recordDate}</h4>${shareButtonHtml}</div>
                    <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-2">
                        <div class="text-center bg-blue-100 p-2 rounded-lg">
                            <p class="text-sm font-bold text-blue-800">CV</p>
                            <p class="text-xl font-bold text-blue-800">${cv}%</p>
                        </div>
                        <div class="text-center bg-red-100 p-2 rounded-lg">
                            <p class="text-sm font-bold text-red-800">Duplas</p>
                            <p class="text-lg font-bold text-red-800">${duplas}%</p>
                        </div>
                        <div class="text-center bg-orange-100 p-2 rounded-lg">
                            <p class="text-sm font-bold text-orange-800">Arraste</p>
                            <p class="text-lg font-bold text-orange-800">${arraste}%</p>
                        </div>
                        <div class="text-center bg-purple-100 p-2 rounded-lg">
                            <p class="text-sm font-bold text-purple-800">Falhas</p>
                            <p class="text-lg font-bold text-purple-800">${falhas}%</p>
                        </div>
                    </div>
                </div>
            </div>`;
    },

    createPopulationCard(record) {
        if (!record.csv) return '';
        const recordDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'population', this, ${record.isPending || false})`;

        const lines = record.csv.split('\n');
        const header = lines[0].split(',');
        const data = lines.length > 1 ? lines[1].split(',') : [];
        
        const espacamento = data[header.indexOf('espacamento_m')] || 'N/D';
        const numAmostras = data[header.indexOf('numero_amostras')] || 'N/D';
        const mediaPlantas = parseInt(data[header.indexOf('plantas_por_ha')]) || 0;
        const metrosAvaliados = data[header.indexOf('metros_avaliados_amostra')] || 'N/D';
        
        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: recordDate, media: mediaPlantas.toLocaleString('pt-BR'), espacamento, amostras: numAmostras, metros: metrosAvaliados };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UIShare.sharePopulationData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;

        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete">
                    <button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>População - ${recordDate}</h4>${shareButtonHtml}</div>
                    <p class="font-semibold text-lg text-gray-800">${mediaPlantas.toLocaleString('pt-BR')} plantas/ha</p>
                    <div class="text-sm text-gray-600 mt-2">
                        <p><strong>Espaçamento:</strong> ${espacamento} m</p>
                        <p><strong>Metros por amostra:</strong> ${metrosAvaliados} m</p>
                        <p><strong>Nº de Amostras:</strong> ${numAmostras}</p>
                    </div>
                </div>
            </div>`;
    },

    createDemarcationCard(record) {
        if (!record.csv) return '';
        const demarcationDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'demarcation', this, ${record.isPending || false})`;
        let description = 'Demarcação de área', kmlContent = '', areaHa = null;
        const lines = record.csv.split('\n');
        if (lines.length > 1) {
            const dataLine = lines[1];
            const firstSeparator = dataLine.indexOf('","');
            const secondSeparator = dataLine.indexOf('","', firstSeparator + 1);
            if (firstSeparator > 0 && secondSeparator > 0) {
                description = dataLine.substring(1, firstSeparator).replace(/""/g, '"');
                kmlContent = dataLine.substring(firstSeparator + 3, secondSeparator).replace(/""/g, '"');
                areaHa = dataLine.substring(secondSeparator + 3, dataLine.length - 1).replace(/""/g, '"');
            }
        }
        const areaHtml = areaHa ? `<p class="font-semibold text-gray-700">${areaHa} ha</p>` : '';
        const safeKmlContent = encodeURIComponent(kmlContent);
        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete"><button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>
                <div class="monitoring-card swipe-card-content" onclick="MapManager.drawKmlOnMap('${safeKmlContent}')">
                    <div class="monitoring-card-header"><h4>Demarcação - ${demarcationDate}</h4>${areaHtml}</div>
                    <p class="whitespace-pre-wrap">${description}</p>
                </div>
            </div>`;
    },

    createAnnotationCard(record) {
        const annotationDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const recordIdString = typeof record.id === 'string' ? `'${record.id}'` : record.id;
        const deleteAction = `UI.handleDeleteRecord(${recordIdString}, '${record.talhaoId}', 'annotation', this, ${record.isPending || false}, ${record.isLocal || false})`;
        let textContent = record.texto || '', imageUrl = record.foto || '';
        if (record.csv) {
            const lines = record.csv.split('\n');
            const header = lines[0].split(',');
            const data = lines.length > 1 ? lines[1].split(',') : [];
            const anotacaoIndex = header.indexOf('anotacao');
            const fotoUrlIndex = header.indexOf('foto_url');
            if (anotacaoIndex !== -1 && data[anotacaoIndex]) textContent = data[anotacaoIndex].replace(/^"|"$/g, '').replace(/""/g, '"');
            if (fotoUrlIndex !== -1 && data[fotoUrlIndex]) { const url = data[fotoUrlIndex].replace(/"/g, ''); if (url) imageUrl = url; }
        }
        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: annotationDate, text: textContent, imageUrl: imageUrl };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const imageHtml = imageUrl ? `<img src="${imageUrl}" alt="Foto da anotação" class="annotation-photo" loading="lazy" onclick="event.stopPropagation(); UI.showFullscreenImage('${imageUrl}')">` : '';
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UIShare.shareAnnotationData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;
        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete"><button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>Anotação - ${annotationDate}</h4>${shareButtonHtml}</div>
                    ${textContent ? `<p class="whitespace-pre-wrap">${textContent}</p>` : ''}
                    ${imageHtml}
                </div>
            </div>`;
    },

    createMonitoringCard(record) {
        if (!record.csv) return '';
        const lines = record.csv.trim().split('\n');
        if (lines.length <= 1) return '';
        const header = lines[0].split(',');
        const dataRows = lines.slice(1);
        if (dataRows.length === 0) return '';
        const numPoints = dataRows.length, alvos = header.slice(2), alvoSums = {};
        dataRows.forEach(rowStr => { const values = rowStr.split(','); alvos.forEach((alvoName, index) => { const incidence = parseFloat(values[index + 2]); if (!isNaN(incidence)) alvoSums[alvoName] = (alvoSums[alvoName] || 0) + incidence; }); });
        let averagesHtml = '', averagesTextForShare = '', hasAverages = false;
        for (const alvoName in alvoSums) { const totalIncidence = alvoSums[alvoName]; if (totalIncidence > 0) { const average = (totalIncidence / numPoints).toFixed(1).replace('.', ','); averagesHtml += `<p>${alvoName}: ${average}</p>`; averagesTextForShare += `${alvoName}: ${average}\n`; hasAverages = true; } }
        if (!hasAverages) { averagesHtml = '<p class="text-sm text-gray-500">Nenhuma praga encontrada.</p>'; averagesTextForShare = 'Nenhuma praga encontrada.'; }
        const monitoringDate = new Date(record.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const sharePayload = { fazenda: record.fazenda, talhao: record.talhao, date: monitoringDate, points: numPoints, averages: averagesTextForShare.trim() };
        const payloadString = encodeURIComponent(JSON.stringify(sharePayload));
        const deleteAction = `UI.handleDeleteRecord(${record.id}, null, 'monitoring', this, ${record.isPending || false})`;
        const shareButtonHtml = `<button class="share-btn" onclick="event.stopPropagation(); UIShare.shareMonitoringData('${payloadString}')"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg></button>`;
        return `
            <div class="swipe-card-wrapper">
                <div class="swipe-card-delete"><button class="delete-btn" onclick="${deleteAction}"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>
                <div class="monitoring-card swipe-card-content">
                    <div class="monitoring-card-header"><h4>${record.tag || 'Monitoramento'} - ${monitoringDate}</h4>${shareButtonHtml}</div>
                    <p><strong>Número de pontos:</strong> ${numPoints}</p>
                    <div class="averages-list"><p><strong>Médias:</strong></p>${averagesHtml}</div>
                </div>
            </div>`;
    }
};