// js/state.js - Application State Management (Improved)
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog } from './utils.js';
import { Track } from './Track.js';
import { createEffectInstance } from './effectsRegistry.js';
import {
    rebuildMasterEffectChain as audioRebuildMasterEffectChain,
    addMasterEffect as audioAddMasterEffectToChain,
    initAudioContextAndMasterMeter as audioInitAudioContextAndMasterMeter
} from './audio.js';
import { getAudio } from './db.js';

// --- Centralized Global-like State Variables ---
let _tracks = [];
let _trackIdCounter = 0;
let _activeSequencerTrackId = null;
let _soloedTrackId = null;
let _armedTrackId = null;
let _isRecordingGlobal = false;
let _recordingTrackIdGlobal = null;
let _recordingStartTime = 0;

let _undoStack = [];
let _redoStack = [];

// Window and UI states (previously on window object)
let _openWindows = {};
let _highestZIndex = 100;
let _isReconstructingDAW = false; // Flag to manage reconstruction process

// Audio-related states (previously on window object)
let _masterEffectsChain = [];
let _masterGainNodeValue = Tone.dbToGain(0); // Storing the value, not the node itself here
let _activeMIDIInput = null; // Stores the active MIDIInput object
let _midiAccess = null; // Stores the MIDIAccess object

// Sound browser states (previously on window object)
let _loadedZipFiles = {};
let _soundLibraryFileTrees = {};
let _currentLibraryName = null;
let _currentSoundFileTree = null;
let _currentSoundBrowserPath = [];
let _previewPlayer = null; // Tone.Player instance for preview

// Clipboard state (previously on window object)
let _clipboardData = { type: null, data: null, sourceTrackType: null, sequenceLength: null };


// --- AppServices Placeholder ---
let appServices = {
    // UI functions
    openTrackInspectorWindow: () => {},
    updateMixerWindow: () => {},
    openGlobalControlsWindow: () => {},
    openTrackEffectsRackWindow: () => {},
    openTrackSequencerWindow: () => {},
    openSoundBrowserWindow: () => {},
    openMasterEffectsRackWindow: () => {},
    selectMIDIInput: () => {},
    updateUndoRedoButtonsUI: () => {},
    closeAllTrackWindows: (trackId) => {},
    updateTrackUI: (trackId, reason, detail) => {},
    highlightPlayingStep: (trackId, step) => {},
    // Audio functions
    autoSliceSample: (trackId) => {},
    // DOM Cache (will be populated by main.js)
    domCache: {},
    // Global state accessors (will be populated by this module)
    // ...getters and setters for the _variables above...
};

export function initializeStateModule(services) {
    appServices = { ...appServices, ...services };
    // Populate appServices with getters/setters for the new centralized state
    appServices.getOpenWindows = getOpenWindows;
    appServices.addWindowToStore = addWindowToStore;
    appServices.removeWindowFromStore = removeWindowFromStore;
    appServices.getHighestZIndex = getHighestZIndex;
    appServices.incrementHighestZIndex = incrementHighestZIndex;
    appServices.getIsReconstructingDAW = getIsReconstructingDAW;
    appServices.setIsReconstructingDAW = setIsReconstructingDAW;
    appServices.getMasterEffectsChain = getMasterEffectsChain;
    appServices.setMasterEffectsChain = setMasterEffectsChain;
    appServices.getActiveMIDIInput = getActiveMIDIInput;
    appServices.setActiveMIDIInput = setActiveMIDIInput;
    appServices.getMidiAccess = getMidiAccess;
    appServices.setMidiAccess = setMidiAccess;
    appServices.getLoadedZipFiles = getLoadedZipFiles;
    appServices.getSoundLibraryFileTrees = getSoundLibraryFileTrees;
    appServices.getCurrentLibraryName = getCurrentLibraryName;
    appServices.setCurrentLibraryName = setCurrentLibraryName;
    appServices.getCurrentSoundFileTree = getCurrentSoundFileTree;
    appServices.setCurrentSoundFileTree = setCurrentSoundFileTree;
    appServices.getCurrentSoundBrowserPath = getCurrentSoundBrowserPath;
    appServices.getPreviewPlayer = getPreviewPlayer;
    appServices.setPreviewPlayer = setPreviewPlayer;
    appServices.getClipboardData = getClipboardData;
    appServices.setClipboardData = setClipboardData;
    appServices.getMasterGainNodeValue = getMasterGainNodeValue;
    appServices.setMasterGainNodeValue = setMasterGainNodeValue;


    console.log('[State] initializeStateModule: _armedTrackId is initially:', _armedTrackId);
}

// --- Getters for Centralized State ---
export function getTracks() { return _tracks; }
export function getTrackById(id) { return _tracks.find(t => t.id === id); }
export function getArmedTrackId() { return _armedTrackId; }
export function getSoloedTrackId() { return _soloedTrackId; }
export function isTrackRecording() { return _isRecordingGlobal; }
export function getRecordingTrackId() { return _recordingTrackIdGlobal; }
export function getActiveSequencerTrackId() { return _activeSequencerTrackId; }
export function getUndoStack() { return _undoStack; }
export function getRedoStack() { return _redoStack; }

// Window and UI state getters/setters
export function getOpenWindows() { return _openWindows; }
export function addWindowToStore(id, instance) { _openWindows[id] = instance; }
export function removeWindowFromStore(id) { delete _openWindows[id]; }
export function getHighestZIndex() { return _highestZIndex; }
export function incrementHighestZIndex() { return ++_highestZIndex; }
export function setHighestZIndex(val) { _highestZIndex = val; } // Added for project load
export function getIsReconstructingDAW() { return _isReconstructingDAW; }
export function setIsReconstructingDAW(value) { _isReconstructingDAW = value; }

// Audio-related state getters/setters
export function getMasterEffectsChain() { return _masterEffectsChain; }
export function setMasterEffectsChain(chain) { _masterEffectsChain = chain; }
export function getActiveMIDIInput() { return _activeMIDIInput; }
export function setActiveMIDIInput(input) { _activeMIDIInput = input; }
export function getMidiAccess() { return _midiAccess; }
export function setMidiAccess(access) { _midiAccess = access; }
export function getMasterGainNodeValue() { return _masterGainNodeValue; }
export function setMasterGainNodeValue(value) { _masterGainNodeValue = value; }


// Sound browser state getters/setters
export function getLoadedZipFiles() { return _loadedZipFiles; }
// No direct setter for loadedZipFiles, managed by audio.js fetchSoundLibrary
export function getSoundLibraryFileTrees() { return _soundLibraryFileTrees; }
// No direct setter for soundLibraryFileTrees, managed by audio.js fetchSoundLibrary
export function getCurrentLibraryName() { return _currentLibraryName; }
export function setCurrentLibraryName(name) { _currentLibraryName = name; }
export function getCurrentSoundFileTree() { return _currentSoundFileTree; }
export function setCurrentSoundFileTree(tree) { _currentSoundFileTree = tree; }
export function getCurrentSoundBrowserPath() { return _currentSoundBrowserPath; }
// No direct setter for currentSoundBrowserPath, managed by ui.js renderSoundBrowserDirectory
export function getPreviewPlayer() { return _previewPlayer; }
export function setPreviewPlayer(player) { _previewPlayer = player; }

// Clipboard state getters/setters
export function getClipboardData() { return _clipboardData; }
export function setClipboardData(data) { _clipboardData = data; }


// --- Setters for Internal State (used by this module or via appServices) ---
export function setArmedTrackId(id) {
    console.log('[State DEBUG] setArmedTrackId() CALLED with id:', id, '. Current _armedTrackId was:', _armedTrackId);
    _armedTrackId = id;
    console.log('[State DEBUG] _armedTrackId is NOW:', _armedTrackId);
}
export function setSoloedTrackId(id) { _soloedTrackId = id; }
export function setIsRecording(status) { _isRecordingGlobal = status; }
export function setRecordingTrackId(id) { _recordingTrackIdGlobal = id; }
export function setRecordingStartTime(time) { _recordingStartTime = time; }
export function setActiveSequencerTrackId(id) { _activeSequencerTrackId = id; }


// --- Helper functions for gatherProjectData and reconstructDAW ---
function _gatherGlobalSettings() {
    return {
        tempo: Tone.Transport.bpm.value,
        masterVolume: getMasterGainNodeValue(), // Use getter
        activeMIDIInputId: getActiveMIDIInput() ? getActiveMIDIInput().id : null, // Use getter
        soloedTrackId: _soloedTrackId,
        armedTrackId: _armedTrackId,
        highestZIndex: getHighestZIndex(), // Use getter
    };
}

function _gatherMasterEffects() {
    return getMasterEffectsChain().map(effect => ({ // Use getter
        id: effect.id,
        type: effect.type,
        params: JSON.parse(JSON.stringify(effect.params))
    }));
}

function _gatherTrackData(track) {
    const trackData = {
        id: track.id, type: track.type, name: track.name,
        isMuted: track.isMuted,
        volume: track.previousVolumeBeforeMute,
        activeEffects: track.activeEffects.map(effect => ({
            id: effect.id,
            type: effect.type,
            params: JSON.parse(JSON.stringify(effect.params))
        })),
        sequenceLength: track.sequenceLength,
        sequenceData: JSON.parse(JSON.stringify(track.sequenceData)),
        automation: JSON.parse(JSON.stringify(track.automation)),
        selectedSliceForEdit: track.selectedSliceForEdit,
        waveformZoom: track.waveformZoom,
        waveformScrollOffset: track.waveformScrollOffset,
        slicerIsPolyphonic: track.slicerIsPolyphonic,
        selectedDrumPadForEdit: track.selectedDrumPadForEdit,
        instrumentSamplerIsPolyphonic: track.instrumentSamplerIsPolyphonic,
    };
    if (track.type === 'Synth') {
        trackData.synthEngineType = track.synthEngineType || 'MonoSynth';
        trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams));
    } else if (track.type === 'Sampler') {
        trackData.samplerAudioData = {
            fileName: track.samplerAudioData.fileName,
            dbKey: track.samplerAudioData.dbKey,
            status: track.samplerAudioData.dbKey ? 'missing_db' : (track.samplerAudioData.fileName ? 'missing' : 'empty')
        };
        trackData.slices = JSON.parse(JSON.stringify(track.slices));
    } else if (track.type === 'DrumSampler') {
        trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({
            originalFileName: p.originalFileName,
            dbKey: p.dbKey,
            volume: p.volume,
            pitchShift: p.pitchShift,
            envelope: JSON.parse(JSON.stringify(p.envelope)),
            status: p.dbKey ? 'missing_db' : (p.originalFileName ? 'missing' : 'empty')
        }));
    } else if (track.type === 'InstrumentSampler') {
        trackData.instrumentSamplerSettings = {
            originalFileName: track.instrumentSamplerSettings.originalFileName,
            dbKey: track.instrumentSamplerSettings.dbKey,
            rootNote: track.instrumentSamplerSettings.rootNote,
            loop: track.instrumentSamplerSettings.loop,
            loopStart: track.instrumentSamplerSettings.loopStart,
            loopEnd: track.instrumentSamplerSettings.loopEnd,
            envelope: JSON.parse(JSON.stringify(track.instrumentSamplerSettings.envelope)),
            status: track.instrumentSamplerSettings.dbKey ? 'missing_db' : (track.instrumentSamplerSettings.originalFileName ? 'missing' : 'empty')
        };
    }
    return trackData;
}

function _gatherWindowStates() {
    return Object.values(getOpenWindows()).map(win => { // Use getter
        if (!win || !win.element) return null;
        return {
            id: win.id, title: win.title,
            left: win.element.style.left, top: win.element.style.top,
            width: win.element.style.width, height: win.element.style.height,
            zIndex: parseInt(win.element.style.zIndex),
            isMinimized: win.isMinimized,
            initialContentKey: win.initialContentKey
        };
    }).filter(ws => ws !== null);
}

async function _reconstructGlobalSettings(settings) {
    if (settings) {
        Tone.Transport.bpm.value = settings.tempo || 120;
        setMasterGainNodeValue(settings.masterVolume ?? Tone.dbToGain(0)); // Use setter
        // Actual masterGainNode is in audio.js, this just stores the value for persistence
        if (window.masterGainNode?.gain) { // Check if audio.js has initialized it
             window.masterGainNode.gain.value = getMasterGainNodeValue();
        }

        if (appServices.updateTaskbarTempoDisplay) appServices.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        setHighestZIndex(settings.highestZIndex || 100); // Use setter

        console.log("[State DEBUG] Attempting to set _armedTrackId from projectData.globalSettings.armedTrackId:", settings.armedTrackId);
        setArmedTrackId(settings.armedTrackId || null);
        setSoloedTrackId(settings.soloedTrackId || null);

        // Select MIDI input if specified
        if (settings.activeMIDIInputId && appServices.selectMIDIInput) {
            appServices.selectMIDIInput(settings.activeMIDIInputId, true); // true to skip notification
        }
    } else {
        console.warn("[State DEBUG] projectData.globalSettings is undefined during _reconstructGlobalSettings.");
    }
}

async function _reconstructMasterEffects(effectsData) {
    const currentMasterEffects = getMasterEffectsChain();
    currentMasterEffects.forEach(effect => {
        if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose();
    });
    setMasterEffectsChain([]); // Use setter

    if (effectsData && Array.isArray(effectsData)) {
        effectsData.forEach(effectData => {
            // audioAddMasterEffectToChain is in audio.js, called via appServices
            if (appServices.addMasterEffect) { // Assuming addMasterEffect is the service name
                appServices.addMasterEffect(effectData.type, effectData.params);
            }
        });
        if (appServices.rebuildMasterEffectChain) { // Assuming this service exists
            appServices.rebuildMasterEffectChain();
        }
    }
}

async function _reconstructTracks(tracksData) {
    _tracks.forEach(track => track.dispose());
    _tracks = [];
    _trackIdCounter = 0;

    const trackPromises = (tracksData || []).map(trackData => addTrackToState(trackData.type, trackData, false));
    await Promise.all(trackPromises);

    // Apply solo state to all tracks based on the now-loaded _soloedTrackId
    _tracks.forEach(t => {
        t.isSoloed = (t.id === _soloedTrackId);
        t.applySoloState();
    });
}

function _reconstructWindowStates(windowStatesData) {
    if (appServices.closeAllWindows) {
        appServices.closeAllWindows(true); // true for silent/reconstruction close
    }
    _openWindows = {}; // Reset internal store

    if (windowStatesData) {
        const sortedWindowStates = windowStatesData.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        for (const winState of sortedWindowStates) {
            if (!winState || !winState.id) continue;
            const key = winState.initialContentKey || winState.id;

            // Use appServices to open windows
            if (key === 'globalControls' && appServices.openGlobalControlsWindow) appServices.openGlobalControlsWindow(null, winState);
            else if (key === 'mixer' && appServices.openMixerWindow) appServices.openMixerWindow(winState);
            else if (key === 'soundBrowser' && appServices.openSoundBrowserWindow) appServices.openSoundBrowserWindow(winState);
            else if (key === 'masterEffectsRack' && appServices.openMasterEffectsRackWindow) appServices.openMasterEffectsRackWindow(winState);
            else if (key.startsWith('trackInspector-') && appServices.openTrackInspectorWindow) {
                const trackIdNum = parseInt(key.split('-')[1]);
                if (!isNaN(trackIdNum) && getTrackById(trackIdNum)) appServices.openTrackInspectorWindow(trackIdNum, winState);
            } else if (key.startsWith('effectsRack-') && appServices.openTrackEffectsRackWindow) {
                const trackIdNum = parseInt(key.split('-')[1]);
                if (!isNaN(trackIdNum) && getTrackById(trackIdNum)) appServices.openTrackEffectsRackWindow(trackIdNum, winState);
            } else if (key.startsWith('sequencerWin-') && appServices.openTrackSequencerWindow) {
                const trackIdNum = parseInt(key.split('-')[1]);
                if (!isNaN(trackIdNum) && getTrackById(trackIdNum)) appServices.openTrackSequencerWindow(trackIdNum, true, winState);
            }
        }
    }
}


// --- Track Management ---
export async function addTrackToState(type, initialData = null, isUserAction = true) {
    const isBrandNewUserTrack = isUserAction && (!initialData || initialData._isUserActionPlaceholder);

    if (isBrandNewUserTrack) {
        captureStateForUndo(`Add ${type} Track`);
        if (initialData && initialData._isUserActionPlaceholder) initialData = null;
    }

    let newTrackId;
    if (initialData && initialData.id != null) {
        newTrackId = initialData.id;
        if (newTrackId >= _trackIdCounter) _trackIdCounter = newTrackId + 1;
    } else {
        newTrackId = _trackIdCounter++;
    }

    const trackAppServices = {
        getSoloedTrackId, // Direct access to local getter
        captureStateForUndo, // Direct access
        updateTrackUI: appServices.updateTrackUI,
        highlightPlayingStep: appServices.highlightPlayingStep,
        autoSliceSample: appServices.autoSliceSample,
        closeTrackWindows: appServices.closeAllTrackWindows,
    };
    const newTrack = new Track(newTrackId, type, initialData, trackAppServices);
    _tracks.push(newTrack);

    if (typeof newTrack.initializeAudioNodes === 'function') {
        await newTrack.initializeAudioNodes();
    }

    try {
        await newTrack.fullyInitializeAudioResources();
        console.log(`[State] Audio resources initialized for track ${newTrack.id} (${newTrack.name}).`);
        if (isBrandNewUserTrack) {
            showNotification(`${newTrack.name} added.`, 2000);
            if (appServices.openTrackInspectorWindow) {
                appServices.openTrackInspectorWindow(newTrack.id);
            }
        }
        if (appServices.updateMixerWindow) {
            appServices.updateMixerWindow();
        }
    } catch (error) {
        console.error(`[State] Error in fullyInitializeAudioResources for track ${newTrack.id}:`, error);
        showNotification(`Error fully setting up ${type} track "${newTrack.name}".`, 5000);
        if (isBrandNewUserTrack && appServices.openTrackInspectorWindow) {
            appServices.openTrackInspectorWindow(newTrack.id);
        }
        if (appServices.updateMixerWindow) {
            appServices.updateMixerWindow();
        }
    }
    return newTrack;
}

export function removeTrackFromState(trackId) {
    const trackIndex = _tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;

    const track = _tracks[trackIndex];
    captureStateForUndo(`Remove Track "${track.name}"`);

    track.dispose();
    _tracks.splice(trackIndex, 1);

    if (_armedTrackId === trackId) {
        setArmedTrackId(null);
    }
    if (_soloedTrackId === trackId) {
        setSoloedTrackId(null);
        _tracks.forEach(t => {
            t.isSoloed = false;
            t.applySoloState();
        });
    }
    if (_activeSequencerTrackId === trackId) setActiveSequencerTrackId(null);

    showNotification(`Track "${track.name}" removed.`, 2000);
    if (appServices.updateMixerWindow) appServices.updateMixerWindow();
    if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI();
}


// --- Undo/Redo Logic ---
function updateInternalUndoRedoState() {
    if (appServices.updateUndoRedoButtonsUI) {
        appServices.updateUndoRedoButtonsUI(_undoStack.length > 0 ? _undoStack[_undoStack.length - 1] : null, _redoStack.length > 0 ? _redoStack[_redoStack.length - 1] : null);
    }
}

export function captureStateForUndo(description = "Unknown action") {
    if (getIsReconstructingDAW()) { // Use getter
        console.log("[State] Skipping undo capture during DAW reconstruction.");
        return;
    }
    console.log("[State] Capturing state for undo:", description);
    try {
        const currentState = gatherProjectData(); // This will now use centralized state getters
        currentState.description = description;
        _undoStack.push(JSON.parse(JSON.stringify(currentState))); // Use internal _undoStack
        if (_undoStack.length > Constants.MAX_HISTORY_STATES) {
            _undoStack.shift();
        }
        _redoStack = []; // Use internal _redoStack
        updateInternalUndoRedoState();
    } catch (error) {
        console.error("[State] Error capturing state for undo:", error);
        showNotification("Error capturing undo state. See console for details.", 3000);
    }
}

export async function undoLastAction() {
    if (_undoStack.length === 0) {
        showNotification("Nothing to undo.", 1500);
        return;
    }
    try {
        const stateToRestore = _undoStack.pop();
        const currentStateForRedo = gatherProjectData();
        currentStateForRedo.description = stateToRestore.description;
        _redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo)));
        if (_redoStack.length > Constants.MAX_HISTORY_STATES) {
            _redoStack.shift();
        }

        showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        setIsReconstructingDAW(true); // Use setter
        await reconstructDAW(stateToRestore, true);
        setIsReconstructingDAW(false); // Use setter
        updateInternalUndoRedoState();
    } catch (error) {
        setIsReconstructingDAW(false); // Use setter
        console.error("[State] Error during undo:", error);
        showNotification("Error during undo operation. Project may be unstable.", 4000);
        updateInternalUndoRedoState();
    }
}

export async function redoLastAction() {
    if (_redoStack.length === 0) {
        showNotification("Nothing to redo.", 1500);
        return;
    }
    try {
        const stateToRestore = _redoStack.pop();
        const currentStateForUndo = gatherProjectData();
        currentStateForUndo.description = stateToRestore.description;
        _undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo)));
        if (_undoStack.length > Constants.MAX_HISTORY_STATES) {
            _undoStack.shift();
        }

        showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
        setIsReconstructingDAW(true); // Use setter
        await reconstructDAW(stateToRestore, true);
        setIsReconstructingDAW(false); // Use setter
        updateInternalUndoRedoState();
    } catch (error) {
        setIsReconstructingDAW(false); // Use setter
        console.error("[State] Error during redo:", error);
        showNotification("Error during redo operation. Project may be unstable.", 4000);
        updateInternalUndoRedoState();
    }
}


// --- Project Data Handling ---
export function gatherProjectData() {
    const projectData = {
        version: "5.7.1", // Incremented version due to state management changes
        globalSettings: _gatherGlobalSettings(),
        masterEffects: _gatherMasterEffects(),
        tracks: _tracks.map(track => _gatherTrackData(track)),
        windowStates: _gatherWindowStates()
    };
    return projectData;
}

export async function reconstructDAW(projectData, isUndoRedo = false) {
    setIsReconstructingDAW(true); // Use setter
    console.log("[State] Starting DAW Reconstruction. Is Undo/Redo:", isUndoRedo);
    console.log("[State DEBUG] _armedTrackId at START of reconstructDAW:", _armedTrackId);

    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel();

    await audioInitAudioContextAndMasterMeter(true); // Ensures audio context is ready

    // Reset core states before applying loaded data
    console.log("[State DEBUG] Resetting _armedTrackId, _soloedTrackId, etc. before loading from project data.");
    setArmedTrackId(null);
    setSoloedTrackId(null);
    setActiveSequencerTrackId(null);
    setIsRecording(false);
    setRecordingTrackId(null);
    setMasterEffectsChain([]); // Clear master effects
    _openWindows = {}; // Clear open windows store
    setHighestZIndex(100); // Reset Z-index counter

    if (appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(false);

    // Reconstruct parts
    await _reconstructGlobalSettings(projectData.globalSettings);
    await _reconstructMasterEffects(projectData.masterEffects); // Must happen after global settings for master volume
    await _reconstructTracks(projectData.tracks); // Must happen after global for armed/soloed
    _reconstructWindowStates(projectData.windowStates); // Must happen after tracks for track-specific windows

    // Final audio resource initialization for all tracks
    const resourcePromises = _tracks.map(track => track.fullyInitializeAudioResources());
    await Promise.all(resourcePromises);

    if(appServices.updateMixerWindow) appServices.updateMixerWindow();
    updateInternalUndoRedoState();
    setIsReconstructingDAW(false); // Use setter
    if (!isUndoRedo) showNotification(`Project loaded successfully.`, 3500);
    console.log("[State DEBUG] _armedTrackId at END of reconstructDAW:", _armedTrackId);
    console.log("[State] DAW Reconstructed successfully.");
}


export function saveProject() {
    try {
        const projectData = gatherProjectData();
        const jsonString = JSON.stringify(projectData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `snugos-project-${timestamp}.snug`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification(`Project saved as ${a.download}`, 2000);
    } catch (error) {
        console.error("[State] Error saving project:", error);
        showNotification("Error saving project. See console for details.", 4000);
    }
}

export function loadProject() {
    const loadProjectInputEl = appServices.domCache?.loadProjectInput || document.getElementById('loadProjectInput');
    if (loadProjectInputEl) loadProjectInputEl.click();
    else {
        console.error("[State] Load project input element not found.");
        showNotification("Error: File input for loading project not found.", 3000);
    }
}

export async function handleProjectFileLoad(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.snug')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                _undoStack = []; // Clear undo/redo stacks for a new project
                _redoStack = [];
                await reconstructDAW(projectData, false); // false as it's not an undo/redo
                // Capture initial state of loaded project for undo
                captureStateForUndo("Load Project");
            } catch (error) {
                console.error("[State] Error loading project from file:", error);
                showNotification(`Error loading project: ${error.message}. File might be corrupt or invalid.`, 5000);
            }
        };
        reader.onerror = (err) => {
            console.error("[State] FileReader error:", err);
            showNotification("Error reading project file.", 3000);
        };
        reader.readAsText(file);
    } else if (file) {
        showNotification("Invalid file type. Please select a .snug project file.", 3000);
    }
    if (event.target) event.target.value = null; // Reset file input
}

export async function exportToWav() {
    showNotification("Preparing export...", 3000);
    try {
        const audioReady = await audioInitAudioContextAndMasterMeter(true);
        if (!audioReady) {
            showNotification("Audio system not ready for export.", 4000);
            return;
        }

        if (Tone.Transport.state === 'started') {
            Tone.Transport.stop();
            await new Promise(resolve => setTimeout(resolve, 200)); // Wait for stop to process
        }
        Tone.Transport.position = 0; // Reset transport position
        let maxDuration = 0;
        _tracks.forEach(track => {
            if (track.sequence && track.sequenceLength > 0) {
                const sixteenthNoteTime = Tone.Time("16n").toSeconds();
                const trackDuration = track.sequenceLength * sixteenthNoteTime;
                if (trackDuration > maxDuration) maxDuration = trackDuration;
            }
        });
        if (maxDuration === 0) maxDuration = 5; // Default duration if no sequence
        maxDuration += 1; // Add a bit of tail

        const recorder = new Tone.Recorder();
        // Ensure masterGainNode is used if available (from audio.js, potentially on window)
        const recordSource = (window.masterGainNode && !window.masterGainNode.disposed)
                           ? window.masterGainNode
                           : Tone.getDestination();
        recordSource.connect(recorder);

        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)...`, Math.max(3000, maxDuration * 1000 + 1000));

        recorder.start();
        Tone.Transport.start("+0.1", 0); // Start transport slightly ahead

        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000));

        const recording = await recorder.stop();
        Tone.Transport.stop(); // Ensure transport is stopped

        recorder.dispose();

        const url = URL.createObjectURL(recording);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `snugos-export-${timestamp}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification("Export to WAV successful!", 3000);

    } catch (error) {
        console.error("[State] Error exporting WAV:", error);
        showNotification(`Error exporting WAV: ${error.message}`, 5000);
    }
}
