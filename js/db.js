// js/db.js - IndexedDB Helper Module (MODIFIED - based on new version, verified)

const DB_NAME = 'SnugOSAudioDB_v2'; // Consider versioning DB name if schema changes
const STORE_NAME = 'audioFiles';
const DB_VERSION = 1; // Keep version 1 unless object store structure changes

let dbPromise = null;

/**
 * Gets the IndexedDB database instance.
 * Initializes the database and object store if they don't exist.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
function getDB() {
    if (!dbPromise || (dbPromise.result && dbPromise.result.version !== DB_VERSION) ) { // Check if DB is closed or version mismatch
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
                const db = event.target.result;
                // console.log('[DB] Database opened successfully.');
                 db.onversionchange = () => { // Handle external version changes if DB is open elsewhere
                    db.close();
                    console.warn("[DB] Database version changed elsewhere. DB closed. Please refresh page.");
                    dbPromise = null; // Reset promise to allow re-opening
                    // Optionally, notify user to refresh
                };
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                console.log('[DB] Database upgrade needed.');
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME); // Key will be fileId (string)
                    console.log(`[DB] Object store "${STORE_NAME}" created.`);
                }
            };
             request.onblocked = (event) => {
                console.warn('[DB open] Database open request blocked. Other connections might be open.', event);
                reject(new Error('Database open blocked. Please close other tabs/windows with this app.'));
            };
        });
    }
    return dbPromise;
}

/**
 * Stores an audio file (Blob or File object) in IndexedDB.
 * @param {string} fileId - A unique ID for the file.
 * @param {Blob|File} audioBlob - The audio data to store.
 * @returns {Promise<string>} A promise that resolves with the fileId on success.
 */
export async function storeAudio(fileId, audioBlob) {
    if (!fileId || !audioBlob) {
        return Promise.reject(new Error('File ID and audio blob are required for storing.'));
    }
    // console.log(`[DB storeAudio] Attempting to store fileId: ${fileId}, Blob size: ${audioBlob.size}, type: ${audioBlob.type}`);

    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(audioBlob, fileId);

                request.onsuccess = () => {
                    // console.log(`[DB storeAudio] Audio file "${fileId}" stored successfully.`);
                    resolve(fileId);
                };
                request.onerror = (event) => {
                    console.error(`[DB storeAudio] Error storing audio file "${fileId}":`, event.target.error);
                    reject(new Error(`Error storing audio file: ${event.target.error?.message || 'Unknown DB put error'}`));
                };
                 transaction.onabort = (event) => {
                    console.error(`[DB storeAudio] Transaction aborted for storing "${fileId}":`, event.target.error);
                    reject(new Error('Transaction aborted while storing audio: ' + (event.target.error?.message || 'Unknown DB transaction abort')));
                };
                transaction.onerror = (event) => { // Catching transaction-level errors
                    console.error(`[DB storeAudio] Transaction error for storing "${fileId}":`, event.target.error);
                     reject(new Error('Transaction error storing audio: ' + (event.target.error?.message || 'Unknown DB transaction error')));
                };
            } catch (e) {
                 console.error('[DB storeAudio] Synchronous error during transaction creation:', e);
                 reject(new Error('Failed to initiate store audio transaction: ' + e.message));
            }
        });
    } catch (dbError) {
        console.error('[DB storeAudio] Could not get database instance:', dbError);
        return Promise.reject(new Error('Failed to get database for storing audio: ' + dbError.message));
    }
}


/**
 * Retrieves an audio file (as a Blob) from IndexedDB.
 * @param {string} fileId - The ID of the file to retrieve.
 * @returns {Promise<Blob|null>} A promise that resolves with the Blob, or null if not found.
 */
export async function getAudio(fileId) {
    if (!fileId) return Promise.resolve(null);

    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(fileId);

                request.onsuccess = (event) => {
                    if (event.target.result) {
                        // console.log(`[DB getAudio] Audio file "${fileId}" retrieved successfully.`);
                        resolve(event.target.result);
                    } else {
                        // console.log(`[DB getAudio] Audio file "${fileId}" not found.`);
                        resolve(null);
                    }
                };
                request.onerror = (event) => {
                    console.error(`[DB getAudio] Error retrieving audio file "${fileId}":`, event.target.error);
                    reject(new Error(`Error retrieving audio file: ${event.target.error?.message || 'Unknown DB get error'}`));
                };
                transaction.onabort = (event) => {
                    console.error(`[DB getAudio] Transaction aborted for retrieving "${fileId}":`, event.target.error);
                    reject(new Error('Transaction aborted while retrieving audio: ' + (event.target.error?.message || 'Unknown DB transaction abort')));
                };
                 transaction.onerror = (event) => {
                    console.error(`[DB getAudio] Transaction error for retrieving "${fileId}":`, event.target.error);
                    reject(new Error('Transaction error retrieving audio: ' + (event.target.error?.message || 'Unknown DB transaction error')));
                };
            } catch (e) {
                console.error('[DB getAudio] Synchronous error during transaction creation:', e);
                reject(new Error('Failed to initiate get audio transaction: ' + e.message));
            }
        });
    } catch (dbError) {
        console.error('[DB getAudio] Could not get database instance:', dbError);
        return Promise.reject(new Error('Failed to get database for retrieving audio: ' + dbError.message));
    }
}


/**
 * Deletes an audio file from IndexedDB.
 * @param {string} fileId - The ID of the file to delete.
 * @returns {Promise<void>} A promise that resolves when the file is deleted.
 */
export async function deleteAudio(fileId) {
    if (!fileId) return Promise.resolve();

    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(fileId);

                request.onsuccess = () => {
                    // console.log(`[DB deleteAudio] Audio file "${fileId}" deleted successfully.`);
                    resolve();
                };
                request.onerror = (event) => {
                    console.error(`[DB deleteAudio] Error deleting audio file "${fileId}":`, event.target.error);
                    reject(new Error(`Error deleting audio file: ${event.target.error?.message || 'Unknown DB delete error'}`));
                };
                 transaction.onabort = (event) => {
                    console.error(`[DB deleteAudio] Transaction aborted for deleting "${fileId}":`, event.target.error);
                     reject(new Error('Transaction aborted while deleting audio: ' + (event.target.error?.message || 'Unknown DB transaction abort')));
                };
                 transaction.onerror = (event) => {
                    console.error(`[DB deleteAudio] Transaction error for deleting "${fileId}":`, event.target.error);
                    reject(new Error('Transaction error deleting audio: ' + (event.target.error?.message || 'Unknown DB transaction error')));
                };
            } catch (e) {
                 console.error('[DB deleteAudio] Synchronous error during transaction creation:', e);
                 reject(new Error('Failed to initiate delete audio transaction: ' + e.message));
            }
        });
    } catch (dbError) {
        console.error('[DB deleteAudio] Could not get database instance:', dbError);
        return Promise.reject(new Error('Failed to get database for deleting audio: ' + dbError.message));
    }
}

/**
 * Clears all audio files from the IndexedDB store.
 * @returns {Promise<void>} A promise that resolves when the store is cleared.
 */
export async function clearAllAudio() {
    try {
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
                 transaction.onabort = (event) => {
                    console.error('[DB clearAllAudio] Transaction aborted for clearing database:', event.target.error);
                    reject(new Error('Transaction aborted while clearing audio database: ' + (event.target.error?.message || 'Unknown DB transaction abort')));
                };
                transaction.onerror = (event) => {
                    console.error(`[DB clearAllAudio] Transaction error clearing audio database:`, event.target.error);
                    reject(new Error('Transaction error clearing audio database: ' + (event.target.error?.message || 'Unknown DB transaction error')));
                };
            } catch (e) {
                console.error('[DB clearAllAudio] Synchronous error during transaction creation:', e);
                reject(new Error('Failed to initiate clear audio store transaction: ' + e.message));
            }
        });
    } catch (dbError) {
        console.error('[DB clearAllAudio] Could not get database instance:', dbError);
        return Promise.reject(new Error('Failed to get database for clearing audio: ' + dbError.message));
    }
}
