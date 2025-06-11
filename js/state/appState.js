// js/state/appState.js

let midiAccess = null;
let activeMIDIInput = null;
let playbackMode = 'piano-roll'; // 'piano-roll' or 'timeline'
let currentUserThemePreference = 'system'; // 'system', 'light', or 'dark'
let midiRecordMode = 'overdub'; // 'overdub' or 'replace'
let selectedTimelineClipInfo = { 
    clipId: null,
    trackId: null,
    originalLeft: 0, 
    originalStart: 0,
    pixelsPerSecond: 0,
};

let localAppServices = {};

export function initializeAppState(appServices) {
    localAppServices = appServices;
}

export function getMidiAccess() {
    return midiAccess;
}

export function setMidiAccess(access) {
    midiAccess = access;
}

export function getActiveMIDIInput() {
    return activeMIDIInput;
}

export function setActiveMIDIInput(input) {
    activeMIDIInput = input;
}

export function getPlaybackMode() {
    return playbackMode;
}

export function setPlaybackMode(mode) {
    if (mode === 'piano-roll' || mode === 'timeline') {
        const oldMode = playbackMode;
        playbackMode = mode;
        localAppServices.onPlaybackModeChange?.(mode, oldMode); // Fixed to use `mode` instead of `newMode`
    }
}

export function getCurrentUserThemePreference() {
    return currentUserThemePreference;
}

export function setCurrentUserThemePreference(theme) {
    currentUserThemePreference = theme;
    localStorage.setItem('snugos-theme', theme);
    localAppServices.applyUserThemePreference?.();
}

export function getSelectedTimelineClipInfo() {
    return selectedTimelineClipInfo;
}

export function setSelectedTimelineClipInfo(info) {
    selectedTimelineClipInfo = { ...selectedTimelineClipInfo, ...info };
}

export function getMidiRecordModeState() { 
    return midiRecordMode; 
}

export function setMidiRecordModeState(mode) {
    if (mode === 'overdub' || mode === 'replace') {
        midiRecordMode = mode;
    }
}
