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
let recordingStartTime = 0;

let globalPlaybackMode = 'sequencer';
let selectedTimelineClipInfoGlobal = { trackId: null, clipId: null };

let undoStack = [];
let redoStack = [];

let appServices = {};

export function initializeStateModule(services) {
    appServices = services || {};
    if (!Array.isArray(masterEffectsChainState)) {
        masterEffectsChainState = [];
    }
    if (appServices && typeof appServices.getPlaybackMode !== 'function') {
        appServices.getPlaybackMode = getPlaybackModeState;
    }
    if (appServices && typeof appServices.setPlaybackMode !== 'function') {
        appServices.setPlaybackMode = setPlaybackModeStateInternal;
    }
    console.log("[State] State module initialized. AppServices keys:", Object.keys(appServices));
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
export function getSelectedTimelineClipInfoState() { return selectedTimelineClipInfoGlobal; }

// --- Setters for Centralized State (called internally or via appServices) ---
export function addWindowToStoreState(id, instance) { openWindowsMap.set(id, instance); }
export function removeWindowFromStoreState(id) { openWindowsMap.delete(id); }
export function setHighestZState(value) { highestZ = Number.isFinite(value) ? value : 100; }
export function incrementHighestZState() { return ++highestZ; }
export function setMasterEffectsState(newChain) { masterEffectsChainState = Array.isArray(newChain) ? newChain : []; }
export function setMasterGainValueState(value) { masterGainValueState = Number.isFinite(value) ? value : Tone.dbToGain(0); }
export function setMidiAccessState(access) { midiAccessGlobal = access; }
export function setActiveMIDIInputState(input) { activeMIDIInputGlobal = input; }
export function setLoadedZipFilesState(files) { loadedZipFilesGlobal = typeof files === 'object' && files !== null ? files : {}; }
export function setSoundLibraryFileTreesState(trees) { soundLibraryFileTreesGlobal = typeof trees === 'object' && trees !== null ? trees : {}; }
export function setCurrentLibraryNameState(name) { currentLibraryNameGlobal = name; }
export function setCurrentSoundFileTreeState(tree) { currentSoundFileTreeGlobal = tree; }
export function setCurrentSoundBrowserPathState(path) { currentSoundBrowserPathGlobal = Array.isArray(path) ? path : []; }
export function setPreviewPlayerState(player) { previewPlayerGlobal = player; }
export function setClipboardDataState(data) { clipboardDataGlobal = typeof data === 'object' && data !== null ? data : { type: null, data: null }; }
export function setArmedTrackIdState(id) { armedTrackId = id; }
export function setSoloedTrackIdState(id) { soloedTrackId = id; }
export function setIsRecordingState(status) { isRecordingGlobal = !!status; }
export function setRecordingTrackIdState(id) { recordingTrackIdGlobal = id; }
export function setRecordingStartTimeState(time) { recordingStartTime = Number.isFinite(time) ? time : 0; }
export function setActiveSequencerTrackIdState(id) { activeSequencerTrackId = id; }
export function setSelectedTimelineClipInfoState(trackId, clipId) {
    console.log(`[State setSelectedTimelineClipInfoState] Selected: TrackID=${trackId}, ClipID=${clipId}`);
    if (trackId === null && clipId === null) {
        selectedTimelineClipInfoGlobal = { trackId: null, clipId: null };
    } else {
        selectedTimelineClipInfoGlobal = { trackId, clipId };
    }
}

export function setPlaybackModeStateInternal(mode) {
    const displayMode = typeof mode === 'string' ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Unknown';
    console.log(`[State setPlaybackModeStateInternal] Attempting to set mode to: ${mode} (Display: ${displayMode}). Current mode: ${globalPlaybackMode}`);

    if (mode === 'sequencer' || mode === 'timeline') {
        if (globalPlaybackMode !== mode) {
            if (appServices.captureStateForUndo) {
                appServices.captureStateForUndo(`Set Playback Mode to ${displayMode}`);
            } else {
                captureStateForUndoInternal(`Set Playback Mode to ${displayMode}`);
            }
            globalPlaybackMode = mode;
            console.log(`[State setPlaybackModeStateInternal] Playback mode changed to: ${globalPlaybackMode}`);

            if (Tone.Transport.state === 'started') {
                console.log("[State setPlaybackModeStateInternal] Transport was started, stopping it.");
                Tone.Transport.stop();
            }
            Tone.Transport.cancel(0);
            console.log("[State setPlaybackModeStateInternal] Tone.Transport events cancelled.");

            if (appServices.uiElementsCache?.playBtnGlobal) {
                appServices.uiElementsCache.playBtnGlobal.textContent = 'Play';
                console.log("[State setPlaybackModeStateInternal] Play button text reset.");
            } else {
                console.warn("[State setPlaybackModeStateInternal] Play button UI element not found in cache.");
            }
            document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));

            const currentTracks = getTracksState();
            console.log(`[State setPlaybackModeStateInternal] Re-initializing sequences/playback for ${currentTracks.length} tracks for new mode: ${globalPlaybackMode}.`);
            try {
                currentTracks.forEach(track => {
                    if (track && track.type !== 'Audio' && typeof track.recreateToneSequence === 'function') {
                        track.recreateToneSequence(true);
                    }
                    if (globalPlaybackMode === 'sequencer' && track && track.type === 'Audio' && typeof track.stopPlayback === 'function') {
                        track.stopPlayback();
                    }
                });
            } catch (error) {
                console.error("[State setPlaybackModeStateInternal] Error during track sequence/playback re-initialization:", error);
                if(appServices.showNotification) appServices.showNotification("Error updating track playback for new mode.", 3000);
            }

            if (appServices.onPlaybackModeChange && typeof appServices.onPlaybackModeChange === 'function') {
                appServices.onPlaybackModeChange(globalPlaybackMode);
            }
             if (appServices.renderTimeline && typeof appServices.renderTimeline === 'function') {
                appServices.renderTimeline();
            }
        } else {
            console.log(`[State setPlaybackModeStateInternal] Mode is already ${mode}. No change.`);
        }
    } else {
        console.warn(`[State setPlaybackModeStateInternal] Invalid playback mode attempted: ${mode}. Expected 'sequencer' or 'timeline'.`);
    }
}
export { setPlaybackModeStateInternal as setPlaybackModeState };

// --- Track Management ---
export async function addTrackToStateInternal(type, initialData = null, isUserAction = true) {
    const isBrandNewUserTrack = isUserAction && (!initialData || initialData._isUserActionPlaceholder);
    const skipUndoForThisAction = initialData?._skipUndo || false; // Check for skipUndo flag

    console.log(`[State addTrackToStateInternal] Adding ${type} track. User Action: ${isUserAction}, Brand New: ${isBrandNewUserTrack}, SkipUndo: ${skipUndoForThisAction}`);

    if (isBrandNewUserTrack && !skipUndoForThisAction) {
        captureStateForUndoInternal(`Add ${type} Track`);
        if (initialData && initialData._isUserActionPlaceholder) initialData = null;
    }

    let newTrack;
    try {
        let newTrackId;
        if (initialData && initialData.id != null && Number.isFinite(initialData.id)) {
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
            closeAllTrackWindows: appServices.closeAllTrackWindows,
            getMasterEffectsBusInputNode: appServices.getMasterEffectsBusInputNode,
            showNotification: appServices.showNotification,
            effectsRegistryAccess: appServices.effectsRegistryAccess,
            renderTimeline: appServices.renderTimeline,
            getPlaybackMode: getPlaybackModeState,
            getTrackById: getTrackByIdState,
            getTracks: getTracksState
        };

        newTrack = new Track(newTrackId, type, initialData, trackAppServices);
        tracks.push(newTrack); // Add to global array *before* further initialization

        if (typeof newTrack.initializeAudioNodes === 'function') {
            await newTrack.initializeAudioNodes();
        }
        await newTrack.fullyInitializeAudioResources();

        // Create initial sequence *after* track is fully initialized and added to state
        // and only if it's a truly new track (not one being reconstructed from projectData)
        if (isBrandNewUserTrack && newTrack.type !== 'Audio' && (!initialData || !initialData.sequences || initialData.sequences.length === 0)) {
            if (typeof newTrack.createNewSequence === 'function') {
                // skipUndo=true (already captured "Add Track"), skipUIUpdate=true (will be done below)
                newTrack.createNewSequence("Sequence 1", Constants.defaultStepsPerBar, true, true);
                if (typeof newTrack.recreateToneSequence === 'function') {
                    newTrack.recreateToneSequence(true); // Now recreate Tone.Sequence
                }
            }
        }

        if (isBrandNewUserTrack && appServices.showNotification) {
            appServices.showNotification(`${newTrack.name} added successfully.`, 2000);
        }
        
        // Explicitly update UI after track is fully set up, especially for sequencer
        if (appServices.updateTrackUI && newTrack.type !== 'Audio') {
            appServices.updateTrackUI(newTrack.id, 'sequencerContentChanged');
        }

        if (isBrandNewUserTrack && appServices.openTrackInspectorWindow) {
            setTimeout(() => appServices.openTrackInspectorWindow(newTrack.id), 50);
        }

        if (appServices.updateMixerWindow) appServices.updateMixerWindow();
        if (appServices.renderTimeline) appServices.renderTimeline();

    } catch (error) {
        console.error(`[State addTrackToStateInternal] Error adding ${type} track:`, error);
        if (appServices.showNotification) {
            appServices.showNotification(`Failed to add ${type} track: ${error.message}`, 4000);
        }
        if (newTrack && tracks.includes(newTrack)) {
            tracks = tracks.filter(t => t.id !== newTrack.id);
        }
        return null;
    }
    return newTrack;
}

export function removeTrackFromStateInternal(trackId) {
    try {
        const trackIndex = tracks.findIndex(t => t.id === trackId);
        if (trackIndex === -1) {
            console.warn(`[State removeTrackFromStateInternal] Track ID ${trackId} not found for removal.`);
            return;
        }

        const track = tracks[trackIndex];
        captureStateForUndoInternal(`Remove Track "${track.name}"`);

        if (typeof track.dispose === 'function') {
            track.dispose();
        }
        tracks.splice(trackIndex, 1);

        if (armedTrackId === trackId) setArmedTrackIdState(null);
        if (soloedTrackId === trackId) {
            setSoloedTrackIdState(null);
            tracks.forEach(t => {
                if (t) {
                    t.isSoloed = false;
                    if (typeof t.applySoloState === 'function') t.applySoloState();
                    if (appServices.updateTrackUI) appServices.updateTrackUI(t.id, 'soloChanged');
                }
            });
        }
        if (activeSequencerTrackId === trackId) setActiveSequencerTrackIdState(null);
        if (selectedTimelineClipInfoGlobal.trackId === trackId) {
            setSelectedTimelineClipInfoState(null, null);
        }

        if (appServices.showNotification) appServices.showNotification(`Track "${track.name}" removed.`, 2000);
        if (appServices.updateMixerWindow) appServices.updateMixerWindow();
        if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI();
        if (appServices.renderTimeline) appServices.renderTimeline();

    } catch (error) {
        console.error(`[State removeTrackFromStateInternal] Error removing track ${trackId}:`, error);
        if (appServices.showNotification) appServices.showNotification(`Error removing track: ${error.message}`, 3000);
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
    if (!effectWrapper || !effectWrapper.params) {
        console.warn(`[State updateMasterEffectParamInState] Effect wrapper or params not found for ID: ${effectId}`);
        return;
    }
    try {
        const keys = paramPath.split('.');
        let currentStoredParamLevel = effectWrapper.params;
        for (let i = 0; i < keys.length - 1; i++) {
            currentStoredParamLevel[keys[i]] = currentStoredParamLevel[keys[i]] || {};
            currentStoredParamLevel = currentStoredParamLevel[keys[i]];
        }
        currentStoredParamLevel[keys[keys.length - 1]] = value;
    } catch (error) {
        console.error(`[State updateMasterEffectParamInState] Error updating param ${paramPath} for effect ${effectId}:`, error);
    }
}

export function reorderMasterEffectInState(effectId, newIndex) {
    const oldIndex = masterEffectsChainState.findIndex(e => e.id === effectId);
    if (oldIndex === -1 || oldIndex === newIndex || newIndex < 0 || newIndex >= masterEffectsChainState.length) {
        if (oldIndex === -1) console.warn(`[State reorderMasterEffectInState] Effect ID ${effectId} not found.`);
        return;
    }
    const [effectToMove] = masterEffectsChainState.splice(oldIndex, 1);
    masterEffectsChainState.splice(newIndex, 0, effectToMove);
}

// --- Undo/Redo Logic ---
function updateInternalUndoRedoState() {
    if (appServices.updateUndoRedoButtonsUI && typeof appServices.updateUndoRedoButtonsUI === 'function') {
        try {
            appServices.updateUndoRedoButtonsUI(
                undoStack.length > 0 ? undoStack[undoStack.length - 1] : null,
                redoStack.length > 0 ? redoStack[redoStack.length - 1] : null
            );
        } catch (error) {
            console.error("[State updateInternalUndoRedoState] Error calling appServices.updateUndoRedoButtonsUI:", error);
        }
    }
}

export function captureStateForUndoInternal(description = "Unknown action") {
    try {
        const currentState = gatherProjectDataInternal();
        if (!currentState) {
            console.error("[State captureStateForUndoInternal] Failed to gather project data. Aborting undo capture.");
            return;
        }
        currentState.description = description;
        undoStack.push(JSON.parse(JSON.stringify(currentState)));
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }
        redoStack = [];
        updateInternalUndoRedoState();
    } catch (error) {
        console.error("[State captureStateForUndoInternal] Error capturing state for undo:", error);
        if (appServices.showNotification) appServices.showNotification("Error capturing undo state. See console.", 3000);
    }
}

export async function undoLastActionInternal() {
    if (undoStack.length === 0) {
        if (appServices.showNotification) appServices.showNotification("Nothing to undo.", 1500);
        return;
    }
    try {
        const stateToRestore = undoStack.pop();
        const currentStateForRedo = gatherProjectDataInternal();
        if (!currentStateForRedo) {
            console.error("[State undoLastActionInternal] Failed to gather current project data for redo stack. Undoing without pushing to redo.");
        } else {
            currentStateForRedo.description = stateToRestore.description;
            redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo)));
            if (redoStack.length > Constants.MAX_HISTORY_STATES) redoStack.shift();
        }

        if (appServices.showNotification) appServices.showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        if (appServices) appServices._isReconstructingDAW_flag = true;
        await reconstructDAWInternal(stateToRestore, true);
    } catch (error) {
        console.error("[State undoLastActionInternal] Error during undo:", error);
        if (appServices.showNotification) appServices.showNotification(`Error during undo operation: ${error.message}. Project may be unstable.`, 4000);
    } finally {
        if (appServices) appServices._isReconstructingDAW_flag = false;
        updateInternalUndoRedoState();
    }
}

export async function redoLastActionInternal() {
    if (redoStack.length === 0) {
        if (appServices.showNotification) appServices.showNotification("Nothing to redo.", 1500);
        return;
    }
    try {
        const stateToRestore = redoStack.pop();
        const currentStateForUndo = gatherProjectDataInternal();
        if (!currentStateForUndo) {
            console.error("[State redoLastActionInternal] Failed to gather current project data for undo stack. Redoing without pushing to undo.");
        } else {
            currentStateForUndo.description = stateToRestore.description;
            undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo)));
            if (undoStack.length > Constants.MAX_HISTORY_STATES) undoStack.shift();
        }

        if (appServices.showNotification) appServices.showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
        if (appServices) appServices._isReconstructingDAW_flag = true;
        await reconstructDAWInternal(stateToRestore, true);
    } catch (error) {
        console.error("[State redoLastActionInternal] Error during redo:", error);
        if (appServices.showNotification) appServices.showNotification(`Error during redo operation: ${error.message}. Project may be unstable.`, 4000);
    } finally {
        if (appServices) appServices._isReconstructingDAW_flag = false;
        updateInternalUndoRedoState();
    }
}

// --- Project Data Handling ---
export function gatherProjectDataInternal() {
    console.log("[State gatherProjectDataInternal] Starting to gather project data...");
    try {
        const projectData = {
            version: Constants.APP_VERSION || "0.1.0",
            globalSettings: {
                tempo: Tone.Transport.bpm.value,
                masterVolume: getMasterGainValueState(),
                activeMIDIInputId: getActiveMIDIInputState() ? getActiveMIDIInputState().id : null,
                soloedTrackId: getSoloedTrackIdState(),
                armedTrackId: getArmedTrackIdState(),
                highestZIndex: getHighestZState(),
                playbackMode: getPlaybackModeState(),
                selectedTimelineClipInfo: getSelectedTimelineClipInfoState(),
            },
            masterEffects: getMasterEffectsState().map(effect => ({
                id: effect.id,
                type: effect.type,
                params: effect.params ? JSON.parse(JSON.stringify(effect.params)) : {}
            })),
            tracks: getTracksState().map(track => {
                if (!track || typeof track.id === 'undefined') {
                    console.warn("[State gatherProjectDataInternal] Invalid track object found, skipping:", track);
                    return null;
                }
                const trackData = {
                    id: track.id, type: track.type, name: track.name,
                    isMuted: track.isMuted,
                    volume: track.previousVolumeBeforeMute,
                    activeEffects: (track.activeEffects || []).map(effect => ({
                        id: effect.id, type: effect.type,
                        params: effect.params ? JSON.parse(JSON.stringify(effect.params)) : {}
                    })),
                    automation: track.automation ? JSON.parse(JSON.stringify(track.automation)) : { volume: [] },
                    sequences: track.type !== 'Audio' && track.sequences ? JSON.parse(JSON.stringify(track.sequences)) : [],
                    activeSequenceId: track.type !== 'Audio' ? track.activeSequenceId : null,
                    timelineClips: track.timelineClips ? JSON.parse(JSON.stringify(track.timelineClips)) : [],
                };
                if (track.type === 'Synth') {
                    trackData.synthEngineType = track.synthEngineType || 'MonoSynth';
                    trackData.synthParams = track.synthParams ? JSON.parse(JSON.stringify(track.synthParams)) : {};
                } else if (track.type === 'Sampler') {
                    trackData.numSlices = track.numSlices;
                    trackData.samplerAudioData = {
                        fileName: track.samplerAudioData?.fileName,
                        dbKey: track.samplerAudioData?.dbKey,
                        status: track.samplerAudioData?.dbKey ? 'persisted' : (track.samplerAudioData?.fileName ? 'volatile' : 'empty')
                    };
                    trackData.slices = track.slices ? JSON.parse(JSON.stringify(track.slices)) : [];
                    trackData.selectedSliceForEdit = track.selectedSliceForEdit;
                    trackData.slicerIsPolyphonic = track.slicerIsPolyphonic;
                } else if (track.type === 'DrumSampler') {
                    trackData.numPads = track.numPads;
                    trackData.drumSamplerPads = (track.drumSamplerPads || []).map(p => ({
                        originalFileName: p.originalFileName, dbKey: p.dbKey,
                        volume: p.volume, pitchShift: p.pitchShift,
                        envelope: p.envelope ? JSON.parse(JSON.stringify(p.envelope)) : {},
                        status: p.dbKey ? 'persisted' : (p.originalFileName ? 'volatile' : 'empty'),
                        autoStretchEnabled: p.autoStretchEnabled,
                        stretchOriginalBPM: p.stretchOriginalBPM,
                        stretchBeats: p.stretchBeats,
                    }));
                    trackData.selectedDrumPadForEdit = track.selectedDrumPadForEdit;
                } else if (track.type === 'InstrumentSampler') {
                    trackData.instrumentSamplerSettings = {
                        originalFileName: track.instrumentSamplerSettings?.originalFileName,
                        dbKey: track.instrumentSamplerSettings?.dbKey,
                        rootNote: track.instrumentSamplerSettings?.rootNote,
                        loop: track.instrumentSamplerSettings?.loop,
                        loopStart: track.instrumentSamplerSettings?.loopStart,
                        loopEnd: track.instrumentSamplerSettings?.loopEnd,
                        envelope: track.instrumentSamplerSettings?.envelope ? JSON.parse(JSON.stringify(track.instrumentSamplerSettings.envelope)) : {},
                        status: track.instrumentSamplerSettings?.dbKey ? 'persisted' : (track.instrumentSamplerSettings?.originalFileName ? 'volatile' : 'empty')
                    };
                    trackData.instrumentSamplerIsPolyphonic = track.instrumentSamplerIsPolyphonic;
                }
                 if (track.type === 'Audio') {
                    trackData.isMonitoringEnabled = track.isMonitoringEnabled;
                }
                delete trackData.sequenceData; delete trackData.sequenceLength;
                return trackData;
            }).filter(td => td !== null),
            windowStates: Array.from(getOpenWindowsState().values())
                .map(win => {
                    if (!win || !win.element) return null;
                    return {
                        id: win.id, title: win.title,
                        left: win.element.style.left, top: win.element.style.top,
                        width: win.element.style.width, height: win.element.style.height,
                        zIndex: parseInt(win.element.style.zIndex, 10) || 100,
                        isMinimized: win.isMinimized,
                        isMaximized: win.isMaximized,
                        restoreState: win.isMaximized ? JSON.parse(JSON.stringify(win.restoreState)) : {},
                        initialContentKey: win.initialContentKey || win.id
                    };
                }).filter(ws => ws !== null)
        };
        console.log("[State gatherProjectDataInternal] Project data gathered successfully.");
        return projectData;
    } catch (error) {
        console.error("[State gatherProjectDataInternal] Error gathering project data:", error);
        if (appServices.showNotification) appServices.showNotification("Error preparing project data for saving/undo.", 4000);
        return null;
    }
}

export async function reconstructDAWInternal(projectData, isUndoRedo = false) {
    if (!projectData) {
        console.error("[State reconstructDAWInternal] projectData is null or undefined. Aborting reconstruction.");
        if (appServices.showNotification) appServices.showNotification("Error: Invalid project data for loading.", 4000);
        return;
    }
    if (appServices) appServices._isReconstructingDAW_flag = true;
    console.log(`[State reconstructDAWInternal] Starting reconstruction. IsUndoRedo: ${isUndoRedo}`);

    try {
        if (Tone.Transport.state === 'started') Tone.Transport.stop();
        Tone.Transport.cancel();
        await audioInitAudioContextAndMasterMeter(true);
        (getTracksState() || []).forEach(track => { if (track && typeof track.dispose === 'function') track.dispose(); });
        tracks = [];
        trackIdCounter = 0;
        if (appServices.clearAllMasterEffectNodes) appServices.clearAllMasterEffectNodes(); else console.warn("clearAllMasterEffectNodes service missing");
        masterEffectsChainState = [];
        if (appServices.closeAllWindows) appServices.closeAllWindows(true); else console.warn("closeAllWindows service missing");
        if (appServices.clearOpenWindowsMap) appServices.clearOpenWindowsMap(); else console.warn("clearOpenWindowsMap service missing");
        highestZ = 100;
        setArmedTrackIdState(null); setSoloedTrackIdState(null); setActiveSequencerTrackIdState(null);
        setIsRecordingState(false); setRecordingTrackIdState(null);
        setSelectedTimelineClipInfoState(null, null);
        if (appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(false);
    } catch (error) {
        console.error("[State reconstructDAWInternal] Error during global reset phase:", error);
        if (appServices.showNotification) appServices.showNotification("Critical error during project reset.", 5000);
        if (appServices) appServices._isReconstructingDAW_flag = false;
        return;
    }

    try {
        const gs = projectData.globalSettings || {};
        Tone.Transport.bpm.value = Number.isFinite(gs.tempo) ? gs.tempo : 120;
        setMasterGainValueState(Number.isFinite(gs.masterVolume) ? gs.masterVolume : Tone.dbToGain(0));
        if (appServices.setActualMasterVolume) appServices.setActualMasterVolume(getMasterGainValueState());
        setPlaybackModeStateInternal(gs.playbackMode === 'timeline' || gs.playbackMode === 'sequencer' ? gs.playbackMode : 'sequencer');
        if (appServices.updateTaskbarTempoDisplay) appServices.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        setHighestZState(Number.isFinite(gs.highestZIndex) ? gs.highestZIndex : 100);
        if (gs.selectedTimelineClipInfo) {
            setSelectedTimelineClipInfoState(gs.selectedTimelineClipInfo.trackId, gs.selectedTimelineClipInfo.clipId);
        }
    } catch (error) {
        console.error("[State reconstructDAWInternal] Error applying global settings:", error);
        if (appServices.showNotification) appServices.showNotification("Error loading global settings.", 3000);
    }

    try {
        if (projectData.masterEffects && Array.isArray(projectData.masterEffects)) {
            for (const effectData of projectData.masterEffects) {
                if (effectData && effectData.type) {
                    const effectIdInState = addMasterEffectToState(effectData.type, effectData.params || {});
                    if (appServices.addMasterEffectToAudio) {
                         await appServices.addMasterEffectToAudio(effectIdInState, effectData.type, effectData.params || {});
                    }
                } else { console.warn("[State reconstructDAWInternal] Invalid master effect data found:", effectData); }
            }
        }
    } catch (error) {
        console.error("[State reconstructDAWInternal] Error reconstructing master effects:", error);
        if (appServices.showNotification) appServices.showNotification("Error loading master effects.", 3000);
    }

    try {
        if (projectData.tracks && Array.isArray(projectData.tracks)) {
            const trackPromises = projectData.tracks.map(trackData => {
                if (trackData && trackData.type) {
                    // Pass _skipUndo to prevent capturing "Add Track" for each track during project load/undo/redo
                    return addTrackToStateInternal(trackData.type, {...trackData, _skipUndo: true}, false);
                } else { console.warn("[State reconstructDAWInternal] Invalid track data found:", trackData); return Promise.resolve(null); }
            });
            await Promise.all(trackPromises);
            console.log(`[State reconstructDAWInternal] All track instances created. Now setting armed/soloed states.`);
            const globalSettings = projectData.globalSettings || {};
            if (globalSettings.armedTrackId !== null && typeof globalSettings.armedTrackId !== 'undefined') {
                setArmedTrackIdState(globalSettings.armedTrackId);
            }
            if (globalSettings.soloedTrackId !== null && typeof globalSettings.soloedTrackId !== 'undefined') {
                setSoloedTrackIdState(globalSettings.soloedTrackId);
                getTracksState().forEach(t => {
                    if (t) {
                        t.isSoloed = (t.id === getSoloedTrackIdState());
                        if (typeof t.applySoloState === 'function') t.applySoloState();
                        if (appServices.updateTrackUI) appServices.updateTrackUI(t.id, 'soloChanged');
                    }
                });
            }
        }
    } catch (error) {
        console.error("[State reconstructDAWInternal] Error reconstructing tracks:", error);
        if (appServices.showNotification) appServices.showNotification("Error loading tracks.", 3000);
    }

    try {
        if (projectData.windowStates && Array.isArray(projectData.windowStates)) {
            const sortedWindowStates = projectData.windowStates.sort((a, b) => (a?.zIndex || 0) - (b?.zIndex || 0));
            for (const winState of sortedWindowStates) {
                if (!winState || !winState.id) { console.warn("[State reconstructDAWInternal] Invalid window state found:", winState); continue; }
                const key = winState.initialContentKey || winState.id;
                console.log(`[State reconstructDAWInternal] Reconstructing window: ${key}, ID: ${winState.id}`);
                if (key === 'globalControls' && appServices.openGlobalControlsWindow) appServices.openGlobalControlsWindow(null, winState);
                else if (key === 'mixer' && appServices.openMixerWindow) appServices.openMixerWindow(winState);
                else if (key === 'soundBrowser' && appServices.openSoundBrowserWindow) appServices.openSoundBrowserWindow(winState);
                else if (key === 'masterEffectsRack' && appServices.openMasterEffectsRackWindow) appServices.openMasterEffectsRackWindow(winState);
                else if (key === 'timeline' && appServices.openTimelineWindow) appServices.openTimelineWindow(winState);
                else if (key.startsWith('trackInspector-') && appServices.openTrackInspectorWindow) {
                    const trackIdNum = parseInt(key.split('-')[1], 10);
                    if (!isNaN(trackIdNum) && getTrackByIdState(trackIdNum)) appServices.openTrackInspectorWindow(trackIdNum, winState);
                    else console.warn(`[State reconstructDAWInternal] Track for inspector ${key} not found or ID invalid.`);
                } else if (key.startsWith('effectsRack-') && appServices.openTrackEffectsRackWindow) {
                    const trackIdNum = parseInt(key.split('-')[1], 10);
                    if (!isNaN(trackIdNum) && getTrackByIdState(trackIdNum)) appServices.openTrackEffectsRackWindow(trackIdNum, winState);
                    else console.warn(`[State reconstructDAWInternal] Track for effects rack ${key} not found or ID invalid.`);
                } else if (key.startsWith('sequencerWin-') && appServices.openTrackSequencerWindow) {
                    const trackIdNum = parseInt(key.split('-')[1], 10);
                    const trackForSeq = getTrackByIdState(trackIdNum);
                    if (!isNaN(trackIdNum) && trackForSeq && trackForSeq.type !== 'Audio') {
                        appServices.openTrackSequencerWindow(trackIdNum, true, winState);
                    } else { console.warn(`[State reconstructDAWInternal] Track for sequencer ${key} not found, ID invalid, or is Audio type.`);}
                } else {
                    console.warn(`[State reconstructDAWInternal] Unknown window key "${key}" during reconstruction.`);
                }
            }
        }
    } catch (error) {
        console.error("[State reconstructDAWInternal] Error reconstructing windows:", error);
        if (appServices.showNotification) appServices.showNotification("Error loading window layout.", 3000);
    }

    try {
        const gs = projectData.globalSettings || {};
        if(gs && gs.activeMIDIInputId && appServices.selectMIDIInput) {
            appServices.selectMIDIInput(gs.activeMIDIInputId, true);
        }
        if(appServices.updateMixerWindow) appServices.updateMixerWindow();
        if(appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        if(appServices.renderTimeline) appServices.renderTimeline();
        updateInternalUndoRedoState();
    } catch (error) {
        console.error("[State reconstructDAWInternal] Error during final UI updates/MIDI setup:", error);
    }

    if (appServices) appServices._isReconstructingDAW_flag = false;
    if (!isUndoRedo && appServices.showNotification) appServices.showNotification(`Project loaded successfully.`, 3500);
    console.log("[State reconstructDAWInternal] Reconstruction finished.");
}


export function saveProjectInternal() {
    try {
        const projectData = gatherProjectDataInternal();
        if (!projectData) throw new Error("Failed to gather project data for saving.");

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
        if (appServices.showNotification) appServices.showNotification(`Project saved as ${a.download}`, 2000);
    } catch (error) {
        console.error("[State saveProjectInternal] Error saving project:", error);
        if (appServices.showNotification) appServices.showNotification(`Error saving project: ${error.message}. See console.`, 4000);
    }
}

export function loadProjectInternal() {
    const loadProjectInputEl = appServices.uiElementsCache?.loadProjectInput;
    if (loadProjectInputEl) {
        loadProjectInputEl.click();
    } else {
        console.error("[State loadProjectInternal] Load project input element not found.");
        if (appServices.showNotification) appServices.showNotification("Error: File input for loading project not found.", 3000);
    }
}

export async function handleProjectFileLoadInternal(event) {
    if (!event || !event.target || !event.target.files || event.target.files.length === 0) {
        console.warn("[State handleProjectFileLoadInternal] No file selected or event invalid.");
        if (event && event.target) event.target.value = null;
        return;
    }
    const file = event.target.files[0];
    if (file && file.name.endsWith('.snug')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (!e.target || !e.target.result) throw new Error("FileReader did not produce a result.");
                const projectData = JSON.parse(e.target.result);
                undoStack = []; 
                redoStack = [];
                await reconstructDAWInternal(projectData, false);
                captureStateForUndoInternal("Load Project: " + file.name.substring(0, 20)); 
            } catch (error) {
                console.error("[State handleProjectFileLoadInternal] Error loading project from file:", error);
                if (appServices.showNotification) appServices.showNotification(`Error loading project: ${error.message}. File might be corrupt or invalid.`, 5000);
            }
        };
        reader.onerror = (err) => {
            console.error("[State handleProjectFileLoadInternal] FileReader error:", err);
            if (appServices.showNotification) appServices.showNotification("Error reading project file.", 3000);
        };
        reader.readAsText(file);
    } else if (file) {
        if (appServices.showNotification) appServices.showNotification("Invalid file type. Please select a .snug project file.", 3000);
    }
    if (event.target) event.target.value = null;
}

export async function exportToWavInternal() {
    if (!appServices.showNotification || !appServices.getActualMasterGainNode || !audioInitAudioContextAndMasterMeter) {
        console.error("[State exportToWavInternal] Required appServices (showNotification, getActualMasterGainNode, audioInitAudioContextAndMasterMeter) not available.");
        alert("Export WAV feature is currently unavailable due to an internal error.");
        return;
    }

    appServices.showNotification("Preparing export...", 3000);
    try {
        const audioReady = await audioInitAudioContextAndMasterMeter(true);
        if (!audioReady) {
            appServices.showNotification("Audio system not ready for export. Please try again.", 4000);
            return;
        }

        if (Tone.Transport.state === 'started') {
            Tone.Transport.pause();
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        const originalTransportPosition = Tone.Transport.seconds;
        Tone.Transport.position = 0;

        let maxDuration = 0;
        const currentPlaybackMode = getPlaybackModeState();

        if (currentPlaybackMode === 'timeline') {
            (getTracksState() || []).forEach(track => {
                if (track && track.timelineClips && Array.isArray(track.timelineClips)) {
                    track.timelineClips.forEach(clip => {
                        if (clip && typeof clip.startTime === 'number' && typeof clip.duration === 'number') {
                             maxDuration = Math.max(maxDuration, clip.startTime + clip.duration);
                        }
                    });
                }
            });
        } else {
            (getTracksState() || []).forEach(track => {
                if (track && track.type !== 'Audio') {
                    const activeSeq = track.getActiveSequence();
                    if (activeSeq && activeSeq.length > 0) {
                        const sixteenthNoteTime = Tone.Time("16n").toSeconds();
                        maxDuration = Math.max(maxDuration, activeSeq.length * sixteenthNoteTime);
                    }
                }
            });
        }

        if (maxDuration === 0) maxDuration = 5;
        maxDuration = Math.min(maxDuration + 2, 600);
        console.log(`[State exportToWavInternal] Calculated export duration: ${maxDuration.toFixed(1)}s`);

        const recorder = new Tone.Recorder();
        const recordSource = appServices.getActualMasterGainNode();

        if (!recordSource || recordSource.disposed) {
            appServices.showNotification("Master output node not available for recording export.", 4000);
            console.error("[State exportToWavInternal] Master output node is not available or disposed.");
            Tone.Transport.position = originalTransportPosition;
            return;
        }
        recordSource.connect(recorder);

        appServices.showNotification(`Recording for export (${maxDuration.toFixed(1)}s)... This may take a moment.`, Math.max(4000, maxDuration * 1000 + 1000));

        for (const track of getTracksState()) {
            if (track && typeof track.schedulePlayback === 'function') {
                await track.schedulePlayback(0, maxDuration);
            }
        }

        recorder.start();
        Tone.Transport.start(Tone.now(), 0);

        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000 + 500));

        const recording = await recorder.stop();
        Tone.Transport.stop();
        Tone.Transport.position = originalTransportPosition;

        (getTracksState() || []).forEach(track => {
            if (track && typeof track.stopPlayback === 'function') track.stopPlayback();
        });
        Tone.Transport.cancel(0);

        try {
            if (recordSource && !recordSource.disposed && recorder && !recorder.disposed) {
                recordSource.disconnect(recorder);
            }
        } catch (e) { console.warn("Error disconnecting recorder from source:", e.message); }
        if (recorder && !recorder.disposed) recorder.dispose();

        const url = URL.createObjectURL(recording);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `snugos-export-${timestamp}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        appServices.showNotification("Export to WAV successful!", 3000);

    } catch (error) {
        console.error("[State exportToWavInternal] Error exporting WAV:", error);
        appServices.showNotification(`Error exporting WAV: ${error.message}. See console.`, 5000);
        Tone.Transport.stop();
        Tone.Transport.cancel(0);
    }
}
