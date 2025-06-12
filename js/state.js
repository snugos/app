// js/state.js - Application State Management

// --- Centralized State Variables ---
let tracks = [];
let trackIdCounter = 0;

let openWindowsMap = new Map();
let highestZ = 100;

let masterEffectsChainState = [];
// NOTE: Initialized to 1 directly. This is equivalent to Tone.dbToGain(0)
// and removes the dependency on the Tone object being ready at load time.
let masterGainValueState = 1; 

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

let appServices = {};

// --- State Initialization and Accessors ---

function initializeStateModule(appServicesFromMain) {
    appServices = appServicesFromMain;
}

function getMidiRecordModeState() { return midiRecordMode; }
function setMidiRecordModeState(mode) {
    if (mode === 'overdub' || mode === 'replace') {
        midiRecordMode = mode;
    }
}
function getTracksState() { return tracks; }
function getTrackByIdState(id) { return tracks.find(t => t.id === id); }
function getOpenWindowsState() { return openWindowsMap; }
function getWindowByIdState(id) { return openWindowsMap.get(id); }
function getHighestZState() { return highestZ; }
function setHighestZState(z) { highestZ = z; }
function incrementHighestZState() { return ++highestZ; }
function addWindowToStoreState(id, windowInstance) { openWindowsMap.set(id, windowInstance); }
function removeWindowFromStoreState(id) { openWindowsMap.delete(id); }
function getMidiAccessState() { return midiAccessGlobal; }
function setMidiAccessState(access) { midiAccessGlobal = access; }
function getActiveMIDIInputState() { return activeMIDIInputGlobal; }
function setActiveMIDIInputState(input) { activeMIDIInputGlobal = input; }
function getSoloedTrackIdState() { return soloedTrackId; }
function setSoloedTrackIdState(id) { soloedTrackId = id; }
function getArmedTrackIdState() { return armedTrackId; }
function setArmedTrackIdState(id) { armedTrackId = id; }
function isTrackRecordingState() { return isRecordingGlobal; }
function setIsRecordingState(isRecording) { isRecordingGlobal = isRecording; }
function getRecordingTrackIdState() { return recordingTrackIdGlobal; }
function setRecordingTrackIdState(id) { recordingTrackIdGlobal = id; }
function getRecordingStartTimeState() { return recordingStartTimeGlobal; }
function setRecordingStartTimeState(time) { recordingStartTimeGlobal = time; }
function getPlaybackModeState() { return playbackMode; }
function setPlaybackModeState(mode) {
    if (mode === 'piano-roll' || mode === 'timeline') {
        const oldMode = playbackMode;
        playbackMode = mode;
        appServices.onPlaybackModeChange?.(mode, oldMode);
    }
}
function getIsReconstructingDAWState() { return isReconstructingDAW; }
function setIsReconstructingDAWState(isReconstructing) { isReconstructingDAW = isReconstructing; }
function getUndoStackState() { return undoStack; }
function getRedoStackState() { return redoStack; }
function getLoadedZipFilesState() { return loadedZipFilesGlobal; }
function setLoadedZipFilesState(name, zip, status) {
    if (!loadedZipFilesGlobal[name]) loadedZipFilesGlobal[name] = {};
    if (zip) loadedZipFilesGlobal[name].zip = zip;
    if (status) loadedZipFilesGlobal[name].status = status;
}
function getSoundLibraryFileTreesState() { return soundLibraryFileTreesGlobal; }
function setSoundLibraryFileTreesState(libraryName, tree) { soundLibraryFileTreesGlobal[libraryName] = tree; }
function getCurrentLibraryNameState() { return currentLibraryNameGlobal; }
function setCurrentLibraryNameState(name) { currentLibraryNameGlobal = name; }
function getCurrentSoundBrowserPathState() { return currentSoundBrowserPathGlobal; }
function setCurrentSoundBrowserPathState(path) { currentSoundBrowserPathGlobal = path; }
function getPreviewPlayerState() { return previewPlayerGlobal; }
function setPreviewPlayerState(player) { previewPlayerGlobal = player; }
function setSelectedTimelineClipInfoState(info) { selectedTimelineClipInfo = { ...selectedTimelineClipInfo, ...info }; }
function getCurrentUserThemePreferenceState() { return currentUserThemePreference; }
function setCurrentUserThemePreferenceState(theme) {
    currentUserThemePreference = theme;
    localStorage.setItem('snugos-theme', theme);
    appServices.applyUserThemePreference?.();
}
function getMasterGainValueState() { return masterGainValueState; }
function setMasterGainValueState(gain) {
    masterGainValueState = gain;
    appServices.setActualMasterVolume?.(gain);
}
function getMasterEffectsState() { return masterEffectsChainState; }
function addMasterEffectToState(effectType) {
    const defaultParams = getEffectDefaultParams(effectType);
    const effect = { id: `master-effect-${Date.now()}`, type: effectType, params: defaultParams };
    masterEffectsChainState.push(effect);
    appServices.addMasterEffectToAudio?.(effect);
    appServices.updateMasterEffectsUI?.();
}
function removeMasterEffectFromState(effectId) {
    const index = masterEffectsChainState.findIndex(e => e.id === effectId);
    if (index > -1) {
        masterEffectsChainState.splice(index, 1);
        appServices.removeMasterEffectFromAudio?.(effectId);
        appServices.updateMasterEffectsUI?.();
    }
}
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
function reorderMasterEffectInState(oldIndex, newIndex) {
    const [moved] = masterEffectsChainState.splice(oldIndex, 1);
    masterEffectsChainState.splice(newIndex, 0, moved);
    appServices.reorderMasterEffectInAudio?.();
    appServices.updateMasterEffectsUI?.();
}

async function addTrackToStateInternal(type) {
    const newTrackId = trackIdCounter++;
    const track = new Track(newTrackId, type, null, appServices);
    tracks.push(track);
    
    await track.initializeInstrument();
    appServices.updateMixerWindow?.();
    if (appServices.renderTimeline) appServices.renderTimeline();
    captureStateForUndoInternal(`Add ${type} Track`);
    return track;
}

function removeTrackFromStateInternal(trackId) {
    const index = tracks.findIndex(t => t.id === trackId);
    if (index > -1) {
        const trackName = tracks[index].name;
        captureStateForUndoInternal(`Remove Track: ${trackName}`);
        tracks[index].dispose();
        tracks.splice(index, 1);
        appServices.updateMixerWindow?.();
        if (appServices.renderTimeline) appServices.renderTimeline();
    }
}

function addFileToSoundLibraryInternal(fileName, fileBlob) {
    console.log(`Adding ${fileName} to sound library.`);
    const dbKey = `imports/${fileName}-${fileBlob.size}-${Date.now()}`;
    return storeAudio(dbKey, fileBlob);
}

function captureStateForUndoInternal(actionDescription) {
    if (isReconstructingDAW) return;
    const state = gatherProjectDataInternal();
    undoStack.push({ state, actionDescription });
    if (undoStack.length > MAX_UNDO_HISTORY) {
        undoStack.shift();
    }
    redoStack = [];
}

function undoLastActionInternal() {
    if (undoStack.length > 0) {
        const lastState = undoStack.pop();
        const currentState = gatherProjectDataInternal();
        redoStack.push({ state: currentState, actionDescription: lastState.actionDescription });
        reconstructDAWInternal(lastState.state);
    }
}

function redoLastActionInternal() {
    if (redoStack.length > 0) {
        const nextState = redoStack.pop();
        const currentState = gatherProjectDataInternal();
        undoStack.push({ state: currentState, actionDescription: nextState.actionDescription });
        reconstructDAWInternal(nextState.state);
    }
}

function gatherProjectDataInternal() {
    const APP_VERSION = "1.0"; // Define it here if not available globally
    return {
        tracks: tracks.map(t => t.serialize()),
        masterEffects: masterEffectsChainState,
        masterVolume: masterGainValueState,
        tempo: typeof Tone !== 'undefined' ? Tone.Transport.bpm.value : 120,
        version: APP_VERSION,
    };
}

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
        if (typeof Tone !== 'undefined') {
            Tone.Transport.bpm.value = projectData?.tempo ?? 120;
        }
        masterEffectsChainState = projectData?.masterEffects || [];
        appServices.rebuildMasterEffectChain?.();

    } catch (error) {
        console.error("Critical error during project reconstruction:", error);
        showNotification("Failed to load project due to an error.", 5000);
    } finally {
        appServices.updateMixerWindow?.();
        if (appServices.renderTimeline) appServices.renderTimeline();
        setIsReconstructingDAWState(false);
    }
}

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

function loadProjectInternal(file) {
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

async function handleProjectFileLoadInternal(event) {
    const file = event.target.files[0];
    if (file) {
        loadProjectInternal(file);
    }
}

async function exportToWavInternal() {
    try {
        appServices.initAudioContextAndMasterMeter?.(true);
        const recorder = new Tone.Recorder();
        Tone.getDestination().connect(recorder);

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
