// ===================================================================================
//  MÓDULO DE GERENCIAMENTO DE DADOS (LOCAL E REMOTO)
// ===================================================================================

const DataManager = {
    isSyncingCsv: false,
    isSyncingAnotacoes: false, // Novo estado para anotações
    isDeleting: false,

    async loadData() {
        UI.setStatus(true, 'Carregando dados...');
        UI.setSyncStatus('Carregando dados locais...', 'syncing', false);
        let hasLocalData = false;

        try {
            const localData = await getTalhoes();
            if (localData && localData.length > 0) {
                MapManager.kmlDatabase = localData;
                const fazendas = [...new Set(localData.map(item => item.Fazenda || 'Sem Fazenda'))];
                UI.populateFazendaSelect(fazendas);
                hasLocalData = true;
                UI.setSyncStatus('Dados locais carregados.', 'success');
            }
        } catch (error) {
            console.error("Não foi possível carregar dados locais:", error);
        }

        if (navigator.onLine) {
            try {
                UI.setSyncStatus('Sincronizando com o servidor...', 'syncing', false);
                const { data: remoteData, error } = await supabaseClient
                    .from('talhoes')
                    .select('id, nome_talhao, conteudo_kml, Fazenda');
                if (error) throw error;
                
                await saveTalhoes(remoteData);
                MapManager.kmlDatabase = remoteData;
                const fazendas = [...new Set(remoteData.map(item => item.Fazenda || 'Sem Fazenda'))];
                UI.populateFazendaSelect(fazendas);
                UI.setSyncStatus('Dados sincronizados! Pronto para uso offline.', 'success');
            } catch (error) {
                console.error("Erro ao buscar dados do Supabase:", error);
                if (hasLocalData) {
                    UI.setSyncStatus('Falha na sincronização. Usando dados offline.', 'warning');
                } else {
                    UI.setStatus(true, 'Falha ao buscar dados. Verifique a conexão.', false);
                    return;
                }
            }
        }

        if (MapManager.kmlDatabase.length === 0) {
            UI.setStatus(true, 'Nenhum dado encontrado. Conecte-se à internet para carregar.', false);
        } else {
            UI.setStatus(false);
        }
        
        this.syncAll(); // Chama a função de sincronização geral
    },

    // Função de sincronização geral
    syncAll() {
        this.syncPendingCsvs();
        this.syncPendingAnotacoes(); // Adiciona anotações ao sync
        this.syncPendingDeletions();
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

                const allAlvos = new Set();
                records.forEach(record => { record.alvos.forEach(alvo => allAlvos.add(alvo.name)); });
                
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

                const csvDataToSync = {
                    fazenda: talhaoData.Fazenda || 'Sem Fazenda',
                    talhao: talhaoData.nome_talhao,
                    data: new Date().toISOString(),
                    tag: 'Monitoramento',
                    csv: csvContent
                };

                await savePendingCsv(csvDataToSync);
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
    },
    
    async syncPendingCsvs() {
        if (this.isSyncingCsv) return;
        const pendingCsvs = await getPendingCsvs();
        if (!navigator.onLine) {
            if (pendingCsvs.length > 0) UI.setSyncStatus(`${pendingCsvs.length} CSV(s) aguardando para sincronizar.`, 'warning', false);
            return;
        }
        if (pendingCsvs.length === 0) return;
        
        this.isSyncingCsv = true;
        let successCount = 0;
        const totalCount = pendingCsvs.length;
        UI.setSyncStatus(`Sincronizando ${totalCount} CSV(s)...`, 'syncing', false, true);
        UI.updateSyncProgress(0);

        for (const record of pendingCsvs) {
            try {
                const { error } = await supabaseClient.from('registros_csv').insert({
                    fazenda: record.fazenda,
                    talhao: record.talhao,
                    data: record.data,
                    tag: record.tag,
                    csv: record.csv
                });
                if (error) throw new Error(`Supabase error: ${error.message}`);
                await deletePendingCsv(record.id);
                successCount++;
            } catch (error) {
                console.error(`Falha ao sincronizar CSV ID ${record.id}:`, error);
            }
            const progress = ((pendingCsvs.indexOf(record) + 1) / totalCount) * 100;
            UI.updateSyncProgress(progress);
        }

        if (successCount === totalCount) {
            UI.setSyncStatus('Sincronização de CSVs concluída!', 'success', true);
        } else {
            UI.setSyncStatus(`Falha ao enviar ${totalCount - successCount} CSV(s). Nova tentativa será feita.`, 'warning', false);
        }
        this.isSyncingCsv = false;
    },
    
    // FUNÇÃO DE SINCRONIZAÇÃO DE ANOTAÇÕES CORRIGIDA
    async syncPendingAnotacoes() {
        if (this.isSyncingAnotacoes) return;
        const pendingAnotacoes = await getPendingAnotacoes();
        
        if (!navigator.onLine) {
            if (pendingAnotacoes.length > 0) UI.setSyncStatus(`${pendingAnotacoes.length} anotação(ões) aguardando para sincronizar.`, 'warning', false);
            return;
        }
        if (pendingAnotacoes.length === 0) return;
        
        this.isSyncingAnotacoes = true;
        let successCount = 0;
        const totalCount = pendingAnotacoes.length;
        UI.setSyncStatus(`Sincronizando ${totalCount} anotação(ões)...`, 'syncing', false);

        for (const record of pendingAnotacoes) {
            try {
                const { error } = await supabaseClient.from('registros_csv').insert({
                    fazenda: record.fazenda,
                    talhao: record.talhao,
                    data: record.data,
                    tag: record.tag,
                    csv: record.csv
                });
                if (error) throw new Error(`Supabase error: ${error.message}`);
                
                // Após o sucesso do envio, remove o registro da fila de pendentes
                await deletePendingAnotacao(record.id);

                // E remove a anotação original do armazenamento local para evitar duplicatas
                if (record.localId && record.talhaoId) {
                    await deleteAnotacao(record.talhaoId, record.localId);
                }

                successCount++;
            } catch (error) {
                console.error(`Falha ao sincronizar anotação ID ${record.id}:`, error);
            }
        }

        if (successCount > 0) {
            UI.setSyncStatus(`${successCount} anotação(ões) sincronizada(s)!`, 'success', true);
            // Dispara um evento para a UI atualizar o histórico, removendo o item que agora foi sincronizado
            window.dispatchEvent(new Event('monitoringUpdated'));
        }
        this.isSyncingAnotacoes = false;
    },


    async deleteMonitoringRecord(recordId) {
        if (!recordId) return;
        await deleteHistoryItem(recordId);

        if (navigator.onLine) {
            try {
                const { error } = await supabaseClient
                    .from('registros_csv')
                    .delete()
                    .eq('id', recordId);
                if (error) throw error;
                UI.setSyncStatus('Registro excluído com sucesso.', 'success');
                return;
            } catch (error) {
                console.error("Falha ao excluir no Supabase, adicionando à fila:", error);
            }
        }
        
        await savePendingDeletion(recordId);
        UI.setSyncStatus('Exclusão salva. Será sincronizada quando houver conexão.', 'warning', false);
    },

    async syncPendingDeletions() {
        if (this.isDeleting || !navigator.onLine) return;

        const pendingDeletions = await getPendingDeletions();
        if (pendingDeletions.length === 0) return;

        this.isDeleting = true;
        UI.setSyncStatus(`Sincronizando ${pendingDeletions.length} exclusão(ões)...`, 'syncing', false);

        let successCount = 0;
        for (const item of pendingDeletions) {
            try {
                const { error } = await supabaseClient
                    .from('registros_csv')
                    .delete()
                    .eq('id', item.id);
                
                if (error && !error.message.includes('security policy')) throw error;
                
                await deletePendingDeletion(item.id);
                successCount++;
            } catch (error) {
                console.error(`Falha ao sincronizar exclusão do ID ${item.id}:`, error);
            }
        }

        if (successCount > 0) {
            UI.setSyncStatus(`${successCount} exclusão(ões) sincronizada(s)!`, 'success');
        }
        this.isDeleting = false;
    },

    async fetchAndCacheAllHistory() {
        if (!navigator.onLine) return;
        try {
            const { data, error } = await supabaseClient.from('registros_csv').select('*');
            if (error) throw error;
            if (data) await saveHistory(data);
            return data || [];
        } catch (error) {
            console.error("Erro ao buscar e salvar histórico:", error);
            return [];
        }
    }
};