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

let isReconstructingDAW = false;
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
export function getIsReconstructingDAWState() { return isReconstructingDAW; }


// --- Setters ---
export function addWindowToStoreState(windowInstance) { if (windowInstance) openWindowsMap.set(windowInstance.id, windowInstance); }
export function removeWindowFromStoreState(windowId) { openWindowsMap.delete(windowId); }
export function setHighestZState(zIndex) { highestZ = zIndex; }
export function incrementHighestZState() { highestZ++; return highestZ; }
export function setIsReconstructingDAWState(state) { isReconstructingDAW = !!state; }

export function setMasterEffectsState(effectsArray) { 
    masterEffectsChainState = effectsArray || []; 
    appServices.updateMasterEffectsUI?.();
}
export function setMasterGainValueState(gainValue) { masterGainValueState = gainValue; }

export function setMidiAccessState(midi) { midiAccessGlobal = midi; }
export function setActiveMIDIInputState(
