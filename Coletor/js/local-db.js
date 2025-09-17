// ===================================================================================
//  GERENCIADOR DO BANCO DE DADOS LOCAL (INDEXEDDB)
// ===================================================================================

const DB_NAME = 'KMLViewerDB';
const DB_VERSION = 8; // VERSÃO ATUALIZADA para incluir a nova store de imagens
const STORE_TALHOES = 'talhoes';
const STORE_PENDING_CSVS = 'pending_csvs';
const STORE_HISTORY = 'monitoring_history';
const STORE_PENDING_DELETIONS = 'pending_deletions';
const STORE_ANOTACOES = 'anotacoes';
const STORE_PENDING_ANOTACOES = 'pending_anotacoes';
const STORE_PENDING_IMAGES = 'pending_images'; // NOVO: Tabela para imagens aguardando sync

/**
 * Abre e prepara o banco de dados IndexedDB.
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("Erro ao abrir o IndexedDB:", event.target.error);
            reject("Erro ao abrir o banco de dados local.");
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log(`Atualizando o banco de dados para a versão ${DB_VERSION}...`);

            if (!db.objectStoreNames.contains(STORE_TALHOES)) db.createObjectStore(STORE_TALHOES, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORE_PENDING_CSVS)) db.createObjectStore(STORE_PENDING_CSVS, { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains(STORE_HISTORY)) db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORE_PENDING_DELETIONS)) db.createObjectStore(STORE_PENDING_DELETIONS, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(STORE_ANOTACOES)) db.createObjectStore(STORE_ANOTACOES, { keyPath: 'talhaoId' });
            if (!db.objectStoreNames.contains(STORE_PENDING_ANOTACOES)) {
                const store = db.createObjectStore(STORE_PENDING_ANOTACOES, { keyPath: 'id', autoIncrement: true });
                // Adiciona um índice para o localId para permitir buscas eficientes
                store.createIndex('localId', 'localId', { unique: false });
            }
            
            // NOVO: Cria a store para imagens pendentes
            if (!db.objectStoreNames.contains(STORE_PENDING_IMAGES)) {
                db.createObjectStore(STORE_PENDING_IMAGES, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// ... (as funções get/save de talhoes, pending_csvs, history, deletions, anotacoes e pending_anotacoes permanecem as mesmas) ...
async function saveTalhoes(talhoes) {
    const db = await openDB();
    const transaction = db.transaction(STORE_TALHOES, 'readwrite');
    const store = transaction.objectStore(STORE_TALHOES);
    store.clear(); 
    talhoes.forEach(talhao => store.put(talhao));
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro na transação de salvamento: " + event.target.error);
    });
}
async function getTalhoes() {
    const db = await openDB();
    const transaction = db.transaction(STORE_TALHOES, 'readonly');
    const store = transaction.objectStore(STORE_TALHOES);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject("Erro ao buscar talhões: " + event.target.error);
    });
}
async function savePendingCsv(csvData) {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_CSVS, 'readwrite');
    const store = transaction.objectStore(STORE_PENDING_CSVS);
    store.add(csvData);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro ao salvar CSV pendente: " + event.target.error);
    });
}
async function getPendingCsvs() {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_CSVS, 'readonly');
    const store = transaction.objectStore(STORE_PENDING_CSVS);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject("Erro ao buscar CSVs pendentes: " + event.target.error);
    });
}
async function deletePendingCsv(id) {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_CSVS, 'readwrite');
    const store = transaction.objectStore(STORE_PENDING_CSVS);
    store.delete(id);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro ao deletar CSV pendente: " + event.target.error);
    });
}
async function saveHistory(historyItems) {
    const db = await openDB();
    const transaction = db.transaction(STORE_HISTORY, 'readwrite');
    const store = transaction.objectStore(STORE_HISTORY);
    store.clear(); 
    historyItems.forEach(item => store.put(item));
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro ao salvar histórico: " + event.target.error);
    });
}
async function getHistory() {
    const db = await openDB();
    const transaction = db.transaction(STORE_HISTORY, 'readonly');
    const store = transaction.objectStore(STORE_HISTORY);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject("Erro ao buscar histórico: " + event.target.error);
    });
}

/**
 * Adiciona ou atualiza um único item no cache de histórico.
 * @param {object} item - O item de histórico a ser salvo.
 */
async function addHistoryItem(item) {
    const db = await openDB();
    const transaction = db.transaction(STORE_HISTORY, 'readwrite');
    const store = transaction.objectStore(STORE_HISTORY);
    store.put(item);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro ao adicionar item ao histórico: " + event.target.error);
    });
}

async function deleteHistoryItem(id) {
    const db = await openDB();
    const transaction = db.transaction(STORE_HISTORY, 'readwrite');
    const store = transaction.objectStore(STORE_HISTORY);
    store.delete(id);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro ao deletar item do histórico: " + event.target.error);
    });
}
async function savePendingDeletion(id) {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_DELETIONS, 'readwrite');
    const store = transaction.objectStore(STORE_PENDING_DELETIONS);
    store.put({ id });
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro ao salvar exclusão pendente: " + event.target.error);
    });
}
async function getPendingDeletions() {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_DELETIONS, 'readonly');
    const store = transaction.objectStore(STORE_PENDING_DELETIONS);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject("Erro ao buscar exclusões pendentes: " + event.target.error);
    });
}
async function deletePendingDeletion(id) {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_DELETIONS, 'readwrite');
    const store = transaction.objectStore(STORE_PENDING_DELETIONS);
    store.delete(id);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro ao deletar exclusão pendente: " + event.target.error);
    });
}
async function saveAnotacao(talhaoId, anotacaoRecord) {
    const db = await openDB();
    const transaction = db.transaction(STORE_ANOTACOES, 'readwrite');
    const store = transaction.objectStore(STORE_ANOTACOES);
    
    return new Promise((resolve, reject) => {
        const getRequest = store.get(talhaoId);
        getRequest.onerror = (event) => reject("Erro ao buscar anotações existentes: " + event.target.error);
        getRequest.onsuccess = (event) => {
            const data = event.target.result || { talhaoId: talhaoId, records: [] };
            data.records.push(anotacaoRecord);
            const putRequest = store.put(data);
            putRequest.onerror = (event) => reject("Erro ao salvar nova anotação: " + event.target.error);
            putRequest.onsuccess = () => resolve();
        };
    });
}
async function getAnotacoes(talhaoId) {
    const db = await openDB();
    const transaction = db.transaction(STORE_ANOTACOES, 'readonly');
    const store = transaction.objectStore(STORE_ANOTACOES);
    const request = store.get(talhaoId);
    return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
            if (event.target.result) {
                const recordsWithTalhaoId = event.target.result.records.map(r => ({ ...r, talhaoId }));
                resolve(recordsWithTalhaoId);
            } else {
                resolve([]);
            }
        };
        request.onerror = (event) => reject("Erro ao buscar anotações: " + event.target.error);
    });
}
async function deleteAnotacao(talhaoId, anotacaoId) {
    const db = await openDB();
    const transaction = db.transaction(STORE_ANOTACOES, 'readwrite');
    const store = transaction.objectStore(STORE_ANOTACOES);
    return new Promise((resolve, reject) => {
        const getRequest = store.get(talhaoId);
        getRequest.onerror = (event) => reject("Erro ao buscar anotações para deletar: " + event.target.error);
        getRequest.onsuccess = (event) => {
            const data = event.target.result;
            if (data && data.records) {
                data.records = data.records.filter(record => record.id !== anotacaoId);
                const putRequest = store.put(data);
                putRequest.onerror = (event) => reject("Erro ao salvar após deletar anotação: " + event.target.error);
                putRequest.onsuccess = () => resolve();
            } else {
                resolve();
            }
        };
    });
}

async function savePendingAnotacao(anotacaoData) {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_ANOTACOES, 'readwrite');
    const store = transaction.objectStore(STORE_PENDING_ANOTACOES);
    store.add(anotacaoData);
    
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro ao salvar anotação pendente: " + event.target.error);
    });
}

async function getPendingAnotacoes() {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_ANOTACOES, 'readonly');
    const store = transaction.objectStore(STORE_PENDING_ANOTACOES);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject("Erro ao buscar anotações pendentes: " + event.target.error);
    });
}

async function deletePendingAnotacao(id) {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_ANOTACOES, 'readwrite');
    const store = transaction.objectStore(STORE_PENDING_ANOTACOES);
    store.delete(id);
    
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro ao deletar anotação pendente: " + event.target.error);
    });
}

// NOVA FUNÇÃO: Deleta uma anotação pendente usando o ID local (o que vem do card)
async function deletePendingAnotacaoByLocalId(localId) {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_ANOTACOES, 'readwrite');
    const store = transaction.objectStore(STORE_PENDING_ANOTACOES);
    const index = store.index('localId'); // Usa o índice
    const request = index.getKey(localId); // Pega a chave primária (id auto-incrementado)

    return new Promise((resolve, reject) => {
        request.onerror = (event) => reject("Erro ao buscar anotação pendente por localId: " + event.target.error);
        request.onsuccess = () => {
            const primaryKey = request.result;
            if (primaryKey) {
                const deleteRequest = store.delete(primaryKey);
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = (event) => reject("Erro ao deletar anotação pendente por chave: " + event.target.error);
            } else {
                resolve(); // Não encontrou, resolve sem erro
            }
        };
    });
}


// ===================================================================================
//  NOVAS FUNÇÕES PARA SINCRONIZAÇÃO DE IMAGENS
// ===================================================================================

/**
 * Salva uma imagem na fila de pendentes para upload.
 */
async function savePendingImage(imageData) {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_IMAGES, 'readwrite');
    const store = transaction.objectStore(STORE_PENDING_IMAGES);
    store.add(imageData);
    
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro ao salvar imagem pendente: " + event.target.error);
    });
}

/**
 * Pega todas as imagens da fila de pendentes.
 */
async function getPendingImages() {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_IMAGES, 'readonly');
    const store = transaction.objectStore(STORE_PENDING_IMAGES);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject("Erro ao buscar imagens pendentes: " + event.target.error);
    });
}

/**
 * Deleta uma imagem da fila de pendentes após o upload.
 */
async function deletePendingImage(id) {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_IMAGES, 'readwrite');
    const store = transaction.objectStore(STORE_PENDING_IMAGES);
    store.delete(id);
    
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro ao deletar imagem pendente: " + event.target.error);
    });
}