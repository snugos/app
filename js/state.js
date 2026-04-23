// js/state.js - Application State Management
import * as Constants from './constants.js';
// showNotification, showConfirmationDialog are accessed via appServices
// import { showNotification, showConfirmationDialog } from './utils.js';
import { Track } from './Track.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
import {
    initAudioContextAndMasterMeter as audioInitAudioContextAndMasterMeter
} from './audio.js';
// import { getAudio, storeAudio } from './db.js'; // Not directly used in this file after refactor to Track class

// --- Centralized State Variables ---
let tracks = [];
let trackIdCounter = 0;

// Window Management
let openWindowsMap = new Map();
let highestZ = 100;

// Master Audio Chain
let masterEffectsChainState = []; // Array of {id, type, params, toneNode (managed by audio.js)}
// Use numeric fallback until Tone.js is available (Tone.dbToGain(0) = 1.0 linear)
let masterGainValueState = (typeof Tone !== 'undefined' && Tone.dbToGain) ? Tone.dbToGain(0) : 1.0; // Linear gain value

// MIDI State
let midiAccessGlobal = null;
let activeMIDIInputGlobal = null;

// Sound Browser State
let loadedZipFilesGlobal = {};
let soundLibraryFileTreesGlobal = {};
let currentLibraryNameGlobal = null;

// Clipboard
let clipboardDataGlobal = { type: null, data: null, sourceTrackType: null, sequenceLength: null };

// Transport/Sequencing State
let activeSequencerTrackId = null;
let soloedTrackId = null;
let armedTrackId = null;
let isRecordingGlobal = false;
let recordingTrackIdGlobal = null;
let recordingStartTime = 0;

let globalPlaybackMode = 'sequencer'; // 'sequencer' or 'timeline'

// Metronome State
let metronomeEnabled = false;
let metronomeVolume = 0.5; // Default volume (0-1 range)

// Send Tracks State (Aux Buses)
let sendTracksState = []; // Array of { id, name, effects, level, muted }
let sendTrackIdCounter = 0;
let trackSendsState = {}; // Map: trackId -> { sendId: level } (level 0-1.2, 0 = off)

// Track Groups State (for organizing/busing multiple tracks)
let trackGroupsState = []; // Array of { id, name, color, trackIds: [], muted: false, soloed: false }
let trackGroupIdCounter = 0;

// Undo/Redo
let undoStack = [];
let redoStack = [];

// --- AppServices Placeholder (will be populated by main.js) ---
let appServices = {}; // Populated by initializeStateModule

export function initializeStateModule(services) {
    appServices = services || {}; // Ensure appServices is an object
    if (!Array.isArray(masterEffectsChainState)) {
        masterEffectsChainState = [];
    }
    // Ensure playback mode services are set up if not already provided
    if (appServices && typeof appServices.getPlaybackMode !== 'function') {
        appServices.getPlaybackMode = getPlaybackModeState;
    }
    if (appServices && typeof appServices.setPlaybackMode !== 'function') {
        appServices.setPlaybackMode = setPlaybackModeStateInternal;
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

export function getClipboardDataState() { return clipboardDataGlobal; }

export function getArmedTrackIdState() { return armedTrackId; }
export function getSoloedTrackIdState() { return soloedTrackId; }
export function setSoloedTrackIdState(id) { soloedTrackId = id; }
export function isTrackRecordingState() { return isRecordingGlobal; }
export function getRecordingTrackIdState() { return recordingTrackIdGlobal; }
export function getRecordingStartTimeState() { return recordingStartTime; }
export function setIsRecordingState(val) { isRecordingGlobal = !!val; }
export function setRecordingTrackIdState(id) { recordingTrackIdGlobal = id; }
export function setRecordingStartTimeState(t) { recordingStartTime = t; }
export function getActiveSequencerTrackIdState() { return activeSequencerTrackId; }
export function getUndoStackState() { return undoStack; }
export function getRedoStackState() { return redoStack; }
export function getPlaybackModeState() { return globalPlaybackMode; }

// Metronome Getters/Setters
export function getMetronomeEnabledState() { return metronomeEnabled; }
export function getMetronomeVolumeState() { return metronomeVolume; }
export function setMetronomeEnabledState(enabled) { metronomeEnabled = !!enabled; }
export function setMetronomeVolumeState(volume) { metronomeVolume = Math.max(0, Math.min(1, parseFloat(volume) || 0.5)); }

// Scale Mode State
let scaleModeState = { ...Constants.DEFAULT_SCALE_MODE };

export function getScaleModeState() { return scaleModeState; }

export function setScaleModeState(state) {
    if (state && typeof state === 'object') {
        scaleModeState = { ...Constants.DEFAULT_SCALE_MODE, ...state };
    }
}

export function getScaleModeEnabledState() { return scaleModeState.enabled; }
export function setScaleModeEnabledState(enabled) { scaleModeState.enabled = !!enabled; }

export function getScaleModeScaleState() { return scaleModeState.scale; }
export function setScaleModeScaleState(scale) { scaleModeState.scale = scale || 'Major'; }

export function getScaleModeRootState() { return scaleModeState.root; }
export function setScaleModeRootState(root) { scaleModeState.root = root || 'C'; }

export function getScaleModeLockState() { return scaleModeState.lock; }
export function setScaleModeLockState(lock) { scaleModeState.lock = !!lock; }

// Chord Mode State (for constraining notes to chord tones)
let chordModeState = { ...Constants.DEFAULT_CHORD_MODE };

export function getChordModeState() { return chordModeState; }

export function setChordModeState(state) {
    if (state && typeof state === 'object') {
        chordModeState = { ...Constants.DEFAULT_CHORD_MODE, ...state };
    }
}

export function getChordModeEnabledState() { return chordModeState.enabled; }
export function setChordModeEnabledState(enabled) { chordModeState.enabled = !!enabled; }

export function getChordModeRootState() { return chordModeState.root; }
export function setChordModeRootState(root) { chordModeState.root = Math.max(0, Math.min(11, parseInt(root) || 0)); }

export function getChordModeTypeState() { return chordModeState.type; }
export function setChordModeTypeState(type) { chordModeState.type = type || 'major'; }

export function getChordModeLockState() { return chordModeState.lockChord; }
export function setChordModeLockState(lock) { chordModeState.lockChord = !!lock; }

// Chord Voicing State
export function getChordVoicingState() {
    return chordModeState.voicing || Constants.DEFAULT_CHORD_VOICING;
}
export function setChordVoicingState(voicing) {
    chordModeState.voicing = (voicing && Constants.CHORD_VOICINGS.includes(voicing)) ? voicing : Constants.DEFAULT_CHORD_VOICING;
}

// Time Signature State
let timeSignatureState = { ...Constants.DEFAULT_TIME_SIGNATURE };

export function getTimeSignatureState() { return { ...timeSignatureState }; }

export function setTimeSignatureState(numerator, denominator) {
    const num = Math.max(Constants.TIME_SIG_MIN_NUMERATOR, Math.min(Constants.TIME_SIG_MAX_NUMERATOR, parseInt(numerator) || 4));
    const denom = Math.max(Constants.TIME_SIG_MIN_DENOMINATOR, Math.min(Constants.TIME_SIG_MAX_DENOMINATOR, parseInt(denominator) || 4));
    timeSignatureState = { numerator: num, denominator: denom };
    // Apply to Tone.Transport
    if (typeof Tone !== 'undefined' && Tone.Transport) {
        Tone.Transport.timeSignature = [num, denom];
    }
}

export function getTimeSignatureNumeratorState() { return timeSignatureState.numerator; }
export function setTimeSignatureNumeratorState(numerator) {
    const num = Math.max(Constants.TIME_SIG_MIN_NUMERATOR, Math.min(Constants.TIME_SIG_MAX_NUMERATOR, parseInt(numerator) || 4));
    timeSignatureState.numerator = num;
    if (typeof Tone !== 'undefined' && Tone.Transport) {
        Tone.Transport.timeSignature = [num, timeSignatureState.denominator];
    }
}

export function getTimeSignatureDenominatorState() { return timeSignatureState.denominator; }
export function setTimeSignatureDenominatorState(denominator) {
    const denom = Math.max(Constants.TIME_SIG_MIN_DENOMINATOR, Math.min(Constants.TIME_SIG_MAX_DENOMINATOR, parseInt(denominator) || 4));
    timeSignatureState.denominator = denom;
    if (typeof Tone !== 'undefined' && Tone.Transport) {
        Tone.Transport.timeSignature = [timeSignatureState.numerator, denom];
    }
}

// Ghost Track State (for showing notes from other tracks in sequencer)
let ghostTrackIdState = null; // null = no ghost track, or track ID

export function getGhostTrackIdState() { return ghostTrackIdState; }
export function setGhostTrackIdState(trackId) { ghostTrackIdState = trackId; }

// Timeline Markers State
let timelineMarkersState = []; // Array of { id, name, bar, color }
let timelineMarkerIdCounter = 0;

export function getTimelineMarkersState() { return timelineMarkersState; }

export function getTimelineMarkerByIdState(id) {
    return timelineMarkersState.find(m => m.id === id);
}

export function addTimelineMarkerState(name, bar, color = null) {
    if (timelineMarkersState.length >= Constants.MAX_TIMELINE_MARKERS) {
        return null; // Max markers reached
    }
    const id = timelineMarkerIdCounter++;
    const marker = {
        id,
        name: name || `Marker ${timelineMarkersState.length + 1}`,
        bar: Math.max(1, Math.min(parseInt(bar) || 1, Constants.MAX_BARS)),
        color: color || Constants.DEFAULT_MARKER_COLOR
    };
    timelineMarkersState.push(marker);
    // Sort by bar position
    timelineMarkersState.sort((a, b) => a.bar - b.bar);
    return marker;
}

export function setTimelineMarkerState(id, updates) {
    const marker = timelineMarkersState.find(m => m.id === id);
    if (marker) {
        if (updates.name !== undefined) marker.name = updates.name;
        if (updates.bar !== undefined) marker.bar = Math.max(1, Math.min(parseInt(updates.bar) || 1, Constants.MAX_BARS));
        if (updates.color !== undefined) marker.color = updates.color;
        timelineMarkersState.sort((a, b) => a.bar - b.bar);
        return marker;
    }
    return null;
}

export function removeTimelineMarkerState(id) {
    const index = timelineMarkersState.findIndex(m => m.id === id);
    if (index !== -1) {
        timelineMarkersState.splice(index, 1);
        return true;
    }
    return false;
}

export function clearTimelineMarkersState() {
    timelineMarkersState = [];
}

// --- Setters for Centralized State (called internally or via appServices) ---
export function addWindowToStoreState(id, instance) { openWindowsMap.set(id, instance); }
export function removeWindowFromStoreState(id) { openWindowsMap.delete(id); }

// --- Send Tracks State Getters and Setters ---
export function getSendTracksState() { return sendTracksState; }
export function getSendTrackByIdState(id) { return sendTracksState.find(s => s.id === id); }
export function addSendTrackState(sendData) {
    const sendTrack = {
        id: sendData.id,
        name: sendData.name || `Send ${sendData.id}`,
        effects: sendData.effects || [],
        level: sendData.level !== undefined ? sendData.level : 1.0,
        muted: sendData.muted || false
    };
    sendTracksState.push(sendTrack);
    return sendTrack;
}
export function setSendTrackMutedState(sendId, muted) {
    const send = sendTracksState.find(s => s.id === sendId);
    if (send) {
        send.muted = !!muted;
        return true;
    }
    return false;
}
export function getTrackSendsState() { return trackSendsState; }
export function getTrackSendLevelState(trackId, sendId) {
    if (trackSendsState[trackId]) {
        return trackSendsState[trackId][sendId] !== undefined ? trackSendsState[trackId][sendId] : 0;
    }
    return 0;
}
export function setTrackSendLevelState(trackId, sendId, level) {
    if (!trackSendsState[trackId]) {
        trackSendsState[trackId] = {};
    }
    trackSendsState[trackId][sendId] = Math.max(0, Math.min(1.2, parseFloat(level) || 0));
}

// --- Track Groups State Getters and Setters ---
export function getTrackGroupsState() { return trackGroupsState; }
export function getTrackGroupByIdState(id) { return trackGroupsState.find(g => g.id === id); }
export function addTrackGroupState(groupData) {
    const id = groupData.id !== undefined ? groupData.id : trackGroupIdCounter++;
    const newGroup = {
        id,
        name: groupData.name || `${Constants.DEFAULT_TRACK_GROUP_NAME} ${id}`,
        color: groupData.color || Constants.DEFAULT_TRACK_GROUP_COLOR,
        trackIds: groupData.trackIds || [],
        muted: groupData.muted || false,
        soloed: groupData.soloed || false
    };
    trackGroupsState.push(newGroup);
    return newGroup;
}
export function setTrackGroupNameState(id, name) {
    const group = trackGroupsState.find(g => g.id === id);
    if (group) {
        group.name = name || `Group ${id}`;
        return true;
    }
    return false;
}
export function setTrackGroupColorState(id, color) {
    const group = trackGroupsState.find(g => g.id === id);
    if (group) {
        group.color = color || Constants.DEFAULT_TRACK_GROUP_COLOR;
        return true;
    }
    return false;
}
export function addTrackToGroupState(groupId, trackId) {
    const group = trackGroupsState.find(g => g.id === groupId);
    if (group && !group.trackIds.includes(trackId)) {
        group.trackIds.push(trackId);
        return true;
    }
    return false;
}
export function removeTrackFromGroupState(groupId, trackId) {
    const group = trackGroupsState.find(g => g.id === groupId);
    if (group) {
        const idx = group.trackIds.indexOf(trackId);
        if (idx !== -1) {
            group.trackIds.splice(idx, 1);
            return true;
        }
    }
    return false;
}
export function setTrackGroupMutedState(id, muted) {
    const group = trackGroupsState.find(g => g.id === id);
    if (group) {
        group.muted = !!muted;
        return true;
    }
    return false;
}
export function setTrackGroupSoloedState(id, soloed) {
    const group = trackGroupsState.find(g => g.id === id);
    if (group) {
        group.soloed = !!soloed;
        return true;
    }
    return false;
}
export function removeTrackGroupState(id) {
    const idx = trackGroupsState.findIndex(g => g.id === id);
    if (idx !== -1) {
        trackGroupsState.splice(idx, 1);
        return true;
    }
    return false;
}

// --- Window Management ---
export function getOpenWindowsState() { return openWindowsMap; }
export function getWindowByIdState(id) { return openWindowsMap.get(id); }
export function getHighestZState() { return highestZ; }
export function setHighestZState(value) { highestZ = Number.isFinite(value) ? value : 100; }
export function incrementHighestZState() { return ++highestZ; }

// --- Master Effects Chain Management ---
export function addMasterEffectToState(effectType, initialParams) {
    const effectId = `mastereffect_${effectType}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
    const defaultParams = appServices.effectsRegistryAccess?.getEffectDefaultParams
        ? appServices.effectsRegistryAccess.getEffectDefaultParams(effectType)
        : getEffectDefaultParamsFromRegistry(effectType); // Fallback

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
    if (appServices.captureStateForUndo) {
        const effect = masterEffectsChainState[oldIndex];
        appServices.captureStateForUndo(`Reorder Master effect "${effect?.type || effectId}"`);
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
        currentState.description = description; // Add description to the state object
        undoStack.push(JSON.parse(JSON.stringify(currentState))); // Deep copy
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }
        redoStack = []; // Clear redo stack on new action
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
            currentStateForRedo.description = stateToRestore.description; // Use the undone action's description for redo
            redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo)));
            if (redoStack.length > Constants.MAX_HISTORY_STATES) redoStack.shift();
        }

        if (appServices.showNotification) appServices.showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        if (appServices) appServices._isReconstructingingDAW_flag = true; // Signal reconstruction globally
        await reconstructDAWInternal(stateToRestore, true); // true for isUndoRedo
    } catch (error) {
        console.error("[State undoLastActionInternal] Error during undo:", error);
        if (appServices.showNotification) appServices.showNotification(`Error during undo operation: ${error.message}. Project may be unstable.`, 4000);
        // Potentially try to restore the popped state back to undoStack if reconstruction fails badly? Complex.
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
        await reconstructDAWInternal(stateToRestore, true); // true for isUndoRedo
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
    try {
        const projectData = {
            version: Constants.APP_VERSION || "5.9.1", // Use a constant for app version
            globalSettings: {
                tempo: Tone.Transport.bpm.value,
                timeSignature: getTimeSignatureState(),
                masterVolume: getMasterGainValueState(),
                activeMIDIInputId: getActiveMIDIInputState() ? getActiveMIDIInputState().id : null,
                soloedTrackId: getSoloedTrackIdState(),
                armedTrackId: getArmedTrackIdState(),
                highestZIndex: getHighestZState(),
                playbackMode: getPlaybackModeState(),
                metronomeEnabled: getMetronomeEnabledState(),
                metronomeVolume: getMetronomeVolumeState(),
                scaleMode: getScaleModeState(),
                chordMode: getChordModeState(),
                loopRegion: getLoopRegionState(),
                swing: getSwingState(),
                timelineMarkers: JSON.parse(JSON.stringify(getTimelineMarkersState())),
            },
            masterEffects: getMasterEffectsState().map(effect => ({
                id: effect.id,
                type: effect.type,
                params: effect.params ? JSON.parse(JSON.stringify(effect.params)) : {} // Ensure params exist
            })),
            sendTracks: getSendTracksState().map(send => ({
                id: send.id,
                name: send.name,
                effects: send.effects ? JSON.parse(JSON.stringify(send.effects)) : [],
                level: send.level,
                muted: send.muted
            })),
            trackSends: getTrackSendsState(),
            tracks: getTracksState().map(track => {
                if (!track || typeof track.id === 'undefined') {
                    console.warn("[State gatherProjectDataInternal] Invalid track object found, skipping:", track);
                    return null; // Skip invalid tracks
                }
                const trackData = { // Base data
                    id: track.id, type: track.type, name: track.name,
                    isMuted: track.isMuted,
                    color: track.color, // Track color for visual identification
                    volume: track.previousVolumeBeforeMute, // Store the actual volume, not the muted one
                    pan: track.pan !== undefined ? track.pan : 0,
                    activeEffects: (track.activeEffects || []).map(effect => ({
                        id: effect.id, type: effect.type,
                        params: effect.params ? JSON.parse(JSON.stringify(effect.params)) : {}
                    })),
                    automation: track.automation ? JSON.parse(JSON.stringify(track.automation)) : { volume: [] },
                    // Type-specific sequence/clip data
                    sequences: track.type !== 'Audio' && track.sequences ? JSON.parse(JSON.stringify(track.sequences)) : [],
                    activeSequenceId: track.type !== 'Audio' ? track.activeSequenceId : null,
                    timelineClips: track.timelineClips ? JSON.parse(JSON.stringify(track.timelineClips)) : [],
                };
                // Type-specific parameters
                if (track.type === 'Synth') {
                    trackData.synthEngineType = track.synthEngineType || 'MonoSynth';
                    trackData.synthParams = track.synthParams ? JSON.parse(JSON.stringify(track.synthParams)) : {};
                } else if (track.type === 'Sampler') {
                    trackData.samplerAudioData = {
                        fileName: track.samplerAudioData?.fileName,
                        dbKey: track.samplerAudioData?.dbKey,
                        // status is runtime, not strictly needed for save, but useful for rehydration hint
                        status: track.samplerAudioData?.dbKey ? 'persisted' : (track.samplerAudioData?.fileName ? 'volatile' : 'empty')
                    };
                    trackData.slices = track.slices ? JSON.parse(JSON.stringify(track.slices)) : [];
                    trackData.selectedSliceForEdit = track.selectedSliceForEdit;
                    trackData.slicerIsPolyphonic = track.slicerIsPolyphonic;
                } else if (track.type === 'DrumSampler') {
                    trackData.drumSamplerPads = (track.drumSamplerPads || []).map(p => ({
                        originalFileName: p.originalFileName, dbKey: p.dbKey,
                        volume: p.volume, pitchShift: p.pitchShift,
                        envelope: p.envelope ? JSON.parse(JSON.stringify(p.envelope)) : {},
                        status: p.dbKey ? 'persisted' : (p.originalFileName ? 'volatile' : 'empty')
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
                 if (track.type === 'Audio') { // Audio track specific settings
                    trackData.isMonitoringEnabled = track.isMonitoringEnabled;
                }
                // Remove deprecated/runtime-only properties if they accidentally get included
                delete trackData.sequenceData; delete trackData.sequenceLength;
                return trackData;
            }).filter(td => td !== null), // Filter out any skipped invalid tracks
            windowStates: Array.from(getOpenWindowsState().values())
                .map(win => {
                    if (!win || !win.element) return null;
                    return {
                        id: win.id, title: win.title,
                        left: win.element.style.left, top: win.element.style.top,
                        width: win.element.style.width, height: win.element.style.height,
                        zIndex: parseInt(win.element.style.zIndex, 10) || 100,
                        isMinimized: win.isMinimized,
                        isMaximized: win.isMaximized, // Save maximized state
                        restoreState: win.isMaximized ? JSON.parse(JSON.stringify(win.restoreState)) : {},
                        initialContentKey: win.initialContentKey || win.id // Ensure this is saved
                    };
                }).filter(ws => ws !== null)
        };
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
        if (appServices.showNotification) appServices.showNotification("Error: No project data to load.", 3000);
        if (appServices) appServices._isReconstructingingDAW_flag = false;
        return;
    }
    
    if (appServices) appServices._isReconstructingDAW_flag = true;

    // --- Global Reset Phase ---
    try {
        Tone.Transport.stop();
        Tone.Transport.cancel(0);
        if (appServices.initAudioContextAndMasterMeter) await appServices.initAudioContextAndMasterMeter(true); // Ensure audio context is running, true for user initiated context
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
        if (appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(false);
    } catch (error) {
        console.error("[State reconstructDAWInternal] Error during global reset phase:", error);
        if (appServices.showNotification) appServices.showNotification("Critical error during project reset.", 5000);
        if (appServices) appServices._isReconstructingingDAW_flag = false;
        return; // Abort further reconstruction
    }

    try { // --- Global Settings ---
        const gs = projectData.globalSettings || {};
        Tone.Transport.bpm.value = Number.isFinite(gs.tempo) ? gs.tempo : 120;
        // Restore time signature
        if (gs.timeSignature && typeof gs.timeSignature === 'object') {
            const ts = gs.timeSignature;
            setTimeSignatureState(ts.numerator || 4, ts.denominator || 4);
        } else {
            setTimeSignatureState(4, 4); // Default to 4/4
        }
        setMasterGainValueState(Number.isFinite(gs.masterVolume) ? gs.masterVolume : (typeof Tone !== 'undefined' && Tone.dbToGain) ? Tone.dbToGain(0) : 1.0);
        if (appServices.setActualMasterVolume) appServices.setActualMasterVolume(getMasterGainValueState());
        setPlaybackModeStateInternal(gs.playbackMode === 'timeline' || gs.playbackMode === 'sequencer' ? gs.playbackMode : 'sequencer');
        if (appServices.updateTaskbarTempoDisplay) appServices.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        setHighestZState(Number.isFinite(gs.highestZIndex) ? gs.highestZIndex : 100);
        // Armed and Soloed will be set after tracks are created
    } catch (error) {
        console.error("[State reconstructDAWInternal] Error applying global settings:", error);
        if (appServices.showNotification) appServices.showNotification("Error loading global settings.", 3000);
    }

    try { // --- Master Effects ---
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
        console.error("[State reconstructDAWInternal] Error reconstructuring master effects:", error);
        if (appServices.showNotification) appServices.showNotification("Error loading master effects.", 3000);
    }

    // --- Send Tracks ---
    try {
        if (projectData.sendTracks && Array.isArray(projectData.sendTracks)) {
            sendTracksState = []; // Reset
            sendTrackIdCounter = 0;
            for (const sendData of projectData.sendTracks) {
                if (sendData && sendData.id) {
                    const sendTrack = {
                        id: sendData.id,
                        name: sendData.name || `Send ${sendData.id}`,
                        effects: sendData.effects || [],
                        level: sendData.level !== undefined ? sendData.level : 1.0,
                        muted: sendData.muted || false
                    };
                    sendTracksState.push(sendTrack);
                    sendTrackIdCounter = Math.max(sendTrackIdCounter, sendData.id);
                }
            }
            console.log(`[State reconstructDAWInternal] Restored ${sendTracksState.length} send tracks.`);
        }
        if (projectData.trackSends && typeof projectData.trackSends === 'object') {
            trackSendsState = JSON.parse(JSON.stringify(projectData.trackSends));
            console.log("[State reconstructDAWInternal] Restored track send levels.");
        }
    } catch (error) {
        console.error("[State reconstructDAWInternal] Error restoring send tracks:", error);
    }

    try { // --- Tracks ---
        if (projectData.tracks && Array.isArray(projectData.tracks)) {
            const trackPromises = projectData.tracks.map(trackData => {
                if (trackData && trackData.type) {
                    return addTrackToStateInternal(trackData.type, trackData, false); // false for isUserAction
                } else { console.warn("[State reconstructDAWInternal] Invalid track data found:", trackData); return Promise.resolve(null); }
            });
            await Promise.all(trackPromises);
            // After all tracks and their audio resources are initialized:
            const globalSettings = projectData.globalSettings || {};
            if (globalSettings.armedTrackId !== null && typeof globalSettings.armedTrackId !== 'undefined') {
                setArmedTrackIdState(globalSettings.armedTrackId);
            }
            if (globalSettings.soloedTrackId !== null && typeof globalSettings.soloedTrackId !== 'undefined') {
                setSoloedTrackIdState(globalSettings.soloedTrackId);
                getTracksState().forEach(t => { // Apply solo state after all tracks are potentially available
                    if (t) {
                        t.isSoloed = (t.id === getSoloedTrackIdState());
                        if (typeof t.applySoloState === 'function') t.applySoloState();
                        if (appServices.updateTrackUI) appServices.updateTrackUI(t.id, 'soloChanged');
                    }
                });
            }
            // Restore metronome state
            if (globalSettings.metronomeEnabled !== undefined) {
                setMetronomeEnabledState(globalSettings.metronomeEnabled);
            }
            if (globalSettings.metronomeVolume !== undefined) {
                setMetronomeVolumeState(globalSettings.metronomeVolume);
                if (appServices.setMetronomeVolume) {
                    appServices.setMetronomeVolume(globalSettings.metronomeVolume);
                }
            }
            // Restore scale mode state
            if (globalSettings.scaleMode !== undefined) {
                setScaleModeState(globalSettings.scaleMode);
            }
            // Restore chord mode state
            if (globalSettings.chordMode !== undefined) {
                setChordModeState(globalSettings.chordMode);
            }
            // Restore loop region state
            if (globalSettings.loopRegion !== undefined) {
                setLoopRegionState(globalSettings.loopRegion);
            }
            // Restore swing state
            if (globalSettings.swing !== undefined) {
                setSwingState(globalSettings.swing);
            }
        }
    } catch (error) {
        console.error("[State reconstructDAWInternal] Error reconstructuring tracks:", error);
        if (appServices.showNotification) appServices.showNotification("Error loading tracks.", 3000);
    }

    // Window reconstruction needs to happen after tracks are potentially created, as some windows depend on track IDs.
    try {
        if (projectData.windowStates && Array.isArray(projectData.windowStates)) {
            const sortedWindowStates = projectData.windowStates.sort((a, b) => (a?.zIndex || 0) - (b?.zIndex || 0));
            for (const winState of sortedWindowStates) {
                if (!winState || !winState.id) { console.warn("[State reconstructDAWInternal] Invalid window state found:", winState); continue; }
                const key = winState.initialContentKey || winState.id; // Use initialContentKey for routing
                if (key === 'globalControls' && appServices.openGlobalControlsWindow) {
                    // FIX: Pass a callback to wire up controls even during reconstruction
                    // The callback will be called by openGlobalControlsWindow to attach event listeners
                    appServices.openGlobalControlsWindow((elements) => {
                        if (elements && appServices.attachGlobalControlEvents) {
                            appServices.attachGlobalControlEvents(elements);
                        }
                    }, winState);
                }
                else if (key === 'soundBrowser' && appServices.openSoundBrowserWindow) appServices.openSoundBrowserWindow(winState);
                else if (key === 'mixer' && appServices.openMixerWindow) appServices.openMixerWindow(winState);
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
                        appServices.openTrackSequencerWindow(trackIdNum, true, winState); // true for forceRedraw
                    } else { console.warn(`[State reconstructDAWInternal] Track for sequencer ${key} not found, ID invalid, or is Audio type.`);}
                } else {
                    console.warn(`[State reconstructDAWInternal] Unknown window key "${key}" during reconstruction.`);
                }
            }
        }
    } catch (error) {
        console.error("[State reconstructDAWInternal] Error reconstructuring windows:", error);
        if (appServices.showNotification) appServices.showNotification("Error loading window layout.", 3000);
    }

    // Final UI updates and MIDI setup
    try {
        const gs = projectData.globalSettings || {};
        if(gs && gs.activeMIDIInputId && appServices.selectMIDIInput) {
            appServices.selectMIDIInput(gs.activeMIDIInputId, true); // true for silent
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
}


export function saveProjectInternal() {
    try {
        const projectData = gatherProjectDataInternal();
        if (!projectData) throw new Error("Failed to gather project data for saving.");

        const jsonString = JSON.stringify(projectData, null, 2); // Beautify JSON
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
        if (event && event.target) event.target.value = null; // Reset file input
        return;
    }
    const file = event.target.files[0];
    if (file && file.name.endsWith('.snug')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (!e.target || !e.target.result) throw new Error("FileReader did not produce a result.");
                const projectData = JSON.parse(e.target.result);
                undoStack = []; // Clear undo/redo stacks for new project
                redoStack = [];
                await reconstructDAWInternal(projectData, false); // false for isUndoRedo
                captureStateForUndoInternal("Load Project: " + file.name.substring(0, 20)); // Initial state for undo
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
    if (event.target) event.target.value = null; // Reset file input
}

export async function exportToWavInternal() {
    if (!appServices.showNotification || !appServices.getActualMasterGainNode || !audioInitAudioContextAndMasterMeter) {
        console.error("[State exportToWavInternal] Required appServices not available.");
        alert("Export WAV feature is currently unavailable due to an internal error.");
        return;
    }

    appServices.showNotification("Preparing export...", 2000);
    
    try {
        const audioReady = await audioInitAudioContextAndMasterMeter(true);
        if (!audioReady) {
            appServices.showNotification("Audio system not ready for export.", 3000);
            return;
        }

        // Calculate duration
        let maxDuration = 0;
        const currentPlaybackMode = getPlaybackModeState();
        const tracks = getTracksState();

        if (currentPlaybackMode === 'timeline') {
            tracks.forEach(track => {
                if (track?.timelineClips) {
                    track.timelineClips.forEach(clip => {
                        if (clip?.startTime !== undefined && clip?.duration !== undefined) {
                            maxDuration = Math.max(maxDuration, clip.startTime + clip.duration);
                        }
                    });
                }
            });
        } else {
            tracks.forEach(track => {
                if (track && track.type !== 'Audio') {
                    const activeSeq = track.getActiveSequence();
                    if (activeSeq?.length > 0) {
                        const sixteenthNoteTime = Tone.Time("16n").toSeconds();
                        maxDuration = Math.max(maxDuration, activeSeq.length * sixteenthNoteTime);
                    }
                }
            });
        }

        if (maxDuration === 0) {
            appServices.showNotification("Nothing to export. Add some notes or audio first.", 3000);
            return;
        }
        
        maxDuration = Math.min(maxDuration + 2, 600);

        // Stop everything first
        Tone.Transport.stop();
        Tone.Transport.cancel(0);
        tracks.forEach(t => { if (t?.stopPlayback) t.stopPlayback(); });
        await new Promise(r => setTimeout(r, 100));

        appServices.showNotification(`Rendering audio (${maxDuration.toFixed(1)}s)...`, 15000);

        // Use Tone.Recorder to record from master output
        const recorder = new Tone.Recorder();
        const masterGain = appServices.getActualMasterGainNode();
        
        if (!masterGain || masterGain.disposed) {
            appServices.showNotification("Master output not available.", 3000);
            return;
        }
        
        // Connect master gain to recorder
        masterGain.connect(recorder);

        // Reset transport
        Tone.Transport.position = 0;
        Tone.Transport.loop = false;
        
        // Schedule all tracks
        for (const track of tracks) {
            if (track?.schedulePlayback) {
                await track.schedulePlayback(0, maxDuration);
            }
        }

        // Start recording and playback
        await recorder.start();
        
        Tone.Transport.start();

        // Wait for recording
        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000 + 500));

        // Stop recording
        const recording = await recorder.stop();

        // Stop transport
        Tone.Transport.stop();
        Tone.Transport.cancel(0);
        tracks.forEach(t => { if (t?.stopPlayback) t.stopPlayback(); });

        // Cleanup
        try { masterGain.disconnect(recorder); } catch (e) {}
        recorder.dispose();

        if (!recording || recording.size < 1000) {
            appServices.showNotification("Export failed: No audio recorded.", 3000);
            console.error("[Export] Recording too small:", recording?.size);
            return;
        }

        // Download
        const url = URL.createObjectURL(recording);
        const a = document.createElement('a');
        a.href = url;
        a.download = `snugos-export-${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        appServices.showNotification("Export to WAV successful!", 3000);

    } catch (error) {
        console.error("[State exportToWavInternal] Error:", error);
        appServices.showNotification(`Export error: ${error.message}`, 5000);
        Tone.Transport.stop();
        Tone.Transport.cancel(0);
    }
}



// Helper function to convert AudioBuffer to WAV
function bufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write audio data
    const offset = 44;
    const channelData = [];
    for (let i = 0; i < numChannels; i++) {
        channelData.push(buffer.getChannelData(i));
    }
    
    let pos = offset;
    for (let i = 0; i < buffer.length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(pos, intSample, true);
            pos += 2;
        }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
