// js/state.js - Application State Management
import * as Constants from './constants.js';
import { Track } from './Track.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
import {
    initAudioContextAndMasterMeter as audioInitAudioContextAndMasterMeter
} from './audio.js';


// --- Centralized State Variables ---
let tracks = [];
let trackIdCounter = 0;
let openWindowsMap = new Map();
let highestZ = 100;
let masterEffectsChainState = [];
let masterGainValueState = 1.0; // Corresponds to 0dB
let armedTrackId = null;
let midiAccessGlobal = null;
let activeMIDIInputGlobal = null;
let loadedZipFilesGlobal = {};
let soundLibraryFileTreesGlobal = {};
let currentLibraryNameGlobal = null;
let currentSoundFileTreeGlobal = null;
let currentSoundBrowserPathGlobal = [];
let previewPlayerGlobal = null;
let clipboardDataGlobal = { type: null, data: null, sourceTrackType: null, sequenceLength: null };
let activeSequencerTrackId = null; 
let soloedTrackId = null;
let isRecordingGlobal = false;
let recordingTrackIdGlobal = null;
let recordingStartTimeGlobal = 0; 
let playbackMode = 'sequencer'; 
let undoStack = [];
let redoStack = [];
const MAX_UNDO_HISTORY = 50;
let selectedTimelineClipInfo = { clipId: null, trackId: null, originalLeft: 0, originalStartBeat: 0 };
let currentUserThemePreference = 'system'; 

// --- AppServices Link ---
let appServices = {}; 

// --- Initialization ---
export function initializeStateModule(appServicesFromMain) {
    appServices = appServicesFromMain || {};
    console.log("[State] State module initialized.");
}

// --- Getters ---
export function getTracksState() { return [...tracks]; }
export function getTrackByIdState(trackId) { return tracks.find(t => t.id === trackId); }
export function getOpenWindowsState() { return openWindowsMap; }
export function getWindowByIdState(windowId) { return openWindowsMap.get(windowId); }
export function getHighestZState() { return highestZ; }
export function getMasterEffectsState() { return [...masterEffectsChainState]; }
export function getMasterGainValueState() { return masterGainValueState; }
export function getMidiAccessState() { return midiAccessGlobal; }
export function getActiveMIDIInputState() { return activeMIDIInputGlobal; }
export function getArmedTrackIdState() { return armedTrackId; }
export function getSoloedTrackIdState() { return soloedTrackId; }
// ... other getters ...


// --- Setters ---
export function addWindowToStoreState(windowInstance) { if (windowInstance) openWindowsMap.set(windowInstance.id, windowInstance); }
export function removeWindowFromStoreState(windowId) { openWindowsMap.delete(windowId); }
export function setHighestZState(zIndex) { highestZ = zIndex; }
export function incrementHighestZState() { highestZ++; return highestZ; }
export function setMasterEffectsState(effectsArray) { masterEffectsChainState = effectsArray || []; if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI(); }
export function setMasterGainValueState(gainValue) { masterGainValueState = gainValue; }
export function setMidiAccessState(midi) { midiAccessGlobal = midi; }
export function setActiveMIDIInputState(input) { activeMIDIInputGlobal = input; }
export function setLoadedZipFilesState(libraryName, zipInstance, status = 'loaded') {
    loadedZipFilesGlobal[libraryName] = { zip: zipInstance, status: status, lastAccessed: Date.now() };
    console.log(`[State setLoadedZipFilesState] Library "${libraryName}" status set to "${status}".`);
}
export function setSoundLibraryFileTreesState(libraryName, tree) {
    soundLibraryFileTreesGlobal[libraryName] = tree;
    console.log(`[State setSoundLibraryFileTreesState] File tree for "${libraryName}" stored.`);
}
// ... other setters ...

export function setArmedTrackIdState(trackId) {
    const oldArmedId = armedTrackId;
    armedTrackId = trackId;

    // After changing the state, notify the UI to update the old and new tracks
    if (appServices.updateTrackUI) {
        if (oldArmedId !== null) {
            appServices.updateTrackUI(oldArmedId, 'armChanged');
        }
        if (armedTrackId !== null) {
            appServices.updateTrackUI(armedTrackId, 'armChanged');
        }
    }
}

export function setSoloedTrackIdState(trackId) { 
    const tracks = getTracksState();
    const oldSoloId = soloedTrackId;
    soloedTrackId = trackId;

    if (appServices.updateTrackUI) {
        if (oldSoloId !== null) {
            appServices.updateTrackUI(oldSoloId, 'soloChanged');
        }
        if (soloedTrackId !== null) {
            appServices.updateTrackUI(soloedTrackId, 'soloChanged');
        }
        // If a track is soloed, all other tracks might need their mute state updated visually
        tracks.forEach(t => {
            if (t.id !== oldSoloId && t.id !== soloedTrackId) {
                appServices.updateTrackUI(t.id, 'soloChanged');
            }
        });
    }
}
// ... other setters and functions ...

// --- Core State Actions ---
export function addTrackToStateInternal(type, initialData = null, isUserAction = true) {
    console.log(`[State addTrackToStateInternal] Adding ${type} track. User Action: ${isUserAction}, Brand New: ${!initialData}`);
    try {
        const newTrackId = initialData?.id ?? trackIdCounter++;
        const newTrack = new Track(newTrackId, type, initialData, appServices);
        if (newTrackId >= trackIdCounter) trackIdCounter = newTrackId + 1;
        tracks.push(newTrack);
        console.log(`[State addTrackToStateInternal] Track "${newTrack.name}" (ID: ${newTrack.id}, Type: ${type}) added to state. Total tracks: ${tracks.length}`);
        if (isUserAction && appServices.captureStateForUndo) appServices.captureStateForUndo(`Add Track: ${newTrack.name}`);
        appServices.updateMixerWindow?.();
        appServices.renderTimeline?.();
        return newTrack;
    } catch (error) {
        console.error(`[State addTrackToStateInternal] Error adding ${type} track:`, error);
        if (appServices.showNotification) appServices.showNotification(`Failed to add ${type} track.`, 4000);
        return null; 
    }
}

export function removeTrackFromStateInternal(trackId, isUserAction = true) {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex > -1) {
        const removedTrack = tracks[trackIndex];
        if (isUserAction && appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Remove Track ${removedTrack.name}`);
        }
        removedTrack.dispose();
        tracks.splice(trackIndex, 1);
        appServices.updateMixerWindow?.();
        appServices.renderTimeline?.();
        console.log(`[State] Removed track ${trackId}`);
    }
}
// ... rest of the file is unchanged
