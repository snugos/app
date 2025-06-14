// js/daw/state/windowState.js

// No direct imports to correct here as it only uses localAppServices and local variables

let openWindowsMap = new Map();
let highestZ = 100;
let localAppServices = {};

/**
 * Initializes the window state module.
 * @param {object} appServices - The main app services object.
 */
export function initializeWindowState(appServices) {
    localAppServices = appServices;
}

export function getOpenWindows() {
    return openWindowsMap;
}

export function getWindowById(id) {
    return openWindowsMap.get(id);
}

export function addWindowToStore(id, windowInstance) {
    openWindowsMap.set(id, windowInstance);
}

export function removeWindowFromStore(id) {
    openWindowsMap.delete(id);
}

export function getHighestZ() {
    return highestZ;
}

export function setHighestZ(z) {
    highestZ = z;
}

export function incrementHighestZ() {
    return ++highestZ;
}
