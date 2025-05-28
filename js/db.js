// js/db.js - IndexedDB Helper Module

const DB_NAME = 'SnugOSAudioDB';
const STORE_NAME = 'audioFiles';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('[DB] Database error:', event.target.error);
                reject('Error opening database');
            };

            request.onsuccess = (event) => {
                console.log('[DB] Database opened successfully.');
                resolve(event.target.result);
            };

            request.onupgradeneeded = (event) => {
                console.log('[DB] Database upgrade needed.');
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME); // Using auto-incrementing keys or user-defined keys
                    console.log(`[DB] Object store "${STORE_NAME}" created.`);
                }
            };
        });
    }
    return dbPromise;
}

export async function storeAudio(key, audioBlob) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(audioBlob, key); // Store blob with the provided key

        request.onsuccess = () => {
            console.log(`[DB] Audio stored successfully with key: ${key}`);
            resolve(request.result);
        };
        request.onerror = (event) => {
            console.error(`[DB] Error storing audio with key ${key}:`, event.target.error);
            reject('Error storing audio');
        };
    });
}

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
                resolve(null); // Or reject('Audio not found') if preferred
            }
        };
        request.onerror = (event) => {
            console.error(`[DB] Error retrieving audio for key ${key}:`, event.target.error);
            reject('Error retrieving audio');
        };
    });
}

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
            reject('Error deleting audio');
        };
    });
}

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
            reject('Error clearing audio database');
        };
    });
}
