// ===================================================================================
//  GERENCIADOR DO BANCO DE DADOS LOCAL (INDEXEDDB)
// ===================================================================================

const DB_NAME = 'KMLViewerDB';
const DB_VERSION = 1;
const STORE_NAME = 'talhoes';

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
            // Cria o "object store" (semelhante a uma tabela) para os talhões.
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

/**
 * Salva uma lista de talhões no banco de dados local.
 * Limpa os dados antigos antes de salvar os novos para garantir consistência.
 * @param {Array<Object>} talhoes - A lista de objetos de talhão para salvar.
 * @returns {Promise<void>}
 */
async function saveTalhoes(talhoes) {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Limpa a tabela antes de adicionar os novos dados
    store.clear(); 
    
    // Adiciona cada talhão ao store
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
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject("Erro ao buscar talhões: " + event.target.error);
    });
}
