// ===================================================================================
//  GERENCIADOR DO BANCO DE DADOS LOCAL (INDEXEDDB)
// ===================================================================================

const DB_NAME = 'KMLViewerDB';
const DB_VERSION = 4; // ATUALIZADO: Versão incrementada para nova tabela de exclusões
const STORE_TALHOES = 'talhoes';
const STORE_PENDING_CSVS = 'pending_csvs';
const STORE_HISTORY = 'monitoring_history';
const STORE_PENDING_DELETIONS = 'pending_deletions'; // NOVO: Tabela para IDs de exclusão pendentes

/**
 * Abre e prepara o banco de dados IndexedDB.
 * @returns {Promise<IDBDatabase>} Uma promessa que resolve com a instância do banco de dados.
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

        // Este evento só é disparado quando a versão do DB muda ou na primeira criação.
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_TALHOES)) {
                db.createObjectStore(STORE_TALHOES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_PENDING_CSVS)) {
                db.createObjectStore(STORE_PENDING_CSVS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORE_HISTORY)) {
                db.createObjectStore(STORE_HISTORY, { keyPath: 'id' });
            }
            // NOVO: Cria o object store para as exclusões pendentes.
            if (!db.objectStoreNames.contains(STORE_PENDING_DELETIONS)) {
                db.createObjectStore(STORE_PENDING_DELETIONS, { keyPath: 'id' });
            }
        };
    });
}

/**
 * Salva uma lista de talhões no banco de dados local.
 * @param {Array<Object>} talhoes - A lista de objetos de talhão para salvar.
 * @returns {Promise<void>}
 */
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

/**
 * Pega todos os talhões salvos no banco de dados local.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve com a lista de talhões.
 */
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

// ... (funções savePendingCsv, getPendingCsvs, deletePendingCsv permanecem iguais) ...

/**
 * Salva um registro de CSV na fila de pendentes.
 * @param {Object} csvData - O objeto com os dados do CSV a serem enviados.
 * @returns {Promise<void>}
 */
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

/**
 * Pega todos os CSVs da fila de pendentes.
 * @returns {Promise<Array<Object>>}
 */
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

/**
 * Deleta um CSV da fila de pendentes após o upload bem-sucedido.
 * @param {number} id - O ID do registro a ser deletado.
 * @returns {Promise<void>}
 */
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

// ===================================================================================
//  FUNÇÕES PARA HISTÓRICO E EXCLUSÕES OFFLINE
// ===================================================================================

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
 * Deleta um item específico do histórico local.
 * @param {number} id - O ID do registro de histórico a ser deletado.
 * @returns {Promise<void>}
 */
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

/**
 * Salva o ID de um registro na fila de exclusão pendente.
 * @param {number} id - O ID do registro a ser deletado.
 * @returns {Promise<void>}
 */
async function savePendingDeletion(id) {
    const db = await openDB();
    const transaction = db.transaction(STORE_PENDING_DELETIONS, 'readwrite');
    const store = transaction.objectStore(STORE_PENDING_DELETIONS);
    store.put({ id }); // Salva como um objeto {id: valor}
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject("Erro ao salvar exclusão pendente: " + event.target.error);
    });
}

/**
 * Pega todos os IDs da fila de exclusão pendente.
 * @returns {Promise<Array<Object>>}
 */
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

/**
 * Deleta um ID da fila de exclusão pendente.
 * @param {number} id - O ID a ser removido da fila.
 * @returns {Promise<void>}
 */
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