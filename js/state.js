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
let masterGainValueState = Tone.dbToGain(0); 

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
let armedTrackId = null;
let isRecordingGlobal = false;
let recordingTrackIdGlobal = null;
let recordingStartTimeGlobal = 0; 

let playbackMode = 'sequencer'; 

let undoStack = [];
let redoStack = [];
const MAX_UNDO_HISTORY = 50;

let selectedTimelineClipInfo = { 
    clipId: null,
    trackId: null,
    originalLeft: 0, 
    originalStartBeat: 0, 
};

let currentUserThemePreference = 'system'; 

// --- AppServices Link ---
let appServices = {}; 

// --- Initialization ---
export function initializeStateModule(appServicesFromMain) {
    appServices = appServicesFromMain || {};
    console.log("[State] State module initialized. AppServices keys:", Object.keys(appServices));
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
export function getLoadedZipFilesState() { return loadedZipFilesGlobal; }
export function getSoundLibraryFileTreesState() { return soundLibraryFileTreesGlobal; }
export function getCurrentLibraryNameState() { return currentLibraryNameGlobal; }
export function getCurrentSoundFileTreeState() { return currentSoundFileTreeGlobal; }
export function getCurrentSoundBrowserPathState() { return [...currentSoundBrowserPathGlobal]; }
export function getPreviewPlayerState() { return previewPlayerGlobal; }
export function getClipboardDataState() { return { ...clipboardDataGlobal }; }
export function getArmedTrackIdState() { return armedTrackId; }
export function getSoloedTrackIdState() { return soloedTrackId; }
export function isTrackRecordingState() { return isRecordingGlobal; }
export function getRecordingTrackIdState() { return recordingTrackIdGlobal; }
export function getRecordingStartTimeState() { return recordingStartTimeGlobal; }
export function getActiveSequencerTrackIdState() { return activeSequencerTrackId; }
export function getUndoStackState() { return [...undoStack]; }
export function getRedoStackState() { return [...redoStack]; }
export function getPlaybackModeState() { return playbackMode; }
export function getSelectedTimelineClipInfoState() { return {...selectedTimelineClipInfo}; }
export function getCurrentUserThemePreferenceState() { return currentUserThemePreference; }


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
    console.log(`[State setLoadedZipFilesState] Library "${libraryName}" status set to "${status}". Total loaded: ${Object.keys(loadedZipFilesGlobal).length}`);
}
export function setSoundLibraryFileTreesState(libraryName, tree) {
    soundLibraryFileTreesGlobal[libraryName] = tree;
    console.log(`[State setSoundLibraryFileTreesState] File tree for "${libraryName}" stored.`);
}
export function setCurrentLibraryNameState(name) { currentLibraryNameGlobal = name; if(appServices.updateSoundBrowserDisplayForLibrary) appServices.updateSoundBrowserDisplayForLibrary(name); }
export function setCurrentSoundFileTreeState(tree) { currentSoundFileTreeGlobal = tree; }
export function setCurrentSoundBrowserPathState(pathArray) { currentSoundBrowserPathGlobal = pathArray || []; if(appServices.renderSoundBrowserDirectory) appServices.renderSoundBrowserDirectory(); }
export function setPreviewPlayerState(player) { previewPlayerGlobal = player; }

export function setClipboardDataState(data) { clipboardDataGlobal = data || { type: null, data: null, sourceTrackType: null, sequenceLength: null }; }

export function setArmedTrackIdState(trackId) { armedTrackId = trackId; }
export function setSoloedTrackIdState(trackId) { soloedTrackId = trackId; }
export function setIsRecordingState(isRec) { isRecordingGlobal = !!isRec; if (appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(isRecordingGlobal); }
export function setRecordingTrackIdState(trackId) { recordingTrackIdGlobal = trackId; }
export function setRecordingStartTimeState(time) { recordingStartTimeGlobal = time; }
export function setActiveSequencerTrackIdState(trackId) { activeSequencerTrackId = trackId; }

export function setPlaybackModeState(newMode, skipUIUpdate = false) {
    if (playbackMode === newMode) return;
    console.log(`[State setPlaybackModeStateInternal] Attempting to set mode to: ${newMode} (Display: ${newMode.charAt(0).toUpperCase() + newMode.slice(1)}). Current mode: ${playbackMode}`);
    
    const oldMode = playbackMode;
    playbackMode = newMode;

    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Playback Mode to ${newMode}`);
    }

    if (Tone.Transport.state === 'started') {
        console.log(`[State setPlaybackModeStateInternal] Transport was started, stopping it.`);
        Tone.Transport.stop();
    }
    Tone.Transport.cancel(0);
    console.log(`[State setPlaybackModeStateInternal] Tone.Transport events cancelled.`);

    if (appServices.uiElementsCache?.playBtnGlobal) {
        appServices.uiElementsCache.playBtnGlobal.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-play"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        console.log(`[State setPlaybackModeStateInternal] Play button text reset.`);
    }
    
    console.log(`[State setPlaybackModeStateInternal] Playback mode changed to: ${newMode}`);
    if (appServices.onPlaybackModeChange && !skipUIUpdate) {
        appServices.onPlaybackModeChange(newMode, oldMode);
    }
}


export function setSelectedTimelineClipInfoState(info) { selectedTimelineClipInfo = info || { clipId: null, trackId: null, originalLeft: 0, originalStartBeat: 0 }; }
export function setCurrentUserThemePreferenceState(preference) {
    if (['light', 'dark', 'system'].includes(preference)) {
        currentUserThemePreference = preference;
        localStorage.setItem(Constants.THEME_STORAGE_KEY, preference);
        if (appServices.applyUserThemePreference) appServices.applyUserThemePreference();
        console.log(`[State] User theme preference set to: ${preference}`);
    } else {
        console.warn(`[State] Invalid theme preference: ${preference}. Defaulting to 'system'.`);
        currentUserThemePreference = 'system';
        localStorage.setItem(Constants.THEME_STORAGE_KEY, 'system');
        if (appServices.applyUserThemePreference) appServices.applyUserThemePreference();
    }
}


// --- Core State Actions ---
export function addTrackToStateInternal(type, initialData = null, isUserAction = true) {
    console.log(`[State addTrackToStateInternal] Adding ${type} track. User Action: ${isUserAction}, Brand New: ${!initialData}`);
    
    let newTrack = null;
    try {
        // Create new track instance
        const newTrackId = initialData?.id ?? trackIdCounter++;
        newTrack = new Track(newTrackId, type, initialData, appServices);
        
        if (newTrackId >= trackIdCounter) { // Ensure counter is always ahead if loading a project
            trackIdCounter = newTrackId + 1;
        }

        // Add to state and log success
        tracks.push(newTrack);
        console.log(`[State addTrackToStateInternal] Track "${newTrack.name}" (ID: ${newTrack.id}, Type: ${type}) added to state. Total tracks: ${tracks.length}`);

        // Perform side-effects after successful creation
        if (isUserAction && appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Add Track: ${newTrack.name}`);
        }
        if (appServices.updateMixerWindow) appServices.updateMixerWindow();
        if (appServices.renderTimeline) appServices.renderTimeline();

        return newTrack; // Return the successfully created track instance

    } catch (error) {
        // If 'new Track' throws an error, catch it here
        console.error(`[State addTrackToStateInternal] Error adding ${type} track:`, error);
        if (appServices.showNotification) {
            appServices.showNotification(`Failed to add ${type} track. Check console for details.`, 4000);
        }
        // Ensure we return null so the caller knows the track was not created
        return null; 
    }
}


export function removeTrackFromStateInternal(trackId, isUserAction = true) {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex > -1) {
        const removedTrackData = tracks[trackIndex].serialize(); 
        if (isUserAction && appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Remove Track ${removedTrackData.name}`, {
                undo: () => addTrackToStateInternal(removedTrackData.type, removedTrackData, false),
                redo: () => removeTrackFromStateInternal(trackId, false)
            });
        }
        tracks[trackIndex].dispose();
        tracks.splice(trackIndex, 1);
        if (appServices.updateMixerWindow) appServices.updateMixerWindow();
        if (appServices.renderTimeline) appServices.renderTimeline();
        console.log(`[State] Removed track ${trackId}`);
    }
}
export function captureStateForUndoInternal(actionDescription) { /* ... (implementation unchanged) ... */ }
export function undoLastActionInternal() { /* ... (implementation unchanged) ... */ }
export function redoLastActionInternal() { /* ... (implementation unchanged) ... */ }
export function gatherProjectDataInternal(includeEffectsRegistry = false) { /* ... (implementation unchanged) ... */ }
export async function reconstructDAWInternal(projectData) { /* ... (implementation unchanged) ... */ }
export async function saveProjectInternal() { /* ... (implementation unchanged) ... */ }
export async function loadProjectInternal(file) { /* ... (implementation unchanged) ... */ }
export async function handleProjectFileLoadInternal(event) { /* ... (implementation unchanged) ... */ }
export async function exportToWavInternal() { /* ... (implementation unchanged) ... */ }

// Master Effects Chain State Management
export function addMasterEffectToState(effectType) { /* ... (implementation unchanged) ... */ }
export function removeMasterEffectFromState(effectId) { /* ... (implementation unchanged) ... */ }
export function updateMasterEffectParamInState(effectId, paramPath, value) { /* ... (implementation unchanged) ... */ }
export function reorderMasterEffectInState(effectId, newIndex) { /* ... (implementation unchanged) ... */ }

