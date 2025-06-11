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
let midiRecordMode = 'overdub'; // NEW: 'overdub' or 'replace'

let playbackMode = 'piano-roll'; 

let isReconstructingDAW = false;
let undoStack = [];
let redoStack = [];
const MAX_UNDO_HISTORY = 50;

let selectedTimelineClipInfo = { 
    clipId: null,
    trackId: null,
    originalLeft: 0, 
    originalStart: 0,
    pixelsPerSecond: 0,
};

let currentUserThemePreference = 'system'; 

let appServices = {};


// --- State Initialization and Accessors ---

export function initializeStateModule(appServicesFromMain) {
    appServices = appServicesFromMain;
}

// NEW: Getters and setters for MIDI Record Mode
export function getMidiRecordModeState() { return midiRecordMode; }
export function setMidiRecordModeState(mode) {
    if (mode === 'overdub' || mode === 'replace') {
        midiRecordMode = mode;
    }
}

export function getTracksState() { return tracks; }
export function getTrackByIdState(id) { return tracks.find(t => t.id === id); }
export function getOpenWindowsState() { return openWindowsMap; }
export function getWindowByIdState(id) { return openWindowsMap.get(id); }
export function getHighestZState() { return highestZ; }
export function setHighestZState(z) { highestZ = z; }
export function incrementHighestZState() { return ++highestZ; }
export function addWindowToStoreState(id, windowInstance) { openWindowsMap.set(id, windowInstance); }
export function removeWindowFromStoreState(id) { openWindowsMap.delete(id); }
export function getMidiAccessState() { return midiAccessGlobal; }
export function setMidiAccessState(access) { midiAccessGlobal = access; }
export function getActiveMIDIInputState() { return activeMIDIInputGlobal; }
export function setActiveMIDIInputState(input) { activeMIDIInputGlobal = input; }
export function getSoloedTrackIdState() { return soloedTrackId; }
export function setSoloedTrackIdState(id) { soloedTrackId = id; }
export function getArmedTrackIdState() { return armedTrackId; }
export function setArmedTrackIdState(id) { armedTrackId = id; }
export function isTrackRecordingState() { return isRecordingGlobal; }
export function setIsRecordingState(isRecording) { isRecordingGlobal = isRecording; }
export function getRecordingTrackIdState() { return recordingTrackIdGlobal; }
export function setRecordingTrackIdState(id) { recordingTrackIdGlobal = id; }
export function getRecordingStartTimeState() { return recordingStartTimeGlobal; }
export function setRecordingStartTimeState(time) { recordingStartTimeGlobal = time; }
export function getPlaybackModeState() { return playbackMode; }
export function setPlaybackModeState(mode) {
    if (mode === 'piano-roll' || mode === 'timeline') {
        const oldMode = playbackMode;
        playbackMode = mode;
        appServices.onPlaybackModeChange?.(newMode, oldMode);
    }
}
export function getIsReconstructingDAWState() { return isReconstructingDAW; }
export function setIsReconstructingDAWState(isReconstructing) { isReconstructingDAW = isReconstructing; }
export function getUndoStackState() { return undoStack; }
export function getRedoStackState() { return redoStack; }
export function getLoadedZipFilesState() { return loadedZipFilesGlobal; }
export function setLoadedZipFilesState(name, zip, status) {
    if (!loadedZipFilesGlobal[name]) loadedZipFilesGlobal[name] = {};
    if (zip) loadedZipFilesGlobal[name].zip = zip;
    if (status) loadedZipFilesGlobal[name].status = status;
}
export function getSoundLibraryFileTreesState() { return soundLibraryFileTreesGlobal; }
export function setSoundLibraryFileTreesState(libraryName, tree) { soundLibraryFileTreesGlobal[libraryName] = tree; }
export function getCurrentLibraryNameState() { return currentLibraryNameGlobal; }
export function setCurrentLibraryNameState(name) { currentLibraryNameGlobal = name; }
export function getPreviewPlayerState() { return previewPlayerGlobal; }
export function setPreviewPlayerState(player) { previewPlayerGlobal = player; }
export function setSelectedTimelineClipInfoState(info) { selectedTimelineClipInfo = { ...selectedTimelineClipInfo, ...info }; }
export function getCurrentUserThemePreferenceState() { return currentUserThemePreference; }
export function setCurrentUserThemePreferenceState(theme) {
    currentUserThemePreference = theme;
    localStorage.setItem('snugos-theme', theme);
    appServices.applyUserThemePreference?.();
}
export function getMasterGainValueState() { return masterGainValueState; }
export function setMasterGainValueState(gain) {
    masterGainValueState = gain;
    appServices.setActualMasterVolume?.(gain);
}
export function getMasterEffectsState() { return masterEffectsChainState; }
export function addMasterEffectToState(effectType) {
    const defaultParams = getEffectDefaultParamsFromRegistry(effectType);
    const effect = { id: `master-effect-${Date.now()}`, type: effectType, params: defaultParams };
    masterEffectsChainState.push(effect);
    appServices.addMasterEffectToAudio?.(effect);
    appServices.updateMasterEffectsUI?.();
}
export function removeMasterEffectFromState(effectId) {
    const index = masterEffectsChainState.findIndex(e => e.id === effectId);
    if (index > -1) {
        masterEffectsChainState.splice(index, 1);
        appServices.removeMasterEffectFromAudio?.(effectId);
        appServices.updateMasterEffectsUI?.();
    }
}
export function updateMasterEffectParamInState(effectId, paramPath, value) {
    const effect = masterEffectsChainState.find(e => e.id === effectId);
    if (effect) {
        let paramState = effect.params;
        const keys = paramPath.split('.');
        const finalKey = keys.pop();
        for (const key of keys) {
           paramState = paramState[key] = paramState[key] || {};
        }
        paramState[finalKey] = value;
        appServices.updateMasterEffectParamInAudio?.(effectId, paramPath, value);
    }
}
export function reorderMasterEffectInState(oldIndex, newIndex) {
    const [moved] = masterEffectsChainState.splice(oldIndex, 1);
    masterEffectsChainState.splice(newIndex, 0, moved);
    appServices.reorderMasterEffectInAudio?.();
    appServices.updateMasterEffectsUI?.();
}

export async function addTrackToStateInternal(type) {
    const newTrackId = trackIdCounter++;
    const track = new Track(newTrackId, type, null, appServices);
    tracks.push(track);
    await track.initializeInstrument();
    appServices.updateMixerWindow?.();
    appServices.renderTimeline?.();
    captureStateForUndoInternal(`Add ${type} Track`);
    return track;
}

export function removeTrackFromStateInternal(trackId) {
    const index = tracks.findIndex(t => t.id === trackId);
    if (index > -1) {
        const trackName = tracks[index].name;
        captureStateForUndoInternal(`Remove Track: ${trackName}`);
        tracks[index].dispose();
        tracks.splice(index, 1);
        appServices.updateMixerWindow?.();
        appServices.renderTimeline?.();
    }
}

export function addFileToSoundLibraryInternal(fileName, fileBlob) {
    // This is a placeholder for a more robust implementation
    // For now, it just stores the blob in the DB for this session
    console.log(`Adding ${fileName} to sound library.`);
    const dbKey = `imports/${fileName}-${fileBlob.size}-${Date.now()}`;
    return dbStoreAudio(dbKey, fileBlob);
}

export function captureStateForUndoInternal(actionDescription) {
    const state = gatherProjectDataInternal();
    undoStack.push({ state, actionDescription });
    if (undoStack.length > MAX_UNDO_HISTORY) {
        undoStack.shift();
    }
    redoStack = [];
}

export function undoLastActionInternal() {
    if (undoStack.length > 0) {
        const lastState = undoStack.pop();
        const currentState = gatherProjectDataInternal();
        redoStack.push({ state: currentState, actionDescription: lastState.actionDescription });
        reconstructDAWInternal(lastState.state);
    }
}

export function redoLastActionInternal() {
    if (redoStack.length > 0) {
        const nextState = redoStack.pop();
        const currentState = gatherProjectDataInternal();
        undoStack.push({ state: currentState, actionDescription: nextState.actionDescription });
        reconstructDAWInternal(nextState.state);
    }
}

export function gatherProjectDataInternal() {
    return {
        tracks: tracks.map(t => t.serialize()),
        masterEffects: masterEffectsChainState,
        masterVolume: masterGainValueState,
        tempo: Tone.Transport.bpm.value,
        version: Constants.APP_VERSION,
    };
}

export async function reconstructDAWInternal(projectData) {
    setIsReconstructingDAWState(true);
    
    // Clear existing state
    tracks.forEach(t => t.dispose());
    tracks = [];
    trackIdCounter = 0;
    
    // Reconstruct tracks
    for (const trackData of projectData.tracks) {
        const newTrack = await addTrackToStateInternal(trackData.type);
        Object.assign(newTrack, trackData); // This is a shallow merge, might need deeper reconstruction
        await newTrack.initializeInstrument();
    }
    
    // Reconstruct master state
    setMasterGainValueState(projectData.masterVolume);
    Tone.Transport.bpm.value = projectData.tempo;
    masterEffectsChainState = projectData.masterEffects;
    appServices.rebuildMasterEffectChain?.();
    
    // Update UI
    appServices.updateMixerWindow?.();
    appServices.renderTimeline?.();
    
    setIsReconstructingDAWState(false);
}

export function saveProjectInternal() {
    const projectData = gatherProjectDataInternal();
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'snugos-project.snug';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function loadProjectInternal(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const projectData = JSON.parse(e.target.result);
            reconstructDAWInternal(projectData);
        } catch (error) {
            showNotification("Error: Could not parse project file.", 3000);
            console.error("Project file parsing error:", error);
        }
    };
    reader.readAsText(file);
}

export async function handleProjectFileLoadInternal(event) {
    const file = event.target.files[0];
    if (file) {
        loadProjectInternal(file);
    }
}

export async function exportToWavInternal() {
    try {
        await appServices.initAudioContextAndMasterMeter(true);
        const recorder = new Tone.Recorder();
        Tone.getDestination().connect(recorder);

        // A fixed 10-second export. A more advanced version could calculate the song length.
        const exportDuration = 10; 
        appServices.showNotification(`Rendering ${exportDuration} seconds... Please wait.`, exportDuration * 1000);
        
        recorder.start();
        Tone.Transport.stop();
        Tone.Transport.position = 0;
        Tone.Transport.start();

        Tone.Transport.scheduleOnce(async () => {
            Tone.Transport.stop();
            const recording = await recorder.stop();
            
            const url = URL.createObjectURL(recording);
            const anchor = document.createElement("a");
            anchor.download = "snugos-export.wav";
            anchor.href = url;
            anchor.click();

            URL.revokeObjectURL(url);
            recorder.dispose();
            Tone.getDestination().disconnect(recorder);
            appServices.showNotification('Export finished!', 3000);

        }, exportDuration);
    } catch (error) {
        console.error("Error exporting to WAV:", error);
        appServices.showNotification('Failed to export WAV file.', 3000);
    }
}

export function getClipboardData() {
    return clipboardDataGlobal;
}

export function setClipboardData(data) {
    clipboardDataGlobal = data;
}
