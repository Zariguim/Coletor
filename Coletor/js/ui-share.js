// ===================================================================================
//  MÓDULO PARA COMPARTILHAMENTO DE DADOS DOS CARDS
// ===================================================================================

const UIShare = {
    shareRecomendacaoData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const produtosHa = data.produtos.split('; ').join('\n  - ');
            const dosagemTanque = data.dosagemTanqueCheio.split('; ').join('\n  - ');
            const obsText = data.observacoes ? `\n*Observações:*\n${data.observacoes}` : '';

            const message = `*Recomendação de Pulverização*\n\n*Fazenda:* ${data.fazenda}\n*Data:* ${data.date}\n\n*Descrição:* ${data.descricao}\n*Talhões:* ${data.talhoes}\n\n-----------------------\n*Área Total:* ${data.areaTotal} ha\n*Vazão:* ${data.vazao} L/ha\n*Tanques Necessários:* ${data.tanques}\n\n*Produtos por Hectare:*\n  - ${produtosHa}\n\n*Dosagem por Tanque Cheio:*\n  - ${dosagemTanque}${obsText}`;
            
            if (navigator.share) { navigator.share({ text: message }); } 
            else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank'); }
        } catch (error) {
            console.error("Erro ao compartilhar recomendação:", error);
            alert("Não foi possível compartilhar os dados.");
        }
    },

    shareEstimativaProdutividadeData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const culturaEmoji = data.cultura.toLowerCase() === 'soja' ? '🌱' : '🌽';
            const message = `*Estimativa de Produtividade*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n*Cultura:* ${culturaEmoji} ${data.cultura}\n*Produtividade Estimada:* ${data.produtividade} sc/ha\n\n*Descrição:*\n${data.description}`;
            if (navigator.share) { navigator.share({ text: message }); } 
            else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank'); }
        } catch (error) {
            console.error("Erro ao compartilhar dados de estimativa:", error);
            alert("Não foi possível compartilhar os dados.");
        }
    },

    shareHarvestLossData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const message = `*Aferição de Perca na Colheita*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n*Perca Média:* ${data.media} kg/ha\n*Nº de Amostras:* ${data.amostras}\n*Área da Amostra:* ${data.largura}m x ${data.comprimento}m\n\n*Descrição:*\n${data.description}`;
            if (navigator.share) { navigator.share({ text: message }); } 
            else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank'); }
        } catch (error) {
            console.error("Erro ao compartilhar dados de perca na colheita:", error);
            alert("Não foi possível compartilhar os dados.");
        }
    },

    sharePlantingAssessmentData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const message = `*Aferição de Plantio*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n*CV:* ${data.cv}%\n*Duplas:* ${data.duplas}%\n*Arrastes:* ${data.arraste}%\n*Falhas:* ${data.falhas}%`;
            if (navigator.share) { navigator.share({ text: message }); } 
            else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank'); }
        } catch (error) {
            console.error("Erro ao compartilhar dados de aferição:", error);
            alert("Não foi possível compartilhar os dados.");
        }
    },

    sharePopulationData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const message = `*Aferição de População*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n*Média:* ${data.media} plantas/ha\n*Espaçamento:* ${data.espacamento} m\n*Nº de Amostras:* ${data.amostras}`;
            if (navigator.share) { navigator.share({ text: message }); } 
            else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank'); }
        } catch (error) {
            console.error("Erro ao compartilhar dados de população:", error);
            alert("Não foi possível compartilhar os dados.");
        }
    },

    shareMonitoringData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const message = `*Monitoramento Realizado*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n*Nº de Pontos:* ${data.points}\n\n*Médias de Incidência:*\n${data.averages}`;
            if (navigator.share) { navigator.share({ text: message }); } 
            else { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank'); }
        } catch (error) {
            console.error("Erro ao compartilhar dados:", error);
            alert("Não foi possível compartilhar os dados.");
        }
    },

    async shareAnnotationData(encodedPayload) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedPayload));
            const message = `*Anotação Realizada*\n\n*Fazenda:* ${data.fazenda}\n*Talhão:* ${data.talhao}\n\n-----------------------\n*Data:* ${data.date}\n\n*Anotação:*\n${data.text}`;
            if (navigator.share && data.imageUrl) {
                try {
                    const response = await fetch(data.imageUrl);
                    const blob = await response.blob();
                    const file = new File([blob], 'foto.jpg', { type: 'image/jpeg' });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ text: message, files: [file] });
                        return;
                    }
                } catch (shareError) { console.error("Erro no compartilhamento nativo com imagem:", shareError); }
            }
            const messageWithImageLink = data.imageUrl ? `${message}\n\n*Foto:* ${data.imageUrl}` : message;
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(messageWithImageLink)}`, '_blank');
        } catch (error) {
            console.error("Erro ao compartilhar dados de anotação:", error);
            alert("Não foi possível compartilhar os dados da anotação.");
        }
    }
};