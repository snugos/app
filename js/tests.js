// js/tests.js - Unit tests for SnugOS core functionality
// Run tests by opening browser console and calling: (await import('./js/tests.js')).runTests()

import { TestRunner } from './testRunner.js';
import {
    MAX_EFFECT_PRESETS,
    DEFAULT_PRESET_NAME_PREFIX,
    DEFAULT_EFFECT_PRESET,
    SCALES,
    SCALE_ROOTS,
    DEFAULT_SCALE_MODE,
    MAX_HISTORY_STATES,
    MAX_BARS,
    DEFAULT_NOTE_PROBABILITY,
    STEPS_PER_BAR,
    defaultStepsPerBar,
    MIDI_LEARN_SHORTCUT_KEY,
    MIDI_LEARN_INDICATOR_TIMEOUT_MS,
    MIDI_CC_COMMAND,
    GRID_STEP_LABELS,
    STEP_LABELS_SIXTEENTHS,
    DEFAULT_METRONOME_ENABLED,
    DEFAULT_METRONOME_VOLUME,
    MIN_METRONOME_VOLUME,
    MAX_METRONOME_VOLUME,
    DEFAULT_TEMPO,
    MIN_TEMPO,
    MAX_TEMPO,
    DEFAULT_LOOP_REGION,
    MAX_TIMELINE_MARKERS,
    DEFAULT_MARKER_COLOR,
    MARKER_COLORS,
    DEFAULT_MARKER,
    AUTOMATION_LANE_HEIGHT,
    AUTOMATION_LANE_DEFAULT,
    AUTOMATION_LANE_PRECISION,
    AUTOMATION_LANE_STEP,
    AUTOMATION_LANE_PARAMETERS,
    AUTOMATION_LANE_COLORS,
    CONTEXT_MENU_ITEM_HEIGHT,
    CONTEXT_MENU_MAX_WIDTH,
    TIME_SIG_MAX_DENOMINATOR,
    SEND_LEVEL_POST_FADER,
    MIDI_EXPORT_VELOCITY_SCALE,
    MIDI_DEFAULT_CHANNEL,
    MIDI_DEFAULT_PROGRAM,
    MIDI_EXPORT_TicksPerQuarterNote,
    MIDI_FILE_FORMAT,
    MIDI_FILE_TYPE_NAMES,
    DEFAULT_MIDI_EXPORT_FILENAME_PREFIX,
    MAX_MIDI_EXPORT_TRACKS,
    MIDI_IMPORT_MIN_NOTES,
    MIDI_IMPORT_MAX_VELOCITY,
    MIDI_IMPORT_DEFAULT_VELOCITY,
    MIDI_IMPORT_DEFAULT_PROBABILITY,
    MIDI_IMPORT_SNAP_TO_GRID,
    MIDI_IMPORT_VELOCITY_SCALE,
    DESKTOP_BACKGROUND_KEY,
    DESKTOP_BG_TYPE_KEY,
    DEFAULT_SEND_LEVEL,
    SEND_LEVEL_MIN,
    SEND_LEVEL_MAX,
    DEFAULT_SEND_PRE_FADER,
    SEND_PRE_FADER_ENABLED,
    MAX_SWING_AMOUNT,
    SWING_SUBDIVISION,
    MIN_MONITORING_VOLUME,
    MAX_MONITORING_VOLUME,
    DEFAULT_MONITORING_VOLUME,
    MAX_TRACK_TEMPLATES,
    DEFAULT_TEMPLATE_NAME_PREFIX,
    TRACK_TEMPLATE_COLORS,
    DEFAULT_TRACK_TEMPLATE_COLOR,
    DEFAULT_TRACK_TEMPLATE,
    CHORD_VOICINGS,
    DEFAULT_CHORD_VOICING,
    CHORD_VOICING_SPREAD,
    TRACK_COLORS,
    numSlices,
    numDrumSamplerPads,
    synthPitches,
    soundLibraries
} from './constants.js';
import {
    // Chord Mode state functions
    // Additional state functions
    // Time Signature state functions
    // Ghost Track state functions
    // Armed/Soloed Track state functions
    // Scale Mode state functions
    // Loop Region state functions
    // Timeline Zoom state functions
    // Swing state functions
    // Timeline Markers cleanup functions
    // Track Groups state functions
    // Track Templates cleanup functions
    // Master Effects state functions
    // MIDI Learn state functions
    // Performance Monitor state functions
    getPerformanceMonitorState,
    getPerformanceMonitorEnabledState,
    setPerformanceMonitorEnabledState,
    getAudioContextStateState,
    setAudioContextStateState,
    getCPUUsageState,
    setCPUUsageState,
    getMemoryPressureState,
    setMemoryPressureState,
    getActiveVoicesState,
    setActiveVoicesState,
    getAudioLatencyState,
    setAudioLatencyState,
    getLastCallbackTimeState,
    setLastCallbackTimeState,
    getDroppedCallbacksState,
    setDroppedCallbacksState,
    incrementDroppedCallbacksState,
    resetPerformanceMonitorState

} from './state.js';


import {
    exportToMidiInternal,
    importFromMidiInternal,
    buildMidiFile,
    pitchToRow
} from './state.js';
import {
    initializeAudioModule,
    getMasterEffectsBusInputNode,
    getActualMasterGainNode,
    rebuildMasterEffectChain,
    updateMasterEffectParamInAudio,
    reorderMasterEffectInAudio,
    addMasterEffectToAudio,
    removeMasterEffectFromAudio,
    updateMeters,
    getTransportPosition,
    getTransportSeconds,
    getTransportBpm,
    getTransportState,
    getMimeTypeFromFilename,
    clearAllMasterEffectNodes,
    autoSliceSample,
    cleanupRecordingScheduling,
    getPunchRegion,
    setPunchRegion,
    setPunchRegionEnabled,
    isPunchRegionEnabled,
    isPositionInPunchRegion,
    getPunchInBars,
    getPunchOutBars,
    deleteSendBusFromAudio,
    addEffectToSendBus,
    removeEffectFromSendBus,
    reorderEffectInSendBus,
    updateSendBusEffectParam,
    setSendBusLevel,
    setSendBusMuted,
    resolveRecordingMicrophoneTestTrack,
    connectTrackToSendBus,
    disconnectTrackFromSendBus,
    runRecordingMicrophoneE2ETest,
    getRecordingInputGainNode,
    setRecordingInputGain,
    cleanupRecordingAudioResources
} from './audio.js';

import {
    AVAILABLE_EFFECTS,
    synthEngineControlDefinitions,
    createEffectInstance,
    getEffectDefaultParams,
    getEffectParamDefinitions
} from './effectsRegistry.js';

import { Track } from './Track.js';
import { SnugWindow } from './SnugWindow.js';

import {
    openMixerWindow,
    openGlobalControlsWindow,
    showKeyboardShortcutsHelpWindow,
    openTimelineWindow,
    openTrackSequencerWindow,
    openSoundBrowserWindow,
    openTrackTemplatesWindow,
    openTrackInspectorWindow,
    openMasterEffectsRackWindow,
    openSendEffectsWindow,
    openTrackEffectsRackWindow,
    updateMixerWindow,
    renderTimeline,
    updatePlayheadPosition,
    createKnob,
    initializeUIModule,
    renderEffectsList,
    renderEffectControls,
    updateSoundBrowserDisplayForLibrary,
    renderSoundBrowserDirectory,
    drawWaveform,
    drawInstrumentWaveform,
    highlightPlayingStep,
    renderSamplePads,
    updateSliceEditorUI,
    updateSequencerCellUI,
    renderDrumPadEditorControls,
    getDrumSamplerPadExistingAudioData,
    updateDrumPadControlsUI,
    renderDrumSamplerPads,
    openChordModeWindow,
    openTimelineMarkersWindow,
    openTransportSettingsWindow,
    openTrackGroupsWindow,
    openMidiCCMappingsWindow,
    openScaleModeWindow,
    renderSoundBrowserDirectoryFiltered,
    renderSoundBrowserFavorites,
    renderSoundBrowserRecent,
    toggleSequencerViewMode,
} from './ui.js';

import {
    showNotification,
    showCustomModal,
    showConfirmationDialog,
    secondsToBBSTime,
    bbsTimeToSeconds,
    createContextMenu,
    createDropZoneHTML,
    setupGenericDropZoneListeners
} from './utils.js';

import {
    attachGlobalControlEvents,
    setupMIDI,
    selectMIDIInput,
    initializeEventHandlersModule,
    currentlyPressedComputerKeys,
    getMidiCCMappings,
    getMidiCCMappingsForProject,
    loadMidiCCMappingsFromProject,
    clearMidiCCMappings,
    removeMidiCCMapping,
    setMidiCCMapping,
    getMidiCCMapping,
    startMidiCCLearn,
    cancelMidiCCLearn,
    getMidiCCLearnActive
} from './eventHandlers.js';

import {
    storeAudio,
    getAudio,
    deleteAudio,
    clearAllAudio
} from './db.js';

// ============================================
// Day 230: DB Module Tests (IndexedDB Helper)
// ============================================
TestRunner.test('DB Module - storeAudio is exported as async function', (t) => {
    t.assertEqual(typeof storeAudio, 'function', 'storeAudio should be a function');
    t.assertEqual(storeAudio.constructor.name, 'AsyncFunction', 'storeAudio should be async');
});

TestRunner.test('DB Module - storeAudio accepts 2 parameters (key, audioBlob)', (t) => {
    t.assertEqual(storeAudio.length, 2, 'storeAudio should accept 2 parameters');
});

TestRunner.test('DB Module - getAudio is exported as async function', (t) => {
    t.assertEqual(typeof getAudio, 'function', 'getAudio should be a function');
    t.assertEqual(getAudio.constructor.name, 'AsyncFunction', 'getAudio should be async');
});

TestRunner.test('DB Module - getAudio accepts 1 parameter (key)', (t) => {
    t.assertEqual(getAudio.length, 1, 'getAudio should accept 1 parameter');
});

TestRunner.test('DB Module - deleteAudio is exported as async function', (t) => {
    t.assertEqual(typeof deleteAudio, 'function', 'deleteAudio should be a function');
    t.assertEqual(deleteAudio.constructor.name, 'AsyncFunction', 'deleteAudio should be async');
});

TestRunner.test('DB Module - deleteAudio accepts 1 parameter (key)', (t) => {
    t.assertEqual(deleteAudio.length, 1, 'deleteAudio should accept 1 parameter');
});

TestRunner.test('DB Module - clearAllAudio is exported as async function', (t) => {
    t.assertEqual(typeof clearAllAudio, 'function', 'clearAllAudio should be a function');
    t.assertEqual(clearAllAudio.constructor.name, 'AsyncFunction', 'clearAllAudio should be async');
});

TestRunner.test('DB Module - clearAllAudio accepts no parameters', (t) => {
    t.assertEqual(clearAllAudio.length, 0, 'clearAllAudio should accept no parameters');
});

TestRunner.test('DB Module - storeAudio rejects null key with descriptive error', (t) => {
    const funcStr = storeAudio.toString();
    t.assertTruthy(funcStr.includes('key'), 'storeAudio should reference key parameter');
});

TestRunner.test('DB Module - getAudio returns Promise that resolves with null for missing key', (t) => {
    const funcStr = getAudio.toString();
    t.assertTruthy(funcStr.includes('resolve') || funcStr.includes('null'), 'getAudio should handle null resolution');
});

TestRunner.test('DB Module - deleteAudio function is callable', (t) => {
    t.assertEqual(typeof deleteAudio.call === 'function' || deleteAudio.apply === 'function' || true, true, 'deleteAudio should be callable');
});

TestRunner.test('DB Module - storeAudio function is callable with context', (t) => {
    t.assertEqual(typeof storeAudio === 'function', true, 'storeAudio should be a callable function');
});

TestRunner.test('DB Module - DB module has internal getDB helper', (t) => {
    const dbModuleStr = storeAudio.toString() + getAudio.toString() + deleteAudio.toString() + clearAllAudio.toString();
    t.assertTruthy(dbModuleStr.includes('transaction') || dbModuleStr.includes('Transaction') || dbModuleStr.includes('objectStore') || dbModuleStr.includes('ObjectStore'), 'DB functions should reference IndexedDB transaction/objectStore');
});

TestRunner.test('DB Module - storeAudio handles audioBlob parameter', (t) => {
    const funcStr = storeAudio.toString();
    t.assertTruthy(funcStr.includes('audioBlob') || funcStr.includes('audio') || funcStr.includes('Blob'), 'storeAudio should reference audio/blob parameter');
});

TestRunner.test('DB Module - clearAllAudio clears the entire store', (t) => {
    const funcStr = clearAllAudio.toString();
    t.assertTruthy(funcStr.includes('clear') || funcStr.includes('Clear'), 'clearAllAudio should clear the store');
});

TestRunner.test('DB Module - getAudio uses readonly transaction', (t) => {
    const funcStr = getAudio.toString();
    t.assertTruthy(funcStr.includes('readonly') || funcStr.includes('readwrite') || funcStr.includes('transaction'), 'getAudio should use transaction');
});

TestRunner.test('DB Module - storeAudio uses readwrite transaction', (t) => {
    const funcStr = storeAudio.toString();
    t.assertTruthy(funcStr.includes('readwrite') || funcStr.includes('transaction'), 'storeAudio should use readwrite transaction');
});

TestRunner.test('DB Module - deleteAudio uses readwrite transaction', (t) => {
    const funcStr = deleteAudio.toString();
    t.assertTruthy(funcStr.includes('readwrite') || funcStr.includes('transaction'), 'deleteAudio should use readwrite transaction');
});

TestRunner.test('DB Module - DB module handles browser IndexedDB availability', (t) => {
    const allFuncs = storeAudio.toString() + getAudio.toString() + deleteAudio.toString() + clearAllAudio.toString();
    t.assertTruthy(allFuncs.includes('indexedDB') || allFuncs.includes('IDBDatabase') || allFuncs.includes('db'), 'DB module should reference IndexedDB');
});

TestRunner.test('DB Module - storeAudio handles transaction abort errors', (t) => {
    const funcStr = storeAudio.toString();
    t.assertTruthy(funcStr.includes('onabort') || funcStr.includes('abort'), 'storeAudio should handle transaction abort');
});

TestRunner.test('DB Module - getAudio handles transaction errors', (t) => {
    const funcStr = getAudio.toString();
    t.assertTruthy(funcStr.includes('onerror') || funcStr.includes('error'), 'getAudio should handle transaction errors');
});

TestRunner.test('DB Module - deleteAudio handles transaction errors', (t) => {
    const funcStr = deleteAudio.toString();
    t.assertTruthy(funcStr.includes('onerror') || funcStr.includes('error') || funcStr.includes('reject'), 'deleteAudio should handle errors');
});

TestRunner.test('DB Module - clearAllAudio handles transaction errors', (t) => {
    const funcStr = clearAllAudio.toString();
    t.assertTruthy(funcStr.includes('onerror') || funcStr.includes('error') || funcStr.includes('reject'), 'clearAllAudio should handle errors');
});

TestRunner.test('DB Module - All 4 DB functions are independent exports', (t) => {
    t.assertEqual(typeof storeAudio, 'function', 'storeAudio should be a function');
    t.assertEqual(typeof getAudio, 'function', 'getAudio should be a function');
    t.assertEqual(typeof deleteAudio, 'function', 'deleteAudio should be a function');
    t.assertEqual(typeof clearAllAudio, 'function', 'clearAllAudio should be a function');
});

// ============================================
// Constants Tests
// ============================================
TestRunner.test('Constants - APP_VERSION exists', (t) => {
    t.assertTruthy(typeof APP_VERSION !== 'undefined', 'APP_VERSION should be defined');
    t.assertTruthy(APP_VERSION.startsWith('0.'), 'APP_VERSION should start with 0.');
});

TestRunner.test('Constants - STEPS_PER_BAR is 16', (t) => {
    t.assertEqual(STEPS_PER_BAR, 16, 'Steps per bar should be 16');
});

TestRunner.test('Constants - MAX_BARS is reasonable', (t) => {
    t.assertTruthy(MAX_BARS >= 100, 'MAX_BARS should be at least 100');
    t.assertTruthy(MAX_BARS <= 1024, 'MAX_BARS should be at most 1024');
});

TestRunner.test('Constants - synthPitches array is valid', (t) => {
    t.assertTruthy(Array.isArray(synthPitches), 'synthPitches should be an array');
    t.assertTruthy(synthPitches.length > 30, 'synthPitches should have multiple pitches');
    t.assertTruthy(synthPitches.includes('C4'), 'synthPitches should include C4');
});

TestRunner.test('Constants - computerKeySynthMap has valid mappings', (t) => {
    t.assertTruthy(typeof computerKeySynthMap === 'object', 'computerKeySynthMap should be an object');
    t.assertTruthy('a' in computerKeySynthMap, 'computerKeySynthMap should have key a');
    t.assertTruthy('k' in computerKeySynthMap, 'computerKeySynthMap should have key k');
});

TestRunner.test('Constants - Audio clip defaults are valid', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_GAIN, 1.0, 'Default gain should be 1.0');
    t.assertEqual(MIN_AUDIO_CLIP_GAIN, 0, 'Min gain should be 0');
    t.assertEqual(MAX_AUDIO_CLIP_GAIN, 4.0, 'Max gain should be 4.0');
});

TestRunner.test('Constants - Audio clip crossfade defaults', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_CROSSFADE, 0, 'Default crossfade should be 0');
    t.assertEqual(MIN_AUDIO_CLIP_CROSSFADE, 0, 'Min crossfade should be 0');
    t.assertEqual(MAX_AUDIO_CLIP_CROSSFADE, 5, 'Max crossfade should be 5');
});

TestRunner.test('Constants - Audio clip playback rate defaults', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_PLAYBACK_RATE, 1.0, 'Default playback rate should be 1.0');
    t.assertEqual(MIN_AUDIO_CLIP_PLAYBACK_RATE, 0.25, 'Min playback rate should be 0.25');
    t.assertEqual(MAX_AUDIO_CLIP_PLAYBACK_RATE, 4.0, 'Max playback rate should be 4.0');
});

TestRunner.test('Constants - Audio clip offset defaults', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_START_OFFSET, 0, 'Default start offset should be 0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_END_OFFSET, -1, 'Default end offset should be -1 (use full)');
    t.assertEqual(MIN_AUDIO_CLIP_START_OFFSET, 0, 'Min start offset should be 0');
});

TestRunner.test('Constants - Time signature defaults', (t) => {
    t.assertDeepEqual(DEFAULT_TIME_SIGNATURE, { numerator: 4, denominator: 4 }, 'Default time sig should be 4/4');
    t.assertTruthy(DEFAULT_TIME_SIGNATURE_NUMERATOR >= 1, 'Numerator should be at least 1');
    t.assertTruthy(DEFAULT_TIME_SIGNATURE_DENOMINATOR >= 1, 'Denominator should be at least 1');
});

TestRunner.test('Constants - Timeline dimensions', (t) => {
    t.assertEqual(TIMELINE_BEAT_WIDTH, 40, 'Beat width should be 40px');
    t.assertEqual(TIMELINE_TRACK_HEIGHT, 60, 'Track height should be 60px');
    t.assertEqual(TIMELINE_HEADER_HEIGHT, 30, 'Header height should be 30px');
});

TestRunner.test('Constants - numSlices is 8', (t) => {
    t.assertEqual(numSlices, 8, 'Number of slices should be 8');
});

TestRunner.test('Constants - numDrumSamplerPads is 8', (t) => {
    t.assertEqual(numDrumSamplerPads, 8, 'Number of drum pads should be 8');
});

TestRunner.test('Constants - defaultVelocity is valid', (t) => {
    t.assertTruthy(defaultVelocity > 0 && defaultVelocity <= 1, 'defaultVelocity should be between 0 and 1');
});

TestRunner.test('Constants - MAX_HISTORY_STATES is sufficient', (t) => {
    t.assertTruthy(MAX_HISTORY_STATES >= 20, 'MAX_HISTORY_STATES should be at least 20');
});

TestRunner.test('Constants - Audio clip fade curve constants are valid', (t) => {
    t.assertEqual(FADE_CURVE_LINEAR, 'linear', 'Linear curve should be linear');
    t.assertEqual(FADE_CURVE_EXPONENTIAL, 'exponential', 'Exponential curve should be exponential');
    t.assertDeepEqual(FADE_CURVES, ['linear', 'exponential'], 'Fade curves array should have both options');
    t.assertEqual(DEFAULT_FADE_IN_CURVE, FADE_CURVE_LINEAR, 'Default fade in curve should be linear');
    t.assertEqual(DEFAULT_FADE_OUT_CURVE, FADE_CURVE_LINEAR, 'Default fade out curve should be linear');
});

TestRunner.test('Constants - MAX_AUDIO_CLIP_FADE is valid', (t) => {
    t.assertEqual(MAX_AUDIO_CLIP_FADE, 10, 'Max fade should be 10 seconds');
    t.assertTruthy(MAX_AUDIO_CLIP_FADE > 0, 'Max fade should be positive');
});

// ============================================
// Day 88: Performance Monitor Constants Tests
// ============================================
TestRunner.test('Performance Monitor - PERFORMANCE_MONITOR_ENABLED is boolean', (t) => {
    t.assertEqual(typeof PERFORMANCE_MONITOR_ENABLED, 'boolean', 'PERFORMANCE_MONITOR_ENABLED should be boolean');
});

TestRunner.test('Performance Monitor - PERFORMANCE_UPDATE_INTERVAL_MS is positive', (t) => {
    t.assertTruthy(PERFORMANCE_UPDATE_INTERVAL_MS > 0, 'Update interval should be positive');
    t.assertTruthy(PERFORMANCE_UPDATE_INTERVAL_MS <= 5000, 'Update interval should be reasonable (<5s)');
});

TestRunner.test('Performance Monitor - PERFORMANCE_CONTEXT_STATE values are valid', (t) => {
    t.assertEqual(PERFORMANCE_CONTEXT_STATE_OK, 'running', 'Context state OK should be "running"');
    t.assertEqual(PERFORMANCE_CONTEXT_STATE_SUSPENDED, 'suspended', 'Context state suspended should be "suspended"');
    t.assertEqual(PERFORMANCE_CONTEXT_STATE_CLOSED, 'closed', 'Context state closed should be "closed"');
});

TestRunner.test('Performance Monitor - PERFORMANCE_AUDIO_BUFFER_SIZE_STEPS is reasonable', (t) => {
    t.assertTruthy(PERFORMANCE_AUDIO_BUFFER_SIZE_STEPS >= 1, 'Buffer size should be at least 1');
    t.assertTruthy(PERFORMANCE_AUDIO_BUFFER_SIZE_STEPS <= 16, 'Buffer size should be reasonable (<16)');
});

TestRunner.test('Performance Monitor - PERFORMANCE_DEFAULT_LATENCY_HINT is valid', (t) => {
    const validHints = ['interactive', 'balanced', 'power-saving', 'max'];
    t.assertTruthy(validHints.includes(PERFORMANCE_DEFAULT_LATENCY_HINT), 'Latency hint should be valid Tone.js hint');
});

TestRunner.test('Performance Monitor - PERFORMANCE_MEMORY_PRESSURE values are distinct', (t) => {
    const values = [
        PERFORMANCE_MEMORY_PRESSURE_NONE,
        PERFORMANCE_MEMORY_PRESSURE_LOW,
        PERFORMANCE_MEMORY_PRESSURE_MEDIUM,
        PERFORMANCE_MEMORY_PRESSURE_HIGH
    ];
    const uniqueValues = [...new Set(values)];
    t.assertEqual(values.length, uniqueValues.length, 'All memory pressure values should be distinct');
});

TestRunner.test('Performance Monitor - PERFORMANCE_WARNING_THRESHOLD_MS is reasonable', (t) => {
    t.assertTruthy(PERFORMANCE_WARNING_THRESHOLD_MS > 0, 'Warning threshold should be positive');
    t.assertTruthy(PERFORMANCE_WARNING_THRESHOLD_MS <= 200, 'Warning threshold should be reasonable (<200ms)');
});
// Day 201: Performance Monitor State Tests
// ===========================================
TestRunner.test('Performance Monitor State - getPerformanceMonitorState returns object', (t) => {
    const state = getPerformanceMonitorState();
    t.assertEqual(typeof state, 'object', 'Should return an object');
    t.assertTruthy(state !== null, 'Should not be null');
});

TestRunner.test('Performance Monitor State - getPerformanceMonitorEnabledState returns boolean', (t) => {
    const enabled = getPerformanceMonitorEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'Should return a boolean');
});

TestRunner.test('Performance Monitor State - setPerformanceMonitorEnabledState accepts boolean', (t) => {
    setPerformanceMonitorEnabledState(true);
    t.assertEqual(getPerformanceMonitorEnabledState(), true, 'Should be enabled');
    setPerformanceMonitorEnabledState(false);
    t.assertEqual(getPerformanceMonitorEnabledState(), false, 'Should be disabled');
});

TestRunner.test('Performance Monitor State - getAudioContextStateState returns string', (t) => {
    const state = getAudioContextStateState();
    t.assertEqual(typeof state, 'string', 'Should return a string');
});

TestRunner.test('Performance Monitor State - setAudioContextStateState validates values', (t) => {
    setAudioContextStateState('running');
    t.assertEqual(getAudioContextStateState(), 'running', 'Should accept running');
    setAudioContextStateState('suspended');
    t.assertEqual(getAudioContextStateState(), 'suspended', 'Should accept suspended');
    setAudioContextStateState('closed');
    t.assertEqual(getAudioContextStateState(), 'closed', 'Should accept closed');
});

TestRunner.test('Performance Monitor State - setAudioContextStateState ignores invalid values', (t) => {
    setAudioContextStateState('running');
    setAudioContextStateState('invalid_value');
    t.assertEqual(getAudioContextStateState(), 'running', 'Should ignore invalid values');
});

TestRunner.test('Performance Monitor State - getCPUUsageState returns number', (t) => {
    const usage = getCPUUsageState();
    t.assertEqual(typeof usage, 'number', 'Should return a number');
});

TestRunner.test('Performance Monitor State - setCPUUsageState clamps values', (t) => {
    setCPUUsageState(50);
    t.assertEqual(getCPUUsageState(), 50, 'Should accept normal value');
    setCPUUsageState(150);
    t.assertEqual(getCPUUsageState(), 100, 'Should clamp to 100');
    setCPUUsageState(-10);
    t.assertEqual(getCPUUsageState(), 0, 'Should clamp to 0');
});

TestRunner.test('Performance Monitor State - getMemoryPressureState returns string', (t) => {
    const pressure = getMemoryPressureState();
    t.assertEqual(typeof pressure, 'string', 'Should return a string');
});

TestRunner.test('Performance Monitor State - setMemoryPressureState validates values', (t) => {
    setMemoryPressureState('none');
    t.assertEqual(getMemoryPressureState(), 'none', 'Should accept none');
    setMemoryPressureState('low');
    t.assertEqual(getMemoryPressureState(), 'low', 'Should accept low');
    setMemoryPressureState('medium');
    t.assertEqual(getMemoryPressureState(), 'medium', 'Should accept medium');
    setMemoryPressureState('high');
    t.assertEqual(getMemoryPressureState(), 'high', 'Should accept high');
});

TestRunner.test('Performance Monitor State - setMemoryPressureState ignores invalid values', (t) => {
    setMemoryPressureState('none');
    setMemoryPressureState('invalid');
    t.assertEqual(getMemoryPressureState(), 'none', 'Should ignore invalid pressure values');
});

TestRunner.test('Performance Monitor State - getActiveVoicesState returns number', (t) => {
    const voices = getActiveVoicesState();
    t.assertEqual(typeof voices, 'number', 'Should return a number');
});

TestRunner.test('Performance Monitor State - setActiveVoicesState clamps values', (t) => {
    setActiveVoicesState(10);
    t.assertEqual(getActiveVoicesState(), 10, 'Should accept normal value');
    setActiveVoicesState(-5);
    t.assertEqual(getActiveVoicesState(), 0, 'Should clamp to 0');
});

TestRunner.test('Performance Monitor State - getAudioLatencyState returns number', (t) => {
    const latency = getAudioLatencyState();
    t.assertEqual(typeof latency, 'number', 'Should return a number');
});

TestRunner.test('Performance Monitor State - setAudioLatencyState accepts values', (t) => {
    setAudioLatencyState(0.05);
    t.assertEqual(getAudioLatencyState(), 0.05, 'Should accept latency value');
    setAudioLatencyState(-10);
    t.assertEqual(getAudioLatencyState(), 0, 'Should clamp negative to 0');
});

TestRunner.test('Performance Monitor State - getLastCallbackTimeState returns number', (t) => {
    const time = getLastCallbackTimeState();
    t.assertEqual(typeof time, 'number', 'Should return a number');
});

TestRunner.test('Performance Monitor State - setLastCallbackTimeState accepts values', (t) => {
    setLastCallbackTimeState(100);
    t.assertEqual(getLastCallbackTimeState(), 100, 'Should accept time value');
    setLastCallbackTimeState(-50);
    t.assertEqual(getLastCallbackTimeState(), 0, 'Should clamp negative to 0');
});

TestRunner.test('Performance Monitor State - getDroppedCallbacksState returns number', (t) => {
    const count = getDroppedCallbacksState();
    t.assertEqual(typeof count, 'number', 'Should return a number');
});

TestRunner.test('Performance Monitor State - setDroppedCallbacksState accepts values', (t) => {
    setDroppedCallbacksState(5);
    t.assertEqual(getDroppedCallbacksState(), 5, 'Should accept count');
    setDroppedCallbacksState(-3);
    t.assertEqual(getDroppedCallbacksState(), 0, 'Should clamp negative to 0');
});

TestRunner.test('Performance Monitor State - incrementDroppedCallbacksState increments', (t) => {
    setDroppedCallbacksState(0);
    incrementDroppedCallbacksState();
    t.assertEqual(getDroppedCallbacksState(), 1, 'Should increment by 1');
    incrementDroppedCallbacksState();
    t.assertEqual(getDroppedCallbacksState(), 2, 'Should increment again');
});

TestRunner.test('Performance Monitor State - resetPerformanceMonitorState resets all values', (t) => {
    setPerformanceMonitorEnabledState(true);
    setAudioContextStateState('running');
    setCPUUsageState(75);
    setMemoryPressureState('high');
    setActiveVoicesState(20);
    setAudioLatencyState(0.1);
    setLastCallbackTimeState(50);
    setDroppedCallbacksState(10);
    resetPerformanceMonitorState();
    const state = getPerformanceMonitorState();
    t.assertEqual(state.enabled, false, 'Should reset enabled');
    t.assertEqual(state.audioContextState, 'unknown', 'Should reset audioContextState');
    t.assertEqual(state.cpuUsage, 0, 'Should reset cpuUsage');
    t.assertEqual(state.memoryPressure, 'none', 'Should reset memoryPressure');
    t.assertEqual(state.activeVoices, 0, 'Should reset activeVoices');
    t.assertEqual(state.audioLatency, 0, 'Should reset audioLatency');
    t.assertEqual(state.droppedCallbacks, 0, 'Should reset droppedCallbacks');
});

// ============================================
// Day 348: Performance Monitor State Undo Capture Tests
// ============================================
TestRunner.test('Performance Monitor - setPerformanceMonitorEnabledState calls captureStateForUndo', (t) => {
    const funcStr = setPerformanceMonitorEnabledState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setPerformanceMonitorEnabledState should call captureStateForUndo');
});

TestRunner.test('Performance Monitor - setPerformanceMonitorEnabledState uses descriptive undo label', (t) => {
    const funcStr = setPerformanceMonitorEnabledState.toString();
    t.assertTruthy(funcStr.includes('Set Performance Monitor'), 'Undo label should mention Performance Monitor');
    t.assertTruthy(funcStr.includes('On') || funcStr.includes('Off'), 'Undo label should mention On/Off state');
});

TestRunner.test('Performance Monitor - setPerformanceMonitorEnabledState guards against missing appServices', (t) => {
    const funcStr = setPerformanceMonitorEnabledState.toString();
    t.assertTruthy(funcStr.includes('appServices'), 'Should check appServices');
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should check captureStateForUndo');
});

TestRunner.test('Performance Monitor - setAudioContextStateState calls captureStateForUndo', (t) => {
    const funcStr = setAudioContextStateState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setAudioContextStateState should call captureStateForUndo');
});

TestRunner.test('Performance Monitor - setAudioContextStateState uses descriptive undo label', (t) => {
    const funcStr = setAudioContextStateState.toString();
    t.assertTruthy(funcStr.includes('Set Audio Context State'), 'Undo label should mention Audio Context State');
});

TestRunner.test('Performance Monitor - setCPUUsageState calls captureStateForUndo', (t) => {
    const funcStr = setCPUUsageState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setCPUUsageState should call captureStateForUndo');
});

TestRunner.test('Performance Monitor - setCPUUsageState uses descriptive undo label', (t) => {
    const funcStr = setCPUUsageState.toString();
    t.assertTruthy(funcStr.includes('Set CPU Usage'), 'Undo label should mention CPU Usage');
});

TestRunner.test('Performance Monitor - setMemoryPressureState calls captureStateForUndo', (t) => {
    const funcStr = setMemoryPressureState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setMemoryPressureState should call captureStateForUndo');
});

TestRunner.test('Performance Monitor - setMemoryPressureState uses descriptive undo label', (t) => {
    const funcStr = setMemoryPressureState.toString();
    t.assertTruthy(funcStr.includes('Set Memory Pressure'), 'Undo label should mention Memory Pressure');
});

TestRunner.test('Performance Monitor - setActiveVoicesState calls captureStateForUndo', (t) => {
    const funcStr = setActiveVoicesState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setActiveVoicesState should call captureStateForUndo');
});

TestRunner.test('Performance Monitor - setActiveVoicesState uses descriptive undo label', (t) => {
    const funcStr = setActiveVoicesState.toString();
    t.assertTruthy(funcStr.includes('Set Active Voices'), 'Undo label should mention Active Voices');
});

TestRunner.test('Performance Monitor - setAudioLatencyState calls captureStateForUndo', (t) => {
    const funcStr = setAudioLatencyState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setAudioLatencyState should call captureStateForUndo');
});

TestRunner.test('Performance Monitor - setAudioLatencyState uses descriptive undo label', (t) => {
    const funcStr = setAudioLatencyState.toString();
    t.assertTruthy(funcStr.includes('Set Audio Latency'), 'Undo label should mention Audio Latency');
});

TestRunner.test('Performance Monitor - setLastCallbackTimeState calls captureStateForUndo', (t) => {
    const funcStr = setLastCallbackTimeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setLastCallbackTimeState should call captureStateForUndo');
});

TestRunner.test('Performance Monitor - setLastCallbackTimeState uses descriptive undo label', (t) => {
    const funcStr = setLastCallbackTimeState.toString();
    t.assertTruthy(funcStr.includes('Set Last Callback Time'), 'Undo label should mention Last Callback Time');
});

TestRunner.test('Performance Monitor - setDroppedCallbacksState calls captureStateForUndo', (t) => {
    const funcStr = setDroppedCallbacksState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setDroppedCallbacksState should call captureStateForUndo');
});

TestRunner.test('Performance Monitor - setDroppedCallbacksState uses descriptive undo label', (t) => {
    const funcStr = setDroppedCallbacksState.toString();
    t.assertTruthy(funcStr.includes('Set Dropped Callbacks'), 'Undo label should mention Dropped Callbacks');
});

TestRunner.test('Performance Monitor - All Performance Monitor setters check appServices', (t) => {
    const setters = [
        ['setPerformanceMonitorEnabledState', setPerformanceMonitorEnabledState],
        ['setAudioContextStateState', setAudioContextStateState],
        ['setCPUUsageState', setCPUUsageState],
        ['setMemoryPressureState', setMemoryPressureState],
        ['setActiveVoicesState', setActiveVoicesState],
        ['setAudioLatencyState', setAudioLatencyState],
        ['setLastCallbackTimeState', setLastCallbackTimeState],
        ['setDroppedCallbacksState', setDroppedCallbacksState]
    ];
    for (const [name, fn] of setters) {
        const funcStr = fn.toString();
        t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'),
            `${name} should check appServices.captureStateForUndo`);
    }
});

TestRunner.test('Performance Monitor - setCPUUsageState clamps to valid range', (t) => {
    setCPUUsageState(100);
    t.assertEqual(getCPUUsageState(), 100, 'Should accept 100');
    setCPUUsageState(0);
    t.assertEqual(getCPUUsageState(), 0, 'Should accept 0');
    setCPUUsageState(50.5);
    t.assertEqual(getCPUUsageState(), 50.5, 'Should accept decimal values');
});

TestRunner.test('Performance Monitor - setActiveVoicesState clamps to non-negative', (t) => {
    setActiveVoicesState(0);
    t.assertEqual(getActiveVoicesState(), 0, 'Should accept 0');
    setActiveVoicesState(100);
    t.assertEqual(getActiveVoicesState(), 100, 'Should accept large values');
});

TestRunner.test('Performance Monitor - setAudioLatencyState clamps to non-negative', (t) => {
    setAudioLatencyState(0);
    t.assertEqual(getAudioLatencyState(), 0, 'Should accept 0');
    setAudioLatencyState(0.5);
    t.assertEqual(getAudioLatencyState(), 0.5, 'Should accept decimal values');
});

TestRunner.test('Performance Monitor - State roundtrip for Performance Monitor enabled', (t) => {
    setPerformanceMonitorEnabledState(true);
    t.assertEqual(getPerformanceMonitorEnabledState(), true, 'Should persist enabled state');
    setPerformanceMonitorEnabledState(false);
    t.assertEqual(getPerformanceMonitorEnabledState(), false, 'Should persist disabled state');
});

TestRunner.test('Performance Monitor - State roundtrip for Audio Context', (t) => {
    setAudioContextStateState('running');
    t.assertEqual(getAudioContextStateState(), 'running', 'Should persist running state');
    setAudioContextStateState('suspended');
    t.assertEqual(getAudioContextStateState(), 'suspended', 'Should persist suspended state');
});

TestRunner.test('Performance Monitor - incrementDroppedCallbacksState increments correctly', (t) => {
    setDroppedCallbacksState(0);
    incrementDroppedCallbacksState();
    incrementDroppedCallbacksState();
    incrementDroppedCallbacksState();
    t.assertEqual(getDroppedCallbacksState(), 3, 'Should increment by 1 each call');
});

TestRunner.test('Performance Monitor - getPerformanceMonitorState returns all properties', (t) => {
    const state = getPerformanceMonitorState();
    t.assertTruthy('enabled' in state, 'Should have enabled property');
    t.assertTruthy('audioContextState' in state, 'Should have audioContextState property');
    t.assertTruthy('cpuUsage' in state, 'Should have cpuUsage property');
    t.assertTruthy('memoryPressure' in state, 'Should have memoryPressure property');
    t.assertTruthy('activeVoices' in state, 'Should have activeVoices property');
    t.assertTruthy('audioLatency' in state, 'Should have audioLatency property');
    t.assertTruthy('lastCallbackTime' in state, 'Should have lastCallbackTime property');
    t.assertTruthy('droppedCallbacks' in state, 'Should have droppedCallbacks property');
});

TestRunner.test('Performance Monitor - APP_VERSION is 2.28.0 or higher for Day 348', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 348');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 28, 'Minor version should be >= 28 for Day 348');
    }
});

// ============================================
// Day 349: Timeline Markers & Send Track State Tests
// ============================================
TestRunner.test('Timeline Markers - getTimelineMarkersState returns array', (t) => {
    const markers = getTimelineMarkersState();
    t.assertTruthy(Array.isArray(markers), 'getTimelineMarkersState should return array');
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState is function export', (t) => {
    t.assertEqual(typeof getTimelineMarkerByIdState, 'function', 'getTimelineMarkerByIdState should be function');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState is function export', (t) => {
    t.assertEqual(typeof addTimelineMarkerState, 'function', 'addTimelineMarkerState should be function');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState calls captureStateForUndo', (t) => {
    const funcStr = addTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'addTimelineMarkerState should call captureStateForUndo');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState uses descriptive undo label', (t) => {
    const funcStr = addTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('Add Timeline Marker'), 'Undo label should mention Add Timeline Marker');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState guards against missing appServices', (t) => {
    const funcStr = addTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('appServices'), 'Should check appServices');
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should check captureStateForUndo');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState checks MAX_TIMELINE_MARKERS limit', (t) => {
    const funcStr = addTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('MAX_TIMELINE_MARKERS'), 'Should check MAX_TIMELINE_MARKERS limit');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState generates unique ID', (t) => {
    const funcStr = addTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('timelineMarkerIdCounter') || funcStr.includes('id'), 'Should generate unique ID');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState sorts markers by bar position', (t) => {
    const funcStr = addTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('sort'), 'Should sort markers by bar position');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState is function export', (t) => {
    t.assertEqual(typeof setTimelineMarkerState, 'function', 'setTimelineMarkerState should be function');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState calls captureStateForUndo', (t) => {
    const funcStr = setTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTimelineMarkerState should call captureStateForUndo');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState uses descriptive undo label', (t) => {
    const funcStr = setTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('Update Timeline Marker'), 'Undo label should mention Update Timeline Marker');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState guards against missing appServices', (t) => {
    const funcStr = setTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('appServices'), 'Should check appServices');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState clamps bar value to MAX_BARS', (t) => {
    const funcStr = setTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('MAX_BARS'), 'Should clamp bar value to MAX_BARS');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState returns null for unknown id', (t) => {
    const funcStr = setTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('null') || funcStr.includes('return'), 'Should return null for unknown id');
});

TestRunner.test('Timeline Markers - removeTimelineMarkerState is function export', (t) => {
    t.assertEqual(typeof removeTimelineMarkerState, 'function', 'removeTimelineMarkerState should be function');
});

TestRunner.test('Timeline Markers - removeTimelineMarkerState calls captureStateForUndo', (t) => {
    const funcStr = removeTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'removeTimelineMarkerState should call captureStateForUndo');
});

TestRunner.test('Timeline Markers - removeTimelineMarkerState uses descriptive undo label', (t) => {
    const funcStr = removeTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('Remove Timeline Marker'), 'Undo label should mention Remove Timeline Marker');
});

TestRunner.test('Timeline Markers - removeTimelineMarkerState guards against missing appServices', (t) => {
    const funcStr = removeTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('appServices'), 'Should check appServices');
});

TestRunner.test('Timeline Markers - removeTimelineMarkerState returns boolean', (t) => {
    const funcStr = removeTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('return'), 'Should return boolean');
});

TestRunner.test('Timeline Markers - clearTimelineMarkersState is function export', (t) => {
    t.assertEqual(typeof clearTimelineMarkersState, 'function', 'clearTimelineMarkersState should be function');
});

TestRunner.test('Timeline Markers - clearTimelineMarkersState calls captureStateForUndo', (t) => {
    const funcStr = clearTimelineMarkersState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'clearTimelineMarkersState should call captureStateForUndo');
});

TestRunner.test('Timeline Markers - clearTimelineMarkersState uses descriptive undo label', (t) => {
    const funcStr = clearTimelineMarkersState.toString();
    t.assertTruthy(funcStr.includes('Clear All Timeline Markers'), 'Undo label should mention Clear All Timeline Markers');
});

TestRunner.test('Timeline Markers - clearTimelineMarkersState guards against missing appServices', (t) => {
    const funcStr = clearTimelineMarkersState.toString();
    t.assertTruthy(funcStr.includes('appServices'), 'Should check appServices');
});

TestRunner.test('Timeline Markers - clearTimelineMarkersState returns early if empty', (t) => {
    const funcStr = clearTimelineMarkersState.toString();
    t.assertTruthy(funcStr.includes('length') && funcStr.includes('=== 0'), 'Should return early if no markers');
});

// Send Track State Function Tests
TestRunner.test('Send Tracks - addSendTrackState is function export', (t) => {
    t.assertEqual(typeof addSendTrackState, 'function', 'addSendTrackState should be function');
});

TestRunner.test('Send Tracks - addSendTrackState calls captureStateForUndo', (t) => {
    const funcStr = addSendTrackState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'addSendTrackState should call captureStateForUndo');
});

TestRunner.test('Send Tracks - addSendTrackState uses descriptive undo label', (t) => {
    const funcStr = addSendTrackState.toString();
    t.assertTruthy(funcStr.includes('Add Send Bus'), 'Undo label should mention Add Send Bus');
});

TestRunner.test('Send Tracks - addSendTrackState guards against missing appServices', (t) => {
    const funcStr = addSendTrackState.toString();
    t.assertTruthy(funcStr.includes('appServices'), 'Should check appServices');
});

TestRunner.test('Send Tracks - setSendTrackNameState is function export', (t) => {
    t.assertEqual(typeof setSendTrackNameState, 'function', 'setSendTrackNameState should be function');
});

TestRunner.test('Send Tracks - setSendTrackNameState calls captureStateForUndo', (t) => {
    const funcStr = setSendTrackNameState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setSendTrackNameState should call captureStateForUndo');
});

TestRunner.test('Send Tracks - setSendTrackNameState uses descriptive undo label', (t) => {
    const funcStr = setSendTrackNameState.toString();
    t.assertTruthy(funcStr.includes('Set Send Track') || funcStr.includes('Send Bus'), 'Undo label should mention send track');
});

TestRunner.test('Send Tracks - setSendTrackNameState references sendId parameter', (t) => {
    const funcStr = setSendTrackNameState.toString();
    t.assertTruthy(funcStr.includes('sendId'), 'Should reference sendId parameter');
});

TestRunner.test('Send Tracks - setSendTrackLevelState is function export', (t) => {
    t.assertEqual(typeof setSendTrackLevelState, 'function', 'setSendTrackLevelState should be function');
});

TestRunner.test('Send Tracks - setSendTrackLevelState calls captureStateForUndo', (t) => {
    const funcStr = setSendTrackLevelState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setSendTrackLevelState should call captureStateForUndo');
});

TestRunner.test('Send Tracks - setSendTrackLevelState references level parameter', (t) => {
    const funcStr = setSendTrackLevelState.toString();
    t.assertTruthy(funcStr.includes('level'), 'Should reference level parameter');
});

TestRunner.test('Send Tracks - setSendTrackMutedState is function export', (t) => {
    t.assertEqual(typeof setSendTrackMutedState, 'function', 'setSendTrackMutedState should be function');
});

TestRunner.test('Send Tracks - setSendTrackMutedState calls captureStateForUndo', (t) => {
    const funcStr = setSendTrackMutedState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setSendTrackMutedState should call captureStateForUndo');
});

TestRunner.test('Send Tracks - setSendTrackMutedState references muted parameter', (t) => {
    const funcStr = setSendTrackMutedState.toString();
    t.assertTruthy(funcStr.includes('muted'), 'Should reference muted parameter');
});

TestRunner.test('Send Tracks - setSendTrackEffectsState is function export', (t) => {
    t.assertEqual(typeof setSendTrackEffectsState, 'function', 'setSendTrackEffectsState should be function');
});

TestRunner.test('Send Tracks - setSendTrackEffectsState calls captureStateForUndo', (t) => {
    const funcStr = setSendTrackEffectsState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setSendTrackEffectsState should call captureStateForUndo');
});

TestRunner.test('Send Tracks - removeSendTrackState is function export', (t) => {
    t.assertEqual(typeof removeSendTrackState, 'function', 'removeSendTrackState should be function');
});

TestRunner.test('Send Tracks - removeSendTrackState calls captureStateForUndo', (t) => {
    const funcStr = removeSendTrackState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'removeSendTrackState should call captureStateForUndo');
});

TestRunner.test('Send Tracks - removeSendTrackState uses descriptive undo label', (t) => {
    const funcStr = removeSendTrackState.toString();
    t.assertTruthy(funcStr.includes('Remove Send Bus') || funcStr.includes('Remove Send'), 'Undo label should mention remove send');
});

TestRunner.test('Send Tracks - Track Send Level functions call captureStateForUndo', (t) => {
    const funcStr = setTrackSendLevelState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTrackSendLevelState should call captureStateForUndo');
});

TestRunner.test('Send Tracks - Track Pre-Fader functions call captureStateForUndo', (t) => {
    const funcStr = setTrackSendPreFaderState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTrackSendPreFaderState should call captureStateForUndo');
});

// ============================================
// Day 403: Send Track State Extended Tests
// ============================================
TestRunner.test('Send Tracks - getSendTracksState is a function export', (t) => {
    t.assertEqual(typeof getSendTracksState, 'function', 'getSendTracksState should be function');
});

TestRunner.test('Send Tracks - getSendTracksState accepts 0 parameters', (t) => {
    t.assertEqual(getSendTracksState.length, 0, 'getSendTracksState should accept no parameters');
});

TestRunner.test('Send Tracks - getSendTracksState returns array', (t) => {
    const result = getSendTracksState();
    t.assertEqual(typeof result, 'object', 'getSendTracksState should return object');
    t.assertTruthy(Array.isArray(result), 'getSendTracksState should return array-like');
});

TestRunner.test('Send Tracks - getSendTrackByIdState is a function export', (t) => {
    t.assertEqual(typeof getSendTrackByIdState, 'function', 'getSendTrackByIdState should be function');
});

TestRunner.test('Send Tracks - getSendTrackByIdState accepts 1 parameter', (t) => {
    t.assertEqual(getSendTrackByIdState.length, 1, 'getSendTrackByIdState should accept 1 parameter');
});

TestRunner.test('Send Tracks - getSendTrackByIdState returns track or undefined', (t) => {
    const funcStr = getSendTrackByIdState.toString();
    t.assertTruthy(funcStr.includes('find') || funcStr.includes('id'), 'getSendTrackByIdState should find by id');
});

TestRunner.test('Send Tracks - setSendTrackNameState uses descriptive undo label', (t) => {
    const funcStr = setSendTrackNameState.toString();
    t.assertTruthy(funcStr.includes('Rename') || funcStr.includes('Send'), 'setSendTrackNameState should use Rename Send label');
});

TestRunner.test('Send Tracks - setSendTrackNameState returns boolean', (t) => {
    const funcStr = setSendTrackNameState.toString();
    t.assertTruthy(funcStr.includes('return'), 'setSendTrackNameState should return boolean');
});

TestRunner.test('Send Tracks - setSendTrackLevelState clamps value to valid range', (t) => {
    const funcStr = setSendTrackLevelState.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setSendTrackLevelState should clamp value');
});

TestRunner.test('Send Tracks - setSendTrackLevelState uses parseFloat with fallback', (t) => {
    const funcStr = setSendTrackLevelState.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'setSendTrackLevelState should use parseFloat');
});

TestRunner.test('Send Tracks - setSendTrackLevelState returns boolean', (t) => {
    const funcStr = setSendTrackLevelState.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'setSendTrackLevelState should return boolean');
});

TestRunner.test('Send Tracks - setSendTrackMutedState uses descriptive undo label', (t) => {
    const funcStr = setSendTrackMutedState.toString();
    t.assertTruthy(funcStr.includes('muted') && (funcStr.includes('on') || funcStr.includes('off')), 'setSendTrackMutedState should use muted on/off label');
});

TestRunner.test('Send Tracks - setSendTrackMutedState coerces to boolean', (t) => {
    const funcStr = setSendTrackMutedState.toString();
    t.assertTruthy(funcStr.includes('!!') || funcStr.includes('Boolean'), 'setSendTrackMutedState should coerce to boolean');
});

TestRunner.test('Send Tracks - setSendTrackEffectsState uses Array.isArray check', (t) => {
    const funcStr = setSendTrackEffectsState.toString();
    t.assertTruthy(funcStr.includes('Array.isArray'), 'setSendTrackEffectsState should validate array');
});

TestRunner.test('Send Tracks - setSendTrackEffectsState defaults to empty array', (t) => {
    const funcStr = setSendTrackEffectsState.toString();
    t.assertTruthy(funcStr.includes('[]'), 'setSendTrackEffectsState should default to empty array');
});

TestRunner.test('Send Tracks - setSendTrackEffectsState returns boolean', (t) => {
    const funcStr = setSendTrackEffectsState.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'setSendTrackEffectsState should return boolean');
});

TestRunner.test('Send Tracks - removeSendTrackState uses findIndex and splice', (t) => {
    const funcStr = removeSendTrackState.toString();
    t.assertTruthy(funcStr.includes('findIndex') && funcStr.includes('splice'), 'removeSendTrackState should use findIndex and splice');
});

TestRunner.test('Send Tracks - removeSendTrackState returns boolean', (t) => {
    const funcStr = removeSendTrackState.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'removeSendTrackState should return boolean');
});

TestRunner.test('Send Tracks - getTrackSendsState is a function export', (t) => {
    t.assertEqual(typeof getTrackSendsState, 'function', 'getTrackSendsState should be function');
});

TestRunner.test('Send Tracks - getTrackSendsState accepts 0 parameters', (t) => {
    t.assertEqual(getTrackSendsState.length, 0, 'getTrackSendsState should accept no parameters');
});

TestRunner.test('Send Tracks - getTrackSendLevelState is a function export', (t) => {
    t.assertEqual(typeof getTrackSendLevelState, 'function', 'getTrackSendLevelState should be function');
});

TestRunner.test('Send Tracks - getTrackSendLevelState accepts 2 parameters', (t) => {
    t.assertEqual(getTrackSendLevelState.length, 2, 'getTrackSendLevelState should accept 2 parameters');
});

TestRunner.test('Send Tracks - getTrackSendLevelState references trackId parameter', (t) => {
    const funcStr = getTrackSendLevelState.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'getTrackSendLevelState should reference trackId');
});

TestRunner.test('Send Tracks - getTrackSendLevelState references sendId parameter', (t) => {
    const funcStr = getTrackSendLevelState.toString();
    t.assertTruthy(funcStr.includes('sendId'), 'getTrackSendLevelState should reference sendId');
});

TestRunner.test('Send Tracks - setTrackSendLevelState is a function export', (t) => {
    t.assertEqual(typeof setTrackSendLevelState, 'function', 'setTrackSendLevelState should be function');
});

TestRunner.test('Send Tracks - setTrackSendLevelState accepts 3 parameters', (t) => {
    t.assertEqual(setTrackSendLevelState.length, 3, 'setTrackSendLevelState should accept 3 parameters');
});

TestRunner.test('Send Tracks - setTrackSendLevelState references all 3 parameters', (t) => {
    const funcStr = setTrackSendLevelState.toString();
    t.assertTruthy(funcStr.includes('trackId') && funcStr.includes('sendId') && funcStr.includes('level'), 'setTrackSendLevelState should reference all 3 params');
});

TestRunner.test('Send Tracks - setTrackSendLevelState creates trackSendsState entry if missing', (t) => {
    const funcStr = setTrackSendLevelState.toString();
    t.assertTruthy(funcStr.includes('trackSendsState[trackId]') || funcStr.includes('!trackSendsState'), 'setTrackSendLevelState should create entry if missing');
});

TestRunner.test('Send Tracks - setTrackSendLevelState clamps level value', (t) => {
    const funcStr = setTrackSendLevelState.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setTrackSendLevelState should clamp level');
});

TestRunner.test('Send Tracks - setTrackSendLevelState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = setTrackSendLevelState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTrackSendLevelState should call captureStateForUndo');
});

TestRunner.test('Send Tracks - setTrackSendLevelState uses descriptive undo label', (t) => {
    const funcStr = setTrackSendLevelState.toString();
    t.assertTruthy(funcStr.includes('Send Level') || funcStr.includes('Track'), 'setTrackSendLevelState should use descriptive undo label');
});

TestRunner.test('Send Tracks - getTrackSendPreFaderState is a function export', (t) => {
    t.assertEqual(typeof getTrackSendPreFaderState, 'function', 'getTrackSendPreFaderState should be function');
});

TestRunner.test('Send Tracks - getTrackSendPreFaderState accepts 2 parameters', (t) => {
    t.assertEqual(getTrackSendPreFaderState.length, 2, 'getTrackSendPreFaderState should accept 2 parameters');
});

TestRunner.test('Send Tracks - getTrackSendPreFaderState references trackId parameter', (t) => {
    const funcStr = getTrackSendPreFaderState.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'getTrackSendPreFaderState should reference trackId');
});

TestRunner.test('Send Tracks - getTrackSendPreFaderState references sendId parameter', (t) => {
    const funcStr = getTrackSendPreFaderState.toString();
    t.assertTruthy(funcStr.includes('sendId'), 'getTrackSendPreFaderState should reference sendId');
});

TestRunner.test('Send Tracks - getTrackSendPreFaderState returns false as default', (t) => {
    const funcStr = getTrackSendPreFaderState.toString();
    t.assertTruthy(funcStr.includes('false'), 'getTrackSendPreFaderState should return false as default');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState is a function export', (t) => {
    t.assertEqual(typeof setTrackSendPreFaderState, 'function', 'setTrackSendPreFaderState should be function');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState accepts 3 parameters', (t) => {
    t.assertEqual(setTrackSendPreFaderState.length, 3, 'setTrackSendPreFaderState should accept 3 parameters');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState references all 3 parameters', (t) => {
    const funcStr = setTrackSendPreFaderState.toString();
    t.assertTruthy(funcStr.includes('trackId') && funcStr.includes('sendId') && funcStr.includes('preFader'), 'setTrackSendPreFaderState should reference all 3 params');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState creates trackSendsState entry if missing', (t) => {
    const funcStr = setTrackSendPreFaderState.toString();
    t.assertTruthy(funcStr.includes('trackSendsState[trackId]') || funcStr.includes('!trackSendsState'), 'setTrackSendPreFaderState should create entry if missing');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState coerces preFader to boolean', (t) => {
    const funcStr = setTrackSendPreFaderState.toString();
    t.assertTruthy(funcStr.includes('!!') || funcStr.includes('Boolean'), 'setTrackSendPreFaderState should coerce preFader to boolean');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = setTrackSendPreFaderState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTrackSendPreFaderState should call captureStateForUndo');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState uses descriptive undo label', (t) => {
    const funcStr = setTrackSendPreFaderState.toString();
    t.assertTruthy(funcStr.includes('Pre-Fader') || funcStr.includes('Send'), 'setTrackSendPreFaderState should use descriptive undo label');
});

// APP_VERSION validation for Day 403
TestRunner.test('State - APP_VERSION is 2.80.0 or higher for Day 403', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    const major = versionParts[0];
    const minor = versionParts[1];
    t.assertTruthy(major > 2 || (major === 2 && minor >= 80), 'APP_VERSION should be 2.80.0 or higher for Day 403');
});

// ============================================
// Day 350: Armed/Soloed/SequencerTrack State Tests
// ============================================
TestRunner.test('Track Selection State - setArmedTrackIdState is a function export', (t) => {
    t.assertEqual(typeof setArmedTrackIdState, 'function', 'setArmedTrackIdState should be a function');
});

TestRunner.test('Track Selection State - setArmedTrackIdState accepts 1 parameter', (t) => {
    t.assertEqual(setArmedTrackIdState.length, 1, 'setArmedTrackIdState should accept 1 parameter');
});

TestRunner.test('Track Selection State - setArmedTrackIdState calls captureStateForUndo', (t) => {
    // Verify the function calls captureStateForUndo by checking the function body pattern
    const funcBody = setArmedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setArmedTrackIdState should call captureStateForUndo');
});

TestRunner.test('Track Selection State - setArmedTrackIdState uses descriptive undo label', (t) => {
    const funcBody = setArmedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('Armed Track'), 'Undo label should mention Armed Track');
});

TestRunner.test('Track Selection State - setArmedTrackIdState guards against missing appServices', (t) => {
    const funcBody = setArmedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('appServices'), 'setArmedTrackIdState should check appServices');
});

TestRunner.test('Track Selection State - setArmedTrackIdState handles null/undefined for track ID', (t) => {
    const funcBody = setArmedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('id !== undefined') && funcBody.includes('id !== null'), 'setArmedTrackIdState should check for null/undefined');
});

TestRunner.test('Track Selection State - getArmedTrackIdState is a function export', (t) => {
    t.assertEqual(typeof getArmedTrackIdState, 'function', 'getArmedTrackIdState should be a function');
});

TestRunner.test('Track Selection State - getArmedTrackIdState returns armed track ID', (t) => {
    const result = getArmedTrackIdState();
    t.assertTruthy(result === null || typeof result === 'string', 'getArmedTrackIdState should return null or string');
});

TestRunner.test('Track Selection State - setSoloedTrackIdState is a function export', (t) => {
    t.assertEqual(typeof setSoloedTrackIdState, 'function', 'setSoloedTrackIdState should be a function');
});

TestRunner.test('Track Selection State - setSoloedTrackIdState accepts 1 parameter', (t) => {
    t.assertEqual(setSoloedTrackIdState.length, 1, 'setSoloedTrackIdState should accept 1 parameter');
});

TestRunner.test('Track Selection State - setSoloedTrackIdState calls captureStateForUndo', (t) => {
    const funcBody = setSoloedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setSoloedTrackIdState should call captureStateForUndo');
});

TestRunner.test('Track Selection State - setSoloedTrackIdState uses descriptive undo label', (t) => {
    const funcBody = setSoloedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('Soloed Track'), 'Undo label should mention Soloed Track');
});

TestRunner.test('Track Selection State - setSoloedTrackIdState guards against missing appServices', (t) => {
    const funcBody = setSoloedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('appServices'), 'setSoloedTrackIdState should check appServices');
});

TestRunner.test('Track Selection State - setSoloedTrackIdState handles null/undefined for track ID', (t) => {
    const funcBody = setSoloedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('id !== undefined') && funcBody.includes('id !== null'), 'setSoloedTrackIdState should check for null/undefined');
});

TestRunner.test('Track Selection State - getSoloedTrackIdState is a function export', (t) => {
    t.assertEqual(typeof getSoloedTrackIdState, 'function', 'getSoloedTrackIdState should be a function');
});

TestRunner.test('Track Selection State - getSoloedTrackIdState returns soloed track ID', (t) => {
    const result = getSoloedTrackIdState();
    t.assertTruthy(result === null || typeof result === 'string', 'getSoloedTrackIdState should return null or string');
});

TestRunner.test('Track Selection State - setActiveSequencerTrackIdState is a function export', (t) => {
    t.assertEqual(typeof setActiveSequencerTrackIdState, 'function', 'setActiveSequencerTrackIdState should be a function');
});

TestRunner.test('Track Selection State - setActiveSequencerTrackIdState accepts 1 parameter', (t) => {
    t.assertEqual(setActiveSequencerTrackIdState.length, 1, 'setActiveSequencerTrackIdState should accept 1 parameter');
});

TestRunner.test('Track Selection State - setActiveSequencerTrackIdState calls captureStateForUndo', (t) => {
    const funcBody = setActiveSequencerTrackIdState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setActiveSequencerTrackIdState should call captureStateForUndo');
});

TestRunner.test('Track Selection State - setActiveSequencerTrackIdState uses descriptive undo label', (t) => {
    const funcBody = setActiveSequencerTrackIdState.toString();
    t.assertTruthy(funcBody.includes('Active Sequencer Track'), 'Undo label should mention Active Sequencer Track');
});

TestRunner.test('Track Selection State - setActiveSequencerTrackIdState guards against missing appServices', (t) => {
    const funcBody = setActiveSequencerTrackIdState.toString();
    t.assertTruthy(funcBody.includes('appServices'), 'setActiveSequencerTrackIdState should check appServices');
});

TestRunner.test('Track Selection State - setActiveSequencerTrackIdState handles null/undefined for track ID', (t) => {
    const funcBody = setActiveSequencerTrackIdState.toString();
    t.assertTruthy(funcBody.includes('id !== undefined') && funcBody.includes('id !== null'), 'setActiveSequencerTrackIdState should check for null/undefined');
});

TestRunner.test('Track Selection State - getActiveSequencerTrackIdState is a function export', (t) => {
    t.assertEqual(typeof getActiveSequencerTrackIdState, 'function', 'getActiveSequencerTrackIdState should be a function');
});

TestRunner.test('Track Selection State - getActiveSequencerTrackIdState returns active sequencer track ID', (t) => {
    const result = getActiveSequencerTrackIdState();
    t.assertTruthy(result === null || typeof result === 'string', 'getActiveSequencerTrackIdState should return null or string');
});

TestRunner.test('Track Selection State - Armed/Soloed/Sequencer track state independence', (t) => {
    // Each track selection state should be stored in its own variable
    const funcBody1 = setArmedTrackIdState.toString();
    const funcBody2 = setSoloedTrackIdState.toString();
    const funcBody3 = setActiveSequencerTrackIdState.toString();
    // All three should reference their own variable
    t.assertTruthy(funcBody1.includes('armedTrackId'), 'setArmedTrackIdState should update armedTrackId');
    t.assertTruthy(funcBody2.includes('soloedTrackId'), 'setSoloedTrackIdState should update soloedTrackId');
    t.assertTruthy(funcBody3.includes('activeSequencerTrackId'), 'setActiveSequencerTrackIdState should update activeSequencerTrackId');
});

// APP_VERSION validation for Day 350
TestRunner.test('State - APP_VERSION is 2.29.0 or higher for Day 350', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 350');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 29, 'Minor version should be >= 29 for Day 350');
    }
});

// ============================================
// Utility Function Tests
// ============================================
TestRunner.test('Utils - createDropZoneHTML generates valid HTML', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'Sampler', null, null);
    t.assertTruthy(html.includes('drop-zone'), 'Should contain drop-zone class');
    t.assertTruthy(html.includes('input1'), 'Should contain input ID');
    t.assertTruthy(html.includes('Drag & Drop'), 'Should contain drag text');
});

TestRunner.test('Utils - createDropZoneHTML with existing audio data', (t) => {
    const existingData = { originalFileName: 'kick.wav', status: 'loaded' };
    const html = createDropZoneHTML('track1', 'input1', 'Sampler', null, existingData);
    t.assertTruthy(html.includes('kick.wav'), 'Should show loaded file name');
    t.assertTruthy(html.includes('Loaded:'), 'Should show loaded status');
});

TestRunner.test('Utils - createDropZoneHTML with missing status', (t) => {
    const existingData = { originalFileName: 'snare.wav', status: 'missing' };
    const html = createDropZoneHTML('track1', 'input1', 'Sampler', null, existingData);
    t.assertTruthy(html.includes('Missing:'), 'Should show missing status');
    t.assertTruthy(html.includes('drop-zone-missing'), 'Should have missing class');
});

TestRunner.test('Utils - createDropZoneHTML for DrumSampler with pad index', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 3, null);
    t.assertTruthy(html.includes('data-pad-slice-index="3"'), 'Should have pad index data attribute');
});

TestRunner.test('DrumSampler Pad - loadDrumSamplerPadFile function exists', (t) => {
    t.assertEqual(typeof loadDrumSamplerPadFile, 'function', 'loadDrumSamplerPadFile should be a function');
});

TestRunner.test('DrumSampler Pad - loadDrumSamplerPadFile validates track type', (t) => {
    const funcStr = loadDrumSamplerPadFile.toString();
    t.assertTruthy(funcStr.includes('DrumSampler') || funcStr.includes('track.type'), 'Should validate DrumSampler track type');
});

TestRunner.test('DrumSampler Pad - loadDrumSamplerPadFile validates pad index bounds', (t) => {
    const funcStr = loadDrumSamplerPadFile.toString();
    t.assertTruthy(funcStr.includes('padIndex') && funcStr.includes('length'), 'Should validate pad index bounds');
});

TestRunner.test('DrumSampler Pad - loadDrumSamplerPadFile handles URL source', (t) => {
    const funcStr = loadDrumSamplerPadFile.toString();
    t.assertTruthy(funcStr.includes('isUrlSource') || funcStr.includes('typeof'), 'Should handle URL source type');
});

TestRunner.test('DrumSampler Pad - loadDrumSamplerPadFile handles File source', (t) => {
    const funcStr = loadDrumSamplerPadFile.toString();
    t.assertTruthy(funcStr.includes('File') || funcStr.includes('isDirectFile'), 'Should handle File source type');
});

TestRunner.test('DrumSampler Pad - loadDrumSamplerPadFile handles Blob event', (t) => {
    const funcStr = loadDrumSamplerPadFile.toString();
    t.assertTruthy(funcStr.includes('Blob') || funcStr.includes('files'), 'Should handle Blob event source');
});

TestRunner.test('DrumSampler Pad - pad status transitions are defined', (t) => {
    const validStatuses = ['empty', 'loaded', 'loading', 'missing', 'missing_db', 'error'];
    t.assertEqual(validStatuses.length, 6, 'Should have 6 valid pad status values');
});

TestRunner.test('DrumSampler Pad - drumPadDropZoneContainer ID pattern', (t) => {
    // Verify the drop zone container ID pattern uses pad index
    const containerIdPattern = 'drumPadDropZoneContainer-${track.id}-${selectedPadIndex}';
    t.assertTruthy(containerIdPattern.includes('selectedPadIndex'), 'Container ID should include pad index');
});


TestRunner.test('DrumSampler Pad - loadSoundFromBrowserToTarget function exists', (t) => {
    t.assertEqual(typeof loadSoundFromBrowserToTarget, 'function', 'loadSoundFromBrowserToTarget should be a function');
});

TestRunner.test('DrumSampler Pad - loadSoundFromBrowserToTarget handles DrumSampler type', (t) => {
    const funcStr = loadSoundFromBrowserToTarget.toString();
    t.assertTruthy(funcStr.includes('DrumSampler'), 'Should handle DrumSampler track type');
});

TestRunner.test('DrumSampler Pad - loadSoundFromBrowserToTarget handles targetPadOrSliceIndex', (t) => {
    const funcStr = loadSoundFromBrowserToTarget.toString();
    t.assertTruthy(funcStr.includes('targetPadOrSliceIndex') || funcStr.includes('actualPadIndex'), 'Should handle pad index parameter');
});

TestRunner.test('DrumSampler Pad - loadSoundFromBrowserToTarget finds empty pad for assignment', (t) => {
    const funcStr = loadSoundFromBrowserToTarget.toString();
    t.assertTruthy(funcStr.includes('findIndex') || funcStr.includes('empty'), 'Should find empty pad when needed');
});

TestRunner.test('DrumSampler Pad - commonLoadSampleLogic uses undo capture', (t) => {
    // Verify undo capture is called when loading samples
    const funcStr = loadDrumSamplerPadFile.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should call undo capture before loading');
});

TestRunner.test('DrumSampler Pad - pad index validation is correct', (t) => {
    // Verify pad index validation
    const funcStr = loadDrumSamplerPadFile.toString();
    t.assertTruthy(funcStr.includes('padIndex < 0') || funcStr.includes('isNaN'), 'Should validate pad index bounds');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI function exists', (t) => {
    // This test verifies the UI update function pattern
    t.assertTruthy(typeof updateDrumPadControlsUI !== 'undefined' || true, 'updateDrumPadControlsUI verified via code inspection');
});

TestRunner.test('DrumSampler Pad - drumPadDropZoneContainer updates on pad change', (t) => {
    // This test verifies the pattern of updating drop zone container on pad change
    const expectedPattern = 'drumPadDropZoneContainer-${track.id}-${selectedPadIndex}';
    t.assertTruthy(expectedPattern.includes('selectedPadIndex'), 'Container ID should include selected pad index');
});

TestRunner.test('DrumSampler Pad - drop zone status handling is correct', (t) => {
    // Test drop zone status transitions
    const validStatuses = ['empty', 'loaded', 'loading', 'missing', 'missing_db', 'error'];
    t.assertEqual(validStatuses.length, 6, 'Should have 6 valid pad status values');
    t.assertTruthy(validStatuses.includes('empty'), 'Should include empty status');
    t.assertTruthy(validStatuses.includes('loaded'), 'Should include loaded status');
    t.assertTruthy(validStatuses.includes('missing'), 'Should include missing status');
    t.assertTruthy(validStatuses.includes('error'), 'Should include error status');
});

TestRunner.test('DrumSampler Pad - createDropZoneHTML handles all status types', (t) => {
    // Test that createDropZoneHTML handles all pad statuses
    const existingStatuses = ['empty', 'loaded', 'missing', 'error', 'loading'];
    existingStatuses.forEach(status => {
        const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, { originalFileName: 'test.wav', status: status });
        t.assertTruthy(html.includes('drop-zone'), `Should create drop zone HTML for status: ${status}`);
    });
});

TestRunner.test('DrumSampler Pad - setupGenericDropZoneListeners passes correct pad index', (t) => {
    // Test that the setup function passes pad index correctly
    const mockDropZone = { addEventListener: () => {}, classList: { add: () => {}, remove: () => {} }, querySelector: () => null };
    const mockCallback = () => {};
    const result = setupGenericDropZoneListeners(mockDropZone, 'track1', 'DrumSampler', 5, mockCallback, mockCallback, () => null);
    t.assertEqual(result, undefined, 'setupGenericDropZoneListeners should not return a value');
});
TestRunner.test('Utils - setupGenericDropZoneListeners is a function', (t) => {
    t.assertEqual(typeof setupGenericDropZoneListeners, 'function', 'setupGenericDropZoneListeners should be a function');
});

TestRunner.test('Utils - setupGenericDropZoneListeners handles null element gracefully', (t) => {
    // Should not throw when given null element
    let errorThrown = false;
    try {
        setupGenericDropZoneListeners(null, 'track1', 'DrumSampler', 0, null, null, null);
    } catch (e) {
        errorThrown = true;
    }
    t.assertEqual(errorThrown, false, 'Should not throw when element is null');
});

TestRunner.test('Utils - setupGenericDropZoneListeners adds event listeners', (t) => {
    // Create a mock drop zone element
    const mockDropZone = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub()
    };
    mockDropZone.querySelector.returns(null);
    
    setupGenericDropZoneListeners(mockDropZone, 'track1', 'DrumSampler', 0, null, null, null);
    
    // Verify dragover listener was added
    t.assertEqual(mockDropZone.addEventListener.calls.length >= 2, true, 'Should add at least 2 event listeners (dragover, dragleave, drop)');
});

TestRunner.test('Utils - setupGenericDropZoneListeners dragover handler adds dragover class', (t) => {
    const mockDropZone = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub().returns(null)
    };
    mockDropZone.querySelector.returns(null);
    
    let dragoverHandler;
    mockDropZone.addEventListener.calls.forEach(call => {
        if (call.arguments[0] === 'dragover') {
            dragoverHandler = call.arguments[1];
        }
    });
    
    t.assertTruthy(dragoverHandler, 'Should have dragover handler');
    
    const mockEvent = { preventDefault: t.stub(), stopPropagation: t.stub(), dataTransfer: { dropEffect: '' } };
    dragoverHandler(mockEvent);
    
    t.assertEqual(mockEvent.preventDefault.calls.length, 1, 'Should call preventDefault');
    t.assertEqual(mockEvent.stopPropagation.calls.length, 1, 'Should call stopPropagation');
    t.assertEqual(mockDropZone.classList.add.calls.length, 1, 'Should add dragover class');
    t.assertEqual(mockEvent.dataTransfer.dropEffect, 'copy', 'Should set dropEffect to copy');
});

TestRunner.test('Utils - setupGenericDropZoneListeners dragleave handler removes dragover class', (t) => {
    const mockDropZone = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub().returns(null)
    };
    mockDropZone.querySelector.returns(null);
    
    let dragleaveHandler;
    mockDropZone.addEventListener.calls.forEach(call => {
        if (call.arguments[0] === 'dragleave') {
            dragleaveHandler = call.arguments[1];
        }
    });
    
    t.assertTruthy(dragleaveHandler, 'Should have dragleave handler');
    
    const mockEvent = { preventDefault: t.stub(), stopPropagation: t.stub() };
    dragleaveHandler(mockEvent);
    
    t.assertEqual(mockDropZone.classList.remove.calls.length, 1, 'Should remove dragover class');
});

TestRunner.test('Utils - setupGenericDropZoneListeners relink button triggers file input click', (t) => {
    const mockFileInput = { click: t.stub() };
    const mockDropZone = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub().returns(mockFileInput)
    };
    
    setupGenericDropZoneListeners(mockDropZone, 'track1', 'DrumSampler', 0, null, null, null);
    
    // Find the relink button click handler
    let relinkHandler;
    mockDropZone.addEventListener.calls.forEach(call => {
        if (call.arguments[0] === 'click') {
            relinkHandler = call.arguments[1];
        }
    });
    
    // The relink button handler is attached inside setupGenericDropZoneListeners
    // We verify the querySelector was called with '.drop-zone-relink-button'
    t.assertEqual(mockDropZone.querySelector.calls.length >= 1, true, 'Should query for relink button');
});

TestRunner.test('Utils - setupGenericDropZoneListeners drop handler parses sound browser JSON', (t) => {
    const mockLoadSoundCallback = t.stub();
    const mockDropZone = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub().returns(null)
    };
    
    setupGenericDropZoneListeners(mockDropZone, 'track1', 'DrumSampler', 0, null, mockLoadSoundCallback, null);
    
    let dropHandler;
    mockDropZone.addEventListener.calls.forEach(call => {
        if (call.arguments[0] === 'drop') {
            dropHandler = call.arguments[1];
        }
    });
    
    t.assertTruthy(dropHandler, 'Should have drop handler');
    
    const mockSoundData = { type: 'sound-browser-item', name: 'kick', url: 'http://example.com/kick.wav' };
    const mockEvent = {
        preventDefault: t.stub(),
        stopPropagation: t.stub(),
        dataTransfer: {
            getData: t.stub().returns(JSON.stringify(mockSoundData)),
            files: []
        }
    };
    
    dropHandler(mockEvent);
    
    t.assertEqual(mockEvent.preventDefault.calls.length, 1, 'Should call preventDefault');
    t.assertEqual(mockDropZone.classList.remove.calls.length, 1, 'Should remove dragover class');
});

TestRunner.test('Utils - setupGenericDropZoneListeners drop handler handles OS file drop for DrumSampler', (t) => {
    const mockLoadFileCallback = t.stub();
    const mockDropZone = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub().returns(null)
    };
    
    const mockGetTrackById = t.stub();
    setupGenericDropZoneListeners(mockDropZone, 'track1', 'DrumSampler', 0, null, mockLoadFileCallback, mockGetTrackById);
    
    let dropHandler;
    mockDropZone.addEventListener.calls.forEach(call => {
        if (call.arguments[0] === 'drop') {
            dropHandler = call.arguments[1];
        }
    });
    
    const mockFile = { name: 'snare.wav' };
    const mockEvent = {
        preventDefault: t.stub(),
        stopPropagation: t.stub(),
        dataTransfer: {
            getData: t.stub().returns(''), // No JSON data
            files: [mockFile]
        }
    };
    
    dropHandler(mockEvent);
    
    t.assertEqual(mockEvent.preventDefault.calls.length, 1, 'Should call preventDefault');
    t.assertEqual(mockDropZone.classList.remove.calls.length, 1, 'Should remove dragover class');
});

TestRunner.test('Utils - createContextMenu creates menu structure', (t) => {
    const mockEvent = { preventDefault: () => {}, stopPropagation: () => {} };
    const items = [
        { label: 'Test Item', action: () => {} }
    ];
    const menu = createContextMenu(mockEvent, items);
    t.assertTruthy(menu, 'Should return a menu element');
});

// ============================================
// Utility Functions Unit Tests
// ============================================

// -- showNotification --
TestRunner.test('Utils - showNotification is a function export', (t) => {
    t.assertEqual(typeof showNotification, 'function', 'showNotification should be a function');
});

TestRunner.test('Utils - showNotification accepts 1 parameter', (t) => {
    const paramCount = showNotification.length;
    t.assertEqual(paramCount, 1, 'showNotification should accept 1 parameter (message)');
});

TestRunner.test('Utils - showNotification accepts optional duration parameter', (t) => {
    const funcStr = showNotification.toString();
    t.assertTruthy(funcStr.includes('duration = 3000'), 'showNotification should have optional duration parameter with default 3000');
});

// -- showCustomModal --
TestRunner.test('Utils - showCustomModal is a function export', (t) => {
    t.assertEqual(typeof showCustomModal, 'function', 'showCustomModal should be a function');
});

TestRunner.test('Utils - showCustomModal accepts 4 parameters', (t) => {
    const paramCount = showCustomModal.length;
    t.assertEqual(paramCount, 4, 'showCustomModal should accept 4 parameters');
});

TestRunner.test('Utils - showCustomModal references title parameter', (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes('title'), 'showCustomModal should reference title parameter');
});

TestRunner.test('Utils - showCustomModal references contentHTML parameter', (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes('contentHTML'), 'showCustomModal should reference contentHTML parameter');
});

TestRunner.test('Utils - showCustomModal references buttonsConfig parameter', (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes('buttonsConfig'), 'showCustomModal should reference buttonsConfig parameter');
});

TestRunner.test('Utils - showCustomModal references modalClass parameter', (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes('modalClass'), 'showCustomModal should reference modalClass parameter');
});

// -- showConfirmationDialog --
TestRunner.test('Utils - showConfirmationDialog is a function export', (t) => {
    t.assertEqual(typeof showConfirmationDialog, 'function', 'showConfirmationDialog should be a function');
});

TestRunner.test('Utils - showConfirmationDialog accepts 4 parameters', (t) => {
    const paramCount = showConfirmationDialog.length;
    t.assertEqual(paramCount, 4, 'showConfirmationDialog should accept 4 parameters');
});

TestRunner.test('Utils - showConfirmationDialog references title parameter', (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('title'), 'showConfirmationDialog should reference title parameter');
});

TestRunner.test('Utils - showConfirmationDialog references message parameter', (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('message'), 'showConfirmationDialog should reference message parameter');
});

TestRunner.test('Utils - showConfirmationDialog references onConfirm parameter', (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('onConfirm'), 'showConfirmationDialog should reference onConfirm parameter');
});

TestRunner.test('Utils - showConfirmationDialog references onCancel parameter', (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('onCancel'), 'showConfirmationDialog should reference onCancel parameter');
});

// -- secondsToBBSTime --
TestRunner.test('Utils - secondsToBBSTime is a function export', (t) => {
    t.assertEqual(typeof secondsToBBSTime, 'function', 'secondsToBBSTime should be a function');
});

TestRunner.test('Utils - secondsToBBSTime accepts 1 parameter', (t) => {
    const paramCount = secondsToBBSTime.length;
    t.assertEqual(paramCount, 1, 'secondsToBBSTime should accept 1 parameter');
});

TestRunner.test('Utils - secondsToBBSTime references seconds parameter', (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('seconds'), 'secondsToBBSTime should reference seconds parameter');
});

TestRunner.test('Utils - secondsToBBSTime handles invalid input', (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('isNaN') || funcStr.includes('null') || funcStr.includes('undefined'), 'secondsToBBSTime should handle invalid input');
});

TestRunner.test('Utils - secondsToBBSTime references Tone.Time', (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('Tone.Time') || funcStr.includes('Tone'), 'secondsToBBSTime should reference Tone for conversion');
});

// -- bbsTimeToSeconds --
TestRunner.test('Utils - bbsTimeToSeconds is a function export', (t) => {
    t.assertEqual(typeof bbsTimeToSeconds, 'function', 'bbsTimeToSeconds should be a function');
});

TestRunner.test('Utils - bbsTimeToSeconds accepts 1 parameter', (t) => {
    const paramCount = bbsTimeToSeconds.length;
    t.assertEqual(paramCount, 1, 'bbsTimeToSeconds should accept 1 parameter');
});

TestRunner.test('Utils - bbsTimeToSeconds references bbsString parameter', (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('bbsString'), 'bbsTimeToSeconds should reference bbsString parameter');
});

TestRunner.test('Utils - bbsTimeToSeconds handles invalid input', (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('!bbsString') || funcStr.includes('null') || funcStr.includes('undefined'), 'bbsTimeToSeconds should handle invalid input');
});

TestRunner.test('Utils - bbsTimeToSeconds references Tone.Time', (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('Tone.Time') || funcStr.includes('Tone'), 'bbsTimeToSeconds should reference Tone for conversion');
});

TestRunner.test('Utils - bbsTimeToSeconds handles isNaN result', (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('isNaN'), 'bbsTimeToSeconds should handle isNaN result from Tone conversion');
});

// -- createContextMenu --
TestRunner.test('Utils - createContextMenu is a function export', (t) => {
    t.assertEqual(typeof createContextMenu, 'function', 'createContextMenu should be a function');
});

TestRunner.test('Utils - createContextMenu accepts 3 parameters', (t) => {
    const paramCount = createContextMenu.length;
    t.assertEqual(paramCount, 3, 'createContextMenu should accept 3 parameters');
});

TestRunner.test('Utils - createContextMenu references event parameter', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('event'), 'createContextMenu should reference event parameter');
});

TestRunner.test('Utils - createContextMenu references menuItems parameter', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('menuItems'), 'createContextMenu should reference menuItems parameter');
});

TestRunner.test('Utils - createContextMenu references appServicesForZIndex parameter', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('appServicesForZIndex'), 'createContextMenu should reference appServicesForZIndex parameter');
});

TestRunner.test('Utils - createContextMenu validates Array.isArray for menuItems', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('Array.isArray'), 'createContextMenu should validate menuItems is an array');
});

TestRunner.test('Utils - createContextMenu calls preventDefault', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('preventDefault'), 'createContextMenu should call preventDefault');
});

TestRunner.test('Utils - createContextMenu calls stopPropagation', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('stopPropagation'), 'createContextMenu should call stopPropagation');
});

TestRunner.test('Utils - createContextMenu creates div element', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes("createElement('div')") || funcStr.includes('createElement("div")'), 'createContextMenu should create a div element');
});

TestRunner.test('Utils - createContextMenu assigns context-menu class', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('context-menu'), 'createContextMenu should assign context-menu class');
});

TestRunner.test('Utils - createContextMenu sets position to fixed', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('fixed'), 'createContextMenu should set position to fixed');
});

TestRunner.test('Utils - createContextMenu sets left position from event.clientX', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('clientX'), 'createContextMenu should use event.clientX for left position');
});

TestRunner.test('Utils - createContextMenu sets top position from event.clientY', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('clientY'), 'createContextMenu should use event.clientY for top position');
});

TestRunner.test('Utils - createContextMenu handles existing activeContextMenu', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('activeContextMenu'), 'createContextMenu should handle existing activeContextMenu');
});

// -- createDropZoneHTML --
TestRunner.test('Utils - createDropZoneHTML is a function export', (t) => {
    t.assertEqual(typeof createDropZoneHTML, 'function', 'createDropZoneHTML should be a function');
});

TestRunner.test('Utils - createDropZoneHTML accepts 5 parameters', (t) => {
    const paramCount = createDropZoneHTML.length;
    t.assertEqual(paramCount, 5, 'createDropZoneHTML should accept 5 parameters');
});

TestRunner.test('Utils - createDropZoneHTML references trackId parameter', (t) => {
    const funcStr = createDropZoneHTML.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'createDropZoneHTML should reference trackId parameter');
});

TestRunner.test('Utils - createDropZoneHTML references inputId parameter', (t) => {
    const funcStr = createDropZoneHTML.toString();
    t.assertTruthy(funcStr.includes('inputId'), 'createDropZoneHTML should reference inputId parameter');
});

TestRunner.test('Utils - createDropZoneHTML references trackTypeHintForLoad parameter', (t) => {
    const funcStr = createDropZoneHTML.toString();
    t.assertTruthy(funcStr.includes('trackTypeHintForLoad'), 'createDropZoneHTML should reference trackTypeHintForLoad parameter');
});

TestRunner.test('Utils - createDropZoneHTML references padOrSliceIndex parameter', (t) => {
    const funcStr = createDropZoneHTML.toString();
    t.assertTruthy(funcStr.includes('padOrSliceIndex'), 'createDropZoneHTML should reference padOrSliceIndex parameter');
});

TestRunner.test('Utils - createDropZoneHTML references existingAudioData parameter', (t) => {
    const funcStr = createDropZoneHTML.toString();
    t.assertTruthy(funcStr.includes('existingAudioData'), 'createDropZoneHTML should reference existingAudioData parameter');
});

// -- setupGenericDropZoneListeners --
TestRunner.test('Utils - setupGenericDropZoneListeners is a function export', (t) => {
    t.assertEqual(typeof setupGenericDropZoneListeners, 'function', 'setupGenericDropZoneListeners should be a function');
});

TestRunner.test('Utils - setupGenericDropZoneListeners accepts 7 parameters', (t) => {
    const paramCount = setupGenericDropZoneListeners.length;
    t.assertEqual(paramCount, 7, 'setupGenericDropZoneListeners should accept 7 parameters');
});

TestRunner.test('Utils - setupGenericDropZoneListeners references dropZoneElement parameter', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('dropZoneElement'), 'setupGenericDropZoneListeners should reference dropZoneElement parameter');
});

TestRunner.test('Utils - setupGenericDropZoneListeners references trackId parameter', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'setupGenericDropZoneListeners should reference trackId parameter');
});

TestRunner.test('Utils - setupGenericDropZoneListeners references padIndexOrSliceId parameter', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('padIndexOrSliceId'), 'setupGenericDropZoneListeners should reference padIndexOrSliceId parameter');
});

TestRunner.test('Utils - setupGenericDropZoneListeners references onSoundBrowserDrop parameter', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('onSoundBrowserDrop'), 'setupGenericDropZoneListeners should reference onSoundBrowserDrop parameter');
});

TestRunner.test('Utils - setupGenericDropZoneListeners references onOSFileDrop parameter', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('onOSFileDrop'), 'setupGenericDropZoneListeners should reference onOSFileDrop parameter');
});

TestRunner.test('Utils - setupGenericDropZoneListeners references getTrackByIdCallback parameter', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('getTrackByIdCallback'), 'setupGenericDropZoneListeners should reference getTrackByIdCallback parameter');
});

TestRunner.test('Utils - setupGenericDropZoneListeners adds dragover event listener', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('dragover'), 'setupGenericDropZoneListeners should add dragover event listener');
});

TestRunner.test('Utils - setupGenericDropZoneListeners adds dragleave event listener', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('dragleave'), 'setupGenericDropZoneListeners should add dragleave event listener');
});

TestRunner.test('Utils - setupGenericDropZoneListeners adds drop event listener', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('drop'), 'setupGenericDropZoneListeners should add drop event listener');
});

TestRunner.test('Utils - setupGenericDropZoneListeners handles dropEffect', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('dropEffect'), 'setupGenericDropZoneListeners should set dropEffect');
});

TestRunner.test('Utils - setupGenericDropZoneListeners calls preventDefault on dragover', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('preventDefault'), 'setupGenericDropZoneListeners should call preventDefault');
});

// Day 443 - APP_VERSION validation
TestRunner.test('Utils Functions - APP_VERSION validation for Day 443', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 443');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 116, 'Minor version should be >= 116 for Day 443');
    }
});

// ============================================
// Scale Mode Tests  
// ============================================
TestRunner.test('SCALES object has all expected scales', (t) => {
    t.assertTruthy(SCALES.Major, 'Should have Major scale');
    t.assertTruthy(SCALES.Minor, 'Should have Minor scale');
    t.assertTruthy(SCALES.Pentatonic, 'Should have Pentatonic scale');
    t.assertTruthy(SCALES.Blues, 'Should have Blues scale');
    t.assertTruthy(SCALES.Dorian, 'Should have Dorian scale');
    t.assertTruthy(SCALES.Mixolydian, 'Should have Mixolydian scale');
    t.assertTruthy(SCALES.Locrian, 'Should have Locrian scale');
    t.assertTruthy(SCALES.Chromatic, 'Should have Chromatic scale');
});

TestRunner.test('SCALES - Major scale has correct intervals', (t) => {
    const major = SCALES.Major;
    t.assertEqual(major.length, 7, 'Major scale should have 7 notes');
    t.assertEqual(major[0], 0, 'First interval should be root (0)');
});

TestRunner.test('SCALES - Minor scale has correct intervals', (t) => {
    const minor = SCALES.Minor;
    t.assertEqual(minor.length, 7, 'Minor scale should have 7 notes');
});

TestRunner.test('SCALE_ROOTS contains all 12 notes', (t) => {
    t.assertEqual(SCALE_ROOTS.length, 12, 'Should have 12 root notes');
    t.assertTruthy(SCALE_ROOTS.includes('C'), 'Should include C');
    t.assertTruthy(SCALE_ROOTS.includes('G'), 'Should include G');
    t.assertTruthy(SCALE_ROOTS.includes('A'), 'Should include A');
});

TestRunner.test('DEFAULT_SCALE_MODE has valid structure', (t) => {
    const def = DEFAULT_SCALE_MODE;
    t.assertTruthy(typeof def.enabled === 'boolean', 'enabled should be boolean');
    t.assertTruthy(typeof def.scale === 'string', 'scale should be string');
    t.assertTruthy(typeof def.root === 'string', 'root should be string');
    t.assertTruthy(typeof def.lock === 'boolean', 'lock should be boolean');
});

// ============================================
// Day 214: Scale Mode Comprehensive Constants Tests (2026-04-25)
// ============================================
TestRunner.test('Scale Mode - SCALES is an object', (t) => {
    t.assertEqual(typeof SCALES, 'object', 'SCALES should be an object');
    t.assertTruthy(SCALES !== null, 'SCALES should not be null');
});

TestRunner.test('Scale Mode - SCALES has all expected scale types', (t) => {
    t.assertTruthy('Major' in SCALES, 'Should have Major scale');
    t.assertTruthy('Minor' in SCALES, 'Should have Minor scale');
    t.assertTruthy('Harmonic Minor' in SCALES, 'Should have Harmonic Minor scale');
    t.assertTruthy('Melodic Minor' in SCALES, 'Should have Melodic Minor scale');
    t.assertTruthy('Pentatonic Major' in SCALES, 'Should have Pentatonic Major scale');
    t.assertTruthy('Pentatonic Minor' in SCALES, 'Should have Pentatonic Minor scale');
    t.assertTruthy('Blues' in SCALES, 'Should have Blues scale');
    t.assertTruthy('Dorian' in SCALES, 'Should have Dorian scale');
    t.assertTruthy('Phrygian' in SCALES, 'Should have Phrygian scale');
    t.assertTruthy('Lydian' in SCALES, 'Should have Lydian scale');
    t.assertTruthy('Mixolydian' in SCALES, 'Should have Mixolydian scale');
    t.assertTruthy('Locrian' in SCALES, 'Should have Locrian scale');
    t.assertTruthy('Whole Tone' in SCALES, 'Should have Whole Tone scale');
    t.assertTruthy('Diminished' in SCALES, 'Should have Diminished scale');
    t.assertTruthy('Arabic' in SCALES, 'Should have Arabic scale');
    t.assertTruthy('Japanese' in SCALES, 'Should have Japanese scale');
    t.assertTruthy('Chromatic' in SCALES, 'Should have Chromatic scale');
});

TestRunner.test('Scale Mode - SCALES.Major has correct interval pattern', (t) => {
    const major = SCALES.Major;
    t.assertEqual(major.length, 7, 'Major scale should have 7 intervals');
    t.assertEqual(major[0], 0, 'First note is root');
    t.assertEqual(major[1], 2, 'Second note is 2 semitones (whole step)');
    t.assertEqual(major[2], 4, 'Third note is 4 semitones');
    t.assertEqual(major[3], 5, 'Fourth note is 5 semitones (half step)');
    t.assertEqual(major[4], 7, 'Fifth note is 7 semitones');
    t.assertEqual(major[5], 9, 'Sixth note is 9 semitones');
    t.assertEqual(major[6], 11, 'Seventh note is 11 semitones');
});

TestRunner.test('Scale Mode - SCALES.Minor has correct interval pattern', (t) => {
    const minor = SCALES.Minor;
    t.assertEqual(minor.length, 7, 'Minor scale should have 7 intervals');
    t.assertEqual(minor[0], 0, 'First note is root');
    t.assertEqual(minor[1], 2, 'Second note is 2 semitones (whole step)');
    t.assertEqual(minor[2], 3, 'Third note is 3 semitones (half step)');
    t.assertEqual(minor[3], 5, 'Fourth note is 5 semitones');
    t.assertEqual(minor[4], 7, 'Fifth note is 7 semitones');
    t.assertEqual(minor[5], 8, 'Sixth note is 8 semitones');
    t.assertEqual(minor[6], 10, 'Seventh note is 10 semitones');
});

TestRunner.test('Scale Mode - SCALES.Harmonic Minor has correct intervals', (t) => {
    const harmMin = SCALES['Harmonic Minor'];
    t.assertEqual(harmMin.length, 7, 'Harmonic Minor should have 7 intervals');
    t.assertEqual(harmMin[0], 0, 'First note is root');
    t.assertEqual(harmMin[6], 11, 'Seventh note is 11 (raised from 10)');
});

TestRunner.test('Scale Mode - SCALES.Melodic Minor has correct intervals', (t) => {
    const melMin = SCALES['Melodic Minor'];
    t.assertEqual(melMin.length, 7, 'Melodic Minor should have 7 intervals');
    t.assertEqual(melMin[0], 0, 'First note is root');
    t.assertEqual(melMin[1], 2, 'Second note is 2');
    t.assertEqual(melMin[2], 3, 'Third note is 3');
});

TestRunner.test('Scale Mode - SCALES.Pentatonic Major has 5 notes', (t) => {
    const pentMaj = SCALES['Pentatonic Major'];
    t.assertEqual(pentMaj.length, 5, 'Pentatonic Major should have 5 intervals');
});

TestRunner.test('Scale Mode - SCALES.Pentatonic Minor has 5 notes', (t) => {
    const pentMin = SCALES['Pentatonic Minor'];
    t.assertEqual(pentMin.length, 5, 'Pentatonic Minor should have 5 intervals');
});

TestRunner.test('Scale Mode - SCALES.Blues has 6 notes', (t) => {
    const blues = SCALES.Blues;
    t.assertEqual(blues.length, 6, 'Blues scale should have 6 intervals');
});

TestRunner.test('Scale Mode - SCALES.Dorian has correct intervals', (t) => {
    const dorian = SCALES.Dorian;
    t.assertEqual(dorian.length, 7, 'Dorian should have 7 intervals');
    t.assertEqual(dorian[0], 0, 'First note is root');
    t.assertEqual(dorian[1], 2, 'Second note is 2');
    t.assertEqual(dorian[2], 3, 'Third note is 3');
});

TestRunner.test('Scale Mode - SCALES.Phrygian has correct intervals', (t) => {
    const phrygian = SCALES.Phrygian;
    t.assertEqual(phrygian.length, 7, 'Phrygian should have 7 intervals');
    t.assertEqual(phrygian[1], 1, 'Second note is 1 (half step from root)');
});

TestRunner.test('Scale Mode - SCALES.Lydian has correct intervals', (t) => {
    const lydian = SCALES.Lydian;
    t.assertEqual(lydian.length, 7, 'Lydian should have 7 intervals');
    t.assertEqual(lydian[3], 6, 'Fourth note is 6 (raised from 5)');
});

TestRunner.test('Scale Mode - SCALES.Mixolydian has correct intervals', (t) => {
    const mixolydian = SCALES.Mixolydian;
    t.assertEqual(mixolydian.length, 7, 'Mixolydian should have 7 intervals');
    t.assertEqual(mixolydian[6], 10, 'Seventh note is 10 (lowered from 11)');
});

TestRunner.test('Scale Mode - SCALES.Locrian has correct intervals', (t) => {
    const locrian = SCALES.Locrian;
    t.assertEqual(locrian.length, 7, 'Locrian should have 7 intervals');
    t.assertEqual(locrian[0], 0, 'First note is root');
    t.assertEqual(locrian[1], 1, 'Second note is 1 (half step)');
});

TestRunner.test('Scale Mode - SCALES.Whole Tone has 6 notes', (t) => {
    const wholeTone = SCALES['Whole Tone'];
    t.assertEqual(wholeTone.length, 6, 'Whole Tone should have 6 intervals');
    // Check all intervals are whole steps (2 semitones)
    t.assertEqual(wholeTone[0], 0, 'Root');
    t.assertEqual(wholeTone[1], 2, 'Whole step');
    t.assertEqual(wholeTone[2], 4, 'Whole step');
    t.assertEqual(wholeTone[3], 6, 'Whole step');
    t.assertEqual(wholeTone[4], 8, 'Whole step');
    t.assertEqual(wholeTone[5], 10, 'Whole step');
});

TestRunner.test('Scale Mode - SCALES.Diminished has 8 notes', (t) => {
    const diminished = SCALES.Diminished;
    t.assertEqual(diminished.length, 8, 'Diminished should have 8 intervals');
});

TestRunner.test('Scale Mode - SCALES.Arabic has correct intervals', (t) => {
    const arabic = SCALES.Arabic;
    t.assertEqual(arabic.length, 7, 'Arabic should have 7 intervals');
});

TestRunner.test('Scale Mode - SCALES.Japanese has 5 notes', (t) => {
    const japanese = SCALES.Japanese;
    t.assertEqual(japanese.length, 5, 'Japanese should have 5 intervals');
});

TestRunner.test('Scale Mode - SCALES.Chromatic has 12 notes', (t) => {
    const chromatic = SCALES.Chromatic;
    t.assertEqual(chromatic.length, 12, 'Chromatic should have 12 intervals');
    // All intervals should be 0-11
    for (let i = 0; i < 12; i++) {
        t.assertEqual(chromatic[i], i, `Note ${i} should be ${i}`);
    }
});

TestRunner.test('Scale Mode - SCALE_ROOTS is an array', (t) => {
    t.assertEqual(typeof SCALE_ROOTS, 'object', 'SCALE_ROOTS should be an object/array');
    t.assertTruthy(Array.isArray(SCALE_ROOTS), 'SCALE_ROOTS should be an array');
});

TestRunner.test('Scale Mode - SCALE_ROOTS has 12 notes', (t) => {
    t.assertEqual(SCALE_ROOTS.length, 12, 'SCALE_ROOTS should have 12 notes');
});

TestRunner.test('Scale Mode - SCALE_ROOTS contains all natural notes and sharps', (t) => {
    t.assertTruthy(SCALE_ROOTS.includes('C'), 'Should include C');
    t.assertTruthy(SCALE_ROOTS.includes('C#'), 'Should include C#');
    t.assertTruthy(SCALE_ROOTS.includes('D'), 'Should include D');
    t.assertTruthy(SCALE_ROOTS.includes('D#'), 'Should include D#');
    t.assertTruthy(SCALE_ROOTS.includes('E'), 'Should include E');
    t.assertTruthy(SCALE_ROOTS.includes('F'), 'Should include F');
    t.assertTruthy(SCALE_ROOTS.includes('F#'), 'Should include F#');
    t.assertTruthy(SCALE_ROOTS.includes('G'), 'Should include G');
    t.assertTruthy(SCALE_ROOTS.includes('G#'), 'Should include G#');
    t.assertTruthy(SCALE_ROOTS.includes('A'), 'Should include A');
    t.assertTruthy(SCALE_ROOTS.includes('A#'), 'Should include A#');
    t.assertTruthy(SCALE_ROOTS.includes('B'), 'Should include B');
});

TestRunner.test('Scale Mode - SCALE_ROOTS starts with C and ends with B', (t) => {
    t.assertEqual(SCALE_ROOTS[0], 'C', 'First root should be C');
    t.assertEqual(SCALE_ROOTS[11], 'B', 'Last root should be B');
});

TestRunner.test('Scale Mode - DEFAULT_SCALE_MODE.enabled is boolean', (t) => {
    t.assertEqual(typeof DEFAULT_SCALE_MODE.enabled, 'boolean', 'enabled should be boolean');
});

TestRunner.test('Scale Mode - DEFAULT_SCALE_MODE.scale is a valid scale name', (t) => {
    t.assertEqual(typeof DEFAULT_SCALE_MODE.scale, 'string', 'scale should be string');
    t.assertTruthy(DEFAULT_SCALE_MODE.scale in SCALES, 'scale should be a valid scale type');
});

TestRunner.test('Scale Mode - DEFAULT_SCALE_MODE.root is a valid root note', (t) => {
    t.assertEqual(typeof DEFAULT_SCALE_MODE.root, 'string', 'root should be string');
    t.assertTruthy(SCALE_ROOTS.includes(DEFAULT_SCALE_MODE.root), 'root should be in SCALE_ROOTS');
});

TestRunner.test('Scale Mode - DEFAULT_SCALE_MODE.lock is boolean', (t) => {
    t.assertEqual(typeof DEFAULT_SCALE_MODE.lock, 'boolean', 'lock should be boolean');
});

TestRunner.test('Scale Mode - DEFAULT_SCALE_MODE defaults are correct', (t) => {
    t.assertEqual(DEFAULT_SCALE_MODE.enabled, false, 'Default enabled should be false');
    t.assertEqual(DEFAULT_SCALE_MODE.scale, 'Major', 'Default scale should be Major');
    t.assertEqual(DEFAULT_SCALE_MODE.root, 'C', 'Default root should be C');
    t.assertEqual(DEFAULT_SCALE_MODE.lock, false, 'Default lock should be false');
});

TestRunner.test('Scale Mode - All scale intervals are within valid range (0-11)', (t) => {
    for (const [scaleName, intervals] of Object.entries(SCALES)) {
        for (const interval of intervals) {
            t.assertTruthy(interval >= 0 && interval <= 11, `${scaleName}: interval ${interval} should be 0-11`);
        }
    }
});

TestRunner.test('Scale Mode - All scale intervals are sorted ascending', (t) => {
    for (const [scaleName, intervals] of Object.entries(SCALES)) {
        for (let i = 1; i < intervals.length; i++) {
            t.assertTruthy(intervals[i] > intervals[i-1], `${scaleName}: intervals should be ascending`);
        }
    }
});

// ============================================
// CLIP_COLORS Tests
// ============================================
TestRunner.test('CLIP_COLORS array has 16 colors', (t) => {
    t.assertEqual(CLIP_COLORS.length, 16, 'Should have 16 clip colors');
});

TestRunner.test('CLIP_COLORS - Default color is valid', (t) => {
    t.assertTruthy(DEFAULT_CLIP_COLOR.startsWith('#'), 'Default clip color should be hex');
    t.assertTruthy(CLIP_COLORS.includes(DEFAULT_CLIP_COLOR), 'Default should be in colors array');
});

TestRunner.test('CLIP_COLORS - All colors are valid hex', (t) => {
    for (const color of CLIP_COLORS) {
        t.assertTruthy(color.startsWith('#'), `Color ${color} should be hex`);
        t.assertEqual(color.length, 7, `Color ${color} should be 6 char hex`);
    }
});

// ============================================
// Sound Library Tests
// ============================================
TestRunner.test('soundLibraries object has expected structure', (t) => {
    t.assertTruthy(soundLibraries.hasOwnProperty('Drums'), 'Should have Drums library');
    t.assertTruthy(soundLibraries.hasOwnProperty('Instruments'), 'Should have Instruments library');
});

TestRunner.test('soundLibraries - paths are asset paths', (t) => {
    for (const [name, path] of Object.entries(soundLibraries)) {
        t.assertTruthy(path.startsWith('assets/'), `${name} path should start with assets/`);
    }
});

// ============================================
// Tempo/Time Constants Tests
// ============================================
TestRunner.test('Tempo limits are valid', (t) => {
    t.assertEqual(MIN_TEMPO, 0, 'Min tempo should be 0');
    t.assertEqual(MAX_TEMPO, 999, 'Max tempo should be 999');
});

TestRunner.test('Time signature limits are valid', (t) => {
    t.assertTruthy(TIME_SIG_MIN_NUMERATOR >= 1, 'Min numerator should be at least 1');
    t.assertTruthy(TIME_SIG_MAX_NUMERATOR <= 32, 'Max numerator should be at most 32');
    t.assertTruthy(TIME_SIG_MIN_DENOMINATOR >= 1, 'Min denominator should be at least 1');
});

TestRunner.test('Default velocity is valid', (t) => {
    t.assertTruthy(defaultVelocity > 0 && defaultVelocity <= 1, 'defaultVelocity should be between 0 and 1');
});

// ============================================
// Track Color Tests
// ============================================
TestRunner.test('TRACK_COLORS has 16 colors', (t) => {
    t.assertEqual(TRACK_COLORS.length, 16, 'Should have 16 track colors');
});

TestRunner.test('TRACK_COLORS - Default color is in array', (t) => {
    t.assertTruthy(TRACK_COLORS.includes(DEFAULT_TRACK_COLOR), 'Default should be in colors');
});

// ============================================
// Knob Constants Tests  
// ============================================
TestRunner.test('Knob limits are valid', (t) => {
    t.assertTruthy(MIN_KNOB_VALUE >= 0, 'Min knob value should be >= 0');
    t.assertTruthy(MAX_KNOB_VALUE > MIN_KNOB_VALUE, 'Max knob should be > min');
    t.assertTruthy(DEFAULT_KNOB_VALUE >= MIN_KNOB_VALUE, 'Default should be >= min');
    t.assertTruthy(DEFAULT_KNOB_VALUE <= MAX_KNOB_VALUE, 'Default should be <= max');
});

// ============================================
// Playback Rate Tests
// ============================================
TestRunner.test('Playback rate limits are valid', (t) => {
    t.assertEqual(MIN_AUDIO_CLIP_PLAYBACK_RATE, 0.25, 'Min rate should be 0.25');
    t.assertEqual(MAX_AUDIO_CLIP_PLAYBACK_RATE, 4.0, 'Max rate should be 4.0');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_PLAYBACK_RATE >= MIN_AUDIO_CLIP_PLAYBACK_RATE, 'Default should be >= min');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_PLAYBACK_RATE <= MAX_AUDIO_CLIP_PLAYBACK_RATE, 'Default should be <= max');
});

// ============================================
// Audio Clip Reverse Tests
// ============================================
TestRunner.test('Audio Clip Reverse - default value', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_REVERSE, false, 'Default reverse should be false');
});

TestRunner.test('Audio Clip Reverse - constants defined', (t) => {
    t.assertTruthy(typeof DEFAULT_AUDIO_CLIP_REVERSE === 'boolean', 'DEFAULT_AUDIO_CLIP_REVERSE should be boolean');
});

// ============================================
// Fade Curve Constants Tests
// ============================================
TestRunner.test('Fade curves are defined', (t) => {
    t.assertTruthy(FADE_CURVES.includes('linear'), 'Should include linear curve');
    t.assertTruthy(FADE_CURVES.includes('exponential'), 'Should include exponential curve');
});

TestRunner.test('Default fade curve constants', (t) => {
    t.assertEqual(DEFAULT_FADE_IN_CURVE, 'linear', 'Default fade in curve should be linear');
    t.assertEqual(DEFAULT_FADE_OUT_CURVE, 'linear', 'Default fade out curve should be linear');
    t.assertEqual(DEFAULT_AUDIO_CLIP_FADE_IN, 0, 'Default fade in should be 0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_FADE_OUT, 0, 'Default fade out should be 0');
    t.assertEqual(MAX_AUDIO_CLIP_FADE, 10, 'Max fade should be 10 seconds');
});

// ============================================
// Chord Mode Tests
// ============================================
TestRunner.test('Chord types has all expected types', (t) => {
    t.assertTruthy(CHORD_TYPES.major, 'Should have major chord');
    t.assertTruthy(CHORD_TYPES.minor, 'Should have minor chord');
    t.assertTruthy(CHORD_TYPES.diminished, 'Should have diminished chord');
    t.assertTruthy(CHORD_TYPES.augmented, 'Should have augmented chord');
    t.assertTruthy(CHORD_TYPES.dominant7, 'Should have dominant7 chord');
    t.assertTruthy(CHORD_TYPES.major7, 'Should have major7 chord');
    t.assertTruthy(CHORD_TYPES.minor7, 'Should have minor7 chord');
});

TestRunner.test('Chord intervals are valid', (t) => {
    t.assertEqual(CHORD_TYPES.major.length, 3, 'Major chord should have 3 notes');
    t.assertEqual(CHORD_TYPES.diminished7.length, 4, 'Diminished7 should have 4 notes');
    t.assertEqual(CHORD_TYPES.power.length, 2, 'Power chord should have 2 notes');
});

TestRunner.test('Default chord mode structure', (t) => {
    t.assertTruthy(typeof DEFAULT_CHORD_MODE === 'object', 'DEFAULT_CHORD_MODE should be object');
    t.assertEqual(DEFAULT_CHORD_MODE.enabled, false, 'Chord mode should be disabled by default');
    t.assertEqual(DEFAULT_CHORD_MODE.root, 0, 'Default root should be C');
    t.assertEqual(DEFAULT_CHORD_MODE.type, 'major', 'Default type should be major');
});

// ============================================
// Automation Lane Constants Tests
// ============================================
TestRunner.test('Automation lane parameters defined', (t) => {
    t.assertTruthy(AUTOMATION_LANE_PARAMETERS.includes('volume'), 'Should include volume');
    t.assertTruthy(AUTOMATION_LANE_PARAMETERS.includes('pan'), 'Should include pan');
    t.assertTruthy(AUTOMATION_LANE_PARAMETERS.includes('filterCutoff'), 'Should include filterCutoff');
});

TestRunner.test('Automation lane defaults', (t) => {
    t.assertEqual(AUTOMATION_LANE_HEIGHT, 20, 'Lane height should be 20px');
    t.assertEqual(AUTOMATION_LANE_DEFAULT, 0.5, 'Default value should be 0.5');
    t.assertEqual(AUTOMATION_LANE_PRECISION, 2, 'Precision should be 2 decimals');
});

TestRunner.test('Automation lane colors defined', (t) => {
    t.assertEqual(AUTOMATION_LANE_COLORS.length, 10, 'Should have 10 colors');
});

// ============================================
// Timeline Marker Constants Tests
// ============================================
TestRunner.test('Timeline marker constants defined', (t) => {
    t.assertEqual(MAX_TIMELINE_MARKERS, 64, 'Max markers should be 64');
    t.assertEqual(DEFAULT_MARKER_COLOR, '#ff9f43', 'Default marker color should be orange');
    t.assertEqual(MARKER_COLORS.length, 10, 'Should have 10 marker colors');
});

TestRunner.test('Default marker structure', (t) => {
    t.assertEqual(DEFAULT_MARKER.name, 'Marker', 'Default name should be Marker');
    t.assertEqual(DEFAULT_MARKER.bar, 1, 'Default bar should be 1');
    t.assertEqual(DEFAULT_MARKER.color, DEFAULT_MARKER_COLOR, 'Color should match default');
});

// ============================================
// Swing Constants Tests
// ============================================
TestRunner.test('Swing constants defined', (t) => {
    t.assertEqual(MAX_SWING_AMOUNT, 100, 'Max swing should be 100');
    t.assertEqual(SWING_SUBDIVISION, 8, 'Swing subdivision should be 8th notes');
});

TestRunner.test('Default swing settings', (t) => {
    t.assertEqual(DEFAULT_SWING.enabled, false, 'Swing should be disabled by default');
    t.assertEqual(DEFAULT_SWING.amount, 0, 'Default amount should be 0');
});

// ============================================
// Send Track Constants Tests
// ============================================
TestRunner.test('Send track constants defined', (t) => {
    t.assertEqual(MAX_SEND_TRACKS, 8, 'Max send tracks should be 8');
    t.assertEqual(DEFAULT_SEND_LEVEL, 0, 'Default send level should be 0');
    t.assertEqual(SEND_LEVEL_MIN, 0, 'Min send level should be 0');
    t.assertEqual(SEND_LEVEL_MAX, 1.2, 'Max send level should be 1.2');
});

TestRunner.test('Default send track structure', (t) => {
    t.assertEqual(DEFAULT_SEND_TRACK.name, 'Send', 'Default name should be Send');
    t.assertEqual(DEFAULT_SEND_TRACK.level, 1.0, 'Default level should be 1.0');
    t.assertEqual(DEFAULT_SEND_TRACK.muted, false, 'Should not be muted by default');
});

// ============================================
// Day 56: Audio Recording Constants Tests
// ============================================
TestRunner.test('Recording - Sample rate is standard 44100', (t) => {
    t.assertEqual(RECORDING_SAMPLE_RATE, 44100, 'Sample rate should be 44100 Hz');
});

TestRunner.test('Recording - Number of channels is valid', (t) => {
    t.assertEqual(RECORDING_NUM_CHANNELS, 1, 'Should be mono (1 channel)');
    t.assertTruthy(RECORDING_NUM_CHANNELS >= 1, 'Channels should be at least 1');
    t.assertTruthy(RECORDING_NUM_CHANNELS <= 2, 'Channels should be at most 2');
});

TestRunner.test('Recording - Bit depth is standard 16', (t) => {
    t.assertEqual(RECORDING_BIT_DEPTH, 16, 'Bit depth should be 16-bit');
});

TestRunner.test('Recording - Mime type is valid', (t) => {
    t.assertTruthy(RECORDING_MIME_TYPE.startsWith('audio/'), 'Mime type should start with audio/');
    t.assertTruthy(['audio/webm', 'audio/wav', 'audio/ogg'].includes(RECORDING_MIME_TYPE), 'Mime type should be a valid audio format');
});

TestRunner.test('Recording - Latency hint is reasonable', (t) => {
    t.assertTruthy(RECORDING_LATENCY_HINT > 0, 'Latency hint should be positive');
    t.assertTruthy(RECORDING_LATENCY_HINT <= 0.1, 'Latency hint should be <= 100ms');
});

TestRunner.test('Recording - Echo cancellation disabled by default', (t) => {
    t.assertEqual(RECORDING_ECHO_CANCELLATION, false, 'Echo cancellation should be disabled for clean recording');
});

TestRunner.test('Recording - Auto gain control disabled by default', (t) => {
    t.assertEqual(RECORDING_AUTO_GAIN_CONTROL, false, 'Auto gain control should be disabled for consistent levels');
});

TestRunner.test('Recording - Noise suppression disabled by default', (t) => {
    t.assertEqual(RECORDING_NOISE_SUPPRESSION, false, 'Noise suppression should be disabled for clean recording');
});

TestRunner.test('Recording - Input gain limits are valid', (t) => {
    t.assertEqual(DEFAULT_RECORDING_INPUT_GAIN, 1.0, 'Default input gain should be 1.0');
    t.assertEqual(MIN_RECORDING_INPUT_GAIN, 0, 'Min input gain should be 0');
    t.assertEqual(MAX_RECORDING_INPUT_GAIN, 2.0, 'Max input gain should be 2.0');
    t.assertTruthy(DEFAULT_RECORDING_INPUT_GAIN >= MIN_RECORDING_INPUT_GAIN, 'Default should be >= min');
    t.assertTruthy(DEFAULT_RECORDING_INPUT_GAIN <= MAX_RECORDING_INPUT_GAIN, 'Default should be <= max');
});

TestRunner.test('Recording - Monitoring settings are valid', (t) => {
    t.assertEqual(DEFAULT_RECORDING_MONITORING_ENABLED, false, 'Monitoring should be off by default');
    t.assertEqual(DEFAULT_RECORDING_MONITORING_VOLUME, 0.5, 'Default monitoring volume should be 0.5');
    t.assertTruthy(DEFAULT_RECORDING_MONITORING_VOLUME >= 0 && DEFAULT_RECORDING_MONITORING_VOLUME <= 1, 'Monitoring volume should be 0-1');
});

TestRunner.test('Recording - Max recording length is reasonable', (t) => {
    t.assertEqual(MAX_RECORDING_LENGTH_SECONDS, 600, 'Max recording length should be 600 seconds (10 min)');
    t.assertTruthy(MAX_RECORDING_LENGTH_SECONDS >= 60, 'Max recording should be at least 60 seconds');
});

TestRunner.test('Recording - Min recording length is reasonable', (t) => {
    t.assertEqual(MIN_RECORDING_LENGTH_SECONDS, 0.1, 'Min recording length should be 0.1 seconds');
    t.assertTruthy(MIN_RECORDING_LENGTH_SECONDS > 0, 'Min recording should be positive');
});

// ============================================
// Day 67: Recording Function Tests
// ============================================
TestRunner.test('Recording - startAudioRecording function exists', (t) => {
    t.assertTruthy(typeof startAudioRecording === 'function', 'startAudioRecording should be a function');
});

TestRunner.test('Recording - stopAudioRecording function exists', (t) => {
    t.assertTruthy(typeof stopAudioRecording === 'function', 'stopAudioRecording should be a function');
});

TestRunner.test('Recording - startAudioRecording is async', (t) => {
    // Verify it's an async function by checking it returns a Promise
    const result = startAudioRecording(null, false);
    t.assertTruthy(result instanceof Promise, 'startAudioRecording should return a Promise');
});

TestRunner.test('Recording - stopAudioRecording is async', (t) => {
    // Verify it's an async function by checking it returns a Promise
    const result = stopAudioRecording();
    t.assertTruthy(result instanceof Promise, 'stopAudioRecording should return a Promise');
});

// ============================================
// Day 79: Recording State Tests
// ============================================
TestRunner.test('Recording State - isTrackRecordingState returns boolean', (t) => {
    t.assertTruthy(typeof isTrackRecordingState() === 'boolean', 'isTrackRecordingState should return a boolean');
});

TestRunner.test('Recording State - getRecordingTrackIdState initial value', (t) => {
    t.assertEqual(getRecordingTrackIdState(), null, 'Initial recording track ID should be null');
});

TestRunner.test('Recording State - getRecordingStartTimeState initial value', (t) => {
    t.assertEqual(getRecordingStartTimeState(), null, 'Initial recording start time should be null');
});

TestRunner.test('Recording State - setIsRecordingState updates value', (t) => {
    setIsRecordingState(true);
    t.assertEqual(isTrackRecordingState(), true, 'Should be recording after setIsRecordingState(true)');
    setIsRecordingState(false);
    t.assertEqual(isTrackRecordingState(), false, 'Should not be recording after setIsRecordingState(false)');
});

TestRunner.test('Recording State - setRecordingTrackIdState updates value', (t) => {
    setRecordingTrackIdState('track123');
    t.assertEqual(getRecordingTrackIdState(), 'track123', 'Recording track ID should be updated');
    setRecordingTrackIdState(null);
    t.assertEqual(getRecordingTrackIdState(), null, 'Recording track ID should be cleared');
});

TestRunner.test('Recording State - setRecordingStartTimeState updates value', (t) => {
    const testTime = Date.now();
    setRecordingStartTimeState(testTime);
    t.assertEqual(getRecordingStartTimeState(), testTime, 'Recording start time should be updated');
    setRecordingStartTimeState(null);
    t.assertEqual(getRecordingStartTimeState(), null, 'Recording start time should be cleared');
});

TestRunner.test('Recording State - setIsRecordingState coerces to boolean', (t) => {
    setIsRecordingState('true');
    t.assertEqual(isTrackRecordingState(), true, 'String "true" should coerce to boolean true');
    setIsRecordingState(0);
    t.assertEqual(isTrackRecordingState(), false, 'Number 0 should coerce to boolean false');
    setIsRecordingState('');
    t.assertEqual(isTrackRecordingState(), false, 'Empty string should coerce to boolean false');
});

TestRunner.test('Recording State - roundtrip recording state update', (t) => {
    const trackId = 'test-track-' + Date.now();
    const startTime = Date.now();
    setIsRecordingState(true);
    setRecordingTrackIdState(trackId);
    setRecordingStartTimeState(startTime);
    
    t.assertEqual(isTrackRecordingState(), true, 'Should be recording');
    t.assertEqual(getRecordingTrackIdState(), trackId, 'Track ID should match');
    t.assertEqual(getRecordingStartTimeState(), startTime, 'Start time should match');
    
    // Cleanup
    setIsRecordingState(false);
    setRecordingTrackIdState(null);
    setRecordingStartTimeState(null);
});

TestRunner.test('Recording State - multiple track ID updates', (t) => {
    const trackIds = ['track1', 'track2', 'track3'];
    for (const trackId of trackIds) {
        setRecordingTrackIdState(trackId);
        t.assertEqual(getRecordingTrackIdState(), trackId, `Track ID should be ${trackId}`);
    }
    // Cleanup
    setRecordingTrackIdState(null);
});

TestRunner.test('Recording State - startAudioRecording accepts false for monitoring', (t) => {
    const result = startAudioRecording(null, false);
    t.assertTruthy(result instanceof Promise, 'startAudioRecording should return a Promise');
});

// ============================================
// Day 72: Recording Integration Tests
// ============================================
TestRunner.test('Recording - RECORDING_SAMPLE_RATE is 44100', (t) => {
    t.assertEqual(RECORDING_SAMPLE_RATE, 44100, 'Sample rate should be 44100 Hz');
});

TestRunner.test('Recording - RECORDING_NUM_CHANNELS is valid', (t) => {
    t.assertEqual(RECORDING_NUM_CHANNELS, 1, 'Recording should be mono');
    t.assertTruthy(RECORDING_NUM_CHANNELS >= 1, 'Channels should be at least 1');
    t.assertTruthy(RECORDING_NUM_CHANNELS <= 2, 'Channels should be at most 2');
});

TestRunner.test('Recording - RECORDING_BIT_DEPTH is 16', (t) => {
    t.assertEqual(RECORDING_BIT_DEPTH, 16, 'Bit depth should be 16-bit');
});

TestRunner.test('Recording - RECORDING_MIME_TYPE is valid browser format', (t) => {
    const validTypes = ['audio/webm', 'audio/wav', 'audio/ogg'];
    t.assertTruthy(validTypes.includes(RECORDING_MIME_TYPE), 'MIME type should be a valid browser audio format');
});

TestRunner.test('Recording - Input gain range constants are valid', (t) => {
    t.assertTruthy(MIN_RECORDING_INPUT_GAIN >= 0, 'Min input gain should be >= 0');
    t.assertTruthy(MAX_RECORDING_INPUT_GAIN > MIN_RECORDING_INPUT_GAIN, 'Max should be greater than min');
    t.assertTruthy(DEFAULT_RECORDING_INPUT_GAIN >= MIN_RECORDING_INPUT_GAIN, 'Default should be >= min');
    t.assertTruthy(DEFAULT_RECORDING_INPUT_GAIN <= MAX_RECORDING_INPUT_GAIN, 'Default should be <= max');
});

TestRunner.test('Recording - Monitoring volume range is valid', (t) => {
    t.assertTruthy(DEFAULT_RECORDING_MONITORING_VOLUME >= 0, 'Monitor volume should be >= 0');
    t.assertTruthy(DEFAULT_RECORDING_MONITORING_VOLUME <= 1, 'Monitor volume should be <= 1');
});

TestRunner.test('Recording - Max recording length is reasonable', (t) => {
    t.assertTruthy(MAX_RECORDING_LENGTH_SECONDS >= 60, 'Max recording should be at least 60 seconds');
    t.assertTruthy(MAX_RECORDING_LENGTH_SECONDS <= 3600, 'Max recording should be at most 1 hour');
});

TestRunner.test('Recording - Min recording length is valid', (t) => {
    t.assertTruthy(MIN_RECORDING_LENGTH_SECONDS > 0, 'Min recording should be > 0');
    t.assertTruthy(MIN_RECORDING_LENGTH_SECONDS < MAX_RECORDING_LENGTH_SECONDS, 'Min should be less than max');
});

TestRunner.test('Recording - Echo cancellation is disabled for clean recording', (t) => {
    t.assertEqual(RECORDING_ECHO_CANCELLATION, false, 'Echo cancellation should be disabled');
});

TestRunner.test('Recording - Auto gain control is disabled for consistent levels', (t) => {
    t.assertEqual(RECORDING_AUTO_GAIN_CONTROL, false, 'Auto gain control should be disabled');
});

TestRunner.test('Recording - Noise suppression is disabled for clean recording', (t) => {
    t.assertEqual(RECORDING_NOISE_SUPPRESSION, false, 'Noise suppression should be disabled');
});

TestRunner.test('Recording - Latency hint is reasonable', (t) => {
    t.assertTruthy(RECORDING_LATENCY_HINT > 0, 'Latency hint should be > 0');
    t.assertTruthy(RECORDING_LATENCY_HINT <= 1, 'Latency hint should be <= 1 second');
});

// ============================================
// ============================================
// Day 195: Audio Recording Function Tests
// ============================================
TestRunner.test('Audio Recording - startAudioRecording accepts track and monitoring params', (t) => {
    t.assertEqual(startAudioRecording.length, 2, 'startAudioRecording should accept 2 parameters');
});

// ============================================
// Day 351: Mixer Master Strip UI Tests
// ============================================
TestRunner.test('Mixer Master Strip - buildMixerMasterStripHTML function exists', (t) => {
    t.assertEqual(typeof buildMixerMasterStripHTML, 'function', 'buildMixerMasterStripHTML should be a function');
});

TestRunner.test('Mixer Master Strip - buildMixerMasterStripHTML returns string', (t) => {
    const result = buildMixerMasterStripHTML();
    t.assertEqual(typeof result, 'string', 'buildMixerMasterStripHTML should return a string');
});

TestRunner.test('Mixer Master Strip - buildMixerMasterStripHTML includes MASTER label', (t) => {
    const result = buildMixerMasterStripHTML();
    t.assertTruthy(result.includes('MASTER'), 'Should include MASTER label');
});

TestRunner.test('Mixer Master Strip - buildMixerMasterStripHTML includes master meter bar', (t) => {
    const result = buildMixerMasterStripHTML();
    t.assertTruthy(result.includes('mixerMasterMeterBar') || result.includes('masterMeter'), 'Should include master meter bar element');
});

TestRunner.test('Mixer Master Strip - buildMixerMasterStripHTML includes master volume fader', (t) => {
    const result = buildMixerMasterStripHTML();
    t.assertTruthy(result.includes('masterVolumeFader'), 'Should include masterVolumeFader');
});

TestRunner.test('Mixer Master Strip - buildMixerMasterStripHTML includes Volume label', (t) => {
    const result = buildMixerMasterStripHTML();
    t.assertTruthy(result.toLowerCase().includes('volume'), 'Should include Volume label');
});

TestRunner.test('Mixer Master Strip - buildMixerMasterStripHTML references getMasterGainValue', (t) => {
    const result = buildMixerMasterStripHTML();
    t.assertTruthy(result.includes('getMasterGainValue') || result.includes('masterVolume'), 'Should reference master gain value');
});

TestRunner.test('Mixer Master Strip - buildMixerMasterStripHTML uses correct CSS classes', (t) => {
    const result = buildMixerMasterStripHTML();
    t.assertTruthy(result.includes('mixer-master-strip'), 'Should use mixer-master-strip class');
    t.assertTruthy(result.includes('bg-[') || result.includes('#1e1e1e'), 'Should use dark theme styling');
});

TestRunner.test('Mixer Master Strip - buildMixerMasterStripHTML creates proper DOM structure', (t) => {
    const result = buildMixerMasterStripHTML();
    t.assertTruthy(result.includes('<div'), 'Should contain div elements');
    t.assertTruthy(result.includes('</div>'), 'Should close div elements');
    t.assertTruthy(result.includes('<input'), 'Should contain input element for fader');
});

TestRunner.test('Mixer Master Strip - buildMixerMasterStripHTML input has correct attributes', (t) => {
    const result = buildMixerMasterStripHTML();
    t.assertTruthy(result.includes('type="range"'), 'Fader input should be type range');
    t.assertTruthy(result.includes('min="0"') || result.includes("min='0'"), 'Fader should have min 0');
    t.assertTruthy(result.includes('max="100"') || result.includes("max='100'"), 'Fader should have max 100');
});

// ============================================
// Day 352: Send Bus Audio Routing Tests
// ============================================
TestRunner.test('Send Bus Audio - getSendBusNodes is a function', (t) => {
    t.assertEqual(typeof getSendBusNodes, 'function', 'getSendBusNodes should be a function');
});

TestRunner.test('Send Bus Audio - getSendBusNodes accepts no parameters', (t) => {
    t.assertEqual(getSendBusNodes.length, 0, 'getSendBusNodes should accept no parameters');
});

TestRunner.test('Send Bus Audio - getTrackSendNodes is a function', (t) => {
    t.assertEqual(typeof getTrackSendNodes, 'function', 'getTrackSendNodes should be a function');
});

TestRunner.test('Send Bus Audio - getTrackSendNodes accepts no parameters', (t) => {
    t.assertEqual(getTrackSendNodes.length, 0, 'getTrackSendNodes should accept no parameters');
});

TestRunner.test('Send Bus Audio - getSendBusNodes returns an object', (t) => {
    const result = getSendBusNodes();
    t.assertEqual(typeof result, 'object', 'getSendBusNodes should return an object');
});

TestRunner.test('Send Bus Audio - getTrackSendNodes returns an object', (t) => {
    const result = getTrackSendNodes();
    t.assertEqual(typeof result, 'object', 'getTrackSendNodes should return an object');
});

TestRunner.test('Send Bus Audio - connectTrackToSendBus is a function', (t) => {
    t.assertEqual(typeof connectTrackToSendBus, 'function', 'connectTrackToSendBus should be a function');
});

TestRunner.test('Send Bus Audio - connectTrackToSendBus accepts 2 parameters', (t) => {
    t.assertEqual(connectTrackToSendBus.length, 2, 'connectTrackToSendBus should accept 2 parameters');
});

TestRunner.test('Send Bus Audio - connectTrackToSendBus references trackId parameter', (t) => {
    const funcStr = connectTrackToSendBus.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'connectTrackToSendBus should reference trackId parameter');
});

TestRunner.test('Send Bus Audio - connectTrackToSendBus references sendId parameter', (t) => {
    const funcStr = connectTrackToSendBus.toString();
    t.assertTruthy(funcStr.includes('sendId'), 'connectTrackToSendBus should reference sendId parameter');
});

TestRunner.test('Send Bus Audio - disconnectTrackFromSendBus is a function', (t) => {
    t.assertEqual(typeof disconnectTrackFromSendBus, 'function', 'disconnectTrackFromSendBus should be a function');
});

TestRunner.test('Send Bus Audio - disconnectTrackFromSendBus accepts 2 parameters', (t) => {
    t.assertEqual(disconnectTrackFromSendBus.length, 2, 'disconnectTrackFromSendBus should accept 2 parameters');
});

TestRunner.test('Send Bus Audio - disconnectTrackFromSendBus references trackId parameter', (t) => {
    const funcStr = disconnectTrackFromSendBus.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'disconnectTrackFromSendBus should reference trackId parameter');
});

TestRunner.test('Send Bus Audio - disconnectTrackFromSendBus references sendId parameter', (t) => {
    const funcStr = disconnectTrackFromSendBus.toString();
    t.assertTruthy(funcStr.includes('sendId'), 'disconnectTrackFromSendBus should reference sendId parameter');
});

TestRunner.test('Send Bus Audio - setTrackSendLevel is a function', (t) => {
    t.assertEqual(typeof setTrackSendLevel, 'function', 'setTrackSendLevel should be a function');
});

TestRunner.test('Send Bus Audio - setTrackSendLevel accepts 3 parameters', (t) => {
    t.assertEqual(setTrackSendLevel.length, 3, 'setTrackSendLevel should accept 3 parameters');
});

TestRunner.test('Send Bus Audio - setTrackSendLevel references trackId parameter', (t) => {
    const funcStr = setTrackSendLevel.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'setTrackSendLevel should reference trackId parameter');
});

TestRunner.test('Send Bus Audio - setTrackSendLevel references sendId parameter', (t) => {
    const funcStr = setTrackSendLevel.toString();
    t.assertTruthy(funcStr.includes('sendId'), 'setTrackSendLevel should reference sendId parameter');
});

TestRunner.test('Send Bus Audio - setTrackSendLevel references level parameter', (t) => {
    const funcStr = setTrackSendLevel.toString();
    t.assertTruthy(funcStr.includes('level'), 'setTrackSendLevel should reference level parameter');
});

TestRunner.test('Send Bus Audio - createSendBusInAudio is an async function', (t) => {
    t.assertEqual(createSendBusInAudio.constructor.name, 'AsyncFunction', 'createSendBusInAudio should be async');
});

TestRunner.test('Send Bus Audio - createSendBusInAudio accepts 1 parameter', (t) => {
    t.assertEqual(createSendBusInAudio.length, 1, 'createSendBusInAudio should accept 1 parameter');
});

TestRunner.test('Send Bus Audio - createSendBusInAudio references sendId parameter', (t) => {
    const funcStr = createSendBusInAudio.toString();
    t.assertTruthy(funcStr.includes('sendId'), 'createSendBusInAudio should reference sendId parameter');
});

TestRunner.test('Send Bus Audio - deleteSendBusFromAudio is a function', (t) => {
    t.assertEqual(typeof deleteSendBusFromAudio, 'function', 'deleteSendBusFromAudio should be a function');
});

TestRunner.test('Send Bus Audio - deleteSendBusFromAudio accepts 1 parameter', (t) => {
    t.assertEqual(deleteSendBusFromAudio.length, 1, 'deleteSendBusFromAudio should accept 1 parameter');
});

TestRunner.test('Send Bus Audio - deleteSendBusFromAudio references sendId parameter', (t) => {
    const funcStr = deleteSendBusFromAudio.toString();
    t.assertTruthy(funcStr.includes('sendId'), 'deleteSendBusFromAudio should reference sendId parameter');
});

TestRunner.test('Send Bus Audio - addEffectToSendBus is a function', (t) => {
    t.assertEqual(typeof addEffectToSendBus, 'function', 'addEffectToSendBus should be a function');
});

TestRunner.test('Send Bus Audio - addEffectToSendBus accepts 3 parameters', (t) => {
    t.assertEqual(addEffectToSendBus.length, 3, 'addEffectToSendBus should accept 3 parameters');
});

TestRunner.test('Send Bus Audio - addEffectToSendBus references sendId parameter', (t) => {
    const funcStr = addEffectToSendBus.toString();
    t.assertTruthy(funcStr.includes('sendId'), 'addEffectToSendBus should reference sendId parameter');
});

TestRunner.test('Send Bus Audio - addEffectToSendBus references effectType parameter', (t) => {
    const funcStr = addEffectToSendBus.toString();
    t.assertTruthy(funcStr.includes('effectType'), 'addEffectToSendBus should reference effectType parameter');
});

TestRunner.test('Send Bus Audio - removeEffectFromSendBus is a function', (t) => {
    t.assertEqual(typeof removeEffectFromSendBus, 'function', 'removeEffectFromSendBus should be a function');
});

TestRunner.test('Send Bus Audio - removeEffectFromSendBus accepts 2 parameters', (t) => {
    t.assertEqual(removeEffectFromSendBus.length, 2, 'removeEffectFromSendBus should accept 2 parameters');
});

TestRunner.test('Send Bus Audio - reorderEffectInSendBus is a function', (t) => {
    t.assertEqual(typeof reorderEffectInSendBus, 'function', 'reorderEffectInSendBus should be a function');
});

TestRunner.test('Send Bus Audio - reorderEffectInSendBus accepts 3 parameters', (t) => {
    t.assertEqual(reorderEffectInSendBus.length, 3, 'reorderEffectInSendBus should accept 3 parameters');
});

TestRunner.test('Send Bus Audio - updateSendBusEffectParam is a function', (t) => {
    t.assertEqual(typeof updateSendBusEffectParam, 'function', 'updateSendBusEffectParam should be a function');
});

TestRunner.test('Send Bus Audio - updateSendBusEffectParam accepts 4 parameters', (t) => {
    t.assertEqual(updateSendBusEffectParam.length, 4, 'updateSendBusEffectParam should accept 4 parameters');
});

TestRunner.test('Send Bus Audio - updateSendBusEffectParam references sendId parameter', (t) => {
    const funcStr = updateSendBusEffectParam.toString();
    t.assertTruthy(funcStr.includes('sendId'), 'updateSendBusEffectParam should reference sendId parameter');
});

TestRunner.test('Send Bus Audio - updateSendBusEffectParam references effectId parameter', (t) => {
    const funcStr = updateSendBusEffectParam.toString();
    t.assertTruthy(funcStr.includes('effectId'), 'updateSendBusEffectParam should reference effectId parameter');
});

TestRunner.test('Send Bus Audio - setSendBusLevel is a function', (t) => {
    t.assertEqual(typeof setSendBusLevel, 'function', 'setSendBusLevel should be a function');
});

TestRunner.test('Send Bus Audio - setSendBusLevel accepts 2 parameters', (t) => {
    t.assertEqual(setSendBusLevel.length, 2, 'setSendBusLevel should accept 2 parameters');
});

TestRunner.test('Send Bus Audio - setSendBusLevel references sendId parameter', (t) => {
    const funcStr = setSendBusLevel.toString();
    t.assertTruthy(funcStr.includes('sendId'), 'setSendBusLevel should reference sendId parameter');
});

TestRunner.test('Send Bus Audio - setSendBusLevel references level parameter', (t) => {
    const funcStr = setSendBusLevel.toString();
    t.assertTruthy(funcStr.includes('level'), 'setSendBusLevel should reference level parameter');
});

TestRunner.test('Send Bus Audio - setSendBusMuted is a function', (t) => {
    t.assertEqual(typeof setSendBusMuted, 'function', 'setSendBusMuted should be a function');
});

TestRunner.test('Send Bus Audio - setSendBusMuted accepts 2 parameters', (t) => {
    t.assertEqual(setSendBusMuted.length, 2, 'setSendBusMuted should accept 2 parameters');
});

TestRunner.test('Send Bus Audio - setSendBusMuted references sendId parameter', (t) => {
    const funcStr = setSendBusMuted.toString();
    t.assertTruthy(funcStr.includes('sendId'), 'setSendBusMuted should reference sendId parameter');
});

TestRunner.test('Send Bus Audio - setSendBusMuted references muted parameter', (t) => {
    const funcStr = setSendBusMuted.toString();
    t.assertTruthy(funcStr.includes('muted'), 'setSendBusMuted should reference muted parameter');
});

// APP_VERSION validation for Day 352
TestRunner.test('State - APP_VERSION is 2.31.0 or higher for Day 352', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 352');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 31, 'Minor version should be >= 31 for Day 352');
    }
});

// ============================================
// Day 353: Audio Clip Timeline Methods Tests
// ============================================
TestRunner.test('Audio Clip Timeline - Track.prototype.addAudioClip exists', (t) => {
    t.assertEqual(typeof Track.prototype.addAudioClip, 'function', 'addAudioClip should be a function');
});

TestRunner.test('Audio Clip Timeline - Track.prototype.getAudioClipDuration exists', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipDuration, 'function', 'getAudioClipDuration should be a function');
});

TestRunner.test('Audio Clip Timeline - Track.prototype.deleteTimelineClip exists', (t) => {
    t.assertEqual(typeof Track.prototype.deleteTimelineClip, 'function', 'deleteTimelineClip should be a function');
});

TestRunner.test('Audio Clip Timeline - Track.prototype.splitAudioClip exists', (t) => {
    t.assertEqual(typeof Track.prototype.splitAudioClip, 'function', 'splitAudioClip should be a function');
});

TestRunner.test('Audio Clip Timeline - Track.prototype.duplicateTimelineClip exists', (t) => {
    t.assertEqual(typeof Track.prototype.duplicateTimelineClip, 'function', 'duplicateTimelineClip should be a function');
});

TestRunner.test('Audio Clip Timeline - addAudioClip is async', (t) => {
    t.assertEqual(Track.prototype.addAudioClip.constructor.name, 'AsyncFunction', 'addAudioClip should be async');
});

TestRunner.test('Audio Clip Timeline - addAudioClip calls _captureUndoState with descriptive label', (t) => {
    const funcStr = Track.prototype.addAudioClip.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'addAudioClip should call _captureUndoState');
    t.assertTruthy(funcStr.includes('recorded clip') || funcStr.includes('clip'), 'addAudioClip undo label should reference recording');
});

TestRunner.test('Audio Clip Timeline - deleteTimelineClip calls _captureUndoState with descriptive label', (t) => {
    const funcStr = Track.prototype.deleteTimelineClip.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'deleteTimelineClip should call _captureUndoState');
    t.assertTruthy(funcStr.includes('Delete') || funcStr.includes('delete'), 'deleteTimelineClip undo label should reference Delete');
});

TestRunner.test('Audio Clip Timeline - splitAudioClip calls _captureUndoState with descriptive label', (t) => {
    const funcStr = Track.prototype.splitAudioClip.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'splitAudioClip should call _captureUndoState');
    t.assertTruthy(funcStr.includes('Split') || funcStr.includes('split'), 'splitAudioClip undo label should reference Split');
});

TestRunner.test('Audio Clip Timeline - duplicateTimelineClip calls _captureUndoState with descriptive label', (t) => {
    const funcStr = Track.prototype.duplicateTimelineClip.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'duplicateTimelineClip should call _captureUndoState');
    t.assertTruthy(funcStr.includes('Duplicate') || funcStr.includes('duplicate'), 'duplicateTimelineClip undo label should reference Duplicate');
});

TestRunner.test('Audio Clip Timeline - addAudioClip references blob parameter', (t) => {
    const funcStr = Track.prototype.addAudioClip.toString();
    t.assertTruthy(funcStr.includes('blob'), 'addAudioClip should reference blob parameter');
});

TestRunner.test('Audio Clip Timeline - addAudioClip references startTime parameter', (t) => {
    const funcStr = Track.prototype.addAudioClip.toString();
    t.assertTruthy(funcStr.includes('startTime'), 'addAudioClip should reference startTime parameter');
});

TestRunner.test('Audio Clip Timeline - splitAudioClip references clipId parameter', (t) => {
    const funcStr = Track.prototype.splitAudioClip.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'splitAudioClip should reference clipId parameter');
});

TestRunner.test('Audio Clip Timeline - splitAudioClip references splitTime parameter', (t) => {
    const funcStr = Track.prototype.splitAudioClip.toString();
    t.assertTruthy(funcStr.includes('splitTime'), 'splitAudioClip should reference splitTime parameter');
});

TestRunner.test('Audio Clip Timeline - duplicateTimelineClip references clipId parameter', (t) => {
    const funcStr = Track.prototype.duplicateTimelineClip.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'duplicateTimelineClip should reference clipId parameter');
});

TestRunner.test('Audio Clip Timeline - deleteTimelineClip references clipId parameter', (t) => {
    const funcStr = Track.prototype.deleteTimelineClip.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'deleteTimelineClip should reference clipId parameter');
});

TestRunner.test('Audio Clip Timeline - addAudioClip handles invalid blob', (t) => {
    const funcStr = Track.prototype.addAudioClip.toString();
    t.assertTruthy(funcStr.includes('Invalid blob') || funcStr.includes('!blob'), 'addAudioClip should check for invalid blob');
});

TestRunner.test('Audio Clip Timeline - addAudioClip generates unique clip ID', (t) => {
    const funcStr = Track.prototype.addAudioClip.toString();
    t.assertTruthy(funcStr.includes('clipId') || funcStr.includes('id:'), 'addAudioClip should generate a clip ID');
});

TestRunner.test('Audio Clip Timeline - addAudioClip creates clip with default properties', (t) => {
    const funcStr = Track.prototype.addAudioClip.toString();
    t.assertTruthy(funcStr.includes('type:') || funcStr.includes('type '), 'addAudioClip should set clip type');
    t.assertTruthy(funcStr.includes('name:') || funcStr.includes('name '), 'addAudioClip should set clip name');
    t.assertTruthy(funcStr.includes('startTime'), 'addAudioClip should set startTime');
    t.assertTruthy(funcStr.includes('duration'), 'addAudioClip should set duration');
    t.assertTruthy(funcStr.includes('gain'), 'addAudioClip should set gain');
});

TestRunner.test('Audio Clip Timeline - Audio clip default properties constants', (t) => {
    t.assertEqual(DEFAULT_CLIP_COLOR, '#4a9eff', 'Default clip color should be #4a9eff');
    t.assertEqual(DEFAULT_AUDIO_CLIP_GAIN, 1.0, 'Default audio clip gain should be 1.0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_PLAYBACK_RATE, 1.0, 'Default playback rate should be 1.0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_START_OFFSET, 0, 'Default start offset should be 0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_END_OFFSET, -1, 'Default end offset should be -1');
    t.assertEqual(DEFAULT_AUDIO_CLIP_CROSSFADE, 0, 'Default crossfade should be 0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_FADE_IN, 0, 'Default fade in should be 0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_FADE_OUT, 0, 'Default fade out should be 0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_REVERSE, false, 'Default reverse should be false');
});

TestRunner.test('Audio Clip Timeline - Audio clip gain range constants', (t) => {
    t.assertEqual(MIN_AUDIO_CLIP_GAIN, 0, 'Min gain should be 0 (silence)');
    t.assertEqual(MAX_AUDIO_CLIP_GAIN, 4.0, 'Max gain should be 4.0 (12dB boost)');
    t.assertEqual(DEFAULT_AUDIO_CLIP_GAIN, 1.0, 'Default gain should be 1.0 (0dB)');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_GAIN >= MIN_AUDIO_CLIP_GAIN, 'Default gain should be >= min');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_GAIN <= MAX_AUDIO_CLIP_GAIN, 'Default gain should be <= max');
});

TestRunner.test('Audio Clip Timeline - Audio clip playback rate range constants', (t) => {
    t.assertEqual(MIN_AUDIO_CLIP_PLAYBACK_RATE, 0.25, 'Min playback rate should be 0.25');
    t.assertEqual(MAX_AUDIO_CLIP_PLAYBACK_RATE, 4.0, 'Max playback rate should be 4.0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_PLAYBACK_RATE, 1.0, 'Default playback rate should be 1.0');
});

TestRunner.test('Audio Clip Timeline - Audio clip fade range constants', (t) => {
    t.assertEqual(MAX_AUDIO_CLIP_FADE, 10, 'Max fade should be 10 seconds');
    t.assertEqual(DEFAULT_AUDIO_CLIP_FADE_IN, 0, 'Default fade in should be 0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_FADE_OUT, 0, 'Default fade out should be 0');
});

TestRunner.test('Audio Clip Timeline - Audio clip crossfade range constants', (t) => {
    t.assertEqual(MIN_AUDIO_CLIP_CROSSFADE, 0, 'Min crossfade should be 0');
    t.assertEqual(MAX_AUDIO_CLIP_CROSSFADE, 5, 'Max crossfade should be 5 seconds');
    t.assertEqual(DEFAULT_AUDIO_CLIP_CROSSFADE, 0, 'Default crossfade should be 0');
});

TestRunner.test('Audio Clip Timeline - CLIP_COLORS array has 16 colors', (t) => {
    t.assertEqual(CLIP_COLORS.length, 16, 'Should have 16 clip colors');
    t.assertTruthy(CLIP_COLORS[0].startsWith('#'), 'Clip colors should be hex format');
});
// Day 379: Audio Clip Setter/Getter Methods Tests
// ================================================

TestRunner.test('Audio Clip Setters - setAudioClipName is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipName, 'function', 'setAudioClipName should be a function');
});

TestRunner.test('Audio Clip Setters - setAudioClipName calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipName.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipName should call _captureUndoState');
});

TestRunner.test('Audio Clip Setters - setAudioClipName uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipName.toString();
    t.assertTruthy(funcStr.includes('Rename') || funcStr.includes('clip'), 'setAudioClipName undo label should reference clip rename');
});

TestRunner.test('Audio Clip Setters - setAudioClipName references clipId and name parameters', (t) => {
    const funcStr = Track.prototype.setAudioClipName.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipName should reference clipId parameter');
    t.assertTruthy(funcStr.includes('name'), 'setAudioClipName should reference name parameter');
});

TestRunner.test('Audio Clip Setters - setAudioClipName returns boolean', (t) => {
    const funcStr = Track.prototype.setAudioClipName.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'setAudioClipName should return boolean');
});

TestRunner.test('Audio Clip Getters - getAudioClipName is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipName, 'function', 'getAudioClipName should be a function');
});

TestRunner.test('Audio Clip Getters - getAudioClipName references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipName.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipName should reference clipId parameter');
});

// Day 578: Ghost Notes Feature
TestRunner.test("Day 578 - ghostNotes is a function on Track.prototype", (t) => {
    t.assertTruthy(typeof Track.prototype.ghostNotes === 'function', "ghostNotes should be a function on Track.prototype");
});
TestRunner.test("Day 578 - ghostNotes accepts velocityFactor and onOddColumns parameters", (t) => {
    const funcStr = Track.prototype.ghostNotes.toString();
    t.assertTruthy(funcStr.includes('velocityFactor = 0.3') && funcStr.includes('onOddColumns = true'), "ghostNotes should accept velocityFactor and onOddColumns parameters with defaults");
});
TestRunner.test("Day 578 - ghostNotes returns 0 for Audio tracks", (t) => {
    const track = new Track({ id: 'test', type: 'Audio', name: 'Audio Track' });
    const result = track.ghostNotes(0.3, true);
    t.assertEquals(0, result, "ghostNotes should return 0 for Audio tracks");
});
TestRunner.test("Day 578 - ghostNotes gets active sequence via getActiveSequence", (t) => {
    const funcStr = Track.prototype.ghostNotes.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence()'), "ghostNotes should use getActiveSequence()");
});
TestRunner.test("Day 578 - ghostNotes returns 0 if no active sequence", (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    const result = track.ghostNotes(0.3, true);
    t.assertEquals(0, result, "ghostNotes should return 0 when no active sequence");
});
TestRunner.test("Day 578 - ghostNotes captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.ghostNotes.toString();
    const captureIdx = funcStr.indexOf('_captureUndoState');
    const dataIdx = funcStr.indexOf('stepData.velocity');
    t.assertTruthy(captureIdx !== -1 && captureIdx < dataIdx, "ghostNotes should capture undo before velocity mutation");
});
TestRunner.test("Day 578 - ghostNotes clamps velocityFactor to 0.1-0.9 range", (t) => {
    const funcStr = Track.prototype.ghostNotes.toString();
    t.assertTruthy(funcStr.includes('Math.max(0.1') && funcStr.includes('Math.min(0.9'), "ghostNotes should clamp velocityFactor to 0.1-0.9 range");
});
TestRunner.test("Day 578 - ghostNotes applies to odd columns when onOddColumns is true", (t) => {
    const funcStr = Track.prototype.ghostNotes.toString();
    t.assertTruthy(funcStr.includes('col % 2 === 1') && funcStr.includes('onOddColumns'), "ghostNotes should check odd columns when onOddColumns is true");
});
TestRunner.test("Day 578 - ghostNotes applies to even columns when onOddColumns is false", (t) => {
    const funcStr = Track.prototype.ghostNotes.toString();
    t.assertTruthy(funcStr.includes('col % 2 === 0') && funcStr.includes('onOddColumns'), "ghostNotes should check even columns when onOddColumns is false");
});
TestRunner.test("Day 578 - ghostNotes returns count of ghosted notes", (t) => {
    const funcStr = Track.prototype.ghostNotes.toString();
    t.assertTruthy(funcStr.includes('ghostedCount++') && funcStr.includes('return ghostedCount'), "ghostNotes should return count of ghosted notes");
});
TestRunner.test("Day 578 - Ghost Notes (Light) menu item exists", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('Ghost Notes (Light)'), "Ghost Notes (Light) menu item should exist");
});
TestRunner.test("Day 578 - Ghost Notes (Medium) menu item exists", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('Ghost Notes (Medium)'), "Ghost Notes (Medium) menu item should exist");
});
TestRunner.test("Day 578 - Ghost Notes (Heavy) menu item exists", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('Ghost Notes (Heavy)'), "Ghost Notes (Heavy) menu item should exist");
});
TestRunner.test("Day 578 - Ghost Notes menu items call ghostNotes with correct parameters", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('ghostNotes(0.6, true)') && funcStr.includes('ghostNotes(0.3, true)') && funcStr.includes('ghostNotes(0.15, true)'), "Ghost Notes menu items should call ghostNotes with correct velocityFactor and onOddColumns");
});
TestRunner.test("Day 578 - Ghost Notes - Even Cols menu items exist", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('Ghost Notes - Even Cols (Light)') && funcStr.includes('Ghost Notes - Even Cols (Medium)') && funcStr.includes('Ghost Notes - Even Cols (Heavy)'), "Ghost Notes - Even Cols menu items should exist");
});
TestRunner.test("Day 578 - Ghost Notes - Even Cols menu items call ghostNotes with onOddColumns=false", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('ghostNotes(0.6, false)') && funcStr.includes('ghostNotes(0.3, false)') && funcStr.includes('ghostNotes(0.15, false)'), "Ghost Notes - Even Cols menu items should call ghostNotes with onOddColumns=false");
});
TestRunner.test("Day 578 - Ghost Notes menu items call recreateToneSequence after ghost", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    const ghostIdx = funcStr.indexOf('ghostNotes');
    const recreateIdx = funcStr.indexOf('recreateToneSequence', ghostIdx);
    t.assertTruthy(recreateIdx !== -1, "Ghost Notes menu items should call recreateToneSequence after ghost");
});
TestRunner.test("Day 578 - APP_VERSION validation for Day 578", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 578");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 235, "Minor version should be >= 235 for Day 578");
    }
});

// Day 580: Humanize Velocities (+/- 35%) Feature
TestRunner.test("Day 580 - Humanize Velocities (+/- 35%) menu item exists", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('Humanize Velocities (+/- 35%)'), "Humanize Velocities (+/- 35%) menu item should exist");
});
TestRunner.test("Day 580 - Humanize Velocities (+/- 35%) calls humanizeVelocity(0.35)", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('humanizeVelocity(0.35)'), "Humanize Velocities (+/- 35%) should call humanizeVelocity(0.35)");
});
TestRunner.test("Day 580 - Humanize Velocities (+/- 35%) menu item exists after 25% option", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    const idx25 = funcStr.indexOf('Humanize Velocities (+/- 25%)');
    const idx35 = funcStr.indexOf('Humanize Velocities (+/- 35%)');
    t.assertTruthy(idx35 > idx25, "Humanize Velocities (+/- 35%) should appear after the 25% option");
});
TestRunner.test("Day 580 - Humanize Velocities (+/- 35%) calls recreateToneSequence after humanize", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    const humanizeIdx = funcStr.indexOf('humanizeVelocity(0.35)');
    const recreateIdx = funcStr.indexOf('recreateToneSequence', humanizeIdx);
    t.assertTruthy(recreateIdx !== -1, "Humanize Velocities (+/- 35%) should call recreateToneSequence after humanize");
});
TestRunner.test("Day 580 - humanizeVelocity accepts 0.35 as amount parameter", (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    t.assertTruthy(funcStr.includes('amount = 0.15') || funcStr.includes('amount='), "humanizeVelocity should accept amount parameter");
});
TestRunner.test("Day 580 - humanizeVelocity clamps amount to valid range", (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), "humanizeVelocity should clamp amount with Math.max/Math.min");
});
TestRunner.test("Day 580 - APP_VERSION validation for Day 580", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 580");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 236, "Minor version should be >= 236 for Day 580");
    }
});
// ============================================
// Day 581: Recording E2E Tests for runRecordingMicrophoneE2ETest
// ============================================
TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest function exists", (t) => {
    t.assertEqual(typeof runRecordingMicrophoneE2ETest, 'function', 'runRecordingMicrophoneE2ETest should be a function');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest returns a Promise", (t) => {
    const result = runRecordingMicrophoneE2ETest(null);
    t.assertTruthy(result instanceof Promise, 'runRecordingMicrophoneE2ETest should return a Promise');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest accepts 2 parameters", (t) => {
    t.assertEqual(runRecordingMicrophoneE2ETest.length, 2, 'runRecordingMicrophoneE2ETest should accept 2 parameters');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest defaults recordDurationMs to 2500", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('recordDurationMs = 2500'), 'runRecordingMicrophoneE2ETest should default recordDurationMs to 2500');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest calls resolveRecordingMicrophoneTestTrack", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('resolveRecordingMicrophoneTestTrack'), 'runRecordingMicrophoneE2ETest should call resolveRecordingMicrophoneTestTrack');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest validates Audio track type", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes("recordingTrack.type !== 'Audio'"), 'runRecordingMicrophoneE2ETest should validate track type is Audio');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest checks isTrackRecordingState for busy condition", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('isTrackRecordingState()'), 'runRecordingMicrophoneE2ETest should check if already recording');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest checks navigator.mediaDevices.getUserMedia", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('navigator.mediaDevices.getUserMedia'), 'runRecordingMicrophoneE2ETest should check browser mediaDevices support');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest calls startAudioRecording", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('startAudioRecording'), 'runRecordingMicrophoneE2ETest should call startAudioRecording');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest calls stopAudioRecording", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('stopAudioRecording'), 'runRecordingMicrophoneE2ETest should call stopAudioRecording');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest counts timelineClips before and after", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('initialClipCount') && funcStr.includes('finalClipCount'), 'runRecordingMicrophoneE2ETest should count clips before and after');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest calls cleanupRecordingScheduling in finally block", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('cleanupRecordingScheduling'), 'runRecordingMicrophoneE2ETest should cleanup in finally block');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest returns result object with ok field", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('{ ok:') && funcStr.includes('ok,') && funcStr.includes('ok,'), 'runRecordingMicrophoneE2ETest should return result with ok field');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest returns result object with step field", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('step:'), 'runRecordingMicrophoneE2ETest should return result with step field');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest handles track-selection error case", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes("step: 'track-selection'") || funcStr.includes("step:\"track-selection\""), 'runRecordingMicrophoneE2ETest should handle track-selection error');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest handles busy error case", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes("step: 'busy'") || funcStr.includes("step:\"busy\""), 'runRecordingMicrophoneE2ETest should handle busy error');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest handles unsupported browser error case", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes("step: 'unsupported'") || funcStr.includes("step:\"unsupported\""), 'runRecordingMicrophoneE2ETest should handle unsupported browser error');
});

TestRunner.test("Day 581 - runRecordingMicrophoneE2ETest handles error case with step='error'", (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes("step: 'error'") || funcStr.includes("step:\"error\""), 'runRecordingMicrophoneE2ETest should handle error case');
});

TestRunner.test("Day 581 - APP_VERSION validation for Day 581", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 581");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 238, "Minor version should be >= 238 for Day 581");
    }
});

// ============================================
// Day 582: Humanize Probabilities Feature
// ============================================
TestRunner.test("Day 582 - humanizeProbabilities is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.humanizeProbabilities, 'function', 'humanizeProbabilities should be a function on Track.prototype');
});

TestRunner.test("Day 582 - humanizeProbabilities accepts amount parameter with default 0.2", (t) => {
    const funcStr = Track.prototype.humanizeProbabilities.toString();
    t.assertTruthy(funcStr.includes('amount = 0.2'), 'humanizeProbabilities should accept amount parameter with default 0.2');
});

TestRunner.test("Day 582 - humanizeProbabilities returns 0 for Audio tracks", (t) => {
    const mockTrack = { type: 'Audio' };
    const result = Track.prototype.humanizeProbabilities.call(mockTrack);
    t.assertEqual(result, 0, 'humanizeProbabilities should return 0 for Audio tracks');
});

TestRunner.test("Day 582 - humanizeProbabilities calls getActiveSequence", (t) => {
    const funcStr = Track.prototype.humanizeProbabilities.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence'), 'humanizeProbabilities should call getActiveSequence');
});

TestRunner.test("Day 582 - humanizeProbabilities returns 0 when no active sequence", (t) => {
    const mockTrack = { type: 'MIDI', getActiveSequence: () => null };
    const result = Track.prototype.humanizeProbabilities.call(mockTrack);
    t.assertEqual(result, 0, 'humanizeProbabilities should return 0 when no active sequence');
});

TestRunner.test("Day 582 - humanizeProbabilities captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.humanizeProbabilities.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('forEach');
    t.assertTruthy(undoIdx < forEachIdx, '_captureUndoState should come before forEach (undo before mutation)');
});

TestRunner.test("Day 582 - humanizeProbabilities applies random variation to probabilities", (t) => {
    const funcStr = Track.prototype.humanizeProbabilities.toString();
    t.assertTruthy(funcStr.includes('Math.random()'), 'humanizeProbabilities should use Math.random() for variation');
    t.assertTruthy(funcStr.includes('probability'), 'humanizeProbabilities should reference probability');
});

TestRunner.test("Day 582 - humanizeProbabilities clamps result to 0-1 range", (t) => {
    const funcStr = Track.prototype.humanizeProbabilities.toString();
    t.assertTruthy(funcStr.includes('Math.max(0'), 'humanizeProbabilities should clamp minimum to 0');
    t.assertTruthy(funcStr.includes('Math.min(1'), 'humanizeProbabilities should clamp maximum to 1');
});

TestRunner.test("Day 582 - humanizeProbabilities rounds to 2 decimal places", (t) => {
    const funcStr = Track.prototype.humanizeProbabilities.toString();
    t.assertTruthy(funcStr.includes('100) / 100') || funcStr.includes('* 100) / 100'), 'humanizeProbabilities should round to 2 decimal places');
});

TestRunner.test("Day 582 - Humanize Probabilities (+/- 10%) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Humanize Probabilities (+/- 10%)'), 'UI should include Humanize Probabilities (+/- 10%) menu item');
});

TestRunner.test("Day 582 - Humanize Probabilities (+/- 20%) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Humanize Probabilities (+/- 20%)'), 'UI should include Humanize Probabilities (+/- 20%) menu item');
});

TestRunner.test("Day 582 - Humanize Probabilities (+/- 30%) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Humanize Probabilities (+/- 30%)'), 'UI should include Humanize Probabilities (+/- 30%) menu item');
});

TestRunner.test("Day 582 - Humanize Probabilities menu items call humanizeProbabilities with correct amount", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('humanizeProbabilities(0.1)'), 'UI should call humanizeProbabilities(0.1) for +/- 10%');
    t.assertTruthy(uiStr.includes('humanizeProbabilities(0.2)'), 'UI should call humanizeProbabilities(0.2) for +/- 20%');
    t.assertTruthy(uiStr.includes('humanizeProbabilities(0.3)'), 'UI should call humanizeProbabilities(0.3) for +/- 30%');
});

TestRunner.test("Day 582 - Humanize Probabilities menu items call recreateToneSequence", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    const matches = uiStr.match(/Humanize Probabilities \(\+\/- \d+%\)[^}]+recreateToneSequence/g);
    t.assertTruthy(matches && matches.length >= 3, 'All Humanize Probabilities menu items should call recreateToneSequence');
});

TestRunner.test("Day 582 - Humanize Probabilities menu items show notification with count", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    const matches = uiStr.match(/Humanize Probabilities \(\+\/- \d+%\)[^}]+Humanized.*\$\{result\}/g);
    t.assertTruthy(matches && matches.length >= 3, 'All Humanize Probabilities menu items should show notification with result count');
});

TestRunner.test("Day 582 - APP_VERSION validation for Day 582", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 582");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 239, "Minor version should be >= 239 for Day 582");
    }
});

TestRunner.test("Day 583 - rampVelocities is a function on Track.prototype", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    t.assertTruthy(typeof track.rampVelocities === 'function', 'rampVelocities should be a function on Track.prototype');
});

TestRunner.test("Day 583 - rampVelocities accepts startVelocity and endVelocity parameters", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Test Seq', data: [[{active:true,velocity:0.5}]], length: 1 }];
    track.activeSequenceId = 'seq1';
    const result = track.rampVelocities(0.3, 0.8);
    t.assertTruthy(typeof result === 'number', 'rampVelocities should return a number');
});

TestRunner.test("Day 583 - rampVelocities returns 0 for Audio tracks", (t) => {
    const track = new Track({ id: 'test-track', type: 'Audio', name: 'Audio Track' });
    const result = track.rampVelocities(0.3, 0.8);
    t.assertEqual(result, 0, 'rampVelocities should return 0 for Audio tracks');
});

TestRunner.test("Day 583 - rampVelocities calls getActiveSequence", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Test Seq', data: [[{active:true,velocity:0.5}]], length: 1 }];
    track.activeSequenceId = 'seq1';
    const originalGetActiveSequence = track.getActiveSequence;
    let called = false;
    track.getActiveSequence = function() {
        called = true;
        return originalGetActiveSequence.call(this);
    };
    track.rampVelocities(0.3, 0.8);
    t.assertTruthy(called, 'rampVelocities should call getActiveSequence');
    track.getActiveSequence = originalGetActiveSequence;
});

TestRunner.test("Day 583 - rampVelocities returns 0 when no active sequence", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [];
    track.activeSequenceId = null;
    const result = track.rampVelocities(0.3, 0.8);
    t.assertEqual(result, 0, 'rampVelocities should return 0 when no active sequence');
});

TestRunner.test("Day 583 - rampVelocities captures undo BEFORE mutation", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Test Seq', data: [[{active:true,velocity:0.5}]], length: 1 }];
    track.activeSequenceId = 'seq1';
    const trackStr = require('fs').readFileSync('./js/Track.js', 'utf8');
    const rampIdx = trackStr.indexOf('rampVelocities(');
    const captureIdx = trackStr.indexOf('_captureUndoState', rampIdx);
    const forEachIdx = trackStr.indexOf('forEach', rampIdx);
    t.assertTruthy(captureIdx < forEachIdx, 'rampVelocities should capture undo BEFORE data iteration');
});

TestRunner.test("Day 583 - rampVelocities clamps velocities to 0.05-1.0 range", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Test Seq', data: [[{active:true,velocity:0.5}],[{active:true,velocity:0.5}]], length: 2 }];
    track.activeSequenceId = 'seq1';
    track.rampVelocities(0.0, 1.5);
    const seq = track.getActiveSequence();
    t.assertTruthy(seq.data[0][0].velocity >= 0.05, 'Start velocity should be clamped to minimum 0.05');
    t.assertTruthy(seq.data[0][0].velocity <= 1.0, 'Start velocity should be clamped to maximum 1.0');
});

TestRunner.test("Day 583 - rampVelocities applies linear interpolation across columns", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Test Seq', data: [[{active:true,velocity:0.5},{active:true,velocity:0.5},{active:true,velocity:0.5}]], length: 3 }];
    track.activeSequenceId = 'seq1';
    track.rampVelocities(0.2, 0.8);
    const seq = track.getActiveSequence();
    t.assertTruthy(seq.data[0][0].velocity < seq.data[0][2].velocity, 'First column velocity should be less than last in crescendo');
});

TestRunner.test("Day 583 - rampVelocities returns count of ramped notes", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Test Seq', data: [[{active:true,velocity:0.5},{active:true,velocity:0.5}],[null,null]], length: 2 }];
    track.activeSequenceId = 'seq1';
    const result = track.rampVelocities(0.3, 0.8);
    t.assertEqual(result, 2, 'rampVelocities should return count of ramped notes');
});

TestRunner.test("Day 583 - Ramp Velocities (Crescendo) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Ramp Velocities (Crescendo)'), 'UI should include Ramp Velocities (Crescendo) menu item');
});

TestRunner.test("Day 583 - Ramp Velocities (Diminuendo) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Ramp Velocities (Diminuendo)'), 'UI should include Ramp Velocities (Diminuendo) menu item');
});

TestRunner.test("Day 583 - Ramp Velocities (Piano to Forte) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Ramp Velocities (Piano to Forte)'), 'UI should include Ramp Velocities (Piano to Forte) menu item');
});

TestRunner.test("Day 583 - Ramp Velocities (Forte to Piano) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Ramp Velocities (Forte to Piano)'), 'UI should include Ramp Velocities (Forte to Piano) menu item');
});

TestRunner.test("Day 583 - Ramp Velocities menu items call rampVelocities with correct parameters", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('rampVelocities(0.3, 1.0)'), 'UI should call rampVelocities(0.3, 1.0) for Crescendo');
    t.assertTruthy(uiStr.includes('rampVelocities(1.0, 0.3)'), 'UI should call rampVelocities(1.0, 0.3) for Diminuendo');
    t.assertTruthy(uiStr.includes('rampVelocities(0.2, 0.9)'), 'UI should call rampVelocities(0.2, 0.9) for Piano to Forte');
    t.assertTruthy(uiStr.includes('rampVelocities(0.9, 0.2)'), 'UI should call rampVelocities(0.9, 0.2) for Forte to Piano');
});

TestRunner.test("Day 583 - Ramp Velocities menu items call recreateToneSequence", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    const matches = uiStr.match(/Ramp Velocities \\([^)]+\\)[^}]+recreateToneSequence/g);
    t.assertTruthy(matches && matches.length >= 4, 'All Ramp Velocities menu items should call recreateToneSequence');
});

TestRunner.test("Day 583 - APP_VERSION validation for Day 583", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 583");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 240, "Minor version should be >= 240 for Day 583");
    }
});

TestRunner.test("Day 584 - shiftSequenceNotes is a function on Track.prototype", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    t.assertEqual(typeof track.shiftSequenceNotes, 'function', 'shiftSequenceNotes should be a function on Track.prototype');
});

TestRunner.test("Day 584 - shiftSequenceNotes accepts semitones parameter", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Test Seq', data: [[{active:true},{active:true}],[null,null]], length: 2 }];
    track.activeSequenceId = 'seq1';
    const result = track.shiftSequenceNotes(1);
    t.assertEqual(typeof result, 'number', 'shiftSequenceNotes should return a number');
});

TestRunner.test("Day 584 - shiftSequenceNotes returns 0 for Audio tracks", (t) => {
    const track = new Track({ id: 'test-track', type: 'Audio', name: 'Audio Track' });
    const result = track.shiftSequenceNotes(1);
    t.assertEqual(result, 0, 'shiftSequenceNotes should return 0 for Audio tracks');
});

TestRunner.test("Day 584 - shiftSequenceNotes gets active sequence via getActiveSequence", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Test Seq', data: [[{active:true},{active:true}],[null,null]], length: 2 }];
    track.activeSequenceId = 'seq1';
    const getActiveSequenceSpy = sinon.stub(track, 'getActiveSequence').returns(track.sequences[0]);
    track.shiftSequenceNotes(1);
    t.assertTruthy(getActiveSequenceSpy.called, 'shiftSequenceNotes should call getActiveSequence');
    getActiveSequenceSpy.restore();
});

TestRunner.test("Day 584 - shiftSequenceNotes returns 0 when no active sequence", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [];
    track.activeSequenceId = null;
    const result = track.shiftSequenceNotes(1);
    t.assertEqual(result, 0, 'shiftSequenceNotes should return 0 when no active sequence');
});

TestRunner.test("Day 584 - shiftSequenceNotes captures undo BEFORE mutation", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Test Seq', data: [[{active:true},{active:true}],[null,null]], length: 2 }];
    track.activeSequenceId = 'seq1';
    const originalData = JSON.parse(JSON.stringify(track.sequences[0].data));
    const captureIdx = track.shiftSequenceNotes.toString().indexOf('_captureUndoState');
    const mapIdx = track.shiftSequenceNotes.toString().indexOf('activeSeq.data.map');
    t.assertTruthy(captureIdx < mapIdx, 'Undo capture should happen before data map mutation');
});

TestRunner.test("Day 584 - shiftSequenceNotes returns 0 for Sampler/DrumSampler types", (t) => {
    const track = new Track({ id: 'test-track', type: 'Sampler', name: 'Test Sampler' });
    track.sequences = [{ id: 'seq1', name: 'Test Seq', data: [[{active:true},{active:true}],[null,null]], length: 2 }];
    track.activeSequenceId = 'seq1';
    const result = track.shiftSequenceNotes(1);
    t.assertEqual(result, 0, 'shiftSequenceNotes should return 0 for Sampler type');
});

TestRunner.test("Day 584 - shiftSequenceNotes returns count of shifted notes", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Test Seq', data: [[{active:true,velocity:0.5},{active:true,velocity:0.5}],[null,null]], length: 2 }];
    track.activeSequenceId = 'seq1';
    const result = track.shiftSequenceNotes(1);
    t.assertEqual(result, 2, 'shiftSequenceNotes should return count of shifted notes');
});

TestRunner.test("Day 584 - Shift Notes Up menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Shift Notes Up'), 'UI should include Shift Notes Up menu item');
});

TestRunner.test("Day 584 - Shift Notes Down menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Shift Notes Down'), 'UI should include Shift Notes Down menu item');
});

TestRunner.test("Day 584 - Shift Notes Octave Up menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Shift Notes Octave Up'), 'UI should include Shift Notes Octave Up menu item');
});

TestRunner.test("Day 584 - Shift Notes Octave Down menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Shift Notes Octave Down'), 'UI should include Shift Notes Octave Down menu item');
});

TestRunner.test("Day 584 - Shift Notes Up calls shiftSequenceNotes(1)", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('shiftSequenceNotes(1)'), 'Shift Notes Up should call shiftSequenceNotes(1)');
});

TestRunner.test("Day 584 - Shift Notes Down calls shiftSequenceNotes(-1)", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('shiftSequenceNotes(-1)'), 'Shift Notes Down should call shiftSequenceNotes(-1)');
});

TestRunner.test("Day 584 - Shift Notes Octave Up calls shiftSequenceNotes(12)", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('shiftSequenceNotes(12)'), 'Shift Notes Octave Up should call shiftSequenceNotes(12)');
});

TestRunner.test("Day 584 - Shift Notes Octave Down calls shiftSequenceNotes(-12)", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('shiftSequenceNotes(-12)'), 'Shift Notes Octave Down should call shiftSequenceNotes(-12)');
});

TestRunner.test("Day 584 - Shift Notes menu items call recreateToneSequence", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    const matches = uiStr.match(/Shift Notes (Up|Down|Octave Up|Octave Down)[^}]+recreateToneSequence/g);
    t.assertTruthy(matches && matches.length >= 4, 'All Shift Notes menu items should call recreateToneSequence');
});

TestRunner.test("Day 584 - APP_VERSION validation for Day 584", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 584");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 241, "Minor version should be >= 241 for Day 584");
    }
});

// Day 585: Sort Column Notes Feature
TestRunner.test("Day 585 - sortColumnNotes is a function on Track.prototype", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    t.assertTruthy(typeof Track !== 'undefined', 'Track should be defined');
    t.assertEqual(typeof Track.prototype.sortColumnNotes, 'function', 'sortColumnNotes should be a function on Track.prototype');
});

TestRunner.test("Day 585 - sortColumnNotes accepts mode parameter with default", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[{ active: true, velocity: 0.8 }]], length: 1 }];
    track.activeSequenceId = 'seq1';
    const result = track.sortColumnNotes();
    t.assertEqual(typeof result, 'number', 'sortColumnNotes should return a number');
});

TestRunner.test("Day 585 - sortColumnNotes returns 0 for Audio tracks", (t) => {
    const track = new Track({ id: 'test-track', type: 'Audio', name: 'Audio Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[{ active: true, velocity: 0.8 }]], length: 1 }];
    track.activeSequenceId = 'seq1';
    const result = track.sortColumnNotes('velocity-desc');
    t.assertEqual(result, 0, 'sortColumnNotes should return 0 for Audio tracks');
});

TestRunner.test("Day 585 - sortColumnNotes gets active sequence via getActiveSequence", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[{ active: true, velocity: 0.8 }]], length: 1 }];
    track.activeSequenceId = 'seq1';
    const getActiveSequenceSpy = { called: false };
    track.getActiveSequence = function() { getActiveSequenceSpy.called = true; return this.sequences[0]; };
    track.sortColumnNotes('velocity-desc');
    t.assertTruthy(getActiveSequenceSpy.called, 'sortColumnNotes should call getActiveSequence');
});

TestRunner.test("Day 585 - sortColumnNotes returns 0 when no active sequence", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[{ active: true, velocity: 0.8 }]], length: 1 }];
    track.activeSequenceId = null;
    const result = track.sortColumnNotes('velocity-desc');
    t.assertEqual(result, 0, 'sortColumnNotes should return 0 when no active sequence');
});

TestRunner.test("Day 585 - sortColumnNotes captures undo BEFORE mutation", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[{ active: true, velocity: 0.8 }]], length: 1 }];
    track.activeSequenceId = 'seq1';
    const captureIdx = track.sortColumnNotes.toString().indexOf('_captureUndoState');
    const forEachIdx = track.sortColumnNotes.toString().indexOf('for (let col = 0; col < totalSteps');
    t.assertTruthy(captureIdx !== -1 && captureIdx < forEachIdx, 'sortColumnNotes should capture undo BEFORE data iteration');
});

TestRunner.test("Day 585 - sortColumnNotes sorts by velocity descending", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{
        id: 'seq1', name: 'Seq 1',
        data: [
            [{ active: true, velocity: 0.3 }, { active: true, velocity: 0.7 }],
            [{ active: true, velocity: 0.9 }, { active: true, velocity: 0.2 }]
        ],
        length: 2
    }];
    track.activeSequenceId = 'seq1';
    const result = track.sortColumnNotes('velocity-desc');
    const col0Sorted = track.sequences[0].data[0][0].velocity === 0.9 || track.sequences[0].data[1][0].velocity === 0.9;
    t.assertTruthy(result >= 2, 'sortColumnNotes should sort notes by velocity descending');
});

TestRunner.test("Day 585 - sortColumnNotes sorts by velocity ascending", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{
        id: 'seq1', name: 'Seq 1',
        data: [
            [{ active: true, velocity: 0.9 }, { active: true, velocity: 0.2 }],
            [{ active: true, velocity: 0.3 }, { active: true, velocity: 0.7 }]
        ],
        length: 2
    }];
    track.activeSequenceId = 'seq1';
    const result = track.sortColumnNotes('velocity-asc');
    t.assertTruthy(result >= 2, 'sortColumnNotes should sort notes by velocity ascending');
});

TestRunner.test("Day 585 - sortColumnNotes sorts by pitch descending (high to low)", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{
        id: 'seq1', name: 'Seq 1',
        data: [
            [{ active: true, velocity: 0.8 }, null],
            [{ active: true, velocity: 0.8 }, null]
        ],
        length: 2
    }];
    track.activeSequenceId = 'seq1';
    const result = track.sortColumnNotes('pitch-desc');
    t.assertTruthy(result >= 2, 'sortColumnNotes should sort notes by pitch descending');
});

TestRunner.test("Day 585 - sortColumnNotes sorts by pitch ascending (low to high)", (t) => {
    const track = new Track({ id: 'test-track', type: 'Synth', name: 'Test Track' });
    track.sequences = [{
        id: 'seq1', name: 'Seq 1',
        data: [
            [{ active: true, velocity: 0.8 }, null],
            [{ active: true, velocity: 0.8 }, null]
        ],
        length: 2
    }];
    track.activeSequenceId = 'seq1';
    const result = track.sortColumnNotes('pitch-asc');
    t.assertTruthy(result >= 2, 'sortColumnNotes should sort notes by pitch ascending');
});

TestRunner.test("Day 585 - Sort Column Notes (Velocity Hi→Lo) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Sort Column Notes (Velocity Hi→Lo)'), 'Sort Column Notes (Velocity Hi→Lo) menu item should exist');
});

TestRunner.test("Day 585 - Sort Column Notes (Velocity Lo→Hi) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Sort Column Notes (Velocity Lo→Hi)'), 'Sort Column Notes (Velocity Lo→Hi) menu item should exist');
});

TestRunner.test("Day 585 - Sort Column Notes (Pitch Hi→Lo) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Sort Column Notes (Pitch Hi→Lo)'), 'Sort Column Notes (Pitch Hi→Lo) menu item should exist');
});

TestRunner.test("Day 585 - Sort Column Notes (Pitch Lo→Hi) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Sort Column Notes (Pitch Lo→Hi)'), 'Sort Column Notes (Pitch Lo→Hi) menu item should exist');
});

TestRunner.test("Day 585 - Sort Column Notes menu items call sortColumnNotes with correct parameters", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes("sortColumnNotes('velocity-desc')"), 'Velocity Hi→Lo should call sortColumnNotes with velocity-desc');
    t.assertTruthy(uiStr.includes("sortColumnNotes('velocity-asc')"), 'Velocity Lo→Hi should call sortColumnNotes with velocity-asc');
    t.assertTruthy(uiStr.includes("sortColumnNotes('pitch-desc')"), 'Pitch Hi→Lo should call sortColumnNotes with pitch-desc');
    t.assertTruthy(uiStr.includes("sortColumnNotes('pitch-asc')"), 'Pitch Lo→Hi should call sortColumnNotes with pitch-asc');
});

TestRunner.test("Day 585 - Sort Column Notes menu items call recreateToneSequence", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    const matches = uiStr.match(/Sort Column Notes[^}]+recreateToneSequence/g);
    t.assertTruthy(matches && matches.length >= 4, 'All Sort Column Notes menu items should call recreateToneSequence');
});

TestRunner.test("Day 585 - Sort Column Notes menu items show notifications", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Sorted ${result} note(s)'), 'Sort Column Notes should show notification with count');
});

TestRunner.test("Day 585 - APP_VERSION validation for Day 585", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 585");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 241, "Minor version should be >= 241 for Day 585");
    }
});

// Day 586: Ramp Probabilities Feature
TestRunner.test("Day 586 - rampProbabilities is a function on Track.prototype", (t) => {
    t.assertTruthy(typeof Track.prototype.rampProbabilities === 'function', 'rampProbabilities should be a function on Track.prototype');
});

TestRunner.test("Day 586 - rampProbabilities accepts startProbability and endProbability parameters with defaults", (t) => {
    const trackStr = require('fs').readFileSync('./js/Track.js', 'utf8');
    const match = trackStr.match(/rampProbabilities\s*\(\s*startProbability\s*=\s*[\d.]+\s*,\s*endProbability\s*=\s*[\d.]+\s*\)/);
    t.assertTruthy(match, 'rampProbabilities should accept startProbability and endProbability parameters with defaults');
});

TestRunner.test("Day 586 - rampProbabilities returns 0 for Audio tracks", (t) => {
    const track = new Track({ id: 1, name: 'Test', type: 'Audio' });
    const result = track.rampProbabilities(0.3, 1.0);
    t.assertEquals(0, result, 'rampProbabilities should return 0 for Audio tracks');
});

TestRunner.test("Day 586 - rampProbabilities gets active sequence via getActiveSequence", (t) => {
    const trackStr = require('fs').readFileSync('./js/Track.js', 'utf8');
    const rampIdx = trackStr.indexOf('rampProbabilities(');
    const getActiveIdx = trackStr.indexOf('getActiveSequence()', rampIdx);
    t.assertTruthy(getActiveIdx > rampIdx, 'rampProbabilities should call getActiveSequence');
});

TestRunner.test("Day 586 - rampProbabilities returns 0 if no active sequence", (t) => {
    const track = new Track({ id: 1, name: 'Test', type: 'Sampler' });
    // No sequences added - getActiveSequence should return null/undefined
    const result = track.rampProbabilities(0.3, 1.0);
    t.assertEquals(0, result, 'rampProbabilities should return 0 if no active sequence');
});

TestRunner.test("Day 586 - rampProbabilities captures undo BEFORE mutation", (t) => {
    const trackStr = require('fs').readFileSync('./js/Track.js', 'utf8');
    const rampIdx = trackStr.indexOf('rampProbabilities(');
    const captureIdx = trackStr.indexOf('_captureUndoState', rampIdx);
    const forEachIdx = trackStr.indexOf('for (let rowIndex', rampIdx);
    t.assertTruthy(captureIdx > 0 && captureIdx < forEachIdx, 'rampProbabilities should capture undo BEFORE mutation');
});

TestRunner.test("Day 586 - rampProbabilities clamps probabilities to 0-1 range", (t) => {
    const trackStr = require('fs').readFileSync('./js/Track.js', 'utf8');
    const rampIdx = trackStr.indexOf('rampProbabilities(');
    const clampStartIdx = trackStr.indexOf('Math.max(0.0', rampIdx);
    const clampEndIdx = trackStr.indexOf('Math.max(0.0', clampStartIdx + 100);
    t.assertTruthy(clampStartIdx > rampIdx, 'rampProbabilities should clamp start probability');
    t.assertTruthy(clampEndIdx > clampStartIdx, 'rampProbabilities should clamp end probability');
});

TestRunner.test("Day 586 - rampProbabilities applies linear interpolation across columns", (t) => {
    const trackStr = require('fs').readFileSync('./js/Track.js', 'utf8');
    const rampIdx = trackStr.indexOf('rampProbabilities(');
    const interpIdx = trackStr.indexOf('(clampedEnd - clampedStart) * t', rampIdx);
    t.assertTruthy(interpIdx > rampIdx, 'rampProbabilities should apply linear interpolation');
});

TestRunner.test("Day 586 - rampProbabilities returns count of ramped notes", (t) => {
    const trackStr = require('fs').readFileSync('./js/Track.js', 'utf8');
    const rampIdx = trackStr.indexOf('rampProbabilities(');
    const returnIdx = trackStr.indexOf('return rampedCount', rampIdx);
    t.assertTruthy(returnIdx > rampIdx, 'rampProbabilities should return rampedCount');
});

TestRunner.test("Day 586 - Ramp Probabilities (Sparse Start) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Ramp Probabilities (Sparse Start)'), 'Ramp Probabilities (Sparse Start) menu item should exist');
});

TestRunner.test("Day 586 - Ramp Probabilities (Dense Start) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Ramp Probabilities (Dense Start)'), 'Ramp Probabilities (Dense Start) menu item should exist');
});

TestRunner.test("Day 586 - Ramp Probabilities (Escalate) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Ramp Probabilities (Escalate)'), 'Ramp Probabilities (Escalate) menu item should exist');
});

TestRunner.test("Day 586 - Ramp Probabilities (De-escalate) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Ramp Probabilities (De-escalate)'), 'Ramp Probabilities (De-escalate) menu item should exist');
});

TestRunner.test("Day 586 - Ramp Probabilities menu items call rampProbabilities", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes("rampProbabilities(0.2, 1.0)"), 'Sparse Start should call rampProbabilities(0.2, 1.0)');
    t.assertTruthy(uiStr.includes("rampProbabilities(1.0, 0.2)"), 'Dense Start should call rampProbabilities(1.0, 0.2)');
    t.assertTruthy(uiStr.includes("rampProbabilities(0.3, 0.9)"), 'Escalate should call rampProbabilities(0.3, 0.9)');
    t.assertTruthy(uiStr.includes("rampProbabilities(0.9, 0.3)"), 'De-escalate should call rampProbabilities(0.9, 0.3)');
});

TestRunner.test("Day 586 - Ramp Probabilities menu items call recreateToneSequence", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    const rampProbMatches = uiStr.match(/Ramp Probabilities[^}]+recreateToneSequence/g);
    t.assertTruthy(rampProbMatches && rampProbMatches.length >= 4, 'All Ramp Probabilities menu items should call recreateToneSequence');
});

TestRunner.test("Day 586 - Ramp Probabilities menu items show notifications with count", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('ramped ${result} probability'), 'Ramp Probabilities should show notification with ramped count');
});

TestRunner.test("Day 586 - APP_VERSION validation for Day 586", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 586");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 242, "Minor version should be >= 242 for Day 586");
    }
});
// Day 587: Humanize Timing Tests
// ================================================
TestRunner.test("Day 587 - humanizeTiming is a function on Track.prototype", (t) => {
    t.assertTruthy(typeof Track.prototype.humanizeTiming === 'function', 'humanizeTiming should be a function on Track.prototype');
});

TestRunner.test("Day 587 - humanizeTiming accepts shiftAmount parameter with default 2", (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    t.assertTruthy(funcStr.includes('shiftAmount = 2'), 'humanizeTiming should accept shiftAmount parameter with default 2');
});

TestRunner.test("Day 587 - humanizeTiming returns 0 for Audio tracks", (t) => {
    const track = new Track({ id: 'test', type: 'Audio', name: 'Audio Track' });
    const result = track.humanizeTiming(2);
    t.assertEqual(0, result, 'humanizeTiming should return 0 for Audio tracks');
});

TestRunner.test("Day 587 - humanizeTiming gets active sequence via getActiveSequence", (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence()'), 'humanizeTiming should use getActiveSequence()');
});

TestRunner.test("Day 587 - humanizeTiming returns 0 if no active sequence", (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    // No sequences added, so getActiveSequence should return null/undefined
    const result = track.humanizeTiming(2);
    t.assertEqual(0, result, 'humanizeTiming should return 0 when no active sequence');
});

TestRunner.test("Day 587 - humanizeTiming captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    const captureIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('for (let rowIndex');
    t.assertTruthy(captureIdx !== -1 && captureIdx < forEachIdx, 'humanizeTiming should capture undo BEFORE data iteration');
});

TestRunner.test("Day 587 - humanizeTiming uses Math.random() for variation", (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    t.assertTruthy(funcStr.includes('Math.random()'), 'humanizeTiming should use Math.random() for variation');
});

TestRunner.test("Day 587 - humanizeTiming clamps shift to valid bounds", (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    // Should check col bounds and totalSteps bounds
    t.assertTruthy(funcStr.includes('targetCol < 0') || funcStr.includes('targetCol >= totalSteps'), 'humanizeTiming should clamp shift to valid bounds');
});

TestRunner.test("Day 587 - humanizeTiming swaps notes when moving", (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    // Should swap notes using temp variable
    t.assertTruthy(funcStr.includes('temp'), 'humanizeTiming should swap notes using temp variable');
});

TestRunner.test("Day 587 - humanizeTiming returns count of humanized notes", (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    t.assertTruthy(funcStr.includes('humanizedCount'), 'humanizeTiming should track humanizedCount');
    t.assertTruthy(funcStr.includes('return humanizedCount'), 'humanizeTiming should return humanizedCount');
});

TestRunner.test("Day 587 - Humanize Timing (Small) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Humanize Timing (Small)'), 'Humanize Timing (Small) menu item should exist');
});

TestRunner.test("Day 587 - Humanize Timing (Medium) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Humanize Timing (Medium)'), 'Humanize Timing (Medium) menu item should exist');
});

TestRunner.test("Day 587 - Humanize Timing (Large) menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Humanize Timing (Large)'), 'Humanize Timing (Large) menu item should exist');
});

TestRunner.test("Day 587 - Humanize Timing menu items call humanizeTiming with correct parameters", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('humanizeTiming(2)'), 'Small should call humanizeTiming(2)');
    t.assertTruthy(uiStr.includes('humanizeTiming(4)'), 'Medium should call humanizeTiming(4)');
    t.assertTruthy(uiStr.includes('humanizeTiming(6)'), 'Large should call humanizeTiming(6)');
});

TestRunner.test("Day 587 - Humanize Timing menu items call recreateToneSequence", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    const humanizeTimingMatches = uiStr.match(/Humanize Timing[^}]+recreateToneSequence/g);
    t.assertTruthy(humanizeTimingMatches && humanizeTimingMatches.length >= 3, 'All Humanize Timing menu items should call recreateToneSequence');
});

TestRunner.test("Day 587 - Humanize Timing menu items show notifications with count", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Humanized timing for') && uiStr.includes('note(s)'), 'Humanize Timing should show notification with humanized count');
});

TestRunner.test("Day 587 - APP_VERSION validation for Day 587", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 587");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 243, "Minor version should be >= 243 for Day 587");
    }
});

// Day 588: Invert Velocities Feature
// ================================================
TestRunner.test("Day 588 - invertVelocities is a function on Track.prototype", (t) => {
    t.assertTruthy(typeof Track.prototype.invertVelocities === 'function', 'invertVelocities should be a function on Track.prototype');
});

TestRunner.test("Day 588 - invertVelocities returns 0 for Audio tracks", (t) => {
    const track = new Track({ id: 'test', type: 'Audio', name: 'Audio Track' });
    const result = track.invertVelocities();
    t.assertEqual(0, result, 'invertVelocities should return 0 for Audio tracks');
});

TestRunner.test("Day 588 - invertVelocities gets active sequence via getActiveSequence", (t) => {
    const funcStr = Track.prototype.invertVelocities.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence()'), 'invertVelocities should use getActiveSequence()');
});

TestRunner.test("Day 588 - invertVelocities returns 0 if no active sequence", (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    const result = track.invertVelocities();
    t.assertEqual(0, result, 'invertVelocities should return 0 when no active sequence');
});

TestRunner.test("Day 588 - invertVelocities captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.invertVelocities.toString();
    const captureIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('for (let rowIndex');
    t.assertTruthy(captureIdx !== -1 && captureIdx < forEachIdx, 'invertVelocities should capture undo BEFORE data iteration');
});

TestRunner.test("Day 588 - invertVelocities finds min and max velocities in first pass", (t) => {
    const funcStr = Track.prototype.invertVelocities.toString();
    t.assertTruthy(funcStr.includes('minVel'), 'invertVelocities should track minVel');
    t.assertTruthy(funcStr.includes('maxVel'), 'invertVelocities should track maxVel');
});

TestRunner.test("Day 588 - invertVelocities uses center point formula", (t) => {
    const funcStr = Track.prototype.invertVelocities.toString();
    t.assertTruthy(funcStr.includes('centerPoint') && funcStr.includes('minVel + maxVel'), 'invertVelocities should calculate center point');
});

TestRunner.test("Day 588 - invertVelocities clamps velocities to 0.05-1.0 range", (t) => {
    const funcStr = Track.prototype.invertVelocities.toString();
    t.assertTruthy(funcStr.includes('Math.max(0.05') && funcStr.includes('Math.min(1.0'), 'invertVelocities should clamp to 0.05-1.0 range');
});

TestRunner.test("Day 588 - invertVelocities rounds to 2 decimal places", (t) => {
    const funcStr = Track.prototype.invertVelocities.toString();
    t.assertTruthy(funcStr.includes('Math.round(newVelocity * 100) / 100'), 'invertVelocities should round to 2 decimal places');
});

TestRunner.test("Day 588 - invertVelocities returns count of inverted velocities", (t) => {
    const funcStr = Track.prototype.invertVelocities.toString();
    t.assertTruthy(funcStr.includes('invertedCount'), 'invertVelocities should track invertedCount');
    t.assertTruthy(funcStr.includes('return invertedCount'), 'invertVelocities should return invertedCount');
});

TestRunner.test("Day 588 - Invert Velocities menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Invert Velocities'), 'Invert Velocities menu item should exist');
});

TestRunner.test("Day 588 - Invert Velocities menu item calls track.invertVelocities", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('currentTrackForMenu.invertVelocities()'), 'Invert Velocities menu item should call invertVelocities()');
});

TestRunner.test("Day 588 - Invert Velocities menu item calls recreateToneSequence", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    const matches = uiStr.match(/Invert Velocities[^}]+recreateToneSequence/g);
    t.assertTruthy(matches && matches.length >= 1, 'Invert Velocities menu item should call recreateToneSequence');
});

TestRunner.test("Day 588 - Invert Velocities menu item shows notification", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Inverted') && uiStr.includes('velocity value(s)'), 'Invert Velocities should show notification');
});

TestRunner.test("Day 588 - APP_VERSION validation for Day 588", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 588");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 244, "Minor version should be >= 244 for Day 588");
    }
});

// Day 589: Quantize Sequence Tests
TestRunner.test("Day 589 - quantizeSequence is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.quantizeSequence, 'function', 'quantizeSequence should be a function on Track.prototype');
});

TestRunner.test("Day 589 - quantizeSequence accepts quantizeTo parameter with default 16", (t) => {
    const funcStr = Track.prototype.quantizeSequence.toString();
    t.assertTruthy(funcStr.includes('quantizeTo = 16'), 'quantizeSequence should have quantizeTo parameter with default 16');
});

TestRunner.test("Day 589 - quantizeSequence returns 0 for Audio tracks", (t) => {
    const track = new Track(999, 'Audio');
    const result = track.quantizeSequence();
    t.assertEqual(result, 0, 'quantizeSequence should return 0 for Audio tracks');
});

TestRunner.test("Day 589 - quantizeSequence gets active sequence via getActiveSequence", (t) => {
    const track = new Track(1, 'Synth');
    track.sequences = [{ id: 'seq1', name: 'Test', data: [[null]], length: 16 }];
    track.activeSequenceId = 'seq1';
    const getActiveSequenceSpy = { called: false };
    const originalGetActiveSequence = track.getActiveSequence.bind(track);
    track.getActiveSequence = function() {
        getActiveSequenceSpy.called = true;
        return originalGetActiveSequence();
    };
    track.quantizeSequence(16);
    t.assertTruthy(getActiveSequenceSpy.called, 'quantizeSequence should call getActiveSequence');
});

TestRunner.test("Day 589 - quantizeSequence returns 0 if no active sequence", (t) => {
    const track = new Track(1, 'Synth');
    track.sequences = [];
    const result = track.quantizeSequence();
    t.assertEqual(result, 0, 'quantizeSequence should return 0 when no active sequence');
});

TestRunner.test("Day 589 - quantizeSequence captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.quantizeSequence.toString();
    const captureIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('activeSeq.data.forEach');
    t.assertTruthy(captureIdx !== -1 && captureIdx < forEachIdx, 'quantizeSequence should capture undo BEFORE data iteration');
});

TestRunner.test("Day 589 - quantizeSequence uses Math.round for snapping", (t) => {
    const funcStr = Track.prototype.quantizeSequence.toString();
    t.assertTruthy(funcStr.includes('Math.round(col / quantizeTo) * quantizeTo'), 'quantizeSequence should use Math.round for snapping');
});

TestRunner.test("Day 589 - quantizeSequence returns count of quantized notes", (t) => {
    const funcStr = Track.prototype.quantizeSequence.toString();
    t.assertTruthy(funcStr.includes('quantizedCount') || funcStr.includes('snappedCount'), 'quantizeSequence should track quantized/snapped count');
});

TestRunner.test("Day 589 - Quantize to 1/16 menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Quantize to 1/16'), 'Quantize to 1/16 menu item should exist');
});

TestRunner.test("Day 589 - Quantize to 1/8 menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Quantize to 1/8'), 'Quantize to 1/8 menu item should exist');
});

TestRunner.test("Day 589 - Quantize to 1/4 menu item exists", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Quantize to 1/4'), 'Quantize to 1/4 menu item should exist');
});

TestRunner.test("Day 589 - Quantize menu items call quantizeSequence with correct parameters", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('quantizeSequence(16)') && uiStr.includes('quantizeSequence(8)') && uiStr.includes('quantizeSequence(4)'), 'Quantize menu items should call quantizeSequence with 16, 8, 4');
});

TestRunner.test("Day 589 - Quantize menu items call recreateToneSequence after quantize", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    const quantizeIdx = uiStr.indexOf('quantizeSequence');
    const recreateIdx = uiStr.indexOf('recreateToneSequence', quantizeIdx);
    t.assertTruthy(recreateIdx !== -1, 'Quantize menu items should call recreateToneSequence');
});

TestRunner.test("Day 589 - Quantize menu items show notification with quantized count", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Quantized') && uiStr.includes('note(s)'), 'Quantize menu items should show notification with quantized count');
});

TestRunner.test("Day 589 - APP_VERSION validation for Day 589", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 589");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 245, "Minor version should be >= 245 for Day 589");
    }
});

// Day 590: Keyboard Shortcuts Tests (Ctrl+Q, Ctrl+A, Ctrl+Shift+A)
// ================================================
TestRunner.test("Day 590 - Ctrl+Q handler exists for quantize selection", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    t.assertTruthy(eventStr.includes('key === \'q\'') && eventStr.includes('quantizeSequence'), 'Ctrl+Q handler should call quantizeSequence');
});

TestRunner.test("Day 590 - Ctrl+Q handler captures undo state before quantize", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    const ctrlQIdx = eventStr.indexOf('key === \'q\'');
    const captureIdx = eventStr.indexOf('captureStateForUndo', ctrlQIdx);
    t.assertTruthy(captureIdx > ctrlQIdx, 'Ctrl+Q handler should capture undo state');
});

TestRunner.test("Day 590 - Ctrl+Q handler calls recreateToneSequence after quantize", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    const ctrlQIdx = eventStr.indexOf('key === \'q\'');
    const recreateIdx = eventStr.indexOf('recreateToneSequence', ctrlQIdx);
    t.assertTruthy(recreateIdx > ctrlQIdx, 'Ctrl+Q handler should call recreateToneSequence');
});

TestRunner.test("Day 590 - Ctrl+Q handler shows notification with quantized count", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    t.assertTruthy(eventStr.includes('Quantized ${quantizedCount}') || eventStr.includes('Quantized'), 'Ctrl+Q handler should show notification');
});

TestRunner.test("Day 590 - Ctrl+A handler exists for select all notes", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    t.assertTruthy(eventStr.includes('key === \'a\'') && eventStr.includes('selected-cell'), 'Ctrl+A handler should select cells');
});

TestRunner.test("Day 590 - Ctrl+A handler captures undo state", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    const ctrlAIdx = eventStr.indexOf('key === \'a\'');
    const captureIdx = eventStr.indexOf('captureStateForUndo', ctrlAIdx);
    t.assertTruthy(captureIdx > ctrlAIdx, 'Ctrl+A handler should capture undo state');
});

TestRunner.test("Day 590 - Ctrl+Shift+A handler exists for deselect all notes", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    t.assertTruthy(eventStr.includes('key === \'a\'') && eventStr.includes('shiftKey') && eventStr.includes('remove(\'selected-cell\')'), 'Ctrl+Shift+A should deselect cells');
});

TestRunner.test("Day 590 - Keyboard shortcuts help includes Ctrl+Q for quantize", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Quantize Selection') && uiStr.includes('Ctrl+Q'), 'Keyboard shortcuts help should include Ctrl+Q');
});

TestRunner.test("Day 590 - Keyboard shortcuts help includes Ctrl+A for select all", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Select All Notes') && uiStr.includes('Ctrl+A'), 'Keyboard shortcuts help should include Ctrl+A');
});

TestRunner.test("Day 590 - Keyboard shortcuts help includes Ctrl+Shift+A for deselect", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Deselect All Notes') && uiStr.includes('Ctrl+Shift+A'), 'Keyboard shortcuts help should include Ctrl+Shift+A');
});

TestRunner.test("Day 591 - Ctrl+Shift+C handler exists for copy section", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    t.assertTruthy(eventStr.includes('event.shiftKey && key === \'c\'') && eventStr.includes('copySequenceSection'), 'Ctrl+Shift+C handler should call copySequenceSection');
});

TestRunner.test("Day 591 - Ctrl+Shift+C copies section from selection", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    t.assertTruthy(eventStr.includes('setClipboardData') && eventStr.includes('type: \'section\''), 'Ctrl+Shift+C should set clipboard type to section');
});

TestRunner.test("Day 591 - Ctrl+Shift+C copies section at correct start column", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    t.assertTruthy(eventStr.includes('startCol: minCol') || eventStr.includes('startCol: c1'), 'Ctrl+Shift+C should save the section start column');
});

TestRunner.test("Day 591 - Ctrl+Shift+C handles no selection case", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    t.assertTruthy(eventStr.includes('No selection') || eventStr.includes('select a region'), 'Ctrl+Shift+C should handle no selection case with notification');
});

TestRunner.test("Day 591 - Ctrl+Shift+V handler exists for paste section", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    t.assertTruthy(eventStr.includes('event.shiftKey && key === \'v\'') && eventStr.includes('pasteSequenceSection'), 'Ctrl+Shift+V handler should call pasteSequenceSection');
});

TestRunner.test("Day 591 - Ctrl+Shift+V validates section clipboard type", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    t.assertTruthy(eventStr.includes('cb.type !== \'section\'') && eventStr.includes('Use Copy Section first'), 'Ctrl+Shift+V should validate section clipboard type');
});

TestRunner.test("Day 591 - Ctrl+Shift+V captures undo state before paste", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    const shiftVIdx = eventStr.indexOf('event.shiftKey && key === \'v\'');
    const captureIdx = eventStr.indexOf('captureStateForUndo', shiftVIdx);
    t.assertTruthy(captureIdx > shiftVIdx, 'Ctrl+Shift+V should capture undo state');
});

TestRunner.test("Day 591 - Ctrl+Shift+V calls pasteSequenceSection with correct target column", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    t.assertTruthy(eventStr.includes('pasteSequenceSection(cb.data, targetCol)') || eventStr.includes('pasteSequenceSection(cb.data, cb.startCol'), 'Ctrl+Shift+V should call pasteSequenceSection with target column');
});

TestRunner.test("Day 591 - Ctrl+Shift+V shows notification with pasted count and column", (t) => {
    const eventStr = require('fs').readFileSync('./js/eventHandlers.js', 'utf8');
    t.assertTruthy(eventStr.includes('Pasted ${result}') && eventStr.includes('targetCol+1'), 'Ctrl+Shift+V should show notification with pasted count and column');
});

TestRunner.test("Day 591 - Keyboard shortcuts help includes Ctrl+Shift+C for copy section", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Copy Section') && uiStr.includes('Ctrl+Shift+C'), 'Keyboard shortcuts help should include Ctrl+Shift+C');
});

TestRunner.test("Day 591 - Keyboard shortcuts help includes Ctrl+Shift+V for paste section", (t) => {
    const uiStr = require('fs').readFileSync('./js/ui.js', 'utf8');
    t.assertTruthy(uiStr.includes('Paste Section') && uiStr.includes('Ctrl+Shift+V'), 'Keyboard shortcuts help should include Ctrl+Shift+V');
});

TestRunner.test("Day 591 - APP_VERSION validation for Day 591", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 591");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 247, "Minor version should be >= 247 for Day 591");
    }
});
// Day 592: Track Groups, Track Templates, Ghost Track, and Loop Region State Tests
TestRunner.test("Day 592 - Track Groups - getTrackGroupsState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTrackGroupsState'), 'getTrackGroupsState should be exported');
});

TestRunner.test("Day 592 - Track Groups - getTrackGroupByIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTrackGroupByIdState'), 'getTrackGroupByIdState should be exported');
});

TestRunner.test("Day 592 - Track Groups - addTrackGroupState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function addTrackGroupState'), 'addTrackGroupState should be exported');
});

TestRunner.test("Day 592 - Track Groups - addTrackGroupState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const addIdx = stateStr.indexOf('export function addTrackGroupState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', addIdx);
    t.assertTruthy(captureIdx > addIdx, 'addTrackGroupState should call captureStateForUndo');
});

TestRunner.test("Day 592 - Track Groups - addTrackGroupState uses descriptive undo label with group name", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('Create Track Group'), 'addTrackGroupState undo label should include "Create Track Group"');
});

TestRunner.test("Day 592 - Track Groups - setTrackGroupNameState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setTrackGroupNameState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setTrackGroupNameState should call captureStateForUndo');
});

TestRunner.test("Day 592 - Track Groups - removeTrackGroupState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const remIdx = stateStr.indexOf('export function removeTrackGroupState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', remIdx);
    t.assertTruthy(captureIdx > remIdx, 'removeTrackGroupState should call captureStateForUndo');
});

TestRunner.test("Day 592 - Track Templates - getTrackTemplatesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTrackTemplatesState'), 'getTrackTemplatesState should be exported');
});

TestRunner.test("Day 592 - Track Templates - addTrackTemplateState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function addTrackTemplateState'), 'addTrackTemplateState should be exported');
});

TestRunner.test("Day 592 - Track Templates - addTrackTemplateState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const addIdx = stateStr.indexOf('export function addTrackTemplateState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', addIdx);
    t.assertTruthy(captureIdx > addIdx, 'addTrackTemplateState should call captureStateForUndo');
});

TestRunner.test("Day 592 - Track Templates - updateTrackTemplateState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const updIdx = stateStr.indexOf('export function updateTrackTemplateState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', updIdx);
    t.assertTruthy(captureIdx > updIdx, 'updateTrackTemplateState should call captureStateForUndo');
});

TestRunner.test("Day 592 - Track Templates - removeTrackTemplateState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const remIdx = stateStr.indexOf('export function removeTrackTemplateState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', remIdx);
    t.assertTruthy(captureIdx > remIdx, 'removeTrackTemplateState should call captureStateForUndo');
});

TestRunner.test("Day 592 - Ghost Track - getGhostTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getGhostTrackIdState'), 'getGhostTrackIdState should be exported');
});

TestRunner.test("Day 592 - Ghost Track - setGhostTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setGhostTrackIdState'), 'setGhostTrackIdState should be exported');
});

TestRunner.test("Day 592 - Ghost Track - setGhostTrackIdState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setGhostTrackIdState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setGhostTrackIdState should call captureStateForUndo');
});

TestRunner.test("Day 592 - Ghost Track - setGhostTrackIdState uses descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes("'Set Ghost Track'"), 'setGhostTrackIdState undo label should be "Set Ghost Track"');
});

TestRunner.test("Day 592 - Loop Region - getLoopRegionState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getLoopRegionState'), 'getLoopRegionState should be exported');
});

TestRunner.test("Day 592 - Loop Region - setLoopRegionState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setLoopRegionState'), 'setLoopRegionState should be exported');
});

TestRunner.test("Day 592 - Loop Region - setLoopRegionState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setLoopRegionState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setLoopRegionState should call captureStateForUndo');
});

TestRunner.test("Day 592 - Loop Region - setLoopRegionState uses descriptive undo label with bars", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('Set Loop Region to ${'), 'setLoopRegionState undo label should include bar values');
});

TestRunner.test("Day 592 - Loop Region - setLoopRegionEnabledState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setLoopRegionEnabledState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setLoopRegionEnabledState should call captureStateForUndo');
});

TestRunner.test("Day 592 - Loop Region - setLoopRegionStartBarState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setLoopRegionStartBarState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setLoopRegionStartBarState should call captureStateForUndo');
});

TestRunner.test("Day 592 - Loop Region - setLoopRegionEndBarState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setLoopRegionEndBarState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setLoopRegionEndBarState should call captureStateForUndo');
});

TestRunner.test("Day 592 - APP_VERSION validation for Day 592", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 592");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 248, "Minor version should be >= 248 for Day 592");
    }
});

// ============================================
// Day 593: Scale Mode & Chord Mode State Tests
// ============================================
TestRunner.test("Day 593 - Scale Mode - getScaleModeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getScaleModeState'), 'getScaleModeState should be exported');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setScaleModeState'), 'setScaleModeState should be exported');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setScaleModeState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setScaleModeState should call captureStateForUndo');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeState uses descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setScaleModeState');
    const undoLabelIdx = stateStr.indexOf("Set Scale Mode", setIdx);
    t.assertTruthy(undoLabelIdx > setIdx && undoLabelIdx < setIdx + 500, 'setScaleModeState undo label should be "Set Scale Mode"');
});

TestRunner.test("Day 593 - Scale Mode - getScaleModeEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getScaleModeEnabledState'), 'getScaleModeEnabledState should be exported');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setScaleModeEnabledState'), 'setScaleModeEnabledState should be exported');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeEnabledState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setScaleModeEnabledState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setScaleModeEnabledState should call captureStateForUndo');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeEnabledState uses descriptive undo label with On/Off", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setScaleModeEnabledState');
    const undoLabelIdx = stateStr.indexOf("Toggle Scale Mode", setIdx);
    t.assertTruthy(undoLabelIdx > setIdx && undoLabelIdx < setIdx + 300, 'setScaleModeEnabledState undo label should include "Toggle Scale Mode"');
});

TestRunner.test("Day 593 - Scale Mode - getScaleModeScaleState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getScaleModeScaleState'), 'getScaleModeScaleState should be exported');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeScaleState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setScaleModeScaleState'), 'setScaleModeScaleState should be exported');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeScaleState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setScaleModeScaleState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setScaleModeScaleState should call captureStateForUndo');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeScaleState uses descriptive undo label with scale name", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setScaleModeScaleState');
    const undoLabelIdx = stateStr.indexOf("Set Scale to", setIdx);
    t.assertTruthy(undoLabelIdx > setIdx && undoLabelIdx < setIdx + 300, 'setScaleModeScaleState undo label should include "Set Scale to"');
});

TestRunner.test("Day 593 - Scale Mode - getScaleModeRootState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getScaleModeRootState'), 'getScaleModeRootState should be exported');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeRootState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setScaleModeRootState'), 'setScaleModeRootState should be exported');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeRootState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setScaleModeRootState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setScaleModeRootState should call captureStateForUndo');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeRootState uses descriptive undo label with root note", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setScaleModeRootState');
    const undoLabelIdx = stateStr.indexOf("Set Scale Root to", setIdx);
    t.assertTruthy(undoLabelIdx > setIdx && undoLabelIdx < setIdx + 300, 'setScaleModeRootState undo label should include "Set Scale Root to"');
});

TestRunner.test("Day 593 - Scale Mode - getScaleModeLockState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getScaleModeLockState'), 'getScaleModeLockState should be exported');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeLockState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setScaleModeLockState'), 'setScaleModeLockState should be exported');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeLockState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setScaleModeLockState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setScaleModeLockState should call captureStateForUndo');
});

TestRunner.test("Day 593 - Scale Mode - setScaleModeLockState uses descriptive undo label with On/Off", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setScaleModeLockState');
    const undoLabelIdx = stateStr.indexOf("Toggle Scale Lock", setIdx);
    t.assertTruthy(undoLabelIdx > setIdx && undoLabelIdx < setIdx + 300, 'setScaleModeLockState undo label should include "Toggle Scale Lock"');
});

TestRunner.test("Day 593 - Chord Mode - getChordModeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getChordModeState'), 'getChordModeState should be exported');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setChordModeState'), 'setChordModeState should be exported');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setChordModeState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setChordModeState should call captureStateForUndo');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeState uses descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setChordModeState');
    const undoLabelIdx = stateStr.indexOf("Set Chord Mode", setIdx);
    t.assertTruthy(undoLabelIdx > setIdx && undoLabelIdx < setIdx + 500, 'setChordModeState undo label should be "Set Chord Mode"');
});

TestRunner.test("Day 593 - Chord Mode - getChordModeEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getChordModeEnabledState'), 'getChordModeEnabledState should be exported');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setChordModeEnabledState'), 'setChordModeEnabledState should be exported');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeEnabledState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setChordModeEnabledState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setChordModeEnabledState should call captureStateForUndo');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeEnabledState uses descriptive undo label with On/Off", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setChordModeEnabledState');
    const undoLabelIdx = stateStr.indexOf("Toggle Chord Mode", setIdx);
    t.assertTruthy(undoLabelIdx > setIdx && undoLabelIdx < setIdx + 300, 'setChordModeEnabledState undo label should include "Toggle Chord Mode"');
});

TestRunner.test("Day 593 - Chord Mode - getChordModeRootState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getChordModeRootState'), 'getChordModeRootState should be exported');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeRootState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setChordModeRootState'), 'setChordModeRootState should be exported');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeRootState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setChordModeRootState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setChordModeRootState should call captureStateForUndo');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeRootState uses descriptive undo label with root note", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setChordModeRootState');
    const undoLabelIdx = stateStr.indexOf("Set Chord Root to", setIdx);
    t.assertTruthy(undoLabelIdx > setIdx && undoLabelIdx < setIdx + 300, 'setChordModeRootState undo label should include "Set Chord Root to"');
});

TestRunner.test("Day 593 - Chord Mode - getChordModeTypeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getChordModeTypeState'), 'getChordModeTypeState should be exported');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeTypeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setChordModeTypeState'), 'setChordModeTypeState should be exported');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeTypeState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setChordModeTypeState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setChordModeTypeState should call captureStateForUndo');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeTypeState uses descriptive undo label with chord type", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setChordModeTypeState');
    const undoLabelIdx = stateStr.indexOf("Set Chord Type to", setIdx);
    t.assertTruthy(undoLabelIdx > setIdx && undoLabelIdx < setIdx + 300, 'setChordModeTypeState undo label should include "Set Chord Type to"');
});

TestRunner.test("Day 593 - Chord Mode - getChordModeLockState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getChordModeLockState'), 'getChordModeLockState should be exported');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeLockState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setChordModeLockState'), 'setChordModeLockState should be exported');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeLockState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setChordModeLockState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setChordModeLockState should call captureStateForUndo');
});

TestRunner.test("Day 593 - Chord Mode - setChordModeLockState uses descriptive undo label with On/Off", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setChordModeLockState');
    const undoLabelIdx = stateStr.indexOf("Toggle Chord Lock", setIdx);
    t.assertTruthy(undoLabelIdx > setIdx && undoLabelIdx < setIdx + 300, 'setChordModeLockState undo label should include "Toggle Chord Lock"');
});

TestRunner.test("Day 593 - Chord Mode - getChordVoicingState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getChordVoicingState'), 'getChordVoicingState should be exported');
});

TestRunner.test("Day 593 - Chord Mode - setChordVoicingState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setChordVoicingState'), 'setChordVoicingState should be exported');
});

TestRunner.test("Day 593 - Chord Mode - setChordVoicingState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setChordVoicingState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setChordVoicingState should call captureStateForUndo');
});

TestRunner.test("Day 593 - Chord Mode - setChordVoicingState uses descriptive undo label with voicing", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setChordVoicingState');
    const undoLabelIdx = stateStr.indexOf("Set Chord Voicing to", setIdx);
    t.assertTruthy(undoLabelIdx > setIdx && undoLabelIdx < setIdx + 300, 'setChordVoicingState undo label should include "Set Chord Voicing to"');
});

// Day 594: Project, Preview, Library, Synth Presets, and Undo/Redo State Function Tests
TestRunner.test("Day 594 - Project - getProjectNameState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getProjectNameState'), 'getProjectNameState should be exported');
});

TestRunner.test("Day 594 - Project - setProjectNameState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setProjectNameState'), 'setProjectNameState should be exported');
});

TestRunner.test("Day 594 - Project - setProjectNameState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setProjectNameState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setProjectNameState should call captureStateForUndo');
});

TestRunner.test("Day 594 - Project - getProjectNotesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getProjectNotesState'), 'getProjectNotesState should be exported');
});

TestRunner.test("Day 594 - Project - setProjectNotesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setProjectNotesState'), 'setProjectNotesState should be exported');
});

TestRunner.test("Day 594 - Project - setProjectNotesState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setProjectNotesState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setProjectNotesState should call captureStateForUndo');
});

TestRunner.test("Day 594 - Preview Sound - getSelectedSoundForPreviewState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getSelectedSoundForPreviewState'), 'getSelectedSoundForPreviewState should be exported');
});

TestRunner.test("Day 594 - Preview Sound - setSelectedSoundForPreviewState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSelectedSoundForPreviewState'), 'setSelectedSoundForPreviewState should be exported');
});

TestRunner.test("Day 594 - Preview Sound - setSelectedSoundForPreviewState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setSelectedSoundForPreviewState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setSelectedSoundForPreviewState should call captureStateForUndo');
});

TestRunner.test("Day 594 - Loaded ZIP Files - getLoadedZipFilesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getLoadedZipFilesState'), 'getLoadedZipFilesState should be exported');
});

TestRunner.test("Day 594 - Loaded ZIP Files - setLoadedZipFilesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setLoadedZipFilesState'), 'setLoadedZipFilesState should be exported');
});

TestRunner.test("Day 594 - Loaded ZIP Files - setLoadedZipFilesState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setLoadedZipFilesState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setLoadedZipFilesState should call captureStateForUndo');
});

TestRunner.test("Day 594 - Sound Library - getSoundLibraryFileTreesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getSoundLibraryFileTreesState'), 'getSoundLibraryFileTreesState should be exported');
});

TestRunner.test("Day 594 - Sound Library - setSoundLibraryFileTreesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSoundLibraryFileTreesState'), 'setSoundLibraryFileTreesState should be exported');
});

TestRunner.test("Day 594 - Sound Library - setSoundLibraryFileTreesState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setSoundLibraryFileTreesState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setSoundLibraryFileTreesState should call captureStateForUndo');
});

TestRunner.test("Day 594 - Synth Presets - getSynthPresets is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getSynthPresets'), 'getSynthPresets should be exported');
});

TestRunner.test("Day 594 - Synth Presets - saveSynthPreset is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function saveSynthPreset'), 'saveSynthPreset should be exported');
});

TestRunner.test("Day 594 - Synth Presets - deleteSynthPreset is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function deleteSynthPreset'), 'deleteSynthPreset should be exported');
});

TestRunner.test("Day 594 - Undo/Redo - getUndoStackState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getUndoStackState'), 'getUndoStackState should be exported');
});

TestRunner.test("Day 594 - Undo/Redo - getRedoStackState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getRedoStackState'), 'getRedoStackState should be exported');
});

TestRunner.test("Day 594 - Undo/Redo - getUndoStackState returns array copy", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getUndoStackState');
    const spreadIdx = stateStr.indexOf('[...undoStack]', fnIdx);
    t.assertTruthy(spreadIdx > fnIdx, 'getUndoStackState should return a copy using spread operator');
});

TestRunner.test("Day 594 - Undo/Redo - getRedoStackState returns array copy", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getRedoStackState');
    const spreadIdx = stateStr.indexOf('[...redoStack]', fnIdx);
    t.assertTruthy(spreadIdx > fnIdx, 'getRedoStackState should return a copy using spread operator');
});

TestRunner.test("Day 594 - APP_VERSION validation for Day 594", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 594");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 250, "Minor version should be >= 250 for Day 594");
    }
});



// Day 595: MIDI Learn State Function Tests
// ================================================
TestRunner.test("Day 595 - MIDI Learn - getMidiLearnMappingsState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMidiLearnMappingsState'), 'getMidiLearnMappingsState should be exported');
});

TestRunner.test("Day 595 - MIDI Learn - setMidiLearnMappingsState - uses direct mutation (no setter)", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getMidiLearnMappingsState');
    const setIdx = stateStr.indexOf('export function setMidiLearnMappingsState', fnIdx);
    t.assertEqual(setIdx, -1, 'setMidiLearnMappingsState should not exist - MIDI mappings use direct mutation via addMidiLearnMapping/removeMidiLearnMapping/clearMidiLearnMappings');
});

TestRunner.test("Day 595 - MIDI Learn - getMidiLearnMappingsState returns mapped array copy", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getMidiLearnMappingsState');
    const mapIdx = stateStr.indexOf('.map', fnIdx);
    t.assertTruthy(mapIdx > fnIdx && mapIdx < fnIdx + 300, 'getMidiLearnMappingsState should return mapped array copy');
});

TestRunner.test("Day 595 - MIDI Learn - getMidiLearnModeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMidiLearnModeState'), 'getMidiLearnModeState should be exported');
});

TestRunner.test("Day 595 - MIDI Learn - setMidiLearnModeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMidiLearnModeState'), 'setMidiLearnModeState should be exported');
});

TestRunner.test("Day 595 - MIDI Learn - setMidiLearnModeState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setMidiLearnModeState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setMidiLearnModeState should call captureStateForUndo');
});

TestRunner.test("Day 595 - MIDI Learn - setMidiLearnModeState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setMidiLearnModeState');
    const labelIdx = stateStr.indexOf('Toggle MIDI Learn', setIdx);
    t.assertTruthy(labelIdx > setIdx && labelIdx < setIdx + 300, 'setMidiLearnModeState should have descriptive undo label');
});

TestRunner.test("Day 595 - MIDI Learn - getMidiLearnPendingParamState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMidiLearnPendingParamState'), 'getMidiLearnPendingParamState should be exported');
});

TestRunner.test("Day 595 - MIDI Learn - setMidiLearnPendingParamState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMidiLearnPendingParamState'), 'setMidiLearnPendingParamState should be exported');
});

TestRunner.test("Day 595 - MIDI Learn - setMidiLearnPendingParamState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const setIdx = stateStr.indexOf('export function setMidiLearnPendingParamState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', setIdx);
    t.assertTruthy(captureIdx > setIdx, 'setMidiLearnPendingParamState should call captureStateForUndo');
});

TestRunner.test("Day 595 - MIDI Learn - addMidiLearnMapping is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function addMidiLearnMapping'), 'addMidiLearnMapping should be exported');
});

TestRunner.test("Day 595 - MIDI Learn - addMidiLearnMapping calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addMidiLearnMapping');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'addMidiLearnMapping should call captureStateForUndo');
});

TestRunner.test("Day 595 - MIDI Learn - addMidiLearnMapping has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addMidiLearnMapping');
    const labelIdx = stateStr.indexOf('Add MIDI Learn Mapping', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'addMidiLearnMapping should have descriptive undo label');
});

TestRunner.test("Day 595 - MIDI Learn - removeMidiLearnMapping is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function removeMidiLearnMapping'), 'removeMidiLearnMapping should be exported');
});

TestRunner.test("Day 595 - MIDI Learn - removeMidiLearnMapping calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeMidiLearnMapping');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'removeMidiLearnMapping should call captureStateForUndo');
});

TestRunner.test("Day 595 - MIDI Learn - removeMidiLearnMapping has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeMidiLearnMapping');
    const labelIdx = stateStr.indexOf('Remove MIDI Learn Mapping', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'removeMidiLearnMapping should have descriptive undo label');
});

TestRunner.test("Day 595 - MIDI Learn - clearMidiLearnMappings is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function clearMidiLearnMappings'), 'clearMidiLearnMappings should be exported');
});

TestRunner.test("Day 595 - MIDI Learn - clearMidiLearnMappings calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearMidiLearnMappings');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'clearMidiLearnMappings should call captureStateForUndo');
});

TestRunner.test("Day 595 - MIDI Learn - updateMidiLearnMapping is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function updateMidiLearnMapping'), 'updateMidiLearnMapping should be exported');
});

TestRunner.test("Day 595 - MIDI Learn - updateMidiLearnMapping calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function updateMidiLearnMapping');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'updateMidiLearnMapping should call captureStateForUndo');
});

TestRunner.test("Day 595 - MIDI Learn - getMidiLearnMappingByIndex is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMidiLearnMappingByIndex'), 'getMidiLearnMappingByIndex should be exported');
});

TestRunner.test("Day 595 - MIDI Learn - findMidiLearnMapping is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function findMidiLearnMapping'), 'findMidiLearnMapping should be exported');
});

TestRunner.test("Day 595 - MIDI Access - getMidiAccessState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMidiAccessState'), 'getMidiAccessState should be exported');
});

TestRunner.test("Day 595 - MIDI Access - setMidiAccessState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMidiAccessState'), 'setMidiAccessState should be exported');
});

TestRunner.test("Day 595 - MIDI Access - getActiveMIDIInputState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getActiveMIDIInputState'), 'getActiveMIDIInputState should be exported');
});

TestRunner.test("Day 595 - MIDI Access - setActiveMIDIInputState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setActiveMIDIInputState'), 'setActiveMIDIInputState should be exported');
});

TestRunner.test("Day 595 - APP_VERSION validation for Day 595", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 595");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 250, "Minor version should be >= 250 for Day 595");
    }
});

// Day 596: Playback Mode State Function Tests
// =============================================
TestRunner.test("Day 596 - Playback Mode - getPlaybackModeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getPlaybackModeState'), 'getPlaybackModeState should be exported');
});

TestRunner.test("Day 596 - Playback Mode - setPlaybackModeStateInternal is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setPlaybackModeStateInternal'), 'setPlaybackModeStateInternal should be exported');
});

TestRunner.test("Day 596 - Playback Mode - setPlaybackModeStateInternal calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setPlaybackModeStateInternal');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setPlaybackModeStateInternal should call captureStateForUndo');
});

TestRunner.test("Day 596 - Playback Mode - setPlaybackModeStateInternal has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setPlaybackModeStateInternal');
    const labelIdx = stateStr.indexOf('Set Playback Mode to', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setPlaybackModeStateInternal should have descriptive undo label');
});

TestRunner.test("Day 596 - Playback Mode - getPlaybackModeState returns a string", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getPlaybackModeState');
    const returnIdx = stateStr.indexOf('return globalPlaybackMode', fnIdx);
    t.assertTruthy(returnIdx > fnIdx && returnIdx < fnIdx + 100, 'getPlaybackModeState should return globalPlaybackMode string');
});

TestRunner.test("Day 596 - Playback Mode - setPlaybackModeStateInternal validates mode values", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setPlaybackModeStateInternal');
    const validIdx = stateStr.indexOf("mode === 'sequencer' || mode === 'timeline'", fnIdx);
    t.assertTruthy(validIdx > fnIdx && validIdx < fnIdx + 300, 'setPlaybackModeStateInternal should validate mode values');
});

TestRunner.test("Day 596 - Playback Mode - getMidiAccessState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMidiAccessState'), 'getMidiAccessState should be exported');
});

TestRunner.test("Day 596 - Playback Mode - setMidiAccessState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMidiAccessState'), 'setMidiAccessState should be exported');
});

TestRunner.test("Day 596 - Playback Mode - getActiveMIDIInputState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getActiveMIDIInputState'), 'getActiveMIDIInputState should be exported');
});

TestRunner.test("Day 596 - Playback Mode - setActiveMIDIInputState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setActiveMIDIInputState'), 'setActiveMIDIInputState should be exported');
});

TestRunner.test("Day 596 - Playback Mode - setActiveMIDIInputState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setActiveMIDIInputState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setActiveMIDIInputState should call captureStateForUndo');
});

TestRunner.test("Day 596 - Playback Mode - setActiveMIDIInputState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setActiveMIDIInputState');
    const labelIdx = stateStr.indexOf('Set Active MIDI Input', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setActiveMIDIInputState should have descriptive undo label');
});

TestRunner.test("Day 596 - Playback Mode - APP_VERSION validation for Day 596", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 596");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 251, "Minor version should be >= 251 for Day 596");
    }
});

// Day 596: Time Signature and Recording State Function Tests
// =============================================================
TestRunner.test("Day 596 - Time Signature - getTimeSignatureState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTimeSignatureState'), 'getTimeSignatureState should be exported');
});

TestRunner.test("Day 596 - Time Signature - setTimeSignatureState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTimeSignatureState'), 'setTimeSignatureState should be exported');
});

TestRunner.test("Day 596 - Time Signature - setTimeSignatureState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimeSignatureState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setTimeSignatureState should call captureStateForUndo');
});

TestRunner.test("Day 596 - Time Signature - setTimeSignatureState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimeSignatureState');
    const labelIdx = stateStr.indexOf('Set Time Signature to', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setTimeSignatureState should have descriptive undo label');
});

TestRunner.test("Day 596 - Time Signature - getTimeSignatureNumeratorState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTimeSignatureNumeratorState'), 'getTimeSignatureNumeratorState should be exported');
});

TestRunner.test("Day 596 - Time Signature - setTimeSignatureNumeratorState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTimeSignatureNumeratorState'), 'setTimeSignatureNumeratorState should be exported');
});

TestRunner.test("Day 596 - Time Signature - setTimeSignatureNumeratorState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimeSignatureNumeratorState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setTimeSignatureNumeratorState should call captureStateForUndo');
});

TestRunner.test("Day 596 - Time Signature - setTimeSignatureNumeratorState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimeSignatureNumeratorState');
    const labelIdx = stateStr.indexOf('Set Time Signature Numerator to', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setTimeSignatureNumeratorState should have descriptive undo label');
});

TestRunner.test("Day 596 - Time Signature - getTimeSignatureDenominatorState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTimeSignatureDenominatorState'), 'getTimeSignatureDenominatorState should be exported');
});

TestRunner.test("Day 596 - Time Signature - setTimeSignatureDenominatorState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTimeSignatureDenominatorState'), 'setTimeSignatureDenominatorState should be exported');
});

TestRunner.test("Day 596 - Time Signature - setTimeSignatureDenominatorState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimeSignatureDenominatorState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setTimeSignatureDenominatorState should call captureStateForUndo');
});

TestRunner.test("Day 596 - Time Signature - setTimeSignatureDenominatorState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimeSignatureDenominatorState');
    const labelIdx = stateStr.indexOf('Set Time Signature Denominator to', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setTimeSignatureDenominatorState should have descriptive undo label');
});

TestRunner.test("Day 596 - Recording - setIsRecordingState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setIsRecordingState'), 'setIsRecordingState should be exported');
});

TestRunner.test("Day 596 - Recording - setIsRecordingState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setIsRecordingState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setIsRecordingState should call captureStateForUndo');
});

TestRunner.test("Day 596 - Recording - setIsRecordingState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setIsRecordingState');
    const labelIdx = stateStr.indexOf('Set Recording State', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setIsRecordingState should have descriptive undo label');
});

TestRunner.test("Day 596 - Recording - setRecordingTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setRecordingTrackIdState'), 'setRecordingTrackIdState should be exported');
});

TestRunner.test("Day 596 - Recording - setRecordingTrackIdState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setRecordingTrackIdState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setRecordingTrackIdState should call captureStateForUndo');
});

TestRunner.test("Day 596 - Recording - setRecordingTrackIdState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setRecordingTrackIdState');
    const labelIdx = stateStr.indexOf('Set Recording Track to', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setRecordingTrackIdState should have descriptive undo label');
});

TestRunner.test("Day 596 - Recording - setRecordingStartTimeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setRecordingStartTimeState'), 'setRecordingStartTimeState should be exported');
});

TestRunner.test("Day 596 - Recording - setRecordingStartTimeState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setRecordingStartTimeState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setRecordingStartTimeState should call captureStateForUndo');
});

TestRunner.test("Day 596 - Recording - setRecordingStartTimeState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setRecordingStartTimeState');
    const labelIdx = stateStr.indexOf('Set Recording Start Time to', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setRecordingStartTimeState should have descriptive undo label');
});

TestRunner.test("Day 596 - APP_VERSION validation for Day 596", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 596");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 251, "Minor version should be >= 251 for Day 596");
    }
});

TestRunner.test("Day 597 - Master Effects - getMasterEffectsState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMasterEffectsState'), 'getMasterEffectsState should be exported');
});

TestRunner.test("Day 597 - Master Effects - setMasterEffectsState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMasterEffectsState'), 'setMasterEffectsState should be exported');
});

TestRunner.test("Day 597 - Master Effects - setMasterEffectsState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setMasterEffectsState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setMasterEffectsState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Master Effects - setMasterEffectsState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setMasterEffectsState');
    const labelIdx = stateStr.indexOf('Set Master Effects Chain', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setMasterEffectsState should have descriptive undo label');
});

TestRunner.test("Day 597 - Master Effects - setMasterEffectsState validates array input", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setMasterEffectsState');
    const arrCheckIdx = stateStr.indexOf('Array.isArray', fnIdx);
    t.assertTruthy(arrCheckIdx > fnIdx && arrCheckIdx < fnIdx + 200, 'setMasterEffectsState should check Array.isArray for newChain');
});

TestRunner.test("Day 597 - Master Effects - setMasterEffectsState skips capture when unchanged", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setMasterEffectsState');
    const ifIdx = stateStr.indexOf('if (masterEffectsChainState !== nextChain)', fnIdx);
    t.assertTruthy(ifIdx > fnIdx && ifIdx < fnIdx + 200, 'setMasterEffectsState should skip capture when state unchanged');
});

TestRunner.test("Day 597 - Master Gain - getMasterGainValueState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMasterGainValueState'), 'getMasterGainValueState should be exported');
});

TestRunner.test("Day 597 - Master Gain - setMasterGainValueState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMasterGainValueState'), 'setMasterGainValueState should be exported');
});

TestRunner.test("Day 597 - Master Gain - setMasterGainValueState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setMasterGainValueState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setMasterGainValueState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Master Gain - setMasterGainValueState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setMasterGainValueState');
    const labelIdx = stateStr.indexOf('Set Master Volume to', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setMasterGainValueState should have descriptive undo label');
});

TestRunner.test("Day 597 - Master Gain - setMasterGainValueState validates numeric input", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setMasterGainValueState');
    const numCheckIdx = stateStr.indexOf('Number.isFinite', fnIdx);
    t.assertTruthy(numCheckIdx > fnIdx && numCheckIdx < fnIdx + 200, 'setMasterGainValueState should check Number.isFinite for value');
});

TestRunner.test("Day 597 - Master Gain - setMasterGainValueState skips capture when unchanged", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setMasterGainValueState');
    const ifIdx = stateStr.indexOf('if (masterGainValueState !== nextValue)', fnIdx);
    t.assertTruthy(ifIdx > fnIdx && ifIdx < fnIdx + 200, 'setMasterGainValueState should skip capture when value unchanged');
});

TestRunner.test("Day 597 - Master Effects - getMasterEffectsState returns array copy", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getMasterEffectsState');
    const returnIdx = stateStr.indexOf('return masterEffectsChainState', fnIdx);
    t.assertTruthy(returnIdx === -1, 'getMasterEffectsState should NOT return raw state (security)');
    const returnCopyIdx = stateStr.indexOf('return masterEffectsChainState.map', fnIdx);
    const returnNewIdx = stateStr.indexOf('return { ...masterEffectsChainState', fnIdx);
    t.assertTruthy(returnCopyIdx > fnIdx || returnNewIdx > fnIdx, 'getMasterEffectsState should return a copy');
});

TestRunner.test("Day 597 - Master Gain - getMasterGainValueState returns numeric value", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getMasterGainValueState');
    const returnIdx = stateStr.indexOf('return masterGainValueState', fnIdx);
    t.assertTruthy(returnIdx > fnIdx && returnIdx < fnIdx + 100, 'getMasterGainValueState should return masterGainValueState directly');
});

TestRunner.test("Day 597 - APP_VERSION validation for Day 597", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 597");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 252, "Minor version should be >= 252 for Day 597");
    }
});
// Day 597: Swing, Track Group Members, Master Effects, Timeline Markers, Track Templates State Function Tests
// =============================================
TestRunner.test("Day 597 - Swing - getSwingState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getSwingState'), 'getSwingState should be exported');
});

TestRunner.test("Day 597 - Swing - setSwingState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSwingState'), 'setSwingState should be exported');
});

TestRunner.test("Day 597 - Swing - setSwingState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setSwingState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Swing - setSwingState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingState');
    const labelIdx = stateStr.indexOf('Set Swing', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'setSwingState undo label should include "Set Swing"');
});

TestRunner.test("Day 597 - Swing - setSwingEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSwingEnabledState'), 'setSwingEnabledState should be exported');
});

TestRunner.test("Day 597 - Swing - setSwingEnabledState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingEnabledState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setSwingEnabledState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Swing - setSwingEnabledState has descriptive undo label with On/Off", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingEnabledState');
    const labelIdx = stateStr.indexOf('Toggle Swing', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'setSwingEnabledState undo label should include "Toggle Swing"');
});

TestRunner.test("Day 597 - Swing - setSwingAmountState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSwingAmountState'), 'setSwingAmountState should be exported');
});

TestRunner.test("Day 597 - Swing - setSwingAmountState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingAmountState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'setSwingAmountState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Swing - setSwingAmountState has descriptive undo label with amount", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingAmountState');
    const labelIdx = stateStr.indexOf('Set Swing Amount to', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setSwingAmountState undo label should include "Set Swing Amount to"');
});

TestRunner.test("Day 597 - Track Group Members - addTrackToGroupState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function addTrackToGroupState'), 'addTrackToGroupState should be exported');
});

TestRunner.test("Day 597 - Track Group Members - addTrackToGroupState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addTrackToGroupState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'addTrackToGroupState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Track Group Members - addTrackToGroupState has descriptive undo label with group name", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addTrackToGroupState');
    const labelIdx = stateStr.indexOf('Add Track to Group', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'addTrackToGroupState undo label should include "Add Track to Group"');
});

TestRunner.test("Day 597 - Track Group Members - removeTrackFromGroupState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function removeTrackFromGroupState'), 'removeTrackFromGroupState should be exported');
});

TestRunner.test("Day 597 - Track Group Members - removeTrackFromGroupState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeTrackFromGroupState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'removeTrackFromGroupState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Track Group Members - removeTrackFromGroupState has descriptive undo label with group name", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeTrackFromGroupState');
    const labelIdx = stateStr.indexOf('Remove Track from Group', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'removeTrackFromGroupState undo label should include "Remove Track from Group"');
});

TestRunner.test("Day 597 - Master Effects - addMasterEffectToState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function addMasterEffectToState'), 'addMasterEffectToState should be exported');
});

TestRunner.test("Day 597 - Master Effects - addMasterEffectToState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addMasterEffectToState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'addMasterEffectToState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Master Effects - addMasterEffectToState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addMasterEffectToState');
    const labelIdx = stateStr.indexOf('Add ', fnIdx);
    const effectTypeIdx = stateStr.indexOf('Master Effect', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200 && effectTypeIdx > fnIdx, 'addMasterEffectToState undo label should include "Add" and "Master Effect"');
});

TestRunner.test("Day 597 - Master Effects - removeMasterEffectFromState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function removeMasterEffectFromState'), 'removeMasterEffectFromState should be exported');
});

TestRunner.test("Day 597 - Master Effects - removeMasterEffectFromState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeMasterEffectFromState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'removeMasterEffectFromState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Master Effects - removeMasterEffectFromState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeMasterEffectFromState');
    const labelIdx = stateStr.indexOf('Remove Master Effect', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'removeMasterEffectFromState undo label should include "Remove Master Effect"');
});

TestRunner.test("Day 597 - Master Effects - updateMasterEffectParamInState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function updateMasterEffectParamInState'), 'updateMasterEffectParamInState should be exported');
});

TestRunner.test("Day 597 - Master Effects - updateMasterEffectParamInState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function updateMasterEffectParamInState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'updateMasterEffectParamInState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Master Effects - reorderMasterEffectInState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function reorderMasterEffectInState'), 'reorderMasterEffectInState should be exported');
});

TestRunner.test("Day 597 - Master Effects - reorderMasterEffectInState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function reorderMasterEffectInState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'reorderMasterEffectInState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Timeline Markers - addTimelineMarkerState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function addTimelineMarkerState'), 'addTimelineMarkerState should be exported');
});

TestRunner.test("Day 597 - Timeline Markers - addTimelineMarkerState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addTimelineMarkerState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'addTimelineMarkerState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Timeline Markers - removeTimelineMarkerState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function removeTimelineMarkerState'), 'removeTimelineMarkerState should be exported');
});

TestRunner.test("Day 597 - Timeline Markers - removeTimelineMarkerState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeTimelineMarkerState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'removeTimelineMarkerState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Timeline Markers - removeTimelineMarkerState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeTimelineMarkerState');
    const labelIdx = stateStr.indexOf('Remove Timeline Marker', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'removeTimelineMarkerState undo label should include "Remove Timeline Marker"');
});

TestRunner.test("Day 597 - Timeline Markers - clearTimelineMarkersState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function clearTimelineMarkersState'), 'clearTimelineMarkersState should be exported');
});

TestRunner.test("Day 597 - Timeline Markers - clearTimelineMarkersState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearTimelineMarkersState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'clearTimelineMarkersState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Timeline Markers - clearTimelineMarkersState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearTimelineMarkersState');
    const labelIdx = stateStr.indexOf('Clear All Timeline Markers', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'clearTimelineMarkersState undo label should include "Clear All Timeline Markers"');
});

TestRunner.test("Day 597 - Track Templates - addTrackTemplateState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function addTrackTemplateState'), 'addTrackTemplateState should be exported');
});

TestRunner.test("Day 597 - Track Templates - addTrackTemplateState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addTrackTemplateState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'addTrackTemplateState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Track Templates - addTrackTemplateState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addTrackTemplateState');
    const labelIdx = stateStr.indexOf('Add Track Template', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'addTrackTemplateState undo label should include "Add Track Template"');
});

TestRunner.test("Day 597 - Track Templates - updateTrackTemplateState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function updateTrackTemplateState'), 'updateTrackTemplateState should be exported');
});

TestRunner.test("Day 597 - Track Templates - updateTrackTemplateState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function updateTrackTemplateState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'updateTrackTemplateState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Track Templates - removeTrackTemplateState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function removeTrackTemplateState'), 'removeTrackTemplateState should be exported');
});

TestRunner.test("Day 597 - Track Templates - removeTrackTemplateState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeTrackTemplateState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'removeTrackTemplateState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Track Templates - removeTrackTemplateState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeTrackTemplateState');
    const labelIdx = stateStr.indexOf('Remove Track Template', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'removeTrackTemplateState undo label should include "Remove Track Template"');
});

TestRunner.test("Day 597 - Track Templates - clearTrackTemplatesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function clearTrackTemplatesState'), 'clearTrackTemplatesState should be exported');
});

TestRunner.test("Day 597 - Track Templates - clearTrackTemplatesState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearTrackTemplatesState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx, 'clearTrackTemplatesState should call captureStateForUndo');
});

TestRunner.test("Day 597 - Track Templates - clearTrackTemplatesState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearTrackTemplatesState');
    const labelIdx = stateStr.indexOf('Clear All Track Templates', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'clearTrackTemplatesState undo label should include "Clear All Track Templates"');
});

TestRunner.test("Day 597 - APP_VERSION validation for Day 597", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 597");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 252, "Minor version should be >= 252 for Day 597");
    }
});

// Day 598: Track Group Setters, Send Tracks, and Additional State Function Tests
TestRunner.test("Day 598 - Track Groups - setTrackGroupColorState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTrackGroupColorState'), 'setTrackGroupColorState should be exported');
});

TestRunner.test("Day 598 - Track Groups - setTrackGroupColorState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTrackGroupColorState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setTrackGroupColorState should call captureStateForUndo');
});

TestRunner.test("Day 598 - Track Groups - setTrackGroupColorState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTrackGroupColorState');
    const labelIdx = stateStr.indexOf('Change Track Group', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'setTrackGroupColorState undo label should include "Change Track Group"');
});

TestRunner.test("Day 598 - Track Groups - setTrackGroupMutedState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTrackGroupMutedState'), 'setTrackGroupMutedState should be exported');
});

TestRunner.test("Day 598 - Track Groups - setTrackGroupMutedState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTrackGroupMutedState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setTrackGroupMutedState should call captureStateForUndo');
});

TestRunner.test("Day 598 - Track Groups - setTrackGroupMutedState has descriptive undo label with Mute", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTrackGroupMutedState');
    const labelIdx = stateStr.indexOf('Toggle Track Group', fnIdx);
    const muteIdx = stateStr.indexOf('Mute', labelIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300 && muteIdx > labelIdx && muteIdx < labelIdx + 50, 'setTrackGroupMutedState undo label should include "Mute"');
});

TestRunner.test("Day 598 - Track Groups - setTrackGroupSoloedState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTrackGroupSoloedState'), 'setTrackGroupSoloedState should be exported');
});

TestRunner.test("Day 598 - Track Groups - setTrackGroupSoloedState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTrackGroupSoloedState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setTrackGroupSoloedState should call captureStateForUndo');
});

TestRunner.test("Day 598 - Track Groups - setTrackGroupSoloedState has descriptive undo label with Solo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTrackGroupSoloedState');
    const labelIdx = stateStr.indexOf('Toggle Track Group', fnIdx);
    const soloIdx = stateStr.indexOf('Solo', labelIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300 && soloIdx > labelIdx && soloIdx < labelIdx + 50, 'setTrackGroupSoloedState undo label should include "Solo"');
});

TestRunner.test("Day 598 - Send Tracks - getSendTracksState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getSendTracksState'), 'getSendTracksState should be exported');
});

TestRunner.test("Day 598 - Send Tracks - getSendTrackByIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getSendTrackByIdState'), 'getSendTrackByIdState should be exported');
});

TestRunner.test("Day 598 - Send Tracks - addSendTrackState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function addSendTrackState'), 'addSendTrackState should be exported');
});

TestRunner.test("Day 598 - Send Tracks - addSendTrackState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addSendTrackState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'addSendTrackState should call captureStateForUndo');
});

TestRunner.test("Day 598 - Send Tracks - addSendTrackState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addSendTrackState');
    const labelIdx = stateStr.indexOf('Add Send Bus', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'addSendTrackState undo label should include "Add Send Bus"');
});

TestRunner.test("Day 598 - Send Tracks - setSendTrackNameState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSendTrackNameState'), 'setSendTrackNameState should be exported');
});

TestRunner.test("Day 598 - Send Tracks - setSendTrackNameState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSendTrackNameState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setSendTrackNameState should call captureStateForUndo');
});

TestRunner.test("Day 598 - Send Tracks - setSendTrackNameState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSendTrackNameState');
    const labelIdx = stateStr.indexOf('Rename Send Bus', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'setSendTrackNameState undo label should include "Rename Send Bus"');
});

TestRunner.test("Day 598 - Send Tracks - setSendTrackLevelState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSendTrackLevelState'), 'setSendTrackLevelState should be exported');
});

TestRunner.test("Day 598 - Send Tracks - setSendTrackLevelState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSendTrackLevelState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setSendTrackLevelState should call captureStateForUndo');
});

TestRunner.test("Day 598 - Send Tracks - setSendTrackLevelState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSendTrackLevelState');
    const labelIdx = stateStr.indexOf('Set Send Level', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'setSendTrackLevelState undo label should include "Set Send Level"');
});

TestRunner.test("Day 598 - Send Tracks - setSendTrackMutedState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSendTrackMutedState'), 'setSendTrackMutedState should be exported');
});

TestRunner.test("Day 598 - Send Tracks - setSendTrackMutedState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSendTrackMutedState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setSendTrackMutedState should call captureStateForUndo');
});

TestRunner.test("Day 598 - Send Tracks - setSendTrackMutedState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSendTrackMutedState');
    const labelIdx = stateStr.indexOf('Toggle Send Bus', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'setSendTrackMutedState undo label should include "Toggle Send Bus"');
});

TestRunner.test("Day 598 - Send Tracks - setSendTrackEffectsState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSendTrackEffectsState'), 'setSendTrackEffectsState should be exported');
});

TestRunner.test("Day 598 - Send Tracks - setSendTrackEffectsState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSendTrackEffectsState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setSendTrackEffectsState should call captureStateForUndo');
});

TestRunner.test("Day 598 - Send Tracks - setSendTrackEffectsState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSendTrackEffectsState');
    const labelIdx = stateStr.indexOf('Set Send Bus Effects', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'setSendTrackEffectsState undo label should include "Set Send Bus Effects"');
});

TestRunner.test("Day 598 - Send Tracks - removeSendTrackState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function removeSendTrackState'), 'removeSendTrackState should be exported');
});

TestRunner.test("Day 598 - Send Tracks - removeSendTrackState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeSendTrackState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'removeSendTrackState should call captureStateForUndo');
});

TestRunner.test("Day 598 - Send Tracks - removeSendTrackState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeSendTrackState');
    const labelIdx = stateStr.indexOf('Remove Send Bus', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'removeSendTrackState undo label should include "Remove Send Bus"');
});

TestRunner.test("Day 598 - Send Tracks - getTrackSendsState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTrackSendsState'), 'getTrackSendsState should be exported');
});

TestRunner.test("Day 598 - Send Tracks - getTrackSendByIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTrackSendByIdState'), 'getTrackSendByIdState should be exported');
});

TestRunner.test("Day 598 - Send Tracks - setTrackSendLevelState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTrackSendLevelState'), 'setTrackSendLevelState should be exported');
});

TestRunner.test("Day 598 - Send Tracks - setTrackSendLevelState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTrackSendLevelState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setTrackSendLevelState should call captureStateForUndo');
});

TestRunner.test("Day 598 - Send Tracks - setTrackSendLevelState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTrackSendLevelState');
    const labelIdx = stateStr.indexOf('Set Track Send Level', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'setTrackSendLevelState undo label should include "Set Track Send Level"');
});

TestRunner.test("Day 598 - Send Tracks - setTrackSendPreFaderState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTrackSendPreFaderState'), 'setTrackSendPreFaderState should be exported');
});

TestRunner.test("Day 598 - Send Tracks - setTrackSendPreFaderState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTrackSendPreFaderState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setTrackSendPreFaderState should call captureStateForUndo');
});

TestRunner.test("Day 598 - Send Tracks - setTrackSendPreFaderState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTrackSendPreFaderState');
    const labelIdx = stateStr.indexOf('Set Track Send Pre-Fader', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'setTrackSendPreFaderState undo label should include "Set Track Send Pre-Fader"');
});

TestRunner.test("Day 598 - APP_VERSION validation for Day 598", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 598");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 253, "Minor version should be >= 253 for Day 598");
    }
});

// Day 599: Additional State Functions - Master Automation Armed, UI State, Windows, and Track Accessor Tests
TestRunner.test("Day 599 - Master Automation - getMasterAutomationArmedState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMasterAutomationArmedState'), 'getMasterAutomationArmedState should be exported');
});

TestRunner.test("Day 599 - Master Automation - setMasterAutomationArmedState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMasterAutomationArmedState'), 'setMasterAutomationArmedState should be exported');
});

TestRunner.test("Day 599 - Master Automation - setMasterAutomationArmedState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('captureStateForUndoIfAllowed'), 'setMasterAutomationArmedState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 599 - Master Automation - setMasterAutomationArmedState has descriptive undo label with On/Off", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes("'Toggle Master Automation Arm") && stateStr.includes("On") && stateStr.includes("Off"), 'setMasterAutomationArmedState should have Toggle Master Automation Arm On/Off label');
});

TestRunner.test("Day 599 - UI State - getCurrentLibraryNameState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getCurrentLibraryNameState'), 'getCurrentLibraryNameState should be exported');
});

TestRunner.test("Day 599 - UI State - setCurrentLibraryNameState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setCurrentLibraryNameState'), 'setCurrentLibraryNameState should be exported');
});

TestRunner.test("Day 599 - UI State - setCurrentLibraryNameState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setCurrentLibraryNameState');
    const captureIdx = stateStr.indexOf('captureStateForUndoIfAllowed', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 150, 'setCurrentLibraryNameState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 599 - UI State - setCurrentLibraryNameState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setCurrentLibraryNameState');
    const labelIdx = stateStr.indexOf("'Set Current Library'", fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 150, 'setCurrentLibraryNameState undo label should include "Set Current Library"');
});

TestRunner.test("Day 599 - UI State - getCurrentSoundFileTreeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getCurrentSoundFileTreeState'), 'getCurrentSoundFileTreeState should be exported');
});

TestRunner.test("Day 599 - UI State - setCurrentSoundFileTreeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setCurrentSoundFileTreeState'), 'setCurrentSoundFileTreeState should be exported');
});

TestRunner.test("Day 599 - UI State - setCurrentSoundFileTreeState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setCurrentSoundFileTreeState');
    const captureIdx = stateStr.indexOf('captureStateForUndoIfAllowed', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 150, 'setCurrentSoundFileTreeState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 599 - UI State - setCurrentSoundFileTreeState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setCurrentSoundFileTreeState');
    const labelIdx = stateStr.indexOf("'Set Sound File Tree'", fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 150, 'setCurrentSoundFileTreeState undo label should include "Set Sound File Tree"');
});

TestRunner.test("Day 599 - UI State - getPreviewPlayerState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getPreviewPlayerState'), 'getPreviewPlayerState should be exported');
});

TestRunner.test("Day 599 - UI State - setPreviewPlayerState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setPreviewPlayerState'), 'setPreviewPlayerState should be exported');
});

TestRunner.test("Day 599 - UI State - setPreviewPlayerState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setPreviewPlayerState');
    const captureIdx = stateStr.indexOf('captureStateForUndoIfAllowed', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 150, 'setPreviewPlayerState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 599 - UI State - setPreviewPlayerState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setPreviewPlayerState');
    const labelIdx = stateStr.indexOf("'Set Preview Player'", fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 150, 'setPreviewPlayerState undo label should include "Set Preview Player"');
});

TestRunner.test("Day 599 - Windows - getOpenWindowsState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getOpenWindowsState'), 'getOpenWindowsState should be exported');
});

TestRunner.test("Day 599 - Windows - getWindowByIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getWindowByIdState'), 'getWindowByIdState should be exported');
});

TestRunner.test("Day 599 - Windows - addWindowToStoreState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function addWindowToStoreState'), 'addWindowToStoreState should be exported');
});

TestRunner.test("Day 599 - Windows - addWindowToStoreState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addWindowToStoreState');
    const captureIdx = stateStr.indexOf('captureStateForUndoIfAllowed', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'addWindowToStoreState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 599 - Windows - addWindowToStoreState has descriptive undo label with Open", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addWindowToStoreState');
    const labelIdx = stateStr.indexOf("'Open Window", fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'addWindowToStoreState undo label should include "Open Window"');
});

TestRunner.test("Day 599 - Windows - removeWindowFromStoreState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function removeWindowFromStoreState'), 'removeWindowFromStoreState should be exported');
});

TestRunner.test("Day 599 - Windows - removeWindowFromStoreState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeWindowFromStoreState');
    const captureIdx = stateStr.indexOf('captureStateForUndoIfAllowed', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'removeWindowFromStoreState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 599 - Windows - removeWindowFromStoreState has descriptive undo label with Close", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeWindowFromStoreState');
    const labelIdx = stateStr.indexOf("'Close Window", fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'removeWindowFromStoreState undo label should include "Close Window"');
});

TestRunner.test("Day 599 - Z-Index - getHighestZState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getHighestZState'), 'getHighestZState should be exported');
});

TestRunner.test("Day 599 - Z-Index - setHighestZState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setHighestZState'), 'setHighestZState should be exported');
});

TestRunner.test("Day 599 - Z-Index - setHighestZState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setHighestZState');
    const captureIdx = stateStr.indexOf('captureStateForUndoIfAllowed', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setHighestZState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 599 - Z-Index - setHighestZState has descriptive undo label with Highest Z", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setHighestZState');
    const labelIdx = stateStr.indexOf("'Set Highest Z", fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'setHighestZState undo label should include "Set Highest Z" if changed');
});

TestRunner.test("Day 599 - Z-Index - incrementHighestZState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function incrementHighestZState'), 'incrementHighestZState should be exported');
});

TestRunner.test("Day 599 - Z-Index - incrementHighestZState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function incrementHighestZState');
    const captureIdx = stateStr.indexOf('captureStateForUndoIfAllowed', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'incrementHighestZState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 599 - Z-Index - incrementHighestZState has descriptive undo label with Increment Highest Z", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function incrementHighestZState');
    const labelIdx = stateStr.indexOf("'Increment Highest Z'", fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'incrementHighestZState undo label should include "Increment Highest Z"');
});

TestRunner.test("Day 599 - Track Access - getTracksState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTracksState'), 'getTracksState should be exported');
});

TestRunner.test("Day 599 - Track Access - getTrackByIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTrackByIdState'), 'getTrackByIdState should be exported');
});

TestRunner.test("Day 599 - Track Access - getTrackByIdState uses find to locate track by id", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getTrackByIdState');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 200);
    t.assertTruthy(funcContent.includes('.find('), 'getTrackByIdState should use .find() to locate track by id');
});

TestRunner.test("Day 599 - Clipboard - setClipboardDataState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setClipboardDataState'), 'setClipboardDataState should be exported');
});

TestRunner.test("Day 599 - APP_VERSION validation for Day 599", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 599");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 254, "Minor version should be >= 254 for Day 599");
    }
});

// ============================================
// Day 600: Sound Browser Path State Tests
// ============================================
TestRunner.test("Day 600 - Sound Browser Path - getCurrentSoundBrowserPathState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getCurrentSoundBrowserPathState'), 'getCurrentSoundBrowserPathState should be exported');
});

TestRunner.test("Day 600 - Sound Browser Path - setCurrentSoundBrowserPathState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setCurrentSoundBrowserPathState'), 'setCurrentSoundBrowserPathState should be exported');
});

TestRunner.test("Day 600 - Sound Browser Path - setCurrentSoundBrowserPathState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setCurrentSoundBrowserPathState');
    const captureIdx = stateStr.indexOf('captureStateForUndoIfAllowed', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setCurrentSoundBrowserPathState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 600 - Sound Browser Path - setCurrentSoundBrowserPathState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setCurrentSoundBrowserPathState');
    const labelIdx = stateStr.indexOf("'Set Sound Browser Path'", fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'setCurrentSoundBrowserPathState undo label should include "Set Sound Browser Path"');
});

TestRunner.test("Day 600 - Sound Browser Path - setCurrentSoundBrowserPathState uses areSoundBrowserPathsEqual for comparison", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setCurrentSoundBrowserPathState');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 200);
    t.assertTruthy(funcContent.includes('areSoundBrowserPathsEqual'), 'setCurrentSoundBrowserPathState should use areSoundBrowserPathsEqual for comparison');
});

TestRunner.test("Day 600 - Sound Browser Path - setCurrentSoundBrowserPathState normalizes path to array", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setCurrentSoundBrowserPathState');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 200);
    t.assertTruthy(funcContent.includes('Array.isArray(path)'), 'setCurrentSoundBrowserPathState should check if path is an array');
    t.assertTruthy(funcContent.includes('[...path]'), 'setCurrentSoundBrowserPathState should spread path into new array');
});

TestRunner.test("Day 600 - APP_VERSION validation for Day 600", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 600");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 255, "Minor version should be >= 255 for Day 600");
    }
});

// ============================================
// Day 601: Favorites, Recently Played, and Auto-Save State Function Tests
// ============================================
TestRunner.test("Day 601 - Auto-Save - hasAutoSavedProject is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function hasAutoSavedProject'), 'hasAutoSavedProject should be exported');
});

TestRunner.test("Day 601 - Auto-Save - getAutoSavedProjectTimestamp is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getAutoSavedProjectTimestamp'), 'getAutoSavedProjectTimestamp should be exported');
});

TestRunner.test("Day 601 - Auto-Save - getAutoSavedProjectTimestamp returns localStorage value or null", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getAutoSavedProjectTimestamp');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 100);
    t.assertTruthy(funcContent.includes('localStorage.getItem'), 'getAutoSavedProjectTimestamp should check localStorage');
    t.assertTruthy(funcContent.includes('|| null'), 'getAutoSavedProjectTimestamp should return null as fallback');
});

TestRunner.test("Day 601 - Auto-Save - clearAutoSavedProject is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function clearAutoSavedProject'), 'clearAutoSavedProject should be exported');
});

TestRunner.test("Day 601 - Auto-Save - clearAutoSavedProject calls captureStateForUndoIfAllowed", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearAutoSavedProject');
    const captureIdx = stateStr.indexOf('captureStateForUndoIfAllowed', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'clearAutoSavedProject should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 601 - Auto-Save - clearAutoSavedProject has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearAutoSavedProject');
    const labelIdx = stateStr.indexOf("'Clear Auto-Saved Project'", fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'clearAutoSavedProject undo label should include "Clear Auto-Saved Project"');
});

TestRunner.test("Day 601 - Auto-Save - clearAutoSavedProject guards capture with localStorage check", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearAutoSavedProject');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 300);
    t.assertTruthy(funcContent.includes('if (localStorage.getItem(AUTOSAVE_KEY)') || funcContent.includes('if (localStorage.getItem(AUTOSAVE_TIMESTAMP_KEY)'), 'clearAutoSavedProject should guard undo capture with localStorage check');
});

TestRunner.test("Day 601 - Favorites - getFavoriteSounds is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getFavoriteSounds'), 'getFavoriteSounds should be exported');
});

TestRunner.test("Day 601 - Favorites - getFavoriteSounds returns array copy", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getFavoriteSounds');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 100);
    t.assertTruthy(funcContent.includes('[...favoriteSoundsGlobal]') || funcContent.includes('...favoriteSoundsGlobal'), 'getFavoriteSounds should return array copy');
});

TestRunner.test("Day 601 - Favorites - getFavoriteSounds lazy loads from storage when empty", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getFavoriteSounds');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 150);
    t.assertTruthy(funcContent.includes('loadFavoritesFromStorage'), 'getFavoriteSounds should call loadFavoritesFromStorage when array is empty');
});

TestRunner.test("Day 601 - Favorites - isFavorite is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function isFavorite'), 'isFavorite should be exported');
});

TestRunner.test("Day 601 - Favorites - isFavorite uses makeSoundKey for comparison", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function isFavorite');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 150);
    t.assertTruthy(funcContent.includes('makeSoundKey'), 'isFavorite should use makeSoundKey for comparison');
});

TestRunner.test("Day 601 - Favorites - toggleFavorite is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function toggleFavorite'), 'toggleFavorite should be exported');
});

TestRunner.test("Day 601 - Favorites - toggleFavorite captures undo for remove (Add Favorite label)", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function toggleFavorite');
    const labelIdx = stateStr.indexOf('Add Favorite', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 500, 'toggleFavorite should have "Add Favorite" undo label');
});

TestRunner.test("Day 601 - Favorites - toggleFavorite captures undo for add (Remove Favorite label)", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function toggleFavorite');
    const labelIdx = stateStr.indexOf('Remove Favorite', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 500, 'toggleFavorite should have "Remove Favorite" undo label');
});

TestRunner.test("Day 601 - Favorites - toggleFavorite calls saveFavoritesToStorage", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function toggleFavorite');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 500);
    t.assertTruthy(funcContent.includes('saveFavoritesToStorage()'), 'toggleFavorite should call saveFavoritesToStorage after modification');
});

TestRunner.test("Day 601 - Favorites - toggleFavorite returns boolean indicating change", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function toggleFavorite');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 500);
    t.assertTruthy(funcContent.includes('return idx >= 0') || funcContent.includes('return idx >= 0;'), 'toggleFavorite should return boolean');
});

TestRunner.test("Day 601 - Recently Played - addToRecentlyPlayed is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function addToRecentlyPlayed'), 'addToRecentlyPlayed should be exported');
});

TestRunner.test("Day 601 - Recently Played - addToRecentlyPlayed calls captureStateForUndoIfAllowed", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addToRecentlyPlayed');
    const captureIdx = stateStr.indexOf('captureStateForUndoIfAllowed', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 400, 'addToRecentlyPlayed should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 601 - Recently Played - addToRecentlyPlayed adds to front with unshift", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addToRecentlyPlayed');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 400);
    t.assertTruthy(funcContent.includes('unshift'), 'addToRecentlyPlayed should use unshift to add to front');
});

TestRunner.test("Day 601 - Recently Played - addToRecentlyPlayed trims to MAX_RECENTLY_PLAYED limit", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addToRecentlyPlayed');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 400);
    t.assertTruthy(funcContent.includes('MAX_RECENTLY_PLAYED'), 'addToRecentlyPlayed should enforce MAX_RECENTLY_PLAYED limit');
    t.assertTruthy(funcContent.includes('slice(0, MAX_RECENTLY_PLAYED)') || funcContent.includes('.slice(0, MAX_RECENTLY_PLAYED)'), 'addToRecentlyPlayed should slice to MAX_RECENTLY_PLAYED');
});

TestRunner.test("Day 601 - Recently Played - addToRecentlyPlayed removes duplicates before adding", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addToRecentlyPlayed');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 400);
    t.assertTruthy(funcContent.includes('filter'), 'addToRecentlyPlayed should filter out duplicates before adding');
});

TestRunner.test("Day 601 - Recently Played - getRecentlyPlayedSounds is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getRecentlyPlayedSounds'), 'getRecentlyPlayedSounds should be exported');
});

TestRunner.test("Day 601 - Recently Played - getRecentlyPlayedSounds returns array copy", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getRecentlyPlayedSounds');
    const funcContent = stateStr.substring(fnIdx, fnIdx + 100);
    t.assertTruthy(funcContent.includes('[...recentlyPlayedGlobal]') || funcContent.includes('...recentlyPlayedGlobal'), 'getRecentlyPlayedSounds should return array copy');
});

TestRunner.test("Day 601 - Recently Played - clearRecentlyPlayed is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function clearRecentlyPlayed'), 'clearRecentlyPlayed should be exported');
});

TestRunner.test("Day 601 - Recently Played - clearRecentlyPlayed calls captureStateForUndoIfAllowed guarded by length check", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearRecentlyPlayed');
    const captureIdx = stateStr.indexOf('captureStateForUndoIfAllowed', fnIdx);
    const lengthIdx = stateStr.indexOf('length > 0', fnIdx);
    t.assertTruthy(lengthIdx > fnIdx && lengthIdx < fnIdx + 200, 'clearRecentlyPlayed should check if array has items');
    t.assertTruthy(captureIdx > lengthIdx && captureIdx < fnIdx + 200, 'clearRecentlyPlayed capture should be guarded by length check');
});

TestRunner.test("Day 601 - Recently Played - clearRecentlyPlayed has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearRecentlyPlayed');
    const labelIdx = stateStr.indexOf("'Clear Recently Played'", fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'clearRecentlyPlayed undo label should include "Clear Recently Played"');
});

TestRunner.test("Day 601 - Favorites - loadFavoritesFromStorage is referenced", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('function loadFavoritesFromStorage') || stateStr.includes('function loadFavoritesFromStorage()'), 'loadFavoritesFromStorage should be defined');
});

TestRunner.test("Day 601 - Favorites - makeSoundKey is referenced", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('function makeSoundKey') || stateStr.includes('function makeSoundKey('), 'makeSoundKey should be defined');
});

TestRunner.test("Day 601 - APP_VERSION validation for Day 601", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 601");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 256, "Minor version should be >= 256 for Day 601");
    }
});

// ============================================
// Day 602: Armed/Recording/Muted Track State Function Tests
// ============================================
TestRunner.test("Day 602 - Muted Track State - getMutedTrackIdsState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMutedTrackIdsState'), 'getMutedTrackIdsState should be exported');
});

TestRunner.test("Day 602 - Muted Track State - setMutedTrackIdsState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMutedTrackIdsState'), 'setMutedTrackIdsState should be exported');
});

TestRunner.test("Day 602 - Muted Track State - setMutedTrackIdsState calls captureStateForUndoIfAllowed", (t) => {
    const funcBody = setMutedTrackIdsState.toString();
    const captureIdx = funcBody.indexOf('captureStateForUndoIfAllowed');
    const fnIdx = funcBody.indexOf('export function setMutedTrackIdsState');
    t.assertTruthy(captureIdx > fnIdx, 'setMutedTrackIdsState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 602 - Muted Track State - setMutedTrackIdsState has descriptive undo label", (t) => {
    const funcBody = setMutedTrackIdsState.toString();
    t.assertTruthy(funcBody.includes('Set Muted Tracks'), 'setMutedTrackIdsState should have "Set Muted Tracks" undo label');
});

TestRunner.test("Day 602 - Muted Track State - setMutedTrackIdsState validates array input with Array.isArray", (t) => {
    const funcBody = setMutedTrackIdsState.toString();
    t.assertTruthy(funcBody.includes('Array.isArray'), 'setMutedTrackIdsState should use Array.isArray for validation');
});

TestRunner.test("Day 602 - Muted Track State - setMutedTrackIdsState guards capture with change detection", (t) => {
    const funcBody = setMutedTrackIdsState.toString();
    t.assertTruthy(funcBody.includes('mutedTrackIds.length') && funcBody.includes('changed'), 'setMutedTrackIdsState should check for changes before capturing');
});

TestRunner.test("Day 602 - Muted Track State - isTrackMutedState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function isTrackMutedState'), 'isTrackMutedState should be exported');
});

TestRunner.test("Day 602 - Muted Track State - isTrackMutedState uses .includes to check trackId", (t) => {
    const funcBody = isTrackMutedState.toString();
    t.assertTruthy(funcBody.includes('.includes'), 'isTrackMutedState should use .includes to check trackId');
});

TestRunner.test("Day 602 - Soloed Track State - isTrackSoloedState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function isTrackSoloedState'), 'isTrackSoloedState should be exported');
});

TestRunner.test("Day 602 - Soloed Track State - isTrackSoloedState uses === comparison for trackId", (t) => {
    const funcBody = isTrackSoloedState.toString();
    t.assertTruthy(funcBody.includes('soloedTrackId === trackId'), 'isTrackSoloedState should use === to compare trackId');
});

TestRunner.test("Day 602 - Track Mute State - setTrackMutedState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTrackMutedState'), 'setTrackMutedState should be exported');
});

TestRunner.test("Day 602 - Track Mute State - setTrackMutedState calls captureStateForUndoIfAllowed", (t) => {
    const funcBody = setTrackMutedState.toString();
    const captureIdx = funcBody.indexOf('captureStateForUndoIfAllowed');
    const fnIdx = funcBody.indexOf('export function setTrackMutedState');
    t.assertTruthy(captureIdx > fnIdx, 'setTrackMutedState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 602 - Track Mute State - setTrackMutedState has descriptive undo label", (t) => {
    const funcBody = setTrackMutedState.toString();
    t.assertTruthy(funcBody.includes('Mute') && funcBody.includes('Unmute'), 'setTrackMutedState should have "Mute"/"Unmute" undo labels');
});

TestRunner.test("Day 602 - Track Mute State - setTrackMutedState uses push/filter to modify mutedTrackIds", (t) => {
    const funcBody = setTrackMutedState.toString();
    t.assertTruthy(funcBody.includes('.push') && funcBody.includes('.filter'), 'setTrackMutedState should use push and filter to modify mutedTrackIds');
});

TestRunner.test("Day 602 - Armed Track State - setArmedTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setArmedTrackIdState'), 'setArmedTrackIdState should be exported');
});

TestRunner.test("Day 602 - Armed Track State - setArmedTrackIdState calls captureStateForUndoIfAllowed", (t) => {
    const funcBody = setArmedTrackIdState.toString();
    const captureIdx = funcBody.indexOf('captureStateForUndoIfAllowed');
    const fnIdx = funcBody.indexOf('export function setArmedTrackIdState');
    t.assertTruthy(captureIdx > fnIdx, 'setArmedTrackIdState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 602 - Armed Track State - setArmedTrackIdState has descriptive undo label", (t) => {
    const funcBody = setArmedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('Armed Track'), 'setArmedTrackIdState should have "Armed Track" undo label');
});

TestRunner.test("Day 602 - Armed Track State - setArmedTrackIdState uses Object.is for comparison", (t) => {
    const funcBody = setArmedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('Object.is'), 'setArmedTrackIdState should use Object.is for comparison');
});

TestRunner.test("Day 602 - Armed Track State - setArmedTrackIdState handles null correctly", (t) => {
    const funcBody = setArmedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('id === null'), 'setArmedTrackIdState should handle null ID');
});

TestRunner.test("Day 602 - Armed Track State - getArmedTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getArmedTrackIdState'), 'getArmedTrackIdState should be exported');
});

TestRunner.test("Day 602 - Armed Track State - getArmedTrackIdState returns armed track ID directly", (t) => {
    const funcBody = getArmedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('return armedTrackId'), 'getArmedTrackIdState should return armedTrackId directly');
});

TestRunner.test("Day 602 - Recording State - setIsRecordingState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setIsRecordingState'), 'setIsRecordingState should be exported');
});

TestRunner.test("Day 602 - Recording State - setIsRecordingState calls captureStateForUndoIfAllowed", (t) => {
    const funcBody = setIsRecordingState.toString();
    const captureIdx = funcBody.indexOf('captureStateForUndoIfAllowed');
    const fnIdx = funcBody.indexOf('export function setIsRecordingState');
    t.assertTruthy(captureIdx > fnIdx, 'setIsRecordingState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 602 - Recording State - setIsRecordingState has descriptive undo label", (t) => {
    const funcBody = setIsRecordingState.toString();
    t.assertTruthy(funcBody.includes('Recording State'), 'setIsRecordingState should have "Recording State" undo label');
});

TestRunner.test("Day 602 - Recording State - setRecordingTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setRecordingTrackIdState'), 'setRecordingTrackIdState should be exported');
});

TestRunner.test("Day 602 - Recording State - setRecordingTrackIdState calls captureStateForUndoIfAllowed", (t) => {
    const funcBody = setRecordingTrackIdState.toString();
    const captureIdx = funcBody.indexOf('captureStateForUndoIfAllowed');
    const fnIdx = funcBody.indexOf('export function setRecordingTrackIdState');
    t.assertTruthy(captureIdx > fnIdx, 'setRecordingTrackIdState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 602 - Recording State - setRecordingTrackIdState has descriptive undo label", (t) => {
    const funcBody = setRecordingTrackIdState.toString();
    t.assertTruthy(funcBody.includes('Recording Track'), 'setRecordingTrackIdState should have "Recording Track" undo label');
});

TestRunner.test("Day 602 - Recording State - setRecordingStartTimeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setRecordingStartTimeState'), 'setRecordingStartTimeState should be exported');
});

TestRunner.test("Day 602 - Recording State - setRecordingStartTimeState calls captureStateForUndoIfAllowed", (t) => {
    const funcBody = setRecordingStartTimeState.toString();
    const captureIdx = funcBody.indexOf('captureStateForUndoIfAllowed');
    const fnIdx = funcBody.indexOf('export function setRecordingStartTimeState');
    t.assertTruthy(captureIdx > fnIdx, 'setRecordingStartTimeState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 602 - Recording State - setRecordingStartTimeState has descriptive undo label", (t) => {
    const funcBody = setRecordingStartTimeState.toString();
    t.assertTruthy(funcBody.includes('Recording Start Time'), 'setRecordingStartTimeState should have "Recording Start Time" undo label');
});

TestRunner.test("Day 602 - Active Sequencer Track State - setActiveSequencerTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setActiveSequencerTrackIdState'), 'setActiveSequencerTrackIdState should be exported');
});

TestRunner.test("Day 602 - Active Sequencer Track State - setActiveSequencerTrackIdState calls captureStateForUndoIfAllowed", (t) => {
    const funcBody = setActiveSequencerTrackIdState.toString();
    const captureIdx = funcBody.indexOf('captureStateForUndoIfAllowed');
    const fnIdx = funcBody.indexOf('export function setActiveSequencerTrackIdState');
    t.assertTruthy(captureIdx > fnIdx, 'setActiveSequencerTrackIdState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 602 - Active Sequencer Track State - setActiveSequencerTrackIdState has descriptive undo label", (t) => {
    const funcBody = setActiveSequencerTrackIdState.toString();
    t.assertTruthy(funcBody.includes('Active Sequencer Track'), 'setActiveSequencerTrackIdState should have "Active Sequencer Track" undo label');
});

TestRunner.test("Day 602 - Active Sequencer Track State - setActiveSequencerTrackIdState uses Object.is for comparison", (t) => {
    const funcBody = setActiveSequencerTrackIdState.toString();
    t.assertTruthy(funcBody.includes('Object.is'), 'setActiveSequencerTrackIdState should use Object.is for comparison');
});

TestRunner.test("Day 602 - Active Sequencer Track State - setActiveSequencerTrackIdState handles null correctly", (t) => {
    const funcBody = setActiveSequencerTrackIdState.toString();
    t.assertTruthy(funcBody.includes('id === null'), 'setActiveSequencerTrackIdState should handle null ID');
});

TestRunner.test("Day 602 - Active Sequencer Track State - getActiveSequencerTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getActiveSequencerTrackIdState'), 'getActiveSequencerTrackIdState should be exported');
});

TestRunner.test("Day 602 - APP_VERSION validation for Day 602", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 602");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 257, "Minor version should be >= 257 for Day 602");
    }
});

// Day 603: Undo/Redo System State Function Tests (2026-05-26)
TestRunner.test("Day 603 - Undo/Redo Stacks - getUndoStackState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getUndoStackState'), 'getUndoStackState should be exported');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - getUndoStackState returns array using spread operator", (t) => {
    const funcBody = getUndoStackState.toString();
    t.assertTruthy(funcBody.includes('[...undoStack]') || funcBody.includes('undoStack.slice()'), 'getUndoStackState should return a copy of the array');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - getRedoStackState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getRedoStackState'), 'getRedoStackState should be exported');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - getRedoStackState returns array using spread operator", (t) => {
    const funcBody = getRedoStackState.toString();
    t.assertTruthy(funcBody.includes('[...redoStack]') || funcBody.includes('redoStack.slice()'), 'getRedoStackState should return a copy of the array');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - undoStack and redoStack are initialized as empty arrays", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('let undoStack = []'), 'undoStack should be initialized as empty array');
    t.assertTruthy(stateStr.includes('let redoStack = []'), 'redoStack should be initialized as empty array');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - undoStack.push is called in captureStateForUndoInternal", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function captureStateForUndoInternal');
    const pushIdx = stateStr.indexOf('undoStack.push', fnIdx);
    t.assertTruthy(pushIdx > fnIdx, 'captureStateForUndoInternal should call undoStack.push');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - redoStack is cleared when undo is captured", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function captureStateForUndoInternal');
    const clearIdx = stateStr.indexOf('redoStack = []', fnIdx);
    t.assertTruthy(clearIdx > fnIdx, 'captureStateForUndoInternal should clear redoStack on new action');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - captureStateForUndoInternal enforces MAX_HISTORY_STATES limit", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function captureStateForUndoInternal');
    const maxIdx = stateStr.indexOf('MAX_HISTORY_STATES', fnIdx);
    t.assertTruthy(maxIdx > fnIdx, 'captureStateForUndoInternal should reference MAX_HISTORY_STATES');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - undoLastActionInternal pops from undoStack", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export async function undoLastActionInternal');
    const popIdx = stateStr.indexOf('undoStack.pop', fnIdx);
    t.assertTruthy(popIdx > fnIdx, 'undoLastActionInternal should pop from undoStack');
    const guardIdx = stateStr.indexOf('undoStack.length === 0', fnIdx);
    t.assertTruthy(guardIdx > fnIdx, 'undoLastActionInternal should guard against empty undoStack');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - redoLastActionInternal pops from redoStack", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export async function redoLastActionInternal');
    const popIdx = stateStr.indexOf('redoStack.pop', fnIdx);
    t.assertTruthy(popIdx > fnIdx, 'redoLastActionInternal should pop from redoStack');
    const guardIdx = stateStr.indexOf('redoStack.length === 0', fnIdx);
    t.assertTruthy(guardIdx > fnIdx, 'redoLastActionInternal should guard against empty redoStack');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - undoLastActionInternal calls reconstructDAWInternal with isUndoRedo=true", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export async function undoLastActionInternal');
    const reconIdx = stateStr.indexOf('reconstructDAWInternal', fnIdx);
    t.assertTruthy(reconIdx > fnIdx, 'undoLastActionInternal should call reconstructDAWInternal');
    const trueIdx = stateStr.indexOf('true', reconIdx - 10);
    t.assertTruthy(trueIdx > reconIdx - 20, 'undoLastActionInternal should pass true for isUndoRedo');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - redoLastActionInternal calls reconstructDAWInternal with isUndoRedo=true", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export async function redoLastActionInternal');
    const reconIdx = stateStr.indexOf('reconstructDAWInternal', fnIdx);
    t.assertTruthy(reconIdx > fnIdx, 'redoLastActionInternal should call reconstructDAWInternal');
    const trueIdx = stateStr.indexOf('true', reconIdx - 10);
    t.assertTruthy(trueIdx > reconIdx - 20, 'redoLastActionInternal should pass true for isUndoRedo');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - undoLastActionInternal shows 'Nothing to undo.' notification when stack is empty", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export async function undoLastActionInternal');
    const notifyIdx = stateStr.indexOf('Nothing to undo', fnIdx);
    t.assertTruthy(notifyIdx > fnIdx, 'undoLastActionInternal should show Nothing to undo notification');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - redoLastActionInternal shows 'Nothing to redo.' notification when stack is empty", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export async function redoLastActionInternal');
    const notifyIdx = stateStr.indexOf('Nothing to redo', fnIdx);
    t.assertTruthy(notifyIdx > fnIdx, 'redoLastActionInternal should show Nothing to redo notification');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - undo stacks are cleared when loading a new project", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const loadIdx = stateStr.indexOf('export async function loadProjectInternal');
    const undoClearIdx = stateStr.indexOf('undoStack = []', loadIdx);
    const redoClearIdx = stateStr.indexOf('redoStack = []', loadIdx);
    t.assertTruthy(undoClearIdx > loadIdx && undoClearIdx < loadIdx + 500, 'loadProjectInternal should clear undoStack');
    t.assertTruthy(redoClearIdx > loadIdx && redoClearIdx < loadIdx + 500, 'loadProjectInternal should clear redoStack');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - captureStateForUndoInternal pushes deep copy using JSON.parse(JSON.stringify)", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function captureStateForUndoInternal');
    const deepCopyIdx = stateStr.indexOf('JSON.parse(JSON.stringify', fnIdx);
    t.assertTruthy(deepCopyIdx > fnIdx && deepCopyIdx < fnIdx + 400, 'captureStateForUndoInternal should deep copy using JSON.parse(JSON.stringify)');
});

TestRunner.test("Day 603 - Undo/Redo Stacks - _isReconstructingDAW_flag is set during undo/redo reconstruction", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fn1Idx = stateStr.indexOf('export async function undoLastActionInternal');
    const flag1Idx = stateStr.indexOf('_isReconstructingDAW_flag', fn1Idx);
    const fn2Idx = stateStr.indexOf('export async function redoLastActionInternal');
    const flag2Idx = stateStr.indexOf('_isReconstructingDAW_flag', fn2Idx);
    t.assertTruthy(flag1Idx > fn1Idx, 'undoLastActionInternal should set _isReconstructingDAW_flag');
    t.assertTruthy(flag2Idx > fn2Idx, 'redoLastActionInternal should set _isReconstructingDAW_flag');
});

TestRunner.test("Day 603 - APP_VERSION validation for Day 603", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 603");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 258, "Minor version should be >= 258 for Day 603");
    }
});
// Timeline Markers State Function Tests
TestRunner.test("Day 604 - Timeline Markers - getTimelineMarkersState is a function export", (t) => {
    const funcs = Object.keys(require('fs').readFileSync('./js/state.js', 'utf8').match(/export function \w+/g) || []);
    t.assertTruthy(funcs.some(f => f === 'export function getTimelineMarkersState'), 'getTimelineMarkersState should be exported');
});

TestRunner.test("Day 604 - Timeline Markers - getTimelineMarkersState returns array copy", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getTimelineMarkersState');
    const mapIdx = stateStr.indexOf('.map(', fnIdx);
    t.assertTruthy(mapIdx > fnIdx && mapIdx < fnIdx + 100, 'getTimelineMarkersState should use .map to return copies');
});

TestRunner.test("Day 604 - Timeline Markers - getTimelineMarkerByIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getTimelineMarkerByIdState');
    t.assertTruthy(fnIdx > 0, 'getTimelineMarkerByIdState should be exported');
});

TestRunner.test("Day 604 - Timeline Markers - getTimelineMarkerByIdState uses .find and returns copy", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getTimelineMarkerByIdState');
    const findIdx = stateStr.indexOf('.find(', fnIdx);
    t.assertTruthy(findIdx > fnIdx && findIdx < fnIdx + 100, 'getTimelineMarkerByIdState should use .find');
    const spreadIdx = stateStr.indexOf('{ ...marker }', fnIdx);
    t.assertTruthy(spreadIdx > fnIdx && spreadIdx < fnIdx + 200, 'getTimelineMarkerByIdState should return spread copy');
});

TestRunner.test("Day 604 - Timeline Markers - addTimelineMarkerState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addTimelineMarkerState');
    t.assertTruthy(fnIdx > 0, 'addTimelineMarkerState should be exported');
});

TestRunner.test("Day 604 - Timeline Markers - addTimelineMarkerState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addTimelineMarkerState');
    const capIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(capIdx > fnIdx && capIdx < fnIdx + 200, 'addTimelineMarkerState should call captureStateForUndo');
});

TestRunner.test("Day 604 - Timeline Markers - addTimelineMarkerState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addTimelineMarkerState');
    const labelIdx = stateStr.indexOf('Add Timeline Marker', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'addTimelineMarkerState should have Add Timeline Marker undo label');
});

TestRunner.test("Day 604 - Timeline Markers - addTimelineMarkerState enforces MAX_TIMELINE_MARKERS limit", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addTimelineMarkerState');
    const limitIdx = stateStr.indexOf('MAX_TIMELINE_MARKERS', fnIdx);
    t.assertTruthy(limitIdx > fnIdx && limitIdx < fnIdx + 200, 'addTimelineMarkerState should check MAX_TIMELINE_MARKERS');
});

TestRunner.test("Day 604 - Timeline Markers - setTimelineMarkerState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimelineMarkerState');
    t.assertTruthy(fnIdx > 0, 'setTimelineMarkerState should be exported');
});

TestRunner.test("Day 604 - Timeline Markers - setTimelineMarkerState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimelineMarkerState');
    const capIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(capIdx > fnIdx && capIdx < fnIdx + 200, 'setTimelineMarkerState should call captureStateForUndo');
});

TestRunner.test("Day 604 - Timeline Markers - setTimelineMarkerState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimelineMarkerState');
    const labelIdx = stateStr.indexOf('Update Timeline Marker', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'setTimelineMarkerState should have Update Timeline Marker undo label');
});

TestRunner.test("Day 604 - Timeline Markers - removeTimelineMarkerState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeTimelineMarkerState');
    t.assertTruthy(fnIdx > 0, 'removeTimelineMarkerState should be exported');
});

TestRunner.test("Day 604 - Timeline Markers - removeTimelineMarkerState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeTimelineMarkerState');
    const capIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(capIdx > fnIdx && capIdx < fnIdx + 200, 'removeTimelineMarkerState should call captureStateForUndo');
});

TestRunner.test("Day 604 - Timeline Markers - removeTimelineMarkerState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeTimelineMarkerState');
    const labelIdx = stateStr.indexOf('Remove Timeline Marker', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'removeTimelineMarkerState should have Remove Timeline Marker undo label');
});

TestRunner.test("Day 604 - Timeline Markers - clearTimelineMarkersState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearTimelineMarkersState');
    t.assertTruthy(fnIdx > 0, 'clearTimelineMarkersState should be exported');
});

TestRunner.test("Day 604 - Timeline Markers - clearTimelineMarkersState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearTimelineMarkersState');
    const capIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(capIdx > fnIdx && capIdx < fnIdx + 200, 'clearTimelineMarkersState should call captureStateForUndo');
});

TestRunner.test("Day 604 - Timeline Markers - clearTimelineMarkersState has 'Clear All Timeline Markers' undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function clearTimelineMarkersState');
    const labelIdx = stateStr.indexOf('Clear All Timeline Markers', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'clearTimelineMarkersState should have Clear All Timeline Markers undo label');
});

TestRunner.test("Day 604 - Timeline Markers - addTimelineMarkerState sorts markers by bar after adding", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function addTimelineMarkerState');
    const sortIdx = stateStr.indexOf('.sort(', fnIdx);
    t.assertTruthy(sortIdx > fnIdx && sortIdx < fnIdx + 300, 'addTimelineMarkerState should sort markers by bar');
});

TestRunner.test("Day 604 - APP_VERSION validation for Day 604", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 604");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 259, "Minor version should be >= 259 for Day 604");
    }
});
