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
            // Request to open the database
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('[DB] Database error:', event.target.error);
                reject('Error opening database');
            };

            request.onsuccess = (event) => {
                console.log('[DB] Database opened successfully.');
                resolve(event.target.result);
            };

            // This event is only triggered if the version number changes
            // or if the database is created for the first time.
            request.onupgradeneeded = (event) => {
                console.log('[DB] Database upgrade needed.');
                const db = event.target.result;
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    // We can use a key path if our objects have a unique property,
                    // or allow keys to be passed in explicitly (as we do with storeAudio).
                    // If keys are passed explicitly, no keyPath or autoIncrement is needed here.
                    db.createObjectStore(STORE_NAME);
                    console.log(`[DB] Object store "${STORE_NAME}" created.`);
                }
            };
        });
    }
    return dbPromise;
}

/**
 * Stores an audio blob in IndexedDB with a given key.
 * @param {string} key - The unique key to store the audio blob under.
 * @param {Blob} audioBlob - The audio blob (File object) to store.
 * @returns {Promise<IDBValidKey>} A promise that resolves with the key under which the blob was stored.
 */
export async function storeAudio(key, audioBlob) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        // Start a new transaction with 'readwrite' access
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        // Store the blob. The key is provided explicitly.
        const request = store.put(audioBlob, key);

        request.onsuccess = () => {
            console.log(`[DB] Audio stored successfully with key: ${key}`);
            resolve(request.result); // request.result will be the key
        };
        request.onerror = (event) => {
            console.error(`[DB] Error storing audio with key ${key}:`, event.target.error);
            reject('Error storing audio: ' + event.target.error.message);
        };
    });
}

/**
 * Retrieves an audio blob from IndexedDB by its key.
 * @param {string} key - The key of the audio blob to retrieve.
 * @returns {Promise<Blob|null>} A promise that resolves with the audio blob, or null if not found.
 */
export async function getAudio(key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
            if (request.result) {
                console.log(`[DB] Audio retrieved successfully for key: ${key}`);
                resolve(request.result); // This will be the Blob
            } else {
                console.warn(`[DB] No audio found for key: ${key}`);
                resolve(null);
            }
        };
        request.onerror = (event) => {
            console.error(`[DB] Error retrieving audio for key ${key}:`, event.target.error);
            reject('Error retrieving audio: ' + event.target.error.message);
        };
    });
}

/**
 * Deletes an audio blob from IndexedDB by its key.
 * @param {string} key - The key of the audio blob to delete.
 * @returns {Promise<void>} A promise that resolves when the audio is deleted.
 */
export async function deleteAudio(key) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => {
            console.log(`[DB] Audio deleted successfully for key: ${key}`);
            resolve();
        };
        request.onerror = (event) => {
            console.error(`[DB] Error deleting audio for key ${key}:`, event.target.error);
            reject('Error deleting audio: ' + event.target.error.message);
        };
    });
}

/**
 * Clears all audio blobs from the IndexedDB store.
 * @returns {Promise<void>} A promise that resolves when the store is cleared.
 */
export async function clearAllAudio() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
            console.log('[DB] All audio cleared from database.');
            resolve();
        };
        request.onerror = (event) => {
            console.error('[DB] Error clearing audio database:', event.target.error);
            reject('Error clearing audio database: ' + event.target.error.message);
        };
    });
}
