// js/db.js - IndexedDB Helper Module

const DB_NAME = 'SnugOSAudioDB';
// ADDED a new store name for assets and incremented DB version
const STORES = {
    AUDIO: 'audioFiles',
    ASSETS: 'userAssets'
};
const DB_VERSION = 2; // MUST be incremented if you change store structure (e.g., adding STORES.ASSETS)

let dbPromise = null;

/**
 * Gets the IndexedDB database instance.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
function getDB() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                return reject(new Error('IndexedDB not supported.'));
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => reject(new Error('Error opening database: ' + event.target.error?.message));

            request.onsuccess = (event) => resolve(event.target.result);

            request.onupgradeneeded = (event) => {
                console.log('[DB] Database upgrade needed.');
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORES.AUDIO)) {
                    db.createObjectStore(STORES.AUDIO);
                    console.log(`[DB] Object store "${STORES.AUDIO}" created.`);
                }
                // NEW: Create the userAssets store if it doesn't exist
                if (!db.objectStoreNames.contains(STORES.ASSETS)) {
                    db.createObjectStore(STORES.ASSETS);
                    console.log(`[DB] Object store "${STORES.ASSETS}" created.`);
                }
            };
        });
    }
    return dbPromise;
}

/**
 * Generic function to store a value in a specific store.
 * @param {string} storeName - The name of the object store.
 * @param {string} key - The key for the data.
 * @param {any} value - The data to store (e.g., a Blob).
 * @returns {Promise<void>}
 */
async function storeValue(storeName, key, value) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(new Error('Error storing value: ' + event.target.error?.message));
        } catch (e) {
            reject(new Error('Failed to initiate store transaction: ' + e.message));
        }
    });
}

/**
 * Generic function to retrieve a value from a specific store.
 * @param {string} storeName - The name of the object store.
 * @param {string} key - The key for the data.
 * @returns {Promise<any>} A promise that resolves with the data or undefined.
 */
async function getValue(storeName, key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(new Error('Error getting value: ' + event.target.error?.message));
        } catch (e) {
            reject(new Error('Failed to initiate get transaction: ' + e.message));
        }
    });
}

/**
 * Generic function to delete a value from a specific store.
 * @param {string} storeName - The name of the object store.
 * @param {string} key - The key for the data.
 * @returns {Promise<void>}
 */
async function deleteValue(storeName, key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(new Error('Error deleting value: ' + event.target.error?.message));
        } catch (e) {
            reject(new Error('Failed to initiate delete transaction: ' + e.message));
        }
    });
}


// --- Specific Implementations ---

export function storeAudio(key, audioBlob) {
    return storeValue(STORES.AUDIO, key, audioBlob);
}

export function getAudio(key) {
    return getValue(STORES.AUDIO, key);
}

export function deleteAudio(key) {
    return deleteValue(STORES.AUDIO, key);
}

// NEW: Functions for storing and retrieving user assets like backgrounds
export function storeAsset(key, assetBlob) {
    return storeValue(STORES.ASSETS, key, assetBlob);
}

export function getAsset(key) {
    return getValue(STORES.ASSETS, key);
}
