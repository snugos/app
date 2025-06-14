// js/daw/state/soundLibraryState.js

// Corrected import path for DB
import { storeAudio as dbStoreAudio } from '../db.js'; // Corrected path

let loadedZipFiles = {};
let soundLibraryFileTrees = {};
let currentLibraryName = null;
let currentSoundBrowserPath = [];
let previewPlayer = null;

let localAppServices = {};

export function initializeSoundLibraryState(appServices) {
    localAppServices = appServices;
}

export function getLoadedZipFiles() {
    return loadedZipFiles;
}

export function setLoadedZipFiles(name, zip, status) {
    if (!loadedZipFiles[name]) {
        loadedZipFiles[name] = {};
    }
    if (zip) {
        loadedZipFiles[name].zip = zip;
    }
    if (status) {
        loadedZipFiles[name].status = status;
    }
}

export function getSoundLibraryFileTrees() {
    return soundLibraryFileTrees;
}

export function setSoundLibraryFileTrees(libraryName, tree) {
    soundLibraryFileTrees[libraryName] = tree;
}

export function getCurrentLibraryName() {
    return currentLibraryName;
}

export function setCurrentLibraryName(name) {
    currentLibraryName = name;
}

export function getCurrentSoundBrowserPath() {
    return currentSoundBrowserPath;
}

export function setCurrentSoundBrowserPath(path) {
    currentSoundBrowserPath = path;
}

export function getPreviewPlayer() {
    return previewPlayer;
}

export function setPreviewPlayer(player) {
    if (previewPlayer && typeof previewPlayer.dispose === 'function') {
        previewPlayer.dispose();
    }
    previewPlayer = player;
}

export function addFileToSoundLibrary(fileName, fileBlob) {
    console.log(`Adding ${fileName} to sound library.`);
    const dbKey = `imports/${fileName}-${fileBlob.size}-${Date.now()}`;
    // This is a placeholder for a more robust implementation that would
    // also update the sound library tree. For now, it just stores the audio.
    return dbStoreAudio(dbKey, fileBlob);
}
