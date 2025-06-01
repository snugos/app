// js/state.js - Application State Management
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog } from './utils.js';
import { Track } from './Track.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
import {
    rebuildMasterEffectChain as audioRebuildMasterEffectChain,
    addMasterEffectToAudio as audioAddMasterEffectToChain,
    removeMasterEffectFromAudio as audioRemoveMasterEffectFromChain,
    updateMasterEffectParamInAudio as audioUpdateMasterEffectParamInChain,
    reorderMasterEffectInAudio as audioReorderMasterEffectInChain,
    initAudioContextAndMasterMeter as audioInitAudioContextAndMasterMeter
} from './audio.js';
import { getAudio, storeAudio } from './db.js';

// --- Centralized State Variables ---
let tracks = [];
let trackIdCounter = 0;

// Window Management
let openWindowsMap = new Map();
let highestZ = 100;

// Master Audio Chain
let masterEffectsChainState = [];
let masterGainValueState = Tone.dbToGain(0);

// MIDI State
let midiAccessGlobal = null;
let activeMIDIInputGlobal = null;

// Sound Browser State
let loadedZipFilesGlobal = {};
let soundLibraryFileTreesGlobal = {};
let currentLibraryNameGlobal = null;
let currentSoundFileTreeGlobal = null;
let currentSoundBrowserPathGlobal = [];
let previewPlayerGlobal = null;

// Clipboard
let clipboardDataGlobal = { type: null, data: null, sourceTrackType: null, sequenceLength: null };

// Transport/Sequencing State
let activeSequencerTrackId = null;
let soloedTrackId = null;
let armedTrackId = null;
let isRecordingGlobal = false;
let recordingTrackIdGlobal = null;
let recordingStartTime = 0;

let globalPlaybackMode = 'sequencer'; // 'sequencer' or 'timeline' // MODIFIED: Default to 'sequencer'

// Undo/Redo
let undoStack = [];
let redoStack = [];

// --- AppServices Placeholder (will be populated by main.js) ---
let appServices = {};

export function initializeStateModule(services) {
    appServices = { ...appServices, ...services };
    if (!Array.isArray(masterEffectsChainState)) {
        masterEffectsChainState = [];
    }
    if (appServices && !appServices.getPlaybackMode) {
        appServices.getPlaybackMode = getPlaybackModeState;
    }
     if (appServices && !appServices.setPlaybackMode) {
        appServices.setPlaybackMode = setPlaybackModeState;
    }
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
export function getRecordingStartTimeState() { return recordingStartTime; }
export function getActiveSequencerTrackIdState() { return activeSequencerTrackId; }
export function getUndoStackState() { return undoStack; }
export function getRedoStackState() { return redoStack; }
export function getPlaybackModeState() { return globalPlaybackMode; }


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

export function setPlaybackModeState(mode) {
    const displayMode = mode === 'sequencer' ? 'Sequencer' : 'Timeline';
    console.log(`[State setPlaybackModeState] Attempting to set mode to: ${mode} (Display: ${displayMode}). Current mode: ${globalPlaybackMode}`);
    if (mode === 'sequencer' || mode === 'timeline') {
        if (globalPlaybackMode !== mode) {
            captureStateForUndoInternal(`Set Playback Mode to ${displayMode}`);
            globalPlaybackMode = mode;
            console.log(`[State setPlaybackModeState] Playback mode successfully changed to: ${globalPlaybackMode}`);

            if (Tone.Transport.state === 'started') {
                console.log("[State setPlaybackModeState] Transport was started, stopping it now.");
                Tone.Transport.stop(); // MODIFIED: Stop transport fully, not pause
            }
            Tone.Transport.cancel(0); // MODIFIED: Ensure events are cleared after stop
            console.log("[State setPlaybackModeState] Tone.Transport events cancelled.");

            if (appServices.uiElementsCache?.playBtnGlobal) {
                appServices.uiElementsCache.playBtnGlobal.textContent = 'Play';
                 console.log("[State setPlaybackModeState] Play button text reset to 'Play'.");
            }
            // Clear any visual 'playing' indicators from sequencer cells
            document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));

            const currentTracks = getTracksState();
            console.log(`[State setPlaybackModeState] Re-initializing sequences/playback for ${currentTracks.length} tracks for new mode '${globalPlaybackMode}'.`);
            currentTracks.forEach(track => {
                if (track.type !== 'Audio' && typeof track.recreateToneSequence === 'function') {
                    // RecreateToneSequence will now check the globalPlaybackMode internally
                    // and only build the Tone.Sequence if the mode is 'sequencer'.
                    console.log(`[State setPlaybackModeState] Calling recreateToneSequence for track ${track.id} (${track.name})`);
                    track.recreateToneSequence(true); // Pass true to force restart if needed
                }
                // If switching to sequencer mode, and it's an audio track, ensure its timeline players are stopped.
                if (mode === 'sequencer' && track.type === 'Audio' && typeof track.stopPlayback === 'function') {
                    console.log(`[State setPlaybackModeState] Stopping audio playback for track ${track.id} (${track.name}) as mode switched to sequencer.`);
                    track.stopPlayback();
                }
            });

            if (appServices.onPlaybackModeChange) {
                console.log("[State setPlaybackModeState] Calling onPlaybackModeChange callback.");
                appServices.onPlaybackModeChange(globalPlaybackMode);
            }
             if (appServices.renderTimeline) {
                console.log("[State setPlaybackModeState] Calling renderTimeline.");
                appServices.renderTimeline();
            }
        } else {
            console.log(`[State setPlaybackModeState] Mode is already ${mode}. No change.`);
        }
    } else {
        console.warn(`[State setPlaybackModeState] Invalid playback mode attempted: ${mode}`);
    }
}


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

    if (Object.keys(appServices).length === 0 && localAppServices && Object.keys(localAppServices).length > 0) {
        console.warn("[State addTrackToStateInternal] appServices was empty, using localAppServices fallback for trackAppServices. This might indicate an initialization order issue.");
        appServices = localAppServices;
    }


    const trackAppServices = {
        getSoloedTrackId: getSoloedTrackIdState,
        captureStateForUndo: captureStateForUndoInternal,
        updateTrackUI: appServices.updateTrackUI,
        highlightPlayingStep: appServices.highlightPlayingStep,
        autoSliceSample: appServices.autoSliceSample,
        closeAllTrackWindows: appServices.closeAllTrackWindows,
        getMasterEffectsBusInputNode: appServices.getMasterEffectsBusInputNode,
        showNotification: appServices.showNotification,
        effectsRegistryAccess: appServices.effectsRegistryAccess,
        renderTimeline: appServices.renderTimeline,
        getPlaybackMode: getPlaybackModeState, // Pass the state getter
    };
    const newTrack = new Track(newTrackId, type, initialData, trackAppServices);
    tracks.push(newTrack);

    if (typeof newTrack.initializeAudioNodes === 'function') {
        await newTrack.initializeAudioNodes();
    }

    try {
        await newTrack.fullyInitializeAudioResources();
        if (isBrandNewUserTrack) {
            showNotification(`${newTrack.name} added.`, 2000);
            if (appServices.openTrackInspectorWindow) {
                appServices.openTrackInspectorWindow(newTrack.id);
            }
        }
        if (appServices.updateMixerWindow) {
            appServices.updateMixerWindow();
        }
        if (appServices.renderTimeline) {
            appServices.renderTimeline();
        }
    } catch (error) {
        console.error(`[State] Error in fullyInitializeAudioResources for track ${newTrack.id}:`, error);
        showNotification(`Error setting up ${type} track "${newTrack.name}": ${error.message}`, 5000);
        if (isBrandNewUserTrack && appServices.openTrackInspectorWindow) {
            appServices.openTrackInspectorWindow(newTrack.id);
        }
        if (appServices.updateMixerWindow) {
            appServices.updateMixerWindow();
        }
         if (appServices.renderTimeline) {
            appServices.renderTimeline();
        }
    }
    return newTrack;
}

export function removeTrackFromStateInternal(trackId) {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;

    const track = tracks[trackIndex];
    captureStateForUndoInternal(`Remove Track "${track.name}"`);

    track.dispose();
    tracks.splice(trackIndex, 1);

    if (armedTrackId === trackId) setArmedTrackIdState(null);
    if (soloedTrackId === trackId) {
        setSoloedTrackIdState(null);
        tracks.forEach(t => {
            t.isSoloed = false;
            t.applySoloState();
            if (appServices.updateTrackUI) appServices.updateTrackUI(t.id, 'soloChanged');
        });
    }
    if (activeSequencerTrackId === trackId) setActiveSequencerTrackIdState(null);

    showNotification(`Track "${track.name}" removed.`, 2000);
    if (appServices.updateMixerWindow) appServices.updateMixerWindow();
    if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI(); // MODIFIED: Assuming this function exists in appServices
    if (appServices.renderTimeline) {
        appServices.renderTimeline();
    }
}


// --- Master Effects Chain Management ---
export function addMasterEffectToState(effectType, initialParams) {
    const effectId = `mastereffect_${effectType}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
    const defaultParams = appServices.effectsRegistryAccess?.getEffectDefaultParams
        ? appServices.effectsRegistryAccess.getEffectDefaultParams(effectType)
        : getEffectDefaultParamsFromRegistry(effectType);

    masterEffectsChainState.push({
        id: effectId,
        type: effectType,
        params: initialParams || defaultParams
    });
    return effectId;
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
    const clampedNewIndex = Math.max(0, Math.min(newIndex, maxValidInsertIndex -1));

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
    try {
        const currentState = gatherProjectDataInternal();
        currentState.description = description;
        undoStack.push(JSON.parse(JSON.stringify(currentState)));
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }
        redoStack = [];
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
        currentStateForRedo.description = stateToRestore.description;
        redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo)));
        if (redoStack.length > Constants.MAX_HISTORY_STATES) {
            redoStack.shift();
        }

        showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        appServices._isReconstructingDAW_flag = true;
        await reconstructDAWInternal(stateToRestore, true);
        appServices._isReconstructingDAW_flag = false;
        updateInternalUndoRedoState();
    } catch (error) {
        appServices._isReconstructingDAW_flag = false;
        console.error("[State] Error during undo:", error);
        showNotification(`Error during undo operation: ${error.message}. Project may be unstable.`, 4000);
        updateInternalUndoRedoState();
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
        currentStateForUndo.description = stateToRestore.description;
        undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo)));
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }

        showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
        appServices._isReconstructingDAW_flag = true;
        await reconstructDAWInternal(stateToRestore, true);
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
        version: "5.9.1", // MODIFIED: Version bump for new structure
        globalSettings: {
            tempo: Tone.Transport.bpm.value,
            masterVolume: masterGainValueState,
            activeMIDIInputId: activeMIDIInputGlobal ? activeMIDIInputGlobal.id : null,
            soloedTrackId: soloedTrackId,
            armedTrackId: armedTrackId,
            highestZIndex: highestZ,
            playbackMode: globalPlaybackMode, // MODIFIED: Uses the (potentially renamed) mode
        },
        masterEffects: masterEffectsChainState.map(effect => ({
            id: effect.id,
            type: effect.type,
            params: JSON.parse(JSON.stringify(effect.params))
        })),
        tracks: tracks.map(track => {
            const trackData = {
                id: track.id, type: track.type, name: track.name,
                isMuted: track.isMuted,
                volume: track.previousVolumeBeforeMute,
                activeEffects: track.activeEffects.map(effect => ({
                    id: effect.id,
                    type: effect.type,
                    params: JSON.parse(JSON.stringify(effect.params))
                })),
                automation: JSON.parse(JSON.stringify(track.automation)),
                selectedSliceForEdit: track.selectedSliceForEdit,
                waveformZoom: track.waveformZoom,
                waveformScrollOffset: track.waveformScrollOffset,
                slicerIsPolyphonic: track.slicerIsPolyphonic,
                selectedDrumPadForEdit: track.selectedDrumPadForEdit,
                instrumentSamplerIsPolyphonic: track.instrumentSamplerIsPolyphonic,

                sequences: JSON.parse(JSON.stringify(track.sequences || [])),
                activeSequenceId: track.activeSequenceId,
                timelineClips: JSON.parse(JSON.stringify(track.timelineClips || [])),
            };

            // Remove legacy sequence properties if they exist (already done in Track constructor but good for safety)
            delete trackData.sequenceLength;
            delete trackData.sequenceData;

             if (track.type === 'Synth') {
                trackData.synthEngineType = track.synthEngineType || 'MonoSynth';
                trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams));
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = {
                    fileName: track.samplerAudioData.fileName,
                    dbKey: track.samplerAudioData.dbKey,
                    // Ensure status reflects reality if dbKey is present
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
            // Ensure Audio tracks don't save sequencer-specific properties
            if (track.type === 'Audio') {
                delete trackData.sequences;
                delete trackData.activeSequenceId;
            }
            return trackData;
        }),
        windowStates: Array.from(openWindowsMap.values()).map(win => {
             if (!win || !win.element) return null; // Should not happen if map is clean
            return {
                id: win.id, title: win.title,
                left: win.element.style.left, top: win.element.style.top,
                width: win.element.style.width, height: win.element.style.height,
                zIndex: parseInt(win.element.style.zIndex), // Ensure zIndex is a number
                isMinimized: win.isMinimized,
                initialContentKey: win.initialContentKey // Important for restoring correct window type
            };
        }).filter(ws => ws !== null) // Filter out any nulls from failed window access
    };
    return projectData;
}

export async function reconstructDAWInternal(projectData, isUndoRedo = false) {
    appServices._isReconstructingDAW_flag = true;
    console.log("[State reconstructDAWInternal] Starting reconstruction. isUndoRedo:", isUndoRedo);

    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel();
    console.log("[State reconstructDAWInternal] Transport stopped and cancelled.");

    await audioInitAudioContextAndMasterMeter(true); // Ensure context is running

    // Dispose existing tracks properly
    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0; // Reset counter, will be updated by loaded track IDs
    console.log("[State reconstructDAWInternal] Existing tracks disposed and reset.");

    if (appServices.clearAllMasterEffectNodes) appServices.clearAllMasterEffectNodes();
    masterEffectsChainState = [];
    console.log("[State reconstructDAWInternal] Master effects cleared.");

    if (appServices.closeAllWindows) appServices.closeAllWindows(true); // true for isReconstruction
    if (appServices.clearOpenWindowsMap) appServices.clearOpenWindowsMap();
    highestZ = 100; // Reset Z-index base
    console.log("[State reconstructDAWInternal] Windows closed and reset.");


    // Reset transport/sequencing states
    setArmedTrackIdState(null);
    setSoloedTrackIdState(null);
    setActiveSequencerTrackIdState(null);
    setIsRecordingState(false);
    setRecordingTrackIdState(null);
    if (appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(false);
    console.log("[State reconstructDAWInternal] Transport/sequencing states reset.");

    // Apply global settings
    const gs = projectData.globalSettings || {};
    Tone.Transport.bpm.value = gs.tempo || 120;
    setMasterGainValueState(gs.masterVolume ?? Tone.dbToGain(0));
    if (appServices.setActualMasterVolume) appServices.setActualMasterVolume(getMasterGainValueState());
    // MODIFIED: Use 'sequencer' as the default if playbackMode is missing
    setPlaybackModeState(gs.playbackMode || 'sequencer');
    console.log(`[State reconstructDAWInternal] Global settings applied. Tempo: ${Tone.Transport.bpm.value}, MasterVol: ${getMasterGainValueState()}, PlaybackMode: ${globalPlaybackMode}`);


    if (appServices.updateTaskbarTempoDisplay) appServices.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
    setHighestZState(gs.highestZIndex || 100);

    setArmedTrackIdState(gs.armedTrackId || null);
    setSoloedTrackIdState(gs.soloedTrackId || null);
    console.log(`[State reconstructDAWInternal] Armed/Soloed tracks set. Armed: ${getArmedTrackIdState()}, Soloed: ${getSoloedTrackIdState()}`);


    // Reconstruct master effects
    if (projectData.masterEffects && Array.isArray(projectData.masterEffects)) {
        console.log(`[State reconstructDAWInternal] Reconstructing ${projectData.masterEffects.length} master effects.`);
        for (const effectData of projectData.masterEffects) {
            const effectIdInState = addMasterEffectToState(effectData.type, effectData.params);
            if (appServices.addMasterEffectToAudio) {
                 await appServices.addMasterEffectToAudio(effectIdInState, effectData.type, effectData.params);
            }
        }
    }


    // Reconstruct tracks
    if (projectData.tracks && projectData.tracks.length > 0) {
        console.log(`[State reconstructDAWInternal] Reconstructing ${projectData.tracks.length} tracks.`);
        const trackPromises = projectData.tracks.map(trackData => addTrackToStateInternal(trackData.type, trackData, false)); // false for isUserAction
        await Promise.all(trackPromises);
        console.log("[State reconstructDAWInternal] All tracks added to state.");
    } else {
        console.log("[State reconstructDAWInternal] No tracks to reconstruct.");
    }
    

    // Reconstruct windows (sorted by zIndex to attempt to preserve layering)
    if (projectData.windowStates) {
        const sortedWindowStates = projectData.windowStates.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        console.log(`[State reconstructDAWInternal] Reconstructing ${sortedWindowStates.length} windows.`);
        for (const winState of sortedWindowStates) {
            if (!winState || !winState.id) {
                console.warn("[State reconstructDAWInternal] Skipping invalid window state:", winState);
                continue;
            }
            const key = winState.initialContentKey || winState.id; // Use initialContentKey for type matching
            console.log(`[State reconstructDAWInternal] Attempting to restore window: ID=${winState.id}, Key=${key}, Title=${winState.title}`);

            // Ensure the target track exists before trying to open its windows
            let trackIdNum = NaN;
            if (key.startsWith('trackInspector-') || key.startsWith('effectsRack-') || key.startsWith('sequencerWin-')) {
                trackIdNum = parseInt(key.split('-')[1]);
            }

            if (key === 'globalControls' && appServices.openGlobalControlsWindow) appServices.openGlobalControlsWindow(null, winState);
            else if (key === 'mixer' && appServices.openMixerWindow) appServices.openMixerWindow(winState);
            else if (key === 'soundBrowser' && appServices.openSoundBrowserWindow) appServices.openSoundBrowserWindow(winState);
            else if (key === 'masterEffectsRack' && appServices.openMasterEffectsRackWindow) appServices.openMasterEffectsRackWindow(winState);
            else if (key === 'timeline' && appServices.openTimelineWindow) appServices.openTimelineWindow(winState); // Added timeline window
            else if (key.startsWith('trackInspector-') && appServices.openTrackInspectorWindow) {
                if (!isNaN(trackIdNum) && getTrackByIdState(trackIdNum)) appServices.openTrackInspectorWindow(trackIdNum, winState);
                else console.warn(`[State reconstructDAWInternal] Track for Inspector ${key} not found.`);
            } else if (key.startsWith('effectsRack-') && appServices.openTrackEffectsRackWindow) {
                if (!isNaN(trackIdNum) && getTrackByIdState(trackIdNum)) appServices.openTrackEffectsRackWindow(trackIdNum, winState);
                 else console.warn(`[State reconstructDAWInternal] Track for Effects Rack ${key} not found.`);
            } else if (key.startsWith('sequencerWin-') && appServices.openTrackSequencerWindow) {
                if (!isNaN(trackIdNum) && getTrackByIdState(trackIdNum)) appServices.openTrackSequencerWindow(trackIdNum, true, winState); // forceRedraw true
                 else console.warn(`[State reconstructDAWInternal] Track for Sequencer ${key} not found.`);
            } else {
                console.warn(`[State reconstructDAWInternal] Unknown window key for restoration: ${key}`);
            }
        }
    }

    // Crucial: Fully initialize audio resources for all reconstructed tracks
    // This needs to happen AFTER tracks are created and potentially after windows (if UI affects audio setup)
    console.log("[State reconstructDAWInternal] Initializing audio resources for all tracks post-reconstruction.");
    const resourcePromises = tracks.map(track => track.fullyInitializeAudioResources());
    await Promise.all(resourcePromises);
    console.log("[State reconstructDAWInternal] Audio resources initialized.");


    // Apply solo state after all tracks are loaded
    tracks.forEach(t => {
        t.isSoloed = (t.id === getSoloedTrackIdState());
        t.applySoloState(); // This will also update mute states based on solo
        if (appServices.updateTrackUI) appServices.updateTrackUI(t.id, 'soloChanged');
    });
    console.log("[State reconstructDAWInternal] Solo states applied.");

    // Restore MIDI input if specified
    if (gs && gs.activeMIDIInputId && appServices.selectMIDIInput) {
        appServices.selectMIDIInput(gs.activeMIDIInputId, true); // true for silent
        console.log(`[State reconstructDAWInternal] MIDI input ${gs.activeMIDIInputId} restored.`);
    }

    // Update UI elements
    if(appServices.updateMixerWindow) appServices.updateMixerWindow();
    if(appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    if(appServices.renderTimeline) appServices.renderTimeline();
    console.log("[State reconstructDAWInternal] UI elements updated.");

    updateInternalUndoRedoState(); // Update undo/redo buttons

    appServices._isReconstructingDAW_flag = false;
    if (!isUndoRedo) showNotification(`Project loaded successfully.`, 3500);
    console.log("[State reconstructDAWInternal] Reconstruction finished.");
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
                // Reset undo/redo stacks before loading a new project
                undoStack = [];
                redoStack = [];
                await reconstructDAWInternal(projectData, false); // false for isUndoRedo
                // Capture the initial state of the loaded project as the first undo step
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
            // Give Tone.js a moment to fully stop and process any scheduled events
            await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay slightly
        }
        Tone.Transport.position = 0; // Reset transport to the beginning
        let maxDuration = 0;

        const currentPlaybackMode = getPlaybackModeState();
        console.log(`[State ExportWAV] Current playback mode for export: ${currentPlaybackMode}`);

        if (currentPlaybackMode === 'timeline') {
            tracks.forEach(track => {
                track.timelineClips.forEach(clip => {
                    if (clip.startTime + clip.duration > maxDuration) {
                        maxDuration = clip.startTime + clip.duration;
                    }
                });
            });
            console.log(`[State ExportWAV] Max duration from timeline clips: ${maxDuration}s`);
        } else { // 'sequencer' mode
            tracks.forEach(track => {
                if (track.type !== 'Audio') { // Audio tracks don't have sequences in this model
                    const activeSeq = track.getActiveSequence();
                    if (activeSeq && activeSeq.length > 0) {
                        const sixteenthNoteTime = Tone.Time("16n").toSeconds();
                        const trackDuration = activeSeq.length * sixteenthNoteTime;
                        if (trackDuration > maxDuration) maxDuration = trackDuration;
                    }
                }
            });
            console.log(`[State ExportWAV] Max duration from sequencer mode: ${maxDuration}s`);
        }


        if (maxDuration === 0) maxDuration = 5; // Default to 5s if project is empty
        maxDuration += 1; // Add a small buffer (e.g., for reverb tails)
        console.log(`[State ExportWAV] Final maxDuration for recording: ${maxDuration}s`);

        const recorder = new Tone.Recorder();
        const recordSource = appServices.getActualMasterGainNode ? appServices.getActualMasterGainNode() : null;

        if (!recordSource || recordSource.disposed) {
            showNotification("Master output node not available for recording.", 4000);
            console.error("[State ExportWAV] Master output node is not available or disposed.");
            return;
        }
        recordSource.connect(recorder);
        console.log("[State ExportWAV] Recorder connected to master output.");

        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)...`, Math.max(3000, maxDuration * 1000 + 1000));

        // Schedule all tracks for playback from 0 up to maxDuration
        console.log("[State ExportWAV] Scheduling all tracks for playback.");
        tracks.forEach(track => {
            if (typeof track.schedulePlayback === 'function') {
                // Ensure schedulePlayback uses the current globalPlaybackMode
                track.schedulePlayback(0, maxDuration);
            }
        });

        await recorder.start();
        console.log("[State ExportWAV] Recorder started.");
        Tone.Transport.start("+0.1", 0); // Start transport slightly in the future from time 0
        console.log("[State ExportWAV] Transport started for export.");

        // Wait for the duration of the recording
        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000));
        console.log("[State ExportWAV] Recording duration elapsed.");

        const recording = await recorder.stop();
        console.log("[State ExportWAV] Recorder stopped. Blob received, size:", recording?.size);
        Tone.Transport.stop(); // Ensure transport is stopped after recording
        console.log("[State ExportWAV] Transport stopped after export recording.");

        // Clean up track playback states
        tracks.forEach(track => {
            if (typeof track.stopPlayback === 'function') {
                track.stopPlayback();
            }
        });
        console.log("[State ExportWAV] Track playback stopped.");


        try {
            recordSource.disconnect(recorder);
        } catch (e) {
            console.warn("[State ExportWAV] Error disconnecting recorder, might have already been disconnected:", e);
        }
        recorder.dispose();
        console.log("[State ExportWAV] Recorder disposed.");

        // Create and download the WAV file
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
        console.log("[State ExportWAV] Export successful.");

    } catch (error) {
        console.error("[State] Error exporting WAV:", error);
        showNotification(`Error exporting WAV: ${error.message}`, 5000);
    }
}

