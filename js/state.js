// js/state.js - Application State Management
// Removed imports as their contents will now be globally available from other script tags
// import * as Constants from './constants.js';
// import { Track } from './Track.js';
// import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
// import { initAudioContextAndMasterMeter as audioInitAudioContextAndMasterMeter } from './audio.js';


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
let midiRecordMode = 'overdub';

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

let appServices = {}; // This will be passed during initialization

// --- State Initialization and Accessors ---

// Removed export
function initializeStateModule(appServicesFromMain) {
    appServices = appServicesFromMain;
}

// Removed export
function getMidiRecordModeState() { return midiRecordMode; }
// Removed export
function setMidiRecordModeState(mode) {
    if (mode === 'overdub' || mode === 'replace') {
        midiRecordMode = mode;
    }
}
// Removed export
function getTracksState() { return tracks; }
// Removed export
function getTrackByIdState(id) { return tracks.find(t => t.id === id); }
// Removed export
function getOpenWindowsState() { return openWindowsMap; }
// Removed export
function getWindowByIdState(id) { return openWindowsMap.get(id); }
// Removed export
function getHighestZState() { return highestZ; }
// Removed export
function setHighestZState(z) { highestZ = z; }
// Removed export
function incrementHighestZState() { return ++highestZ; }
// Removed export
function addWindowToStoreState(id, windowInstance) { openWindowsMap.set(id, windowInstance); }
// Removed export
function removeWindowFromStoreState(id) { openWindowsMap.delete(id); }
// Removed export
function getMidiAccessState() { return midiAccessGlobal; }
// Removed export
function setMidiAccessState(access) { midiAccessGlobal = access; }
// Removed export
function getActiveMIDIInputState() { return activeMIDIInputGlobal; }
// Removed export
function setActiveMIDIInputState(input) { activeMIDIInputGlobal = input; }
// Removed export
function getSoloedTrackIdState() { return soloedTrackId; }
// Removed export
function setSoloedTrackIdState(id) { soloedTrackId = id; }
// Removed export
function getArmedTrackIdState() { return armedTrackId; }
// Removed export
function setArmedTrackIdState(id) { armedTrackId = id; }
// Removed export
function isTrackRecordingState() { return isRecordingGlobal; }
// Removed export
function setIsRecordingState(isRecording) { isRecordingGlobal = isRecording; }
// Removed export
function getRecordingTrackIdState() { return recordingTrackIdGlobal; }
// Removed export
function setRecordingTrackIdState(id) { recordingTrackIdGlobal = id; }
// Removed export
function getRecordingStartTimeState() { return recordingStartTimeGlobal; }
// Removed export
function setRecordingStartTimeState(time) { recordingStartTimeGlobal = time; }
// Removed export
function getPlaybackModeState() { return playbackMode; }
// Removed export
function setPlaybackModeState(mode) {
    if (mode === 'piano-roll' || mode === 'timeline') {
        const oldMode = playbackMode;
        playbackMode = mode;
        appServices.onPlaybackModeChange?.(mode, oldMode);
    }
}
// Removed export
function getIsReconstructingDAWState() { return isReconstructingDAW; }
// Removed export
function setIsReconstructingDAWState(isReconstructing) { isReconstructingDAW = isReconstructing; }
// Removed export
function getUndoStackState() { return undoStack; }
// Removed export
function getRedoStackState() { return redoStack; }
// Removed export
function getLoadedZipFilesState() { return loadedZipFilesGlobal; }
// Removed export
function setLoadedZipFilesState(name, zip, status) {
    if (!loadedZipFilesGlobal[name]) loadedZipFilesGlobal[name] = {};
    if (zip) loadedZipFilesGlobal[name].zip = zip;
    if (status) loadedZipFilesGlobal[name].status = status;
}
// Removed export
function getSoundLibraryFileTreesState() { return soundLibraryFileTreesGlobal; }
// Removed export
function setSoundLibraryFileTreesState(libraryName, tree) { soundLibraryFileTreesGlobal[libraryName] = tree; }
// Removed export
function getCurrentLibraryNameState() { return currentLibraryNameGlobal; }
// Removed export
function setCurrentLibraryNameState(name) { currentLibraryNameGlobal = name; }
// Removed export
function getCurrentSoundBrowserPathState() { return currentSoundBrowserPathGlobal; }
// Removed export
function setCurrentSoundBrowserPathState(path) { currentSoundBrowserPathGlobal = path; }
// Removed export
function getPreviewPlayerState() { return previewPlayerGlobal; }
// Removed export
function setPreviewPlayerState(player) { previewPlayerGlobal = player; }
// Removed export
function setSelectedTimelineClipInfoState(info) { selectedTimelineClipInfo = { ...selectedTimelineClipInfo, ...info }; }
// Removed export
function getCurrentUserThemePreferenceState() { return currentUserThemePreference; }
// Removed export
function setCurrentUserThemePreferenceState(theme) {
    currentUserThemePreference = theme;
    localStorage.setItem('snugos-theme', theme);
    appServices.applyUserThemePreference?.();
}
// Removed export
function getMasterGainValueState() { return masterGainValueState; }
// Removed export
function setMasterGainValueState(gain) {
    masterGainValueState = gain;
    appServices.setActualMasterVolume?.(gain);
}
// Removed export
function getMasterEffectsState() { return masterEffectsChainState; }
// Removed export
function addMasterEffectToState(effectType) {
    const defaultParams = getEffectDefaultParamsFromRegistry(effectType);
    const effect = { id: `master-effect-${Date.now()}`, type: effectType, params: defaultParams };
    masterEffectsChainState.push(effect);
    appServices.addMasterEffectToAudio?.(effect);
    appServices.updateMasterEffectsUI?.();
}
// Removed export
function removeMasterEffectFromState(effectId) {
    const index = masterEffectsChainState.findIndex(e => e.id === effectId);
    if (index > -1) {
        masterEffectsChainState.splice(index, 1);
        appServices.removeMasterEffectFromAudio?.(effectId);
        appServices.updateMasterEffectsUI?.();
    }
}
// Removed export
function updateMasterEffectParamInState(effectId, paramPath, value) {
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
// Removed export
function reorderMasterEffectInState(oldIndex, newIndex) {
    const [moved] = masterEffectsChainState.splice(oldIndex, 1);
    masterEffectsChainState.splice(newIndex, 0, moved);
    appServices.reorderMasterEffectInAudio?.();
    appServices.updateMasterEffectsUI?.();
}

// Removed export
async function addTrackToStateInternal(type) {
    const newTrackId = trackIdCounter++;
    // Assumes Track is now global
    const track = new Track(newTrackId, type, null, appServices);
    tracks.push(track);
    // --- DEBUGGING LOG ---
    console.log(`%c[state.js] Track added. Total tracks: ${tracks.length}`, 'color: #2ecc71; font-weight: bold;');
    
    await track.initializeInstrument();
    appServices.updateMixerWindow?.();
    appServices.renderTimeline?.();
    captureStateForUndoInternal(`Add ${type} Track`);
    return track;
}

// Removed export
function removeTrackFromStateInternal(trackId) {
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

// Removed export
function addFileToSoundLibraryInternal(fileName, fileBlob) {
    console.log(`Adding ${fileName} to sound library.`);
    const dbKey = `imports/${fileName}-${fileBlob.size}-${Date.now()}`;
    // Assumes storeAudio is now global
    return storeAudio(dbKey, fileBlob);
}

// Removed export
function captureStateForUndoInternal(actionDescription) {
    if (isReconstructingDAW) return;
    const state = gatherProjectDataInternal();
    undoStack.push({ state, actionDescription });
    if (undoStack.length > MAX_UNDO_HISTORY) {
        undoStack.shift();
    }
    redoStack = [];
}

// Removed export
function undoLastActionInternal() {
    if (undoStack.length > 0) {
        const lastState = undoStack.pop();
        const currentState = gatherProjectDataInternal();
        redoStack.push({ state: currentState, actionDescription: lastState.actionDescription });
        reconstructDAWInternal(lastState.state);
    }
}

// Removed export
function redoLastActionInternal() {
    if (redoStack.length > 0) {
        const nextState = redoStack.pop();
        const currentState = gatherProjectDataInternal();
        undoStack.push({ state: currentState, actionDescription: nextState.actionDescription });
        reconstructDAWInternal(nextState.state);
    }
}

// Removed export
function gatherProjectDataInternal() {
    return {
        tracks: tracks.map(t => t.serialize()),
        masterEffects: masterEffectsChainState,
        masterVolume: masterGainValueState,
        tempo: Tone.Transport.bpm.value,
        version: APP_VERSION, // Assumes APP_VERSION is global
    };
}

// Removed export
async function reconstructDAWInternal(projectData) {
    setIsReconstructingDAWState(true);

    try {
        tracks.forEach(t => t.dispose());
        tracks = [];
        trackIdCounter = 0;
        let maxId = 0;

        if (projectData && projectData.tracks && Array.isArray(projectData.tracks)) {
            for (const trackData of projectData.tracks) {
                if (!trackData || !trackData.type) {
                    console.warn("Skipping invalid track data during reconstruction:", trackData);
                    continue;
                }
                // Assumes Track is global
                const newTrack = new Track(trackData.id, trackData.type, trackData, appServices);
                tracks.push(newTrack);
                if (trackData.id > maxId) {
                    maxId = trackData.id;
                }
            }
        }
        trackIdCounter = maxId + 1;

        for (const track of tracks) {
            await track.initializeInstrument();
        }

        setMasterGainValueState(projectData?.masterVolume ?? 1.0);
        Tone.Transport.bpm.value = projectData?.tempo ?? 120;
        masterEffectsChainState = projectData?.masterEffects || [];
        appServices.rebuildMasterEffectChain?.();

    } catch (error) {
        console.error("Critical error during project reconstruction:", error);
        // Assumes showNotification is global
        showNotification("Failed to load project due to an error.", 5000);
    } finally {
        appServices.updateMixerWindow?.();
        // appServices.renderTimeline?.(); // Removed due to timeline removal
        setIsReconstructingDAWState(false);
    }
}

// Removed export
function saveProjectInternal() {
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

// Removed export
function loadProjectInternal(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const projectData = JSON.parse(e.target.result);
            reconstructDAWInternal(projectData);
        } catch (error) {
            // Assumes showNotification is global
            showNotification("Error: Could not parse project file.", 3000);
            console.error("Project file parsing error:", error);
        }
    };
    reader.readAsText(file);
}

// Removed export
async function handleProjectFileLoadInternal(event) {
    const file = event.target.files[0];
    if (file) {
        loadProjectInternal(file);
    }
}

// Removed export
async function exportToWavInternal() {
    try {
        appServices.initAudioContextAndMasterMeter?.(true);
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
            document.body.appendChild(anchor);
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
