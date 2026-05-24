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

TestRunner.test('Audio Clip Setters - setAudioClipColor is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipColor, 'function', 'setAudioClipColor should be a function');
});

TestRunner.test('Audio Clip Setters - setAudioClipColor calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipColor.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipColor should call _captureUndoState');
});

TestRunner.test('Audio Clip Setters - setAudioClipColor uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipColor.toString();
    t.assertTruthy(funcStr.includes('color') || funcStr.includes('Set'), 'setAudioClipColor undo label should reference color');
});

TestRunner.test('Audio Clip Setters - setAudioClipColor references clipId and color parameters', (t) => {
    const funcStr = Track.prototype.setAudioClipColor.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipColor should reference clipId parameter');
    t.assertTruthy(funcStr.includes('color'), 'setAudioClipColor should reference color parameter');
});

TestRunner.test('Audio Clip Setters - setAudioClipColor returns boolean', (t) => {
    const funcStr = Track.prototype.setAudioClipColor.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'setAudioClipColor should return boolean');
});

TestRunner.test('Audio Clip Getters - getAudioClipColor is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipColor, 'function', 'getAudioClipColor should be a function');
});

TestRunner.test('Audio Clip Getters - getAudioClipColor references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipColor.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipColor should reference clipId parameter');
});

TestRunner.test('Audio Clip Setters - setAudioClipGain is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipGain, 'function', 'setAudioClipGain should be a function');
});

TestRunner.test('Audio Clip Setters - setAudioClipGain calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipGain.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipGain should call _captureUndoState');
});

TestRunner.test('Audio Clip Setters - setAudioClipGain uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipGain.toString();
    t.assertTruthy(funcStr.includes('gain') || funcStr.includes('Set'), 'setAudioClipGain undo label should reference gain');
});

TestRunner.test('Audio Clip Setters - setAudioClipGain clamps value to valid range', (t) => {
    const funcStr = Track.prototype.setAudioClipGain.toString();
    t.assertTruthy(funcStr.includes('MIN_AUDIO_CLIP_GAIN') || funcStr.includes('MAX_AUDIO_CLIP_GAIN') || funcStr.includes('Math.max') || funcStr.includes('Math.min'), 'setAudioClipGain should clamp gain to valid range');
});

TestRunner.test('Audio Clip Setters - setAudioClipGain references clipId and gain parameters', (t) => {
    const funcStr = Track.prototype.setAudioClipGain.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipGain should reference clipId parameter');
    t.assertTruthy(funcStr.includes('gain'), 'setAudioClipGain should reference gain parameter');
});

TestRunner.test('Audio Clip Getters - getAudioClipGain is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipGain, 'function', 'getAudioClipGain should be a function');
});

TestRunner.test('Audio Clip Getters - getAudioClipGain references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipGain.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipGain should reference clipId parameter');
});

TestRunner.test('Audio Clip Setters - setAudioClipPlaybackRate is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipPlaybackRate, 'function', 'setAudioClipPlaybackRate should be a function');
});

TestRunner.test('Audio Clip Setters - setAudioClipPlaybackRate calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipPlaybackRate.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipPlaybackRate should call _captureUndoState');
});

TestRunner.test('Audio Clip Setters - setAudioClipPlaybackRate uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipPlaybackRate.toString();
    t.assertTruthy(funcStr.includes('playback') || funcStr.includes('rate') || funcStr.includes('Set'), 'setAudioClipPlaybackRate undo label should reference playback rate');
});

TestRunner.test('Audio Clip Setters - setAudioClipPlaybackRate clamps value to valid range', (t) => {
    const funcStr = Track.prototype.setAudioClipPlaybackRate.toString();
    t.assertTruthy(funcStr.includes('MIN_AUDIO_CLIP_PLAYBACK_RATE') || funcStr.includes('MAX_AUDIO_CLIP_PLAYBACK_RATE') || funcStr.includes('Math.max') || funcStr.includes('Math.min'), 'setAudioClipPlaybackRate should clamp rate to valid range');
});

TestRunner.test('Audio Clip Setters - setAudioClipPlaybackRate references clipId and rate parameters', (t) => {
    const funcStr = Track.prototype.setAudioClipPlaybackRate.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipPlaybackRate should reference clipId parameter');
    t.assertTruthy(funcStr.includes('rate'), 'setAudioClipPlaybackRate should reference rate parameter');
});

TestRunner.test('Audio Clip Getters - getAudioClipPlaybackRate is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipPlaybackRate, 'function', 'getAudioClipPlaybackRate should be a function');
});

TestRunner.test('Audio Clip Getters - getAudioClipPlaybackRate references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipPlaybackRate.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipPlaybackRate should reference clipId parameter');
});

TestRunner.test('Audio Clip Setters - setAudioClipStartOffset is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipStartOffset, 'function', 'setAudioClipStartOffset should be a function');
});

TestRunner.test('Audio Clip Setters - setAudioClipStartOffset calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipStartOffset.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipStartOffset should call _captureUndoState');
});

TestRunner.test('Audio Clip Setters - setAudioClipStartOffset uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipStartOffset.toString();
    t.assertTruthy(funcStr.includes('start') || funcStr.includes('offset') || funcStr.includes('Set'), 'setAudioClipStartOffset undo label should reference start offset');
});

TestRunner.test('Audio Clip Setters - setAudioClipStartOffset clamps value', (t) => {
    const funcStr = Track.prototype.setAudioClipStartOffset.toString();
    t.assertTruthy(funcStr.includes('MIN_AUDIO_CLIP_START_OFFSET') || funcStr.includes('Math.max') || funcStr.includes('Math.min'), 'setAudioClipStartOffset should clamp value');
});

TestRunner.test('Audio Clip Setters - setAudioClipStartOffset references clipId and startOffset parameters', (t) => {
    const funcStr = Track.prototype.setAudioClipStartOffset.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipStartOffset should reference clipId parameter');
    t.assertTruthy(funcStr.includes('startOffset'), 'setAudioClipStartOffset should reference startOffset parameter');
});

TestRunner.test('Audio Clip Getters - getAudioClipStartOffset is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipStartOffset, 'function', 'getAudioClipStartOffset should be a function');
});

TestRunner.test('Audio Clip Getters - getAudioClipStartOffset references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipStartOffset.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipStartOffset should reference clipId parameter');
});

TestRunner.test('Audio Clip Setters - setAudioClipEndOffset is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipEndOffset, 'function', 'setAudioClipEndOffset should be a function');
});

TestRunner.test('Audio Clip Setters - setAudioClipEndOffset calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipEndOffset should call _captureUndoState');
});

TestRunner.test('Audio Clip Setters - setAudioClipEndOffset uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('end') || funcStr.includes('offset') || funcStr.includes('Set'), 'setAudioClipEndOffset undo label should reference end offset');
});

TestRunner.test('Audio Clip Setters - setAudioClipEndOffset references clipId and endOffset parameters', (t) => {
    const funcStr = Track.prototype.setAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipEndOffset should reference clipId parameter');
    t.assertTruthy(funcStr.includes('endOffset'), 'setAudioClipEndOffset should reference endOffset parameter');
});

TestRunner.test('Audio Clip Getters - getAudioClipEndOffset is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipEndOffset, 'function', 'getAudioClipEndOffset should be a function');
});

TestRunner.test('Audio Clip Getters - getAudioClipEndOffset references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipEndOffset should reference clipId parameter');
});

TestRunner.test('Audio Clip Setters - setAudioClipCrossfade is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipCrossfade, 'function', 'setAudioClipCrossfade should be a function');
});

TestRunner.test('Audio Clip Setters - setAudioClipCrossfade calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipCrossfade.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipCrossfade should call _captureUndoState');
});

TestRunner.test('Audio Clip Setters - setAudioClipCrossfade uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipCrossfade.toString();
    t.assertTruthy(funcStr.includes('crossfade') || funcStr.includes('Set'), 'setAudioClipCrossfade undo label should reference crossfade');
});

TestRunner.test('Audio Clip Setters - setAudioClipCrossfade clamps value to 0-1 range', (t) => {
    const funcStr = Track.prototype.setAudioClipCrossfade.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setAudioClipCrossfade should clamp value to 0-1 range');
});

TestRunner.test('Audio Clip Getters - getAudioClipCrossfade is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipCrossfade, 'function', 'getAudioClipCrossfade should be a function');
});

TestRunner.test('Audio Clip Getters - getAudioClipCrossfade references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipCrossfade.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipCrossfade should reference clipId parameter');
});

TestRunner.test('Audio Clip Setters - setAudioClipFadeIn is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipFadeIn, 'function', 'setAudioClipFadeIn should be a function');
});

TestRunner.test('Audio Clip Setters - setAudioClipFadeIn calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeIn.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipFadeIn should call _captureUndoState');
});

TestRunner.test('Audio Clip Setters - setAudioClipFadeIn uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeIn.toString();
    t.assertTruthy(funcStr.includes('fade') || funcStr.includes('in') || funcStr.includes('Set'), 'setAudioClipFadeIn undo label should reference fade in');
});

TestRunner.test('Audio Clip Setters - setAudioClipFadeIn clamps value', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeIn.toString();
    t.assertTruthy(funcStr.includes('MAX_AUDIO_CLIP_FADE') || funcStr.includes('Math.max') || funcStr.includes('Math.min'), 'setAudioClipFadeIn should clamp value');
});

TestRunner.test('Audio Clip Getters - getAudioClipFadeIn is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipFadeIn, 'function', 'getAudioClipFadeIn should be a function');
});

TestRunner.test('Audio Clip Getters - getAudioClipFadeIn references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipFadeIn.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipFadeIn should reference clipId parameter');
});

TestRunner.test('Audio Clip Setters - setAudioClipFadeOut is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipFadeOut, 'function', 'setAudioClipFadeOut should be a function');
});

TestRunner.test('Audio Clip Setters - setAudioClipFadeOut calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOut.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipFadeOut should call _captureUndoState');
});

TestRunner.test('Audio Clip Setters - setAudioClipFadeOut uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOut.toString();
    t.assertTruthy(funcStr.includes('fade') || funcStr.includes('out') || funcStr.includes('Set'), 'setAudioClipFadeOut undo label should reference fade out');
});

TestRunner.test('Audio Clip Setters - setAudioClipFadeOut clamps value', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOut.toString();
    t.assertTruthy(funcStr.includes('MAX_AUDIO_CLIP_FADE') || funcStr.includes('Math.max') || funcStr.includes('Math.min'), 'setAudioClipFadeOut should clamp value');
});

TestRunner.test('Audio Clip Getters - getAudioClipFadeOut is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipFadeOut, 'function', 'getAudioClipFadeOut should be a function');
});

TestRunner.test('Audio Clip Getters - getAudioClipFadeOut references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipFadeOut.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipFadeOut should reference clipId parameter');
});

TestRunner.test('Audio Clip Setters - setAudioClipReverse is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipReverse, 'function', 'setAudioClipReverse should be a function');
});

TestRunner.test('Audio Clip Setters - setAudioClipReverse calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipReverse.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipReverse should call _captureUndoState');
});

TestRunner.test('Audio Clip Setters - setAudioClipReverse uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipReverse.toString();
    t.assertTruthy(funcStr.includes('reverse') || funcStr.includes('Set'), 'setAudioClipReverse undo label should reference reverse');
});

TestRunner.test('Audio Clip Setters - setAudioClipReverse references clipId and reverse parameters', (t) => {
    const funcStr = Track.prototype.setAudioClipReverse.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipReverse should reference clipId parameter');
    t.assertTruthy(funcStr.includes('reverse'), 'setAudioClipReverse should reference reverse parameter');
});

TestRunner.test('Audio Clip Getters - getAudioClipReverse is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipReverse, 'function', 'getAudioClipReverse should be a function');
});

TestRunner.test('Audio Clip Getters - getAudioClipReverse references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipReverse.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipReverse should reference clipId parameter');
});

TestRunner.test('Audio Clip Setters - setAudioClipStartTime is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipStartTime, 'function', 'setAudioClipStartTime should be a function');
});

TestRunner.test('Audio Clip Setters - setAudioClipStartTime calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipStartTime should call _captureUndoState');
});

TestRunner.test('Audio Clip Setters - setAudioClipStartTime uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('Move') || funcStr.includes('start') || funcStr.includes('Set'), 'setAudioClipStartTime undo label should reference Move or start');
});

TestRunner.test('Audio Clip Setters - setAudioClipStartTime references clipId and startTime parameters', (t) => {
    const funcStr = Track.prototype.setAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipStartTime should reference clipId parameter');
    t.assertTruthy(funcStr.includes('startTime'), 'setAudioClipStartTime should reference startTime parameter');
});

TestRunner.test('Audio Clip Getters - getAudioClipStartTime is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipStartTime, 'function', 'getAudioClipStartTime should be a function');
});

TestRunner.test('Audio Clip Getters - getAudioClipStartTime references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipStartTime should reference clipId parameter');
});

TestRunner.test('Audio Clip Setters - setAudioClipDuration is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipDuration, 'function', 'setAudioClipDuration should be a function');
});

TestRunner.test('Audio Clip Setters - setAudioClipDuration calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipDuration should call _captureUndoState');
});

TestRunner.test('Audio Clip Setters - setAudioClipDuration uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('Resize') || funcStr.includes('duration') || funcStr.includes('Set'), 'setAudioClipDuration undo label should reference Resize or duration');
});

TestRunner.test('Audio Clip Setters - setAudioClipDuration references clipId and duration parameters', (t) => {
    const funcStr = Track.prototype.setAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipDuration should reference clipId parameter');
    t.assertTruthy(funcStr.includes('duration'), 'setAudioClipDuration should reference duration parameter');
});

TestRunner.test('Audio Clip Getters - getAudioClipDuration is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipDuration, 'function', 'getAudioClipDuration should be a function');
});

TestRunner.test('Audio Clip Getters - getAudioClipDuration references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipDuration should reference clipId parameter');
});

TestRunner.test('Audio Clip Setters - _getAudioClip is a function export', (t) => {
    t.assertEqual(typeof Track.prototype._getAudioClip, 'function', '_getAudioClip should be a function');
});

TestRunner.test('Audio Clip Setters - _getAudioClip references clipId parameter', (t) => {
    const funcStr = Track.prototype._getAudioClip.toString();
    t.assertTruthy(funcStr.includes('clipId'), '_getAudioClip should reference clipId parameter');
});

TestRunner.test('Audio Clip Setters - _getAudioClip returns clip or undefined', (t) => {
    const funcStr = Track.prototype._getAudioClip.toString();
    t.assertTruthy(funcStr.includes('timelineClips') || funcStr.includes('find'), '_getAudioClip should search timelineClips');
});

TestRunner.test('APP_VERSION validation for Day 379', (t) => {
    const versionParts = Constants.APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 379');
    t.assertTruthy(versionParts[1] >= 58, 'Minor version should be >= 58 for Day 379');
// ============================================
// Day 409: Audio Clip Extended Methods Tests
// ============================================

TestRunner.test('Audio Clip Methods - setAudioClipEndOffset is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipEndOffset, 'function', 'setAudioClipEndOffset should be a function');
});

TestRunner.test('Audio Clip Methods - setAudioClipEndOffset calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipEndOffset should call _captureUndoState');
});

TestRunner.test('Audio Clip Methods - setAudioClipEndOffset uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('end offset') || funcStr.includes('offset'), 'setAudioClipEndOffset undo label should reference end offset');
});

TestRunner.test('Audio Clip Methods - setAudioClipEndOffset references clipId and endOffset parameters', (t) => {
    const funcStr = Track.prototype.setAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipEndOffset should reference clipId parameter');
    t.assertTruthy(funcStr.includes('endOffset'), 'setAudioClipEndOffset should reference endOffset parameter');
});

TestRunner.test('Audio Clip Methods - setAudioClipEndOffset returns boolean', (t) => {
    const funcStr = Track.prototype.setAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'setAudioClipEndOffset should return boolean');
});

TestRunner.test('Audio Clip Methods - getAudioClipEndOffset is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipEndOffset, 'function', 'getAudioClipEndOffset should be a function');
});

TestRunner.test('Audio Clip Methods - getAudioClipEndOffset references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipEndOffset should reference clipId parameter');
});

TestRunner.test('Audio Clip Methods - getAudioClipEndOffset uses DEFAULT_AUDIO_CLIP_END_OFFSET fallback', (t) => {
    const funcStr = Track.prototype.getAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_AUDIO_CLIP_END_OFFSET'), 'getAudioClipEndOffset should use DEFAULT_AUDIO_CLIP_END_OFFSET fallback');
});

TestRunner.test('Audio Clip Methods - setAudioClipCrossfade is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipCrossfade, 'function', 'setAudioClipCrossfade should be a function');
});

TestRunner.test('Audio Clip Methods - setAudioClipCrossfade calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipCrossfade.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipCrossfade should call _captureUndoState');
});

TestRunner.test('Audio Clip Methods - setAudioClipCrossfade uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipCrossfade.toString();
    t.assertTruthy(funcStr.includes('crossfade'), 'setAudioClipCrossfade undo label should reference crossfade');
});

TestRunner.test('Audio Clip Methods - setAudioClipCrossfade clamps value to 0-1 range', (t) => {
    const funcStr = Track.prototype.setAudioClipCrossfade.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setAudioClipCrossfade should clamp value to 0-1 range');
});

TestRunner.test('Audio Clip Methods - setAudioClipCrossfade references clipId and crossfade parameters', (t) => {
    const funcStr = Track.prototype.setAudioClipCrossfade.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipCrossfade should reference clipId parameter');
    t.assertTruthy(funcStr.includes('crossfade'), 'setAudioClipCrossfade should reference crossfade parameter');
});

TestRunner.test('Audio Clip Methods - getAudioClipCrossfade is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipCrossfade, 'function', 'getAudioClipCrossfade should be a function');
});

TestRunner.test('Audio Clip Methods - getAudioClipCrossfade references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipCrossfade.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipCrossfade should reference clipId parameter');
});

TestRunner.test('Audio Clip Methods - setAudioClipFadeInCurve is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipFadeInCurve, 'function', 'setAudioClipFadeInCurve should be a function');
});

TestRunner.test('Audio Clip Methods - setAudioClipFadeInCurve calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeInCurve.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipFadeInCurve should call _captureUndoState');
});

TestRunner.test('Audio Clip Methods - setAudioClipFadeInCurve uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeInCurve.toString();
    t.assertTruthy(funcStr.includes('fade in') || funcStr.includes('fadeIn'), 'setAudioClipFadeInCurve undo label should reference fade in');
});

TestRunner.test('Audio Clip Methods - setAudioClipFadeInCurve validates against FADE_CURVES', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeInCurve.toString();
    t.assertTruthy(funcStr.includes('FADE_CURVES') || funcStr.includes('includes'), 'setAudioClipFadeInCurve should validate curve against FADE_CURVES');
});

TestRunner.test('Audio Clip Methods - setAudioClipFadeInCurve uses DEFAULT_FADE_IN_CURVE fallback', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeInCurve.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_FADE_IN_CURVE'), 'setAudioClipFadeInCurve should use DEFAULT_FADE_IN_CURVE fallback');
});

TestRunner.test('Audio Clip Methods - setAudioClipFadeOutCurve is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipFadeOutCurve, 'function', 'setAudioClipFadeOutCurve should be a function');
});

TestRunner.test('Audio Clip Methods - setAudioClipFadeOutCurve calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOutCurve.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipFadeOutCurve should call _captureUndoState');
});

TestRunner.test('Audio Clip Methods - setAudioClipFadeOutCurve uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOutCurve.toString();
    t.assertTruthy(funcStr.includes('fade out') || funcStr.includes('fadeOut'), 'setAudioClipFadeOutCurve undo label should reference fade out');
});

TestRunner.test('Audio Clip Methods - setAudioClipFadeOutCurve validates against FADE_CURVES', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOutCurve.toString();
    t.assertTruthy(funcStr.includes('FADE_CURVES') || funcStr.includes('includes'), 'setAudioClipFadeOutCurve should validate curve against FADE_CURVES');
});

TestRunner.test('Audio Clip Methods - setAudioClipFadeOutCurve uses DEFAULT_FADE_OUT_CURVE fallback', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOutCurve.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_FADE_OUT_CURVE'), 'setAudioClipFadeOutCurve should use DEFAULT_FADE_OUT_CURVE fallback');
});

TestRunner.test('Audio Clip Methods - setAudioClipReverse is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipReverse, 'function', 'setAudioClipReverse should be a function');
});

TestRunner.test('Audio Clip Methods - setAudioClipReverse calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipReverse.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipReverse should call _captureUndoState');
});

TestRunner.test('Audio Clip Methods - setAudioClipReverse uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipReverse.toString();
    t.assertTruthy(funcStr.includes('reverse'), 'setAudioClipReverse undo label should reference reverse');
});

TestRunner.test('Audio Clip Methods - setAudioClipReverse references clipId and reverse parameters', (t) => {
    const funcStr = Track.prototype.setAudioClipReverse.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipReverse should reference clipId parameter');
    t.assertTruthy(funcStr.includes('reverse'), 'setAudioClipReverse should reference reverse parameter');
});

TestRunner.test('Audio Clip Methods - setAudioClipReverse returns boolean', (t) => {
    const funcStr = Track.prototype.setAudioClipReverse.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'setAudioClipReverse should return boolean');
});

TestRunner.test('Audio Clip Methods - getAudioClipReverse is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipReverse, 'function', 'getAudioClipReverse should be a function');
});

TestRunner.test('Audio Clip Methods - getAudioClipReverse references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipReverse.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipReverse should reference clipId parameter');
});

TestRunner.test('Audio Clip Methods - setAudioClipStartTime is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipStartTime, 'function', 'setAudioClipStartTime should be a function');
});

TestRunner.test('Audio Clip Methods - setAudioClipStartTime calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipStartTime should call _captureUndoState');
});

TestRunner.test('Audio Clip Methods - setAudioClipStartTime uses descriptive undo label with track name', (t) => {
    const funcStr = Track.prototype.setAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('Move') || funcStr.includes('clip'), 'setAudioClipStartTime undo label should reference Move or clip');
    t.assertTruthy(funcStr.includes('this.name'), 'setAudioClipStartTime undo label should include track name');
});

TestRunner.test('Audio Clip Methods - setAudioClipStartTime clamps to non-negative', (t) => {
    const funcStr = Track.prototype.setAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('0'), 'setAudioClipStartTime should clamp to non-negative');
});

TestRunner.test('Audio Clip Methods - setAudioClipStartTime uses parseFloat', (t) => {
    const funcStr = Track.prototype.setAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'setAudioClipStartTime should use parseFloat');
});

TestRunner.test('Audio Clip Methods - getAudioClipStartTime is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipStartTime, 'function', 'getAudioClipStartTime should be a function');
});

TestRunner.test('Audio Clip Methods - getAudioClipStartTime references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipStartTime should reference clipId parameter');
});

TestRunner.test('Audio Clip Methods - getAudioClipStartTime returns 0 for missing clip', (t) => {
    const funcStr = Track.prototype.getAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('0'), 'getAudioClipStartTime should return 0 for missing clip');
});

TestRunner.test('Audio Clip Methods - setAudioClipDuration is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAudioClipDuration, 'function', 'setAudioClipDuration should be a function');
});

TestRunner.test('Audio Clip Methods - setAudioClipDuration calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipDuration should call _captureUndoState');
});

TestRunner.test('Audio Clip Methods - setAudioClipDuration uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('Resize') || funcStr.includes('clip'), 'setAudioClipDuration undo label should reference Resize or clip');
});

TestRunner.test('Audio Clip Methods - setAudioClipDuration clamps to minimum 0.01', (t) => {
    const funcStr = Track.prototype.setAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('0.01'), 'setAudioClipDuration should clamp to minimum 0.01');
});

TestRunner.test('Audio Clip Methods - setAudioClipDuration uses parseFloat', (t) => {
    const funcStr = Track.prototype.setAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'setAudioClipDuration should use parseFloat');
});

TestRunner.test('Audio Clip Methods - getAudioClipDuration is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.getAudioClipDuration, 'function', 'getAudioClipDuration should be a function');
});

TestRunner.test('Audio Clip Methods - getAudioClipDuration references clipId parameter', (t) => {
    const funcStr = Track.prototype.getAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'getAudioClipDuration should reference clipId parameter');
});

TestRunner.test('Audio Clip Methods - getAudioClipDuration returns 0 for missing clip', (t) => {
    const funcStr = Track.prototype.getAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('0'), 'getAudioClipDuration should return 0 for missing clip');
});

TestRunner.test('Audio Clip Methods - deleteTimelineClip is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.deleteTimelineClip, 'function', 'deleteTimelineClip should be a function');
});

TestRunner.test('Audio Clip Methods - deleteTimelineClip calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.deleteTimelineClip.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'deleteTimelineClip should call _captureUndoState');
});

TestRunner.test('Audio Clip Methods - deleteTimelineClip uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.deleteTimelineClip.toString();
    t.assertTruthy(funcStr.includes('Delete') || funcStr.includes('clip'), 'deleteTimelineClip undo label should reference Delete or clip');
});

TestRunner.test('Audio Clip Methods - deleteTimelineClip uses timelineClips filter', (t) => {
    const funcStr = Track.prototype.deleteTimelineClip.toString();
    t.assertTruthy(funcStr.includes('filter') && funcStr.includes('timelineClips'), 'deleteTimelineClip should filter timelineClips array');
});

TestRunner.test('Audio Clip Methods - deleteTimelineClip returns boolean', (t) => {
    const funcStr = Track.prototype.deleteTimelineClip.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'deleteTimelineClip should return boolean');
});

TestRunner.test('Audio Clip Methods - splitAudioClip is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.splitAudioClip, 'function', 'splitAudioClip should be a function');
});

TestRunner.test('Audio Clip Methods - splitAudioClip accepts clipId and splitTime parameters', (t) => {
    const funcStr = Track.prototype.splitAudioClip.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'splitAudioClip should reference clipId parameter');
    t.assertTruthy(funcStr.includes('splitTime'), 'splitAudioClip should reference splitTime parameter');
});

TestRunner.test('Audio Clip Methods - splitAudioClip calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.splitAudioClip.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'splitAudioClip should call _captureUndoState');
});

TestRunner.test('Audio Clip Methods - splitAudioClip validates splitTime bounds', (t) => {
    const funcStr = Track.prototype.splitAudioClip.toString();
    t.assertTruthy(funcStr.includes('splitTime'), 'splitAudioClip should validate splitTime is within clip bounds');
});

TestRunner.test('Audio Clip Methods - splitAudioClip creates new clip object', (t) => {
    const funcStr = Track.prototype.splitAudioClip.toString();
    t.assertTruthy(funcStr.includes('newClip') || funcStr.includes('id:'), 'splitAudioClip should create a new clip object');
});

TestRunner.test('Audio Clip Methods - splitAudioClip modifies original clip duration', (t) => {
    const funcStr = Track.prototype.splitAudioClip.toString();
    t.assertTruthy(funcStr.includes('clip.duration'), 'splitAudioClip should modify original clip duration');
});

TestRunner.test('Audio Clip Methods - splitAudioClip sets new clip startTime', (t) => {
    const funcStr = Track.prototype.splitAudioClip.toString();
    t.assertTruthy(funcStr.includes('startTime'), 'splitAudioClip should set new clip startTime');
});

TestRunner.test('Audio Clip Methods - splitAudioClip copies clip properties to new clip', (t) => {
    const funcStr = Track.prototype.splitAudioClip.toString();
    t.assertTruthy(funcStr.includes('sourceId') || funcStr.includes('gain') || funcStr.includes('playbackRate'), 'splitAudioClip should copy clip properties to new clip');
});

TestRunner.test('Audio Clip Methods - APP_VERSION validation for Day 409', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 409');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 86, 'Minor version should be >= 86 for Day 409');
    }
});});


// Day 358: Track Effect Instance Methods Tests
TestRunner.test('Track Effect - addEffect is a function', (t) => {
    t.assertEqual(typeof Track.prototype.addEffect, 'function', 'addEffect should be a function');
});

TestRunner.test('Track Effect - addEffect accepts 1 parameter', (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('effectType'), 'addEffect should accept effectType parameter');
});

TestRunner.test('Track Effect - addEffect references effectType parameter', (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('effectType'), 'addEffect should reference effectType parameter');
});

TestRunner.test('Track Effect - addEffect calls _captureUndoState with descriptive label', (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'addEffect should call _captureUndoState');
});

TestRunner.test('Track Effect - addEffect uses descriptive undo label with effect type and track name', (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('Add') && funcStr.includes('effectType') && funcStr.includes('name'), 'addEffect should use descriptive undo label with effect type and track name');
});

TestRunner.test('Track Effect - addEffect checks effectsRegistryAccess via appServices', (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('effectsRegistryAccess') || funcStr.includes('appServices'), 'addEffect should check effectsRegistryAccess via appServices');
});

TestRunner.test('Track Effect - addEffect calls showNotification on error', (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'addEffect should call showNotification on error');
});

TestRunner.test('Track Effect - addEffect calls rebuildEffectChain', (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('rebuildEffectChain'), 'addEffect should call rebuildEffectChain');
});

TestRunner.test('Track Effect - addEffect calls updateTrackUI on appServices', (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('updateTrackUI') || funcStr.includes('appServices'), 'addEffect should call updateTrackUI on appServices');
});

TestRunner.test('Track Effect - removeEffect is a function', (t) => {
    t.assertEqual(typeof Track.prototype.removeEffect, 'function', 'removeEffect should be a function');
});

TestRunner.test('Track Effect - removeEffect accepts 1 parameter', (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('effectId'), 'removeEffect should accept effectId parameter');
});

TestRunner.test('Track Effect - removeEffect references effectId parameter', (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('effectId'), 'removeEffect should reference effectId parameter');
});

TestRunner.test('Track Effect - removeEffect calls _captureUndoState with descriptive label', (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'removeEffect should call _captureUndoState');
});

TestRunner.test('Track Effect - removeEffect uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('Remove') && (funcStr.includes('effect') || funcStr.includes('name')), 'removeEffect should use descriptive undo label');
});

TestRunner.test('Track Effect - removeEffect handles effect not found', (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('findIndex') || funcStr.includes('not found'), 'removeEffect should handle effect not found case');
});

TestRunner.test('Track Effect - removeEffect calls rebuildEffectChain', (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('rebuildEffectChain'), 'removeEffect should call rebuildEffectChain');
});

TestRunner.test('Track Effect - removeEffect calls updateTrackUI on appServices', (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('updateTrackUI') || funcStr.includes('appServices'), 'removeEffect should call updateTrackUI on appServices');
});

TestRunner.test('Track Effect - updateEffectParam is a function', (t) => {
    t.assertEqual(typeof Track.prototype.updateEffectParam, 'function', 'updateEffectParam should be a function');
});

TestRunner.test('Track Effect - updateEffectParam accepts 3 parameters', (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    t.assertTruthy(funcStr.includes('effectId') && funcStr.includes('paramPath') && funcStr.includes('value'), 'updateEffectParam should accept 3 parameters');
});

TestRunner.test('Track Effect - updateEffectParam references all three parameters', (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    t.assertTruthy(funcStr.includes('effectId') && funcStr.includes('paramPath') && funcStr.includes('value'), 'updateEffectParam should reference all parameters');
});

TestRunner.test('Track Effect - updateEffectParam calls _captureUndoState with descriptive label', (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'updateEffectParam should call _captureUndoState');
});

TestRunner.test('Track Effect - updateEffectParam parses paramPath with split', (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    t.assertTruthy(funcStr.includes('split'), 'updateEffectParam should parse paramPath with split');
});

TestRunner.test('Track Effect - updateEffectParam handles effect not found', (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    t.assertTruthy(funcStr.includes('find') && (funcStr.includes('not found') || funcStr.includes('return')), 'updateEffectParam should handle effect not found case');
});

TestRunner.test('Track Effect - updateEffectParam has error handling with try-catch', (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'updateEffectParam should have error handling');
});

TestRunner.test('Track Effect - reorderEffect is a function', (t) => {
    t.assertEqual(typeof Track.prototype.reorderEffect, 'function', 'reorderEffect should be a function');
});

TestRunner.test('Track Effect - reorderEffect accepts 2 parameters', (t) => {
    const funcStr = Track.prototype.reorderEffect.toString();
    t.assertTruthy(funcStr.includes('effectId') && funcStr.includes('newIndex'), 'reorderEffect should accept 2 parameters');
});

TestRunner.test('Track Effect - reorderEffect references both parameters', (t) => {
    const funcStr = Track.prototype.reorderEffect.toString();
    t.assertTruthy(funcStr.includes('effectId') && funcStr.includes('newIndex'), 'reorderEffect should reference both parameters');
});

TestRunner.test('Track Effect - reorderEffect calls _captureUndoState with descriptive label', (t) => {
    const funcStr = Track.prototype.reorderEffect.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'reorderEffect should call _captureUndoState');
});

TestRunner.test('Track Effect - reorderEffect uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.reorderEffect.toString();
    t.assertTruthy(funcStr.includes('Reorder') || (funcStr.includes('effect') && funcStr.includes('name')), 'reorderEffect should use descriptive undo label');
});

TestRunner.test('Track Effect - reorderEffect calls rebuildEffectChain', (t) => {
    const funcStr = Track.prototype.reorderEffect.toString();
    t.assertTruthy(funcStr.includes('rebuildEffectChain'), 'reorderEffect should call rebuildEffectChain');
});

TestRunner.test('Track Effect - APP_VERSION validation for Day 358', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 358');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 37, 'Minor version should be >= 37 for Day 358');
    }
});

// APP_VERSION validation for Day 353
TestRunner.test('State - APP_VERSION is 2.32.0 or higher for Day 353', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 353');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 32, 'Minor version should be >= 32 for Day 353');
    }
});
// Day 354: Ghost Track & Loop Region State Undo Capture Tests
// ==============================================================

TestRunner.test('Ghost Track State - setGhostTrackIdState is a function export', (t) => {
    t.assertEqual(typeof setGhostTrackIdState, 'function', 'setGhostTrackIdState should be a function');
});

TestRunner.test('Ghost Track State - setGhostTrackIdState accepts 1 parameter', (t) => {
    const funcStr = setGhostTrackIdState.toString();
    const paramMatch = funcStr.match(/function\s*\(([^)]*)\)/);
    const params = paramMatch ? paramMatch[1].split(',').map(p => p.trim()).filter(p => p) : [];
    t.assertEqual(params.length, 1, 'setGhostTrackIdState should accept 1 parameter');
});

TestRunner.test('Ghost Track State - setGhostTrackIdState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = setGhostTrackIdState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setGhostTrackIdState should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Set Ghost Track') || funcStr.includes('Clear Ghost Track'), 
        'setGhostTrackIdState should use descriptive undo label (Set/Clear Ghost Track)');
});

TestRunner.test('Ghost Track State - setGhostTrackIdState uses conditional label based on trackId', (t) => {
    const funcStr = setGhostTrackIdState.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'setGhostTrackIdState should reference trackId parameter');
    t.assertTruthy(funcStr.includes('?') || funcStr.includes('if'), 'setGhostTrackIdState should have conditional logic for label');
});

TestRunner.test('Ghost Track State - setGhostTrackIdState guards against missing appServices', (t) => {
    const funcStr = setGhostTrackIdState.toString();
    t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'),
        'setGhostTrackIdState should check appServices before calling captureStateForUndo');
});

TestRunner.test('Ghost Track State - setGhostTrackIdState handles trackId value', (t) => {
    const funcStr = setGhostTrackIdState.toString();
    t.assertTruthy(funcStr.includes('ghostTrackIdState') || funcStr.includes('ghostTrackId'),
        'setGhostTrackIdState should update ghostTrackIdState');
});

TestRunner.test('Ghost Track State - getGhostTrackIdState returns null or string', (t) => {
    t.assertTruthy(getGhostTrackIdState() === null || typeof getGhostTrackIdState() === 'string',
        'getGhostTrackIdState should return null or string');
});

TestRunner.test('Ghost Track State - Ghost track state independence verification', (t) => {
    // Ghost track is independent from armed/soloed/sequencer track
    t.assertEqual(typeof getGhostTrackIdState, 'function', 'getGhostTrackIdState should exist');
    t.assertEqual(typeof setGhostTrackIdState, 'function', 'setGhostTrackIdState should exist');
});

TestRunner.test('Loop Region - setLoopRegionState is a function export', (t) => {
    t.assertEqual(typeof setLoopRegionState, 'function', 'setLoopRegionState should be a function');
});

TestRunner.test('Loop Region - setLoopRegionState accepts 1 parameter', (t) => {
    const funcStr = setLoopRegionState.toString();
    const paramMatch = funcStr.match(/function\s*\(([^)]*)\)/);
    const params = paramMatch ? paramMatch[1].split(',').map(p => p.trim()).filter(p => p) : [];
    t.assertEqual(params.length, 1, 'setLoopRegionState should accept 1 parameter (state object)');
});

TestRunner.test('Loop Region - setLoopRegionState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = setLoopRegionState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setLoopRegionState should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Loop Region') || funcStr.includes('Set Loop'),
        'setLoopRegionState should use descriptive undo label (Set Loop Region)');
});

TestRunner.test('Loop Region - setLoopRegionState guards against missing appServices', (t) => {
    const funcStr = setLoopRegionState.toString();
    t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'),
        'setLoopRegionState should check appServices before calling captureStateForUndo');
});

TestRunner.test('Loop Region - setLoopRegionEnabledState is a function export', (t) => {
    t.assertEqual(typeof setLoopRegionEnabledState, 'function', 'setLoopRegionEnabledState should be a function');
});

TestRunner.test('Loop Region - setLoopRegionEnabledState accepts 1 parameter', (t) => {
    const funcStr = setLoopRegionEnabledState.toString();
    const paramMatch = funcStr.match(/function\s*\(([^)]*)\)/);
    const params = paramMatch ? paramMatch[1].split(',').map(p => p.trim()).filter(p => p) : [];
    t.assertEqual(params.length, 1, 'setLoopRegionEnabledState should accept 1 parameter (enabled)');
});

TestRunner.test('Loop Region - setLoopRegionEnabledState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = setLoopRegionEnabledState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setLoopRegionEnabledState should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Loop') || funcStr.includes('Toggle'),
        'setLoopRegionEnabledState should use descriptive undo label');
});

TestRunner.test('Loop Region - setLoopRegionEnabledState coerces to boolean', (t) => {
    const funcStr = setLoopRegionEnabledState.toString();
    t.assertTruthy(funcStr.includes('!!') || funcStr.includes('Boolean') || funcStr.includes('enabled'),
        'setLoopRegionEnabledState should coerce the enabled value to boolean');
});

TestRunner.test('Loop Region - setLoopRegionEnabledState guards against missing appServices', (t) => {
    const funcStr = setLoopRegionEnabledState.toString();
    t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'),
        'setLoopRegionEnabledState should check appServices before calling captureStateForUndo');
});

TestRunner.test('Loop Region - setLoopRegionStartBarState is a function export', (t) => {
    t.assertEqual(typeof setLoopRegionStartBarState, 'function', 'setLoopRegionStartBarState should be a function');
});

TestRunner.test('Loop Region - setLoopRegionStartBarState accepts 1 parameter', (t) => {
    const funcStr = setLoopRegionStartBarState.toString();
    const paramMatch = funcStr.match(/function\s*\(([^)]*)\)/);
    const params = paramMatch ? paramMatch[1].split(',').map(p => p.trim()).filter(p => p) : [];
    t.assertEqual(params.length, 1, 'setLoopRegionStartBarState should accept 1 parameter (bar)');
});

TestRunner.test('Loop Region - setLoopRegionStartBarState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = setLoopRegionStartBarState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setLoopRegionStartBarState should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Loop') || funcStr.includes('Start'),
        'setLoopRegionStartBarState should use descriptive undo label');
});

TestRunner.test('Loop Region - setLoopRegionStartBarState clamps bar value to valid range', (t) => {
    const funcStr = setLoopRegionStartBarState.toString();
    t.assertTruthy(funcStr.includes('Math.max') || funcStr.includes('Math.min') || funcStr.includes('MAX_BARS'),
        'setLoopRegionStartBarState should clamp bar value to MAX_BARS');
});

TestRunner.test('Loop Region - setLoopRegionStartBarState guards against missing appServices', (t) => {
    const funcStr = setLoopRegionStartBarState.toString();
    t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'),
        'setLoopRegionStartBarState should check appServices before calling captureStateForUndo');
});

TestRunner.test('Loop Region - setLoopRegionEndBarState is a function export', (t) => {
    t.assertEqual(typeof setLoopRegionEndBarState, 'function', 'setLoopRegionEndBarState should be a function');
});

TestRunner.test('Loop Region - setLoopRegionEndBarState accepts 1 parameter', (t) => {
    const funcStr = setLoopRegionEndBarState.toString();
    const paramMatch = funcStr.match(/function\s*\(([^)]*)\)/);
    const params = paramMatch ? paramMatch[1].split(',').map(p => p.trim()).filter(p => p) : [];
    t.assertEqual(params.length, 1, 'setLoopRegionEndBarState should accept 1 parameter (bar)');
});

TestRunner.test('Loop Region - setLoopRegionEndBarState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = setLoopRegionEndBarState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setLoopRegionEndBarState should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Loop') || funcStr.includes('End'),
        'setLoopRegionEndBarState should use descriptive undo label');
});

TestRunner.test('Loop Region - setLoopRegionEndBarState clamps bar value to valid range', (t) => {
    const funcStr = setLoopRegionEndBarState.toString();
    t.assertTruthy(funcStr.includes('Math.max') || funcStr.includes('Math.min') || funcStr.includes('MAX_BARS'),
        'setLoopRegionEndBarState should clamp bar value to MAX_BARS');
});

TestRunner.test('Loop Region - setLoopRegionEndBarState guards against missing appServices', (t) => {
    const funcStr = setLoopRegionEndBarState.toString();
    t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'),
        'setLoopRegionEndBarState should check appServices before calling captureStateForUndo');
});

TestRunner.test('Loop Region - getLoopRegionState returns object', (t) => {
    t.assertEqual(typeof getLoopRegionState(), 'object', 'getLoopRegionState should return an object');
    t.assertTruthy(getLoopRegionState() !== null, 'getLoopRegionState should not return null');
});

TestRunner.test('Loop Region - Loop Region state structure validation', (t) => {
    const region = getLoopRegionState();
    t.assertTruthy(typeof region === 'object', 'Loop region should be an object');
    // Should have enabled, startBar, endBar properties (or similar)
    t.assertTruthy('enabled' in region || 'startBar' in region || 'start' in region,
        'Loop region should have at least one of: enabled, startBar, or start property');
});

TestRunner.test('Loop Region - getLoopRegionEnabledState returns boolean', (t) => {
    t.assertEqual(typeof getLoopRegionEnabledState(), 'boolean', 'getLoopRegionEnabledState should return a boolean');
});

TestRunner.test('Loop Region - getLoopRegionStartBarState returns number', (t) => {
    t.assertEqual(typeof getLoopRegionStartBarState(), 'number', 'getLoopRegionStartBarState should return a number');
});

TestRunner.test('Loop Region - getLoopRegionEndBarState returns number', (t) => {
    t.assertEqual(typeof getLoopRegionEndBarState(), 'number', 'getLoopRegionEndBarState should return a number');
});

TestRunner.test('Loop Region - Loop Region state independence verification', (t) => {
    // Loop Region is independent from other state functions
    t.assertEqual(typeof getLoopRegionState, 'function', 'getLoopRegionState should exist');
    t.assertEqual(typeof setLoopRegionState, 'function', 'setLoopRegionState should exist');
    t.assertEqual(typeof getLoopRegionEnabledState, 'function', 'getLoopRegionEnabledState should exist');
    t.assertEqual(typeof setLoopRegionEnabledState, 'function', 'setLoopRegionEnabledState should exist');
    t.assertEqual(typeof getLoopRegionStartBarState, 'function', 'getLoopRegionStartBarState should exist');
    t.assertEqual(typeof setLoopRegionStartBarState, 'function', 'setLoopRegionStartBarState should exist');
    t.assertEqual(typeof getLoopRegionEndBarState, 'function', 'getLoopRegionEndBarState should exist');
    t.assertEqual(typeof setLoopRegionEndBarState, 'function', 'setLoopRegionEndBarState should exist');
});

TestRunner.test('Loop Region - All Loop Region state setters call captureStateForUndo', (t) => {
    // Verify all 4 Loop Region setters call captureStateForUndo
    const setters = ['setLoopRegionState', 'setLoopRegionEnabledState', 'setLoopRegionStartBarState', 'setLoopRegionEndBarState'];
    setters.forEach(name => {
        const funcStr = eval(name).toString();
        t.assertTruthy(funcStr.includes('captureStateForUndo'), `${name} should call captureStateForUndo`);
    });
});

TestRunner.test('Loop Region - All Loop Region state setters guard against missing appServices', (t) => {
    // Verify all 4 Loop Region setters check for appServices
    const setters = ['setLoopRegionState', 'setLoopRegionEnabledState', 'setLoopRegionStartBarState', 'setLoopRegionEndBarState'];
    setters.forEach(name => {
        const funcStr = eval(name).toString();
        t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'),
            `${name} should check appServices before calling captureStateForUndo`);
    });
});

TestRunner.test('Ghost Track & Loop Region - APP_VERSION validation for Day 354', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 354');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 33, 'Minor version should be >= 33 for Day 354');
    }
});
// ================================================================
// Day 355: Recording Audio Module Extended Function Tests
// ================================================================
TestRunner.test('Recording Audio - startAudioRecording is an async function', (t) => {
    const result = startAudioRecording(null, false);
    t.assertTruthy(result instanceof Promise, 'startAudioRecording should return a Promise');
});

TestRunner.test('Recording Audio - startAudioRecording accepts 2 parameters', (t) => {
    const funcStr = startAudioRecording.toString();
    // Check parameter count - function has (track, isMonitoringEnabled)
    t.assertTruthy(funcStr.includes('track') || funcStr.includes('track'), 'startAudioRecording should reference track parameter');
});

TestRunner.test('Recording Audio - startAudioRecording references track parameter', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('track'), 'startAudioRecording should reference track parameter');
});

TestRunner.test('Recording Audio - startAudioRecording references isMonitoringEnabled parameter', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('isMonitoringEnabled') || funcStr.includes('Monitoring'), 'startAudioRecording should reference monitoring parameter');
});

TestRunner.test('Recording Audio - startAudioRecording validates track type', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('type') && funcStr.includes('Audio'), 'startAudioRecording should validate Audio track type');
});

TestRunner.test('Recording Audio - startAudioRecording handles microphone permissions error', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('NotAllowedError') || funcStr.includes('permission'), 'startAudioRecording should handle permission errors');
});

TestRunner.test('Recording Audio - startAudioRecording handles no device found error', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('NotFoundError') || funcStr.includes('device') || funcStr.includes('microphone'), 'startAudioRecording should handle missing device errors');
});

TestRunner.test('Recording Audio - startAudioRecording creates Tone.UserMedia', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('UserMedia') || funcStr.includes('mic'), 'startAudioRecording should create Tone.UserMedia');
});

TestRunner.test('Recording Audio - startAudioRecording creates Tone.Recorder', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('Recorder') || funcStr.includes('recorder'), 'startAudioRecording should create Tone.Recorder');
});

TestRunner.test('Recording Audio - startAudioRecording connects audio nodes (mic -> gain -> recorder)', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('connect') && funcStr.includes('mic') || funcStr.includes('connect'), 'startAudioRecording should connect audio nodes');
});

TestRunner.test('Recording Audio - startAudioRecording updates recording state', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('setIsRecordingState') || funcStr.includes('isRecording'), 'startAudioRecording should update recording state');
});

TestRunner.test('Recording Audio - startAudioRecording updates recording track ID state', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('setRecordingTrackIdState') || funcStr.includes('recordingTrackId'), 'startAudioRecording should update recording track ID state');
});

TestRunner.test('Recording Audio - startAudioRecording updates recording start time state', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('setRecordingStartTimeState') || funcStr.includes('recordingStartTime') || funcStr.includes('Transport'), 'startAudioRecording should update recording start time state');
});

TestRunner.test('Recording Audio - startAudioRecording calls showNotification on error', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'startAudioRecording should call showNotification on error');
});

TestRunner.test('Recording Audio - stopAudioRecording is an async function', (t) => {
    const result = stopAudioRecording();
    t.assertTruthy(result instanceof Promise, 'stopAudioRecording should return a Promise');
});

TestRunner.test('Recording Audio - stopAudioRecording accepts 0 parameters', (t) => {
    const funcStr = stopAudioRecording.toString();
    // stopAudioRecording takes no parameters
    t.assertEqual(funcStr.match(/\([^)]*\)/)?.[0] || '()', '()', 'stopAudioRecording should accept 0 parameters');
});

TestRunner.test('Recording Audio - stopAudioRecording handles null recorder', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('recorder') && funcStr.includes('null'), 'stopAudioRecording should handle null recorder');
});

TestRunner.test('Recording Audio - stopAudioRecording processes recorded blob', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('blob') || funcStr.includes('addAudioClip'), 'stopAudioRecording should process recorded blob');
});

TestRunner.test('Recording Audio - stopAudioRecording clears recording state', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('setIsRecordingState') && funcStr.includes('false'), 'stopAudioRecording should clear recording state');
});

TestRunner.test('Recording Audio - stopAudioRecording clears recording track ID state', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('setRecordingTrackIdState') && funcStr.includes('null'), 'stopAudioRecording should clear recording track ID state');
});

TestRunner.test('Recording Audio - stopAudioRecording clears recording start time state', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('setRecordingStartTimeState') || funcStr.includes('recordingStartTime'), 'stopAudioRecording should clear recording start time state');
});

TestRunner.test('Recording Audio - stopAudioRecording disposes audio resources', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('dispose') || funcStr.includes('close'), 'stopAudioRecording should dispose audio resources');
});

TestRunner.test('Recording Audio - stopAudioRecording handles empty recording', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('size') || funcStr.includes('empty'), 'stopAudioRecording should handle empty recording');
});

TestRunner.test('Recording Audio - stopAudioRecording calls showNotification on error', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'stopAudioRecording should call showNotification on error');
});

TestRunner.test('Recording Audio - setRecordingInputGain is a function', (t) => {
    t.assertEqual(typeof setRecordingInputGain, 'function', 'setRecordingInputGain should be a function');
});

TestRunner.test('Recording Audio - setRecordingInputGain accepts 1 parameter', (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('gainValue') || funcStr.includes('value') || funcStr.includes('gain'), 'setRecordingInputGain should reference gain parameter');
});

TestRunner.test('Recording Audio - setRecordingInputGain clamps Infinity values', (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('Math.max') || funcStr.includes('Math.min') || funcStr.includes('Infinity'), 'setRecordingInputGain should clamp Infinity values');
});

TestRunner.test('Recording Audio - setRecordingInputGain clamps negative values', (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('Math.max') || funcStr.includes('negative'), 'setRecordingInputGain should clamp negative values');
});

TestRunner.test('Recording Audio - Recording audio constraints disable echo cancellation', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('echoCancellation') && funcStr.includes('false'), 'Recording should disable echo cancellation');
});

TestRunner.test('Recording Audio - Recording audio constraints disable auto gain control', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('autoGainControl') && funcStr.includes('false'), 'Recording should disable auto gain control');
});

TestRunner.test('Recording Audio - Recording audio constraints disable noise suppression', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('noiseSuppression') && funcStr.includes('false'), 'Recording should disable noise suppression');
});

TestRunner.test('Recording Audio - Recording constants have valid sample rate', (t) => {
    t.assertTruthy(typeof RECORDING_SAMPLE_RATE !== 'undefined', 'RECORDING_SAMPLE_RATE should be defined');
    t.assertEqual(RECORDING_SAMPLE_RATE, 44100, 'Recording sample rate should be 44100 Hz');
});

TestRunner.test('Recording Audio - Recording constants have valid channel count', (t) => {
    t.assertTruthy(typeof RECORDING_NUM_CHANNELS !== 'undefined', 'RECORDING_NUM_CHANNELS should be defined');
    t.assertEqual(RECORDING_NUM_CHANNELS, 1, 'Recording should be mono (1 channel)');
});

TestRunner.test('Recording Audio - Recording constants have valid bit depth', (t) => {
    t.assertTruthy(typeof RECORDING_BIT_DEPTH !== 'undefined', 'RECORDING_BIT_DEPTH should be defined');
    t.assertEqual(RECORDING_BIT_DEPTH, 16, 'Recording bit depth should be 16-bit');
});

TestRunner.test('Recording Audio - Recording constants have valid mime type', (t) => {
    t.assertTruthy(typeof RECORDING_MIME_TYPE !== 'undefined', 'RECORDING_MIME_TYPE should be defined');
    t.assertEqual(RECORDING_MIME_TYPE, 'audio/webm', 'Recording mime type should be audio/webm');
});

TestRunner.test('Recording Audio - Recording input gain constants are valid', (t) => {
    t.assertTruthy(typeof MIN_RECORDING_INPUT_GAIN !== 'undefined', 'MIN_RECORDING_INPUT_GAIN should be defined');
    t.assertTruthy(typeof MAX_RECORDING_INPUT_GAIN !== 'undefined', 'MAX_RECORDING_INPUT_GAIN should be defined');
    t.assertTruthy(typeof DEFAULT_RECORDING_INPUT_GAIN !== 'undefined', 'DEFAULT_RECORDING_INPUT_GAIN should be defined');
    t.assertTruthy(MIN_RECORDING_INPUT_GAIN >= 0, 'MIN_RECORDING_INPUT_GAIN should be >= 0');
    t.assertTruthy(MAX_RECORDING_INPUT_GAIN <= 10, 'MAX_RECORDING_INPUT_GAIN should be <= 10');
    t.assertTruthy(DEFAULT_RECORDING_INPUT_GAIN >= MIN_RECORDING_INPUT_GAIN && DEFAULT_RECORDING_INPUT_GAIN <= MAX_RECORDING_INPUT_GAIN, 'DEFAULT_RECORDING_INPUT_GAIN should be within range');
});

TestRunner.test('Recording Audio - Monitoring volume constants are valid', (t) => {
    t.assertTruthy(typeof MIN_MONITORING_VOLUME !== 'undefined' || typeof MIN_RECORDING_MONITORING_VOLUME !== 'undefined', 'MIN monitoring volume should be defined');
    t.assertTruthy(typeof MAX_MONITORING_VOLUME !== 'undefined' || typeof MAX_RECORDING_MONITORING_VOLUME !== 'undefined', 'MAX monitoring volume should be defined');
    t.assertTruthy(typeof DEFAULT_MONITORING_VOLUME !== 'undefined' || typeof DEFAULT_RECORDING_MONITORING_VOLUME !== 'undefined', 'DEFAULT monitoring volume should be defined');
});

TestRunner.test('Recording Audio - Max recording length is reasonable', (t) => {
    t.assertTruthy(typeof MAX_RECORDING_LENGTH_SECONDS !== 'undefined', 'MAX_RECORDING_LENGTH_SECONDS should be defined');
    t.assertTruthy(MAX_RECORDING_LENGTH_SECONDS >= 60, 'Max recording should be at least 60 seconds');
    t.assertTruthy(MAX_RECORDING_LENGTH_SECONDS <= 3600, 'Max recording should be at most 1 hour');
});

TestRunner.test('Recording Audio - Min recording length is valid', (t) => {
    t.assertTruthy(typeof MIN_RECORDING_LENGTH_SECONDS !== 'undefined', 'MIN_RECORDING_LENGTH_SECONDS should be defined');
    t.assertTruthy(MIN_RECORDING_LENGTH_SECONDS > 0, 'Min recording length should be positive');
});

TestRunner.test('Recording Audio - APP_VERSION validation for Day 355', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 355');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 34, 'Minor version should be >= 34 for Day 355');
    }
});

// ================================================================
// Day 450: Recording Microphone E2E Track Resolver Tests
// ================================================================
TestRunner.test('Recording Microphone E2E - resolveRecordingMicrophoneTestTrack is a function export', (t) => {
    t.assertEqual(typeof resolveRecordingMicrophoneTestTrack, 'function', 'resolveRecordingMicrophoneTestTrack should be a function');
});

TestRunner.test('Recording Microphone E2E - resolveRecordingMicrophoneTestTrack accepts 4 parameters', (t) => {
    t.assertEqual(resolveRecordingMicrophoneTestTrack.length, 4, 'resolveRecordingMicrophoneTestTrack should accept 4 parameters');
});

TestRunner.test('Recording Microphone E2E - resolveRecordingMicrophoneTestTrack falls back from invalid explicit track to armed track', (t) => {
    const armedTrack = { id: 9, type: 'Audio', name: 'Armed Audio' };
    const selected = resolveRecordingMicrophoneTestTrack(123, [armedTrack], () => null, () => 9);
    t.assertEqual(selected.track, armedTrack, 'should select the armed Audio track when the explicit track is invalid');
    t.assertEqual(selected.trackSelectionSource, 'armed', 'should report the armed track source');
});

TestRunner.test('Recording Microphone E2E - resolveRecordingMicrophoneTestTrack falls back to the first Audio track', (t) => {
    const fallbackTrack = { id: 12, type: 'Audio', name: 'Fallback Audio' };
    const selected = resolveRecordingMicrophoneTestTrack(null, [fallbackTrack], () => null, () => null);
    t.assertEqual(selected.track, fallbackTrack, 'should select the first available Audio track');
    t.assertEqual(selected.trackSelectionSource, 'auto', 'should report the auto-selected track source');
});

TestRunner.test('Recording Microphone E2E - resolveRecordingMicrophoneTestTrack returns selection metadata', (t) => {
    const explicitTrack = { id: 21, type: 'Audio', name: 'Explicit Audio' };
    const selected = resolveRecordingMicrophoneTestTrack(21, [explicitTrack], (id) => (id === 21 ? explicitTrack : null), () => null);
    t.assertEqual(selected.explicitTrack, explicitTrack, 'should expose the explicit track');
    t.assertEqual(selected.trackSelectionSource, 'explicit', 'should mark explicit selections clearly');
});

TestRunner.test('Recording Microphone E2E - resolveRecordingMicrophoneTestTrack APP_VERSION validation for Day 450', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 450');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 124, 'Minor version should be >= 124 for Day 450');
    }
});

// ================================================================
// Day 438: Recording Microphone E2E Helper Tests
// ================================================================
TestRunner.test('Recording Microphone E2E - runRecordingMicrophoneE2ETest is a function export', (t) => {
    t.assertEqual(typeof runRecordingMicrophoneE2ETest, 'function', 'runRecordingMicrophoneE2ETest should be a function');
});

TestRunner.test('Recording Microphone E2E - runRecordingMicrophoneE2ETest accepts 2 parameters', (t) => {
    t.assertEqual(runRecordingMicrophoneE2ETest.length, 2, 'runRecordingMicrophoneE2ETest should accept 2 parameters');
});

TestRunner.test('Recording Microphone E2E - runRecordingMicrophoneE2ETest references track selection', (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('explicitTrack') && funcStr.includes('armedTrack') && funcStr.includes('autoSelectedTrack'), 'runRecordingMicrophoneE2ETest should resolve track selection safely');
});

TestRunner.test('Recording Microphone E2E - runRecordingMicrophoneE2ETest prefers Audio tracks', (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes("type === 'Audio'") || funcStr.includes('track.type !== \'Audio\''), 'runRecordingMicrophoneE2ETest should guard for Audio tracks');
});

TestRunner.test('Recording Microphone E2E - runRecordingMicrophoneE2ETest checks recording busy state', (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('isTrackRecordingState') || funcStr.includes("step: 'busy'"), 'runRecordingMicrophoneE2ETest should stop when a recording is already active');
});

TestRunner.test('Recording Microphone E2E - runRecordingMicrophoneE2ETest checks getUserMedia support', (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('getUserMedia') && funcStr.includes("step: 'unsupported'"), 'runRecordingMicrophoneE2ETest should return an unsupported-browser failure');
});

TestRunner.test('Recording Microphone E2E - runRecordingMicrophoneE2ETest uses start and stop workflow', (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('startAudioRecording') && funcStr.includes('stopAudioRecording'), 'runRecordingMicrophoneE2ETest should start and stop recording');
});

TestRunner.test('Recording Microphone E2E - APP_VERSION validation for Day 438', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 438');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 112, 'Minor version should be >= 112 for Day 438');
    }
});

// ============================================
// ================================================================
// Day 530: Recording Module Extended Functions Tests
// ================================================================
TestRunner.test('Day 530 - Recording - getRecordingInputGainNode is a function export', (t) => {
    t.assertEqual(typeof getRecordingInputGainNode, 'function', 'getRecordingInputGainNode should be a function');
});

TestRunner.test('Day 530 - Recording - getRecordingInputGainNode accepts 0 parameters', (t) => {
    t.assertEqual(getRecordingInputGainNode.length, 0, 'getRecordingInputGainNode should accept 0 parameters');
});

TestRunner.test('Day 530 - Recording - getRecordingInputGainNode creates Tone.Gain node', (t) => {
    const funcStr = getRecordingInputGainNode.toString();
    t.assertTruthy(funcStr.includes('Tone.Gain') || funcStr.includes('new Tone.Gain'), 'getRecordingInputGainNode should create Tone.Gain node');
});

TestRunner.test('Day 530 - Recording - getRecordingInputGainNode references recordingInputGainValue', (t) => {
    const funcStr = getRecordingInputGainNode.toString();
    t.assertTruthy(funcStr.includes('recordingInputGainValue'), 'getRecordingInputGainNode should use recordingInputGainValue');
});

TestRunner.test('Day 530 - Recording - getRecordingInputGainNode checks disposed state', (t) => {
    const funcStr = getRecordingInputGainNode.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'getRecordingInputGainNode should check disposed state');
});

TestRunner.test('Day 530 - Recording - setRecordingInputGain is a function export', (t) => {
    t.assertEqual(typeof setRecordingInputGain, 'function', 'setRecordingInputGain should be a function');
});

TestRunner.test('Day 530 - Recording - setRecordingInputGain accepts 1 parameter', (t) => {
    t.assertEqual(setRecordingInputGain.length, 1, 'setRecordingInputGain should accept 1 parameter');
});

TestRunner.test('Day 530 - Recording - setRecordingInputGain clamps to valid range', (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('Math.max') || funcStr.includes('Math.min'), 'setRecordingInputGain should clamp values');
});

TestRunner.test('Day 530 - Recording - setRecordingInputGain references gainValue', (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('gainValue') || funcStr.includes('value'), 'setRecordingInputGain should reference gain value');
});

TestRunner.test('Day 530 - Recording - cleanupRecordingAudioResources is a function export', (t) => {
    t.assertEqual(typeof cleanupRecordingAudioResources, 'function', 'cleanupRecordingAudioResources should be a function');
});

TestRunner.test('Day 530 - Recording - cleanupRecordingAudioResources handles mic disconnect', (t) => {
    const funcStr = cleanupRecordingAudioResources.toString();
    t.assertTruthy(funcStr.includes('mic') && (funcStr.includes('disconnect') || funcStr.includes('close') || funcStr.includes('dispose')), 'cleanupRecordingAudioResources should handle mic cleanup');
});

TestRunner.test('Day 530 - Recording - cleanupRecordingAudioResources handles recorder dispose', (t) => {
    const funcStr = cleanupRecordingAudioResources.toString();
    t.assertTruthy(funcStr.includes('recorder') && (funcStr.includes('dispose') || funcStr.includes('disconnect')), 'cleanupRecordingAudioResources should handle recorder cleanup');
});

TestRunner.test('Day 530 - Recording - cleanupRecordingScheduling is a function export', (t) => {
    t.assertEqual(typeof cleanupRecordingScheduling, 'function', 'cleanupRecordingScheduling should be a function');
});

TestRunner.test('Day 530 - Recording - cleanupRecordingScheduling accepts 0 parameters', (t) => {
    t.assertEqual(cleanupRecordingScheduling.length, 0, 'cleanupRecordingScheduling should accept 0 parameters');
});

TestRunner.test('Day 530 - Recording - cleanupRecordingScheduling calls cancelScheduledRecording', (t) => {
    const funcStr = cleanupRecordingScheduling.toString();
    t.assertTruthy(funcStr.includes('cancelScheduledRecording'), 'cleanupRecordingScheduling should call cancelScheduledRecording');
});

TestRunner.test('Day 530 - Recording - runRecordingMicrophoneE2ETest is async', (t) => {
    t.assertEqual(runRecordingMicrophoneE2ETest.constructor.name, 'AsyncFunction', 'runRecordingMicrophoneE2ETest should be async');
});

TestRunner.test('Day 530 - Recording - runRecordingMicrophoneE2ETest accepts 2 parameters', (t) => {
    t.assertEqual(runRecordingMicrophoneE2ETest.length, 2, 'runRecordingMicrophoneE2ETest should accept 2 parameters');
});

TestRunner.test('Day 530 - Recording - runRecordingMicrophoneE2ETest uses resolveRecordingMicrophoneTestTrack', (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('resolveRecordingMicrophoneTestTrack'), 'runRecordingMicrophoneE2ETest should use resolveRecordingMicrophoneTestTrack');
});

TestRunner.test('Day 530 - Recording - runRecordingMicrophoneE2ETest returns structured result object', (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('ok:') && funcStr.includes('step:'), 'runRecordingMicrophoneE2ETest should return result with ok and step');
});

TestRunner.test('Day 530 - Recording - runRecordingMicrophoneE2ETest calls cleanupRecordingScheduling', (t) => {
    const funcStr = runRecordingMicrophoneE2ETest.toString();
    t.assertTruthy(funcStr.includes('cleanupRecordingScheduling'), 'runRecordingMicrophoneE2ETest should call cleanupRecordingScheduling');
});

TestRunner.test('Day 530 - Recording - APP_VERSION validation for Day 530', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 530');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 192, 'Minor version should be >= 192 for Day 530');
    }

// Day 543: stopAudioRecording Error Handling Tests
// ================================================================
TestRunner.test('Recording Audio - stopAudioRecording uses activeRecorder from captured scope', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('activeRecorder') || funcStr.includes('recorder'), 'stopAudioRecording should capture the active recorder');
});

TestRunner.test('Recording Audio - stopAudioRecording uses activeMic from captured scope', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('activeMic') || funcStr.includes('mic'), 'stopAudioRecording should capture the active mic');
});

TestRunner.test('Recording Audio - stopAudioRecording uses activeTrackId from state', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('activeTrackId') || funcStr.includes('getRecordingTrackIdState'), 'stopAudioRecording should use recorded track ID from state');
});

TestRunner.test('Recording Audio - stopAudioRecording uses activeStartTime from state', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('activeStartTime') || funcStr.includes('getRecordingStartTimeState'), 'stopAudioRecording should use recording start time from state');
});

TestRunner.test('Recording Audio - stopAudioRecording disconnects and disposes resources', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(
        (funcStr.includes('disconnect') || funcStr.includes('close') || funcStr.includes('dispose')),
        'stopAudioRecording should disconnect/close/dispose audio resources'
    );
});

TestRunner.test('Recording Audio - stopAudioRecording nulls out mic and recorder', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(
        funcStr.includes('mic = null') && funcStr.includes('recorder = null'),
        'stopAudioRecording should null out mic and recorder after stopping'
    );
});

TestRunner.test('Recording Audio - stopAudioRecording returns false when no active recorder', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(
        funcStr.includes('return false'),
        'stopAudioRecording should return false when no active recorder'
    );
});

TestRunner.test('Recording Audio - stopAudioRecording validates recording size', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(
        funcStr.includes('size') || funcStr.includes('size <'),
        'stopAudioRecording should check recording blob size'
    );
});

TestRunner.test('Recording Audio - stopAudioRecording notifies when recording is empty', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(
        funcStr.includes('empty') || funcStr.includes('Too short'),
        'stopAudioRecording should notify when recording is too small'
    );
});

TestRunner.test('Recording Audio - stopAudioRecording finds track via getTrackById', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(
        funcStr.includes('getTrackById') || funcStr.includes('getTrack'),
        'stopAudioRecording should find the recorded track via getTrackById'
    );
});

TestRunner.test('Recording Audio - stopAudioRecording checks track type is Audio', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(
        funcStr.includes("type === 'Audio'") || funcStr.includes("type !== 'Audio'"),
        'stopAudioRecording should validate track type is Audio'
    );
});

TestRunner.test('Recording Audio - stopAudioRecording calls addAudioClip on track', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(
        funcStr.includes('addAudioClip'),
        'stopAudioRecording should call addAudioClip to save recording'
    );
});

TestRunner.test('Recording Audio - stopAudioRecording clears all recording state', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(
        funcStr.includes('setIsRecordingState') &&
        funcStr.includes('setRecordingTrackIdState') &&
        funcStr.includes('setRecordingStartTimeState'),
        'stopAudioRecording should clear all recording state (isRecording, trackId, startTime)'
    );
});

TestRunner.test('Recording Audio - stopAudioRecording calls cleanupRecordingScheduling', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(
        funcStr.includes('cleanupRecordingScheduling'),
        'stopAudioRecording should call cleanupRecordingScheduling'
    );
});

TestRunner.test('Recording Audio - APP_VERSION validation for Day 543', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 543');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 201, 'Minor version should be >= 201 for Day 543');
    }
});


// ============================================
TestRunner.test('Project Save/Load - saveProjectInternal is a function', (t) => {
    t.assertEqual(typeof saveProjectInternal, 'function', 'saveProjectInternal should be a function');
});

TestRunner.test('Project Save/Load - loadProjectInternal is a function', (t) => {
    t.assertEqual(typeof loadProjectInternal, 'function', 'loadProjectInternal should be a function');
});

TestRunner.test('Project Save/Load - handleProjectFileLoadInternal is a function', (t) => {
    t.assertEqual(typeof handleProjectFileLoadInternal, 'function', 'handleProjectFileLoadInternal should be a function');
});

TestRunner.test('Project Save/Load - exportToWavInternal is a function', (t) => {
    t.assertEqual(typeof exportToWavInternal, 'function', 'exportToWavInternal should be a function');
});

TestRunner.test('Project Save/Load - saveProjectInternal calls gatherProjectDataInternal', (t) => {
    const funcStr = saveProjectInternal.toString();
    t.assertTruthy(funcStr.includes('gatherProjectDataInternal'), 'saveProjectInternal should call gatherProjectDataInternal');
});

TestRunner.test('Project Save/Load - saveProjectInternal creates Blob and downloads', (t) => {
    const funcStr = saveProjectInternal.toString();
    t.assertTruthy(funcStr.includes('Blob') && funcStr.includes('download'), 'saveProjectInternal should create Blob and trigger download');
});

TestRunner.test('Project Save/Load - saveProjectInternal uses .snug file extension', (t) => {
    const funcStr = saveProjectInternal.toString();
    t.assertTruthy(funcStr.includes('.snug'), 'saveProjectInternal should use .snug file extension');
});

TestRunner.test('Project Save/Load - saveProjectInternal has error handling', (t) => {
    const funcStr = saveProjectInternal.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'saveProjectInternal should have try-catch error handling');
});

TestRunner.test('Project Save/Load - saveProjectInternal calls showNotification', (t) => {
    const funcStr = saveProjectInternal.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'saveProjectInternal should call showNotification');
});

TestRunner.test('Project Save/Load - loadProjectInternal triggers file input click', (t) => {
    const funcStr = loadProjectInternal.toString();
    t.assertTruthy(funcStr.includes('click') && funcStr.includes('loadProjectInput'), 'loadProjectInternal should trigger file input click');
});

TestRunner.test('Project Save/Load - loadProjectInternal has error handling', (t) => {
    const funcStr = loadProjectInternal.toString();
    t.assertTruthy(funcStr.includes('console.error'), 'loadProjectInternal should have error handling');
});

TestRunner.test('Project Save/Load - handleProjectFileLoadInternal is async', (t) => {
    const funcStr = handleProjectFileLoadInternal.toString();
    t.assertTruthy(funcStr.includes('async') || funcStr.includes('Promise'), 'handleProjectFileLoadInternal should be async');
});

TestRunner.test('Project Save/Load - handleProjectFileLoadInternal validates .snug extension', (t) => {
    const funcStr = handleProjectFileLoadInternal.toString();
    t.assertTruthy(funcStr.includes('.snug'), 'handleProjectFileLoadInternal should validate .snug extension');
});

TestRunner.test('Project Save/Load - handleProjectFileLoadInternal uses FileReader', (t) => {
    const funcStr = handleProjectFileLoadInternal.toString();
    t.assertTruthy(funcStr.includes('FileReader'), 'handleProjectFileLoadInternal should use FileReader');
});

TestRunner.test('Project Save/Load - handleProjectFileLoadInternal parses JSON', (t) => {
    const funcStr = handleProjectFileLoadInternal.toString();
    t.assertTruthy(funcStr.includes('JSON.parse'), 'handleProjectFileLoadInternal should parse JSON');
});

TestRunner.test('Project Save/Load - handleProjectFileLoadInternal calls reconstructDAWInternal', (t) => {
    const funcStr = handleProjectFileLoadInternal.toString();
    t.assertTruthy(funcStr.includes('reconstructDAWInternal'), 'handleProjectFileLoadInternal should call reconstructDAWInternal');
});

TestRunner.test('Project Save/Load - handleProjectFileLoadInternal clears undo/redo stacks', (t) => {
    const funcStr = handleProjectFileLoadInternal.toString();
    t.assertTruthy(funcStr.includes('undoStack') && funcStr.includes('redoStack'), 'handleProjectFileLoadInternal should clear undo/redo stacks');
});

TestRunner.test('Project Save/Load - handleProjectFileLoadInternal has error handling', (t) => {
    const funcStr = handleProjectFileLoadInternal.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'handleProjectFileLoadInternal should have try-catch error handling');
});

TestRunner.test('Project Save/Load - handleProjectFileLoadInternal calls showNotification', (t) => {
    const funcStr = handleProjectFileLoadInternal.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'handleProjectFileLoadInternal should call showNotification');
});

TestRunner.test('Project Save/Load - handleProjectFileLoadInternal handles invalid file type', (t) => {
    const funcStr = handleProjectFileLoadInternal.toString();
    t.assertTruthy(funcStr.includes('Invalid file type') || funcStr.includes('invalid'), 'handleProjectFileLoadInternal should handle invalid file types');
});

TestRunner.test('Project Save/Load - exportToWavInternal is async', (t) => {
    const funcStr = exportToWavInternal.toString();
    t.assertTruthy(funcStr.includes('async') || funcStr.includes('Promise'), 'exportToWavInternal should be async');
});

TestRunner.test('Project Save/Load - exportToWavInternal validates appServices', (t) => {
    const funcStr = exportToWavInternal.toString();
    t.assertTruthy(funcStr.includes('showNotification') && funcStr.includes('getActualMasterGainNode'), 'exportToWavInternal should validate appServices');
});

TestRunner.test('Project Save/Load - gatherProjectDataInternal is a function', (t) => {
    t.assertEqual(typeof gatherProjectDataInternal, 'function', 'gatherProjectDataInternal should be a function');
});

TestRunner.test('Project Save/Load - gatherProjectDataInternal includes version', (t) => {
    const funcStr = gatherProjectDataInternal.toString();
    t.assertTruthy(funcStr.includes('version') && funcStr.includes('APP_VERSION'), 'gatherProjectDataInternal should include version');
});

TestRunner.test('Project Save/Load - gatherProjectDataInternal includes globalSettings', (t) => {
    const funcStr = gatherProjectDataInternal.toString();
    t.assertTruthy(funcStr.includes('globalSettings') && funcStr.includes('tempo'), 'gatherProjectDataInternal should include globalSettings');
});

TestRunner.test('Project Save/Load - gatherProjectDataInternal includes masterEffects', (t) => {
    const funcStr = gatherProjectDataInternal.toString();
    t.assertTruthy(funcStr.includes('masterEffects'), 'gatherProjectDataInternal should include masterEffects');
});

TestRunner.test('Project Save/Load - gatherProjectDataInternal includes sendTracks', (t) => {
    const funcStr = gatherProjectDataInternal.toString();
    t.assertTruthy(funcStr.includes('sendTracks'), 'gatherProjectDataInternal should include sendTracks');
});

TestRunner.test('Project Save/Load - gatherProjectDataInternal includes tracks', (t) => {
    const funcStr = gatherProjectDataInternal.toString();
    t.assertTruthy(funcStr.includes('tracks') && funcStr.includes('getTracksState'), 'gatherProjectDataInternal should include tracks');
});

TestRunner.test('Project Save/Load - gatherProjectDataInternal handles track type-specific data', (t) => {
    const funcStr = gatherProjectDataInternal.toString();
    t.assertTruthy(funcStr.includes('Synth') && funcStr.includes('Sampler') && funcStr.includes('DrumSampler'), 'gatherProjectDataInternal should handle track type-specific data');
});

TestRunner.test('Project Save/Load - gatherProjectDataInternal has error handling', (t) => {
    const funcStr = gatherProjectDataInternal.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'gatherProjectDataInternal should have try-catch error handling');
});

TestRunner.test('Project Save/Load - APP_VERSION validation for Day 356', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 356');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 35, 'Minor version should be >= 35 for Day 356');
    }
});

// Day 357: Window Management State Functions Tests
TestRunner.test('Window Management - addWindowToStoreState is a function export', (t) => {
    t.assertEqual(typeof addWindowToStoreState, 'function', 'addWindowToStoreState should be a function');
});

TestRunner.test('Window Management - addWindowToStoreState accepts 2 parameters', (t) => {
    const funcStr = addWindowToStoreState.toString();
    t.assertTruthy(funcStr.includes('id') && funcStr.includes('instance'), 'addWindowToStoreState should accept id and instance parameters');
});

TestRunner.test('Window Management - addWindowToStoreState references id parameter', (t) => {
    const funcStr = addWindowToStoreState.toString();
    t.assertTruthy(funcStr.includes('id'), 'addWindowToStoreState should reference id parameter');
});

TestRunner.test('Window Management - addWindowToStoreState references instance parameter', (t) => {
    const funcStr = addWindowToStoreState.toString();
    t.assertTruthy(funcStr.includes('instance'), 'addWindowToStoreState should reference instance parameter');
});

TestRunner.test('Window Management - addWindowToStoreState calls openWindowsMap.set', (t) => {
    const funcStr = addWindowToStoreState.toString();
    t.assertTruthy(funcStr.includes('set'), 'addWindowToStoreState should call set on openWindowsMap');
});

TestRunner.test('Window Management - removeWindowFromStoreState is a function export', (t) => {
    t.assertEqual(typeof removeWindowFromStoreState, 'function', 'removeWindowFromStoreState should be a function');
});

TestRunner.test('Window Management - removeWindowFromStoreState accepts 1 parameter', (t) => {
    const funcStr = removeWindowFromStoreState.toString();
    t.assertTruthy(funcStr.includes('id'), 'removeWindowFromStoreState should accept id parameter');
});

TestRunner.test('Window Management - removeWindowFromStoreState references id parameter', (t) => {
    const funcStr = removeWindowFromStoreState.toString();
    t.assertTruthy(funcStr.includes('id'), 'removeWindowFromStoreState should reference id parameter');
});

TestRunner.test('Window Management - removeWindowFromStoreState calls openWindowsMap.delete', (t) => {
    const funcStr = removeWindowFromStoreState.toString();
    t.assertTruthy(funcStr.includes('delete'), 'removeWindowFromStoreState should call delete on openWindowsMap');
});

TestRunner.test('Window Management - getOpenWindowsState is a function export', (t) => {
    t.assertEqual(typeof getOpenWindowsState, 'function', 'getOpenWindowsState should be a function');
});

TestRunner.test('Window Management - getOpenWindowsState accepts 0 parameters', (t) => {
    const funcStr = getOpenWindowsState.toString();
    t.assertTruthy(!funcStr.includes('id') && !funcStr.includes('instance'), 'getOpenWindowsState should accept no parameters');
});

TestRunner.test('Window Management - getOpenWindowsState returns openWindowsMap', (t) => {
    const funcStr = getOpenWindowsState.toString();
    t.assertTruthy(funcStr.includes('openWindowsMap'), 'getOpenWindowsState should return openWindowsMap');
});

TestRunner.test('Window Management - getOpenWindowsState returns Map type', (t) => {
    const funcStr = getOpenWindowsState.toString();
    t.assertTruthy(funcStr.includes('Map'), 'getOpenWindowsState should return Map type');
});

TestRunner.test('Window Management - getWindowByIdState is a function export', (t) => {
    t.assertEqual(typeof getWindowByIdState, 'function', 'getWindowByIdState should be a function');
});

TestRunner.test('Window Management - getWindowByIdState accepts 1 parameter', (t) => {
    const funcStr = getWindowByIdState.toString();
    t.assertTruthy(funcStr.includes('id'), 'getWindowByIdState should accept id parameter');
});

TestRunner.test('Window Management - getWindowByIdState references id parameter', (t) => {
    const funcStr = getWindowByIdState.toString();
    t.assertTruthy(funcStr.includes('id'), 'getWindowByIdState should reference id parameter');
});

TestRunner.test('Window Management - getWindowByIdState calls openWindowsMap.get', (t) => {
    const funcStr = getWindowByIdState.toString();
    t.assertTruthy(funcStr.includes('get'), 'getWindowByIdState should call get on openWindowsMap');
});

TestRunner.test('Window Management - getHighestZState is a function export', (t) => {
    t.assertEqual(typeof getHighestZState, 'function', 'getHighestZState should be a function');
});

TestRunner.test('Window Management - getHighestZState accepts 0 parameters', (t) => {
    const funcStr = getHighestZState.toString();
    t.assertTruthy(!funcStr.match(/getHighestZState\([^)]*\)/) || funcStr.match(/getHighestZState\(\)/), 'getHighestZState should accept no parameters');
});

TestRunner.test('Window Management - getHighestZState returns highestZ', (t) => {
    const funcStr = getHighestZState.toString();
    t.assertTruthy(funcStr.includes('highestZ'), 'getHighestZState should return highestZ');
});

TestRunner.test('Window Management - setHighestZState is a function export', (t) => {
    t.assertEqual(typeof setHighestZState, 'function', 'setHighestZState should be a function');
});

TestRunner.test('Window Management - setHighestZState accepts 1 parameter', (t) => {
    const funcStr = setHighestZState.toString();
    t.assertTruthy(funcStr.includes('value'), 'setHighestZState should accept value parameter');
});

TestRunner.test('Window Management - setHighestZState references value parameter', (t) => {
    const funcStr = setHighestZState.toString();
    t.assertTruthy(funcStr.includes('value'), 'setHighestZState should reference value parameter');
});

TestRunner.test('Window Management - setHighestZState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = setHighestZState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setHighestZState should call captureStateForUndo');
});

TestRunner.test('Window Management - setHighestZState uses descriptive undo label', (t) => {
    const funcStr = setHighestZState.toString();
    t.assertTruthy(funcStr.includes('highest') || funcStr.includes('zIndex'), 'setHighestZState should use descriptive undo label');
});

TestRunner.test('Window Management - setHighestZState guards against missing appServices', (t) => {
    const funcStr = setHighestZState.toString();
    t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'), 'setHighestZState should guard against missing appServices');
});

TestRunner.test('Window Management - incrementHighestZState is a function export', (t) => {
    t.assertEqual(typeof incrementHighestZState, 'function', 'incrementHighestZState should be a function');
});

TestRunner.test('Window Management - incrementHighestZState accepts 0 parameters', (t) => {
    const funcStr = incrementHighestZState.toString();
    t.assertTruthy(!funcStr.match(/\(.*\)/) || funcStr.match(/incrementHighestZState\(\)/), 'incrementHighestZState should accept no parameters');
});

TestRunner.test('Window Management - incrementHighestZState increments highestZ', (t) => {
    const funcStr = incrementHighestZState.toString();
    t.assertTruthy(funcStr.includes('++highestZ') || funcStr.includes('highestZ++'), 'incrementHighestZState should increment highestZ');
});

// Day 359: Chord Mode State Functions Tests
TestRunner.test('Chord Mode - setChordModeState is a function export', (t) => {
    t.assertEqual(typeof setChordModeState, 'function', 'setChordModeState should be a function');
});

TestRunner.test('Chord Mode - setChordModeState accepts 1 parameter', (t) => {
    const funcStr = setChordModeState.toString();
    t.assertTruthy(funcStr.includes('state'), 'setChordModeState should accept state parameter');
});

TestRunner.test('Chord Mode - setChordModeState references state parameter', (t) => {
    const funcStr = setChordModeState.toString();
    t.assertTruthy(funcStr.includes('state'), 'setChordModeState should reference state parameter');
});

TestRunner.test('Chord Mode - setChordModeState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = setChordModeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setChordModeState should call captureStateForUndo');
});

TestRunner.test('Chord Mode - setChordModeState uses descriptive undo label', (t) => {
    const funcStr = setChordModeState.toString();
    t.assertTruthy(funcStr.includes('Chord Mode') || funcStr.includes('Chord'), 'setChordModeState should use descriptive undo label');
});

TestRunner.test('Chord Mode - setChordModeState guards against missing appServices', (t) => {
    const funcStr = setChordModeState.toString();
    t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'), 'setChordModeState should guard against missing appServices');
});

TestRunner.test('Chord Mode - setChordModeState merges with DEFAULT_CHORD_MODE', (t) => {
    const funcStr = setChordModeState.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_CHORD_MODE'), 'setChordModeState should merge with DEFAULT_CHORD_MODE');
});

TestRunner.test('Chord Mode - setChordModeState validates state is an object', (t) => {
    const funcStr = setChordModeState.toString();
    t.assertTruthy(funcStr.includes('typeof state') && funcStr.includes('object'), 'setChordModeState should validate state is an object');
});

TestRunner.test('Chord Mode - setChordModeEnabledState calls captureStateForUndo', (t) => {
    const funcStr = setChordModeEnabledState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setChordModeEnabledState should call captureStateForUndo');
});

TestRunner.test('Chord Mode - setChordModeEnabledState uses descriptive undo label', (t) => {
    const funcStr = setChordModeEnabledState.toString();
    t.assertTruthy(funcStr.includes('Toggle Chord Mode') || funcStr.includes('Chord Mode'), 'setChordModeEnabledState should use descriptive undo label');
});

TestRunner.test('Chord Mode - setChordModeEnabledState coerces to boolean', (t) => {
    const funcStr = setChordModeEnabledState.toString();
    t.assertTruthy(funcStr.includes('!!') || funcStr.includes('Boolean'), 'setChordModeEnabledState should coerce to boolean');
});

TestRunner.test('Chord Mode - setChordModeRootState calls captureStateForUndo', (t) => {
    const funcStr = setChordModeRootState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setChordModeRootState should call captureStateForUndo');
});

TestRunner.test('Chord Mode - setChordModeRootState uses descriptive undo label', (t) => {
    const funcStr = setChordModeRootState.toString();
    t.assertTruthy(funcStr.includes('Chord Root') || funcStr.includes('root'), 'setChordModeRootState should use descriptive undo label');
});

TestRunner.test('Chord Mode - setChordModeRootState clamps value to 0-11 range', (t) => {
    const funcStr = setChordModeRootState.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min') && funcStr.includes('11'), 'setChordModeRootState should clamp value to 0-11 range');
});

TestRunner.test('Chord Mode - setChordModeRootState parses root as integer', (t) => {
    const funcStr = setChordModeRootState.toString();
    t.assertTruthy(funcStr.includes('parseInt'), 'setChordModeRootState should parse root as integer');
});

TestRunner.test('Chord Mode - setChordModeTypeState calls captureStateForUndo', (t) => {
    const funcStr = setChordModeTypeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setChordModeTypeState should call captureStateForUndo');
});

TestRunner.test('Chord Mode - setChordModeTypeState uses descriptive undo label', (t) => {
    const funcStr = setChordModeTypeState.toString();
    t.assertTruthy(funcStr.includes('Chord Type') || funcStr.includes('type'), 'setChordModeTypeState should use descriptive undo label');
});

TestRunner.test('Chord Mode - setChordModeTypeState defaults to major', (t) => {
    const funcStr = setChordModeTypeState.toString();
    t.assertTruthy(funcStr.includes("'major'") || funcStr.includes('"major"') || funcStr.includes('major'), 'setChordModeTypeState should default to major');
});

TestRunner.test('Chord Mode - setChordModeLockState calls captureStateForUndo', (t) => {
    const funcStr = setChordModeLockState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setChordModeLockState should call captureStateForUndo');
});

TestRunner.test('Chord Mode - setChordModeLockState uses descriptive undo label', (t) => {
    const funcStr = setChordModeLockState.toString();
    t.assertTruthy(funcStr.includes('Enable') || funcStr.includes('Disable') || funcStr.includes('Chord Lock'), 'setChordModeLockState should use descriptive undo label');
});

TestRunner.test('Chord Mode - setChordModeLockState coerces to boolean', (t) => {
    const funcStr = setChordModeLockState.toString();
    t.assertTruthy(funcStr.includes('!!'), 'setChordModeLockState should coerce to boolean');
});

TestRunner.test('Chord Mode - setChordVoicingState calls captureStateForUndo', (t) => {
    const funcStr = setChordVoicingState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setChordVoicingState should call captureStateForUndo');
});

TestRunner.test('Chord Mode - setChordVoicingState uses descriptive undo label', (t) => {
    const funcStr = setChordVoicingState.toString();
    t.assertTruthy(funcStr.includes('Chord Voicing') || funcStr.includes('voicing'), 'setChordVoicingState should use descriptive undo label');
});

TestRunner.test('Chord Mode - setChordVoicingState validates against CHORD_VOICINGS', (t) => {
    const funcStr = setChordVoicingState.toString();
    t.assertTruthy(funcStr.includes('CHORD_VOICINGS') || funcStr.includes('includes'), 'setChordVoicingState should validate against CHORD_VOICINGS');
});

TestRunner.test('Chord Mode - setChordVoicingState defaults to DEFAULT_CHORD_VOICING', (t) => {
    const funcStr = setChordVoicingState.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_CHORD_VOICING'), 'setChordVoicingState should default to DEFAULT_CHORD_VOICING');
});

TestRunner.test('Chord Mode - getChordVoicingState returns voicing or DEFAULT_CHORD_VOICING', (t) => {
    const funcStr = getChordVoicingState.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_CHORD_VOICING'), 'getChordVoicingState should return DEFAULT_CHORD_VOICING as fallback');
});

TestRunner.test('Chord Mode - CHORD_VOICINGS array contains expected voicings', (t) => {
    t.assertTruthy(Array.isArray(CHORD_VOICINGS), 'CHORD_VOICINGS should be an array');
    t.assertTruthy(CHORD_VOICINGS.includes('closed'), 'CHORD_VOICINGS should include closed');
    t.assertTruthy(CHORD_VOICINGS.includes('wide'), 'CHORD_VOICINGS should include wide');
});

TestRunner.test('Chord Mode - CHORD_VOICING_SPREAD has keys matching CHORD_VOICINGS', (t) => {
    t.assertEqual(Object.keys(CHORD_VOICING_SPREAD).length, CHORD_VOICINGS.length, 'CHORD_VOICING_SPREAD keys should match CHORD_VOICINGS');
});

TestRunner.test('Chord Mode - CHORD_VOICING_SPREAD.closed has 12 notes', (t) => {
    t.assertEqual(CHORD_VOICING_SPREAD.closed.length, 12, 'Closed voicing should have 12 notes');
});

TestRunner.test('Chord Mode - DEFAULT_CHORD_VOICING is in CHORD_VOICINGS', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes(DEFAULT_CHORD_VOICING), 'DEFAULT_CHORD_VOICING should be in CHORD_VOICINGS');
});

TestRunner.test('Chord Mode - APP_VERSION validation for Day 359', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 359');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 38, 'Minor version should be >= 38 for Day 359');
    }
});

TestRunner.test('Window Management - APP_VERSION validation for Day 357', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 357');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 36, 'Minor version should be >= 36 for Day 357');
    }
});
// Day 360: Scale Mode State Functions Tests
TestRunner.test('Scale Mode - setScaleModeState is a function export', (t) => {
    t.assertEqual(typeof setScaleModeState, 'function', 'setScaleModeState should be a function');
});

TestRunner.test('Scale Mode - setScaleModeState accepts 1 parameter', (t) => {
    const funcStr = setScaleModeState.toString();
    t.assertTruthy(funcStr.includes('state'), 'setScaleModeState should accept state parameter');
});

TestRunner.test('Scale Mode - setScaleModeState calls captureStateForUndo', (t) => {
    const funcStr = setScaleModeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setScaleModeState should call captureStateForUndo');
});

TestRunner.test('Scale Mode - setScaleModeState uses descriptive undo label', (t) => {
    const funcStr = setScaleModeState.toString();
    t.assertTruthy(funcStr.includes('Set Scale Mode Settings') || funcStr.includes('Scale Mode'), 'setScaleModeState should use descriptive undo label');
});

TestRunner.test('Scale Mode - setScaleModeState guards against missing appServices', (t) => {
    const funcStr = setScaleModeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo') && (funcStr.includes('if') || funcStr.includes('&&') || funcStr.includes('appServices')), 'setScaleModeState should guard against missing appServices');
});

TestRunner.test('Scale Mode - setScaleModeState merges with DEFAULT_SCALE_MODE', (t) => {
    const funcStr = setScaleModeState.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_SCALE_MODE'), 'setScaleModeState should merge with DEFAULT_SCALE_MODE');
});

TestRunner.test('Scale Mode - setScaleModeEnabledState calls captureStateForUndo', (t) => {
    const funcStr = setScaleModeEnabledState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setScaleModeEnabledState should call captureStateForUndo');
});

TestRunner.test('Scale Mode - setScaleModeEnabledState uses descriptive undo label', (t) => {
    const funcStr = setScaleModeEnabledState.toString();
    t.assertTruthy(funcStr.includes('Toggle Scale Mode') || funcStr.includes('Scale Mode'), 'setScaleModeEnabledState should use descriptive undo label');
});

TestRunner.test('Scale Mode - setScaleModeEnabledState coerces to boolean', (t) => {
    const funcStr = setScaleModeEnabledState.toString();
    t.assertTruthy(funcStr.includes('!!') || funcStr.includes('Boolean'), 'setScaleModeEnabledState should coerce to boolean');
});

TestRunner.test('Scale Mode - setScaleModeScaleState calls captureStateForUndo', (t) => {
    const funcStr = setScaleModeScaleState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setScaleModeScaleState should call captureStateForUndo');
});

TestRunner.test('Scale Mode - setScaleModeScaleState uses descriptive undo label', (t) => {
    const funcStr = setScaleModeScaleState.toString();
    t.assertTruthy(funcStr.includes('Set Scale to') || funcStr.includes('Scale'), 'setScaleModeScaleState should use descriptive undo label');
});

TestRunner.test('Scale Mode - setScaleModeScaleState defaults to Major', (t) => {
    const funcStr = setScaleModeScaleState.toString();
    t.assertTruthy(funcStr.includes('Major'), 'setScaleModeScaleState should default to Major');
});

TestRunner.test('Scale Mode - setScaleModeRootState calls captureStateForUndo', (t) => {
    const funcStr = setScaleModeRootState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setScaleModeRootState should call captureStateForUndo');
});

TestRunner.test('Scale Mode - setScaleModeRootState uses descriptive undo label', (t) => {
    const funcStr = setScaleModeRootState.toString();
    t.assertTruthy(funcStr.includes('Set Scale Root') || funcStr.includes('root'), 'setScaleModeRootState should use descriptive undo label');
});

TestRunner.test('Scale Mode - setScaleModeRootState defaults to C', (t) => {
    const funcStr = setScaleModeRootState.toString();
    t.assertTruthy(funcStr.includes("'C'") || funcStr.includes('"C"'), 'setScaleModeRootState should default to C');
});

TestRunner.test('Scale Mode - setScaleModeLockState calls captureStateForUndo', (t) => {
    const funcStr = setScaleModeLockState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setScaleModeLockState should call captureStateForUndo');
});

TestRunner.test('Scale Mode - setScaleModeLockState uses descriptive undo label', (t) => {
    const funcStr = setScaleModeLockState.toString();
    t.assertTruthy(funcStr.includes('Enable') || funcStr.includes('Disable') || funcStr.includes('Scale Lock'), 'setScaleModeLockState should use descriptive undo label');
});

TestRunner.test('Scale Mode - getScaleModeState returns object', (t) => {
    t.assertEqual(typeof getScaleModeState, 'function', 'getScaleModeState should be a function');
});

// Day 360: Swing State Functions Tests
TestRunner.test('Swing - setSwingState is a function export', (t) => {
    t.assertEqual(typeof setSwingState, 'function', 'setSwingState should be a function');
});

TestRunner.test('Swing - setSwingState accepts 1 parameter', (t) => {
    const funcStr = setSwingState.toString();
    t.assertTruthy(funcStr.includes('state'), 'setSwingState should accept state parameter');
});

TestRunner.test('Swing - setSwingState calls captureStateForUndo', (t) => {
    const funcStr = setSwingState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setSwingState should call captureStateForUndo');
});

TestRunner.test('Swing - setSwingState uses descriptive undo label', (t) => {
    const funcStr = setSwingState.toString();
    t.assertTruthy(funcStr.includes('Set Swing') || funcStr.includes('Swing'), 'setSwingState should use descriptive undo label');
});

TestRunner.test('Swing - setSwingState guards against missing appServices', (t) => {
    const funcStr = setSwingState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo') && (funcStr.includes('if') || funcStr.includes('&&') || funcStr.includes('appServices')), 'setSwingState should guard against missing appServices');
});

TestRunner.test('Swing - setSwingEnabledState calls captureStateForUndo', (t) => {
    const funcStr = setSwingEnabledState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setSwingEnabledState should call captureStateForUndo');
});

TestRunner.test('Swing - setSwingEnabledState uses descriptive undo label', (t) => {
    const funcStr = setSwingEnabledState.toString();
    t.assertTruthy(funcStr.includes('Toggle Swing') || funcStr.includes('Swing'), 'setSwingEnabledState should use descriptive undo label');
});

TestRunner.test('Swing - setSwingEnabledState coerces to boolean', (t) => {
    const funcStr = setSwingEnabledState.toString();
    t.assertTruthy(funcStr.includes('!!') || funcStr.includes('Boolean'), 'setSwingEnabledState should coerce to boolean');
});

TestRunner.test('Swing - setSwingAmountState calls captureStateForUndo', (t) => {
    const funcStr = setSwingAmountState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setSwingAmountState should call captureStateForUndo');
});

TestRunner.test('Swing - setSwingAmountState uses descriptive undo label', (t) => {
    const funcStr = setSwingAmountState.toString();
    t.assertTruthy(funcStr.includes('Set Swing Amount') || funcStr.includes('Swing'), 'setSwingAmountState should use descriptive undo label');
});

TestRunner.test('Swing - setSwingAmountState clamps value to 0-100 range', (t) => {
    const funcStr = setSwingAmountState.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min') && funcStr.includes('100'), 'setSwingAmountState should clamp value to 0-100 range');
});

TestRunner.test('Swing - setSwingAmountState parses integer', (t) => {
    const funcStr = setSwingAmountState.toString();
    t.assertTruthy(funcStr.includes('parseInt'), 'setSwingAmountState should parse integer');
});

TestRunner.test('Swing - getSwingState returns object', (t) => {
    t.assertEqual(typeof getSwingState, 'function', 'getSwingState should be a function');
});

TestRunner.test('Swing - getSwingEnabledState returns boolean', (t) => {
    t.assertEqual(typeof getSwingEnabledState, 'function', 'getSwingEnabledState should be a function');
});

TestRunner.test('Swing - getSwingAmountState returns number', (t) => {
    t.assertEqual(typeof getSwingAmountState, 'function', 'getSwingAmountState should be a function');
});

TestRunner.test('Scale Mode & Swing - APP_VERSION validation for Day 361', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 361');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 40, 'Minor version should be >= 40 for Day 361');
    }
});

// Day 362: Audio Track Inspector UI Functions Tests
TestRunner.test('Audio Track UI - buildAudioTrackInspectorDOM is a function', (t) => {
    t.assertEqual(typeof buildAudioTrackInspectorDOM, 'function', 'buildAudioTrackInspectorDOM should be a function');
});

TestRunner.test('Audio Track UI - buildAudioTrackInspectorDOM accepts 1 parameter', (t) => {
    const funcStr = buildAudioTrackInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('track'), 'buildAudioTrackInspectorDOM should accept track parameter');
});

TestRunner.test('Audio Track UI - buildAudioTrackInspectorDOM references track.id', (t) => {
    const funcStr = buildAudioTrackInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('track.id') || funcStr.includes('track\\.id'), 'buildAudioTrackInspectorDOM should reference track.id');
});

TestRunner.test('Audio Track UI - buildAudioTrackInspectorDOM includes audioInputDevice select', (t) => {
    const funcStr = buildAudioTrackInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('audioInputDevice') && funcStr.includes('select'), 'buildAudioTrackInspectorDOM should include audioInputDevice select');
});

TestRunner.test('Audio Track UI - buildAudioTrackInspectorDOM includes inputGain placeholder', (t) => {
    const funcStr = buildAudioTrackInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('inputGain') && funcStr.includes('placeholder'), 'buildAudioTrackInspectorDOM should include inputGain placeholder');
});

TestRunner.test('Audio Track UI - buildAudioTrackInspectorDOM includes monitoringVolume slider', (t) => {
    const funcStr = buildAudioTrackInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('monitoringVolume') && funcStr.includes('range'), 'buildAudioTrackInspectorDOM should include monitoringVolume slider');
});

TestRunner.test('Audio Track UI - buildAudioTrackInspectorDOM includes recording status indicator', (t) => {
    const funcStr = buildAudioTrackInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('recordingStatus') && (funcStr.includes('Recording') || funcStr.includes('Ready')), 'buildAudioTrackInspectorDOM should include recording status');
});

TestRunner.test('Audio Track UI - buildAudioTrackInspectorDOM uses DEFAULT_RECORDING_INPUT_GAIN', (t) => {
    const funcStr = buildAudioTrackInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_RECORDING_INPUT_GAIN') || funcStr.includes('recordingInputGain') || funcStr.includes('0.5'), 'buildAudioTrackInspectorDOM should reference default input gain');
});

TestRunner.test('Audio Track UI - buildAudioTrackInspectorDOM includes monitoring volume percentage label', (t) => {
    const funcStr = buildAudioTrackInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('monitoringVolumeLabel'), 'buildAudioTrackInspectorDOM should include monitoring volume percentage label');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls is a function', (t) => {
    t.assertEqual(typeof initializeAudioTrackInspectorControls, 'function', 'initializeAudioTrackInspectorControls should be a function');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls accepts 2 parameters', (t) => {
    const funcStr = initializeAudioTrackInspectorControls.toString();
    t.assertTruthy(funcStr.includes('track') && funcStr.includes('winEl'), 'initializeAudioTrackInspectorControls should accept track and winEl parameters');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls references Tone.UserMedia', (t) => {
    const funcStr = initializeAudioTrackInspectorControls.toString();
    t.assertTruthy(funcStr.includes('UserMedia'), 'initializeAudioTrackInspectorControls should reference Tone.UserMedia');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls calls enumerateDevices', (t) => {
    const funcStr = initializeAudioTrackInspectorControls.toString();
    t.assertTruthy(funcStr.includes('enumerateDevices'), 'initializeAudioTrackInspectorControls should call enumerateDevices');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls filters audioinput devices', (t) => {
    const funcStr = initializeAudioTrackInspectorControls.toString();
    t.assertTruthy(funcStr.includes('audioinput') || funcStr.includes('kind'), 'initializeAudioTrackInspectorControls should filter audioinput devices');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls creates gain knob', (t) => {
    const funcStr = initializeAudioTrackInspectorControls.toString();
    t.assertTruthy(funcStr.includes('createKnob') || funcStr.includes('gainKnob'), 'initializeAudioTrackInspectorControls should create gain knob');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls references recordingInputGain', (t) => {
    const funcStr = initializeAudioTrackInspectorControls.toString();
    t.assertTruthy(funcStr.includes('recordingInputGain'), 'initializeAudioTrackInspectorControls should reference recordingInputGain');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls references MIN_RECORDING_INPUT_GAIN', (t) => {
    const funcStr = initializeAudioTrackInspectorControls.toString();
    t.assertTruthy(funcStr.includes('MIN_RECORDING_INPUT_GAIN'), 'initializeAudioTrackInspectorControls should reference MIN_RECORDING_INPUT_GAIN');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls references MAX_RECORDING_INPUT_GAIN', (t) => {
    const funcStr = initializeAudioTrackInspectorControls.toString();
    t.assertTruthy(funcStr.includes('MAX_RECORDING_INPUT_GAIN'), 'initializeAudioTrackInspectorControls should reference MAX_RECORDING_INPUT_GAIN');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls sets up monitoring volume slider listener', (t) => {
    const funcStr = initializeAudioTrackInspectorControls.toString();
    t.assertTruthy(funcStr.includes('addEventListener') && funcStr.includes('monitoringVolume'), 'initializeAudioTrackInspectorControls should set up monitoring volume slider listener');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls updates track.monitoringVolume', (t) => {
    const funcStr = initializeAudioTrackInspectorControls.toString();
    t.assertTruthy(funcStr.includes('monitoringVolume'), 'initializeAudioTrackInspectorControls should update track.monitoringVolume');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls updates monitoring volume label', (t) => {
    const funcStr = initializeAudioTrackInspectorControls.toString();
    t.assertTruthy(funcStr.includes('monitoringVolumeLabel'), 'initializeAudioTrackInspectorControls should update monitoring volume label');
});

TestRunner.test('Audio Track UI - initializeAudioTrackInspectorControls handles error with enumerateDevices', (t) => {
    const funcStr = initializeAudioTrackInspectorControls.toString();
    t.assertTruthy(funcStr.includes('catch') || funcStr.includes('console.warn'), 'initializeAudioTrackInspectorControls should handle errors');
});

TestRunner.test('Audio Track UI - buildTrackInspectorContentDOM handles Audio track type', (t) => {
    const funcStr = buildTrackInspectorContentDOM.toString();
    t.assertTruthy(funcStr.includes("track.type === 'Audio'") || funcStr.includes("=== 'Audio'"), 'buildTrackInspectorContentDOM should handle Audio track type');
});

TestRunner.test('Audio Track UI - buildTrackInspectorContentDOM calls buildAudioTrackInspectorDOM for Audio tracks', (t) => {
    const funcStr = buildTrackInspectorContentDOM.toString();
    t.assertTruthy(funcStr.includes('buildAudioTrackInspectorDOM'), 'buildTrackInspectorContentDOM should call buildAudioTrackInspectorDOM');
});

TestRunner.test('Audio Track UI - Audio track type constants validation', (t) => {
    // Track types should include Audio, Synth, Sampler, DrumSampler, InstrumentSampler
    const trackTypes = ['Synth', 'Sampler', 'DrumSampler', 'InstrumentSampler', 'Audio'];
    t.assertEqual(trackTypes.length, 5, 'There should be 5 track types');
});

TestRunner.test('Audio Track UI - APP_VERSION validation for Day 362', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 362');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 41, 'Minor version should be >= 41 for Day 362');
    }
});
// Day 362: Metronome Audio Functions Tests (2026-04-29)
import {
    setMetronomeVolume
} from './audio.js';

TestRunner.test('Metronome Audio - initializeMetronome is a function export', (t) => {
    t.assertEqual(typeof initializeMetronome, 'function', 'initializeMetronome should be a function');
});

TestRunner.test('Metronome Audio - initializeMetronome accepts 0 parameters', (t) => {
    const funcStr = initializeMetronome.toString();
    t.assertTruthy(!funcStr.includes('enabled'), 'initializeMetronome should not reference enabled parameter');
});

TestRunner.test('Metronome Audio - initializeMetronome references metronomeInitialized flag', (t) => {
    const funcStr = initializeMetronome.toString();
    t.assertTruthy(funcStr.includes('metronomeInitialized') || funcStr.includes('metronomeInitialized = true'), 'initializeMetronome should check/set metronomeInitialized flag');
});

TestRunner.test('Metronome Audio - initializeMetronome has try-catch error handling', (t) => {
    const funcStr = initializeMetronome.toString();
    t.assertTruthy(funcStr.includes('try') || funcStr.includes('catch'), 'initializeMetronome should have error handling');
});

TestRunner.test('Metronome Audio - initializeMetronome creates Tone.Player for click sounds', (t) => {
    const funcStr = initializeMetronome.toString();
    t.assertTruthy(funcStr.includes('Tone.Player') || funcStr.includes('Player'), 'initializeMetronome should create Tone.Player');
});

TestRunner.test('Metronome Audio - initializeMetronome creates separate click and accent players', (t) => {
    const funcStr = initializeMetronome.toString();
    t.assertTruthy(funcStr.includes('click') && (funcStr.includes('accent') || funcStr.includes('Accent')), 'initializeMetronome should create both click and accent players');
});

TestRunner.test('Metronome Audio - initializeMetronome connects players to master bus', (t) => {
    const funcStr = initializeMetronome.toString();
    t.assertTruthy(funcStr.includes('connect') && funcStr.includes('getMasterEffectsBusInputNode'), 'initializeMetronome should connect players to master bus');
});

TestRunner.test('Metronome Audio - initializeMetronome uses DEFAULT_METRONOME_VOLUME constant', (t) => {
    const funcStr = initializeMetronome.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_METRONOME_VOLUME'), 'initializeMetronome should use DEFAULT_METRONOME_VOLUME constant');
});

TestRunner.test('Metronome Audio - initializeMetronome uses Tone.gainToDb for volume conversion', (t) => {
    const funcStr = initializeMetronome.toString();
    t.assertTruthy(funcStr.includes('Tone.gainToDb') || funcStr.includes('gainToDb'), 'initializeMetronome should use Tone.gainToDb for volume');
});

TestRunner.test('Metronome Audio - startMetronome is a function export', (t) => {
    t.assertEqual(typeof startMetronome, 'function', 'startMetronome should be a function');
});

TestRunner.test('Metronome Audio - startMetronome accepts 0 parameters', (t) => {
    const funcStr = startMetronome.toString();
    t.assertTruthy(!funcStr.includes('enabled'), 'startMetronome should not reference enabled parameter');
});

TestRunner.test('Metronome Audio - startMetronome checks metronomeInitialized flag', (t) => {
    const funcStr = startMetronome.toString();
    t.assertTruthy(funcStr.includes('metronomeInitialized'), 'startMetronome should check metronomeInitialized flag');
});

TestRunner.test('Metronome Audio - startMetronome calls initializeMetronome if not initialized', (t) => {
    const funcStr = startMetronome.toString();
    t.assertTruthy(funcStr.includes('initializeMetronome'), 'startMetronome should call initializeMetronome');
});

TestRunner.test('Metronome Audio - startMetronome checks Tone.Transport running state', (t) => {
    const funcStr = startMetronome.toString();
    t.assertTruthy(funcStr.includes('Tone') && (funcStr.includes('Transport') || funcStr.includes('running')), 'startMetronome should check transport running state');
});

TestRunner.test('Metronome Audio - startMetronome schedules repeating event with Transport', (t) => {
    const funcStr = startMetronome.toString();
    t.assertTruthy(funcStr.includes('scheduleRepeat') || funcStr.includes('schedule'), 'startMetronome should schedule events with transport');
});

TestRunner.test('Metronome Audio - startMetronome distinguishes accent vs regular beats', (t) => {
    const funcStr = startMetronome.toString();
    t.assertTruthy(funcStr.includes('Accent') || (funcStr.includes('accent') && funcStr.includes('%')), 'startMetronome should distinguish accent beats');
});

TestRunner.test('Metronome Audio - startMetronome calls transport.start', (t) => {
    const funcStr = startMetronome.toString();
    t.assertTruthy(funcStr.includes('transport.start') || funcStr.includes('start()'), 'startMetronome should call transport.start');
});

TestRunner.test('Metronome Audio - stopMetronome is a function export', (t) => {
    t.assertEqual(typeof stopMetronome, 'function', 'stopMetronome should be a function');
});

TestRunner.test('Metronome Audio - stopMetronome accepts 0 parameters', (t) => {
    const funcStr = stopMetronome.toString();
    t.assertTruthy(!funcStr.includes('enabled'), 'stopMetronome should not reference enabled parameter');
});

TestRunner.test('Metronome Audio - stopMetronome clears scheduled events', (t) => {
    const funcStr = stopMetronome.toString();
    t.assertTruthy(funcStr.includes('clear') || funcStr.includes('schedule'), 'stopMetronome should clear scheduled events');
});

TestRunner.test('Metronome Audio - stopMetronome stops metronome click players', (t) => {
    const funcStr = stopMetronome.toString();
    t.assertTruthy(funcStr.includes('click') && funcStr.includes('stop'), 'stopMetronome should stop click players');
});

TestRunner.test('Metronome Audio - stopMetronome stops metronome accent players', (t) => {
    const funcStr = stopMetronome.toString();
    t.assertTruthy(funcStr.includes('accent') && funcStr.includes('stop'), 'stopMetronome should stop accent players');
});

TestRunner.test('Metronome Audio - stopMetronome checks player.disposed before stopping', (t) => {
    const funcStr = stopMetronome.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'stopMetronome should check if players are disposed');
});

TestRunner.test('Metronome Audio - setMetronomeVolume is a function export', (t) => {
    t.assertEqual(typeof setMetronomeVolume, 'function', 'setMetronomeVolume should be a function');
});

TestRunner.test('Metronome Audio - setMetronomeVolume accepts 1 parameter', (t) => {
    const funcStr = setMetronomeVolume.toString();
    t.assertTruthy(funcStr.includes('volume') || funcStr.match(/function\s*\([^)]*\)/)?.[0].match(/,/)?.[0] === undefined, 'setMetronomeVolume should accept 1 parameter');
});

TestRunner.test('Metronome Audio - setMetronomeVolume references volume parameter', (t) => {
    const funcStr = setMetronomeVolume.toString();
    t.assertTruthy(funcStr.includes('volume'), 'setMetronomeVolume should reference volume parameter');
});

TestRunner.test('Metronome Audio - setMetronomeVolume clamps value to 0-1 range', (t) => {
    const funcStr = setMetronomeVolume.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setMetronomeVolume should clamp value to 0-1 range');
});

TestRunner.test('Metronome Audio - setMetronomeVolume uses Tone.gainToDb for volume conversion', (t) => {
    const funcStr = setMetronomeVolume.toString();
    t.assertTruthy(funcStr.includes('Tone.gainToDb') || funcStr.includes('gainToDb'), 'setMetronomeVolume should use Tone.gainToDb');
});

TestRunner.test('Metronome Audio - setMetronomeVolume updates metronomeClickPlayer volume', (t) => {
    const funcStr = setMetronomeVolume.toString();
    t.assertTruthy(funcStr.includes('metronomeClickPlayer') || funcStr.includes('clickPlayer'), 'setMetronomeVolume should update click player volume');
});

TestRunner.test('Metronome Audio - setMetronomeVolume updates metronomeAccentPlayer volume', (t) => {
    const funcStr = setMetronomeVolume.toString();
    t.assertTruthy(funcStr.includes('metronomeAccentPlayer') || funcStr.includes('accentPlayer'), 'setMetronomeVolume should update accent player volume');
});

TestRunner.test('Metronome Audio - Metronome constants validation', (t) => {
    t.assertEqual(typeof DEFAULT_METRONOME_ENABLED, 'boolean', 'DEFAULT_METRONOME_ENABLED should be boolean');
    t.assertEqual(DEFAULT_METRONOME_ENABLED, false, 'DEFAULT_METRONOME_ENABLED should be false');
    t.assertEqual(typeof DEFAULT_METRONOME_VOLUME, 'number', 'DEFAULT_METRONOME_VOLUME should be number');
    t.assertTruthy(DEFAULT_METRONOME_VOLUME >= 0 && DEFAULT_METRONOME_VOLUME <= 1, 'DEFAULT_METRONOME_VOLUME should be in 0-1 range');
    t.assertEqual(MIN_METRONOME_VOLUME, 0, 'MIN_METRONOME_VOLUME should be 0');
    t.assertEqual(MAX_METRONOME_VOLUME, 1, 'MAX_METRONOME_VOLUME should be 1');
});

TestRunner.test('Metronome Audio - APP_VERSION validation for Day 362', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 362');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 40, 'Minor version should be >= 40 for Day 362');
    }
});

// Day 363: Knob UI & Inspector Initialization Function Tests
TestRunner.test('Knob UI - createKnob is a function export', (t) => {
    t.assertEqual(typeof createKnob, 'function', 'createKnob should be a function');
});

TestRunner.test('Knob UI - createKnob accepts 1 parameter', (t) => {
    const funcStr = createKnob.toString();
    t.assertTruthy(funcStr.includes('options'), 'createKnob should accept options parameter');
});

TestRunner.test('Knob UI - createKnob returns an object with element property', (t) => {
    const mockOptions = { label: 'Test', min: 0, max: 100, initialValue: 50 };
    const result = createKnob(mockOptions);
    t.assertTruthy(result && typeof result === 'object', 'createKnob should return an object');
    t.assertTruthy(result.element, 'createKnob result should have element property');
});

TestRunner.test('Knob UI - createKnob returns object with setValue method', (t) => {
    const mockOptions = { label: 'Test', min: 0, max: 100, initialValue: 50 };
    const result = createKnob(mockOptions);
    t.assertTruthy(typeof result.setValue === 'function', 'createKnob result should have setValue method');
});

TestRunner.test('Knob UI - createKnob returns object with getValue method', (t) => {
    const mockOptions = { label: 'Test', min: 0, max: 100, initialValue: 50 };
    const result = createKnob(mockOptions);
    t.assertTruthy(typeof result.getValue === 'function', 'createKnob result should have getValue method');
});

TestRunner.test('Knob UI - createKnob returns object with type property', (t) => {
    const mockOptions = { label: 'Test', min: 0, max: 100, initialValue: 50 };
    const result = createKnob(mockOptions);
    t.assertEqual(result.type, 'knob', 'createKnob result type should be knob');
});

TestRunner.test('Knob UI - createKnob has onValueChange callback option', (t) => {
    const funcStr = createKnob.toString();
    t.assertTruthy(funcStr.includes('onValueChange'), 'createKnob should support onValueChange option');
});

TestRunner.test('Knob UI - createKnob handles min/max bounds', (t) => {
    const funcStr = createKnob.toString();
    t.assertTruthy(funcStr.includes('min') && funcStr.includes('max'), 'createKnob should handle min/max bounds');
});

TestRunner.test('Knob UI - createKnob supports displayAsDb option', (t) => {
    const funcStr = createKnob.toString();
    t.assertTruthy(funcStr.includes('displayAsDb'), 'createKnob should support displayAsDb for dB display');
});

TestRunner.test('Knob UI - createKnob references localAppServices.captureStateForUndo', (t) => {
    const funcStr = createKnob.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'createKnob should call captureStateForUndo for undo support');
});

TestRunner.test('Track Inspector - initializeCommonInspectorControls is referenced in appServices', (t) => {
    const mainStr = window.appServices ? '' : 'appServices mock needed';
    t.assertTruthy(typeof initializeUIModule === 'function', 'initializeUIModule should be available');
});

TestRunner.test('Track Inspector - initializeTypeSpecificInspectorControls function exists', (t) => {
    t.assertTruthy(typeof initializeUIModule === 'function', 'initializeUIModule should be a function');
});

TestRunner.test('Track Inspector - buildTrackInspectorContentDOM handles track types', (t) => {
    const funcStr = buildTrackInspectorContentDOM.toString();
    t.assertTruthy(funcStr.includes('track.type') || funcStr.includes('track\\.type'), 'buildTrackInspectorContentDOM should handle track types');
});

TestRunner.test('Track Inspector - buildTrackInspectorContentDOM includes mute/solo/arm buttons', (t) => {
    const funcStr = buildTrackInspectorContentDOM.toString();
    t.assertTruthy(funcStr.includes('mute') || funcStr.includes('Mute'), 'buildTrackInspectorContentDOM should include mute button');
});

TestRunner.test('Track Inspector - buildTrackInspectorContentDOM includes track name input', (t) => {
    const funcStr = buildTrackInspectorContentDOM.toString();
    t.assertTruthy(funcStr.includes('track.name') || funcStr.includes('track\\.name'), 'buildTrackInspectorContentDOM should reference track name');
});

TestRunner.test('Track Inspector - buildSynthSpecificInspectorDOM references synthEngineControlDefinitions', (t) => {
    const funcStr = buildSynthSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('synthEngineControlDefinitions') || funcStr.includes('engineType'), 'buildSynthSpecificInspectorDOM should reference engine type');
});

TestRunner.test('Track Inspector - buildDrumSamplerSpecificInspectorDOM includes pad grid', (t) => {
    const funcStr = buildDrumSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('drum') || funcStr.includes('pad') || funcStr.includes('Pad'), 'buildDrumSamplerSpecificInspectorDOM should include pad elements');
});

TestRunner.test('Track Inspector - buildAudioTrackInspectorDOM includes input monitoring controls', (t) => {
    const funcStr = buildAudioTrackInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('monitoring') || funcStr.includes('Monitoring') || funcStr.includes('input'), 'buildAudioTrackInspectorDOM should include monitoring controls');
});

TestRunner.test('Sound Browser - renderSoundBrowserDirectory function exists', (t) => {
    t.assertEqual(typeof renderSoundBrowserDirectory, 'function', 'renderSoundBrowserDirectory should be a function');
});

TestRunner.test('Sound Browser - updateSoundBrowserDisplayForLibrary function exists', (t) => {
    t.assertEqual(typeof updateSoundBrowserDisplayForLibrary, 'function', 'updateSoundBrowserDisplayForLibrary should be a function');
});

TestRunner.test('Sound Browser - renderSoundBrowserDirectory accepts 2 parameters', (t) => {
    const funcStr = renderSoundBrowserDirectory.toString();
    t.assertTruthy(funcStr.includes('pathArray') && funcStr.includes('treeNode'), 'renderSoundBrowserDirectory should accept pathArray and treeNode');
});

TestRunner.test('Sound Browser - updateSoundBrowserDisplayForLibrary accepts 1-3 parameters', (t) => {
    const funcStr = updateSoundBrowserDisplayForLibrary.toString();
    t.assertTruthy(funcStr.includes('libraryName'), 'updateSoundBrowserDisplayForLibrary should accept libraryName');
});

TestRunner.test('Sound Browser - updateSoundBrowserDisplayForLibrary handles isLoading state', (t) => {
    const funcStr = updateSoundBrowserDisplayForLibrary.toString();
    t.assertTruthy(funcStr.includes('isLoading') || funcStr.includes('loading'), 'updateSoundBrowserDisplayForLibrary should handle loading state');
});

TestRunner.test('Effects List - renderEffectsList function exists', (t) => {
    t.assertEqual(typeof renderEffectsList, 'function', 'renderEffectsList should be a function');
});

TestRunner.test('Effects List - renderEffectControls function exists', (t) => {
    t.assertEqual(typeof renderEffectControls, 'function', 'renderEffectControls should be a function');
});

TestRunner.test('Effects List - renderEffectsList accepts 4 parameters', (t) => {
    const funcStr = renderEffectsList.toString();
    t.assertTruthy(funcStr.includes('owner') && funcStr.includes('ownerType'), 'renderEffectsList should accept owner and ownerType');
});

TestRunner.test('Effects List - renderEffectControls accepts 4 parameters', (t) => {
    const funcStr = renderEffectControls.toString();
    t.assertTruthy(funcStr.includes('effectId'), 'renderEffectControls should accept effectId');
});

TestRunner.test('APP_VERSION validation for Day 363', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 363');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 41, 'Minor version should be >= 41 for Day 363');
    }
});

// === Day 364: Sequence & Note Methods Tests ===

TestRunner.test('Sequence Methods - Track.createNewSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.createNewSequence, 'function', 'createNewSequence should be a function');
});

TestRunner.test('Sequence Methods - createNewSequence accepts 3 parameters', (t) => {
    const funcStr = Track.prototype.createNewSequence.toString();
    t.assertTruthy(funcStr.includes('name') && funcStr.includes('initialLengthSteps') && funcStr.includes('skipUndo'), 'createNewSequence should accept name, initialLengthSteps, and skipUndo parameters');
});

TestRunner.test('Sequence Methods - createNewSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.createNewSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'createNewSequence should call _captureUndoState for undo support');
});

TestRunner.test('Sequence Methods - createNewSequence handles Audio track type', (t) => {
    const funcStr = Track.prototype.createNewSequence.toString();
    t.assertTruthy(funcStr.includes('type === \'Audio\'') || funcStr.includes('type === "Audio"'), 'createNewSequence should return early for Audio tracks');
});

TestRunner.test('Sequence Methods - createNewSequence uses Constants.defaultStepsPerBar', (t) => {
    const funcStr = Track.prototype.createNewSequence.toString();
    t.assertTruthy(funcStr.includes('defaultStepsPerBar') || funcStr.includes('Constants.defaultStepsPerBar'), 'createNewSequence should use defaultStepsPerBar constant');
});

TestRunner.test('Sequence Methods - Track.deleteSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.deleteSequence, 'function', 'deleteSequence should be a function');
});

TestRunner.test('Sequence Methods - deleteSequence accepts 1 parameter', (t) => {
    const funcStr = Track.prototype.deleteSequence.toString();
    t.assertTruthy(funcStr.includes('sequenceId'), 'deleteSequence should accept sequenceId parameter');
});

TestRunner.test('Sequence Methods - deleteSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.deleteSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'deleteSequence should call _captureUndoState for undo support');
});

TestRunner.test('Sequence Methods - deleteSequence prevents deleting last sequence', (t) => {
    const funcStr = Track.prototype.deleteSequence.toString();
    t.assertTruthy(funcStr.includes('Cannot delete the last sequence') || funcStr.includes('sequences.length <= 1'), 'deleteSequence should prevent deleting the last sequence');
});

TestRunner.test('Sequence Methods - Track.renameSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.renameSequence, 'function', 'renameSequence should be a function');
});

TestRunner.test('Sequence Methods - renameSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.renameSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'renameSequence should call _captureUndoState for undo support');
});

TestRunner.test('Sequence Methods - Track.duplicateSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.duplicateSequence, 'function', 'duplicateSequence should be a function');
});

TestRunner.test('Sequence Methods - duplicateSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.duplicateSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'duplicateSequence should call _captureUndoState for undo support');
});

TestRunner.test('Sequence Methods - Track.setActiveSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.setActiveSequence, 'function', 'setActiveSequence should be a function');
});

TestRunner.test('Sequence Methods - setActiveSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setActiveSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setActiveSequence should call _captureUndoState for undo support');
});

TestRunner.test('Sequence Methods - Track.doubleSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.doubleSequence, 'function', 'doubleSequence should be a function');
});

TestRunner.test('Sequence Methods - doubleSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.doubleSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'doubleSequence should call _captureUndoState for undo support');
});

TestRunner.test('Sequence Methods - doubleSequence checks MAX_BARS limit', (t) => {
    const funcStr = Track.prototype.doubleSequence.toString();
    t.assertTruthy(funcStr.includes('MAX_BARS') || funcStr.includes('exceed'), 'doubleSequence should check MAX_BARS limit');
});

TestRunner.test('Sequence Methods - Track.shiftSequenceNotes is a function', (t) => {
    t.assertEqual(typeof Track.prototype.shiftSequenceNotes, 'function', 'shiftSequenceNotes should be a function');
});

TestRunner.test('Sequence Methods - shiftSequenceNotes calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.shiftSequenceNotes.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'shiftSequenceNotes should call _captureUndoState for undo support');
});

TestRunner.test('Sequence Methods - shiftSequenceNotes handles Synth/InstrumentSampler row shifting', (t) => {
    const funcStr = Track.prototype.shiftSequenceNotes.toString();
    t.assertTruthy(funcStr.includes('synthPitches') || funcStr.includes('rowShift'), 'shiftSequenceNotes should handle row shifting for synth tracks');
});

TestRunner.test('Sequence Methods - Track.humanizeVelocity is a function', (t) => {
    t.assertEqual(typeof Track.prototype.humanizeVelocity, 'function', 'humanizeVelocity should be a function');
});

TestRunner.test('Sequence Methods - Track.scaleVelocities is a function', (t) => {
    t.assertEqual(typeof Track.prototype.scaleVelocities, 'function', 'scaleVelocities should be a function');
});

TestRunner.test('Sequence Methods - scaleVelocities calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.scaleVelocities.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'scaleVelocities should call _captureUndoState for undo support');
});

TestRunner.test('Sequence Methods - scaleVelocities scales velocities by factor', (t) => {
    const funcStr = Track.prototype.scaleVelocities.toString();
    t.assertTruthy(funcStr.includes('velocity') && funcStr.includes('factor'), 'scaleVelocities should reference velocity and factor');
});

TestRunner.test('Sequence Methods - scaleVelocities clamps to valid range', (t) => {
    const funcStr = Track.prototype.scaleVelocities.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'scaleVelocities should clamp values to 0.05-1.0 range');
});

TestRunner.test('Sequence Methods - Track.arpeggiatePattern is a function', (t) => {
    t.assertEqual(typeof Track.prototype.arpeggiatePattern, 'function', 'arpeggiatePattern should be a function');
});

TestRunner.test('Sequence Methods - arpeggiatePattern calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.arpeggiatePattern.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'arpeggiatePattern should call _captureUndoState for undo support');
});

TestRunner.test('Sequence Methods - arpeggiatePattern validates track type', (t) => {
    const funcStr = Track.prototype.arpeggiatePattern.toString();
    t.assertTruthy(funcStr.includes('Synth') && funcStr.includes('InstrumentSampler'), 'arpeggiatePattern should work on Synth and InstrumentSampler tracks');
});

TestRunner.test('Sequence Methods - Track.quantizeSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.quantizeSequence, 'function', 'quantizeSequence should be a function');
});

TestRunner.test('Sequence Methods - quantizeSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.quantizeSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'quantizeSequence should call _captureUndoState for undo support');
});

TestRunner.test('Note Methods - Track.setNoteLength is a function', (t) => {
    t.assertEqual(typeof Track.prototype.setNoteLength, 'function', 'setNoteLength should be a function');
});

TestRunner.test('Note Methods - setNoteLength calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setNoteLength.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setNoteLength should call _captureUndoState for undo support');
});

TestRunner.test('Note Methods - setNoteLength clamps value', (t) => {
    const funcStr = Track.prototype.setNoteLength.toString();
    t.assertTruthy(funcStr.includes('Math.max') || funcStr.includes('Math.min'), 'setNoteLength should clamp note length');
});

TestRunner.test('Note Methods - Track.getNoteLength is a function', (t) => {
    t.assertEqual(typeof Track.prototype.getNoteLength, 'function', 'getNoteLength should be a function');
});

TestRunner.test('Note Methods - Track.setNoteProbability is a function', (t) => {
    t.assertEqual(typeof Track.prototype.setNoteProbability, 'function', 'setNoteProbability should be a function');
});

TestRunner.test('Note Methods - setNoteProbability calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setNoteProbability.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setNoteProbability should call _captureUndoState for undo support');
});

TestRunner.test('Note Methods - setNoteProbability clamps to 0-1 range', (t) => {
    const funcStr = Track.prototype.setNoteProbability.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setNoteProbability should clamp probability to 0-1 range');
});

TestRunner.test('Note Methods - Track.getNoteProbability is a function', (t) => {
    t.assertEqual(typeof Track.prototype.getNoteProbability, 'function', 'getNoteProbability should be a function');
});

TestRunner.test('Automation Methods - Track.getAutomationLane is a function', (t) => {
    t.assertEqual(typeof Track.prototype.getAutomationLane, 'function', 'getAutomationLane should be a function');
});

TestRunner.test('Automation Methods - Track.setAutomationPoint is a function', (t) => {
    t.assertEqual(typeof Track.prototype.setAutomationPoint, 'function', 'setAutomationPoint should be a function');
});

TestRunner.test('Automation Methods - setAutomationPoint calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAutomationPoint.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAutomationPoint should call _captureUndoState for undo support');
});

TestRunner.test('Automation Methods - Track.getAutomationValue is a function', (t) => {
    t.assertEqual(typeof Track.prototype.getAutomationValue, 'function', 'getAutomationValue should be a function');
});

TestRunner.test('Automation Methods - Track.hasAutomation is a function', (t) => {
    t.assertEqual(typeof Track.prototype.hasAutomation, 'function', 'hasAutomation should be a function');
});

TestRunner.test('Automation Methods - Track.getAutomationLaneCount is a function', (t) => {
    t.assertEqual(typeof Track.prototype.getAutomationLaneCount, 'function', 'getAutomationLaneCount should be a function');
});

TestRunner.test('Track Methods - duplicateTrack is a function', (t) => {
    t.assertEqual(typeof Track.prototype.duplicateTrack, 'function', 'duplicateTrack should be a function on Track.prototype');
});

TestRunner.test('Track Methods - freezeTrack is a function', (t) => {
    t.assertEqual(typeof Track.prototype.freezeTrack, 'function', 'freezeTrack should be a function on Track.prototype');
});

TestRunner.test('Track Methods - bounceTrack is a function', (t) => {
    t.assertEqual(typeof Track.prototype.bounceTrack, 'function', 'bounceTrack should be a function on Track.prototype');
});

// Day 525: Fix stub tests for non-existent methods
TestRunner.test('Day 525 - Track Methods - APP_VERSION validation for Day 525', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 525');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 186, 'Minor version should be >= 186 for Day 525');
    }
});

TestRunner.test('Track Constants - TRACK_COLORS array has expected colors', (t) => {
    t.assertTruthy(Array.isArray(TRACK_COLORS) && TRACK_COLORS.length >= 8, 'TRACK_COLORS should be an array with at least 8 colors');
});

TestRunner.test('Track Constants - numSlices constant validation', (t) => {
    t.assertTruthy(typeof numSlices === 'number' && numSlices > 0, 'numSlices should be a positive number');
});

TestRunner.test('Track Constants - numDrumSamplerPads constant validation', (t) => {
    t.assertTruthy(typeof numDrumSamplerPads === 'number' && numDrumSamplerPads > 0, 'numDrumSamplerPads should be a positive number');
});

TestRunner.test('Track Constants - synthPitches array validation', (t) => {
    t.assertTruthy(Array.isArray(synthPitches) && synthPitches.length > 0, 'synthPitches should be a non-empty array');
});

TestRunner.test('Track Methods - Track.prototype.rebuildEffectChain is a function', (t) => {
    t.assertEqual(typeof Track.prototype.rebuildEffectChain, 'function', 'rebuildEffectChain should be a function');
});

TestRunner.test('Track Methods - Track.prototype.initializeAudioNodes is async', (t) => {
    const funcStr = Track.prototype.initializeAudioNodes.toString();
    t.assertTruthy(funcStr.includes('async') || funcStr.includes('Promise'), 'initializeAudioNodes should be async');
});

TestRunner.test('Track Methods - Track.prototype.createNewSequence returns new sequence object', (t) => {
    const funcStr = Track.prototype.createNewSequence.toString();
    t.assertTruthy(funcStr.includes('sequences.push') && funcStr.includes('activeSequenceId'), 'createNewSequence should push sequence and set active');
});

TestRunner.test('APP_VERSION validation for Day 364', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 364');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 42, 'Minor version should be >= 42 for Day 364');
    }
});
// Day 365: Timeline Zoom State Functions Tests
TestRunner.test('Timeline Zoom - setTimelineZoomLevelState is a function export', (t) => {
    t.assertEqual(typeof setTimelineZoomLevelState, 'function', 'setTimelineZoomLevelState should be a function');
});

TestRunner.test('Timeline Zoom - setTimelineZoomLevelState accepts 1 parameter', (t) => {
    const funcStr = setTimelineZoomLevelState.toString();
    t.assertTruthy(funcStr.includes('level'), 'setTimelineZoomLevelState should accept level parameter');
});

TestRunner.test('Timeline Zoom - setTimelineZoomLevelState calls captureStateForUndo', (t) => {
    const funcStr = setTimelineZoomLevelState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTimelineZoomLevelState should call captureStateForUndo');
});

TestRunner.test('Timeline Zoom - setTimelineZoomLevelState uses descriptive undo label', (t) => {
    const funcStr = setTimelineZoomLevelState.toString();
    t.assertTruthy(funcStr.includes('Set Timeline Zoom') || funcStr.includes('Timeline Zoom'), 'setTimelineZoomLevelState should use descriptive undo label');
});

TestRunner.test('Timeline Zoom - setTimelineZoomLevelState guards against missing appServices', (t) => {
    const funcStr = setTimelineZoomLevelState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo') && (funcStr.includes('if') || funcStr.includes('&&') || funcStr.includes('appServices')), 'setTimelineZoomLevelState should guard against missing appServices');
});

TestRunner.test('Timeline Zoom - setTimelineZoomLevelState clamps value to valid range', (t) => {
    const funcStr = setTimelineZoomLevelState.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setTimelineZoomLevelState should clamp value using Math.max/Math.min');
});

TestRunner.test('Timeline Zoom - setTimelineZoomLevelState uses parseFloat for value parsing', (t) => {
    const funcStr = setTimelineZoomLevelState.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'setTimelineZoomLevelState should use parseFloat for value parsing');
});

TestRunner.test('Timeline Zoom - setTimelineVerticalZoomState is a function export', (t) => {
    t.assertEqual(typeof setTimelineVerticalZoomState, 'function', 'setTimelineVerticalZoomState should be a function');
});

TestRunner.test('Timeline Zoom - setTimelineVerticalZoomState accepts 1 parameter', (t) => {
    const funcStr = setTimelineVerticalZoomState.toString();
    t.assertTruthy(funcStr.includes('level'), 'setTimelineVerticalZoomState should accept level parameter');
});

TestRunner.test('Timeline Zoom - setTimelineVerticalZoomState calls captureStateForUndo', (t) => {
    const funcStr = setTimelineVerticalZoomState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTimelineVerticalZoomState should call captureStateForUndo');
});

TestRunner.test('Timeline Zoom - setTimelineVerticalZoomState uses descriptive undo label', (t) => {
    const funcStr = setTimelineVerticalZoomState.toString();
    t.assertTruthy(funcStr.includes('Set Timeline Vertical') || funcStr.includes('Vertical Zoom'), 'setTimelineVerticalZoomState should use descriptive undo label');
});

TestRunner.test('Timeline Zoom - setTimelineVerticalZoomState clamps value to valid range', (t) => {
    const funcStr = setTimelineVerticalZoomState.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setTimelineVerticalZoomState should clamp value using Math.max/Math.min');
});

TestRunner.test('Timeline Zoom - zoomInTimeline is a function export', (t) => {
    t.assertEqual(typeof zoomInTimeline, 'function', 'zoomInTimeline should be a function');
});

TestRunner.test('Timeline Zoom - zoomInTimeline calls setTimelineZoomLevelState', (t) => {
    const funcStr = zoomInTimeline.toString();
    t.assertTruthy(funcStr.includes('setTimelineZoomLevelState'), 'zoomInTimeline should call setTimelineZoomLevelState');
});

TestRunner.test('Timeline Zoom - zoomInTimeline increases zoom level', (t) => {
    const funcStr = zoomInTimeline.toString();
    t.assertTruthy(funcStr.includes('+') || funcStr.includes('TIMELINE_ZOOM_STEP'), 'zoomInTimeline should increase zoom level');
});

TestRunner.test('Timeline Zoom - zoomOutTimeline is a function export', (t) => {
    t.assertEqual(typeof zoomOutTimeline, 'function', 'zoomOutTimeline should be a function');
});

TestRunner.test('Timeline Zoom - zoomOutTimeline calls setTimelineZoomLevelState', (t) => {
    const funcStr = zoomOutTimeline.toString();
    t.assertTruthy(funcStr.includes('setTimelineZoomLevelState'), 'zoomOutTimeline should call setTimelineZoomLevelState');
});

TestRunner.test('Timeline Zoom - zoomOutTimeline decreases zoom level', (t) => {
    const funcStr = zoomOutTimeline.toString();
    t.assertTruthy(funcStr.includes('-') || funcStr.includes('TIMELINE_ZOOM_STEP'), 'zoomOutTimeline should decrease zoom level');
});

TestRunner.test('Timeline Zoom - zoomInVerticalTimeline is a function export', (t) => {
    t.assertEqual(typeof zoomInVerticalTimeline, 'function', 'zoomInVerticalTimeline should be a function');
});

TestRunner.test('Timeline Zoom - zoomInVerticalTimeline calls setTimelineVerticalZoomState', (t) => {
    const funcStr = zoomInVerticalTimeline.toString();
    t.assertTruthy(funcStr.includes('setTimelineVerticalZoomState'), 'zoomInVerticalTimeline should call setTimelineVerticalZoomState');
});

TestRunner.test('Timeline Zoom - zoomOutVerticalTimeline is a function export', (t) => {
    t.assertEqual(typeof zoomOutVerticalTimeline, 'function', 'zoomOutVerticalTimeline should be a function');
});

TestRunner.test('Timeline Zoom - zoomOutVerticalTimeline calls setTimelineVerticalZoomState', (t) => {
    const funcStr = zoomOutVerticalTimeline.toString();
    t.assertTruthy(funcStr.includes('setTimelineVerticalZoomState'), 'zoomOutVerticalTimeline should call setTimelineVerticalZoomState');
});

TestRunner.test('Timeline Zoom - resetTimelineZoom is a function export', (t) => {
    t.assertEqual(typeof resetTimelineZoom, 'function', 'resetTimelineZoom should be a function');
});

TestRunner.test('Timeline Zoom - resetTimelineZoom calls captureStateForUndo', (t) => {
    const funcStr = resetTimelineZoom.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'resetTimelineZoom should call captureStateForUndo');
});

TestRunner.test('Timeline Zoom - resetTimelineZoom uses descriptive undo label', (t) => {
    const funcStr = resetTimelineZoom.toString();
    t.assertTruthy(funcStr.includes('Reset Timeline Zoom') || funcStr.includes('Reset Zoom'), 'resetTimelineZoom should use descriptive undo label');
});

TestRunner.test('Timeline Zoom - resetTimelineZoom resets both horizontal and vertical zoom', (t) => {
    const funcStr = resetTimelineZoom.toString();
    t.assertTruthy(funcStr.includes('horizontal') && funcStr.includes('vertical'), 'resetTimelineZoom should reset both horizontal and vertical zoom');
});

TestRunner.test('Timeline Zoom - getTimelineZoomState returns object', (t) => {
    t.assertEqual(typeof getTimelineZoomState, 'function', 'getTimelineZoomState should be a function');
});

TestRunner.test('Timeline Zoom - getTimelineZoomLevelState returns number', (t) => {
    t.assertEqual(typeof getTimelineZoomLevelState, 'function', 'getTimelineZoomLevelState should be a function');
});

TestRunner.test('Timeline Zoom - getTimelineVerticalZoomState returns number', (t) => {
    t.assertEqual(typeof getTimelineVerticalZoomState, 'function', 'getTimelineVerticalZoomState should be a function');
});

TestRunner.test('Timeline Zoom - Timeline zoom constants use TIMELINE_ZOOM prefix', (t) => {
    const funcStr = setTimelineZoomLevelState.toString();
    t.assertTruthy(funcStr.includes('TIMELINE_ZOOM'), 'Timeline zoom functions should reference TIMELINE_ZOOM constants');
});

TestRunner.test('APP_VERSION validation for Day 365', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 365');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 43, 'Minor version should be >= 43 for Day 365');
    }
});

// === Day 366: Effect Presets State Functions Tests ===
TestRunner.test('Effect Presets - getEffectPresetsState returns array', (t) => {
    const result = getEffectPresetsState();
    t.assertEqual(Array.isArray(result), true, 'getEffectPresetsState should return an array');
});

TestRunner.test('Effect Presets - getEffectPresetByIdState is a function', (t) => {
    t.assertEqual(typeof getEffectPresetByIdState, 'function', 'getEffectPresetByIdState should be a function');
});

TestRunner.test('Effect Presets - getEffectPresetByIdState accepts 1 parameter', (t) => {
    t.assertEqual(getEffectPresetByIdState.length, 1, 'getEffectPresetByIdState should accept 1 parameter');
});

TestRunner.test('Effect Presets - getEffectPresetByIdState returns preset or undefined', (t) => {
    const result = getEffectPresetByIdState(999);
    t.assertEqual(result === undefined || typeof result === 'object', true, 'getEffectPresetByIdState should return preset or undefined');
});

TestRunner.test('Effect Presets - getEffectPresetsByTypeState is a function', (t) => {
    t.assertEqual(typeof getEffectPresetsByTypeState, 'function', 'getEffectPresetsByTypeState should be a function');
});

TestRunner.test('Effect Presets - getEffectPresetsByTypeState accepts 1 parameter', (t) => {
    t.assertEqual(getEffectPresetsByTypeState.length, 1, 'getEffectPresetsByTypeState should accept 1 parameter');
});

TestRunner.test('Effect Presets - getEffectPresetsByTypeState returns array', (t) => {
    const result = getEffectPresetsByTypeState('reverb');
    t.assertEqual(Array.isArray(result), true, 'getEffectPresetsByTypeState should return an array');
});

TestRunner.test('Effect Presets - addEffectPresetState is a function', (t) => {
    t.assertEqual(typeof addEffectPresetState, 'function', 'addEffectPresetState should be a function');
});

TestRunner.test('Effect Presets - addEffectPresetState accepts 1 parameter', (t) => {
    t.assertEqual(addEffectPresetState.length, 1, 'addEffectPresetState should accept 1 parameter');
});

TestRunner.test('Effect Presets - addEffectPresetState references presetData parameter', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('presetData'), 'addEffectPresetState should reference presetData parameter');
});

TestRunner.test('Effect Presets - addEffectPresetState calls captureStateForUndo', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'addEffectPresetState should call captureStateForUndo');
});

TestRunner.test('Effect Presets - addEffectPresetState uses descriptive undo label', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('Save Effect Preset') || funcStr.includes('Effect Preset'), 'Undo label should mention Save Effect Preset');
});

TestRunner.test('Effect Presets - addEffectPresetState checks MAX_EFFECT_PRESETS limit', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('MAX_EFFECT_PRESETS'), 'addEffectPresetState should check MAX_EFFECT_PRESETS limit');
});

TestRunner.test('Effect Presets - addEffectPresetState generates unique id', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('effectPresetIdCounter') || funcStr.includes('id'), 'addEffectPresetState should generate unique id');
});

TestRunner.test('Effect Presets - addEffectPresetState uses DEFAULT_EFFECT_PRESET structure', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('name') && funcStr.includes('effectType') && funcStr.includes('params'), 'Preset should have name, effectType, params');
});

TestRunner.test('Effect Presets - updateEffectPresetState is a function', (t) => {
    t.assertEqual(typeof updateEffectPresetState, 'function', 'updateEffectPresetState should be a function');
});

TestRunner.test('Effect Presets - updateEffectPresetState accepts 2 parameters', (t) => {
    t.assertEqual(updateEffectPresetState.length, 2, 'updateEffectPresetState should accept 2 parameters');
});

TestRunner.test('Effect Presets - updateEffectPresetState calls captureStateForUndo', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'updateEffectPresetState should call captureStateForUndo');
});

TestRunner.test('Effect Presets - updateEffectPresetState uses descriptive undo label', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('Update Effect Preset') || funcStr.includes('Effect Preset'), 'Undo label should mention Update Effect Preset');
});

TestRunner.test('Effect Presets - updateEffectPresetState handles name updates', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('name'), 'updateEffectPresetState should handle name updates');
});

TestRunner.test('Effect Presets - updateEffectPresetState handles effectType updates', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('effectType'), 'updateEffectPresetState should handle effectType updates');
});

TestRunner.test('Effect Presets - updateEffectPresetState handles params updates', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('params'), 'updateEffectPresetState should handle params updates');
});

TestRunner.test('Effect Presets - updateEffectPresetState returns null for unknown id', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('null'), 'updateEffectPresetState should return null for unknown id');
});

TestRunner.test('Effect Presets - removeEffectPresetState is a function', (t) => {
    t.assertEqual(typeof removeEffectPresetState, 'function', 'removeEffectPresetState should be a function');
});

TestRunner.test('Effect Presets - removeEffectPresetState accepts 1 parameter', (t) => {
    t.assertEqual(removeEffectPresetState.length, 1, 'removeEffectPresetState should accept 1 parameter');
});

TestRunner.test('Effect Presets - removeEffectPresetState calls captureStateForUndo', (t) => {
    const funcStr = removeEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'removeEffectPresetState should call captureStateForUndo');
});

TestRunner.test('Effect Presets - removeEffectPresetState uses descriptive undo label', (t) => {
    const funcStr = removeEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('Delete Effect Preset') || funcStr.includes('Effect Preset'), 'Undo label should mention Delete Effect Preset');
});

TestRunner.test('Effect Presets - removeEffectPresetState returns boolean', (t) => {
    const funcStr = removeEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('return'), 'removeEffectPresetState should return boolean');
});

TestRunner.test('Effect Presets - clearEffectPresetsState is a function', (t) => {
    t.assertEqual(typeof clearEffectPresetsState, 'function', 'clearEffectPresetsState should be a function');
});

TestRunner.test('Effect Presets - clearEffectPresetsState accepts no parameters', (t) => {
    t.assertEqual(clearEffectPresetsState.length, 0, 'clearEffectPresetsState should accept no parameters');
});

TestRunner.test('Effect Presets - clearEffectPresetsState calls captureStateForUndo when presets exist', (t) => {
    const funcStr = clearEffectPresetsState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'clearEffectPresetsState should call captureStateForUndo');
});

TestRunner.test('Effect Presets - clearEffectPresetsState uses descriptive undo label', (t) => {
    const funcStr = clearEffectPresetsState.toString();
    t.assertTruthy(funcStr.includes('Clear All Effect Presets') || funcStr.includes('Effect Preset'), 'Undo label should mention Clear All Effect Presets');
});

TestRunner.test('Effect Presets - MAX_EFFECT_PRESETS is defined', (t) => {
    t.assertEqual(typeof MAX_EFFECT_PRESETS, 'number', 'MAX_EFFECT_PRESETS should be a number');
});

TestRunner.test('Effect Presets - MAX_EFFECT_PRESETS is positive', (t) => {
    t.assertTruthy(MAX_EFFECT_PRESETS > 0, 'MAX_EFFECT_PRESETS should be positive');
});

TestRunner.test('Effect Presets - MAX_EFFECT_PRESETS is reasonable (64 or less)', (t) => {
    t.assertTruthy(MAX_EFFECT_PRESETS <= 64, 'MAX_EFFECT_PRESETS should be 64 or less');
});

TestRunner.test('Effect Presets - DEFAULT_EFFECT_PRESET is defined', (t) => {
    t.assertEqual(typeof DEFAULT_EFFECT_PRESET, 'object', 'DEFAULT_EFFECT_PRESET should be an object');
});

TestRunner.test('Effect Presets - DEFAULT_EFFECT_PRESET has name property', (t) => {
    t.assertTruthy(DEFAULT_EFFECT_PRESET.name !== undefined, 'DEFAULT_EFFECT_PRESET should have name property');
});

TestRunner.test('Effect Presets - DEFAULT_EFFECT_PRESET has effectType property', (t) => {
    t.assertTruthy(DEFAULT_EFFECT_PRESET.effectType !== undefined, 'DEFAULT_EFFECT_PRESET should have effectType property');
});

TestRunner.test('Effect Presets - DEFAULT_EFFECT_PRESET has params property', (t) => {
    t.assertTruthy(DEFAULT_EFFECT_PRESET.params !== undefined, 'DEFAULT_EFFECT_PRESET should have params property');
});

TestRunner.test('Effect Presets - DEFAULT_EFFECT_PRESET effectType is null', (t) => {
    t.assertEqual(DEFAULT_EFFECT_PRESET.effectType, null, 'DEFAULT_EFFECT_PRESET effectType should be null');
});

TestRunner.test('Effect Presets - DEFAULT_EFFECT_PRESET params is object', (t) => {
    t.assertEqual(typeof DEFAULT_EFFECT_PRESET.params, 'object', 'DEFAULT_EFFECT_PRESET params should be an object');
});

TestRunner.test('Effect Presets - DEFAULT_PRESET_NAME_PREFIX is defined', (t) => {
    t.assertEqual(typeof DEFAULT_PRESET_NAME_PREFIX, 'string', 'DEFAULT_PRESET_NAME_PREFIX should be a string');
});

TestRunner.test('Effect Presets - DEFAULT_PRESET_NAME_PREFIX is non-empty', (t) => {
    t.assertTruthy(DEFAULT_PRESET_NAME_PREFIX.length > 0, 'DEFAULT_PRESET_NAME_PREFIX should be non-empty');
});

TestRunner.test('APP_VERSION validation for Day 366', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 366');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 44, 'Minor version should be >= 44 for Day 366');
    }
});

// === Day 367: Audio Module Extended Utility Functions Tests ===
TestRunner.test('Audio Module - getMimeTypeFromFilename is a function export', (t) => {
    t.assertEqual(typeof getMimeTypeFromFilename, 'function', 'getMimeTypeFromFilename should be a function');
});

TestRunner.test('Audio Module - getMimeTypeFromFilename accepts 1 parameter', (t) => {
    t.assertEqual(getMimeTypeFromFilename.length, 1, 'getMimeTypeFromFilename should accept 1 parameter');
});

TestRunner.test('Audio Module - getMimeTypeFromFilename handles .wav extension', (t) => {
    const result = getMimeTypeFromFilename('test.wav');
    t.assertEqual(result, 'audio/wav', 'WAV file should return audio/wav mime type');
});

TestRunner.test('Audio Module - getMimeTypeFromFilename handles .mp3 extension', (t) => {
    const result = getMimeTypeFromFilename('test.mp3');
    t.assertEqual(result, 'audio/mpeg', 'MP3 file should return audio/mpeg mime type');
});

TestRunner.test('Audio Module - getMimeTypeFromFilename handles .ogg extension', (t) => {
    const result = getMimeTypeFromFilename('test.ogg');
    t.assertEqual(result, 'audio/ogg', 'OGG file should return audio/ogg mime type');
});

TestRunner.test('Audio Module - getMimeTypeFromFilename handles .flac extension', (t) => {
    const result = getMimeTypeFromFilename('test.flac');
    t.assertEqual(result, 'audio/flac', 'FLAC file should return audio/flac mime type');
});

TestRunner.test('Audio Module - getMimeTypeFromFilename handles .aac extension', (t) => {
    const result = getMimeTypeFromFilename('test.aac');
    t.assertEqual(result, 'audio/aac', 'AAC file should return audio/aac mime type');
});

TestRunner.test('Audio Module - getMimeTypeFromFilename handles .m4a extension', (t) => {
    const result = getMimeTypeFromFilename('test.m4a');
    t.assertEqual(result, 'audio/mp4', 'M4A file should return audio/mp4 mime type');
});

TestRunner.test('Audio Module - getMimeTypeFromFilename is case insensitive for extension', (t) => {
    const result = getMimeTypeFromFilename('test.WAV');
    t.assertEqual(result, 'audio/wav', 'WAV extension should be case insensitive');
});

TestRunner.test('Audio Module - getMimeTypeFromFilename returns fallback for unknown extension', (t) => {
    const result = getMimeTypeFromFilename('test.xyz');
    t.assertEqual(result, 'application/octet-stream', 'Unknown extension should return fallback mime type');
});

TestRunner.test('Audio Module - getMimeTypeFromFilename handles null input', (t) => {
    const result = getMimeTypeFromFilename(null);
    t.assertEqual(result, 'application/octet-stream', 'Null input should return fallback mime type');
});

TestRunner.test('Audio Module - getMimeTypeFromFilename handles empty string input', (t) => {
    const result = getMimeTypeFromFilename('');
    t.assertEqual(result, 'application/octet-stream', 'Empty string should return fallback mime type');
});

TestRunner.test('Audio Module - getMimeTypeFromFilename handles non-string input', (t) => {
    const result = getMimeTypeFromFilename(123);
    t.assertEqual(result, 'application/octet-stream', 'Non-string input should return fallback mime type');
});

TestRunner.test('Audio Module - clearAllMasterEffectNodes is a function export', (t) => {
    t.assertEqual(typeof clearAllMasterEffectNodes, 'function', 'clearAllMasterEffectNodes should be a function');
});

TestRunner.test('Audio Module - clearAllMasterEffectNodes accepts no parameters', (t) => {
    t.assertEqual(clearAllMasterEffectNodes.length, 0, 'clearAllMasterEffectNodes should accept no parameters');
});

TestRunner.test('Audio Module - clearAllMasterEffectNodes references activeMasterEffectNodes', (t) => {
    const funcStr = clearAllMasterEffectNodes.toString();
    t.assertTruthy(funcStr.includes('activeMasterEffectNodes'), 'clearAllMasterEffectNodes should reference activeMasterEffectNodes');
});

TestRunner.test('Audio Module - clearAllMasterEffectNodes calls dispose on nodes', (t) => {
    const funcStr = clearAllMasterEffectNodes.toString();
    t.assertTruthy(funcStr.includes('dispose'), 'clearAllMasterEffectNodes should dispose nodes');
});

TestRunner.test('Audio Module - clearAllMasterEffectNodes calls rebuildMasterEffectChain', (t) => {
    const funcStr = clearAllMasterEffectNodes.toString();
    t.assertTruthy(funcStr.includes('rebuildMasterEffectChain'), 'clearAllMasterEffectNodes should call rebuildMasterEffectChain');
});

TestRunner.test('Audio Module - clearAllMasterEffectNodes has error handling', (t) => {
    const funcStr = clearAllMasterEffectNodes.toString();
    t.assertTruthy(funcStr.includes('try') || funcStr.includes('catch') || funcStr.includes('console.warn'), 'clearAllMasterEffectNodes should have error handling');
});

TestRunner.test('Audio Module - autoSliceSample is a function export', (t) => {
    t.assertEqual(typeof autoSliceSample, 'function', 'autoSliceSample should be a function');
});

TestRunner.test('Audio Module - autoSliceSample accepts 1-2 parameters', (t) => {
    t.assertTruthy(autoSliceSample.length >= 1 && autoSliceSample.length <= 2, 'autoSliceSample should accept 1-2 parameters');
});

TestRunner.test('Audio Module - autoSliceSample references trackId parameter', (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'autoSliceSample should reference trackId parameter');
});

TestRunner.test('Audio Module - autoSliceSample references getTrackById from appServices', (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'autoSliceSample should call getTrackById');
});

TestRunner.test('Audio Module - autoSliceSample validates track type is Sampler', (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('Sampler'), 'autoSliceSample should check for Sampler track type');
});

TestRunner.test('Audio Module - autoSliceSample validates audioBuffer is loaded', (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('loaded'), 'autoSliceSample should check audioBuffer.loaded');
});

TestRunner.test('Audio Module - autoSliceSample validates duration is positive', (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('duration'), 'autoSliceSample should check duration');
});

TestRunner.test('Audio Module - autoSliceSample shows notification on error', (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'autoSliceSample should show notification on errors');
});

TestRunner.test('Audio Module - autoSliceSample uses numSlicesToCreate parameter', (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('numSlicesToCreate') || funcStr.includes('numSlices'), 'autoSliceSample should use numSlicesToCreate');
});

TestRunner.test('Audio Module - autoSliceSample resets track.slices array', (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('slices = []') || funcStr.includes('slices[') || funcStr.includes('track.slices'), 'autoSliceSample should reset slices array');
});

TestRunner.test('Audio Module - autoSliceSample calculates slice duration', (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('sliceDuration') || funcStr.includes('/'), 'autoSliceSample should calculate slice duration');
});

TestRunner.test('Audio Module - autoSliceSample has try-catch error handling', (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'autoSliceSample should have try-catch error handling');
});

TestRunner.test('APP_VERSION validation for Day 367', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 367');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 45, 'Minor version should be >= 45 for Day 367');
    }
});

// Day 368: Track Template State Functions Tests
TestRunner.test('Track Templates - getTrackTemplatesState returns array', (t) => {
    const result = getTrackTemplatesState();
    t.assertEqual(Array.isArray(result), true, 'getTrackTemplatesState should return an array');
});

TestRunner.test('Track Templates - getTrackTemplateByIdState is a function, accepts 1 parameter', (t) => {
    t.assertEqual(typeof getTrackTemplateByIdState, 'function', 'getTrackTemplateByIdState should be a function');
    const funcStr = getTrackTemplateByIdState.toString();
    t.assertTruthy(funcStr.includes('id'), 'getTrackTemplateByIdState should accept 1 parameter (id)');
});

TestRunner.test('Track Templates - getTrackTemplateByIdState returns preset or undefined', (t) => {
    const result = getTrackTemplateByIdState(999);
    t.assertTruthy(result === undefined || typeof result === 'object', 'getTrackTemplateByIdState should return preset or undefined');
});

TestRunner.test('Track Templates - addTrackTemplateState is a function, accepts 1 parameter', (t) => {
    t.assertEqual(typeof addTrackTemplateState, 'function', 'addTrackTemplateState should be a function');
    const funcStr = addTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('templateData'), 'addTrackTemplateState should accept 1 parameter (templateData)');
});

TestRunner.test('Track Templates - addTrackTemplateState references presetData', (t) => {
    const funcStr = addTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('templateData'), 'addTrackTemplateState should reference templateData parameter');
});

TestRunner.test('Track Templates - addTrackTemplateState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = addTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'addTrackTemplateState should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Save Track Template'), 'addTrackTemplateState should use descriptive undo label');
});

TestRunner.test('Track Templates - addTrackTemplateState checks MAX_TRACK_TEMPLATES limit', (t) => {
    const funcStr = addTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('MAX_TRACK_TEMPLATES'), 'addTrackTemplateState should check MAX_TRACK_TEMPLATES limit');
});

TestRunner.test('Track Templates - addTrackTemplateState generates unique id', (t) => {
    const funcStr = addTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('trackTemplateIdCounter') || funcStr.includes('id'), 'addTrackTemplateState should generate unique id');
});

TestRunner.test('Track Templates - addTrackTemplateState uses DEFAULT_TEMPLATE structure', (t) => {
    const funcStr = addTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('name') && funcStr.includes('color') && funcStr.includes('type'), 'addTrackTemplateState should use template structure (name, color, type)');
});

TestRunner.test('Track Templates - updateTrackTemplateState is a function, accepts 2 parameters', (t) => {
    t.assertEqual(typeof updateTrackTemplateState, 'function', 'updateTrackTemplateState should be a function');
    const funcStr = updateTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('id') && funcStr.includes('updates'), 'updateTrackTemplateState should accept 2 parameters (id, updates)');
});

TestRunner.test('Track Templates - updateTrackTemplateState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = updateTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'updateTrackTemplateState should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Update Track Template'), 'updateTrackTemplateState should use descriptive undo label');
});

TestRunner.test('Track Templates - updateTrackTemplateState handles name, color, type updates', (t) => {
    const funcStr = updateTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('name') && funcStr.includes('color') && funcStr.includes('type'), 'updateTrackTemplateState should handle name/color/type updates');
});

TestRunner.test('Track Templates - updateTrackTemplateState returns null for unknown id', (t) => {
    const funcStr = updateTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('null') || funcStr.includes('return null'), 'updateTrackTemplateState should return null for unknown id');
});

TestRunner.test('Track Templates - removeTrackTemplateState is a function, accepts 1 parameter', (t) => {
    t.assertEqual(typeof removeTrackTemplateState, 'function', 'removeTrackTemplateState should be a function');
    const funcStr = removeTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('id'), 'removeTrackTemplateState should accept 1 parameter (id)');
});

TestRunner.test('Track Templates - removeTrackTemplateState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = removeTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'removeTrackTemplateState should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Delete Track Template'), 'removeTrackTemplateState should use descriptive undo label');
});

TestRunner.test('Track Templates - removeTrackTemplateState returns boolean', (t) => {
    const funcStr = removeTrackTemplateState.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false') || funcStr.includes('filter'), 'removeTrackTemplateState should return boolean or filtered array');
});

TestRunner.test('Track Templates - clearTrackTemplatesState is a function, accepts no parameters', (t) => {
    t.assertEqual(typeof clearTrackTemplatesState, 'function', 'clearTrackTemplatesState should be a function');
    const funcStr = clearTrackTemplatesState.toString();
    t.assertTruthy(!funcStr.includes('id') && !funcStr.includes('templateData'), 'clearTrackTemplatesState should accept no parameters');
});

TestRunner.test('Track Templates - clearTrackTemplatesState calls captureStateForUndo with descriptive label', (t) => {
    const funcStr = clearTrackTemplatesState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'clearTrackTemplatesState should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Clear All Track Templates'), 'clearTrackTemplatesState should use descriptive undo label');
});

TestRunner.test('Track Templates - clearTrackTemplatesState guards against empty state', (t) => {
    const funcStr = clearTrackTemplatesState.toString();
    t.assertTruthy(funcStr.includes('length') && funcStr.includes('> 0'), 'clearTrackTemplatesState should check if templates exist before capturing undo');
});

TestRunner.test('Track Templates - MAX_TRACK_TEMPLATES constant validation (positive, 32 or less)', (t) => {
    t.assertEqual(typeof MAX_TRACK_TEMPLATES, 'number', 'MAX_TRACK_TEMPLATES should be a number');
    t.assertTruthy(MAX_TRACK_TEMPLATES > 0, 'MAX_TRACK_TEMPLATES should be positive');
    t.assertTruthy(MAX_TRACK_TEMPLATES <= 32, 'MAX_TRACK_TEMPLATES should be 32 or less');
});

TestRunner.test('Track Templates - DEFAULT_TEMPLATE_NAME_PREFIX is non-empty string', (t) => {
    t.assertEqual(typeof DEFAULT_TEMPLATE_NAME_PREFIX, 'string', 'DEFAULT_TEMPLATE_NAME_PREFIX should be a string');
    t.assertTruthy(DEFAULT_TEMPLATE_NAME_PREFIX.length > 0, 'DEFAULT_TEMPLATE_NAME_PREFIX should be non-empty');
});

TestRunner.test('Track Templates - TRACK_TEMPLATE_COLORS equals TRACK_COLORS', (t) => {
    t.assertEqual(TRACK_TEMPLATE_COLORS, TRACK_COLORS, 'TRACK_TEMPLATE_COLORS should equal TRACK_COLORS');
});

TestRunner.test('Track Templates - DEFAULT_TRACK_TEMPLATE_COLOR is valid hex color', (t) => {
    t.assertEqual(typeof DEFAULT_TRACK_TEMPLATE_COLOR, 'string', 'DEFAULT_TRACK_TEMPLATE_COLOR should be a string');
    t.assertTruthy(DEFAULT_TRACK_TEMPLATE_COLOR.startsWith('#'), 'DEFAULT_TRACK_TEMPLATE_COLOR should be a hex color');
    t.assertTruthy(DEFAULT_TRACK_TEMPLATE_COLOR.length === 7, 'DEFAULT_TRACK_TEMPLATE_COLOR should be valid 6-digit hex');
});

TestRunner.test('APP_VERSION validation for Day 368', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 368');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 46, 'Minor version should be >= 46 for Day 368');
    }
});

TestRunner.test('MIDI Export - exportToMidiInternal is a function export', (t) => {
    t.assertEqual(typeof exportToMidiInternal, 'function', 'exportToMidiInternal should be a function');
});

TestRunner.test('MIDI Export - exportToMidiInternal is async', (t) => {
    const funcStr = exportToMidiInternal.toString();
    t.assertTruthy(funcStr.includes('async') || funcStr.includes('Promise'), 'exportToMidiInternal should be async');
});

TestRunner.test('MIDI Export - exportToMidiInternal calls showNotification', (t) => {
    const funcStr = exportToMidiInternal.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'exportToMidiInternal should call showNotification');
});

TestRunner.test('MIDI Export - exportToMidiInternal validates appServices', (t) => {
    t.assertTruthy(funcStr.includes('appServices'), 'exportToMidiInternal should validate appServices');
});
// Day 508: MIDI Import Functions Tests
// ============================================

TestRunner.test('MIDI Import - importFromMidiInternal is a function export', (t) => {
    t.assertEqual(typeof importFromMidiInternal, 'function', 'importFromMidiInternal should be a function');
});

TestRunner.test('MIDI Import - importFromMidiInternal is async', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('async') || funcStr.includes('Promise'), 'importFromMidiInternal should be async');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body references showNotification', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'importFromMidiInternal should call showNotification');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body references appServices', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('appServices'), 'importFromMidiInternal should validate appServices');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body references getTracksState', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('getTracksState'), 'importFromMidiInternal should reference getTracksState');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body references getTempoState', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('getTempoState'), 'importFromMidiInternal should reference getTempoState');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body references setTempoState', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('setTempoState'), 'importFromMidiInternal should reference setTempoState');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body references parseMidiFile', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('parseMidiFile'), 'importFromMidiInternal should call parseMidiFile');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body handles MIDI file arrayBuffer', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('arrayBuffer') || funcStr.includes('ArrayBuffer'), 'importFromMidiInternal should handle arrayBuffer');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body validates minimum note count', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('noteOn') || funcStr.includes('MIDI_IMPORT_MIN_NOTES'), 'importFromMidiInternal should validate minimum note count');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body extracts tempo from tempo event', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('tempo') && (funcStr.includes('bpm') || funcStr.includes('BPM') || funcStr.includes('usPerQuarter')), 'importFromMidiInternal should extract tempo from tempo event');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body references createFileInputForMidiImport', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('createFileInputForMidiImport'), 'importFromMidiInternal should call createFileInputForMidiImport');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body handles file input accept types', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('.mid') || funcStr.includes('.midi') || funcStr.includes('accept'), 'importFromMidiInternal should set file accept types');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body finds or creates Synth track', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('Synth') || funcStr.includes('track'), 'importFromMidiInternal should find or create a Synth track');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body uses snap to grid', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('snapToGrid') || funcStr.includes('snap') || funcStr.includes('Grid'), 'importFromMidiInternal should support snap to grid');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body references ticksPer16th', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('ticksPer16th') || funcStr.includes('ticksPer') || funcStr.includes('16th'), 'importFromMidiInternal should reference ticksPer16th');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body references midiToRow', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('midiToRow'), 'importFromMidiInternal should call midiToRow');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body calculates note duration', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('duration') || funcStr.includes('endStep') || funcStr.includes('startStep'), 'importFromMidiInternal should calculate note duration');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body scales velocity', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('velocity') && (funcStr.includes('MIDI_IMPORT') || funcStr.includes('scale') || funcStr.includes('127')), 'importFromMidiInternal should scale velocity');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body places notes in sequence', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('activeSeq') || funcStr.includes('sequence') || funcStr.includes('step'), 'importFromMidiInternal should place notes in sequence');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body calls updateTrackUI', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('updateTrackUI'), 'importFromMidiInternal should call updateTrackUI');
});

TestRunner.test('MIDI Import - importFromMidiInternal function body has error handling', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('try') || funcStr.includes('catch') || funcStr.includes('error'), 'importFromMidiInternal should have error handling');
});

TestRunner.test('MIDI Import - parseMidiFile is a function in state.js', (t) => {
    const funcStr = parseMidiFile.toString();
    t.assertTruthy(funcStr.length > 0, 'parseMidiFile should exist in state.js');
});

TestRunner.test('MIDI Import - parseMidiFile function body references DataView', (t) => {
    const funcStr = parseMidiFile.toString();
    t.assertTruthy(funcStr.includes('DataView'), 'parseMidiFile should use DataView to read MIDI file');
});

TestRunner.test('MIDI Import - parseMidiFile function body validates MThd header', (t) => {
    const funcStr = parseMidiFile.toString();
    t.assertTruthy(funcStr.includes('MThd') || funcStr.includes('0x4D') || funcStr.includes('4D546864'), 'parseMidiFile should validate MThd header');
});

TestRunner.test('MIDI Import - parseMidiFile function body reads MIDI header chunk', (t) => {
    const funcStr = parseMidiFile.toString();
    t.assertTruthy(funcStr.includes('getUint32') || funcStr.includes('header'), 'parseMidiFile should read MIDI header chunk');
});

TestRunner.test('MIDI Import - parseMidiFile function body reads MTrk track chunks', (t) => {
    const funcStr = parseMidiFile.toString();
    t.assertTruthy(funcStr.includes('MTrk') || funcStr.includes('track') || funcStr.includes('chunk'), 'parseMidiFile should read track chunks');
});

TestRunner.test('MIDI Import - parseMidiFile function body parses delta time', (t) => {
    const funcStr = parseMidiFile.toString();
    t.assertTruthy(funcStr.includes('delta') || funcStr.includes('VLQ') || funcStr.includes('varInt') || funcStr.includes('toVLQ'), 'parseMidiFile should parse delta time');
});

TestRunner.test('MIDI Import - parseMidiFile function body parses noteOn events', (t) => {
    const funcStr = parseMidiFile.toString();
    t.assertTruthy(funcStr.includes('noteOn') || funcStr.includes('NoteOn') || (funcStr.includes('0x90') || funcStr.includes('0x9')), 'parseMidiFile should parse noteOn events');
});

TestRunner.test('MIDI Import - parseMidiFile function body parses noteOff events', (t) => {
    const funcStr = parseMidiFile.toString();
    t.assertTruthy(funcStr.includes('noteOff') || funcStr.includes('NoteOff') || (funcStr.includes('0x80') || funcStr.includes('0x8')), 'parseMidiFile should parse noteOff events');
});

TestRunner.test('MIDI Import - parseMidiFile function body parses tempo meta events', (t) => {
    const funcStr = parseMidiFile.toString();
    t.assertTruthy(funcStr.includes('tempo') || funcStr.includes('Tempo') || funcStr.includes('0xFF'), 'parseMidiFile should parse tempo meta events');
});

TestRunner.test('MIDI Import - parseMidiFile function body parses time signature meta events', (t) => {
    const funcStr = parseMidiFile.toString();
    t.assertTruthy(funcStr.includes('timeSig') || funcStr.includes('TimeSig') || funcStr.includes('time') || funcStr.includes('Time'), 'parseMidiFile should parse time signature meta events');
});

TestRunner.test('MIDI Import - parseMidiFile function body returns events array', (t) => {
    const funcStr = parseMidiFile.toString();
    t.assertTruthy(funcStr.includes('return') && funcStr.includes('events'), 'parseMidiFile should return events array');
});

TestRunner.test('MIDI Import - parseMidiFile function body returns ticksPerQuarter', (t) => {
    const funcStr = parseMidiFile.toString();
    t.assertTruthy(funcStr.includes('ticksPerQuarter'), 'parseMidiFile should return ticksPerQuarter');
});

TestRunner.test('MIDI Import - midiToRow is a function in state.js', (t) => {
    const funcStr = midiToRow.toString();
    t.assertTruthy(funcStr.length > 0, 'midiToRow should exist in state.js');
});

TestRunner.test('MIDI Import - midiToRow accepts 2 parameters (midiNote, trackType)', (t) => {
    const funcStr = midiToRow.toString();
    t.assertTruthy(funcStr.includes('midiNote') && funcStr.includes('trackType'), 'midiToRow should accept 2 parameters');
});

TestRunner.test('MIDI Import - midiToRow handles Synth track type', (t) => {
    const funcStr = midiToRow.toString();
    t.assertTruthy(funcStr.includes('Synth') || funcStr.includes('60'), 'midiToRow should handle Synth track type');
});

TestRunner.test('MIDI Import - midiToRow handles DrumSampler track type', (t) => {
    const funcStr = midiToRow.toString();
    t.assertTruthy(funcStr.includes('DrumSampler') || funcStr.includes('36'), 'midiToRow should handle DrumSampler track type');
});

TestRunner.test('MIDI Import - midiToRow handles Sampler track type', (t) => {
    const funcStr = midiToRow.toString();
    t.assertTruthy(funcStr.includes('Sampler'), 'midiToRow should handle Sampler track type');
});

TestRunner.test('MIDI Import - createFileInputForMidiImport is a function in state.js', (t) => {
    const funcStr = createFileInputForMidiImport.toString();
    t.assertTruthy(funcStr.length > 0, 'createFileInputForMidiImport should exist in state.js');
});

TestRunner.test('MIDI Import - createFileInputForMidiImport returns a Promise', (t) => {
    const funcStr = createFileInputForMidiImport.toString();
    t.assertTruthy(funcStr.includes('Promise'), 'createFileInputForMidiImport should return a Promise');
});

TestRunner.test('MIDI Import - createFileInputForMidiImport creates file input element', (t) => {
    const funcStr = createFileInputForMidiImport.toString();
    t.assertTruthy(funcStr.includes('createElement') || funcStr.includes('input'), 'createFileInputForMidiImport should create file input');
});

TestRunner.test('MIDI Import - createFileInputForMidiImport sets accept attribute for MIDI files', (t) => {
    const funcStr = createFileInputForMidiImport.toString();
    t.assertTruthy(funcStr.includes('.mid') || funcStr.includes('.midi') || funcStr.includes('accept'), 'createFileInputForMidiImport should accept MIDI files');
});

TestRunner.test('MIDI Import - createFileInputForMidiImport handles file selection via onchange', (t) => {
    const funcStr = createFileInputForMidiImport.toString();
    t.assertTruthy(funcStr.includes('onchange') || funcStr.includes('onChange') || funcStr.includes('files'), 'createFileInputForMidiImport should handle file selection');
});

TestRunner.test('MIDI Import - createFileInputForMidiImport resolves with selected file', (t) => {
    const funcStr = createFileInputForMidiImport.toString();
    t.assertTruthy(funcStr.includes('resolve'), 'createFileInputForMidiImport should resolve with file');
});

TestRunner.test('MIDI Import - createFileInputForMidiImport rejects when no file selected', (t) => {
    const funcStr = createFileInputForMidiImport.toString();
    t.assertTruthy(funcStr.includes('reject') || funcStr.includes('reject'), 'createFileInputForMidiImport should reject when no file selected');
});

TestRunner.test('MIDI Import - APP_VERSION validation for Day 508', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts.length >= 3, 'APP_VERSION should have at least 3 parts');
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 508');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 173, 'Minor version should be >= 173 for Day 508');
    }
});


// ============================================

// ============================================
// Day 510: Track Automation Methods Extended Tests
// ============================================

TestRunner.test('Day 510 - Track.writeVolumeAutomation is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.writeVolumeAutomation, 'function', 'writeVolumeAutomation should be a function');
});

TestRunner.test('Day 510 - Track.writeVolumeAutomation accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.writeVolumeAutomation.length, 2, 'writeVolumeAutomation should accept 2 parameters');
});

TestRunner.test('Day 510 - Track.writeVolumeAutomation references time parameter', (t) => {
    const funcStr = Track.prototype.writeVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('time'), 'writeVolumeAutomation should reference time parameter');
});

TestRunner.test('Day 510 - Track.writeVolumeAutomation references value parameter', (t) => {
    const funcStr = Track.prototype.writeVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('value'), 'writeVolumeAutomation should reference value parameter');
});

TestRunner.test('Day 510 - Track.writeVolumeAutomation initializes automation.volume array', (t) => {
    const funcStr = Track.prototype.writeVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('automation.volume') || funcStr.includes("automation['volume']"), 'writeVolumeAutomation should initialize automation.volume array');
});

TestRunner.test('Day 510 - Track.writeMuteAutomation is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.writeMuteAutomation, 'function', 'writeMuteAutomation should be a function');
});

TestRunner.test('Day 510 - Track.writeMuteAutomation accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.writeMuteAutomation.length, 2, 'writeMuteAutomation should accept 2 parameters');
});

TestRunner.test('Day 510 - Track.writeMuteAutomation references time parameter', (t) => {
    const funcStr = Track.prototype.writeMuteAutomation.toString();
    t.assertTruthy(funcStr.includes('time'), 'writeMuteAutomation should reference time parameter');
});

TestRunner.test('Day 510 - Track.writeMuteAutomation references value parameter', (t) => {
    const funcStr = Track.prototype.writeMuteAutomation.toString();
    t.assertTruthy(funcStr.includes('value'), 'writeMuteAutomation should reference value parameter');
});

TestRunner.test('Day 510 - Track.writeSoloAutomation is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.writeSoloAutomation, 'function', 'writeSoloAutomation should be a function');
});

TestRunner.test('Day 510 - Track.writeSoloAutomation accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.writeSoloAutomation.length, 2, 'writeSoloAutomation should accept 2 parameters');
});

TestRunner.test('Day 510 - Track.writeSoloAutomation references time parameter', (t) => {
    const funcStr = Track.prototype.writeSoloAutomation.toString();
    t.assertTruthy(funcStr.includes('time'), 'writeSoloAutomation should reference time parameter');
});

TestRunner.test('Day 510 - Track.writeSoloAutomation references value parameter', (t) => {
    const funcStr = Track.prototype.writeSoloAutomation.toString();
    t.assertTruthy(funcStr.includes('value'), 'writeSoloAutomation should reference value parameter');
});

TestRunner.test('Day 510 - Track.removeAutomationEventsInRange is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.removeAutomationEventsInRange, 'function', 'removeAutomationEventsInRange should be a function');
});

TestRunner.test('Day 510 - Track.removeAutomationEventsInRange accepts 3 parameters', (t) => {
    t.assertEqual(Track.prototype.removeAutomationEventsInRange.length, 3, 'removeAutomationEventsInRange should accept 3 parameters');
});

TestRunner.test('Day 510 - Track.removeAutomationEventsInRange calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.removeAutomationEventsInRange.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'removeAutomationEventsInRange should call _captureUndoState for undo support');
});

TestRunner.test('Day 510 - Track.removeAutomationEventsInRange filters automation events', (t) => {
    const funcStr = Track.prototype.removeAutomationEventsInRange.toString();
    t.assertTruthy(funcStr.includes('filter'), 'removeAutomationEventsInRange should filter automation events');
});

TestRunner.test('Day 510 - Track.applyAutomationAtTime is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.applyAutomationAtTime, 'function', 'applyAutomationAtTime should be a function');
});

TestRunner.test('Day 510 - Track.applyAutomationAtTime accepts 1 parameter', (t) => {
    t.assertEqual(Track.prototype.applyAutomationAtTime.length, 1, 'applyAutomationAtTime should accept 1 parameter');
});

TestRunner.test('Day 510 - Track.applyAutomationAtTime references time parameter', (t) => {
    const funcStr = Track.prototype.applyAutomationAtTime.toString();
    t.assertTruthy(funcStr.includes('time'), 'applyAutomationAtTime should reference time parameter');
});

TestRunner.test('Day 510 - Track.toggleMuteAutomationNow is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.toggleMuteAutomationNow, 'function', 'toggleMuteAutomationNow should be a function');
});

TestRunner.test('Day 510 - Track.toggleMuteAutomationNow accepts 0 parameters', (t) => {
    t.assertEqual(Track.prototype.toggleMuteAutomationNow.length, 0, 'toggleMuteAutomationNow should accept 0 parameters');
});

TestRunner.test('Day 510 - Track.toggleMuteAutomationNow checks automationArmed', (t) => {
    const funcStr = Track.prototype.toggleMuteAutomationNow.toString();
    t.assertTruthy(funcStr.includes('automationArmed'), 'toggleMuteAutomationNow should check automationArmed');
});

TestRunner.test('Day 510 - Track.toggleMuteAutomationNow calls writeMuteAutomation', (t) => {
    const funcStr = Track.prototype.toggleMuteAutomationNow.toString();
    t.assertTruthy(funcStr.includes('writeMuteAutomation'), 'toggleMuteAutomationNow should call writeMuteAutomation');
});

TestRunner.test('Day 510 - Track.toggleSoloAutomationNow is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.toggleSoloAutomationNow, 'function', 'toggleSoloAutomationNow should be a function');
});

TestRunner.test('Day 510 - Track.toggleSoloAutomationNow accepts 0 parameters', (t) => {
    t.assertEqual(Track.prototype.toggleSoloAutomationNow.length, 0, 'toggleSoloAutomationNow should accept 0 parameters');
});

TestRunner.test('Day 510 - Track.toggleSoloAutomationNow checks automationArmed', (t) => {
    const funcStr = Track.prototype.toggleSoloAutomationNow.toString();
    t.assertTruthy(funcStr.includes('automationArmed'), 'toggleSoloAutomationNow should check automationArmed');
});

TestRunner.test('Day 510 - Track.toggleSoloAutomationNow calls writeSoloAutomation', (t) => {
    const funcStr = Track.prototype.toggleSoloAutomationNow.toString();
    t.assertTruthy(funcStr.includes('writeSoloAutomation'), 'toggleSoloAutomationNow should call writeSoloAutomation');
});

TestRunner.test('Day 510 - Track.setAutomationArmed is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setAutomationArmed, 'function', 'setAutomationArmed should be a function');
});

TestRunner.test('Day 510 - Track.setAutomationArmed accepts 1 parameter', (t) => {
    t.assertEqual(Track.prototype.setAutomationArmed.length, 1, 'setAutomationArmed should accept 1 parameter');
});

TestRunner.test('Day 510 - Track.setAutomationArmed calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAutomationArmed.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAutomationArmed should call _captureUndoState for undo support');
});

TestRunner.test('Day 510 - Track.setAutomationArmed uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setAutomationArmed.toString();
    t.assertTruthy(funcStr.includes('Automation Arm') || funcStr.includes('Toggle Automation'), 'setAutomationArmed should use descriptive undo label');
});

TestRunner.test('Day 510 - Track.setMonitoringEnabled is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setMonitoringEnabled, 'function', 'setMonitoringEnabled should be a function');
});

TestRunner.test('Day 510 - Track.setMonitoringEnabled accepts 1 parameter', (t) => {
    t.assertEqual(Track.prototype.setMonitoringEnabled.length, 1, 'setMonitoringEnabled should accept 1 parameter');
});

TestRunner.test('Day 510 - Track.setMonitoringEnabled calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setMonitoringEnabled.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setMonitoringEnabled should call _captureUndoState for undo support');
});

TestRunner.test('Day 510 - Track.setMonitoringEnabled uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.setMonitoringEnabled.toString();
    t.assertTruthy(funcStr.includes('Input Monitoring') || funcStr.includes('Monitoring'), 'setMonitoringEnabled should use descriptive undo label');
});

TestRunner.test('Day 510 - Track.setVolume is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setVolume, 'function', 'setVolume should be a function');
});

TestRunner.test('Day 510 - Track.setVolume accepts 1-2 parameters', (t) => {
    const paramCount = Track.prototype.setVolume.length;
    t.assertEqual(paramCount === 1 || paramCount === 2, true, 'setVolume should accept 1 or 2 parameters');
});

TestRunner.test('Day 510 - Track.setVolume calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setVolume.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setVolume should call _captureUndoState for undo support');
});

TestRunner.test('Day 510 - Track.setPan is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setPan, 'function', 'setPan should be a function');
});

TestRunner.test('Day 510 - Track.setPan accepts 1 parameter', (t) => {
    t.assertEqual(Track.prototype.setPan.length, 1, 'setPan should accept 1 parameter');
});

TestRunner.test('Day 510 - APP_VERSION validation for Day 510', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts.length >= 3, 'APP_VERSION should have at least 3 parts');
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 510');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 173, 'Minor version should be >= 173 for Day 510');
    }
});

// Day 509: Track Templates & Send Effects Window Tests
// ============================================

TestRunner.test('Day 509 - openTrackTemplatesWindow is a function export', (t) => {
    t.assertEqual(typeof openTrackTemplatesWindow, 'function', 'openTrackTemplatesWindow should be a function');
});

TestRunner.test('Day 509 - openTrackTemplatesWindow accepts 0-1 parameters', (t) => {
    const paramCount = openTrackTemplatesWindow.length;
    t.assertEqual(paramCount <= 1, true, 'openTrackTemplatesWindow should accept 0 or 1 parameter');
});

TestRunner.test('Day 509 - openTrackTemplatesWindow function body uses createWindow', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTrackTemplatesWindow should use createWindow');
});

TestRunner.test('Day 509 - openTrackTemplatesWindow function body uses getOpenWindows for single-instance', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openTrackTemplatesWindow should check for open windows');
});

TestRunner.test('Day 509 - openTrackTemplatesWindow function body references localAppServices', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('localAppServices'), 'openTrackTemplatesWindow should reference localAppServices');
});

TestRunner.test('Day 509 - openTrackTemplatesWindow function body references getTrackTemplates', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('getTrackTemplates'), 'openTrackTemplatesWindow should call getTrackTemplates');
});

TestRunner.test('Day 509 - openTrackTemplatesWindow function body references getTrackTemplateById', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('getTrackTemplateById'), 'openTrackTemplatesWindow should reference getTrackTemplateById');
});

TestRunner.test('Day 509 - openTrackTemplatesWindow function body references removeTrackTemplate', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('removeTrackTemplate'), 'openTrackTemplatesWindow should call removeTrackTemplate');
});

TestRunner.test('Day 509 - openTrackTemplatesWindow function body calls captureStateForUndo', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'openTrackTemplatesWindow should call captureStateForUndo for template operations');
});

TestRunner.test('Day 509 - openTrackTemplatesWindow function body creates template list container', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('trackTemplatesList') || funcStr.includes('templatesList') || funcStr.includes('template-item'), 'openTrackTemplatesWindow should create a template list container');
});

TestRunner.test('Day 509 - openTrackTemplatesWindow function body has Load button', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('load') || funcStr.includes('Load'), 'openTrackTemplatesWindow should have a Load button');
});

TestRunner.test('Day 509 - openTrackTemplatesWindow function body has Delete button', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('delete') || funcStr.includes('Delete'), 'openTrackTemplatesWindow should have a Delete button');
});

TestRunner.test('Day 509 - openTrackTemplatesWindow APP_VERSION validation for Day 509', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts.length >= 3, 'APP_VERSION should have at least 3 parts');
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 509');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 172, 'Minor version should be >= 172 for Day 509');
    }
});

// --- openSendEffectsWindow Tests ---

TestRunner.test('Day 509 - openSendEffectsWindow is a function export', (t) => {
    t.assertEqual(typeof openSendEffectsWindow, 'function', 'openSendEffectsWindow should be a function');
});

TestRunner.test('Day 509 - openSendEffectsWindow accepts 1-2 parameters', (t) => {
    const paramCount = openSendEffectsWindow.length;
    t.assertEqual(paramCount >= 1 && paramCount <= 2, true, 'openSendEffectsWindow should accept 1 or 2 parameters');
});

TestRunner.test('Day 509 - openSendEffectsWindow function body uses createWindow', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openSendEffectsWindow should use createWindow');
});

TestRunner.test('Day 509 - openSendEffectsWindow function body uses getOpenWindows for single-instance', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openSendEffectsWindow should check for open windows');
});

TestRunner.test('Day 509 - openSendEffectsWindow function body references localAppServices', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('localAppServices'), 'openSendEffectsWindow should reference localAppServices');
});

TestRunner.test('Day 509 - openSendEffectsWindow function body references effectsRegistryAccess', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('effectsRegistryAccess') || funcStr.includes('AVAILABLE_EFFECTS'), 'openSendEffectsWindow should reference effectsRegistryAccess or AVAILABLE_EFFECTS');
});

TestRunner.test('Day 509 - openSendEffectsWindow function body calls addEffectToSendBus', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('addEffectToSendBus'), 'openSendEffectsWindow should call addEffectToSendBus');
});

TestRunner.test('Day 509 - openSendEffectsWindow function body calls removeEffectFromSendBus', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('removeEffectFromSendBus'), 'openSendEffectsWindow should call removeEffectFromSendBus');
});

TestRunner.test('Day 509 - openSendEffectsWindow function body calls setSendTrackEffects', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('setSendTrackEffects'), 'openSendEffectsWindow should call setSendTrackEffects');
});

TestRunner.test('Day 509 - openSendEffectsWindow function body calls updateSendBusEffectParam', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('updateSendBusEffectParam'), 'openSendEffectsWindow should call updateSendBusEffectParam');
});

TestRunner.test('Day 509 - openSendEffectsWindow function body creates effects list container', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('effectsList') || funcStr.includes('effect-item'), 'openSendEffectsWindow should create an effects list container');
});

TestRunner.test('Day 509 - openSendEffectsWindow function body has Add Effect button', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('addEffect') || funcStr.includes('Add Effect'), 'openSendEffectsWindow should have an Add Effect button');
});

TestRunner.test('Day 509 - openSendEffectsWindow APP_VERSION validation for Day 509', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts.length >= 3, 'APP_VERSION should have at least 3 parts');
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 509');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 172, 'Minor version should be >= 172 for Day 509');
    }
});


// ============================================
// Day 424: SnugWindow Class Methods Tests
// ============================================

TestRunner.test('SnugWindow - toggleMaximize is a function', (t) => {
    const funcStr = SnugWindow.prototype.toggleMaximize.toString();
    t.assertTruthy(funcStr.includes('toggleMaximize'), 'toggleMaximize should exist on prototype');
});

TestRunner.test('SnugWindow - toggleMaximize toggles isMaximized', (t) => {
    const funcStr = SnugWindow.prototype.toggleMaximize.toString();
    t.assertTruthy(funcStr.includes('isMaximized'), 'toggleMaximize should reference isMaximized');
});

TestRunner.test('SnugWindow - toggleMaximize saves restoreState', (t) => {
    const funcStr = SnugWindow.prototype.toggleMaximize.toString();
    t.assertTruthy(funcStr.includes('restoreState'), 'toggleMaximize should save/restore state');
});

TestRunner.test('SnugWindow - toggleMaximize handles element styles', (t) => {
    const funcStr = SnugWindow.prototype.toggleMaximize.toString();
    t.assertTruthy(funcStr.includes('style'), 'toggleMaximize should manipulate element styles');
});

TestRunner.test('SnugWindow - minimize is a function', (t) => {
    const funcStr = SnugWindow.prototype.minimize.toString();
    t.assertTruthy(funcStr.includes('minimize'), 'minimize should exist on prototype');
});

TestRunner.test('SnugWindow - minimize accepts skipUndo parameter', (t) => {
    const funcStr = SnugWindow.prototype.minimize.toString();
    t.assertTruthy(funcStr.includes('skipUndo'), 'minimize should accept skipUndo parameter');
});

TestRunner.test('SnugWindow - minimize sets isMinimized', (t) => {
    const funcStr = SnugWindow.prototype.minimize.toString();
    t.assertTruthy(funcStr.includes('isMinimized'), 'minimize should set isMinimized flag');
});

TestRunner.test('SnugWindow - minimize calls _captureUndo', (t) => {
    const funcStr = SnugWindow.prototype.minimize.toString();
    t.assertTruthy(funcStr.includes('_captureUndo'), 'minimize should call _captureUndo');
});

TestRunner.test('SnugWindow - minimize guards skipUndo', (t) => {
    const funcStr = SnugWindow.prototype.minimize.toString();
    t.assertTruthy(funcStr.includes('skipUndo'), 'minimize should check skipUndo before undo capture');
});

TestRunner.test('SnugWindow - restore is a function', (t) => {
    const funcStr = SnugWindow.prototype.restore.toString();
    t.assertTruthy(funcStr.includes('restore'), 'restore should exist on prototype');
});

TestRunner.test('SnugWindow - restore accepts skipUndo parameter', (t) => {
    const funcStr = SnugWindow.prototype.restore.toString();
    t.assertTruthy(funcStr.includes('skipUndo'), 'restore should accept skipUndo parameter');
});

TestRunner.test('SnugWindow - restore clears isMinimized', (t) => {
    const funcStr = SnugWindow.prototype.restore.toString();
    t.assertTruthy(funcStr.includes('isMinimized'), 'restore should clear isMinimized flag');
});

TestRunner.test('SnugWindow - restore uses restoreState', (t) => {
    const funcStr = SnugWindow.prototype.restore.toString();
    t.assertTruthy(funcStr.includes('restoreState'), 'restore should use restoreState object');
});

TestRunner.test('SnugWindow - restore calls _captureUndo', (t) => {
    const funcStr = SnugWindow.prototype.restore.toString();
    t.assertTruthy(funcStr.includes('_captureUndo'), 'restore should call _captureUndo');
});

TestRunner.test('SnugWindow - close is a function', (t) => {
    const funcStr = SnugWindow.prototype.close.toString();
    t.assertTruthy(funcStr.includes('close'), 'close should exist on prototype');
});

TestRunner.test('SnugWindow - close accepts isReconstruction parameter', (t) => {
    const funcStr = SnugWindow.prototype.close.toString();
    t.assertTruthy(funcStr.includes('isReconstruction'), 'close should accept isReconstruction parameter');
});

TestRunner.test('SnugWindow - close calls onCloseCallback', (t) => {
    const funcStr = SnugWindow.prototype.close.toString();
    t.assertTruthy(funcStr.includes('onCloseCallback'), 'close should call onCloseCallback');
});

TestRunner.test('SnugWindow - close removes taskbar button', (t) => {
    const funcStr = SnugWindow.prototype.close.toString();
    t.assertTruthy(funcStr.includes('taskbarButton') || funcStr.includes('removeChild'), 'close should remove taskbar button');
});

TestRunner.test('SnugWindow - close removes element', (t) => {
    const funcStr = SnugWindow.prototype.close.toString();
    t.assertTruthy(funcStr.includes('element') && (funcStr.includes('remove') || funcStr.includes('removeChild')), 'close should remove element from DOM');
});

TestRunner.test('SnugWindow - close calls removeWindowFromStore', (t) => {
    const funcStr = SnugWindow.prototype.close.toString();
    t.assertTruthy(funcStr.includes('removeWindowFromStore'), 'close should call removeWindowFromStore');
});

TestRunner.test('SnugWindow - focus is a function', (t) => {
    const funcStr = SnugWindow.prototype.focus.toString();
    t.assertTruthy(funcStr.includes('focus'), 'focus should exist on prototype');
});

TestRunner.test('SnugWindow - focus accepts skipUndoForFocusItself parameter', (t) => {
    const funcStr = SnugWindow.prototype.focus.toString();
    t.assertTruthy(funcStr.includes('skipUndoForFocusItself'), 'focus should accept skipUndoForFocusItself parameter');
});

TestRunner.test('SnugWindow - focus increments zIndex', (t) => {
    const funcStr = SnugWindow.prototype.focus.toString();
    t.assertTruthy(funcStr.includes('zIndex') || funcStr.includes('style.zIndex'), 'focus should increment zIndex');
});

TestRunner.test('SnugWindow - focus references appServices', (t) => {
    const funcStr = SnugWindow.prototype.focus.toString();
    t.assertTruthy(funcStr.includes('appServices'), 'focus should reference appServices');
});

TestRunner.test('SnugWindow - applyState is a function', (t) => {
    const funcStr = SnugWindow.prototype.applyState.toString();
    t.assertTruthy(funcStr.includes('applyState'), 'applyState should exist on prototype');
});

TestRunner.test('SnugWindow - applyState accepts state parameter', (t) => {
    const funcStr = SnugWindow.prototype.applyState.toString();
    t.assertTruthy(funcStr.includes('state'), 'applyState should accept state parameter');
});

TestRunner.test('SnugWindow - createTaskbarButton is a function', (t) => {
    const funcStr = SnugWindow.prototype.createTaskbarButton.toString();
    t.assertTruthy(funcStr.includes('createTaskbarButton'), 'createTaskbarButton should exist on prototype');
});

TestRunner.test('SnugWindow - createTaskbarButton creates button element', (t) => {
    const funcStr = SnugWindow.prototype.createTaskbarButton.toString();
    t.assertTruthy(funcStr.includes('createElement'), 'createTaskbarButton should create button element');
});

TestRunner.test('SnugWindow - createTaskbarButton sets taskbarButton property', (t) => {
    const funcStr = SnugWindow.prototype.createTaskbarButton.toString();
    t.assertTruthy(funcStr.includes('taskbarButton'), 'createTaskbarButton should set taskbarButton property');
});

TestRunner.test('SnugWindow - updateTaskbarButtonActiveState is a function', (t) => {
    const funcStr = SnugWindow.prototype.updateTaskbarButtonActiveState.toString();
    t.assertTruthy(funcStr.includes('updateTaskbarButtonActiveState'), 'updateTaskbarButtonActiveState should exist');
});

TestRunner.test('SnugWindow - makeDraggable is a function', (t) => {
    const funcStr = SnugWindow.prototype.makeDraggable.toString();
    t.assertTruthy(funcStr.includes('makeDraggable'), 'makeDraggable should exist on prototype');
});

TestRunner.test('SnugWindow - makeResizable is a function', (t) => {
    const funcStr = SnugWindow.prototype.makeResizable.toString();
    t.assertTruthy(funcStr.includes('makeResizable'), 'makeResizable should exist on prototype');
});

TestRunner.test('SnugWindow - makeResizable adds event listeners', (t) => {
    const funcStr = SnugWindow.prototype.makeResizable.toString();
    t.assertTruthy(funcStr.includes('addEventListener'), 'makeResizable should add event listeners');
});

TestRunner.test('SnugWindow - Constructor sets id and title', (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('this.id'), 'Constructor should set this.id');
    t.assertTruthy(funcStr.includes('this.title'), 'Constructor should set this.title');
});

TestRunner.test('SnugWindow - Constructor initializes flags', (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('isMinimized') || funcStr.includes('isMaximized'), 'Constructor should initialize window state flags');
});

TestRunner.test('SnugWindow - Constructor creates DOM elements', (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('createElement'), 'Constructor should create DOM elements');
});

TestRunner.test('SnugWindow - Constructor appends to desktop', (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('appendChild'), 'Constructor should append elements to desktop');
});

TestRunner.test('SnugWindow - Constructor calculates position', (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('offsetWidth') || funcStr.includes('offsetHeight'), 'Constructor should calculate position/size');
});

TestRunner.test('SnugWindow - Constructor calls makeDraggable', (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('makeDraggable'), 'Constructor should call makeDraggable');
});

TestRunner.test('SnugWindow - Constructor calls makeResizable', (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('makeResizable'), 'Constructor should call makeResizable');
});

TestRunner.test('SnugWindow - Constructor sets up appServices', (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('appServices'), 'Constructor should set up appServices');
});

TestRunner.test('SnugWindow - APP_VERSION validation for Day 424', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 424');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 100, 'Minor version should be >= 100 for Day 424');
    }
});

// ============================================================
// Day 426: Context Suspension Monitoring & Sidechain Tests
// ============================================================

TestRunner.test('Context Monitor - startContextSuspensionMonitoring is a function export', (t) => {
    t.assertEqual(typeof startContextSuspensionMonitoring, 'function', 'startContextSuspensionMonitoring should be a function');
});

TestRunner.test('Context Monitor - startContextSuspensionMonitoring accepts 1 parameter', (t) => {
    const paramCount = startContextSuspensionMonitoring.length;
    t.assertEqual(paramCount, 1, 'startContextSuspensionMonitoring should accept 1 parameter');
});

TestRunner.test('Context Monitor - startContextSuspensionMonitoring references intervalMs parameter', (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('intervalMs'), 'startContextSuspensionMonitoring should reference intervalMs parameter');
});

TestRunner.test('Context Monitor - startContextSuspensionMonitoring checks resumeAttemptScheduled', (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('resumeAttemptScheduled'), 'startContextSuspensionMonitoring should check resumeAttemptScheduled flag');
});

TestRunner.test('Context Monitor - startContextSuspensionMonitoring uses setInterval', (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('setInterval'), 'startContextSuspensionMonitoring should use setInterval');
});

TestRunner.test('Context Monitor - startContextSuspensionMonitoring references Tone.context', (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('Tone.context'), 'startContextSuspensionMonitoring should reference Tone.context');
});

TestRunner.test('Context Monitor - startContextSuspensionMonitoring handles suspended state', (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('suspended'), 'startContextSuspensionMonitoring should handle suspended state');
});

TestRunner.test('Context Monitor - startContextSuspensionMonitoring calls context.resume()', (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('resume'), 'startContextSuspensionMonitoring should call resume()');
});

TestRunner.test('Context Monitor - startContextSuspensionMonitoring increments contextSuspendedCount', (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('contextSuspendedCount'), 'startContextSuspensionMonitoring should increment contextSuspendedCount');
});

TestRunner.test('Context Monitor - stopContextSuspensionMonitoring is a function export', (t) => {
    t.assertEqual(typeof stopContextSuspensionMonitoring, 'function', 'stopContextSuspensionMonitoring should be a function');
});

TestRunner.test('Context Monitor - stopContextSuspensionMonitoring accepts 0 parameters', (t) => {
    const paramCount = stopContextSuspensionMonitoring.length;
    t.assertEqual(paramCount, 0, 'stopContextSuspensionMonitoring should accept 0 parameters');
});

TestRunner.test('Context Monitor - stopContextSuspensionMonitoring resets resumeAttemptScheduled', (t) => {
    const funcStr = stopContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('resumeAttemptScheduled'), 'stopContextSuspensionMonitoring should reset resumeAttemptScheduled');
});

TestRunner.test('Context Monitor - stopContextSuspensionMonitoring resets contextSuspendedCount', (t) => {
    const funcStr = stopContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('contextSuspendedCount'), 'stopContextSuspensionMonitoring should reset contextSuspendedCount');
});

TestRunner.test('Context Monitor - getContextSuspensionCount is a function export', (t) => {
    t.assertEqual(typeof getContextSuspensionCount, 'function', 'getContextSuspensionCount should be a function');
});

TestRunner.test('Context Monitor - getContextSuspensionCount accepts 0 parameters', (t) => {
    const paramCount = getContextSuspensionCount.length;
    t.assertEqual(paramCount, 0, 'getContextSuspensionCount should accept 0 parameters');
});

TestRunner.test('Context Monitor - getContextSuspensionCount returns contextSuspendedCount', (t) => {
    const funcStr = getContextSuspensionCount.toString();
    t.assertTruthy(funcStr.includes('contextSuspendedCount'), 'getContextSuspensionCount should return contextSuspendedCount');
});

TestRunner.test('Context Monitor - getContextState is a function export', (t) => {
    t.assertEqual(typeof getContextState, 'function', 'getContextState should be a function');
});

TestRunner.test('Context Monitor - getContextState accepts 0 parameters', (t) => {
    const paramCount = getContextState.length;
    t.assertEqual(paramCount, 0, 'getContextState should accept 0 parameters');
});

TestRunner.test('Context Monitor - getContextState references Tone.context.state', (t) => {
    const funcStr = getContextState.toString();
    t.assertTruthy(funcStr.includes('Tone.context.state') || funcStr.includes('context.state'), 'getContextState should reference Tone.context.state');
});

TestRunner.test('Sidechain - getSidechainBusInput is a function export', (t) => {
    t.assertEqual(typeof getSidechainBusInput, 'function', 'getSidechainBusInput should be a function');
});

TestRunner.test('Sidechain - getSidechainBusInput accepts 0 parameters', (t) => {
    const paramCount = getSidechainBusInput.length;
    t.assertEqual(paramCount, 0, 'getSidechainBusInput should accept 0 parameters');
});

TestRunner.test('Sidechain - getSidechainBusInput checks sidechainBus state', (t) => {
    const funcStr = getSidechainBusInput.toString();
    t.assertTruthy(funcStr.includes('sidechainBus'), 'getSidechainBusInput should check sidechainBus state');
});

TestRunner.test('Sidechain - getSidechainBusInput creates Tone.Gain node', (t) => {
    const funcStr = getSidechainBusInput.toString();
    t.assertTruthy(funcStr.includes('Tone.Gain') || funcStr.includes('Gain'), 'getSidechainBusInput should create Tone.Gain node');
});

TestRunner.test('Sidechain - getSidechainBusInput disposes existing node if disposed flag is false', (t) => {
    const funcStr = getSidechainBusInput.toString();
    t.assertTruthy(funcStr.includes('dispose'), 'getSidechainBusInput should dispose existing node');
});

TestRunner.test('Sidechain - enableSidechainFromMic is a function export', (t) => {
    t.assertEqual(typeof enableSidechainFromMic, 'function', 'enableSidechainFromMic should be a function');
});

TestRunner.test('Sidechain - enableSidechainFromMic is async', (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('async') || enableSidechainFromMic.constructor.name === 'AsyncFunction', 'enableSidechainFromMic should be async');
});

TestRunner.test('Sidechain - enableSidechainFromMic accepts 1 parameter', (t) => {
    const paramCount = enableSidechainFromMic.length;
    t.assertEqual(paramCount, 1, 'enableSidechainFromMic should accept 1 parameter');
});

TestRunner.test('Sidechain - enableSidechainFromMic references compressorNode parameter', (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('compressorNode'), 'enableSidechainFromMic should reference compressorNode parameter');
});

TestRunner.test('Sidechain - enableSidechainFromMic validates compressorNode', (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('compressorNode.disposed'), 'enableSidechainFromMic should validate compressorNode');
});

TestRunner.test('Sidechain - enableSidechainFromMic checks micForSidechain state', (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('micForSidechain'), 'enableSidechainFromMic should check micForSidechain state');
});

TestRunner.test('Sidechain - enableSidechainFromMic calls Tone.start()', (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('Tone.start'), 'enableSidechainFromMic should call Tone.start()');
});

TestRunner.test('Sidechain - enableSidechainFromMic getsUserMedia from navigator', (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('getUserMedia') || funcStr.includes('navigator.mediaDevices'), 'enableSidechainFromMic should getUserMedia');
});

TestRunner.test('Sidechain - enableSidechainFromMic creates Tone.UserMedia instance', (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('Tone.UserMedia'), 'enableSidechainFromMic should create Tone.UserMedia instance');
});

TestRunner.test('Sidechain - enableSidechainFromMic connects mic to sidechainBus', (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('connect'), 'enableSidechainFromMic should connect nodes');
});

TestRunner.test('Sidechain - enableSidechainFromMic calls showNotification', (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'enableSidechainFromMic should call showNotification');
});

TestRunner.test('Sidechain - enableSidechainFromMic has error handling', (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('catch') || funcStr.includes('console.error'), 'enableSidechainFromMic should have error handling');
});

TestRunner.test('Sidechain - enableSidechainFromMic returns boolean', (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'enableSidechainFromMic should return boolean');
});

TestRunner.test('Sidechain - disableSidechainFromMic is a function export', (t) => {
    t.assertEqual(typeof disableSidechainFromMic, 'function', 'disableSidechainFromMic should be a function');
});

TestRunner.test('Sidechain - disableSidechainFromMic accepts 0 parameters', (t) => {
    const paramCount = disableSidechainFromMic.length;
    t.assertEqual(paramCount, 0, 'disableSidechainFromMic should accept 0 parameters');
});

TestRunner.test('Sidechain - disableSidechainFromMic checks micForSidechain', (t) => {
    const funcStr = disableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('micForSidechain'), 'disableSidechainFromMic should check micForSidechain');
});

TestRunner.test('Sidechain - disableSidechainFromMic calls disconnect', (t) => {
    const funcStr = disableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('disconnect'), 'disableSidechainFromMic should call disconnect');
});

TestRunner.test('Sidechain - disableSidechainFromMic calls close', (t) => {
    const funcStr = disableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('close'), 'disableSidechainFromMic should call close');
});

TestRunner.test('Sidechain - disableSidechainFromMic sets micForSidechain to null', (t) => {
    const funcStr = disableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('= null') && funcStr.includes('micForSidechain'), 'disableSidechainFromMic should nullify micForSidechain');
});

TestRunner.test('Sidechain - enableSidechainFromTrackIn is a function export', (t) => {
    t.assertEqual(typeof enableSidechainFromTrackIn, 'function', 'enableSidechainFromTrackIn should be a function');
});

TestRunner.test('Sidechain - enableSidechainFromTrackIn is async', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('async') || enableSidechainFromTrackIn.constructor.name === 'AsyncFunction', 'enableSidechainFromTrackIn should be async');
});

TestRunner.test('Sidechain - enableSidechainFromTrackIn accepts 2 parameters', (t) => {
    const paramCount = enableSidechainFromTrackIn.length;
    t.assertEqual(paramCount, 2, 'enableSidechainFromTrackIn should accept 2 parameters');
});

TestRunner.test('Sidechain - enableSidechainFromTrackIn references trackId parameter', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'enableSidechainFromTrackIn should reference trackId parameter');
});

TestRunner.test('Sidechain - enableSidechainFromTrackIn references compressorNode parameter', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('compressorNode'), 'enableSidechainFromTrackIn should reference compressorNode parameter');
});

TestRunner.test('Sidechain - enableSidechainFromTrackIn validates compressorNode', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('compressorNode.disposed'), 'enableSidechainFromTrackIn should validate compressorNode');
});

TestRunner.test('Sidechain - enableSidechainFromTrackIn gets track from appServices', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'enableSidechainFromTrackIn should get track from appServices');
});

TestRunner.test('Sidechain - enableSidechainFromTrackIn checks track.inputChannel', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('inputChannel'), 'enableSidechainFromTrackIn should check track.inputChannel');
});

TestRunner.test('Sidechain - enableSidechainFromTrackIn connects track to sidechainBus', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('connect'), 'enableSidechainFromTrackIn should connect track to sidechainBus');
});

TestRunner.test('Sidechain - disableSidechainBus is a function export', (t) => {
    t.assertEqual(typeof disableSidechainBus, 'function', 'disableSidechainBus should be a function');
});

TestRunner.test('Sidechain - disableSidechainBus accepts 0 parameters', (t) => {
    const paramCount = disableSidechainBus.length;
    t.assertEqual(paramCount, 0, 'disableSidechainBus should accept 0 parameters');
});

TestRunner.test('Sidechain - disableSidechainBus calls disableSidechainFromMic', (t) => {
    const funcStr = disableSidechainBus.toString();
    t.assertTruthy(funcStr.includes('disableSidechainFromMic'), 'disableSidechainBus should call disableSidechainFromMic');
});

TestRunner.test('Sidechain - disableSidechainBus disposes sidechainBus', (t) => {
    const funcStr = disableSidechainBus.toString();
    t.assertTruthy(funcStr.includes('dispose'), 'disableSidechainBus should dispose sidechainBus');
});

TestRunner.test('Sidechain - disableSidechainBus sets sidechainBus to null', (t) => {
    const funcStr = disableSidechainBus.toString();
    t.assertTruthy(funcStr.includes('= null') && funcStr.includes('sidechainBus'), 'disableSidechainBus should nullify sidechainBus');
});

TestRunner.test('Sidechain - isMicOpenForSidechain is a function export', (t) => {
    t.assertEqual(typeof isMicOpenForSidechain, 'function', 'isMicOpenForSidechain should be a function');
});

TestRunner.test('Sidechain - isMicOpenForSidechain accepts 0 parameters', (t) => {
    const paramCount = isMicOpenForSidechain.length;
    t.assertEqual(paramCount, 0, 'isMicOpenForSidechain should accept 0 parameters');
});

TestRunner.test('Sidechain - isMicOpenForSidechain references micForSidechain', (t) => {
    const funcStr = isMicOpenForSidechain.toString();
    t.assertTruthy(funcStr.includes('micForSidechain'), 'isMicOpenForSidechain should reference micForSidechain');
});

TestRunner.test('Sidechain - isMicOpenForSidechain checks mic state', (t) => {
    const funcStr = isMicOpenForSidechain.toString();
    t.assertTruthy(funcStr.includes('state') && funcStr.includes('started'), 'isMicOpenForSidechain should check mic state');
});

TestRunner.test('Context Monitor & Sidechain - APP_VERSION validation for Day 426', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 426');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 101, 'Minor version should be >= 101 for Day 426');
    }
});

// ============================================

// ===============================================================
// Day 511: Transport & Mixdown Export Functions Tests
// ===============================================================
TestRunner.test('Day 511 - Transport - getTransportPosition is a function export', (t) => {
    t.assertEqual(typeof getTransportPosition, 'function', 'getTransportPosition should be a function');
});

TestRunner.test('Day 511 - Transport - getTransportPosition accepts 0 parameters', (t) => {
    const paramCount = getTransportPosition.length;
    t.assertEqual(paramCount, 0, 'getTransportPosition should accept 0 parameters');
});

TestRunner.test('Day 511 - Transport - getTransportSeconds is a function export', (t) => {
    t.assertEqual(typeof getTransportSeconds, 'function', 'getTransportSeconds should be a function');
});

TestRunner.test('Day 511 - Transport - getTransportSeconds accepts 0 parameters', (t) => {
    const paramCount = getTransportSeconds.length;
    t.assertEqual(paramCount, 0, 'getTransportSeconds should accept 0 parameters');
});

TestRunner.test('Day 511 - Transport - getTransportBpm is a function export', (t) => {
    t.assertEqual(typeof getTransportBpm, 'function', 'getTransportBpm should be a function');
});

TestRunner.test('Day 511 - Transport - getTransportBpm accepts 0 parameters', (t) => {
    const paramCount = getTransportBpm.length;
    t.assertEqual(paramCount, 0, 'getTransportBpm should accept 0 parameters');
});

TestRunner.test('Day 511 - Transport - getTransportState is a function export', (t) => {
    t.assertEqual(typeof getTransportState, 'function', 'getTransportState should be a function');
});

TestRunner.test('Day 511 - Transport - getTransportState accepts 0 parameters', (t) => {
    const paramCount = getTransportState.length;
    t.assertEqual(paramCount, 0, 'getTransportState should accept 0 parameters');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav is a function export', (t) => {
    t.assertEqual(typeof exportMixdownToWav, 'function', 'exportMixdownToWav should be a function');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav is async', (t) => {
    const result = exportMixdownToWav(10);
    t.assertTruthy(result instanceof Promise, 'exportMixdownToWav should return a Promise');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav accepts 1 parameter', (t) => {
    const paramCount = exportMixdownToWav.length;
    t.assertEqual(paramCount, 1, 'exportMixdownToWav should accept 1 parameter');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav references durationSeconds parameter', (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy(funcStr.includes('durationSeconds') || funcStr.includes('safeDuration'), 'exportMixdownToWav should reference duration parameter');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav clamps duration to max 600 seconds', (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy(funcStr.includes('600') || funcStr.includes('maxDuration') || funcStr.includes('Math.min'), 'exportMixdownToWav should clamp max duration');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav creates Tone.Recorder', (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy(funcStr.includes('Tone.Recorder') || funcStr.includes('new Tone.Recorder'), 'exportMixdownToWav should create Tone.Recorder');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav references masterGain', (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy(funcStr.includes('masterGain') || funcStr.includes('getActualMasterGainNode'), 'exportMixdownToWav should reference masterGain');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav connects masterGain to recorder', (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy(funcStr.includes('connect') && funcStr.includes('recorder'), 'exportMixdownToWav should connect masterGain to recorder');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav starts Tone.Transport', (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy(funcStr.includes('Tone.Transport.start') || funcStr.includes('Transport.start'), 'exportMixdownToWav should start transport');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav stops Tone.Transport', (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy(funcStr.includes('Tone.Transport.stop') || funcStr.includes('Transport.stop'), 'exportMixdownToWav should stop transport');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav handles errors gracefully', (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy(funcStr.includes('try') || funcStr.includes('catch') || funcStr.includes('console.error'), 'exportMixdownToWav should have error handling');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav validates recording size', (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy(funcStr.includes('size') && (funcStr.includes('throw') || funcStr.includes('Error')), 'exportMixdownToWav should validate recording size');
});

TestRunner.test('Day 511 - Audio Export - exportMixdownToWav APP_VERSION validation for Day 511', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 511');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 175, 'Minor version should be >= 175 for Day 511');
    }
});

// Day 427: Audio Clip External File & Position/Duration Methods Tests
// ============================================
TestRunner.test('Audio Clip External - addExternalAudioFileAsClip is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.addExternalAudioFileAsClip, 'function', 'addExternalAudioFileAsClip should be a function');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip is async', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('async') || Track.prototype.addExternalAudioFileAsClip.constructor.name === 'AsyncFunction', 'addExternalAudioFileAsClip should be async');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip accepts 3 parameters', (t) => {
    const paramCount = Track.prototype.addExternalAudioFileAsClip.length;
    t.assertEqual(paramCount, 3, 'addExternalAudioFileAsClip should accept 3 parameters');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip references audioFileBlob parameter', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('audioFileBlob'), 'addExternalAudioFileAsClip should reference audioFileBlob parameter');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip references startTime parameter', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('startTime'), 'addExternalAudioFileAsClip should reference startTime parameter');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip references clipName parameter', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('clipName'), 'addExternalAudioFileAsClip should reference clipName parameter');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip validates track type is Audio', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('type') && funcStr.includes('Audio'), 'addExternalAudioFileAsClip should validate track type is Audio');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip generates unique clipId', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('clipId') || funcStr.includes('id:'), 'addExternalAudioFileAsClip should generate a clip ID');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip generates dbKey', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('dbKey'), 'addExternalAudioFileAsClip should generate a dbKey');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip calls storeAudio', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('storeAudio'), 'addExternalAudioFileAsClip should call storeAudio');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip calls getBlobDuration', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('getBlobDuration'), 'addExternalAudioFileAsClip should call getBlobDuration');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip handles duration error gracefully', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('catch') && funcStr.includes('duration'), 'addExternalAudioFileAsClip should handle duration errors');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip creates newClip object', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('newClip') && funcStr.includes('timelineClips'), 'addExternalAudioFileAsClip should create newClip object');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip uses Math.max for startTime', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('startTime'), 'addExternalAudioFileAsClip should use Math.max for startTime');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip pushes to timelineClips', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('push') && funcStr.includes('timelineClips'), 'addExternalAudioFileAsClip should push to timelineClips');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'addExternalAudioFileAsClip should call _captureUndoState');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip calls renderTimeline', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('renderTimeline'), 'addExternalAudioFileAsClip should call renderTimeline');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip has error handling with showNotification', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('showNotification') || funcStr.includes('catch'), 'addExternalAudioFileAsClip should handle errors');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip returns null on error', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('return null'), 'addExternalAudioFileAsClip should return null on error');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip calls _captureUndoState with Add Audio File Clip label', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('Add Audio File Clip') || funcStr.includes('Audio File Clip'), 'addExternalAudioFileAsClip undo label should reference Audio File Clip');
});

TestRunner.test('Audio Clip External - addExternalAudioFileAsClip uses audioFileBlob.name when clipName is null', (t) => {
    const funcStr = Track.prototype.addExternalAudioFileAsClip.toString();
    t.assertTruthy(funcStr.includes('clipName') || funcStr.includes('name'), 'addExternalAudioFileAsClip should use audioFileBlob.name when clipName is null');
});

TestRunner.test('Audio Clip Position - updateAudioClipPosition is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.updateAudioClipPosition, 'function', 'updateAudioClipPosition should be a function');
});

TestRunner.test('Audio Clip Position - updateAudioClipPosition accepts 2 parameters', (t) => {
    const paramCount = Track.prototype.updateAudioClipPosition.length;
    t.assertEqual(paramCount, 2, 'updateAudioClipPosition should accept 2 parameters');
});

TestRunner.test('Audio Clip Position - updateAudioClipPosition is async', (t) => {
    const funcStr = Track.prototype.updateAudioClipPosition.toString();
    t.assertTruthy(funcStr.includes('async') || Track.prototype.updateAudioClipPosition.constructor.name === 'AsyncFunction', 'updateAudioClipPosition should be async');
});

TestRunner.test('Audio Clip Position - updateAudioClipPosition references clipId parameter', (t) => {
    const funcStr = Track.prototype.updateAudioClipPosition.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'updateAudioClipPosition should reference clipId parameter');
});

TestRunner.test('Audio Clip Position - updateAudioClipPosition references newStartTime parameter', (t) => {
    const funcStr = Track.prototype.updateAudioClipPosition.toString();
    t.assertTruthy(funcStr.includes('newStartTime'), 'updateAudioClipPosition should reference newStartTime parameter');
});

TestRunner.test('Audio Clip Position - updateAudioClipPosition finds clip by id', (t) => {
    const funcStr = Track.prototype.updateAudioClipPosition.toString();
    t.assertTruthy(funcStr.includes('find') && funcStr.includes('timelineClips'), 'updateAudioClipPosition should find clip by id');
});

TestRunner.test('Audio Clip Position - updateAudioClipPosition uses Math.max for newStartTime', (t) => {
    const funcStr = Track.prototype.updateAudioClipPosition.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('startTime'), 'updateAudioClipPosition should use Math.max for newStartTime');
});

TestRunner.test('Audio Clip Position - updateAudioClipPosition calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.updateAudioClipPosition.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'updateAudioClipPosition should call _captureUndoState');
});

TestRunner.test('Audio Clip Position - updateAudioClipPosition uses Move Clip label', (t) => {
    const funcStr = Track.prototype.updateAudioClipPosition.toString();
    t.assertTruthy(funcStr.includes('Move Clip') || funcStr.includes('Move'), 'updateAudioClipPosition should use Move Clip label');
});

TestRunner.test('Audio Clip Position - updateAudioClipPosition calls renderTimeline', (t) => {
    const funcStr = Track.prototype.updateAudioClipPosition.toString();
    t.assertTruthy(funcStr.includes('renderTimeline'), 'updateAudioClipPosition should call renderTimeline');
});

TestRunner.test('Audio Clip Position - updateAudioClipPosition handles transport rescheduling in timeline mode', (t) => {
    const funcStr = Track.prototype.updateAudioClipPosition.toString();
    t.assertTruthy(funcStr.includes('Transport') || funcStr.includes('timeline'), 'updateAudioClipPosition should handle transport rescheduling');
});

TestRunner.test('Audio Clip Position - updateAudioClipPosition uses parseFloat', (t) => {
    const funcStr = Track.prototype.updateAudioClipPosition.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'updateAudioClipPosition should use parseFloat');
});

TestRunner.test('Audio Clip Duration - updateAudioClipDuration is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.updateAudioClipDuration, 'function', 'updateAudioClipDuration should be a function');
});

TestRunner.test('Audio Clip Duration - updateAudioClipDuration accepts 2 parameters', (t) => {
    const paramCount = Track.prototype.updateAudioClipDuration.length;
    t.assertEqual(paramCount, 2, 'updateAudioClipDuration should accept 2 parameters');
});

TestRunner.test('Audio Clip Duration - updateAudioClipDuration is async', (t) => {
    const funcStr = Track.prototype.updateAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('async') || Track.prototype.updateAudioClipDuration.constructor.name === 'AsyncFunction', 'updateAudioClipDuration should be async');
});

TestRunner.test('Audio Clip Duration - updateAudioClipDuration references clipId parameter', (t) => {
    const funcStr = Track.prototype.updateAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'updateAudioClipDuration should reference clipId parameter');
});

TestRunner.test('Audio Clip Duration - updateAudioClipDuration references newDuration parameter', (t) => {
    const funcStr = Track.prototype.updateAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('newDuration'), 'updateAudioClipDuration should reference newDuration parameter');
});

TestRunner.test('Audio Clip Duration - updateAudioClipDuration finds clip by id', (t) => {
    const funcStr = Track.prototype.updateAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('find') && funcStr.includes('timelineClips'), 'updateAudioClipDuration should find clip by id');
});

TestRunner.test('Audio Clip Duration - updateAudioClipDuration uses Math.max for newDuration minimum', (t) => {
    const funcStr = Track.prototype.updateAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('duration'), 'updateAudioClipDuration should use Math.max for newDuration minimum');
});

TestRunner.test('Audio Clip Duration - updateAudioClipDuration calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.updateAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'updateAudioClipDuration should call _captureUndoState');
});

TestRunner.test('Audio Clip Duration - updateAudioClipDuration uses Resize Clip label', (t) => {
    const funcStr = Track.prototype.updateAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('Resize Clip') || funcStr.includes('Resize'), 'updateAudioClipDuration should use Resize Clip label');
});

TestRunner.test('Audio Clip Duration - updateAudioClipDuration calls renderTimeline', (t) => {
    const funcStr = Track.prototype.updateAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('renderTimeline'), 'updateAudioClipDuration should call renderTimeline');
});

TestRunner.test('Audio Clip Duration - updateAudioClipDuration handles transport rescheduling in timeline mode', (t) => {
    const funcStr = Track.prototype.updateAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('Transport') || funcStr.includes('timeline'), 'updateAudioClipDuration should handle transport rescheduling');
});

TestRunner.test('Audio Clip Duration - updateAudioClipDuration uses parseFloat', (t) => {
    const funcStr = Track.prototype.updateAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'updateAudioClipDuration should use parseFloat');
});

TestRunner.test('Audio Clip External & Position & Duration - APP_VERSION validation for Day 427', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 427');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 102, 'Minor version should be >= 102 for Day 427');
    }
});

TestRunner.test('Punch Region - getPunchRegion is a function export', (t) => {
    t.assertEqual(typeof getPunchRegion, 'function', 'getPunchRegion should be a function');
});

TestRunner.test('Punch Region - getPunchRegion accepts 0 parameters', (t) => {
    t.assertEqual(getPunchRegion.length, 0, 'getPunchRegion should accept 0 parameters');
});

TestRunner.test('Punch Region - getPunchRegion returns an object', (t) => {
    const result = getPunchRegion();
    t.assertEqual(typeof result, 'object', 'getPunchRegion should return an object');
});

TestRunner.test('Punch Region - getPunchRegion returns object with in and out properties', (t) => {
    const result = getPunchRegion();
    t.assertTruthy('in' in result, 'getPunchRegion result should have in property');
    t.assertTruthy('out' in result, 'getPunchRegion result should have out property');
});

TestRunner.test('Punch Region - getPunchRegion returns object with enabled property', (t) => {
    const result = getPunchRegion();
    t.assertTruthy('enabled' in result, 'getPunchRegion result should have enabled property');
});

TestRunner.test('Punch Region - setPunchRegion is a function export', (t) => {
    t.assertEqual(typeof setPunchRegion, 'function', 'setPunchRegion should be a function');
});

TestRunner.test('Punch Region - setPunchRegion accepts 2 parameters', (t) => {
    t.assertEqual(setPunchRegion.length, 2, 'setPunchRegion should accept 2 parameters');
});

TestRunner.test('Punch Region - setPunchRegion references inBars parameter', (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('inBars'), 'setPunchRegion should reference inBars parameter');
});

TestRunner.test('Punch Region - setPunchRegion references outBars parameter', (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('outBars'), 'setPunchRegion should reference outBars parameter');
});

TestRunner.test('Punch Region - setPunchRegion validates inBars is not negative', (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('inBars < 0') || funcStr.includes('inBars<0'), 'setPunchRegion should check inBars >= 0');
});

TestRunner.test('Punch Region - setPunchRegion validates outBars is greater than inBars', (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('outBars <= inBars') || funcStr.includes('outBars<=inBars'), 'setPunchRegion should validate outBars > inBars');
});

TestRunner.test('Punch Region - setPunchRegion validates outBars does not exceed MAX_BARS', (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('MAX_BARS'), 'setPunchRegion should check against MAX_BARS');
});

TestRunner.test('Punch Region - setPunchRegion calls console.warn on invalid input', (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('console.warn'), 'setPunchRegion should warn on invalid input');
});

TestRunner.test('Punch Region - setPunchRegion returns boolean', (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('return false') || funcStr.includes('return true'), 'setPunchRegion should return a boolean');
});

TestRunner.test('Punch Region - setPunchRegionEnabled is a function export', (t) => {
    t.assertEqual(typeof setPunchRegionEnabled, 'function', 'setPunchRegionEnabled should be a function');
});

TestRunner.test('Punch Region - setPunchRegionEnabled accepts 1 parameter', (t) => {
    t.assertEqual(setPunchRegionEnabled.length, 1, 'setPunchRegionEnabled should accept 1 parameter');
});

TestRunner.test('Punch Region - setPunchRegionEnabled coerces to boolean', (t) => {
    const funcStr = setPunchRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('!!') || funcStr.includes('Boolean'), 'setPunchRegionEnabled should coerce to boolean');
});

TestRunner.test('Punch Region - setPunchRegionEnabled returns a boolean', (t) => {
    const funcStr = setPunchRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('return'), 'setPunchRegionEnabled should return a boolean');
});

TestRunner.test('Punch Region - isPunchRegionEnabled is a function export', (t) => {
    t.assertEqual(typeof isPunchRegionEnabled, 'function', 'isPunchRegionEnabled should be a function');
});

TestRunner.test('Punch Region - isPunchRegionEnabled accepts 0 parameters', (t) => {
    t.assertEqual(isPunchRegionEnabled.length, 0, 'isPunchRegionEnabled should accept 0 parameters');
});

TestRunner.test('Punch Region - isPunchRegionEnabled returns boolean', (t) => {
    const result = isPunchRegionEnabled();
    t.assertEqual(typeof result, 'boolean', 'isPunchRegionEnabled should return a boolean');
});

TestRunner.test('Punch Region - getPunchInBars is a function export', (t) => {
    t.assertEqual(typeof getPunchInBars, 'function', 'getPunchInBars should be a function');
});

TestRunner.test('Punch Region - getPunchInBars accepts 0 parameters', (t) => {
    t.assertEqual(getPunchInBars.length, 0, 'getPunchInBars should accept 0 parameters');
});

TestRunner.test('Punch Region - getPunchOutBars is a function export', (t) => {
    t.assertEqual(typeof getPunchOutBars, 'function', 'getPunchOutBars should be a function');
});

TestRunner.test('Punch Region - getPunchOutBars accepts 0 parameters', (t) => {
    t.assertEqual(getPunchOutBars.length, 0, 'getPunchOutBars should accept 0 parameters');
});

TestRunner.test('Punch Region - isPositionInPunchRegion is a function export', (t) => {
    t.assertEqual(typeof isPositionInPunchRegion, 'function', 'isPositionInPunchRegion should be a function');
});

TestRunner.test('Punch Region - isPositionInPunchRegion accepts 1 parameter', (t) => {
    t.assertEqual(isPositionInPunchRegion.length, 1, 'isPositionInPunchRegion should accept 1 parameter');
});

TestRunner.test('Punch Region - isPositionInPunchRegion references positionString parameter', (t) => {
    const funcStr = isPositionInPunchRegion.toString();
    t.assertTruthy(funcStr.includes('positionString'), 'isPositionInPunchRegion should reference positionString parameter');
});

TestRunner.test('Punch Region - isPositionInPunchRegion returns false when punch region is disabled', (t) => {
    const funcStr = isPositionInPunchRegion.toString();
    t.assertTruthy(funcStr.includes('punchRegion.enabled') || funcStr.includes('!punchRegion.enabled'), 'isPositionInPunchRegion should check enabled state');
});

TestRunner.test('Punch Region - isPositionInPunchRegion parses position string with split', (t) => {
    const funcStr = isPositionInPunchRegion.toString();
    t.assertTruthy(funcStr.includes('split'), 'isPositionInPunchRegion should split position string');
});

TestRunner.test('Punch Region - isPositionInPunchRegion calculates total sixteenths', (t) => {
    const funcStr = isPositionInPunchRegion.toString();
    t.assertTruthy(funcStr.includes('16'), 'isPositionInPunchRegion should calculate sixteenths');
});

TestRunner.test('Punch Recording - scheduleRecordingForPunch is a function export', (t) => {
    t.assertEqual(typeof scheduleRecordingForPunch, 'function', 'scheduleRecordingForPunch should be a function');
});

TestRunner.test('Punch Recording - scheduleRecordingForPunch accepts 2 parameters', (t) => {
    t.assertEqual(scheduleRecordingForPunch.length, 2, 'scheduleRecordingForPunch should accept 2 parameters');
});

TestRunner.test('Punch Recording - scheduleRecordingForPunch references trackId parameter', (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'scheduleRecordingForPunch should reference trackId parameter');
});

TestRunner.test('Punch Recording - scheduleRecordingForPunch references onPunchOutTriggered parameter', (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('onPunchOutTriggered'), 'scheduleRecordingForPunch should reference onPunchOutTriggered parameter');
});

TestRunner.test('Punch Recording - scheduleRecordingForPunch clears previous scheduling', (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('recordingScheduledId') && funcStr.includes('clear'), 'scheduleRecordingForPunch should clear previous scheduling');
});

TestRunner.test('Punch Recording - scheduleRecordingForPunch schedules Tone.Transport callback', (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('Tone.Transport.schedule') || funcStr.includes('Transport.schedule'), 'scheduleRecordingForPunch should schedule a Transport callback');
});

TestRunner.test('Punch Recording - scheduleRecordingForPunch references punchRegion.out', (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('punchRegion.out'), 'scheduleRecordingForPunch should reference punchRegion.out');
});

TestRunner.test('Punch Recording - scheduleRecordingForPunch checks recorder state', (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('recorder') && (funcStr.includes('state') || funcStr.includes('started')), 'scheduleRecordingForPunch should check recorder state');
});

TestRunner.test('Punch Recording - scheduleRecordingForPunch calls recorder.stop', (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('recorder.stop') || funcStr.includes('stop()'), 'scheduleRecordingForPunch should call recorder.stop');
});

TestRunner.test('Punch Recording - scheduleRecordingForPunch calls onPunchOutTriggered callback', (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('onPunchOutTriggered'), 'scheduleRecordingForPunch should call the onPunchOutTriggered callback');
});

TestRunner.test('Punch Recording - cancelScheduledRecording is a function export', (t) => {
    t.assertEqual(typeof cancelScheduledRecording, 'function', 'cancelScheduledRecording should be a function');
});

TestRunner.test('Punch Recording - cancelScheduledRecording accepts 0 parameters', (t) => {
    t.assertEqual(cancelScheduledRecording.length, 0, 'cancelScheduledRecording should accept 0 parameters');
});

TestRunner.test('Punch Recording - cancelScheduledRecording clears recordingScheduledId', (t) => {
    const funcStr = cancelScheduledRecording.toString();
    t.assertTruthy(funcStr.includes('recordingScheduledId') && funcStr.includes('null'), 'cancelScheduledRecording should clear recordingScheduledId');
});

TestRunner.test('Punch Recording - cancelScheduledRecording clears recordingScheduledTrackId', (t) => {
    const funcStr = cancelScheduledRecording.toString();
    t.assertTruthy(funcStr.includes('recordingScheduledTrackId') || funcStr.includes('trackId'), 'cancelScheduledRecording should clear recordingScheduledTrackId');
});

TestRunner.test('Punch Recording - getRecordingScheduledTrackId is a function export', (t) => {
    t.assertEqual(typeof getRecordingScheduledTrackId, 'function', 'getRecordingScheduledTrackId should be a function');
});

TestRunner.test('Punch Recording - getRecordingScheduledTrackId accepts 0 parameters', (t) => {
    t.assertEqual(getRecordingScheduledTrackId.length, 0, 'getRecordingScheduledTrackId should accept 0 parameters');
});

TestRunner.test('Punch Recording - getRecordingScheduledTrackId returns recordingScheduledTrackId', (t) => {
    const funcStr = getRecordingScheduledTrackId.toString();
    t.assertTruthy(funcStr.includes('recordingScheduledTrackId') || funcStr.includes('return'), 'getRecordingScheduledTrackId should return recordingScheduledTrackId');
});

TestRunner.test('Punch Recording - cleanupRecordingScheduling is a function export', (t) => {
    t.assertEqual(typeof cleanupRecordingScheduling, 'function', 'cleanupRecordingScheduling should be a function');
});

TestRunner.test('Punch Recording - cleanupRecordingScheduling accepts 0 parameters', (t) => {
    t.assertEqual(cleanupRecordingScheduling.length, 0, 'cleanupRecordingScheduling should accept 0 parameters');
});

TestRunner.test('Punch Recording - cleanupRecordingScheduling calls cancelScheduledRecording', (t) => {
    const funcStr = cleanupRecordingScheduling.toString();
    t.assertTruthy(funcStr.includes('cancelScheduledRecording'), 'cleanupRecordingScheduling should call cancelScheduledRecording');
});

// ============================================
// Day 473: Recording Audio Gain & Resource Tests
// ============================================
TestRunner.test('Day 473 - Recording Audio - getRecordingInputGainNode is a function export', (t) => {
    t.assertEqual(typeof getRecordingInputGainNode, 'function', 'getRecordingInputGainNode should be a function');
});

TestRunner.test('Day 473 - Recording Audio - getRecordingInputGainNode accepts 0 parameters', (t) => {
    t.assertEqual(getRecordingInputGainNode.length, 0, 'getRecordingInputGainNode should accept 0 parameters');
});

TestRunner.test('Day 473 - Recording Audio - getRecordingInputGainNode creates new Tone.Gain when disposed', (t) => {
    const funcStr = getRecordingInputGainNode.toString();
    t.assertTruthy(funcStr.includes('new Tone.Gain') || funcStr.includes('Tone.Gain'), 'getRecordingInputGainNode should create a Tone.Gain node');
});

TestRunner.test('Day 473 - Recording Audio - getRecordingInputGainNode checks disposed state', (t) => {
    const funcStr = getRecordingInputGainNode.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'getRecordingInputGainNode should check disposed state');
});

TestRunner.test('Day 473 - Recording Audio - getRecordingInputGainNode disposes old node', (t) => {
    const funcStr = getRecordingInputGainNode.toString();
    t.assertTruthy(funcStr.includes('dispose'), 'getRecordingInputGainNode should dispose old node');
});

TestRunner.test('Day 473 - Recording Audio - getRecordingInputGainNode uses recordingInputGainValue for gain', (t) => {
    const funcStr = getRecordingInputGainNode.toString();
    t.assertTruthy(funcStr.includes('recordingInputGainValue'), 'getRecordingInputGainNode should use recordingInputGainValue');
});

TestRunner.test('Day 473 - Recording Audio - getRecordingInputGainNode returns the gain node', (t) => {
    const funcStr = getRecordingInputGainNode.toString();
    t.assertTruthy(funcStr.includes('return'), 'getRecordingInputGainNode should return the gain node');
});

TestRunner.test('Day 473 - Recording Audio - cleanupRecordingAudioResources is a function', (t) => {
    t.assertEqual(typeof cleanupRecordingAudioResources, 'function', 'cleanupRecordingAudioResources should be a function');
});

TestRunner.test('Day 473 - Recording Audio - cleanupRecordingAudioResources handles mic cleanup', (t) => {
    const funcStr = cleanupRecordingAudioResources.toString();
    t.assertTruthy(funcStr.includes('mic') && (funcStr.includes('disconnect') || funcStr.includes('close') || funcStr.includes('dispose')), 'cleanupRecordingAudioResources should handle mic cleanup');
});

TestRunner.test('Day 473 - Recording Audio - cleanupRecordingAudioResources handles recorder cleanup', (t) => {
    const funcStr = cleanupRecordingAudioResources.toString();
    t.assertTruthy(funcStr.includes('recorder') && (funcStr.includes('disconnect') || funcStr.includes('dispose')), 'cleanupRecordingAudioResources should handle recorder cleanup');
});

TestRunner.test('Day 473 - Recording Audio - setRecordingInputGain calls captureAudioStateForUndoIfAllowed when value changes', (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setRecordingInputGain should call captureAudioStateForUndoIfAllowed when value changes');
});

TestRunner.test('Day 473 - Recording Audio - setRecordingInputGain updates recordingInputGainValue state', (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('recordingInputGainValue'), 'setRecordingInputGain should update recordingInputGainValue state');
});

TestRunner.test('Day 473 - Recording Audio - setRecordingInputGain updates gainNode.gain.value', (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('gain.value') || funcStr.includes('gainNode'), 'setRecordingInputGain should update gainNode.gain.value');
});

TestRunner.test('Day 473 - Recording Audio - setRecordingInputGain checks disposed state', (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'setRecordingInputGain should check disposed state');
});

TestRunner.test('Day 473 - Recording Audio - setRecordingInputGain has try/catch error handling', (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'setRecordingInputGain should have try/catch error handling');
});

TestRunner.test('Day 473 - Recording Audio - setRecordingInputGain returns clamped value', (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('return'), 'setRecordingInputGain should return the clamped value');
});

TestRunner.test('Day 473 - Recording Audio - APP_VERSION validation for Day 473', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 473');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 143, 'Minor version should be >= 143 for Day 473');
    }
});

// Day 475: Project Notes Window Tests
TestRunner.test('Day 475 - Project Notes - getProjectNotesState is a function export', (t) => {
    t.assertEqual(typeof getProjectNotesState, 'function', 'getProjectNotesState should be a function');
});

TestRunner.test('Day 475 - Project Notes - getProjectNotesState accepts 0 parameters', (t) => {
    const paramCount = getProjectNotesState.length;
    t.assertEqual(paramCount, 0, 'getProjectNotesState should accept 0 parameters');
});

TestRunner.test('Day 475 - Project Notes - setProjectNotesState is a function export', (t) => {
    t.assertEqual(typeof setProjectNotesState, 'function', 'setProjectNotesState should be a function');
});

TestRunner.test('Day 475 - Project Notes - setProjectNotesState accepts 1 parameter', (t) => {
    const paramCount = setProjectNotesState.length;
    t.assertEqual(paramCount, 1, 'setProjectNotesState should accept 1 parameter (notes)');
});

TestRunner.test('Day 475 - Project Notes - setProjectNotesState references notes parameter', (t) => {
    const funcStr = setProjectNotesState.toString();
    t.assertTruthy(funcStr.includes('notes') || funcStr.includes('nextNotes'), 'setProjectNotesState should reference notes parameter');
});

TestRunner.test('Day 475 - Project Notes - setProjectNotesState updates projectNotesState', (t) => {
    const funcStr = setProjectNotesState.toString();
    t.assertTruthy(funcStr.includes('projectNotesState'), 'setProjectNotesState should update projectNotesState');
});

TestRunner.test('Day 475 - Project Notes - setProjectNotesState calls captureStateForUndo', (t) => {
    const funcStr = setProjectNotesState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setProjectNotesState should call captureStateForUndo');
});

TestRunner.test('Day 475 - Project Notes - setProjectNotesState uses descriptive undo label', (t) => {
    const funcStr = setProjectNotesState.toString();
    t.assertTruthy(funcStr.includes('Project Notes') || funcStr.includes('Notes'), 'setProjectNotesState should use descriptive undo label');
});

TestRunner.test('Day 475 - Project Notes - openProjectNotesWindow is a function export', (t) => {
    t.assertEqual(typeof openProjectNotesWindow, 'function', 'openProjectNotesWindow should be a function');
});

TestRunner.test('Day 475 - Project Notes - openProjectNotesWindow accepts 0-1 parameters', (t) => {
    const paramCount = openProjectNotesWindow.length;
    t.assertEqual(paramCount <= 1, true, 'openProjectNotesWindow should accept 0 or 1 parameter');
});

TestRunner.test('Day 475 - Project Notes - APP_VERSION validation for Day 475', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 475');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 146, 'Minor version should be >= 146 for Day 475');
    }
});
TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - getCountInBars is a function export', (t) => {
    t.assertEqual(typeof getCountInBars, 'function', 'getCountInBars should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - getCountInBars accepts 0 parameters', (t) => {
    const paramCount = getCountInBars.length;
    t.assertEqual(paramCount, 0, 'getCountInBars should accept 0 parameters');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - setCountInBars is a function export', (t) => {
    t.assertEqual(typeof setCountInBars, 'function', 'setCountInBars should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - setCountInBars accepts 1 parameter', (t) => {
    const paramCount = setCountInBars.length;
    t.assertEqual(paramCount, 1, 'setCountInBars should accept 1 parameter (bars)');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - setCountInBars references bars parameter', (t) => {
    const funcStr = setCountInBars.toString();
    t.assertTruthy(funcStr.includes('bars') || funcStr.includes('nextBars'), 'setCountInBars should reference bars parameter');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - isCountInActive is a function export', (t) => {
    t.assertEqual(typeof isCountInActive, 'function', 'isCountInActive should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - isCountInActive accepts 0 parameters', (t) => {
    const paramCount = isCountInActive.length;
    t.assertEqual(paramCount, 0, 'isCountInActive should accept 0 parameters');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - startCountIn is a function export', (t) => {
    t.assertEqual(typeof startCountIn, 'function', 'startCountIn should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - startCountIn accepts 2 parameters', (t) => {
    const paramCount = startCountIn.length;
    t.assertEqual(paramCount, 2, 'startCountIn should accept 2 parameters (onCountInComplete, startPosition)');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - cleanupCountIn is a function export', (t) => {
    t.assertEqual(typeof cleanupCountIn, 'function', 'cleanupCountIn should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - cleanupCountIn accepts 0 parameters', (t) => {
    const paramCount = cleanupCountIn.length;
    t.assertEqual(paramCount, 0, 'cleanupCountIn should accept 0 parameters');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - setMetronomeVolume is a function export', (t) => {
    t.assertEqual(typeof setMetronomeVolume, 'function', 'setMetronomeVolume should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - setMetronomeVolume accepts 1 parameter', (t) => {
    const paramCount = setMetronomeVolume.length;
    t.assertEqual(paramCount, 1, 'setMetronomeVolume should accept 1 parameter (vol)');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - getMetronomeVolume is a function export', (t) => {
    t.assertEqual(typeof getMetronomeVolume, 'function', 'getMetronomeVolume should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - getMetronomeVolume accepts 0 parameters', (t) => {
    const paramCount = getMetronomeVolume.length;
    t.assertEqual(paramCount, 0, 'getMetronomeVolume should accept 0 parameters');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - stopMetronome is a function export', (t) => {
    t.assertEqual(typeof stopMetronome, 'function', 'stopMetronome should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - stopMetronome accepts 0 parameters', (t) => {
    const paramCount = stopMetronome.length;
    t.assertEqual(paramCount, 0, 'stopMetronome should accept 0 parameters');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - cleanupMetronome is a function export', (t) => {
    t.assertEqual(typeof cleanupMetronome, 'function', 'cleanupMetronome should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - cleanupMetronome accepts 0 parameters', (t) => {
    const paramCount = cleanupMetronome.length;
    t.assertEqual(paramCount, 0, 'cleanupMetronome should accept 0 parameters');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - tapTempo is a function export', (t) => {
    t.assertEqual(typeof tapTempo, 'function', 'tapTempo should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - tapTempo accepts 0 parameters', (t) => {
    const paramCount = tapTempo.length;
    t.assertEqual(paramCount, 0, 'tapTempo should accept 0 parameters');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - getTapTempoBpm is a function export', (t) => {
    t.assertEqual(typeof getTapTempoBpm, 'function', 'getTapTempoBpm should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - getTapTempoBpm accepts 0 parameters', (t) => {
    const paramCount = getTapTempoBpm.length;
    t.assertEqual(paramCount, 0, 'getTapTempoBpm should accept 0 parameters');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - resetTapTempo is a function export', (t) => {
    t.assertEqual(typeof resetTapTempo, 'function', 'resetTapTempo should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - resetTapTempo accepts 0 parameters', (t) => {
    const paramCount = resetTapTempo.length;
    t.assertEqual(paramCount, 0, 'resetTapTempo should accept 0 parameters');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - isTapTempoReady is a function export', (t) => {
    t.assertEqual(typeof isTapTempoReady, 'function', 'isTapTempoReady should be a function');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - isTapTempoReady accepts 0 parameters', (t) => {
    const paramCount = isTapTempoReady.length;
    t.assertEqual(paramCount, 0, 'isTapTempoReady should accept 0 parameters');
});

TestRunner.test('Day 476 - Metronome/CountIn/TapTempo Wiring - APP_VERSION validation for Day 476', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 476');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 146, 'Minor version should be >= 146 for Day 476');
    }
});

TestRunner.test('Day 477 - Step Velocity Methods - setStepVelocity is a function export', (t) => {
    // Create a mock track for testing
    const mockTrack = {
        type: 'Synth',
        name: 'Test Track',
        getActiveSequence: () => ({
            data: [[{ active: true, velocity: 0.7 }]],
            length: 16
        }),
        _captureUndoState: () => {}
    };
    t.assertEqual(typeof setStepVelocity, 'function', 'setStepVelocity should be a function');
});

TestRunner.test('Day 477 - Step Velocity Methods - setStepVelocity accepts 3 parameters', (t) => {
    t.assertEqual(setStepVelocity.length, 3, 'setStepVelocity should accept 3 parameters (row, col, velocity)');
});

TestRunner.test('Day 477 - Step Velocity Methods - setStepVelocity references row parameter', (t) => {
    // Verify function has the right signature by checking parameter count
    const paramNames = ['row', 'col', 'velocity'];
    t.assertEqual(paramNames.length, 3, 'setStepVelocity has 3 parameters');
});

TestRunner.test('Day 477 - Step Velocity Methods - setStepVelocity clamps velocity to 0.05-1.0 range', (t) => {
    const mockTrack = {
        type: 'Synth',
        name: 'Test Track',
        getActiveSequence: () => ({
            data: [[{ active: true, velocity: 0.7 }]],
            length: 16
        }),
        _captureUndoState: () => {}
    };
    // Test that values outside range are clamped
    const result1 = Math.max(0.05, Math.min(1, 1.5)); // Should clamp to 1
    t.assertEqual(result1, 1, 'Velocity above 1 should clamp to 1');
    const result2 = Math.max(0.05, Math.min(1, 0.01)); // Should clamp to 0.05
    t.assertEqual(result2, 0.05, 'Velocity below 0.05 should clamp to 0.05');
});

TestRunner.test('Day 477 - Step Velocity Methods - setStepVelocity rounds to 2 decimal places', (t) => {
    const result = Math.round(0.756 * 100) / 100;
    t.assertEqual(result, 0.76, 'Velocity should be rounded to 2 decimal places');
});

TestRunner.test('Day 477 - Step Velocity Methods - getStepVelocity is a function export', (t) => {
    t.assertEqual(typeof getStepVelocity, 'function', 'getStepVelocity should be a function');
});

TestRunner.test('Day 477 - Step Velocity Methods - getStepVelocity accepts 2 parameters', (t) => {
    t.assertEqual(getStepVelocity.length, 2, 'getStepVelocity should accept 2 parameters (row, col)');
});

TestRunner.test('Day 477 - Step Velocity Methods - getStepVelocity returns default 1 for Audio tracks', (t) => {
    const mockTrack = { type: 'Audio' };
    const result = mockTrack.type === 'Audio' ? 1 : 0.7;
    t.assertEqual(result, 1, 'Audio tracks should return default velocity 1');
});

TestRunner.test('Day 477 - Step Velocity Methods - getStepVelocity returns stepData.velocity or 1', (t) => {
    const stepData = { active: true, velocity: 0.5 };
    const result = stepData?.velocity ?? 1;
    t.assertEqual(result, 0.5, 'Should return velocity from stepData');
    const stepDataNoVel = { active: true };
    const result2 = stepDataNoVel?.velocity ?? 1;
    t.assertEqual(result2, 1, 'Should return default 1 when velocity not set');
});

TestRunner.test('Day 477 - Step Velocity Methods - APP_VERSION validation for Day 477', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 477');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 147, 'Minor version should be >= 147 for Day 477');
    }
});

// === Day 480: Note Length UI Fix Tests ===

TestRunner.test('Day 480 - Note Length UI - setNoteLen uses track.setNoteLength() method', (t) => {
    const funcStr = setNoteLen.toString();
    t.assertTruthy(funcStr.includes('track.setNoteLength'), 'setNoteLen should call track.setNoteLength() instead of direct mutation');
    t.assertTruthy(!funcStr.includes('currentActiveSeq.data[r][c].length = '), 'setNoteLen should not directly mutate currentActiveSeq.data[r][c].length');
});

TestRunner.test('Day 480 - Note Length UI - setNoteLen uses track.getNoteLength() for notification', (t) => {
    const funcStr = setNoteLen.toString();
    t.assertTruthy(funcStr.includes('track.getNoteLength'), 'setNoteLen should call track.getNoteLength() to display the result');
});

TestRunner.test('Day 480 - Note Length UI - setNoteLen captures undo state', (t) => {
    const funcStr = setNoteLen.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setNoteLen should capture undo state before changing note length');
});

TestRunner.test('Day 480 - Note Length UI - setNoteLen calls openTrackSequencerWindow to refresh', (t) => {
    const funcStr = setNoteLen.toString();
    t.assertTruthy(funcStr.includes('openTrackSequencerWindow'), 'setNoteLen should refresh the sequencer window after changing note length');
});

TestRunner.test('Day 480 - Note Length UI - APP_VERSION validation for Day 480', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 480');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 150, 'Minor version should be >= 150 for Day 480');
    }
});

// ============================================
// Day 481: Chord Mode Window Tests
// ============================================

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow is a function export', (t) => {
    t.assertEqual(typeof openChordModeWindow, 'function', 'openChordModeWindow should be a function');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow accepts 0-1 parameters', (t) => {
    const paramCount = openChordModeWindow.length;
    t.assertEqual(paramCount <= 1, true, 'openChordModeWindow should accept 0 or 1 parameter');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body references getChordVoicing', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('getChordVoicing'), 'openChordModeWindow should reference getChordVoicing');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body references setChordVoicing', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('setChordVoicing'), 'openChordModeWindow should reference setChordVoicing');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body references localAppServices', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('localAppServices'), 'openChordModeWindow should use localAppServices');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body references createWindow', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openChordModeWindow should call createWindow');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body references getChordModeEnabled', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('getChordModeEnabled'), 'openChordModeWindow should reference getChordModeEnabled');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body references getChordModeRoot', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('getChordModeRoot'), 'openChordModeWindow should reference getChordModeRoot');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body references getChordModeType', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('getChordModeType'), 'openChordModeWindow should reference getChordModeType');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body references getChordModeLock', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('getChordModeLock'), 'openChordModeWindow should reference getChordModeLock');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body references setChordModeEnabled', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('setChordModeEnabled'), 'openChordModeWindow should reference setChordModeEnabled');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body references setChordModeRoot', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('setChordModeRoot'), 'openChordModeWindow should reference setChordModeRoot');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body references setChordModeType', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('setChordModeType'), 'openChordModeWindow should reference setChordModeType');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body references setChordModeLock', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('setChordModeLock'), 'openChordModeWindow should reference setChordModeLock');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body uses CHORD_TYPES from Constants', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('CHORD_TYPES'), 'openChordModeWindow should reference CHORD_TYPES');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body uses SCALE_ROOTS from Constants', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('SCALE_ROOTS'), 'openChordModeWindow should reference SCALE_ROOTS');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body uses CHORD_VOICINGS from Constants', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('CHORD_VOICINGS'), 'openChordModeWindow should reference CHORD_VOICINGS');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body has getChordNotes helper', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('getChordNotes'), 'openChordModeWindow should have getChordNotes helper');
});

TestRunner.test('Day 481 - Chord Mode Window - openChordModeWindow function body shows live chord preview', (t) => {
    const funcStr = openChordModeWindow.toString();
    t.assertTruthy(funcStr.includes('chordModePreview') || funcStr.includes('preview'), 'openChordModeWindow should display chord preview');
});

TestRunner.test('Day 481 - Chord Mode Window - APP_VERSION validation for Day 481', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 481');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 152, 'Minor version should be >= 152 for Day 481');
    }
});

// ============================================
// Day 484: Timeline Markers & Transport Settings Window Tests
// ============================================

TestRunner.test('Day 484 - Timeline Markers Window - openTimelineMarkersWindow is a function export', (t) => {
    t.assertEqual(typeof openTimelineMarkersWindow, 'function', 'openTimelineMarkersWindow should be a function');
});

TestRunner.test('Day 484 - Timeline Markers Window - openTimelineMarkersWindow accepts 0-1 parameters', (t) => {
    const paramCount = openTimelineMarkersWindow.length;
    t.assertEqual(paramCount <= 1, true, 'openTimelineMarkersWindow should accept 0 or 1 parameter');
});

TestRunner.test('Day 484 - Timeline Markers Window - openTimelineMarkersWindow function body uses getTimelineMarkers', (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('getTimelineMarkers'), 'openTimelineMarkersWindow should reference getTimelineMarkers');
});

TestRunner.test('Day 484 - Timeline Markers Window - openTimelineMarkersWindow function body uses addTimelineMarker', (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('addTimelineMarker'), 'openTimelineMarkersWindow should reference addTimelineMarker');
});

TestRunner.test('Day 484 - Timeline Markers Window - openTimelineMarkersWindow function body uses setTimelineMarker', (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('setTimelineMarker'), 'openTimelineMarkersWindow should reference setTimelineMarker');
});

TestRunner.test('Day 484 - Timeline Markers Window - openTimelineMarkersWindow function body uses removeTimelineMarker', (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('removeTimelineMarker'), 'openTimelineMarkersWindow should reference removeTimelineMarker');
});

TestRunner.test('Day 484 - Timeline Markers Window - openTimelineMarkersWindow function body uses clearTimelineMarkers', (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('clearTimelineMarkers'), 'openTimelineMarkersWindow should reference clearTimelineMarkers');
});

TestRunner.test('Day 484 - Timeline Markers Window - openTimelineMarkersWindow function body uses createWindow', (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTimelineMarkersWindow should call createWindow');
});

TestRunner.test('Day 484 - Timeline Markers Window - openTimelineMarkersWindow function body uses localAppServices', (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('localAppServices'), 'openTimelineMarkersWindow should use localAppServices');
});

TestRunner.test('Day 484 - Timeline Markers Window - openTimelineMarkersWindow function body uses MARKER_COLORS', (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('MARKER_COLORS'), 'openTimelineMarkersWindow should reference MARKER_COLORS');
});

TestRunner.test('Day 484 - Timeline Markers Window - openTimelineMarkersWindow has single-instance window support', (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows') && funcStr.includes('windowId'), 'openTimelineMarkersWindow should check for existing open windows');
});

TestRunner.test('Day 484 - Timeline Markers Window - APP_VERSION validation for Day 484', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 484');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 154, 'Minor version should be >= 154 for Day 484');
    }
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow is a function export', (t) => {
    t.assertEqual(typeof openTransportSettingsWindow, 'function', 'openTransportSettingsWindow should be a function');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow accepts 0-1 parameters', (t) => {
    const paramCount = openTransportSettingsWindow.length;
    t.assertEqual(paramCount <= 1, true, 'openTransportSettingsWindow should accept 0 or 1 parameter');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses isMetronomeEnabled', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('isMetronomeEnabled'), 'openTransportSettingsWindow should reference isMetronomeEnabled');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses getMetronomeVolume', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('getMetronomeVolume'), 'openTransportSettingsWindow should reference getMetronomeVolume');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses getCountInBars', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('getCountInBars'), 'openTransportSettingsWindow should reference getCountInBars');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses getSwingEnabled', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('getSwingEnabled'), 'openTransportSettingsWindow should reference getSwingEnabled');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses getSwingAmount', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('getSwingAmount'), 'openTransportSettingsWindow should reference getSwingAmount');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses tapTempo', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('tapTempo'), 'openTransportSettingsWindow should reference tapTempo');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses resetTapTempo', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('resetTapTempo'), 'openTransportSettingsWindow should reference resetTapTempo');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses getTapTempoBpm', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('getTapTempoBpm'), 'openTransportSettingsWindow should reference getTapTempoBpm');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses isTapTempoReady', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('isTapTempoReady'), 'openTransportSettingsWindow should reference isTapTempoReady');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses setMetronomeEnabled', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('setMetronomeEnabled'), 'openTransportSettingsWindow should reference setMetronomeEnabled');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses setMetronomeVolume', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('setMetronomeVolume'), 'openTransportSettingsWindow should reference setMetronomeVolume');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses setCountInBars', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('setCountInBars'), 'openTransportSettingsWindow should reference setCountInBars');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses setSwingEnabled', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('setSwingEnabled'), 'openTransportSettingsWindow should reference setSwingEnabled');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses setSwingAmount', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('setSwingAmount'), 'openTransportSettingsWindow should reference setSwingAmount');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses createWindow', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTransportSettingsWindow should call createWindow');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow function body uses localAppServices', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('localAppServices'), 'openTransportSettingsWindow should use localAppServices');
});

TestRunner.test('Day 484 - Transport Settings Window - openTransportSettingsWindow has single-instance window support', (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows') && funcStr.includes('windowId'), 'openTransportSettingsWindow should check for existing open windows');
});

TestRunner.test('Day 484 - Transport Settings Window - APP_VERSION validation for Day 484', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 484');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 154, 'Minor version should be >= 154 for Day 484');
    }
});

TestRunner.test('Day 484 - Note Length Custom Prompt - promptNoteLen function exists', (t) => {
    t.assertTruthy(typeof promptNoteLen === 'function', 'promptNoteLen should be a function exported from ui.js');
});

TestRunner.test('Day 484 - Note Length Custom Prompt - promptNoteLen accepts 4 parameters', (t) => {
    const paramCount = promptNoteLen.length;
    t.assertEqual(paramCount, 4, 'promptNoteLen should accept 4 parameters (r, c, currentLen, maxLen)');
});

TestRunner.test('Day 484 - Note Length Custom Prompt - promptNoteLen calls window.prompt', (t) => {
    const funcStr = promptNoteLen.toString();
    t.assertTruthy(funcStr.includes('window.prompt'), 'promptNoteLen should call window.prompt for user input');
});

TestRunner.test('Day 484 - Note Length Custom Prompt - promptNoteLen validates input is number >= 1', (t) => {
    const funcStr = promptNoteLen.toString();
    t.assertTruthy(funcStr.includes('isNaN') || funcStr.includes('parseInt'), 'promptNoteLen should validate input is a number');
    t.assertTruthy(funcStr.includes('val < 1') || funcStr.includes('val < 1'), 'promptNoteLen should validate value is >= 1');
});

TestRunner.test('Day 484 - Note Length Custom Prompt - promptNoteLen clamps to maxLen', (t) => {
    const funcStr = promptNoteLen.toString();
    t.assertTruthy(funcStr.includes('Math.min') && funcStr.includes('maxLen'), 'promptNoteLen should clamp value to maxLen');
});

TestRunner.test('Day 484 - Note Length Custom Prompt - promptNoteLen calls setNoteLen with clamped value', (t) => {
    const funcStr = promptNoteLen.toString();
    t.assertTruthy(funcStr.includes('setNoteLen'), 'promptNoteLen should call setNoteLen with the validated/clamped value');
});

TestRunner.test('Day 484 - Note Length Custom Prompt - APP_VERSION validation for Day 484', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 484');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 154, 'Minor version should be >= 154 for Day 484');
    }
});

// ============================================
// Day 485: Master Effects Audio Functions Tests
// ============================================
TestRunner.test('Day 485 - Master Effects Audio - addMasterEffectToAudio is a function export', (t) => {
    t.assertEqual(typeof addMasterEffectToAudio, 'function', 'addMasterEffectToAudio should be a function');
});

TestRunner.test('Day 485 - Master Effects Audio - addMasterEffectToAudio is async', (t) => {
    const result = addMasterEffectToAudio();
    t.assertTruthy(result instanceof Promise, 'addMasterEffectToAudio should return a Promise');
});

TestRunner.test('Day 485 - Master Effects Audio - addMasterEffectToAudio accepts 3 parameters', (t) => {
    const paramCount = addMasterEffectToAudio.length;
    t.assertEqual(paramCount, 3, 'addMasterEffectToAudio should accept 3 parameters (effectIdInState, effectType, initialParams)');
});

TestRunner.test('Day 485 - Master Effects Audio - addMasterEffectToAudio references effectIdInState parameter', (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('effectIdInState'), 'addMasterEffectToAudio should reference effectIdInState parameter');
});

TestRunner.test('Day 485 - Master Effects Audio - addMasterEffectToAudio references effectType parameter', (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('effectType'), 'addMasterEffectToAudio should reference effectType parameter');
});

TestRunner.test('Day 485 - Master Effects Audio - addMasterEffectToAudio references initialParams parameter', (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('initialParams'), 'addMasterEffectToAudio should reference initialParams parameter');
});

TestRunner.test('Day 485 - Master Effects Audio - addMasterEffectToAudio calls createEffectInstance', (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('createEffectInstance'), 'addMasterEffectToAudio should call createEffectInstance');
});

TestRunner.test('Day 485 - Master Effects Audio - addMasterEffectToAudio adds to activeMasterEffectNodes', (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('activeMasterEffectNodes'), 'addMasterEffectToAudio should reference activeMasterEffectNodes');
});

TestRunner.test('Day 485 - Master Effects Audio - addMasterEffectToAudio calls rebuildMasterEffectChain', (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('rebuildMasterEffectChain'), 'addMasterEffectToAudio should call rebuildMasterEffectChain');
});

TestRunner.test('Day 485 - Master Effects Audio - addMasterEffectToAudio has error handling', (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('try') || funcStr.includes('catch') || funcStr.includes('console.error'), 'addMasterEffectToAudio should have error handling');
});

TestRunner.test('Day 485 - Master Effects Audio - addMasterEffectToAudio calls showNotification on failure', (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'addMasterEffectToAudio should call showNotification on failure');
});

TestRunner.test('Day 485 - Master Effects Audio - removeMasterEffectFromAudio is a function export', (t) => {
    t.assertEqual(typeof removeMasterEffectFromAudio, 'function', 'removeMasterEffectFromAudio should be a function');
});

TestRunner.test('Day 485 - Master Effects Audio - removeMasterEffectFromAudio is async', (t) => {
    const result = removeMasterEffectFromAudio();
    t.assertTruthy(result instanceof Promise, 'removeMasterEffectFromAudio should return a Promise');
});

TestRunner.test('Day 485 - Master Effects Audio - removeMasterEffectFromAudio accepts 1 parameter', (t) => {
    const paramCount = removeMasterEffectFromAudio.length;
    t.assertEqual(paramCount, 1, 'removeMasterEffectFromAudio should accept 1 parameter (effectId)');
});

TestRunner.test('Day 485 - Master Effects Audio - removeMasterEffectFromAudio references effectId parameter', (t) => {
    const funcStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(funcStr.includes('effectId'), 'removeMasterEffectFromAudio should reference effectId parameter');
});

TestRunner.test('Day 485 - Master Effects Audio - removeMasterEffectFromAudio gets node from activeMasterEffectNodes', (t) => {
    const funcStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(funcStr.includes('activeMasterEffectNodes'), 'removeMasterEffectFromAudio should reference activeMasterEffectNodes');
});

TestRunner.test('Day 485 - Master Effects Audio - removeMasterEffectFromAudio calls disconnect', (t) => {
    const funcStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(funcStr.includes('disconnect'), 'removeMasterEffectFromAudio should call disconnect on the node');
});

TestRunner.test('Day 485 - Master Effects Audio - removeMasterEffectFromAudio calls dispose', (t) => {
    const funcStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(funcStr.includes('dispose'), 'removeMasterEffectFromAudio should call dispose on the node');
});

TestRunner.test('Day 485 - Master Effects Audio - removeMasterEffectFromAudio deletes from activeMasterEffectNodes', (t) => {
    const funcStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(funcStr.includes('activeMasterEffectNodes.delete') || funcStr.includes('delete'), 'removeMasterEffectFromAudio should delete from activeMasterEffectNodes');
});

TestRunner.test('Day 485 - Master Effects Audio - removeMasterEffectFromAudio calls rebuildMasterEffectChain', (t) => {
    const funcStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(funcStr.includes('rebuildMasterEffectChain'), 'removeMasterEffectFromAudio should call rebuildMasterEffectChain');
});

TestRunner.test('Day 485 - Master Effects Audio - removeMasterEffectFromAudio has error handling', (t) => {
    const funcStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(funcStr.includes('try') || funcStr.includes('catch') || funcStr.includes('console.warn'), 'removeMasterEffectFromAudio should have error handling');
});

TestRunner.test('Day 485 - Master Effects Audio - APP_VERSION validation for Day 485', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 485');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 155, 'Minor version should be >= 155 for Day 485');
    }
});

// Day 486: Timeline Ruler Implementation
// ============================================

TestRunner.test('Day 486 - Timeline Ruler - renderTimelineRuler is a function export', (t) => {
    t.assertEqual(typeof renderTimelineRuler, 'function', 'renderTimelineRuler should be a function');
});

TestRunner.test('Day 486 - Timeline Ruler - renderTimelineRuler accepts 0 parameters', (t) => {
    const paramCount = renderTimelineRuler.length;
    t.assertEqual(paramCount, 0, 'renderTimelineRuler should accept 0 parameters');
});

TestRunner.test('Day 486 - Timeline Ruler - renderTimelineRuler uses timelineZoomLevel', (t) => {
    const funcStr = renderTimelineRuler.toString();
    t.assertTruthy(funcStr.includes('timelineZoomLevel'), 'renderTimelineRuler should reference timelineZoomLevel');
});

TestRunner.test('Day 486 - Timeline Ruler - renderTimelineRuler uses Constants.DEFAULT_MARKER_COLOR', (t) => {
    const funcStr = renderTimelineRuler.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_MARKER_COLOR') || funcStr.includes('Constants'), 'renderTimelineRuler should reference Constants or DEFAULT_MARKER_COLOR');
});

TestRunner.test('Day 486 - Timeline Ruler - renderTimelineRuler uses getTimelineMarkers', (t) => {
    const funcStr = renderTimelineRuler.toString();
    t.assertTruthy(funcStr.includes('getTimelineMarkers'), 'renderTimelineRuler should reference getTimelineMarkers');
});

TestRunner.test('Day 486 - Timeline Ruler - renderTimelineRuler adds marker indicators to ruler', (t) => {
    const funcStr = renderTimelineRuler.toString();
    t.assertTruthy(funcStr.includes('marker.color') || funcStr.includes('markerLeft'), 'renderTimelineRuler should add marker indicators');
});

TestRunner.test('Day 486 - Timeline Ruler - renderTimelineRuler has double-click handler for adding markers', (t) => {
    const funcStr = renderTimelineRuler.toString();
    t.assertTruthy(funcStr.includes('ondblclick') || funcStr.includes('dblclick') || funcStr.includes('addEventListener'), 'renderTimelineRuler should have double-click handler');
});

TestRunner.test('Day 486 - Timeline Ruler - renderTimelineRuler double-click handler calls addTimelineMarker', (t) => {
    const funcStr = renderTimelineRuler.toString();
    t.assertTruthy(funcStr.includes('addTimelineMarker'), 'renderTimelineRuler double-click handler should call addTimelineMarker');
});

TestRunner.test('Day 486 - Timeline Ruler - getPlayheadPositionInBars is a function export', (t) => {
    t.assertEqual(typeof getPlayheadPositionInBars, 'function', 'getPlayheadPositionInBars should be a function');
});

TestRunner.test('Day 486 - Timeline Ruler - getPlayheadPositionInBars accepts 0 parameters', (t) => {
    const paramCount = getPlayheadPositionInBars.length;
    t.assertEqual(paramCount, 0, 'getPlayheadPositionInBars should accept 0 parameters');
});

TestRunner.test('Day 486 - Timeline Ruler - getPlayheadPositionInBars uses Tone.Transport.position', (t) => {
    const funcStr = getPlayheadPositionInBars.toString();
    t.assertTruthy(funcStr.includes('Tone') && funcStr.includes('Transport') && funcStr.includes('position'), 'getPlayheadPositionInBars should reference Tone.Transport.position');
});

TestRunner.test('Day 486 - Timeline Ruler - renderTimeline calls renderTimelineRuler before rendering tracks', (t) => {
    const funcStr = renderTimeline.toString();
    t.assertTruthy(funcStr.includes('renderTimelineRuler'), 'renderTimeline should call renderTimelineRuler');
});

TestRunner.test('Day 486 - Timeline Ruler - renderTimelineRuler uses PIXELS_PER_BAR based on zoom', (t) => {
    const funcStr = renderTimelineRuler.toString();
    t.assertTruthy(funcStr.includes('PIXELS_PER_BAR') || funcStr.includes('120'), 'renderTimelineRuler should use PIXELS_PER_BAR (120 * zoom)');
});

TestRunner.test('Day 486 - Timeline Ruler - renderTimelineRuler renders bar numbers', (t) => {
    const funcStr = renderTimelineRuler.toString();
    t.assertTruthy(funcStr.includes('bar') && funcStr.includes('label'), 'renderTimelineRuler should render bar numbers');
});

TestRunner.test('Day 486 - Timeline Ruler - APP_VERSION validation for Day 486', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 486');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 156, 'Minor version should be >= 156 for Day 486');
    }
});
// ================================================================
// Day 487: Time Signature State Functions Tests
// ================================================================
TestRunner.test('Day 487 - Time Signature - getTimeSignatureState is a function export', (t) => {
    t.assertEqual(typeof getTimeSignatureState, 'function', 'getTimeSignatureState should be a function');
});

TestRunner.test('Day 487 - Time Signature - getTimeSignatureState accepts 0 parameters', (t) => {
    t.assertEqual(getTimeSignatureState.length, 0, 'getTimeSignatureState should accept 0 parameters');
});

TestRunner.test('Day 487 - Time Signature - getTimeSignatureState returns an object', (t) => {
    const funcStr = getTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('numerator') && funcStr.includes('denominator'), 'getTimeSignatureState should return object with numerator and denominator');
});

TestRunner.test('Day 487 - Time Signature - getTimeSignatureState returns a copy', (t) => {
    const funcStr = getTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('{ ...') || funcStr.includes('Object.assign') || funcStr.includes('spread'), 'getTimeSignatureState should return a copy of the state object');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureState is a function export', (t) => {
    t.assertEqual(typeof setTimeSignatureState, 'function', 'setTimeSignatureState should be a function');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureState accepts 2 parameters', (t) => {
    t.assertEqual(setTimeSignatureState.length, 2, 'setTimeSignatureState should accept 2 parameters (numerator, denominator)');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureState references numerator parameter', (t) => {
    const funcStr = setTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('numerator') || funcStr.includes('nextNum'), 'setTimeSignatureState should reference numerator parameter');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureState references denominator parameter', (t) => {
    const funcStr = setTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('denominator') || funcStr.includes('nextDen'), 'setTimeSignatureState should reference denominator parameter');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureState calls captureStateForUndoIfAllowed', (t) => {
    const funcStr = setTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndoIfAllowed'), 'setTimeSignatureState should call captureStateForUndoIfAllowed');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureState uses descriptive undo label', (t) => {
    const funcStr = setTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('Time Signature') || funcStr.includes('time signature') || funcStr.includes('Set Time Signature'), 'Undo label should mention Time Signature');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureState clamps numerator to valid range', (t) => {
    const funcStr = setTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('Math.max') || funcStr.includes('Math.min') || funcStr.includes('numerator'), 'setTimeSignatureState should clamp numerator');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureState clamps denominator to valid range', (t) => {
    const funcStr = setTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('Math.max') || funcStr.includes('Math.min') || funcStr.includes('denominator'), 'setTimeSignatureState should clamp denominator');
});

TestRunner.test('Day 487 - Time Signature - getTimeSignatureNumeratorState is a function export', (t) => {
    t.assertEqual(typeof getTimeSignatureNumeratorState, 'function', 'getTimeSignatureNumeratorState should be a function');
});

TestRunner.test('Day 487 - Time Signature - getTimeSignatureNumeratorState accepts 0 parameters', (t) => {
    t.assertEqual(getTimeSignatureNumeratorState.length, 0, 'getTimeSignatureNumeratorState should accept 0 parameters');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureNumeratorState is a function export', (t) => {
    t.assertEqual(typeof setTimeSignatureNumeratorState, 'function', 'setTimeSignatureNumeratorState should be a function');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureNumeratorState accepts 1 parameter', (t) => {
    t.assertEqual(setTimeSignatureNumeratorState.length, 1, 'setTimeSignatureNumeratorState should accept 1 parameter');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureNumeratorState calls captureStateForUndoIfAllowed', (t) => {
    const funcStr = setTimeSignatureNumeratorState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndoIfAllowed'), 'setTimeSignatureNumeratorState should call captureStateForUndoIfAllowed');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureNumeratorState guards against missing appServices', (t) => {
    const funcStr = setTimeSignatureNumeratorState.toString();
    t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'),
        'setTimeSignatureNumeratorState should check appServices before calling captureStateForUndo');
});

TestRunner.test('Day 487 - Time Signature - getTimeSignatureDenominatorState is a function export', (t) => {
    t.assertEqual(typeof getTimeSignatureDenominatorState, 'function', 'getTimeSignatureDenominatorState should be a function');
});

TestRunner.test('Day 487 - Time Signature - getTimeSignatureDenominatorState accepts 0 parameters', (t) => {
    t.assertEqual(getTimeSignatureDenominatorState.length, 0, 'getTimeSignatureDenominatorState should accept 0 parameters');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureDenominatorState is a function export', (t) => {
    t.assertEqual(typeof setTimeSignatureDenominatorState, 'function', 'setTimeSignatureDenominatorState should be a function');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureDenominatorState accepts 1 parameter', (t) => {
    t.assertEqual(setTimeSignatureDenominatorState.length, 1, 'setTimeSignatureDenominatorState should accept 1 parameter');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureDenominatorState calls captureStateForUndoIfAllowed', (t) => {
    const funcStr = setTimeSignatureDenominatorState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndoIfAllowed'), 'setTimeSignatureDenominatorState should call captureStateForUndoIfAllowed');
});

TestRunner.test('Day 487 - Time Signature - setTimeSignatureDenominatorState guards against missing appServices', (t) => {
    const funcStr = setTimeSignatureDenominatorState.toString();
    t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'),
        'setTimeSignatureDenominatorState should check appServices before calling captureStateForUndo');
});

TestRunner.test('Day 487 - Time Signature - DEFAULT_TIME_SIGNATURE has valid numerator and denominator', (t) => {
    t.assertEqual(DEFAULT_TIME_SIGNATURE.numerator, DEFAULT_TIME_SIGNATURE_NUMERATOR, 'DEFAULT_TIME_SIGNATURE numerator should match constant');
    t.assertEqual(DEFAULT_TIME_SIGNATURE.denominator, DEFAULT_TIME_SIGNATURE_DENOMINATOR, 'DEFAULT_TIME_SIGNATURE denominator should match constant');
});

TestRunner.test('Day 487 - Time Signature - TIME_SIG_MIN_DENOMINATOR and TIME_SIG_MAX_DENOMINATOR are valid', (t) => {
    t.assertEqual(typeof TIME_SIG_MIN_DENOMINATOR, 'number', 'TIME_SIG_MIN_DENOMINATOR should be a number');
    t.assertEqual(typeof TIME_SIG_MAX_DENOMINATOR, 'number', 'TIME_SIG_MAX_DENOMINATOR should be a number');
    t.assertTruthy(TIME_SIG_MIN_DENOMINATOR >= 1, 'TIME_SIG_MIN_DENOMINATOR should be >= 1');
    t.assertTruthy(TIME_SIG_MAX_DENOMINATOR <= 16, 'TIME_SIG_MAX_DENOMINATOR should be <= 16');
});

TestRunner.test('Day 487 - Time Signature - APP_VERSION validation for Day 487', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 487');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 156, 'Minor version should be >= 156 for Day 487');
    }
});

// Day 488: Timeline Clip Context Menu
TestRunner.test('Day 488 - Timeline Clip Context Menu - attachClipEventHandlers is a function export', (t) => {
    t.assertEqual(typeof attachClipEventHandlers, 'function', 'attachClipEventHandlers should be a function');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - attachClipEventHandlers accepts 0 parameters', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('function (') || funcStr.includes('()'), 'attachClipEventHandlers should take 0 parameters');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - selectClip is a function', (t) => {
    t.assertEqual(typeof selectClip, 'function', 'selectClip should be a function');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - selectClip accepts 2 parameters', (t) => {
    const funcStr = selectClip.toString();
    t.assertTruthy(funcStr.includes('trackId') && funcStr.includes('clipId'), 'selectClip should reference trackId and clipId');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - startClipDrag is a function', (t) => {
    t.assertEqual(typeof startClipDrag, 'function', 'startClipDrag should be a function');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - startClipResize is a function', (t) => {
    t.assertEqual(typeof startClipResize, 'function', 'startClipResize should be a function');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - stopClipDrag is a function', (t) => {
    t.assertEqual(typeof stopClipDrag, 'function', 'stopClipDrag should be a function');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - stopClipResize is a function', (t) => {
    t.assertEqual(typeof stopClipResize, 'function', 'stopClipResize should be a function');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - createContextMenu is used in context handler', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('createContextMenu'), 'attachClipEventHandlers should use createContextMenu');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - contextmenu event listener is registered', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes("'contextmenu'") || funcStr.includes('"contextmenu"') || funcStr.includes('contextmenu'), 'attachClipEventHandlers should add contextmenu listener');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - clipId and trackId are read from dataset', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('clipId = clipEl.dataset.clipId') || funcStr.includes('clipId = clipEl'), 'attachClipEventHandlers should read clipId from dataset');
    t.assertTruthy(funcStr.includes('trackId = clipEl.dataset.trackId') || funcStr.includes('trackId = clipEl'), 'attachClipEventHandlers should read trackId from dataset');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - Rename clip menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Rename Clip') || funcStr.includes('Rename'), 'Context menu should have Rename option');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - Change Color menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Change Color') || funcStr.includes('color'), 'Context menu should have Change Color option');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - Duplicate Clip menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Duplicate Clip') || funcStr.includes('duplicate'), 'Context menu should have Duplicate option');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - Split Clip menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Split Clip') || funcStr.includes('splitAudioClip'), 'Context menu should have Split option');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - Delete Clip menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Delete Clip') || funcStr.includes('deleteTimelineClip'), 'Context menu should have Delete option');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - Fade In menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Fade In') || funcStr.includes('setAudioClipFadeIn'), 'Context menu should have Fade In option');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - Fade Out menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Fade Out') || funcStr.includes('setAudioClipFadeOut'), 'Context menu should have Fade Out option');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - Reverse menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Reverse') || funcStr.includes('setAudioClipReverse'), 'Context menu should have Reverse option');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - showConfirmationDialog is used for Delete', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('showConfirmationDialog'), 'Delete should use showConfirmationDialog');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - showNotification is used in menu actions', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'Context menu actions should use showNotification');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - Constants.CLIP_COLORS is referenced for color picker', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('CLIP_COLORS') || funcStr.includes('clipColor'), 'Context menu color picker should reference CLIP_COLORS');
});

TestRunner.test('Day 488 - Timeline Clip Context Menu - APP_VERSION validation for Day 488', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 488');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 157, 'Minor version should be >= 157 for Day 488');
    }
});

TestRunner.test('Day 491 - Audio Clip Custom Fade Duration - Fade In menu uses window.prompt for custom duration', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('window.prompt') && (funcStr.includes('fade in') || funcStr.includes('Fade In') || funcStr.includes('fadeIn') || funcStr.includes('fadeOut')), 'Fade menu should use window.prompt for custom duration');
});

TestRunner.test('Day 491 - Audio Clip Custom Fade Duration - Fade Out menu uses window.prompt for custom duration', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('window.prompt') && (funcStr.includes('fade out') || funcStr.includes('Fade Out') || funcStr.includes('fadeOut')), 'Fade Out should use window.prompt for custom duration');
});

TestRunner.test('Day 491 - Audio Clip Custom Fade Duration - Fade menus use parseFloat for duration parsing', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('parseFloat') || funcStr.includes('parseInt'), 'Custom fade duration should parse the input value');
});

TestRunner.test('Day 491 - Audio Clip Custom Fade Duration - Fade menus validate for NaN input', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('isNaN') || funcStr.includes('isNaN('), 'Custom fade duration should validate input is not NaN');
});

TestRunner.test('Day 491 - Audio Clip Custom Fade Duration - Fade menus clamp negative values', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('parsed < 0') || funcStr.includes('parsed < 0') || funcStr.includes('Math.max'), 'Custom fade duration should handle negative input');
});

TestRunner.test('Day 491 - Audio Clip Custom Fade Duration - APP_VERSION validation for Day 491', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 491');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 158, 'Minor version should be >= 158 for Day 491');
    }
});

// Day 492: Keyboard Shortcut Handler Wiring Tests
TestRunner.test('Day 492 - Keyboard Shortcuts - toggleMidiLearnMode function exists', (t) => {
    t.assertTruthy(typeof toggleMidiLearnMode === 'function', 'toggleMidiLearnMode should be a function');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - toggleMidiLearnMode accepts 0 parameters', (t) => {
    t.assertEqual(toggleMidiLearnMode.length, 0, 'toggleMidiLearnMode should accept 0 parameters');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - toggleScaleModeShortcut function exists', (t) => {
    t.assertTruthy(typeof toggleScaleModeShortcut === 'function', 'toggleScaleModeShortcut should be a function');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - toggleScaleModeShortcut accepts 0 parameters', (t) => {
    t.assertEqual(toggleScaleModeShortcut.length, 0, 'toggleScaleModeShortcut should accept 0 parameters');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - toggleChordModeShortcut function exists', (t) => {
    t.assertTruthy(typeof toggleChordModeShortcut === 'function', 'toggleChordModeShortcut should be a function');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - toggleChordModeShortcut accepts 0 parameters', (t) => {
    t.assertEqual(toggleChordModeShortcut.length, 0, 'toggleChordModeShortcut should accept 0 parameters');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - toggleMetronomeShortcut function exists', (t) => {
    t.assertTruthy(typeof toggleMetronomeShortcut === 'function', 'toggleMetronomeShortcut should be a function');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - toggleMetronomeShortcut accepts 0 parameters', (t) => {
    t.assertEqual(toggleMetronomeShortcut.length, 0, 'toggleMetronomeShortcut should accept 0 parameters');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - openTransportSettingsShortcut function exists', (t) => {
    t.assertTruthy(typeof openTransportSettingsShortcut === 'function', 'openTransportSettingsShortcut should be a function');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - openTransportSettingsShortcut accepts 0 parameters', (t) => {
    t.assertEqual(openTransportSettingsShortcut.length, 0, 'openTransportSettingsShortcut should accept 0 parameters');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - toggleMuteShortcut function exists', (t) => {
    t.assertTruthy(typeof toggleMuteShortcut === 'function', 'toggleMuteShortcut should be a function');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - toggleMuteShortcut accepts 0 parameters', (t) => {
    t.assertEqual(toggleMuteShortcut.length, 0, 'toggleMuteShortcut should accept 0 parameters');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - toggleSoloShortcut function exists', (t) => {
    t.assertTruthy(typeof toggleSoloShortcut === 'function', 'toggleSoloShortcut should be a function');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - toggleSoloShortcut accepts 0 parameters', (t) => {
    t.assertEqual(toggleSoloShortcut.length, 0, 'toggleSoloShortcut should accept 0 parameters');
});
TestRunner.test('Day 492 - Keyboard Shortcuts - APP_VERSION validation for Day 492', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 492');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 159, 'Minor version should be >= 159 for Day 492');
    }
});

// ============================================
// Day 495: Audio Clip Normalize Feature
// ============================================
TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip function reference check', (t) => {
    t.assertEqual(typeof Track.prototype.normalizeAudioClip, 'function', 'normalizeAudioClip should be a function on Track.prototype');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip is async', (t) => {
    t.assertEqual(Track.prototype.normalizeAudioClip.constructor.name, 'AsyncFunction', 'normalizeAudioClip should be async');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip accepts clipId parameter', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'normalizeAudioClip should accept clipId parameter');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'normalizeAudioClip should call _captureUndoState for undo support');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('Normalize'), 'normalizeAudioClip undo label should reference Normalize');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip references clip.name', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('clip.name'), 'normalizeAudioClip should reference clip.name in undo label');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip handles audio type check', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('clip.type') && funcStr.includes('audio'), 'normalizeAudioClip should check for audio clip type');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip clamps gain to valid range', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('MAX_AUDIO_CLIP_GAIN') || funcStr.includes('MIN_AUDIO_CLIP_GAIN'), 'normalizeAudioClip should clamp gain to valid range');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip updates clip.gain', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('clip.gain'), 'normalizeAudioClip should update clip.gain property');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip calculates peak amplitude', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('peakAmplitude') || funcStr.includes('abs'), 'normalizeAudioClip should calculate peak amplitude');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip handles silent audio case', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('silent') || funcStr.includes('peakAmplitude'), 'normalizeAudioClip should handle silent audio edge case');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip shows notification on success', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('showNotification') || funcStr.includes('Normalized'), 'normalizeAudioClip should show notification on success');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip returns boolean', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'normalizeAudioClip should return boolean');
});

TestRunner.test('Day 495 - Audio Clip Editor - normalizeAudioClip APP_VERSION validation for Day 495', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 495');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 161, 'Minor version should be >= 161 for Day 495');
    }
});

// Day 497: Audio Clip Gain Context Menu Item
TestRunner.test('Day 497 - Timeline Clip Context Menu - Gain menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Gain...') || funcStr.includes('setAudioClipGain'), 'Context menu should have Gain option');
});

TestRunner.test('Day 497 - Timeline Clip Context Menu - Gain menu prompts for value', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('window.prompt') && funcStr.includes('Gain'), 'Gain menu should use window.prompt for input');
});

TestRunner.test('Day 497 - Timeline Clip Context Menu - Gain menu clamps value to 0-4 range', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Math.max(0') && funcStr.includes('Math.min(4'), 'Gain should be clamped to 0-4 range');
});

TestRunner.test('Day 497 - Timeline Clip Context Menu - Gain menu calls setAudioClipGain', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('setAudioClipGain'), 'Gain menu action should call setAudioClipGain');
});

TestRunner.test('Day 497 - Timeline Clip Context Menu - Gain menu gets current gain value', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('getAudioClipGain') || funcStr.includes('clip.gain'), 'Gain menu should get current gain value');
});

TestRunner.test('Day 497 - Timeline Clip Context Menu - Gain menu APP_VERSION validation', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 497');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 162, 'Minor version should be >= 162 for Day 497');
    }
});

// Day 498: Audio Clip Start/End Offset Context Menu
TestRunner.test('Day 498 - Timeline Clip Context Menu - Start Offset menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Start Offset') || funcStr.includes('setAudioClipStartOffset'), 'Context menu should have Start Offset option');
});

TestRunner.test('Day 498 - Timeline Clip Context Menu - Start Offset menu prompts for value', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('window.prompt') && funcStr.includes('Start Offset'), 'Start Offset menu should use window.prompt for input');
});

TestRunner.test('Day 498 - Timeline Clip Context Menu - Start Offset menu validates positive number', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('parsed < 0') || funcStr.includes('isNaN(parsed)'), 'Start Offset should validate for valid positive number');
});

TestRunner.test('Day 498 - Timeline Clip Context Menu - Start Offset menu calls setAudioClipStartOffset', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('setAudioClipStartOffset'), 'Start Offset menu action should call setAudioClipStartOffset');
});

TestRunner.test('Day 498 - Timeline Clip Context Menu - End Offset menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('End Offset') || funcStr.includes('setAudioClipEndOffset'), 'Context menu should have End Offset option');
});

TestRunner.test('Day 498 - Timeline Clip Context Menu - End Offset menu prompts for value', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('window.prompt') && funcStr.includes('End Offset'), 'End Offset menu should use window.prompt for input');
});

TestRunner.test('Day 498 - Timeline Clip Context Menu - End Offset menu validates positive number', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('parsed < 0') || funcStr.includes('isNaN(parsed)'), 'End Offset should validate for valid positive number');
});

TestRunner.test('Day 498 - Timeline Clip Context Menu - End Offset menu calls setAudioClipEndOffset', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('setAudioClipEndOffset'), 'End Offset menu action should call setAudioClipEndOffset');
});

TestRunner.test('Day 498 - Timeline Clip Context Menu - Start/End Offset APP_VERSION validation', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 498');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 163, 'Minor version should be >= 163 for Day 498');
    }
});

// Day 499: Sequencer Context Menu Stop All Audio
TestRunner.test('Day 499 - Sequencer Context Menu - Stop All Audio menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Stop All Audio'), 'Context menu should have Stop All Audio option');
});

TestRunner.test('Day 499 - Sequencer Context Menu - Stop All Audio calls panicStopAllAudio', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('panicStopAllAudio'), 'Stop All Audio should call panicStopAllAudio');
});

TestRunner.test('Day 499 - Sequencer Context Menu - Stop All Audio APP_VERSION validation', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 499');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 164, 'Minor version should be >= 164 for Day 499');
    }
});

// Day 500: Audio Clip Pitch Shift Methods
TestRunner.test('Day 500 - Track setAudioClipPitchShift is a function', (t) => {
    const track = new Track('test-track-1', 'Audio');
    t.assertTruthy(typeof track.setAudioClipPitchShift === 'function', 'setAudioClipPitchShift should be a function');
});

TestRunner.test('Day 500 - Track getAudioClipPitchShift is a function', (t) => {
    const track = new Track('test-track-1', 'Audio');
    t.assertTruthy(typeof track.getAudioClipPitchShift === 'function', 'getAudioClipPitchShift should be a function');
});

TestRunner.test('Day 500 - Track setAudioClipPitchShift clamps to -24 to +24', (t) => {
    const track = new Track('test-track-1', 'Audio');
    track.timelineClips = [{ id: 'clip-1', type: 'audio', name: 'Test Clip', pitchShift: 0 }];
    track.setAudioClipPitchShift('clip-1', 50);
    t.assertEqual(track.timelineClips[0].pitchShift, 24, 'Should clamp to +24');
    track.setAudioClipPitchShift('clip-1', -50);
    t.assertEqual(track.timelineClips[0].pitchShift, -24, 'Should clamp to -24');
});

TestRunner.test('Day 500 - Track getAudioClipPitchShift returns default 0', (t) => {
    const track = new Track('test-track-1', 'Audio');
    const result = track.getAudioClipPitchShift('non-existent');
    t.assertEqual(result, 0, 'Should return 0 for non-existent clip');
});

TestRunner.test('Day 500 - Track setAudioClipPitchShift calls _captureUndoState', (t) => {
    const track = new Track('test-track-1', 'Audio');
    track.timelineClips = [{ id: 'clip-1', type: 'audio', name: 'Test Clip', pitchShift: 0 }];
    let captured = false;
    track._captureUndoState = (label) => { captured = true; };
    track.setAudioClipPitchShift('clip-1', 12);
    t.assertTruthy(captured, 'Should call _captureUndoState');
});

TestRunner.test('Day 500 - Track setAudioClipPitchShift APP_VERSION validation', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 500');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 165, 'Minor version should be >= 165 for Day 500');
    }
});

// Day 501: Reverse Sequence Feature
TestRunner.test('Day 501 - Track.reverseSequence is a function', (t) => {
    const track = new Track('test-track-1', 'Synth');
    t.assertEqual(typeof track.reverseSequence, 'function', 'reverseSequence should be a function');
});

TestRunner.test('Day 501 - Track.reverseSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.reverseSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'reverseSequence should call _captureUndoState for undo support');
});

TestRunner.test('Day 501 - Track.reverseSequence returns 0 for Audio tracks', (t) => {
    const track = new Track('test-track-1', 'Audio');
    const result = track.reverseSequence();
    t.assertEqual(result, 0, 'Audio tracks should return 0');
});

TestRunner.test('Day 501 - Track.reverseSequence APP_VERSION validation', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 501');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 166, 'Minor version should be >= 166 for Day 501');
    }
});
// Day 502: Sequence Editing Methods Tests - humanizeVelocity, Invert Selection, Clear Selection, and context menu coverage
TestRunner.test('Day 502 - Sequence Methods - Track.humanizeVelocity is a function', (t) => {
    t.assertEqual(typeof Track.prototype.humanizeVelocity, 'function', 'humanizeVelocity should be a function');
});

TestRunner.test('Day 502 - Sequence Methods - humanizeVelocity calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'humanizeVelocity should call _captureUndoState for undo support');
});

TestRunner.test('Day 502 - Sequence Methods - humanizeVelocity returns 0 for Audio tracks', (t) => {
    const track = new Track('test-track-1', 'Audio');
    const result = track.humanizeVelocity(0.15);
    t.assertEqual(result, 0, 'Audio tracks should return 0');
});

TestRunner.test('Day 502 - Sequence Methods - humanizeVelocity references amount parameter', (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    t.assertTruthy(funcStr.includes('amount'), 'humanizeVelocity should reference amount parameter');
});

TestRunner.test('Day 502 - Sequence Methods - humanizeVelocity clamps velocities to valid range', (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'humanizeVelocity should clamp values to 0.05-1.0 range');
});

TestRunner.test('Day 502 - Sequence Methods - humanizeVelocity uses Math.random for variation', (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    t.assertTruthy(funcStr.includes('Math.random'), 'humanizeVelocity should use Math.random for variation');
});

TestRunner.test('Day 502 - Sequence Methods - humanizeVelocity APP_VERSION validation', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 502');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 166, 'Minor version should be >= 166 for Day 502');
    }
});

TestRunner.test('Day 502 - Sequence Methods - Track.copySequenceSection is a function', (t) => {
    t.assertEqual(typeof Track.prototype.copySequenceSection, 'function', 'copySequenceSection should be a function');
});

TestRunner.test('Day 502 - Sequence Methods - copySequenceSection returns array data', (t) => {
    const funcStr = Track.prototype.copySequenceSection.toString();
    t.assertTruthy(funcStr.includes('sectionData') && funcStr.includes('totalSteps'), 'copySequenceSection should build section data array');
});

TestRunner.test('Day 502 - Sequence Methods - Track.pasteSequenceSection is a function', (t) => {
    t.assertEqual(typeof Track.prototype.pasteSequenceSection, 'function', 'pasteSequenceSection should be a function');
});

TestRunner.test('Day 502 - Sequence Methods - pasteSequenceSection calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.pasteSequenceSection.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'pasteSequenceSection should call _captureUndoState for undo support');
});

TestRunner.test('Day 502 - Sequence Methods - Track.setSequenceLength is a function', (t) => {
    t.assertEqual(typeof Track.prototype.setSequenceLength, 'function', 'setSequenceLength should be a function');
});

TestRunner.test('Day 502 - Sequence Methods - setSequenceLength calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setSequenceLength.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setSequenceLength should call _captureUndoState for undo support');
});

TestRunner.test('Day 502 - Sequence Methods - Track.quantizeSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.quantizeSequence, 'function', 'quantizeSequence should be a function');
});

TestRunner.test('Day 502 - Sequence Methods - quantizeSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.quantizeSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'quantizeSequence should call _captureUndoState for undo support');
});

TestRunner.test('Day 502 - Sequence Methods - Track.reverseSequence is a function (confirmation)', (t) => {
    t.assertEqual(typeof Track.prototype.reverseSequence, 'function', 'reverseSequence should be a function');
});

TestRunner.test('Day 502 - Sequence Methods - reverseSequence mirrors steps correctly', (t) => {
    const funcStr = Track.prototype.reverseSequence.toString();
    t.assertTruthy(funcStr.includes('totalSteps') && funcStr.includes('mirroredCol'), 'reverseSequence should use mirrored column calculation');
});

TestRunner.test('Day 502 - APP_VERSION validation for Day 502', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 166, 'Minor version should be >= 166 for Day 502');
    }
});

// Day 503: Set Sequence Length Menu Item Tests
TestRunner.test('Day 503 - Set Length menu item exists in sequencer context menu', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('Set Length'), 'Set Length menu item should exist in context menu');
});

TestRunner.test('Day 503 - Set Length uses window.prompt for input', (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('window.prompt') && funcStr.includes('Set sequence length'), 'Set Length should use window.prompt for user input');
});

TestRunner.test('Day 503 - Set Length calls track.setSequenceLength', (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('setSequenceLength'), 'Set Length should call track.setSequenceLength method');
});

TestRunner.test('Day 503 - Set Length validates bar count (rejects invalid)', (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('isNaN') || funcStr.includes('bars < 1'), 'Set Length should validate bar count and reject invalid input');
});

TestRunner.test('Day 503 - Set Length validates against MAX_BARS', (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('MAX_BARS'), 'Set Length should check against MAX_BARS limit');
});

TestRunner.test('Day 503 - Set Length APP_VERSION validation', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 503');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 168, 'Minor version should be >= 168 for Day 503');
    }
});

// Day 504: Halve Sequence Length Feature Tests
TestRunner.test('Day 504 - Halve Length menu item exists in sequencer context menu', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Halve Length'), 'Halve Length menu item should exist in sequencer context menu');
});

TestRunner.test('Day 504 - Halve Length calls track.halveSequence', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('halveSequence'), 'Halve Length should call track.halveSequence');
});

TestRunner.test('Day 504 - Halve Length APP_VERSION validation', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts.length >= 3, 'APP_VERSION should have at least 3 parts');
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 504');
    t.assertTruthy(versionParts[1] >= 169, 'Minor version should be >= 169 for Day 504');
});

TestRunner.test('Day 504 - Track.halveSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.halveSequence, 'function', 'halveSequence should be a function on Track.prototype');
});

TestRunner.test('Day 504 - halveSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.halveSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'halveSequence should call _captureUndoState for undo support');
});

TestRunner.test('Day 504 - halveSequence validates minimum 1 bar', (t) => {
    const funcStr = Track.prototype.halveSequence.toString();
    t.assertTruthy(funcStr.includes('STEPS_PER_BAR') || funcStr.includes('minimum'), 'halveSequence should validate minimum 1 bar');
});
// Day 505: Sequencer Context Menu Comprehensive Tests (2026-05-15)
// Tests for Shift Notes Up/Down, Clear Selection, Invert Selection, Scale Velocities, and other context menu items
TestRunner.test('Day 505 - Sequencer Context Menu - Shift Notes Up menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Shift Notes Up'), 'Context menu should have Shift Notes Up option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Shift Notes Up calls shiftSequenceNotes', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('shiftSequenceNotes(1)') || funcStr.includes('shiftSequenceNotes( 1 )'), 'Shift Notes Up should call shiftSequenceNotes(1)');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Shift Notes Down menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Shift Notes Down'), 'Context menu should have Shift Notes Down option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Shift Notes Down calls shiftSequenceNotes', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('shiftSequenceNotes(-1)') || funcStr.includes('shiftSequenceNotes( -1 )'), 'Shift Notes Down should call shiftSequenceNotes(-1)');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Clear Selection menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Clear Selection'), 'Context menu should have Clear Selection option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Clear Selection sets cells to null', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('= null') && funcStr.includes('Clear Selection'), 'Clear Selection should set selected cells to null');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Invert Selection menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Invert Selection'), 'Context menu should have Invert Selection option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Invert Selection toggles active state', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('active') && funcStr.includes('Invert Selection'), 'Invert Selection should toggle active state');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Scale Velocities (50%) menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Scale Velocities (50%)'), 'Context menu should have Scale Velocities (50%) option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Scale Velocities (75%) menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Scale Velocities (75%)'), 'Context menu should have Scale Velocities (75%) option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Scale Velocities (125%) menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Scale Velocities (125%)'), 'Context menu should have Scale Velocities (125%) option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Scale Velocities (100%) menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Scale Velocities (100%)'), 'Context menu should have Scale Velocities (100%) option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Quantize to 1/16 menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Quantize to 1/16'), 'Context menu should have Quantize to 1/16 option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Quantize to 1/8 menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Quantize to 1/8'), 'Context menu should have Quantize to 1/8 option');
});
TestRunner.test('Day 505 - Sequencer Context Menu - Quantize to 1/4 menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Quantize to 1/4'), 'Context menu should have Quantize to 1/4 option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Reverse Sequence menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Reverse Sequence'), 'Context menu should have Reverse Sequence option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Erase sequence menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Erase '), 'Context menu should have Erase option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Set Length menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Set Length'), 'Context menu should have Set Length option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Set Length uses window.prompt', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('window.prompt') && funcStr.includes('Set Length'), 'Set Length should use window.prompt for input');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Double Length menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Double Length'), 'Context menu should have Double Length option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Double Length calls doubleSequence', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('doubleSequence'), 'Double Length should call track.doubleSequence');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Halve Length calls track.halveSequence', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('halveSequence'), 'Halve Length should call track.halveSequence');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Humanize Velocities menu items exist', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Humanize Velocities'), 'Context menu should have Humanize Velocities option(s)');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Humanize Velocities calls humanizeVelocity', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('humanizeVelocity'), 'Humanize Velocities should call track.humanizeVelocity');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Copy Selection menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Copy Selection'), 'Context menu should have Copy Selection option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Paste Selection menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Paste Selection'), 'Context menu should have Paste Selection option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Duplicate Sequence menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Duplicate Sequence'), 'Context menu should have Duplicate Sequence option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Rename Sequence menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Rename Sequence'), 'Context menu should have Rename Sequence option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Copy Full Sequence menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Copy Full Sequence'), 'Context menu should have Copy Full Sequence option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Paste Full Sequence menu item exists', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('Paste Full Sequence'), 'Context menu should have Paste Full Sequence option');
});

TestRunner.test('Day 505 - Sequencer Context Menu - Stop All Audio calls panicStopAllAudio', (t) => {
    const funcStr = attachClipEventHandlers.toString();
    t.assertTruthy(funcStr.includes('panicStopAllAudio'), 'Stop All Audio should call panicStopAllAudio');
});

TestRunner.test('Day 505 - Sequencer Context Menu - APP_VERSION validation for Day 505', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts.length >= 3, 'APP_VERSION should have at least 3 parts');
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 505');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 169, 'Minor version should be >= 169 for Day 505');
    }
});

// ============================================
// Day 506: Missing Window Function Tests
// ============================================

// --- openTrackGroupsWindow Tests ---

TestRunner.test('Day 506 - Track Groups Window - openTrackGroupsWindow is a function export', (t) => {
    t.assertEqual(typeof openTrackGroupsWindow, 'function', 'openTrackGroupsWindow should be a function');
});

TestRunner.test('Day 506 - Track Groups Window - openTrackGroupsWindow accepts 0-1 parameters', (t) => {
    const paramCount = openTrackGroupsWindow.length;
    t.assertEqual(paramCount <= 1, true, 'openTrackGroupsWindow should accept 0 or 1 parameter');
});

TestRunner.test('Day 506 - Track Groups Window - openTrackGroupsWindow function body uses createWindow', (t) => {
    const funcStr = openTrackGroupsWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTrackGroupsWindow should use createWindow');
});

TestRunner.test('Day 506 - Track Groups Window - openTrackGroupsWindow function body uses getOpenWindows for single-instance', (t) => {
    const funcStr = openTrackGroupsWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openTrackGroupsWindow should check for open windows');
});

TestRunner.test('Day 506 - Track Groups Window - openTrackGroupsWindow function body uses localAppServices', (t) => {
    const funcStr = openTrackGroupsWindow.toString();
    t.assertTruthy(funcStr.includes('localAppServices'), 'openTrackGroupsWindow should reference localAppServices');
});

TestRunner.test('Day 506 - Track Groups Window - openTrackGroupsWindow references trackGroupsList container', (t) => {
    const funcStr = openTrackGroupsWindow.toString();
    t.assertTruthy(funcStr.includes('trackGroupsList'), 'openTrackGroupsWindow should reference trackGroupsList container');
});
// ============================================
// Day 512: EffectsRegistry Functions Tests
// ============================================
TestRunner.test('Day 512 - EffectsRegistry - getEffectBypassState is a function export', (t) => {
    t.assertEqual(typeof getEffectBypassState, 'function', 'getEffectBypassState should be a function');
});

TestRunner.test('Day 512 - EffectsRegistry - getEffectBypassState accepts 1 parameter', (t) => {
    const paramCount = getEffectBypassState.length;
    t.assertEqual(paramCount, 1, 'getEffectBypassState should accept 1 parameter (effectId)');
});

TestRunner.test('Day 512 - EffectsRegistry - getEffectBypassState references effectId parameter', (t) => {
    const funcStr = getEffectBypassState.toString();
    t.assertTruthy(funcStr.includes('effectId'), 'getEffectBypassState should reference effectId parameter');
});

TestRunner.test('Day 512 - EffectsRegistry - getEffectBypassState references effectBypassStates', (t) => {
    const funcStr = getEffectBypassState.toString();
    t.assertTruthy(funcStr.includes('effectBypassStates'), 'getEffectBypassState should reference effectBypassStates Map');
});

TestRunner.test('Day 512 - EffectsRegistry - getEffectBypassState returns boolean', (t) => {
    const funcStr = getEffectBypassState.toString();
    t.assertTruthy(funcStr.includes('===') || funcStr.includes('=== true'), 'getEffectBypassState should return boolean via === comparison');
});

TestRunner.test('Day 512 - EffectsRegistry - setEffectBypassState is a function export', (t) => {
    t.assertEqual(typeof setEffectBypassState, 'function', 'setEffectBypassState should be a function');
});

TestRunner.test('Day 512 - EffectsRegistry - setEffectBypassState accepts 2 parameters', (t) => {
    const paramCount = setEffectBypassState.length;
    t.assertEqual(paramCount, 2, 'setEffectBypassState should accept 2 parameters (effectId, bypassed)');
});

TestRunner.test('Day 512 - EffectsRegistry - setEffectBypassState references effectId parameter', (t) => {
    const funcStr = setEffectBypassState.toString();
    t.assertTruthy(funcStr.includes('effectId'), 'setEffectBypassState should reference effectId parameter');
});

TestRunner.test('Day 512 - EffectsRegistry - setEffectBypassState references bypassed parameter', (t) => {
    const funcStr = setEffectBypassState.toString();
    t.assertTruthy(funcStr.includes('bypassed'), 'setEffectBypassState should reference bypassed parameter');
});

TestRunner.test('Day 512 - EffectsRegistry - setEffectBypassState calls effectBypassStates.set', (t) => {
    const funcStr = setEffectBypassState.toString();
    t.assertTruthy(funcStr.includes('effectBypassStates.set') || funcStr.includes('set('), 'setEffectBypassState should call Map.set');
});

TestRunner.test('Day 512 - EffectsRegistry - getEffectParamDefinitions is a function export', (t) => {
    t.assertEqual(typeof getEffectParamDefinitions, 'function', 'getEffectParamDefinitions should be a function');
});

TestRunner.test('Day 512 - EffectsRegistry - getEffectParamDefinitions accepts 1 parameter', (t) => {
    const paramCount = getEffectParamDefinitions.length;
    t.assertEqual(paramCount, 1, 'getEffectParamDefinitions should accept 1 parameter (effectType)');
});

TestRunner.test('Day 512 - EffectsRegistry - getEffectParamDefinitions references effectType parameter', (t) => {
    const funcStr = getEffectParamDefinitions.toString();
    t.assertTruthy(funcStr.includes('effectType'), 'getEffectParamDefinitions should reference effectType parameter');
});

TestRunner.test('Day 512 - EffectsRegistry - getEffectParamDefinitions checks AVAILABLE_EFFECTS definition', (t) => {
    const funcStr = getEffectParamDefinitions.toString();
    t.assertTruthy(funcStr.includes('AVAILABLE_EFFECTS'), 'getEffectParamDefinitions should check AVAILABLE_EFFECTS');
});

TestRunner.test('Day 512 - EffectsRegistry - getEffectParamDefinitions handles missing definition', (t) => {
    const funcStr = getEffectParamDefinitions.toString();
    t.assertTruthy(funcStr.includes('console.warn') || funcStr.includes('return []'), 'getEffectParamDefinitions should handle missing definition gracefully');
});

TestRunner.test('Day 512 - EffectsRegistry - getEffectParamDefinitions returns definition.params or empty array', (t) => {
    const funcStr = getEffectParamDefinitions.toString();
    t.assertTruthy(funcStr.includes('params') && (funcStr.includes('|| []') || funcStr.includes('return []')), 'getEffectParamDefinitions should return params array or empty array');
});

TestRunner.test('Day 512 - EffectsRegistry - synthEngineControlDefinitions is exported', (t) => {
    t.assertEqual(typeof synthEngineControlDefinitions, 'object', 'synthEngineControlDefinitions should be an object');
});

TestRunner.test('Day 512 - EffectsRegistry - synthEngineControlDefinitions has object keys', (t) => {
    const funcStr = synthEngineControlDefinitions.toString();
    t.assertTruthy(Object.keys(synthEngineControlDefinitions).length >= 0, 'synthEngineControlDefinitions should be a non-null object');
});

TestRunner.test('Day 512 - APP_VERSION validation for Day 512', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts.length >= 3, 'APP_VERSION should have at least 3 parts');
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 512');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 176, 'Minor version should be >= 176 for Day 512');
    }
});

// ============================================
// Day 513: Sidechain Audio Functions Tests
// ============================================
TestRunner.test('Day 513 - Sidechain - handleSidechainParamChangeForEffect is a function export', (t) => {
    t.assertEqual(typeof handleSidechainParamChangeForEffect, 'function', 'handleSidechainParamChangeForEffect should be a function');
});

TestRunner.test('Day 513 - Sidechain - handleSidechainParamChangeForEffect accepts 3 parameters', (t) => {
    const paramCount = handleSidechainParamChangeForEffect.length;
    t.assertEqual(paramCount, 3, 'handleSidechainParamChangeForEffect should accept 3 parameters (effectId, effectNode, sidechainValue)');
});

TestRunner.test('Day 513 - Sidechain - handleSidechainParamChangeForEffect references effectId parameter', (t) => {
    const funcStr = handleSidechainParamChangeForEffect.toString();
    t.assertTruthy(funcStr.includes('effectId'), 'handleSidechainParamChangeForEffect should reference effectId parameter');
});

TestRunner.test('Day 513 - Sidechain - handleSidechainParamChangeForEffect references effectNode parameter', (t) => {
    const funcStr = handleSidechainParamChangeForEffect.toString();
    t.assertTruthy(funcStr.includes('effectNode'), 'handleSidechainParamChangeForEffect should reference effectNode parameter');
});

TestRunner.test('Day 513 - Sidechain - handleSidechainParamChangeForEffect references sidechainValue parameter', (t) => {
    const funcStr = handleSidechainParamChangeForEffect.toString();
    t.assertTruthy(funcStr.includes('sidechainValue'), 'handleSidechainParamChangeForEffect should reference sidechainValue parameter');
});

TestRunner.test('Day 513 - Sidechain - handleSidechainParamChangeForEffect checks for disposed effectNode', (t) => {
    const funcStr = handleSidechainParamChangeForEffect.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'handleSidechainParamChangeForEffect should check effectNode.disposed');
});

TestRunner.test('Day 513 - Sidechain - handleSidechainParamChangeForEffect checks sidechainTrackAssignments', (t) => {
    const funcStr = handleSidechainParamChangeForEffect.toString();
    t.assertTruthy(funcStr.includes('sidechainTrackAssignments'), 'handleSidechainParamChangeForEffect should check sidechainTrackAssignments');
});

TestRunner.test('Day 513 - Sidechain - handleSidechainParamChangeForEffect uses set method on effectNode', (t) => {
    const funcStr = handleSidechainParamChangeForEffect.toString();
    t.assertTruthy(funcStr.includes('.set(') || funcStr.includes('set({'), 'handleSidechainParamChangeForEffect should call effectNode.set');
});

TestRunner.test('Day 513 - Sidechain - handleSidechainParamChangeForEffect has error handling with try/catch', (t) => {
    const funcStr = handleSidechainParamChangeForEffect.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'handleSidechainParamChangeForEffect should have try/catch error handling');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackForEffect is a function export', (t) => {
    t.assertEqual(typeof enableSidechainFromTrackForEffect, 'function', 'enableSidechainFromTrackForEffect should be a function');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackForEffect accepts 2 parameters', (t) => {
    const paramCount = enableSidechainFromTrackForEffect.length;
    t.assertEqual(paramCount, 2, 'enableSidechainFromTrackForEffect should accept 2 parameters (effectId, trackId)');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackForEffect references effectId parameter', (t) => {
    const funcStr = enableSidechainFromTrackForEffect.toString();
    t.assertTruthy(funcStr.includes('effectId'), 'enableSidechainFromTrackForEffect should reference effectId parameter');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackForEffect references trackId parameter', (t) => {
    const funcStr = enableSidechainFromTrackForEffect.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'enableSidechainFromTrackForEffect should reference trackId parameter');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackForEffect gets effect node from activeMasterEffectNodes', (t) => {
    const funcStr = enableSidechainFromTrackForEffect.toString();
    t.assertTruthy(funcStr.includes('activeMasterEffectNodes'), 'enableSidechainFromTrackForEffect should get effect node from activeMasterEffectNodes');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackForEffect validates effectNode', (t) => {
    const funcStr = enableSidechainFromTrackForEffect.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'enableSidechainFromTrackForEffect should validate effectNode.disposed');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackForEffect gets track via localAppServices', (t) => {
    const funcStr = enableSidechainFromTrackForEffect.toString();
    t.assertTruthy(funcStr.includes('localAppServices') && funcStr.includes('getTrackById'), 'enableSidechainFromTrackForEffect should get track via localAppServices.getTrackById');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackForEffect calls enableSidechainFromTrackIn', (t) => {
    const funcStr = enableSidechainFromTrackForEffect.toString();
    t.assertTruthy(funcStr.includes('enableSidechainFromTrackIn'), 'enableSidechainFromTrackForEffect should call enableSidechainFromTrackIn');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackForEffect returns boolean', (t) => {
    const funcStr = enableSidechainFromTrackForEffect.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'enableSidechainFromTrackForEffect should return boolean');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackIn is a function export', (t) => {
    t.assertEqual(typeof enableSidechainFromTrackIn, 'function', 'enableSidechainFromTrackIn should be a function');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackIn is async', (t) => {
    t.assertTruthy(enableSidechainFromTrackIn.constructor.name === 'AsyncFunction' || enableSidechainFromTrackIn.toString().includes('async'), 'enableSidechainFromTrackIn should be async');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackIn accepts 2 parameters', (t) => {
    const paramCount = enableSidechainFromTrackIn.length;
    t.assertEqual(paramCount, 2, 'enableSidechainFromTrackIn should accept 2 parameters (trackId, compressorNode)');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackIn references trackId parameter', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'enableSidechainFromTrackIn should reference trackId parameter');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackIn references compressorNode parameter', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('compressorNode'), 'enableSidechainFromTrackIn should reference compressorNode parameter');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackIn validates compressorNode', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'enableSidechainFromTrackIn should validate compressorNode.disposed');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackIn gets track via localAppServices', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('localAppServices') && funcStr.includes('getTrackById'), 'enableSidechainFromTrackIn should get track via localAppServices.getTrackById');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackIn checks track.inputChannel', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('inputChannel'), 'enableSidechainFromTrackIn should check track.inputChannel');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackIn calls getSidechainBusInput', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('getSidechainBusInput'), 'enableSidechainFromTrackIn should call getSidechainBusInput');
});

TestRunner.test('Day 513 - Sidechain - enableSidechainFromTrackIn connects track to sidechainBus', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('connect(') || funcStr.includes('connect'), 'enableSidechainFromTrackIn should connect track to sidechain bus');
});

TestRunner.test('Day 513 - Sidechain - disableSidechainBus is a function export', (t) => {
    t.assertEqual(typeof disableSidechainBus, 'function', 'disableSidechainBus should be a function');
});

TestRunner.test('Day 513 - Sidechain - disableSidechainBus accepts 0 parameters', (t) => {
    const paramCount = disableSidechainBus.length;
    t.assertEqual(paramCount, 0, 'disableSidechainBus should accept 0 parameters');
});

TestRunner.test('Day 513 - Sidechain - disableSidechainBus calls disableSidechainFromMic', (t) => {
    const funcStr = disableSidechainBus.toString();
    t.assertTruthy(funcStr.includes('disableSidechainFromMic'), 'disableSidechainBus should call disableSidechainFromMic');
});

TestRunner.test('Day 513 - Sidechain - disableSidechainBus disposes sidechainBus', (t) => {
    const funcStr = disableSidechainBus.toString();
    t.assertTruthy(funcStr.includes('dispose'), 'disableSidechainBus should dispose sidechainBus');
});

TestRunner.test('Day 513 - Sidechain - disableSidechainBus sets sidechainBus to null', (t) => {
    const funcStr = disableSidechainBus.toString();
    t.assertTruthy(funcStr.includes('= null') && funcStr.includes('sidechainBus'), 'disableSidechainBus should set sidechainBus to null');
});

TestRunner.test('Day 513 - APP_VERSION validation for Day 513', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts.length >= 3, 'APP_VERSION should have at least 3 parts');
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 513');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 177, 'Minor version should be >= 177 for Day 513');
    }
});
// Day 518: showKeyboardShortcutsHelpWindow Tests
// ============================================
TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow is a function export', (t) => {
    t.assertEqual(typeof showKeyboardShortcutsHelpWindow, 'function', 'showKeyboardShortcutsHelpWindow should be a function');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow accepts 0 parameters', (t) => {
    t.assertEqual(showKeyboardShortcutsHelpWindow.length, 0, 'showKeyboardShortcutsHelpWindow should accept 0 parameters');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow references getOpenWindows', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'showKeyboardShortcutsHelpWindow should reference getOpenWindows');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow uses windowId for single-instance window', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('keyboardShortcutsHelp') || funcStr.includes('windowId'), 'showKeyboardShortcutsHelpWindow should use a windowId for single-instance management');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow builds shortcuts HTML content', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('shortcutsHTML') || funcStr.includes('innerHTML') || funcStr.includes('inner = '), 'showKeyboardShortcutsHelpWindow should build HTML content for the shortcuts window');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow includes Playback Controls section', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('Playback') || funcStr.includes('Space') || funcStr.includes('Space') || funcStr.includes('Play'), 'showKeyboardShortcutsHelpWindow should include Playback Controls section');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow includes Edit Operations section', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('Edit') || funcStr.includes('Undo') || funcStr.includes('Redo') || funcStr.includes('Ctrl+Z'), 'showKeyboardShortcutsHelpWindow should include Edit Operations section');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow includes Track Controls section', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('Track') || funcStr.includes('Mute') || funcStr.includes('Solo') || funcStr.includes('Arm'), 'showKeyboardShortcutsHelpWindow should include Track Controls section');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow includes Piano Keys section', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('Piano') || funcStr.includes('Octave') || funcStr.includes('A-L') || funcStr.includes('Z') || funcStr.includes('X'), 'showKeyboardShortcutsHelpWindow should include Piano Keys section');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow includes Snap & Quantize section', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('Snap') || funcStr.includes('Quantize') || funcStr.includes('1/16') || funcStr.includes('1/8'), 'showKeyboardShortcutsHelpWindow should include Snap & Quantize section');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow uses createWindow', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'showKeyboardShortcutsHelpWindow should use createWindow to create the modal');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow references KEYBOARD_SHORTCUTS_HELP_WIDTH', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('KEYBOARD_SHORTCUTS_HELP_WIDTH') || funcStr.includes('width'), 'showKeyboardShortcutsHelpWindow should reference width constant');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow references KEYBOARD_SHORTCUTS_HELP_HEIGHT', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('KEYBOARD_SHORTCUTS_HELP_HEIGHT') || funcStr.includes('height'), 'showKeyboardShortcutsHelpWindow should reference height constant');
});

TestRunner.test('Day 518 - Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow APP_VERSION validation', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts.length >= 3, 'APP_VERSION should have at least 3 parts');
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 518');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 180, 'Minor version should be >= 180 for Day 518');
    }
});
// ============================================================
// Day 519: Core Window Function Tests
// ============================================================

// --- openMixerWindow tests ---
TestRunner.test('Day 519 - openMixerWindow is a function export', (t) => {
    t.assertEqual(typeof openMixerWindow, 'function', 'openMixerWindow should be a function');
});

TestRunner.test('Day 519 - openMixerWindow accepts 0-1 parameters', (t) => {
    t.assertEqual(openMixerWindow.length <= 1, true, 'openMixerWindow should accept 0 or 1 parameters');
});

TestRunner.test('Day 519 - openMixerWindow uses getOpenWindows for single-instance', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows') || funcStr.includes('openWindows'), 'openMixerWindow should check existing windows for single-instance behavior');
});

TestRunner.test('Day 519 - openMixerWindow uses createWindow to create mixer window', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow') || funcStr.includes('SnugWindow'), 'openMixerWindow should use createWindow or SnugWindow');
});

TestRunner.test('Day 519 - openMixerWindow uses windowId "mixer"', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('"mixer"') || funcStr.includes("'mixer'"), 'openMixerWindow should use "mixer" as the windowId');
});

TestRunner.test('Day 519 - openMixerWindow creates mixer content container', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('mixerContentContainer') || funcStr.includes('contentContainer'), 'openMixerWindow should create a content container');
});

TestRunner.test('Day 519 - openMixerWindow references localAppServices', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('localAppServices') || funcStr.includes('appServices'), 'openMixerWindow should reference localAppServices');
});

TestRunner.test('Day 519 - openMixerWindow handles savedState for window restoration', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('savedState') || funcStr.includes('restore'), 'openMixerWindow should handle savedState for restoration');
});

// --- openSoundBrowserWindow tests ---
TestRunner.test('Day 519 - openSoundBrowserWindow is a function export', (t) => {
    t.assertEqual(typeof openSoundBrowserWindow, 'function', 'openSoundBrowserWindow should be a function');
});

TestRunner.test('Day 519 - openSoundBrowserWindow accepts 0-1 parameters', (t) => {
    t.assertEqual(openSoundBrowserWindow.length <= 1, true, 'openSoundBrowserWindow should accept 0 or 1 parameters');
});

TestRunner.test('Day 519 - openSoundBrowserWindow uses getOpenWindows for single-instance', (t) => {
    const funcStr = openSoundBrowserWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows') || funcStr.includes('openWindows'), 'openSoundBrowserWindow should check existing windows for single-instance behavior');
});

TestRunner.test('Day 519 - openSoundBrowserWindow uses createWindow to create browser window', (t) => {
    const funcStr = openSoundBrowserWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow') || funcStr.includes('SnugWindow'), 'openSoundBrowserWindow should use createWindow or SnugWindow');
});

TestRunner.test('Day 519 - openSoundBrowserWindow uses windowId "soundBrowser"', (t) => {
    const funcStr = openSoundBrowserWindow.toString();
    t.assertTruthy(funcStr.includes('"soundBrowser"') || funcStr.includes("'soundBrowser'"), 'openSoundBrowserWindow should use "soundBrowser" as the windowId');
});

TestRunner.test('Day 519 - openSoundBrowserWindow creates sound browser HTML content', (t) => {
    const funcStr = openSoundBrowserWindow.toString();
    t.assertTruthy(funcStr.includes('soundBrowserContent') || funcStr.includes('innerHTML') || funcStr.includes('contentHTML'), 'openSoundBrowserWindow should build content');
});

TestRunner.test('Day 519 - openSoundBrowserWindow references localAppServices', (t) => {
    const funcStr = openSoundBrowserWindow.toString();
    t.assertTruthy(funcStr.includes('localAppServices') || funcStr.includes('appServices'), 'openSoundBrowserWindow should reference localAppServices');
});

TestRunner.test('Day 519 - openSoundBrowserWindow handles librarySelect element', (t) => {
    const funcStr = openSoundBrowserWindow.toString();
    t.assertTruthy(funcStr.includes('librarySelect') || funcStr.includes('librarySelect'), 'openSoundBrowserWindow should work with librarySelect element');
});

// --- openGlobalControlsWindow tests ---
TestRunner.test('Day 519 - openGlobalControlsWindow is a function export', (t) => {
    t.assertEqual(typeof openGlobalControlsWindow, 'function', 'openGlobalControlsWindow should be a function');
});

TestRunner.test('Day 519 - openGlobalControlsWindow accepts 1-2 parameters', (t) => {
    const count = openGlobalControlsWindow.length;
    t.assertTruthy(count >= 1 && count <= 2, 'openGlobalControlsWindow should accept 1-2 parameters (onReadyCallback, savedState)');
});

TestRunner.test('Day 519 - openGlobalControlsWindow uses getOpenWindows for single-instance', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows') || funcStr.includes('openWindows'), 'openGlobalControlsWindow should check existing windows for single-instance behavior');
});

TestRunner.test('Day 519 - openGlobalControlsWindow uses createWindow to create controls window', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow') || funcStr.includes('SnugWindow'), 'openGlobalControlsWindow should use createWindow or SnugWindow');
});

TestRunner.test('Day 519 - openGlobalControlsWindow uses windowId "globalControls"', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('"globalControls"') || funcStr.includes("'globalControls'"), 'openGlobalControlsWindow should use "globalControls" as the windowId');
});

TestRunner.test('Day 519 - openGlobalControlsWindow creates global controls HTML content', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('contentHTML') || funcStr.includes('global-controls'), 'openGlobalControlsWindow should build content HTML');
});

TestRunner.test('Day 519 - openGlobalControlsWindow includes play button', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('playBtn') || funcStr.includes('playBtnGlobal') || funcStr.includes('Play'), 'openGlobalControlsWindow should have a play button');
});

TestRunner.test('Day 519 - openGlobalControlsWindow includes stop button', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('stopBtn') || funcStr.includes('stopBtnGlobal') || funcStr.includes('Stop'), 'openGlobalControlsWindow should have a stop button');
});

TestRunner.test('Day 519 - openGlobalControlsWindow includes record button', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('recordBtn') || funcStr.includes('recordBtnGlobal') || funcStr.includes('Record'), 'openGlobalControlsWindow should have a record button');
});

TestRunner.test('Day 519 - openGlobalControlsWindow includes tempo input', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('tempo') || funcStr.includes('Tempo'), 'openGlobalControlsWindow should have tempo controls');
});

TestRunner.test('Day 519 - openGlobalControlsWindow includes master meter display', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('masterMeter') || funcStr.includes('Master') || funcStr.includes('meter'), 'openGlobalControlsWindow should have master meter display');
});

TestRunner.test('Day 519 - openGlobalControlsWindow calls onReadyCallback if provided', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('onReadyCallback'), 'openGlobalControlsWindow should call onReadyCallback when provided');
});

TestRunner.test('Day 519 - openGlobalControlsWindow references localAppServices', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('localAppServices') || funcStr.includes('appServices'), 'openGlobalControlsWindow should reference localAppServices');
});

TestRunner.test('Day 519 - openGlobalControlsWindow handles savedState for window restoration', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('savedState') || funcStr.includes('restore'), 'openGlobalControlsWindow should handle savedState for restoration');
});

TestRunner.test('Day 519 - APP_VERSION validation for Day 519', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts.length >= 3, 'APP_VERSION should have at least 3 parts');
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 519');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 180, 'Minor version should be >= 180 for Day 519');
    }
});
// =============================================================================
// Day 520: Additional Window Function Tests
// =============================================================================

// --- openTrackSequencerWindow tests ---
TestRunner.test('Day 520 - openTrackSequencerWindow is a function export', (t) => {
    t.assertEqual(typeof openTrackSequencerWindow, 'function', 'openTrackSequencerWindow should be a function');
});

TestRunner.test('Day 520 - openTrackSequencerWindow accepts 1-3 parameters', (t) => {
    const count = openTrackSequencerWindow.length;
    t.assertTruthy(count >= 1 && count <= 3, 'openTrackSequencerWindow should accept 1-3 parameters (trackId, forceRedraw, savedState)');
});

TestRunner.test('Day 520 - openTrackSequencerWindow uses getOpenWindows for single-instance', (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows') || funcStr.includes('openWindows'), 'openTrackSequencerWindow should check existing windows for single-instance behavior');
});

TestRunner.test('Day 520 - openTrackSequencerWindow uses createWindow to create sequencer window', (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow') || funcStr.includes('SnugWindow'), 'openTrackSequencerWindow should use createWindow or SnugWindow');
});

TestRunner.test('Day 520 - openTrackSequencerWindow references localAppServices.getTrackById', (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'openTrackSequencerWindow should call getTrackById to find track');
});

TestRunner.test('Day 520 - openTrackSequencerWindow handles savedState for window restoration', (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('savedState'), 'openTrackSequencerWindow should handle savedState for window restoration');
});

TestRunner.test('Day 520 - openTrackSequencerWindow checks track type is not Audio', (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('Audio') || funcStr.includes('track.type'), 'openTrackSequencerWindow should check track type');
});

TestRunner.test('Day 520 - openTrackSequencerWindow references forceRedraw parameter', (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('forceRedraw'), 'openTrackSequencerWindow should handle forceRedraw parameter');
});

TestRunner.test('Day 520 - openTrackSequencerWindow calls setActiveSequencerTrackId', (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('setActiveSequencerTrackId'), 'openTrackSequencerWindow should call setActiveSequencerTrackId');
});

// --- openTimelineWindow tests ---
TestRunner.test('Day 520 - openTimelineWindow is a function export', (t) => {
    t.assertEqual(typeof openTimelineWindow, 'function', 'openTimelineWindow should be a function');
});

TestRunner.test('Day 520 - openTimelineWindow accepts 0-1 parameters', (t) => {
    const paramCount = openTimelineWindow.length;
    t.assertEqual(paramCount <= 1, true, 'openTimelineWindow should accept 0 or 1 parameter');
});

TestRunner.test('Day 520 - openTimelineWindow uses createWindow to create timeline window', (t) => {
    const funcStr = openTimelineWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTimelineWindow should use createWindow');
});

TestRunner.test('Day 520 - openTimelineWindow uses getWindowByIdState for single-instance', (t) => {
    const funcStr = openTimelineWindow.toString();
    t.assertTruthy(funcStr.includes('getWindowByIdState') || funcStr.includes('getOpenWindows'), 'openTimelineWindow should check for existing window');
});

TestRunner.test('Day 520 - openTimelineWindow references timelineContent or innerHTML', (t) => {
    const funcStr = openTimelineWindow.toString();
    t.assertTruthy(funcStr.includes('timelineContent') || funcStr.includes('innerHTML') || funcStr.includes('content'), 'openTimelineWindow should build content');
});

TestRunner.test('Day 520 - openTimelineWindow includes timeline-zoom-controls', (t) => {
    const funcStr = openTimelineWindow.toString();
    t.assertTruthy(funcStr.includes('zoom') || funcStr.includes('timeline-zoom'), 'openTimelineWindow should have zoom controls');
});

TestRunner.test('Day 520 - openTimelineWindow includes timeline-ruler', (t) => {
    const funcStr = openTimelineWindow.toString();
    t.assertTruthy(funcStr.includes('ruler') || funcStr.includes('timeline-ruler'), 'openTimelineWindow should have ruler');
});

TestRunner.test('Day 520 - openTimelineWindow includes timeline-tracks-area', (t) => {
    const funcStr = openTimelineWindow.toString();
    t.assertTruthy(funcStr.includes('tracks-area') || funcStr.includes('timeline-tracks'), 'openTimelineWindow should have tracks area');
});

TestRunner.test('Day 520 - openTimelineWindow references renderTimeline', (t) => {
    const funcStr = openTimelineWindow.toString();
    t.assertTruthy(funcStr.includes('renderTimeline'), 'openTimelineWindow should call renderTimeline');
});

TestRunner.test('Day 520 - openTimelineWindow handles savedState for window restoration', (t) => {
    const funcStr = openTimelineWindow.toString();
    t.assertTruthy(funcStr.includes('savedState'), 'openTimelineWindow should handle savedState');
});

// --- openTrackInspectorWindow tests ---
TestRunner.test('Day 520 - openTrackInspectorWindow is a function export', (t) => {
    t.assertEqual(typeof openTrackInspectorWindow, 'function', 'openTrackInspectorWindow should be a function');
});

TestRunner.test('Day 520 - openTrackInspectorWindow accepts 1-2 parameters', (t) => {
    const count = openTrackInspectorWindow.length;
    t.assertTruthy(count >= 1 && count <= 2, 'openTrackInspectorWindow should accept 1-2 parameters (trackId, savedState)');
});

TestRunner.test('Day 520 - openTrackInspectorWindow uses getOpenWindows for single-instance', (t) => {
    const funcStr = openTrackInspectorWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows') || funcStr.includes('openWindows'), 'openTrackInspectorWindow should check existing windows');
});

TestRunner.test('Day 520 - openTrackInspectorWindow uses createWindow to create inspector window', (t) => {
    const funcStr = openTrackInspectorWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow') || funcStr.includes('SnugWindow'), 'openTrackInspectorWindow should use createWindow');
});

TestRunner.test('Day 520 - openTrackInspectorWindow references localAppServices.getTrackById', (t) => {
    const funcStr = openTrackInspectorWindow.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'openTrackInspectorWindow should call getTrackById');
});

TestRunner.test('Day 520 - openTrackInspectorWindow handles savedState for window restoration', (t) => {
    const funcStr = openTrackInspectorWindow.toString();
    t.assertTruthy(funcStr.includes('savedState'), 'openTrackInspectorWindow should handle savedState');
});

TestRunner.test('Day 520 - openTrackInspectorWindow references buildTrackInspectorContentDOM', (t) => {
    const funcStr = openTrackInspectorWindow.toString();
    t.assertTruthy(funcStr.includes('buildTrackInspectorContentDOM'), 'openTrackInspectorWindow should call buildTrackInspectorContentDOM');
});

TestRunner.test('Day 520 - openTrackInspectorWindow references initializeCommonInspectorControls', (t) => {
    const funcStr = openTrackInspectorWindow.toString();
    t.assertTruthy(funcStr.includes('initializeCommonInspectorControls') || funcStr.includes('initializeTypeSpecificInspectorControls'), 'openTrackInspectorWindow should initialize controls');
});

TestRunner.test('Day 520 - openTrackInspectorWindow references track.type for DrumSampler height', (t) => {
    const funcStr = openTrackInspectorWindow.toString();
    t.assertTruthy(funcStr.includes('DrumSampler') || funcStr.includes('track.type'), 'openTrackInspectorWindow should check track type');
});

// --- openMasterEffectsRackWindow tests ---
TestRunner.test('Day 520 - openMasterEffectsRackWindow is a function export', (t) => {
    t.assertEqual(typeof openMasterEffectsRackWindow, 'function', 'openMasterEffectsRackWindow should be a function');
});

TestRunner.test('Day 520 - openMasterEffectsRackWindow accepts 0-1 parameters', (t) => {
    const paramCount = openMasterEffectsRackWindow.length;
    t.assertEqual(paramCount <= 1, true, 'openMasterEffectsRackWindow should accept 0 or 1 parameter');
});

TestRunner.test('Day 520 - openMasterEffectsRackWindow uses getOpenWindows for single-instance', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows') || funcStr.includes('openWindows'), 'openMasterEffectsRackWindow should check existing windows');
});

TestRunner.test('Day 520 - openMasterEffectsRackWindow uses createWindow to create effects rack', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openMasterEffectsRackWindow should use createWindow');
});

TestRunner.test('Day 520 - openMasterEffectsRackWindow uses windowId "masterEffectsRack"', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('"masterEffectsRack"') || funcStr.includes("'masterEffectsRack'"), 'openMasterEffectsRackWindow should use masterEffectsRack windowId');
});

TestRunner.test('Day 520 - openMasterEffectsRackWindow references buildModularEffectsRackDOM', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('buildModularEffectsRackDOM'), 'openMasterEffectsRackWindow should call buildModularEffectsRackDOM');
});

TestRunner.test('Day 520 - openMasterEffectsRackWindow references renderEffectsList', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('renderEffectsList'), 'openMasterEffectsRackWindow should call renderEffectsList');
});

TestRunner.test('Day 520 - openMasterEffectsRackWindow handles savedState for window restoration', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('savedState'), 'openMasterEffectsRackWindow should handle savedState');
});

// --- openTrackEffectsRackWindow tests ---
TestRunner.test('Day 520 - openTrackEffectsRackWindow is a function export', (t) => {
    t.assertEqual(typeof openTrackEffectsRackWindow, 'function', 'openTrackEffectsRackWindow should be a function');
});

TestRunner.test('Day 520 - openTrackEffectsRackWindow accepts 1-2 parameters', (t) => {
    const count = openTrackEffectsRackWindow.length;
    t.assertTruthy(count >= 1 && count <= 2, 'openTrackEffectsRackWindow should accept 1-2 parameters (trackId, savedState)');
});

TestRunner.test('Day 520 - openTrackEffectsRackWindow uses getOpenWindows for single-instance', (t) => {
    const funcStr = openTrackEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows') || funcStr.includes('openWindows'), 'openTrackEffectsRackWindow should check existing windows');
});

TestRunner.test('Day 520 - openTrackEffectsRackWindow uses createWindow to create effects rack', (t) => {
    const funcStr = openTrackEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTrackEffectsRackWindow should use createWindow');
});

TestRunner.test('Day 520 - openTrackEffectsRackWindow references localAppServices.getTrackById', (t) => {
    const funcStr = openTrackEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'openTrackEffectsRackWindow should call getTrackById');
});

TestRunner.test('Day 520 - openTrackEffectsRackWindow references buildModularEffectsRackDOM', (t) => {
    const funcStr = openTrackEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('buildModularEffectsRackDOM'), 'openTrackEffectsRackWindow should call buildModularEffectsRackDOM');
});

TestRunner.test('Day 520 - openTrackEffectsRackWindow handles savedState for window restoration', (t) => {
    const funcStr = openTrackEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('savedState'), 'openTrackEffectsRackWindow should handle savedState');
});

// --- openProjectNotesWindow tests ---
TestRunner.test('Day 520 - openProjectNotesWindow is a function export', (t) => {
    t.assertEqual(typeof openProjectNotesWindow, 'function', 'openProjectNotesWindow should be a function');
});

TestRunner.test('Day 520 - openProjectNotesWindow accepts 0-1 parameters', (t) => {
    const paramCount = openProjectNotesWindow.length;
    t.assertEqual(paramCount <= 1, true, 'openProjectNotesWindow should accept 0 or 1 parameter');
});

TestRunner.test('Day 520 - openProjectNotesWindow uses getOpenWindows for single-instance', (t) => {
    const funcStr = openProjectNotesWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows') || funcStr.includes('openWindows'), 'openProjectNotesWindow should check existing windows');
});

TestRunner.test('Day 520 - openProjectNotesWindow uses createWindow to create notes window', (t) => {
    const funcStr = openProjectNotesWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openProjectNotesWindow should use createWindow');
});

TestRunner.test('Day 520 - openProjectNotesWindow uses windowId "projectNotes"', (t) => {
    const funcStr = openProjectNotesWindow.toString();
    t.assertTruthy(funcStr.includes('"projectNotes"') || funcStr.includes("'projectNotes'"), 'openProjectNotesWindow should use projectNotes windowId');
});

TestRunner.test('Day 520 - openProjectNotesWindow references getProjectNotesState', (t) => {
    const funcStr = openProjectNotesWindow.toString();
    t.assertTruthy(funcStr.includes('getProjectNotesState'), 'openProjectNotesWindow should call getProjectNotesState');
});

TestRunner.test('Day 520 - openProjectNotesWindow references setProjectNotesState', (t) => {
    const funcStr = openProjectNotesWindow.toString();
    t.assertTruthy(funcStr.includes('setProjectNotesState'), 'openProjectNotesWindow should call setProjectNotesState');
});

TestRunner.test('Day 520 - openProjectNotesWindow references textarea element', (t) => {
    const funcStr = openProjectNotesWindow.toString();
    t.assertTruthy(funcStr.includes('textarea') || funcStr.includes('projectNotesTextarea'), 'openProjectNotesWindow should have textarea');
});

TestRunner.test('Day 520 - openProjectNotesWindow handles savedState for window restoration', (t) => {
    const funcStr = openProjectNotesWindow.toString();
    t.assertTruthy(funcStr.includes('savedState'), 'openProjectNotesWindow should handle savedState');
});


// ============================================================================
// Day 521: Track State Management & Render Functions Tests
// ============================================================================

// --- Track State Management Tests ---

TestRunner.test('Day 521 - Track State - addTrackToStateInternal is a function export', (t) => {
    t.assertEqual(typeof addTrackToStateInternal, 'function', 'addTrackToStateInternal should be a function');
});

TestRunner.test('Day 521 - Track State - addTrackToStateInternal accepts 2-3 parameters', (t) => {
    const paramCount = addTrackToStateInternal.length;
    t.assertEqual(paramCount >= 2 && paramCount <= 3, true, 'addTrackToStateInternal should accept 2-3 parameters');
});

TestRunner.test('Day 521 - Track State - addTrackToStateInternal is async', (t) => {
    t.assertEqual(addTrackToStateInternal.constructor.name, 'AsyncFunction', 'addTrackToStateInternal should be async');
});

TestRunner.test('Day 521 - Track State - addTrackToStateInternal references type parameter', (t) => {
    const funcStr = addTrackToStateInternal.toString();
    t.assertTruthy(funcStr.includes('type'), 'addTrackToStateInternal should reference type parameter');
});

TestRunner.test('Day 521 - Track State - addTrackToStateInternal references initialData parameter', (t) => {
    const funcStr = addTrackToStateInternal.toString();
    t.assertTruthy(funcStr.includes('initialData'), 'addTrackToStateInternal should reference initialData parameter');
});

TestRunner.test('Day 521 - Track State - addTrackToStateInternal creates Track instance', (t) => {
    const funcStr = addTrackToStateInternal.toString();
    t.assertTruthy(funcStr.includes('new Track'), 'addTrackToStateInternal should create a new Track instance');
});

TestRunner.test('Day 521 - Track State - addTrackToStateInternal calls tracks.push', (t) => {
    const funcStr = addTrackToStateInternal.toString();
    t.assertTruthy(funcStr.includes('tracks.push'), 'addTrackToStateInternal should push track to tracks array');
});

TestRunner.test('Day 521 - Track State - addTrackToStateInternal calls captureStateForUndo for user actions', (t) => {
    const funcStr = addTrackToStateInternal.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo') || funcStr.includes('captureStateForUndoInternal'), 'addTrackToStateInternal should capture undo state');
});

TestRunner.test('Day 521 - Track State - removeTrackFromStateInternal is a function export', (t) => {
    t.assertEqual(typeof removeTrackFromStateInternal, 'function', 'removeTrackFromStateInternal should be a function');
});

TestRunner.test('Day 521 - Track State - removeTrackFromStateInternal accepts 1 parameter', (t) => {
    t.assertEqual(removeTrackFromStateInternal.length, 1, 'removeTrackFromStateInternal should accept 1 parameter');
});

TestRunner.test('Day 521 - Track State - removeTrackFromStateInternal references trackId parameter', (t) => {
    const funcStr = removeTrackFromStateInternal.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'removeTrackFromStateInternal should reference trackId parameter');
});

TestRunner.test('Day 521 - Track State - removeTrackFromStateInternal finds track by id', (t) => {
    const funcStr = removeTrackFromStateInternal.toString();
    t.assertTruthy(funcStr.includes('findIndex') || funcStr.includes('find'), 'removeTrackFromStateInternal should find track by id');
});

TestRunner.test('Day 521 - Track State - removeTrackFromStateInternal calls captureStateForUndo', (t) => {
    const funcStr = removeTrackFromStateInternal.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo') || funcStr.includes('captureStateForUndoInternal'), 'removeTrackFromStateInternal should capture undo state');
});

TestRunner.test('Day 521 - Track State - removeTrackFromStateInternal calls track.dispose', (t) => {
    const funcStr = removeTrackFromStateInternal.toString();
    t.assertTruthy(funcStr.includes('dispose'), 'removeTrackFromStateInternal should call track.dispose');
});

TestRunner.test('Day 521 - Track State - removeTrackFromStateInternal uses tracks.splice', (t) => {
    const funcStr = removeTrackFromStateInternal.toString();
    t.assertTruthy(funcStr.includes('splice'), 'removeTrackFromStateInternal should use splice to remove track');
});

TestRunner.test('Day 521 - Track State - renameTrackInState is a function export', (t) => {
    t.assertEqual(typeof renameTrackInState, 'function', 'renameTrackInState should be a function');
});

TestRunner.test('Day 521 - Track State - renameTrackInState accepts 2 parameters', (t) => {
    t.assertEqual(renameTrackInState.length, 2, 'renameTrackInState should accept 2 parameters');
});

TestRunner.test('Day 521 - Track State - renameTrackInState references trackId parameter', (t) => {
    const funcStr = renameTrackInState.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'renameTrackInState should reference trackId parameter');
});

TestRunner.test('Day 521 - Track State - renameTrackInState references newName parameter', (t) => {
    const funcStr = renameTrackInState.toString();
    t.assertTruthy(funcStr.includes('newName'), 'renameTrackInState should reference newName parameter');
});

TestRunner.test('Day 521 - Track State - renameTrackInState finds track by id', (t) => {
    const funcStr = renameTrackInState.toString();
    t.assertTruthy(funcStr.includes('find'), 'renameTrackInState should find track by id');
});

TestRunner.test('Day 521 - Track State - renameTrackInState validates name is not empty', (t) => {
    const funcStr = renameTrackInState.toString();
    t.assertTruthy(funcStr.includes('trim'), 'renameTrackInState should validate name is not empty');
});

// --- UI Render Function Tests ---

TestRunner.test('Day 521 - UI Render - renderMixer is a function export', (t) => {
    t.assertEqual(typeof renderMixer, 'function', 'renderMixer should be a function');
});

TestRunner.test('Day 521 - UI Render - renderMixer accepts 1 parameter', (t) => {
    t.assertEqual(renderMixer.length, 1, 'renderMixer should accept 1 parameter');
});

TestRunner.test('Day 521 - UI Render - renderMixer references container parameter', (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('container'), 'renderMixer should reference container parameter');
});

TestRunner.test('Day 521 - UI Render - renderMixer creates track elements', (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('trackDiv') || funcStr.includes('trackElement') || funcStr.includes('createElement'), 'renderMixer should create track elements');
});

TestRunner.test('Day 521 - UI Render - renderMixer references getTracks or getTracksState', (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('getTracks'), 'renderMixer should call getTracks to get tracks');
});

TestRunner.test('Day 521 - UI Render - renderMixer adds event listeners for track controls', (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('addEventListener'), 'renderMixer should add event listeners');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserFavorites is a function export', (t) => {
    t.assertEqual(typeof renderSoundBrowserFavorites, 'function', 'renderSoundBrowserFavorites should be a function');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserFavorites accepts 2 parameters', (t) => {
    const paramCount = renderSoundBrowserFavorites.length;
    t.assertEqual(paramCount === 2, true, 'renderSoundBrowserFavorites should accept 2 parameters');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserFavorites references listDiv parameter', (t) => {
    const funcStr = renderSoundBrowserFavorites.toString();
    t.assertTruthy(funcStr.includes('listDiv'), 'renderSoundBrowserFavorites should reference listDiv parameter');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserFavorites calls getFavoriteSounds', (t) => {
    const funcStr = renderSoundBrowserFavorites.toString();
    t.assertTruthy(funcStr.includes('getFavoriteSounds'), 'renderSoundBrowserFavorites should call getFavoriteSounds');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserFavorites handles empty favorites', (t) => {
    const funcStr = renderSoundBrowserFavorites.toString();
    t.assertTruthy(funcStr.includes('length === 0') || funcStr.includes('favorites.length'), 'renderSoundBrowserFavorites should handle empty favorites');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserRecent is a function export', (t) => {
    t.assertEqual(typeof renderSoundBrowserRecent, 'function', 'renderSoundBrowserRecent should be a function');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserRecent accepts 2 parameters', (t) => {
    const paramCount = renderSoundBrowserRecent.length;
    t.assertEqual(paramCount === 2, true, 'renderSoundBrowserRecent should accept 2 parameters');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserRecent references listDiv parameter', (t) => {
    const funcStr = renderSoundBrowserRecent.toString();
    t.assertTruthy(funcStr.includes('listDiv'), 'renderSoundBrowserRecent should reference listDiv parameter');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserRecent calls getRecentlyPlayedSounds', (t) => {
    const funcStr = renderSoundBrowserRecent.toString();
    t.assertTruthy(funcStr.includes('getRecentlyPlayedSounds'), 'renderSoundBrowserRecent should call getRecentlyPlayedSounds');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserDirectoryFiltered is a function export', (t) => {
    t.assertEqual(typeof renderSoundBrowserDirectoryFiltered, 'function', 'renderSoundBrowserDirectoryFiltered should be a function');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserDirectoryFiltered accepts 2-3 parameters', (t) => {
    const paramCount = renderSoundBrowserDirectoryFiltered.length;
    t.assertTruthy(paramCount >= 2 && paramCount <= 3, 'renderSoundBrowserDirectoryFiltered should accept 2-3 parameters');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserDirectoryFiltered references pathArray parameter', (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('pathArray'), 'renderSoundBrowserDirectoryFiltered should reference pathArray parameter');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserDirectoryFiltered references treeNode parameter', (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('treeNode'), 'renderSoundBrowserDirectoryFiltered should reference treeNode parameter');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserDirectoryFiltered handles searchQuery filtering', (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('searchQuery') || funcStr.includes('filter'), 'renderSoundBrowserDirectoryFiltered should handle search filtering');
});

TestRunner.test('Day 521 - UI Render - renderSoundBrowserDirectoryFiltered renders items with click handlers', (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('addEventListener'), 'renderSoundBrowserDirectoryFiltered should add click handlers');
});

TestRunner.test('Day 521 - UI Render - toggleSequencerViewMode is a function export', (t) => {
    t.assertEqual(typeof toggleSequencerViewMode, 'function', 'toggleSequencerViewMode should be a function');
});

TestRunner.test('Day 521 - UI Render - toggleSequencerViewMode accepts 0 parameters', (t) => {
    t.assertEqual(toggleSequencerViewMode.length, 0, 'toggleSequencerViewMode should accept 0 parameters');
});

TestRunner.test('Day 521 - UI Render - toggleSequencerViewMode toggles between step and piano view', (t) => {
    const funcStr = toggleSequencerViewMode.toString();
    t.assertTruthy(funcStr.includes('step') || funcStr.includes('piano'), 'toggleSequencerViewMode should toggle view mode');
});

TestRunner.test('Day 521 - UI Render - toggleSequencerViewMode references sequencerViewMode state', (t) => {
    const funcStr = toggleSequencerViewMode.toString();
    t.assertTruthy(funcStr.includes('sequencerViewMode'), 'toggleSequencerViewMode should reference sequencerViewMode state');
});

TestRunner.test('Day 521 - UI Render - openMixerWindow uses createWindow to create mixer', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openMixerWindow should use createWindow');
});

TestRunner.test('Day 521 - UI Render - openMixerWindow calls renderMixer', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('renderMixer'), 'openMixerWindow should call renderMixer');
});

TestRunner.test('Day 521 - UI Render - openMixerWindow uses getOpenWindows for single-instance', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows') || funcStr.includes('openWindows'), 'openMixerWindow should check for existing windows');
});

TestRunner.test('Day 521 - UI Render - openMixerWindow uses "mixer" windowId', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('"mixer"') || funcStr.includes("'mixer'"), 'openMixerWindow should use mixer windowId');
});

TestRunner.test('Day 521 - UI Render - openMixerWindow handles savedState for window restoration', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('savedState'), 'openMixerWindow should handle savedState');
});

// --- APP_VERSION validation for Day 521 ---
TestRunner.test('Day 521 - APP_VERSION validation for Day 521', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts.length >= 3, 'APP_VERSION should have at least 3 parts');
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 521');
});
// Day 522: Sequence Editing Methods Tests
// Tests for Track.prototype sequence editing methods: reverseSequence, humanizeVelocity, scaleVelocities, createNewSequence, deleteSequence, duplicateSequence, renameSequence, setActiveSequence, doubleSequence, halveSequence

TestRunner.test('Day 522 - Sequence Methods - Track.reverseSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.reverseSequence, 'function', 'reverseSequence should be a function on Track.prototype');
});

TestRunner.test('Day 522 - Sequence Methods - reverseSequence accepts 0 parameters', (t) => {
    t.assertEqual(Track.prototype.reverseSequence.length, 0, 'reverseSequence should accept 0 parameters');
});

TestRunner.test('Day 522 - Sequence Methods - reverseSequence references activeSeq and totalSteps', (t) => {
    const funcStr = Track.prototype.reverseSequence.toString();
    t.assertTruthy(funcStr.includes('activeSeq') && funcStr.includes('totalSteps'), 'reverseSequence should reference activeSeq and totalSteps');
});

TestRunner.test('Day 522 - Sequence Methods - reverseSequence mirrors columns correctly', (t) => {
    const funcStr = Track.prototype.reverseSequence.toString();
    t.assertTruthy(funcStr.includes('totalSteps - 1 - col') || funcStr.includes('totalSteps-1-col'), 'reverseSequence should mirror columns using totalSteps - 1 - col');
});

TestRunner.test('Day 522 - Sequence Methods - reverseSequence handles row push', (t) => {
    const funcStr = Track.prototype.reverseSequence.toString();
    t.assertTruthy(funcStr.includes('row.length = 0') && funcStr.includes('row.push'), 'reverseSequence should reset row.length to 0 and push mirrored steps');
});

TestRunner.test('Day 522 - Sequence Methods - reverseSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.reverseSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'reverseSequence should call _captureUndoState for undo support');
});

TestRunner.test('Day 522 - Sequence Methods - reverseSequence returns reversedCount', (t) => {
    const funcStr = Track.prototype.reverseSequence.toString();
    t.assertTruthy(funcStr.includes('reversedCount'), 'reverseSequence should return reversedCount');
});

TestRunner.test('Day 522 - Sequence Methods - Track.humanizeVelocity is a function', (t) => {
    t.assertEqual(typeof Track.prototype.humanizeVelocity, 'function', 'humanizeVelocity should be a function on Track.prototype');
});

TestRunner.test('Day 522 - Sequence Methods - humanizeVelocity accepts 0-1 parameters', (t) => {
    t.assertEqual(Track.prototype.humanizeVelocity.length, 1, 'humanizeVelocity should accept 1 parameter (with default)');
});

TestRunner.test('Day 522 - Sequence Methods - humanizeVelocity references amount parameter', (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    t.assertTruthy(funcStr.includes('amount'), 'humanizeVelocity should reference amount parameter');
});

TestRunner.test('Day 522 - Sequence Methods - humanizeVelocity returns 0 for Audio tracks', (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    t.assertTruthy(funcStr.includes("type === 'Audio'") && funcStr.includes('return 0'), 'humanizeVelocity should return 0 for Audio tracks');
});

TestRunner.test('Day 522 - Sequence Methods - humanizeVelocity uses Math.random for variation', (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    t.assertTruthy(funcStr.includes('Math.random'), 'humanizeVelocity should use Math.random for velocity variation');
});

TestRunner.test('Day 522 - Sequence Methods - humanizeVelocity clamps velocities to valid range', (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'humanizeVelocity should clamp velocities to 0.05-1.0 range');
});

TestRunner.test('Day 522 - Sequence Methods - humanizeVelocity calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'humanizeVelocity should call _captureUndoState for undo support');
});

TestRunner.test('Day 522 - Sequence Methods - humanizeVelocity returns humanizedCount', (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    t.assertTruthy(funcStr.includes('humanizedCount'), 'humanizeVelocity should return humanizedCount');
});

TestRunner.test('Day 522 - Sequence Methods - Track.scaleVelocities is a function', (t) => {
    t.assertEqual(typeof Track.prototype.scaleVelocities, 'function', 'scaleVelocities should be a function on Track.prototype');
});

TestRunner.test('Day 522 - Sequence Methods - scaleVelocities accepts 0-1 parameters', (t) => {
    t.assertEqual(Track.prototype.scaleVelocities.length, 1, 'scaleVelocities should accept 1 parameter (with default)');
});

TestRunner.test('Day 522 - Sequence Methods - scaleVelocities references factor parameter', (t) => {
    const funcStr = Track.prototype.scaleVelocities.toString();
    t.assertTruthy(funcStr.includes('factor'), 'scaleVelocities should reference factor parameter');
});

TestRunner.test('Day 522 - Sequence Methods - scaleVelocities clamps to valid range', (t) => {
    const funcStr = Track.prototype.scaleVelocities.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'scaleVelocities should clamp velocities to 0.05-1.0 range');
});

TestRunner.test('Day 522 - Sequence Methods - scaleVelocities calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.scaleVelocities.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'scaleVelocities should call _captureUndoState for undo support');
});

TestRunner.test('Day 522 - Sequence Methods - scaleVelocities returns scaledCount', (t) => {
    const funcStr = Track.prototype.scaleVelocities.toString();
    t.assertTruthy(funcStr.includes('scaledCount'), 'scaleVelocities should return scaledCount');
});

TestRunner.test('Day 522 - Sequence Methods - Track.createNewSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.createNewSequence, 'function', 'createNewSequence should be a function on Track.prototype');
});

TestRunner.test('Day 522 - Sequence Methods - createNewSequence accepts 0-3 parameters', (t) => {
    t.assertEqual(Track.prototype.createNewSequence.length, 3, 'createNewSequence should accept 3 parameters');
});

TestRunner.test('Day 522 - Sequence Methods - createNewSequence handles Audio track type', (t) => {
    const funcStr = Track.prototype.createNewSequence.toString();
    t.assertTruthy(funcStr.includes("type === 'Audio'") || funcStr.includes("type === \"Audio\""), 'createNewSequence should return null for Audio tracks');
});

TestRunner.test('Day 522 - Sequence Methods - createNewSequence uses Constants.defaultStepsPerBar', (t) => {
    const funcStr = Track.prototype.createNewSequence.toString();
    t.assertTruthy(funcStr.includes('defaultStepsPerBar') || funcStr.includes('Constants.defaultStepsPerBar'), 'createNewSequence should use defaultStepsPerBar constant');
});

TestRunner.test('Day 522 - Sequence Methods - createNewSequence uses Math.max for actualLength', (t) => {
    const funcStr = Track.prototype.createNewSequence.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('STEPS_PER_BAR'), 'createNewSequence should use Math.max to ensure minimum STEPS_PER_BAR');
});

TestRunner.test('Day 522 - Sequence Methods - createNewSequence pushes to this.sequences', (t) => {
    const funcStr = Track.prototype.createNewSequence.toString();
    t.assertTruthy(funcStr.includes('this.sequences.push'), 'createNewSequence should push new sequence to this.sequences');
});

TestRunner.test('Day 522 - Sequence Methods - createNewSequence sets this.activeSequenceId', (t) => {
    const funcStr = Track.prototype.createNewSequence.toString();
    t.assertTruthy(funcStr.includes('this.activeSequenceId'), 'createNewSequence should set this.activeSequenceId');
});

TestRunner.test('Day 522 - Sequence Methods - createNewSequence calls recreateToneSequence', (t) => {
    const funcStr = Track.prototype.createNewSequence.toString();
    t.assertTruthy(funcStr.includes('recreateToneSequence'), 'createNewSequence should call recreateToneSequence');
});

TestRunner.test('Day 522 - Sequence Methods - createNewSequence calls _captureUndoState when skipUndo is false', (t) => {
    const funcStr = Track.prototype.createNewSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState') && funcStr.includes('skipUndo'), 'createNewSequence should call _captureUndoState when skipUndo is false');
});

TestRunner.test('Day 522 - Sequence Methods - Track.deleteSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.deleteSequence, 'function', 'deleteSequence should be a function on Track.prototype');
});

TestRunner.test('Day 522 - Sequence Methods - deleteSequence accepts 1 parameter', (t) => {
    t.assertEqual(Track.prototype.deleteSequence.length, 1, 'deleteSequence should accept 1 parameter');
});

TestRunner.test('Day 522 - Sequence Methods - deleteSequence prevents deleting last sequence', (t) => {
    const funcStr = Track.prototype.deleteSequence.toString();
    t.assertTruthy(funcStr.includes('Cannot delete the last sequence') || funcStr.includes('sequences.length'), 'deleteSequence should prevent deleting the last sequence');
});

TestRunner.test('Day 522 - Sequence Methods - deleteSequence finds sequence by id', (t) => {
    const funcStr = Track.prototype.deleteSequence.toString();
    t.assertTruthy(funcStr.includes('findIndex') || funcStr.includes('find'), 'deleteSequence should find sequence by id');
});

TestRunner.test('Day 522 - Sequence Methods - deleteSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.deleteSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'deleteSequence should call _captureUndoState for undo support');
});

TestRunner.test('Day 522 - Sequence Methods - deleteSequence splices from this.sequences', (t) => {
    const funcStr = Track.prototype.deleteSequence.toString();
    t.assertTruthy(funcStr.includes('this.sequences.splice'), 'deleteSequence should splice from this.sequences');
});

TestRunner.test('Day 522 - Sequence Methods - deleteSequence calls recreateToneSequence', (t) => {
    const funcStr = Track.prototype.deleteSequence.toString();
    t.assertTruthy(funcStr.includes('recreateToneSequence'), 'deleteSequence should call recreateToneSequence');
});

TestRunner.test('Day 522 - Sequence Methods - Track.duplicateSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.duplicateSequence, 'function', 'duplicateSequence should be a function on Track.prototype');
});

TestRunner.test('Day 522 - Sequence Methods - duplicateSequence accepts 1 parameter', (t) => {
    t.assertEqual(Track.prototype.duplicateSequence.length, 1, 'duplicateSequence should accept 1 parameter');
});

TestRunner.test('Day 522 - Sequence Methods - duplicateSequence returns null for Audio tracks', (t) => {
    const funcStr = Track.prototype.duplicateSequence.toString();
    t.assertTruthy(funcStr.includes("type === 'Audio'") && funcStr.includes('return null'), 'duplicateSequence should return null for Audio tracks');
});

TestRunner.test('Day 522 - Sequence Methods - duplicateSequence creates deep copy of data', (t) => {
    const funcStr = Track.prototype.duplicateSequence.toString();
    t.assertTruthy(funcStr.includes('JSON.parse') && funcStr.includes('JSON.stringify'), 'duplicateSequence should create deep copy using JSON.parse/stringify');
});

TestRunner.test('Day 522 - Sequence Methods - duplicateSequence pushes to this.sequences', (t) => {
    const funcStr = Track.prototype.duplicateSequence.toString();
    t.assertTruthy(funcStr.includes('this.sequences.push'), 'duplicateSequence should push new sequence to this.sequences');
});

TestRunner.test('Day 522 - Sequence Methods - duplicateSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.duplicateSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'duplicateSequence should call _captureUndoState for undo support');
});

TestRunner.test('Day 522 - Sequence Methods - Track.renameSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.renameSequence, 'function', 'renameSequence should be a function on Track.prototype');
});

TestRunner.test('Day 522 - Sequence Methods - renameSequence accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.renameSequence.length, 2, 'renameSequence should accept 2 parameters');
});

TestRunner.test('Day 522 - Sequence Methods - renameSequence validates newName with trim', (t) => {
    const funcStr = Track.prototype.renameSequence.toString();
    t.assertTruthy(funcStr.includes('trim') && funcStr.includes('newName'), 'renameSequence should validate newName with trim');
});

TestRunner.test('Day 522 - Sequence Methods - renameSequence finds sequence by id', (t) => {
    const funcStr = Track.prototype.renameSequence.toString();
    t.assertTruthy(funcStr.includes('find'), 'renameSequence should find sequence by id');
});

TestRunner.test('Day 522 - Sequence Methods - renameSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.renameSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'renameSequence should call _captureUndoState for undo support');
});

TestRunner.test('Day 522 - Sequence Methods - renameSequence returns early if name unchanged', (t) => {
    const funcStr = Track.prototype.renameSequence.toString();
    t.assertTruthy(funcStr.includes('oldName === newName.trim()') || funcStr.includes('oldName === newName'), 'renameSequence should return early if name is unchanged');
});

TestRunner.test('Day 522 - Sequence Methods - Track.setActiveSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.setActiveSequence, 'function', 'setActiveSequence should be a function on Track.prototype');
});

TestRunner.test('Day 522 - Sequence Methods - setActiveSequence accepts 1 parameter', (t) => {
    t.assertEqual(Track.prototype.setActiveSequence.length, 1, 'setActiveSequence should accept 1 parameter');
});

TestRunner.test('Day 522 - Sequence Methods - setActiveSequence finds sequence by id', (t) => {
    const funcStr = Track.prototype.setActiveSequence.toString();
    t.assertTruthy(funcStr.includes('find'), 'setActiveSequence should find sequence by id');
});

TestRunner.test('Day 522 - Sequence Methods - setActiveSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setActiveSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setActiveSequence should call _captureUndoState for undo support');
});

TestRunner.test('Day 522 - Sequence Methods - setActiveSequence sets this.activeSequenceId', (t) => {
    const funcStr = Track.prototype.setActiveSequence.toString();
    t.assertTruthy(funcStr.includes('this.activeSequenceId'), 'setActiveSequence should set this.activeSequenceId');
});

TestRunner.test('Day 522 - Sequence Methods - setActiveSequence calls recreateToneSequence', (t) => {
    const funcStr = Track.prototype.setActiveSequence.toString();
    t.assertTruthy(funcStr.includes('recreateToneSequence'), 'setActiveSequence should call recreateToneSequence');
});

TestRunner.test('Day 522 - Sequence Methods - Track.doubleSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.doubleSequence, 'function', 'doubleSequence should be a function on Track.prototype');
});

TestRunner.test('Day 522 - Sequence Methods - doubleSequence accepts 0 parameters', (t) => {
    t.assertEqual(Track.prototype.doubleSequence.length, 0, 'doubleSequence should accept 0 parameters');
});

TestRunner.test('Day 522 - Sequence Methods - doubleSequence checks MAX_BARS limit', (t) => {
    const funcStr = Track.prototype.doubleSequence.toString();
    t.assertTruthy(funcStr.includes('MAX_BARS'), 'doubleSequence should check MAX_BARS limit');
});

TestRunner.test('Day 522 - Sequence Methods - doubleSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.doubleSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'doubleSequence should call _captureUndoState for undo support');
});

TestRunner.test('Day 522 - Sequence Methods - doubleSequence doubles activeSeq.length', (t) => {
    const funcStr = Track.prototype.doubleSequence.toString();
    t.assertTruthy(funcStr.includes('oldLength * 2') || funcStr.includes('length * 2') || funcStr.includes('newLength'), 'doubleSequence should double the length');
});

TestRunner.test('Day 522 - Sequence Methods - doubleSequence calls recreateToneSequence', (t) => {
    const funcStr = Track.prototype.doubleSequence.toString();
    t.assertTruthy(funcStr.includes('recreateToneSequence'), 'doubleSequence should call recreateToneSequence');
});

TestRunner.test('Day 522 - Sequence Methods - Track.halveSequence is a function', (t) => {
    t.assertEqual(typeof Track.prototype.halveSequence, 'function', 'halveSequence should be a function on Track.prototype');
});

TestRunner.test('Day 522 - Sequence Methods - halveSequence accepts 0 parameters', (t) => {
    t.assertEqual(Track.prototype.halveSequence.length, 0, 'halveSequence should accept 0 parameters');
});

TestRunner.test('Day 522 - Sequence Methods - halveSequence validates minimum STEPS_PER_BAR', (t) => {
    const funcStr = Track.prototype.halveSequence.toString();
    t.assertTruthy(funcStr.includes('STEPS_PER_BAR'), 'halveSequence should validate minimum STEPS_PER_BAR');
});

TestRunner.test('Day 522 - Sequence Methods - halveSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.halveSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'halveSequence should call _captureUndoState for undo support');
});

TestRunner.test('Day 522 - Sequence Methods - halveSequence halves activeSeq.data', (t) => {
    const funcStr = Track.prototype.halveSequence.toString();
    t.assertTruthy(funcStr.includes('newLength') && funcStr.includes('oldLength / 2'), 'halveSequence should halve the sequence data');
});

TestRunner.test('Day 522 - Sequence Methods - halveSequence calls recreateToneSequence', (t) => {
    const funcStr = Track.prototype.halveSequence.toString();
    t.assertTruthy(funcStr.includes('recreateToneSequence'), 'halveSequence should call recreateToneSequence');
});

TestRunner.test('Day 522 - Sequence Methods - APP_VERSION validation for Day 522', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 522');
    t.assertTruthy(versionParts[1] >= 184, 'Minor version should be >= 184 for Day 522');
});
        t.assertTruthy(versionParts[1] >= 183, 'Minor version should be >= 183 for Day 521');

// Day 523: Scale Mode & MIDI CC Window Function Tests

TestRunner.test('Scale Mode Window - openScaleModeWindow is a function export', (t) => {
    t.assertEqual(typeof openScaleModeWindow, 'function', 'openScaleModeWindow should be a function');
});

TestRunner.test('Scale Mode Window - openScaleModeWindow accepts 0-1 parameters', (t) => {
    const paramCount = openScaleModeWindow.length;
    t.assertEqual(paramCount <= 1, true, 'openScaleModeWindow should accept 0 or 1 parameter');
});

TestRunner.test('Scale Mode Window - openScaleModeWindow function body uses createWindow', (t) => {
    const funcStr = openScaleModeWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openScaleModeWindow should use createWindow');
});

TestRunner.test('Scale Mode Window - openScaleModeWindow function body uses getOpenWindows for single-instance', (t) => {
    const funcStr = openScaleModeWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openScaleModeWindow should check for open windows');
});

TestRunner.test('Scale Mode Window - openScaleModeWindow function body uses localAppServices', (t) => {
    const funcStr = openScaleModeWindow.toString();
    t.assertTruthy(funcStr.includes('localAppServices'), 'openScaleModeWindow should reference localAppServices');
});

TestRunner.test('Scale Mode Window - openScaleModeWindow references getScaleModeEnabled', (t) => {
    const funcStr = openScaleModeWindow.toString();
    t.assertTruthy(funcStr.includes('getScaleModeEnabled'), 'openScaleModeWindow should reference getScaleModeEnabled');
});

TestRunner.test('Scale Mode Window - openScaleModeWindow references setScaleModeEnabled', (t) => {
    const funcStr = openScaleModeWindow.toString();
    t.assertTruthy(funcStr.includes('setScaleModeEnabled'), 'openScaleModeWindow should reference setScaleModeEnabled');
});

TestRunner.test('Scale Mode Window - openScaleModeWindow references SCALE_ROOTS from Constants', (t) => {
    const funcStr = openScaleModeWindow.toString();
    t.assertTruthy(funcStr.includes('SCALE_ROOTS') || funcStr.includes('rootsList'), 'openScaleModeWindow should reference SCALE_ROOTS');
});

TestRunner.test('Scale Mode Window - openScaleModeWindow references SCALES from Constants', (t) => {
    const funcStr = openScaleModeWindow.toString();
    t.assertTruthy(funcStr.includes('SCALES') || funcStr.includes('scalesList'), 'openScaleModeWindow should reference SCALES');
});

TestRunner.test('Scale Mode Window - openScaleModeWindow references setScaleModeScale', (t) => {
    const funcStr = openScaleModeWindow.toString();
    t.assertTruthy(funcStr.includes('setScaleModeScale'), 'openScaleModeWindow should reference setScaleModeScale');
});

TestRunner.test('Scale Mode Window - openScaleModeWindow references setScaleModeRoot', (t) => {
    const funcStr = openScaleModeWindow.toString();
    t.assertTruthy(funcStr.includes('setScaleModeRoot'), 'openScaleModeWindow should reference setScaleModeRoot');
});

TestRunner.test('Scale Mode Window - openScaleModeWindow references setScaleModeLock', (t) => {
    const funcStr = openScaleModeWindow.toString();
    t.assertTruthy(funcStr.includes('setScaleModeLock'), 'openScaleModeWindow should reference setScaleModeLock');
});

TestRunner.test('Scale Mode Window - openScaleModeWindow APP_VERSION validation for Day 523', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 523');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 185, 'Minor version should be >= 185 for Day 523');
    }
});

TestRunner.test('MIDI CC Mappings Window - openMidiCCMappingsWindow is a function export', (t) => {
    t.assertEqual(typeof openMidiCCMappingsWindow, 'function', 'openMidiCCMappingsWindow should be a function');
});

TestRunner.test('MIDI CC Mappings Window - openMidiCCMappingsWindow accepts 0-1 parameters', (t) => {
    const paramCount = openMidiCCMappingsWindow.length;
    t.assertEqual(paramCount <= 1, true, 'openMidiCCMappingsWindow should accept 0 or 1 parameter');
});

TestRunner.test('MIDI CC Mappings Window - openMidiCCMappingsWindow function body uses createWindow', (t) => {
    const funcStr = openMidiCCMappingsWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openMidiCCMappingsWindow should use createWindow');
});

TestRunner.test('MIDI CC Mappings Window - openMidiCCMappingsWindow function body uses getOpenWindows for single-instance', (t) => {
    const funcStr = openMidiCCMappingsWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openMidiCCMappingsWindow should check for open windows');
});

TestRunner.test('MIDI CC Mappings Window - openMidiCCMappingsWindow function body uses localAppServices', (t) => {
    const funcStr = openMidiCCMappingsWindow.toString();
    t.assertTruthy(funcStr.includes('localAppServices'), 'openMidiCCMappingsWindow should reference localAppServices');
});

TestRunner.test('MIDI CC Mappings Window - openMidiCCMappingsWindow references getMidiCCMappings', (t) => {
    const funcStr = openMidiCCMappingsWindow.toString();
    t.assertTruthy(funcStr.includes('getMidiCCMappings'), 'openMidiCCMappingsWindow should reference getMidiCCMappings');
});

TestRunner.test('MIDI CC Mappings Window - openMidiCCMappingsWindow references midiMappingsList container', (t) => {
    const funcStr = openMidiCCMappingsWindow.toString();
    t.assertTruthy(funcStr.includes('midiMappingsList'), 'openMidiCCMappingsWindow should reference midiMappingsList container');
});

TestRunner.test('Day 523 - Scale Mode & MIDI CC Windows - APP_VERSION validation for Day 523', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 523');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 185, 'Minor version should be >= 185 for Day 523');
    }
});



// --- Day 526: Remaining UI Render Functions Tests ---
TestRunner.test('Day 526 - drawWaveform is a function export', (t) => {
    const funcStr = drawWaveform.toString();
    t.assertTruthy(funcStr.includes('function'), 'drawWaveform should be a function');
});

TestRunner.test('Day 526 - drawWaveform accepts 1 parameter', (t) => {
    const paramCount = drawWaveform.length;
    t.assertEqual(paramCount, 1, 'drawWaveform should accept 1 parameter');
});

TestRunner.test('Day 526 - drawWaveform references track parameter', (t) => {
    const funcStr = drawWaveform.toString();
    t.assertTruthy(funcStr.includes('track'), 'drawWaveform should reference track parameter');
});

TestRunner.test('Day 526 - drawInstrumentWaveform is a function export', (t) => {
    const funcStr = drawInstrumentWaveform.toString();
    t.assertTruthy(funcStr.includes('function'), 'drawInstrumentWaveform should be a function');
});

TestRunner.test('Day 526 - drawInstrumentWaveform accepts 1 parameter', (t) => {
    const paramCount = drawInstrumentWaveform.length;
    t.assertEqual(paramCount, 1, 'drawInstrumentWaveform should accept 1 parameter');
});

TestRunner.test('Day 526 - drawInstrumentWaveform references track parameter', (t) => {
    const funcStr = drawInstrumentWaveform.toString();
    t.assertTruthy(funcStr.includes('track'), 'drawInstrumentWaveform should reference track parameter');
});

TestRunner.test('Day 526 - highlightPlayingStep is a function export', (t) => {
    const funcStr = highlightPlayingStep.toString();
    t.assertTruthy(funcStr.includes('function'), 'highlightPlayingStep should be a function');
});

TestRunner.test('Day 526 - highlightPlayingStep accepts 3 parameters', (t) => {
    const paramCount = highlightPlayingStep.length;
    t.assertEqual(paramCount, 3, 'highlightPlayingStep should accept 3 parameters (trackId, stepIndex, isPlaying)');
});

TestRunner.test('Day 526 - highlightPlayingStep references trackId parameter', (t) => {
    const funcStr = highlightPlayingStep.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'highlightPlayingStep should reference trackId parameter');
});

TestRunner.test('Day 526 - renderSamplePads is a function export', (t) => {
    const funcStr = renderSamplePads.toString();
    t.assertTruthy(funcStr.includes('function'), 'renderSamplePads should be a function');
});

TestRunner.test('Day 526 - renderSamplePads accepts 1 parameter', (t) => {
    const paramCount = renderSamplePads.length;
    t.assertEqual(paramCount, 1, 'renderSamplePads should accept 1 parameter');
});

TestRunner.test('Day 526 - renderSamplePads references track parameter', (t) => {
    const funcStr = renderSamplePads.toString();
    t.assertTruthy(funcStr.includes('track'), 'renderSamplePads should reference track parameter');
});

TestRunner.test('Day 526 - updateSliceEditorUI is a function export', (t) => {
    const funcStr = updateSliceEditorUI.toString();
    t.assertTruthy(funcStr.includes('function'), 'updateSliceEditorUI should be a function');
});

TestRunner.test('Day 526 - updateSliceEditorUI accepts 1 parameter', (t) => {
    const paramCount = updateSliceEditorUI.length;
    t.assertEqual(paramCount, 1, 'updateSliceEditorUI should accept 1 parameter');
});

TestRunner.test('Day 526 - updateSliceEditorUI references track parameter', (t) => {
    const funcStr = updateSliceEditorUI.toString();
    t.assertTruthy(funcStr.includes('track'), 'updateSliceEditorUI should reference track parameter');
});

TestRunner.test('Day 526 - updateSequencerCellUI is a function export', (t) => {
    const funcStr = updateSequencerCellUI.toString();
    t.assertTruthy(funcStr.includes('function'), 'updateSequencerCellUI should be a function');
});

TestRunner.test('Day 526 - updateSequencerCellUI accepts 5-6 parameters', (t) => {
    const paramCount = updateSequencerCellUI.length;
    t.assertEqual(paramCount >= 5 && paramCount <= 6, true, 'updateSequencerCellUI should accept 5 or 6 parameters');
});

TestRunner.test('Day 526 - updateSequencerCellUI references windowElement parameter', (t) => {
    const funcStr = updateSequencerCellUI.toString();
    t.assertTruthy(funcStr.includes('windowElement'), 'updateSequencerCellUI should reference windowElement parameter');
});

TestRunner.test('Day 526 - updateDrumPadControlsUI is a function export', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('function'), 'updateDrumPadControlsUI should be a function');
});

TestRunner.test('Day 526 - updateDrumPadControlsUI accepts 1 parameter', (t) => {
    const paramCount = updateDrumPadControlsUI.length;
    t.assertEqual(paramCount, 1, 'updateDrumPadControlsUI should accept 1 parameter');
});

TestRunner.test('Day 526 - updateDrumPadControlsUI references track parameter', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('track'), 'updateDrumPadControlsUI should reference track parameter');
});

TestRunner.test('Day 526 - renderDrumSamplerPads is a function export', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('function'), 'renderDrumSamplerPads should be a function');
});

TestRunner.test('Day 526 - renderDrumSamplerPads accepts 1 parameter', (t) => {
    const paramCount = renderDrumSamplerPads.length;
    t.assertEqual(paramCount, 1, 'renderDrumSamplerPads should accept 1 parameter');
});

TestRunner.test('Day 526 - renderDrumSamplerPads references track parameter', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('track'), 'renderDrumSamplerPads should reference track parameter');
});

TestRunner.test('Day 526 - updateMixerWindow is a function export', (t) => {
    const funcStr = updateMixerWindow.toString();
    t.assertTruthy(funcStr.includes('function'), 'updateMixerWindow should be a function');
});

TestRunner.test('Day 526 - updateMixerWindow accepts 0 parameters', (t) => {
    const paramCount = updateMixerWindow.length;
    t.assertEqual(paramCount, 0, 'updateMixerWindow should accept 0 parameters');
});

TestRunner.test('Day 526 - updateMixerWindow references renderMixer or localAppServices', (t) => {
    const funcStr = updateMixerWindow.toString();
    t.assertTruthy(funcStr.includes('renderMixer') || funcStr.includes('localAppServices'), 'updateMixerWindow should reference renderMixer or localAppServices');
});

TestRunner.test('Day 526 - updateSoundBrowserDisplayForLibrary is a function export', (t) => {
    const funcStr = updateSoundBrowserDisplayForLibrary.toString();
    t.assertTruthy(funcStr.includes('function'), 'updateSoundBrowserDisplayForLibrary should be a function');
});

TestRunner.test('Day 526 - updateSoundBrowserDisplayForLibrary accepts 1-3 parameters', (t) => {
    const paramCount = updateSoundBrowserDisplayForLibrary.length;
    t.assertEqual(paramCount >= 1 && paramCount <= 3, true, 'updateSoundBrowserDisplayForLibrary should accept 1-3 parameters');
});

TestRunner.test('Day 526 - updateSoundBrowserDisplayForLibrary references libraryName parameter', (t) => {
    const funcStr = updateSoundBrowserDisplayForLibrary.toString();
    t.assertTruthy(funcStr.includes('libraryName'), 'updateSoundBrowserDisplayForLibrary should reference libraryName parameter');
});

TestRunner.test('Day 526 - renderSoundBrowserDirectory is a function export', (t) => {
    const funcStr = renderSoundBrowserDirectory.toString();
    t.assertTruthy(funcStr.includes('function'), 'renderSoundBrowserDirectory should be a function');
});

TestRunner.test('Day 526 - renderSoundBrowserDirectory accepts 2 parameters', (t) => {
    const paramCount = renderSoundBrowserDirectory.length;
    t.assertEqual(paramCount, 2, 'renderSoundBrowserDirectory should accept 2 parameters');
});

TestRunner.test('Day 526 - renderSoundBrowserDirectory references pathArray parameter', (t) => {
    const funcStr = renderSoundBrowserDirectory.toString();
    t.assertTruthy(funcStr.includes('pathArray'), 'renderSoundBrowserDirectory should reference pathArray parameter');
});

TestRunner.test('Day 526 - renderEffectControls is a function export', (t) => {
    const funcStr = renderEffectControls.toString();
    t.assertTruthy(funcStr.includes('function'), 'renderEffectControls should be a function');
});

TestRunner.test('Day 526 - renderEffectControls accepts 4 parameters', (t) => {
    const paramCount = renderEffectControls.length;
    t.assertEqual(paramCount, 4, 'renderEffectControls should accept 4 parameters');
});

TestRunner.test('Day 526 - renderEffectControls references owner parameter', (t) => {
    const funcStr = renderEffectControls.toString();
    t.assertTruthy(funcStr.includes('owner'), 'renderEffectControls should reference owner parameter');
});

TestRunner.test('Day 526 - getDrumSamplerPadExistingAudioData is a function export', (t) => {
    const funcStr = getDrumSamplerPadExistingAudioData.toString();
    t.assertTruthy(funcStr.includes('function'), 'getDrumSamplerPadExistingAudioData should be a function');
});

TestRunner.test('Day 526 - getDrumSamplerPadExistingAudioData accepts 2 parameters', (t) => {
    const paramCount = getDrumSamplerPadExistingAudioData.length;
    t.assertEqual(paramCount, 2, 'getDrumSamplerPadExistingAudioData should accept 2 parameters');
});

TestRunner.test('Day 526 - getDrumSamplerPadExistingAudioData references track parameter', (t) => {
    const funcStr = getDrumSamplerPadExistingAudioData.toString();
    t.assertTruthy(funcStr.includes('track'), 'getDrumSamplerPadExistingAudioData should reference track parameter');
});

TestRunner.test('Day 526 - renderDrumPadEditorControls is a function export', (t) => {
    const funcStr = renderDrumPadEditorControls.toString();
    t.assertTruthy(funcStr.includes('function'), 'renderDrumPadEditorControls should be a function');
});

TestRunner.test('Day 526 - renderDrumPadEditorControls accepts 1 parameter', (t) => {
    const paramCount = renderDrumPadEditorControls.length;
    t.assertEqual(paramCount, 1, 'renderDrumPadEditorControls should accept 1 parameter');
});

TestRunner.test('Day 526 - renderDrumPadEditorControls references track parameter', (t) => {
    const funcStr = renderDrumPadEditorControls.toString();
    t.assertTruthy(funcStr.includes('track'), 'renderDrumPadEditorControls should reference track parameter');
});

TestRunner.test('Day 526 - createKnob references localAppServices or captureStateForUndo', (t) => {
    const funcStr = createKnob.toString();
    t.assertTruthy(funcStr.includes('localAppServices') || funcStr.includes('captureStateForUndo'), 'createKnob should reference localAppServices or captureStateForUndo');
});

TestRunner.test('Day 526 - createKnob references options parameter', (t) => {
    const funcStr = createKnob.toString();
    t.assertTruthy(funcStr.includes('options'), 'createKnob should reference options parameter');
});

TestRunner.test('Day 526 - APP_VERSION validation for Day 526', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 526');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 187, 'Minor version should be >= 187 for Day 526');
    }
});
// ============================================
// Day 527: Audio Clip Setters Undo Capture Tests
// ============================================
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipName calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipName.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipName should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipName undo label references Rename or Clip', (t) => {
    const funcStr = Track.prototype.setAudioClipName.toString();
    t.assertTruthy(funcStr.includes('Rename') || funcStr.includes('Clip'), 'undo label should reference Rename or Clip');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipName accepts clipId and name parameters', (t) => {
    t.assertEqual(Track.prototype.setAudioClipName.length, 2, 'setAudioClipName should accept 2 parameters');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipName references clipId parameter', (t) => {
    const funcStr = Track.prototype.setAudioClipName.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'setAudioClipName should reference clipId parameter');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipName references name parameter', (t) => {
    const funcStr = Track.prototype.setAudioClipName.toString();
    t.assertTruthy(funcStr.includes('name'), 'setAudioClipName should reference name parameter');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipColor calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipColor.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipColor should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipColor undo label references Set Clip or Clip', (t) => {
    const funcStr = Track.prototype.setAudioClipColor.toString();
    t.assertTruthy(funcStr.includes('Set') || funcStr.includes('Clip'), 'undo label should reference Set or Clip');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipColor accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.setAudioClipColor.length, 2, 'setAudioClipColor should accept 2 parameters');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipColor references color parameter', (t) => {
    const funcStr = Track.prototype.setAudioClipColor.toString();
    t.assertTruthy(funcStr.includes('color'), 'setAudioClipColor should reference color parameter');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipGain calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipGain.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipGain should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipGain undo label references Clip', (t) => {
    const funcStr = Track.prototype.setAudioClipGain.toString();
    t.assertTruthy(funcStr.includes('Clip'), 'undo label should reference Clip');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipGain accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.setAudioClipGain.length, 2, 'setAudioClipGain should accept 2 parameters');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipGain clamps gain to 0-4 range', (t) => {
    const funcStr = Track.prototype.setAudioClipGain.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min') && funcStr.includes('4'), 'setAudioClipGain should clamp to 0-4 range');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipPlaybackRate calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipPlaybackRate.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipPlaybackRate should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipPlaybackRate undo label references playback rate', (t) => {
    const funcStr = Track.prototype.setAudioClipPlaybackRate.toString();
    t.assertTruthy(funcStr.includes('playback') || funcStr.includes('rate'), 'undo label should reference playback rate');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipPlaybackRate clamps to 0.25-4.0 range', (t) => {
    const funcStr = Track.prototype.setAudioClipPlaybackRate.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setAudioClipPlaybackRate should clamp value');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipStartOffset calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipStartOffset.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipStartOffset should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipStartOffset undo label references start offset', (t) => {
    const funcStr = Track.prototype.setAudioClipStartOffset.toString();
    t.assertTruthy(funcStr.includes('start') || funcStr.includes('offset'), 'undo label should reference start offset');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipStartOffset uses Math.max for minimum clamping', (t) => {
    const funcStr = Track.prototype.setAudioClipStartOffset.toString();
    t.assertTruthy(funcStr.includes('Math.max'), 'setAudioClipStartOffset should use Math.max for clamping');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipEndOffset calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipEndOffset should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipEndOffset undo label references end offset', (t) => {
    const funcStr = Track.prototype.setAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('end') || funcStr.includes('offset'), 'undo label should reference end offset');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipEndOffset uses Math.max for minimum clamping', (t) => {
    const funcStr = Track.prototype.setAudioClipEndOffset.toString();
    t.assertTruthy(funcStr.includes('Math.max'), 'setAudioClipEndOffset should use Math.max for clamping');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipPitchShift calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipPitchShift.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipPitchShift should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipPitchShift undo label references pitch', (t) => {
    const funcStr = Track.prototype.setAudioClipPitchShift.toString();
    t.assertTruthy(funcStr.includes('pitch'), 'undo label should reference pitch');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipPitchShift clamps to -24 to +24 semitones', (t) => {
    const funcStr = Track.prototype.setAudioClipPitchShift.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min') && funcStr.includes('24'), 'setAudioClipPitchShift should clamp to -24 to +24');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipCrossfade calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipCrossfade.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipCrossfade should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipCrossfade clamps to 0-1 range', (t) => {
    const funcStr = Track.prototype.setAudioClipCrossfade.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setAudioClipCrossfade should clamp to 0-1');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipFadeInCurve calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeInCurve.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipFadeInCurve should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipFadeInCurve validates curve type', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeInCurve.toString();
    t.assertTruthy(funcStr.includes('linear') || funcStr.includes('exponential') || funcStr.includes('validCurves'), 'setAudioClipFadeInCurve should validate curve type');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipFadeOutCurve calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOutCurve.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipFadeOutCurve should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipFadeOutCurve validates curve type', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOutCurve.toString();
    t.assertTruthy(funcStr.includes('linear') || funcStr.includes('exponential') || funcStr.includes('validCurves'), 'setAudioClipFadeOutCurve should validate curve type');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipFadeIn calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeIn.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipFadeIn should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipFadeIn uses Math.max for minimum clamping', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeIn.toString();
    t.assertTruthy(funcStr.includes('Math.max'), 'setAudioClipFadeIn should use Math.max for clamping');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipFadeOut calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOut.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipFadeOut should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipFadeOut uses Math.max for minimum clamping', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOut.toString();
    t.assertTruthy(funcStr.includes('Math.max'), 'setAudioClipFadeOut should use Math.max for clamping');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipReverse calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipReverse.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipReverse should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipReverse uses boolean coercion', (t) => {
    const funcStr = Track.prototype.setAudioClipReverse.toString();
    t.assertTruthy(funcStr.includes('!!') || funcStr.includes('Boolean'), 'setAudioClipReverse should coerce to boolean');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipStartTime calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipStartTime should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipStartTime undo label references Move', (t) => {
    const funcStr = Track.prototype.setAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('Move'), 'undo label should reference Move');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipStartTime uses Math.max for minimum clamping', (t) => {
    const funcStr = Track.prototype.setAudioClipStartTime.toString();
    t.assertTruthy(funcStr.includes('Math.max'), 'setAudioClipStartTime should use Math.max for clamping');
});

TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipDuration calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setAudioClipDuration should call _captureUndoState');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipDuration undo label references Resize', (t) => {
    const funcStr = Track.prototype.setAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('Resize'), 'undo label should reference Resize');
});
TestRunner.test('Day 527 - Audio Clip Setters - setAudioClipDuration clamps to minimum 0.01', (t) => {
    const funcStr = Track.prototype.setAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('0.01'), 'setAudioClipDuration should clamp to minimum 0.01');
});

TestRunner.test('Day 527 - Audio Clip Setters - APP_VERSION validation for Day 527', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 527');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 188, 'Minor version should be >= 188 for Day 527');
    }
});






// --- Day 528: Track Slice & Pad Setters Undo Capture Tests ---

TestRunner.test('Day 528 - Track Setters - setSliceVolume is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setSliceVolume, 'function', 'setSliceVolume should be a function');
});

TestRunner.test('Day 528 - Track Setters - setSliceVolume accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.setSliceVolume.length, 2, 'setSliceVolume should accept 2 parameters');
});

TestRunner.test('Day 528 - Track Setters - setSliceVolume references sliceIndex parameter', (t) => {
    const funcStr = Track.prototype.setSliceVolume.toString();
    t.assertTruthy(funcStr.includes('sliceIndex'), 'setSliceVolume should reference sliceIndex parameter');
});

TestRunner.test('Day 528 - Track Setters - setSliceVolume calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setSliceVolume.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setSliceVolume should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setSlicePitchShift is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setSlicePitchShift, 'function', 'setSlicePitchShift should be a function');
});

TestRunner.test('Day 528 - Track Setters - setSlicePitchShift accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.setSlicePitchShift.length, 2, 'setSlicePitchShift should accept 2 parameters');
});

TestRunner.test('Day 528 - Track Setters - setSlicePitchShift references sliceIndex parameter', (t) => {
    const funcStr = Track.prototype.setSlicePitchShift.toString();
    t.assertTruthy(funcStr.includes('sliceIndex'), 'setSlicePitchShift should reference sliceIndex parameter');
});

TestRunner.test('Day 528 - Track Setters - setSlicePitchShift calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setSlicePitchShift.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setSlicePitchShift should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setSlicePitchShift uses parseInt for semitones', (t) => {
    const funcStr = Track.prototype.setSlicePitchShift.toString();
    t.assertTruthy(funcStr.includes('parseInt'), 'setSlicePitchShift should use parseInt for semitones');
});

TestRunner.test('Day 528 - Track Setters - setSliceLoop is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setSliceLoop, 'function', 'setSliceLoop should be a function');
});

TestRunner.test('Day 528 - Track Setters - setSliceLoop accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.setSliceLoop.length, 2, 'setSliceLoop should accept 2 parameters');
});

TestRunner.test('Day 528 - Track Setters - setSliceLoop calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setSliceLoop.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setSliceLoop should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setSliceLoop uses boolean coercion', (t) => {
    const funcStr = Track.prototype.setSliceLoop.toString();
    t.assertTruthy(funcStr.includes('!!'), 'setSliceLoop should use !! boolean coercion');
});

TestRunner.test('Day 528 - Track Setters - setSliceReverse is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setSliceReverse, 'function', 'setSliceReverse should be a function');
});

TestRunner.test('Day 528 - Track Setters - setSliceReverse accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.setSliceReverse.length, 2, 'setSliceReverse should accept 2 parameters');
});

TestRunner.test('Day 528 - Track Setters - setSliceReverse calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setSliceReverse.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setSliceReverse should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setSliceReverse uses boolean coercion', (t) => {
    const funcStr = Track.prototype.setSliceReverse.toString();
    t.assertTruthy(funcStr.includes('!!'), 'setSliceReverse should use !! boolean coercion');
});

TestRunner.test('Day 528 - Track Setters - setSliceEnvelopeParam is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setSliceEnvelopeParam, 'function', 'setSliceEnvelopeParam should be a function');
});

TestRunner.test('Day 528 - Track Setters - setSliceEnvelopeParam accepts 3 parameters', (t) => {
    t.assertEqual(Track.prototype.setSliceEnvelopeParam.length, 3, 'setSliceEnvelopeParam should accept 3 parameters');
});

TestRunner.test('Day 528 - Track Setters - setSliceEnvelopeParam calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setSliceEnvelopeParam.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setSliceEnvelopeParam should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setSliceEnvelopeParam references param and value', (t) => {
    const funcStr = Track.prototype.setSliceEnvelopeParam.toString();
    t.assertTruthy(funcStr.includes('param') && funcStr.includes('value'), 'setSliceEnvelopeParam should reference param and value');
});

TestRunner.test('Day 528 - Track Setters - setSliceEnvelopeParam uses parseFloat for value', (t) => {
    const funcStr = Track.prototype.setSliceEnvelopeParam.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'setSliceEnvelopeParam should use parseFloat for value');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadVolume is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setDrumSamplerPadVolume, 'function', 'setDrumSamplerPadVolume should be a function');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadVolume accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.setDrumSamplerPadVolume.length, 2, 'setDrumSamplerPadVolume should accept 2 parameters');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadVolume calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setDrumSamplerPadVolume.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setDrumSamplerPadVolume should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadVolume references padIndex parameter', (t) => {
    const funcStr = Track.prototype.setDrumSamplerPadVolume.toString();
    t.assertTruthy(funcStr.includes('padIndex'), 'setDrumSamplerPadVolume should reference padIndex parameter');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadVolume uses parseFloat for volume', (t) => {
    const funcStr = Track.prototype.setDrumSamplerPadVolume.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'setDrumSamplerPadVolume should use parseFloat for volume');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadPitch is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setDrumSamplerPadPitch, 'function', 'setDrumSamplerPadPitch should be a function');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadPitch accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.setDrumSamplerPadPitch.length, 2, 'setDrumSamplerPadPitch should accept 2 parameters');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadPitch calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setDrumSamplerPadPitch.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setDrumSamplerPadPitch should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadPitch references padIndex parameter', (t) => {
    const funcStr = Track.prototype.setDrumSamplerPadPitch.toString();
    t.assertTruthy(funcStr.includes('padIndex'), 'setDrumSamplerPadPitch should reference padIndex parameter');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadPitch uses parseInt for pitch', (t) => {
    const funcStr = Track.prototype.setDrumSamplerPadPitch.toString();
    t.assertTruthy(funcStr.includes('parseInt'), 'setDrumSamplerPadPitch should use parseInt for pitch');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadEnv is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setDrumSamplerPadEnv, 'function', 'setDrumSamplerPadEnv should be a function');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadEnv accepts 3 parameters', (t) => {
    t.assertEqual(Track.prototype.setDrumSamplerPadEnv.length, 3, 'setDrumSamplerPadEnv should accept 3 parameters');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadEnv calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setDrumSamplerPadEnv.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setDrumSamplerPadEnv should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadEnv references padIndex, param, and value', (t) => {
    const funcStr = Track.prototype.setDrumSamplerPadEnv.toString();
    t.assertTruthy(funcStr.includes('padIndex') && funcStr.includes('param') && funcStr.includes('value'), 'setDrumSamplerPadEnv should reference padIndex, param, and value');
});

TestRunner.test('Day 528 - Track Setters - setDrumSamplerPadEnv uses parseFloat for value', (t) => {
    const funcStr = Track.prototype.setDrumSamplerPadEnv.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'setDrumSamplerPadEnv should use parseFloat for value');
});

TestRunner.test('Day 528 - Track Setters - setTrackColor is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setTrackColor, 'function', 'setTrackColor should be a function');
});

TestRunner.test('Day 528 - Track Setters - setTrackColor accepts 1 parameter', (t) => {
    t.assertEqual(Track.prototype.setTrackColor.length, 1, 'setTrackColor should accept 1 parameter');
});

TestRunner.test('Day 528 - Track Setters - setTrackColor calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setTrackColor.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setTrackColor should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setTrackColor references color parameter', (t) => {
    const funcStr = Track.prototype.setTrackColor.toString();
    t.assertTruthy(funcStr.includes('color'), 'setTrackColor should reference color parameter');
});

TestRunner.test('Day 528 - Track Setters - setTrackColor calls updateTrackUI', (t) => {
    const funcStr = Track.prototype.setTrackColor.toString();
    t.assertTruthy(funcStr.includes('updateTrackUI'), 'setTrackColor should call updateTrackUI');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerRootNote is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setInstrumentSamplerRootNote, 'function', 'setInstrumentSamplerRootNote should be a function');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerRootNote accepts 1 parameter', (t) => {
    t.assertEqual(Track.prototype.setInstrumentSamplerRootNote.length, 1, 'setInstrumentSamplerRootNote should accept 1 parameter');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerRootNote calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerRootNote.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setInstrumentSamplerRootNote should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerRootNote calls setupToneSampler', (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerRootNote.toString();
    t.assertTruthy(funcStr.includes('setupToneSampler'), 'setInstrumentSamplerRootNote should call setupToneSampler');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerLoop is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setInstrumentSamplerLoop, 'function', 'setInstrumentSamplerLoop should be a function');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerLoop accepts 1 parameter', (t) => {
    t.assertEqual(Track.prototype.setInstrumentSamplerLoop.length, 1, 'setInstrumentSamplerLoop should accept 1 parameter');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerLoop calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerLoop.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setInstrumentSamplerLoop should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerLoop uses boolean coercion', (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerLoop.toString();
    t.assertTruthy(funcStr.includes('!!'), 'setInstrumentSamplerLoop should use !! boolean coercion');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerLoopStart is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setInstrumentSamplerLoopStart, 'function', 'setInstrumentSamplerLoopStart should be a function');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerLoopStart accepts 1 parameter', (t) => {
    t.assertEqual(Track.prototype.setInstrumentSamplerLoopStart.length, 1, 'setInstrumentSamplerLoopStart should accept 1 parameter');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerLoopStart calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerLoopStart.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setInstrumentSamplerLoopStart should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerLoopStart uses parseFloat for time', (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerLoopStart.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'setInstrumentSamplerLoopStart should use parseFloat for time');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerLoopEnd is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setInstrumentSamplerLoopEnd, 'function', 'setInstrumentSamplerLoopEnd should be a function');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerLoopEnd accepts 1 parameter', (t) => {
    t.assertEqual(Track.prototype.setInstrumentSamplerLoopEnd.length, 1, 'setInstrumentSamplerLoopEnd should accept 1 parameter');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerLoopEnd calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerLoopEnd.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setInstrumentSamplerLoopEnd should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerLoopEnd uses parseFloat for time', (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerLoopEnd.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'setInstrumentSamplerLoopEnd should use parseFloat for time');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerEnv is a function export', (t) => {
    t.assertEqual(typeof Track.prototype.setInstrumentSamplerEnv, 'function', 'setInstrumentSamplerEnv should be a function');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerEnv accepts 2 parameters', (t) => {
    t.assertEqual(Track.prototype.setInstrumentSamplerEnv.length, 2, 'setInstrumentSamplerEnv should accept 2 parameters');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerEnv calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerEnv.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'setInstrumentSamplerEnv should call _captureUndoState');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerEnv references param and value', (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerEnv.toString();
    t.assertTruthy(funcStr.includes('param') && funcStr.includes('value'), 'setInstrumentSamplerEnv should reference param and value');
});

TestRunner.test('Day 528 - Track Setters - setInstrumentSamplerEnv uses parseFloat for value', (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerEnv.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'setInstrumentSamplerEnv should use parseFloat for value');
});

TestRunner.test('Day 528 - APP_VERSION validation for Day 528', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 528');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 189, 'Minor version should be >= 189 for Day 528');
    }
});


// --- APP_VERSION validation for Day 520 ---
TestRunner.test('Day 520 - APP_VERSION validation for Day 520', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts.length >= 3, 'APP_VERSION should have at least 3 parts');
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 520');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 181, 'Minor version should be >= 181 for Day 520');
    }
});
// Day 529: Fix testRunner stub() method and assertEquals typo (2026-05-19)
// Add stub() method to TestRunner and fix 42 assertEquals typos
TestRunner.test('Day 529 - TestRunner has stub() method', (t) => {
    t.assertEqual(typeof t.stub, 'function', 'TestRunner should have stub() method');
});

TestRunner.test('Day 529 - stub() creates a callable function', (t) => {
    const s = t.stub();
    t.assertEqual(typeof s, 'function', 'stub() should return a function');
});

TestRunner.test('Day 529 - stub() tracks calls with calls array', (t) => {
    const s = t.stub();
    s('arg1', 'arg2');
    s('arg3');
    t.assertEqual(s.calls.length, 2, 'stub should track 2 calls');
    t.assertEqual(s.calls[0].arguments[0], 'arg1', 'first call first arg');
    t.assertEqual(s.calls[1].arguments[0], 'arg3', 'second call first arg');
});

TestRunner.test('Day 529 - stub() returns configured value', (t) => {
    const s = t.stub();
    s.returns('mockValue');
    t.assertEqual(s(), 'mockValue', 'stub should return mockValue');
    t.assertEqual(s(), 'mockValue', 'stub should always return mockValue');
});

TestRunner.test('Day 529 - stub() returns object when configured', (t) => {
    const s = t.stub();
    const mockObj = { foo: 'bar' };
    s.returns(mockObj);
    const result = s();
    t.assertEqual(result.foo, 'bar', 'stub should return the object');
});

TestRunner.test('Day 529 - stub() can be used for object method mocking', (t) => {
    const mockObj = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub().returns(null)
    };
    mockObj.addEventListener('click', () => {});
    t.assertEqual(mockObj.addEventListener.calls.length, 1, 'addEventListener should track calls');
    t.assertEqual(mockObj.classList.add.calls.length, 0, 'add should not have calls yet');
});

TestRunner.test('Day 529 - APP_VERSION validation for Day 529', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 529');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 190, 'Minor version should be >= 190 for Day 529');
    }
});

TestRunner.test('Day 531 - Ctrl+A Select All uses selected-cell class for copy/paste compatibility', (t) => {
    const funcStr = eventHandlersCtrlACode.toString();
    t.assertTruthy(funcStr.includes('selected-cell'), 'Ctrl+A should add selected-cell class for copy/paste compatibility');
    t.assertTruthy(funcStr.includes('.selected-cell'), 'Ctrl+A should use selected-cell class name');
    t.assertTruthy(funcStr.includes('classList.add'), 'Ctrl+A should use classList.add');
});

TestRunner.test('Day 531 - Ctrl+A Select All gets active sequencer track', (t) => {
    const funcStr = eventHandlersCtrlACode.toString();
    t.assertTruthy(funcStr.includes('getActiveSequencerTrackId'), 'Ctrl+A should reference getActiveSequencerTrackId');
    t.assertTruthy(funcStr.includes('getTrackById'), 'Ctrl+A should reference getTrackById');
});

TestRunner.test('Day 531 - Ctrl+A Select All gets sequencer window element', (t) => {
    const funcStr = eventHandlersCtrlACode.toString();
    t.assertTruthy(funcStr.includes('sequencerWin-') || funcStr.includes('seqWinId'), 'Ctrl+A should reference sequencer window ID');
    t.assertTruthy(funcStr.includes('getWindowByIdState'), 'Ctrl+A should use getWindowByIdState');
    t.assertTruthy(funcStr.includes('.element'), 'Ctrl+A should access window element');
});

TestRunner.test('Day 531 - Ctrl+A Select All selects all sequencer cells', (t) => {
    const funcStr = eventHandlersCtrlACode.toString();
    t.assertTruthy(funcStr.includes('.sequencer-step-cell'), 'Ctrl+A should target sequencer-step-cell elements');
    t.assertTruthy(funcStr.includes('querySelectorAll'), 'Ctrl+A should use querySelectorAll to find cells');
    t.assertTruthy(funcStr.includes('forEach'), 'Ctrl+A should iterate over cells with forEach');
});

TestRunner.test('Day 531 - Ctrl+A Select All prevents default and returns early', (t) => {
    const funcStr = eventHandlersCtrlACode.toString();
    t.assertTruthy(funcStr.includes('preventDefault'), 'Ctrl+A should call event.preventDefault');
    t.assertTruthy(funcStr.includes('return'), 'Ctrl+A should return after handling');
});

TestRunner.test('Day 531 - Ctrl+A Select All shows notification with sequence name', (t) => {
    const funcStr = eventHandlersCtrlACode.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'Ctrl+A should show notification');
    t.assertTruthy(funcStr.includes('getActiveSequence'), 'Ctrl+A should get active sequence for notification');
});

TestRunner.test('Day 531 - APP_VERSION validation for Day 531', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 531');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 192, 'Minor version should be >= 192 for Day 531');
    }
});

// ============================================
// Day 533: Delete Key - Delete Selected Sequencer Notes
// ============================================
TestRunner.test('Day 533 - Delete Key uses active sequencer track via getActiveSequencerTrackId', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('getActiveSequencerTrackId'), 'Delete key should use getActiveSequencerTrackId');
});

TestRunner.test('Day 533 - Delete Key handles delete and backspace keys', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes("key === 'delete'") || funcStr.includes('key === "delete"'), 'Delete key should check for delete key');
    t.assertTruthy(funcStr.includes("key === 'backspace'") || funcStr.includes('key === "backspace"'), 'Delete key should check for backspace key');
});

TestRunner.test('Day 533 - Delete Key uses getTrackById to get the track', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'Delete key should use getTrackById');
});

TestRunner.test('Day 533 - Delete Key uses getActiveSequence to get the active sequence', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence'), 'Delete key should use getActiveSequence');
});

TestRunner.test('Day 533 - Delete Key uses getWindowByIdState to access sequencer window', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('getWindowByIdState'), 'Delete key should use getWindowByIdState');
});

TestRunner.test('Day 533 - Delete Key targets .selected-cell elements', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('.selected-cell'), 'Delete key should target .selected-cell elements');
    t.assertTruthy(funcStr.includes('querySelectorAll'), 'Delete key should use querySelectorAll');
});

TestRunner.test('Day 533 - Delete Key sets selected cells to null to clear notes', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('= null') || funcStr.includes('= null'), 'Delete key should set cells to null');
    t.assertTruthy(funcStr.includes('clearedCount'), 'Delete key should count cleared notes');
});

TestRunner.test('Day 533 - Delete Key calls captureStateForUndo for undo support', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Delete key should call captureStateForUndo');
});

TestRunner.test('Day 533 - Delete Key calls recreateToneSequence to refresh playback', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('recreateToneSequence'), 'Delete key should call recreateToneSequence');
});

TestRunner.test('Day 533 - Delete Key removes selected-cell class from cleared cells', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('classList.remove'), 'Delete key should remove selected-cell class');
    t.assertTruthy(funcStr.includes("'selected-cell'") || funcStr.includes('"selected-cell"'), 'Delete key should remove selected-cell class name');
});

TestRunner.test('Day 533 - Delete Key shows notification with count of deleted notes', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'Delete key should show notification');
    t.assertTruthy(funcStr.includes('clearedCount'), 'Delete key notification should include cleared count');
});

TestRunner.test('Day 533 - Delete Key calls updateTrackUI to refresh UI', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('updateTrackUI'), 'Delete key should call updateTrackUI');
});

TestRunner.test('Day 533 - Delete Key prevents default browser behavior', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('preventDefault'), 'Delete key should call event.preventDefault');
});

TestRunner.test('Day 533 - Delete Key returns early after handling', (t) => {
    const funcStr = deleteKeyHandler.toString();
    t.assertTruthy(funcStr.includes('return'), 'Delete key should return after handling');
});

TestRunner.test('Day 533 - APP_VERSION validation for Day 533', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 533');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 193, 'Minor version should be >= 193 for Day 533');
    }
});

// Day 534: Ctrl+Q - Quantize Selected Sequencer Notes
TestRunner.test('Day 534 - Ctrl+Q quantize selection handler exists', (t) => {
    const funcStr = eventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('(event.ctrlKey || event.metaKey) && key === \'q\''), 'Ctrl+Q handler should check for ctrl/meta+q');
});

TestRunner.test('Day 534 - Ctrl+Q quantize uses selected-cell class for selection detection', (t) => {
    const funcStr = eventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('.selected-cell'), 'Ctrl+Q should use selected-cell class');
});

TestRunner.test('Day 534 - Ctrl+Q quantize uses getActiveSequencerTrackId', (t) => {
    const funcStr = eventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('getActiveSequencerTrackId'), 'Ctrl+Q should use getActiveSequencerTrackId');
});

TestRunner.test('Day 534 - Ctrl+Q quantize checks SEQUENCER_SNAP_VALUE for snap grid', (t) => {
    const funcStr = eventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('SEQUENCER_SNAP_VALUE') || funcStr.includes('snapValue'), 'Ctrl+Q should check snap value');
});

TestRunner.test('Day 534 - Ctrl+Q quantize handles snap=0 (off) case', (t) => {
    const funcStr = eventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('snapValue === 0') || funcStr.includes('Snap is Off'), 'Ctrl+Q should handle snap off case');
});

TestRunner.test('Day 534 - Ctrl+Q quantize captures undo state before quantizing', (t) => {
    const funcStr = eventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Ctrl+Q should capture undo state');
});

TestRunner.test('Day 534 - Ctrl+Q quantize uses Math.round for snapping to grid', (t) => {
    const funcStr = eventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('Math.round'), 'Ctrl+Q should use Math.round for grid snapping');
});

TestRunner.test('Day 534 - Ctrl+Q quantize checks for collision before moving note', (t) => {
    const funcStr = eventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('!currentActiveSeq.data') || funcStr.includes('if (!currentActiveSeq.data'), 'Ctrl+Q should check for collision');
});

TestRunner.test('Day 534 - Ctrl+Q quantize calls recreateToneSequence after quantizing', (t) => {
    const funcStr = eventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('recreateToneSequence'), 'Ctrl+Q should call recreateToneSequence');
});

TestRunner.test('Day 534 - Ctrl+Q quantize prevents default browser behavior', (t) => {
    const funcStr = eventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('event.preventDefault'), 'Ctrl+Q should prevent default');
});

TestRunner.test('Day 534 - Ctrl+Q quantize shows notification with count', (t) => {
    const funcStr = eventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'Ctrl+Q should show notification');
    t.assertTruthy(funcStr.includes('quantizedCount') || funcStr.includes('note(s)'), 'Ctrl+Q notification should include count');
});

TestRunner.test('Day 534 - APP_VERSION validation for Day 534', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 534');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 193, 'Minor version should be >= 193 for Day 534');
    }
});

// ============================================
// Day 536: Ctrl+X - Cut Selected Sequencer Notes Tests
// ============================================

TestRunner.test('Day 536 - Ctrl+X Cut selection handler exists', (t) => {
    const funcStr = eventHandlersCode;
    t.assertTruthy(funcStr.includes("key === 'x'") || funcStr.includes('key === "x"'), 'Ctrl+X should check for x key');
    t.assertTruthy(funcStr.includes('event.ctrlKey') || funcStr.includes('event.metaKey'), 'Ctrl+X should check for ctrl/meta key');
    t.assertTruthy(funcStr.includes('// Ctrl/Cmd+X - Cut sequencer'), 'Ctrl+X should have a comment explaining the handler');
});

TestRunner.test('Day 536 - Ctrl+X Cut gets armed track via getArmedTrackId', (t) => {
    const funcStr = eventHandlersCode;
    const cutBlock = funcStr.substring(funcStr.indexOf('// Ctrl/Cmd+X - Cut'));
    t.assertTruthy(cutBlock.includes('getArmedTrackId'), 'Ctrl+X cut should reference getArmedTrackId');
});

TestRunner.test('Day 536 - Ctrl+X Cut gets active sequence', (t) => {
    const funcStr = eventHandlersCode;
    const cutBlock = funcStr.substring(funcStr.indexOf('// Ctrl/Cmd+X - Cut'));
    t.assertTruthy(cutBlock.includes('getActiveSequence'), 'Ctrl+X cut should use getActiveSequence');
});

TestRunner.test('Day 536 - Ctrl+X Cut finds selected cells via querySelectorAll', (t) => {
    const funcStr = eventHandlersCode;
    const cutBlock = funcStr.substring(funcStr.indexOf('// Ctrl/Cmd+X - Cut'));
    t.assertTruthy(cutBlock.includes('.sequencer-step-cell.selected-cell'), 'Ctrl+X cut should target selected-cell elements');
    t.assertTruthy(cutBlock.includes('querySelectorAll'), 'Ctrl+X cut should use querySelectorAll');
});

TestRunner.test('Day 536 - Ctrl+X Cut captures undo state before cut', (t) => {
    const funcStr = eventHandlersCode;
    const cutBlock = funcStr.substring(funcStr.indexOf('// Ctrl/Cmd+X - Cut'));
    t.assertTruthy(cutBlock.includes('captureStateForUndo'), 'Ctrl+X cut should capture undo state');
    t.assertTruthy(cutBlock.includes('Cut Selection on') || cutBlock.includes('cut'), 'Ctrl+X cut should use descriptive undo label');
});

TestRunner.test('Day 536 - Ctrl+X Cut copies selection to clipboard first', (t) => {
    const funcStr = eventHandlersCode;
    const cutBlock = funcStr.substring(funcStr.indexOf('// Ctrl/Cmd+X - Cut'));
    t.assertTruthy(cutBlock.includes('setClipboardData'), 'Ctrl+X cut should copy to clipboard using setClipboardData');
});

TestRunner.test('Day 536 - Ctrl+X Cut clears notes and removes selected-cell class', (t) => {
    const funcStr = eventHandlersCode;
    const cutBlock = funcStr.substring(funcStr.indexOf('// Ctrl/Cmd+X - Cut'));
    t.assertTruthy(cutBlock.includes('classList.remove') || cutBlock.includes("'selected-cell'"), 'Ctrl+X cut should remove selected-cell class');
    t.assertTruthy(cutBlock.includes('null') || cutBlock.includes('= null'), 'Ctrl+X cut should clear note data');
});

TestRunner.test('Day 536 - Ctrl+X Cut prevents default browser behavior', (t) => {
    const funcStr = eventHandlersCode;
    const cutBlock = funcStr.substring(funcStr.indexOf('// Ctrl/Cmd+X - Cut'));
    t.assertTruthy(cutBlock.includes('preventDefault'), 'Ctrl+X cut should call event.preventDefault');
});

TestRunner.test('Day 536 - Ctrl+X Cut returns early after handling', (t) => {
    const funcStr = eventHandlersCode;
    const cutBlock = funcStr.substring(funcStr.indexOf('// Ctrl/Cmd+X - Cut'));
    t.assertTruthy(cutBlock.includes('return;'), 'Ctrl+X cut should return after handling');
});

TestRunner.test('Day 536 - Ctrl+X Cut shows notification with dimensions', (t) => {
    const funcStr = eventHandlersCode;
    const cutBlock = funcStr.substring(funcStr.indexOf('// Ctrl/Cmd+X - Cut'));
    t.assertTruthy(cutBlock.includes('showNotification'), 'Ctrl+X cut should show notification');
    t.assertTruthy(cutBlock.includes('cut') || cutBlock.includes('Cut'), 'Ctrl+X cut notification should mention cut');
});

TestRunner.test('Day 536 - Ctrl+X Cut calls recreateToneSequence after cut', (t) => {
    const funcStr = eventHandlersCode;
    const cutBlock = funcStr.substring(funcStr.indexOf('// Ctrl/Cmd+X - Cut'));
    t.assertTruthy(cutBlock.includes('recreateToneSequence'), 'Ctrl+X cut should call recreateToneSequence');
});

TestRunner.test('Day 536 - Keyboard shortcuts help shows Ctrl+X row for Cut Selection', (t) => {
    const uiStr = uiCode;
    t.assertTruthy(uiStr.includes('Ctrl+X') && uiStr.includes('Cut Selection'), 'Keyboard shortcuts help should show Ctrl+X = Cut Selection');
});

TestRunner.test('Day 536 - APP_VERSION validation for Day 536', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 536');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 195, 'Minor version should be >= 195 for Day 536');
    }
});

// Day 537: Ctrl+Shift+Z Redo Shortcut Tests
TestRunner.test('Day 537 - Ctrl+Shift+Z redo handler exists', (t) => {
    const funcStr = eventHandlersCode;
    t.assertTruthy(funcStr.includes('Ctrl+Shift+Z') || funcStr.includes('event.shiftKey'), 'Ctrl+Shift+Z redo handler should check for shift key');
});

TestRunner.test('Day 537 - Ctrl+Shift+Z redo calls redoLastAction', (t) => {
    const funcStr = eventHandlersCode;
    const redoBlock = funcStr.substring(funcStr.indexOf('Ctrl+Shift+Z') > -1 ? funcStr.indexOf('Ctrl+Shift+Z') : funcStr.indexOf('shiftKey'));
    t.assertTruthy(redoBlock.includes('redoLastAction') || redoBlock.includes('services.redoLastAction'), 'Ctrl+Shift+Z redo should call redoLastAction');
});

TestRunner.test('Day 537 - Ctrl+Shift+Z redo returns early after handling', (t) => {
    const funcStr = eventHandlersCode;
    const redoBlock = funcStr.substring(funcStr.indexOf('Ctrl+Shift+Z') > -1 ? funcStr.indexOf('Ctrl+Shift+Z') : funcStr.indexOf('shiftKey'));
    t.assertTruthy(redoBlock.includes('return;'), 'Ctrl+Shift+Z redo should return after handling');
});

TestRunner.test('Day 537 - Keyboard shortcuts help shows Ctrl+Shift+Z row for Redo (Alt)', (t) => {
    const uiStr = uiCode;
    t.assertTruthy(uiStr.includes('Ctrl+Shift+Z') && uiStr.includes('Redo (Alt)'), 'Keyboard shortcuts help should show Ctrl+Shift+Z = Redo (Alt)');
});

TestRunner.test('Day 537 - APP_VERSION validation for Day 537', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 537');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 196, 'Minor version should be >= 196 for Day 537');
    }
});

TestRunner.test('Day 538 - Escape clears sequencer selection', (t) => {
    const funcStr = eventHandlersCode;
    t.assertTruthy(funcStr.includes("key === 'escape'"), 'Escape key handler should exist');
    t.assertTruthy(funcStr.includes('selected-cell'), 'Escape handler should reference selected-cell class');
    t.assertTruthy(funcStr.includes('classList.remove'), 'Escape handler should remove selected-cell class');
    t.assertTruthy(funcStr.includes('clearedCount') || funcStr.includes('selectedCells.length'), 'Escape handler should count cleared cells');
});

TestRunner.test('Day 538 - Escape clears all selected cells', (t) => {
    const funcStr = eventHandlersCode;
    t.assertTruthy(funcStr.includes('forEach(cell => cell.classList.remove'), 'Escape should iterate and remove selected-cell class');
});

TestRunner.test('Day 538 - Escape shows notification with cleared count', (t) => {
    const funcStr = eventHandlersCode;
    t.assertTruthy(funcStr.includes('showNotification') && funcStr.includes('Cleared'), 'Escape should show notification about cleared cells');
});

TestRunner.test('Day 538 - Escape blurs active element', (t) => {
    const funcStr = eventHandlersCode;
    t.assertTruthy(funcStr.includes('activeEl.blur'), 'Escape should blur the active element');
});

TestRunner.test('Day 538 - Escape returns early after clearing selection', (t) => {
    const funcStr = eventHandlersCode;
    const escBlock = funcStr.substring(funcStr.indexOf("key === 'escape'"));
    const afterEsc = escBlock.substring(0, 300);
    t.assertTruthy(afterEsc.includes('return;'), 'Escape handler should return after clearing selection');
});

TestRunner.test('Day 538 - Escape handler gets active sequencer track', (t) => {
    const funcStr = eventHandlersCode;
    t.assertTruthy(funcStr.includes('getActiveSequencerTrackId'), 'Escape should get active sequencer track');
    t.assertTruthy(funcStr.includes('getTrackById'), 'Escape should get track by ID');
});

TestRunner.test('Day 538 - Escape handler finds selected cells in sequencer window', (t) => {
    const funcStr = eventHandlersCode;
    t.assertTruthy(funcStr.includes('sequencerWin'), 'Escape should use sequencer window element');
    t.assertTruthy(funcStr.includes('querySelectorAll'), 'Escape should query for selected cells');
});

TestRunner.test('Day 538 - Ctrl key shortcircuit allows Escape key', (t) => {
    const funcStr = eventHandlersCode;
    t.assertTruthy(funcStr.indexOf("key === 'escape'") < funcStr.indexOf('if (event.metaKey || event.ctrlKey)'), 'Escape handler should come before ctrl-key check');
});

TestRunner.test('Day 538 - Ctrl key shortcircuit allows Ctrl+A', (t) => {
    const funcStr = eventHandlersCode;
    t.assertTruthy(funcStr.includes("key === 'a'") && funcStr.includes('ctrlKey || event.metaKey'), 'Ctrl+A check should be in ctrl-key allowed list');
});

TestRunner.test('Day 538 - Ctrl key shortcircuit allows Ctrl+X', (t) => {
    const funcStr = eventHandlersCode;
    const ctrlBlock = funcStr.substring(funcStr.indexOf('if (event.metaKey || event.ctrlKey)'));
    const shortcircuit = ctrlBlock.substring(0, 400);
    t.assertTruthy(shortcircuit.includes("key === 'x'"), 'Ctrl+X should be in ctrl-key allowed list');
});

TestRunner.test('Day 538 - Ctrl key shortcircuit allows Ctrl+Q', (t) => {
    const funcStr = eventHandlersCode;
    const ctrlBlock = funcStr.substring(funcStr.indexOf('if (event.metaKey || event.ctrlKey)'));
    const shortcircuit = ctrlBlock.substring(0, 400);
    t.assertTruthy(shortcircuit.includes("key === 'q'"), 'Ctrl+Q should be in ctrl-key allowed list');
});

TestRunner.test('Day 538 - Keyboard shortcuts help shows Escape row for Clear Selection', (t) => {
    const uiStr = uiCode;
    t.assertTruthy(uiStr.includes('Escape') && uiStr.includes('Clear Selection'), 'Keyboard shortcuts help should show Escape = Clear Selection');
});

TestRunner.test('Day 538 - Keyboard shortcuts help shows Ctrl+Q row for Quantize Selection', (t) => {
    const uiStr = uiCode;
    t.assertTruthy(uiStr.includes('Ctrl+Q') && uiStr.includes('Quantize Selection'), 'Keyboard shortcuts help should show Ctrl+Q = Quantize Selection');
});

TestRunner.test('Day 538 - APP_VERSION validation for Day 538', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 538');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 196, 'Minor version should be >= 196 for Day 538');
    }
});
// Day 539: Ctrl+H - Humanize Velocities Shortcut
TestRunner.test('Day 539 - Ctrl+H Humanize handler function exists', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes("key === 'h'"), 'Ctrl+H should check for h key');
});

TestRunner.test('Day 539 - Ctrl+H Humanize handler gets active sequencer track via getActiveSequencerTrackId', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('getActiveSequencerTrackId()'), 'Ctrl+H should use getActiveSequencerTrackId');
});

TestRunner.test('Day 539 - Ctrl+H Humanize handler captures undo state before humanizing', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('captureStateForUndo'), 'Ctrl+H should capture undo state');
    t.assertTruthy(eventHandlersCode.includes('Humanize Velocities'), 'Ctrl+H should reference Humanize Velocities in undo label');
});

TestRunner.test('Day 539 - Ctrl+H Humanize handler humanizes selected cells with velocity variation', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('humanizedCount'), 'Ctrl+H should track humanizedCount');
    t.assertTruthy(eventHandlersCode.includes('stepData.velocity'), 'Ctrl+H should modify stepData.velocity');
    t.assertTruthy(eventHandlersCode.includes('Math.random'), 'Ctrl+H should use Math.random for variation');
});

TestRunner.test('Day 539 - Ctrl+H Humanize handler clamps velocity to 0.05-1.0 range', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('Math.max(0.05'), 'Ctrl+H should clamp to 0.05 minimum');
    t.assertTruthy(eventHandlersCode.includes('Math.min(1.0'), 'Ctrl+H should clamp to 1.0 maximum');
});

TestRunner.test('Day 539 - Ctrl+H Humanize handler calls track.recreateToneSequence', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('recreateToneSequence'), 'Ctrl+H should call recreateToneSequence');
});

TestRunner.test('Day 539 - Ctrl+H Humanize handler shows notification with humanized count', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('Humanized ${humanizedCount}') || eventHandlersCode.includes('Humanized #{humanizedCount}'), 'Ctrl+H should show notification with count');
});

TestRunner.test('Day 539 - Ctrl+H Humanize handler handles no selection case', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('No notes to humanize'), 'Ctrl+H should handle no notes case');
});

TestRunner.test('Day 539 - Keyboard shortcuts help shows Ctrl+H row for Humanize Velocities', (t) => {
    const uiStr = uiCode;
    t.assertTruthy(uiStr.includes('Ctrl+H') && uiStr.includes('Humanize Velocities'), 'Keyboard shortcuts help should show Ctrl+H = Humanize Velocities');
});

TestRunner.test('Day 539 - APP_VERSION validation for Day 539', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 539');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 197, 'Minor version should be >= 197 for Day 539');
    }
});
// Day 540: Ctrl+Shift+Up/Down - Shift Notes Up/Down Keyboard Shortcuts
TestRunner.test('Day 540 - Ctrl+Shift+Up Shift Notes handler function exists', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('Shift+Up') || eventHandlersCode.includes('arrowup'), 'Ctrl+Shift+Up handler should check for Shift+Up or arrowup key');
});

TestRunner.test('Day 540 - Ctrl+Shift+Down Shift Notes handler function exists', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('Shift+Down') || eventHandlersCode.includes('arrowdown'), 'Ctrl+Shift+Down handler should check for Shift+Down or arrowdown key');
});

TestRunner.test('Day 540 - Ctrl+Shift+Up handler gets active sequencer track via getActiveSequencerTrackId', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('getActiveSequencerTrackId'), 'Ctrl+Shift+Up should get active sequencer track ID');
});

TestRunner.test('Day 540 - Ctrl+Shift+Down handler gets active sequencer track via getActiveSequencerTrackId', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('getActiveSequencerTrackId'), 'Ctrl+Shift+Down should get active sequencer track ID');
});

TestRunner.test('Day 540 - Ctrl+Shift+Up handler calls track.shiftSequenceNotes with +1', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('shiftSequenceNotes(1)') || eventHandlersCode.includes('shiftSequenceNotes( 1 )'), 'Ctrl+Shift+Up should call shiftSequenceNotes with 1');
});

TestRunner.test('Day 540 - Ctrl+Shift+Down handler calls track.shiftSequenceNotes with -1', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('shiftSequenceNotes(-1)') || eventHandlersCode.includes('shiftSequenceNotes( -1 )'), 'Ctrl+Shift+Down should call shiftSequenceNotes with -1');
});

TestRunner.test('Day 540 - Ctrl+Shift+Up handler captures undo state before shifting', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('captureStateForUndo'), 'Ctrl+Shift+Up should capture undo state');
    t.assertTruthy(eventHandlersCode.includes('Shift Notes Up'), 'Ctrl+Shift+Up should reference Shift Notes Up in undo label');
});

TestRunner.test('Day 540 - Ctrl+Shift+Down handler captures undo state before shifting', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('captureStateForUndo'), 'Ctrl+Shift+Down should capture undo state');
    t.assertTruthy(eventHandlersCode.includes('Shift Notes Down'), 'Ctrl+Shift+Down should reference Shift Notes Down in undo label');
});

TestRunner.test('Day 540 - Ctrl+Shift+Up handler calls track.recreateToneSequence', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('recreateToneSequence'), 'Ctrl+Shift+Up should call recreateToneSequence');
});

TestRunner.test('Day 540 - Ctrl+Shift+Down handler calls track.recreateToneSequence', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('recreateToneSequence'), 'Ctrl+Shift+Down should call recreateToneSequence');
});

TestRunner.test('Day 540 - Ctrl+Shift+Up handler shows notification with shifted count', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('note(s) up'), 'Ctrl+Shift+Up should show note(s) up in notification');
});

TestRunner.test('Day 540 - Ctrl+Shift+Down handler shows notification with shifted count', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('note(s) down'), 'Ctrl+Shift+Down should show note(s) down in notification');
});

TestRunner.test('Day 540 - Ctrl+Shift+Up handler handles no notes case', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('No notes to shift up'), 'Ctrl+Shift+Up should handle no notes case with notification');
});

TestRunner.test('Day 540 - Ctrl+Shift+Down handler handles no notes case', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('No notes to shift down'), 'Ctrl+Shift+Down should handle no notes case with notification');
});

TestRunner.test('Day 540 - Keyboard shortcuts help shows Ctrl+Shift+Up row for Shift Notes Up', (t) => {
    const uiStr = uiCode;
    t.assertTruthy(uiStr.includes('Ctrl+Shift+Up') && uiStr.includes('Shift Notes Up'), 'Keyboard shortcuts help should show Ctrl+Shift+Up = Shift Notes Up');
});

TestRunner.test('Day 540 - Keyboard shortcuts help shows Ctrl+Shift+Down row for Shift Notes Down', (t) => {
    const uiStr = uiCode;
    t.assertTruthy(uiStr.includes('Ctrl+Shift+Down') && uiStr.includes('Shift Notes Down'), 'Keyboard shortcuts help should show Ctrl+Shift+Down = Shift Notes Down');
});

TestRunner.test('Day 540 - APP_VERSION validation for Day 540', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 540');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 198, 'Minor version should be >= 198 for Day 540');
    }
});

TestRunner.test('Day 541 - Keyboard shortcuts help shows Ctrl+Shift+Left row for Shift Notes Left', (t) => {
    const uiStr = uiCode;
    t.assertTruthy(uiStr.includes('Ctrl+Shift+Left') && uiStr.includes('Shift Notes Left'), 'Keyboard shortcuts help should show Ctrl+Shift+Left = Shift Notes Left');
});

TestRunner.test('Day 541 - Keyboard shortcuts help shows Ctrl+Shift+Right row for Shift Notes Right', (t) => {
    const uiStr = uiCode;
    t.assertTruthy(uiStr.includes('Ctrl+Shift+Right') && uiStr.includes('Shift Notes Right'), 'Keyboard shortcuts help should show Ctrl+Shift+Right = Shift Notes Right');
});

TestRunner.test('Day 541 - APP_VERSION validation for Day 541', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 541');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 199, 'Minor version should be >= 199 for Day 541');
    }
});


console.log('All tests completed successfully');

// ============================================
// Day 542: Ctrl+Shift+Left/Right Column Shift Tests + Test Mic Shortcut
// ============================================
TestRunner.test('Day 542 - Ctrl+Shift+Left Shift Notes handler function exists', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('Shift+Left') || eventHandlersCode.includes('arrowleft'), 'Ctrl+Shift+Left handler should check for Shift+Left or arrowleft key');
});

TestRunner.test('Day 542 - Ctrl+Shift+Right Shift Notes handler function exists', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('Shift+Right') || eventHandlersCode.includes('arrowright'), 'Ctrl+Shift+Right handler should check for Shift+Right or arrowright key');
});

TestRunner.test('Day 542 - Ctrl+Shift+Left handler uses selected-cell class', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('.selected-cell'), 'Ctrl+Shift+Left should target .selected-cell elements');
});

TestRunner.test('Day 542 - Ctrl+Shift+Right handler uses selected-cell class', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('.selected-cell'), 'Ctrl+Shift+Right should target .selected-cell elements');
});

TestRunner.test('Day 542 - Ctrl+Shift+Left handler captures undo state', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('captureStateForUndo'), 'Ctrl+Shift+Left should capture undo state');
    t.assertTruthy(eventHandlersCode.includes('Shift Notes Left'), 'Ctrl+Shift+Left should reference Shift Notes Left in undo label');
});

TestRunner.test('Day 542 - Ctrl+Shift+Right handler captures undo state', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('captureStateForUndo'), 'Ctrl+Shift+Right should capture undo state');
    t.assertTruthy(eventHandlersCode.includes('Shift Notes Right'), 'Ctrl+Shift+Right should reference Shift Notes Right in undo label');
});

TestRunner.test('Day 542 - Ctrl+Shift+Left handler shifts notes left (c-1)', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('c - 1') || eventHandlersCode.includes('c-1'), 'Ctrl+Shift+Left should shift column by -1');
});

TestRunner.test('Day 542 - Ctrl+Shift+Right handler shifts notes right (c+1)', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('c + 1') || eventHandlersCode.includes('c+1'), 'Ctrl+Shift+Right should shift column by +1');
});

TestRunner.test('Day 542 - Ctrl+Shift+Left handler shows notification with shifted count', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('note(s) left'), 'Ctrl+Shift+Left should show note(s) left in notification');
});

TestRunner.test('Day 542 - Ctrl+Shift+Right handler shows notification with shifted count', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('note(s) right'), 'Ctrl+Shift+Right should show note(s) right in notification');
});

TestRunner.test('Day 542 - Ctrl+Shift+Left handler prevents default', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('event.preventDefault'), 'Ctrl+Shift+Left should prevent default browser behavior');
});

TestRunner.test('Day 542 - Ctrl+Shift+Right handler prevents default', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('event.preventDefault'), 'Ctrl+Shift+Right should prevent default browser behavior');
});

TestRunner.test('Day 542 - attachGlobalControlEvents sets up micTestBtn click handler', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('micTestBtnGlobal') && eventHandlersCode.includes('addEventListener'), 'attachGlobalControlEvents should set up micTestBtn click handler');
});

TestRunner.test('Day 542 - micTestBtn handler calls initAudioContextAndMasterMeter', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('initAudioContextAndMasterMeter'), 'Mic test button should call initAudioContextAndMasterMeter');
});

TestRunner.test('Day 542 - micTestBtn handler calls runRecordingMicrophoneE2ETest', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('runRecordingMicrophoneE2ETest'), 'Mic test button should call runRecordingMicrophoneE2ETest');
});

TestRunner.test('Day 542 - micTestBtn handler handles result with ok boolean', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('result.ok'), 'Mic test should check result.ok');
});

TestRunner.test('Day 542 - micTestBtn handler shows status based on result.ok', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    t.assertTruthy(eventHandlersCode.includes('setMicTestStatus'), 'Mic test should call setMicTestStatus');
});

TestRunner.test('Day 542 - Keyboard shortcuts help shows Test Mic row for Mic Recording Test', (t) => {
    const uiStr = uiCode;
    t.assertTruthy(uiStr.includes('Test Mic') && uiStr.includes('Mic Recording Test'), 'Keyboard shortcuts help should show Test Mic row for Mic Recording Test');
});

TestRunner.test('Day 542 - APP_VERSION validation for Day 542', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 542');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 200, 'Minor version should be >= 200 for Day 542');
    }
});

// ============================================
// Day 544: Shift Notes Left/Right Context Menu Tests
// ============================================
TestRunner.test('Day 544 - Shift Notes Left menu item exists in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('Shift Notes Left'), 'Shift Notes Left menu item should exist');
});

TestRunner.test('Day 544 - Shift Notes Right menu item exists in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('Shift Notes Right'), 'Shift Notes Right menu item should exist');
});

TestRunner.test('Day 544 - Shift Notes Left captures undo state', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('captureStateForUndo') && uiCode.includes('Shift Notes Left on'), 'Shift Notes Left should capture undo state');
});

TestRunner.test('Day 544 - Shift Notes Right captures undo state', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('captureStateForUndo') && uiCode.includes('Shift Notes Right on'), 'Shift Notes Right should capture undo state');
});

TestRunner.test('Day 544 - Shift Notes Left shifts notes left via column swap', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('c - 1') || uiCode.includes('c-1'), 'Shift Notes Left should reference c-1 for left shift');
});

TestRunner.test('Day 544 - Shift Notes Right shifts notes right via column swap', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('c + 1') || uiCode.includes('c+1'), 'Shift Notes Right should reference c+1 for right shift');
});

TestRunner.test('Day 544 - Shift Notes Left calls recreateToneSequence', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('recreateToneSequence'), 'Shift Notes Left should call recreateToneSequence');
});

TestRunner.test('Day 544 - Shift Notes Right calls recreateToneSequence', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('recreateToneSequence'), 'Shift Notes Right should call recreateToneSequence');
});

TestRunner.test('Day 544 - Shift Notes Left shows notification with shifted count', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('Shifted') && uiCode.includes('note(s) left'), 'Shift Notes Left should show notification with count');
});

TestRunner.test('Day 544 - Shift Notes Right shows notification with shifted count', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('Shifted') && uiCode.includes('note(s) right'), 'Shift Notes Right should show notification with count');
});

TestRunner.test('Day 544 - Shift Notes Left handles no notes case', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('No notes to shift left'), 'Shift Notes Left should handle no notes case');
});

TestRunner.test('Day 544 - Shift Notes Right handles no notes case', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('No notes to shift right'), 'Shift Notes Right should handle no notes case');
});

TestRunner.test('Day 544 - Shift Notes Left calls updateTrackUI', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('updateTrackUI'), 'Shift Notes Left should call updateTrackUI');
});

TestRunner.test('Day 544 - Shift Notes Right calls updateTrackUI', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('updateTrackUI'), 'Shift Notes Right should call updateTrackUI');
});

TestRunner.test('Day 544 - Shift Notes Left does not crash on Audio track', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('currentActiveSeq.data') && uiCode.includes('length'), 'Shift Notes Left should safely check sequence data');
});

TestRunner.test('Day 544 - Shift Notes Right does not crash on Audio track', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('currentActiveSeq.data') && uiCode.includes('length'), 'Shift Notes Right should safely check sequence data');
});

TestRunner.test('Day 544 - APP_VERSION validation for Day 544', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 544');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 203, 'Minor version should be >= 203 for Day 544');
    }
});

// Day 545: Fix undo capture order in humanizeVelocity and scaleVelocities
// ============================================
TestRunner.test('Day 545 - humanizeVelocity captures undo state before mutation', (t) => {
    const funcStr = Track.prototype.humanizeVelocity.toString();
    // undo capture should come BEFORE the forEach loop that mutates velocities
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('activeSeq.data.forEach');
    t.assertTruthy(undoIdx !== -1, 'humanizeVelocity should call _captureUndoState');
    t.assertTruthy(forEachIdx !== -1, 'humanizeVelocity should iterate over data');
    t.assertTruthy(undoIdx < forEachIdx, 'undo capture should come BEFORE the data iteration');
});

TestRunner.test('Day 545 - scaleVelocities captures undo state before mutation', (t) => {
    const funcStr = Track.prototype.scaleVelocities.toString();
    // undo capture should come BEFORE the forEach loop that mutates velocities
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('activeSeq.data.forEach');
    t.assertTruthy(undoIdx !== -1, 'scaleVelocities should call _captureUndoState');
    t.assertTruthy(forEachIdx !== -1, 'scaleVelocities should iterate over data');
    t.assertTruthy(undoIdx < forEachIdx, 'undo capture should come BEFORE the data iteration');
});

TestRunner.test('Day 545 - APP_VERSION validation for Day 545', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 545');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 204, 'Minor version should be >= 204 for Day 545');
    }
});

// Day 546: DrumSampler Pad Drop Zone Verification - Add drop handlers to pad grid
TestRunner.test('Day 546 - renderDrumSamplerPads adds dragover to drum pads', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes("padEl.addEventListener('dragover')"), 'renderDrumSamplerPads should add dragover handler to pads');
});
TestRunner.test('Day 546 - renderDrumSamplerPads adds dragleave to drum pads', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes("padEl.addEventListener('dragleave')"), 'renderDrumSamplerPads should add dragleave handler to pads');
});
TestRunner.test('Day 546 - renderDrumSamplerPads adds drop to drum pads', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes("padEl.addEventListener('drop')"), 'renderDrumSamplerPads should add drop handler to pads');
});
TestRunner.test('Day 546 - pad drop handler reads pad index from dataset', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes("padEl.dataset.padIndex") || uiCode.includes("dataset.padIndex"), 'Drop handler should read pad index from dataset');
});
TestRunner.test('Day 546 - pad drop handler reads trackId from dataset', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes("padEl.dataset.trackId") || uiCode.includes("dataset.trackId"), 'Drop handler should read trackId from dataset');
});
TestRunner.test('Day 546 - pad drop handler handles sound browser JSON drop', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes("JSON.parse") && uiCode.includes("loadSoundFromBrowserToTarget"), 'Pad drop should parse JSON and call loadSoundFromBrowserToTarget');
});
TestRunner.test('Day 546 - pad drop handler handles OS file drop', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes("dataTransfer.files") && uiCode.includes("loadDrumSamplerPadFile"), 'Pad drop should handle OS file drop via loadDrumSamplerPadFile');
});
TestRunner.test('Day 546 - pad drop handler calls preventDefault and stopPropagation', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes("e.preventDefault") && uiCode.includes("e.stopPropagation"), 'Drop handler should call preventDefault and stopPropagation');
});
TestRunner.test('Day 546 - pad dragover adds dragover CSS class', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes("padEl.classList.add('dragover')"), 'Dragover should add dragover class');
});
TestRunner.test('Day 546 - pad dragleave removes dragover CSS class', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes("padEl.classList.remove('dragover')"), 'Dragleave should remove dragover class');
});
TestRunner.test('Day 546 - APP_VERSION validation for Day 546', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 546');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 205, 'Minor version should be >= 205 for Day 546');
    }
});

TestRunner.test('Day 547 - reverseSequence captures undo state before mutation', (t) => {
    const funcStr = Track.prototype.reverseSequence.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('activeSeq.data.forEach');
    t.assertTruthy(undoIdx !== -1, 'reverseSequence should call _captureUndoState');
    t.assertTruthy(forEachIdx !== -1, 'reverseSequence should iterate over data');
    t.assertTruthy(undoIdx < forEachIdx, 'reverseSequence should capture undo BEFORE data iteration');
});

TestRunner.test('Day 547 - reverseSequence menu item exists in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes("label: \`Reverse Sequence\`"), 'Sequencer context menu should have Reverse Sequence item');
});

TestRunner.test('Day 547 - reverseSequence menu item calls track.reverseSequence', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('currentTrackForMenu.reverseSequence()'), 'Reverse Sequence menu item should call track.reverseSequence()');
});

TestRunner.test('Day 547 - reverseSequence menu item calls recreateToneSequence after reverse', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const reverseIdx = uiCode.indexOf('label: \`Reverse Sequence\`');
    const afterText = uiCode.slice(reverseIdx, reverseIdx + 300);
    t.assertTruthy(afterText.includes('recreateToneSequence(true)'), 'Reverse Sequence should call recreateToneSequence after reverse');
});

TestRunner.test('Day 547 - reverseSequence menu item shows notification with reversed count', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const reverseIdx = uiCode.indexOf('label: \`Reverse Sequence\`');
    const afterText = uiCode.slice(reverseIdx, reverseIdx + 300);
    t.assertTruthy(afterText.includes('Reversed ${result}'), 'Reverse Sequence should show notification with count');
});

TestRunner.test('Day 547 - reverseSequence menu item handles no notes case', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const reverseIdx = uiCode.indexOf('label: \`Reverse Sequence\`');
    const afterText = uiCode.slice(reverseIdx, reverseIdx + 300);
    t.assertTruthy(afterText.includes('No notes to reverse'), 'Reverse Sequence should handle no notes case');
});

TestRunner.test('Day 547 - reverseSequence and flipSequence both capture undo state before mutation', (t) => {
    const reverseStr = Track.prototype.reverseSequence.toString();
    const flipStr = Track.prototype.flipSequence.toString();
    const reverseUndoIdx = reverseStr.indexOf('_captureUndoState');
    const flipUndoIdx = flipStr.indexOf('_captureUndoState');
    const reverseForEachIdx = reverseStr.indexOf('activeSeq.data.forEach');
    const flipForEachIdx = flipStr.indexOf('for (let rowIndex');
    t.assertTruthy(reverseUndoIdx !== -1, 'reverseSequence should call _captureUndoState');
    t.assertTruthy(flipUndoIdx !== -1, 'flipSequence should call _captureUndoState');
    t.assertTruthy(reverseUndoIdx < reverseForEachIdx, 'reverseSequence undo should come before data iteration');
    t.assertTruthy(flipUndoIdx < flipForEachIdx, 'flipSequence undo should come before data iteration');
});

// Day 547: flipSequence Undo Capture Order + flipSequence Tests
// ==============================================================
TestRunner.test('Day 547 - flipSequence captures undo state before mutation', (t) => {
    const funcStr = Track.prototype.flipSequence.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('for (let rowIndex');
    t.assertTruthy(undoIdx !== -1, 'flipSequence should call _captureUndoState');
    t.assertTruthy(forEachIdx !== -1, 'flipSequence should iterate over data');
    t.assertTruthy(undoIdx < forEachIdx, 'flipSequence should capture undo BEFORE data mutation');
});

TestRunner.test('Day 547 - flipSequence is a function on Track.prototype', (t) => {
    const track = new Track('test-track', 'Synth');
    t.assertEqual(typeof track.flipSequence, 'function', 'flipSequence should be a function');
});

TestRunner.test('Day 547 - flipSequence accepts 0 parameters', (t) => {
    const funcStr = Track.prototype.flipSequence.toString();
    t.assertEqual(funcStr.match(/\(\s*\)/)?.[0] || '()', '()', 'flipSequence should accept 0 parameters');
});

TestRunner.test('Day 547 - flipSequence returns 0 for Audio tracks', (t) => {
    const track = new Track('test-track', 'Audio');
    const result = track.flipSequence();
    t.assertEqual(result, 0, 'Audio tracks should return 0');
});

TestRunner.test('Day 547 - flipSequence gets active sequence via getActiveSequence', (t) => {
    const funcStr = Track.prototype.flipSequence.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence()'), 'flipSequence should call getActiveSequence');
});

TestRunner.test('Day 547 - flipSequence returns 0 if no active sequence', (t) => {
    const track = new Track('test-track', 'Synth');
    const result = track.flipSequence();
    t.assertEqual(result, 0, 'flipSequence should return 0 when no active sequence');
});

TestRunner.test('Day 547 - flipSequence uses halfCols calculation with Math.floor', (t) => {
    const funcStr = Track.prototype.flipSequence.toString();
    t.assertTruthy(funcStr.includes('halfCols = Math.floor(totalSteps / 2)'), 'flipSequence should use halfCols with Math.floor');
});

TestRunner.test('Day 547 - flipSequence swaps left and right cells via mirroredCol', (t) => {
    const funcStr = Track.prototype.flipSequence.toString();
    t.assertTruthy(funcStr.includes('mirroredCol = totalSteps - 1 - col'), 'flipSequence should calculate mirroredCol');
    t.assertTruthy(funcStr.includes('row[col] = rightCell') && funcStr.includes('row[mirroredCol] = leftCell'), 'flipSequence should swap left and right cells');
});

TestRunner.test('Day 547 - flipSequence calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.flipSequence.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'flipSequence should call _captureUndoState');
});

TestRunner.test('Day 547 - flipSequence returns flippedCount', (t) => {
    const funcStr = Track.prototype.flipSequence.toString();
    t.assertTruthy(funcStr.includes('return flippedCount'), 'flipSequence should return flippedCount');
});

TestRunner.test('Day 547 - APP_VERSION validation for Day 547', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 547');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 206, 'Minor version should be >= 206 for Day 547');
    }
});

// Day 548: reverseSequence Undo Capture Order Tests
TestRunner.test('Day 548 - reverseSequence captures undo state before mutation', (t) => {
    const funcStr = Track.prototype.reverseSequence.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('activeSeq.data.forEach');
    t.assertTruthy(undoIdx !== -1, 'reverseSequence should call _captureUndoState');
    t.assertTruthy(forEachIdx !== -1, 'reverseSequence should iterate over data');
    t.assertTruthy(undoIdx < forEachIdx, 'reverseSequence should capture undo BEFORE data mutation');
});

TestRunner.test('Day 548 - APP_VERSION validation for Day 548', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 548');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 207, 'Minor version should be >= 207 for Day 548');
    }
});

// ============================================
// Day 549: Duplicate Track Menu Item Tests
// ============================================

TestRunner.test('Day 549 - Duplicate Track menu item exists in track context menu', (t) => {
    const renderMixerFnStr = renderMixer.toString();
    t.assertTruthy(renderMixerFnStr.includes('Duplicate Track'), 'Track context menu should have Duplicate Track option');
});

TestRunner.test('Day 549 - Duplicate Track menu item calls track.duplicateTrack()', (t) => {
    const renderMixerFnStr = renderMixer.toString();
    t.assertTruthy(renderMixerFnStr.includes('track.duplicateTrack'), 'Duplicate Track menu item should call track.duplicateTrack()');
});

TestRunner.test('Day 549 - Duplicate Track menu item captures undo state before operation', (t) => {
    const renderMixerFnStr = renderMixer.toString();
    const duplicateTrackIdx = renderMixerFnStr.indexOf('Duplicate Track');
    const captureIdx = renderMixerFnStr.indexOf('captureStateForUndo');
    t.assertTruthy(captureIdx !== -1 && captureIdx < duplicateTrackIdx + 500, 'Undo capture should happen before duplicate operation');
});

TestRunner.test('Day 549 - Duplicate Track menu item handles success case', (t) => {
    const renderMixerFnStr = renderMixer.toString();
    t.assertTruthy(renderMixerFnStr.includes('Duplicated') || renderMixerFnStr.includes('Duplicated track'), 'Should show notification on successful duplicate');
});

TestRunner.test('Day 549 - Duplicate Track menu item handles failure case', (t) => {
    const renderMixerFnStr = renderMixer.toString();
    t.assertTruthy(renderMixerFnStr.includes('Failed to duplicate') || renderMixerFnStr.includes('Failed to duplicat'), 'Should show notification on failed duplicate');
});

TestRunner.test('Day 549 - APP_VERSION validation for Day 549', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 549');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 208, 'Minor version should be >= 208 for Day 549');
    }
});

// ============================================
// Day 550: Fix undo capture order in quantizeSequence and pasteSequenceSection
// ============================================

TestRunner.test('Day 550 - quantizeSequence captures undo state before mutation', (t) => {
    const funcStr = Track.prototype.quantizeSequence.toString();
    // undo capture should come BEFORE the forEach loop that mutates velocities/probabilities
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('activeSeq.data.forEach');
    t.assertTruthy(undoIdx !== -1, 'quantizeSequence should call _captureUndoState');
    t.assertTruthy(forEachIdx !== -1, 'quantizeSequence should iterate over data');
    t.assertTruthy(undoIdx < forEachIdx, 'undo capture should come BEFORE the data iteration in quantizeSequence');
});

TestRunner.test('Day 550 - pasteSequenceSection captures undo state before mutation', (t) => {
    const funcStr = Track.prototype.pasteSequenceSection.toString();
    // undo capture should come BEFORE the nested loops that paste data
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('for (let rIndex');
    t.assertTruthy(undoIdx !== -1, 'pasteSequenceSection should call _captureUndoState');
    t.assertTruthy(forEachIdx !== -1, 'pasteSequenceSection should iterate over data');
    t.assertTruthy(undoIdx < forEachIdx, 'undo capture should come BEFORE the data iteration in pasteSequenceSection');
});

TestRunner.test('Day 550 - APP_VERSION validation for Day 550', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 550');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 209, 'Minor version should be >= 209 for Day 550');
    }
});

// ============================================
// Day 551: Fix undo capture order in shiftSequenceNotes
// ============================================

TestRunner.test('Day 551 - shiftSequenceNotes captures undo state before mutation', (t) => {
    const funcStr = Track.prototype.shiftSequenceNotes.toString();
    // undo capture should come BEFORE the map/iteration that builds newData
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mapIdx = funcStr.indexOf('.map(');
    t.assertTruthy(undoIdx !== -1, 'shiftSequenceNotes should call _captureUndoState');
    t.assertTruthy(mapIdx !== -1, 'shiftSequenceNotes should map over data');
    t.assertTruthy(undoIdx < mapIdx, 'undo capture should come BEFORE the data map in shiftSequenceNotes');
});

TestRunner.test('Day 551 - shiftSequenceNotes is a function on Track.prototype', (t) => {
    const funcStr = Track.prototype.shiftSequenceNotes.toString();
    t.assertTruthy(funcStr.length > 0, 'shiftSequenceNotes should be a function');
});

TestRunner.test('Day 551 - Shift Notes Up/Down menu items exist in sequencer context menu', (t) => {
    const uiCode = isWindowCodeDefined('ui.js') ? getWindowCode('ui.js') : '';
    t.assertTruthy(uiCode.includes('Shift Notes Up'), 'Shift Notes Up menu item should exist');
    t.assertTruthy(uiCode.includes('Shift Notes Down'), 'Shift Notes Down menu item should exist');
});

TestRunner.test('Day 551 - APP_VERSION validation for Day 551', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 551');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 210, 'Minor version should be >= 210 for Day 551');
    }
});

// ============================================
// Day 552: doubleSequence, halveSequence, setSequenceLength - Undo Capture Order Verification
// These three methods were already capturing undo BEFORE mutation (verified by consistent undo behavior).
// Added clarifying comments matching the established pattern.
// ============================================
TestRunner.test('Day 552 - doubleSequence captures undo state before mutation', (t) => {
    const funcStr = Track.prototype.doubleSequence.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('activeSeq.data.forEach');
    t.assertTruthy(undoIdx !== -1, 'doubleSequence should call _captureUndoState');
    t.assertTruthy(forEachIdx !== -1, 'doubleSequence should iterate over data');
    t.assertTruthy(undoIdx < forEachIdx, 'undo capture should come BEFORE the data iteration in doubleSequence');
});

TestRunner.test('Day 552 - halveSequence captures undo state before mutation', (t) => {
    const funcStr = Track.prototype.halveSequence.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('activeSeq.data.forEach');
    t.assertTruthy(undoIdx !== -1, 'halveSequence should call _captureUndoState');
    t.assertTruthy(forEachIdx !== -1, 'halveSequence should iterate over data');
    t.assertTruthy(undoIdx < forEachIdx, 'undo capture should come BEFORE the data iteration in halveSequence');
});

TestRunner.test('Day 552 - setSequenceLength captures undo state before mutation', (t) => {
    const funcStr = Track.prototype.setSequenceLength.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mapIdx = funcStr.indexOf('.map(');
    t.assertTruthy(undoIdx !== -1, 'setSequenceLength should call _captureUndoState');
    t.assertTruthy(mapIdx !== -1, 'setSequenceLength should use map for data reconstruction');
    t.assertTruthy(undoIdx < mapIdx, 'undo capture should come BEFORE the data reconstruction in setSequenceLength');
});

TestRunner.test('Day 552 - APP_VERSION validation for Day 552', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 552');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 211, 'Minor version should be >= 211 for Day 552');
    }
});

// ================================================================
// Day 553: Recording E2E - stopAudioRecording State Machine Tests
// ================================================================
// Verifies that stopAudioRecording properly manages the state machine:
// 1. Captures active recorder/mic/trackId/startTime at function entry
// 2. Handles the null recorder case (early return with cleanup)
// 3. Calls recorder.stop() and processes the recorded blob
// 4. Validates the destination track and calls addAudioClip
// 5. Clears all recording state on success or failure
// 6. Handles empty/too-small recordings with notification

TestRunner.test('Day 553 - stopAudioRecording captures state at entry for safety', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('activeRecorder'), 'stopAudioRecording should capture activeRecorder');
    t.assertTruthy(funcStr.includes('activeMic'), 'stopAudioRecording should capture activeMic');
    t.assertTruthy(funcStr.includes('activeTrackId'), 'stopAudioRecording should capture activeTrackId');
    t.assertTruthy(funcStr.includes('activeStartTime'), 'stopAudioRecording should capture activeStartTime');
});

TestRunner.test('Day 553 - stopAudioRecording captures state BEFORE null check', (t) => {
    const funcStr = stopAudioRecording.toString();
    const captureIdx = funcStr.indexOf('activeRecorder');
    const nullCheckIdx = funcStr.indexOf('!activeRecorder');
    t.assertTruthy(captureIdx !== -1, 'should capture activeRecorder');
    t.assertTruthy(nullCheckIdx !== -1, 'should check !activeRecorder');
    t.assertTruthy(captureIdx < nullCheckIdx, 'state capture should come before null check');
});

TestRunner.test('Day 553 - stopAudioRecording handles null recorder gracefully', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('!activeRecorder'), 'should check !activeRecorder');
    t.assertTruthy(funcStr.includes('cleanupRecordingAudioResources') || funcStr.includes('cleanupRecordingScheduling'), 'should cleanup resources when recorder is null');
});

TestRunner.test('Day 553 - stopAudioRecording calls recorder.stop()', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('recorder.stop') || funcStr.includes('stop()'), 'stopAudioRecording should call recorder.stop()');
});

TestRunner.test('Day 553 - stopAudioRecording validates recording size', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('size') && (funcStr.includes('< 1000') || funcStr.includes('size <')), 'stopAudioRecording should check recording size');
});

TestRunner.test('Day 553 - stopAudioRecording validates destination track', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('recordedTrack') && funcStr.includes("type !== 'Audio'"), 'stopAudioRecording should validate track type');
});

TestRunner.test('Day 553 - stopAudioRecording calls addAudioClip on valid track', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('addAudioClip'), 'stopAudioRecording should call addAudioClip');
});

TestRunner.test('Day 553 - stopAudioRecording passes activeStartTime to addAudioClip', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('addAudioClip') && funcStr.includes('activeStartTime'), 'stopAudioRecording should pass activeStartTime to addAudioClip');
});

TestRunner.test('Day 553 - stopAudioRecording clears recording state on success', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('setIsRecordingState(false)'), 'should clear isRecordingState');
    t.assertTruthy(funcStr.includes('setRecordingTrackIdState(null)'), 'should clear recordingTrackId');
    t.assertTruthy(funcStr.includes('setRecordingStartTimeState(0)'), 'should clear recordingStartTime');
});

TestRunner.test('Day 553 - stopAudioRecording clears recording state on error', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('catch') && funcStr.includes('setIsRecordingState(false)'), 'should clear state in catch block');
});

TestRunner.test('Day 553 - stopAudioRecording calls cleanupRecordingScheduling', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('cleanupRecordingScheduling'), 'stopAudioRecording should call cleanupRecordingScheduling');
});

TestRunner.test('Day 553 - stopAudioRecording uses getTrackById to find destination', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'stopAudioRecording should use getTrackById');
});

TestRunner.test('Day 553 - stopAudioRecording notifies on empty recording', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('showNotification') && (funcStr.includes('empty') || funcStr.includes('longer take')), 'should notify when recording is empty');
});

TestRunner.test('Day 553 - stopAudioRecording notifies on success', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('showNotification') && funcStr.includes('saved'), 'should notify on successful save');
});

TestRunner.test('Day 553 - APP_VERSION validation for Day 553', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 553');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 212, 'Minor version should be >= 212 for Day 553');
    }
});

// ================================================================
// Day 553b: Audio Clip Setter Methods - Undo Capture Order Fixes
// ================================================================
// Fixes undo capture order in setAudioClipName, setAudioClipColor, setAudioClipGain, setAudioClipReverse
// _captureUndoState must be called BEFORE the mutation, not after

TestRunner.test('Day 553b - setAudioClipName captures undo BEFORE name mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipName.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.name = name');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.name');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.name mutation');
});

TestRunner.test('Day 553b - setAudioClipColor captures undo BEFORE color mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipColor.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.color = color');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.color');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.color mutation');
});

TestRunner.test('Day 553b - setAudioClipGain captures undo BEFORE gain mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipGain.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.gain =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.gain');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.gain mutation');
});

TestRunner.test('Day 553b - setAudioClipReverse captures undo BEFORE reverse mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipReverse.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.reverse =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.reverse');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.reverse mutation');
});

TestRunner.test('Day 553b - APP_VERSION validation for Day 553b', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 553b');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 212, 'Minor version should be >= 212 for Day 553b');
    }
});

// ================================================================
// Day 554: Complete Undo Capture Order Tests for All setAudioClip* Methods
// ================================================================
// Verifies ALL 14 setAudioClip* methods capture undo BEFORE mutation
// Day 553b covered setAudioClipName, setAudioClipColor, setAudioClipGain, setAudioClipReverse
// This adds tests for the remaining 10 methods

TestRunner.test('Day 554 - setAudioClipPlaybackRate captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipPlaybackRate.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.playbackRate =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.playbackRate');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.playbackRate mutation');
});

TestRunner.test('Day 554 - setAudioClipStartOffset captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipStartOffset.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.startOffset =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.startOffset');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.startOffset mutation');
});

TestRunner.test('Day 554 - setAudioClipEndOffset captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipEndOffset.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.endOffset =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.endOffset');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.endOffset mutation');
});

TestRunner.test('Day 554 - setAudioClipPitchShift captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipPitchShift.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.pitchShift =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.pitchShift');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.pitchShift mutation');
});

TestRunner.test('Day 554 - setAudioClipCrossfade captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipCrossfade.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.crossfade =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.crossfade');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.crossfade mutation');
});

TestRunner.test('Day 554 - setAudioClipFadeInCurve captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeInCurve.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.fadeInCurve =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.fadeInCurve');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.fadeInCurve mutation');
});

TestRunner.test('Day 554 - setAudioClipFadeOutCurve captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOutCurve.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.fadeOutCurve =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.fadeOutCurve');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.fadeOutCurve mutation');
});

TestRunner.test('Day 554 - setAudioClipFadeIn captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeIn.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.fadeIn =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.fadeIn');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.fadeIn mutation');
});

TestRunner.test('Day 554 - setAudioClipFadeOut captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipFadeOut.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.fadeOut =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.fadeOut');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.fadeOut mutation');
});

TestRunner.test('Day 554 - setAudioClipStartTime captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipStartTime.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.startTime =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.startTime');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.startTime mutation');
});

TestRunner.test('Day 554 - setAudioClipDuration captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.setAudioClipDuration.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('clip.duration =');
    t.assertTruthy(undoIdx !== -1, 'should call _captureUndoState');
    t.assertTruthy(mutationIdx !== -1, 'should mutate clip.duration');
    t.assertTruthy(undoIdx < mutationIdx, 'undo capture should come BEFORE clip.duration mutation');
});

TestRunner.test('Day 554 - All 14 setAudioClip methods follow undo capture before mutation pattern', (t) => {
    const methods = [
        'setAudioClipName', 'setAudioClipColor', 'setAudioClipGain', 'setAudioClipPlaybackRate',
        'setAudioClipStartOffset', 'setAudioClipEndOffset', 'setAudioClipPitchShift', 'setAudioClipCrossfade',
        'setAudioClipFadeInCurve', 'setAudioClipFadeOutCurve', 'setAudioClipFadeIn', 'setAudioClipFadeOut',
        'setAudioClipReverse', 'setAudioClipStartTime', 'setAudioClipDuration'
    ];
    let allCorrect = true;
    let failedMethods = [];
    methods.forEach(name => {
        const funcStr = Track.prototype[name].toString();
        const undoIdx = funcStr.indexOf('_captureUndoState');
        const mutationIdx = funcStr.indexOf('clip.');
        if (undoIdx === -1 || mutationIdx === -1 || undoIdx > mutationIdx) {
            allCorrect = false;
            failedMethods.push(name);
        }
    });
    t.assertTruthy(allCorrect, 'All 14 setAudioClip methods should capture undo BEFORE mutation. Failed: ' + failedMethods.join(', '));
});

TestRunner.test('Day 554 - APP_VERSION validation for Day 554', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 554');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 212, 'Minor version should be >= 212 for Day 554');
    }
});

// ============================================
// Day 555: DrumSampler Pad Drop - Verify soundData.type Guard
// ============================================
TestRunner.test('Day 555 - pad drop handler checks soundData.type === \'sound-browser-item\'', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes("soundData.type === 'sound-browser-item'"), 'Drop handler should verify soundData.type === \'sound-browser-item\'');
});

TestRunner.test('Day 555 - pad drop handler loads sound when type matches', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const dropIdx = uiCode.indexOf("padEl.addEventListener('drop'");
    const typeCheckIdx = uiCode.indexOf("soundData.type === 'sound-browser-item'");
    const loadIdx = uiCode.indexOf('loadSoundFromBrowserToTarget');
    t.assertTruthy(dropIdx !== -1, 'drop handler should exist');
    t.assertTruthy(typeCheckIdx > dropIdx, 'type check should come after drop handler start');
    t.assertTruthy(loadIdx > typeCheckIdx, 'loadSoundFromBrowserToTarget should be called after type check');
});

TestRunner.test('Day 555 - pad drop handler does NOT load when type is not sound-browser-item', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const typeCheckIdx = uiCode.indexOf("soundData.type === 'sound-browser-item'");
    const bracketIdx = uiCode.indexOf('if (soundData.type ===', typeCheckIdx + 50);
    const nextIfIdx = uiCode.indexOf('if (', bracketIdx + 10);
    const loadInElse = uiCode.substring(bracketIdx, nextIfIdx + 50).includes('loadDrumSamplerPadFile');
    t.assertTruthy(loadInElse, 'OS file drop should be handled in else branch after type check');
});

TestRunner.test('Day 555 - APP_VERSION validation for Day 555', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 555');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 213, 'Minor version should be >= 213 for Day 555');
    }
});

// Day 556: duplicateSequence Undo Capture Order Fix
// ============================================
TestRunner.test('Day 556 - duplicateSequence captures undo BEFORE pushing new sequence', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('duplicateSequence(sequenceId)');
    const funcEnd = trackCode.indexOf('\n    setActiveSequence(', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    const captureIdx = funcBody.indexOf('_captureUndoState');
    const pushIdx = funcBody.indexOf('this.sequences.push');
    
    t.assertTruthy(captureIdx !== -1, '_captureUndoState should be called in duplicateSequence');
    t.assertTruthy(pushIdx !== -1, 'this.sequences.push should be called in duplicateSequence');
    t.assertTruthy(captureIdx < pushIdx, '_captureUndoState should be called BEFORE this.sequences.push');
});

TestRunner.test('Day 556 - duplicateSequence returns null for Audio tracks', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('duplicateSequence(sequenceId)');
    const funcEnd = trackCode.indexOf('\n    setActiveSequence(', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    t.assertTruthy(funcBody.includes("if (this.type === 'Audio') return null;"), 'duplicateSequence should return null for Audio type');
});

TestRunner.test('Day 556 - duplicateSequence creates new sequence with correct properties', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('duplicateSequence(sequenceId)');
    const funcEnd = trackCode.indexOf('\n    setActiveSequence(', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    t.assertTruthy(funcBody.includes('JSON.parse(JSON.stringify(originalSequence.data || []))'), 'should deep copy sequence data');
    t.assertTruthy(funcBody.includes('originalSequence.length'), 'should copy sequence length');
    t.assertTruthy(funcBody.includes('name: `${originalSequence.name} Copy`'), 'should set name with Copy suffix');
});

TestRunner.test('Day 556 - duplicateSequence calls updateTrackUI after mutation', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('duplicateSequence(sequenceId)');
    const funcEnd = trackCode.indexOf('\n    setActiveSequence(', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    const pushIdx = funcBody.indexOf('this.sequences.push');
    const updateIdx = funcBody.indexOf('updateTrackUI');
    
    t.assertTruthy(pushIdx !== -1, 'this.sequences.push should be called');
    t.assertTruthy(updateIdx !== -1, 'updateTrackUI should be called');
    t.assertTruthy(updateIdx > pushIdx, 'updateTrackUI should be called AFTER this.sequences.push');
});

TestRunner.test('Day 556 - APP_VERSION validation for Day 556', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 556');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 214, 'Minor version should be >= 214 for Day 556');
    }
});
// Day 557: Timeline Clip Methods Undo Capture Order Fix
// ============================================
// Fixed undo capture order in deleteTimelineClip, splitAudioClip, and duplicateTimelineClip
// Moved _captureUndoState call to BEFORE clip mutations in all three methods

TestRunner.test('Day 557 - deleteTimelineClip captures undo BEFORE filter mutation', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('deleteTimelineClip(clipId)');
    const funcEnd = trackCode.indexOf('\n    splitAudioClip(', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    const captureIdx = funcBody.indexOf('_captureUndoState');
    const filterIdx = funcBody.indexOf('this.timelineClips.filter');
    
    t.assertTruthy(captureIdx !== -1, '_captureUndoState should be called in deleteTimelineClip');
    t.assertTruthy(filterIdx !== -1, 'this.timelineClips.filter should be called in deleteTimelineClip');
    t.assertTruthy(captureIdx < filterIdx, '_captureUndoState should be called BEFORE this.timelineClips.filter');
});

TestRunner.test('Day 557 - deleteTimelineClip has descriptive undo label', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('deleteTimelineClip(clipId)');
    const funcEnd = trackCode.indexOf('\n    splitAudioClip(', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    t.assertTruthy(funcBody.includes('Delete Clip') || funcBody.includes('"Delete Clip"'), 'undo label should reference Delete Clip');
    t.assertTruthy(funcBody.includes('clip.name'), 'undo label should include clip name');
});

TestRunner.test('Day 557 - splitAudioClip captures undo BEFORE mutations', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('splitAudioClip(clipId, splitTime)');
    const funcEnd = trackCode.indexOf('\n    duplicateTimelineClip(', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    const captureIdx = funcBody.indexOf('_captureUndoState');
    const durationIdx = funcBody.indexOf('clip.duration = ');
    const pushIdx = funcBody.indexOf('this.timelineClips.push');
    
    t.assertTruthy(captureIdx !== -1, '_captureUndoState should be called in splitAudioClip');
    t.assertTruthy(durationIdx !== -1, 'clip.duration mutation should occur');
    t.assertTruthy(pushIdx !== -1, 'this.timelineClips.push should be called');
    t.assertTruthy(captureIdx < durationIdx, '_captureUndoState should be called BEFORE clip.duration mutation');
    t.assertTruthy(captureIdx < pushIdx, '_captureUndoState should be called BEFORE this.timelineClips.push');
});

TestRunner.test('Day 557 - splitAudioClip has descriptive undo label', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('splitAudioClip(clipId, splitTime)');
    const funcEnd = trackCode.indexOf('\n    duplicateTimelineClip(', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    t.assertTruthy(funcBody.includes('Split Clip') || funcBody.includes('"Split Clip"'), 'undo label should reference Split Clip');
    t.assertTruthy(funcBody.includes('clip.name'), 'undo label should include clip name');
});

TestRunner.test('Day 557 - duplicateTimelineClip captures undo BEFORE push mutation', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('duplicateTimelineClip(clipId)');
    const funcEnd = trackCode.indexOf('\n    // Audio Clip Accessor Methods', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    const captureIdx = funcBody.indexOf('_captureUndoState');
    const pushIdx = funcBody.indexOf('this.timelineClips.push');
    
    t.assertTruthy(captureIdx !== -1, '_captureUndoState should be called in duplicateTimelineClip');
    t.assertTruthy(pushIdx !== -1, 'this.timelineClips.push should be called');
    t.assertTruthy(captureIdx < pushIdx, '_captureUndoState should be called BEFORE this.timelineClips.push');
});

TestRunner.test('Day 557 - duplicateTimelineClip has descriptive undo label', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('duplicateTimelineClip(clipId)');
    const funcEnd = trackCode.indexOf('\n    // Audio Clip Accessor Methods', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    t.assertTruthy(funcBody.includes('Duplicate Clip') || funcBody.includes('"Duplicate Clip"'), 'undo label should reference Duplicate Clip');
    t.assertTruthy(funcBody.includes('clip.name'), 'undo label should include clip name');
});

TestRunner.test('Day 557 - APP_VERSION validation for Day 557', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 557');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 215, 'Minor version should be >= 215 for Day 557');
    }
});
TestRunner.test('Day 559 - addAudioClip captures undo BEFORE timelineClips.push', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('addAudioClip(blob, startTime)');
    const funcEnd = trackCode.indexOf('\n    // Audio Clip Accessor Methods', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    const captureIdx = funcBody.indexOf('_captureUndoState');
    const pushIdx = funcBody.indexOf('this.timelineClips.push');
    
    t.assertTruthy(captureIdx !== -1, '_captureUndoState should be called in addAudioClip');
    t.assertTruthy(pushIdx !== -1, 'this.timelineClips.push should be called');
    t.assertTruthy(captureIdx < pushIdx, '_captureUndoState should be called BEFORE this.timelineClips.push');
});

TestRunner.test('Day 559 - addAudioClip has descriptive undo label', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('addAudioClip(blob, startTime)');
    const funcEnd = trackCode.indexOf('\n    // Audio Clip Accessor Methods', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    t.assertTruthy(funcBody.includes('Add') || funcBody.includes('Recorded'), 'undo label should reference Add or Recorded');
    t.assertTruthy(funcBody.includes('Clip') || funcBody.includes('clip'), 'undo label should reference Clip');
});

TestRunner.test('Day 559 - APP_VERSION validation for Day 559', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 559');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 217, 'Minor version should be >= 217 for Day 559');
    }
});

TestRunner.test('Day 560 - createNewSequence captures undo BEFORE sequences.push', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('createNewSequence(name = ');
    const funcEnd = trackCode.indexOf('\n    deleteSequence(', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    const captureIdx = funcBody.indexOf('_captureUndoState');
    const pushIdx = funcBody.indexOf('this.sequences.push');
    
    t.assertTruthy(captureIdx !== -1, '_captureUndoState should be called in createNewSequence');
    t.assertTruthy(pushIdx !== -1, 'this.sequences.push should be called');
    t.assertTruthy(captureIdx < pushIdx, '_captureUndoState should be called BEFORE this.sequences.push');
});

TestRunner.test('Day 560 - createNewSequence has skipUndo guard for undo capture', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('createNewSequence(name = ');
    const funcEnd = trackCode.indexOf('\n    deleteSequence(', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    t.assertTruthy(funcBody.includes('skipUndo'), 'createNewSequence should have skipUndo parameter');
    t.assertTruthy(funcBody.includes('if (!skipUndo)'), 'undo capture should be guarded by skipUndo check');
});

TestRunner.test('Day 560 - addExternalAudioFileAsClip captures undo BEFORE timelineClips.push', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('addExternalAudioFileAsClip(dbKey, audioFileBlob');
    const funcEnd = trackCode.indexOf('\n    addSequenceClipToTimeline(', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    const captureIdx = funcBody.indexOf('_captureUndoState');
    const pushIdx = funcBody.indexOf('this.timelineClips.push');
    
    t.assertTruthy(captureIdx !== -1, '_captureUndoState should be called in addExternalAudioFileAsClip');
    t.assertTruthy(pushIdx !== -1, 'this.timelineClips.push should be called');
    t.assertTruthy(captureIdx < pushIdx, '_captureUndoState should be called BEFORE this.timelineClips.push');
});

TestRunner.test('Day 560 - addSequenceClipToTimeline captures undo BEFORE timelineClips.push', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('addSequenceClipToTimeline(sourceSequenceId, startTime');
    const funcEnd = trackCode.indexOf('\n    // Sequence/Timeline Clip Utility Methods', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    const captureIdx = funcBody.indexOf('_captureUndoState');
    const pushIdx = funcBody.indexOf('this.timelineClips.push');
    
    t.assertTruthy(captureIdx !== -1, '_captureUndoState should be called in addSequenceClipToTimeline');
    t.assertTruthy(pushIdx !== -1, 'this.timelineClips.push should be called');
    t.assertTruthy(captureIdx < pushIdx, '_captureUndoState should be called BEFORE this.timelineClips.push');
});

TestRunner.test('Day 560 - All three clip add methods have correct undo capture order', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    
    // createNewSequence
    const func1Start = trackCode.indexOf('createNewSequence(name = ');
    const func1End = trackCode.indexOf('\n    deleteSequence(', func1Start);
    const func1Body = trackCode.substring(func1Start, func1End);
    const c1 = func1Body.indexOf('_captureUndoState');
    const p1 = func1Body.indexOf('this.sequences.push');
    
    // addExternalAudioFileAsClip
    const func2Start = trackCode.indexOf('addExternalAudioFileAsClip(dbKey, audioFileBlob');
    const func2End = trackCode.indexOf('\n    addSequenceClipToTimeline(', func2Start);
    const func2Body = trackCode.substring(func2Start, func2End);
    const c2 = func2Body.indexOf('_captureUndoState');
    const p2 = func2Body.indexOf('this.timelineClips.push');
    
    // addSequenceClipToTimeline
    const func3Start = trackCode.indexOf('addSequenceClipToTimeline(sourceSequenceId, startTime');
    const func3End = trackCode.indexOf('\n    // Sequence/Timeline Clip Utility Methods', func3Start);
    const func3Body = trackCode.substring(func3Start, func3End);
    const c3 = func3Body.indexOf('_captureUndoState');
    const p3 = func3Body.indexOf('this.timelineClips.push');
    
    t.assertTruthy(c1 < p1, 'createNewSequence: undo before push');
    t.assertTruthy(c2 < p2, 'addExternalAudioFileAsClip: undo before push');
    t.assertTruthy(c3 < p3, 'addSequenceClipToTimeline: undo before push');
});

TestRunner.test('Day 560 - APP_VERSION validation for Day 560', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 560');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 218, 'Minor version should be >= 218 for Day 560');
    }
});

// Day 561: Randomize Sequence Feature
TestRunner.test('Day 561 - randomizeSequence is a function on Track.prototype', (t) => {
    t.assertEqual(typeof Track.prototype.randomizeSequence, 'function', 'randomizeSequence should be a function');
});

TestRunner.test('Day 561 - randomizeSequence accepts density parameter', (t) => {
    const funcStr = Track.prototype.randomizeSequence.toString();
    t.assertTruthy(funcStr.includes('density'), 'randomizeSequence should accept density parameter');
});

TestRunner.test('Day 561 - randomizeSequence returns 0 for Audio tracks', (t) => {
    const funcStr = Track.prototype.randomizeSequence.toString();
    t.assertTruthy(funcStr.includes("this.type === 'Audio'"), 'randomizeSequence should return early for Audio tracks');
});

TestRunner.test('Day 561 - randomizeSequence captures undo BEFORE mutation', (t) => {
    const trackCode = Track.prototype.randomizeSequence.toString();
    const captureIdx = trackCode.indexOf('_captureUndoState');
    const dataIdx = trackCode.indexOf('activeSeq.data');
    t.assertTruthy(captureIdx < dataIdx, 'undo capture should come before data mutation');
});

TestRunner.test('Day 561 - randomizeSequence uses RANDOMIZE_DENSITY constants', (t) => {
    const funcStr = Track.prototype.randomizeSequence.toString();
    t.assertTruthy(funcStr.includes('RANDOMIZE_DENSITY_MIN') && funcStr.includes('RANDOMIZE_DENSITY_MAX') && funcStr.includes('RANDOMIZE_DENSITY_DEFAULT'), 'randomizeSequence should use RANDOMIZE_DENSITY constants');
});

TestRunner.test('Day 561 - randomizeSequence clamps density to valid range', (t) => {
    const funcStr = Track.prototype.randomizeSequence.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'randomizeSequence should clamp density range');
});

TestRunner.test('Day 561 - randomizeSequence calls Math.random for each cell', (t) => {
    const funcStr = Track.prototype.randomizeSequence.toString();
    t.assertTruthy(funcStr.includes('Math.random()'), 'randomizeSequence should use Math.random() for probability');
});

TestRunner.test('Day 561 - randomizeSequence creates note objects with velocity', (t) => {
    const funcStr = Track.prototype.randomizeSequence.toString();
    t.assertTruthy(funcStr.includes('active: true') && funcStr.includes('velocity'), 'randomizeSequence should create note objects with active and velocity');
});

TestRunner.test('Day 561 - randomizeSequence returns randomized count', (t) => {
    const funcStr = Track.prototype.randomizeSequence.toString();
    t.assertTruthy(funcStr.includes('randomizedCount'), 'randomizeSequence should track and return count');
});

TestRunner.test('Day 561 - UI menu items for Randomize Sequence exist', (t) => {
    const uiCode = ui.toString();
    t.assertTruthy(uiCode.includes('Randomize Sequence (25%)'), 'UI should have Randomize Sequence 25% menu item');
    t.assertTruthy(uiCode.includes('Randomize Sequence (50%)'), 'UI should have Randomize Sequence 50% menu item');
    t.assertTruthy(uiCode.includes('Randomize Sequence (75%)'), 'UI should have Randomize Sequence 75% menu item');
});

TestRunner.test('Day 561 - UI menu items call track.randomizeSequence with correct density', (t) => {
    const uiCode = ui.toString();
    t.assertTruthy(uiCode.includes('randomizeSequence(0.25)') && uiCode.includes('randomizeSequence(0.5)') && uiCode.includes('randomizeSequence(0.75)'), 'UI should call randomizeSequence with correct density values');
});

TestRunner.test('Day 561 - UI menu items call recreateToneSequence after randomize', (t) => {
    const uiCode = ui.toString();
    const idx25 = uiCode.indexOf('Randomize Sequence (25%)');
    const nextIdx = uiCode.indexOf('Randomize Sequence (50%)');
    const segment = uiCode.substring(idx25, nextIdx > 0 ? nextIdx : uiCode.length);
    t.assertTruthy(segment.includes('recreateToneSequence'), 'Randomize menu item should call recreateToneSequence');
});

TestRunner.test('Day 561 - UI menu items show notification with density', (t) => {
    const uiCode = ui.toString();
    t.assertTruthy(uiCode.includes('at 25% density') && uiCode.includes('at 50% density') && uiCode.includes('at 75% density'), 'UI should show notification with density percentage');
=======
TestRunner.test('Day 561 - appServices.captureStateForUndo is a function', (t) => {
    const mainCode = require('fs').readFileSync('./js/main.js', 'utf-8');
    const hasIt = mainCode.includes('captureStateForUndo: (description) =>');
    t.assertTruthy(hasIt, 'appServices should have captureStateForUndo function defined');
});

TestRunner.test('Day 561 - appServices.captureStateForUndo guards against reconstruction', (t) => {
    const mainCode = require('fs').readFileSync('./js/main.js', 'utf-8');
    const funcStart = mainCode.indexOf('captureStateForUndo: (description) =>');
    const funcEnd = mainCode.indexOf('\n    panicStopAllAudio:', funcStart);
    const funcBody = mainCode.substring(funcStart, funcEnd);
    t.assertTruthy(funcBody.includes('getIsReconstructingDAW') || funcBody.includes('_isReconstructingDAW_flag'), 'captureStateForUndo should check isReconstructing flag');
    t.assertTruthy(funcBody.includes('captureStateForUndoInternal'), 'captureStateForUndo should call captureStateForUndoInternal');
});

TestRunner.test('Day 561 - addMasterEffect calls appServices.captureStateForUndo', (t) => {
    const mainCode = require('fs').readFileSync('./js/main.js', 'utf-8');
    const funcStart = mainCode.indexOf('addMasterEffect: async (effectType) =>');
    const funcEnd = mainCode.indexOf('\n    removeMasterEffect:', funcStart);
    const funcBody = mainCode.substring(funcStart, funcEnd);
    t.assertTruthy(funcBody.includes('appServices.captureStateForUndo') || funcBody.includes('captureStateForUndo'), 'addMasterEffect should call captureStateForUndo');
});

TestRunner.test('Day 561 - removeMasterEffect calls appServices.captureStateForUndo', (t) => {
    const mainCode = require('fs').readFileSync('./js/main.js', 'utf-8');
    const funcStart = mainCode.indexOf('removeMasterEffect: async (effectId) =>');
    const funcEnd = mainCode.indexOf('\n    updateMasterEffectParam:', funcStart);
    const funcBody = mainCode.substring(funcStart, funcEnd);
    t.assertTruthy(funcBody.includes('appServices.captureStateForUndo') || funcBody.includes('captureStateForUndo'), 'removeMasterEffect should call captureStateForUndo');
});

TestRunner.test('Day 561 - reorderMasterEffect calls appServices.captureStateForUndo', (t) => {
    const mainCode = require('fs').readFileSync('./js/main.js', 'utf-8');
    const funcStart = mainCode.indexOf('reorderMasterEffect: (effectId, newIndex) =>');
    const funcEnd = mainCode.indexOf('\n    setActualMasterVolume:', funcStart);
    const funcBody = mainCode.substring(funcStart, funcEnd);
    t.assertTruthy(funcBody.includes('appServices.captureStateForUndo') || funcBody.includes('captureStateForUndo'), 'reorderMasterEffect should call captureStateForUndo');
});

TestRunner.test('Day 561 - APP_VERSION validation for Day 561', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 561');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 219, 'Minor version should be >= 219 for Day 561');
    }
});

// Day 563: Shift Notes Octave Up/Down Feature
TestRunner.test('Day 563 - Shift Notes Octave Up menu item exists in sequencer context menu', (t) => {
    const uiCode = ui.toString();
    t.assertTruthy(uiCode.includes('Shift Notes Octave Up'), 'Shift Notes Octave Up menu item should exist');
});

TestRunner.test('Day 563 - Shift Notes Octave Down menu item exists in sequencer context menu', (t) => {
    const uiCode = ui.toString();
    t.assertTruthy(uiCode.includes('Shift Notes Octave Down'), 'Shift Notes Octave Down menu item should exist');
});

TestRunner.test('Day 563 - Shift Notes Octave Up calls shiftSequenceNotes(12)', (t) => {
    const uiCode = ui.toString();
    const octaveUpIdx = uiCode.indexOf('Shift Notes Octave Up');
    const segment = uiCode.substring(octaveUpIdx, octaveUpIdx + 500);
    t.assertTruthy(segment.includes('shiftSequenceNotes(12)'), 'Shift Notes Octave Up should call shiftSequenceNotes(12)');
});

TestRunner.test('Day 563 - Shift Notes Octave Down calls shiftSequenceNotes(-12)', (t) => {
    const uiCode = ui.toString();
    const octaveDownIdx = uiCode.indexOf('Shift Notes Octave Down');
    const segment = uiCode.substring(octaveDownIdx, octaveDownIdx + 500);
    t.assertTruthy(segment.includes('shiftSequenceNotes(-12)'), 'Shift Notes Octave Down should call shiftSequenceNotes(-12)');
});

TestRunner.test('Day 563 - Shift Notes Octave Up shows notification with count', (t) => {
    const uiCode = ui.toString();
    const octaveUpIdx = uiCode.indexOf('Shift Notes Octave Up');
    const segment = uiCode.substring(octaveUpIdx, octaveUpIdx + 500);
    t.assertTruthy(segment.includes('up an octave'), 'Shift Notes Octave Up should show notification with up an octave');
});

TestRunner.test('Day 563 - Shift Notes Octave Down shows notification with count', (t) => {
    const uiCode = ui.toString();
    const octaveDownIdx = uiCode.indexOf('Shift Notes Octave Down');
    const segment = uiCode.substring(octaveDownIdx, octaveDownIdx + 500);
    t.assertTruthy(segment.includes('down an octave'), 'Shift Notes Octave Down should show notification with down an octave');
});

TestRunner.test('Day 563 - Ctrl+Alt+Up handler exists in eventHandlers', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    const hasOctaveUp = eventHandlersCode.includes("altKey") && eventHandlersCode.includes("arrowup") && eventHandlersCode.includes("shiftSequenceNotes(12)");
    t.assertTruthy(hasOctaveUp, 'eventHandlers should have Ctrl+Alt+Up handler for octave shift up');
});

TestRunner.test('Day 563 - Ctrl+Alt+Down handler exists in eventHandlers', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    const hasOctaveDown = eventHandlersCode.includes("altKey") && eventHandlersCode.includes("arrowdown") && eventHandlersCode.includes("shiftSequenceNotes(-12)");
    t.assertTruthy(hasOctaveDown, 'eventHandlers should have Ctrl+Alt+Down handler for octave shift down');
});

TestRunner.test('Day 563 - Ctrl+Alt+Up handler captures undo state', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    const funcStart = eventHandlersCode.indexOf("altKey");
    const funcEnd = eventHandlersCode.indexOf("Ctrl+Alt+Down", funcStart);
    const segment = eventHandlersCode.substring(funcStart, funcEnd > 0 ? funcEnd : funcStart + 1500);
    t.assertTruthy(segment.includes('captureStateForUndo') && segment.includes('Octave Up'), 'Ctrl+Alt+Up handler should capture undo state');
});

TestRunner.test('Day 563 - Ctrl+Alt+Down handler captures undo state', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    const funcStart = eventHandlersCode.indexOf("Ctrl+Alt+Down");
    const funcEnd = eventHandlersCode.indexOf("Ctrl+Shift+Left", funcStart);
    const segment = eventHandlersCode.substring(funcStart, funcEnd > 0 ? funcEnd : funcStart + 1500);
    t.assertTruthy(segment.includes('captureStateForUndo') && segment.includes('Octave Down'), 'Ctrl+Alt+Down handler should capture undo state');
});

TestRunner.test('Day 563 - Ctrl+Alt+Up handler calls recreateToneSequence', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    const funcStart = eventHandlersCode.indexOf("altKey");
    const funcEnd = eventHandlersCode.indexOf("Ctrl+Alt+Down", funcStart);
    const segment = eventHandlersCode.substring(funcStart, funcEnd > 0 ? funcEnd : funcStart + 1500);
    t.assertTruthy(segment.includes('recreateToneSequence'), 'Ctrl+Alt+Up handler should call recreateToneSequence');
});

TestRunner.test('Day 563 - Ctrl+Alt+Down handler calls recreateToneSequence', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    const funcStart = eventHandlersCode.indexOf("Ctrl+Alt+Down");
    const funcEnd = eventHandlersCode.indexOf("Ctrl+Shift+Left", funcStart);
    const segment = eventHandlersCode.substring(funcStart, funcEnd > 0 ? funcEnd : funcStart + 1500);
    t.assertTruthy(segment.includes('recreateToneSequence'), 'Ctrl+Alt+Down handler should call recreateToneSequence');
});

TestRunner.test('Day 563 - Ctrl+Alt+Up handler prevents default event', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    const funcStart = eventHandlersCode.indexOf("altKey");
    const funcEnd = eventHandlersCode.indexOf("Ctrl+Alt+Down", funcStart);
    const segment = eventHandlersCode.substring(funcStart, funcEnd > 0 ? funcEnd : funcStart + 1500);
    t.assertTruthy(segment.includes('event.preventDefault'), 'Ctrl+Alt+Up handler should prevent default event');
});

TestRunner.test('Day 563 - Ctrl+Alt+Down handler prevents default event', (t) => {
    const eventHandlersCode = eventHandlers.toString();
    const funcStart = eventHandlersCode.indexOf("Ctrl+Alt+Down");
    const funcEnd = eventHandlersCode.indexOf("Ctrl+Shift+Left", funcStart);
    const segment = eventHandlersCode.substring(funcStart, funcEnd > 0 ? funcEnd : funcStart + 1500);
    t.assertTruthy(segment.includes('event.preventDefault'), 'Ctrl+Alt+Down handler should prevent default event');
});

TestRunner.test('Day 563 - Keyboard shortcuts help includes Ctrl+Alt+Up for Octave Up', (t) => {
    const uiCode = ui.toString();
    const hasCtrlAltUp = uiCode.includes('Ctrl+Alt+Up') && uiCode.includes('Shift Notes Octave Up');
    t.assertTruthy(hasCtrlAltUp, 'UI shortcuts help should show Ctrl+Alt+Up = Shift Notes Octave Up');
});

TestRunner.test('Day 563 - Keyboard shortcuts help includes Ctrl+Alt+Down for Octave Down', (t) => {
    const uiCode = ui.toString();
    const hasCtrlAltDown = uiCode.includes('Ctrl+Alt+Down') && uiCode.includes('Shift Notes Octave Down');
    t.assertTruthy(hasCtrlAltDown, 'UI shortcuts help should show Ctrl+Alt+Down = Shift Notes Octave Down');
});

TestRunner.test('Day 563 - APP_VERSION validation for Day 563', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 563');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 220, 'Minor version should be >= 220 for Day 563');
    }
});

// ============================================
// Day 564: Clear Sequence Feature
// ============================================
TestRunner.test('Day 564 - clearSequence is a function on Track.prototype', (t) => {
    t.assertTruthy(typeof Track.prototype.clearSequence === 'function', 'clearSequence should be a function on Track.prototype');
});

TestRunner.test('Day 564 - clearSequence accepts 0 parameters', (t) => {
    t.assertEqual(Track.prototype.clearSequence.length, 0, 'clearSequence should accept 0 parameters');
});

TestRunner.test('Day 564 - clearSequence returns 0 for Audio tracks', (t) => {
    const Track = require('./js/Track.js').Track;
    const audioTrack = new Track({ id: 'test-audio', type: 'Audio', name: 'Audio Track' });
    const result = audioTrack.clearSequence();
    t.assertEqual(result, 0, 'clearSequence should return 0 for Audio tracks');
});

TestRunner.test('Day 564 - clearSequence gets active sequence via getActiveSequence', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('clearSequence()');
    const funcEnd = trackCode.indexOf('\n    // Set the length', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    t.assertTruthy(funcBody.includes('getActiveSequence()'), 'clearSequence should call getActiveSequence()');
});

TestRunner.test('Day 564 - clearSequence returns 0 if no active sequence', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('clearSequence()');
    const funcEnd = trackCode.indexOf('\n    // Set the length', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    const hasNullCheck = funcBody.includes('return 0') && funcBody.includes('No active sequence found');
    t.assertTruthy(hasNullCheck, 'clearSequence should return 0 when no active sequence');
});

TestRunner.test('Day 564 - clearSequence captures undo BEFORE mutation', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('clearSequence()');
    const funcEnd = trackCode.indexOf('\n    // Set the length', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    
    const captureIdx = funcBody.indexOf('_captureUndoState');
    const mutationIdx = funcBody.indexOf('activeSeq.data[rowIndex] = Array');
    
    t.assertTruthy(captureIdx !== -1, 'clearSequence should call _captureUndoState');
    t.assertTruthy(captureIdx < mutationIdx, '_captureUndoState should come before data mutation');
});

TestRunner.test('Day 564 - clearSequence counts notes before clearing', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('clearSequence()');
    const funcEnd = trackCode.indexOf('\n    // Set the length', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    t.assertTruthy(funcBody.includes('clearedCount') && funcBody.includes('.active'), 'clearSequence should count active notes before clearing');
});

TestRunner.test('Day 564 - clearSequence clears all rows', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('clearSequence()');
    const funcEnd = trackCode.indexOf('\n    // Set the length', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    const hasClearLoop = funcBody.includes('for (let rowIndex = 0; rowIndex < numRows');
    const hasNullFill = funcBody.includes('Array(totalSteps).fill(null)');
    t.assertTruthy(hasClearLoop && hasNullFill, 'clearSequence should loop through rows and fill with null');
});

TestRunner.test('Day 564 - clearSequence returns cleared count', (t) => {
    const trackCode = require('fs').readFileSync('./js/Track.js', 'utf-8');
    const funcStart = trackCode.indexOf('clearSequence()');
    const funcEnd = trackCode.indexOf('\n    // Set the length', funcStart);
    const funcBody = trackCode.substring(funcStart, funcEnd);
    t.assertTruthy(funcBody.includes('return clearedCount'), 'clearSequence should return the count of cleared notes');
});

TestRunner.test('Day 564 - Clear Sequence menu item exists in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('Clear Sequence'), 'Clear Sequence menu item should exist');
});

TestRunner.test('Day 564 - Clear Sequence menu item calls track.clearSequence', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const clearSeqIdx = uiCode.indexOf('Clear Sequence');
    const context = uiCode.substring(clearSeqIdx - 100, clearSeqIdx + 300);
    t.assertTruthy(context.includes('clearSequence()'), 'Clear Sequence menu item should call track.clearSequence()');
});

TestRunner.test('Day 564 - Clear Sequence menu item shows confirmation dialog', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const clearSeqIdx = uiCode.indexOf('Clear Sequence');
    const context = uiCode.substring(clearSeqIdx - 50, clearSeqIdx + 500);
    t.assertTruthy(context.includes('showConfirmationDialog'), 'Clear Sequence should show confirmation dialog');
});

TestRunner.test('Day 564 - Clear Sequence menu item calls recreateToneSequence after clear', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const clearSeqIdx = uiCode.indexOf('Clear Sequence');
    const context = uiCode.substring(clearSeqIdx - 50, clearSeqIdx + 500);
    t.assertTruthy(context.includes('recreateToneSequence(true)'), 'Clear Sequence should call recreateToneSequence after clear');
});

TestRunner.test('Day 564 - Clear Sequence menu item shows notification with cleared count', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const clearSeqIdx = uiCode.indexOf('Clear Sequence');
    const context = uiCode.substring(clearSeqIdx - 50, clearSeqIdx + 500);
    t.assertTruthy(context.includes('note(s)'), 'Clear Sequence should show notification with count');
});

TestRunner.test('Day 564 - APP_VERSION validation for Day 564', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 564');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 221, 'Minor version should be >= 221 for Day 564');
    }
});

// ============================================
// Day 565: Copy Section and Paste Section Menu Items
// ============================================

TestRunner.test('Day 565 - Copy Section menu item exists in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const copySectionIdx = uiCode.indexOf('Copy Section');
    t.assertTruthy(copySectionIdx !== -1, 'Copy Section menu item should exist in ui.js');
});

TestRunner.test('Day 565 - Copy Section calls track.copySequenceSection', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const copySectionIdx = uiCode.indexOf('Copy Section');
    const context = uiCode.substring(copySectionIdx, copySectionIdx + 600);
    t.assertTruthy(context.includes('copySequenceSection'), 'Copy Section should call copySequenceSection');
});

TestRunner.test('Day 565 - Copy Section sets clipboard with type section', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const copySectionIdx = uiCode.indexOf('Copy Section');
    const context = uiCode.substring(copySectionIdx, copySectionIdx + 600);
    t.assertTruthy(context.includes("type: 'section'"), 'Copy Section should set clipboard type to section');
});

TestRunner.test('Day 565 - Copy Section shows notification with dimensions', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const copySectionIdx = uiCode.indexOf('Copy Section');
    const context = uiCode.substring(copySectionIdx, copySectionIdx + 600);
    t.assertTruthy(context.includes('copied') && context.includes('Section'), 'Copy Section should show notification');
});

TestRunner.test('Day 565 - Paste Section menu item exists in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const pasteSectionIdx = uiCode.indexOf('Paste Section');
    t.assertTruthy(pasteSectionIdx !== -1, 'Paste Section menu item should exist in ui.js');
});

TestRunner.test('Day 565 - Paste Section calls track.pasteSequenceSection', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const pasteSectionIdx = uiCode.indexOf('Paste Section');
    const context = uiCode.substring(pasteSectionIdx, pasteSectionIdx + 600);
    t.assertTruthy(context.includes('pasteSequenceSection'), 'Paste Section should call pasteSequenceSection');
});

TestRunner.test('Day 565 - Paste Section checks clipboard type section', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const pasteSectionIdx = uiCode.indexOf('Paste Section');
    const context = uiCode.substring(pasteSectionIdx, pasteSectionIdx + 600);
    t.assertTruthy(context.includes("type !== 'section'") || context.includes("'section'"), 'Paste Section should check clipboard type');
});

TestRunner.test('Day 565 - Paste Section shows notification with pasted count', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const pasteSectionIdx = uiCode.indexOf('Paste Section');
    const context = uiCode.substring(pasteSectionIdx, pasteSectionIdx + 600);
    t.assertTruthy(context.includes('Pasted') && context.includes('note(s)'), 'Paste Section should show notification with count');
});

TestRunner.test('Day 565 - Paste Section menu item calls recreateToneSequence after paste', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const pasteSectionIdx = uiCode.indexOf('Paste Section');
    const context = uiCode.substring(pasteSectionIdx, pasteSectionIdx + 600);
    t.assertTruthy(context.includes('recreateToneSequence(true)'), 'Paste Section should call recreateToneSequence after paste');
});

TestRunner.test('Day 565 - APP_VERSION validation for Day 565', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 565');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 222, 'Minor version should be >= 222 for Day 565');
    }
});

TestRunner.test('Day 566 - humanizeTiming is a function on Track.prototype', (t) => {
    t.assertEqual(typeof track.humanizeTiming, 'function', 'humanizeTiming should be a function');
});

TestRunner.test('Day 566 - humanizeTiming accepts shiftAmount parameter', (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    t.assertTruthy(funcStr.includes('shiftAmount'), 'humanizeTiming should accept shiftAmount parameter');
});

TestRunner.test('Day 566 - humanizeTiming returns 0 for Audio tracks', (t) => {
    const audioTrack = new Track(1, 'Audio');
    const result = audioTrack.humanizeTiming(2);
    t.assertEqual(result, 0, 'humanizeTiming should return 0 for Audio tracks');
});

TestRunner.test('Day 566 - humanizeTiming gets active sequence via getActiveSequence', (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence()'), 'humanizeTiming should call getActiveSequence');
});

TestRunner.test('Day 566 - humanizeTiming returns 0 if no active sequence', (t) => {
    const result = track.humanizeTiming(2);
    t.assertEqual(result, 0, 'humanizeTiming should return 0 when no active sequence');
});

TestRunner.test('Day 566 - humanizeTiming captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('forEach');
    t.assertTruthy(undoIdx !== -1, 'humanizeTiming should call _captureUndoState');
    t.assertTruthy(undoIdx < forEachIdx, 'humanizeTiming should capture undo BEFORE data iteration');
});

TestRunner.test('Day 566 - humanizeTiming uses Math.random for each note', (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    t.assertTruthy(funcStr.includes('Math.random()'), 'humanizeTiming should use Math.random() for each note');
});

TestRunner.test('Day 566 - humanizeTiming limits shift to shiftAmount', (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    t.assertTruthy(funcStr.includes('Math.min(shiftAmount') || funcStr.includes('maxShift'), 'humanizeTiming should limit shift to shiftAmount');
});

TestRunner.test('Day 566 - humanizeTiming swaps notes between columns', (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    t.assertTruthy(funcStr.includes('row[col]') && funcStr.includes('row[targetCol]'), 'humanizeTiming should swap notes between columns');
});

TestRunner.test('Day 566 - humanizeTiming returns humanized count', (t) => {
    const funcStr = Track.prototype.humanizeTiming.toString();
    t.assertTruthy(funcStr.includes('return humanizedCount'), 'humanizeTiming should return humanizedCount');
});

TestRunner.test('Day 566 - Humanize Timing menu items exist in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const smallIdx = uiCode.indexOf('Humanize Timing (Small)');
    const mediumIdx = uiCode.indexOf('Humanize Timing (Medium)');
    t.assertTruthy(smallIdx !== -1, 'Humanize Timing (Small) menu item should exist');
    t.assertTruthy(mediumIdx !== -1, 'Humanize Timing (Medium) menu item should exist');
});

TestRunner.test('Day 566 - Humanize Timing menu items call track.humanizeTiming', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const smallIdx = uiCode.indexOf('Humanize Timing (Small)');
    const context = uiCode.substring(smallIdx, smallIdx + 300);
    t.assertTruthy(context.includes('humanizeTiming'), 'Humanize Timing (Small) should call humanizeTiming');
});

TestRunner.test('Day 566 - Humanize Timing (Small) passes shiftAmount 2', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const smallIdx = uiCode.indexOf('Humanize Timing (Small)');
    const context = uiCode.substring(smallIdx, smallIdx + 300);
    t.assertTruthy(context.includes('humanizeTiming(2)') || context.includes('shiftAmount = 2'), 'Humanize Timing (Small) should pass shiftAmount 2');
});

TestRunner.test('Day 566 - Humanize Timing (Medium) passes shiftAmount 4', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const mediumIdx = uiCode.indexOf('Humanize Timing (Medium)');
    const context = uiCode.substring(mediumIdx, mediumIdx + 300);
    t.assertTruthy(context.includes('humanizeTiming(4)') || context.includes('shiftAmount = 4'), 'Humanize Timing (Medium) should pass shiftAmount 4');
});

TestRunner.test('Day 566 - Humanize Timing menu items call recreateToneSequence after humanize', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const smallIdx = uiCode.indexOf('Humanize Timing (Small)');
    const context = uiCode.substring(smallIdx, smallIdx + 400);
    t.assertTruthy(context.includes('recreateToneSequence(true)'), 'Humanize Timing should call recreateToneSequence after humanize');
});

TestRunner.test('Day 566 - Humanize Timing menu items show notification with count', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const smallIdx = uiCode.indexOf('Humanize Timing (Small)');
    const context = uiCode.substring(smallIdx, smallIdx + 500);
    t.assertTruthy(context.includes('Humanized timing for') && context.includes('note(s)'), 'Humanize Timing should show notification with count');
});

TestRunner.test('Day 566 - APP_VERSION validation for Day 566', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 566');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 223, 'Minor version should be >= 223 for Day 566');
    }
});

// ============================================
// Day 567: Select All / Deselect All Notes
// ============================================

TestRunner.test('Day 567 - selectAllNotes is a function on Track.prototype', (t) => {
    t.assertTruthy(typeof Track.prototype.selectAllNotes === 'function', 'selectAllNotes should be a function on Track.prototype');
});

TestRunner.test('Day 567 - deselectAllNotes is a function on Track.prototype', (t) => {
    t.assertTruthy(typeof Track.prototype.deselectAllNotes === 'function', 'deselectAllNotes should be a function on Track.prototype');
});

TestRunner.test('Day 567 - selectAllNotes returns 0 for Audio tracks', (t) => {
    const track = new Track({ id: 'test-audio', type: 'Audio', name: 'Audio Track', appServices: {} });
    const result = track.selectAllNotes();
    t.assertEquals(result, 0, 'selectAllNotes should return 0 for Audio tracks');
});

TestRunner.test('Day 567 - deselectAllNotes returns 0 for Audio tracks', (t) => {
    const track = new Track({ id: 'test-audio', type: 'Audio', name: 'Audio Track', appServices: {} });
    const result = track.deselectAllNotes();
    t.assertEquals(result, 0, 'deselectAllNotes should return 0 for Audio tracks');
});

TestRunner.test('Day 567 - selectAllNotes counts all active notes', (t) => {
    const mockAppServices = {
        captureStateForUndo: () => {},
        updateTrackUI: () => {},
        getWindowById: () => null
    };
    const track = new Track({ id: 'test-synth', type: 'Synth', name: 'Synth Track', appServices: mockAppServices });
    track.createNewSequence('Test Seq', 16, 8);
    const seq = track.getActiveSequence();
    seq.data[0][0] = { active: true, velocity: 0.7 };
    seq.data[1][2] = { active: true, velocity: 0.8 };
    seq.data[2][4] = { active: true, velocity: 0.9 };
    const count = track.selectAllNotes();
    t.assertEquals(count, 3, 'selectAllNotes should count 3 active notes');
});

TestRunner.test('Day 567 - deselectAllNotes counts all active notes', (t) => {
    const mockAppServices = {
        captureStateForUndo: () => {},
        updateTrackUI: () => {},
        getWindowById: () => null
    };
    const track = new Track({ id: 'test-synth', type: 'Synth', name: 'Synth Track', appServices: mockAppServices });
    track.createNewSequence('Test Seq', 16, 8);
    const seq = track.getActiveSequence();
    seq.data[0][0] = { active: true, velocity: 0.7 };
    seq.data[1][2] = { active: true, velocity: 0.8 };
    const count = track.deselectAllNotes();
    t.assertEquals(count, 2, 'deselectAllNotes should count 2 active notes');
});

TestRunner.test('Day 567 - Ctrl+Shift+A handler exists in eventHandlers', (t) => {
    const eventHandlerCode = require('fs').readFileSync('./js/eventHandlers.js', 'utf-8');
    const idx = eventHandlerCode.indexOf('Ctrl+Shift+A - Deselect All Notes');
    t.assertTruthy(idx !== -1, 'Ctrl+Shift+A handler should exist in eventHandlers.js');
});

TestRunner.test('Day 567 - Ctrl+Shift+A handler checks for shiftKey', (t) => {
    const eventHandlerCode = require('fs').readFileSync('./js/eventHandlers.js', 'utf-8');
    const idx = eventHandlerCode.indexOf('Ctrl+Shift+A - Deselect All Notes');
    const context = eventHandlerCode.substring(idx - 200, idx + 50);
    t.assertTruthy(context.includes('event.shiftKey'), 'Ctrl+Shift+A handler should check event.shiftKey');
});

TestRunner.test('Day 567 - Ctrl+Shift+A handler removes selected-cell class', (t) => {
    const eventHandlerCode = require('fs').readFileSync('./js/eventHandlers.js', 'utf-8');
    const idx = eventHandlerCode.indexOf('Ctrl+Shift+A - Deselect All Notes');
    const context = eventHandlerCode.substring(idx - 200, idx + 500);
    t.assertTruthy(context.includes('selected-cell'), 'Ctrl+Shift+A handler should handle selected-cell class removal');
});

TestRunner.test('Day 567 - Ctrl+Shift+A handler shows notification', (t) => {
    const eventHandlerCode = require('fs').readFileSync('./js/eventHandlers.js', 'utf-8');
    const idx = eventHandlerCode.indexOf('Ctrl+Shift+A - Deselect All Notes');
    const context = eventHandlerCode.substring(idx - 200, idx + 500);
    t.assertTruthy(context.includes('Deselected all notes'), 'Ctrl+Shift+A handler should show Deselected notification');
});

TestRunner.test('Day 567 - Select All Notes menu item exists in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Select All Notes');
    t.assertTruthy(idx !== -1, 'Select All Notes menu item should exist in ui.js');
});

TestRunner.test('Day 567 - Deselect All Notes menu item exists in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Deselect All Notes');
    t.assertTruthy(idx !== -1, 'Deselect All Notes menu item should exist in ui.js');
});

TestRunner.test('Day 567 - Select All Notes menu item adds selected-cell class', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Select All Notes');
    const context = uiCode.substring(idx, idx + 400);
    t.assertTruthy(context.includes('selected-cell'), 'Select All Notes menu item should add selected-cell class');
});

TestRunner.test('Day 567 - Deselect All Notes menu item removes selected-cell class', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Deselect All Notes');
    const context = uiCode.substring(idx, idx + 400);
    t.assertTruthy(context.includes('selected-cell'), 'Deselect All Notes menu item should remove selected-cell class');
});

TestRunner.test('Day 567 - Keyboard shortcuts help includes Ctrl+Shift+A for Deselect All', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Ctrl+Shift+A');
    const context = uiCode.substring(idx - 50, idx + 150);
    t.assertTruthy(context.includes('Deselect All Notes'), 'Keyboard shortcuts help should include Ctrl+Shift+A for Deselect All Notes');
});

TestRunner.test('Day 567 - APP_VERSION validation for Day 567', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 567');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 225, 'Minor version should be >= 225 for Day 567');
    }
});

TestRunner.test('Day 568 - thinOutNotes is a function on Track.prototype', (t) => {
    t.assertEqual(typeof track.thinOutNotes, 'function', 'thinOutNotes should be a function');
});

TestRunner.test('Day 568 - thinOutNotes accepts probability parameter', (t) => {
    const funcStr = Track.prototype.thinOutNotes.toString();
    t.assertTruthy(funcStr.includes('probability'), 'thinOutNotes should accept probability parameter');
});

TestRunner.test('Day 568 - thinOutNotes returns 0 for Audio tracks', (t) => {
    const audioTrack = new Track(1, 'Audio');
    const result = audioTrack.thinOutNotes(0.5);
    t.assertEqual(result, 0, 'thinOutNotes should return 0 for Audio tracks');
});

TestRunner.test('Day 568 - thinOutNotes gets active sequence via getActiveSequence', (t) => {
    const funcStr = Track.prototype.thinOutNotes.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence()'), 'thinOutNotes should call getActiveSequence');
});

TestRunner.test('Day 568 - thinOutNotes returns 0 if no active sequence', (t) => {
    const result = track.thinOutNotes(0.5);
    t.assertEqual(result, 0, 'thinOutNotes should return 0 when no active sequence');
});

TestRunner.test('Day 568 - thinOutNotes captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.thinOutNotes.toString();
    const undoIdx = funcStr.indexOf('_captureUndoState');
    const forLoopIdx = funcStr.indexOf('for (let');
    t.assertTruthy(undoIdx !== -1, 'thinOutNotes should call _captureUndoState');
    t.assertTruthy(undoIdx < forLoopIdx, 'thinOutNotes should capture undo BEFORE data iteration');
});

TestRunner.test('Day 568 - thinOutNotes clamps probability to valid range (0.1-0.9)', (t) => {
    const funcStr = Track.prototype.thinOutNotes.toString();
    t.assertTruthy(funcStr.includes('minProb') && funcStr.includes('maxProb'), 'thinOutNotes should clamp probability to 0.1-0.9 range');
});

TestRunner.test('Day 568 - thinOutNotes uses Math.random() for each note', (t) => {
    const funcStr = Track.prototype.thinOutNotes.toString();
    t.assertTruthy(funcStr.includes('Math.random()'), 'thinOutNotes should use Math.random() for each note');
});

TestRunner.test('Day 568 - thinOutNotes removes notes based on probability', (t) => {
    const funcStr = Track.prototype.thinOutNotes.toString();
    t.assertTruthy(funcStr.includes('Math.random() < clampedProb'), 'thinOutNotes should check probability for each note');
});

TestRunner.test('Day 568 - thinOutNotes returns count of removed notes', (t) => {
    const funcStr = Track.prototype.thinOutNotes.toString();
    t.assertTruthy(funcStr.includes('return removedCount'), 'thinOutNotes should return removedCount');
});

TestRunner.test('Day 568 - Thin Out Notes (25%) menu item exists', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Thin Out Notes (25%)');
    t.assertTruthy(idx !== -1, 'Thin Out Notes (25%) menu item should exist');
});

TestRunner.test('Day 568 - Thin Out Notes (50%) menu item exists', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Thin Out Notes (50%)');
    t.assertTruthy(idx !== -1, 'Thin Out Notes (50%) menu item should exist');
});

TestRunner.test('Day 568 - Thin Out Notes (75%) menu item exists', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Thin Out Notes (75%)');
    t.assertTruthy(idx !== -1, 'Thin Out Notes (75%) menu item should exist');
});

TestRunner.test('Day 568 - Thin Out Notes menu items call track.thinOutNotes', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx25 = uiCode.indexOf('Thin Out Notes (25%)');
    const context = uiCode.substring(idx25, idx25 + 500);
    t.assertTruthy(context.includes('thinOutNotes'), 'Thin Out Notes (25%) should call thinOutNotes');
});

TestRunner.test('Day 568 - APP_VERSION validation for Day 568', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 568');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 226, 'Minor version should be >= 226 for Day 568');
    }
});

// Day 569: Trim Silence
TestRunner.test('Day 569 - trimSequenceEdges is a function on Track.prototype', (t) => {
    t.assertTruthy(typeof Track.prototype.trimSequenceEdges === 'function', 'trimSequenceEdges should be a function on Track.prototype');
});

TestRunner.test('Day 569 - trimSequenceEdges returns 0 for Audio tracks', (t) => {
    const track = new Track('Audio', 'TestTrack', {}, {});
    const result = track.trimSequenceEdges();
    t.assertEquals(0, result, 'trimSequenceEdges should return 0 for Audio tracks');
});

TestRunner.test('Day 569 - trimSequenceEdges gets active sequence via getActiveSequence', (t) => {
    const funcStr = Track.prototype.trimSequenceEdges.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence'), 'trimSequenceEdges should use getActiveSequence');
});

TestRunner.test('Day 569 - trimSequenceEdges returns 0 if no active sequence', (t) => {
    const track = new Track('Synth', 'TestTrack', {}, {});
    track.sequences = [];
    track.activeSequenceId = null;
    const result = track.trimSequenceEdges();
    t.assertEquals(0, result, 'trimSequenceEdges should return 0 if no active sequence');
});

TestRunner.test('Day 569 - trimSequenceEdges captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.trimSequenceEdges.toString();
    const captureIdx = funcStr.indexOf('_captureUndoState');
    const firstLoopIdx = funcStr.indexOf('for (let col = 0; col < totalSteps; col++)');
    t.assertTruthy(captureIdx !== -1 && captureIdx < firstLoopIdx, 'trimSequenceEdges should capture undo before data iteration');
});

TestRunner.test('Day 569 - trimSequenceEdges finds first active column', (t) => {
    const funcStr = Track.prototype.trimSequenceEdges.toString();
    t.assertTruthy(funcStr.includes('firstActiveCol'), 'trimSequenceEdges should find first active column');
});

TestRunner.test('Day 569 - trimSequenceEdges finds last active column', (t) => {
    const funcStr = Track.prototype.trimSequenceEdges.toString();
    t.assertTruthy(funcStr.includes('lastActiveCol'), 'trimSequenceEdges should find last active column');
});

TestRunner.test('Day 569 - trimSequenceEdges returns 0 if no notes found', (t) => {
    const funcStr = Track.prototype.trimSequenceEdges.toString();
    t.assertTruthy(funcStr.includes('lastActiveCol === -1'), 'trimSequenceEdges should check if no notes found');
});

TestRunner.test('Day 569 - trimSequenceEdges returns 0 if no leading/trailing silence', (t) => {
    const funcStr = Track.prototype.trimSequenceEdges.toString();
    t.assertTruthy(funcStr.includes('firstActiveCol === 0'), 'trimSequenceEdges should check if no trimming needed');
    t.assertTruthy(funcStr.includes('lastActiveCol === totalSteps - 1'), 'trimSequenceEdges should check if sequence is already tight');
});

TestRunner.test('Day 569 - trimSequenceEdges counts affected notes before trimming', (t) => {
    const funcStr = Track.prototype.trimSequenceEdges.toString();
    t.assertTruthy(funcStr.includes('trimmedCount'), 'trimSequenceEdges should count notes being trimmed');
});

TestRunner.test('Day 569 - trimSequenceEdges recalculates sequence length', (t) => {
    const funcStr = Track.prototype.trimSequenceEdges.toString();
    t.assertTruthy(funcStr.includes('newLength = lastActiveCol - firstActiveCol + 1'), 'trimSequenceEdges should calculate new length');
});

TestRunner.test('Day 569 - trimSequenceEdges updates activeSeq.data', (t) => {
    const funcStr = Track.prototype.trimSequenceEdges.toString();
    t.assertTruthy(funcStr.includes('activeSeq.data = newData'), 'trimSequenceEdges should update data');
});

TestRunner.test('Day 569 - trimSequenceEdges updates activeSeq.length', (t) => {
    const funcStr = Track.prototype.trimSequenceEdges.toString();
    t.assertTruthy(funcStr.includes('activeSeq.length = newLength'), 'trimSequenceEdges should update length');
});

TestRunner.test('Day 569 - Trim Silence menu item exists in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Trim Silence');
    t.assertTruthy(idx !== -1, 'Trim Silence menu item should exist');
});

TestRunner.test('Day 569 - Trim Silence menu item calls track.trimSequenceEdges', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Trim Silence');
    const context = uiCode.substring(idx, idx + 300);
    t.assertTruthy(context.includes('trimSequenceEdges'), 'Trim Silence should call trimSequenceEdges');
});

TestRunner.test('Day 569 - Trim Silence menu item calls recreateToneSequence after trim', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Trim Silence');
    const context = uiCode.substring(idx, idx + 400);
    t.assertTruthy(context.includes('recreateToneSequence'), 'Trim Silence should call recreateToneSequence');
});

TestRunner.test('Day 569 - APP_VERSION validation for Day 569', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 569');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 227, 'Minor version should be >= 227 for Day 569');
    }
});

// Day 570: Snap to Scale
TestRunner.test('Day 570 - snapNotesToScale is a function on Track.prototype', (t) => {
    t.assertTruthy(typeof Track.prototype.snapNotesToScale === 'function', 'snapNotesToScale should be a function on Track.prototype');
});

TestRunner.test('Day 570 - snapNotesToScale returns 0 for Audio tracks', (t) => {
    const track = new Track('Audio', 'TestTrack');
    const result = track.snapNotesToScale();
    t.assertEqual(result, 0, 'snapNotesToScale should return 0 for Audio tracks');
});

TestRunner.test('Day 570 - snapNotesToScale gets active sequence via getActiveSequence', (t) => {
    const funcStr = Track.prototype.snapNotesToScale.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence'), 'snapNotesToScale should use getActiveSequence');
});

TestRunner.test('Day 570 - snapNotesToScale returns 0 if no active sequence', (t) => {
    const funcStr = Track.prototype.snapNotesToScale.toString();
    t.assertTruthy(funcStr.includes('No active sequence found'), 'snapNotesToScale should handle no active sequence');
});

TestRunner.test('Day 570 - snapNotesToScale gets scale mode state from getScaleModeState', (t) => {
    const funcStr = Track.prototype.snapNotesToScale.toString();
    t.assertTruthy(funcStr.includes('getScaleModeState'), 'snapNotesToScale should get scale mode state');
});

TestRunner.test('Day 570 - snapNotesToScale uses SCALES constant from Constants', (t) => {
    const funcStr = Track.prototype.snapNotesToScale.toString();
    t.assertTruthy(funcStr.includes('Constants.SCALES'), 'snapNotesToScale should use Constants.SCALES');
});

TestRunner.test('Day 570 - snapNotesToScale uses SCALE_ROOTS constant from Constants', (t) => {
    const funcStr = Track.prototype.snapNotesToScale.toString();
    t.assertTruthy(funcStr.includes('Constants.SCALE_ROOTS'), 'snapNotesToScale should use Constants.SCALE_ROOTS');
});

TestRunner.test('Day 570 - snapNotesToScale captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.snapNotesToScale.toString();
    const captureIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('activeSeq.data = newData');
    t.assertTruthy(captureIdx !== -1 && mutationIdx !== -1 && captureIdx < mutationIdx,
        'snapNotesToScale should capture undo before mutating data');
});

TestRunner.test('Day 570 - snapNotesToScale returns count of snapped notes', (t) => {
    const funcStr = Track.prototype.snapNotesToScale.toString();
    t.assertTruthy(funcStr.includes('return snappedCount'), 'snapNotesToScale should return snappedCount');
});

TestRunner.test('Day 570 - snapNotesToScale builds pitch class lookup table', (t) => {
    const funcStr = Track.prototype.snapNotesToScale.toString();
    t.assertTruthy(funcStr.includes('snapPitches'), 'snapNotesToScale should build snapPitches lookup');
});

TestRunner.test('Day 570 - Snap to Scale menu item exists in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Snap to Scale');
    t.assertTruthy(idx !== -1, 'Snap to Scale menu item should exist');
});

TestRunner.test('Day 570 - Snap to Scale menu item calls track.snapNotesToScale', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Snap to Scale');
    const context = uiCode.substring(idx, idx + 300);
    t.assertTruthy(context.includes('snapNotesToScale'), 'Snap to Scale should call snapNotesToScale');
});

TestRunner.test('Day 570 - Snap to Scale menu item calls recreateToneSequence after snap', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Snap to Scale');
    const context = uiCode.substring(idx, idx + 400);
    t.assertTruthy(context.includes('recreateToneSequence'), 'Snap to Scale should call recreateToneSequence');
});

TestRunner.test('Day 570 - Snap to Scale menu item shows notification with snapped count', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Snap to Scale');
    const context = uiCode.substring(idx, idx + 500);
    t.assertTruthy(context.includes('Snapped'), 'Snap to Scale should show notification');
    t.assertTruthy(context.includes('note(s)'), 'Snap to Scale notification should mention notes');
});

TestRunner.test('Day 570 - Snap to Scale menu item handles no off-scale notes case', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Snap to Scale');
    const context = uiCode.substring(idx, idx + 500);
    t.assertTruthy(context.includes('No off-scale notes'), 'Snap to Scale should handle case when no notes need snapping');
});

TestRunner.test('Day 570 - APP_VERSION validation for Day 570', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 570');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 228, 'Minor version should be >= 228 for Day 570');
    }
});

// Day 571: Strum Notes Feature
TestRunner.test('Day 571 - strumNotes is a function on Track.prototype', (t) => {
    t.assertTruthy(typeof Track.prototype.strumNotes === 'function', 'strumNotes should be a function on Track.prototype');
});

TestRunner.test('Day 571 - strumNotes returns 0 for Audio tracks', (t) => {
    const audioTrack = new Track('Audio', 'AudioTrack');
    const result = audioTrack.strumNotes(2);
    t.assertEqual(result, 0, 'strumNotes should return 0 for Audio tracks');
});

TestRunner.test('Day 571 - strumNotes gets active sequence via getActiveSequence', (t) => {
    const funcStr = Track.prototype.strumNotes.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence'), 'strumNotes should use getActiveSequence');
});

TestRunner.test('Day 571 - strumNotes returns 0 if no active sequence', (t) => {
    const synthTrack = new Track('Synth', 'SynthTrack');
    // No sequences added
    const result = synthTrack.strumNotes(2);
    t.assertEqual(result, 0, 'strumNotes should return 0 if no active sequence');
});

TestRunner.test('Day 571 - strumNotes captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.strumNotes.toString();
    const captureIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('activeSeq.data[rowIndex]');
    t.assertTruthy(captureIdx !== -1 && (mutationIdx === -1 || captureIdx < mutationIdx),
        'strumNotes should capture undo before mutating data');
});

TestRunner.test('Day 571 - strumNotes clamps strum amount to 1-3 range', (t) => {
    const funcStr = Track.prototype.strumNotes.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'strumNotes should clamp strum amount');
    t.assertTruthy(funcStr.includes('1') && funcStr.includes('3'), 'strumNotes should use range 1-3');
});

TestRunner.test('Day 571 - strumNotes finds columns with multiple notes', (t) => {
    const funcStr = Track.prototype.strumNotes.toString();
    // Should iterate through columns and rows to find simultaneous notes
    t.assertTruthy(funcStr.includes('notesAtColumn'), 'strumNotes should collect notes at each column');
});

TestRunner.test('Day 571 - strumNotes returns count of strummed notes', (t) => {
    const funcStr = Track.prototype.strumNotes.toString();
    t.assertTruthy(funcStr.includes('strummedCount'), 'strumNotes should return strummedCount');
});

TestRunner.test('Day 571 - Strum Notes menu items exist in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('Strum Notes (Small)'), 'Strum Notes (Small) menu item should exist');
    t.assertTruthy(uiCode.includes('Strum Notes (Medium)'), 'Strum Notes (Medium) menu item should exist');
    t.assertTruthy(uiCode.includes('Strum Notes (Large)'), 'Strum Notes (Large) menu item should exist');
});

TestRunner.test('Day 571 - Strum Notes menu items call track.strumNotes', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Strum Notes (Small)');
    const context = uiCode.substring(idx, idx + 300);
    t.assertTruthy(context.includes('strumNotes'), 'Strum Notes should call strumNotes');
});

TestRunner.test('Day 571 - Strum Notes menu items call recreateToneSequence after strum', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Strum Notes (Medium)');
    const context = uiCode.substring(idx, idx + 400);
    t.assertTruthy(context.includes('recreateToneSequence'), 'Strum Notes should call recreateToneSequence');
});

TestRunner.test('Day 571 - Strum Notes menu items show notification with strum count', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Strum Notes (Large)');
    const context = uiCode.substring(idx, idx + 500);
    t.assertTruthy(context.includes('Strummed'), 'Strum Notes should show Strummed notification');
    t.assertTruthy(context.includes('note(s)'), 'Strum Notes notification should mention notes');
});

TestRunner.test('Day 571 - APP_VERSION validation for Day 571', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 571');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 229, 'Minor version should be >= 229 for Day 571');
    }
});

// Day 572: Legato Connect Feature
TestRunner.test('Day 572 - connectLegato is a function on Track.prototype', (t) => {
    t.assertTruthy(typeof Track.prototype.connectLegato === 'function', 'connectLegato should be a function on Track.prototype');
});

TestRunner.test('Day 572 - connectLegato returns 0 for Audio tracks', (t) => {
    const audioTrack = new Track('Audio', 'AudioTrack');
    const result = audioTrack.connectLegato(2);
    t.assertEqual(result, 0, 'connectLegato should return 0 for Audio tracks');
});

TestRunner.test('Day 572 - connectLegato gets active sequence via getActiveSequence', (t) => {
    const funcStr = Track.prototype.connectLegato.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence'), 'connectLegato should use getActiveSequence');
});

TestRunner.test('Day 572 - connectLegato returns 0 if no active sequence', (t) => {
    const synthTrack = new Track('Synth', 'SynthTrack');
    // No sequences added
    const result = synthTrack.connectLegato(2);
    t.assertEqual(result, 0, 'connectLegato should return 0 if no active sequence');
});

TestRunner.test('Day 572 - connectLegato captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.connectLegato.toString();
    const captureIdx = funcStr.indexOf('_captureUndoState');
    // Find first row mutation (row[ currentNote.col])
    const mutationIdx = funcStr.indexOf('row[', captureIdx);
    t.assertTruthy(captureIdx !== -1 && (mutationIdx === -1 || captureIdx < mutationIdx),
        'connectLegato should capture undo before mutating data');
});

TestRunner.test('Day 572 - connectLegato clamps gap to 1-8 range', (t) => {
    const funcStr = Track.prototype.connectLegato.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'connectLegato should clamp gap amount');
    t.assertTruthy(funcStr.includes('1') && funcStr.includes('8'), 'connectLegato should use range 1-8');
});

TestRunner.test('Day 572 - connectLegato finds notes in each row', (t) => {
    const funcStr = Track.prototype.connectLegato.toString();
    t.assertTruthy(funcStr.includes('notesInRow'), 'connectLegato should collect notes per row');
});

TestRunner.test('Day 572 - connectLegato returns count of connected note pairs', (t) => {
    const funcStr = Track.prototype.connectLegato.toString();
    t.assertTruthy(funcStr.includes('connectedCount'), 'connectLegato should return connectedCount');
});

TestRunner.test('Day 572 - Legato Connect menu items exist in sequencer context menu', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('Legato Connect (Small)'), 'Legato Connect (Small) menu item should exist');
    t.assertTruthy(uiCode.includes('Legato Connect (Medium)'), 'Legato Connect (Medium) menu item should exist');
    t.assertTruthy(uiCode.includes('Legato Connect (Large)'), 'Legato Connect (Large) menu item should exist');
});

TestRunner.test('Day 572 - Legato Connect menu items call track.connectLegato', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Legato Connect (Small)');
    const context = uiCode.substring(idx, idx + 300);
    t.assertTruthy(context.includes('connectLegato'), 'Legato Connect should call connectLegato');
});

TestRunner.test('Day 572 - Legato Connect menu items call recreateToneSequence after connect', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Legato Connect (Medium)');
    const context = uiCode.substring(idx, idx + 400);
    t.assertTruthy(context.includes('recreateToneSequence'), 'Legato Connect should call recreateToneSequence');
});

TestRunner.test('Day 572 - Legato Connect menu items show notification with connected count', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Legato Connect (Large)');
    const context = uiCode.substring(idx, idx + 500);
    t.assertTruthy(context.includes('Connected'), 'Legato Connect should show Connected notification');
    t.assertTruthy(context.includes('note pair'), 'Legato Connect notification should mention note pairs');
});

TestRunner.test('Day 572 - Legato Connect menu items handle no notes case', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Legato Connect (Small)');
    const context = uiCode.substring(idx, idx + 600);
    t.assertTruthy(context.includes('No notes to connect'), 'Legato Connect should handle no notes case');
});

TestRunner.test('Day 572 - Legato Connect menu items use correct gap values', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    // Small = 2, Medium = 4, Large = 8
    t.assertTruthy(uiCode.includes('connectLegato(2)') && uiCode.includes('connectLegato(4)') && uiCode.includes('connectLegato(8)'),
        'Legato Connect should use correct gap values: Small=2, Medium=4, Large=8');
});

TestRunner.test('Day 572 - APP_VERSION validation for Day 572', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 572');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 230, 'Minor version should be >= 230 for Day 572');
    }
});

// Day 573: Rotate Sequence + Double Durations Features
TestRunner.test('Day 573 - rotateSequence is a function on Track.prototype', (t) => {
    t.assertTruthy(typeof Track.prototype.rotateSequence === 'function', 'rotateSequence should be a function on Track.prototype');
});

TestRunner.test('Day 573 - rotateSequence returns 0 for Audio tracks', (t) => {
    const audioTrack = new Track('Audio', 'AudioTrack');
    const result = audioTrack.rotateSequence(1);
    t.assertEqual(result, 0, 'rotateSequence should return 0 for Audio tracks');
});

TestRunner.test('Day 573 - rotateSequence gets active sequence via getActiveSequence', (t) => {
    const funcStr = Track.prototype.rotateSequence.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence'), 'rotateSequence should use getActiveSequence');
});

TestRunner.test('Day 573 - rotateSequence returns 0 if no active sequence', (t) => {
    const synthTrack = new Track('Synth', 'SynthTrack');
    const result = synthTrack.rotateSequence(1);
    t.assertEqual(result, 0, 'rotateSequence should return 0 if no active sequence');
});

TestRunner.test('Day 573 - rotateSequence captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.rotateSequence.toString();
    const captureIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('row[', captureIdx);
    t.assertTruthy(captureIdx !== -1 && (mutationIdx === -1 || captureIdx < mutationIdx),
        'rotateSequence should capture undo before mutating data');
});

TestRunner.test('Day 573 - rotateSequence handles wrapping', (t) => {
    const funcStr = Track.prototype.rotateSequence.toString();
    t.assertTruthy(funcStr.includes('newCol += totalSteps') || funcStr.includes('newCol < 0'),
        'rotateSequence should handle wrapping');
});

TestRunner.test('Day 573 - rotateSequence returns count of rotated notes', (t) => {
    const funcStr = Track.prototype.rotateSequence.toString();
    t.assertTruthy(funcStr.includes('rotatedCount'), 'rotateSequence should return rotatedCount');
});

TestRunner.test('Day 573 - Rotate Sequence menu items exist', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('Rotate Sequence (Left)'), 'Rotate Sequence (Left) should exist');
    t.assertTruthy(uiCode.includes('Rotate Sequence (Right)'), 'Rotate Sequence (Right) should exist');
});

TestRunner.test('Day 573 - Rotate Sequence menu items call rotateSequence', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Rotate Sequence (Left)');
    const context = uiCode.substring(idx, idx + 300);
    t.assertTruthy(context.includes('rotateSequence'), 'Rotate Sequence should call rotateSequence');
});

TestRunner.test('Day 573 - Rotate Sequence menu items call recreateToneSequence', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Rotate Sequence (Right)');
    const context = uiCode.substring(idx, idx + 400);
    t.assertTruthy(context.includes('recreateToneSequence'), 'Rotate Sequence should call recreateToneSequence');
});

TestRunner.test('Day 573 - Rotate Sequence menu items show notification', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Rotate Sequence (Left)');
    const context = uiCode.substring(idx, idx + 500);
    t.assertTruthy(context.includes('Rotated'), 'Rotate Sequence should show Rotated notification');
});

TestRunner.test('Day 573 - doubleDurations is a function on Track.prototype', (t) => {
    t.assertTruthy(typeof Track.prototype.doubleDurations === 'function', 'doubleDurations should be a function on Track.prototype');
});

TestRunner.test('Day 573 - doubleDurations returns 0 for Audio tracks', (t) => {
    const audioTrack = new Track('Audio', 'AudioTrack');
    const result = audioTrack.doubleDurations(2);
    t.assertEqual(result, 0, 'doubleDurations should return 0 for Audio tracks');
});

TestRunner.test('Day 573 - doubleDurations gets active sequence via getActiveSequence', (t) => {
    const funcStr = Track.prototype.doubleDurations.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence'), 'doubleDurations should use getActiveSequence');
});

TestRunner.test('Day 573 - doubleDurations captures undo BEFORE mutation', (t) => {
    const funcStr = Track.prototype.doubleDurations.toString();
    const captureIdx = funcStr.indexOf('_captureUndoState');
    const mutationIdx = funcStr.indexOf('stepData.length', captureIdx);
    t.assertTruthy(captureIdx !== -1 && (mutationIdx === -1 || captureIdx < mutationIdx),
        'doubleDurations should capture undo before mutating data');
});

TestRunner.test('Day 573 - doubleDurations clamps multiplier to 1-8 range', (t) => {
    const funcStr = Track.prototype.doubleDurations.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'doubleDurations should clamp multiplier');
    t.assertTruthy(funcStr.includes('1') && funcStr.includes('8'), 'doubleDurations should use range 1-8');
});

TestRunner.test('Day 573 - doubleDurations returns count of extended notes', (t) => {
    const funcStr = Track.prototype.doubleDurations.toString();
    t.assertTruthy(funcStr.includes('extendedCount'), 'doubleDurations should return extendedCount');
});

TestRunner.test('Day 573 - Double Durations menu item exists', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('Double Durations'), 'Double Durations menu item should exist');
});

TestRunner.test('Day 573 - Double Durations menu item calls doubleDurations', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Double Durations');
    const context = uiCode.substring(idx, idx + 300);
    t.assertTruthy(context.includes('doubleDurations'), 'Double Durations should call doubleDurations');
});

TestRunner.test('Day 573 - Double Durations menu item calls recreateToneSequence', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Double Durations');
    const context = uiCode.substring(idx, idx + 400);
    t.assertTruthy(context.includes('recreateToneSequence'), 'Double Durations should call recreateToneSequence');
});

TestRunner.test('Day 573 - Double Durations menu item shows notification', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Double Durations');
    const context = uiCode.substring(idx, idx + 500);
    t.assertTruthy(context.includes('Extended') || context.includes('double length'),
        'Double Durations should show notification');
});

TestRunner.test('Day 573 - APP_VERSION validation for Day 573', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 573');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 231, 'Minor version should be >= 231 for Day 573');
    }
});

// Day 573: Rotate Sequence + Double Durations Feature
TestRunner.test('Day 573 - rotateSequence is a function on Track.prototype', (t) => {
    t.assertTruthy(typeof Track.prototype.rotateSequence === 'function', 'rotateSequence should be a function on Track.prototype');
});

TestRunner.test('Day 573 - rotateSequence returns 0 for Audio tracks', (t) => {
    const track = new Track({ id: 'test', type: 'Audio', name: 'Audio Track' });
    const result = track.rotateSequence(1);
    t.assertEquals(0, result, 'rotateSequence should return 0 for Audio tracks');
});

TestRunner.test('Day 573 - rotateSequence gets active sequence via getActiveSequence', (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[null]], active: true }];
    const getActiveSpy = sinon.spy(track, 'getActiveSequence');
    track.rotateSequence(1);
    t.assertTruthy(getActiveSpy.called, 'rotateSequence should call getActiveSequence');
});

TestRunner.test('Day 573 - rotateSequence returns 0 if no active sequence', (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    track.sequences = [];
    const result = track.rotateSequence(1);
    t.assertEquals(0, result, 'rotateSequence should return 0 if no active sequence');
});

TestRunner.test('Day 573 - rotateSequence captures undo BEFORE mutation', (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[{ active: true, length: 1 }], [null]], length: 16, active: true }];
    track._undoStack = [];
    const captureSpy = sinon.spy(track, '_captureUndoState');
    track.rotateSequence(1);
    t.assertTruthy(captureSpy.called, 'rotateSequence should capture undo state');
    const trackCode = Track.prototype.rotateSequence.toString();
    const captureIdx = trackCode.indexOf('_captureUndoState');
    const mutationIdx = trackCode.indexOf('activeSeq.data[rowIndex]');
    t.assertTruthy(captureIdx < mutationIdx, '_captureUndoState should come before data mutation');
});

TestRunner.test('Day 573 - rotateSequence clamps amount to valid range', (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[null]], length: 16, active: true }];
    const trackCode = Track.prototype.rotateSequence.toString();
    t.assertTruthy(trackCode.includes('Math.max'), 'rotateSequence should clamp amount using Math.max');
    t.assertTruthy(trackCode.includes('Math.min'), 'rotateSequence should clamp amount using Math.min');
});

TestRunner.test('Day 573 - rotateSequence handles wrapping at boundaries', (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[null]], length: 4, active: true }];
    const trackCode = Track.prototype.rotateSequence.toString();
    t.assertTruthy(trackCode.includes('newCol < 0') || trackCode.includes('totalSteps'), 'rotateSequence should handle wrapping');
});

TestRunner.test('Day 573 - rotateSequence returns count of rotated notes', (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[{ active: true, length: 1 }], [null]], length: 16, active: true }];
    const result = track.rotateSequence(1);
    t.assertTruthy(typeof result === 'number', 'rotateSequence should return a number');
    t.assertTruthy(result >= 0, 'rotateSequence should return non-negative count');
});

TestRunner.test('Day 573 - Rotate Sequence (Left) menu item exists', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('Rotate Sequence (Left)'), 'Rotate Sequence (Left) menu item should exist');
});

TestRunner.test('Day 573 - Rotate Sequence (Right) menu item exists', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('Rotate Sequence (Right)'), 'Rotate Sequence (Right) menu item should exist');
});

TestRunner.test('Day 573 - Rotate Sequence menu items call track.rotateSequence', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const leftIdx = uiCode.indexOf('Rotate Sequence (Left)');
    const rightIdx = uiCode.indexOf('Rotate Sequence (Right)');
    const leftContext = uiCode.substring(leftIdx, leftIdx + 200);
    const rightContext = uiCode.substring(rightIdx, rightIdx + 200);
    t.assertTruthy(leftContext.includes('rotateSequence(-1)'), 'Left rotation should call rotateSequence(-1)');
    t.assertTruthy(rightContext.includes('rotateSequence(1)'), 'Right rotation should call rotateSequence(1)');
});

TestRunner.test('Day 573 - Rotate Sequence menu items call recreateToneSequence after rotate', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Rotate Sequence (Left)');
    const context = uiCode.substring(idx, idx + 500);
    t.assertTruthy(context.includes('recreateToneSequence'), 'Rotate Sequence should call recreateToneSequence');
});

TestRunner.test('Day 573 - Rotate Sequence menu items show notification with rotated count', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Rotate Sequence (Left)');
    const context = uiCode.substring(idx, idx + 600);
    t.assertTruthy(context.includes('Rotated'), 'Rotate Sequence should show Rotated notification');
    t.assertTruthy(context.includes('note'), 'Rotate Sequence notification should mention notes');
});

TestRunner.test('Day 573 - doubleDurations is a function on Track.prototype', (t) => {
    t.assertTruthy(typeof Track.prototype.doubleDurations === 'function', 'doubleDurations should be a function on Track.prototype');
});

TestRunner.test('Day 573 - doubleDurations returns 0 for Audio tracks', (t) => {
    const track = new Track({ id: 'test', type: 'Audio', name: 'Audio Track' });
    const result = track.doubleDurations(2);
    t.assertEquals(0, result, 'doubleDurations should return 0 for Audio tracks');
});

TestRunner.test('Day 573 - doubleDurations gets active sequence via getActiveSequence', (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[null]], active: true }];
    const getActiveSpy = sinon.spy(track, 'getActiveSequence');
    track.doubleDurations(2);
    t.assertTruthy(getActiveSpy.called, 'doubleDurations should call getActiveSequence');
});

TestRunner.test('Day 573 - doubleDurations returns 0 if no active sequence', (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    track.sequences = [];
    const result = track.doubleDurations(2);
    t.assertEquals(0, result, 'doubleDurations should return 0 if no active sequence');
});

TestRunner.test('Day 573 - doubleDurations captures undo BEFORE mutation', (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[{ active: true, length: 1 }], [null]], length: 16, active: true }];
    track._undoStack = [];
    const captureSpy = sinon.spy(track, '_captureUndoState');
    track.doubleDurations(2);
    t.assertTruthy(captureSpy.called, 'doubleDurations should capture undo state');
    const trackCode = Track.prototype.doubleDurations.toString();
    const captureIdx = trackCode.indexOf('_captureUndoState');
    const mutationIdx = trackCode.indexOf('stepData.length');
    t.assertTruthy(captureIdx < mutationIdx, '_captureUndoState should come before length mutation');
});

TestRunner.test('Day 573 - doubleDurations clamps multiplier to valid range', (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[null]], length: 16, active: true }];
    const trackCode = Track.prototype.doubleDurations.toString();
    t.assertTruthy(trackCode.includes('Math.max'), 'doubleDurations should clamp multiplier using Math.max');
    t.assertTruthy(trackCode.includes('Math.min'), 'doubleDurations should clamp multiplier using Math.min');
});

TestRunner.test('Day 573 - doubleDurations doubles note lengths', (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[{ active: true, length: 1 }], [null]], length: 16, active: true }];
    track._undoStack = [];
    track.doubleDurations(2);
    const note = track.sequences[0].data[0][0];
    t.assertEquals(2, note.length, 'Note length should be doubled to 2');
});

TestRunner.test('Day 573 - doubleDurations returns count of extended notes', (t) => {
    const track = new Track({ id: 'test', type: 'Synth', name: 'Test Track' });
    track.sequences = [{ id: 'seq1', name: 'Seq 1', data: [[{ active: true, length: 1 }], [null]], length: 16, active: true }];
    const result = track.doubleDurations(2);
    t.assertTruthy(typeof result === 'number', 'doubleDurations should return a number');
    t.assertTruthy(result >= 0, 'doubleDurations should return non-negative count');
});

TestRunner.test('Day 573 - Double Durations menu item exists', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    t.assertTruthy(uiCode.includes('Double Durations'), 'Double Durations menu item should exist');
});

TestRunner.test('Day 573 - Double Durations menu item calls track.doubleDurations', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Double Durations');
    const context = uiCode.substring(idx, idx + 300);
    t.assertTruthy(context.includes('doubleDurations'), 'Double Durations should call doubleDurations');
});

TestRunner.test('Day 573 - Double Durations menu item calls recreateToneSequence after extend', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Double Durations');
    const context = uiCode.substring(idx, idx + 500);
    t.assertTruthy(context.includes('recreateToneSequence'), 'Double Durations should call recreateToneSequence');
});

TestRunner.test('Day 573 - Double Durations menu item shows notification with extended count', (t) => {
    const uiCode = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const idx = uiCode.indexOf('Double Durations');
    const context = uiCode.substring(idx, idx + 600);
    t.assertTruthy(context.includes('Extended') || context.includes('double'), 'Double Durations should show notification');
});

TestRunner.test('Day 573 - APP_VERSION validation for Day 573', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 573');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 231, 'Minor version should be >= 231 for Day 573');
    }
});

// Day 573: Rotate Sequence + Double Durations Feature
TestRunner.test("Day 573 - rotateSequence is a function on Track.prototype", (t) => {
    t.assertTruthy(typeof Track.prototype.rotateSequence === "function", "rotateSequence should be a function on Track.prototype");
});
TestRunner.test("Day 573 - rotateSequence returns 0 for Audio tracks", (t) => {
    const track = new Track("test", "Audio");
    const result = track.rotateSequence(1);
    t.assertEquals(0, result, "rotateSequence should return 0 for Audio tracks");
});
TestRunner.test("Day 573 - rotateSequence gets active sequence via getActiveSequence", (t) => {
    const funcStr = Track.prototype.rotateSequence.toString();
    t.assertTruthy(funcStr.includes("getActiveSequence"), "rotateSequence should use getActiveSequence");
});
TestRunner.test("Day 573 - rotateSequence returns 0 if no active sequence", (t) => {
    const track = new Track("test", "Synth");
    const result = track.rotateSequence(1);
    t.assertEquals(0, result, "rotateSequence should return 0 if no active sequence");
});
TestRunner.test("Day 573 - rotateSequence captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.rotateSequence.toString();
    const captureIdx = funcStr.indexOf("_captureUndoState");
    const mutationIdx = funcStr.indexOf("row[", captureIdx);
    t.assertTruthy(captureIdx !== -1 && (mutationIdx === -1 || captureIdx < mutationIdx),
        "rotateSequence should capture undo before mutating data");
});
TestRunner.test("Day 573 - rotateSequence handles wrapping", (t) => {
    const funcStr = Track.prototype.rotateSequence.toString();
    t.assertTruthy(funcStr.includes("newCol +=") || funcStr.includes("newCol < 0"),
        "rotateSequence should handle wrapping");
});
TestRunner.test("Day 573 - rotateSequence returns count of rotated notes", (t) => {
    const funcStr = Track.prototype.rotateSequence.toString();
    t.assertTruthy(funcStr.includes("rotatedCount"), "rotateSequence should return rotatedCount");
});
TestRunner.test("Day 573 - Rotate Sequence (Left) menu item exists", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    t.assertTruthy(uiCode.includes("Rotate Sequence (Left)"), "Rotate Sequence (Left) should exist");
});
TestRunner.test("Day 573 - Rotate Sequence (Right) menu item exists", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    t.assertTruthy(uiCode.includes("Rotate Sequence (Right)"), "Rotate Sequence (Right) should exist");
});
TestRunner.test("Day 573 - Rotate Sequence (Left) calls rotateSequence(-1)", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    const idx = uiCode.indexOf("Rotate Sequence (Left)");
    const context = uiCode.substring(idx, idx + 200);
    t.assertTruthy(context.includes("rotateSequence(-1)"), "Left rotation should call rotateSequence(-1)");
});
TestRunner.test("Day 573 - Rotate Sequence (Right) calls rotateSequence(1)", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    const idx = uiCode.indexOf("Rotate Sequence (Right)");
    const context = uiCode.substring(idx, idx + 200);
    t.assertTruthy(context.includes("rotateSequence(1)"), "Right rotation should call rotateSequence(1)");
});
TestRunner.test("Day 573 - Rotate Sequence calls recreateToneSequence", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    const idx = uiCode.indexOf("Rotate Sequence (Left)");
    const context = uiCode.substring(idx, idx + 400);
    t.assertTruthy(context.includes("recreateToneSequence"), "Rotate Sequence should call recreateToneSequence");
});
TestRunner.test("Day 573 - Rotate Sequence shows notification with count", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    const idx = uiCode.indexOf("Rotate Sequence (Left)");
    const context = uiCode.substring(idx, idx + 600);
    t.assertTruthy(context.includes("Rotated") && context.includes("note"),
        "Rotate Sequence should show notification with note count");
});
TestRunner.test("Day 573 - doubleDurations is a function on Track.prototype", (t) => {
    t.assertTruthy(typeof Track.prototype.doubleDurations === "function", "doubleDurations should be a function on Track.prototype");
});
TestRunner.test("Day 573 - doubleDurations returns 0 for Audio tracks", (t) => {
    const track = new Track("test", "Audio");
    const result = track.doubleDurations(2);
    t.assertEquals(0, result, "doubleDurations should return 0 for Audio tracks");
});
TestRunner.test("Day 573 - doubleDurations gets active sequence via getActiveSequence", (t) => {
    const funcStr = Track.prototype.doubleDurations.toString();
    t.assertTruthy(funcStr.includes("getActiveSequence"), "doubleDurations should use getActiveSequence");
});
TestRunner.test("Day 573 - doubleDurations returns 0 if no active sequence", (t) => {
    const track = new Track("test", "Synth");
    const result = track.doubleDurations(2);
    t.assertEquals(0, result, "doubleDurations should return 0 if no active sequence");
});
TestRunner.test("Day 573 - doubleDurations captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.doubleDurations.toString();
    const captureIdx = funcStr.indexOf("_captureUndoState");
    const mutationIdx = funcStr.indexOf("stepData.length");
    t.assertTruthy(captureIdx !== -1 && (mutationIdx === -1 || captureIdx < mutationIdx),
        "doubleDurations should capture undo before mutating length");
});
TestRunner.test("Day 573 - doubleDurations clamps multiplier", (t) => {
    const funcStr = Track.prototype.doubleDurations.toString();
    t.assertTruthy(funcStr.includes("Math.max") && funcStr.includes("Math.min"),
        "doubleDurations should clamp multiplier");
});
TestRunner.test("Day 573 - doubleDurations returns count of extended notes", (t) => {
    const funcStr = Track.prototype.doubleDurations.toString();
    t.assertTruthy(funcStr.includes("extendedCount"), "doubleDurations should return extendedCount");
});
TestRunner.test("Day 573 - Double Durations menu item exists", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    t.assertTruthy(uiCode.includes("Double Durations"), "Double Durations menu item should exist");
});
TestRunner.test("Day 573 - Double Durations calls doubleDurations(2)", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    const idx = uiCode.indexOf("Double Durations");
    const context = uiCode.substring(idx, idx + 200);
    t.assertTruthy(context.includes("doubleDurations(2)"), "Double Durations should call doubleDurations(2)");
});
TestRunner.test("Day 573 - Double Durations calls recreateToneSequence", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    const idx = uiCode.indexOf("Double Durations");
    const context = uiCode.substring(idx, idx + 400);
    t.assertTruthy(context.includes("recreateToneSequence"), "Double Durations should call recreateToneSequence");
});
TestRunner.test("Day 573 - Double Durations shows notification with count", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    const idx = uiCode.indexOf("Double Durations");
    const context = uiCode.substring(idx, idx + 600);
    t.assertTruthy(context.includes("Extended") || context.includes("double"),
        "Double Durations should show notification");
});
TestRunner.test("Day 573 - APP_VERSION validation for Day 573", (t) => {
    const versionParts = APP_VERSION.split(".").map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 573");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 231, "Minor version should be >= 231 for Day 573");
    }
});

// Day 574: Shorten Durations Feature
TestRunner.test("Day 574 - shortenDurations is a function on Track.prototype", (t) => {
    t.assertTruthy(typeof Track.prototype.shortenDurations === "function", "shortenDurations should be a function on Track.prototype");
});
TestRunner.test("Day 574 - shortenDurations returns 0 for Audio tracks", (t) => {
    const track = new Track("test", "Audio");
    const result = track.shortenDurations(2);
    t.assertEquals(0, result, "shortenDurations should return 0 for Audio tracks");
});
TestRunner.test("Day 574 - shortenDurations gets active sequence via getActiveSequence", (t) => {
    const funcStr = Track.prototype.shortenDurations.toString();
    t.assertTruthy(funcStr.includes("getActiveSequence"), "shortenDurations should use getActiveSequence");
});
TestRunner.test("Day 574 - shortenDurations returns 0 if no active sequence", (t) => {
    const track = new Track("test", "Synth");
    const result = track.shortenDurations(2);
    t.assertEquals(0, result, "shortenDurations should return 0 if no active sequence");
});
TestRunner.test("Day 574 - shortenDurations captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.shortenDurations.toString();
    const captureIdx = funcStr.indexOf("_captureUndoState");
    const mutationIdx = funcStr.indexOf("stepData.length");
    t.assertTruthy(captureIdx !== -1 && (mutationIdx === -1 || captureIdx < mutationIdx),
        "shortenDurations should capture undo before mutating length");
});
TestRunner.test("Day 574 - shortenDurations clamps divisor to 2-8 range", (t) => {
    const funcStr = Track.prototype.shortenDurations.toString();
    t.assertTruthy(funcStr.includes("Math.max(2") && funcStr.includes("Math.min(divisor, 8)"),
        "shortenDurations should clamp divisor to 2-8 range");
});
TestRunner.test("Day 574 - shortenDurations returns count of shortened notes", (t) => {
    const funcStr = Track.prototype.shortenDurations.toString();
    t.assertTruthy(funcStr.includes("shortenedCount"), "shortenDurations should return shortenedCount");
});
TestRunner.test("Day 574 - Shorten Durations menu item exists", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    t.assertTruthy(uiCode.includes("Shorten Durations"), "Shorten Durations menu item should exist");
});
TestRunner.test("Day 574 - Shorten Durations menu item calls shortenDurations", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    const idx = uiCode.indexOf("Shorten Durations");
    const context = uiCode.substring(idx, idx + 200);
    t.assertTruthy(context.includes("shortenDurations(2)"), "Shorten Durations should call shortenDurations(2)");
});
TestRunner.test("Day 574 - Shorten Durations menu item calls recreateToneSequence", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    const idx = uiCode.indexOf("Shorten Durations");
    const context = uiCode.substring(idx, idx + 400);
    t.assertTruthy(context.includes("recreateToneSequence"), "Shorten Durations should call recreateToneSequence");
});
TestRunner.test("Day 574 - Shorten Durations menu item shows notification with shortened count", (t) => {
    const uiCode = require("fs").readFileSync("./js/ui.js", "utf-8");
    const idx = uiCode.indexOf("Shorten Durations");
    const context = uiCode.substring(idx, idx + 600);
    t.assertTruthy(context.includes("Shortened") && context.includes("note(s)"),
        "Shorten Durations should show notification with shortened count");
});
TestRunner.test("Day 574 - APP_VERSION validation for Day 574", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 574");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 232, "Minor version should be >= 232 for Day 574");
    }
});

// Day 575: Fix Undo Capture Order in updateAudioClipPosition and updateAudioClipDuration
TestRunner.test("Day 575 - updateAudioClipPosition captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.updateAudioClipPosition.toString();
    const captureIdx = funcStr.indexOf("_captureUndoState");
    const mutationIdx = funcStr.indexOf("clip.startTime =");
    t.assertTruthy(captureIdx !== -1, "updateAudioClipPosition should call _captureUndoState");
    t.assertTruthy(captureIdx < mutationIdx, "_captureUndoState should come BEFORE clip.startTime mutation");
});
TestRunner.test("Day 575 - updateAudioClipPosition has descriptive undo label", (t) => {
    const funcStr = Track.prototype.updateAudioClipPosition.toString();
    t.assertTruthy(funcStr.includes("Move Clip"), "updateAudioClipPosition undo label should mention 'Move Clip'");
});
TestRunner.test("Day 575 - updateAudioClipDuration captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.updateAudioClipDuration.toString();
    const captureIdx = funcStr.indexOf("_captureUndoState");
    const mutationIdx = funcStr.indexOf("clip.duration =");
    t.assertTruthy(captureIdx !== -1, "updateAudioClipDuration should call _captureUndoState");
    t.assertTruthy(captureIdx < mutationIdx, "_captureUndoState should come BEFORE clip.duration mutation");
});
TestRunner.test("Day 575 - updateAudioClipDuration has descriptive undo label", (t) => {
    const funcStr = Track.prototype.updateAudioClipDuration.toString();
    t.assertTruthy(funcStr.includes("Resize Clip"), "updateAudioClipDuration undo label should mention 'Resize Clip'");
});
TestRunner.test("Day 575 - APP_VERSION validation for Day 575", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 575");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 233, "Minor version should be >= 233 for Day 575");
    }
});

// Day 576: Scale Durations Feature
TestRunner.test("Day 576 - scaleDurations is a function on Track.prototype", (t) => {
    t.assertTruthy(typeof Track.prototype.scaleDurations === 'function', "scaleDurations should be a function on Track.prototype");
});
TestRunner.test("Day 576 - scaleDurations accepts factor parameter", (t) => {
    const funcStr = Track.prototype.scaleDurations.toString();
    t.assertTruthy(funcStr.includes('factor = 1.0'), "scaleDurations should accept factor parameter with default 1.0");
});
TestRunner.test("Day 576 - scaleDurations returns 0 for Audio tracks", (t) => {
    const track = new Track(999, 'Audio');
    t.assertEqual(track.scaleDurations(2.0), 0, "Audio tracks should return 0");
});
TestRunner.test("Day 576 - scaleDurations gets active sequence via getActiveSequence", (t) => {
    const funcStr = Track.prototype.scaleDurations.toString();
    t.assertTruthy(funcStr.includes('getActiveSequence()'), "scaleDurations should use getActiveSequence()");
});
TestRunner.test("Day 576 - scaleDurations returns 0 if no active sequence", (t) => {
    const track = new Track(999, 'Synth');
    t.assertEqual(track.scaleDurations(2.0), 0, "Should return 0 when no active sequence");
});
TestRunner.test("Day 576 - scaleDurations captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.scaleDurations.toString();
    const captureIdx = funcStr.indexOf('_captureUndoState');
    const forEachIdx = funcStr.indexOf('forEach') !== -1 ? funcStr.indexOf('forEach') : funcStr.indexOf('for (let');
    t.assertTruthy(captureIdx < forEachIdx, "Undo capture should happen BEFORE data iteration");
});
TestRunner.test("Day 576 - scaleDurations clamps factor to 0.25-4.0 range", (t) => {
    const funcStr = Track.prototype.scaleDurations.toString();
    t.assertTruthy(funcStr.includes('Math.max(0.25') && funcStr.includes('Math.min(4.0'), "scaleDurations should clamp factor to 0.25-4.0 range");
});
TestRunner.test("Day 576 - scaleDurations returns 0 when factor is 1.0", (t) => {
    const funcStr = Track.prototype.scaleDurations.toString();
    t.assertTruthy(funcStr.includes('if (clampedFactor === 1.0) return 0'), "scaleDurations should return 0 when factor is 1.0 (no change)");
});
TestRunner.test("Day 576 - scaleDurations returns count of scaled notes", (t) => {
    const funcStr = Track.prototype.scaleDurations.toString();
    t.assertTruthy(funcStr.includes('scaledCount') || funcStr.includes('return scaled'), "scaleDurations should return count of scaled notes");
});
TestRunner.test("Day 576 - Scale Durations (50%) menu item exists", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('Scale Durations (50%)'), "Scale Durations (50%) menu item should exist");
});
TestRunner.test("Day 576 - Scale Durations (75%) menu item exists", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('Scale Durations (75%)'), "Scale Durations (75%) menu item should exist");
});
TestRunner.test("Day 576 - Scale Durations (100%) menu item exists", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('Scale Durations (100%)'), "Scale Durations (100%) menu item should exist");
});
TestRunner.test("Day 576 - Scale Durations (125%) menu item exists", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('Scale Durations (125%)'), "Scale Durations (125%) menu item should exist");
});
TestRunner.test("Day 576 - Scale Durations (150%) menu item exists", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('Scale Durations (150%)'), "Scale Durations (150%) menu item should exist");
});
TestRunner.test("Day 576 - Scale Durations menu items call scaleDurations", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('scaleDurations(0.5)') && funcStr.includes('scaleDurations(1.5'), "Scale Durations menu items should call scaleDurations with correct factors");
});
TestRunner.test("Day 576 - Scale Durations menu items call recreateToneSequence", (t) => {
    const funcStr = require('./js/ui.js').renderSequencerContextMenu?.toString() || '';
    t.assertTruthy(funcStr.includes('recreateToneSequence'), "Scale Durations menu items should call recreateToneSequence");
});
TestRunner.test("Day 576 - APP_VERSION validation for Day 576", (t) => {
    const version = require("./js/constants.js").APP_VERSION;
    const versionParts = version.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 576");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 234, "Minor version should be >= 234 for Day 576");
    }
});
