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

// MIDI Learn State
let midiLearnMappings = []; // Array of MIDI Learn mapping objects
let midiLearnMode = false; // When true, next CC message creates a new mapping
let midiLearnPendingParam = null; // Parameter info waiting to be mapped to incoming CC

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

// Performance Monitor State
let performanceMonitorState = {
    enabled: false,
    audioContextState: 'unknown', // 'running', 'suspended', 'closed', 'unknown'
    cpuUsage: 0, // Percentage 0-100 (estimated from Tone.context)
    memoryPressure: 'none', // 'none', 'low', 'medium', 'high'
    activeVoices: 0, // Count of active voices/notes
    audioLatency: 0, // Current audio latency in seconds
    lastCallbackTime: 0, // Last audio callback duration in ms
    droppedCallbacks: 0 // Number of dropped/late audio callbacks
};

export function getPerformanceMonitorState() {
    return { ...performanceMonitorState };
}

export function getPerformanceMonitorEnabledState() {
    return performanceMonitorState.enabled;
}

export function setPerformanceMonitorEnabledState(enabled) {
    performanceMonitorState.enabled = !!enabled;
}

export function getAudioContextStateState() {
    return performanceMonitorState.audioContextState;
}

export function setAudioContextStateState(contextState) {
    if (['running', 'suspended', 'closed', 'unknown'].includes(contextState)) {
        performanceMonitorState.audioContextState = contextState;
    }
}

export function getCPUUsageState() {
    return performanceMonitorState.cpuUsage;
}

export function setCPUUsageState(cpuUsage) {
    performanceMonitorState.cpuUsage = Math.max(0, Math.min(100, parseFloat(cpuUsage) || 0));
}

export function getMemoryPressureState() {
    return performanceMonitorState.memoryPressure;
}

export function setMemoryPressureState(pressure) {
    if (['none', 'low', 'medium', 'high'].includes(pressure)) {
        performanceMonitorState.memoryPressure = pressure;
    }
}

export function getActiveVoicesState() {
    return performanceMonitorState.activeVoices;
}

export function setActiveVoicesState(voices) {
    performanceMonitorState.activeVoices = Math.max(0, parseInt(voices) || 0);
}

export function getAudioLatencyState() {
    return performanceMonitorState.audioLatency;
}

export function setAudioLatencyState(latency) {
    performanceMonitorState.audioLatency = Math.max(0, parseFloat(latency) || 0);
}

export function getLastCallbackTimeState() {
    return performanceMonitorState.lastCallbackTime;
}

export function setLastCallbackTimeState(timeMs) {
    performanceMonitorState.lastCallbackTime = Math.max(0, parseFloat(timeMs) || 0);
}

export function getDroppedCallbacksState() {
    return performanceMonitorState.droppedCallbacks;
}

export function setDroppedCallbacksState(count) {
    performanceMonitorState.droppedCallbacks = Math.max(0, parseInt(count) || 0);
}

export function incrementDroppedCallbacksState() {
    performanceMonitorState.droppedCallbacks++;
}

export function resetPerformanceMonitorState() {
    performanceMonitorState = {
        enabled: false,
        audioContextState: 'unknown',
        cpuUsage: 0,
        memoryPressure: 'none',
        activeVoices: 0,
        audioLatency: 0,
        lastCallbackTime: 0,
        droppedCallbacks: 0
    };
}

// Loop Region State
let loopRegionState = { ...Constants.DEFAULT_LOOP_REGION };

export function getLoopRegionState() { return { ...loopRegionState }; }
export function setLoopRegionState(state) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Loop Region`);
    }
    loopRegionState = { ...state }; 
}
export function getLoopRegionEnabledState() { return loopRegionState.enabled; }
export function setLoopRegionEnabledState(enabled) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Toggle Loop Region ${enabled ? 'On' : 'Off'}`);
    }
    loopRegionState.enabled = !!enabled; 
}
export function getLoopRegionStartBarState() { return loopRegionState.startBar; }
export function setLoopRegionStartBarState(bar) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Loop Region Start Bar`);
    }
    loopRegionState.startBar = Math.max(1, parseInt(bar) || 1); 
}
export function getLoopRegionEndBarState() { return loopRegionState.endBar; }
export function setLoopRegionEndBarState(bar) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Loop Region End Bar`);
    }
    loopRegionState.endBar = Math.max(loopRegionState.startBar, parseInt(bar) || 4); 
}

// Timeline Zoom State
let timelineZoomState = {
    horizontal: Constants.TIMELINE_ZOOM_DEFAULT,
    vertical: Constants.TIMELINE_VERTICAL_ZOOM_DEFAULT
};

export function getTimelineZoomState() { return { ...timelineZoomState }; }
export function getTimelineZoomLevelState() { return timelineZoomState.horizontal; }
export function setTimelineZoomLevelState(level) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Timeline Zoom Level`);
    }
    timelineZoomState.horizontal = Math.max(Constants.TIMELINE_ZOOM_MIN, Math.min(Constants.TIMELINE_ZOOM_MAX, parseFloat(level) || Constants.TIMELINE_ZOOM_DEFAULT)); 
}
export function getTimelineVerticalZoomState() { return timelineZoomState.vertical; }
export function setTimelineVerticalZoomState(level) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Timeline Vertical Zoom`);
    }
    timelineZoomState.vertical = Math.max(Constants.TIMELINE_VERTICAL_ZOOM_MIN, Math.min(Constants.TIMELINE_VERTICAL_ZOOM_MAX, parseFloat(level) || Constants.TIMELINE_VERTICAL_ZOOM_DEFAULT)); 
}
export function zoomInTimeline() {
    setTimelineZoomLevelState(timelineZoomState.horizontal + Constants.TIMELINE_ZOOM_STEP);
}
export function zoomOutTimeline() {
    setTimelineZoomLevelState(timelineZoomState.horizontal - Constants.TIMELINE_ZOOM_STEP);
}
export function zoomInVerticalTimeline() {
    setTimelineVerticalZoomState(timelineZoomState.vertical + Constants.TIMELINE_VERTICAL_ZOOM_STEP);
}
export function zoomOutVerticalTimeline() {
    setTimelineVerticalZoomState(timelineZoomState.vertical - Constants.TIMELINE_VERTICAL_ZOOM_STEP);
}
export function resetTimelineZoom() {
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Reset Timeline Zoom`);
    }
    timelineZoomState.horizontal = Constants.TIMELINE_ZOOM_DEFAULT;
    timelineZoomState.vertical = Constants.TIMELINE_VERTICAL_ZOOM_DEFAULT;
}

// Swing/Groove State
let swingState = { ...Constants.DEFAULT_SWING };

export function getSwingState() { return { ...swingState }; }
export function setSwingState(state) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Swing`);
    }
    swingState = { ...state }; 
}
export function getSwingEnabledState() { return swingState.enabled; }
export function setSwingEnabledState(enabled) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Toggle Swing ${enabled ? 'On' : 'Off'}`);
    }
    swingState.enabled = !!enabled; 
}
export function getSwingAmountState() { return swingState.amount; }
export function setSwingAmountState(amount) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Swing Amount`);
    }
    swingState.amount = Math.max(0, Math.min(100, parseInt(amount) || 0)); 
}

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

// MIDI Learn state functions
export function getMidiLearnMappingsState() { return [...midiLearnMappings]; }
export function getMidiLearnModeState() { return midiLearnMode; }
export function setMidiLearnModeState(mode) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set MIDI Learn Mode ${mode ? 'On' : 'Off'}`);
    }
    midiLearnMode = !!mode; 
}

export function getMidiLearnPendingParamState() { return midiLearnPendingParam; }

export function setMidiLearnPendingParamState(param) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set MIDI Learn Pending Param`);
    }
    midiLearnPendingParam = param; 
}

export function addMidiLearnMapping(mapping) {
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Add MIDI Learn Mapping`);
    }
    if (midiLearnMappings.length >= Constants.MAX_MIDI_LEARN_MAPPINGS) {
        console.warn("[State] Max MIDI Learn mappings reached");
        return false;
    }
    const newMapping = { ...Constants.DEFAULT_MIDI_LEARN_MAPPING, ...mapping };
    midiLearnMappings.push(newMapping);
    return true;
}

export function removeMidiLearnMapping(index) {
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Remove MIDI Learn Mapping`);
    }
    if (index >= 0 && index < midiLearnMappings.length) {
        midiLearnMappings.splice(index, 1);
        return true;
    }
    return false;
}

export function clearMidiLearnMappings() {
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Clear All MIDI Learn Mappings`);
    }
    midiLearnMappings = [];
}

export function findMidiLearnMapping(channel, cc) {
    return midiLearnMappings.findIndex(m => m.channel === channel && m.cc === cc);
}

export function updateMidiLearnMapping(index, updates) {
    if (index >= 0 && index < midiLearnMappings.length) {
        if (appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Update MIDI Learn Mapping`);
        }
        midiLearnMappings[index] = { ...midiLearnMappings[index], ...updates };
        return true;
    }
    return false;
}

export function getMidiLearnMappingByIndex(index) {
    if (index >= 0 && index < midiLearnMappings.length) {
        return { ...midiLearnMappings[index] };
    }
    return null;
}

export function getLoadedZipFilesState() { return loadedZipFilesGlobal; }
export function getSoundLibraryFileTreesState() { return soundLibraryFileTreesGlobal; }
export function getCurrentLibraryNameState() { return currentLibraryNameGlobal; }

export function getClipboardDataState() { return clipboardDataGlobal; }

export function getArmedTrackIdState() { return armedTrackId; }
export function setArmedTrackIdState(id) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Armed Track`);
    }
    armedTrackId = id !== undefined && id !== null ? id : null; 
}
export function getSoloedTrackIdState() { return soloedTrackId; }
export function setSoloedTrackIdState(id) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Soloed Track`);
    }
    soloedTrackId = id !== undefined && id !== null ? id : null; 
}
export function isTrackRecordingState() { return isRecordingGlobal; }
export function getRecordingTrackIdState() { return recordingTrackIdGlobal; }
export function getRecordingStartTimeState() { return recordingStartTime; }
export function setIsRecordingState(val) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Recording State`);
    }
    isRecordingGlobal = !!val; 
}
export function setRecordingTrackIdState(id) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Recording Track`);
    }
    recordingTrackIdGlobal = id; 
}
export function setRecordingStartTimeState(t) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Recording Start Time`);
    }
    recordingStartTime = t; 
}

export function getUndoStackState() { return undoStack; }
export function getRedoStackState() { return redoStack; }
export function getPlaybackModeState() { return globalPlaybackMode; }

// Metronome Getters/Setters
export function getMetronomeEnabledState() { return metronomeEnabled; }
export function getMetronomeVolumeState() { return metronomeVolume; }
export function setMetronomeEnabledState(enabled) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Toggle Metronome ${enabled ? 'On' : 'Off'}`);
    }
    metronomeEnabled = !!enabled; 
}
export function setMetronomeVolumeState(volume) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Metronome Volume`);
    }
    metronomeVolume = Math.max(0, Math.min(1, parseFloat(volume) || 0.5)); 
}

// Scale Mode State
let scaleModeState = { ...Constants.DEFAULT_SCALE_MODE };

export function getScaleModeState() { return scaleModeState; }

export function setScaleModeState(state) {
    if (state && typeof state === 'object') {
        if (appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Set Scale Mode Settings`);
        }
        scaleModeState = { ...Constants.DEFAULT_SCALE_MODE, ...state };
    }
}

export function getScaleModeEnabledState() { return scaleModeState.enabled; }
export function setScaleModeEnabledState(enabled) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Toggle Scale Mode ${enabled ? 'On' : 'Off'}`);
    }
    scaleModeState.enabled = !!enabled; 
}

export function getScaleModeScaleState() { return scaleModeState.scale; }
export function setScaleModeScaleState(scale) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Scale to ${scale || 'Major'}`);
    }
    scaleModeState.scale = scale || 'Major'; 
}

export function getScaleModeRootState() { return scaleModeState.root; }
export function setScaleModeRootState(root) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Scale Root to ${root || 'C'}`);
    }
    scaleModeState.root = root || 'C'; 
}

export function getScaleModeLockState() { return scaleModeState.lock; }
export function setScaleModeLockState(lock) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`${lock ? 'Enable' : 'Disable'} Scale Lock`);
    }
    scaleModeState.lock = !!lock; 
}

// Chord Mode State (for constraining notes to chord tones)
let chordModeState = { ...Constants.DEFAULT_CHORD_MODE };

export function getChordModeState() { return chordModeState; }

export function setChordModeState(state) {
    if (state && typeof state === 'object') {
        if (appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Set Chord Mode Settings`);
        }
        chordModeState = { ...Constants.DEFAULT_CHORD_MODE, ...state };
    }
}

export function getChordModeEnabledState() { return chordModeState.enabled; }
export function setChordModeEnabledState(enabled) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Toggle Chord Mode ${enabled ? 'On' : 'Off'}`);
    }
    chordModeState.enabled = !!enabled; 
}

export function getChordModeRootState() { return chordModeState.root; }
export function setChordModeRootState(root) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Chord Root`);
    }
    chordModeState.root = Math.max(0, Math.min(11, parseInt(root) || 0)); 
}

export function getChordModeTypeState() { return chordModeState.type; }
export function setChordModeTypeState(type) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Chord Type to ${type || 'major'}`);
    }
    chordModeState.type = type || 'major'; 
}

export function getChordModeLockState() { return chordModeState.lockChord; }
export function setChordModeLockState(lock) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`${lock ? 'Enable' : 'Disable'} Chord Lock`);
    }
    chordModeState.lockChord = !!lock; 
}

export function getChordVoicingState() {
    return chordModeState.voicing || Constants.DEFAULT_CHORD_VOICING;
}
export function setChordVoicingState(voicing) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Chord Voicing to ${voicing || 'closed'}`);
    }
    chordModeState.voicing = (voicing && Constants.CHORD_VOICINGS.includes(voicing)) ? voicing : Constants.DEFAULT_CHORD_VOICING; 
}

// Time Signature State
let timeSignatureState = { ...Constants.DEFAULT_TIME_SIGNATURE };

export function getTimeSignatureState() { return { ...timeSignatureState }; }

export function setTimeSignatureState(numerator, denominator) {
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Time Signature to ${numerator || 4}/${denominator || 4}`);
    }
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
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Time Signature Numerator`);
    }
    const num = Math.max(Constants.TIME_SIG_MIN_NUMERATOR, Math.min(Constants.TIME_SIG_MAX_NUMERATOR, parseInt(numerator) || 4));
    timeSignatureState.numerator = num;
    if (typeof Tone !== 'undefined' && Tone.Transport) {
        Tone.Transport.timeSignature = [num, timeSignatureState.denominator];
    }
}

export function getTimeSignatureDenominatorState() { return timeSignatureState.denominator; }
export function setTimeSignatureDenominatorState(denominator) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Time Signature Denominator`);
    }
    const denom = Math.max(Constants.TIME_SIG_MIN_DENOMINATOR, Math.min(Constants.TIME_SIG_MAX_DENOMINATOR, parseInt(denominator) || 4));
    timeSignatureState.denominator = denom;
    if (typeof Tone !== 'undefined' && Tone.Transport) {
        Tone.Transport.timeSignature = [timeSignatureState.numerator, denom];
    }
}

// Ghost Track State (for showing notes from other tracks in sequencer)
let ghostTrackIdState = null; // null = no ghost track, or track ID

export function getGhostTrackIdState() { return ghostTrackIdState; }
export function setGhostTrackIdState(trackId) { 
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(trackId ? `Set Ghost Track` : `Clear Ghost Track`);
    }
    ghostTrackIdState = trackId; 
}

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
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Add Timeline Marker "${name || `Marker ${timelineMarkersState.length + 1}`}"`);
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
        if (appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Update Timeline Marker "${marker.name}"`);
        }
        if (updates.name !== undefined) marker.name = updates.name;
        if (updates.bar !== undefined) marker.bar = Math.max(1, Math.min(parseInt(updates.bar) || 1, Constants.MAX_BARS));
        if (updates.color !== undefined) marker.color = updates.color;
        timelineMarkersState.sort((a, b) => a.bar - b.bar);
        return marker;
    }
    return null;
}

export function removeTimelineMarkerState(id) {
    const marker = timelineMarkersState.find(m => m.id === id);
    const markerName = marker ? marker.name : id;
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Remove Timeline Marker "${markerName}"`);
    }
    const index = timelineMarkersState.findIndex(m => m.id === id);
    if (index !== -1) {
        timelineMarkersState.splice(index, 1);
        return true;
    }
    return false;
}

export function clearTimelineMarkersState() {
    if (timelineMarkersState.length === 0) return;
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Clear All Timeline Markers`);
    }
    timelineMarkersState = [];
}

// --- Setters for Centralized State (called internally or via appServices) ---
export function addWindowToStoreState(id, instance) { openWindowsMap.set(id, instance); }
export function removeWindowFromStoreState(id) { openWindowsMap.delete(id); }

// --- Send Tracks State Getters and Setters ---
export function getSendTracksState() { return sendTracksState; }
export function getSendTrackByIdState(id) { return sendTracksState.find(s => s.id === id); }
export function addSendTrackState(sendData) {
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Add Send Bus "${sendData?.name || 'new send'}"`);
    }
    const id = sendData && sendData.id !== undefined ? sendData.id : sendTrackIdCounter++;
    const sendTrack = {
        id,
        name: (sendData && sendData.name) || `Send ${id}`,
        effects: (sendData && sendData.effects) || [],
        level: (sendData && sendData.level !== undefined) ? sendData.level : 1.0,
        muted: !!(sendData && sendData.muted)
    };
    sendTracksState.push(sendTrack);
    return sendTrack;
}
export function setSendTrackMutedState(sendId, muted) {
    const send = sendTracksState.find(s => s.id === sendId);
    if (send) {
        if (appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Set Send "${send.name}" muted ${muted ? 'on' : 'off'}`);
        }
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
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Send Level for Track ${trackId}`);
    }
    trackSendsState[trackId][sendId] = Math.max(0, Math.min(1.2, parseFloat(level) || 0));
}
export function getTrackSendPreFaderState(trackId, sendId) {
    if (trackSendsState[trackId] && trackSendsState[trackId][sendId] !== undefined) {
        return trackSendsState[trackId][sendId].preFader || false;
    }
    return false; // Default to post-fader
}
export function setTrackSendPreFaderState(trackId, sendId, preFader) {
    if (!trackSendsState[trackId]) {
        trackSendsState[trackId] = {};
    }
    if (!trackSendsState[trackId][sendId]) {
        trackSendsState[trackId][sendId] = { level: 0, preFader: false };
    }
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Set Send Pre-Fader for Track ${trackId}`);
    }
    trackSendsState[trackId][sendId].preFader = !!preFader;
}

// --- Track Groups State Management ---
export function getTrackGroupsState() { return trackGroupsState; }
export function getTrackGroupByIdState(id) { return trackGroupsState.find(g => g.id === id); }
export function addTrackGroupState(groupData) {
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Create Track Group "${groupData?.name || 'New Group'}"`);
    }
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
        if (appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Rename Track Group to "${name || `Group ${id}`}"`);
        }
        group.name = name || `Group ${id}`;
        return true;
    }
    return false;
}
export function setTrackGroupColorState(id, color) {
    const group = trackGroupsState.find(g => g.id === id);
    if (group) {
        if (appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Change Track Group "${group.name}" color`);
        }
        group.color = color || Constants.DEFAULT_TRACK_GROUP_COLOR;
        return true;
    }
    return false;
}
export function addTrackToGroupState(groupId, trackId) {
    const group = trackGroupsState.find(g => g.id === groupId);
    if (group && !group.trackIds.includes(trackId)) {
        if (appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Add Track to Group "${group.name}"`);
        }
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
            if (appServices.captureStateForUndo) {
                appServices.captureStateForUndo(`Remove Track from Group "${group.name}"`);
            }
            group.trackIds.splice(idx, 1);
            return true;
        }
    }
    return false;
}
export function setTrackGroupMutedState(id, muted) {
    const group = trackGroupsState.find(g => g.id === id);
    if (group) {
        if (appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Set Group "${group.name}" muted ${muted ? 'on' : 'off'}`);
        }
        group.muted = !!muted;
        return true;
    }
    return false;
}
export function setTrackGroupSoloedState(id, soloed) {
    const group = trackGroupsState.find(g => g.id === id);
    if (group) {
        if (appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Set Group "${group.name}" soloed ${soloed ? 'on' : 'off'}`);
        }
        group.soloed = !!soloed;
        return true;
    }
    return false;
}
export function removeTrackGroupState(id) {
    const group = trackGroupsState.find(g => g.id === id);
    const groupName = group ? group.name : id;
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Delete Track Group "${groupName}"`);
    }
    const idx = trackGroupsState.findIndex(g => g.id === id);
    if (idx !== -1) {
        trackGroupsState.splice(idx, 1);
        return true;
    }
    return false;
}

// --- Track Templates State Management ---
export function getTrackTemplatesState() { return trackTemplatesState; }

export function getTrackTemplateByIdState(id) { 
    return trackTemplatesState.find(t => t.id === id); 
}

export function addTrackTemplateState(templateData) {
    if (trackTemplatesState.length >= Constants.MAX_TRACK_TEMPLATES) {
        return null; // Max templates reached
    }
    // Capture undo state before modifying templates
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Save Track Template "${templateData?.name || 'Untitled'}"`);
    }
    const id = templateData && templateData.id !== undefined ? templateData.id : trackTemplateIdCounter++;
    const template = {
        id,
        name: templateData?.name || `${Constants.DEFAULT_TEMPLATE_NAME_PREFIX} ${trackTemplatesState.length + 1}`,
        color: templateData?.color || Constants.DEFAULT_TRACK_TEMPLATE_COLOR,
        type: templateData?.type || 'Synth',
        synthParams: templateData?.synthParams || {},
        instrumentSamplerSettings: templateData?.instrumentSamplerSettings || null,
        drumSamplerPads: templateData?.drumSamplerPads || null,
        activeEffects: templateData?.activeEffects || [],
        hasAutomation: templateData?.hasAutomation || false,
        automationLanes: templateData?.automationLanes || []
    };
    trackTemplatesState.push(template);
    return template;
}

export function updateTrackTemplateState(id, updates) {
    // Capture undo state before modifying template
    if (appServices.captureStateForUndo) {
        const template = trackTemplatesState.find(t => t.id === id);
        if (template) {
            appServices.captureStateForUndo(`Update Track Template "${template.name}"`);
        }
    }
    const template = trackTemplatesState.find(t => t.id === id);
    if (template) {
        if (updates.name !== undefined) template.name = updates.name;
        if (updates.color !== undefined) template.color = updates.color;
        if (updates.type !== undefined) template.type = updates.type;
        if (updates.synthParams !== undefined) template.synthParams = updates.synthParams;
        if (updates.instrumentSamplerSettings !== undefined) template.instrumentSamplerSettings = updates.instrumentSamplerSettings;
        if (updates.drumSamplerPads !== undefined) template.drumSamplerPads = updates.drumSamplerPads;
        if (updates.activeEffects !== undefined) template.activeEffects = updates.activeEffects;
        if (updates.hasAutomation !== undefined) template.hasAutomation = updates.hasAutomation;
        if (updates.automationLanes !== undefined) template.automationLanes = updates.automationLanes;
        return template;
    }
    return null;
}

export function removeTrackTemplateState(id) {
    // Capture undo state before removing template
    if (appServices.captureStateForUndo) {
        const template = trackTemplatesState.find(t => t.id === id);
        if (template) {
            appServices.captureStateForUndo(`Delete Track Template "${template.name}"`);
        }
    }
    trackTemplatesState = trackTemplatesState.filter(t => t.id !== id);
    return true;
}

export function clearTrackTemplatesState() {
    // Capture undo state before clearing all templates (only if not already empty)
    if (appServices.captureStateForUndo && trackTemplatesState.length > 0) {
        appServices.captureStateForUndo(`Clear All Track Templates`);
    }
    trackTemplatesState = [];
}

// --- Window Management ---
// Note: getOpenWindowsState and getWindowByIdState are already declared above (lines 89-90)
// to avoid circular dependency issues with window management

export function setHighestZState(value) { highestZ = Number.isFinite(value) ? value : 100; }
export function incrementHighestZState() { return ++highestZ; }

// --- Master Effects Chain Management ---
export function addMasterEffectToState(effectType, initialParams) {
    // Capture undo state before adding effect
    if (appServices.captureStateForUndo) {
        appServices.captureStateForUndo(`Add Master Effect "${effectType}"`);
    }
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
    // Capture undo state before removing effect
    if (appServices.captureStateForUndo) {
        const effect = masterEffectsChainState.find(e => e.id === effectId);
        if (effect) {
            appServices.captureStateForUndo(`Remove Master Effect "${effect.type}"`);
        }
    }
    const effectIndex = masterEffectsChainState.findIndex(e => e.id === effectId);
    if (effectIndex > -1) {
        masterEffectsChainState.splice(effectIndex, 1);
    }
}

export function updateMasterEffectParamInState(effectId, paramPath, value) {
    // Capture undo state before modifying effect param
    if (appServices.captureStateForUndo) {
        const effect = masterEffectsChainState.find(e => e.id === effectId);
        if (effect) {
            const paramName = paramPath.split('.').pop();
            appServices.captureStateForUndo(`Update Master Effect "${effect.type}" ${paramName}`);
        }
    }
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
        if (appServices) appServices._isReconstructingDAW_flag = true; // Signal reconstruction globally
        await reconstructDAWInternal(stateToRestore, true); // true for isUndoRedo
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
                midiLearnMappings: JSON.parse(JSON.stringify(getMidiLearnMappingsState())),
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
        if (appServices) appServices._isReconstructingDAW_flag = false;
        return;
    }
    
    if (appServices) appServices._isReconstructingDAW_flag = true;

    // --- Global Reset Phase ---
    try {
        Tone.Transport.stop();
        Tone.Transport.cancel(0);
        if (appServices && appServices.initAudioContextAndMasterMeter) await appServices.initAudioContextAndMasterMeter(true); // Ensure audio context is running, true for user initiated context
        (getTracksState() || []).forEach(track => { if (track && typeof track.dispose === 'function') track.dispose(); });
        tracks = [];
        trackIdCounter = 0;
        if (appServices && appServices.clearAllMasterEffectNodes) appServices.clearAllMasterEffectNodes(); else console.warn("clearAllMasterEffectNodes service missing");
        masterEffectsChainState = [];
        if (appServices && appServices.closeAllWindows) appServices.closeAllWindows(true); else console.warn("closeAllWindows service missing");
        if (appServices && appServices.clearOpenWindowsMap) appServices.clearOpenWindowsMap(); else console.warn("clearOpenWindowsMap service missing");
        highestZ = 100;
        setArmedTrackIdState(null); setSoloedTrackIdState(null); setActiveSequencerTrackIdState(null);
        setIsRecordingState(false); setRecordingTrackIdState(null);
        if (appServices && appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(false);
    } catch (error) {
        console.error("[State reconstructDAWInternal] Error during global reset phase:", error);
        if (appServices.showNotification) appServices.showNotification("Critical error during project reset.", 5000);
        if (appServices) appServices._isReconstructingDAW_flag = false;
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
        if (appServices && appServices.setActualMasterVolume) appServices.setActualMasterVolume(getMasterGainValueState());
        setPlaybackModeStateInternal(gs.playbackMode === 'timeline' || gs.playbackMode === 'sequencer' ? gs.playbackMode : 'sequencer');
        if (appServices && appServices.updateTaskbarTempoDisplay) appServices.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        setHighestZState(Number.isFinite(gs.highestZIndex) ? gs.highestZIndex : 100);

        // MIDI Learn mappings restoration
        if (gs.midiLearnMappings && Array.isArray(gs.midiLearnMappings)) {
            midiLearnMappings = gs.midiLearnMappings.map(m => ({ ...Constants.DEFAULT_MIDI_LEARN_MAPPING, ...m }));
            if (appServices && appServices.updateMidiLearnMappingsUI) {
                appServices.updateMidiLearnMappingsUI();
            }
        }

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

// MIDI Note name to MIDI note number mapping (C4 = 60)
const noteNameToMidi = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
};

function noteNameToMidiNumber(noteName, octave) {
    // MIDI note number = (octave + 1) * 12 + noteNameToMidi[noteNameWithoutOctave]
    // Middle C (C4) = 60
    const baseNote = noteName.replace(/\d+$/, ''); // Remove octave number
    const noteNum = noteNameToMidi[baseNote];
    if (noteNum === undefined) return 60; // Default to middle C
    return (octave + 1) * 12 + noteNum;
}

function pitchToRow(rowIndex, trackType) {
    if (trackType === 'Synth' || trackType === 'InstrumentSampler') {
        // synthPitches is reversed, so we need to map properly
        // synthPitches[0] is last (highest), so rowIndex needs mapping
        // The actual pitch for row 0 is at synthPitches[0] which is the FIRST element of the reversed array
        // synthPitches was reversed, so first element is highest pitch (B6)
        // But actual row 0 is HIGHEST, so let's use a similar approach to synth, starting from a base
        const baseNote = 48; // C3 as base
        return baseNote + rowIndex;
    } else if (trackType === 'DrumSampler') {
        // DrumSampler rows map to pads 0-7, which map to MIDI notes 36-43
        return 36 + rowIndex; // Rows 0-7 = MIDI 36-43
    } else if (trackType === 'Sampler') {
        // Sampler rows map to slices
        // Use a similar approach to synth, starting from a base
        const baseNote = 48; // C3 as base
        return baseNote + rowIndex;
    }
    return 60; // Default to middle C
}

// Convert tempo and time signature to ticks
function tempoToTicks(tempo, ticksPerQuarterNote) {
    // We use fixed tempo at the resolution for simplicity
    // MIDI delta time is in ticks, and tempo is embedded
    return ticksPerQuarterNote; // Always ticks per quarter note
}

// ============================================
// Export to MIDI - Main Function
// ============================================
export async function exportToMidiInternal() {
    if (!appServices.showNotification) {
        console.error("[State exportToMidiInternal] Required appServices not available.");
        alert("Export MIDI feature is currently unavailable due to an internal error.");
        return;
    }

    const { getTempoState, getTimeSignatureState, getTracksState, getPlaybackModeState, getSequencesState } = await import('./state.js');

    try {
        const tempo = getTempoState() || 120;
        const timeSig = getTimeSignatureState() || { numerator: 4, denominator: 4 };
        const tracks = getTracksState() || [];
        const playbackMode = getPlaybackModeState() || 'sequence';

        // Collect all notes from all tracks
        const allNotes = [];
        const trackInfo = [];

        for (const track of tracks) {
            if (!track || track.type === 'Audio') continue;

            let sequences = [];

            if (playbackMode === 'sequence') {
                // Get the active sequence for this track
                const activeSeq = track.getActiveSequence ? track.getActiveSequence() : null;
                if (activeSeq) {
                    sequences = [activeSeq];
                }
            } else {
                // timeline mode - get all sequences from timeline clips (simplified for now)
                sequences = track.sequences || [];
            }

            for (const seq of sequences) {
                if (!seq || !seq.data) continue;

                const trackRowOffset = allNotes.length > 0 ? allNotes.length : 0;

                for (let row = 0; row < seq.data.length; row++) {
                    const rowData = seq.data[row];
                    if (!rowData) continue;

                    for (let col = 0; col < rowData.length; col++) {
                        const cell = rowData[col];
                        if (!cell || !cell.active) continue;

                        const midiNote = pitchToRow(row, track.type);
                        const velocity = cell.velocity !== undefined ? Math.round(cell.velocity * Constants.MIDI_EXPORT_VELOCITY_SCALE) : 100;
                        const probability = cell.probability !== undefined ? cell.probability : 1.0;

                        // Calculate time position
                        // Each step = 1/16th note (since STEPS_PER_BAR = 16)
                        // In ticks, with 480 TicksPerQuarterNote, a 16th note = 120 ticks
                        const stepDurationTicks = Constants.MIDI_EXPORT_TicksPerQuarterNote / 4; // 120 ticks per 16th note
                        const startTicks = col * stepDurationTicks;
                        const noteLengthTicks = (cell.length || 1) * stepDurationTicks;

                        // Calculate bar from step
                        const stepsPerBar = 16; // STEPS_PER_BAR
                        const bar = Math.floor(col / stepsPerBar);
                        const beatInBar = (col % stepsPerBar) / 4; // 4 steps per beat
                        const quarterNotesPerBar = 4; // Assuming 4/4 time
                        const ticksPerBar = Constants.MIDI_EXPORT_TicksPerQuarterNote * quarterNotesPerBar;

                        const absoluteTicks = bar * ticksPerBar + beatInBar * Constants.MIDI_EXPORT_TicksPerQuarterNote;

                        allNotes.push({
                            time: absoluteTicks,
                            duration: noteLengthTicks,
                            note: midiNote,
                            velocity: velocity,
                            probability: probability,
                            track: track.name,
                            trackId: track.id
                        });

                        trackInfo.push({ trackId: track.id, trackName: track.name, trackType: track.type });
                    }
                }
            }
        }

        if (allNotes.length === 0) {
            appServices.showNotification("Nothing to export. Add some notes first.", 3000);
            return;
        }

        appServices.showNotification(`Exporting ${allNotes.length} notes to MIDI...`, 2000);

        // Build MIDI file structure
        // MIDI File Format 0 (single track)
        // Header Chunk: MThd
        // Track Chunk: MTrk

        const ticksPerQuarter = Constants.MIDI_EXPORT_TicksPerQuarterNote;

        // Build track events
        // We'll put all notes in a single track (format 0)
        const trackEvents = [];

        // Set tempo event (meta event 0xFF 0x51)
        // Tempo in microseconds per quarter note
        const microsecondsPerQuarter = Math.round(60000000 / tempo);
        trackEvents.push({ tick: 0, type: 'tempo', value: microsecondsPerQuarter });

        // Time signature event (meta event 0xFF 0x58)
        trackEvents.push({ tick: 0, type: 'timeSig', numerator: timeSig.numerator || 4, denominator: timeSig.denominator || 4 });

        // Track name event
        trackEvents.push({ tick: 0, type: 'trackName', name: 'SnugOS Export' });

        // Add note events (sorted by time)
        allNotes.sort((a, b) => a.time - b.time);

        let lastTick = 0;
        for (const note of allNotes) {
            // Note On event
            trackEvents.push({
                tick: note.time - lastTick,
                type: 'noteOn',
                channel: Constants.MIDI_DEFAULT_CHANNEL,
                note: note.note,
                velocity: note.velocity
            });
            lastTick = note.time;

            // Note Off event
            trackEvents.push({
                tick: note.duration,
                type: 'noteOff',
                channel: Constants.MIDI_DEFAULT_CHANNEL,
                note: note.note,
                velocity: 0
            });
        }

        // End of track event
        trackEvents.push({ tick: 0, type: 'endOfTrack' });

        // Build MIDI file
        const midiData = buildMidiFile(trackEvents, ticksPerQuarter);

        // Download
        const blob = new Blob([midiData], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${Constants.DEFAULT_MIDI_EXPORT_FILENAME_PREFIX}-${new Date().toISOString().replace(/[:.]/g, '-')}.mid`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        appServices.showNotification(`Export to MIDI successful! (${allNotes.length} notes)`, 3000);

    } catch (error) {
        console.error("[State exportToMidiInternal] Error:", error);
        appServices.showNotification(`Export error: ${error.message}`, 5000);
    }
}

function buildMidiFile(events, ticksPerQuarter) {
    // Build variable-length quantity (delta time) for MIDI
    function toVLQ(value) {
        if (value === 0) return [0];

        const bytes = [];
        let v = value;
        bytes.unshift(v & 0x7F);
        v >>= 7;
        while (v > 0) {
            bytes.unshift((v & 0x7F) | 0x80);
            v >>= 7;
        }
        // Clear the high bit of the last byte
        bytes[bytes.length - 1] &= 0x7F;
        return bytes;
    }

    function writeVarInt(buffer, value) {
        const vlq = toVLQ(value);
        for (const b of vlq) {
            buffer.push(b);
        }
    }

    function writeString(buffer, str) {
        for (let i = 0; i < str.length; i++) {
            buffer.push(str.charCodeAt(i));
        }
    }

    function intToVLQ(value) {
        return toVLQ(value);
    }

    const buffer = [];

    // MIDI Header Chunk: MThd
    writeString(buffer, 'MThd');
    buffer.push(0, 0, 0, 6); // Chunk length (6 bytes)
    buffer.push(0, 0); // Format 0
    buffer.push(0, 1); // 1 track
    buffer.push((ticksPerQuarter >> 8) & 0xFF, ticksPerQuarter & 0xFF); // Division (ticks per quarter note)

    // Build track data first
    const trackBuffer = [];
    let lastTick = 0;

    for (const event of events) {
        const deltaTick = event.tick - lastTick;
        lastTick = event.tick;

        writeVarInt(trackBuffer, deltaTick);

        switch (event.type) {
            case 'tempo':
                trackBuffer.push(0xFF, 0x51, 0x03);
                trackBuffer.push((event.value >> 16) & 0xFF);
                trackBuffer.push((event.value >> 8) & 0xFF);
                trackBuffer.push(event.value & 0xFF);
                break;

            case 'timeSig':
                trackBuffer.push(0xFF, 0x58, 0x04);
                trackBuffer.push(event.numerator);
                trackBuffer.push(Math.log2(event.denominator));
                trackBuffer.push(24); // Clocks per metronome click
                trackBuffer.push(8); // 32nd notes per quarter note
                break;

            case 'trackName':
                trackBuffer.push(0xFF, 0x03);
                const nameBytes = new TextEncoder().encode(event.name);
                trackBuffer.push(nameBytes.length);
                for (const b of nameBytes) trackBuffer.push(b);
                break;

            case 'noteOn':
                trackBuffer.push(0x90 | event.channel);
                trackBuffer.push(event.note & 0x7F);
                trackBuffer.push(event.velocity & 0x7F);
                break;

            case 'noteOff':
                trackBuffer.push(0x80 | event.channel);
                trackBuffer.push(event.note & 0x7F);
                trackBuffer.push(0);
                break;

            case 'endOfTrack':
                trackBuffer.push(0xFF, 0x2F, 0x00);
                break;
        }
    }

    // MIDI Track Chunk: MTrk
    writeString(buffer, 'MTrk');
    const trackLength = trackBuffer.length;
    buffer.push((trackLength >> 24) & 0xFF);
    buffer.push((trackLength >> 16) & 0xFF);
    buffer.push((trackLength >> 8) & 0xFF);
    buffer.push(trackLength & 0xFF);
    for (const b of trackBuffer) buffer.push(b);

    return new Uint8Array(buffer);
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

// ============================================
// Import from MIDI - Main Function
// ============================================
export async function importFromMidiInternal() {
    if (!appServices.showNotification) {
        console.error("[State importFromMidiInternal] Required appServices not available.");
        alert("Import MIDI feature is currently unavailable due to an internal error.");
        return null;
    }

    try {
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.mid,.midi,.smf';

        return new Promise((resolve) => {
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    resolve(null);
                    return;
                }

                appServices.showNotification(`Reading MIDI file: ${file.name}...`, 2000);

                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const midiData = new Uint8Array(arrayBuffer);
                    const parsed = parseMidiFile(midiData);

                    if (!parsed || parsed.notes.length === 0) {
                        appServices.showNotification("No notes found in MIDI file.", 3000);
                        resolve(null);
                        return;
                    }

                    appServices.showNotification(`Found ${parsed.notes.length} notes. Creating track...`, 2000);

                    // Create a new Synth track for the imported MIDI
                    const { getTracksState, addTrackState } = await import('./state.js');
                    const tracks = getTracksState();

                    // Find a unique track name
                    let trackName = 'MIDI Import';
                    const existingNames = tracks.map(t => t.name);
                    let counter = 1;
                    while (existingNames.includes(trackName)) {
                        trackName = `MIDI Import ${counter}`;
                        counter++;
                    }

                    // Create new track
                    const newTrack = appServices.createTrackInternal('Synth', trackName);
                    if (!newTrack) {
                        appServices.showNotification("Failed to create track for MIDI import.", 3000);
                        resolve(null);
                        return;
                    }

                    addTrackState(newTrack);
                    const trackId = newTrack.id;

                    // Get the track and sequence
                    const { getTrackByIdState } = await import('./state.js');
                    const track = getTrackByIdState(trackId);
                    if (!track) {
                        appServices.showNotification("Failed to get created track.", 3000);
                        resolve(null);
                        return;
                    }

                    const sequence = track.getActiveSequence();
                    if (!sequence) {
                        appServices.showNotification("Failed to get sequence from track.", 3000);
                        resolve(null);
                        return;
                    }

                    // Determine how many bars we need
                    const maxCol = Math.max(...parsed.notes.map(n => n.startStep + n.length));
                    const targetBars = Math.ceil(maxCol / 16);
                    const barsNeeded = Math.max(1, Math.min(targetBars, Constants.MAX_BARS));

                    // Extend sequence if needed
                    while (sequence.data[0].length < targetBars * 16) {
                        for (let row = 0; row < sequence.data.length; row++) {
                            if (!sequence.data[row]) sequence.data[row] = [];
                            for (let i = 0; i < 16; i++) {
                                sequence.data[row].push({ active: false });
                            }
                        }
                    }

                    // Capture undo state before import
                    if (appServices.captureStateForUndo) {
                        appServices.captureStateForUndo(`Import MIDI: ${file.name}`);
                    }

                    // Place notes in sequence
                    let placedCount = 0;
                    for (const note of parsed.notes) {
                        const { row, col, velocity, length } = note;

                        // Validate row and col
                        if (row < 0 || row >= sequence.data.length) continue;
                        if (col < 0 || col >= sequence.data[0].length) continue;

                        // Place the note
                        if (!sequence.data[row][col].active) {
                            sequence.data[row][col] = {
                                active: true,
                                velocity: velocity,
                                length: length || 1,
                                probability: Constants.MIDI_IMPORT_DEFAULT_PROBABILITY
                            };
                            placedCount++;
                        }
                    }

                    // Rebuild the Tone sequence to apply changes
                    if (track.recreateToneSequence) {
                        track.recreateToneSequence();
                    }

                    // Update tempo if specified in MIDI file
                    if (parsed.tempo && parsed.tempo > 0) {
                        const { setTempoState } = await import('./state.js');
                        const clampedTempo = Math.min(Math.max(parsed.tempo, Constants.MIN_TEMPO), Constants.MAX_TEMPO);
                        setTempoState(clampedTempo);
                        if (appServices.updateTempo) {
                            appServices.updateTempo(clampedTempo);
                        }
                    }

                    // Update time signature if specified
                    if (parsed.timeSignature) {
                        const { setTimeSignatureState } = await import('./state.js');
                        setTimeSignatureState(parsed.timeSignature.numerator, parsed.timeSignature.denominator);
                    }

                    appServices.showNotification(`Imported ${placedCount} notes from MIDI.`, 3000);
                    resolve({ trackId, notesImported: placedCount });
                } catch (err) {
                    console.error("[State importFromMidiInternal] Error parsing MIDI:", err);
                    appServices.showNotification(`Failed to parse MIDI file: ${err.message}`, 5000);
                    resolve(null);
                }
            };

            input.click();
        });
    } catch (error) {
        console.error("[State importFromMidiInternal] Error:", error);
        appServices.showNotification(`Import error: ${error.message}`, 5000);
        return null;
    }
}

function parseMidiFile(data) {
    // Validate MIDI header
    if (data.length < 14) {
        throw new Error("Invalid MIDI file: too short");
    }

    // Read header chunk
    const headerTag = String.fromCharCode(data[0], data[1], data[2], data[3]);
    if (headerTag !== 'MThd') {
        throw new Error("Invalid MIDI file: missing MThd header");
    }

    const headerLength = (data[4] << 24) | (data[5] << 16) | (data[7] << 8) | data[8];
    if (headerLength !== 6) {
        throw new Error("Invalid MIDI header length");
    }

    const format = (data[9] << 8) | data[10];
    const numTracks = (data[11] << 8) | data[12];
    const division = (data[13] << 8) | data[14];

    // We support format 0 (single track) and format 1 (multiple tracks)
    if (format > 1) {
        throw new Error("Unsupported MIDI format. Only Type 0 and Type 1 are supported.");
    }

    let ticksPerQuarter = division;
    if (division & 0x8000) {
        // SMPTE format - negative FPS
        const fps = -(division >> 8);
        const ticksPerFrame = division & 0xFF;
        ticksPerQuarter = Math.round((fps * ticksPerFrame) * 4);
    }

    const notes = [];
    let tempo = 0;
    let timeSignature = null;
    let currentPos = 14; // After header

    // Parse all tracks
    for (let trackNum = 0; trackNum < numTracks && currentPos < data.length; trackNum++) {
        if (currentPos + 8 > data.length) break;

        const trackTag = String.fromCharCode(data[currentPos], data[currentPos + 1], data[currentPos + 2], data[currentPos + 3]);
        if (trackTag !== 'MTrk') {
            // Skip to next potential MTrk
            currentPos++;
            continue;
        }

        const trackLength = (data[currentPos + 4] << 24) | (data[currentPos + 5] << 16) | (data[currentPos + 7] << 8) | data[currentPos + 8];
        currentPos += 8;

        const trackEnd = currentPos + trackLength;
        let currentTick = 0;
        const runningStatus = { type: null, channel: 0 };

        while (currentPos < trackEnd && currentPos < data.length) {
            // Read delta time (variable length quantity)
            const deltaTime = readVarLen(data, currentPos);
            currentTick += deltaTime.value;
            currentPos = deltaTime.nextPos;

            if (currentPos >= trackEnd) break;

            let status = data[currentPos];
            currentPos++;

            // Handle running status
            if ((status & 0x80) === 0) {
                // Running status - use last status byte
                currentPos--; // Put it back
                status = runningStatus.type;
            } else {
                runningStatus.type = status;
            }

            const messageType = status & 0xF0;
            const channel = status & 0x0F;
            runningStatus.channel = channel;

            if (messageType === 0x90) {
                // Note On
                if (currentPos + 2 > data.length) break;
                const noteNum = data[currentPos];
                const velocity = data[currentPos + 1];
                currentPos += 2;

                if (velocity > 0) {
                    // Note On with velocity > 0
                    // Convert tick to step (16th notes)
                    const step = Math.floor((currentTick / ticksPerQuarter) * 4);
                    const midiNote = noteNum;

                    notes.push({
                        midiNote,
                        velocity: velocity / Constants.MIDI_IMPORT_MAX_VELOCITY, // Scale to 0-1
                        startTick: currentTick,
                        startStep: step,
                        length: 1 // Default length, can be improved with Note Off
                    });
                }
            } else if (messageType === 0x80) {
                // Note Off
                if (currentPos + 2 > data.length) break;
                const noteNum = data[currentPos];
                const velocity = data[currentPos + 1];
                currentPos += 2;

                // Find matching Note On and calculate length
                for (let i = notes.length - 1; i >= 0; i--) {
                    const note = notes[i];
                    if (note.midiNote === noteNum && !note.endTick) {
                        const noteLengthTicks = currentTick - note.startTick;
                        const noteLengthSteps = Math.max(1, Math.round((noteLengthTicks / ticksPerQuarter) * 4));
                        note.length = noteLengthSteps;
                        note.endTick = currentTick;
                        break;
                    }
                }
            } else if (messageType === 0xA0) {
                // Aftertouch (2 bytes)
                currentPos += 2;
            } else if (messageType === 0xB0) {
                // Control Change (2 bytes)
                currentPos += 2;
            } else if (messageType === 0xC0) {
                // Program Change (1 byte)
                currentPos += 1;
            } else if (messageType === 0xD0) {
                // Channel Pressure (1 byte)
                currentPos += 1;
            } else if (messageType === 0xE0) {
                // Pitch Bend (2 bytes)
                currentPos += 2;
            } else if (status === 0xFF) {
                // Meta event
                if (currentPos >= trackEnd) break;
                const metaType = data[currentPos];
                currentPos++;
                const metaLength = readVarLen(data, currentPos);
                currentPos = metaLength.nextPos + metaLength.value;

                if (metaType === 0x51) {
                    // Set Tempo
                    if (metaLength.value >= 3) {
                        const microseconds = (data[currentPos] << 16) | (data[currentPos + 1] << 8) | data[currentPos + 2];
                        tempo = Math.round(60000000 / microseconds);
                    }
                } else if (metaType === 0x58) {
                    // Time Signature
                    if (metaLength.value >= 4) {
                        timeSignature = {
                            numerator: data[currentPos],
                            denominator: data[currentPos + 1]
                        };
                    }
                } else if (metaType === 0x03) {
                    // Track Name
                    // Already have track name from reading
                }

                currentPos += metaLength.value;
            } else if (status === 0xF0 || status === 0xF7) {
                // SysEx event - read length then skip
                const sysexLength = readVarLen(data, currentPos);
                currentPos = sysexLength.nextPos + sysexLength.value;
            }
        }

        currentPos = trackEnd;
    }

    // Map MIDI notes to rows (inverse of pitchToRow in export)
    // For Synth: baseNote = 48 (C3), so row = midiNote - 48
    const baseNote = 48; // C3
    const maxRows = 88; // Default sequence height

    for (const note of notes) {
        note.row = note.midiNote - baseNote;
        // Clamp to valid range
        note.row = Math.max(0, Math.min(note.row, maxRows - 1));
    }

    return { notes, tempo, timeSignature, format, ticksPerQuarter };
}

function readVarLen(data, offset) {
    let value = 0;
    let pos = offset;

    while (pos < data.length) {
        const byte = data[pos++];
        value = (value << 7) | (byte & 0x7F);
        if ((byte & 0x80) === 0) {
            break;
        }
    }

    return { value, nextPos: pos };
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
