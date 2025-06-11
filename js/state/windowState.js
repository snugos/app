// js/state/windowState.js

let openWindowsMap = new Map();
let highestZ = 100;

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
