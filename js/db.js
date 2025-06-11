// js/db.js - IndexedDB Helper Module

const DB_NAME = 'SnugOSAudioDB';
const STORE_NAME = 'audioFiles';
const DB_VERSION = 1;

let dbPromise = null;

/**
 * Gets the IndexedDB database instance.
 * Initializes the database and object store if they don't exist.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
function getDB() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.error('[DB] IndexedDB not supported by this browser.');
                return reject(new Error('IndexedDB not supported. Audio samples cannot be saved locally.'));
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('[DB] Database open error:', event.target.error);
                reject(new Error('Error opening database: ' + (event.target.error?.message || 'Unknown DB open error')));
            };

            request.onsuccess = (event) => {
                // console.log('[DB] Database opened successfully.');
                resolve(event.target.result);
            };

            request.onupgradeneeded = (event) => {
                console.log('[DB] Database upgrade needed.');
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                    console.log(`[DB] Object store "${STORE_NAME}" created.`);
                }
            };
        });
    }
    return dbPromise;
}

/**
 * Stores a key-value pair in the database.
 * @param {string} key - The key for the data.
 * @param {Blob} audioBlob - The audio data to store.
 * @returns {Promise<void>}
 */
export async function storeAudio(key, audioBlob) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(audioBlob, key);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(new Error('Error storing audio: ' + event.target.error?.message));
        } catch (e) {
            reject(new Error('Failed to initiate store transaction: ' + e.message));
        }
    });
}

/**
 * Retrieves audio data from the database by key.
 * @param {string} key - The key of the data to retrieve.
 * @returns {Promise<Blob|undefined>} A promise that resolves with the audio blob or undefined.
 */
export async function getAudio(key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(new Error('Error getting audio: ' + event.target.error?.message));
        } catch (e) {
            reject(new Error('Failed to initiate get transaction: ' + e.message));
        }
    });
}

/**
 * NEW: Deletes audio data from the database by key.
 * @param {string} key - The key of the data to delete.
 * @returns {Promise<void>}
 */
export async function deleteAudio(key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(new Error('Error deleting audio: ' + event.target.error?.message));
        } catch (e) {
            reject(new Error('Failed to initiate delete transaction: ' + e.message));
        }
    });
}

/**
 * Clears all entries from the audio store.
 * @returns {Promise<void>}
 */
export async function clearAllAudio() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('[DB] All audio cleared from database.');
                resolve();
            };
            request.onerror = (event) => {
                console.error('[DB clearAllAudio] Error clearing audio database:', event.target.error);
                reject(new Error('Error clearing audio database: ' + (event.target.error?.message || 'Unknown DB clear error')));
            };
        } catch (e) {
            console.error('[DB clearAllAudio] Synchronous error during transaction creation:', e);
            reject(new Error('Failed to initiate clear audio store transaction: ' + e.message));
        }
    });
}
