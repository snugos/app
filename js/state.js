// js/state.js - Application State Management
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog } from './utils.js';
import { Track } from './Track.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js'; // Renamed to avoid conflict
import {
    rebuildMasterEffectChain as audioRebuildMasterEffectChain,
    addMasterEffectToAudio as audioAddMasterEffectToChain, // CORRECTED IMPORT
    removeMasterEffectFromAudio as audioRemoveMasterEffectFromChain,
    updateMasterEffectParamInAudio as audioUpdateMasterEffectParamInChain,
    reorderMasterEffectInAudio as audioReorderMasterEffectInChain,
    initAudioContextAndMasterMeter as audioInitAudioContextAndMasterMeter
} from './audio.js';
import { getAudio, storeAudio } from './db.js'; // Ensure storeAudio is imported if used directly by state (though likely via audio.js)

// --- Centralized State Variables ---
let tracks = [];
let trackIdCounter = 0;

// Window Management
let openWindowsMap = new Map();
let highestZ = 100;

// Master Audio Chain
let masterEffectsChainState = []; // Stores { id, type, params }
let masterGainValueState = Tone.dbToGain(0); // Stores the gain value, not the node

// MIDI State
let midiAccessGlobal = null;
let activeMIDIInputGlobal = null;

// Sound Browser State
let loadedZipFilesGlobal = {};
let soundLibraryFileTreesGlobal = {};
let currentLibraryNameGlobal = null;
let currentSoundFileTreeGlobal = null;
let currentSoundBrowserPathGlobal = [];
let previewPlayerGlobal = null; // This would be a Tone.Player instance, managed by audio.js but state might track its existence/URL

// Clipboard
let clipboardDataGlobal = { type: null, data: null, sourceTrackType: null, sequenceLength: null };

// Transport/Sequencing State
let activeSequencerTrackId = null;
let soloedTrackId = null;
let armedTrackId = null;
let isRecordingGlobal = false;
let recordingTrackIdGlobal = null;
let recordingStartTime = 0;

// Undo/Redo
let undoStack = [];
let redoStack = [];

// --- AppServices Placeholder (will be populated by main.js) ---
let appServices = {
    // This object will be filled by main.js with functions from other modules
    // and accessors for the state managed here.
};

export function initializeStateModule(services) {
    appServices = { ...appServices, ...services };
    if (!Array.isArray(masterEffectsChainState)) {
        masterEffectsChainState = [];
    }
    // console.log('[State] initializeStateModule: armedTrackId is initially:', armedTrackId);
}

// --- Getters for Centralized State ---
export function getTracksState() { return tracks; }
export function getTrackByIdState(id) { return tracks.find(t => t.id === id); }

export function getOpenWindowsState() { return openWindowsMap; }
export function getWindowByIdState(id) { return openWindowsMap.get(id); }
export function getHighestZState() { return highestZ; }

export function getMasterEffectsState() { return masterEffectsChainState; }
export function getMasterGainValueState() { return masterGainValueState; }

export function getMidiAccessState() { return midiAccessGlobal; }
export function getActiveMIDIInputState() { return activeMIDIInputGlobal; }

export function getLoadedZipFilesState() { return loadedZipFilesGlobal; }
export function getSoundLibraryFileTreesState() { return soundLibraryFileTreesGlobal; }
export function getCurrentLibraryNameState() { return currentLibraryNameGlobal; }
export function getCurrentSoundFileTreeState() { return currentSoundFileTreeGlobal; }
export function getCurrentSoundBrowserPathState() { return currentSoundBrowserPathGlobal; }
export function getPreviewPlayerState() { return previewPlayerGlobal; }

export function getClipboardDataState() { return clipboardDataGlobal; }

export function getArmedTrackIdState() { return armedTrackId; }
export function getSoloedTrackIdState() { return soloedTrackId; }
export function isTrackRecordingState() { return isRecordingGlobal; }
export function getRecordingTrackIdState() { return recordingTrackIdGlobal; }
export function getActiveSequencerTrackIdState() { return activeSequencerTrackId; }
export function getUndoStackState() { return undoStack; }
export function getRedoStackState() { return redoStack; }


// --- Setters for Centralized State (called internally or via appServices) ---
export function addWindowToStoreState(id, instance) { openWindowsMap.set(id, instance); }
export function removeWindowFromStoreState(id) { openWindowsMap.delete(id); }
export function setHighestZState(value) { highestZ = value; }
export function incrementHighestZState() { return ++highestZ; }

export function setMasterEffectsState(newChain) { masterEffectsChainState = newChain; }
export function setMasterGainValueState(value) { masterGainValueState = value; }

export function setMidiAccessState(access) { midiAccessGlobal = access; }
export function setActiveMIDIInputState(input) { activeMIDIInputGlobal = input; }

export function setLoadedZipFilesState(files) { loadedZipFilesGlobal = files; }
export function setSoundLibraryFileTreesState(trees) { soundLibraryFileTreesGlobal = trees; }
export function setCurrentLibraryNameState(name) { currentLibraryNameGlobal = name; }
export function setCurrentSoundFileTreeState(tree) { currentSoundFileTreeGlobal = tree; }
export function setCurrentSoundBrowserPathState(path) { currentSoundBrowserPathGlobal = path; }
export function setPreviewPlayerState(player) { previewPlayerGlobal = player; }

export function setClipboardDataState(data) { clipboardDataGlobal = data; }

export function setArmedTrackIdState(id) { armedTrackId = id; }
export function setSoloedTrackIdState(id) { soloedTrackId = id; }
export function setIsRecordingState(status) { isRecordingGlobal = status; }
export function setRecordingTrackIdState(id) { recordingTrackIdGlobal = id; }
export function setRecordingStartTimeState(time) { recordingStartTime = time; }
export function setActiveSequencerTrackIdState(id) { activeSequencerTrackId = id; }

// --- Track Management ---
export async function addTrackToStateInternal(type, initialData = null, isUserAction = true) {
    const isBrandNewUserTrack = isUserAction && (!initialData || initialData._isUserActionPlaceholder);

    if (isBrandNewUserTrack) {
        captureStateForUndoInternal(`Add ${type} Track`);
        if (initialData && initialData._isUserActionPlaceholder) initialData = null;
    }

    let newTrackId;
    if (initialData && initialData.id != null) {
        newTrackId = initialData.id;
        if (newTrackId >= trackIdCounter) trackIdCounter = newTrackId + 1;
    } else {
        newTrackId = trackIdCounter++;
    }

    const trackAppServices = {
        getSoloedTrackId: getSoloedTrackIdState,
        captureStateForUndo: captureStateForUndoInternal,
        updateTrackUI: appServices.updateTrackUI,
        highlightPlayingStep: appServices.highlightPlayingStep,
        autoSliceSample: appServices.autoSliceSample,
        closeTrackWindows: appServices.closeAllTrackWindows,
        getMasterEffectsBusInputNode: appServices.getMasterEffectsBusInputNode, // Pass this down
        showNotification: appServices.showNotification, // Pass for track-internal notifications
        effectsRegistryAccess: appServices.effectsRegistryAccess, // Pass for Track's addEffect
    };
    const newTrack = new Track(newTrackId, type, initialData, trackAppServices);
    tracks.push(newTrack);

    // Initialize audio nodes after track is added to the main array
    if (typeof newTrack.initializeAudioNodes === 'function') {
        await newTrack.initializeAudioNodes();
    }

    try {
        await newTrack.fullyInitializeAudioResources(); // This will load samples from DB etc.
        // console.log(`[State] Audio resources initialized for track ${newTrack.id} (${newTrack.name}).`);
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
        showNotification(`Error setting up ${type} track "${newTrack.name}": ${error.message}`, 5000);
        // Still open inspector even if some resources failed, to allow user to fix (e.g. re-link sample)
        if (isBrandNewUserTrack && appServices.openTrackInspectorWindow) {
            appServices.openTrackInspectorWindow(newTrack.id);
        }
        if (appServices.updateMixerWindow) {
            appServices.updateMixerWindow();
        }
    }
    return newTrack;
}

export function removeTrackFromStateInternal(trackId) {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;

    const track = tracks[trackIndex];
    captureStateForUndoInternal(`Remove Track "${track.name}"`);

    track.dispose(); // This should handle closing its windows via appServices.closeAllTrackWindows
    tracks.splice(trackIndex, 1);

    if (armedTrackId === trackId) setArmedTrackIdState(null);
    if (soloedTrackId === trackId) {
        setSoloedTrackIdState(null);
        // Re-evaluate solo states for all tracks
        tracks.forEach(t => {
            t.isSoloed = false; // Reset all
            t.applySoloState(); // Will unmute if no other track is soloed
            if (appServices.updateTrackUI) appServices.updateTrackUI(t.id, 'soloChanged');
        });
    }
    if (activeSequencerTrackId === trackId) setActiveSequencerTrackIdState(null);

    showNotification(`Track "${track.name}" removed.`, 2000);
    if (appServices.updateMixerWindow) appServices.updateMixerWindow();
    if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI();
}


// --- Master Effects Chain Management ---
export function addMasterEffectToState(effectType, initialParamsFromAudio) {
    // This is called by appServices.addMasterEffect (in main.js) AFTER audio.js creates the ToneNode
    const effectId = `mastereffect_${effectType}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
    const defaultParams = appServices.effectsRegistryAccess?.getEffectDefaultParams
        ? appServices.effectsRegistryAccess.getEffectDefaultParams(effectType)
        : getEffectDefaultParamsFromRegistry(effectType);

    masterEffectsChainState.push({
        id: effectId,
        type: effectType,
        params: initialParamsFromAudio || defaultParams // Store serializable params
    });
    return effectId; // Return ID so audio.js can map its ToneNode if needed, or main.js can track
}

export function removeMasterEffectFromState(effectId) {
    const effectIndex = masterEffectsChainState.findIndex(e => e.id === effectId);
    if (effectIndex > -1) {
        masterEffectsChainState.splice(effectIndex, 1);
    }
}

export function updateMasterEffectParamInState(effectId, paramPath, value) {
    const effectWrapper = masterEffectsChainState.find(e => e.id === effectId);
    if (!effectWrapper) return;

    const keys = paramPath.split('.');
    let currentStoredParamLevel = effectWrapper.params;
    for (let i = 0; i < keys.length - 1; i++) {
        currentStoredParamLevel[keys[i]] = currentStoredParamLevel[keys[i]] || {};
        currentStoredParamLevel = currentStoredParamLevel[keys[i]];
    }
    currentStoredParamLevel[keys[keys.length - 1]] = value;
}

export function reorderMasterEffectInState(effectId, newIndex) {
    const oldIndex = masterEffectsChainState.findIndex(e => e.id === effectId);
    if (oldIndex === -1 || oldIndex === newIndex) return;
    const maxValidInsertIndex = masterEffectsChainState.length;
    const clampedNewIndex = Math.max(0, Math.min(newIndex, maxValidInsertIndex -1)); // Corrected for splice

    const [effectToMove] = masterEffectsChainState.splice(oldIndex, 1);
    masterEffectsChainState.splice(clampedNewIndex, 0, effectToMove);
}


// --- Undo/Redo Logic ---
function updateInternalUndoRedoState() {
    if (appServices.updateUndoRedoButtonsUI) {
        appServices.updateUndoRedoButtonsUI(
            undoStack.length > 0 ? undoStack[undoStack.length - 1] : null,
            redoStack.length > 0 ? redoStack[redoStack.length - 1] : null
        );
    }
}

export function captureStateForUndoInternal(description = "Unknown action") {
    // console.log("[State] Capturing state for undo:", description);
    try {
        const currentState = gatherProjectDataInternal(); // Use internal gatherer
        currentState.description = description; // Add description to the state object itself
        undoStack.push(JSON.parse(JSON.stringify(currentState))); // Deep copy
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }
        redoStack = []; // Clear redo stack on new action
        updateInternalUndoRedoState();
    } catch (error) {
        console.error("[State] Error capturing state for undo:", error);
        showNotification("Error capturing undo state. See console for details.", 3000);
    }
}

export async function undoLastActionInternal() {
    if (undoStack.length === 0) {
        showNotification("Nothing to undo.", 1500);
        return;
    }
    try {
        const stateToRestore = undoStack.pop();
        const currentStateForRedo = gatherProjectDataInternal();
        currentStateForRedo.description = stateToRestore.description; // Preserve description
        redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo))); // Deep copy
        if (redoStack.length > Constants.MAX_HISTORY_STATES) {
            redoStack.shift();
        }

        showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        appServices._isReconstructingDAW_flag = true;
        await reconstructDAWInternal(stateToRestore, true); // Pass isUndoRedo flag
        appServices._isReconstructingDAW_flag = false;
        updateInternalUndoRedoState();
    } catch (error) {
        appServices._isReconstructingDAW_flag = false;
        console.error("[State] Error during undo:", error);
        showNotification(`Error during undo operation: ${error.message}. Project may be unstable.`, 4000);
        updateInternalUndoRedoState(); // Still update UI for undo/redo buttons
    }
}

export async function redoLastActionInternal() {
    if (redoStack.length === 0) {
        showNotification("Nothing to redo.", 1500);
        return;
    }
    try {
        const stateToRestore = redoStack.pop();
        const currentStateForUndo = gatherProjectDataInternal();
        currentStateForUndo.description = stateToRestore.description; // Preserve description
        undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo))); // Deep copy
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }

        showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
        appServices._isReconstructingDAW_flag = true;
        await reconstructDAWInternal(stateToRestore, true); // Pass isUndoRedo flag
        appServices._isReconstructingDAW_flag = false;
        updateInternalUndoRedoState();
    } catch (error) {
        appServices._isReconstructingDAW_flag = false;
        console.error("[State] Error during redo:", error);
        showNotification(`Error during redo operation: ${error.message}. Project may be unstable.`, 4000);
        updateInternalUndoRedoState();
    }
}


// --- Project Data Handling ---
export function gatherProjectDataInternal() {
    const projectData = {
        version: "5.8.0", // Increment version for state structure changes
        globalSettings: {
            tempo: Tone.Transport.bpm.value,
            masterVolume: masterGainValueState, // Use stored value
            activeMIDIInputId: activeMIDIInputGlobal ? activeMIDIInputGlobal.id : null,
            soloedTrackId: soloedTrackId,
            armedTrackId: armedTrackId,
            highestZIndex: highestZ,
        },
        masterEffects: masterEffectsChainState.map(effect => ({ // Use stored state
            id: effect.id,
            type: effect.type,
            params: JSON.parse(JSON.stringify(effect.params))
        })),
        tracks: tracks.map(track => {
            const trackData = {
                id: track.id, type: track.type, name: track.name,
                isMuted: track.isMuted,
                volume: track.previousVolumeBeforeMute, // Storing this is important
                activeEffects: track.activeEffects.map(effect => ({
                    id: effect.id,
                    type: effect.type,
                    params: JSON.parse(JSON.stringify(effect.params)) // Stored params
                })),
                sequenceLength: track.sequenceLength,
                sequenceData: JSON.parse(JSON.stringify(track.sequenceData)),
                automation: JSON.parse(JSON.stringify(track.automation)), // If you implement automation
                // Sampler specific
                selectedSliceForEdit: track.selectedSliceForEdit,
                waveformZoom: track.waveformZoom,
                waveformScrollOffset: track.waveformScrollOffset,
                slicerIsPolyphonic: track.slicerIsPolyphonic,
                // Drum Sampler specific
                selectedDrumPadForEdit: track.selectedDrumPadForEdit,
                // Instrument Sampler specific
                instrumentSamplerIsPolyphonic: track.instrumentSamplerIsPolyphonic,
            };
             if (track.type === 'Synth') {
                trackData.synthEngineType = track.synthEngineType || 'MonoSynth';
                trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams));
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = { // Store serializable parts
                    fileName: track.samplerAudioData.fileName,
                    dbKey: track.samplerAudioData.dbKey, // Key to retrieve from IndexedDB
                    // audioBufferDataURL is large, rely on dbKey for reconstruction
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
        }),
        windowStates: Array.from(openWindowsMap.values()).map(win => { // Use stored map
             if (!win || !win.element) return null; // Should not happen if map is clean
            return {
                id: win.id, title: win.title,
                left: win.element.style.left, top: win.element.style.top,
                width: win.element.style.width, height: win.element.style.height,
                zIndex: parseInt(win.element.style.zIndex),
                isMinimized: win.isMinimized,
                initialContentKey: win.initialContentKey
            };
        }).filter(ws => ws !== null)
    };
    return projectData;
}

export async function reconstructDAWInternal(projectData, isUndoRedo = false) {
    appServices._isReconstructingDAW_flag = true; // Set flag via appServices
    // console.log("[State] Starting DAW Reconstruction. Is Undo/Redo:", isUndoRedo);

    // Stop transport and clear existing audio elements
    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel(); // Clear all scheduled Tone.Transport events

    // Ensure audio context is ready before doing anything else
    await audioInitAudioContextAndMasterMeter(true); // User interaction might be needed if not already running

    // Dispose existing tracks and clear state
    tracks.forEach(track => track.dispose()); // Track.dispose should handle its Tone.js nodes
    tracks = [];
    trackIdCounter = 0;

    // Dispose existing master effect Tone.js nodes (managed by audio.js)
    if (appServices.clearAllMasterEffectNodes) appServices.clearAllMasterEffectNodes();
    masterEffectsChainState = []; // Clear state representation

    // Close all UI windows
    if (appServices.closeAllWindows) appServices.closeAllWindows(true); // true for silent close
    openWindowsMap.clear();
    highestZ = 100;


    // Reset core state variables before loading from projectData
    setArmedTrackIdState(null);
    setSoloedTrackIdState(null);
    setActiveSequencerTrackIdState(null);
    setIsRecordingState(false);
    setRecordingTrackIdState(null);
    if (appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(false);

    // Load global settings
    const gs = projectData.globalSettings || {};
    Tone.Transport.bpm.value = gs.tempo || 120;
    masterGainValueState = gs.masterVolume ?? Tone.dbToGain(0);
    // Apply master volume to the actual Tone.Gain node in audio.js
    if (appServices.setActualMasterVolume) appServices.setActualMasterVolume(masterGainValueState);

    if (appServices.updateTaskbarTempoDisplay) appServices.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
    highestZ = gs.highestZIndex || 100;

    setArmedTrackIdState(gs.armedTrackId || null);
    setSoloedTrackIdState(gs.soloedTrackId || null);


    // Reconstruct master effects chain (state and audio nodes)
    if (projectData.masterEffects && Array.isArray(projectData.masterEffects)) {
        for (const effectData of projectData.masterEffects) {
            // Add to state (just params)
            const effectIdInState = addMasterEffectToState(effectData.type, effectData.params);
            // Add to audio (creates ToneNode and connects)
            if (appServices.audioAddMasterEffectToChain) { // Check if function exists
                 await appServices.audioAddMasterEffectToChain(effectIdInState, effectData.type, effectData.params);
            } else {
                console.error("audioAddMasterEffectToChain service not found in appServices during reconstructDAW");
            }
        }
        // audioRebuildMasterEffectChain() will be called by audioAddMasterEffectToChain or at the end
    }


    // Reconstruct tracks
    const trackPromises = (projectData.tracks || []).map(trackData => addTrackToStateInternal(trackData.type, trackData, false));
    await Promise.all(trackPromises);

    // Reconstruct window states
    if (projectData.windowStates) {
        const sortedWindowStates = projectData.windowStates.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
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
                if (!isNaN(trackIdNum) && getTrackByIdState(trackIdNum)) appServices.openTrackInspectorWindow(trackIdNum, winState);
            } else if (key.startsWith('effectsRack-') && appServices.openTrackEffectsRackWindow) {
                const trackIdNum = parseInt(key.split('-')[1]);
                if (!isNaN(trackIdNum) && getTrackByIdState(trackIdNum)) appServices.openTrackEffectsRackWindow(trackIdNum, winState);
            } else if (key.startsWith('sequencerWin-') && appServices.openTrackSequencerWindow) {
                const trackIdNum = parseInt(key.split('-')[1]);
                if (!isNaN(trackIdNum) && getTrackByIdState(trackIdNum)) appServices.openTrackSequencerWindow(trackIdNum, true, winState);
            }
        }
    }

    // Ensure all track audio resources are fully loaded (samples, etc.)
    // This might have been partially done during addTrackToStateInternal, but this ensures completion.
    const resourcePromises = tracks.map(track => track.fullyInitializeAudioResources());
    await Promise.all(resourcePromises);


    // Apply solo state to all tracks now that they are all loaded
    tracks.forEach(t => {
        t.isSoloed = (t.id === soloedTrackId);
        t.applySoloState(); // This should use appServices.getSoloedTrackId
        if (appServices.updateTrackUI) appServices.updateTrackUI(t.id, 'soloChanged');
    });

    // Select MIDI input
    if (gs && gs.activeMIDIInputId && appServices.selectMIDIInput) {
        appServices.selectMIDIInput(gs.activeMIDIInputId, true); // true for silent selection
    }

    // Final UI updates
    if(appServices.updateMixerWindow) appServices.updateMixerWindow();
    if(appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI(); // For master effects rack
    updateInternalUndoRedoState();

    appServices._isReconstructingDAW_flag = false; // Clear flag
    if (!isUndoRedo) showNotification(`Project loaded successfully.`, 3500);
    // console.log("[State DEBUG] armedTrackId at END of reconstructDAW:", armedTrackId);
    // console.log("[State] DAW Reconstructed successfully.");
}


export function saveProjectInternal() {
    try {
        const projectData = gatherProjectDataInternal();
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

export function loadProjectInternal() {
    const loadProjectInputEl = appServices.uiElementsCache?.loadProjectInput || document.getElementById('loadProjectInput');
    if (loadProjectInputEl) loadProjectInputEl.click();
    else {
        console.error("[State] Load project input element not found.");
        showNotification("Error: File input for loading project not found.", 3000);
    }
}

export async function handleProjectFileLoadInternal(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.snug')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                undoStack = []; // Clear undo/redo stacks for a fresh project
                redoStack = [];
                await reconstructDAWInternal(projectData, false); // false as it's not an undo/redo
                // Capture initial state of loaded project as first undo step
                captureStateForUndoInternal("Load Project: " + file.name.substring(0, 20));
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

export async function exportToWavInternal() {
    showNotification("Preparing export...", 3000);
    try {
        const audioReady = await audioInitAudioContextAndMasterMeter(true);
        if (!audioReady) {
            showNotification("Audio system not ready for export.", 4000);
            return;
        }

        if (Tone.Transport.state === 'started') {
            Tone.Transport.stop();
            await new Promise(resolve => setTimeout(resolve, 200)); // Allow time for stop to propagate
        }
        Tone.Transport.position = 0; // Reset transport position
        let maxDuration = 0;
        tracks.forEach(track => {
            if (track.sequence && track.sequenceLength > 0) {
                const sixteenthNoteTime = Tone.Time("16n").toSeconds();
                const trackDuration = track.sequenceLength * sixteenthNoteTime;
                if (trackDuration > maxDuration) maxDuration = trackDuration;
            }
        });
        if (maxDuration === 0) maxDuration = 5; // Default duration if no sequence
        maxDuration += 1; // Add a bit of tail

        const recorder = new Tone.Recorder();
        // Ensure we record from the final master output *before* it hits the absolute destination
        // This should be the output of masterGainNodeActual from audio.js
        const recordSource = appServices.getActualMasterGainNode ? appServices.getActualMasterGainNode() : null;

        if (!recordSource || recordSource.disposed) {
            showNotification("Master output node not available for recording.", 4000);
            console.error("[State ExportWAV] Master output node (masterGainNodeActual) is not available or disposed.");
            return;
        }
        recordSource.connect(recorder);

        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)...`, Math.max(3000, maxDuration * 1000 + 1000));

        recorder.start();
        Tone.Transport.start("+0.1", 0); // Start transport slightly in the future from time 0

        // Wait for the duration of the recording
        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000));

        const recording = await recorder.stop(); // Stop recording
        Tone.Transport.stop(); // Stop transport

        // Clean up
        try {
            recordSource.disconnect(recorder);
        } catch (e) {
            console.warn("Error disconnecting recorder, might have already been disconnected:", e);
        }
        recorder.dispose();

        // Create a download link for the recording
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
