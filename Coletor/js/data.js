// ===================================================================================
//  MÓDULO DE GERENCIAMENTO DE DADOS (LOCAL E REMOTO)
// ===================================================================================

const DataManager = {
    isSyncingCsv: false,
    isSyncingAnotacoes: false,
    isDeleting: false,

    async loadData() {
        UI.setStatus(true, 'Carregando dados...');
        let hasLocalData = false;
    
        // 1. Tenta carregar os dados locais (talhões E histórico) primeiro.
        try {
            const [localTalhoes, localHistory] = await Promise.all([getTalhoes(), getHistory()]);
            
            if (localTalhoes && localTalhoes.length > 0) {
                MapManager.kmlDatabase = localTalhoes;
                const fazendas = [...new Set(localTalhoes.map(item => item.Fazenda || 'Sem Fazenda'))];
                UI.populateFazendaSelect(fazendas);
                hasLocalData = true;
                UI.setSyncStatus('Dados locais carregados.', 'success', true);
            }
        } catch (error) {
            console.error("Não foi possível carregar dados locais:", error);
        }
    
        // 2. Se estiver online, tenta buscar no servidor para obter os dados mais recentes.
        if (navigator.onLine) {
            try {
                UI.setSyncStatus('Sincronizando com o servidor...', 'syncing', false);
                const { data: remoteData, error } = await supabaseClient
                    .from('talhoes')
                    .select('id, nome_talhao, conteudo_kml, Fazenda');
        
                if (error) throw new Error(error.message);
        
                await saveTalhoes(remoteData);
                MapManager.kmlDatabase = remoteData;
                const fazendas = [...new Set(remoteData.map(item => item.Fazenda || 'Sem Fazenda'))];
                UI.populateFazendaSelect(fazendas);
                hasLocalData = true; 
                UI.setSyncStatus('Dados sincronizados! Pronto para uso offline.', 'success', true);
                
                // Após sincronizar os talhões, busca o histórico mais recente também.
                await this.fetchAndCacheAllHistory();
        
            } catch (error) {
                console.error("Falha na sincronização com o servidor:", error);
                if (hasLocalData) {
                    UI.setSyncStatus('Falha na sincronização. Usando dados offline.', 'warning', true);
                }
            }
        } else {
            if (hasLocalData) {
                UI.setSyncStatus('Você está offline. Usando dados salvos.', 'warning', false);
            }
        }
    
        if (hasLocalData) {
            UI.setStatus(false);
        } else {
            UI.setStatus(true, 'Nenhum dado encontrado. Conecte-se à internet para carregar.', false);
        }
        
        this.syncAll();
    },

    syncAll() {
        if (!navigator.onLine) return;
        this.syncPendingCsvs();
        this.syncPendingAnotacoes();
        this.syncPendingDeletions();
    },

    pointsToKML(points, name) {
        const coordinates = points.map(p => `${p[1]},${p[0]},0`).join(' ');
        return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<name>${name}</name>
<Placemark>
<name>${name}</name>
<Polygon>
<outerBoundaryIs>
<LinearRing>
<coordinates>${coordinates}</coordinates>
</LinearRing>
</outerBoundaryIs>
</Polygon>
</Placemark>
</Document>
</kml>`;
    },

    async saveDemarcation(talhao, points, description, area) {
        const closedPoints = [...points, points[0]];
        const kmlContent = this.pointsToKML(closedPoints, description);
        const singleLineKml = kmlContent.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""');

        const csvData = `description,kml_content,area_ha\n"${description.replace(/"/g, '""')}","${singleLineKml}","${area}"`;

        const demarcationToSync = {
            fazenda: talhao.Fazenda || 'Sem Fazenda',
            talhao: talhao.nome_talhao,
            data: new Date().toISOString(),
            tag: 'Demarcação',
            csv: csvData
        };
        
        await savePendingCsv(demarcationToSync);
        this.syncAll();
    },

    async finalizeAllMonitoring() {
        const monitoringKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i).startsWith('registros_')) {
                monitoringKeys.push(localStorage.key(i));
            }
        }

        if (monitoringKeys.length === 0) {
            alert('Não há nenhuma monitoria pendente para finalizar.');
            return;
        }

        UI.setStatus(true, `Finalizando ${monitoringKeys.length} talhão(ões)...`);
        let processedCount = 0;
        for (const key of monitoringKeys) {
            try {
                const talhaoId = key.replace('registros_', '');
                const talhaoData = MapManager.kmlDatabase.find(t => t.id.toString() === talhaoId);
                if (!talhaoData) continue;
                
                const dataJSON = localStorage.getItem(key);
                const records = JSON.parse(dataJSON);
                if (!records || records.length === 0) continue;

                const allAlvos = new Set(records.flatMap(r => r.alvos.map(a => a.name)));
                const sortedAlvosHeader = Array.from(allAlvos).sort();
                const header = ['latitude', 'longitude', ...sortedAlvosHeader];
                let csvContent = header.join(',') + '\n';

                records.forEach(record => {
                    const row = [record.lat, record.lng];
                    sortedAlvosHeader.forEach(alvoName => {
                        const target = record.alvos.find(alvo => alvo.name === alvoName);
                        row.push(target ? target.incidence : 0);
                    });
                    csvContent += row.join(',') + '\n';
                });

                await savePendingCsv({
                    fazenda: talhaoData.Fazenda || 'Sem Fazenda',
                    talhao: talhaoData.nome_talhao,
                    data: new Date().toISOString(),
                    tag: 'Monitoramento',
                    csv: csvContent
                });
                localStorage.removeItem(key);
                processedCount++;
            } catch(error) {
                console.error(`Erro ao processar a monitoria para a chave ${key}:`, error);
                UI.setSyncStatus(`Erro ao processar ${key}.`, 'warning');
            }
        }

        UI.setStatus(false);
        UI.setSyncStatus(`${processedCount} monitoria(s) finalizada(s) e na fila para sincronização.`, 'success');
        UI.updateFinalizeButtonVisibility();
        this.syncPendingCsvs();
        MapManager.monitoringPinsGroup.clearLayers();
        
        window.dispatchEvent(new Event('monitoringUpdated'));
    },
    
    async syncPendingCsvs() {
        if (this.isSyncingCsv || !navigator.onLine) return;
        const pendingCsvs = await getPendingCsvs();
        if (pendingCsvs.length === 0) return;
    
        this.isSyncingCsv = true;
        let successCount = 0;
        const totalCount = pendingCsvs.length;
        UI.setSyncStatus(`Sincronizando ${totalCount} registro(s)...`, 'syncing', false, true);
        UI.updateSyncProgress(0);
    
        for (const record of pendingCsvs) {
            try {
                const { data: newRecord, error } = await supabaseClient.from('registros_csv').insert({
                    fazenda: record.fazenda,
                    talhao: record.talhao,
                    data: record.data,
                    tag: record.tag,
                    csv: record.csv
                }).select().single();
    
                if (error) throw new Error(`Supabase error: ${error.message}`);
    
                await addHistoryItem(newRecord);
                await deletePendingCsv(record.id);
                successCount++;
            } catch (error) {
                console.error(`Falha ao sincronizar CSV ID ${record.id}:`, error);
            }
            const progress = ((pendingCsvs.indexOf(record) + 1) / totalCount) * 100;
            UI.updateSyncProgress(progress);
        }
    
        if (successCount > 0) {
            window.dispatchEvent(new Event('monitoringUpdated'));
        }
    
        if (successCount === totalCount) {
            UI.setSyncStatus('Sincronização concluída!', 'success', true);
        } else {
            UI.setSyncStatus(`Falha ao enviar ${totalCount - successCount} registro(s).`, 'warning', false);
        }
        this.isSyncingCsv = false;
    },

    async syncPendingAnotacoes() {
        if (this.isSyncingAnotacoes || !navigator.onLine) return;
        const pendingAnotacoes = await getPendingAnotacoes();
        if (pendingAnotacoes.length === 0) return;
        
        this.isSyncingAnotacoes = true;
        let successCount = 0;
        UI.setSyncStatus(`Sincronizando ${pendingAnotacoes.length} anotação(ões)...`, 'syncing', false);

        for (const anotacao of pendingAnotacoes) {
            try {
                let imageUrl = '';
                if (anotacao.foto) {
                    const response = await fetch(anotacao.foto);
                    const blob = await response.blob();
                    const fileName = `anotacao_foto_${anotacao.localId}.jpg`;
                    
                    const { data: uploadData, error: uploadError } = await supabaseClient
                        .storage
                        .from('fotos_anotacoes')
                        .upload(fileName, blob, { upsert: true });

                    if (uploadError) throw uploadError;

                    const { data: urlData } = supabaseClient.storage.from('fotos_anotacoes').getPublicUrl(uploadData.path);
                    imageUrl = urlData.publicUrl;
                }

                const header = 'latitude,longitude,anotacao,foto_url';
                const row = [
                    anotacao.lat,
                    anotacao.lng,
                    `"${(anotacao.texto || '').replace(/"/g, '""')}"`,
                    `"${imageUrl}"`
                ].join(',');
                const finalCsv = `${header}\n${row}`;

                const { data: newRecord, error } = await supabaseClient.from('registros_csv').insert({
                    fazenda: anotacao.fazenda,
                    talhao: anotacao.talhao,
                    data: anotacao.data,
                    tag: anotacao.tag,
                    csv: finalCsv
                }).select().single();

                if (error) throw error;
                
                await addHistoryItem(newRecord);
                await deletePendingAnotacao(anotacao.id);
                if (anotacao.localId && anotacao.talhaoId) {
                    await deleteAnotacao(anotacao.talhaoId, anotacao.localId);
                }
                successCount++;
            } catch (error) {
                console.error(`Falha ao sincronizar anotação ID ${anotacao.id}:`, error);
            }
        }
        
        if (successCount > 0) {
            UI.setSyncStatus(`${successCount} anotação(ões) sincronizada(s)!`, 'success', true);
            window.dispatchEvent(new Event('monitoringUpdated'));
        }
        this.isSyncingAnotacoes = false;
    },

    async deleteMonitoringRecord(recordId) {
        if (!recordId) return;
    
        if (navigator.onLine) {
            try {
                const { data: record, error: fetchError } = await supabaseClient.from('registros_csv').select('csv').eq('id', recordId).single();
                if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    
                const { error: deleteDbError } = await supabaseClient.from('registros_csv').delete().eq('id', recordId);
                if (deleteDbError) throw deleteDbError;
    
                if (record && record.csv) {
                    const lines = record.csv.split('\n');
                    if (lines.length > 1 && lines[0].includes('foto_url')) {
                        const imageUrl = lines[1].split(',').pop().replace(/"/g, '');
                        if (imageUrl && imageUrl.includes('supabase')) {
                            const fileName = imageUrl.split('/').pop();
                            await supabaseClient.storage.from('fotos_anotacoes').remove([fileName]);
                        }
                    }
                }
    
                await deleteHistoryItem(recordId);
                UI.setSyncStatus('Registro excluído com sucesso.', 'success');
    
            } catch (error) {
                console.error("Falha ao excluir no Supabase, agendando exclusão:", error);
                await savePendingDeletion({ id: recordId });
                UI.setSyncStatus('Exclusão agendada.', 'warning', false);
            }
        } else {
            await savePendingDeletion({ id: recordId });
            await deleteHistoryItem(recordId);
            UI.setSyncStatus('Exclusão agendada para quando houver conexão.', 'warning', false);
        }
    },

    async syncPendingDeletions() {
        if (this.isDeleting || !navigator.onLine) return;
        const pendingDeletions = await getPendingDeletions();
        if (pendingDeletions.length === 0) return;

        this.isDeleting = true;
        UI.setSyncStatus(`Sincronizando ${pendingDeletions.length} exclusão(ões)...`, 'syncing', false);

        for (const item of pendingDeletions) {
            try {
                const { data: record } = await supabaseClient.from('registros_csv').select('csv').eq('id', item.id).single();
                const { error: deleteError } = await supabaseClient.from('registros_csv').delete().eq('id', item.id);
                if (deleteError && deleteError.code !== 'PGRST204') throw deleteError;

                if (record && record.csv) {
                    const lines = record.csv.split('\n');
                    if (lines.length > 1 && lines[0].includes('foto_url')) {
                        const imageUrl = lines[1].split(',').pop().replace(/"/g, '');
                        if (imageUrl && imageUrl.includes('supabase')) {
                            const fileName = imageUrl.split('/').pop();
                            await supabaseClient.storage.from('fotos_anotacoes').remove([fileName]);
                        }
                    }
                }
                
                await deletePendingDeletion(item.id);
            } catch (error) {
                console.error(`Falha ao sincronizar exclusão do ID ${item.id}:`, error);
            }
        }

        UI.setSyncStatus(`${pendingDeletions.length} exclusão(ões) sincronizada(s)!`, 'success');
        this.isDeleting = false;
    },

    async fetchAndCacheAllHistory() {
        if (!navigator.onLine) {
            // Se estiver offline, apenas retorna o que já está no cache
            return await getHistory();
        }
        try {
            const { data, error } = await supabaseClient.from('registros_csv').select('*');
            if (error) throw error;
            if (data) await saveHistory(data);
            return data || [];
        } catch (error) {
            console.error("Erro ao buscar e salvar histórico:", error);
            // Em caso de erro de rede, retorna o cache local
            return await getHistory();
        }
    }
};