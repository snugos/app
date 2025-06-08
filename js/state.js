// js/state.js - Application State Management
import * as Constants from './constants.js';
import { Track } from './Track.js';
// ... (rest of imports)

// ... (Centralized State Variables are unchanged)

let appServices = {}; 

export function initializeStateModule(appServicesFromMain) {
    appServices = appServicesFromMain || {};
    // --- Start of New Code ---
    // Ensure the Imports library exists in the state from the beginning
    if (!soundLibraryFileTreesGlobal['Imports']) {
        soundLibraryFileTreesGlobal['Imports'] = {};
    }
    // --- End of New Code ---
    console.log("[State] State module initialized. AppServices keys:", Object.keys(appServices));
}

// --- Start of New Code ---
export async function addFileToSoundLibraryInternal(fileName, audioBlob) {
    if (!appServices.dbStoreAudio || !appServices.dbGetAudio) {
        console.error("Database services not available.");
        appServices.showNotification?.("Error: Database not ready.", 3000);
        return;
    }

    try {
        const dbKey = `user-import-${Date.now()}-${fileName}`;
        await appServices.dbStoreAudio(dbKey, audioBlob);

        // Create a file entry that mimics a JSZip entry for compatibility
        const newFileEntry = {
            name: fileName,
            async: (type) => {
                if (type === 'blob') {
                    // Retrieve the blob from IndexedDB when requested
                    return appServices.dbGetAudio(dbKey);
                }
                return Promise.reject(new Error('Unsupported data type requested.'));
            }
        };

        if (!soundLibraryFileTreesGlobal['Imports']) {
            soundLibraryFileTreesGlobal['Imports'] = {};
        }
        soundLibraryFileTreesGlobal['Imports'][fileName] = { type: 'file', entry: newFileEntry, fullPath: fileName };
        
        // Refresh the sound browser if it's open
        appServices.renderSoundBrowser?.();

    } catch (error) {
        console.error("Failed to add file to sound library:", error);
        appServices.showNotification?.("Error saving imported file.", 3000);
    }
}
// --- End of New Code ---


// ... (rest of state.js is unchanged)
