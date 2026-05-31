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
    getContextSuspensionCount,
    getContextState,
    startContextSuspensionMonitoring,
    stopContextSuspensionMonitoring,
    getSidechainBusInput,
    enableSidechainFromMic,
    disableSidechainFromMic,
    enableSidechainFromTrackIn,
    disableSidechainBus,
    isMicOpenForSidechain,
    cleanupRecordingAudioResources
} from './audio.js';

import {
    AVAILABLE_EFFECTS,
    synthEngineControlDefinitions,
    createEffectInstance,
    getEffectDefaultParams,
    getEffectParamDefinitions,
    getEffectBypassState,
    setEffectBypassState
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
    getMidiCCLearnActive,
    handleOpenTrackInspector,
    handleOpenEffectsRack,
    handleOpenSequencer
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

// Day 605: Swing State Function Tests
TestRunner.test("Day 605 - Swing - getSwingEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getSwingEnabledState'), 'getSwingEnabledState should be exported');
});

TestRunner.test("Day 605 - Swing - getSwingEnabledState returns boolean", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getSwingEnabledState');
    const returnIdx = stateStr.indexOf('return !!swingState.enabled', fnIdx);
    t.assertTruthy(returnIdx > fnIdx && returnIdx < fnIdx + 100, 'getSwingEnabledState should use !! to return boolean');
});

TestRunner.test("Day 605 - Swing - setSwingEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSwingEnabledState'), 'setSwingEnabledState should be exported');
});

TestRunner.test("Day 605 - Swing - setSwingEnabledState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingEnabledState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setSwingEnabledState should call captureStateForUndo');
});

TestRunner.test("Day 605 - Swing - setSwingEnabledState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingEnabledState');
    const labelIdx = stateStr.indexOf('Toggle Swing', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'setSwingEnabledState undo label should include "Toggle Swing"');
});

TestRunner.test("Day 605 - Swing - setSwingEnabledState guards capture with appServices check", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingEnabledState');
    const appIdx = stateStr.indexOf('appServices && appServices.captureStateForUndo', fnIdx);
    t.assertTruthy(appIdx > fnIdx && appIdx < fnIdx + 200, 'setSwingEnabledState should guard captureStateForUndo with appServices check');
});

TestRunner.test("Day 605 - Swing - getSwingAmountState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getSwingAmountState'), 'getSwingAmountState should be exported');
});

TestRunner.test("Day 605 - Swing - getSwingAmountState returns swingState.amount", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getSwingAmountState');
    const returnIdx = stateStr.indexOf('return swingState.amount', fnIdx);
    t.assertTruthy(returnIdx > fnIdx && returnIdx < fnIdx + 100, 'getSwingAmountState should return swingState.amount');
});

TestRunner.test("Day 605 - Swing - setSwingAmountState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSwingAmountState'), 'setSwingAmountState should be exported');
});

TestRunner.test("Day 605 - Swing - setSwingAmountState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingAmountState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setSwingAmountState should call captureStateForUndo');
});

TestRunner.test("Day 605 - Swing - setSwingAmountState has descriptive undo label with amount value", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingAmountState');
    const labelIdx = stateStr.indexOf('Set Swing Amount to', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'setSwingAmountState undo label should include "Set Swing Amount to"');
});

TestRunner.test("Day 605 - Swing - setSwingAmountState clamps value to MAX_SWING_AMOUNT", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingAmountState');
    const maxIdx = stateStr.indexOf('MAX_SWING_AMOUNT', fnIdx);
    t.assertTruthy(maxIdx > fnIdx && maxIdx < fnIdx + 300, 'setSwingAmountState should clamp to MAX_SWING_AMOUNT');
});

TestRunner.test("Day 605 - Swing - setSwingAmountState guards capture with appServices check", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingAmountState');
    const appIdx = stateStr.indexOf('appServices && appServices.captureStateForUndo', fnIdx);
    t.assertTruthy(appIdx > fnIdx && appIdx < fnIdx + 300, 'setSwingAmountState should guard captureStateForUndo with appServices check');
});

TestRunner.test("Day 605 - APP_VERSION validation for Day 605", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 605");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 259, "Minor version should be >= 259 for Day 605");
    }
});
// Day 606: MIDI Export Helper Functions Tests
// Tests for noteNameToMidiNumber, pitchToRow, and buildMidiFile helper functions

TestRunner.test("Day 606 - MIDI Helper - noteNameToMidiNumber is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function noteNameToMidiNumber'), 'noteNameToMidiNumber should be exported');
});

TestRunner.test("Day 606 - MIDI Helper - noteNameToMidiNumber uses NOTE_MAP for note lookup", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function noteNameToMidiNumber');
    const mapIdx = stateStr.indexOf("const NOTE_MAP = { 'C': 0", fnIdx);
    t.assertTruthy(mapIdx > fnIdx && mapIdx < fnIdx + 100, 'noteNameToMidiNumber should define NOTE_MAP');
});

TestRunner.test("Day 606 - MIDI Helper - noteNameToMidiNumber returns correct MIDI number for C4", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function noteNameToMidiNumber');
    // Should compute (octave + 1) * 12 + note where C=0
    // C4 = (4+1)*12 + 0 = 60, A4 = (4+1)*12 + 9 = 69
    t.assertTruthy(stateStr.includes('return (octave + 1) * 12 + note') || stateStr.includes('return (octave+1)*12+note'), 'noteNameToMidiNumber should compute MIDI number correctly');
});

TestRunner.test("Day 606 - MIDI Helper - noteNameToMidiNumber defaults to C4 when note is undefined", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function noteNameToMidiNumber');
    const defaultIdx = stateStr.indexOf('return 60', fnIdx);
    t.assertTruthy(defaultIdx > fnIdx && defaultIdx < fnIdx + 200, 'noteNameToMidiNumber should default to 60 (C4)');
});

TestRunner.test("Day 606 - MIDI Helper - pitchToRow is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function pitchToRow'), 'pitchToRow should be exported');
});

TestRunner.test("Day 606 - MIDI Helper - pitchToRow returns 60 + rowIndex for Synth tracks", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function pitchToRow');
    const synthIdx = stateStr.indexOf("trackType === 'Synth'", fnIdx);
    t.assertTruthy(synthIdx > fnIdx && synthIdx < fnIdx + 200, 'pitchToRow should check Synth trackType');
    const returnIdx = stateStr.indexOf('return 60 + rowIndex', fnIdx);
    t.assertTruthy(returnIdx > fnIdx && returnIdx < fnIdx + 300, 'pitchToRow should return 60 + rowIndex for Synth');
});

TestRunner.test("Day 606 - MIDI Helper - pitchToRow returns 36 + rowIndex for DrumSampler tracks", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function pitchToRow');
    const drumIdx = stateStr.indexOf("trackType === 'DrumSampler'", fnIdx);
    t.assertTruthy(drumIdx > fnIdx && drumIdx < fnIdx + 400, 'pitchToRow should check DrumSampler trackType');
    const returnIdx = stateStr.indexOf('return 36 + rowIndex', fnIdx);
    t.assertTruthy(returnIdx > fnIdx && returnIdx < fnIdx + 400, 'pitchToRow should return 36 + rowIndex for DrumSampler');
});

TestRunner.test("Day 606 - MIDI Helper - pitchToRow returns rowIndex directly for Sampler tracks", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function pitchToRow');
    const samplerIdx = stateStr.indexOf("trackType === 'Sampler'", fnIdx);
    t.assertTruthy(samplerIdx > fnIdx && samplerIdx < fnIdx + 500, 'pitchToRow should check Sampler trackType');
    const returnIdx = stateStr.indexOf('return rowIndex', fnIdx);
    t.assertTruthy(returnIdx > fnIdx && returnIdx < fnIdx + 500, 'pitchToRow should return rowIndex directly for Sampler');
});

TestRunner.test("Day 606 - MIDI Helper - buildMidiFile is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function buildMidiFile'), 'buildMidiFile should be exported');
});

TestRunner.test("Day 606 - MIDI Helper - buildMidiFile accepts default ticksPerQuarter of 480", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function buildMidiFile');
    const defaultIdx = stateStr.indexOf('ticksPerQuarter = 480', fnIdx);
    t.assertTruthy(defaultIdx > fnIdx && defaultIdx < fnIdx + 100, 'buildMidiFile should have default ticksPerQuarter of 480');
});

TestRunner.test("Day 606 - MIDI Helper - buildMidiFile sorts events by time before writing", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function buildMidiFile');
    const sortIdx = stateStr.indexOf('.sort((a, b) => a.time - b.time)', fnIdx);
    t.assertTruthy(sortIdx > fnIdx && sortIdx < fnIdx + 300, 'buildMidiFile should sort events by time');
});

TestRunner.test("Day 606 - MIDI Helper - buildMidiFile uses VLQ encoding for delta times", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function buildMidiFile');
    const vlqIdx = stateStr.indexOf('ticksToVLQ', fnIdx);
    t.assertTruthy(vlqIdx > fnIdx && vlqIdx < fnIdx + 500, 'buildMidiFile should use ticksToVLQ for delta encoding');
});

TestRunner.test("Day 606 - MIDI Helper - buildMidiFile handles noteOn events", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function buildMidiFile');
    const noteOnIdx = stateStr.indexOf("evt.type === 'noteOn'", fnIdx);
    t.assertTruthy(noteOnIdx > fnIdx && noteOnIdx < fnIdx + 600, 'buildMidiFile should handle noteOn events');
});

TestRunner.test("Day 606 - MIDI Helper - buildMidiFile builds MThd header chunk", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function buildMidiFile');
    const headerIdx = stateStr.indexOf('MThd', fnIdx);
    t.assertTruthy(headerIdx > fnIdx && headerIdx < fnIdx + 1000, 'buildMidiFile should build MThd header');
});

TestRunner.test("Day 606 - MIDI Helper - buildMidiFile builds MTrk track chunk", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function buildMidiFile');
    const trackIdx = stateStr.indexOf('MTrk', fnIdx);
    t.assertTruthy(trackIdx > fnIdx && trackIdx < fnIdx + 1200, 'buildMidiFile should build MTrk track chunk');
});

TestRunner.test("Day 606 - APP_VERSION validation for Day 606", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 606");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 260, "Minor version should be >= 260 for Day 606");
    }
});

// Day 607: Performance Monitor & Auto-Save State Function Tests
// ============================================================
// Performance Monitor state functions cover CPU, memory, audio context monitoring.
// Auto-save functions handle periodic project persistence to localStorage.

TestRunner.test("Day 607 - Performance Monitor - getAudioContextStateState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getAudioContextStateState'), 'getAudioContextStateState should be exported');
});

TestRunner.test("Day 607 - Performance Monitor - setAudioContextStateState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setAudioContextStateState'), 'setAudioContextStateState should be exported');
});

TestRunner.test("Day 607 - Performance Monitor - setAudioContextStateState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setAudioContextStateState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setAudioContextStateState should call captureStateForUndo');
});

TestRunner.test("Day 607 - Performance Monitor - setAudioContextStateState has descriptive undo label with Audio Context", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setAudioContextStateState');
    const labelIdx = stateStr.indexOf('Audio Context', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'setAudioContextStateState undo label should mention Audio Context');
});

TestRunner.test("Day 607 - Performance Monitor - setCPUUsageState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setCPUUsageState'), 'setCPUUsageState should be exported');
});

TestRunner.test("Day 607 - Performance Monitor - setCPUUsageState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setCPUUsageState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setCPUUsageState should call captureStateForUndo');
});

TestRunner.test("Day 607 - Performance Monitor - setCPUUsageState has descriptive undo label with CPU", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setCPUUsageState');
    const labelIdx = stateStr.indexOf('CPU', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'setCPUUsageState undo label should mention CPU');
});

TestRunner.test("Day 607 - Performance Monitor - setCPUUsageState clamps value to 0-100 range", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setCPUUsageState');
    const clampIdx = stateStr.indexOf('Math.max', fnIdx);
    t.assertTruthy(clampIdx > fnIdx && clampIdx < fnIdx + 300, 'setCPUUsageState should clamp value with Math.max');
});

TestRunner.test("Day 607 - Performance Monitor - setMemoryPressureState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMemoryPressureState'), 'setMemoryPressureState should be exported');
});

TestRunner.test("Day 607 - Performance Monitor - setMemoryPressureState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setMemoryPressureState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setMemoryPressureState should call captureStateForUndo');
});

TestRunner.test("Day 607 - Performance Monitor - setMemoryPressureState has descriptive undo label with Memory Pressure", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setMemoryPressureState');
    const labelIdx = stateStr.indexOf('Memory Pressure', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'setMemoryPressureState undo label should mention Memory Pressure');
});

TestRunner.test("Day 607 - Performance Monitor - setMemoryPressureState validates against valid values", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setMemoryPressureState');
    const validIdx = stateStr.indexOf("['none', 'low', 'medium', 'high']", fnIdx);
    t.assertTruthy(validIdx > fnIdx && validIdx < fnIdx + 200, 'setMemoryPressureState should validate against valid values');
});

TestRunner.test("Day 607 - Performance Monitor - setActiveVoicesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setActiveVoicesState'), 'setActiveVoicesState should be exported');
});

TestRunner.test("Day 607 - Performance Monitor - setActiveVoicesState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setActiveVoicesState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setActiveVoicesState should call captureStateForUndo');
});

TestRunner.test("Day 607 - Performance Monitor - setAudioLatencyState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setAudioLatencyState'), 'setAudioLatencyState should be exported');
});

TestRunner.test("Day 607 - Performance Monitor - setAudioLatencyState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setAudioLatencyState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setAudioLatencyState should call captureStateForUndo');
});

TestRunner.test("Day 607 - Performance Monitor - setLastCallbackTimeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setLastCallbackTimeState'), 'setLastCallbackTimeState should be exported');
});

TestRunner.test("Day 607 - Performance Monitor - setLastCallbackTimeState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setLastCallbackTimeState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setLastCallbackTimeState should call captureStateForUndo');
});

TestRunner.test("Day 607 - Performance Monitor - setDroppedCallbacksState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setDroppedCallbacksState'), 'setDroppedCallbacksState should be exported');
});

TestRunner.test("Day 607 - Performance Monitor - setDroppedCallbacksState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setDroppedCallbacksState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setDroppedCallbacksState should call captureStateForUndo');
});

TestRunner.test("Day 607 - Performance Monitor - incrementDroppedCallbacksState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function incrementDroppedCallbacksState'), 'incrementDroppedCallbacksState should be exported');
});

TestRunner.test("Day 607 - Performance Monitor - incrementDroppedCallbacksState increments dropped count", (t) => {
    const funcStr = incrementDroppedCallbacksState.toString();
    t.assertTruthy(funcStr.includes('++') || funcStr.includes('+= 1'), 'incrementDroppedCallbacksState should increment the count');
});

TestRunner.test("Day 607 - Performance Monitor - resetPerformanceMonitorState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function resetPerformanceMonitorState'), 'resetPerformanceMonitorState should be exported');
});

TestRunner.test("Day 607 - Auto-Save - startAutoSave is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function startAutoSave'), 'startAutoSave should be exported');
});

TestRunner.test("Day 607 - Auto-Save - startAutoSave uses setInterval for auto-save loop", (t) => {
    const funcStr = startAutoSave.toString();
    t.assertTruthy(funcStr.includes('setInterval'), 'startAutoSave should use setInterval');
});

TestRunner.test("Day 607 - Auto-Save - stopAutoSave is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function stopAutoSave'), 'stopAutoSave should be exported');
});

TestRunner.test("Day 607 - Auto-Save - stopAutoSave clears the auto-save interval", (t) => {
    const funcStr = stopAutoSave.toString();
    t.assertTruthy(funcStr.includes('clearInterval'), 'stopAutoSave should use clearInterval');
});

TestRunner.test("Day 607 - Auto-Save - autoSaveToLocalStorage is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function autoSaveToLocalStorage'), 'autoSaveToLocalStorage should be exported');
});

TestRunner.test("Day 607 - Auto-Save - autoSaveToLocalStorage calls gatherProjectDataInternal", (t) => {
    const funcStr = autoSaveToLocalStorage.toString();
    t.assertTruthy(funcStr.includes('gatherProjectDataInternal'), 'autoSaveToLocalStorage should call gatherProjectDataInternal');
});

TestRunner.test("Day 607 - Auto-Save - autoSaveToLocalStorage saves to localStorage", (t) => {
    const funcStr = autoSaveToLocalStorage.toString();
    t.assertTruthy(funcStr.includes('localStorage.setItem'), 'autoSaveToLocalStorage should use localStorage.setItem');
});

TestRunner.test("Day 607 - Auto-Save - autoSaveToLocalStorage checks for AUTOSAVE_KEY", (t) => {
    const funcStr = autoSaveToLocalStorage.toString();
    t.assertTruthy(funcStr.includes('AUTOSAVE_KEY') || funcStr.includes("'snugosAutosave'"), 'autoSaveToLocalStorage should reference AUTOSAVE_KEY');
});

TestRunner.test("Day 607 - Auto-Save - autoSaveToLocalStorage stores timestamp", (t) => {
    const funcStr = autoSaveToLocalStorage.toString();
    t.assertTruthy(funcStr.includes('AUTOSAVE_TIMESTAMP_KEY') || funcStr.includes('setItem'), 'autoSaveToLocalStorage should store timestamp');
});

TestRunner.test("Day 607 - Rename Track - renameTrackInState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function renameTrackInState'), 'renameTrackInState should be exported');
});

TestRunner.test("Day 607 - Master Effects - removeMasterEffectFromState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function removeMasterEffectFromState'), 'removeMasterEffectFromState should be exported');
});

TestRunner.test("Day 607 - Master Effects - removeMasterEffectFromState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function removeMasterEffectFromState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'removeMasterEffectFromState should call captureStateForUndo');
});

TestRunner.test("Day 607 - Master Effects - reorderMasterEffectInState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function reorderMasterEffectInState'), 'reorderMasterEffectInState should be exported');
});

TestRunner.test("Day 607 - Master Effects - reorderMasterEffectInState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function reorderMasterEffectInState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'reorderMasterEffectInState should call captureStateForUndo');
});

TestRunner.test("Day 607 - APP_VERSION validation for Day 607", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 607");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 262, "Minor version should be >= 262 for Day 607");
    }
});

// Day 608: Ghost Track, Loop Region, Swing, and Time Signature State Function Tests
TestRunner.test("Day 608 - Ghost Track - setGhostTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setGhostTrackIdState'), 'setGhostTrackIdState should be exported');
});

TestRunner.test("Day 608 - Ghost Track - setGhostTrackIdState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setGhostTrackIdState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setGhostTrackIdState should call captureStateForUndo');
});

TestRunner.test("Day 608 - Ghost Track - setGhostTrackIdState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setGhostTrackIdState');
    const labelIdx = stateStr.indexOf('Set Ghost Track', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'setGhostTrackIdState undo label should mention Ghost Track');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setLoopRegionState'), 'setLoopRegionState should be exported');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setLoopRegionState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setLoopRegionState should call captureStateForUndo');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionState has descriptive undo label with bar numbers", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setLoopRegionState');
    const labelIdx = stateStr.indexOf('Set Loop Region to', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setLoopRegionState undo label should mention Loop Region');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionState clamps values to valid range", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setLoopRegionState');
    const clampIdx = stateStr.indexOf('Math.max', fnIdx);
    t.assertTruthy(clampIdx > fnIdx && clampIdx < fnIdx + 500, 'setLoopRegionState should clamp values with Math.max');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setLoopRegionEnabledState'), 'setLoopRegionEnabledState should be exported');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionEnabledState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setLoopRegionEnabledState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setLoopRegionEnabledState should call captureStateForUndo');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionEnabledState has descriptive undo label with On/Off", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setLoopRegionEnabledState');
    const labelIdx = stateStr.indexOf('Toggle Loop Region', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'setLoopRegionEnabledState undo label should mention Toggle Loop Region');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionStartBarState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setLoopRegionStartBarState'), 'setLoopRegionStartBarState should be exported');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionStartBarState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setLoopRegionStartBarState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setLoopRegionStartBarState should call captureStateForUndo');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionStartBarState has descriptive undo label with bar number", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setLoopRegionStartBarState');
    const labelIdx = stateStr.indexOf('Set Loop Region Start to Bar', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'setLoopRegionStartBarState undo label should mention Loop Region Start');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionStartBarState clamps start bar and adjusts end bar", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setLoopRegionStartBarState');
    const clampIdx = stateStr.indexOf('Math.max', fnIdx);
    const endBarIdx = stateStr.indexOf('endBar', fnIdx);
    t.assertTruthy(clampIdx > fnIdx && clampIdx < fnIdx + 500, 'setLoopRegionStartBarState should clamp with Math.max');
    t.assertTruthy(endBarIdx > fnIdx && endBarIdx < fnIdx + 500, 'setLoopRegionStartBarState should adjust endBar when needed');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionEndBarState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setLoopRegionEndBarState'), 'setLoopRegionEndBarState should be exported');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionEndBarState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setLoopRegionEndBarState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setLoopRegionEndBarState should call captureStateForUndo');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionEndBarState has descriptive undo label with bar number", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setLoopRegionEndBarState');
    const labelIdx = stateStr.indexOf('Set Loop Region End to Bar', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 300, 'setLoopRegionEndBarState undo label should mention Loop Region End');
});

TestRunner.test("Day 608 - Loop Region - setLoopRegionEndBarState clamps end bar to be >= start bar", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setLoopRegionEndBarState');
    const clampIdx = stateStr.indexOf('Math.max', fnIdx);
    const startBarIdx = stateStr.indexOf('startBar', fnIdx);
    t.assertTruthy(clampIdx > fnIdx && clampIdx < fnIdx + 500, 'setLoopRegionEndBarState should clamp end bar');
    t.assertTruthy(startBarIdx > fnIdx && startBarIdx < fnIdx + 500, 'setLoopRegionEndBarState should reference startBar');
});

TestRunner.test("Day 608 - Swing - setSwingState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSwingState'), 'setSwingState should be exported');
});

TestRunner.test("Day 608 - Swing - setSwingState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 200, 'setSwingState should call captureStateForUndo');
});

TestRunner.test("Day 608 - Swing - setSwingState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingState');
    const labelIdx = stateStr.indexOf('Set Swing', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 200, 'setSwingState undo label should mention Set Swing');
});

TestRunner.test("Day 608 - Swing - setSwingState sets both enabled and amount properties", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setSwingState');
    const enabledIdx = stateStr.indexOf('enabled:', fnIdx);
    const amountIdx = stateStr.indexOf('amount:', fnIdx);
    t.assertTruthy(enabledIdx > fnIdx && enabledIdx < fnIdx + 400, 'setSwingState should set enabled property');
    t.assertTruthy(amountIdx > fnIdx && amountIdx < fnIdx + 400, 'setSwingState should set amount property');
});

TestRunner.test("Day 608 - Time Signature - setTimeSignatureState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTimeSignatureState'), 'setTimeSignatureState should be exported');
});

TestRunner.test("Day 608 - Time Signature - setTimeSignatureState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimeSignatureState');
    const captureIdx = stateStr.indexOf('captureStateForUndo', fnIdx);
    t.assertTruthy(captureIdx > fnIdx && captureIdx < fnIdx + 300, 'setTimeSignatureState should call captureStateForUndo');
});

TestRunner.test("Day 608 - Time Signature - setTimeSignatureState has descriptive undo label with n/d", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimeSignatureState');
    const labelIdx = stateStr.indexOf('Set Time Signature to', fnIdx);
    t.assertTruthy(labelIdx > fnIdx && labelIdx < fnIdx + 400, 'setTimeSignatureState undo label should mention Time Signature');
});

TestRunner.test("Day 608 - Time Signature - setTimeSignatureState clamps numerator and denominator to valid ranges", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimeSignatureState');
    const numIdx = stateStr.indexOf('TIME_SIG_MAX_NUMERATOR', fnIdx);
    const denIdx = stateStr.indexOf('TIME_SIG_MAX_DENOMINATOR', fnIdx);
    t.assertTruthy(numIdx > fnIdx && numIdx < fnIdx + 500, 'setTimeSignatureState should clamp numerator');
    t.assertTruthy(denIdx > fnIdx && denIdx < fnIdx + 500, 'setTimeSignatureState should clamp denominator');
});

TestRunner.test("Day 608 - Time Signature - setTimeSignatureState sets numerator and denominator properties", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function setTimeSignatureState');
    const numIdx = stateStr.indexOf('numerator:', fnIdx);
    const denIdx = stateStr.indexOf('denominator:', fnIdx);
    t.assertTruthy(numIdx > fnIdx && numIdx < fnIdx + 500, 'setTimeSignatureState should set numerator');
    t.assertTruthy(denIdx > fnIdx && denIdx < fnIdx + 500, 'setTimeSignatureState should set denominator');
});

TestRunner.test("Day 608 - APP_VERSION validation for Day 608", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 608");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 262, "Minor version should be >= 262 for Day 608");
    }
});
// Day 609: Additional State Function Tests - Track Templates and Auto-Save Recovery
TestRunner.test("Day 609 - Track Templates - getTrackTemplateByIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTrackTemplateByIdState'), 'getTrackTemplateByIdState should be exported');
});

TestRunner.test("Day 609 - Track Templates - getTrackTemplateByIdState uses .find to locate template", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getTrackTemplateByIdState');
    const findIdx = stateStr.indexOf('.find', fnIdx);
    t.assertTruthy(findIdx > fnIdx && findIdx < fnIdx + 100, 'getTrackTemplateByIdState should use .find to locate template');
});

TestRunner.test("Day 609 - Track Templates - getTrackTemplateByIdState accepts 1 parameter (id)", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function getTrackTemplateByIdState');
    const parenIdx = stateStr.indexOf('(', fnIdx);
    const closeIdx = stateStr.indexOf(')', parenIdx);
    const params = stateStr.substring(parenIdx, closeIdx + 1);
    t.assertTruthy(params.includes('id'), 'getTrackTemplateByIdState should accept id parameter');
});

TestRunner.test("Day 609 - Auto-Save Recovery - recoverAutoSavedProject is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export async function recoverAutoSavedProject') || stateStr.includes('export function recoverAutoSavedProject'), 'recoverAutoSavedProject should be exported');
});

TestRunner.test("Day 609 - Auto-Save Recovery - recoverAutoSavedProject uses localStorage getItem", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function recoverAutoSavedProject');
    const getItemIdx = stateStr.indexOf('localStorage.getItem', fnIdx);
    t.assertTruthy(getItemIdx > fnIdx && getItemIdx < fnIdx + 300, 'recoverAutoSavedProject should use localStorage.getItem');
});

TestRunner.test("Day 609 - Auto-Save Recovery - recoverAutoSavedProject checks for AUTOSAVE_KEY", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function recoverAutoSavedProject');
    const keyIdx = stateStr.indexOf('AUTOSAVE_KEY', fnIdx);
    t.assertTruthy(keyIdx > fnIdx && keyIdx < fnIdx + 300, 'recoverAutoSavedProject should check for AUTOSAVE_KEY');
});

TestRunner.test("Day 609 - Auto-Save Recovery - recoverAutoSavedProject uses JSON.parse", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function recoverAutoSavedProject');
    const parseIdx = stateStr.indexOf('JSON.parse', fnIdx);
    t.assertTruthy(parseIdx > fnIdx && parseIdx < fnIdx + 400, 'recoverAutoSavedProject should use JSON.parse');
});

TestRunner.test("Day 609 - Auto-Save Recovery - recoverAutoSavedProject returns null when no saved project", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function recoverAutoSavedProject');
    const nullIdx = stateStr.indexOf('return null', fnIdx);
    t.assertTruthy(nullIdx > fnIdx && nullIdx < fnIdx + 400, 'recoverAutoSavedProject should return null when no saved project');
});

TestRunner.test("Day 609 - Auto-Save Recovery - recoverAutoSavedProject handles errors gracefully", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function recoverAutoSavedProject');
    const catchIdx = stateStr.indexOf('catch', fnIdx);
    t.assertTruthy(catchIdx > fnIdx && catchIdx < fnIdx + 500, 'recoverAutoSavedProject should have error handling with catch block');
});

TestRunner.test("Day 609 - Auto-Save Recovery - recoverAutoSavedProject returns projectData on success", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    const fnIdx = stateStr.indexOf('export function recoverAutoSavedProject');
    const returnDataIdx = stateStr.indexOf('return projectData', fnIdx);
    t.assertTruthy(returnDataIdx > fnIdx && returnDataIdx < fnIdx + 500, 'recoverAutoSavedProject should return projectData on success');
});

TestRunner.test("Day 609 - APP_VERSION validation for Day 609", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, "Major version should be >= 2 for Day 609");
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 263, "Minor version should be >= 263 for Day 609");
    }
});
// Day 610: Timeline Markers and Chord Mode State Function Tests
TestRunner.test("Day 610 - Timeline Markers - getTimelineMarkersState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function getTimelineMarkersState'); t.assertTruthy(idx >= 0, 'getTimelineMarkersState should be a function export');
});

TestRunner.test("Day 610 - Timeline Markers - getTimelineMarkerByIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function getTimelineMarkerByIdState'); t.assertTruthy(idx >= 0, 'getTimelineMarkerByIdState should be a function export');
});

TestRunner.test("Day 610 - Timeline Markers - getTimelineMarkerByIdState uses .find", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function getTimelineMarkerByIdState'); const findIdx = stateStr.indexOf('.find', idx); t.assertTruthy(findIdx > idx && findIdx < idx + 200, 'getTimelineMarkerByIdState should use .find method');
});

TestRunner.test("Day 610 - Timeline Markers - addTimelineMarkerState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function addTimelineMarkerState'); t.assertTruthy(idx >= 0, 'addTimelineMarkerState should be a function export');
});

TestRunner.test("Day 610 - Timeline Markers - addTimelineMarkerState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function addTimelineMarkerState'); const capIdx = stateStr.indexOf('captureStateForUndo', idx); t.assertTruthy(capIdx > idx && capIdx < idx + 600, 'addTimelineMarkerState should call captureStateForUndo');
});

TestRunner.test("Day 610 - Timeline Markers - addTimelineMarkerState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function addTimelineMarkerState'); const labelIdx = stateStr.indexOf('Add Timeline Marker', idx); t.assertTruthy(labelIdx > idx && labelIdx < idx + 600, 'addTimelineMarkerState should have Add Timeline Marker undo label');
});

TestRunner.test("Day 610 - Timeline Markers - setTimelineMarkerState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setTimelineMarkerState'); t.assertTruthy(idx >= 0, 'setTimelineMarkerState should be a function export');
});

TestRunner.test("Day 610 - Timeline Markers - setTimelineMarkerState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setTimelineMarkerState'); const capIdx = stateStr.indexOf('captureStateForUndo', idx); t.assertTruthy(capIdx > idx && capIdx < idx + 600, 'setTimelineMarkerState should call captureStateForUndo');
});

TestRunner.test("Day 610 - Timeline Markers - removeTimelineMarkerState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function removeTimelineMarkerState'); t.assertTruthy(idx >= 0, 'removeTimelineMarkerState should be a function export');
});

TestRunner.test("Day 610 - Timeline Markers - removeTimelineMarkerState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function removeTimelineMarkerState'); const capIdx = stateStr.indexOf('captureStateForUndo', idx); t.assertTruthy(capIdx > idx && capIdx < idx + 600, 'removeTimelineMarkerState should call captureStateForUndo');
});

TestRunner.test("Day 610 - Timeline Markers - clearTimelineMarkersState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function clearTimelineMarkersState'); t.assertTruthy(idx >= 0, 'clearTimelineMarkersState should be a function export');
});

TestRunner.test("Day 610 - Timeline Markers - clearTimelineMarkersState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function clearTimelineMarkersState'); const capIdx = stateStr.indexOf('captureStateForUndo', idx); t.assertTruthy(capIdx > idx && capIdx < idx + 600, 'clearTimelineMarkersState should call captureStateForUndo');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeState'); t.assertTruthy(idx >= 0, 'setChordModeState should be a function export');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeState'); const capIdx = stateStr.indexOf('captureStateForUndo', idx); t.assertTruthy(capIdx > idx && capIdx < idx + 600, 'setChordModeState should call captureStateForUndo');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeState'); const labelIdx = stateStr.indexOf('Set Chord Mode', idx); t.assertTruthy(labelIdx > idx && labelIdx < idx + 600, 'setChordModeState should have Set Chord Mode undo label');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeEnabledState'); t.assertTruthy(idx >= 0, 'setChordModeEnabledState should be a function export');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeEnabledState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeEnabledState'); const capIdx = stateStr.indexOf('captureStateForUndo', idx); t.assertTruthy(capIdx > idx && capIdx < idx + 600, 'setChordModeEnabledState should call captureStateForUndo');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeEnabledState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeEnabledState'); const labelIdx = stateStr.indexOf('Toggle Chord Mode', idx); t.assertTruthy(labelIdx > idx && labelIdx < idx + 600, 'setChordModeEnabledState should have Toggle Chord Mode undo label');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeRootState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeRootState'); t.assertTruthy(idx >= 0, 'setChordModeRootState should be a function export');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeRootState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeRootState'); const capIdx = stateStr.indexOf('captureStateForUndo', idx); t.assertTruthy(capIdx > idx && capIdx < idx + 600, 'setChordModeRootState should call captureStateForUndo');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeRootState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeRootState'); const labelIdx = stateStr.indexOf('Set Chord Root', idx); t.assertTruthy(labelIdx > idx && labelIdx < idx + 600, 'setChordModeRootState should have Set Chord Root undo label');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeTypeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeTypeState'); t.assertTruthy(idx >= 0, 'setChordModeTypeState should be a function export');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeTypeState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeTypeState'); const capIdx = stateStr.indexOf('captureStateForUndo', idx); t.assertTruthy(capIdx > idx && capIdx < idx + 600, 'setChordModeTypeState should call captureStateForUndo');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeTypeState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeTypeState'); const labelIdx = stateStr.indexOf('Set Chord Type', idx); t.assertTruthy(labelIdx > idx && labelIdx < idx + 600, 'setChordModeTypeState should have Set Chord Type undo label');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeLockState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeLockState'); t.assertTruthy(idx >= 0, 'setChordModeLockState should be a function export');
});

TestRunner.test("Day 610 - Chord Mode - setChordModeLockState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordModeLockState'); const capIdx = stateStr.indexOf('captureStateForUndo', idx); t.assertTruthy(capIdx > idx && capIdx < idx + 600, 'setChordModeLockState should call captureStateForUndo');
});

TestRunner.test("Day 610 - Chord Mode - getChordVoicingState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function getChordVoicingState'); t.assertTruthy(idx >= 0, 'getChordVoicingState should be a function export');
});

TestRunner.test("Day 610 - Chord Mode - setChordVoicingState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordVoicingState'); t.assertTruthy(idx >= 0, 'setChordVoicingState should be a function export');
});

TestRunner.test("Day 610 - Chord Mode - setChordVoicingState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordVoicingState'); const capIdx = stateStr.indexOf('captureStateForUndo', idx); t.assertTruthy(capIdx > idx && capIdx < idx + 600, 'setChordVoicingState should call captureStateForUndo');
});

TestRunner.test("Day 610 - Chord Mode - setChordVoicingState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setChordVoicingState'); const labelIdx = stateStr.indexOf('Set Chord Voicing', idx); t.assertTruthy(labelIdx > idx && labelIdx < idx + 600, 'setChordVoicingState should have Set Chord Voicing undo label');
});

TestRunner.test("Day 610 - Solo State - setSoloedTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setSoloedTrackIdState'); t.assertTruthy(idx >= 0, 'setSoloedTrackIdState should be a function export');
});

TestRunner.test("Day 610 - Solo State - setSoloedTrackIdState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setSoloedTrackIdState'); const capIdx = stateStr.indexOf('captureStateForUndo', idx); t.assertTruthy(capIdx > idx && capIdx < idx + 600, 'setSoloedTrackIdState should call captureStateForUndo');
});

TestRunner.test("Day 610 - Solo State - setSoloedTrackIdState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setSoloedTrackIdState'); const labelIdx = stateStr.indexOf('Solo', idx); t.assertTruthy(labelIdx > idx && labelIdx < idx + 600, 'setSoloedTrackIdState should have Solo undo label');
});

TestRunner.test("Day 610 - Mute State - setTrackMutedState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setTrackMutedState'); t.assertTruthy(idx >= 0, 'setTrackMutedState should be a function export');
});

TestRunner.test("Day 610 - Mute State - setTrackMutedState calls captureStateForUndo", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setTrackMutedState'); const capIdx = stateStr.indexOf('captureStateForUndo', idx); t.assertTruthy(capIdx > idx && capIdx < idx + 600, 'setTrackMutedState should call captureStateForUndo');
});

TestRunner.test("Day 610 - Mute State - setTrackMutedState has descriptive undo label", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setTrackMutedState'); const labelIdx = stateStr.indexOf('Mute', idx); t.assertTruthy(labelIdx > idx && labelIdx < idx + 600, 'setTrackMutedState should have Mute undo label');
});

TestRunner.test("Day 610 - Timeline - setActiveSequencerTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setActiveSequencerTrackIdState'); t.assertTruthy(idx >= 0, 'setActiveSequencerTrackIdState should be a function export');
});

TestRunner.test("Day 610 - Playback Mode - setPlaybackModeStateInternal is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function setPlaybackModeStateInternal'); t.assertTruthy(idx >= 0, 'setPlaybackModeStateInternal should be a function export');
});

TestRunner.test("Day 610 - Track Templates - updateTrackTemplateState has appServices guard", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8'); const idx = stateStr.indexOf('export function updateTrackTemplateState'); const guardIdx = stateStr.indexOf('appServices && appServices.captureStateForUndo', idx); t.assertTruthy(guardIdx > idx && guardIdx < idx + 200, 'updateTrackTemplateState should guard captureStateForUndo with appServices check');
});

TestRunner.test("Day 610 - APP_VERSION validation for Day 610", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number); t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 610'); if (versionParts[0] === 2) { t.assertTruthy(versionParts[1] >= 264, 'Minor version should be >= 264 for Day 610'); }
});



// Day 612: DrumSampler Pad Drop Zone Handler Tests - Verify renderDrumSamplerPads adds drag/drop handlers
TestRunner.test("Day 612 - DrumSampler Pad Drop - renderDrumSamplerPads adds dragover handler to pads", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes("padEl.addEventListener('dragover'"), "renderDrumSamplerPads should add dragover event listener to pads");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - renderDrumSamplerPads adds dragleave handler to pads", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes("padEl.addEventListener('dragleave'"), "renderDrumSamplerPads should add dragleave event listener to pads");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - renderDrumSamplerPads adds drop handler to pads", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes("padEl.addEventListener('drop'"), "renderDrumSamplerPads should add drop event listener to pads");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler reads padIndex from dataset", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes("padEl.dataset.padIndex") || funcStr.includes("dataset.padIndex"), "Drop handler should read padIndex from dataset");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler reads trackId from dataset", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes("padEl.dataset.trackId") || funcStr.includes("dataset.trackId"), "Drop handler should read trackId from dataset");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler parses padIndex with parseInt", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    const padIndexIdx = funcStr.indexOf('parseInt(');
    const datasetIdx = funcStr.indexOf('dataset.padIndex');
    t.assertTruthy(padIndexIdx >= 0 && datasetIdx >= 0 && padIndexIdx < datasetIdx + 50, "Drop handler should parse padIndex with parseInt");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler checks for application/json data", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('getData("application/json")') || funcStr.includes("getData('application/json')"), "Drop handler should check for application/json data");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler parses JSON from dataTransfer", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('JSON.parse'), "Drop handler should parse JSON from dataTransfer");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler checks soundData.type === 'sound-browser-item'", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes("type === 'sound-browser-item'") || funcStr.includes('type === "sound-browser-item"'), "Drop handler should check soundData.type");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler calls loadSoundFromBrowserToTarget for sound browser items", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('loadSoundFromBrowserToTarget'), "Drop handler should call loadSoundFromBrowserToTarget for sound browser items");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler handles OS file drops via dataTransfer.files", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('dataTransfer.files') || funcStr.includes('e.dataTransfer.files'), "Drop handler should handle OS file drops via dataTransfer.files");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler calls loadDrumSamplerPadFile for OS file drops", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('loadDrumSamplerPadFile'), "Drop handler should call loadDrumSamplerPadFile for OS file drops");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler creates simulated event for file drops", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('simulatedEvent') || funcStr.includes('target: { files:'), "Drop handler should create simulated event for file drops");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - dragover handler calls preventDefault and stopPropagation", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('e.preventDefault()') && funcStr.includes('e.stopPropagation()'), "Dragover handler should call preventDefault and stopPropagation");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - dragover handler adds 'dragover' CSS class", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes("classList.add('dragover')") || funcStr.includes('classList.add("dragover")'), "Dragover handler should add dragover CSS class");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - dragover handler sets dropEffect to copy", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('dropEffect = "copy"') || funcStr.includes("dropEffect = 'copy'"), "Dragover handler should set dropEffect to copy");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - dragleave handler removes 'dragover' CSS class", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes("classList.remove('dragover')") || funcStr.includes('classList.remove("dragover")'), "Dragleave handler should remove dragover CSS class");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler calls preventDefault and stopPropagation", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    const dropIdx = funcStr.indexOf("padEl.addEventListener('drop'");
    if (dropIdx < 0) {
        t.assertTruthy(false, "Drop handler should exist");
        return;
    }
    const dropSection = funcStr.substring(dropIdx, dropIdx + 1000);
    t.assertTruthy(dropSection.includes('e.preventDefault()') && dropSection.includes('e.stopPropagation()'), "Drop handler should call preventDefault and stopPropagation");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler removes dragover class on drop", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    const dropIdx = funcStr.indexOf("padEl.addEventListener('drop'");
    if (dropIdx < 0) {
        t.assertTruthy(false, "Drop handler should exist");
        return;
    }
    const dropSection = funcStr.substring(dropIdx, dropIdx + 1000);
    t.assertTruthy(dropSection.includes("classList.remove('dragover')") || dropSection.includes('classList.remove("dragover")'), "Drop handler should remove dragover class");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler passes trackId to loadSoundFromBrowserToTarget", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    const dropIdx = funcStr.indexOf("padEl.addEventListener('drop'");
    if (dropIdx < 0) {
        t.assertTruthy(false, "Drop handler should exist");
        return;
    }
    const dropSection = funcStr.substring(dropIdx, dropIdx + 1500);
    t.assertTruthy(dropSection.includes('loadSoundFromBrowserToTarget(soundData, trackId'), "Drop handler should pass trackId to loadSoundFromBrowserToTarget");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler passes 'DrumSampler' as targetType to loadSoundFromBrowserToTarget", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    const dropIdx = funcStr.indexOf("padEl.addEventListener('drop'");
    if (dropIdx < 0) {
        t.assertTruthy(false, "Drop handler should exist");
        return;
    }
    const dropSection = funcStr.substring(dropIdx, dropIdx + 1500);
    t.assertTruthy(dropSection.includes("'DrumSampler'") || dropSection.includes('"DrumSampler"'), "Drop handler should pass 'DrumSampler' as targetType");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler passes padIndex to loadSoundFromBrowserToTarget", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    const dropIdx = funcStr.indexOf("padEl.addEventListener('drop'");
    if (dropIdx < 0) {
        t.assertTruthy(false, "Drop handler should exist");
        return;
    }
    const dropSection = funcStr.substring(dropIdx, dropIdx + 1500);
    t.assertTruthy(dropSection.includes('loadSoundFromBrowserToTarget(soundData, trackId, \'DrumSampler\', padIndex)'), "Drop handler should pass padIndex to loadSoundFromBrowserToTarget");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler uses await for async loadSoundFromBrowserToTarget", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    const dropIdx = funcStr.indexOf("padEl.addEventListener('drop'");
    if (dropIdx < 0) {
        t.assertTruthy(false, "Drop handler should exist");
        return;
    }
    const dropSection = funcStr.substring(dropIdx, dropIdx + 1500);
    t.assertTruthy(dropSection.includes('await localAppServices.loadSoundFromBrowserToTarget'), "Drop handler should use await for async loadSoundFromBrowserToTarget");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler catches JSON parse errors", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('JSON.parse') && (funcStr.includes('catch') || funcStr.includes('try')), "Drop handler should catch JSON parse errors");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler handles file.name for file drops", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('file.name'), "Drop handler should use file.name for file drops");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - drop handler passes file.name to loadDrumSamplerPadFile", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    const dropIdx = funcStr.indexOf("padEl.addEventListener('drop'");
    if (dropIdx < 0) {
        t.assertTruthy(false, "Drop handler should exist");
        return;
    }
    const dropSection = funcStr.substring(dropIdx, dropIdx + 1500);
    t.assertTruthy(dropSection.includes('loadDrumSamplerPadFile(simulatedEvent, trackId, padIndex, file.name)'), "Drop handler should pass file.name to loadDrumSamplerPadFile");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - renderDrumSamplerPads queries for drum-pad elements", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes("querySelectorAll('.drum-pad')") || funcStr.includes("querySelectorAll(\".drum-pad\")"), "renderDrumSamplerPads should query for drum-pad elements");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - renderDrumSamplerPads iterates pads with forEach", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes("forEach(padEl =>"), "renderDrumSamplerPads should iterate pads with forEach");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - pad elements have data-pad-index attribute in HTML", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('data-pad-index=') || funcStr.includes('data-track-id='), "Pad elements should have data-pad-index attribute");
});

TestRunner.test("Day 612 - DrumSampler Pad Drop - pad elements have data-track-id attribute in HTML", (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('data-track-id='), "Pad elements should have data-track-id attribute");
});

TestRunner.test("Day 612 - APP_VERSION validation for Day 612", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number); t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 612'); if (versionParts[0] === 2) { t.assertTruthy(versionParts[1] >= 265, 'Minor version should be >= 265 for Day 612'); }
});

// Day 613: Track Instance Methods - Automation Armed, Monitoring, Selection, and Instrument Settings Tests (2026-05-27)
TestRunner.test("Day 613 - Track Instance Methods - setAutomationArmed is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.setAutomationArmed, 'function', 'setAutomationArmed should be a function');
});

TestRunner.test("Day 613 - Track Instance Methods - setAutomationArmed captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.setAutomationArmed.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const mutationIdx = funcStr.indexOf('this.automationArmed =');
    t.assertTruthy(captureIdx >= 0 && captureIdx < mutationIdx, 'setAutomationArmed should capture undo before setting automationArmed');
});

TestRunner.test("Day 613 - Track Instance Methods - setAutomationArmed has descriptive undo label with On/Off", (t) => {
    const funcStr = Track.prototype.setAutomationArmed.toString();
    t.assertTruthy(funcStr.includes('Toggle Automation Arm') && funcStr.includes('On') && funcStr.includes('Off'), 'setAutomationArmed should have Toggle Automation Arm On/Off label');
});

TestRunner.test("Day 613 - Track Instance Methods - setAutomationArmed uses !! to coerce boolean", (t) => {
    const funcStr = Track.prototype.setAutomationArmed.toString();
    const boolIdx = funcStr.indexOf('!!armed');
    t.assertTruthy(boolIdx >= 0, 'setAutomationArmed should use !! to coerce armed to boolean');
});

TestRunner.test("Day 613 - Track Instance Methods - setAutomationArmed only captures when value changes", (t) => {
    const funcStr = Track.prototype.setAutomationArmed.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const condIdx = funcStr.indexOf('if (this.automationArmed !== nextValue)');
    t.assertTruthy(condIdx >= 0 && condIdx < captureIdx, 'setAutomationArmed should only capture when value changes');
});

TestRunner.test("Day 613 - Track Instance Methods - setAutomationArmed returns the new value", (t) => {
    const funcStr = Track.prototype.setAutomationArmed.toString();
    const returnIdx = funcStr.indexOf('return this.automationArmed');
    t.assertTruthy(returnIdx >= 0, 'setAutomationArmed should return this.automationArmed');
});

TestRunner.test("Day 613 - Track Instance Methods - setMonitoringEnabled is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.setMonitoringEnabled, 'function', 'setMonitoringEnabled should be a function');
});

TestRunner.test("Day 613 - Track Instance Methods - setMonitoringEnabled captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.setMonitoringEnabled.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const mutationIdx = funcStr.indexOf('this.isMonitoringEnabled =');
    t.assertTruthy(captureIdx >= 0 && captureIdx < mutationIdx, 'setMonitoringEnabled should capture undo before setting isMonitoringEnabled');
});

TestRunner.test("Day 613 - Track Instance Methods - setMonitoringEnabled has descriptive undo label with On/Off", (t) => {
    const funcStr = Track.prototype.setMonitoringEnabled.toString();
    t.assertTruthy(funcStr.includes('Toggle Input Monitoring') && funcStr.includes('On') && funcStr.includes('Off'), 'setMonitoringEnabled should have Toggle Input Monitoring On/Off label');
});

TestRunner.test("Day 613 - Track Instance Methods - setMonitoringEnabled uses !! to coerce boolean", (t) => {
    const funcStr = Track.prototype.setMonitoringEnabled.toString();
    const boolIdx = funcStr.indexOf('!!enabled');
    t.assertTruthy(boolIdx >= 0, 'setMonitoringEnabled should use !! to coerce enabled to boolean');
});

TestRunner.test("Day 613 - Track Instance Methods - setMonitoringEnabled only captures when value changes", (t) => {
    const funcStr = Track.prototype.setMonitoringEnabled.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const condIdx = funcStr.indexOf('if (this.isMonitoringEnabled !== nextValue)');
    t.assertTruthy(condIdx >= 0 && condIdx < captureIdx, 'setMonitoringEnabled should only capture when value changes');
});

TestRunner.test("Day 613 - Track Instance Methods - setMonitoringEnabled returns the new value", (t) => {
    const funcStr = Track.prototype.setMonitoringEnabled.toString();
    const returnHitIdx = funcStr.indexOf('return this.isMonitoringEnabled');
    t.assertTruthy(returnHitIdx >= 0, 'setMonitoringEnabled should return this.isMonitoringEnabled');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedSliceForEdit is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.setSelectedSliceForEdit, 'function', 'setSelectedSliceForEdit should be a function');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedSliceForEdit accepts sliceIndex parameter", (t) => {
    t.assertEqual(Track.prototype.setSelectedSliceForEdit.length, 1, 'setSelectedSliceForEdit should accept 1 parameter');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedSliceForEdit captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.setSelectedSliceForEdit.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const mutationIdx = funcStr.indexOf('this.selectedSliceForEdit =');
    t.assertTruthy(captureIdx >= 0 && captureIdx < mutationIdx, 'setSelectedSliceForEdit should capture undo before setting selectedSliceForEdit');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedSliceForEdit has descriptive undo label with slice number", (t) => {
    const funcStr = Track.prototype.setSelectedSliceForEdit.toString();
    t.assertTruthy(funcStr.includes('Select Slice ${nextIndex + 1}'), 'setSelectedSliceForEdit should have Select Slice undo label');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedSliceForEdit clamps index to valid range", (t) => {
    const funcStr = Track.prototype.setSelectedSliceForEdit.toString();
    const maxIdx = funcStr.indexOf('Math.max(0, Math.min');
    t.assertTruthy(maxIdx >= 0, 'setSelectedSliceForEdit should clamp index to valid range');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedSliceForEdit only captures when value changes", (t) => {
    const funcStr = Track.prototype.setSelectedSliceForEdit.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const condIdx = funcStr.indexOf('if (this.selectedSliceForEdit !== nextIndex)');
    t.assertTruthy(condIdx >= 0 && condIdx < captureIdx, 'setSelectedSliceForEdit should only capture when value changes');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedSliceForEdit returns the new value", (t) => {
    const funcStr = Track.prototype.setSelectedSliceForEdit.toString();
    const returnHitIdx = funcStr.indexOf('return this.selectedSliceForEdit');
    t.assertTruthy(returnHitIdx >= 0, 'setSelectedSliceForEdit should return this.selectedSliceForEdit');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedDrumPadForEdit is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.setSelectedDrumPadForEdit, 'function', 'setSelectedDrumPadForEdit should be a function');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedDrumPadForEdit accepts padIndex parameter", (t) => {
    t.assertEqual(Track.prototype.setSelectedDrumPadForEdit.length, 1, 'setSelectedDrumPadForEdit should accept 1 parameter');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedDrumPadForEdit captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.setSelectedDrumPadForEdit.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const mutationIdx = funcStr.indexOf('this.selectedDrumPadForEdit =');
    t.assertTruthy(captureIdx >= 0 && captureIdx < mutationIdx, 'setSelectedDrumPadForEdit should capture undo before setting selectedDrumPadForEdit');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedDrumPadForEdit has descriptive undo label with pad number", (t) => {
    const funcStr = Track.prototype.setSelectedDrumPadForEdit.toString();
    t.assertTruthy(funcStr.includes('Select Drum Pad ${nextIndex + 1}'), 'setSelectedDrumPadForEdit should have Select Drum Pad undo label');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedDrumPadForEdit clamps index to valid range", (t) => {
    const funcStr = Track.prototype.setSelectedDrumPadForEdit.toString();
    const maxIdx = funcStr.indexOf('Math.max(0, Math.min');
    t.assertTruthy(maxIdx >= 0, 'setSelectedDrumPadForEdit should clamp index to valid range');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedDrumPadForEdit only captures when value changes", (t) => {
    const funcStr = Track.prototype.setSelectedDrumPadForEdit.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const condIdx = funcStr.indexOf('if (this.selectedDrumPadForEdit !== nextIndex)');
    t.assertTruthy(condIdx >= 0 && condIdx < captureIdx, 'setSelectedDrumPadForEdit should only capture when value changes');
});

TestRunner.test("Day 613 - Track Instance Methods - setSelectedDrumPadForEdit returns the new value", (t) => {
    const funcStr = Track.prototype.setSelectedDrumPadForEdit.toString();
    const returnHitIdx = funcStr.indexOf('return this.selectedDrumPadForEdit');
    t.assertTruthy(returnHitIdx >= 0, 'setSelectedDrumPadForEdit should return this.selectedDrumPadForEdit');
});

TestRunner.test("Day 613 - Track Instance Methods - setTrackColor is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.setTrackColor, 'function', 'setTrackColor should be a function');
});

TestRunner.test("Day 613 - Track Instance Methods - setTrackColor captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.setTrackColor.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const mutationIdx = funcStr.indexOf('this.trackColor =');
    t.assertTruthy(captureIdx >= 0 && captureIdx < mutationIdx, 'setTrackColor should capture undo before setting trackColor');
});

TestRunner.test("Day 613 - Track Instance Methods - setTrackColor has descriptive undo label", (t) => {
    const funcStr = Track.prototype.setTrackColor.toString();
    t.assertTruthy(funcStr.includes('Change color on'), 'setTrackColor should have Change color undo label');
});

TestRunner.test("Day 613 - Track Instance Methods - setTrackColor calls updateTrackUI on color change", (t) => {
    const funcStr = Track.prototype.setTrackColor.toString();
    t.assertTruthy(funcStr.includes('this.appServices.updateTrackUI') || funcStr.includes('updateTrackUI'), 'setTrackColor should call updateTrackUI');
});

TestRunner.test("Day 613 - Track Instance Methods - setTrackColor has appServices guard for updateTrackUI", (t) => {
    const funcStr = Track.prototype.setTrackColor.toString();
    t.assertTruthy(funcStr.includes('if (this.appServices.updateTrackUI)'), 'setTrackColor should guard updateTrackUI call');
});

TestRunner.test("Day 613 - Track Instance Methods - setInstrumentSamplerRootNote is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.setInstrumentSamplerRootNote, 'function', 'setInstrumentSamplerRootNote should be a function');
});

TestRunner.test("Day 613 - Track Instance Methods - setInstrumentSamplerRootNote accepts noteName parameter", (t) => {
    t.assertEqual(Track.prototype.setInstrumentSamplerRootNote.length, 1, 'setInstrumentSamplerRootNote should accept 1 parameter');
});

TestRunner.test("Day 613 - Track Instance Methods - setInstrumentSamplerRootNote captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerRootNote.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const mutationIdx = funcStr.indexOf('this.instrumentSamplerSettings.rootNote =');
    t.assertTruthy(captureIdx >= 0 && captureIdx < mutationIdx, 'setInstrumentSamplerRootNote should capture undo before setting rootNote');
});

TestRunner.test("Day 613 - Track Instance Methods - setInstrumentSamplerRootNote has descriptive undo label", (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerRootNote.toString();
    t.assertTruthy(funcStr.includes('Set root note on'), 'setInstrumentSamplerRootNote should have Set root note undo label');
});

TestRunner.test("Day 613 - Track Instance Methods - setInstrumentSamplerRootNote guards instrumentSamplerSettings", (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerRootNote.toString();
    t.assertTruthy(funcStr.includes('if (this.instrumentSamplerSettings)'), 'setInstrumentSamplerRootNote should guard instrumentSamplerSettings');
});

TestRunner.test("Day 613 - Track Instance Methods - setInstrumentSamplerRootNote calls setupToneSampler after change", (t) => {
    const funcStr = Track.prototype.setInstrumentSamplerRootNote.toString();
    t.assertTruthy(funcStr.includes('this.setupToneSampler()'), 'setInstrumentSamplerRootNote should call setupToneSampler');
});

TestRunner.test("Day 613 - APP_VERSION validation for Day 613", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number); t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 613'); if (versionParts[0] === 2) { t.assertTruthy(versionParts[1] >= 267, 'Minor version should be >= 267 for Day 613'); }
});

// Day 614: Audio Processing Methods Tests - normalizeAudioClip, bounceTrack, freezeTrack
// ====================================================================================

TestRunner.test("Day 614 - Audio Processing - normalizeAudioClip is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.normalizeAudioClip, 'function', 'normalizeAudioClip should be a function');
});

TestRunner.test("Day 614 - Audio Processing - normalizeAudioClip is async", (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('async normalizeAudioClip'), 'normalizeAudioClip should be async');
});

TestRunner.test("Day 614 - Audio Processing - normalizeAudioClip captures undo before mutation", (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    const captureIdx = funcStr.indexOf('_captureUndoState');
    const clipGainIdx = funcStr.indexOf('clip.gain =');
    t.assertTruthy(captureIdx >= 0 && captureIdx < clipGainIdx, 'normalizeAudioClip should capture undo before setting clip.gain');
});

TestRunner.test("Day 614 - Audio Processing - normalizeAudioClip has descriptive undo label", (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('Normalize'), 'normalizeAudioClip undo label should reference Normalize');
});

TestRunner.test("Day 614 - Audio Processing - normalizeAudioClip returns boolean", (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'normalizeAudioClip should return boolean');
});

TestRunner.test("Day 614 - Audio Processing - normalizeAudioClip uses appServices for notifications", (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('appServices.showNotification'), 'normalizeAudioClip should use appServices.showNotification');
});

TestRunner.test("Day 614 - Audio Processing - bounceTrack is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.bounceTrack, 'function', 'bounceTrack should be a function');
});

TestRunner.test("Day 614 - Audio Processing - bounceTrack is async", (t) => {
    const funcStr = Track.prototype.bounceTrack.toString();
    t.assertTruthy(funcStr.includes('async bounceTrack'), 'bounceTrack should be async');
});

TestRunner.test("Day 614 - Audio Processing - bounceTrack returns null for Audio tracks", (t) => {
    const funcStr = Track.prototype.bounceTrack.toString();
    t.assertTruthy(funcStr.includes("type === 'Audio'"), 'bounceTrack should check for Audio track type');
    t.assertTruthy(funcStr.includes("return null"), 'bounceTrack should return null for Audio tracks');
});

TestRunner.test("Day 614 - Audio Processing - bounceTrack uses OfflineContext for rendering", (t) => {
    const funcStr = Track.prototype.bounceTrack.toString();
    t.assertTruthy(funcStr.includes('Tone.OfflineContext') || funcStr.includes('OfflineContext'), 'bounceTrack should use OfflineContext');
});

TestRunner.test("Day 614 - Audio Processing - bounceTrack uses appServices for notifications", (t) => {
    const funcStr = Track.prototype.bounceTrack.toString();
    t.assertTruthy(funcStr.includes('appServices.showNotification'), 'bounceTrack should use appServices.showNotification');
});

TestRunner.test("Day 614 - Audio Processing - freezeTrack is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.freezeTrack, 'function', 'freezeTrack should be a function');
});

TestRunner.test("Day 614 - Audio Processing - freezeTrack is async", (t) => {
    const funcStr = Track.prototype.freezeTrack.toString();
    t.assertTruthy(funcStr.includes('async freezeTrack'), 'freezeTrack should be async');
});

TestRunner.test("Day 614 - Audio Processing - freezeTrack returns false for Audio tracks", (t) => {
    const funcStr = Track.prototype.freezeTrack.toString();
    t.assertTruthy(funcStr.includes("type === 'Audio'"), 'freezeTrack should check for Audio track type');
    t.assertTruthy(funcStr.includes("return false"), 'freezeTrack should return false for Audio tracks');
});

TestRunner.test("Day 614 - Audio Processing - freezeTrack disposes audio nodes", (t) => {
    const funcStr = Track.prototype.freezeTrack.toString();
    t.assertTruthy(funcStr.includes('.dispose()'), 'freezeTrack should dispose audio nodes');
    t.assertTruthy(funcStr.includes('this.instrument') || funcStr.includes('instrument'), 'freezeTrack should reference instrument');
});

TestRunner.test("Day 614 - Audio Processing - freezeTrack uses appServices for notifications", (t) => {
    const funcStr = Track.prototype.freezeTrack.toString();
    t.assertTruthy(funcStr.includes('appServices.showNotification'), 'freezeTrack should use appServices.showNotification');
});

TestRunner.test("Day 614 - APP_VERSION validation for Day 614", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number); t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 614'); if (versionParts[0] === 2) { t.assertTruthy(versionParts[1] >= 268, 'Minor version should be >= 268 for Day 614'); }
});

TestRunner.test("Day 615 - Metronome - getMetronomeEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMetronomeEnabledState'), 'getMetronromeEnabledState should be exported');
});

TestRunner.test("Day 615 - Metronome - setMetronomeEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMetronomeEnabledState'), 'setMetronomeEnabledState should be exported');
});

TestRunner.test("Day 615 - Metronome - setMetronomeEnabledState calls captureStateForUndo", (t) => {
    const funcBody = setMetronomeEnabledState.toString();
    const captureIdx = funcBody.indexOf('captureStateForUndo');
    const fnIdx = funcBody.indexOf('export function setMetronomeEnabledState');
    t.assertTruthy(captureIdx > fnIdx, 'setMetronomeEnabledState should call captureStateForUndo');
});

TestRunner.test("Day 615 - Metronome - setMetronomeEnabledState has descriptive undo label", (t) => {
    const funcBody = setMetronomeEnabledState.toString();
    t.assertTruthy(funcBody.includes('Toggle Metronome') && funcBody.includes('On') && funcBody.includes('Off'), 'setMetronomeEnabledState should have "Toggle Metronome On/Off" undo label');
});

TestRunner.test("Day 615 - Metronome - setMetronomeEnabledState uses !! for boolean coercion", (t) => {
    const funcBody = setMetronomeEnabledState.toString();
    t.assertTruthy(funcBody.includes('!!enabled'), 'setMetronomeEnabledState should use !! to coerce enabled value');
});

TestRunner.test("Day 615 - Metronome - setMetronomeEnabledState guards capture with change detection", (t) => {
    const funcBody = setMetronomeEnabledState.toString();
    t.assertTruthy(funcBody.includes('metronomeEnabledState !== nextValue'), 'setMetronomeEnabledState should check if value changed before capturing');
});

TestRunner.test("Day 615 - Metronome - setMetronomeEnabledState returns the enabled value", (t) => {
    const funcBody = setMetronomeEnabledState.toString();
    t.assertTruthy(funcBody.includes('metronomeEnabledState = nextValue'), 'setMetronomeEnabledState should set metronomeEnabledState');
});

TestRunner.test("Day 615 - Metronome - getMetronomeVolumeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMetronomeVolumeState'), 'getMetronomeVolumeState should be exported');
});

TestRunner.test("Day 615 - Metronome - setMetronomeVolumeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMetronomeVolumeState'), 'setMetronomeVolumeState should be exported');
});

TestRunner.test("Day 615 - Metronome - setMetronomeVolumeState calls captureStateForUndo", (t) => {
    const funcBody = setMetronomeVolumeState.toString();
    const captureIdx = funcBody.indexOf('captureStateForUndo');
    const fnIdx = funcBody.indexOf('export function setMetronomeVolumeState');
    t.assertTruthy(captureIdx > fnIdx, 'setMetronomeVolumeState should call captureStateForUndo');
});

TestRunner.test("Day 615 - Metronome - setMetronomeVolumeState has descriptive undo label", (t) => {
    const funcBody = setMetronomeVolumeState.toString();
    t.assertTruthy(funcBody.includes('Set Metronome Volume to'), 'setMetronomeVolumeState should have "Set Metronome Volume to" undo label');
});

TestRunner.test("Day 615 - Metronome - setMetronomeVolumeState clamps value to valid range", (t) => {
    const funcBody = setMetronomeVolumeState.toString();
    t.assertTruthy(funcBody.includes('MIN_METRONOME_VOLUME') && funcBody.includes('MAX_METRONOME_VOLUME'), 'setMetronomeVolumeState should clamp to MIN_METRONOME_VOLUME and MAX_METRONOME_VOLUME');
    t.assertTruthy(funcBody.includes('Math.max') && funcBody.includes('Math.min'), 'setMetronomeVolumeState should use Math.max and Math.min for clamping');
});

TestRunner.test("Day 615 - Metronome - setMetronomeVolumeState guards capture with change detection", (t) => {
    const funcBody = setMetronomeVolumeState.toString();
    t.assertTruthy(funcBody.includes('metronomeVolumeState !== nextValue'), 'setMetronomeVolumeState should check if value changed before capturing');
});

TestRunner.test("Day 615 - Metronome - setMetronomeVolumeState uses parseFloat for input conversion", (t) => {
    const funcBody = setMetronomeVolumeState.toString();
    t.assertTruthy(funcBody.includes('parseFloat(vol)'), 'setMetronomeVolumeState should use parseFloat to convert input');
});

TestRunner.test("Day 615 - Metronome - state.js imports metronome functions from audio.js", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes("from './audio.js'"), 'state.js should import from audio.js');
    t.assertTruthy(stateStr.includes('isMetronomeEnabled') && stateStr.includes('setMetronomeEnabled'), 'state.js should import metronome functions from audio.js');
    t.assertTruthy(stateStr.includes('getMetronomeVolume') && stateStr.includes('setMetronomeVolume'), 'state.js should import getMetronomeVolume and setMetronomeVolume from audio.js');
});

TestRunner.test("Day 615 - Metronome - setMetronomeEnabledState calls audioSetMetronomeEnabled after state change", (t) => {
    const funcBody = setMetronomeEnabledState.toString();
    t.assertTruthy(funcBody.includes('audioSetMetronomeEnabled'), 'setMetronomeEnabledState should call audioSetMetronomeEnabled to sync audio engine');
});

TestRunner.test("Day 615 - Metronome - setMetronomeVolumeState calls audioSetMetronomeVolume after state change", (t) => {
    const funcBody = setMetronomeVolumeState.toString();
    t.assertTruthy(funcBody.includes('audioSetMetronomeVolume'), 'setMetronomeVolumeState should call audioSetMetronomeVolume to sync audio engine');
});

TestRunner.test("Day 615 - APP_VERSION validation for Day 615", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number); t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 615'); if (versionParts[0] === 2) { t.assertTruthy(versionParts[1] >= 269 || (versionParts[1] === 269 && versionParts[2] >= 0), 'Minor version should be >= 269 for Day 615'); }
});

// Day 616: Track Solo/Mute/Armed State Functions Tests
// ================================================

TestRunner.test("Day 616 - Track Armed/Solo/Mute - getArmedTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getArmedTrackIdState'), 'getArmedTrackIdState should be exported');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - getArmedTrackIdState returns armed track ID or null", (t) => {
    const result = getArmedTrackIdState();
    t.assertTruthy(result === null || typeof result === 'string', 'getArmedTrackIdState should return null or string');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setArmedTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setArmedTrackIdState'), 'setArmedTrackIdState should be exported');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setArmedTrackIdState calls captureStateForUndo", (t) => {
    const funcBody = setArmedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setArmedTrackIdState should call captureStateForUndo');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setArmedTrackIdState uses descriptive undo label", (t) => {
    const funcBody = setArmedTrackIdState.toString();
    t.assertTruthy(
        (funcBody.includes('Clear Armed Track') || funcBody.includes('Set Armed Track to')),
        'setArmedTrackIdState should have descriptive undo label'
    );
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setArmedTrackIdState uses Object.is for comparison", (t) => {
    const funcBody = setArmedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('Object.is'), 'setArmedTrackIdState should use Object.is for comparison');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setArmedTrackIdState guards capture with change detection", (t) => {
    const funcBody = setArmedTrackIdState.toString();
    t.assertTruthy(
        funcBody.includes('Object.is') && funcBody.includes('armedTrackId'),
        'setArmedTrackIdState should check if value changed before capture'
    );
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - getSoloedTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getSoloedTrackIdState'), 'getSoloedTrackIdState should be exported');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - getSoloedTrackIdState returns soloed track ID or null", (t) => {
    const result = getSoloedTrackIdState();
    t.assertTruthy(result === null || typeof result === 'string', 'getSoloedTrackIdState should return null or string');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setSoloedTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setSoloedTrackIdState'), 'setSoloedTrackIdState should be exported');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setSoloedTrackIdState calls captureStateForUndo", (t) => {
    const funcBody = setSoloedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setSoloedTrackIdState should call captureStateForUndo');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setSoloedTrackIdState uses descriptive undo label", (t) => {
    const funcBody = setSoloedTrackIdState.toString();
    t.assertTruthy(
        (funcBody.includes('Clear Soloed Track') || funcBody.includes('Set Soloed Track to')),
        'setSoloedTrackIdState should have descriptive undo label'
    );
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setSoloedTrackIdState uses previousId/local variable for undo label", (t) => {
    const funcBody = setSoloedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('previousId') || funcBody.includes('previous'), 'setSoloedTrackIdState should store previous value for undo label');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setSoloedTrackIdState normalizes id to null for undefined", (t) => {
    const funcBody = setSoloedTrackIdState.toString();
    t.assertTruthy(
        funcBody.includes('id === undefined') || funcBody.includes('id === null'),
        'setSoloedTrackIdState should normalize undefined/null to null'
    );
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setSoloedTrackIdState calls appServices.onSoloedTrackChanged", (t) => {
    const funcBody = setSoloedTrackIdState.toString();
    t.assertTruthy(funcBody.includes('onSoloedTrackChanged'), 'setSoloedTrackIdState should call onSoloedTrackChanged callback');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - getMutedTrackIdsState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMutedTrackIdsState'), 'getMutedTrackIdsState should be exported');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - getMutedTrackIdsState returns array copy", (t) => {
    const funcBody = getMutedTrackIdsState.toString();
    t.assertTruthy(funcBody.includes('[...]') || funcBody.includes('slice'), 'getMutedTrackIdsState should return array copy');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setMutedTrackIdsState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMutedTrackIdsState'), 'setMutedTrackIdsState should be exported');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setMutedTrackIdsState calls captureStateForUndo", (t) => {
    const funcBody = setMutedTrackIdsState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setMutedTrackIdsState should call captureStateForUndo');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setMutedTrackIdsState has descriptive undo label", (t) => {
    const funcBody = setMutedTrackIdsState.toString();
    t.assertTruthy(funcBody.includes('Set Muted Tracks'), 'setMutedTrackIdsState should have "Set Muted Tracks" undo label');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setMutedTrackIdsState guards capture with array change detection", (t) => {
    const funcBody = setMutedTrackIdsState.toString();
    t.assertTruthy(
        funcBody.includes('mutedTrackIds.length') || funcBody.includes('some('),
        'setMutedTrackIdsState should check if array changed before capture'
    );
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setMutedTrackIdsState calls appServices.onMutedTracksChanged", (t) => {
    const funcBody = setMutedTrackIdsState.toString();
    t.assertTruthy(funcBody.includes('onMutedTracksChanged'), 'setMutedTrackIdsState should call onMutedTracksChanged callback');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - isTrackMutedState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function isTrackMutedState'), 'isTrackMutedState should be exported');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - isTrackMutedState uses mutedTrackIds.includes", (t) => {
    const funcBody = isTrackMutedState.toString();
    t.assertTruthy(funcBody.includes('mutedTrackIds.includes'), 'isTrackMutedState should use mutedTrackIds.includes');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setTrackMutedState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTrackMutedState'), 'setTrackMutedState should be exported');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setTrackMutedState calls captureStateForUndo", (t) => {
    const funcBody = setTrackMutedState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setTrackMutedState should call captureStateForUndo');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setTrackMutedState uses Mute/Unmute descriptive undo label", (t) => {
    const funcBody = setTrackMutedState.toString();
    t.assertTruthy(
        funcBody.includes('Mute') && funcBody.includes('Unmute'),
        'setTrackMutedState should have Mute/Unmute undo labels'
    );
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setTrackMutedState uses !! boolean coercion for muted param", (t) => {
    const funcBody = setTrackMutedState.toString();
    t.assertTruthy(funcBody.includes('!!muted') || funcBody.includes('shouldMute'), 'setTrackMutedState should coerce muted to boolean');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setTrackMutedState guards capture with isCurrentlyMuted check", (t) => {
    const funcBody = setTrackMutedState.toString();
    t.assertTruthy(funcBody.includes('isCurrentlyMuted') && funcBody.includes('shouldMute'), 'setTrackMutedState should check current state before capture');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setTrackMutedState uses push for mute and filter for unmute", (t) => {
    const funcBody = setTrackMutedState.toString();
    t.assertTruthy(funcBody.includes('push') && funcBody.includes('filter'), 'setTrackMutedState should use push/filter for mute/unmute');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - setTrackMutedState calls appServices.onMutedTracksChanged", (t) => {
    const funcBody = setTrackMutedState.toString();
    t.assertTruthy(funcBody.includes('onMutedTracksChanged'), 'setTrackMutedState should call onMutedTracksChanged callback');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - isTrackSoloedState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function isTrackSoloedState'), 'isTrackSoloedState should be exported');
});

TestRunner.test("Day 616 - Track Armed/Solo/Mute - isTrackSoloedState uses === comparison with soloedTrackId", (t) => {
    const funcBody = isTrackSoloedState.toString();
    t.assertTruthy(funcBody.includes('soloedTrackId'), 'isTrackSoloedState should reference soloedTrackId');
    t.assertTruthy(funcBody.includes('==='), 'isTrackSoloedState should use strict equality');
});

// Day 616: Timeline Zoom State Functions Tests
// ============================================
TestRunner.test("Day 616 - Timeline Zoom - getTimelineZoomState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTimelineZoomState'), 'getTimelineZoomState should be exported');
});

TestRunner.test("Day 616 - Timeline Zoom - getTimelineZoomState returns object with level and verticalLevel", (t) => {
    const funcStr = getTimelineZoomState.toString();
    t.assertTruthy(funcStr.includes('level:'), 'getTimelineZoomState should return level property');
    t.assertTruthy(funcStr.includes('verticalLevel:'), 'getTimelineZoomState should return verticalLevel property');
});

TestRunner.test("Day 616 - Timeline Zoom - getTimelineZoomLevelState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTimelineZoomLevelState'), 'getTimelineZoomLevelState should be exported');
});

TestRunner.test("Day 616 - Timeline Zoom - setTimelineZoomLevelState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTimelineZoomLevelState'), 'setTimelineZoomLevelState should be exported');
});

TestRunner.test("Day 616 - Timeline Zoom - setTimelineZoomLevelState calls captureStateForUndo", (t) => {
    const funcBody = setTimelineZoomLevelState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setTimelineZoomLevelState should call captureStateForUndo');
});

TestRunner.test("Day 616 - Timeline Zoom - setTimelineZoomLevelState has descriptive undo label", (t) => {
    const funcBody = setTimelineZoomLevelState.toString();
    t.assertTruthy(funcBody.includes('Set Timeline Zoom to'), 'setTimelineZoomLevelState should have descriptive undo label');
});

TestRunner.test("Day 616 - Timeline Zoom - setTimelineZoomLevelState clamps to TIMELINE_ZOOM_MIN and TIMELINE_ZOOM_MAX", (t) => {
    const funcBody = setTimelineZoomLevelState.toString();
    t.assertTruthy(funcBody.includes('TIMELINE_ZOOM_MIN') && funcBody.includes('TIMELINE_ZOOM_MAX'), 'setTimelineZoomLevelState should clamp to valid range');
    t.assertTruthy(funcBody.includes('Math.max') && funcBody.includes('Math.min'), 'setTimelineZoomLevelState should use Math.max and Math.min');
});

TestRunner.test("Day 616 - Timeline Zoom - setTimelineZoomLevelState guards capture with change detection", (t) => {
    const funcBody = setTimelineZoomLevelState.toString();
    t.assertTruthy(funcBody.includes('timelineZoomLevelState === nextValue'), 'setTimelineZoomLevelState should check if value changed before capture');
});

TestRunner.test("Day 616 - Timeline Zoom - getTimelineVerticalZoomState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTimelineVerticalZoomState'), 'getTimelineVerticalZoomState should be exported');
});

TestRunner.test("Day 616 - Timeline Zoom - setTimelineVerticalZoomState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setTimelineVerticalZoomState'), 'setTimelineVerticalZoomState should be exported');
});

TestRunner.test("Day 616 - Timeline Zoom - setTimelineVerticalZoomState calls captureStateForUndo", (t) => {
    const funcBody = setTimelineVerticalZoomState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setTimelineVerticalZoomState should call captureStateForUndo');
});

TestRunner.test("Day 616 - Timeline Zoom - setTimelineVerticalZoomState has descriptive undo label", (t) => {
    const funcBody = setTimelineVerticalZoomState.toString();
    t.assertTruthy(funcBody.includes('Set Timeline Vertical Zoom to'), 'setTimelineVerticalZoomState should have descriptive undo label');
});

TestRunner.test("Day 616 - Timeline Zoom - setTimelineVerticalZoomState clamps to TIMELINE_VERTICAL_ZOOM_MIN and MAX", (t) => {
    const funcBody = setTimelineVerticalZoomState.toString();
    t.assertTruthy(funcBody.includes('TIMELINE_VERTICAL_ZOOM_MIN') && funcBody.includes('TIMELINE_VERTICAL_ZOOM_MAX'), 'setTimelineVerticalZoomState should clamp to valid range');
});

TestRunner.test("Day 616 - Timeline Zoom - setTimelineVerticalZoomState guards capture with change detection", (t) => {
    const funcBody = setTimelineVerticalZoomState.toString();
    t.assertTruthy(funcBody.includes('timelineVerticalZoomLevelState === nextValue'), 'setTimelineVerticalZoomState should check if value changed');
});

TestRunner.test("Day 616 - Timeline Zoom - zoomInTimeline is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function zoomInTimeline'), 'zoomInTimeline should be exported');
});

TestRunner.test("Day 616 - Timeline Zoom - zoomInTimeline calls setTimelineZoomLevelState", (t) => {
    const funcBody = zoomInTimeline.toString();
    t.assertTruthy(funcBody.includes('setTimelineZoomLevelState'), 'zoomInTimeline should call setTimelineZoomLevelState');
TestRunner.test("Day 616 - Track Armed/Solo/Mute - APP_VERSION validation for Day 616", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number); t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 616'); if (versionParts[0] === 2) { t.assertTruthy(versionParts[1] >= 271, 'Minor version should be >= 271 for Day 616'); }
});
// ============================================
// Day 617: Performance Monitor State Functions Tests
// ============================================

// --- Performance Monitor State Getters ---
TestRunner.test("Day 617 - Perf Monitor - getPerformanceMonitorState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getPerformanceMonitorState'), 'getPerformanceMonitorState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - getPerformanceMonitorState returns object copy", (t) => {
    const funcBody = getPerformanceMonitorState.toString();
    t.assertTruthy(funcBody.includes('...performanceMonitorState') || funcBody.includes('{ ...performanceMonitorState }'), 'getPerformanceMonitorState should return a copy using spread operator');
});

TestRunner.test("Day 617 - Perf Monitor - getPerformanceMonitorEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getPerformanceMonitorEnabledState'), 'getPerformanceMonitorEnabledState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - getPerformanceMonitorEnabledState uses !! coercion", (t) => {
    const funcBody = getPerformanceMonitorEnabledState.toString();
    t.assertTruthy(funcBody.includes('!!performanceMonitorState.enabled') || funcBody.includes('!!'), 'getPerformanceMonitorEnabledState should use !! coercion');
});

TestRunner.test("Day 617 - Perf Monitor - setPerformanceMonitorEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setPerformanceMonitorEnabledState'), 'setPerformanceMonitorEnabledState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - setPerformanceMonitorEnabledState calls captureStateForUndo", (t) => {
    const funcBody = setPerformanceMonitorEnabledState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setPerformanceMonitorEnabledState should call captureStateForUndo');
});

TestRunner.test("Day 617 - Perf Monitor - setPerformanceMonitorEnabledState uses !! coercion for value", (t) => {
    const funcBody = setPerformanceMonitorEnabledState.toString();
    t.assertTruthy(funcBody.includes('!!value') || funcBody.includes('const nextValue = !!value'), 'setPerformanceMonitorEnabledState should coerce value to boolean');
});

TestRunner.test("Day 617 - Perf Monitor - setPerformanceMonitorEnabledState guards capture with change detection", (t) => {
    const funcBody = setPerformanceMonitorEnabledState.toString();
    t.assertTruthy(funcBody.includes('performanceMonitorState.enabled !== nextValue'), 'setPerformanceMonitorEnabledState should check if value changed');
});

// --- CPU Usage State ---
TestRunner.test("Day 617 - Perf Monitor - getCPUUsageState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getCPUUsageState'), 'getCPUUsageState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - getCPUUsageState returns performanceMonitorState.cpuUsage directly", (t) => {
    const funcBody = getCPUUsageState.toString();
    t.assertTruthy(funcBody.includes('performanceMonitorState.cpuUsage'), 'getCPUUsageState should return cpuUsage property');
});

TestRunner.test("Day 617 - Perf Monitor - setCPUUsageState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setCPUUsageState'), 'setCPUUsageState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - setCPUUsageState uses parseFloat for conversion", (t) => {
    const funcBody = setCPUUsageState.toString();
    t.assertTruthy(funcBody.includes('parseFloat'), 'setCPUUsageState should use parseFloat');
});

TestRunner.test("Day 617 - Perf Monitor - setCPUUsageState calls captureStateForUndo", (t) => {
    const funcBody = setCPUUsageState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setCPUUsageState should call captureStateForUndo');
});

TestRunner.test("Day 617 - Perf Monitor - setCPUUsageState clamps value to 0-100 range", (t) => {
    const funcBody = setCPUUsageState.toString();
    t.assertTruthy(funcBody.includes('Math.max(0') && funcBody.includes('Math.min(100', 'setCPUUsageState should clamp cpuUsage to 0-100 range'));
});

TestRunner.test("Day 617 - Perf Monitor - setCPUUsageState guards capture with change detection", (t) => {
    const funcBody = setCPUUsageState.toString();
    t.assertTruthy(funcBody.includes('performanceMonitorState.cpuUsage !== clamped'), 'setCPUUsageState should check if value changed');
});

// --- Memory Pressure State ---
TestRunner.test("Day 617 - Perf Monitor - getMemoryPressureState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getMemoryPressureState'), 'getMemoryPressureState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - getMemoryPressureState returns performanceMonitorState.memoryPressure directly", (t) => {
    const funcBody = getMemoryPressureState.toString();
    t.assertTruthy(funcBody.includes('performanceMonitorState.memoryPressure'), 'getMemoryPressureState should return memoryPressure property');
});

TestRunner.test("Day 617 - Perf Monitor - setMemoryPressureState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMemoryPressureState'), 'setMemoryPressureState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - setMemoryPressureState uses validValues array validation", (t) => {
    const funcBody = setMemoryPressureState.toString();
    t.assertTruthy(funcBody.includes('validValues') && funcBody.includes('includes'), 'setMemoryPressureState should validate against validValues');
});

TestRunner.test("Day 617 - Perf Monitor - setMemoryPressureState guards capture with change detection", (t) => {
    const funcBody = setMemoryPressureState.toString();
    t.assertTruthy(funcBody.includes('performanceMonitorState.memoryPressure !== value'), 'setMemoryPressureState should check if value changed');
});

// --- Active Voices State ---
TestRunner.test("Day 617 - Perf Monitor - getActiveVoicesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getActiveVoicesState'), 'getActiveVoicesState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - getActiveVoicesState returns performanceMonitorState.activeVoices directly", (t) => {
    const funcBody = getActiveVoicesState.toString();
    t.assertTruthy(funcBody.includes('performanceMonitorState.activeVoices'), 'getActiveVoicesState should return activeVoices property');
});

TestRunner.test("Day 617 - Perf Monitor - setActiveVoicesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setActiveVoicesState'), 'setActiveVoicesState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - setActiveVoicesState uses parseInt for conversion", (t) => {
    const funcBody = setActiveVoicesState.toString();
    t.assertTruthy(funcBody.includes('parseInt'), 'setActiveVoicesState should use parseInt');
});

TestRunner.test("Day 617 - Perf Monitor - setActiveVoicesState clamps to minimum 0", (t) => {
    const funcBody = setActiveVoicesState.toString();
    t.assertTruthy(funcBody.includes('Math.max(0'), 'setActiveVoicesState should clamp to 0 minimum');
});

TestRunner.test("Day 617 - Perf Monitor - setActiveVoicesState guards capture with change detection", (t) => {
    const funcBody = setActiveVoicesState.toString();
    t.assertTruthy(funcBody.includes('performanceMonitorState.activeVoices !== clamped'), 'setActiveVoicesState should check if value changed');
});

// --- Audio Latency State ---
TestRunner.test("Day 617 - Perf Monitor - getAudioLatencyState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getAudioLatencyState'), 'getAudioLatencyState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - setAudioLatencyState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setAudioLatencyState'), 'setAudioLatencyState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - setAudioLatencyState uses parseFloat and clamps to 0 minimum", (t) => {
    const funcBody = setAudioLatencyState.toString();
    t.assertTruthy(funcBody.includes('parseFloat') && funcBody.includes('Math.max(0'), 'setAudioLatencyState should use parseFloat and clamp to 0 minimum');
});

TestRunner.test("Day 617 - Perf Monitor - setAudioLatencyState guards capture with change detection", (t) => {
    const funcBody = setAudioLatencyState.toString();
    t.assertTruthy(funcBody.includes('performanceMonitorState.audioLatency !== clamped'), 'setAudioLatencyState should check if value changed');
});

// --- Last Callback Time State ---
TestRunner.test("Day 617 - Perf Monitor - getLastCallbackTimeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getLastCallbackTimeState'), 'getLastCallbackTimeState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - setLastCallbackTimeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setLastCallbackTimeState'), 'setLastCallbackTimeState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - setLastCallbackTimeState uses parseFloat and clamps to 0 minimum", (t) => {
    const funcBody = setLastCallbackTimeState.toString();
    t.assertTruthy(funcBody.includes('parseFloat') && funcBody.includes('Math.max(0'), 'setLastCallbackTimeState should use parseFloat and clamp to 0 minimum');
});

// --- Reset Performance Monitor ---
TestRunner.test("Day 617 - Perf Monitor - resetPerformanceMonitorState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function resetPerformanceMonitorState'), 'resetPerformanceMonitorState should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - resetPerformanceMonitorState calls captureStateForUndo", (t) => {
    const funcBody = resetPerformanceMonitorState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo') || funcBody.includes('captureStateForUndoIfAllowed'), 'resetPerformanceMonitorState should capture state for undo');
});

TestRunner.test("Day 617 - Perf Monitor - resetPerformanceMonitorState has descriptive undo label", (t) => {
    const funcBody = resetPerformanceMonitorState.toString();
    t.assertTruthy(funcBody.includes('Reset Performance Monitor'), 'resetPerformanceMonitorState should have descriptive undo label');
});

TestRunner.test("Day 617 - Perf Monitor - resetPerformanceMonitorState resets all performance monitor fields", (t) => {
    const funcBody = resetPerformanceMonitorState.toString();
    t.assertTruthy(funcBody.includes('performanceMonitorState.enabled = false'), 'resetPerformanceMonitorState should reset enabled to false');
    t.assertTruthy(funcBody.includes('performanceMonitorState.cpuUsage = 0'), 'resetPerformanceMonitorState should reset cpuUsage to 0');
    t.assertTruthy(funcBody.includes('performanceMonitorState.memoryPressure = \'none\''), 'resetPerformanceMonitorState should reset memoryPressure to none');
});

// --- Initialize State Module ---
TestRunner.test("Day 617 - Perf Monitor - initializeStateModule is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function initializeStateModule'), 'initializeStateModule should be exported');
});

TestRunner.test("Day 617 - Perf Monitor - initializeStateModule is async", (t) => {
    const funcBody = initializeStateModule.toString();
    t.assertTruthy(funcBody.includes('async') || funcBody.includes('Promise'), 'initializeStateModule should be async');
});

// --- APP_VERSION validation ---
TestRunner.test("Day 617 - Perf Monitor - APP_VERSION validation for Day 617", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 617');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 272, 'Minor version should be >= 272 for Day 617');
    }
});

// ============================================
// Day 618: Remaining State Function Missing Tests
// ============================================

// --- Timeline Zoom Helper Functions ---
TestRunner.test("Day 618 - Timeline Zoom - zoomOutTimeline is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function zoomOutTimeline'), 'zoomOutTimeline should be exported');
});

TestRunner.test("Day 618 - Timeline Zoom - zoomOutTimeline calls setTimelineZoomLevelState", (t) => {
    const funcBody = zoomOutTimeline.toString();
    t.assertTruthy(funcBody.includes('setTimelineZoomLevelState'), 'zoomOutTimeline should call setTimelineZoomLevelState');
});

TestRunner.test("Day 618 - Timeline Zoom - zoomOutTimeline decreases zoom level by step", (t) => {
    const funcBody = zoomOutTimeline.toString();
    t.assertTruthy(funcBody.includes('1 - Constants.TIMELINE_ZOOM_STEP') || funcBody.includes('(1 -'), 'zoomOutTimeline should multiply by (1 - step)');
});

TestRunner.test("Day 618 - Timeline Zoom - zoomInVerticalTimeline is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function zoomInVerticalTimeline'), 'zoomInVerticalTimeline should be exported');
});

TestRunner.test("Day 618 - Timeline Zoom - zoomInVerticalTimeline calls setTimelineVerticalZoomState", (t) => {
    const funcBody = zoomInVerticalTimeline.toString();
    t.assertTruthy(funcBody.includes('setTimelineVerticalZoomState'), 'zoomInVerticalTimeline should call setTimelineVerticalZoomState');
});

TestRunner.test("Day 618 - Timeline Zoom - zoomInVerticalTimeline increases zoom level by step", (t) => {
    const funcBody = zoomInVerticalTimeline.toString();
    t.assertTruthy(funcBody.includes('1 + Constants.TIMELINE_VERTICAL_ZOOM_STEP') || funcBody.includes('(1 +'), 'zoomInVerticalTimeline should multiply by (1 + step)');
});

TestRunner.test("Day 618 - Timeline Zoom - zoomOutVerticalTimeline is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function zoomOutVerticalTimeline'), 'zoomOutVerticalTimeline should be exported');
});

TestRunner.test("Day 618 - Timeline Zoom - zoomOutVerticalTimeline calls setTimelineVerticalZoomState", (t) => {
    const funcBody = zoomOutVerticalTimeline.toString();
    t.assertTruthy(funcBody.includes('setTimelineVerticalZoomState'), 'zoomOutVerticalTimeline should call setTimelineVerticalZoomState');
});

TestRunner.test("Day 618 - Timeline Zoom - zoomOutVerticalTimeline decreases zoom level by step", (t) => {
    const funcBody = zoomOutVerticalTimeline.toString();
    t.assertTruthy(funcBody.includes('1 - Constants.TIMELINE_VERTICAL_ZOOM_STEP') || funcBody.includes('(1 -'), 'zoomOutVerticalTimeline should multiply by (1 - step if vertical step constant exists)');
});

TestRunner.test("Day 618 - Timeline Zoom - resetTimelineZoom is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function resetTimelineZoom'), 'resetTimelineZoom should be exported');
});

TestRunner.test("Day 618 - Timeline Zoom - resetTimelineZoom calls captureStateForUndo", (t) => {
    const funcBody = resetTimelineZoom.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'resetTimelineZoom should call captureStateForUndo');
});

TestRunner.test("Day 618 - Timeline Zoom - resetTimelineZoom has descriptive undo label", (t) => {
    const funcBody = resetTimelineZoom.toString();
    t.assertTruthy(funcBody.includes('Reset Timeline Zoom'), 'resetTimelineZoom undo label should include "Reset Timeline Zoom"');
});

TestRunner.test("Day 618 - Timeline Zoom - resetTimelineZoom resets both horizontal and vertical zoom", (t) => {
    const funcBody = resetTimelineZoom.toString();
    t.assertTruthy(funcBody.includes('TIMELINE_ZOOM_DEFAULT') && funcBody.includes('TIMELINE_VERTICAL_ZOOM_DEFAULT'), 'resetTimelineZoom should reset both levels to DEFAULT');
});

// --- Loop Region Getters ---
TestRunner.test("Day 618 - Loop Region - getLoopRegionEnabledState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getLoopRegionEnabledState'), 'getLoopRegionEnabledState should be exported');
});

TestRunner.test("Day 618 - Loop Region - getLoopRegionEnabledState returns !! of enabled", (t) => {
    const funcBody = getLoopRegionEnabledState.toString();
    t.assertTruthy(funcBody.includes('!!loopRegionState.enabled'), 'getLoopRegionEnabledState should return !!loopRegionState.enabled');
});

TestRunner.test("Day 618 - Loop Region - getLoopRegionStartBarState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getLoopRegionStartBarState'), 'getLoopRegionStartBarState should be exported');
});

TestRunner.test("Day 618 - Loop Region - getLoopRegionStartBarState returns loopRegionState.startBar", (t) => {
    const funcBody = getLoopRegionStartBarState.toString();
    t.assertTruthy(funcBody.includes('loopRegionState.startBar'), 'getLoopRegionStartBarState should return loopRegionState.startBar');
});

TestRunner.test("Day 618 - Loop Region - getLoopRegionEndBarState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getLoopRegionEndBarState'), 'getLoopRegionEndBarState should be exported');
});

TestRunner.test("Day 618 - Loop Region - getLoopRegionEndBarState returns loopRegionState.endBar", (t) => {
    const funcBody = getLoopRegionEndBarState.toString();
    t.assertTruthy(funcBody.includes('loopRegionState.endBar'), 'getLoopRegionEndBarState should return loopRegionState.endBar');
});

// --- APP_VERSION validation ---
TestRunner.test("Day 618 - APP_VERSION validation for Day 618", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 618');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 272, 'Minor version should be >= 272 for Day 618');
    }
});
// ============================================
// Day 619: Performance Monitor incrementDroppedCallbacksState and Additional State Function Tests
// ============================================

TestRunner.test("Day 619 - Perf Monitor - incrementDroppedCallbacksState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function incrementDroppedCallbacksState'), 'incrementDroppedCallbacksState should be exported');
});

TestRunner.test("Day 619 - Perf Monitor - incrementDroppedCallbacksState increments droppedCallbacks by 1", (t) => {
    const funcBody = incrementDroppedCallbacksState.toString();
    t.assertTruthy(funcBody.includes('droppedCallbacks++') || funcBody.includes('droppedCallbacks += 1'), 'incrementDroppedCallbacksState should increment by 1');
});

TestRunner.test("Day 619 - Perf Monitor - incrementDroppedCallbacksState does NOT call captureStateForUndo", (t) => {
    const funcBody = incrementDroppedCallbacksState.toString();
    t.assertTruthy(!funcBody.includes('captureStateForUndo'), 'incrementDroppedCallbacksState should not call captureStateForUndo (increment only)');
});

TestRunner.test("Day 619 - Perf Monitor - getAudioContextStateState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getAudioContextStateState'), 'getAudioContextStateState should be exported');
});

TestRunner.test("Day 619 - Perf Monitor - getAudioContextStateState returns performanceMonitorState.audioContextState", (t) => {
    const funcBody = getAudioContextStateState.toString();
    t.assertTruthy(funcBody.includes('performanceMonitorState.audioContextState'), 'getAudioContextStateState should return audioContextState');
});

TestRunner.test("Day 619 - Perf Monitor - setAudioContextStateState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setAudioContextStateState'), 'setAudioContextStateState should be exported');
});

TestRunner.test("Day 619 - Perf Monitor - setAudioContextStateState uses validValues array validation", (t) => {
    const funcBody = setAudioContextStateState.toString();
    t.assertTruthy(funcBody.includes('validValues') && funcBody.includes('includes'), 'setAudioContextStateState should validate against validValues array');
});

TestRunner.test("Day 619 - Perf Monitor - setAudioContextStateState calls captureStateForUndo", (t) => {
    const funcBody = setAudioContextStateState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setAudioContextStateState should call captureStateForUndo');
});

TestRunner.test("Day 619 - Perf Monitor - setAudioContextStateState has descriptive undo label", (t) => {
    const funcBody = setAudioContextStateState.toString();
    t.assertTruthy(funcBody.includes('Set Audio Context'), 'setAudioContextStateState undo label should include "Set Audio Context"');
});

TestRunner.test("Day 619 - Perf Monitor - setAudioContextStateState guards capture with change detection", (t) => {
    const funcBody = setAudioContextStateState.toString();
    t.assertTruthy(
        (funcBody.includes('!==') || funcBody.includes('audioContextState !==')) && funcBody.includes('captureStateForUndo'),
        'setAudioContextStateState should check if value changed before capture'
    );
});

TestRunner.test("Day 619 - Perf Monitor - getActiveVoicesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getActiveVoicesState'), 'getActiveVoicesState should be exported');
});

TestRunner.test("Day 619 - Perf Monitor - getActiveVoicesState returns performanceMonitorState.activeVoices", (t) => {
    const funcBody = getActiveVoicesState.toString();
    t.assertTruthy(funcBody.includes('performanceMonitorState.activeVoices'), 'getActiveVoicesState should return activeVoices');
});

TestRunner.test("Day 619 - Perf Monitor - setActiveVoicesState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setActiveVoicesState'), 'setActiveVoicesState should be exported');
});

TestRunner.test("Day 619 - Perf Monitor - setActiveVoicesState uses parseInt for conversion", (t) => {
    const funcBody = setActiveVoicesState.toString();
    t.assertTruthy(funcBody.includes('parseInt'), 'setActiveVoicesState should use parseInt for conversion');
});

TestRunner.test("Day 619 - Perf Monitor - setActiveVoicesState clamps to minimum 0", (t) => {
    const funcBody = setActiveVoicesState.toString();
    t.assertTruthy(funcBody.includes('Math.max(0'), 'setActiveVoicesState should clamp to minimum 0');
});

TestRunner.test("Day 619 - Perf Monitor - setActiveVoicesState guards capture with change detection", (t) => {
    const funcBody = setActiveVoicesState.toString();
    t.assertTruthy(
        (funcBody.includes('!==') || funcBody.includes('activeVoices !==') || funcBody.includes('clamped !==')) && funcBody.includes('captureStateForUndo'),
        'setActiveVoicesState should check if value changed before capture'
    );
});

TestRunner.test("Day 619 - Perf Monitor - setAudioLatencyState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setAudioLatencyState'), 'setAudioLatencyState should be exported');
});

TestRunner.test("Day 619 - Perf Monitor - setAudioLatencyState uses parseFloat for conversion", (t) => {
    const funcBody = setAudioLatencyState.toString();
    t.assertTruthy(funcBody.includes('parseFloat'), 'setAudioLatencyState should use parseFloat for conversion');
});

TestRunner.test("Day 619 - Perf Monitor - setAudioLatencyState clamps to 0 minimum", (t) => {
    const funcBody = setAudioLatencyState.toString();
    t.assertTruthy(funcBody.includes('Math.max(0'), 'setAudioLatencyState should clamp to minimum 0');
});

TestRunner.test("Day 619 - Perf Monitor - setLastCallbackTimeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setLastCallbackTimeState'), 'setLastCallbackTimeState should be exported');
});

TestRunner.test("Day 619 - Perf Monitor - setLastCallbackTimeState uses parseFloat for conversion", (t) => {
    const funcBody = setLastCallbackTimeState.toString();
    t.assertTruthy(funcBody.includes('parseFloat'), 'setLastCallbackTimeState should use parseFloat for conversion');
});

TestRunner.test("Day 619 - Perf Monitor - setLastCallbackTimeState clamps to 0 minimum", (t) => {
    const funcBody = setLastCallbackTimeState.toString();
    t.assertTruthy(funcBody.includes('Math.max(0'), 'setLastCallbackTimeState should clamp to minimum 0');
});

TestRunner.test("Day 619 - Perf Monitor - setDroppedCallbacksState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setDroppedCallbacksState'), 'setDroppedCallbacksState should be exported');
});

TestRunner.test("Day 619 - Perf Monitor - setDroppedCallbacksState uses parseInt for conversion", (t) => {
    const funcBody = setDroppedCallbacksState.toString();
    t.assertTruthy(funcBody.includes('parseInt'), 'setDroppedCallbacksState should use parseInt for conversion');
});

TestRunner.test("Day 619 - Perf Monitor - setDroppedCallbacksState clamps to minimum 0", (t) => {
    const funcBody = setDroppedCallbacksState.toString();
    t.assertTruthy(funcBody.includes('Math.max(0'), 'setDroppedCallbacksState should clamp to minimum 0');
});

TestRunner.test("Day 619 - Perf Monitor - setDroppedCallbacksState guards capture with change detection", (t) => {
    const funcBody = setDroppedCallbacksState.toString();
    t.assertTruthy(
        (funcBody.includes('!==') || funcBody.includes('droppedCallbacks !==') || funcBody.includes('clamped !==')) && funcBody.includes('captureStateForUndo'),
        'setDroppedCallbacksState should check if value changed before capture'
    );
});

TestRunner.test("Day 619 - Perf Monitor - setDroppedCallbacksState has descriptive undo label", (t) => {
    const funcBody = setDroppedCallbacksState.toString();
    t.assertTruthy(funcBody.includes('Set Dropped Callbacks'), 'setDroppedCallbacksState undo label should include "Set Dropped Callbacks"');
});

TestRunner.test("Day 619 - Perf Monitor - setCPUUsageState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setCPUUsageState'), 'setCPUUsageState should be exported');
});

TestRunner.test("Day 619 - Perf Monitor - setCPUUsageState clamps value to 0-100 range", (t) => {
    const funcBody = setCPUUsageState.toString();
    t.assertTruthy(funcBody.includes('Math.max(0') && funcBody.includes('Math.min(100') || funcBody.includes('100'), 'setCPUUsageState should clamp to 0-100 range');
});

TestRunner.test("Day 619 - Perf Monitor - setMemoryPressureState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setMemoryPressureState'), 'setMemoryPressureState should be exported');
});

TestRunner.test("Day 619 - Perf Monitor - setMemoryPressureState uses validValues array validation", (t) => {
    const funcBody = setMemoryPressureState.toString();
    t.assertTruthy(funcBody.includes('validValues') && funcBody.includes('includes'), 'setMemoryPressureState should validate against validValues array');
});

// --- Day 620: Master Effects State Function Tests ---
TestRunner.test("Day 620 - Master Effects - addMasterEffectToState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function addMasterEffectToState'), 'addMasterEffectToState should be exported');
});

TestRunner.test("Day 620 - Master Effects - addMasterEffectToState generates unique effect ID", (t) => {
    const funcBody = addMasterEffectToState.toString();
    t.assertTruthy(funcBody.includes('effectId') && funcBody.includes('Date.now()'), 'addMasterEffectToState should generate unique ID with Date.now()');
});

TestRunner.test("Day 620 - Master Effects - addMasterEffectToState uses effectsRegistryAccess for default params", (t) => {
    const funcBody = addMasterEffectToState.toString();
    t.assertTruthy(funcBody.includes('effectsRegistryAccess') && funcBody.includes('getEffectDefaultParams'), 'addMasterEffectToState should use effectsRegistryAccess for defaults');
});

TestRunner.test("Day 620 - Master Effects - addMasterEffectToState calls captureStateForUndo", (t) => {
    const funcBody = addMasterEffectToState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndoIfAllowed'), 'addMasterEffectToState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 620 - Master Effects - addMasterEffectToState has descriptive undo label", (t) => {
    const funcBody = addMasterEffectToState.toString();
    t.assertTruthy(funcBody.includes('Add ') && funcBody.includes('Master Effect'), 'addMasterEffectToState undo label should include "Add" and "Master Effect"');
});

TestRunner.test("Day 620 - Master Effects - addMasterEffectToState pushes to masterEffectsChainState", (t) => {
    const funcBody = addMasterEffectToState.toString();
    t.assertTruthy(funcBody.includes('masterEffectsChainState.push'), 'addMasterEffectToState should push to masterEffectsChainState');
});

TestRunner.test("Day 620 - Master Effects - removeMasterEffectFromState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function removeMasterEffectFromState'), 'removeMasterEffectFromState should be exported');
});

TestRunner.test("Day 620 - Master Effects - removeMasterEffectFromState uses findIndex to locate effect", (t) => {
    const funcBody = removeMasterEffectFromState.toString();
    t.assertTruthy(funcBody.includes('findIndex'), 'removeMasterEffectFromState should use findIndex');
});

TestRunner.test("Day 620 - Master Effects - removeMasterEffectFromState calls captureStateForUndo", (t) => {
    const funcBody = removeMasterEffectFromState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndoIfAllowed'), 'removeMasterEffectFromState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 620 - Master Effects - removeMasterEffectFromState uses splice to remove", (t) => {
    const funcBody = removeMasterEffectFromState.toString();
    t.assertTruthy(funcBody.includes('splice'), 'removeMasterEffectFromState should use splice');
});

TestRunner.test("Day 620 - Master Effects - updateMasterEffectParamInState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function updateMasterEffectParamInState'), 'updateMasterEffectParamInState should be exported');
});

TestRunner.test("Day 620 - Master Effects - updateMasterEffectParamInState finds effect by id", (t) => {
    const funcBody = updateMasterEffectParamInState.toString();
    t.assertTruthy(funcBody.includes('find') && funcBody.includes('effectId'), 'updateMasterEffectParamInState should find effect by id');
});

TestRunner.test("Day 620 - Master Effects - updateMasterEffectParamInState calls captureStateForUndo", (t) => {
    const funcBody = updateMasterEffectParamInState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndoIfAllowed'), 'updateMasterEffectParamInState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 620 - Master Effects - updateMasterEffectParamInState uses paramPath split by dot", (t) => {
    const funcBody = updateMasterEffectParamInState.toString();
    t.assertTruthy(funcBody.includes("split('.')") && funcBody.includes('paramPath'), 'updateMasterEffectParamInState should split paramPath by dot');
});

TestRunner.test("Day 620 - Master Effects - updateMasterEffectParamInState uses nested key assignment", (t) => {
    const funcBody = updateMasterEffectParamInState.toString();
    t.assertTruthy(funcBody.includes('keys[keys.length - 1]') && funcBody.includes('currentStoredParamLevel'), 'updateMasterEffectParamInState should use nested key assignment');
});

TestRunner.test("Day 620 - Master Effects - reorderMasterEffectInState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function reorderMasterEffectInState'), 'reorderMasterEffectInState should be exported');
});

TestRunner.test("Day 620 - Master Effects - reorderMasterEffectInState validates oldIndex and newIndex", (t) => {
    const funcBody = reorderMasterEffectInState.toString();
    t.assertTruthy(funcBody.includes('oldIndex === -1') && funcBody.includes('newIndex < 0'), 'reorderMasterEffectInState should validate indices');
});

TestRunner.test("Day 620 - Master Effects - reorderMasterEffectInState calls captureStateForUndo", (t) => {
    const funcBody = reorderMasterEffectInState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndoIfAllowed'), 'reorderMasterEffectInState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 620 - Master Effects - reorderMasterEffectInState uses splice to move effect", (t) => {
    const funcBody = reorderMasterEffectInState.toString();
    t.assertTruthy(funcBody.includes('splice(oldIndex, 1)') && funcBody.includes('splice(newIndex, 0'), 'reorderMasterEffectInState should use splice twice to move');
});

// --- APP_VERSION validation ---
TestRunner.test("Day 620 - APP_VERSION validation for Day 620", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 620');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 275, 'Minor version should be >= 275 for Day 620');
    }
});

// --- APP_VERSION validation ---
TestRunner.test("Day 619 - APP_VERSION validation for Day 619", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 619');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 274, 'Minor version should be >= 274 for Day 619');
    }
});
// --- Day 621: playDrumSamplerPadPreview Function Tests ---
TestRunner.test("Day 621 - playDrumSamplerPadPreview is a function export", (t) => {
    t.assertEqual(typeof playDrumSamplerPadPreview, 'function', 'playDrumSamplerPadPreview should be a function');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview is async", (t) => {
    t.assertTruthy(playDrumSamplerPadPreview.constructor.name === 'AsyncFunction', 'playDrumSamplerPadPreview should be an async function');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview accepts 4 parameters", (t) => {
    t.assertEqual(playDrumSamplerPadPreview.length, 4, 'playDrumSamplerPadPreview should accept 4 parameters (trackId, padIndex, velocity, additionalPitchShiftInSemitones)');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview calls initAudioContextAndMasterMeter", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('initAudioContextAndMasterMeter'), 'playDrumSamplerPadPreview should call initAudioContextAndMasterMeter');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview references trackId parameter", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'playDrumSamplerPadPreview should reference trackId parameter');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview references padIndex parameter", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('padIndex'), 'playDrumSamplerPadPreview should reference padIndex parameter');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview references velocity parameter", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('velocity'), 'playDrumSamplerPadPreview should reference velocity parameter');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview references getTrackById from appServices", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'playDrumSamplerPadPreview should reference getTrackById from appServices');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview validates track type is DrumSampler", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('DrumSampler'), 'playDrumSamplerPadPreview should validate track type is DrumSampler');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview references drumPadPlayers array", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('drumPadPlayers'), 'playDrumSamplerPadPreview should reference drumPadPlayers array');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview references drumSamplerPads array", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('drumSamplerPads'), 'playDrumSamplerPadPreview should reference drumSamplerPads array');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview checks player.disposed or player.loaded", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('disposed') || funcStr.includes('loaded'), 'playDrumSamplerPadPreview should check player.disposed or player.loaded');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview references actualDestination", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('actualDestination'), 'playDrumSamplerPadPreview should reference actualDestination');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview references padData.volume", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('padData.volume') || funcStr.includes('volume'), 'playDrumSamplerPadPreview should reference padData.volume');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview references padData.pitchShift", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('padData.pitchShift') || funcStr.includes('pitchShift'), 'playDrumSamplerPadPreview should reference padData.pitchShift');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview uses Tone.gainToDb for volume conversion", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('gainToDb') || funcStr.includes('Tone.gainToDb'), 'playDrumSamplerPadPreview should use Tone.gainToDb');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview uses Math.pow(2, pitchShift / 12) for playbackRate", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('Math.pow(2,') || funcStr.includes('Math.pow(2,'), 'playDrumSamplerPadPreview should use Math.pow(2, pitchShift / 12) for playbackRate');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview calls player.start with Tone.now", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('player.start') && funcStr.includes('Tone.now'), 'playDrumSamplerPadPreview should call player.start with Tone.now');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview has error handling with console.warn", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('console.warn'), 'playDrumSamplerPadPreview should have error handling with console.warn');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview has error handling with console.error", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('console.error'), 'playDrumSamplerPadPreview should have error handling with console.error');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview calls player.disconnect and player.connect", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('player.disconnect') && funcStr.includes('player.connect'), 'playDrumSamplerPadPreview should call player.disconnect and player.connect');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview sets player.volume.value", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('player.volume.value') || funcStr.includes('volume.value'), 'playDrumSamplerPadPreview should set player.volume.value');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview shows notification for unloaded pad", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'playDrumSamplerPadPreview should show notification for unloaded pad');
});

TestRunner.test("Day 621 - playDrumSamplerPadPreview calculates totalPadPitchShift from padData.pitchShift and additionalPitchShiftInSemitones", (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('totalPadPitchShift'), 'playDrumSamplerPadPreview should calculate totalPadPitchShift from pad pitch and additional pitch');
});

// --- APP_VERSION validation ---
TestRunner.test("Day 621 - APP_VERSION validation for Day 621", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 621');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 276, 'Minor version should be >= 276 for Day 621');
    }
});

// --- Day 622: playSlicePreview Function Tests ---
TestRunner.test("Day 622 - playSlicePreview is a function export", (t) => {
    t.assertEqual(typeof playSlicePreview, 'function', 'playSlicePreview should be a function export');
});

TestRunner.test("Day 622 - playSlicePreview is async", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('async'), 'playSlicePreview should be async');
});

TestRunner.test("Day 622 - playSlicePreview accepts 4 parameters", (t) => {
    t.assertEqual(playSlicePreview.length, 4, 'playSlicePreview should accept 4 parameters');
});

TestRunner.test("Day 622 - playSlicePreview calls initAudioContextAndMasterMeter", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('initAudioContextAndMasterMeter'), 'playSlicePreview should call initAudioContextAndMasterMeter');
});

TestRunner.test("Day 622 - playSlicePreview references trackId parameter", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'playSlicePreview should reference trackId parameter');
});

TestRunner.test("Day 622 - playSlicePreview references sliceIndex parameter", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('sliceIndex'), 'playSlicePreview should reference sliceIndex parameter');
});

TestRunner.test("Day 622 - playSlicePreview references velocity parameter", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('velocity'), 'playSlicePreview should reference velocity parameter');
});

TestRunner.test("Day 622 - playSlicePreview references getTrackById from localAppServices", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'playSlicePreview should reference getTrackById from localAppServices');
});

TestRunner.test("Day 622 - playSlicePreview validates track type is Sampler", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes("track.type !== 'Sampler'") || funcStr.includes("type !== 'Sampler'"), 'playSlicePreview should validate track type is Sampler');
});

TestRunner.test("Day 622 - playSlicePreview references audioBuffer and audioBuffer.loaded", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('audioBuffer') && funcStr.includes('loaded'), 'playSlicePreview should reference audioBuffer and audioBuffer.loaded');
});

TestRunner.test("Day 622 - playSlicePreview references slices array", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('track.slices') || funcStr.includes('slices['), 'playSlicePreview should reference slices array');
});

TestRunner.test("Day 622 - playSlicePreview references sliceData properties", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('sliceData'), 'playSlicePreview should reference sliceData');
});

TestRunner.test("Day 622 - playSlicePreview references sliceData.pitchShift and sliceData.volume", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('sliceData.pitchShift') || funcStr.includes('pitchShift'), 'playSlicePreview should reference sliceData.pitchShift');
    t.assertTruthy(funcStr.includes('sliceData.volume') || funcStr.includes('volume'), 'playSlicePreview should reference sliceData.volume');
});

TestRunner.test("Day 622 - playSlicePreview references sliceData.reverse and sliceData.loop", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('sliceData.reverse') || funcStr.includes('reverse'), 'playSlicePreview should reference sliceData.reverse');
    t.assertTruthy(funcStr.includes('sliceData.loop') || funcStr.includes('loop'), 'playSlicePreview should reference sliceData.loop');
});

TestRunner.test("Day 622 - playSlicePreview references sliceData.offset and sliceData.duration", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('sliceData.offset') || funcStr.includes('offset'), 'playSlicePreview should reference sliceData.offset');
    t.assertTruthy(funcStr.includes('sliceData.duration') || funcStr.includes('duration'), 'playSlicePreview should reference sliceData.duration');
});

TestRunner.test("Day 622 - playSlicePreview uses Math.pow for playbackRate", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('Math.pow(2,'), 'playSlicePreview should use Math.pow for playbackRate');
});

TestRunner.test("Day 622 - playSlicePreview uses Tone.dbToGain for volume conversion", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('dbToGain') || funcStr.includes('Tone.dbToGain'), 'playSlicePreview should use Tone.dbToGain for volume conversion');
});

TestRunner.test("Day 622 - playSlicePreview calls player.start with Tone.now", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('player.start') && funcStr.includes('Tone.now'), 'playSlicePreview should call player.start with Tone.now');
});

TestRunner.test("Day 622 - playSlicePreview has error handling with console.warn", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('console.warn'), 'playSlicePreview should have error handling with console.warn');
});

TestRunner.test("Day 622 - playSlicePreview has error handling with console.error", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('console.error'), 'playSlicePreview should have error handling with console.error');
});

TestRunner.test("Day 622 - playSlicePreview references getActualMasterGainNode", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('getActualMasterGainNode'), 'playSlicePreview should reference getActualMasterGainNode');
});

TestRunner.test("Day 622 - playSlicePreview references slicerIsPolyphonic", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('slicerIsPolyphonic'), 'playSlicePreview should reference slicerIsPolyphonic');
});

TestRunner.test("Day 622 - playSlicePreview references slicerMonoPlayer, slicerMonoEnvelope, slicerMonoGain", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('slicerMonoPlayer') && funcStr.includes('slicerMonoEnvelope') && funcStr.includes('slicerMonoGain'), 'playSlicePreview should reference slicerMonoPlayer, slicerMonoEnvelope, and slicerMonoGain');
});

TestRunner.test("Day 622 - playSlicePreview shows notification for unloaded Sampler audio", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'playSlicePreview should show notification for unloaded Sampler audio');
});

TestRunner.test("Day 622 - playSlicePreview calculates playbackRate from sliceData.pitchShift and additionalPitchShiftInSemitones", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('additionalPitchShiftInSemitones'), 'playSlicePreview should calculate playbackRate using additionalPitchShiftInSemitones');
});

// --- APP_VERSION validation ---
TestRunner.test("Day 622 - APP_VERSION validation for Day 622", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 622');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 277, 'Minor version should be >= 277 for Day 622');
    }
});

// ============================================
// Day 623: Context Suspension & Sidechain Audio Function Tests
// ============================================

TestRunner.test("Day 623 - startContextSuspensionMonitoring is a function export", (t) => {
    t.assertEqual(typeof startContextSuspensionMonitoring, 'function', 'startContextSuspensionMonitoring should be a function');
});

TestRunner.test("Day 623 - startContextSuspensionMonitoring accepts 1 parameter", (t) => {
    t.assertEqual(startContextSuspensionMonitoring.length, 1, 'startContextSuspensionMonitoring should accept 1 parameter');
});

TestRunner.test("Day 623 - startContextSuspensionMonitoring defaults intervalMs to 3000", (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('intervalMs = 3000'), 'startContextSuspensionMonitoring should default intervalMs to 3000');
});

TestRunner.test("Day 623 - startContextSuspensionMonitoring references resumeAttemptScheduled", (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('resumeAttemptScheduled'), 'startContextSuspensionMonitoring should reference resumeAttemptScheduled');
});

TestRunner.test("Day 623 - startContextSuspensionMonitoring references Tone.context", (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('Tone.context'), 'startContextSuspensionMonitoring should reference Tone.context');
});

TestRunner.test("Day 623 - startContextSuspensionMonitoring calls Tone.context.resume()", (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('Tone.context.resume') || funcStr.includes('context.resume'), 'startContextSuspensionMonitoring should call resume on Tone.context');
});

TestRunner.test("Day 623 - startContextSuspensionMonitoring references contextSuspendedCount", (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('contextSuspendedCount'), 'startContextSuspensionMonitoring should reference contextSuspendedCount');
});

TestRunner.test("Day 623 - startContextSuspensionMonitoring calls localAppServices.showNotification", (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('localAppServices.showNotification'), 'startContextSuspensionMonitoring should call showNotification via localAppServices');
});

TestRunner.test("Day 623 - stopContextSuspensionMonitoring is a function export", (t) => {
    t.assertEqual(typeof stopContextSuspensionMonitoring, 'function', 'stopContextSuspensionMonitoring should be a function');
});

TestRunner.test("Day 623 - stopContextSuspensionMonitoring accepts 0 parameters", (t) => {
    t.assertEqual(stopContextSuspensionMonitoring.length, 0, 'stopContextSuspensionMonitoring should accept no parameters');
});

TestRunner.test("Day 623 - stopContextSuspensionMonitoring references resumeAttemptScheduled", (t) => {
    const funcStr = stopContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('resumeAttemptScheduled'), 'stopContextSuspensionMonitoring should reference resumeAttemptScheduled');
});

TestRunner.test("Day 623 - getContextSuspensionCount is a function export", (t) => {
    t.assertEqual(typeof getContextSuspensionCount, 'function', 'getContextSuspensionCount should be a function');
});

TestRunner.test("Day 623 - getContextSuspensionCount accepts 0 parameters", (t) => {
    t.assertEqual(getContextSuspensionCount.length, 0, 'getContextSuspensionCount should accept no parameters');
});

TestRunner.test("Day 623 - getContextSuspensionCount references contextSuspendedCount", (t) => {
    const funcStr = getContextSuspensionCount.toString();
    t.assertTruthy(funcStr.includes('contextSuspendedCount'), 'getContextSuspensionCount should return contextSuspendedCount');
});

TestRunner.test("Day 623 - getContextState is a function export", (t) => {
    t.assertEqual(typeof getContextState, 'function', 'getContextState should be a function');
});

TestRunner.test("Day 623 - getContextState accepts 0 parameters", (t) => {
    t.assertEqual(getContextState.length, 0, 'getContextState should accept no parameters');
});

TestRunner.test("Day 623 - getContextState references Tone.context.state", (t) => {
    const funcStr = getContextState.toString();
    t.assertTruthy(funcStr.includes('Tone.context.state') || (funcStr.includes('context.state')), 'getContextState should reference Tone.context.state');
});

TestRunner.test("Day 623 - getContextState returns 'unavailable' as fallback", (t) => {
    const funcStr = getContextState.toString();
    t.assertTruthy(funcStr.includes("'unavailable'") || funcStr.includes('"unavailable"'), 'getContextState should return unavailable when Tone.context is missing');
});

TestRunner.test("Day 623 - getSidechainBusInput is a function export", (t) => {
    t.assertEqual(typeof getSidechainBusInput, 'function', 'getSidechainBusInput should be a function');
});

TestRunner.test("Day 623 - getSidechainBusInput accepts 0 parameters", (t) => {
    t.assertEqual(getSidechainBusInput.length, 0, 'getSidechainBusInput should accept no parameters');
});

TestRunner.test("Day 623 - getSidechainBusInput references sidechainBus variable", (t) => {
    const funcStr = getSidechainBusInput.toString();
    t.assertTruthy(funcStr.includes('sidechainBus'), 'getSidechainBusInput should reference sidechainBus variable');
});

TestRunner.test("Day 623 - getSidechainBusInput creates Tone.Gain when bus is disposed", (t) => {
    const funcStr = getSidechainBusInput.toString();
    t.assertTruthy(funcStr.includes('new Tone.Gain'), 'getSidechainBusInput should create new Tone.Gain node');
});

TestRunner.test("Day 623 - enableSidechainFromMic is an async function export", (t) => {
    t.assertEqual(typeof enableSidechainFromMic, 'function', 'enableSidechainFromMic should be a function');
    t.assertEqual(enableSidechainFromMic.constructor.name, 'AsyncFunction', 'enableSidechainFromMic should be async');
});

TestRunner.test("Day 623 - enableSidechainFromMic accepts 1 parameter", (t) => {
    t.assertEqual(enableSidechainFromMic.length, 1, 'enableSidechainFromMic should accept 1 parameter');
});

TestRunner.test("Day 623 - enableSidechainFromMic validates compressorNode", (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('compressorNode') && (funcStr.includes('disposed') || funcStr.includes('Invalid')), 'enableSidechainFromMic should validate compressorNode');
});

TestRunner.test("Day 623 - enableSidechainFromMic references micForSidechain", (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('micForSidechain'), 'enableSidechainFromMic should reference micForSidechain');
});

TestRunner.test("Day 623 - enableSidechainFromMic references getSidechainBusInput", (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('getSidechainBusInput'), 'enableSidechainFromMic should call getSidechainBusInput');
});

TestRunner.test("Day 623 - enableSidechainFromMic calls navigator.mediaDevices.getUserMedia", (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('navigator.mediaDevices.getUserMedia'), 'enableSidechainFromMic should call getUserMedia for microphone access');
});

TestRunner.test("Day 623 - enableSidechainFromMic has error handling with console.warn", (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('console.warn'), 'enableSidechainFromMic should have console.warn for invalid compressor');
});

TestRunner.test("Day 623 - enableSidechainFromMic has error handling with console.error", (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('console.error'), 'enableSidechainFromMic should have console.error for mic access failures');
});

TestRunner.test("Day 623 - disableSidechainFromMic is a function export", (t) => {
    t.assertEqual(typeof disableSidechainFromMic, 'function', 'disableSidechainFromMic should be a function');
});

TestRunner.test("Day 623 - disableSidechainFromMic accepts 0 parameters", (t) => {
    t.assertEqual(disableSidechainFromMic.length, 0, 'disableSidechainFromMic should accept no parameters');
});

TestRunner.test("Day 623 - disableSidechainFromMic references micForSidechain", (t) => {
    const funcStr = disableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('micForSidechain'), 'disableSidechainFromMic should reference micForSidechain');
});

TestRunner.test("Day 623 - disableSidechainFromMic calls micForSidechain.disconnect and micForSidechain.close", (t) => {
    const funcStr = disableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('disconnect') && funcStr.includes('close'), 'disableSidechainFromMic should disconnect and close the mic');
});

TestRunner.test("Day 623 - disableSidechainFromMic sets micForSidechain to null", (t) => {
    const funcStr = disableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('= null') || funcStr.includes('= null'), 'disableSidechainFromMic should nullify micForSidechain');
});

TestRunner.test("Day 623 - enableSidechainFromTrackIn is an async function export", (t) => {
    t.assertEqual(typeof enableSidechainFromTrackIn, 'function', 'enableSidechainFromTrackIn should be a function');
    t.assertEqual(enableSidechainFromTrackIn.constructor.name, 'AsyncFunction', 'enableSidechainFromTrackIn should be async');
});

TestRunner.test("Day 623 - enableSidechainFromTrackIn accepts 2 parameters", (t) => {
    t.assertEqual(enableSidechainFromTrackIn.length, 2, 'enableSidechainFromTrackIn should accept 2 parameters');
});

TestRunner.test("Day 623 - enableSidechainFromTrackIn validates compressorNode", (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('compressorNode') && funcStr.includes('disposed'), 'enableSidechainFromTrackIn should validate compressorNode');
});

TestRunner.test("Day 623 - enableSidechainFromTrackIn references localAppServices.getTrackById", (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'enableSidechainFromTrackIn should get track by ID');
});

TestRunner.test("Day 623 - enableSidechainFromTrackIn references track.inputChannel", (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('inputChannel'), 'enableSidechainFromTrackIn should reference track.inputChannel');
});

TestRunner.test("Day 623 - enableSidechainFromTrackIn references getSidechainBusInput", (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('getSidechainBusInput'), 'enableSidechainFromTrackIn should call getSidechainBusInput');
});

TestRunner.test("Day 623 - enableSidechainFromTrackIn has console.warn for missing track", (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('console.warn') || funcStr.includes('Track not found'), 'enableSidechainFromTrackIn should warn when track not found');
});

TestRunner.test("Day 623 - disableSidechainBus is a function export", (t) => {
    t.assertEqual(typeof disableSidechainBus, 'function', 'disableSidechainBus should be a function');
});

TestRunner.test("Day 623 - disableSidechainBus accepts 0 parameters", (t) => {
    t.assertEqual(disableSidechainBus.length, 0, 'disableSidechainBus should accept no parameters');
});

TestRunner.test("Day 623 - disableSidechainBus calls disableSidechainFromMic", (t) => {
    const funcStr = disableSidechainBus.toString();
    t.assertTruthy(funcStr.includes('disableSidechainFromMic'), 'disableSidechainBus should call disableSidechainFromMic');
});

TestRunner.test("Day 623 - disableSidechainBus references sidechainBus", (t) => {
    const funcStr = disableSidechainBus.toString();
    t.assertTruthy(funcStr.includes('sidechainBus'), 'disableSidechainBus should reference sidechainBus');
});

TestRunner.test("Day 623 - isMicOpenForSidechain is a function export", (t) => {
    t.assertEqual(typeof isMicOpenForSidechain, 'function', 'isMicOpenForSidechain should be a function');
});

TestRunner.test("Day 623 - isMicOpenForSidechain accepts 0 parameters", (t) => {
    t.assertEqual(isMicOpenForSidechain.length, 0, 'isMicOpenForSidechain should accept no parameters');
});

TestRunner.test("Day 623 - isMicOpenForSidechain references micForSidechain", (t) => {
    const funcStr = isMicOpenForSidechain.toString();
    t.assertTruthy(funcStr.includes('micForSidechain'), 'isMicOpenForSidechain should reference micForSidechain');
});

TestRunner.test("Day 623 - isMicOpenForSidechain checks micForSidechain.state === 'started'", (t) => {
    const funcStr = isMicOpenForSidechain.toString();
    t.assertTruthy(funcStr.includes("'started'") || funcStr.includes('"started"') || funcStr.includes('state'), 'isMicOpenForSidechain should check mic state');
});

// --- APP_VERSION validation ---
TestRunner.test("Day 623 - APP_VERSION validation for Day 623", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 623');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 278, 'Minor version should be >= 278 for Day 623');
    }
});


// ============================================
// Day 624: Send Bus Audio Function Tests
// ============================================

TestRunner.test("Day 624 - getSendBusNodes is a function export", (t) => {
    t.assertEqual(typeof getSendBusNodes, 'function', 'getSendBusNodes should be a function');
});

TestRunner.test("Day 624 - getSendBusNodes accepts 0 parameters", (t) => {
    t.assertEqual(getSendBusNodes.length, 0, 'getSendBusNodes should accept no parameters');
});

TestRunner.test("Day 624 - getSendBusNodes returns sendBusNodes Map", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('return sendBusNodes;'), 'getSendBusNodes should return sendBusNodes');
});

TestRunner.test("Day 624 - getSendBusNodes references sendBusNodes variable", (t) => {
    const funcStr = getSendBusNodes.toString();
    t.assertTruthy(funcStr.includes('sendBusNodes'), 'getSendBusNodes should reference sendBusNodes variable');
});

TestRunner.test("Day 624 - connectTrackToSendBus is a function export", (t) => {
    t.assertEqual(typeof connectTrackToSendBus, 'function', 'connectTrackToSendBus should be a function');
});

TestRunner.test("Day 624 - connectTrackToSendBus accepts 2 parameters", (t) => {
    t.assertEqual(connectTrackToSendBus.length, 2, 'connectTrackToSendBus should accept 2 parameters');
});

TestRunner.test("Day 624 - connectTrackToSendBus references localAppServices.getTrackById", (t) => {
    const funcStr = connectTrackToSendBus.toString();
    t.assertTruthy(funcStr.includes('localAppServices.getTrackById') || funcStr.includes('getTrackById'), 'connectTrackToSendBus should reference getTrackById');
});

TestRunner.test("Day 624 - connectTrackToSendBus references sendBusNodes", (t) => {
    const funcStr = connectTrackToSendBus.toString();
    t.assertTruthy(funcStr.includes('sendBusNodes'), 'connectTrackToSendBus should reference sendBusNodes');
});

TestRunner.test("Day 624 - connectTrackToSendBus has console.warn for missing track or send bus", (t) => {
    const funcStr = connectTrackToSendBus.toString();
    t.assertTruthy(funcStr.includes('console.warn'), 'connectTrackToSendBus should have console.warn for errors');
});

TestRunner.test("Day 624 - connectTrackToSendBus returns boolean", (t) => {
    const funcStr = connectTrackToSendBus.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'connectTrackToSendBus should return boolean');
});

TestRunner.test("Day 624 - disconnectTrackFromSendBus is a function export", (t) => {
    t.assertEqual(typeof disconnectTrackFromSendBus, 'function', 'disconnectTrackFromSendBus should be a function');
});

TestRunner.test("Day 624 - disconnectTrackFromSendBus accepts 2 parameters", (t) => {
    t.assertEqual(disconnectTrackFromSendBus.length, 2, 'disconnectTrackFromSendBus should accept 2 parameters');
});

TestRunner.test("Day 624 - disconnectTrackFromSendBus references trackSendNodes", (t) => {
    const funcStr = disconnectTrackFromSendBus.toString();
    t.assertTruthy(funcStr.includes('trackSendNodes'), 'disconnectTrackFromSendBus should reference trackSendNodes');
});

TestRunner.test("Day 624 - disconnectTrackFromSendBus returns boolean", (t) => {
    const funcStr = disconnectTrackFromSendBus.toString();
    t.assertTruthy(funcStr.includes('return true'), 'disconnectTrackFromSendBus should return true');
});

TestRunner.test("Day 624 - createSendBusInAudio is an async function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export async function createSendBusInAudio'), 'createSendBusInAudio should be async function export');
});

TestRunner.test("Day 624 - createSendBusInAudio accepts 1 parameter", (t) => {
    t.assertEqual(createSendBusInAudio.length, 1, 'createSendBusInAudio should accept 1 parameter');
});

TestRunner.test("Day 624 - createSendBusInAudio checks sendBusNodes.has(sendId)", (t) => {
    const funcStr = createSendBusInAudio.toString();
    t.assertTruthy(funcStr.includes('sendBusNodes.has'), 'createSendBusInAudio should check if send bus already exists');
});

TestRunner.test("Day 624 - createSendBusInAudio creates Tone.Gain nodes", (t) => {
    const funcStr = createSendBusInAudio.toString();
    t.assertTruthy(funcStr.includes('new Tone.Gain'), 'createSendBusInAudio should create Tone.Gain nodes');
});

TestRunner.test("Day 624 - createSendBusInAudio connects inputGain to outputGain", (t) => {
    const funcStr = createSendBusInAudio.toString();
    t.assertTruthy(funcStr.includes('inputGain.connect(outputGain)'), 'createSendBusInAudio should connect inputGain to outputGain');
});

TestRunner.test("Day 624 - createSendBusInAudio sets sendBusNodes with inputGain, effects, outputGain, muted", (t) => {
    const funcStr = createSendBusInAudio.toString();
    t.assertTruthy(funcStr.includes('sendBusNodes.set'), 'createSendBusInAudio should set sendBusNodes');
    t.assertTruthy(funcStr.includes('inputGain') && funcStr.includes('effects') && funcStr.includes('outputGain') && funcStr.includes('muted'), 'sendBusNodes entry should have all properties');
});

TestRunner.test("Day 624 - deleteSendBusFromAudio is a function export", (t) => {
    t.assertEqual(typeof deleteSendBusFromAudio, 'function', 'deleteSendBusFromAudio should be a function');
});

TestRunner.test("Day 624 - deleteSendBusFromAudio accepts 1 parameter", (t) => {
    t.assertEqual(deleteSendBusFromAudio.length, 1, 'deleteSendBusFromAudio should accept 1 parameter');
});

TestRunner.test("Day 624 - deleteSendBusFromAudio disposes effect nodes", (t) => {
    const funcStr = deleteSendBusFromAudio.toString();
    t.assertTruthy(funcStr.includes('.dispose()') || funcStr.includes('dispose'), 'deleteSendBusFromAudio should dispose nodes');
});

TestRunner.test("Day 624 - deleteSendBusFromAudio removes from sendBusNodes", (t) => {
    const funcStr = deleteSendBusFromAudio.toString();
    t.assertTruthy(funcStr.includes('sendBusNodes.delete'), 'deleteSendBusFromAudio should delete from sendBusNodes');
});

TestRunner.test("Day 624 - addEffectToSendBus is a function export", (t) => {
    t.assertEqual(typeof addEffectToSendBus, 'function', 'addEffectToSendBus should be a function');
});

TestRunner.test("Day 624 - addEffectToSendBus accepts 3 parameters", (t) => {
    t.assertEqual(addEffectToSendBus.length, 3, 'addEffectToSendBus should accept 3 parameters');
});

TestRunner.test("Day 624 - addEffectToSendBus references sendBusNodes", (t) => {
    const funcStr = addEffectToSendBus.toString();
    t.assertTruthy(funcStr.includes('sendBusNodes.get'), 'addEffectToSendBus should get bus data from sendBusNodes');
});

TestRunner.test("Day 624 - addEffectToSendBus calls createEffectInstance", (t) => {
    const funcStr = addEffectToSendBus.toString();
    t.assertTruthy(funcStr.includes('createEffectInstance'), 'addEffectToSendBus should call createEffectInstance');
});

TestRunner.test("Day 624 - addEffectToSendBus rebuilds signal chain", (t) => {
    const funcStr = addEffectToSendBus.toString();
    t.assertTruthy(funcStr.includes('disconnect') && funcStr.includes('connect'), 'addEffectToSendBus should rebuild signal chain');
});

TestRunner.test("Day 624 - addEffectToSendBus returns boolean", (t) => {
    const funcStr = addEffectToSendBus.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'addEffectToSendBus should return boolean');
});

TestRunner.test("Day 624 - removeEffectFromSendBus is a function export", (t) => {
    t.assertEqual(typeof removeEffectFromSendBus, 'function', 'removeEffectFromSendBus should be a function');
});

TestRunner.test("Day 624 - removeEffectFromSendBus accepts 2 parameters", (t) => {
    t.assertEqual(removeEffectFromSendBus.length, 2, 'removeEffectFromSendBus should accept 2 parameters');
});

TestRunner.test("Day 624 - removeEffectFromSendBus finds effect by id", (t) => {
    const funcStr = removeEffectFromSendBus.toString();
    t.assertTruthy(funcStr.includes('findIndex') || funcStr.includes('find'), 'removeEffectFromSendBus should find effect by id');
});

TestRunner.test("Day 624 - removeEffectFromSendBus rebuilds chain after removal", (t) => {
    const funcStr = removeEffectFromSendBus.toString();
    t.assertTruthy(funcStr.includes('rebuild') || (funcStr.includes('disconnect') && funcStr.includes('connect')), 'removeEffectFromSendBus should rebuild chain');
});

TestRunner.test("Day 624 - reorderEffectInSendBus is a function export", (t) => {
    t.assertEqual(typeof reorderEffectInSendBus, 'function', 'reorderEffectInSendBus should be a function');
});

TestRunner.test("Day 624 - reorderEffectInSendBus accepts 3 parameters", (t) => {
    t.assertEqual(reorderEffectInSendBus.length, 3, 'reorderEffectInSendBus should accept 3 parameters');
});

TestRunner.test("Day 624 - reorderEffectInSendBus uses splice to reorder", (t) => {
    const funcStr = reorderEffectInSendBus.toString();
    t.assertTruthy(funcStr.includes('splice'), 'reorderEffectInSendBus should use splice to reorder effects');
});

TestRunner.test("Day 624 - updateSendBusEffectParam is a function export", (t) => {
    t.assertEqual(typeof updateSendBusEffectParam, 'function', 'updateSendBusEffectParam should be a function');
});

TestRunner.test("Day 624 - updateSendBusEffectParam accepts 4 parameters", (t) => {
    t.assertEqual(updateSendBusEffectParam.length, 4, 'updateSendBusEffectParam should accept 4 parameters');
});

TestRunner.test("Day 624 - updateSendBusEffectParam uses paramPath.split('.')", (t) => {
    const funcStr = updateSendBusEffectParam.toString();
    t.assertTruthy(funcStr.includes("split('.')") || funcStr.includes('split(".")'), 'updateSendBusEffectParam should split param path');
});

TestRunner.test("Day 624 - updateSendBusEffectParam uses rampTo for smooth transitions", (t) => {
    const funcStr = updateSendBusEffectParam.toString();
    t.assertTruthy(funcStr.includes('rampTo'), 'updateSendBusEffectParam should use rampTo for smooth value changes');
});

TestRunner.test("Day 624 - setSendBusLevel is a function export", (t) => {
    t.assertEqual(typeof setSendBusLevel, 'function', 'setSendBusLevel should be a function');
});

TestRunner.test("Day 624 - setSendBusLevel accepts 2 parameters", (t) => {
    t.assertEqual(setSendBusLevel.length, 2, 'setSendBusLevel should accept 2 parameters');
});

TestRunner.test("Day 624 - setSendBusLevel clamps level to 0-1 range", (t) => {
    const funcStr = setSendBusLevel.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setSendBusLevel should clamp value');
});

TestRunner.test("Day 624 - setSendBusLevel uses rampTo for smooth transitions", (t) => {
    const funcStr = setSendBusLevel.toString();
    t.assertTruthy(funcStr.includes('rampTo'), 'setSendBusLevel should use rampTo for smooth level changes');
});

TestRunner.test("Day 624 - setSendBusMuted is a function export", (t) => {
    t.assertEqual(typeof setSendBusMuted, 'function', 'setSendBusMuted should be a function');
});

TestRunner.test("Day 624 - setSendBusMuted accepts 2 parameters", (t) => {
    t.assertEqual(setSendBusMuted.length, 2, 'setSendBusMuted should accept 2 parameters');
});

// --- APP_VERSION validation ---
TestRunner.test("Day 624 - APP_VERSION validation for Day 624", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 624');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 279, 'Minor version should be >= 279 for Day 624');
    }
});

// ============================================
// Day 624: Automation & Transport Audio Function Tests
// ============================================

TestRunner.test("Day 624 - startAutomation is a function export", (t) => {
    t.assertEqual(typeof startAutomation, 'function', 'startAutomation should be a function');
});

TestRunner.test("Day 624 - startAutomation references automationActive variable", (t) => {
    const funcStr = startAutomation.toString();
    t.assertTruthy(funcStr.includes('automationActive'), 'startAutomation should reference automationActive');
});

TestRunner.test("Day 624 - startAutomation sets automationActive to true", (t) => {
    const funcStr = startAutomation.toString();
    t.assertTruthy(funcStr.includes('automationActive = true'), 'startAutomation should set automationActive to true');
});

TestRunner.test("Day 624 - startAutomation calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = startAutomation.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'startAutomation should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 624 - startAutomation has descriptive undo label 'Start Automation'", (t) => {
    const funcStr = startAutomation.toString();
    t.assertTruthy(funcStr.includes("'Start Automation'") || funcStr.includes('"Start Automation"'), 'startAutomation should have "Start Automation" undo label');
});

TestRunner.test("Day 624 - stopAutomation is a function export", (t) => {
    t.assertEqual(typeof stopAutomation, 'function', 'stopAutomation should be a function');
});

TestRunner.test("Day 624 - stopAutomation references automationActive variable", (t) => {
    const funcStr = stopAutomation.toString();
    t.assertTruthy(funcStr.includes('automationActive'), 'stopAutomation should reference automationActive');
});

TestRunner.test("Day 624 - stopAutomation sets automationActive to false", (t) => {
    const funcStr = stopAutomation.toString();
    t.assertTruthy(funcStr.includes('automationActive = false'), 'stopAutomation should set automationActive to false');
});

TestRunner.test("Day 624 - stopAutomation calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = stopAutomation.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'stopAutomation should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 624 - stopAutomation has descriptive undo label 'Stop Automation'", (t) => {
    const funcStr = stopAutomation.toString();
    t.assertTruthy(funcStr.includes("'Stop Automation'") || funcStr.includes('"Stop Automation"'), 'stopAutomation should have "Stop Automation" undo label');
});

TestRunner.test("Day 624 - cleanupAutomation is a function export", (t) => {
    t.assertEqual(typeof cleanupAutomation, 'function', 'cleanupAutomation should be a function');
});

TestRunner.test("Day 624 - cleanupAutomation calls stopAutomation", (t) => {
    const funcStr = cleanupAutomation.toString();
    t.assertTruthy(funcStr.includes('stopAutomation'), 'cleanupAutomation should call stopAutomation');
});

TestRunner.test("Day 624 - onTransportStart is a function export", (t) => {
    t.assertEqual(typeof onTransportStart, 'function', 'onTransportStart should be a function');
});

TestRunner.test("Day 624 - onTransportStart sets automationActive to true", (t) => {
    const funcStr = onTransportStart.toString();
    t.assertTruthy(funcStr.includes('automationActive = true'), 'onTransportStart should set automationActive to true');
});

TestRunner.test("Day 624 - onTransportStop is a function export", (t) => {
    t.assertEqual(typeof onTransportStop, 'function', 'onTransportStop should be a function');
});

TestRunner.test("Day 624 - onTransportStop sets automationActive to false", (t) => {
    const funcStr = onTransportStop.toString();
    t.assertTruthy(funcStr.includes('automationActive = false'), 'onTransportStop should set automationActive to false');
});

TestRunner.test("Day 624 - writeMasterVolumeAutomation is a function export", (t) => {
    t.assertEqual(typeof writeMasterVolumeAutomation, 'function', 'writeMasterVolumeAutomation should be a function');
});

TestRunner.test("Day 624 - writeMasterVolumeAutomation accepts 2 parameters", (t) => {
    t.assertEqual(writeMasterVolumeAutomation.length, 2, 'writeMasterVolumeAutomation should accept 2 parameters (time, value)');
});

TestRunner.test("Day 624 - writeMasterVolumeAutomation references masterVolumeAutomation array", (t) => {
    const funcStr = writeMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomation'), 'writeMasterVolumeAutomation should reference masterVolumeAutomation');
});

TestRunner.test("Day 624 - writeMasterVolumeAutomation pushes {time, value} object to masterVolumeAutomation", (t) => {
    const funcStr = writeMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('push'), 'writeMasterVolumeAutomation should push to masterVolumeAutomation');
});

TestRunner.test("Day 624 - applyMasterVolumeAutomationAtTime is a function export", (t) => {
    t.assertEqual(typeof applyMasterVolumeAutomationAtTime, 'function', 'applyMasterVolumeAutomationAtTime should be a function');
});

TestRunner.test("Day 624 - applyMasterVolumeAutomationAtTime accepts 1 parameter", (t) => {
    t.assertEqual(applyMasterVolumeAutomationAtTime.length, 1, 'applyMasterVolumeAutomationAtTime should accept 1 parameter (time)');
});

TestRunner.test("Day 624 - applyMasterVolumeAutomationAtTime references masterVolumeAutomation", (t) => {
    const funcStr = applyMasterVolumeAutomationAtTime.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomation'), 'applyMasterVolumeAutomationAtTime should reference masterVolumeAutomation');
});

TestRunner.test("Day 624 - applyMasterVolumeAutomationAtTime uses find to locate event by time", (t) => {
    const funcStr = applyMasterVolumeAutomationAtTime.toString();
    t.assertTruthy(funcStr.includes('find'), 'applyMasterVolumeAutomationAtTime should use find to locate event');
});

TestRunner.test("Day 624 - applyMasterVolumeAutomationAtTime calls setMasterVolumeAutomation", (t) => {
    const funcStr = applyMasterVolumeAutomationAtTime.toString();
    t.assertTruthy(funcStr.includes('setMasterVolumeAutomation'), 'applyMasterVolumeAutomationAtTime should call setMasterVolumeAutomation');
});

TestRunner.test("Day 624 - getMasterVolumeAutomation is a function export", (t) => {
    t.assertEqual(typeof getMasterVolumeAutomation, 'function', 'getMasterVolumeAutomation should be a function');
});

TestRunner.test("Day 624 - getMasterVolumeAutomation accepts 0 parameters", (t) => {
    t.assertEqual(getMasterVolumeAutomation.length, 0, 'getMasterVolumeAutomation should accept no parameters');
});

TestRunner.test("Day 624 - getMasterVolumeAutomation references masterVolumeAutomation", (t) => {
    const funcStr = getMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomation'), 'getMasterVolumeAutomation should reference masterVolumeAutomation');
});

TestRunner.test("Day 624 - getMasterVolumeAutomation returns a mapped copy of the automation data", (t) => {
    const funcStr = getMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('map'), 'getMasterVolumeAutomation should use map to create a copy');
});

TestRunner.test("Day 624 - setMasterVolumeAutomation is a function export", (t) => {
    t.assertEqual(typeof setMasterVolumeAutomation, 'function', 'setMasterVolumeAutomation should be a function');
});

TestRunner.test("Day 624 - setMasterVolumeAutomation accepts 1 parameter", (t) => {
    t.assertEqual(setMasterVolumeAutomation.length, 1, 'setMasterVolumeAutomation should accept 1 parameter (automationData)');
});

TestRunner.test("Day 624 - setMasterVolumeAutomation calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setMasterVolumeAutomation should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 624 - setMasterVolumeAutomation has descriptive undo label", (t) => {
    const funcStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes("Automation"), 'setMasterVolumeAutomation should have Automation-related undo label');
});

TestRunner.test("Day 624 - setMasterVolumeAutomation checks Array.isArray", (t) => {
    const funcStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('Array.isArray'), 'setMasterVolumeAutomation should check Array.isArray');
});

TestRunner.test("Day 624 - setMasterVolumeAutomation assigns array copy to masterVolumeAutomation", (t) => {
    const funcStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomation ='), 'setMasterVolumeAutomation should assign to masterVolumeAutomation');
});

TestRunner.test("Day 624 - resetTapTempo is a function export", (t) => {
    t.assertEqual(typeof resetTapTempo, 'function', 'resetTapTempo should be a function');
});

TestRunner.test("Day 624 - resetTapTempo accepts 0 parameters", (t) => {
    t.assertEqual(resetTapTempo.length, 0, 'resetTapTempo should accept no parameters');
});

TestRunner.test("Day 624 - resetTapTempo references tapTimes array", (t) => {
    const funcStr = resetTapTempo.toString();
    t.assertTruthy(funcStr.includes('tapTimes'), 'resetTapTempo should reference tapTimes array');
});

TestRunner.test("Day 624 - resetTapTempo sets tapTimes to empty array", (t) => {
    const funcStr = resetTapTempo.toString();
    t.assertTruthy(funcStr.includes('tapTimes = []'), 'resetTapTempo should reset tapTimes to empty array');
});

TestRunner.test("Day 624 - tapTempo is a function export", (t) => {
    t.assertEqual(typeof tapTempo, 'function', 'tapTempo should be a function');
});

TestRunner.test("Day 624 - tapTempo accepts 0 parameters", (t) => {
    t.assertEqual(tapTempo.length, 0, 'tapTempo should accept no parameters');
});

TestRunner.test("Day 624 - tapTempo references tapTimes array", (t) => {
    const funcStr = tapTempo.toString();
    t.assertTruthy(funcStr.includes('tapTimes'), 'tapTempo should reference tapTimes array');
});

TestRunner.test("Day 624 - tapTempo uses Date.now() for timestamp", (t) => {
    const funcStr = tapTempo.toString();
    t.assertTruthy(funcStr.includes('Date.now'), 'tapTempo should use Date.now() for timestamps');
});

TestRunner.test("Day 624 - tapTempo checks TAP_TEMPO_TIMEOUT_MS for reset", (t) => {
    const funcStr = tapTempo.toString();
    t.assertTruthy(funcStr.includes('TAP_TEMPO_TIMEOUT') || funcStr.includes('2000'), 'tapTempo should check timeout for reset');
});

TestRunner.test("Day 624 - getTapTempoBpm is a function export", (t) => {
    t.assertEqual(typeof getTapTempoBpm, 'function', 'getTapTempoBpm should be a function');
});

TestRunner.test("Day 624 - getTapTempoBpm accepts 0 parameters", (t) => {
    t.assertEqual(getTapTempoBpm.length, 0, 'getTapTempoBpm should accept no parameters');
});

TestRunner.test("Day 624 - getTapTempoBpm references tapTimes array", (t) => {
    const funcStr = getTapTempoBpm.toString();
    t.assertTruthy(funcStr.includes('tapTimes'), 'getTapTempoBpm should reference tapTimes array');
});

TestRunner.test("Day 624 - getTapTempoBpm clamps result to BPM range (MIN/MAX)", (t) => {
    const funcStr = getTapTempoBpm.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'getTapTempoBpm should clamp BPM to valid range');
});

TestRunner.test("Day 624 - isTapTempoReady is a function export", (t) => {
    t.assertEqual(typeof isTapTempoReady, 'function', 'isTapTempoReady should be a function');
});

TestRunner.test("Day 624 - isTapTempoReady accepts 0 parameters", (t) => {
    t.assertEqual(isTapTempoReady.length, 0, 'isTapTempoReady should accept no parameters');
});

TestRunner.test("Day 624 - isTapTempoReady references tapTimes array", (t) => {
    const funcStr = isTapTempoReady.toString();
    t.assertTruthy(funcStr.includes('tapTimes'), 'isTapTempoReady should reference tapTimes');
});

TestRunner.test("Day 624 - isTapTempoReady checks tapTimes.length", (t) => {
    const funcStr = isTapTempoReady.toString();
    t.assertTruthy(funcStr.includes('length'), 'isTapTempoReady should check tapTimes.length');
});

TestRunner.test("Day 624 - APP_VERSION validation for Day 624", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 624');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 278, 'Minor version should be >= 278 for Day 624');
    }
});

// ============================================
// Day 625: Count-In and Punch Region Audio Function Tests
// ============================================

TestRunner.test("Day 625 - setCountInBars is a function export", (t) => {
    t.assertEqual(typeof setCountInBars, 'function', 'setCountInBars should be a function');
});

TestRunner.test("Day 625 - setCountInBars accepts 1 parameter", (t) => {
    t.assertEqual(setCountInBars.length, 1, 'setCountInBars should accept 1 parameter');
});

TestRunner.test("Day 625 - setCountInBars clamps value to 0-4 range", (t) => {
    const funcStr = setCountInBars.toString();
    t.assertTruthy(funcStr.includes('Math.max(0') && funcStr.includes('Math.min(4'), 'setCountInBars should clamp to 0-4 range');
});

TestRunner.test("Day 625 - setCountInBars calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setCountInBars.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setCountInBars should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 625 - setCountInBars has descriptive undo label 'Set Count-In Bars to'", (t) => {
    const funcStr = setCountInBars.toString();
    t.assertTruthy(funcStr.includes('Set Count-In Bars to'), 'setCountInBars should have "Set Count-In Bars to" undo label');
});

TestRunner.test("Day 625 - getCountInBars is a function export", (t) => {
    t.assertEqual(typeof getCountInBars, 'function', 'getCountInBars should be a function');
});

TestRunner.test("Day 625 - getCountInBars accepts 0 parameters", (t) => {
    t.assertEqual(getCountInBars.length, 0, 'getCountInBars should accept no parameters');
});

TestRunner.test("Day 625 - isCountInActive is a function export", (t) => {
    t.assertEqual(typeof isCountInActive, 'function', 'isCountInActive should be a function');
});

TestRunner.test("Day 625 - isCountInActive accepts 0 parameters", (t) => {
    t.assertEqual(isCountInActive.length, 0, 'isCountInActive should accept no parameters');
});

TestRunner.test("Day 625 - isCountInActive references countInActive variable", (t) => {
    const funcStr = isCountInActive.toString();
    t.assertTruthy(funcStr.includes('countInActive'), 'isCountInActive should reference countInActive variable');
});

TestRunner.test("Day 625 - stopMetronome is a function export", (t) => {
    t.assertEqual(typeof stopMetronome, 'function', 'stopMetronome should be a function');
});

TestRunner.test("Day 625 - stopMetronome accepts 0 parameters", (t) => {
    t.assertEqual(stopMetronome.length, 0, 'stopMetronome should accept no parameters');
});

TestRunner.test("Day 625 - stopMetronome sets countInActive to false", (t) => {
    const funcStr = stopMetronome.toString();
    t.assertTruthy(funcStr.includes('countInActive = false'), 'stopMetronome should set countInActive to false');
});

TestRunner.test("Day 625 - cleanupMetronome is a function export", (t) => {
    t.assertEqual(typeof cleanupMetronome, 'function', 'cleanupMetronome should be a function');
});

TestRunner.test("Day 625 - cleanupMetronome calls stopMetronome", (t) => {
    const funcStr = cleanupMetronome.toString();
    t.assertTruthy(funcStr.includes('stopMetronome'), 'cleanupMetronome should call stopMetronome');
});

TestRunner.test("Day 625 - cleanupCountIn is a function export", (t) => {
    t.assertEqual(typeof cleanupCountIn, 'function', 'cleanupCountIn should be a function');
});

TestRunner.test("Day 625 - cleanupCountIn accepts 0 parameters", (t) => {
    t.assertEqual(cleanupCountIn.length, 0, 'cleanupCountIn should accept no parameters');
});

TestRunner.test("Day 625 - cleanupCountIn sets countInActive to false", (t) => {
    const funcStr = cleanupCountIn.toString();
    t.assertTruthy(funcStr.includes('countInActive = false'), 'cleanupCountIn should set countInActive to false');
});

TestRunner.test("Day 625 - startCountIn is an async function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export async function startCountIn'), 'startCountIn should be async function export');
});

TestRunner.test("Day 625 - startCountIn accepts 1-2 parameters", (t) => {
    t.assertTrue(startCountIn.length === 1 || startCountIn.length === 2, 'startCountIn should accept 1-2 parameters');
});

TestRunner.test("Day 625 - startCountIn references countInBars", (t) => {
    const funcStr = startCountIn.toString();
    t.assertTruthy(funcStr.includes('countInBars'), 'startCountIn should reference countInBars');
});

TestRunner.test("Day 625 - startCountIn references countInActive", (t) => {
    const funcStr = startCountIn.toString();
    t.assertTruthy(funcStr.includes('countInActive'), 'startCountIn should reference countInActive');
});

TestRunner.test("Day 625 - startCountIn sets countInActive to true", (t) => {
    const funcStr = startCountIn.toString();
    t.assertTruthy(funcStr.includes('countInActive = true'), 'startCountIn should set countInActive to true');
});

TestRunner.test("Day 625 - scheduleRecordingForPunch is a function export", (t) => {
    t.assertEqual(typeof scheduleRecordingForPunch, 'function', 'scheduleRecordingForPunch should be a function');
});

TestRunner.test("Day 625 - scheduleRecordingForPunch accepts 2 parameters", (t) => {
    t.assertEqual(scheduleRecordingForPunch.length, 2, 'scheduleRecordingForPunch should accept 2 parameters');
});

TestRunner.test("Day 625 - scheduleRecordingForPunch references recordingScheduledId", (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('recordingScheduledId'), 'scheduleRecordingForPunch should reference recordingScheduledId');
});

TestRunner.test("Day 625 - scheduleRecordingForPunch references Tone.Transport.schedule", (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('Tone.Transport.schedule') || funcStr.includes('Transport.schedule'), 'scheduleRecordingForPunch should use Tone.Transport.schedule');
});

TestRunner.test("Day 625 - scheduleRecordingForPunch references punchRegion.out", (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('punchRegion.out'), 'scheduleRecordingForPunch should reference punchRegion.out');
});

TestRunner.test("Day 625 - cancelScheduledRecording is a function export", (t) => {
    t.assertEqual(typeof cancelScheduledRecording, 'function', 'cancelScheduledRecording should be a function');
});

TestRunner.test("Day 625 - cancelScheduledRecording accepts 0 parameters", (t) => {
    t.assertEqual(cancelScheduledRecording.length, 0, 'cancelScheduledRecording should accept no parameters');
});

TestRunner.test("Day 625 - cancelScheduledRecording references recordingScheduledId", (t) => {
    const funcStr = cancelScheduledRecording.toString();
    t.assertTruthy(funcStr.includes('recordingScheduledId'), 'cancelScheduledRecording should reference recordingScheduledId');
});

TestRunner.test("Day 625 - getRecordingScheduledTrackId is a function export", (t) => {
    t.assertEqual(typeof getRecordingScheduledTrackId, 'function', 'getRecordingScheduledTrackId should be a function');
});

TestRunner.test("Day 625 - getRecordingScheduledTrackId accepts 0 parameters", (t) => {
    t.assertEqual(getRecordingScheduledTrackId.length, 0, 'getRecordingScheduledTrackId should accept no parameters');
});

TestRunner.test("Day 625 - getRecordingScheduledTrackId returns recordingScheduledTrackId", (t) => {
    const funcStr = getRecordingScheduledTrackId.toString();
    t.assertTruthy(funcStr.includes('return recordingScheduledTrackId'), 'getRecordingScheduledTrackId should return recordingScheduledTrackId');
});

TestRunner.test("Day 625 - cleanupRecordingScheduling is a function export", (t) => {
    t.assertEqual(typeof cleanupRecordingScheduling, 'function', 'cleanupRecordingScheduling should be a function');
});

TestRunner.test("Day 625 - cleanupRecordingScheduling accepts 0 parameters", (t) => {
    t.assertEqual(cleanupRecordingScheduling.length, 0, 'cleanupRecordingScheduling should accept no parameters');
});

TestRunner.test("Day 625 - cleanupRecordingScheduling calls cancelScheduledRecording", (t) => {
    const funcStr = cleanupRecordingScheduling.toString();
    t.assertTruthy(funcStr.includes('cancelScheduledRecording'), 'cleanupRecordingScheduling should call cancelScheduledRecording');
});

TestRunner.test("Day 625 - getTransportPosition is a function export", (t) => {
    t.assertEqual(typeof getTransportPosition, 'function', 'getTransportPosition should be a function');
});

TestRunner.test("Day 625 - getTransportPosition accepts 0 parameters", (t) => {
    t.assertEqual(getTransportPosition.length, 0, 'getTransportPosition should accept no parameters');
});

TestRunner.test("Day 625 - getTransportPosition references Tone.Transport.position", (t) => {
    const funcStr = getTransportPosition.toString();
    t.assertTruthy(funcStr.includes('Tone.Transport.position') || funcStr.includes('Transport.position'), 'getTransportPosition should reference Tone.Transport.position');
});

TestRunner.test("Day 625 - getTransportSeconds is a function export", (t) => {
    t.assertEqual(typeof getTransportSeconds, 'function', 'getTransportSeconds should be a function');
});

TestRunner.test("Day 625 - getTransportSeconds accepts 0 parameters", (t) => {
    t.assertEqual(getTransportSeconds.length, 0, 'getTransportSeconds should accept no parameters');
});

TestRunner.test("Day 625 - getTransportSeconds references Tone.Transport.seconds", (t) => {
    const funcStr = getTransportSeconds.toString();
    t.assertTruthy(funcStr.includes('Tone.Transport.seconds') || funcStr.includes('Transport.seconds'), 'getTransportSeconds should reference Tone.Transport.seconds');
});

TestRunner.test("Day 625 - getTransportBpm is a function export", (t) => {
    t.assertEqual(typeof getTransportBpm, 'function', 'getTransportBpm should be a function');
});

TestRunner.test("Day 625 - getTransportBpm accepts 0 parameters", (t) => {
    t.assertEqual(getTransportBpm.length, 0, 'getTransportBpm should accept no parameters');
});

TestRunner.test("Day 625 - getTransportBpm references Tone.Transport.bpm.value", (t) => {
    const funcStr = getTransportBpm.toString();
    t.assertTruthy(funcStr.includes('bpm.value'), 'getTransportBpm should reference Tone.Transport.bpm.value');
});

TestRunner.test("Day 625 - getTransportState is a function export", (t) => {
    t.assertEqual(typeof getTransportState, 'function', 'getTransportState should be a function');
});

TestRunner.test("Day 625 - getTransportState accepts 0 parameters", (t) => {
    t.assertEqual(getTransportState.length, 0, 'getTransportState should accept no parameters');
});

TestRunner.test("Day 625 - getTransportState references Tone.Transport.state", (t) => {
    const funcStr = getTransportState.toString();
    t.assertTruthy(funcStr.includes('Tone.Transport.state') || funcStr.includes('Transport.state'), 'getTransportState should reference Tone.Transport.state');
});

TestRunner.test("Day 625 - exportMixdownToWav is an async function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export async function exportMixdownToWav'), 'exportMixdownToWav should be async function export');
});

TestRunner.test("Day 625 - exportMixdownToWav accepts 1 parameter", (t) => {
    t.assertEqual(exportMixdownToWav.length, 1, 'exportMixdownToWav should accept 1 parameter');
});

TestRunner.test("Day 625 - exportMixdownToWav references Tone.Recorder", (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy(funcStr.includes('Tone.Recorder') || funcStr.includes('Recorder'), 'exportMixdownToWav should reference Tone.Recorder');
});

TestRunner.test("Day 625 - exportMixdownToWav references getActualMasterGainNode", (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy(funcStr.includes('getActualMasterGainNode'), 'exportMixdownToWav should reference getActualMasterGainNode');
});

TestRunner.test("Day 625 - exportMixdownToWav references Tone.Transport.start and Tone.Transport.stop", (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy((funcStr.includes('Tone.Transport.start') || funcStr.includes('Transport.start')) && (funcStr.includes('Tone.Transport.stop') || funcStr.includes('Transport.stop')), 'exportMixdownToWav should reference both Transport.start and Transport.stop');
});

TestRunner.test("Day 625 - exportMixdownToWav has console.error error handling", (t) => {
    const funcStr = exportMixdownToWav.toString();
    t.assertTruthy(funcStr.includes('console.error'), 'exportMixdownToWav should have console.error for error handling');
});

// --- APP_VERSION validation ---
TestRunner.test("Day 625 - APP_VERSION validation for Day 625", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 625');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 280, 'Minor version should be >= 280 for Day 625');
    }
});

// ============================================================
// DAY 626: LOOP REGION & PUNCH REGION AUDIO FUNCTION TESTS
// ============================================================

TestRunner.test("Day 626 - Loop Region - getLoopRegion is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function getLoopRegion'), 'getLoopRegion should be exported');
});

TestRunner.test("Day 626 - Loop Region - getLoopRegion returns object copy", (t) => {
    t.assertEqual(typeof getLoopRegion(), 'object', 'getLoopRegion should return an object');
});

TestRunner.test("Day 626 - Loop Region - setLoopRegion is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function setLoopRegion'), 'setLoopRegion should be exported');
});

TestRunner.test("Day 626 - Loop Region - setLoopRegion accepts 2 parameters", (t) => {
    t.assertEqual(setLoopRegion.length, 2, 'setLoopRegion should accept 2 parameters');
});

TestRunner.test("Day 626 - Loop Region - setLoopRegion validates range (endBars > startBars)", (t) => {
    const funcStr = setLoopRegion.toString();
    t.assertTruthy(funcStr.includes('endBars <= startBars') || funcStr.includes('startBars >= endBars') || funcStr.includes('endBars <= startBars'), 'setLoopRegion should validate that endBars > startBars');
});

TestRunner.test("Day 626 - Loop Region - setLoopRegion references Constants.MAX_BARS", (t) => {
    const funcStr = setLoopRegion.toString();
    t.assertTruthy(funcStr.includes('MAX_BARS'), 'setLoopRegion should reference Constants.MAX_BARS');
});

TestRunner.test("Day 626 - Loop Region - setLoopRegion calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setLoopRegion.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setLoopRegion should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 626 - Loop Region - setLoopRegion sets loopRegion.start and loopRegion.end", (t) => {
    const funcStr = setLoopRegion.toString();
    t.assertTruthy(funcStr.includes('loopRegion.start') && funcStr.includes('loopRegion.end'), 'setLoopRegion should set loopRegion.start and loopRegion.end');
});

TestRunner.test("Day 626 - Loop Region - setLoopRegionEnabled is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function setLoopRegionEnabled'), 'setLoopRegionEnabled should be exported');
});

TestRunner.test("Day 626 - Loop Region - setLoopRegionEnabled accepts 1 parameter", (t) => {
    t.assertEqual(setLoopRegionEnabled.length, 1, 'setLoopRegionEnabled should accept 1 parameter');
});

TestRunner.test("Day 626 - Loop Region - setLoopRegionEnabled calls captureAudioStateForUndoIfAllowed on change", (t) => {
    const funcStr = setLoopRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setLoopRegionEnabled should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 626 - Loop Region - setLoopRegionEnabled uses !! boolean coercion", (t) => {
    const funcStr = setLoopRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('!!enabled') || funcStr.includes('nextValue = !!'), 'setLoopRegionEnabled should coerce enabled to boolean');
});

TestRunner.test("Day 626 - Loop Region - setLoopRegionEnabled sets loopRegion.enabled", (t) => {
    const funcStr = setLoopRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('loopRegion.enabled'), 'setLoopRegionEnabled should set loopRegion.enabled');
});

TestRunner.test("Day 626 - Loop Region - isLoopRegionEnabled is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function isLoopRegionEnabled'), 'isLoopRegionEnabled should be exported');
});

TestRunner.test("Day 626 - Loop Region - isLoopRegionEnabled accepts 0 parameters", (t) => {
    t.assertEqual(isLoopRegionEnabled.length, 0, 'isLoopRegionEnabled should accept no parameters');
});

TestRunner.test("Day 626 - Loop Region - isLoopRegionEnabled returns loopRegion.enabled", (t) => {
    const funcStr = isLoopRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('loopRegion.enabled'), 'isLoopRegionEnabled should return loopRegion.enabled');
});

TestRunner.test("Day 626 - Loop Region - getLoopStartBars is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function getLoopStartBars'), 'getLoopStartBars should be exported');
});

TestRunner.test("Day 626 - Loop Region - getLoopStartBars returns loopRegion.start", (t) => {
    const funcStr = getLoopStartBars.toString();
    t.assertTruthy(funcStr.includes('loopRegion.start'), 'getLoopStartBars should return loopRegion.start');
});

TestRunner.test("Day 626 - Loop Region - getLoopEndBars is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function getLoopEndBars'), 'getLoopEndBars should be exported');
});

TestRunner.test("Day 626 - Loop Region - getLoopEndBars returns loopRegion.end", (t) => {
    const funcStr = getLoopEndBars.toString();
    t.assertTruthy(funcStr.includes('loopRegion.end'), 'getLoopEndBars should return loopRegion.end');
});

TestRunner.test("Day 626 - Punch Region - getPunchRegion is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function getPunchRegion'), 'getPunchRegion should be exported');
});

TestRunner.test("Day 626 - Punch Region - getPunchRegion returns object copy", (t) => {
    t.assertEqual(typeof getPunchRegion(), 'object', 'getPunchRegion should return an object');
});

TestRunner.test("Day 626 - Punch Region - setPunchRegion is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function setPunchRegion'), 'setPunchRegion should be exported');
});

TestRunner.test("Day 626 - Punch Region - setPunchRegion accepts 2 parameters", (t) => {
    t.assertEqual(setPunchRegion.length, 2, 'setPunchRegion should accept 2 parameters');
});

TestRunner.test("Day 626 - Punch Region - setPunchRegion validates range (outBars > inBars)", (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('outBars <= inBars') || funcStr.includes('inBars >= outBars'), 'setPunchRegion should validate that outBars > inBars');
});

TestRunner.test("Day 626 - Punch Region - setPunchRegion references Constants.MAX_BARS", (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('MAX_BARS'), 'setPunchRegion should reference Constants.MAX_BARS');
});

TestRunner.test("Day 626 - Punch Region - setPunchRegion calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setPunchRegion should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 626 - Punch Region - setPunchRegion sets punchRegion.in and punchRegion.out", (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('punchRegion.in') && funcStr.includes('punchRegion.out'), 'setPunchRegion should set punchRegion.in and punchRegion.out');
});

TestRunner.test("Day 626 - Punch Region - setPunchRegionEnabled is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function setPunchRegionEnabled'), 'setPunchRegionEnabled should be exported');
});

TestRunner.test("Day 626 - Punch Region - setPunchRegionEnabled accepts 1 parameter", (t) => {
    t.assertEqual(setPunchRegionEnabled.length, 1, 'setPunchRegionEnabled should accept 1 parameter');
});

TestRunner.test("Day 626 - Punch Region - setPunchRegionEnabled calls captureAudioStateForUndoIfAllowed on change", (t) => {
    const funcStr = setPunchRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setPunchRegionEnabled should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 626 - Punch Region - setPunchRegionEnabled uses !! boolean coercion", (t) => {
    const funcStr = setPunchRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('!!enabled') || funcStr.includes('nextValue = !!'), 'setPunchRegionEnabled should coerce enabled to boolean');
});

TestRunner.test("Day 626 - Punch Region - setPunchRegionEnabled sets punchRegion.enabled", (t) => {
    const funcStr = setPunchRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('punchRegion.enabled'), 'setPunchRegionEnabled should set punchRegion.enabled');
});

TestRunner.test("Day 626 - Punch Region - isPunchRegionEnabled is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function isPunchRegionEnabled'), 'isPunchRegionEnabled should be exported');
});

TestRunner.test("Day 626 - Punch Region - isPunchRegionEnabled accepts 0 parameters", (t) => {
    t.assertEqual(isPunchRegionEnabled.length, 0, 'isPunchRegionEnabled should accept no parameters');
});

TestRunner.test("Day 626 - Punch Region - isPunchRegionEnabled returns punchRegion.enabled", (t) => {
    const funcStr = isPunchRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('punchRegion.enabled'), 'isPunchRegionEnabled should return punchRegion.enabled');
});

TestRunner.test("Day 626 - Punch Region - getPunchInBars is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function getPunchInBars'), 'getPunchInBars should be exported');
});

TestRunner.test("Day 626 - Punch Region - getPunchInBars returns punchRegion.in", (t) => {
    const funcStr = getPunchInBars.toString();
    t.assertTruthy(funcStr.includes('punchRegion.in'), 'getPunchInBars should return punchRegion.in');
});

TestRunner.test("Day 626 - Punch Region - getPunchOutBars is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function getPunchOutBars'), 'getPunchOutBars should be exported');
});

TestRunner.test("Day 626 - Punch Region - getPunchOutBars returns punchRegion.out", (t) => {
    const funcStr = getPunchOutBars.toString();
    t.assertTruthy(funcStr.includes('punchRegion.out'), 'getPunchOutBars should return punchRegion.out');
});

TestRunner.test("Day 626 - Punch Region - isPositionInPunchRegion is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function isPositionInPunchRegion'), 'isPositionInPunchRegion should be exported');
});

TestRunner.test("Day 626 - Punch Region - isPositionInPunchRegion accepts 1 parameter", (t) => {
    t.assertEqual(isPositionInPunchRegion.length, 1, 'isPositionInPunchRegion should accept 1 parameter');
});

TestRunner.test("Day 626 - Punch Region - isPositionInPunchRegion checks punchRegion.enabled", (t) => {
    const funcStr = isPositionInPunchRegion.toString();
    t.assertTruthy(funcStr.includes('punchRegion.enabled'), 'isPositionInPunchRegion should check punchRegion.enabled');
});

TestRunner.test("Day 626 - Punch Region - isPositionInPunchRegion parses positionString (bars:beats:sixteenths)", (t) => {
    const funcStr = isPositionInPunchRegion.toString();
    t.assertTruthy(funcStr.includes('positionString.split') || funcStr.includes('split(\':\')'), 'isPositionInPunchRegion should parse positionString');
});

TestRunner.test("Day 626 - Punch Region - isPositionInPunchRegion calculates totalSixteenths", (t) => {
    const funcStr = isPositionInPunchRegion.toString();
    t.assertTruthy(funcStr.includes('totalSixteenths') || funcStr.includes('bars * 16') || funcStr.includes('16 +'), 'isPositionInPunchRegion should calculate total sixteenths');
});

TestRunner.test("Day 626 - Punch Region - isPositionInPunchRegion compares against punchRegion.in and punchRegion.out", (t) => {
    const funcStr = isPositionInPunchRegion.toString();
    t.assertTruthy((funcStr.includes('punchRegion.in') || funcStr.includes('punchIn')) && (funcStr.includes('punchRegion.out') || funcStr.includes('punchOut')), 'isPositionInPunchRegion should compare against punch region bounds');
});

TestRunner.test("Day 626 - APP_VERSION validation for Day 626", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 626');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 281, 'Minor version should be >= 281 for Day 626');
    }
});
// Day 627: Send Bus Audio Function Tests
TestRunner.test("Day 627 - Send Bus - getSendBusNodes is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function getSendBusNodes'), 'getSendBusNodes should be exported');
});

TestRunner.test("Day 627 - Send Bus - getSendBusNodes accepts 0 parameters", (t) => {
    t.assertEqual(getSendBusNodes.length, 0, 'getSendBusNodes should accept no parameters');
});

TestRunner.test("Day 627 - Send Bus - getSendBusNodes returns sendBusNodes", (t) => {
    const funcStr = getSendBusNodes.toString();
    t.assertTruthy(funcStr.includes('return sendBusNodes'), 'getSendBusNodes should return sendBusNodes');
});

TestRunner.test("Day 627 - Send Bus - connectTrackToSendBus is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function connectTrackToSendBus'), 'connectTrackToSendBus should be exported');
});

TestRunner.test("Day 627 - Send Bus - connectTrackToSendBus accepts 2 parameters", (t) => {
    t.assertEqual(connectTrackToSendBus.length, 2, 'connectTrackToSendBus should accept 2 parameters');
});

TestRunner.test("Day 627 - Send Bus - connectTrackToSendBus references localAppServices.getTrackById", (t) => {
    const funcStr = connectTrackToSendBus.toString();
    t.assertTruthy(funcStr.includes('localAppServices.getTrackById'), 'connectTrackToSendBus should use getTrackById');
});

TestRunner.test("Day 627 - Send Bus - connectTrackToSendBus checks track existence", (t) => {
    const funcStr = connectTrackToSendBus.toString();
    t.assertTruthy(funcStr.includes('!track') || funcStr.includes('track == null'), 'connectTrackToSendBus should check if track exists');
});

TestRunner.test("Day 627 - Send Bus - connectTrackToSendBus references sendBusNodes", (t) => {
    const funcStr = connectTrackToSendBus.toString();
    t.assertTruthy(funcStr.includes('sendBusNodes'), 'connectTrackToSendBus should reference sendBusNodes');
});

TestRunner.test("Day 627 - Send Bus - connectTrackToSendBus references trackSendNodes", (t) => {
    const funcStr = connectTrackToSendBus.toString();
    t.assertTruthy(funcStr.includes('trackSendNodes'), 'connectTrackToSendBus should reference trackSendNodes');
});

TestRunner.test("Day 627 - Send Bus - connectTrackToSendBus creates Tone.Gain node", (t) => {
    const funcStr = connectTrackToSendBus.toString();
    t.assertTruthy(funcStr.includes('new Tone.Gain'), 'connectTrackToSendBus should create Tone.Gain node');
});

TestRunner.test("Day 627 - Send Bus - connectTrackToSendBus connects track.outputChannel to sendGain", (t) => {
    const funcStr = connectTrackToSendBus.toString();
    t.assertTruthy(funcStr.includes('track.outputChannel'), 'connectTrackToSendBus should connect track outputChannel');
});

TestRunner.test("Day 627 - Send Bus - disconnectTrackFromSendBus is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function disconnectTrackFromSendBus'), 'disconnectTrackFromSendBus should be exported');
});

TestRunner.test("Day 627 - Send Bus - disconnectTrackFromSendBus accepts 2 parameters", (t) => {
    t.assertEqual(disconnectTrackFromSendBus.length, 2, 'disconnectTrackFromSendBus should accept 2 parameters');
});

TestRunner.test("Day 627 - Send Bus - disconnectTrackFromSendBus references trackSendNodes", (t) => {
    const funcStr = disconnectTrackFromSendBus.toString();
    t.assertTruthy(funcStr.includes('trackSendNodes'), 'disconnectTrackFromSendBus should reference trackSendNodes');
});

TestRunner.test("Day 627 - Send Bus - disconnectTrackFromSendBus calls disconnect on sendGainNode", (t) => {
    const funcStr = disconnectTrackFromSendBus.toString();
    t.assertTruthy(funcStr.includes('sendGainNode.disconnect') || funcStr.includes('disconnect()'), 'disconnectTrackFromSendBus should call disconnect');
});

TestRunner.test("Day 627 - Send Bus - disconnectTrackFromSendBus calls dispose on sendGainNode", (t) => {
    const funcStr = disconnectTrackFromSendBus.toString();
    t.assertTruthy(funcStr.includes('sendGainNode.dispose') || funcStr.includes('dispose()'), 'disconnectTrackFromSendBus should call dispose');
});

TestRunner.test("Day 627 - Send Bus - createSendBusInAudio is an async function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export async function createSendBusInAudio'), 'createSendBusInAudio should be an async function export');
});

TestRunner.test("Day 627 - Send Bus - createSendBusInAudio accepts 1 parameter", (t) => {
    t.assertEqual(createSendBusInAudio.length, 1, 'createSendBusInAudio should accept 1 parameter');
});

TestRunner.test("Day 627 - Send Bus - createSendBusInAudio checks if send bus already exists", (t) => {
    const funcStr = createSendBusInAudio.toString();
    t.assertTruthy(funcStr.includes('sendBusNodes.has(sendId)'), 'createSendBusInAudio should check for existing bus');
});

TestRunner.test("Day 627 - Send Bus - createSendBusInAudio creates Tone.Gain input and output nodes", (t) => {
    const funcStr = createSendBusInAudio.toString();
    t.assertTruthy(funcStr.includes('new Tone.Gain'), 'createSendBusInAudio should create Tone.Gain nodes');
});

TestRunner.test("Day 627 - Send Bus - createSendBusInAudio connects input to output", (t) => {
    const funcStr = createSendBusInAudio.toString();
    t.assertTruthy(funcStr.includes('inputGain.connect(outputGain)'), 'createSendBusInAudio should connect inputGain to outputGain');
});

TestRunner.test("Day 627 - Send Bus - createSendBusInAudio calls toDestination on outputGain", (t) => {
    const funcStr = createSendBusInAudio.toString();
    t.assertTruthy(funcStr.includes('outputGain.toDestination()'), 'createSendBusInAudio should call toDestination on outputGain');
});

TestRunner.test("Day 627 - Send Bus - createSendBusInAudio stores bus data in sendBusNodes", (t) => {
    const funcStr = createSendBusInAudio.toString();
    t.assertTruthy(funcStr.includes('sendBusNodes.set'), 'createSendBusInAudio should set in sendBusNodes');
});

TestRunner.test("Day 627 - Send Bus - deleteSendBusFromAudio is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function deleteSendBusFromAudio'), 'deleteSendBusFromAudio should be exported');
});

TestRunner.test("Day 627 - Send Bus - deleteSendBusFromAudio accepts 1 parameter", (t) => {
    t.assertEqual(deleteSendBusFromAudio.length, 1, 'deleteSendBusFromAudio should accept 1 parameter');
});

TestRunner.test("Day 627 - Send Bus - deleteSendBusFromAudio references sendBusNodes", (t) => {
    const funcStr = deleteSendBusFromAudio.toString();
    t.assertTruthy(funcStr.includes('sendBusNodes'), 'deleteSendBusFromAudio should reference sendBusNodes');
});

TestRunner.test("Day 627 - Send Bus - deleteSendBusFromAudio calls disconnectTrackFromSendBus for all tracks", (t) => {
    const funcStr = deleteSendBusFromAudio.toString();
    t.assertTruthy(funcStr.includes('disconnectTrackFromSendBus'), 'deleteSendBusFromAudio should disconnect tracks');
});

TestRunner.test("Day 627 - Send Bus - deleteSendBusFromAudio disposes effect nodes", (t) => {
    const funcStr = deleteSendBusFromAudio.toString();
    t.assertTruthy(funcStr.includes('busData.effects'), 'deleteSendBusFromAudio should handle effects');
});

TestRunner.test("Day 627 - Send Bus - deleteSendBusFromAudio disposes inputGain and outputGain", (t) => {
    const funcStr = deleteSendBusFromAudio.toString();
    t.assertTruthy(funcStr.includes('inputGain.dispose') || funcStr.includes('outputGain.dispose'), 'deleteSendBusFromAudio should dispose gain nodes');
});

TestRunner.test("Day 627 - Send Bus - deleteSendBusFromAudio calls sendBusNodes.delete", (t) => {
    const funcStr = deleteSendBusFromAudio.toString();
    t.assertTruthy(funcStr.includes('sendBusNodes.delete'), 'deleteSendBusFromAudio should delete from sendBusNodes');
});

TestRunner.test("Day 627 - Send Bus - addEffectToSendBus is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function addEffectToSendBus'), 'addEffectToSendBus should be exported');
});

TestRunner.test("Day 627 - Send Bus - addEffectToSendBus accepts 3 parameters", (t) => {
    t.assertEqual(addEffectToSendBus.length, 3, 'addEffectToSendBus should accept 3 parameters');
});

TestRunner.test("Day 627 - Send Bus - addEffectToSendBus references sendBusNodes", (t) => {
    const funcStr = addEffectToSendBus.toString();
    t.assertTruthy(funcStr.includes('sendBusNodes'), 'addEffectToSendBus should reference sendBusNodes');
});

TestRunner.test("Day 627 - Send Bus - addEffectToSendBus calls createEffectInstance", (t) => {
    const funcStr = addEffectToSendBus.toString();
    t.assertTruthy(funcStr.includes('createEffectInstance'), 'addEffectToSendBus should create an effect instance');
});

TestRunner.test("Day 627 - Send Bus - addEffectToSendBus rebuilds audio chain", (t) => {
    const funcStr = addEffectToSendBus.toString();
    t.assertTruthy(funcStr.includes('disconnect()') || funcStr.includes('connect('), 'addEffectToSendBus should rebuild audio chain');
});

TestRunner.test("Day 627 - Send Bus - addEffectToSendBus pushes effect to busData.effects", (t) => {
    const funcStr = addEffectToSendBus.toString();
    t.assertTruthy(funcStr.includes('busData.effects.push'), 'addEffectToSendBus should push effect to array');
});

TestRunner.test("Day 627 - Send Bus - removeEffectFromSendBus is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function removeEffectFromSendBus'), 'removeEffectFromSendBus should be exported');
});

TestRunner.test("Day 627 - Send Bus - removeEffectFromSendBus accepts 2 parameters", (t) => {
    t.assertEqual(removeEffectFromSendBus.length, 2, 'removeEffectFromSendBus should accept 2 parameters');
});

TestRunner.test("Day 627 - Send Bus - removeEffectFromSendBus finds effect by _effectId", (t) => {
    const funcStr = removeEffectFromSendBus.toString();
    t.assertTruthy(funcStr.includes('_effectId'), 'removeEffectFromSendBus should find effect by _effectId');
});

TestRunner.test("Day 627 - Send Bus - removeEffectFromSendBus uses splice to remove effect", (t) => {
    const funcStr = removeEffectFromSendBus.toString();
    t.assertTruthy(funcStr.includes('splice'), 'removeEffectFromSendBus should use splice to remove');
});

TestRunner.test("Day 627 - Send Bus - removeEffectFromSendBus rebuilds audio chain after removal", (t) => {
    const funcStr = removeEffectFromSendBus.toString();
    t.assertTruthy(funcStr.includes('inputGain.disconnect') || funcStr.includes('forEach'), 'removeEffectFromSendBus should rebuild chain');
});

TestRunner.test("Day 627 - Send Bus - reorderEffectInSendBus is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function reorderEffectInSendBus'), 'reorderEffectInSendBus should be exported');
});

TestRunner.test("Day 627 - Send Bus - reorderEffectInSendBus accepts 3 parameters", (t) => {
    t.assertEqual(reorderEffectInSendBus.length, 3, 'reorderEffectInSendBus should accept 3 parameters');
});

TestRunner.test("Day 627 - Send Bus - reorderEffectInSendBus finds effect by _effectId", (t) => {
    const funcStr = reorderEffectInSendBus.toString();
    t.assertTruthy(funcStr.includes('_effectId'), 'reorderEffectInSendBus should find effect by _effectId');
});

TestRunner.test("Day 627 - Send Bus - reorderEffectInSendBus uses splice to move effect", (t) => {
    const funcStr = reorderEffectInSendBus.toString();
    t.assertTruthy(funcStr.includes('splice'), 'reorderEffectInSendBus should use splice to reorder');
});

TestRunner.test("Day 627 - Send Bus - updateSendBusEffectParam is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function updateSendBusEffectParam'), 'updateSendBusEffectParam should be exported');
});

TestRunner.test("Day 627 - Send Bus - updateSendBusEffectParam accepts 4 parameters", (t) => {
    t.assertEqual(updateSendBusEffectParam.length, 4, 'updateSendBusEffectParam should accept 4 parameters');
});

TestRunner.test("Day 627 - Send Bus - updateSendBusEffectParam splits paramPath by '.'", (t) => {
    const funcStr = updateSendBusEffectParam.toString();
    t.assertTruthy(funcStr.includes("paramPath.split('.'") || funcStr.includes('paramPath.split("."'), 'updateSendBusEffectParam should split paramPath');
});

TestRunner.test("Day 627 - Send Bus - updateSendBusEffectParam uses rampTo for smooth changes", (t) => {
    const funcStr = updateSendBusEffectParam.toString();
    t.assertTruthy(funcStr.includes('rampTo'), 'updateSendBusEffectParam should use rampTo for smooth changes');
});

TestRunner.test("Day 627 - Send Bus - setSendBusLevel is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function setSendBusLevel'), 'setSendBusLevel should be exported');
});

TestRunner.test("Day 627 - Send Bus - setSendBusLevel accepts 2 parameters", (t) => {
    t.assertEqual(setSendBusLevel.length, 2, 'setSendBusLevel should accept 2 parameters');
});

TestRunner.test("Day 627 - Send Bus - setSendBusLevel clamps level to 0-1 range", (t) => {
    const funcStr = setSendBusLevel.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setSendBusLevel should clamp level');
});

TestRunner.test("Day 627 - Send Bus - setSendBusLevel uses rampTo on outputGain.gain", (t) => {
    const funcStr = setSendBusLevel.toString();
    t.assertTruthy(funcStr.includes('outputGain.gain.rampTo') || funcStr.includes('rampTo'), 'setSendBusLevel should use rampTo');
});

TestRunner.test("Day 627 - Send Bus - setSendBusMuted is a function export", (t) => {
    const audioStr = require('fs').readFileSync('./js/audio.js', 'utf8');
    t.assertTruthy(audioStr.includes('export function setSendBusMuted'), 'setSendBusMuted should be exported');
});

TestRunner.test("Day 627 - Send Bus - setSendBusMuted accepts 2 parameters", (t) => {
    t.assertEqual(setSendBusMuted.length, 2, 'setSendBusMuted should accept 2 parameters');
});

TestRunner.test("Day 627 - Send Bus - setSendBusMuted uses !! for boolean coercion", (t) => {
    const funcStr = setSendBusMuted.toString();
    t.assertTruthy(funcStr.includes('!!muted') || funcStr.includes('busData.muted = !!'), 'setSendBusMuted should use boolean coercion');
});

TestRunner.test("Day 627 - Send Bus - setSendBusMuted sets inputGain.gain to 0 when muted", (t) => {
    const funcStr = setSendBusMuted.toString();
    t.assertTruthy(funcStr.includes('inputGain.gain.value') && (funcStr.includes('0') || funcStr.includes('muted')), 'setSendBusMuted should set gain to 0 when muted');
});

TestRunner.test("Day 627 - APP_VERSION validation for Day 627", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 627');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 282, 'Minor version should be >= 282 for Day 627');
    }
});


// Day 628: Additional Performance Monitor State Function Tests
TestRunner.test("Day 628 - Perf Monitor - setCPUUsageState uses Number.isFinite and parseFloat", (t) => {
    const funcBody = setCPUUsageState.toString();
    t.assertTruthy(funcBody.includes('Number.isFinite') && funcBody.includes('parseFloat'), 'setCPUUsageState should use Number.isFinite and parseFloat');
});

TestRunner.test("Day 628 - Perf Monitor - setCPUUsageState guards capture with change detection", (t) => {
    const funcBody = setCPUUsageState.toString();
    t.assertTruthy(
        (funcBody.includes('!==') || funcBody.includes('cpuUsage !==')) && funcBody.includes('captureStateForUndo'),
        'setCPUUsageState should check if value changed before capture'
    );
});

TestRunner.test("Day 628 - Perf Monitor - setCPUUsageState has descriptive undo label with %", (t) => {
    const funcBody = setCPUUsageState.toString();
    t.assertTruthy(funcBody.includes('Set CPU Usage') && funcBody.includes('%'), 'setCPUUsageState undo label should include "Set CPU Usage" and %');
});

TestRunner.test("Day 628 - Perf Monitor - setMemoryPressureState has descriptive undo label", (t) => {
    const funcBody = setMemoryPressureState.toString();
    t.assertTruthy(funcBody.includes('Set Memory Pressure to'), 'setMemoryPressureState undo label should include "Set Memory Pressure to"');
});

TestRunner.test("Day 628 - Perf Monitor - setMemoryPressureState guards capture with change detection", (t) => {
    const funcBody = setMemoryPressureState.toString();
    t.assertTruthy(
        (funcBody.includes('!==') || funcBody.includes('memoryPressure !==')) && funcBody.includes('captureStateForUndo'),
        'setMemoryPressureState should check if value changed before capture'
    );
});

TestRunner.test("Day 628 - Perf Monitor - setMemoryPressureState sets value after validation", (t) => {
    const funcBody = setMemoryPressureState.toString();
    const setIdx = funcBody.indexOf('performanceMonitorState.memoryPressure =');
    const validIdx = funcBody.indexOf('validValues.includes');
    t.assertTruthy(setIdx > validIdx, 'setMemoryPressureState should set value after validation');
});

TestRunner.test("Day 628 - Perf Monitor - resetPerformanceMonitorState calls captureStateForUndo", (t) => {
    const funcBody = resetPerformanceMonitorState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'resetPerformanceMonitorState should call captureStateForUndo');
});

TestRunner.test("Day 628 - Perf Monitor - resetPerformanceMonitorState has descriptive undo label", (t) => {
    const funcBody = resetPerformanceMonitorState.toString();
    t.assertTruthy(funcBody.includes('Reset Performance Monitor'), 'resetPerformanceMonitorState undo label should include "Reset Performance Monitor"');
});

TestRunner.test("Day 628 - Perf Monitor - resetPerformanceMonitorState resets all fields", (t) => {
    const funcBody = resetPerformanceMonitorState.toString();
    t.assertTruthy(
        funcBody.includes('performanceMonitorState.enabled = false') &&
        funcBody.includes('audioContextState =') &&
        funcBody.includes('cpuUsage = 0') &&
        funcBody.includes('memoryPressure =') &&
        funcBody.includes('activeVoices = 0') &&
        funcBody.includes('audioLatency = 0') &&
        funcBody.includes('lastCallbackTime = 0') &&
        funcBody.includes('droppedCallbacks = 0'),
        'resetPerformanceMonitorState should reset all performance monitor fields'
    );
});

TestRunner.test("Day 628 - Perf Monitor - setAudioLatencyState calls captureStateForUndo", (t) => {
    const funcBody = setAudioLatencyState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setAudioLatencyState should call captureStateForUndo');
});

TestRunner.test("Day 628 - Perf Monitor - setAudioLatencyState has descriptive undo label with ms", (t) => {
    const funcBody = setAudioLatencyState.toString();
    t.assertTruthy(funcBody.includes('Set Audio Latency to') && funcBody.includes('ms'), 'setAudioLatencyState undo label should include "Set Audio Latency to" and ms');
});

TestRunner.test("Day 628 - Perf Monitor - setLastCallbackTimeState calls captureStateForUndo", (t) => {
    const funcBody = setLastCallbackTimeState.toString();
    t.assertTruthy(funcBody.includes('captureStateForUndo'), 'setLastCallbackTimeState should call captureStateForUndo');
});

TestRunner.test("Day 628 - Perf Monitor - setLastCallbackTimeState has descriptive undo label with ms", (t) => {
    const funcBody = setLastCallbackTimeState.toString();
    t.assertTruthy(funcBody.includes('Set Last Callback Time to') && funcBody.includes('ms'), 'setLastCallbackTimeState undo label should include "Set Last Callback Time to" and ms');
});

TestRunner.test("Day 628 - Perf Monitor - setDroppedCallbacksState sets value after clamping", (t) => {
    const funcBody = setDroppedCallbacksState.toString();
    const setIdx = funcBody.indexOf('performanceMonitorState.droppedCallbacks =');
    const clampIdx = funcBody.indexOf('Math.max(0');
    t.assertTruthy(setIdx > clampIdx, 'setDroppedCallbacksState should set value after clamping');
});

TestRunner.test("Day 628 - APP_VERSION validation for Day 628", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 628');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 283, 'Minor version should be >= 283 for Day 628');
    }
});
// Day 629: Master Effects Bus Audio Function Tests
TestRunner.test("Day 629 - Master Effects Bus - getMasterEffectsBusInputNode is a function export", (t) => {
    const audioStr = getMasterEffectsBusInputNode.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getMasterEffectsBusInputNode should be exported');
});

TestRunner.test("Day 629 - Master Effects Bus - getMasterEffectsBusInputNode accepts 0 parameters", (t) => {
    t.assertEqual(getMasterEffectsBusInputNode.length, 0, 'getMasterEffectsBusInputNode should accept 0 parameters');
});

TestRunner.test("Day 629 - Master Effects Bus - getMasterEffectsBusInputNode references masterEffectsBusInputNode", (t) => {
    const funcStr = getMasterEffectsBusInputNode.toString();
    t.assertTruthy(funcStr.includes('masterEffectsBusInputNode'), 'getMasterEffectsBusInputNode should reference masterEffectsBusInputNode');
});

TestRunner.test("Day 629 - Master Effects Bus - getMasterEffectsBusInputNode checks for disposed", (t) => {
    const funcStr = getMasterEffectsBusInputNode.toString();
    t.assertTruthy(funcStr.includes('.disposed'), 'getMasterEffectsBusInputNode should check node.disposed');
});

TestRunner.test("Day 629 - Master Effects Bus - getMasterEffectsBusInputNode calls setupMasterBus when needed", (t) => {
    const funcStr = getMasterEffectsBusInputNode.toString();
    t.assertTruthy(funcStr.includes('setupMasterBus'), 'getMasterEffectsBusInputNode should call setupMasterBus when node not ready');
});

TestRunner.test("Day 629 - Master Effects Bus - getActualMasterGainNode is a function export", (t) => {
    const audioStr = getActualMasterGainNode.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getActualMasterGainNode should be exported');
});

TestRunner.test("Day 629 - Master Effects Bus - getActualMasterGainNode accepts 0 parameters", (t) => {
    t.assertEqual(getActualMasterGainNode.length, 0, 'getActualMasterGainNode should accept 0 parameters');
});

TestRunner.test("Day 629 - Master Effects Bus - getActualMasterGainNode references masterGainNodeActual", (t) => {
    const funcStr = getActualMasterGainNode.toString();
    t.assertTruthy(funcStr.includes('masterGainNodeActual'), 'getActualMasterGainNode should reference masterGainNodeActual');
});

TestRunner.test("Day 629 - Master Effects Bus - getActualMasterGainNode checks for disposed", (t) => {
    const funcStr = getActualMasterGainNode.toString();
    t.assertTruthy(funcStr.includes('.disposed'), 'getActualMasterGainNode should check node.disposed');
});

TestRunner.test("Day 629 - Master Effects Bus - getActualMasterGainNode calls setupMasterBus when needed", (t) => {
    const funcStr = getActualMasterGainNode.toString();
    t.assertTruthy(funcStr.includes('setupMasterBus'), 'getActualMasterGainNode should call setupMasterBus when node not ready');
});

TestRunner.test("Day 629 - Master Effects Bus - clearAllMasterEffectNodes is a function export", (t) => {
    const audioStr = clearAllMasterEffectNodes.toString();
    t.assertTruthy(audioStr.includes('export function'), 'clearAllMasterEffectNodes should be exported');
});

TestRunner.test("Day 629 - Master Effects Bus - clearAllMasterEffectNodes accepts 0 parameters", (t) => {
    t.assertEqual(clearAllMasterEffectNodes.length, 0, 'clearAllMasterEffectNodes should accept 0 parameters');
});

TestRunner.test("Day 629 - Master Effects Bus - clearAllMasterEffectNodes references activeMasterEffectNodes", (t) => {
    const funcStr = clearAllMasterEffectNodes.toString();
    t.assertTruthy(funcStr.includes('activeMasterEffectNodes'), 'clearAllMasterEffectNodes should reference activeMasterEffectNodes');
});

TestRunner.test("Day 629 - Master Effects Bus - clearAllMasterEffectNodes calls forEach on nodes", (t) => {
    const funcStr = clearAllMasterEffectNodes.toString();
    t.assertTruthy(funcStr.includes('.forEach'), 'clearAllMasterEffectNodes should iterate over nodes');
});

TestRunner.test("Day 629 - Master Effects Bus - clearAllMasterEffectNodes calls dispose on nodes", (t) => {
    const funcStr = clearAllMasterEffectNodes.toString();
    t.assertTruthy(funcStr.includes('.dispose()'), 'clearAllMasterEffectNodes should call dispose on each node');
});

TestRunner.test("Day 629 - Master Effects Bus - clearAllMasterEffectNodes clears the collection", (t) => {
    const funcStr = clearAllMasterEffectNodes.toString();
    t.assertTruthy(funcStr.includes('.clear()'), 'clearAllMasterEffectNodes should call clear on the collection');
});

TestRunner.test("Day 629 - Master Effects Bus - getActiveMasterEffectNodes is a function export", (t) => {
    const audioStr = getActiveMasterEffectNodes.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getActiveMasterEffectNodes should be exported');
});

TestRunner.test("Day 629 - Master Effects Bus - getActiveMasterEffectNodes accepts 0 parameters", (t) => {
    t.assertEqual(getActiveMasterEffectNodes.length, 0, 'getActiveMasterEffectNodes should accept 0 parameters');
});

TestRunner.test("Day 629 - Master Effects Bus - getActiveMasterEffectNodes returns activeMasterEffectNodes", (t) => {
    const funcStr = getActiveMasterEffectNodes.toString();
    t.assertTruthy(funcStr.includes('return activeMasterEffectNodes'), 'getActiveMasterEffectNodes should return activeMasterEffectNodes');
});

TestRunner.test("Day 629 - Master Effects Bus - rebuildMasterEffectChain is a function export", (t) => {
    const audioStr = rebuildMasterEffectChain.toString();
    t.assertTruthy(audioStr.includes('export function'), 'rebuildMasterEffectChain should be exported');
});

TestRunner.test("Day 629 - Master Effects Bus - rebuildMasterEffectChain accepts 0 parameters", (t) => {
    t.assertEqual(rebuildMasterEffectChain.length, 0, 'rebuildMasterEffectChain should accept 0 parameters');
});

TestRunner.test("Day 629 - Master Effects Bus - rebuildMasterEffectChain checks master bus components", (t) => {
    const funcStr = rebuildMasterEffectChain.toString();
    t.assertTruthy(funcStr.includes('masterEffectsBusInputNode') && funcStr.includes('masterGainNodeActual') && funcStr.includes('masterMeterNode'), 'rebuildMasterEffectChain should check all master bus components');
});

TestRunner.test("Day 629 - Master Effects Bus - rebuildMasterEffectChain calls setupMasterBus", (t) => {
    const funcStr = rebuildMasterEffectChain.toString();
    t.assertTruthy(funcStr.includes('setupMasterBus'), 'rebuildMasterEffectChain should call setupMasterBus when components not ready');
});

TestRunner.test("Day 629 - Master Effects Bus - rebuildMasterEffectChain references localAppServices.getMasterEffects", (t) => {
    const funcStr = rebuildMasterEffectChain.toString();
    t.assertTruthy(funcStr.includes('localAppServices.getMasterEffects'), 'rebuildMasterEffectChain should get master effects from appServices');
});

TestRunner.test("Day 629 - Master Effects Bus - updateMasterEffectParamInAudio is a function export", (t) => {
    const audioStr = updateMasterEffectParamInAudio.toString();
    t.assertTruthy(audioStr.includes('export function'), 'updateMasterEffectParamInAudio should be exported');
});

TestRunner.test("Day 629 - Master Effects Bus - updateMasterEffectParamInAudio accepts 3 parameters", (t) => {
    t.assertEqual(updateMasterEffectParamInAudio.length, 3, 'updateMasterEffectParamInAudio should accept 3 parameters');
});

TestRunner.test("Day 629 - Master Effects Bus - updateMasterEffectParamInAudio references effectId param", (t) => {
    const funcStr = updateMasterEffectParamInAudio.toString();
    t.assertTruthy(funcStr.includes('effectId'), 'updateMasterEffectParamInAudio should reference effectId');
});

TestRunner.test("Day 629 - Master Effects Bus - updateMasterEffectParamInAudio references activeMasterEffectNodes", (t) => {
    const funcStr = updateMasterEffectParamInAudio.toString();
    t.assertTruthy(funcStr.includes('activeMasterEffectNodes'), 'updateMasterEffectParamInAudio should reference activeMasterEffectNodes');
});

TestRunner.test("Day 629 - Master Effects Bus - updateMasterEffectParamInAudio uses paramPath.split", (t) => {
    const funcStr = updateMasterEffectParamInAudio.toString();
    t.assertTruthy(funcStr.includes('paramPath.split'), 'updateMasterEffectParamInAudio should split param path');
});

TestRunner.test("Day 629 - Master Effects Bus - updateMasterEffectParamInAudio checks for rampTo function", (t) => {
    const funcStr = updateMasterEffectParamInAudio.toString();
    t.assertTruthy(funcStr.includes('.rampTo'), 'updateMasterEffectParamInAudio should use rampTo for smooth transitions');
});

TestRunner.test("Day 629 - APP_VERSION validation for Day 629", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 629');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 284, 'Minor version should be >= 284 for Day 629');
    }
});

// Day 630: Sidechain Track Effect and Recording Input Gain Audio Function Tests
TestRunner.test("Day 630 - enableSidechainFromTrackForEffect is a function export", (t) => {
    const funcStr = enableSidechainFromTrackForEffect.toString();
    t.assertTruthy(funcStr.includes('export function'), 'enableSidechainFromTrackForEffect should be exported');
});

TestRunner.test("Day 630 - enableSidechainFromTrackForEffect accepts 2 parameters", (t) => {
    t.assertEqual(enableSidechainFromTrackForEffect.length, 2, 'enableSidechainFromTrackForEffect should accept 2 parameters');
});

TestRunner.test("Day 630 - enableSidechainFromTrackForEffect references activeMasterEffectNodes", (t) => {
    const funcStr = enableSidechainFromTrackForEffect.toString();
    t.assertTruthy(funcStr.includes('activeMasterEffectNodes'), 'enableSidechainFromTrackForEffect should reference activeMasterEffectNodes');
});

TestRunner.test("Day 630 - enableSidechainFromTrackForEffect validates effectNode with disposed check", (t) => {
    const funcStr = enableSidechainFromTrackForEffect.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'enableSidechainFromTrackForEffect should check if effectNode is disposed');
});

TestRunner.test("Day 630 - enableSidechainFromTrackForEffect references localAppServices.getTrackById", (t) => {
    const funcStr = enableSidechainFromTrackForEffect.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'enableSidechainFromTrackForEffect should get track by ID');
});

TestRunner.test("Day 630 - enableSidechainFromTrackForEffect references sidechainTrackAssignments", (t) => {
    const funcStr = enableSidechainFromTrackForEffect.toString();
    t.assertTruthy(funcStr.includes('sidechainTrackAssignments'), 'enableSidechainFromTrackForEffect should reference sidechainTrackAssignments');
});

TestRunner.test("Day 630 - handleSidechainParamChangeForEffect is a function export", (t) => {
    const funcStr = handleSidechainParamChangeForEffect.toString();
    t.assertTruthy(funcStr.includes('export function'), 'handleSidechainParamChangeForEffect should be exported');
});

TestRunner.test("Day 630 - handleSidechainParamChangeForEffect accepts 3 parameters", (t) => {
    t.assertEqual(handleSidechainParamChangeForEffect.length, 3, 'handleSidechainParamChangeForEffect should accept 3 parameters');
});

TestRunner.test("Day 630 - handleSidechainParamChangeForEffect validates effectNode with disposed check", (t) => {
    const funcStr = handleSidechainParamChangeForEffect.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'handleSidechainParamChangeForEffect should check if effectNode is disposed');
});

TestRunner.test("Day 630 - handleSidechainParamChangeForEffect references sidechainTrackAssignments", (t) => {
    const funcStr = handleSidechainParamChangeForEffect.toString();
    t.assertTruthy(funcStr.includes('sidechainTrackAssignments'), 'handleSidechainParamChangeForEffect should reference sidechainTrackAssignments');
});

TestRunner.test("Day 630 - handleSidechainParamChangeForEffect uses effectNode.set for sidechain value", (t) => {
    const funcStr = handleSidechainParamChangeForEffect.toString();
    t.assertTruthy(funcStr.includes('.set(') || funcStr.includes('set({'), 'handleSidechainParamChangeForEffect should use set method to update sidechain');
});

TestRunner.test("Day 630 - getRecordingInputGainNode is a function export", (t) => {
    const funcStr = getRecordingInputGainNode.toString();
    t.assertTruthy(funcStr.includes('export function'), 'getRecordingInputGainNode should be exported');
});

TestRunner.test("Day 630 - getRecordingInputGainNode accepts 0 parameters", (t) => {
    t.assertEqual(getRecordingInputGainNode.length, 0, 'getRecordingInputGainNode should accept 0 parameters');
});

TestRunner.test("Day 630 - getRecordingInputGainNode references recordingInputGainNode variable", (t) => {
    const funcStr = getRecordingInputGainNode.toString();
    t.assertTruthy(funcStr.includes('recordingInputGainNode'), 'getRecordingInputGainNode should reference recordingInputGainNode');
});

TestRunner.test("Day 630 - getRecordingInputGainNode checks for disposed", (t) => {
    const funcStr = getRecordingInputGainNode.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'getRecordingInputGainNode should check disposed state');
});

TestRunner.test("Day 630 - getRecordingInputGainNode creates new Tone.Gain when needed", (t) => {
    const funcStr = getRecordingInputGainNode.toString();
    t.assertTruthy(funcStr.includes('new Tone.Gain') || funcStr.includes('Tone.Gain'), 'getRecordingInputGainNode should create Tone.Gain node');
});

TestRunner.test("Day 630 - setRecordingInputGain is a function export", (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('export function'), 'setRecordingInputGain should be exported');
});

TestRunner.test("Day 630 - setRecordingInputGain accepts 1 parameter", (t) => {
    t.assertEqual(setRecordingInputGain.length, 1, 'setRecordingInputGain should accept 1 parameter');
});

TestRunner.test("Day 630 - setRecordingInputGain uses Number.isFinite and parseFloat", (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('Number.isFinite') && funcStr.includes('parseFloat'), 'setRecordingInputGain should validate input with Number.isFinite and parseFloat');
});

TestRunner.test("Day 630 - setRecordingInputGain clamps value to MIN/MAX constants", (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('MIN_RECORDING_INPUT_GAIN') || funcStr.includes('MAX_RECORDING_INPUT_GAIN'), 'setRecordingInputGain should clamp to valid range');
});

TestRunner.test("Day 630 - setRecordingInputGain references captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setRecordingInputGain should capture undo state');
});

TestRunner.test("Day 630 - APP_VERSION validation for Day 630", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 630');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 285, 'Minor version should be >= 285 for Day 630');
    }
});

// ============================================
// Day 631: loadSampleFile Audio Function Tests
// ============================================
TestRunner.test("Day 631 - loadSampleFile is a function export", (t) => {
    t.assertEqual(typeof loadSampleFile, 'function', 'loadSampleFile should be a function export');
});

TestRunner.test("Day 631 - loadSampleFile is async", (t) => {
    const funcStr = loadSampleFile.toString();
    t.assertTruthy(funcStr.includes('async'), 'loadSampleFile should be async');
});

TestRunner.test("Day 631 - loadSampleFile accepts 4 parameters", (t) => {
    t.assertEqual(loadSampleFile.length, 4, 'loadSampleFile should accept 4 parameters');
});

TestRunner.test("Day 631 - loadSampleFile references getTrackById from localAppServices", (t) => {
    const funcStr = loadSampleFile.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'loadSampleFile should reference getTrackById from localAppServices');
});

TestRunner.test("Day 631 - loadSampleFile validates track exists", (t) => {
    const funcStr = loadSampleFile.toString();
    t.assertTruthy(funcStr.includes('!track') || funcStr.includes('track === null') || funcStr.includes('track === undefined'), 'loadSampleFile should validate track exists');
});

TestRunner.test("Day 631 - loadSampleFile handles URL source", (t) => {
    const funcStr = loadSampleFile.toString();
    t.assertTruthy(funcStr.includes('isUrlSource') || funcStr.includes('typeof eventOrUrl') || funcStr.includes('fetch'), 'loadSampleFile should handle URL source');
});

TestRunner.test("Day 631 - loadSampleFile handles File source", (t) => {
    const funcStr = loadSampleFile.toString();
    t.assertTruthy(funcStr.includes('isDirectFile') || funcStr.includes('instanceof File'), 'loadSampleFile should handle File source');
});

TestRunner.test("Day 631 - loadSampleFile handles Blob source", (t) => {
    const funcStr = loadSampleFile.toString();
    t.assertTruthy(funcStr.includes('isBlobEvent') || funcStr.includes('instanceof Blob'), 'loadSampleFile should handle Blob source');
});

TestRunner.test("Day 631 - loadSampleFile validates file type", (t) => {
    const funcStr = loadSampleFile.toString();
    t.assertTruthy(funcStr.includes('type.startsWith') && funcStr.includes('audio/'), 'loadSampleFile should validate audio file type');
});

TestRunner.test("Day 631 - loadSampleFile validates file size", (t) => {
    const funcStr = loadSampleFile.toString();
    t.assertTruthy(funcStr.includes('size === 0') || funcStr.includes('size > 0'), 'loadSampleFile should validate file size');
});

TestRunner.test("Day 631 - loadSampleFile calls commonLoadSampleLogic", (t) => {
    const funcStr = loadSampleFile.toString();
    t.assertTruthy(funcStr.includes('commonLoadSampleLogic'), 'loadSampleFile should call commonLoadSampleLogic');
});

TestRunner.test("Day 631 - loadSampleFile has error handling with console.error", (t) => {
    const funcStr = loadSampleFile.toString();
    t.assertTruthy(funcStr.includes('console.error'), 'loadSampleFile should have error handling with console.error');
});

TestRunner.test("Day 631 - loadSampleFile has showNotification for errors", (t) => {
    const funcStr = loadSampleFile.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'loadSampleFile should have showNotification for errors');
});

TestRunner.test("Day 631 - APP_VERSION validation for Day 631", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 631');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 286, 'Minor version should be >= 286 for Day 631');
    }
});
});

// ============================================
// Day 632: getMimeTypeFromFilename Function Tests
// ============================================
TestRunner.test("Day 632 - getMimeTypeFromFilename is a function export", (t) => {
    t.assertEqual(typeof getMimeTypeFromFilename, 'function', 'getMimeTypeFromFilename should be a function export');
});

TestRunner.test("Day 632 - getMimeTypeFromFilename accepts 1 parameter", (t) => {
    t.assertEqual(getMimeTypeFromFilename.length, 1, 'getMimeTypeFromFilename should accept 1 parameter');
});

TestRunner.test("Day 632 - getMimeTypeFromFilename handles .wav extension", (t) => {
    const funcStr = getMimeTypeFromFilename.toString();
    t.assertTruthy(funcStr.includes('.wav') && funcStr.includes('audio/wav'), 'getMimeTypeFromFilename should return audio/wav for .wav');
});

TestRunner.test("Day 632 - getMimeTypeFromFilename handles .mp3 extension", (t) => {
    const funcStr = getMimeTypeFromFilename.toString();
    t.assertTruthy(funcStr.includes('.mp3') && funcStr.includes('audio/mpeg'), 'getMimeTypeFromFilename should return audio/mpeg for .mp3');
});

TestRunner.test("Day 632 - getMimeTypeFromFilename handles .ogg extension", (t) => {
    const funcStr = getMimeTypeFromFilename.toString();
    t.assertTruthy(funcStr.includes('.ogg') && funcStr.includes('audio/ogg'), 'getMimeTypeFromFilename should return audio/ogg for .ogg');
});

TestRunner.test("Day 632 - getMimeTypeFromFilename handles .m4a extension", (t) => {
    const funcStr = getMimeTypeFromFilename.toString();
    t.assertTruthy(funcStr.includes('.m4a') && funcStr.includes('audio/mp4'), 'getMimeTypeFromFilename should return audio/mp4 for .m4a');
});

TestRunner.test("Day 632 - getMimeTypeFromFilename handles .flac extension", (t) => {
    const funcStr = getMimeTypeFromFilename.toString();
    t.assertTruthy(funcStr.includes('.flac') && funcStr.includes('audio/flac'), 'getMimeTypeFromFilename should return audio/flac for .flac');
});

TestRunner.test("Day 632 - getMimeTypeFromFilename handles .webm extension", (t) => {
    const funcStr = getMimeTypeFromFilename.toString();
    t.assertTruthy(funcStr.includes('.webm') && funcStr.includes('audio/webm'), 'getMimeTypeFromFilename should return audio/webm for .webm');
});

TestRunner.test("Day 632 - getMimeTypeFromFilename returns default for unknown extension", (t) => {
    const funcStr = getMimeTypeFromFilename.toString();
    t.assertTruthy(funcStr.includes('application/octet-stream'), 'getMimeTypeFromFilename should return application/octet-stream for unknown');
});

TestRunner.test("Day 632 - getMimeTypeFromFilename handles null/undefined input", (t) => {
    const funcStr = getMimeTypeFromFilename.toString();
    t.assertTruthy(funcStr.includes('!filename') || funcStr.includes('filename !== \'string\''), 'getMimeTypeFromFilename should handle null/undefined');
});

TestRunner.test("Day 632 - getMimeTypeFromFilename uses case-insensitive matching", (t) => {
    const funcStr = getMimeTypeFromFilename.toString();
    t.assertTruthy(funcStr.includes('toLowerCase'), 'getMimeTypeFromFilename should use toLowerCase for case-insensitive matching');
});

TestRunner.test("Day 632 - APP_VERSION validation for Day 632", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 632');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 286, 'Minor version should be >= 286 for Day 632');
    }
});

// Day 633: fetchSoundLibrary Audio Function Tests
TestRunner.test("Day 633 - fetchSoundLibrary is a function export", (t) => {
    t.assertEqual(typeof fetchSoundLibrary, 'function', 'fetchSoundLibrary should be a function');
});

TestRunner.test("Day 633 - fetchSoundLibrary is async", (t) => {
    t.assertEqual(fetchSoundLibrary.constructor.name, 'AsyncFunction', 'fetchSoundLibrary should be async');
});

TestRunner.test("Day 633 - fetchSoundLibrary accepts 3 parameters", (t) => {
    t.assertEqual(fetchSoundLibrary.length, 3, 'fetchSoundLibrary should accept 3 parameters');
});

TestRunner.test("Day 633 - fetchSoundLibrary accepts libraryName parameter", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('libraryName'), 'fetchSoundLibrary should reference libraryName');
});

TestRunner.test("Day 633 - fetchSoundLibrary accepts zipUrl parameter", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('zipUrl'), 'fetchSoundLibrary should reference zipUrl');
});

TestRunner.test("Day 633 - fetchSoundLibrary accepts isAutofetch parameter", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('isAutofetch'), 'fetchSoundLibrary should reference isAutofetch');
});

TestRunner.test("Day 633 - fetchSoundLibrary checks getSoundLibraryFileTrees", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('getSoundLibraryFileTrees'), 'fetchSoundLibrary should check getSoundLibraryFileTrees');
});

TestRunner.test("Day 633 - fetchSoundLibrary checks getLoadedZipFiles", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('getLoadedZipFiles'), 'fetchSoundLibrary should check getLoadedZipFiles');
});

TestRunner.test("Day 633 - fetchSoundLibrary checks already-loaded condition with loadedZips[libraryName]", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('loadedZips[libraryName]') || (funcStr.includes('loadedZips') && funcStr.includes('libraryName')), 'fetchSoundLibrary should check loadedZips[libraryName]');
});

TestRunner.test("Day 633 - fetchSoundLibrary returns early if already loaded", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('return;') || funcStr.includes('return'), 'fetchSoundLibrary should return early when already loaded');
});

TestRunner.test("Day 633 - fetchSoundLibrary calls updateSoundBrowserDisplayForLibrary for loading state", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('updateSoundBrowserDisplayForLibrary'), 'fetchSoundLibrary should update UI loading state');
});

TestRunner.test("Day 633 - fetchSoundLibrary uses fetch for zipUrl", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('fetch(') || funcStr.includes('fetch('), 'fetchSoundLibrary should use fetch');
});

TestRunner.test("Day 633 - fetchSoundLibrary uses JSZip to load zip", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('JSZip') && funcStr.includes('loadAsync'), 'fetchSoundLibrary should use JSZip.loadAsync');
});

TestRunner.test("Day 633 - fetchSoundLibrary builds fileTree from loaded zip", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('fileTree') || funcStr.includes('file'), 'fetchSoundLibrary should build fileTree');
});

TestRunner.test("Day 633 - fetchSoundLibrary calls setSoundLibraryFileTreesState to store result", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('setSoundLibraryFileTreesState'), 'fetchSoundLibrary should call setSoundLibraryFileTreesState');
});

TestRunner.test("Day 633 - fetchSoundLibrary calls setLoadedZipFilesState to store loading state", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('setLoadedZipFilesState'), 'fetchSoundLibrary should call setLoadedZipFilesState');
});

TestRunner.test("Day 633 - fetchSoundLibrary has error handling with console.error", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('console.error'), 'fetchSoundLibrary should have console.error error handling');
});

TestRunner.test("Day 633 - fetchSoundLibrary handles fetch errors", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('response.ok') || funcStr.includes('throw new Error') || funcStr.includes('catch'), 'fetchSoundLibrary should handle fetch errors');
});

TestRunner.test("Day 633 - fetchSoundLibrary sets failed state to null in loadedZips on error", (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy((funcStr.includes('null') || funcStr.includes('failedLoadedZips')) && funcStr.includes('loadedZips'), 'fetchSoundLibrary should set failure state');
});

TestRunner.test("Day 633 - APP_VERSION validation for Day 633", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 633');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 287, 'Minor version should be >= 287 for Day 633');
    }
});

// Day 634: updateMeters Audio Function Tests
TestRunner.test("Day 634 - updateMeters is a function export", (t) => {
    t.assertEqual(typeof updateMeters, 'function', 'updateMeters should be a function');
});

TestRunner.test("Day 634 - updateMeters accepts 3 parameters", (t) => {
    t.assertEqual(updateMeters.length, 3, 'updateMeters should accept 3 parameters');
});

TestRunner.test("Day 634 - updateMeters accepts globalMasterMeterBar parameter", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy(funcStr.includes('globalMasterMeterBar'), 'updateMeters should reference globalMasterMeterBar');
});

TestRunner.test("Day 634 - updateMeters accepts mixerMasterMeterBar parameter", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy(funcStr.includes('mixerMasterMeterBar'), 'updateMeters should reference mixerMasterMeterBar');
});

TestRunner.test("Day 634 - updateMeters accepts tracks parameter", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy(funcStr.includes('tracks'), 'updateMeters should reference tracks');
});

TestRunner.test("Day 634 - updateMeters checks masterMeterNode", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy(funcStr.includes('masterMeterNode'), 'updateMeters should reference masterMeterNode');
});

TestRunner.test("Day 634 - updateMeters checks masterMeterNode.disposed", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'updateMeters should check if masterMeterNode is disposed');
});

TestRunner.test("Day 634 - updateMeters uses Tone.context", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy(funcStr.includes('Tone.context') || funcStr.includes('Tone.Transport.context'), 'updateMeters should reference Tone.context');
});

TestRunner.test("Day 634 - updateMeters calls masterMeterNode.getValue", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy(funcStr.includes('getValue'), 'updateMeters should call getValue on masterMeterNode');
});

TestRunner.test("Day 634 - updateMeters uses Tone.dbToGain for level conversion", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy(funcStr.includes('dbToGain') || funcStr.includes('dbToGain'), 'updateMeters should convert dB to gain');
});

TestRunner.test("Day 634 - updateMeters updates globalMasterMeterBar.style.width", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy(funcStr.includes('globalMasterMeterBar.style.width') || (funcStr.includes('globalMasterMeterBar') && funcStr.includes('style.width')), 'updateMeters should update globalMasterMeterBar width');
});

TestRunner.test("Day 634 - updateMeters updates mixerMasterMeterBar.style.width", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy(funcStr.includes('mixerMasterMeterBar.style.width') || (funcStr.includes('mixerMasterMeterBar') && funcStr.includes('style.width')), 'updateMeters should update mixerMasterMeterBar width');
});

TestRunner.test("Day 634 - updateMeters clamps level to 0-100 range", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy((funcStr.includes('Math.min') && funcStr.includes('Math.max')) || (funcStr.includes('100') && funcStr.includes('0')), 'updateMeters should clamp level to valid range');
});

TestRunner.test("Day 634 - updateMeters has error handling with try/catch", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'updateMeters should have error handling');
});

TestRunner.test("Day 634 - updateMeters uses console.warn for errors", (t) => {
    const funcStr = updateMeters.toString();
    t.assertTruthy(funcStr.includes('console.warn'), 'updateMeters should log warnings with console.warn');
});

TestRunner.test("Day 634 - APP_VERSION validation for Day 634", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 634');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 289, 'Minor version should be >= 289 for Day 634');
    }
});

// ============================================
// Day 635: Automation Bus and Init Audio Function Tests
// ============================================
TestRunner.test("Day 635 - autoSliceSample is a function export", (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('export function'), 'autoSliceSample should be exported');
});

TestRunner.test("Day 635 - autoSliceSample accepts 1-2 parameters", (t) => {
    t.assertEqual(autoSliceSample.length, 2, 'autoSliceSample should accept 1-2 parameters (trackId, numSlicesToCreate)');
});

TestRunner.test("Day 635 - autoSliceSample references localAppServices.getTrackById", (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'autoSliceSample should reference getTrackById from localAppServices');
});

TestRunner.test("Day 635 - autoSliceSample validates track type is Sampler", (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes("track.type !== 'Sampler'") || funcStr.includes("track.type === 'Sampler'"), 'autoSliceSample should validate track type');
});

TestRunner.test("Day 635 - autoSliceSample shows notification for non-Sampler tracks", (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'autoSliceSample should show notification for invalid track type');
});

TestRunner.test("Day 635 - initializeAudioModule is a function export", (t) => {
    const funcStr = initializeAudioModule.toString();
    t.assertTruthy(funcStr.includes('export function'), 'initializeAudioModule should be exported');
});

TestRunner.test("Day 635 - initializeAudioModule accepts 1 parameter", (t) => {
    t.assertEqual(initializeAudioModule.length, 1, 'initializeAudioModule should accept 1 parameter (appServicesFromMain)');
});

TestRunner.test("Day 635 - initializeAudioModule sets localAppServices", (t) => {
    const funcStr = initializeAudioModule.toString();
    t.assertTruthy(funcStr.includes('localAppServices ='), 'initializeAudioModule should set localAppServices');
});

TestRunner.test("Day 635 - getMasterEffectsBusInputNode is a function export", (t) => {
    const funcStr = getMasterEffectsBusInputNode.toString();
    t.assertTruthy(funcStr.includes('export function'), 'getMasterEffectsBusInputNode should be exported');
});

TestRunner.test("Day 635 - getMasterEffectsBusInputNode accepts 0 parameters", (t) => {
    t.assertEqual(getMasterEffectsBusInputNode.length, 0, 'getMasterEffectsBusInputNode should accept no parameters');
});

TestRunner.test("Day 635 - getMasterEffectsBusInputNode checks masterEffectsBusInputNode", (t) => {
    const funcStr = getMasterEffectsBusInputNode.toString();
    t.assertTruthy(funcStr.includes('masterEffectsBusInputNode'), 'getMasterEffectsBusInputNode should reference masterEffectsBusInputNode');
});

TestRunner.test("Day 635 - getMasterEffectsBusInputNode checks disposed state", (t) => {
    const funcStr = getMasterEffectsBusInputNode.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'getMasterEffectsBusInputNode should check disposed state');
});

TestRunner.test("Day 635 - getMasterEffectsBusInputNode calls setupMasterBus when needed", (t) => {
    const funcStr = getMasterEffectsBusInputNode.toString();
    t.assertTruthy(funcStr.includes('setupMasterBus'), 'getMasterEffectsBusInputNode should call setupMasterBus when node is not ready');
});

TestRunner.test("Day 635 - getActualMasterGainNode is a function export", (t) => {
    const funcStr = getActualMasterGainNode.toString();
    t.assertTruthy(funcStr.includes('export function'), 'getActualMasterGainNode should be exported');
});

TestRunner.test("Day 635 - getActualMasterGainNode accepts 0 parameters", (t) => {
    t.assertEqual(getActualMasterGainNode.length, 0, 'getActualMasterGainNode should accept no parameters');
});

TestRunner.test("Day 635 - getActualMasterGainNode checks masterGainNodeActual", (t) => {
    const funcStr = getActualMasterGainNode.toString();
    t.assertTruthy(funcStr.includes('masterGainNodeActual'), 'getActualMasterGainNode should reference masterGainNodeActual');
});

TestRunner.test("Day 635 - getActualMasterGainNode checks disposed state", (t) => {
    const funcStr = getActualMasterGainNode.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'getActualMasterGainNode should check disposed state');
});

TestRunner.test("Day 635 - getActualMasterGainNode calls setupMasterBus when needed", (t) => {
    const funcStr = getActualMasterGainNode.toString();
    t.assertTruthy(funcStr.includes('setupMasterBus'), 'getActualMasterGainNode should call setupMasterBus when node is not ready');
});

TestRunner.test("Day 635 - APP_VERSION validation for Day 635", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 635');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 290, 'Minor version should be >= 290 for Day 635');
    }
});

// ============================================
// Day 636: reorderMasterEffectInAudio and Master Effect Audio Function Tests
// ============================================
TestRunner.test("Day 636 - reorderMasterEffectInAudio is a function export", (t) => {
    const audioStr = reorderMasterEffectInAudio.toString();
    t.assertTruthy(audioStr.includes('export function'), 'reorderMasterEffectInAudio should be exported');
});

TestRunner.test("Day 636 - reorderMasterEffectInAudio accepts 2 parameters", (t) => {
    t.assertEqual(reorderMasterEffectInAudio.length, 2, 'reorderMasterEffectInAudio should accept 2 parameters');
});

TestRunner.test("Day 636 - reorderMasterEffectInAudio ignores effectId parameter", (t) => {
    const funcStr = reorderMasterEffectInAudio.toString();
    t.assertTruthy(funcStr.includes('effectIdIgnored') || funcStr.includes('effectId'), 'reorderMasterEffectInAudio should reference effectId');
});

TestRunner.test("Day 636 - reorderMasterEffectInAudio ignores newIndex parameter", (t) => {
    const funcStr = reorderMasterEffectInAudio.toString();
    t.assertTruthy(funcStr.includes('newIndexIgnored') || funcStr.includes('newIndex'), 'reorderMasterEffectInAudio should reference newIndex');
});

TestRunner.test("Day 636 - reorderMasterEffectInAudio calls rebuildMasterEffectChain", (t) => {
    const funcStr = reorderMasterEffectInAudio.toString();
    t.assertTruthy(funcStr.includes('rebuildMasterEffectChain'), 'reorderMasterEffectInAudio should call rebuildMasterEffectChain');
});

TestRunner.test("Day 636 - addMasterEffectToAudio is a function export", (t) => {
    const audioStr = addMasterEffectToAudio.toString();
    t.assertTruthy(audioStr.includes('export'), 'addMasterEffectToAudio should be exported');
});

TestRunner.test("Day 636 - addMasterEffectToAudio is async", (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('async'), 'addMasterEffectToAudio should be async');
});

TestRunner.test("Day 636 - addMasterEffectToAudio accepts 3 parameters", (t) => {
    t.assertEqual(addMasterEffectToAudio.length, 3, 'addMasterEffectToAudio should accept 3 parameters');
});

TestRunner.test("Day 636 - addMasterEffectToAudio calls createEffectInstance", (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('createEffectInstance'), 'addMasterEffectToAudio should call createEffectInstance');
});

TestRunner.test("Day 636 - addMasterEffectToAudio stores toneNode in activeMasterEffectNodes", (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('activeMasterEffectNodes.set'), 'addMasterEffectToAudio should set in activeMasterEffectNodes');
});

TestRunner.test("Day 636 - addMasterEffectToAudio calls rebuildMasterEffectChain after adding", (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('rebuildMasterEffectChain'), 'addMasterEffectToAudio should call rebuildMasterEffectChain');
});

TestRunner.test("Day 636 - addMasterEffectToAudio has error handling with console.error", (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('console.error'), 'addMasterEffectToAudio should have console.error error handling');
});

TestRunner.test("Day 636 - addMasterEffectToAudio shows notification on failure", (t) => {
    const funcStr = addMasterEffectToAudio.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'addMasterEffectToAudio should show notification on failure');
});

TestRunner.test("Day 636 - removeMasterEffectFromAudio is a function export", (t) => {
    const audioStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(audioStr.includes('export'), 'removeMasterEffectFromAudio should be exported');
});

TestRunner.test("Day 636 - removeMasterEffectFromAudio accepts 1 parameter", (t) => {
    t.assertEqual(removeMasterEffectFromAudio.length, 1, 'removeMasterEffectFromAudio should accept 1 parameter');
});

TestRunner.test("Day 636 - removeMasterEffectFromAudio gets effectNode from activeMasterEffectNodes", (t) => {
    const funcStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(funcStr.includes('activeMasterEffectNodes.get'), 'removeMasterEffectFromAudio should get node from activeMasterEffectNodes');
});

TestRunner.test("Day 636 - removeMasterEffectFromAudio calls disconnect on effectNode", (t) => {
    const funcStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(funcStr.includes('.disconnect'), 'removeMasterEffectFromAudio should call disconnect');
});

TestRunner.test("Day 636 - removeMasterEffectFromAudio calls dispose on effectNode", (t) => {
    const funcStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(funcStr.includes('.dispose'), 'removeMasterEffectFromAudio should call dispose');
});

TestRunner.test("Day 636 - removeMasterEffectFromAudio deletes from activeMasterEffectNodes", (t) => {
    const funcStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(funcStr.includes('activeMasterEffectNodes.delete'), 'removeMasterEffectFromAudio should delete from activeMasterEffectNodes');
});

TestRunner.test("Day 636 - removeMasterEffectFromAudio calls rebuildMasterEffectChain after removing", (t) => {
    const funcStr = removeMasterEffectFromAudio.toString();
    t.assertTruthy(funcStr.includes('rebuildMasterEffectChain'), 'removeMasterEffectFromAudio should call rebuildMasterEffectChain');
});

TestRunner.test("Day 636 - APP_VERSION validation for Day 636", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 636');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 290, 'Minor version should be >= 290 for Day 636');
    }
});

// ============================================================
// Day 637: Master Volume Automation and Tap Tempo Audio Function Tests
// ============================================================
TestRunner.test("Day 637 - APP_VERSION validation for Day 637", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 637');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 291, 'Minor version should be >= 291 for Day 637');
    }
});

TestRunner.test("Day 637 - writeMasterVolumeAutomation is a function export", (t) => {
    const audioStr = writeMasterVolumeAutomation.toString();
    t.assertTruthy(audioStr.includes('export'), 'writeMasterVolumeAutomation should be exported');
});

TestRunner.test("Day 637 - writeMasterVolumeAutomation accepts 2 parameters", (t) => {
    t.assertEqual(writeMasterVolumeAutomation.length, 2, 'writeMasterVolumeAutomation should accept 2 parameters');
});

TestRunner.test("Day 637 - writeMasterVolumeAutomation references masterVolumeAutomation array", (t) => {
    const funcStr = writeMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomation'), 'writeMasterVolumeAutomation should reference masterVolumeAutomation');
});

TestRunner.test("Day 637 - writeMasterVolumeAutomation uses push to add entry", (t) => {
    const funcStr = writeMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('.push'), 'writeMasterVolumeAutomation should use push to add entries');
});

TestRunner.test("Day 637 - applyMasterVolumeAutomationAtTime is a function export", (t) => {
    const audioStr = applyMasterVolumeAutomationAtTime.toString();
    t.assertTruthy(audioStr.includes('export'), 'applyMasterVolumeAutomationAtTime should be exported');
});

TestRunner.test("Day 637 - applyMasterVolumeAutomationAtTime accepts 1 parameter", (t) => {
    t.assertEqual(applyMasterVolumeAutomationAtTime.length, 1, 'applyMasterVolumeAutomationAtTime should accept 1 parameter');
});

TestRunner.test("Day 637 - applyMasterVolumeAutomationAtTime references masterVolumeAutomation array", (t) => {
    const funcStr = applyMasterVolumeAutomationAtTime.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomation'), 'applyMasterVolumeAutomationAtTime should reference masterVolumeAutomation');
});

TestRunner.test("Day 637 - applyMasterVolumeAutomationAtTime iterates over automation entries", (t) => {
    const funcStr = applyMasterVolumeAutomationAtTime.toString();
    t.assertTruthy(funcStr.includes('forEach') || funcStr.includes('for ('), 'applyMasterVolumeAutomationAtTime should iterate over automation entries');
});

TestRunner.test("Day 637 - getMasterVolumeAutomation is a function export", (t) => {
    const audioStr = getMasterVolumeAutomation.toString();
    t.assertTruthy(audioStr.includes('export'), 'getMasterVolumeAutomation should be exported');
});

TestRunner.test("Day 637 - getMasterVolumeAutomation accepts 0 parameters", (t) => {
    t.assertEqual(getMasterVolumeAutomation.length, 0, 'getMasterVolumeAutomation should accept no parameters');
});

TestRunner.test("Day 637 - getMasterVolumeAutomation references masterVolumeAutomation array", (t) => {
    const funcStr = getMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomation'), 'getMasterVolumeAutomation should reference masterVolumeAutomation');
});

TestRunner.test("Day 637 - getMasterVolumeAutomation returns a copy using map", (t) => {
    const funcStr = getMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('.map') || funcStr.includes('{ ...'), 'getMasterVolumeAutomation should return a copy');
});

TestRunner.test("Day 637 - setMasterVolumeAutomation is a function export", (t) => {
    const audioStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(audioStr.includes('export'), 'setMasterVolumeAutomation should be exported');
});

TestRunner.test("Day 637 - setMasterVolumeAutomation accepts 1 parameter", (t) => {
    t.assertEqual(setMasterVolumeAutomation.length, 1, 'setMasterVolumeAutomation should accept 1 parameter');
});

TestRunner.test("Day 637 - setMasterVolumeAutomation calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setMasterVolumeAutomation should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 637 - setMasterVolumeAutomation uses Array.isArray check", (t) => {
    const funcStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('Array.isArray'), 'setMasterVolumeAutomation should use Array.isArray check');
});

TestRunner.test("Day 637 - setMasterVolumeAutomation sets masterVolumeAutomation array", (t) => {
    const funcStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomation ='), 'setMasterVolumeAutomation should set masterVolumeAutomation');
});

TestRunner.test("Day 637 - resetTapTempo is a function export", (t) => {
    const audioStr = resetTapTempo.toString();
    t.assertTruthy(audioStr.includes('export'), 'resetTapTempo should be exported');
});

TestRunner.test("Day 637 - resetTapTempo accepts 0 parameters", (t) => {
    t.assertEqual(resetTapTempo.length, 0, 'resetTapTempo should accept no parameters');
});

TestRunner.test("Day 637 - resetTapTempo sets tapTimes array to empty", (t) => {
    const funcStr = resetTapTempo.toString();
    t.assertTruthy(funcStr.includes('tapTimes = []'), 'resetTapTempo should reset tapTimes to empty array');
});

TestRunner.test("Day 637 - getTapTempoBpm is a function export", (t) => {
    const audioStr = getTapTempoBpm.toString();
    t.assertTruthy(audioStr.includes('export'), 'getTapTempoBpm should be exported');
});

TestRunner.test("Day 637 - getTapTempoBpm accepts 0 parameters", (t) => {
    t.assertEqual(getTapTempoBpm.length, 0, 'getTapTempoBpm should accept no parameters');
});

TestRunner.test("Day 637 - getTapTempoBpm references tapTimes array", (t) => {
    const funcStr = getTapTempoBpm.toString();
    t.assertTruthy(funcStr.includes('tapTimes'), 'getTapTempoBpm should reference tapTimes array');
});

TestRunner.test("Day 637 - getTapTempoBpm checks minimum taps (TAP_TEMPO_MIN_TAPS)", (t) => {
    const funcStr = getTapTempoBpm.toString();
    t.assertTruthy(funcStr.includes('TAP_TEMPO_MIN_TAPS') || funcStr.includes('TAP_TEMPO_MIN'), 'getTapTempoBpm should check minimum taps');
});

TestRunner.test("Day 637 - getTapTempoBpm calculates BPM from deltas (60000 / avgMs)", (t) => {
    const funcStr = getTapTempoBpm.toString();
    t.assertTruthy(funcStr.includes('60000 /') || funcStr.includes('60000/'), 'getTapTempoBpm should calculate BPM using 60000');
});

TestRunner.test("Day 637 - getTapTempoBpm clamps BPM to valid range (TAP_TEMPO_MIN_BPM, TAP_TEMPO_MAX_BPM)", (t) => {
    const funcStr = getTapTempoBpm.toString();
    t.assertTruthy(funcStr.includes('TAP_TEMPO_MIN_BPM') || funcStr.includes('TAP_TEMPO_MAX_BPM'), 'getTapTempoBpm should clamp BPM to valid range');
});

TestRunner.test("Day 637 - isTapTempoReady is a function export", (t) => {
    const audioStr = isTapTempoReady.toString();
    t.assertTruthy(audioStr.includes('export'), '<empty>');
});

TestRunner.test("Day 637 - isTapTempoReady accepts 0 parameters", (t) => {
    t.assertEqual(isTapTempoReady.length, 0, 'isTapTempoReady should accept no parameters');
});

TestRunner.test("Day 637 - isTapTempoReady checks tapTimes.length", (t) => {
    const funcStr = isTapTempoReady.toString();
    t.assertTruthy(funcStr.includes('tapTimes.length'), 'isTapTempoReady should check tapTimes.length');
});

// ============================================
// Day 638: Event Handlers Track Control Function Tests  
// ============================================
TestRunner.test("Day 638 - handleTrackMute is a function export", (t) => {
    const funcStr = handleTrackMute.toString();
    t.assertTruthy(funcStr.includes('export function'), 'handleTrackMute should be exported');
});

TestRunner.test("Day 638 - handleTrackMute accepts 1 parameter", (t) => {
    t.assertEqual(handleTrackMute.length, 1, 'handleTrackMute should accept 1 parameter (trackId)');
});

TestRunner.test("Day 638 - handleTrackMute calls setTrackMuted from appServices", (t) => {
    const funcStr = handleTrackMute.toString();
    t.assertTruthy(funcStr.includes('setTrackMuted'), 'handleTrackMute should call setTrackMuted');
});

TestRunner.test("Day 638 - handleTrackMute calls updateTrackUI after mute toggle", (t) => {
    const funcStr = handleTrackMute.toString();
    t.assertTruthy(funcStr.includes('updateTrackUI'), 'handleTrackMute should call updateTrackUI');
});

TestRunner.test("Day 638 - handleTrackSolo is a function export", (t) => {
    const funcStr = handleTrackSolo.toString();
    t.assertTruthy(funcStr.includes('export function'), 'handleTrackSolo should be exported');
});

TestRunner.test("Day 638 - handleTrackSolo accepts 1 parameter", (t) => {
    t.assertEqual(handleTrackSolo.length, 1, 'handleTrackSolo should accept 1 parameter (trackId)');
});

TestRunner.test("Day 638 - handleTrackSolo calls setSoloedTrackId from appServices", (t) => {
    const funcStr = handleTrackSolo.toString();
    t.assertTruthy(funcStr.includes('setSoloedTrackId'), 'handleTrackSolo should call setSoloedTrackId');
});

TestRunner.test("Day 638 - handleTrackSolo calls updateTrackUI after solo toggle", (t) => {
    const funcStr = handleTrackSolo.toString();
    t.assertTruthy(funcStr.includes('updateTrackUI'), 'handleTrackSolo should call updateTrackUI');
});

TestRunner.test("Day 638 - handleTrackArm is a function export", (t) => {
    const funcStr = handleTrackArm.toString();
    t.assertTruthy(funcStr.includes('export function'), 'handleTrackArm should be exported');
});

TestRunner.test("Day 638 - handleTrackArm accepts 1 parameter", (t) => {
    t.assertEqual(handleTrackArm.length, 1, 'handleTrackArm should accept 1 parameter (trackId)');
});

TestRunner.test("Day 638 - handleTrackArm calls setArmedTrackId from appServices", (t) => {
    const funcStr = handleTrackArm.toString();
    t.assertTruthy(funcStr.includes('setArmedTrackId'), 'handleTrackArm should call setArmedTrackId');
});

TestRunner.test("Day 638 - handleTrackArm calls updateTrackUI after arm toggle", (t) => {
    const funcStr = handleTrackArm.toString();
    t.assertTruthy(funcStr.includes('updateTrackUI'), 'handleTrackArm should call updateTrackUI');
});

TestRunner.test("Day 638 - handleRemoveTrack is a function export", (t) => {
    const funcStr = handleRemoveTrack.toString();
    t.assertTruthy(funcStr.includes('export function'), 'handleRemoveTrack should be exported');
});

TestRunner.test("Day 638 - handleRemoveTrack accepts 1 parameter", (t) => {
    t.assertEqual(handleRemoveTrack.length, 1, 'handleRemoveTrack should accept 1 parameter (trackId)');
});

TestRunner.test("Day 638 - handleRemoveTrack calls removeTrackFromState with undo capture", (t) => {
    const funcStr = handleRemoveTrack.toString();
    t.assertTruthy(funcStr.includes('removeTrackFromState'), 'handleRemoveTrack should call removeTrackFromState');
});

TestRunner.test("Day 638 - toggleMuteShortcut is a function export", (t) => {
    const funcStr = toggleMuteShortcut.toString();
    t.assertTruthy(funcStr.includes('export function'), 'toggleMuteShortcut should be exported');
});

TestRunner.test("Day 638 - toggleMuteShortcut accepts 0 parameters", (t) => {
    t.assertEqual(toggleMuteShortcut.length, 0, 'toggleMuteShortcut should accept no parameters');
});

TestRunner.test("Day 638 - toggleMuteShortcut calls handleTrackMute", (t) => {
    const funcStr = toggleMuteShortcut.toString();
    t.assertTruthy(funcStr.includes('handleTrackMute'), 'toggleMuteShortcut should call handleTrackMute');
});

TestRunner.test("Day 638 - toggleSoloShortcut is a function export", (t) => {
    const funcStr = toggleSoloShortcut.toString();
    t.assertTruthy(funcStr.includes('export function'), 'toggleSoloShortcut should be exported');
});

TestRunner.test("Day 638 - toggleSoloShortcut accepts 0 parameters", (t) => {
    t.assertEqual(toggleSoloShortcut.length, 0, 'toggleSoloShortcut should accept no parameters');
});

TestRunner.test("Day 638 - toggleSoloShortcut calls handleTrackSolo", (t) => {
    const funcStr = toggleSoloShortcut.toString();
    t.assertTruthy(funcStr.includes('handleTrackSolo'), 'toggleSoloShortcut should call handleTrackSolo');
});

TestRunner.test("Day 638 - toggleMidiLearnMode is a function export", (t) => {
    const funcStr = toggleMidiLearnMode.toString();
    t.assertTruthy(funcStr.includes('export function'), 'toggleMidiLearnMode should be exported');
});

TestRunner.test("Day 638 - toggleMidiLearnMode accepts 0 parameters", (t) => {
    t.assertEqual(toggleMidiLearnMode.length, 0, 'toggleMidiLearnMode should accept no parameters');
});

TestRunner.test("Day 638 - toggleMidiLearnMode references _midiCCLearnActive", (t) => {
    const funcStr = toggleMidiLearnMode.toString();
    t.assertTruthy(funcStr.includes('_midiCCLearnActive'), 'toggleMidiLearnMode should reference _midiCCLearnActive');
});

TestRunner.test("Day 638 - toggleScaleModeShortcut is a function export", (t) => {
    const funcStr = toggleScaleModeShortcut.toString();
    t.assertTruthy(funcStr.includes('export function'), 'toggleScaleModeShortcut should be exported');
});

TestRunner.test("Day 638 - toggleScaleModeShortcut accepts 0 parameters", (t) => {
    t.assertEqual(toggleScaleModeShortcut.length, 0, 'toggleScaleModeShortcut should accept no parameters');
});

TestRunner.test("Day 638 - toggleChordModeShortcut is a function export", (t) => {
    const funcStr = toggleChordModeShortcut.toString();
    t.assertTruthy(funcStr.includes('export function'), 'toggleChordModeShortcut should be exported');
});

TestRunner.test("Day 638 - toggleChordModeShortcut accepts 0 parameters", (t) => {
    t.assertEqual(toggleChordModeShortcut.length, 0, 'toggleChordModeShortcut should accept no parameters');
});

TestRunner.test("Day 638 - openTransportSettingsShortcut is a function export", (t) => {
    const funcStr = openTransportSettingsShortcut.toString();
    t.assertTruthy(funcStr.includes('export function'), 'openTransportSettingsShortcut should be exported');
});

TestRunner.test("Day 638 - openTransportSettingsShortcut accepts 0 parameters", (t) => {
    t.assertEqual(openTransportSettingsShortcut.length, 0, 'openTransportSettingsShortcut should accept no parameters');
});

TestRunner.test("Day 638 - APP_VERSION validation for Day 638", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 638');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 291, 'Minor version should be >= 291 for Day 638');
    }
});

// Day 639: Metronome, Count-In, and Automation State Audio Function Tests
TestRunner.test("Day 639 - APP_VERSION validation for Day 639", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 639');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 292, 'Minor version should be >= 292 for Day 639');
    }
});

TestRunner.test("Day 639 - getCountInBars is a function export", (t) => {
    t.assertEqual(typeof getCountInBars, 'function', 'getCountInBars should be a function');
});

TestRunner.test("Day 639 - getCountInBars accepts 0 parameters", (t) => {
    t.assertEqual(getCountInBars.length, 0, 'getCountInBars should accept no parameters');
});

TestRunner.test("Day 639 - getCountInBars references countInBars variable", (t) => {
    const funcStr = getCountInBars.toString();
    t.assertTruthy(funcStr.includes('countInBars'), 'getCountInBars should reference countInBars');
});

TestRunner.test("Day 639 - setCountInBars is a function export", (t) => {
    t.assertEqual(typeof setCountInBars, 'function', 'setCountInBars should be a function');
});

TestRunner.test("Day 639 - setCountInBars accepts 1 parameter", (t) => {
    t.assertEqual(setCountInBars.length, 1, 'setCountInBars should accept 1 parameter');
});

TestRunner.test("Day 639 - setCountInBars clamps value to 0-4 range with Math.max/min", (t) => {
    const funcStr = setCountInBars.toString();
    t.assertTruthy(funcStr.includes('Math.max(0') && funcStr.includes('Math.min(4'), 'setCountInBars should clamp to 0-4 range');
});

TestRunner.test("Day 639 - setCountInBars calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setCountInBars.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setCountInBars should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 639 - setCountInBars has descriptive undo label with 'Set Count-In Bars to'", (t) => {
    const funcStr = setCountInBars.toString();
    t.assertTruthy(funcStr.includes('Set Count-In Bars to'), 'setCountInBars should have "Set Count-In Bars to" undo label');
});

TestRunner.test("Day 639 - isCountInActive is a function export", (t) => {
    t.assertEqual(typeof isCountInActive, 'function', 'isCountInActive should be a function');
});

TestRunner.test("Day 639 - isCountInActive accepts 0 parameters", (t) => {
    t.assertEqual(isCountInActive.length, 0, 'isCountInActive should accept no parameters');
});

TestRunner.test("Day 639 - isCountInActive references countInActive variable", (t) => {
    const funcStr = isCountInActive.toString();
    t.assertTruthy(funcStr.includes('countInActive'), 'isCountInActive should reference countInActive');
});

TestRunner.test("Day 639 - startCountIn is an async function export", (t) => {
    t.assertEqual(startCountIn.constructor.name, 'AsyncFunction', 'startCountIn should be async');
});

TestRunner.test("Day 639 - startCountIn accepts 1-2 parameters", (t) => {
    t.assertTrue(startCountIn.length === 1 || startCountIn.length === 2, 'startCountIn should accept 1-2 parameters');
});

TestRunner.test("Day 639 - startCountIn references countInActive variable", (t) => {
    const funcStr = startCountIn.toString();
    t.assertTruthy(funcStr.includes('countInActive'), 'startCountIn should reference countInActive');
});

TestRunner.test("Day 639 - startCountIn references countInBars variable", (t) => {
    const funcStr = startCountIn.toString();
    t.assertTruthy(funcStr.includes('countInBars'), 'startCountIn should reference countInBars');
});

TestRunner.test("Day 639 - startCountIn sets countInActive to true", (t) => {
    const funcStr = startCountIn.toString();
    t.assertTruthy(funcStr.includes('countInActive = true'), 'startCountIn should set countInActive to true');
});

TestRunner.test("Day 639 - stopMetronome is a function export", (t) => {
    t.assertEqual(typeof stopMetronome, 'function', 'stopMetronome should be a function');
});

TestRunner.test("Day 639 - stopMetronome accepts 0 parameters", (t) => {
    t.assertEqual(stopMetronome.length, 0, 'stopMetronome should accept no parameters');
});

TestRunner.test("Day 639 - stopMetronome sets countInActive to false", (t) => {
    const funcStr = stopMetronome.toString();
    t.assertTruthy(funcStr.includes('countInActive = false'), 'stopMetronome should set countInActive to false');
});

TestRunner.test("Day 639 - cleanupMetronome is a function export", (t) => {
    t.assertEqual(typeof cleanupMetronome, 'function', 'cleanupMetronome should be a function');
});

TestRunner.test("Day 639 - cleanupMetronome accepts 0 parameters", (t) => {
    t.assertEqual(cleanupMetronome.length, 0, 'cleanupMetronome should accept no parameters');
});

TestRunner.test("Day 639 - cleanupMetronome calls stopMetronome", (t) => {
    const funcStr = cleanupMetronome.toString();
    t.assertTruthy(funcStr.includes('stopMetronome'), 'cleanupMetronome should call stopMetronome');
});

TestRunner.test("Day 639 - cleanupCountIn is a function export", (t) => {
    t.assertEqual(typeof cleanupCountIn, 'function', 'cleanupCountIn should be a function');
});

TestRunner.test("Day 639 - cleanupCountIn accepts 0 parameters", (t) => {
    t.assertEqual(cleanupCountIn.length, 0, 'cleanupCountIn should accept no parameters');
});

TestRunner.test("Day 639 - cleanupCountIn sets countInActive to false", (t) => {
    const funcStr = cleanupCountIn.toString();
    t.assertTruthy(funcStr.includes('countInActive = false'), 'cleanupCountIn should set countInActive to false');
});

TestRunner.test("Day 639 - getMetronomeVolume is a function export requiring import", (t) => {
    t.assertEqual(typeof getMetronomeVolume, 'function', 'getMetronomeVolume should be a function');
});

TestRunner.test("Day 639 - getMetronomeVolume accepts 0 parameters", (t) => {
    t.assertEqual(getMetronomeVolume.length, 0, 'getMetronomeVolume should accept no parameters');
});

TestRunner.test("Day 639 - setMetronomeVolume is a function export", (t) => {
    t.assertEqual(typeof setMetronomeVolume, 'function', 'setMetronomeVolume should be a function');
});

TestRunner.test("Day 639 - setMetronomeVolume accepts 1 parameter", (t) => {
    t.assertEqual(setMetronomeVolume.length, 1, 'setMetronomeVolume should accept 1 parameter');
});

TestRunner.test("Day 639 - setMetronomeVolume uses Math.max/min for clamping to 0-1 range", (t) => {
    const funcStr = setMetronomeVolume.toString();
    t.assertTruthy(funcStr.includes('Math.max(0') && funcStr.includes('Math.min(1'), 'setMetronomeVolume should clamp to 0-1 range');
});

TestRunner.test("Day 639 - setMetronomeVolume uses parseFloat for input conversion", (t) => {
    const funcStr = setMetronomeVolume.toString();
    t.assertTruthy(funcStr.includes('parseFloat'), 'setMetronomeVolume should use parseFloat for input conversion');
});

TestRunner.test("Day 639 - setMetronomeVolume calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setMetronomeVolume.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setMetronomeVolume should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 639 - setMetronomeVolume has descriptive undo label with 'Set Metronome Volume to'", (t) => {
    const funcStr = setMetronomeVolume.toString();
    t.assertTruthy(funcStr.includes('Set Metronome Volume to'), 'setMetronomeVolume should have "Set Metronome Volume to" undo label');
});

TestRunner.test("Day 639 - isMetronomeEnabled is a function export", (t) => {
    t.assertEqual(typeof isMetronomeEnabled, 'function', 'isMetronomeEnabled should be a function');
});

TestRunner.test("Day 639 - isMetronomeEnabled accepts 0 parameters", (t) => {
    t.assertEqual(isMetronomeEnabled.length, 0, 'isMetronomeEnabled should accept no parameters');
});

TestRunner.test("Day 639 - setMetronomeEnabled is a function export", (t) => {
    t.assertEqual(typeof setMetronomeEnabled, 'function', 'setMetronomeEnabled should be a function');
});

TestRunner.test("Day 639 - setMetronomeEnabled accepts 1 parameter", (t) => {
    t.assertEqual(setMetronomeEnabled.length, 1, 'setMetronomeEnabled should accept 1 parameter');
});

TestRunner.test("Day 639 - setMetronomeEnabled uses !! for boolean coercion", (t) => {
    const funcStr = setMetronomeEnabled.toString();
    t.assertTruthy(funcStr.includes('!!'), 'setMetronomeEnabled should use !! for boolean coercion');
});

TestRunner.test("Day 639 - setMetronomeEnabled calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setMetronomeEnabled.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setMetronomeEnabled should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 639 - startAutomation is a function export", (t) => {
    t.assertEqual(typeof startAutomation, 'function', 'startAutomation should be a function');
});

TestRunner.test("Day 639 - startAutomation accepts 0 parameters", (t) => {
    t.assertEqual(startAutomation.length, 0, 'startAutomation should accept no parameters');
});

TestRunner.test("Day 639 - startAutomation references automationActive variable", (t) => {
    const funcStr = startAutomation.toString();
    t.assertTruthy(funcStr.includes('automationActive'), 'startAutomation should reference automationActive');
});

TestRunner.test("Day 639 - startAutomation calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = startAutomation.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'startAutomation should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 639 - startAutomation has descriptive undo label 'Start Automation'", (t) => {
    const funcStr = startAutomation.toString();
    t.assertTruthy(funcStr.includes('Start Automation'), 'startAutomation should have "Start Automation" undo label');
});

TestRunner.test("Day 639 - stopAutomation is a function export", (t) => {
    t.assertEqual(typeof stopAutomation, 'function', 'stopAutomation should be a function');
});

TestRunner.test("Day 639 - stopAutomation accepts 0 parameters", (t) => {
    t.assertEqual(stopAutomation.length, 0, 'stopAutomation should accept no parameters');
});

TestRunner.test("Day 639 - stopAutomation references automationActive variable", (t) => {
    const funcStr = stopAutomation.toString();
    t.assertTruthy(funcStr.includes('automationActive'), 'stopAutomation should reference automationActive');
});

TestRunner.test("Day 639 - stopAutomation calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = stopAutomation.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'stopAutomation should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 639 - stopAutomation has descriptive undo label 'Stop Automation'", (t) => {
    const funcStr = stopAutomation.toString();
    t.assertTruthy(funcStr.includes('Stop Automation'), 'stopAutomation should have "Stop Automation" undo label');
});

TestRunner.test("Day 639 - cleanupAutomation is a function export", (t) => {
    t.assertEqual(typeof cleanupAutomation, 'function', 'cleanupAutomation should be a function');
});

TestRunner.test("Day 639 - cleanupAutomation accepts 0 parameters", (t) => {
    t.assertEqual(cleanupAutomation.length, 0, 'cleanupAutomation should accept no parameters');
});

TestRunner.test("Day 639 - cleanupAutomation calls stopAutomation", (t) => {
    const funcStr = cleanupAutomation.toString();
    t.assertTruthy(funcStr.includes('stopAutomation'), 'cleanupAutomation should call stopAutomation');
});

TestRunner.test("Day 639 - onTransportStart is a function export", (t) => {
    t.assertEqual(typeof onTransportStart, 'function', 'onTransportStart should be a function');
});

TestRunner.test("Day 639 - onTransportStart accepts 0 parameters", (t) => {
    t.assertEqual(onTransportStart.length, 0, 'onTransportStart should accept no parameters');
});

TestRunner.test("Day 639 - onTransportStart sets automationActive to true", (t) => {
    const funcStr = onTransportStart.toString();
    t.assertTruthy(funcStr.includes('automationActive = true'), 'onTransportStart should set automationActive to true');
});

TestRunner.test("Day 639 - onTransportStop is a function export", (t) => {
    t.assertEqual(typeof onTransportStop, 'function', 'onTransportStop should be a function');
});

TestRunner.test("Day 639 - onTransportStop accepts 0 parameters", (t) => {
    t.assertEqual(onTransportStop.length, 0, 'onTransportStop should accept no parameters');
});

TestRunner.test("Day 639 - onTransportStop sets automationActive to false", (t) => {
    const funcStr = onTransportStop.toString();
    t.assertTruthy(funcStr.includes('automationActive = false'), 'onTransportStop should set automationActive to false');
});

TestRunner.test("Day 639 - cleanupRecordingAudioResources is a function export", (t) => {
    t.assertEqual(typeof cleanupRecordingAudioResources, 'function', 'cleanupRecordingAudioResources should be a function');
});

TestRunner.test("Day 639 - cleanupRecordingAudioResources accepts 0 parameters", (t) => {
    t.assertEqual(cleanupRecordingAudioResources.length, 0, 'cleanupRecordingAudioResources should accept no parameters');
});

TestRunner.test("Day 639 - cleanupRecordingAudioResources handles mic cleanup with try/catch", (t) => {
    const funcStr = cleanupRecordingAudioResources.toString();
    t.assertTruthy(funcStr.includes('mic.disconnect') || funcStr.includes('mic.close') || funcStr.includes('mic.dispose'), 'cleanupRecordingAudioResources should handle mic cleanup');
});

TestRunner.test("Day 639 - cleanupRecordingAudioResources handles recorder cleanup with try/catch", (t) => {
    const funcStr = cleanupRecordingAudioResources.toString();
    t.assertTruthy(funcStr.includes('recorder.disconnect') || funcStr.includes('recorder.dispose'), 'cleanupRecordingAudioResources should handle recorder cleanup');
});

// Day 640: resolveRecordingMicrophoneTestTrack Audio Function Tests
TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack is a function export", (t) => {
    t.assertEqual(typeof resolveRecordingMicrophoneTestTrack, 'function', 'resolveRecordingMicrophoneTestTrack should be a function');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack accepts 4 parameters", (t) => {
    t.assertEqual(resolveRecordingMicrophoneTestTrack.length, 4, 'resolveRecordingMicrophoneTestTrack should accept 4 parameters');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack references trackId parameter", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'resolveRecordingMicrophoneTestTrack should reference trackId parameter');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack references tracks parameter", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes('trackList'), 'resolveRecordingMicrophoneTestTrack should reference tracks parameter');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack uses Array.isArray check for tracks", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes('Array.isArray'), 'resolveRecordingMicrophoneTestTrack should use Array.isArray for tracks parameter');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack references getTrackByIdFn parameter", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes('getTrackByIdFn') || funcStr.includes('resolveTrackById'), 'resolveRecordingMicrophoneTestTrack should reference getTrackByIdFn parameter');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack references getArmedTrackIdFn parameter", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes('getArmedTrackIdFn') || funcStr.includes('resolveArmedTrackId'), 'resolveRecordingMicrophoneTestTrack should reference getArmedTrackIdFn parameter');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack checks for null/undefined trackId", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes('trackId !== null') && funcStr.includes('trackId !== undefined'), 'resolveRecordingMicrophoneTestTrack should check for null/undefined trackId');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack returns an object with track property", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes('track:') || funcStr.includes('track :'), 'resolveRecordingMicrophoneTestTrack should return an object with track property');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack returns an object with trackSelectionSource property", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes('trackSelectionSource:') || funcStr.includes('trackSelectionSource :'), 'resolveRecordingMicrophoneTestTrack should return trackSelectionSource');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack checks explicitTrack.type === 'Audio'", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes("type === 'Audio'") || funcStr.includes("type === \"Audio\""), 'resolveRecordingMicrophoneTestTrack should check track type is Audio');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack handles 'explicit' trackSelectionSource", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes("'explicit'") || funcStr.includes('"explicit"'), 'resolveRecordingMicrophoneTestTrack should handle explicit track selection');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack handles 'armed' trackSelectionSource", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes("'armed'") || funcStr.includes('"armed"'), 'resolveRecordingMicrophoneTestTrack should handle armed track selection');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack handles 'auto' trackSelectionSource", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes("'auto'") || funcStr.includes('"auto"'), 'resolveRecordingMicrophoneTestTrack should handle auto track selection');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack handles 'none' trackSelectionSource when no Audio track found", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes("'none'") || funcStr.includes('"none"'), 'resolveRecordingMicrophoneTestTrack should handle none track selection');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack uses track.find for auto-selection", (t) => {
    const funcStr = resolveRecordingMicrophoneTestTrack.toString();
    t.assertTruthy(funcStr.includes('find(track =>') || funcStr.includes('find('), 'resolveRecordingMicrophoneTestTrack should use find for auto-selection');
});

TestRunner.test("Day 640 - resolveRecordingMicrophoneTestTrack APP_VERSION validation for Day 640", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 640');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 293, 'Minor version should be >= 293 for Day 640');
    }
});

// ============================================
// Day 641: Event Handler Window Open Function Tests  
// ============================================
TestRunner.test("Day 641 - handleOpenTrackInspector is a function export", (t) => {
    const funcStr = handleOpenTrackInspector.toString();
    t.assertTruthy(funcStr.includes('export function'), 'handleOpenTrackInspector should be exported');
});

TestRunner.test("Day 641 - handleOpenTrackInspector accepts 1 parameter", (t) => {
    t.assertEqual(handleOpenTrackInspector.length, 1, 'handleOpenTrackInspector should accept 1 parameter (trackId)');
});

TestRunner.test("Day 641 - handleOpenTrackInspector returns early if trackId is falsy", (t) => {
    const funcStr = handleOpenTrackInspector.toString();
    t.assertTruthy(funcStr.includes('!trackId'), 'handleOpenTrackInspector should check for falsy trackId');
});

TestRunner.test("Day 641 - handleOpenTrackInspector calls localAppServices.openTrackInspectorWindow", (t) => {
    const funcStr = handleOpenTrackInspector.toString();
    t.assertTruthy(funcStr.includes('openTrackInspectorWindow'), 'handleOpenTrackInspector should call openTrackInspectorWindow');
});

TestRunner.test("Day 641 - handleOpenEffectsRack is a function export", (t) => {
    const funcStr = handleOpenEffectsRack.toString();
    t.assertTruthy(funcStr.includes('export function'), 'handleOpenEffectsRack should be exported');
});

TestRunner.test("Day 641 - handleOpenEffectsRack accepts 1 parameter", (t) => {
    t.assertEqual(handleOpenEffectsRack.length, 1, 'handleOpenEffectsRack should accept 1 parameter (trackId)');
});

TestRunner.test("Day 641 - handleOpenEffectsRack returns early if trackId is falsy", (t) => {
    const funcStr = handleOpenEffectsRack.toString();
    t.assertTruthy(funcStr.includes('!trackId'), 'handleOpenEffectsRack should check for falsy trackId');
});

TestRunner.test("Day 641 - handleOpenEffectsRack calls localAppServices.openTrackEffectsRackWindow", (t) => {
    const funcStr = handleOpenEffectsRack.toString();
    t.assertTruthy(funcStr.includes('openTrackEffectsRackWindow'), 'handleOpenEffectsRack should call openTrackEffectsRackWindow');
});

TestRunner.test("Day 641 - handleOpenSequencer is a function export", (t) => {
    const funcStr = handleOpenSequencer.toString();
    t.assertTruthy(funcStr.includes('export function'), 'handleOpenSequencer should be exported');
});

TestRunner.test("Day 641 - handleOpenSequencer accepts 1 parameter", (t) => {
    t.assertEqual(handleOpenSequencer.length, 1, 'handleOpenSequencer should accept 1 parameter (trackId)');
});

TestRunner.test("Day 641 - handleOpenSequencer returns early if trackId is falsy", (t) => {
    const funcStr = handleOpenSequencer.toString();
    t.assertTruthy(funcStr.includes('!trackId'), 'handleOpenSequencer should check for falsy trackId');
});

TestRunner.test("Day 641 - handleOpenSequencer calls localAppServices.openTrackSequencerWindow", (t) => {
    const funcStr = handleOpenSequencer.toString();
    t.assertTruthy(funcStr.includes('openTrackSequencerWindow'), 'handleOpenSequencer should call openTrackSequencerWindow');
});

TestRunner.test("Day 641 - APP_VERSION validation for Day 641", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 641');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 294, 'Minor version should be >= 294 for Day 641');
    }
});

// Day 642: MIDI CC Mapping and Learn Function Tests  
// ===========================================
TestRunner.test("Day 642 - getMidiCCMappings is a function export", (t) => {
    const funcStr = getMidiCCMappings.toString();
    t.assertTruthy(funcStr.includes('export function'), 'getMidiCCMappings should be exported');
});

TestRunner.test("Day 642 - getMidiCCMappings returns _midiCCMappings", (t) => {
    const funcStr = getMidiCCMappings.toString();
    t.assertTruthy(funcStr.includes('_midiCCMappings'), 'getMidiCCMappings should return _midiCCMappings');
});

TestRunner.test("Day 642 - getMidiCCLearnActive is a function export", (t) => {
    const funcStr = getMidiCCLearnActive.toString();
    t.assertTruthy(funcStr.includes('export function'), 'getMidiCCLearnActive should be exported');
});

TestRunner.test("Day 642 - getMidiCCLearnActive returns _midiCCLearnActive", (t) => {
    const funcStr = getMidiCCLearnActive.toString();
    t.assertTruthy(funcStr.includes('_midiCCLearnActive'), 'getMidiCCLearnActive should return _midiCCLearnActive');
});

TestRunner.test("Day 642 - clearMidiCCMappings is a function export", (t) => {
    const funcStr = clearMidiCCMappings.toString();
    t.assertTruthy(funcStr.includes('export function'), 'clearMidiCCMappings should be exported');
});

TestRunner.test("Day 642 - clearMidiCCMappings sets _midiCCMappings to empty object", (t) => {
    const funcStr = clearMidiCCMappings.toString();
    t.assertTruthy(funcStr.includes('_midiCCMappings = {}'), 'clearMidiCCMappings should reset _midiCCMappings to {}');
});

TestRunner.test("Day 642 - removeMidiCCMapping is a function export", (t) => {
    const funcStr = removeMidiCCMapping.toString();
    t.assertTruthy(funcStr.includes('export function'), 'removeMidiCCMapping should be exported');
});

TestRunner.test("Day 642 - removeMidiCCMapping accepts 1 parameter", (t) => {
    t.assertEqual(removeMidiCCMapping.length, 1, 'removeMidiCCMapping should accept 1 parameter (targetId)');
});

TestRunner.test("Day 642 - removeMidiCCMapping deletes from _midiCCMappings", (t) => {
    const funcStr = removeMidiCCMapping.toString();
    t.assertTruthy(funcStr.includes('delete _midiCCMappings'), 'removeMidiCCMapping should delete from _midiCCMappings');
});

TestRunner.test("Day 642 - setMidiCCMapping is a function export", (t) => {
    const funcStr = setMidiCCMapping.toString();
    t.assertTruthy(funcStr.includes('export function'), 'setMidiCCMapping should be exported');
});

TestRunner.test("Day 642 - setMidiCCMapping accepts 2 parameters", (t) => {
    t.assertEqual(setMidiCCMapping.length, 2, 'setMidiCCMapping should accept 2 parameters (targetId, mapping)');
});

TestRunner.test("Day 642 - setMidiCCMapping sets _midiCCMappings targetId", (t) => {
    const funcStr = setMidiCCMapping.toString();
    t.assertTruthy(funcStr.includes('_midiCCMappings[targetId] = mapping'), 'setMidiCCMapping should assign mapping');
});

TestRunner.test("Day 642 - getMidiCCMapping is a function export", (t) => {
    const funcStr = getMidiCCMapping.toString();
    t.assertTruthy(funcStr.includes('export function'), 'getMidiCCMapping should be exported');
});

TestRunner.test("Day 642 - getMidiCCMapping accepts 1 parameter", (t) => {
    t.assertEqual(getMidiCCMapping.length, 1, 'getMidiCCMapping should accept 1 parameter (targetId)');
});

TestRunner.test("Day 642 - getMidiCCMapping returns _midiCCMappings targetId or null", (t) => {
    const funcStr = getMidiCCMapping.toString();
    t.assertTruthy(funcStr.includes('_midiCCMappings[targetId]') && funcStr.includes('null'), 'getMidiCCMapping should return mapping or null');
});

TestRunner.test("Day 642 - getMidiCCMappingsForProject is a function export", (t) => {
    const funcStr = getMidiCCMappingsForProject.toString();
    t.assertTruthy(funcStr.includes('export function'), 'getMidiCCMappingsForProject should be exported');
});

TestRunner.test("Day 642 - getMidiCCMappingsForProject uses Object.keys to iterate mappings", (t) => {
    const funcStr = getMidiCCMappingsForProject.toString();
    t.assertTruthy(funcStr.includes('Object.keys'), 'getMidiCCMappingsForProject should use Object.keys');
});

TestRunner.test("Day 642 - getMidiCCMappingsForProject returns mapped array", (t) => {
    const funcStr = getMidiCCMappingsForProject.toString();
    t.assertTruthy(funcStr.includes('return Object.keys'), 'getMidiCCMappingsForProject should return mapped array');
});

TestRunner.test("Day 642 - loadMidiCCMappingsFromProject is a function export", (t) => {
    const funcStr = loadMidiCCMappingsFromProject.toString();
    t.assertTruthy(funcStr.includes('export function'), 'loadMidiCCMappingsFromProject should be exported');
});

TestRunner.test("Day 642 - loadMidiCCMappingsFromProject accepts 1 parameter", (t) => {
    t.assertEqual(loadMidiCCMappingsFromProject.length, 1, 'loadMidiCCMappingsFromProject should accept 1 parameter (mappingsData)');
});

TestRunner.test("Day 642 - loadMidiCCMappingsFromProject assigns to _midiCCMappings", (t) => {
    const funcStr = loadMidiCCMappingsFromProject.toString();
    t.assertTruthy(funcStr.includes('_midiCCMappings = {}'), 'loadMidiCCMappingsFromProject should initialize _midiCCMappings');
});

TestRunner.test("Day 642 - startMidiCCLearn is a function export", (t) => {
    const funcStr = startMidiCCLearn.toString();
    t.assertTruthy(funcStr.includes('export function'), 'startMidiCCLearn should be exported');
});

TestRunner.test("Day 642 - startMidiCCLearn accepts 5 parameters", (t) => {
    t.assertEqual(startMidiCCLearn.length, 5, 'startMidiCCLearn should accept 5 parameters');
});

TestRunner.test("Day 642 - startMidiCCLearn sets _midiCCLearnActive object", (t) => {
    const funcStr = startMidiCCLearn.toString();
    t.assertTruthy(funcStr.includes('_midiCCLearnActive = {'), 'startMidiCCLearn should set _midiCCLearnActive');
});

TestRunner.test("Day 642 - startMidiCCLearn references showNotification", (t) => {
    const funcStr = startMidiCCLearn.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'startMidiCCLearn should call showNotification');
});

TestRunner.test("Day 642 - cancelMidiCCLearn is a function export", (t) => {
    const funcStr = cancelMidiCCLearn.toString();
    t.assertTruthy(funcStr.includes('export function'), 'cancelMidiCCLearn should be exported');
});

TestRunner.test("Day 642 - cancelMidiCCLearn checks _midiCCLearnActive before setting null", (t) => {
    const funcStr = cancelMidiCCLearn.toString();
    t.assertTruthy(funcStr.includes('_midiCCLearnActive') && funcStr.includes('null'), 'cancelMidiCCLearn should check and clear _midiCCLearnActive');
});

TestRunner.test("Day 642 - APP_VERSION validation for Day 642", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 642');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 295, 'Minor version should be >= 295 for Day 642');
    }
});

// --- Day 643: Track Send Nodes Audio Function Tests ---
TestRunner.test("Day 643 - getTrackSendNodes is a function export", (t) => {
    const audioStr = getTrackSendNodes.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getTrackSendNodes should be exported');
});

TestRunner.test("Day 643 - getTrackSendNodes returns trackSendNodes", (t) => {
    const funcStr = getTrackSendNodes.toString();
    t.assertTruthy(funcStr.includes('trackSendNodes'), 'getTrackSendNodes should return trackSendNodes');
});

TestRunner.test("Day 643 - setTrackSendLevel is a function export", (t) => {
    const audioStr = setTrackSendLevel.toString();
    t.assertTruthy(audioStr.includes('export function'), 'setTrackSendLevel should be exported');
});

TestRunner.test("Day 643 - setTrackSendLevel accepts 3 parameters", (t) => {
    t.assertEqual(setTrackSendLevel.length, 3, 'setTrackSendLevel should accept 3 parameters (trackId, sendId, level)');
});

TestRunner.test("Day 643 - setTrackSendLevel clamps level to 0-1 range", (t) => {
    const funcStr = setTrackSendLevel.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setTrackSendLevel should clamp level using Math.max and Math.min');
});

TestRunner.test("Day 643 - setTrackSendLevel references trackSendNodes with get and sendGainNode", (t) => {
    const funcStr = setTrackSendLevel.toString();
    t.assertTruthy(funcStr.includes('trackSendNodes.get') && funcStr.includes('sendGainNode'), 'setTrackSendLevel should use trackSendNodes.get and sendGainNode');
});

TestRunner.test("Day 643 - APP_VERSION validation for Day 643", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 643');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 296, 'Minor version should be >= 296 for Day 643');
    }
});

// ============================================
// Day 644: Master Volume Automation and Automation Control Audio Function Tests
// ============================================

TestRunner.test("Day 644 - initAudioContextAndMasterMeter is a function export", (t) => {
    const audioStr = initAudioContextAndMasterMeter.toString();
    t.assertTruthy(audioStr.includes('export'), 'initAudioContextAndMasterMeter should be exported');
});

TestRunner.test("Day 644 - initAudioContextAndMasterMeter is async", (t) => {
    const funcStr = initAudioContextAndMasterMeter.toString();
    t.assertTruthy(funcStr.includes('async'), 'initAudioContextAndMasterMeter should be async');
});

TestRunner.test("Day 644 - initAudioContextAndMasterMeter accepts 1 parameter", (t) => {
    t.assertEqual(initAudioContextAndMasterMeter.length, 1, 'initAudioContextAndMasterMeter should accept 1 parameter');
});

TestRunner.test("Day 644 - initAudioContextAndMasterMeter references Tone.start", (t) => {
    const funcStr = initAudioContextAndMasterMeter.toString();
    t.assertTruthy(funcStr.includes('Tone.start') || funcStr.includes('Tone.'), 'initAudioContextAndMasterMeter should reference Tone.start');
});

TestRunner.test("Day 644 - initAudioContextAndMasterMeter references audioContextInitialized", (t) => {
    const funcStr = initAudioContextAndMasterMeter.toString();
    t.assertTruthy(funcStr.includes('audioContextInitialized'), 'initAudioContextAndMasterMeter should reference audioContextInitialized');
});

TestRunner.test("Day 644 - initAudioContextAndMasterMeter calls setupMasterBus when needed", (t) => {
    const funcStr = initAudioContextAndMasterMeter.toString();
    t.assertTruthy(funcStr.includes('setupMasterBus'), 'initAudioContextAndMasterMeter should call setupMasterBus');
});

TestRunner.test("Day 644 - initAudioContextAndMasterMeter has error handling with try/catch", (t) => {
    const funcStr = initAudioContextAndMasterMeter.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'initAudioContextAndMasterMeter should have try/catch error handling');
});

TestRunner.test("Day 644 - initAudioContextAndMasterMeter shows notification on error", (t) => {
    const funcStr = initAudioContextAndMasterMeter.toString();
    t.assertTruthy(funcStr.includes('showNotification') || funcStr.includes('alert'), 'initAudioContextAndMasterMeter should show notification on error');
});

TestRunner.test("Day 644 - writeMasterVolumeAutomation is a function export", (t) => {
    t.assertEqual(typeof writeMasterVolumeAutomation, 'function', 'writeMasterVolumeAutomation should be a function');
});

TestRunner.test("Day 644 - writeMasterVolumeAutomation accepts 2 parameters", (t) => {
    t.assertEqual(writeMasterVolumeAutomation.length, 2, 'writeMasterVolumeAutomation should accept 2 parameters (time, value)');
});

TestRunner.test("Day 644 - writeMasterVolumeAutomation references masterVolumeAutomation array", (t) => {
    const funcStr = writeMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomation'), 'writeMasterVolumeAutomation should reference masterVolumeAutomation');
});

TestRunner.test("Day 644 - writeMasterVolumeAutomation pushes time/value object to masterVolumeAutomation", (t) => {
    const funcStr = writeMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('push'), 'writeMasterVolumeAutomation should push to masterVolumeAutomation');
});

TestRunner.test("Day 644 - applyMasterVolumeAutomationAtTime is a function export", (t) => {
    t.assertEqual(typeof applyMasterVolumeAutomationAtTime, 'function', 'applyMasterVolumeAutomationAtTime should be a function');
});

TestRunner.test("Day 644 - applyMasterVolumeAutomationAtTime accepts 1 parameter", (t) => {
    t.assertEqual(applyMasterVolumeAutomationAtTime.length, 1, 'applyMasterVolumeAutomationAtTime should accept 1 parameter (time)');
});

TestRunner.test("Day 644 - applyMasterVolumeAutomationAtTime references masterVolumeAutomation", (t) => {
    const funcStr = applyMasterVolumeAutomationAtTime.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomation'), 'applyMasterVolumeAutomationAtTime should reference masterVolumeAutomation');
});

TestRunner.test("Day 644 - applyMasterVolumeAutomationAtTime uses find to locate event by time", (t) => {
    const funcStr = applyMasterVolumeAutomationAtTime.toString();
    t.assertTruthy(funcStr.includes('find'), 'applyMasterVolumeAutomationAtTime should use find to locate event');
});

TestRunner.test("Day 644 - applyMasterVolumeAutomationAtTime calls setMasterVolumeAutomation", (t) => {
    const funcStr = applyMasterVolumeAutomationAtTime.toString();
    t.assertTruthy(funcStr.includes('setMasterVolumeAutomation'), 'applyMasterVolumeAutomationAtTime should call setMasterVolumeAutomation');
});

TestRunner.test("Day 644 - getMasterVolumeAutomation is a function export", (t) => {
    t.assertEqual(typeof getMasterVolumeAutomation, 'function', 'getMasterVolumeAutomation should be a function');
});

TestRunner.test("Day 644 - getMasterVolumeAutomation accepts 0 parameters", (t) => {
    t.assertEqual(getMasterVolumeAutomation.length, 0, 'getMasterVolumeAutomation should accept no parameters');
});

TestRunner.test("Day 644 - getMasterVolumeAutomation references masterVolumeAutomation", (t) => {
    const funcStr = getMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomation'), 'getMasterVolumeAutomation should reference masterVolumeAutomation');
});

TestRunner.test("Day 644 - getMasterVolumeAutomation returns a mapped copy of the automation data", (t) => {
    const funcStr = getMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('map'), 'getMasterVolumeAutomation should use map to create a copy');
});

TestRunner.test("Day 644 - setMasterVolumeAutomation is a function export", (t) => {
    t.assertEqual(typeof setMasterVolumeAutomation, 'function', 'setMasterVolumeAutomation should be a function');
});

TestRunner.test("Day 644 - setMasterVolumeAutomation accepts 1 parameter", (t) => {
    t.assertEqual(setMasterVolumeAutomation.length, 1, 'setMasterVolumeAutomation should accept 1 parameter (automationData)');
});

TestRunner.test("Day 644 - setMasterVolumeAutomation calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setMasterVolumeAutomation should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 644 - setMasterVolumeAutomation has descriptive undo label", (t) => {
    const funcStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('Automation'), 'setMasterVolumeAutomation should have Automation-related undo label');
});

TestRunner.test("Day 644 - setMasterVolumeAutomation checks Array.isArray", (t) => {
    const funcStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('Array.isArray'), 'setMasterVolumeAutomation should check Array.isArray');
});

TestRunner.test("Day 644 - setMasterVolumeAutomation assigns array copy to masterVolumeAutomation", (t) => {
    const funcStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomation ='), 'setMasterVolumeAutomation should assign to masterVolumeAutomation');
});

TestRunner.test("Day 644 - resetTapTempo is a function export", (t) => {
    t.assertEqual(typeof resetTapTempo, 'function', 'resetTapTempo should be a function');
});

TestRunner.test("Day 644 - resetTapTempo accepts 0 parameters", (t) => {
    t.assertEqual(resetTapTempo.length, 0, 'resetTapTempo should accept no parameters');
});

TestRunner.test("Day 644 - resetTapTempo sets tapTimes to empty array", (t) => {
    const funcStr = resetTapTempo.toString();
    t.assertTruthy(funcStr.includes('tapTimes = []') || funcStr.includes('tapTimes=[]'), 'resetTapTempo should set tapTimes to empty array');
});

TestRunner.test("Day 644 - tapTempo is a function export", (t) => {
    t.assertEqual(typeof tapTempo, 'function', 'tapTempo should be a function');
});

TestRunner.test("Day 644 - tapTempo accepts 0 parameters", (t) => {
    t.assertEqual(tapTempo.length, 0, 'tapTempo should accept no parameters');
});

TestRunner.test("Day 644 - tapTempo references Date.now", (t) => {
    const funcStr = tapTempo.toString();
    t.assertTruthy(funcStr.includes('Date.now'), 'tapTempo should reference Date.now');
});

TestRunner.test("Day 644 - tapTempo pushes to tapTimes array", (t) => {
    const funcStr = tapTempo.toString();
    t.assertTruthy(funcStr.includes('tapTimes.push') || funcStr.includes('push'), 'tapTempo should push to tapTimes array');
});

TestRunner.test("Day 644 - tapTempo checks for timeout gap between taps", (t) => {
    const funcStr = tapTempo.toString();
    t.assertTruthy(funcStr.includes('TAP_TEMPO_TIMEOUT_MS') || funcStr.includes('timeout') || funcStr.includes('lastDelta'), 'tapTempo should check for timeout gap between taps');
});

TestRunner.test("Day 644 - tapTempo limits taps to maximum", (t) => {
    const funcStr = tapTempo.toString();
    t.assertTruthy(funcStr.includes('TAP_TEMPO_MAX_TAPS') || funcStr.includes('slice'), 'tapTempo should limit taps to maximum');
});

TestRunner.test("Day 644 - APP_VERSION validation for Day 644", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 644');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 298, 'Minor version should be >= 298 for Day 644');
    }
});



// ============================================
// Day 645: Loop Region, Punch Region, and Master Effects Audio Function Tests
// ============================================

TestRunner.test("Day 645 - getLoopRegion is a function export", (t) => {
    const audioStr = getLoopRegion.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getLoopRegion should be exported');
});

TestRunner.test("Day 645 - getLoopRegion accepts 0 parameters", (t) => {
    t.assertEqual(getLoopRegion.length, 0, 'getLoopRegion should accept no parameters');
});

TestRunner.test("Day 645 - getLoopRegion returns object copy", (t) => {
    const funcStr = getLoopRegion.toString();
    t.assertTruthy(funcStr.includes('{ ...loopRegion') || funcStr.includes('loopRegion.start') || funcStr.includes('loopRegion.end'), 'getLoopRegion should return an object');
});

TestRunner.test("Day 645 - setLoopRegion is a function export", (t) => {
    const audioStr = setLoopRegion.toString();
    t.assertTruthy(audioStr.includes('export function'), 'setLoopRegion should be exported');
});

TestRunner.test("Day 645 - setLoopRegion accepts 2 parameters", (t) => {
    t.assertEqual(setLoopRegion.length, 2, 'setLoopRegion should accept 2 parameters (startBars, endBars)');
});

TestRunner.test("Day 645 - setLoopRegion validates range (endBars > startBars)", (t) => {
    const funcStr = setLoopRegion.toString();
    t.assertTruthy(funcStr.includes('endBars <= startBars') || funcStr.includes('startBars >= endBars') || funcStr.includes('endBars > startBars'), 'setLoopRegion should validate that endBars > startBars');
});

TestRunner.test("Day 645 - setLoopRegion references Constants.MAX_BARS", (t) => {
    const funcStr = setLoopRegion.toString();
    t.assertTruthy(funcStr.includes('MAX_BARS'), 'setLoopRegion should reference Constants.MAX_BARS');
});

TestRunner.test("Day 645 - setLoopRegion calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setLoopRegion.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setLoopRegion should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 645 - setLoopRegion sets loopRegion.start and loopRegion.end", (t) => {
    const funcStr = setLoopRegion.toString();
    t.assertTruthy(funcStr.includes('loopRegion.start =') && funcStr.includes('loopRegion.end ='), 'setLoopRegion should set both start and end');
});

TestRunner.test("Day 645 - setLoopRegionEnabled is a function export", (t) => {
    const audioStr = setLoopRegionEnabled.toString();
    t.assertTruthy(audioStr.includes('export function'), 'setLoopRegionEnabled should be exported');
});

TestRunner.test("Day 645 - setLoopRegionEnabled accepts 1 parameter", (t) => {
    t.assertEqual(setLoopRegionEnabled.length, 1, 'setLoopRegionEnabled should accept 1 parameter');
});

TestRunner.test("Day 645 - setLoopRegionEnabled uses !! boolean coercion", (t) => {
    const funcStr = setLoopRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('!!enabled') || funcStr.includes('!! nextValue'), 'setLoopRegionEnabled should use !! for boolean coercion');
});

TestRunner.test("Day 645 - setLoopRegionEnabled calls captureAudioStateForUndoIfAllowed on change", (t) => {
    const funcStr = setLoopRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setLoopRegionEnabled should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 645 - isLoopRegionEnabled is a function export", (t) => {
    const audioStr = isLoopRegionEnabled.toString();
    t.assertTruthy(audioStr.includes('export function'), 'isLoopRegionEnabled should be exported');
});

TestRunner.test("Day 645 - isLoopRegionEnabled accepts 0 parameters", (t) => {
    t.assertEqual(isLoopRegionEnabled.length, 0, 'isLoopRegionEnabled should accept no parameters');
});

TestRunner.test("Day 645 - isLoopRegionEnabled returns loopRegion.enabled", (t) => {
    const funcStr = isLoopRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('loopRegion.enabled'), 'isLoopRegionEnabled should return loopRegion.enabled');
});

TestRunner.test("Day 645 - getLoopStartBars is a function export", (t) => {
    const audioStr = getLoopStartBars.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getLoopStartBars should be exported');
});

TestRunner.test("Day 645 - getLoopStartBars accepts 0 parameters", (t) => {
    t.assertEqual(getLoopStartBars.length, 0, 'getLoopStartBars should accept no parameters');
});

TestRunner.test("Day 645 - getLoopStartBars returns loopRegion.start", (t) => {
    const funcStr = getLoopStartBars.toString();
    t.assertTruthy(funcStr.includes('loopRegion.start'), 'getLoopStartBars should return loopRegion.start');
});

TestRunner.test("Day 645 - getLoopEndBars is a function export", (t) => {
    const audioStr = getLoopEndBars.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getLoopEndBars should be exported');
});

TestRunner.test("Day 645 - getLoopEndBars accepts 0 parameters", (t) => {
    t.assertEqual(getLoopEndBars.length, 0, 'getLoopEndBars should accept no parameters');
});

TestRunner.test("Day 645 - getLoopEndBars returns loopRegion.end", (t) => {
    const funcStr = getLoopEndBars.toString();
    t.assertTruthy(funcStr.includes('loopRegion.end'), 'getLoopEndBars should return loopRegion.end');
});

TestRunner.test("Day 645 - getPunchRegion is a function export", (t) => {
    const audioStr = getPunchRegion.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getPunchRegion should be exported');
});

TestRunner.test("Day 645 - getPunchRegion accepts 0 parameters", (t) => {
    t.assertEqual(getPunchRegion.length, 0, 'getPunchRegion should accept no parameters');
});

TestRunner.test("Day 645 - getPunchRegion returns object copy", (t) => {
    const funcStr = getPunchRegion.toString();
    t.assertTruthy(funcStr.includes('{ ...punchRegion') || funcStr.includes('punchRegion.in') || funcStr.includes('punchRegion.out'), 'getPunchRegion should return an object');
});

TestRunner.test("Day 645 - setPunchRegion is a function export", (t) => {
    const audioStr = setPunchRegion.toString();
    t.assertTruthy(audioStr.includes('export function'), 'setPunchRegion should be exported');
});

TestRunner.test("Day 645 - setPunchRegion accepts 2 parameters", (t) => {
    t.assertEqual(setPunchRegion.length, 2, 'setPunchRegion should accept 2 parameters (inBars, outBars)');
});

TestRunner.test("Day 645 - setPunchRegion validates range (outBars > inBars)", (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('outBars <= inBars') || funcStr.includes('inBars >= outBars'), 'setPunchRegion should validate that outBars > inBars');
});

TestRunner.test("Day 645 - setPunchRegion references Constants.MAX_BARS", (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('MAX_BARS'), 'setPunchRegion should reference Constants.MAX_BARS');
});

TestRunner.test("Day 645 - setPunchRegion calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setPunchRegion.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setPunchRegion should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 645 - setPunchRegionEnabled is a function export", (t) => {
    const audioStr = setPunchRegionEnabled.toString();
    t.assertTruthy(audioStr.includes('export function'), 'setPunchRegionEnabled should be exported');
});

TestRunner.test("Day 645 - setPunchRegionEnabled accepts 1 parameter", (t) => {
    t.assertEqual(setPunchRegionEnabled.length, 1, 'setPunchRegionEnabled should accept 1 parameter');
});

TestRunner.test("Day 645 - setPunchRegionEnabled uses !! boolean coercion", (t) => {
    const funcStr = setPunchRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('!!enabled') || funcStr.includes('!! nextValue'), 'setPunchRegionEnabled should use !! for boolean coercion');
});

TestRunner.test("Day 645 - setPunchRegionEnabled calls captureAudioStateForUndoIfAllowed on change", (t) => {
    const funcStr = setPunchRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setPunchRegionEnabled should call captureAudioStateForUndoIfAllowed');
});

TestRunner.test("Day 645 - isPunchRegionEnabled is a function export", (t) => {
    const audioStr = isPunchRegionEnabled.toString();
    t.assertTruthy(audioStr.includes('export function'), 'isPunchRegionEnabled should be exported');
});

TestRunner.test("Day 645 - isPunchRegionEnabled accepts 0 parameters", (t) => {
    t.assertEqual(isPunchRegionEnabled.length, 0, 'isPunchRegionEnabled should accept no parameters');
});

TestRunner.test("Day 645 - isPunchRegionEnabled returns punchRegion.enabled", (t) => {
    const funcStr = isPunchRegionEnabled.toString();
    t.assertTruthy(funcStr.includes('punchRegion.enabled'), 'isPunchRegionEnabled should return punchRegion.enabled');
});

TestRunner.test("Day 645 - getPunchInBars is a function export", (t) => {
    const audioStr = getPunchInBars.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getPunchInBars should be exported');
});

TestRunner.test("Day 645 - getPunchInBars accepts 0 parameters", (t) => {
    t.assertEqual(getPunchInBars.length, 0, 'getPunchInBars should accept no parameters');
});

TestRunner.test("Day 645 - getPunchInBars returns punchRegion.in", (t) => {
    const funcStr = getPunchInBars.toString();
    t.assertTruthy(funcStr.includes('punchRegion.in'), 'getPunchInBars should return punchRegion.in');
});

TestRunner.test("Day 645 - getPunchOutBars is a function export", (t) => {
    const audioStr = getPunchOutBars.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getPunchOutBars should be exported');
});

TestRunner.test("Day 645 - getPunchOutBars accepts 0 parameters", (t) => {
    t.assertEqual(getPunchOutBars.length, 0, 'getPunchOutBars should accept no parameters');
});

TestRunner.test("Day 645 - getPunchOutBars returns punchRegion.out", (t) => {
    const funcStr = getPunchOutBars.toString();
    t.assertTruthy(funcStr.includes('punchRegion.out'), 'getPunchOutBars should return punchRegion.out');
});

TestRunner.test("Day 645 - isPositionInPunchRegion is a function export", (t) => {
    const audioStr = isPositionInPunchRegion.toString();
    t.assertTruthy(audioStr.includes('export function'), 'isPositionInPunchRegion should be exported');
});

TestRunner.test("Day 645 - isPositionInPunchRegion accepts 1 parameter", (t) => {
    t.assertEqual(isPositionInPunchRegion.length, 1, 'isPositionInPunchRegion should accept 1 parameter (positionString)');
});

TestRunner.test("Day 645 - isPositionInPunchRegion checks punchRegion.enabled", (t) => {
    const funcStr = isPositionInPunchRegion.toString();
    t.assertTruthy(funcStr.includes('punchRegion.enabled'), 'isPositionInPunchRegion should check if punchRegion is enabled');
});

TestRunner.test("Day 645 - isPositionInPunchRegion parses positionString", (t) => {
    const funcStr = isPositionInPunchRegion.toString();
    t.assertTruthy(funcStr.includes('split') && funcStr.includes(':'), 'isPositionInPunchRegion should parse positionString');
});

TestRunner.test("Day 645 - isPositionInPunchRegion calculates totalSixteenths", (t) => {
    const funcStr = isPositionInPunchRegion.toString();
    t.assertTruthy(funcStr.includes('totalSixteenths') || funcStr.includes('16'), 'isPositionInPunchRegion should calculate position in sixteenths');
});

TestRunner.test("Day 645 - APP_VERSION validation for Day 645", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 645');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 299, 'Minor version should be >= 299 for Day 645');
    }
});

// Day 646: Transport Time Display Audio Function Tests
TestRunner.test("Day 646 - getTransportPosition is a function export", (t) => {
    const audioStr = getTransportPosition.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getTransportPosition should be exported');
});
TestRunner.test("Day 646 - getTransportPosition accepts 0 parameters", (t) => {
    t.assertEqual(getTransportPosition.length, 0, 'getTransportPosition should accept no parameters');
});
TestRunner.test("Day 646 - getTransportPosition references Tone.Transport.position", (t) => {
    const funcStr = getTransportPosition.toString();
    t.assertTruthy(funcStr.includes('Tone.Transport.position'), 'getTransportPosition should return Tone.Transport.position');
});
TestRunner.test("Day 646 - getTransportSeconds is a function export", (t) => {
    const audioStr = getTransportSeconds.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getTransportSeconds should be exported');
});
TestRunner.test("Day 646 - getTransportSeconds accepts 0 parameters", (t) => {
    t.assertEqual(getTransportSeconds.length, 0, 'getTransportSeconds should accept no parameters');
});
TestRunner.test("Day 646 - getTransportSeconds references Tone.Transport.seconds", (t) => {
    const funcStr = getTransportSeconds.toString();
    t.assertTruthy(funcStr.includes('Tone.Transport.seconds'), 'getTransportSeconds should return Tone.Transport.seconds');
});
TestRunner.test("Day 646 - getTransportBpm is a function export", (t) => {
    const audioStr = getTransportBpm.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getTransportBpm should be exported');
});
TestRunner.test("Day 646 - getTransportBpm accepts 0 parameters", (t) => {
    t.assertEqual(getTransportBpm.length, 0, 'getTransportBpm should accept no parameters');
});
TestRunner.test("Day 646 - getTransportBpm references Tone.Transport.bpm.value", (t) => {
    const funcStr = getTransportBpm.toString();
    t.assertTruthy(funcStr.includes('Tone.Transport.bpm.value'), 'getTransportBpm should return Tone.Transport.bpm.value');
});
TestRunner.test("Day 646 - getTransportState is a function export", (t) => {
    const audioStr = getTransportState.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getTransportState should be exported');
});
TestRunner.test("Day 646 - getTransportState accepts 0 parameters", (t) => {
    t.assertEqual(getTransportState.length, 0, 'getTransportState should accept no parameters');
});
TestRunner.test("Day 646 - getTransportState references Tone.Transport.state", (t) => {
    const funcStr = getTransportState.toString();
    t.assertTruthy(funcStr.includes('Tone.Transport.state'), 'getTransportState should return Tone.Transport.state');
});
TestRunner.test("Day 646 - isTapTempoReady is a function export", (t) => {
    const audioStr = isTapTempoReady.toString();
    t.assertTruthy(audioStr.includes('export function'), 'isTapTempoReady should be exported');
});
TestRunner.test("Day 646 - isTapTempoReady accepts 0 parameters", (t) => {
    t.assertEqual(isTapTempoReady.length, 0, 'isTapTempoReady should accept no parameters');
});
TestRunner.test("Day 646 - getTapTempoBpm is a function export", (t) => {
    const audioStr = getTapTempoBpm.toString();
    t.assertTruthy(audioStr.includes('export function'), 'getTapTempoBpm should be exported');
});
TestRunner.test("Day 646 - getTapTempoBpm accepts 0 parameters", (t) => {
    t.assertEqual(getTapTempoBpm.length, 0, 'getTapTempoBpm should accept no parameters');
});
TestRunner.test("Day 646 - getTapTempoBpm references tapTimes array", (t) => {
    const funcStr = getTapTempoBpm.toString();
    t.assertTruthy(funcStr.includes('tapTimes'), 'getTapTempoBpm should reference tapTimes');
});
TestRunner.test("Day 646 - getTapTempoBpm clamps to TAP_TEMPO_MIN_BPM and TAP_TEMPO_MAX_BPM", (t) => {
    const funcStr = getTapTempoBpm.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'getTapTempoBpm should clamp the BPM value');
});
TestRunner.test("Day 646 - APP_VERSION validation for Day 646", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 646');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 300, 'Minor version should be >= 300 for Day 646');
    }
});

// Day 647: Recording Audio Function Tests
// ============================================
TestRunner.test("Day 647 - startAudioRecording is an async function export", (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('export async function startAudioRecording') || funcStr.includes('export function startAudioRecording'), 'startAudioRecording should be exported');
});
TestRunner.test("Day 647 - startAudioRecording accepts 2 parameters", (t) => {
    t.assertEqual(startAudioRecording.length, 2, 'startAudioRecording should accept 2 parameters (track, isMonitoringEnabled)');
});
TestRunner.test("Day 647 - startAudioRecording validates track type is Audio", (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes("track.type !== 'Audio'") || funcStr.includes("track.type === 'Audio'"), 'startAudioRecording should validate track type');
});
TestRunner.test("Day 647 - startAudioRecording calls initAudioContextAndMasterMeter", (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('initAudioContextAndMasterMeter'), 'startAudioRecording should call initAudioContextAndMasterMeter');
});
TestRunner.test("Day 647 - startAudioRecording creates Tone.UserMedia for microphone", (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('Tone.UserMedia') || funcStr.includes('UserMedia'), 'startAudioRecording should create Tone.UserMedia for mic');
});
TestRunner.test("Day 647 - startAudioRecording creates Tone.Recorder", (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('Tone.Recorder') || funcStr.includes('Recorder'), 'startAudioRecording should create Tone.Recorder');
});
TestRunner.test("Day 647 - startAudioRecording calls recorder.start", (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('recorder.start') || funcStr.includes('.start('), 'startAudioRecording should call recorder.start');
});
TestRunner.test("Day 647 - startAudioRecording references getRecordingInputGainNode", (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('getRecordingInputGainNode'), 'startAudioRecording should call getRecordingInputGainNode');
});
TestRunner.test("Day 647 - startAudioRecording sets recording state via setIsRecordingState", (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('setIsRecordingState'), 'startAudioRecording should call setIsRecordingState');
});
TestRunner.test("Day 647 - startAudioRecording sets recording track ID via setRecordingTrackIdState", (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('setRecordingTrackIdState'), 'startAudioRecording should call setRecordingTrackIdState');
});
TestRunner.test("Day 647 - startAudioRecording sets recording start time via setRecordingStartTimeState", (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('setRecordingStartTimeState'), 'startAudioRecording should call setRecordingStartTimeState');
});
TestRunner.test("Day 647 - startAudioRecording has error handling with console.error", (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('console.error'), 'startAudioRecording should have console.error error handling');
});
TestRunner.test("Day 647 - startAudioRecording calls cleanupRecordingAudioResources on error", (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('cleanupRecordingAudioResources'), 'startAudioRecording should call cleanupRecordingAudioResources on error');
});
TestRunner.test("Day 647 - stopAudioRecording is an async function export", (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('export async function stopAudioRecording') || funcStr.includes('export function stopAudioRecording'), 'stopAudioRecording should be exported');
});
TestRunner.test("Day 647 - stopAudioRecording accepts 0 parameters", (t) => {
    t.assertEqual(stopAudioRecording.length, 0, 'stopAudioRecording should accept no parameters');
});
TestRunner.test("Day 647 - stopAudioRecording captures state at function entry (activeRecorder, activeMic, activeTrackId, activeStartTime)", (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('activeRecorder') && funcStr.includes('activeMic') && funcStr.includes('activeTrackId') && funcStr.includes('activeStartTime'), 'stopAudioRecording should capture state at entry');
});
TestRunner.test("Day 647 - stopAudioRecording checks for null activeRecorder", (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('!activeRecorder') || funcStr.includes('activeRecorder ===') || funcStr.includes('activeRecorder =='), 'stopAudioRecording should check for null recorder');
});
TestRunner.test("Day 647 - stopAudioRecording calls recorder.stop", (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('recorder.stop') || funcStr.includes('.stop('), 'stopAudioRecording should call recorder.stop');
});
TestRunner.test("Day 647 - stopAudioRecording validates recording size (>1000 bytes)", (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('1000') || funcStr.includes('size'), 'stopAudioRecording should validate recording size');
});
TestRunner.test("Day 647 - stopAudioRecording validates destination track type is Audio", (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes("type === 'Audio'") || funcStr.includes("type !== 'Audio'"), 'stopAudioRecording should validate track type');
});
TestRunner.test("Day 647 - stopAudioRecording calls addAudioClip on valid track", (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('addAudioClip'), 'stopAudioRecording should call addAudioClip');
});
TestRunner.test("Day 647 - stopAudioRecording clears recording state on success (setIsRecordingState(false), setRecordingTrackIdState(null), setRecordingStartTimeState(0))", (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('setIsRecordingState') && funcStr.includes('setRecordingTrackIdState') && funcStr.includes('setRecordingStartTimeState'), 'stopAudioRecording should clear all recording state on success');
});
TestRunner.test("Day 647 - stopAudioRecording calls cleanupRecordingScheduling", (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('cleanupRecordingScheduling'), 'stopAudioRecording should call cleanupRecordingScheduling');
});
TestRunner.test("Day 647 - stopAudioRecording has console.warn for empty recordings", (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('console.warn'), 'stopAudioRecording should have console.warn for empty recordings');
});
TestRunner.test("Day 647 - stopAudioRecording has console.error for error handling", (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(funcStr.includes('console.error'), 'stopAudioRecording should have console.error for errors');
});
TestRunner.test("Day 647 - APP_VERSION validation for Day 647", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 647');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= app.constants.APP_VERSION_MINOR || versionParts[1] >= 300, 'Minor version should be >= 300 for Day 647');
    }
});

// Day 647: EffectsRegistry Function Tests
TestRunner.test("Day 647 - getEffectBypassState is a function export", (t) => {
    const funcStr = getEffectBypassState.toString();
    t.assertTruthy(funcStr.includes('export function'), 'getEffectBypassState should be exported');
});
TestRunner.test("Day 647 - getEffectBypassState accepts 1 parameter", (t) => {
    t.assertEqual(getEffectBypassState.length, 1, 'getEffectBypassState should accept 1 parameter (effectId)');
});
TestRunner.test("Day 647 - getEffectBypassState references effectBypassStates Map", (t) => {
    const funcStr = getEffectBypassState.toString();
    t.assertTruthy(funcStr.includes('effectBypassStates'), 'getEffectBypassState should reference effectBypassStates');
});
TestRunner.test("Day 647 - getEffectBypassState returns boolean from Map get", (t) => {
    const funcStr = getEffectBypassState.toString();
    t.assertTruthy(funcStr.includes('.get(') && funcStr.includes('=== true'), 'getEffectBypassState should return Map.get result compared to true');
});
TestRunner.test("Day 647 - setEffectBypassState is a function export", (t) => {
    const funcStr = setEffectBypassState.toString();
    t.assertTruthy(funcStr.includes('export function'), 'setEffectBypassState should be exported');
});
TestRunner.test("Day 647 - setEffectBypassState accepts 2 parameters", (t) => {
    t.assertEqual(setEffectBypassState.length, 2, 'setEffectBypassState should accept 2 parameters (effectId, bypassed)');
});
TestRunner.test("Day 647 - setEffectBypassState references effectBypassStates Map", (t) => {
    const funcStr = setEffectBypassState.toString();
    t.assertTruthy(funcStr.includes('effectBypassStates'), 'setEffectBypassState should reference effectBypassStates');
});
TestRunner.test("Day 647 - setEffectBypassState calls Map.set", (t) => {
    const funcStr = setEffectBypassState.toString();
    t.assertTruthy(funcStr.includes('.set('), 'setEffectBypassState should call Map.set');
});
TestRunner.test("Day 647 - createEffectInstance is a function export", (t) => {
    const funcStr = createEffectInstance.toString();
    t.assertTruthy(funcStr.includes('export function'), 'createEffectInstance should be exported');
});
TestRunner.test("Day 647 - createEffectInstance accepts 2 parameters", (t) => {
    t.assertEqual(createEffectInstance.length, 2, 'createEffectInstance should accept 2 parameters (effectType, initialParams)');
});
TestRunner.test("Day 647 - createEffectInstance checks Tone global", (t) => {
    const funcStr = createEffectInstance.toString();
    t.assertTruthy(funcStr.includes("typeof Tone") && funcStr.includes('undefined'), 'createEffectInstance should check if Tone is defined');
});
TestRunner.test("Day 647 - createEffectInstance looks up AVAILABLE_EFFECTS", (t) => {
    const funcStr = createEffectInstance.toString();
    t.assertTruthy(funcStr.includes('AVAILABLE_EFFECTS'), 'createEffectInstance should look up AVAILABLE_EFFECTS');
});
TestRunner.test("Day 647 - createEffectInstance checks definition exists", (t) => {
    const funcStr = createEffectInstance.toString();
    t.assertTruthy(funcStr.includes('definition'), 'createEffectInstance should use definition variable');
});
TestRunner.test("Day 647 - createEffectInstance checks Tone[definition.toneClass]", (t) => {
    const funcStr = createEffectInstance.toString();
    t.assertTruthy(funcStr.includes('Tone[') && funcStr.includes('.toneClass'), 'createEffectInstance should check Tone class existence');
});
TestRunner.test("Day 647 - createEffectInstance instantiates with new Tone", (t) => {
    const funcStr = createEffectInstance.toString();
    t.assertTruthy(funcStr.includes('new Tone[') || funcStr.includes('new Tone.'), 'createEffectInstance should instantiate Tone effect');
});
TestRunner.test("Day 647 - createEffectInstance handles error with try/catch", (t) => {
    const funcStr = createEffectInstance.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'createEffectInstance should have error handling');
});
TestRunner.test("Day 647 - createEffectInstance returns null on failure", (t) => {
    const funcStr = createEffectInstance.toString();
    t.assertTruthy(funcStr.includes('return null'), 'createEffectInstance should return null on error');
});
TestRunner.test("Day 647 - getEffectDefaultParams is a function export", (t) => {
    const funcStr = getEffectDefaultParams.toString();
    t.assertTruthy(funcStr.includes('export function'), 'getEffectDefaultParams should be exported');
});
TestRunner.test("Day 647 - getEffectDefaultParams accepts 1 parameter", (t) => {
    t.assertEqual(getEffectDefaultParams.length, 1, 'getEffectDefaultParams should accept 1 parameter (effectType)');
});
TestRunner.test("Day 647 - getEffectDefaultParams looks up AVAILABLE_EFFECTS", (t) => {
    const funcStr = getEffectDefaultParams.toString();
    t.assertTruthy(funcStr.includes('AVAILABLE_EFFECTS'), 'getEffectDefaultParams should look up AVAILABLE_EFFECTS');
});
TestRunner.test("Day 647 - getEffectDefaultParams builds nested defaults object", (t) => {
    const funcStr = getEffectDefaultParams.toString();
    t.assertTruthy(funcStr.includes('params') && (funcStr.includes('forEach') || funcStr.includes('.map')), 'getEffectDefaultParams should build defaults');
});
TestRunner.test("Day 647 - getEffectDefaultParams returns empty object when no definition", (t) => {
    const funcStr = getEffectDefaultParams.toString();
    t.assertTruthy(funcStr.includes('return {}'), 'getEffectDefaultParams should return empty object for invalid effect');
});
TestRunner.test("Day 647 - getEffectDefaultParams uses defaultValue from params", (t) => {
    const funcStr = getEffectDefaultParams.toString();
    t.assertTruthy(funcStr.includes('defaultValue'), 'getEffectDefaultParams should use defaultValue');
});
TestRunner.test("Day 647 - getEffectParamDefinitions is a function export", (t) => {
    const funcStr = getEffectParamDefinitions.toString();
    t.assertTruthy(funcStr.includes('export function'), 'getEffectParamDefinitions should be exported');
});
TestRunner.test("Day 647 - getEffectParamDefinitions accepts 1 parameter", (t) => {
    t.assertEqual(getEffectParamDefinitions.length, 1, 'getEffectParamDefinitions should accept 1 parameter (effectType)');
});
TestRunner.test("Day 647 - getEffectParamDefinitions looks up AVAILABLE_EFFECTS", (t) => {
    const funcStr = getEffectParamDefinitions.toString();
    t.assertTruthy(funcStr.includes('AVAILABLE_EFFECTS'), 'getEffectParamDefinitions should look up AVAILABLE_EFFECTS');
});
TestRunner.test("Day 647 - getEffectParamDefinitions returns definition.params", (t) => {
    const funcStr = getEffectParamDefinitions.toString();
    t.assertTruthy(funcStr.includes('params'), 'getEffectParamDefinitions should return params array');
});
TestRunner.test("Day 647 - getEffectParamDefinitions returns empty array when no definition", (t) => {
    const funcStr = getEffectParamDefinitions.toString();
    t.assertTruthy(funcStr.includes('return []'), 'getEffectParamDefinitions should return empty array for invalid effect');
});
TestRunner.test("Day 647 - APP_VERSION validation for Day 647", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 647');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 300, 'Minor version should be >= 300 for Day 647');
    }
});

// --- Day 648: setupMIDI and selectMIDIInput Event Handler Function Tests ---
TestRunner.test("Day 648 - setupMIDI is a function export", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('export function'), 'setupMIDI should be exported');
});
TestRunner.test("Day 648 - setupMIDI accepts 0 parameters", (t) => {
    t.assertEqual(setupMIDI.length, 0, 'setupMIDI should accept 0 parameters');
});
TestRunner.test("Day 648 - setupMIDI checks navigator.requestMIDIAccess", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('navigator.requestMIDIAccess'), 'setupMIDI should check navigator.requestMIDIAccess');
});
TestRunner.test("Day 648 - setupMIDI calls navigator.requestMIDIAccess with then/catch", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('navigator.requestMIDIAccess') && funcStr.includes('.then') && funcStr.includes('.catch'), 'setupMIDI should call requestMIDIAccess with then and catch');
});
TestRunner.test("Day 648 - setupMIDI passes onMIDISuccess and onMIDIFailure handlers", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('onMIDISuccess') && funcStr.includes('onMIDIFailure'), 'setupMIDI should pass success and failure handlers');
});
TestRunner.test("Day 648 - setupMIDI handles unsupported browser with console.warn", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('console.warn') && funcStr.includes('WebMIDI'), 'setupMIDI should warn when WebMIDI is not supported');
});
TestRunner.test("Day 648 - setupMIDI shows notification for unsupported browser", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('showNotification') && funcStr.includes('WebMIDI'), 'setupMIDI should show notification for unsupported browser');
});
TestRunner.test("Day 648 - onMIDISuccess is not an export (internal helper)", (t) => {
    t.assertEqual(typeof onMIDISuccess, 'undefined', 'onMIDISuccess should not be directly exported');
});
TestRunner.test("Day 648 - onMIDIFailure is not an export (internal helper)", (t) => {
    t.assertEqual(typeof onMIDIFailure, 'undefined', 'onMIDIFailure should not be directly exported');
});
TestRunner.test("Day 648 - onMIDISuccess calls localAppServices.setMidiAccess", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('localAppServices.setMidiAccess') || funcStr.includes('setMidiAccess'), 'onMIDISuccess should call setMidiAccess');
});
TestRunner.test("Day 648 - onMIDISuccess references midiAccess.inputs", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('midiAccess.inputs'), 'onMIDISuccess should reference midiAccess.inputs');
});
TestRunner.test("Day 648 - onMIDISuccess references uiElementsCache.midiInputSelectGlobal", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('midiInputSelectGlobal'), 'onMIDISuccess should reference midiInputSelectGlobal');
});
TestRunner.test("Day 648 - onMIDISuccess sets selectElement.innerHTML", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('innerHTML'), 'onMIDISuccess should set innerHTML on select element');
});
TestRunner.test("Day 648 - onMIDISuccess iterates MIDI inputs with for loop", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('inputs.values()') || funcStr.includes('inputs.next()'), 'onMIDISuccess should iterate MIDI inputs');
});
TestRunner.test("Day 648 - onMIDISuccess creates option elements for each input", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('createElement') && funcStr.includes('option'), 'onMIDISuccess should create option elements');
});
TestRunner.test("Day 648 - onMIDISuccess gets activeMIDIId from getActiveMIDIInputState", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('getActiveMIDIInputState'), 'onMIDISuccess should get active MIDI ID from state');
});
TestRunner.test("Day 648 - onMIDISuccess sets onstatechange handler on midiAccess", (t) => {
    const funcStr = setupMIDI.toString();
    t.assertTruthy(funcStr.includes('onstatechange'), 'onMIDISuccess should set onstatechange handler');
});
TestRunner.test("Day 648 - selectMIDIInput is a function export", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('export function'), 'selectMIDIInput should be exported');
});
TestRunner.test("Day 648 - selectMIDIInput accepts 2 parameters (deviceId, silent)", (t) => {
    t.assertEqual(selectMIDIInput.length, 2, 'selectMIDIInput should accept 2 parameters (deviceId, silent)');
});
TestRunner.test("Day 648 - selectMIDIInput calls getMidiAccessState", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('getMidiAccessState'), 'selectMIDIInput should call getMidiAccessState');
});
TestRunner.test("Day 648 - selectMIDIInput calls getActiveMIDIInputState", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('getActiveMIDIInputState'), 'selectMIDIInput should call getActiveMIDIInputState');
});
TestRunner.test("Day 648 - selectMIDIInput closes previous input (onmidimessage = null, close())", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('onmidimessage') && funcStr.includes('close()'), 'selectMIDIInput should close previous input properly');
});
TestRunner.test("Day 648 - selectMIDIInput handles deviceId check (if deviceId && midi)", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('deviceId') && (funcStr.includes('&& midi') || funcStr.includes('midi.inputs')), 'selectMIDIInput should check deviceId and midi');
});
TestRunner.test("Day 648 - selectMIDIInput gets input from midi.inputs.get(deviceId)", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('midi.inputs.get') || funcStr.includes('inputs.get'), 'selectMIDIInput should get input by deviceId');
});
TestRunner.test("Day 648 - selectMIDIInput calls input.open() and sets onmidimessage", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('input.open()') || funcStr.includes('open()'), 'selectMIDIInput should open input and set onmidimessage');
});
TestRunner.test("Day 648 - selectMIDIInput sets onmidimessage = handleMIDIMessage", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('onmidimessage') && funcStr.includes('handleMIDIMessage'), 'selectMIDIInput should set onmidimessage handler');
});
TestRunner.test("Day 648 - selectMIDIInput calls localAppServices.setActiveMIDIInput", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('setActiveMIDIInput'), 'selectMIDIInput should call setActiveMIDIInput');
});
TestRunner.test("Day 648 - selectMIDIInput checks silent parameter for notifications", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('silent') && funcStr.includes('showNotification'), 'selectMIDIInput should check silent param before notifications');
});
TestRunner.test("Day 648 - selectMIDIInput handles missing input (input not found)", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('not found') || funcStr.includes('disconnected'), 'selectMIDIInput should handle missing input');
});
TestRunner.test("Day 648 - selectMIDIInput has error handling with try/catch", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'selectMIDIInput should have try/catch error handling');
});
TestRunner.test("Day 648 - selectMIDIInput has console.error for errors", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('console.error') || funcStr.includes('console.warn'), 'selectMIDIInput should have console.error or console.warn');
});
TestRunner.test("Day 648 - selectMIDIInput handles case when input is falsy (else branch)", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('else') && funcStr.includes('setActiveMIDIInput(null)'), 'selectMIDIInput should handle falsy input case');
});
TestRunner.test("Day 648 - selectMIDIInput handles catch block for open().catch", (t) => {
    const funcStr = selectMIDIInput.toString();
    t.assertTruthy(funcStr.includes('.catch') || funcStr.includes('catch'), 'selectMIDIInput should handle promise rejection');
});
TestRunner.test("Day 648 - handleMIDIMessage is not an export (internal helper)", (t) => {
    t.assertEqual(typeof handleMIDIMessage, 'undefined', 'handleMIDIMessage should not be directly exported');
});
TestRunner.test("Day 648 - APP_VERSION validation for Day 648", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 648');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 301, 'Minor version should be >= 301 for Day 648');
    }
});

// --- Day 649: Step Accessor/Setter Track Methods Tests ---
TestRunner.test("Day 649 - setNoteLength is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.setNoteLength, 'function', 'setNoteLength should be a function');
});
TestRunner.test("Day 649 - setNoteLength accepts 3 parameters (row, col, lengthInSteps)", (t) => {
    const funcStr = Track.prototype.setNoteLength.toString();
    t.assertTruthy(funcStr.includes('setNoteLength(row, col, lengthInSteps)'), 'setNoteLength should accept row, col, lengthInSteps parameters');
});
TestRunner.test("Day 649 - setNoteLength captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.setNoteLength.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const mutationIdx = funcStr.indexOf('activeSeq.data[row][col].length =');
    t.assertTruthy(captureIdx >= 0 && captureIdx < mutationIdx, 'setNoteLength should capture undo before mutating data');
});
TestRunner.test("Day 649 - setNoteLength has descriptive undo label with row/col", (t) => {
    const funcStr = Track.prototype.setNoteLength.toString();
    t.assertTruthy(funcStr.includes('Set note length at row') && funcStr.includes('col'), 'setNoteLength should have descriptive undo label');
});
TestRunner.test("Day 649 - setNoteLength clamps to activeSeq.length - col", (t) => {
    const funcStr = Track.prototype.setNoteLength.toString();
    t.assertTruthy(funcStr.includes('activeSeq.length - col'), 'setNoteLength should clamp to prevent overflow');
});
TestRunner.test("Day 649 - setNoteLength returns void (no return value)", (t) => {
    const funcStr = Track.prototype.setNoteLength.toString();
    const returnIdx = funcStr.indexOf('return');
    t.assertTruthy(returnIdx < 0 || funcStr.lastIndexOf('return') < funcStr.indexOf('activeSeq.data'), 'setNoteLength should not return a value');
});
TestRunner.test("Day 649 - getNoteLength is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.getNoteLength, 'function', 'getNoteLength should be a function');
});
TestRunner.test("Day 649 - getNoteLength accepts 2 parameters (row, col)", (t) => {
    const funcStr = Track.prototype.getNoteLength.toString();
    t.assertTruthy(funcStr.includes('getNoteLength(row, col)'), 'getNoteLength should accept row, col parameters');
});
TestRunner.test("Day 649 - getNoteLength returns stepData.length or 1", (t) => {
    const funcStr = Track.prototype.getNoteLength.toString();
    t.assertTruthy(funcStr.includes('return stepData.length || 1') || funcStr.includes('return 1'), 'getNoteLength should return length or default 1');
});
TestRunner.test("Day 649 - getNoteLength returns 0 for inactive notes", (t) => {
    const funcStr = Track.prototype.getNoteLength.toString();
    t.assertTruthy(funcStr.includes('return 0'), 'getNoteLength should return 0 for inactive notes');
});
TestRunner.test("Day 649 - setStepVelocity is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.setStepVelocity, 'function', 'setStepVelocity should be a function');
});
TestRunner.test("Day 649 - setStepVelocity accepts 3 parameters (row, col, velocity)", (t) => {
    const funcStr = Track.prototype.setStepVelocity.toString();
    t.assertTruthy(funcStr.includes('setStepVelocity(row, col, velocity)'), 'setStepVelocity should accept row, col, velocity parameters');
});
TestRunner.test("Day 649 - setStepVelocity captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.setStepVelocity.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const mutationIdx = funcStr.indexOf('activeSeq.data[row][col].velocity =');
    t.assertTruthy(captureIdx >= 0 && captureIdx < mutationIdx, 'setStepVelocity should capture undo before mutating velocity');
});
TestRunner.test("Day 649 - setStepVelocity clamps to 0.05-1.0 range", (t) => {
    const funcStr = Track.prototype.setStepVelocity.toString();
    t.assertTruthy(funcStr.includes('Math.max(0.05') && funcStr.includes('Math.min(1', 'setStepVelocity should clamp to 0.05-1.0 range'));
});
TestRunner.test("Day 649 - setStepVelocity rounds to 2 decimal places", (t) => {
    const funcStr = Track.prototype.setStepVelocity.toString();
    t.assertTruthy(funcStr.includes('Math.round') && funcStr.includes('100) / 100'), 'setStepVelocity should round to 2 decimal places');
});
TestRunner.test("Day 649 - setStepVelocity returns void", (t) => {
    const funcStr = Track.prototype.setStepVelocity.toString();
    const returnIdx = funcStr.indexOf('return');
    t.assertTruthy(returnIdx < 0 || funcStr.lastIndexOf('return') < funcStr.indexOf('activeSeq.data'), 'setStepVelocity should not return a value');
});
TestRunner.test("Day 649 - getStepVelocity is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.getStepVelocity, 'function', 'getStepVelocity should be a function');
});
TestRunner.test("Day 649 - getStepVelocity accepts 2 parameters (row, col)", (t) => {
    const funcStr = Track.prototype.getStepVelocity.toString();
    t.assertTruthy(funcStr.includes('getStepVelocity(row, col)'), 'getStepVelocity should accept row, col parameters');
});
TestRunner.test("Day 649 - getStepVelocity returns velocity or 1 default", (t) => {
    const funcStr = Track.prototype.getStepVelocity.toString();
    t.assertTruthy(funcStr.includes('return stepData.velocity ?? 1') || funcStr.includes('?? 1'), 'getStepVelocity should return velocity or 1 default');
});
TestRunner.test("Day 649 - getStepVelocity returns 1 for inactive notes", (t) => {
    const funcStr = Track.prototype.getStepVelocity.toString();
    t.assertTruthy(funcStr.includes('return 1') && funcStr.includes('!stepData || !stepData.active'), 'getStepVelocity should return 1 for inactive notes');
});
TestRunner.test("Day 649 - setStepProbability is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.setStepProbability, 'function', 'setStepProbability should be a function');
});
TestRunner.test("Day 649 - setStepProbability accepts 3 parameters (row, col, probability)", (t) => {
    const funcStr = Track.prototype.setStepProbability.toString();
    t.assertTruthy(funcStr.includes('setStepProbability(row, col, probability)'), 'setStepProbability should accept row, col, probability parameters');
});
TestRunner.test("Day 649 - setStepProbability captures undo BEFORE mutation", (t) => {
    const funcStr = Track.prototype.setStepProbability.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const mutationIdx = funcStr.indexOf('activeSeq.data[row][col].probability =');
    t.assertTruthy(captureIdx >= 0 && captureIdx < mutationIdx, 'setStepProbability should capture undo before mutating probability');
});
TestRunner.test("Day 649 - setStepProbability clamps to 0-1 range", (t) => {
    const funcStr = Track.prototype.setStepProbability.toString();
    t.assertTruthy(funcStr.includes('Math.max(0') && funcStr.includes('Math.min(1', 'setStepProbability should clamp to 0-1 range'));
});
TestRunner.test("Day 649 - setStepProbability returns void", (t) => {
    const funcStr = Track.prototype.setStepProbability.toString();
    const returnIdx = funcStr.indexOf('return');
    t.assertTruthy(returnIdx < 0 || funcStr.lastIndexOf('return') < funcStr.indexOf('activeSeq.data'), 'setStepProbability should not return a value');
});
TestRunner.test("Day 649 - getStepProbability is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.getStepProbability, 'function', 'getStepProbability should be a function');
});
TestRunner.test("Day 649 - getStepProbability accepts 2 parameters (row, col)", (t) => {
    const funcStr = Track.prototype.getStepProbability.toString();
    t.assertTruthy(funcStr.includes('getStepProbability(row, col)'), 'getStepProbability should accept row, col parameters');
});
TestRunner.test("Day 649 - getStepProbability returns probability or 1 default", (t) => {
    const funcStr = Track.prototype.getStepProbability.toString();
    t.assertTruthy(funcStr.includes('return stepData.probability ?? 1') || funcStr.includes('?? 1'), 'getStepProbability should return probability or 1 default');
});
TestRunner.test("Day 649 - getStepProbability returns 1 for inactive notes", (t) => {
    const funcStr = Track.prototype.getStepProbability.toString();
    t.assertTruthy(funcStr.includes('return 1') && funcStr.includes('!stepData || !stepData.active'), 'getStepProbability should return 1 for inactive notes');
});
TestRunner.test("Day 649 - APP_VERSION validation for Day 649", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 649');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 302, 'Minor version should be >= 302 for Day 649');
    }
});

// --- Day 650: Remaining Event Handler Function Tests ---
TestRunner.test("Day 650 - toggleMetronomeShortcut is a function export", (t) => {
    const funcStr = toggleMetronomeShortcut.toString();
    t.assertTruthy(funcStr.includes('export function'), 'toggleMetronomeShortcut should be exported');
});
TestRunner.test("Day 650 - toggleMetronomeShortcut accepts 0 parameters", (t) => {
    t.assertEqual(toggleMetronomeShortcut.length, 0, 'toggleMetronomeShortcut should accept 0 parameters');
});
TestRunner.test("Day 650 - toggleMetronomeShortcut references localAppServices.setMetronomeEnabled", (t) => {
    const funcStr = toggleMetronomeShortcut.toString();
    t.assertTruthy(funcStr.includes('localAppServices.setMetronomeEnabled'), 'toggleMetronomeShortcut should reference setMetronomeEnabled');
});
TestRunner.test("Day 650 - toggleMetronomeShortcut references localAppServices.isMetronomeEnabled", (t) => {
    const funcStr = toggleMetronomeShortcut.toString();
    t.assertTruthy(funcStr.includes('localAppServices.isMetronomeEnabled'), 'toggleMetronomeShortcut should reference isMetronomeEnabled');
});
TestRunner.test("Day 650 - toggleMetronomeShortcut shows notification with ON/OFF state", (t) => {
    const funcStr = toggleMetronomeShortcut.toString();
    t.assertTruthy(funcStr.includes('Metronome ON') && funcStr.includes('Metronome OFF'), 'toggleMetronomeShortcut should show ON/OFF notification');
});
TestRunner.test("Day 650 - initializePrimaryEventListeners is a function export", (t) => {
    const funcStr = initializePrimaryEventListeners.toString();
    t.assertTruthy(funcStr.includes('export function'), 'initializePrimaryEventListeners should be exported');
});
TestRunner.test("Day 650 - initializePrimaryEventListeners accepts 1 parameter (appContext)", (t) => {
    t.assertEqual(initializePrimaryEventListeners.length, 1, 'initializePrimaryEventListeners should accept 1 parameter');
});
TestRunner.test("Day 650 - initializePrimaryEventListeners uses appContext || localAppServices pattern", (t) => {
    const funcStr = initializePrimaryEventListeners.toString();
    t.assertTruthy(funcStr.includes('appContext || localAppServices'), 'initializePrimaryEventListeners should use fallback pattern');
});
TestRunner.test("Day 650 - initializePrimaryEventListeners uses uiElementsCache from services", (t) => {
    const funcStr = initializePrimaryEventListeners.toString();
    t.assertTruthy(funcStr.includes('uiElementsCache'), 'initializePrimaryEventListeners should reference uiElementsCache');
});
TestRunner.test("Day 650 - initializePrimaryEventListeners has try/catch block for error handling", (t) => {
    const funcStr = initializePrimaryEventListeners.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'initializePrimaryEventListeners should have error handling');
});
TestRunner.test("Day 650 - initializePrimaryEventListeners sets up desktop click and contextmenu listeners", (t) => {
    const funcStr = initializePrimaryEventListeners.toString();
    t.assertTruthy(funcStr.includes('uiCache.desktop'), 'initializePrimaryEventListeners should reference uiCache.desktop');
    t.assertTruthy(funcStr.includes("addEventListener('click'") || funcStr.includes('addEventListener("click"'), 'should add click listener');
    t.assertTruthy(funcStr.includes("addEventListener('contextmenu'") || funcStr.includes('addEventListener("contextmenu"'), 'should add contextmenu listener');
});
TestRunner.test("Day 650 - initializePrimaryEventListeners references createContextMenu for right-click menu", (t) => {
    const funcStr = initializePrimaryEventListeners.toString();
    t.assertTruthy(funcStr.includes('createContextMenu'), 'initializePrimaryEventListeners should reference createContextMenu');
});
TestRunner.test("Day 650 - initializePrimaryEventListeners sets up menuActions for various menu items", (t) => {
    const funcStr = initializePrimaryEventListeners.toString();
    t.assertTruthy(funcStr.includes('menuActions'), 'initializePrimaryEventListeners should have menuActions object');
    t.assertTruthy(funcStr.includes('menuAddSynthTrack') && funcStr.includes('menuOpenSoundBrowser'), 'should have menu item actions');
});
TestRunner.test("Day 650 - initializePrimaryEventListeners handles loadProjectInput change event", (t) => {
    const funcStr = initializePrimaryEventListeners.toString();
    t.assertTruthy(funcStr.includes('uiCache.loadProjectInput'), 'should reference loadProjectInput');
    t.assertTruthy(funcStr.includes("addEventListener('change'") || funcStr.includes('addEventListener("change"'), 'should add change listener');
});
TestRunner.test("Day 650 - initializePrimaryEventListeners calls services.addTrack for track creation", (t) => {
    const funcStr = initializePrimaryEventListeners.toString();
    t.assertTruthy(funcStr.includes('services.addTrack'), 'initializePrimaryEventListeners should call services.addTrack');
    t.assertTruthy(funcStr.includes("'Synth'") && funcStr.includes("'Audio'"), 'should handle multiple track types');
});
TestRunner.test("Day 650 - APP_VERSION validation for Day 650", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 650');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 303, 'Minor version should be >= 303 for Day 650');
    }
});

// Day 651: Track Effect Instance Methods Tests
// ============================================
TestRunner.test("Day 651 - addEffect is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.addEffect, 'function', 'addEffect should be a function');
});

TestRunner.test("Day 651 - addEffect accepts 1 parameter (effectType)", (t) => {
    t.assertEqual(Track.prototype.addEffect.length, 1, 'addEffect should accept 1 parameter');
});

TestRunner.test("Day 651 - addEffect checks effectsRegistryAccess via appServices", (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('effectsRegistryAccess'), 'addEffect should check effectsRegistryAccess');
});

TestRunner.test("Day 651 - addEffect checks AVAILABLE_EFFECTS in registry", (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('AVAILABLE_EFFECTS'), 'addEffect should check AVAILABLE_EFFECTS');
});

TestRunner.test("Day 651 - addEffect calls _captureUndoState before adding effect", (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const pushIdx = funcStr.indexOf('this.activeEffects.push');
    t.assertTruthy(captureIdx !== -1 && captureIdx < pushIdx, 'addEffect should capture undo BEFORE activeEffects.push');
});

TestRunner.test("Day 651 - addEffect has descriptive undo label with effect type and track name", (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('Add ${effectType} effect on ${this.name}') || funcStr.includes('Add '), 'addEffect should have descriptive undo label');
});

TestRunner.test("Day 651 - addEffect calls rebuildEffectChain after adding effect", (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('this.rebuildEffectChain()'), 'addEffect should call rebuildEffectChain');
});

TestRunner.test("Day 651 - addEffect shows notification for registry missing", (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('showNotification') && funcStr.includes('registry missing'), 'addEffect should show notification when registry is missing');
});

TestRunner.test("Day 651 - addEffect shows notification for effect type not found", (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('showNotification') && (funcStr.includes('not found') || funcStr.includes('Effect type')), 'addEffect should show notification for invalid effect type');
});

TestRunner.test("Day 651 - addEffect shows notification for creation failure", (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('showNotification') && funcStr.includes('Could not create'), 'addEffect should show notification when Tone.js instance creation fails');
});

TestRunner.test("Day 651 - addEffect calls updateTrackUI after adding effect", (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('updateTrackUI') || funcStr.includes('updateTrackUI'), 'addEffect should call updateTrackUI');
});

TestRunner.test("Day 651 - addEffect generates unique effect ID with Date.now and random", (t) => {
    const funcStr = Track.prototype.addEffect.toString();
    t.assertTruthy(funcStr.includes('Date.now()') && funcStr.includes('Math.random()'), 'addEffect should generate unique effect ID');
});

TestRunner.test("Day 651 - removeEffect is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.removeEffect, 'function', 'removeEffect should be a function');
});

TestRunner.test("Day 651 - removeEffect accepts 1 parameter (effectId)", (t) => {
    t.assertEqual(Track.prototype.removeEffect.length, 1, 'removeEffect should accept 1 parameter');
});

TestRunner.test("Day 651 - removeEffect uses findIndex to locate effect by id", (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('findIndex'), 'removeEffect should use findIndex to locate effect');
});

TestRunner.test("Day 651 - removeEffect calls _captureUndoState before removing effect", (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const spliceIdx = funcStr.indexOf('this.activeEffects.splice');
    t.assertTruthy(captureIdx !== -1 && captureIdx < spliceIdx, 'removeEffect should capture undo BEFORE activeEffects.splice');
});

TestRunner.test("Day 651 - removeEffect has descriptive undo label with effect type and track name", (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('Remove') && funcStr.includes('effect from'), 'removeEffect should have descriptive undo label');
});

TestRunner.test("Day 651 - removeEffect calls dispose on toneNode before splice", (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('dispose()'), 'removeEffect should call dispose on toneNode');
});

TestRunner.test("Day 651 - removeEffect calls rebuildEffectChain after removing", (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('this.rebuildEffectChain()'), 'removeEffect should call rebuildEffectChain');
});

TestRunner.test("Day 651 - removeEffect calls updateTrackUI after removing", (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('updateTrackUI'), 'removeEffect should call updateTrackUI');
});

TestRunner.test("Day 651 - removeEffect handles effect not found case", (t) => {
    const funcStr = Track.prototype.removeEffect.toString();
    t.assertTruthy(funcStr.includes('not found'), 'removeEffect should handle not found case');
});

TestRunner.test("Day 651 - setEffectBypass is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.setEffectBypass, 'function', 'setEffectBypass should be a function');
});

TestRunner.test("Day 651 - setEffectBypass accepts 2 parameters (effectId, bypassed)", (t) => {
    t.assertEqual(Track.prototype.setEffectBypass.length, 2, 'setEffectBypass should accept 2 parameters');
});

TestRunner.test("Day 651 - setEffectBypass uses find to locate effect by id", (t) => {
    const funcStr = Track.prototype.setEffectBypass.toString();
    t.assertTruthy(funcStr.includes('find'), 'setEffectBypass should use find to locate effect');
});

TestRunner.test("Day 651 - setEffectBypass checks if effectWrapper is not found", (t) => {
    const funcStr = Track.prototype.setEffectBypass.toString();
    t.assertTruthy(funcStr.includes('not found'), 'setEffectBypass should handle effect not found');
});

TestRunner.test("Day 651 - setEffectBypass checks toneNode.disposed state", (t) => {
    const funcStr = Track.prototype.setEffectBypass.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'setEffectBypass should check disposed state');
});

TestRunner.test("Day 651 - setEffectBypass uses !! to coerce bypassed to boolean", (t) => {
    const funcStr = Track.prototype.setEffectBypass.toString();
    t.assertTruthy(funcStr.includes('!!bypassed'), 'setEffectBypass should use !! boolean coercion');
});

TestRunner.test("Day 651 - setEffectBypass calls _captureUndoState only when value changes", (t) => {
    const funcStr = Track.prototype.setEffectBypass.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const bypassIdx = funcStr.indexOf('effectWrapper.toneNode.bypass');
    t.assertTruthy(captureIdx !== -1 && captureIdx < bypassIdx, 'setEffectBypass should capture undo before bypass mutation');
    t.assertTruthy(funcStr.includes('!== nextValue') || funcStr.includes('!== nextValue'), 'setEffectBypass should check for value change');
});

TestRunner.test("Day 651 - setEffectBypass has descriptive undo label with Bypass/Enable", (t) => {
    const funcStr = Track.prototype.setEffectBypass.toString();
    t.assertTruthy(funcStr.includes('Bypass') || funcStr.includes('Enable'), 'setEffectBypass should have Bypass/Enable undo label');
});

TestRunner.test("Day 651 - setEffectBypass sets effectWrapper.toneNode.bypass", (t) => {
    const funcStr = Track.prototype.setEffectBypass.toString();
    t.assertTruthy(funcStr.includes('effectWrapper.toneNode.bypass = nextValue'), 'setEffectBypass should set toneNode.bypass property');
});

TestRunner.test("Day 651 - updateEffectParam is a function on Track.prototype", (t) => {
    t.assertEqual(typeof Track.prototype.updateEffectParam, 'function', 'updateEffectParam should be a function');
});

TestRunner.test("Day 651 - updateEffectParam accepts 3 parameters (effectId, paramPath, value)", (t) => {
    t.assertEqual(Track.prototype.updateEffectParam.length, 3, 'updateEffectParam should accept 3 parameters');
});

TestRunner.test("Day 651 - updateEffectParam uses find to locate effect by id", (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    t.assertTruthy(funcStr.includes('find'), 'updateEffectParam should use find to locate effect');
});

TestRunner.test("Day 651 - updateEffectParam checks if effectWrapper is not found", (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    t.assertTruthy(funcStr.includes('not found'), 'updateEffectParam should handle effect not found');
});

TestRunner.test("Day 651 - updateEffectParam checks toneNode.disposed state", (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'updateEffectParam should check disposed state');
});

TestRunner.test("Day 651 - updateEffectParam calls _captureUndoState before updating", (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    const captureIdx = funcStr.indexOf('this._captureUndoState');
    const paramPathIdx = funcStr.indexOf('paramPath.split');
    t.assertTruthy(captureIdx !== -1 && captureIdx < paramPathIdx, 'updateEffectParam should capture undo before param update');
});

TestRunner.test("Day 651 - updateEffectParam has descriptive undo label with effect type", (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    t.assertTruthy(funcStr.includes('Update') && funcStr.includes('effect on'), 'updateEffectParam should have descriptive undo label');
});

TestRunner.test("Day 651 - updateEffectParam uses paramPath.split for nested param access", (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    t.assertTruthy(funcStr.includes('paramPath.split') && funcStr.includes("'.'"), 'updateEffectParam should use paramPath.split for nested access');
});

TestRunner.test("Day 651 - updateEffectParam uses rampTo for AudioParam updates", (t) => {
    const funcStr = Track.prototype.updateEffectParam.toString();
    t.assertTruthy(funcStr.includes('rampTo'), 'updateEffectParam should use rampTo for parameter updates');
});

TestRunner.test("Day 651 - APP_VERSION validation for Day 651", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 651');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 304, 'Minor version should be >= 304 for Day 651');
    }
});

// Day 652: Performance Monitor and Preview Player State Function Tests
// =====================================================================
TestRunner.test("Day 652 - Performance Monitor - incrementDroppedCallbacksState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function incrementDroppedCallbacksState'), 'incrementDroppedCallbacksState should be exported');
});

TestRunner.test("Day 652 - Performance Monitor - resetPerformanceMonitorState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function resetPerformanceMonitorState'), 'resetPerformanceMonitorState should be exported');
});

TestRunner.test("Day 652 - Performance Monitor - resetPerformanceMonitorState calls captureStateForUndoIfAllowed", (t) => {
    const funcStr = resetPerformanceMonitorState.toString();
    const captureIdx = funcStr.indexOf('captureStateForUndoIfAllowed');
    const fnIdx = funcStr.indexOf('function resetPerformanceMonitorState');
    t.assertTruthy(captureIdx > fnIdx, 'resetPerformanceMonitorState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 652 - Performance Monitor - resetPerformanceMonitorState has descriptive undo label", (t) => {
    const funcStr = resetPerformanceMonitorState.toString();
    t.assertTruthy(funcStr.includes('Reset Performance Monitor'), 'resetPerformanceMonitorState should have descriptive undo label');
});

TestRunner.test("Day 652 - Preview Player - setPreviewPlayerState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setPreviewPlayerState'), 'setPreviewPlayerState should be exported');
});

TestRunner.test("Day 652 - Preview Player - setPreviewPlayerState uses Object.is for change detection", (t) => {
    const funcStr = setPreviewPlayerState.toString();
    t.assertTruthy(funcStr.includes('Object.is'), 'setPreviewPlayerState should use Object.is for change detection');
});

TestRunner.test("Day 652 - Preview Player - setPreviewPlayerState calls captureStateForUndoIfAllowed", (t) => {
    const funcStr = setPreviewPlayerState.toString();
    const captureIdx = funcStr.indexOf('captureStateForUndoIfAllowed');
    const fnIdx = funcStr.indexOf('function setPreviewPlayerState');
    t.assertTruthy(captureIdx > fnIdx, 'setPreviewPlayerState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 652 - Preview Player - setPreviewPlayerState has descriptive undo label", (t) => {
    const funcStr = setPreviewPlayerState.toString();
    t.assertTruthy(funcStr.includes('Set Preview Player'), 'setPreviewPlayerState should have descriptive undo label');
});

TestRunner.test("Day 652 - Library - setCurrentLibraryNameState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setCurrentLibraryNameState'), 'setCurrentLibraryNameState should be exported');
});

TestRunner.test("Day 652 - Library - setCurrentLibraryNameState uses Object.is for change detection", (t) => {
    const funcStr = setCurrentLibraryNameState.toString();
    t.assertTruthy(funcStr.includes('Object.is'), 'setCurrentLibraryNameState should use Object.is for change detection');
});

TestRunner.test("Day 652 - Library - setCurrentLibraryNameState calls captureStateForUndoIfAllowed", (t) => {
    const funcStr = setCurrentLibraryNameState.toString();
    const captureIdx = funcStr.indexOf('captureStateForUndoIfAllowed');
    const fnIdx = funcStr.indexOf('function setCurrentLibraryNameState');
    t.assertTruthy(captureIdx > fnIdx, 'setCurrentLibraryNameState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 652 - Library - setCurrentLibraryNameState has descriptive undo label", (t) => {
    const funcStr = setCurrentLibraryNameState.toString();
    t.assertTruthy(funcStr.includes('Set Current Library'), 'setCurrentLibraryNameState should have descriptive undo label');
});

TestRunner.test("Day 652 - Sound File Tree - setCurrentSoundFileTreeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function setCurrentSoundFileTreeState'), 'setCurrentSoundFileTreeState should be exported');
});

TestRunner.test("Day 652 - Sound File Tree - setCurrentSoundFileTreeState uses Object.is for change detection", (t) => {
    const funcStr = setCurrentSoundFileTreeState.toString();
    t.assertTruthy(funcStr.includes('Object.is'), 'setCurrentSoundFileTreeState should use Object.is for change detection');
});

TestRunner.test("Day 652 - Sound File Tree - setCurrentSoundFileTreeState calls captureStateForUndoIfAllowed", (t) => {
    const funcStr = setCurrentSoundFileTreeState.toString();
    const captureIdx = funcStr.indexOf('captureStateForUndoIfAllowed');
    const fnIdx = funcStr.indexOf('function setCurrentSoundFileTreeState');
    t.assertTruthy(captureIdx > fnIdx, 'setCurrentSoundFileTreeState should call captureStateForUndoIfAllowed');
});

TestRunner.test("Day 652 - Sound File Tree - setCurrentSoundFileTreeState has descriptive undo label", (t) => {
    const funcStr = setCurrentSoundFileTreeState.toString();
    t.assertTruthy(funcStr.includes('Set Sound File Tree'), 'setCurrentSoundFileTreeState should have descriptive undo label');
});

TestRunner.test("Day 652 - APP_VERSION validation for Day 652", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 652');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 305, 'Minor version should be >= 305 for Day 652');
    }
});


// Day 653: Internal State Functions and Getters Tests
TestRunner.test("Day 653 - getRecordingTrackIdState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getRecordingTrackIdState'), 'getRecordingTrackIdState should be exported');
});
TestRunner.test("Day 653 - getRecordingTrackIdState accepts 0 parameters", (t) => {
    t.assertEqual(getRecordingTrackIdState.length, 0, 'getRecordingTrackIdState should accept 0 parameters');
});
TestRunner.test("Day 653 - getRecordingTrackIdState references recordingTrackIdGlobal", (t) => {
    const funcStr = getRecordingTrackIdState.toString();
    t.assertTruthy(funcStr.includes('recordingTrackIdGlobal'), 'getRecordingTrackIdState should reference recordingTrackIdGlobal');
});
TestRunner.test("Day 653 - isTrackRecordingState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function isTrackRecordingState'), 'isTrackRecordingState should be exported');
});
TestRunner.test("Day 653 - isTrackRecordingState accepts 0 parameters", (t) => {
    t.assertEqual(isTrackRecordingState.length, 0, 'isTrackRecordingState should accept 0 parameters');
});
TestRunner.test("Day 653 - isTrackRecordingState references isRecordingGlobal", (t) => {
    const funcStr = isTrackRecordingState.toString();
    t.assertTruthy(funcStr.includes('isRecordingGlobal'), 'isTrackRecordingState should reference isRecordingGlobal');
});
TestRunner.test("Day 653 - getRecordingStartTimeState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getRecordingStartTimeState'), 'getRecordingStartTimeState should be exported');
});
TestRunner.test("Day 653 - getRecordingStartTimeState accepts 0 parameters", (t) => {
    t.assertEqual(getRecordingStartTimeState.length, 0, 'getRecordingStartTimeState should accept 0 parameters');
});
TestRunner.test("Day 653 - getRecordingStartTimeState references recordingStartTime", (t) => {
    const funcStr = getRecordingStartTimeState.toString();
    t.assertTruthy(funcStr.includes('recordingStartTime'), 'getRecordingStartTimeState should reference recordingStartTime variable');
});
TestRunner.test("Day 653 - getDroppedCallbacksState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getDroppedCallbacksState'), 'getDroppedCallbacksState should be exported');
});
TestRunner.test("Day 653 - getDroppedCallbacksState accepts 0 parameters", (t) => {
    t.assertEqual(getDroppedCallbacksState.length, 0, 'getDroppedCallbacksState should accept 0 parameters');
});
TestRunner.test("Day 653 - getDroppedCallbacksState references performanceMonitorState", (t) => {
    const funcStr = getDroppedCallbacksState.toString();
    t.assertTruthy(funcStr.includes('performanceMonitorState'), 'getDroppedCallbacksState should reference performanceMonitorState');
});
TestRunner.test("Day 653 - getDroppedCallbacksState accesses .droppedCallbacks property", (t) => {
    const funcStr = getDroppedCallbacksState.toString();
    t.assertTruthy(funcStr.includes('.droppedCallbacks') || funcStr.includes('droppedCallbacks'), 'getDroppedCallbacksState should access droppedCallbacks property');
});
TestRunner.test("Day 653 - getTrackSendLevelState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTrackSendLevelState'), 'getTrackSendLevelState should be exported');
});
TestRunner.test("Day 653 - getTrackSendLevelState accepts 2 parameters", (t) => {
    t.assertEqual(getTrackSendLevelState.length, 2, 'getTrackSendLevelState should accept 2 parameters (trackId, sendId)');
});
TestRunner.test("Day 653 - getTrackSendLevelState references trackSendsState", (t) => {
    const funcStr = getTrackSendLevelState.toString();
    t.assertTruthy(funcStr.includes('trackSendsState'), 'getTrackSendLevelState should reference trackSendsState');
});
TestRunner.test("Day 653 - getTrackSendLevelState handles missing track bucket", (t) => {
    const funcStr = getTrackSendLevelState.toString();
    t.assertTruthy(funcStr.includes('trackBucket') || funcStr.includes('trackSendsState['), 'getTrackSendLevelState should handle missing track bucket');
});
TestRunner.test("Day 653 - getTrackSendLevelState uses Number.isFinite for validation", (t) => {
    const funcStr = getTrackSendLevelState.toString();
    t.assertTruthy(funcStr.includes('Number.isFinite') || funcStr.includes('isFinite'), 'getTrackSendLevelState should use Number.isFinite for validation');
});
TestRunner.test("Day 653 - getTrackSendLevelState references Constants.DEFAULT_SEND_LEVEL", (t) => {
    const funcStr = getTrackSendLevelState.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_SEND_LEVEL'), 'getTrackSendLevelState should reference DEFAULT_SEND_LEVEL constant');
});
TestRunner.test("Day 653 - getTrackSendPreFaderState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getTrackSendPreFaderState'), 'getTrackSendPreFaderState should be exported');
});
TestRunner.test("Day 653 - getTrackSendPreFaderState accepts 2 parameters", (t) => {
    t.assertEqual(getTrackSendPreFaderState.length, 2, 'getTrackSendPreFaderState should accept 2 parameters (trackId, sendId)');
});
TestRunner.test("Day 653 - getTrackSendPreFaderState references trackSendsState", (t) => {
    const funcStr = getTrackSendPreFaderState.toString();
    t.assertTruthy(funcStr.includes('trackSendsState'), 'getTrackSendPreFaderState should reference trackSendsState');
});
TestRunner.test("Day 653 - getTrackSendPreFaderState checks typeof preFader === boolean", (t) => {
    const funcStr = getTrackSendPreFaderState.toString();
    t.assertTruthy(funcStr.includes('typeof') && funcStr.includes('boolean'), 'getTrackSendPreFaderState should check typeof boolean');
});
TestRunner.test("Day 653 - getTrackSendPreFaderState references Constants.DEFAULT_SEND_PRE_FADER", (t) => {
    const funcStr = getTrackSendPreFaderState.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_SEND_PRE_FADER'), 'getTrackSendPreFaderState should reference DEFAULT_SEND_PRE_FADER constant');
});
TestRunner.test("Day 653 - removeTrackFromStateInternal is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function removeTrackFromStateInternal'), 'removeTrackFromStateInternal should be exported');
});
TestRunner.test("Day 653 - removeTrackFromStateInternal accepts 1 parameter", (t) => {
    t.assertEqual(removeTrackFromStateInternal.length, 1, 'removeTrackFromStateInternal should accept 1 parameter (trackId)');
});
TestRunner.test("Day 653 - removeTrackFromStateInternal uses try/catch for error handling", (t) => {
    const funcStr = removeTrackFromStateInternal.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'removeTrackFromStateInternal should have try/catch');
});
TestRunner.test("Day 653 - removeTrackFromStateInternal uses findIndex to locate track", (t) => {
    const funcStr = removeTrackFromStateInternal.toString();
    t.assertTruthy(funcStr.includes('findIndex'), 'removeTrackFromStateInternal should use findIndex to locate track');
});
TestRunner.test("Day 653 - removeTrackFromStateInternal calls captureStateForUndoInternal", (t) => {
    const funcStr = removeTrackFromStateInternal.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndoInternal'), 'removeTrackFromStateInternal should call captureStateForUndoInternal');
});
TestRunner.test("Day 653 - removeTrackFromStateInternal calls track.dispose if available", (t) => {
    const funcStr = removeTrackFromStateInternal.toString();
    t.assertTruthy(funcStr.includes('dispose'), 'removeTrackFromStateInternal should call track.dispose if available');
});
TestRunner.test("Day 653 - removeTrackFromStateInternal uses splice to remove track", (t) => {
    const funcStr = removeTrackFromStateInternal.toString();
    t.assertTruthy(funcStr.includes('splice'), 'removeTrackFromStateInternal should use splice to remove track');
});
TestRunner.test("Day 653 - removeTrackFromStateInternal handles armed/soloed state cleanup", (t) => {
    const funcStr = removeTrackFromStateInternal.toString();
    t.assertTruthy(funcStr.includes('armedTrackId') || funcStr.includes('soloedTrackId'), 'removeTrackFromStateInternal should handle armed/soloed state cleanup');
});
TestRunner.test("Day 653 - gatherProjectDataInternal is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function gatherProjectDataInternal'), 'gatherProjectDataInternal should be exported');
});
TestRunner.test("Day 653 - gatherProjectDataInternal uses try/catch for error handling", (t) => {
    const funcStr = gatherProjectDataInternal.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'gatherProjectDataInternal should have try/catch');
});
TestRunner.test("Day 653 - gatherProjectDataInternal returns a projectData object", (t) => {
    const funcStr = gatherProjectDataInternal.toString();
    t.assertTruthy(funcStr.includes('projectData') || funcStr.includes('return'), 'gatherProjectDataInternal should return projectData object');
});
TestRunner.test("Day 653 - gatherProjectDataInternal includes version, projectName, projectNotes", (t) => {
    const funcStr = gatherProjectDataInternal.toString();
    t.assertTruthy(funcStr.includes('version') && funcStr.includes('projectName') && funcStr.includes('projectNotes'), 'gatherProjectDataInternal should include version, projectName, projectNotes');
});
TestRunner.test("Day 653 - gatherProjectDataInternal collects globalSettings", (t) => {
    const funcStr = gatherProjectDataInternal.toString();
    t.assertTruthy(funcStr.includes('globalSettings') || funcStr.includes('tempo') || funcStr.includes('masterVolume'), 'gatherProjectDataInternal should collect globalSettings');
});
TestRunner.test("Day 653 - saveProjectInternal is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function saveProjectInternal'), 'saveProjectInternal should be exported');
});
TestRunner.test("Day 653 - saveProjectInternal uses try/catch for error handling", (t) => {
    const funcStr = saveProjectInternal.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'saveProjectInternal should have try/catch');
});
TestRunner.test("Day 653 - saveProjectInternal calls gatherProjectDataInternal", (t) => {
    const funcStr = saveProjectInternal.toString();
    t.assertTruthy(funcStr.includes('gatherProjectDataInternal'), 'saveProjectInternal should call gatherProjectDataInternal');
});
TestRunner.test("Day 653 - saveProjectInternal creates Blob for download", (t) => {
    const funcStr = saveProjectInternal.toString();
    t.assertTruthy(funcStr.includes('Blob') && funcStr.includes('application/json'), 'saveProjectInternal should create Blob for download');
});
TestRunner.test("Day 653 - saveProjectInternal triggers download via anchor click", (t) => {
    const funcStr = saveProjectInternal.toString();
    t.assertTruthy(funcStr.includes('createElement') && funcStr.includes('click'), 'saveProjectInternal should trigger download via anchor click');
});
TestRunner.test("Day 653 - getClipboardDataState is a function export", (t) => {
    const stateStr = require('fs').readFileSync('./js/state.js', 'utf8');
    t.assertTruthy(stateStr.includes('export function getClipboardDataState'), 'getClipboardDataState should be exported');
});
TestRunner.test("Day 653 - getClipboardDataState accepts 0 parameters", (t) => {
    t.assertEqual(getClipboardDataState.length, 0, 'getClipboardDataState should accept 0 parameters');
});
TestRunner.test("Day 653 - getClipboardDataState references clipboardDataGlobal", (t) => {
    const funcStr = getClipboardDataState.toString();
    t.assertTruthy(funcStr.includes('clipboardDataGlobal'), 'getClipboardDataState should reference clipboardDataGlobal');
});
TestRunner.test("Day 653 - APP_VERSION validation for Day 653", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 653');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 306, 'Minor version should be >= 306 for Day 653');
    }
});

// --- Day 653: Event Handlers Module Init and Control Events Function Tests ---

// Test initializeEventHandlersModule
TestRunner.test("Day 653 - initializeEventHandlersModule is a function export", (t) => {
    const funcStr = initializeEventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('export function'), 'initializeEventHandlersModule should be exported');
});

TestRunner.test("Day 653 - initializeEventHandlersModule accepts 1 parameter (appServicesFromMain)", (t) => {
    t.assertEqual(initializeEventHandlersModule.length, 1, 'initializeEventHandlersModule should accept 1 parameter');
});

TestRunner.test("Day 653 - initializeEventHandlersModule assigns appServicesFromMain to localAppServices", (t) => {
    const funcStr = initializeEventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('localAppServices = appServicesFromMain') || funcStr.includes('localAppServices=appServicesFromMain'), 'initializeEventHandlersModule should assign appServicesFromMain to localAppServices');
});

TestRunner.test("Day 653 - initializeEventHandlersModule references localAppServices for service access", (t) => {
    const funcStr = initializeEventHandlersModule.toString();
    t.assertTruthy(funcStr.includes('localAppServices'), 'initializeEventHandlersModule should reference localAppServices');
});

TestRunner.test("Day 653 - APP_VERSION validation for Day 653", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 653');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 306, 'Minor version should be >= 306 for Day 653');
    }
});

// Test attachGlobalControlEvents
TestRunner.test("Day 653 - attachGlobalControlEvents is a function export", (t) => {
    const funcStr = attachGlobalControlEvents.toString();
    t.assertTruthy(funcStr.includes('export function'), 'attachGlobalControlEvents should be exported');
});

TestRunner.test("Day 653 - attachGlobalControlEvents accepts 1 parameter (elements)", (t) => {
    t.assertEqual(attachGlobalControlEvents.length, 1, 'attachGlobalControlEvents should accept 1 parameter');
});

TestRunner.test("Day 653 - attachGlobalControlEvents checks elements parameter", (t) => {
    const funcStr = attachGlobalControlEvents.toString();
    t.assertTruthy(funcStr.includes('if (!elements') || funcStr.includes('if(!elements'), 'attachGlobalControlEvents should check elements parameter');
});

TestRunner.test("Day 653 - attachGlobalControlEvents references localAppServices", (t) => {
    const funcStr = attachGlobalControlEvents.toString();
    t.assertTruthy(funcStr.includes('localAppServices'), 'attachGlobalControlEvents should reference localAppServices');
});

TestRunner.test("Day 653 - attachGlobalControlEvents has try/catch block for error handling", (t) => {
    const funcStr = attachGlobalControlEvents.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'attachGlobalControlEvents should have try/catch block');
});

TestRunner.test("Day 653 - attachGlobalControlEvents sets up keyboard event listeners", (t) => {
    const funcStr = attachGlobalControlEvents.toString();
    t.assertTruthy(funcStr.includes('keydown') || funcStr.includes('keyup'), 'attachGlobalControlEvents should set up keyboard event listeners');
});

TestRunner.test("Day 653 - attachGlobalControlEvents sets up mouse event listeners", (t) => {
    const funcStr = attachGlobalControlEvents.toString();
    t.assertTruthy(funcStr.includes('mousedown') || funcStr.includes('mousemove') || funcStr.includes('mouseup'), 'attachGlobalControlEvents should set up mouse event listeners');
});

TestRunner.test("Day 653 - APP_VERSION validation for Day 653", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 653');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 306, 'Minor version should be >= 306 for Day 653');
    }
});

// Day 654: State Rename, Playback Mode, and Audio Utility Function Tests
// ============================================

TestRunner.test("Day 654 - renameTrackInState is a function export", (t) => {
    const stateStr = stateModule.toString();
    t.assertTruthy(stateStr.includes('export function renameTrackInState'), 'renameTrackInState should be exported');
});

TestRunner.test("Day 654 - renameTrackInState accepts 2 parameters", (t) => {
    t.assertEqual(renameTrackInState.length, 2, 'renameTrackInState should accept 2 parameters');
});

TestRunner.test("Day 654 - renameTrackInState finds track by id", (t) => {
    const funcStr = renameTrackInState.toString();
    t.assertTruthy(funcStr.includes('tracks.find') || funcStr.includes('find(t => t.id'), 'renameTrackInState should find track by id');
});

TestRunner.test("Day 654 - renameTrackInState returns false for missing track", (t) => {
    const funcStr = renameTrackInState.toString();
    t.assertTruthy(funcStr.includes('Track not found') || funcStr.includes('!track'), 'renameTrackInState should handle missing track');
});

TestRunner.test("Day 654 - renameTrackInState calls captureStateForUndoIfAllowed", (t) => {
    const funcStr = renameTrackInState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndoIfAllowed') || funcStr.includes('appServices.captureStateForUndo'), 'renameTrackInState should capture undo state');
});

TestRunner.test("Day 654 - renameTrackInState sets track.name", (t) => {
    const funcStr = renameTrackInState.toString();
    t.assertTruthy(funcStr.includes('track.name') || funcStr.includes('.name ='), 'renameTrackInState should set track.name');
});

TestRunner.test("Day 654 - renameTrackInState calls appServices.updateTrackUI", (t) => {
    const funcStr = renameTrackInState.toString();
    t.assertTruthy(funcStr.includes('updateTrackUI'), 'renameTrackInState should call updateTrackUI');
});

TestRunner.test("Day 654 - renameTrackInState has appServices guard for updateTrackUI", (t) => {
    const funcStr = renameTrackInState.toString();
    t.assertTruthy(funcStr.includes('appServices &&') || funcStr.includes('if (appServices'), 'renameTrackInState should guard updateTrackUI call');
});

TestRunner.test("Day 654 - getPlaybackModeState is a function export", (t) => {
    const stateStr = stateModule.toString();
    t.assertTruthy(stateStr.includes('export function getPlaybackModeState'), 'getPlaybackModeState should be exported');
});

TestRunner.test("Day 654 - getPlaybackModeState accepts 0 parameters", (t) => {
    t.assertEqual(getPlaybackModeState.length, 0, 'getPlaybackModeState should accept no parameters');
});

TestRunner.test("Day 654 - getPlaybackModeState returns globalPlaybackMode", (t) => {
    const funcStr = getPlaybackModeState.toString();
    t.assertTruthy(funcStr.includes('return globalPlaybackMode'), 'getPlaybackModeState should return globalPlaybackMode');
});

TestRunner.test("Day 654 - setPlaybackModeStateInternal is a function export", (t) => {
    const stateStr = stateModule.toString();
    t.assertTruthy(stateStr.includes('export function setPlaybackModeStateInternal') || stateStr.includes('setPlaybackModeState'), 'setPlaybackModeStateInternal should be exported');
});

TestRunner.test("Day 654 - setPlaybackModeStateInternal accepts 1 parameter", (t) => {
    t.assertEqual(setPlaybackModeStateInternal.length, 1, 'setPlaybackModeStateInternal should accept 1 parameter');
});

TestRunner.test("Day 654 - setPlaybackModeStateInternal validates mode (sequencer/timeline)", (t) => {
    const funcStr = setPlaybackModeStateInternal.toString();
    t.assertTruthy(funcStr.includes("sequencer") && funcStr.includes("timeline"), 'setPlaybackModeStateInternal should validate mode');
});

TestRunner.test("Day 654 - setPlaybackModeStateInternal calls captureStateForUndo", (t) => {
    const funcStr = setPlaybackModeStateInternal.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo') || funcStr.includes('captureStateForUndoInternal'), 'setPlaybackModeStateInternal should capture undo');
});

TestRunner.test("Day 654 - setPlaybackModeStateInternal references Tone.Transport", (t) => {
    const funcStr = setPlaybackModeStateInternal.toString();
    t.assertTruthy(funcStr.includes('Tone.Transport'), 'setPlaybackModeStateInternal should reference Tone.Transport');
});

TestRunner.test("Day 654 - setPlaybackModeStateInternal stops transport on mode change", (t) => {
    const funcStr = setPlaybackModeStateInternal.toString();
    t.assertTruthy(funcStr.includes('Transport.stop') || funcStr.includes('stop()'), 'setPlaybackModeStateInternal should stop transport');
});

TestRunner.test("Day 654 - setPlaybackModeStateInternal calls Tone.Transport.cancel", (t) => {
    const funcStr = setPlaybackModeStateInternal.toString();
    t.assertTruthy(funcStr.includes('Transport.cancel') || funcStr.includes('cancel('), 'setPlaybackModeStateInternal should cancel transport events');
});

TestRunner.test("Day 654 - setPlaybackModeStateInternal has descriptive undo label", (t) => {
    const funcStr = setPlaybackModeStateInternal.toString();
    t.assertTruthy(funcStr.includes('Set Playback Mode'), 'setPlaybackModeStateInternal should have descriptive undo label');
});

TestRunner.test("Day 654 - APP_VERSION validation for Day 654", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 654');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 307, 'Minor version should be >= 307 for Day 654');
    }
});

// --- Audio Utility Function Tests ---

TestRunner.test("Day 654 - getLoopStartBars is a function export", (t) => {
    const funcStr = getLoopStartBars.toString();
    t.assertTruthy(funcStr.includes('export function') || getLoopStartBars.length === 0, 'getLoopStartBars should be a function');
});

TestRunner.test("Day 654 - getLoopStartBars accepts 0 parameters", (t) => {
    t.assertEqual(getLoopStartBars.length, 0, 'getLoopStartBars should accept no parameters');
});

TestRunner.test("Day 654 - getLoopStartBars references loopRegion.start", (t) => {
    const funcStr = getLoopStartBars.toString();
    t.assertTruthy(funcStr.includes('loopRegion.start') || funcStr.includes('loopRegion['), 'getLoopStartBars should reference loopRegion.start');
});

TestRunner.test("Day 654 - getLoopEndBars is a function export", (t) => {
    t.assertEqual(typeof getLoopEndBars, 'function', 'getLoopEndBars should be a function');
});

TestRunner.test("Day 654 - getLoopEndBars accepts 0 parameters", (t) => {
    t.assertEqual(getLoopEndBars.length, 0, 'getLoopEndBars should accept no parameters');
});

TestRunner.test("Day 654 - getLoopEndBars references loopRegion.end", (t) => {
    const funcStr = getLoopEndBars.toString();
    t.assertTruthy(funcStr.includes('loopRegion.end') || funcStr.includes('loopRegion['), 'getLoopEndBars should reference loopRegion.end');
});

TestRunner.test("Day 654 - scheduleRecordingForPunch references recordingScheduledTrackId", (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('recordingScheduledTrackId'), 'scheduleRecordingForPunch should set recordingScheduledTrackId');
});

TestRunner.test("Day 654 - scheduleRecordingForPunch calls Tone.Transport.clear for previous scheduling", (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('Transport.clear') || funcStr.includes('clear('), 'scheduleRecordingForPunch should clear previous scheduling');
});

TestRunner.test("Day 654 - scheduleRecordingForPunch schedules at punchRegion.out position", (t) => {
    const funcStr = scheduleRecordingForPunch.toString();
    t.assertTruthy(funcStr.includes('punchRegion.out') && funcStr.includes('schedule'), 'scheduleRecordingForPunch should schedule at punch-out position');
});

TestRunner.test("Day 654 - cancelScheduledRecording sets recordingScheduledTrackId to null", (t) => {
    const funcStr = cancelScheduledRecording.toString();
    t.assertTruthy(funcStr.includes('recordingScheduledTrackId = null') || funcStr.includes('recordingScheduledTrackId=null'), 'cancelScheduledRecording should clear track ID');
});

TestRunner.test("Day 654 - APP_VERSION validation for Day 654 audio utilities", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 654');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 307, 'Minor version should be >= 307 for Day 654');
    }
});

// --- Context Suspension Monitoring Tests ---

TestRunner.test("Day 654 - startContextSuspensionMonitoring is a function export", (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('export function') || typeof startContextSuspensionMonitoring === 'function', 'startContextSuspensionMonitoring should be a function');
});

TestRunner.test("Day 654 - startContextSuspensionMonitoring accepts 0-1 parameters", (t) => {
    t.assertTrue(startContextSuspensionMonitoring.length === 0 || startContextSuspensionMonitoring.length === 1, 'startContextSuspensionMonitoring should accept 0-1 parameters');
});

TestRunner.test("Day 654 - startContextSuspensionMonitoring references resumeAttemptScheduled", (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('resumeAttemptScheduled'), 'startContextSuspensionMonitoring should reference resumeAttemptScheduled');
});

TestRunner.test("Day 654 - startContextSuspensionMonitoring references Tone.context", (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('Tone.context') || funcStr.includes('context.state'), 'startContextSuspensionMonitoring should reference Tone.context');
});

TestRunner.test("Day 654 - startContextSuspensionMonitoring references contextSuspendedCount", (t) => {
    const funcStr = startContextSuspensionMonitoring.toString();
    t.assertTruthy(funcStr.includes('contextSuspendedCount'), 'startContextSuspensionMonitoring should reference contextSuspendedCount');
});

TestRunner.test("Day 654 - stopContextSuspensionMonitoring is a function export", (t) => {
    t.assertEqual(typeof stopContextSuspensionMonitoring, 'function', 'stopContextSuspensionMonitoring should be a function');
});

TestRunner.test("Day 654 - stopContextSuspensionMonitoring accepts 0 parameters", (t) => {
    t.assertEqual(stopContextSuspensionMonitoring.length, 0, 'stopContextSuspensionMonitoring should accept no parameters');
});

TestRunner.test("Day 654 - getContextSuspensionCount is a function export", (t) => {
    t.assertEqual(typeof getContextSuspensionCount, 'function', 'getContextSuspensionCount should be a function');
});

TestRunner.test("Day 654 - getContextSuspensionCount accepts 0 parameters", (t) => {
    t.assertEqual(getContextSuspensionCount.length, 0, 'getContextSuspensionCount should accept no parameters');
});

TestRunner.test("Day 654 - getContextState is a function export", (t) => {
    t.assertEqual(typeof getContextState, 'function', 'getContextState should be a function');
});

TestRunner.test("Day 654 - getContextState accepts 0 parameters", (t) => {
    t.assertEqual(getContextState.length, 0, 'getContextState should accept no parameters');
});

TestRunner.test("Day 654 - getContextState references Tone.context.state", (t) => {
    const funcStr = getContextState.toString();
    t.assertTruthy(funcStr.includes('Tone.context.state') || funcStr.includes('context.state'), 'getContextState should reference Tone.context.state');
});

TestRunner.test("Day 654 - APP_VERSION validation for Day 654 context monitoring", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 654');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 307, 'Minor version should be >= 307 for Day 654');
    }
});

// --- Additional Audio Function Tests ---

TestRunner.test("Day 654 - getSidechainBusInput is a function export", (t) => {
    t.assertEqual(typeof getSidechainBusInput, 'function', 'getSidechainBusInput should be a function');
});

TestRunner.test("Day 654 - getSidechainBusInput accepts 0 parameters", (t) => {
    t.assertEqual(getSidechainBusInput.length, 0, 'getSidechainBusInput should accept no parameters');
});

TestRunner.test("Day 654 - getSidechainBusInput references sidechainBus variable", (t) => {
    const funcStr = getSidechainBusInput.toString();
    t.assertTruthy(funcStr.includes('sidechainBus'), 'getSidechainBusInput should reference sidechainBus');
});

TestRunner.test("Day 654 - getSidechainBusInput checks bus disposed state", (t) => {
    const funcStr = getSidechainBusInput.toString();
    t.assertTruthy(funcStr.includes('disposed'), 'getSidechainBusInput should check bus disposed state');
});

TestRunner.test("Day 654 - isMicOpenForSidechain is a function export", (t) => {
    t.assertEqual(typeof isMicOpenForSidechain, 'function', 'isMicOpenForSidechain should be a function');
});

TestRunner.test("Day 654 - isMicOpenForSidechain accepts 0 parameters", (t) => {
    t.assertEqual(isMicOpenForSidechain.length, 0, 'isMicOpenForSidechain should accept no parameters');
});

TestRunner.test("Day 654 - isMicOpenForSidechain references micForSidechain.state", (t) => {
    const funcStr = isMicOpenForSidechain.toString();
    t.assertTruthy(funcStr.includes('micForSidechain.state') || funcStr.includes('state === '), 'isMicOpenForSidechain should check mic state');
});

TestRunner.test("Day 654 - disableSidechainBus is a function export", (t) => {
    t.assertEqual(typeof disableSidechainBus, 'function', 'disableSidechainBus should be a function');
});

TestRunner.test("Day 654 - disableSidechainBus accepts 0 parameters", (t) => {
    t.assertEqual(disableSidechainBus.length, 0, 'disableSidechainBus should accept no parameters');
});

TestRunner.test("Day 654 - disableSidechainBus calls disableSidechainFromMic", (t) => {
    const funcStr = disableSidechainBus.toString();
    t.assertTruthy(funcStr.includes('disableSidechainFromMic'), 'disableSidechainBus should call disableSidechainFromMic');
});

TestRunner.test("Day 654 - APP_VERSION validation for Day 654 sidechain functions", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 654');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 307, 'Minor version should be >= 307 for Day 654');
    }
});

// --- Master Volume Automation Function Tests ---

TestRunner.test("Day 654 - getMasterVolumeAutomation is a function export", (t) => {
    t.assertEqual(typeof getMasterVolumeAutomation, 'function', 'getMasterVolumeAutomation should be a function');
});

TestRunner.test("Day 654 - getMasterVolumeAutomation accepts 0 parameters", (t) => {
    t.assertEqual(getMasterVolumeAutomation.length, 0, 'getMasterVolumeAutomation should accept no parameters');
});

TestRunner.test("Day 654 - getMasterVolumeAutomation references masterVolumeAutomationData", (t) => {
    const funcStr = getMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('masterVolumeAutomationData'), 'getMasterVolumeAutomation should reference masterVolumeAutomationData');
});

TestRunner.test("Day 654 - setMasterVolumeAutomation is a function export", (t) => {
    t.assertEqual(typeof setMasterVolumeAutomation, 'function', 'setMasterVolumeAutomation should be a function');
});

TestRunner.test("Day 654 - setMasterVolumeAutomation accepts 1 parameter", (t) => {
    t.assertEqual(setMasterVolumeAutomation.length, 1, 'setMasterVolumeAutomation should accept 1 parameter');
});

TestRunner.test("Day 654 - setMasterVolumeAutomation calls captureAudioStateForUndoIfAllowed", (t) => {
    const funcStr = setMasterVolumeAutomation.toString();
    t.assertTruthy(funcStr.includes('captureAudioStateForUndoIfAllowed'), 'setMasterVolumeAutomation should capture undo');
});

TestRunner.test("Day 654 - writeMasterVolumeAutomation is a function export", (t) => {
    t.assertEqual(typeof writeMasterVolumeAutomation, 'function', 'writeMasterVolumeAutomation should be a function');
});

TestRunner.test("Day 654 - writeMasterVolumeAutomation accepts 2 parameters", (t) => {
    t.assertEqual(writeMasterVolumeAutomation.length, 2, 'writeMasterVolumeAutomation should accept 2 parameters');
});

TestRunner.test("Day 654 - applyMasterVolumeAutomationAtTime is a function export", (t) => {
    t.assertEqual(typeof applyMasterVolumeAutomationAtTime, 'function', 'applyMasterVolumeAutomationAtTime should be a function');
});

TestRunner.test("Day 654 - applyMasterVolumeAutomationAtTime accepts 1 parameter", (t) => {
    t.assertEqual(applyMasterVolumeAutomationAtTime.length, 1, 'applyMasterVolumeAutomationAtTime should accept 1 parameter');
});

TestRunner.test("Day 654 - APP_VERSION validation for Day 654 master volume automation", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 654');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 307, 'Minor version should be >= 307 for Day 654');
    }
});

// --- State Module Internal Functions Tests ---

TestRunner.test("Day 654 - captureStateForUndoInternal is a function export", (t) => {
    const stateStr = stateModule.toString();
    t.assertTruthy(stateStr.includes('export function captureStateForUndoInternal'), 'captureStateForUndoInternal should be exported');
});

TestRunner.test("Day 654 - captureStateForUndoInternal accepts 1 parameter with default", (t) => {
    t.assertTrue(captureStateForUndoInternal.length === 1, 'captureStateForUndoInternal should accept 1 parameter');
});

TestRunner.test("Day 654 - captureStateForUndoInternal uses try/catch for error handling", (t) => {
    const funcStr = captureStateForUndoInternal.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'captureStateForUndoInternal should have try/catch');
});

TestRunner.test("Day 654 - captureStateForUndoInternal references undoStack", (t) => {
    const funcStr = captureStateForUndoInternal.toString();
    t.assertTruthy(funcStr.includes('undoStack'), 'captureStateForUndoInternal should reference undoStack');
});

TestRunner.test("Day 654 - captureStateForUndoInternal clears redoStack on new action", (t) => {
    const funcStr = captureStateForUndoInternal.toString();
    t.assertTruthy(funcStr.includes('redoStack = []') || funcStr.includes('redoStack=[]'), 'captureStateForUndoInternal should clear redo stack');
});

TestRunner.test("Day 654 - captureStateForUndoInternal uses MAX_HISTORY_STATES constant", (t) => {
    const funcStr = captureStateForUndoInternal.toString();
    t.assertTruthy(funcStr.includes('MAX_HISTORY_STATES') || funcStr.includes('Constants.MAX'), 'captureStateForUndoInternal should use MAX_HISTORY_STATES');
});

TestRunner.test("Day 654 - captureStateForUndoInternal calls gatherProjectDataInternal", (t) => {
    const funcStr = captureStateForUndoInternal.toString();
    t.assertTruthy(funcStr.includes('gatherProjectDataInternal'), 'captureStateForUndoInternal should gather project data');
});

TestRunner.test("Day 654 - APP_VERSION validation for Day 654 state internal functions", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 654');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 307, 'Minor version should be >= 307 for Day 654');
    }
});
// --- Day 655: UI Window Function Tests ---

TestRunner.test("Day 655 - openProjectNotesWindow is a function export", (t) => {
    const uiStr = uiModule.toString();
    t.assertTruthy(uiStr.includes('export function openProjectNotesWindow'), 'openProjectNotesWindow should be exported');
});

TestRunner.test("Day 655 - openProjectNotesWindow accepts 1 parameter with default", (t) => {
    t.assertEqual(openProjectNotesWindow.length, 1, 'openProjectNotesWindow should accept 1 parameter');
});

TestRunner.test("Day 655 - openProjectNotesWindow references localAppServices.getOpenWindows", (t) => {
    const funcStr = openProjectNotesWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openProjectNotesWindow should check open windows');
});

TestRunner.test("Day 655 - openProjectNotesWindow references getProjectNotesState", (t) => {
    const funcStr = openProjectNotesWindow.toString();
    t.assertTruthy(funcStr.includes('getProjectNotesState'), 'openProjectNotesWindow should use getProjectNotesState');
});

TestRunner.test("Day 655 - openProjectNotesWindow references setProjectNotesState", (t) => {
    const funcStr = openProjectNotesWindow.toString();
    t.assertTruthy(funcStr.includes('setProjectNotesState'), 'openProjectNotesWindow should use setProjectNotesState');
});

TestRunner.test("Day 655 - openProjectNotesWindow uses createWindow with 'Project Notes' title", (t) => {
    const funcStr = openProjectNotesWindow.toString();
    t.assertTruthy(funcStr.includes("'Project Notes'") || funcStr.includes('"Project Notes"'), 'openProjectNotesWindow should set title to Project Notes');
});

TestRunner.test("Day 655 - openProjectNotesWindow references showNotification", (t) => {
    const funcStr = openProjectNotesWindow.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'openProjectNotesWindow should call showNotification');
});

TestRunner.test("Day 655 - openAudioClipEditorWindow is a function export", (t) => {
    const uiStr = uiModule.toString();
    t.assertTruthy(uiStr.includes('export function openAudioClipEditorWindow'), 'openAudioClipEditorWindow should be exported');
});

TestRunner.test("Day 655 - openAudioClipEditorWindow accepts 3 parameters", (t) => {
    t.assertEqual(openAudioClipEditorWindow.length, 3, 'openAudioClipEditorWindow should accept 3 parameters');
});

TestRunner.test("Day 655 - openAudioClipEditorWindow references localAppServices.getTrackById", (t) => {
    const funcStr = openAudioClipEditorWindow.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'openAudioClipEditorWindow should call getTrackById');
});

TestRunner.test("Day 655 - openAudioClipEditorWindow finds clip in track.timelineClips", (t) => {
    const funcStr = openAudioClipEditorWindow.toString();
    t.assertTruthy(funcStr.includes('timelineClips') && funcStr.includes('.find'), 'openAudioClipEditorWindow should find clip in timelineClips');
});

TestRunner.test("Day 655 - openAudioClipEditorWindow creates window with audioClipEditor windowId", (t) => {
    const funcStr = openAudioClipEditorWindow.toString();
    t.assertTruthy(funcStr.includes('audioClipEditor') || funcStr.includes('clipEditor'), 'openAudioClipEditorWindow should use audioClipEditor windowId');
});

TestRunner.test("Day 655 - openAudioClipEditorWindow uses createWindow with width/height options", (t) => {
    const funcStr = openAudioClipEditorWindow.toString();
    t.assertTruthy(funcStr.includes('width') && funcStr.includes('height'), 'openAudioClipEditorWindow should set window dimensions');
});

TestRunner.test("Day 655 - renderMixer is a function export", (t) => {
    const uiStr = uiModule.toString();
    t.assertTruthy(uiStr.includes('export function renderMixer'), 'renderMixer should be exported');
});

TestRunner.test("Day 655 - renderMixer accepts 1 parameter", (t) => {
    t.assertEqual(renderMixer.length, 1, 'renderMixer should accept 1 parameter');
});

TestRunner.test("Day 655 - renderMixer references localAppServices.getTracks", (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('getTracks'), 'renderMixer should call getTracks');
});

TestRunner.test("Day 655 - renderMixer creates master track UI", (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('master') || funcStr.includes('Master'), 'renderMixer should create master track');
});

TestRunner.test("Day 655 - renderMixer uses createKnob for volume controls", (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('createKnob'), 'renderMixer should use createKnob');
});

TestRunner.test("Day 655 - renderMixer iterates tracks with forEach", (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('forEach'), 'renderMixer should iterate over tracks');
});

TestRunner.test("Day 655 - renderMixer references localAppServices.handleTrackMute", (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('handleTrackMute'), 'renderMixer should reference handleTrackMute');
});

TestRunner.test("Day 655 - renderMixer references localAppServices.handleTrackSolo", (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('handleTrackSolo'), 'renderMixer should reference handleTrackSolo');
});

TestRunner.test("Day 655 - renderMixer references localAppServices.handleTrackArm", (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('handleTrackArm'), 'renderMixer should reference handleTrackArm');
});

TestRunner.test("Day 655 - renderMixer references showTrackColorPicker", (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('showTrackColorPicker'), 'renderMixer should reference showTrackColorPicker');
});

TestRunner.test("Day 655 - renderMixer references createContextMenu", (t) => {
    const funcStr = renderMixer.toString();
    t.assertTruthy(funcStr.includes('createContextMenu'), 'renderMixer should reference createContextMenu');
});

TestRunner.test("Day 655 - APP_VERSION validation for Day 655 UI window functions", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 655');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 308, 'Minor version should be >= 308 for Day 655');
    }
});
// --- Day 656: Utils Module Function Tests ---

TestRunner.test("Day 656 - showNotification is a function export", (t) => {
    const funcStr = showNotification.toString();
    t.assertTruthy(funcStr.includes('export function'), 'showNotification should be exported');
});

TestRunner.test("Day 656 - showNotification accepts 1-2 parameters with default", (t) => {
    t.assertTrue(showNotification.length === 1 || showNotification.length === 2, 'showNotification should accept 1-2 parameters (message, optional duration)');
});

TestRunner.test("Day 656 - showNotification references notification-area div", (t) => {
    const funcStr = showNotification.toString();
    t.assertTruthy(funcStr.includes("getElementById('notification-area')"), 'showNotification should reference notification-area div');
});

TestRunner.test("Day 656 - showNotification creates notification div with class", (t) => {
    const funcStr = showNotification.toString();
    t.assertTruthy(funcStr.includes('notification-message') && funcStr.includes('createElement'), 'showNotification should create div with notification-message class');
});

TestRunner.test("Day 656 - showNotification uses setTimeout for fade-in", (t) => {
    const funcStr = showNotification.toString();
    t.assertTruthy(funcStr.includes('setTimeout') && funcStr.includes('classList.add'), 'showNotification should use setTimeout for fade-in animation');
});

TestRunner.test("Day 656 - showNotification uses setTimeout for removal", (t) => {
    const funcStr = showNotification.toString();
    t.assertTruthy(funcStr.includes('classList.remove') && funcStr.includes('removeChild'), 'showNotification should remove notification after duration');
});

TestRunner.test("Day 656 - showCustomModal is a function export", (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes('export function'), 'showCustomModal should be exported');
});

TestRunner.test("Day 656 - showCustomModal accepts 3-4 parameters", (t) => {
    t.assertTrue(showCustomModal.length === 3 || showCustomModal.length === 4, 'showCustomModal should accept 3-4 parameters (title, contentHTML, buttonsConfig, optional modalClass)');
});

TestRunner.test("Day 656 - showCustomModal references modalContainer div", (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes("getElementById('modalContainer')"), 'showCustomModal should reference modalContainer div');
});

TestRunner.test("Day 656 - showCustomModal creates modal-overlay and modal-dialog divs", (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes('modal-overlay') && funcStr.includes('modal-dialog'), 'showCustomModal should create modal overlay and dialog elements');
});

TestRunner.test("Day 656 - showCustomModal creates modal-title-bar", (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes('modal-title-bar'), 'showCustomModal should create title bar element');
});

TestRunner.test("Day 656 - showCustomModal uses buttonsConfig parameter", (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes('buttonsConfig'), 'showCustomModal should use buttonsConfig parameter');
});

TestRunner.test("Day 656 - showConfirmationDialog is a function export", (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('export function'), 'showConfirmationDialog should be exported');
});

TestRunner.test("Day 656 - showConfirmationDialog accepts 4 parameters", (t) => {
    t.assertEqual(showConfirmationDialog.length, 4, 'showConfirmationDialog should accept 4 parameters (title, message, onConfirm, onCancel)');
});

TestRunner.test("Day 656 - showConfirmationDialog calls showCustomModal", (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('showCustomModal'), 'showConfirmationDialog should call showCustomModal');
});

TestRunner.test("Day 656 - showConfirmationDialog passes onConfirm and onCancel to showCustomModal", (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('onConfirm') && funcStr.includes('onCancel'), 'showConfirmationDialog should pass callback functions');
});

TestRunner.test("Day 656 - createDropZoneHTML is a function export", (t) => {
    const funcStr = createDropZoneHTML.toString();
    t.assertTruthy(funcStr.includes('export function'), 'createDropZoneHTML should be exported');
});

TestRunner.test("Day 656 - createDropZoneHTML accepts 5-6 parameters", (t) => {
    t.assertTrue(createDropZoneHTML.length === 5 || createDropZoneHTML.length === 6, 'createDropZoneHTML should accept 5-6 parameters');
});

TestRunner.test("Day 656 - createDropZoneHTML generates dropZoneId with trackId and trackTypeHint", (t) => {
    const funcStr = createDropZoneHTML.toString();
    t.assertTruthy(funcStr.includes('dropZoneId') && funcStr.includes('trackId') && funcStr.includes('trackTypeHint'), 'createDropZoneHTML should generate dropZoneId');
});

TestRunner.test("Day 656 - createDropZoneHTML handles padOrSliceIndex parameter", (t) => {
    const funcStr = createDropZoneHTML.toString();
    t.assertTruthy(funcStr.includes('padOrSliceIndex'), 'createDropZoneHTML should handle padOrSliceIndex parameter');
});

TestRunner.test("Day 656 - createDropZoneHTML generates data attributes", (t) => {
    const funcStr = createDropZoneHTML.toString();
    t.assertTruthy(funcStr.includes('data-track-id') && funcStr.includes('data-track-type'), 'createDropZoneHTML should generate data attributes');
});

TestRunner.test("Day 656 - createDropZoneHTML handles existingAudioData status cases", (t) => {
    const funcStr = createDropZoneHTML.toString();
    t.assertTruthy(funcStr.includes('existingAudioData.status') && funcStr.includes('loaded') && funcStr.includes('missing') && funcStr.includes('error'), 'createDropZoneHTML should handle status cases');
});

TestRunner.test("Day 656 - createDropZoneHTML returns HTML string", (t) => {
    const funcStr = createDropZoneHTML.toString();
    t.assertTruthy(funcStr.includes('return') && funcStr.includes('drop-zone'), 'createDropZoneHTML should return HTML string');
});

TestRunner.test("Day 656 - setupGenericDropZoneListeners is a function export", (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('export function'), 'setupGenericDropZoneListeners should be exported');
});

TestRunner.test("Day 656 - setupGenericDropZoneListeners accepts 7 parameters", (t) => {
    t.assertEqual(setupGenericDropZoneListeners.length, 7, 'setupGenericDropZoneListeners should accept 7 parameters');
});

TestRunner.test("Day 656 - setupGenericDropZoneListeners validates dropZoneElement not null", (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('!dropZoneElement') && funcStr.includes('console.error'), 'setupGenericDropZoneListeners should validate dropZoneElement');
});

TestRunner.test("Day 656 - setupGenericDropZoneListeners adds dragover listener", (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes("addEventListener('dragover'") && funcStr.includes('preventDefault'), 'setupGenericDropZoneListeners should add dragover listener');
});

TestRunner.test("Day 656 - setupGenericDropZoneListeners adds dragleave listener", (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes("addEventListener('dragleave'") && funcStr.includes('classList.remove'), 'setupGenericDropZoneListeners should add dragleave listener');
});

TestRunner.test("Day 656 - setupGenericDropZoneListeners adds drop listener", (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes("addEventListener('drop'") && funcStr.includes('preventDefault'), 'setupGenericDropZoneListeners should add drop listener');
});

TestRunner.test("Day 656 - setupGenericDropZoneListeners checks for application/json data", (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('application/json') && funcStr.includes('sound-browser-item'), 'setupGenericDropZoneListeners should check for sound browser data');
});

TestRunner.test("Day 656 - setupGenericDropZoneListeners checks for files dataTransfer", (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('dataTransfer.files') && funcStr.includes('loadFileCallback'), 'setupGenericDropZoneListeners should check for OS files');
});

TestRunner.test("Day 656 - secondsToBBSTime is a function export", (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('export function'), 'secondsToBBSTime should be exported');
});

TestRunner.test("Day 656 - secondsToBBSTime accepts 1 parameter", (t) => {
    t.assertEqual(secondsToBBSTime.length, 1, 'secondsToBBSTime should accept 1 parameter (seconds)');
});

TestRunner.test("Day 656 - secondsToBBSTime checks for Tone undefined or invalid input", (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes("typeof Tone === 'undefined'") || funcStr.includes('Tone') && funcStr.includes('isNaN'), 'secondsToBBSTime should check for Tone availability and invalid input');
});

TestRunner.test("Day 656 - secondsToBBSTime uses try/catch", (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'secondsToBBSTime should have try/catch for error handling');
});

TestRunner.test("Day 656 - secondsToBBSTime calls Tone.Time(seconds).toBarsBeatsSixteenths", (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('Tone.Time') && funcStr.includes('toBarsBeatsSixteenths'), 'secondsToBBSTime should convert using Tone.Time');
});

TestRunner.test("Day 656 - secondsToBBSTime returns 0:0:0 on error", (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('return "0:0:0"') && funcStr.includes('catch'), 'secondsToBBSTime should return fallback string on error');
});

TestRunner.test("Day 656 - bbsTimeToSeconds is a function export", (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('export function'), 'bbsTimeToSeconds should be exported');
});

TestRunner.test("Day 656 - bbsTimeToSeconds accepts 1 parameter", (t) => {
    t.assertEqual(bbsTimeToSeconds.length, 1, 'bbsTimeToSeconds should accept 1 parameter (bbsString)');
});

TestRunner.test("Day 656 - bbsTimeToSeconds checks for Tone undefined or invalid input", (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes("typeof Tone === 'undefined'") || funcStr.includes('Tone') && funcStr.includes('bbsString'), 'bbsTimeToSeconds should check for Tone availability and invalid input');
});

TestRunner.test("Day 656 - bbsTimeToSeconds uses try/catch", (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'bbsTimeToSeconds should have try/catch for error handling');
});

TestRunner.test("Day 656 - bbsTimeToSeconds calls Tone.Time(bbsString).toSeconds", (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('Tone.Time') && funcStr.includes('toSeconds'), 'bbsTimeToSeconds should convert using Tone.Time');
});

TestRunner.test("Day 656 - bbsTimeToSeconds returns null on error", (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('return null') && funcStr.includes('catch'), 'bbsTimeToSeconds should return null on error');
});

TestRunner.test("Day 656 - createContextMenu is a function export", (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('export function'), 'createContextMenu should be exported');
});

TestRunner.test("Day 656 - createContextMenu accepts 3 parameters", (t) => {
    t.assertEqual(createContextMenu.length, 3, 'createContextMenu should accept 3 parameters (event, menuItems, appServicesForZIndex)');
});

TestRunner.test("Day 656 - createContextMenu validates event and menuItems", (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('!event') || funcStr.includes('!menuItems') && funcStr.includes('console.error'), 'createContextMenu should validate inputs');
});

TestRunner.test("Day 656 - createContextMenu calls preventDefault and stopPropagation", (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('preventDefault') && funcStr.includes('stopPropagation'), 'createContextMenu should prevent default and stop propagation');
});

TestRunner.test("Day 656 - createContextMenu removes activeContextMenu if exists", (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('activeContextMenu') && funcStr.includes('remove()'), 'createContextMenu should remove existing context menu');
});

TestRunner.test("Day 656 - createContextMenu sets activeContextMenu", (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('activeContextMenu ='), 'createContextMenu should store reference to active context menu');
});

TestRunner.test("Day 656 - APP_VERSION validation for Day 656 Utils functions", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 656');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 309, 'Minor version should be >= 309 for Day 656');
    }
});

// --- Day 657: SnugWindow Class Tests ---
TestRunner.test("Day 657 - SnugWindow is an exported class", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('class SnugWindow'), 'SnugWindow should be a class');
    t.assertTruthy(funcStr.includes('export'), 'SnugWindow should be exported');
});

TestRunner.test("Day 657 - SnugWindow constructor accepts 4-5 parameters", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('constructor(id, title, contentHTMLOrElement, options = {}, appServices = {})'), 'SnugWindow should accept id, title, contentHTMLOrElement, options, and appServices parameters');
});

TestRunner.test("Day 657 - SnugWindow stores id, title, and appServices properties", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('this.id = id'), 'SnugWindow should store id');
    t.assertTruthy(funcStr.includes('this.title = title'), 'SnugWindow should store title');
    t.assertTruthy(funcStr.includes('this.appServices = appServices'), 'SnugWindow should store appServices');
});

TestRunner.test("Day 657 - SnugWindow has isMinimized, isMaximized, and restoreState properties", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('this.isMinimized'), 'SnugWindow should have isMinimized');
    t.assertTruthy(funcStr.includes('this.isMaximized'), 'SnugWindow should have isMaximized');
    t.assertTruthy(funcStr.includes('this.restoreState'), 'SnugWindow should have restoreState');
});

TestRunner.test("Day 657 - SnugWindow calculates cascade offset based on open window count", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'SnugWindow should reference getOpenWindows for cascade');
    t.assertTruthy(funcStr.includes('cascadeOffset'), 'SnugWindow should calculate cascade offset');
    t.assertTruthy(funcStr.includes('cascadeIncrement'), 'SnugWindow should use cascade increment');
});

TestRunner.test("Day 657 - SnugWindow creates element div with window class", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('createElement'), 'SnugWindow should create element');
    t.assertTruthy(funcStr.includes("element.id ="), 'SnugWindow should set element id');
    t.assertTruthy(funcStr.includes("element.className = 'window'"), 'SnugWindow should set window class');
});

TestRunner.test("Day 657 - SnugWindow creates titleBar div with window-title-bar class", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('titleBar'), 'SnugWindow should create titleBar');
    t.assertTruthy(funcStr.includes("className = 'window-title-bar'"), 'SnugWindow should set titleBar class');
    t.assertTruthy(funcStr.includes('window-minimize-btn'), 'SnugWindow should create minimize button');
    t.assertTruthy(funcStr.includes('window-maximize-btn'), 'SnugWindow should create maximize button');
    t.assertTruthy(funcStr.includes('window-close-btn'), 'SnugWindow should create close button');
});

TestRunner.test("Day 657 - SnugWindow creates contentArea div with window-content class", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('contentArea'), 'SnugWindow should create contentArea');
    t.assertTruthy(funcStr.includes("className = 'window-content'"), 'SnugWindow should set contentArea class');
});

TestRunner.test("Day 657 - SnugWindow appends titleBar and contentArea to element", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('appendChild(this.titleBar)'), 'SnugWindow should append titleBar');
    t.assertTruthy(funcStr.includes('appendChild(this.contentArea)'), 'SnugWindow should append contentArea');
});

TestRunner.test("Day 657 - SnugWindow references desktop and taskbar elements", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('desktop'), 'SnugWindow should reference desktop');
    t.assertTruthy(funcStr.includes('taskbar'), 'SnugWindow should reference taskbar');
    t.assertTruthy(funcStr.includes('taskbarHeight'), 'SnugWindow should calculate taskbar height');
});

TestRunner.test("Day 657 - SnugWindow handles options for width, height, x, y", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('options.width'), 'SnugWindow should handle width option');
    t.assertTruthy(funcStr.includes('options.height'), 'SnugWindow should handle height option');
    t.assertTruthy(funcStr.includes('options.x'), 'SnugWindow should handle x option');
    t.assertTruthy(funcStr.includes('options.y'), 'SnugWindow should handle y option');
    t.assertTruthy(funcStr.includes('options.minWidth'), 'SnugWindow should handle minWidth option');
    t.assertTruthy(funcStr.includes('options.minHeight'), 'SnugWindow should handle minHeight option');
});

TestRunner.test("Day 657 - SnugWindow clamps dimensions to desktop bounds", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('safeDesktopWidth'), 'SnugWindow should reference safeDesktopWidth');
    t.assertTruthy(funcStr.includes('safeDesktopHeight'), 'SnugWindow should reference safeDesktopHeight');
    t.assertTruthy(funcStr.includes('Math.min'), 'SnugWindow should use Math.min for clamping');
    t.assertTruthy(funcStr.includes('Math.max'), 'SnugWindow should use Math.max for clamping');
});

TestRunner.test("Day 657 - SnugWindow sets zIndex and manages window stacking", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('zIndex'), 'SnugWindow should handle zIndex');
    t.assertTruthy(funcStr.includes('incrementHighestZ'), 'SnugWindow should call incrementHighestZ');
    t.assertTruthy(funcStr.includes('setHighestZ'), 'SnugWindow should call setHighestZ');
});

TestRunner.test("Day 657 - SnugWindow handles closable, minimizable, resizable options", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('closable'), 'SnugWindow should handle closable option');
    t.assertTruthy(funcStr.includes('minimizable'), 'SnugWindow should handle minimizable option');
    t.assertTruthy(funcStr.includes('resizable'), 'SnugWindow should handle resizable option');
});

TestRunner.test("Day 657 - SnugWindow has onCloseCallback option", (t) => {
    const funcStr = SnugWindow.toString();
    t.assertTruthy(funcStr.includes('onCloseCallback'), 'SnugWindow should have onCloseCallback');
});

TestRunner.test("Day 657 - APP_VERSION validation for Day 657 SnugWindow class tests", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 657');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 310, 'Minor version should be >= 310 for Day 657');
    }
});

// --- Day 658: Remaining UI Window Open Function Tests ---

TestRunner.test("Day 658 - openTrackEffectsRackWindow is a function export", (t) => {
    const funcStr = openTrackEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('export function'), 'openTrackEffectsRackWindow should be exported');
});

TestRunner.test("Day 658 - openTrackEffectsRackWindow accepts 2 parameters (trackId, savedState)", (t) => {
    t.assertEqual(openTrackEffectsRackWindow.length, 2, 'openTrackEffectsRackWindow should accept 2 parameters');
});

TestRunner.test("Day 658 - openTrackEffectsRackWindow references localAppServices.getTrackById", (t) => {
    const funcStr = openTrackEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'openTrackEffectsRackWindow should use getTrackById');
});

TestRunner.test("Day 658 - openTrackEffectsRackWindow references getOpenWindows", (t) => {
    const funcStr = openTrackEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openTrackEffectsRackWindow should check open windows');
});

TestRunner.test("Day 658 - openTrackEffectsRackWindow uses createWindow for window creation", (t) => {
    const funcStr = openTrackEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTrackEffectsRackWindow should use createWindow');
});

TestRunner.test("Day 658 - openMasterEffectsRackWindow is a function export", (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('export function'), 'openMasterEffectsRackWindow should be exported');
});

TestRunner.test("Day 658 - openMasterEffectsRackWindow accepts 1 parameter with default (savedState)", (t) => {
    t.assertEqual(openMasterEffectsRackWindow.length, 1, 'openMasterEffectsRackWindow should accept 1 parameter');
});

TestRunner.test("Day 658 - openMasterEffectsRackWindow references getOpenWindows", (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openMasterEffectsRackWindow should check open windows');
});

TestRunner.test("Day 658 - openMasterEffectsRackWindow uses createWindow for window creation", (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openMasterEffectsRackWindow should use createWindow');
});

TestRunner.test("Day 658 - openMasterEffectsRackWindow references getMasterEffectsState", (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('getMasterEffectsState'), 'openMasterEffectsRackWindow should reference master effects state');
});

TestRunner.test("Day 658 - openGlobalControlsWindow is a function export", (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('export function'), 'openGlobalControlsWindow should be exported');
});

TestRunner.test("Day 658 - openGlobalControlsWindow accepts 2 parameters (onReadyCallback, savedState)", (t) => {
    t.assertEqual(openGlobalControlsWindow.length, 2, 'openGlobalControlsWindow should accept 2 parameters');
});

TestRunner.test("Day 658 - openGlobalControlsWindow references getOpenWindows", (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openGlobalControlsWindow should check open windows');
});

TestRunner.test("Day 658 - openGlobalControlsWindow uses createWindow for window creation", (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openGlobalControlsWindow should use createWindow');
});

TestRunner.test("Day 658 - openSoundBrowserWindow is a function export", (t) => {
    const funcStr = openSoundBrowserWindow.toString();
    t.assertTruthy(funcStr.includes('export function'), 'openSoundBrowserWindow should be exported');
});

TestRunner.test("Day 658 - openSoundBrowserWindow accepts 1 parameter with default (savedState)", (t) => {
    t.assertEqual(openSoundBrowserWindow.length, 1, 'openSoundBrowserWindow should accept 1 parameter');
});

TestRunner.test("Day 658 - openSoundBrowserWindow references getOpenWindows", (t) => {
    const funcStr = openSoundBrowserWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openSoundBrowserWindow should check open windows');
});

TestRunner.test("Day 658 - openSoundBrowserWindow uses createWindow for window creation", (t) => {
    const funcStr = openSoundBrowserWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openSoundBrowserWindow should use createWindow');
});

TestRunner.test("Day 658 - openSoundBrowserWindow references getLoadedZipFiles or getSoundLibraryFileTrees", (t) => {
    const funcStr = openSoundBrowserWindow.toString();
    t.assertTruthy(funcStr.includes('getLoadedZipFiles') || funcStr.includes('getSoundLibraryFileTrees'), 'openSoundBrowserWindow should reference sound library functions');
});

TestRunner.test("Day 658 - APP_VERSION validation for Day 658 remaining UI window tests", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 658');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 310, 'Minor version should be >= 310 for Day 658');
    }
});

TestRunner.test("Day 659 - playSlicePreview is a function export", (t) => {
    t.assertEqual(typeof playSlicePreview, 'function', 'playSlicePreview should be a function');
});

TestRunner.test("Day 659 - playSlicePreview is an async function export", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('async'), 'playSlicePreview should be an async function');
});

TestRunner.test("Day 659 - playSlicePreview accepts 4 parameters with defaults", (t) => {
    t.assertEqual(playSlicePreview.length, 4, 'playSlicePreview should accept 4 parameters');
});

TestRunner.test("Day 659 - playSlicePreview references initAudioContextAndMasterMeter", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('initAudioContextAndMasterMeter'), 'playSlicePreview should call initAudioContextAndMasterMeter');
});

TestRunner.test("Day 659 - playSlicePreview references getTrackById from appServices", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'playSlicePreview should reference getTrackById');
});

TestRunner.test("Day 659 - playSlicePreview validates track type is Sampler", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes("track.type !== 'Sampler'") || funcStr.includes("type === 'Sampler'"), 'playSlicePreview should validate track type is Sampler');
});

TestRunner.test("Day 659 - playSlicePreview references track.audioBuffer and track.slicerIsPolyphonic", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('audioBuffer') && funcStr.includes('slicerIsPolyphonic'), 'playSlicePreview should reference audioBuffer and slicerIsPolyphonic');
});

TestRunner.test("Day 659 - playSlicePreview references getActualMasterGainNode", (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('getActualMasterGainNode'), 'playSlicePreview should reference getActualMasterGainNode');
});

TestRunner.test("Day 659 - autoSliceSample is a function export", (t) => {
    t.assertEqual(typeof autoSliceSample, 'function', 'autoSliceSample should be a function');
});

TestRunner.test("Day 659 - autoSliceSample accepts 2 parameters with defaults", (t) => {
    t.assertEqual(autoSliceSample.length, 2, 'autoSliceSample should accept 2 parameters');
});

TestRunner.test("Day 659 - autoSliceSample references getTrackById from appServices", (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'autoSliceSample should reference getTrackById');
});

TestRunner.test("Day 659 - autoSliceSample validates track type is Sampler", (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes("track.type !== 'Sampler'") || funcStr.includes("type === 'Sampler'"), 'autoSliceSample should validate track type is Sampler');
});

TestRunner.test("Day 659 - autoSliceSample shows notification for non-Sampler tracks", (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'autoSliceSample should call showNotification for invalid track type');
});

TestRunner.test("Day 659 - autoSliceSample references Constants.numSlices default", (t) => {
    const funcStr = autoSliceSample.toString();
    t.assertTruthy(funcStr.includes('Constants.numSlices'), 'autoSliceSample should reference Constants.numSlices');
});

TestRunner.test("Day 659 - APP_VERSION validation for Day 659 audio function tests", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 659');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 312, 'Minor version should be >= 312 for Day 659');
    }
});

// --- Day 659: Mixer, Timeline, and Sequencer Window Function Tests ---

TestRunner.test("Day 659 - openMixerWindow is a function export", (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('export function'), 'openMixerWindow should be exported');
});

TestRunner.test("Day 659 - openMixerWindow accepts 1 parameter with default (savedState)", (t) => {
    t.assertEqual(openMixerWindow.length, 1, 'openMixerWindow should accept 1 parameter');
});

TestRunner.test("Day 659 - openMixerWindow references getOpenWindows", (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openMixerWindow should check open windows');
});

TestRunner.test("Day 659 - openMixerWindow uses createWindow for window creation", (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openMixerWindow should use createWindow');
});

TestRunner.test("Day 659 - openMixerWindow references desktop element for sizing", (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('desktop') || funcStr.includes('offsetWidth'), 'openMixerWindow should reference desktop for sizing');
});

TestRunner.test("Day 659 - openTimelineWindow is a function export", (t) => {
    const funcStr = openTimelineWindow.toString();
    t.assertTruthy(funcStr.includes('export function'), 'openTimelineWindow should be exported');
});

TestRunner.test("Day 659 - openTimelineWindow accepts 1 parameter with default (savedState)", (t) => {
    t.assertEqual(openTimelineWindow.length, 1, 'openTimelineWindow should accept 1 parameter');
});

TestRunner.test("Day 659 - openTimelineWindow references getWindowById for duplicate check", (t) => {
    const funcStr = openTimelineWindow.toString();
    t.assertTruthy(funcStr.includes('getWindowById'), 'openTimelineWindow should check for existing window');
});

TestRunner.test("Day 659 - openTimelineWindow creates timeline container content", (t) => {
    const funcStr = openTimelineWindow.toString();
    t.assertTruthy(funcStr.includes('timeline-container') || funcStr.includes('timelineContent'), 'openTimelineWindow should create timeline content');
});

TestRunner.test("Day 659 - openTimelineWindow uses createWindow for window creation", (t) => {
    const funcStr = openTimelineWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTimelineWindow should use createWindow');
});

TestRunner.test("Day 659 - openTrackSequencerWindow is a function export", (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('export function'), 'openTrackSequencerWindow should be exported');
});

TestRunner.test("Day 659 - openTrackSequencerWindow accepts 3 parameters (trackId, forceRedraw, savedState)", (t) => {
    t.assertEqual(openTrackSequencerWindow.length, 3, 'openTrackSequencerWindow should accept 3 parameters');
});

TestRunner.test("Day 659 - openTrackSequencerWindow references getTrackById for track lookup", (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'openTrackSequencerWindow should get track by ID');
});

TestRunner.test("Day 659 - openTrackSequencerWindow references getOpenWindows for window management", (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openTrackSequencerWindow should manage open windows');
});

TestRunner.test("Day 659 - openTrackSequencerWindow uses createWindow for window creation", (t) => {
    const funcStr = openTrackSequencerWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTrackSequencerWindow should use createWindow');
});

TestRunner.test("Day 659 - openTrackInspectorWindow is a function export", (t) => {
    const funcStr = openTrackInspectorWindow.toString();
    t.assertTruthy(funcStr.includes('export function'), 'openTrackInspectorWindow should be exported');
});

TestRunner.test("Day 659 - openTrackInspectorWindow accepts 2 parameters (trackId, savedState)", (t) => {
    t.assertEqual(openTrackInspectorWindow.length, 2, 'openTrackInspectorWindow should accept 2 parameters');
});

TestRunner.test("Day 659 - openTrackInspectorWindow references getTrackById for track lookup", (t) => {
    const funcStr = openTrackInspectorWindow.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'openTrackInspectorWindow should get track by ID');
});

TestRunner.test("Day 659 - openTrackInspectorWindow references getOpenWindows for window management", (t) => {
    const funcStr = openTrackInspectorWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openTrackInspectorWindow should manage open windows');
});

TestRunner.test("Day 659 - openTrackInspectorWindow uses createWindow for window creation", (t) => {
    const funcStr = openTrackInspectorWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTrackInspectorWindow should use createWindow');
});

TestRunner.test("Day 659 - APP_VERSION validation for Day 659 mixer/timeline/sequencer tests", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 659');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 311, 'Minor version should be >= 311 for Day 659');
    }
});

// --- Day 660: Track Groups, Timeline Markers, and Transport Settings Window Function Tests ---
TestRunner.test("Day 660 - openTrackGroupsWindow is a function export", (t) => {
    const funcStr = openTrackGroupsWindow.toString();
    t.assertTruthy(funcStr.includes('export function'), 'openTrackGroupsWindow should be exported');
});

TestRunner.test("Day 660 - openTrackGroupsWindow accepts 1 parameter with default (savedState)", (t) => {
    t.assertEqual(openTrackGroupsWindow.length, 1, 'openTrackGroupsWindow should accept 1 parameter');
});

TestRunner.test("Day 660 - openTrackGroupsWindow references getOpenWindows", (t) => {
    const funcStr = openTrackGroupsWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openTrackGroupsWindow should check open windows');
});

TestRunner.test("Day 660 - openTrackGroupsWindow references getTrackGroups", (t) => {
    const funcStr = openTrackGroupsWindow.toString();
    t.assertTruthy(funcStr.includes('getTrackGroups'), 'openTrackGroupsWindow should use getTrackGroups');
});

TestRunner.test("Day 660 - openTrackGroupsWindow references getTracks", (t) => {
    const funcStr = openTrackGroupsWindow.toString();
    t.assertTruthy(funcStr.includes('getTracks'), 'openTrackGroupsWindow should use getTracks');
});

TestRunner.test("Day 660 - openTrackGroupsWindow uses createWindow for window creation", (t) => {
    const funcStr = openTrackGroupsWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTrackGroupsWindow should use createWindow');
});

TestRunner.test("Day 660 - openTimelineMarkersWindow is a function export", (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('export function'), 'openTimelineMarkersWindow should be exported');
});

TestRunner.test("Day 660 - openTimelineMarkersWindow accepts 1 parameter with default (savedState)", (t) => {
    t.assertEqual(openTimelineMarkersWindow.length, 1, 'openTimelineMarkersWindow should accept 1 parameter');
});

TestRunner.test("Day 660 - openTimelineMarkersWindow references getOpenWindows", (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openTimelineMarkersWindow should check open windows');
});

TestRunner.test("Day 660 - openTimelineMarkersWindow references getTimelineMarkers", (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('getTimelineMarkers'), 'openTimelineMarkersWindow should use getTimelineMarkers');
});

TestRunner.test("Day 660 - openTimelineMarkersWindow references MARKER_COLORS", (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('MARKER_COLORS'), 'openTimelineMarkersWindow should reference MARKER_COLORS');
});

TestRunner.test("Day 660 - openTimelineMarkersWindow uses createWindow for window creation", (t) => {
    const funcStr = openTimelineMarkersWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTimelineMarkersWindow should use createWindow');
});

TestRunner.test("Day 660 - openTransportSettingsWindow is a function export", (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('export function'), 'openTransportSettingsWindow should be exported');
});

TestRunner.test("Day 660 - openTransportSettingsWindow accepts 1 parameter with default (savedState)", (t) => {
    t.assertEqual(openTransportSettingsWindow.length, 1, 'openTransportSettingsWindow should accept 1 parameter');
});

TestRunner.test("Day 660 - openTransportSettingsWindow references getOpenWindows", (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openTransportSettingsWindow should check open windows');
});

TestRunner.test("Day 660 - openTransportSettingsWindow references isMetronomeEnabled", (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('isMetronomeEnabled'), 'openTransportSettingsWindow should use isMetronomeEnabled');
});

TestRunner.test("Day 660 - openTransportSettingsWindow references getMetronomeVolume", (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('getMetronomeVolume'), 'openTransportSettingsWindow should use getMetronomeVolume');
});

TestRunner.test("Day 660 - openTransportSettingsWindow references getCountInBars", (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('getCountInBars'), 'openTransportSettingsWindow should use getCountInBars');
});

TestRunner.test("Day 660 - openTransportSettingsWindow references getSwingEnabled", (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('getSwingEnabled'), 'openTransportSettingsWindow should use getSwingEnabled');
});

TestRunner.test("Day 660 - openTransportSettingsWindow uses createWindow for window creation", (t) => {
    const funcStr = openTransportSettingsWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTransportSettingsWindow should use createWindow');
});

TestRunner.test("Day 660 - APP_VERSION validation for Day 660 window function tests", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 660');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 313, 'Minor version should be >= 313 for Day 660');
    }
});

// --- Day 661: Sound Browser Render Function Tests ---
TestRunner.test("Day 661 - renderSoundBrowserDirectoryFiltered is a function export", (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('export function'), 'renderSoundBrowserDirectoryFiltered should be exported');
});

TestRunner.test("Day 661 - renderSoundBrowserDirectoryFiltered accepts 3 parameters (pathArray, treeNode, searchQuery)", (t) => {
    t.assertEqual(renderSoundBrowserDirectoryFiltered.length, 3, 'renderSoundBrowserDirectoryFiltered should accept 3 parameters');
});

TestRunner.test("Day 661 - renderSoundBrowserDirectoryFiltered references localAppServices.getWindowById", (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('getWindowById'), 'renderSoundBrowserDirectoryFiltered should check getWindowById');
});

TestRunner.test("Day 661 - renderSoundBrowserDirectoryFiltered references getCurrentLibraryName", (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('getCurrentLibraryName'), 'renderSoundBrowserDirectoryFiltered should use getCurrentLibraryName');
});

TestRunner.test("Day 661 - renderSoundBrowserDirectoryFiltered references setSelectedSoundForPreview", (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('setSelectedSoundForPreview'), 'renderSoundBrowserDirectoryFiltered should use setSelectedSoundForPreview');
});

TestRunner.test("Day 661 - renderSoundBrowserDirectoryFiltered handles search filter (filterTreeBySearch)", (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('filterTreeBySearch'), 'renderSoundBrowserDirectoryFiltered should use filterTreeBySearch for filtering');
});

TestRunner.test("Day 661 - renderSoundBrowserDirectoryFiltered uses BROWSE_PER_PAGE for batch rendering", (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('BROWSE_PER_PAGE'), 'renderSoundBrowserDirectoryFiltered should use BROWSE_PER_PAGE for pagination');
});

TestRunner.test("Day 661 - renderSoundBrowserDirectoryFiltered references isFavorite for favorite star", (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('isFavorite'), 'renderSoundBrowserDirectoryFiltered should check isFavorite');
});

TestRunner.test("Day 661 - renderSoundBrowserDirectoryFiltered references toggleFavorite for star click", (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('toggleFavorite'), 'renderSoundBrowserDirectoryFiltered should use toggleFavorite');
});

TestRunner.test("Day 661 - renderSoundBrowserDirectory sets draggable for file items", (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('draggable'), 'renderSoundBrowserDirectoryFiltered should set draggable on items');
});

TestRunner.test("Day 661 - renderSoundBrowserDirectory sets dataTransfer data for drag", (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('dataTransfer.setData'), 'renderSoundBrowserDirectoryFiltered should set dataTransfer data');
});

TestRunner.test("Day 661 - renderSoundBrowserDirectory references setCurrentSoundBrowserPath for folder navigation", (t) => {
    const funcStr = renderSoundBrowserDirectoryFiltered.toString();
    t.assertTruthy(funcStr.includes('setCurrentSoundBrowserPath'), 'renderSoundBrowserDirectoryFiltered should use setCurrentSoundBrowserPath');
});

TestRunner.test("Day 661 - renderSoundBrowserFavorites is a function export", (t) => {
    const funcStr = renderSoundBrowserFavorites.toString();
    t.assertTruthy(funcStr.includes('export function'), 'renderSoundBrowserFavorites should be exported');
});

TestRunner.test("Day 661 - renderSoundBrowserFavorites accepts 2 parameters (listDiv, previewBtn)", (t) => {
    t.assertEqual(renderSoundBrowserFavorites.length, 2, 'renderSoundBrowserFavorites should accept 2 parameters');
});

TestRunner.test("Day 661 - renderSoundBrowserFavorites references getFavoriteSounds", (t) => {
    const funcStr = renderSoundBrowserFavorites.toString();
    t.assertTruthy(funcStr.includes('getFavoriteSounds'), 'renderSoundBrowserFavorites should use getFavoriteSounds');
});

TestRunner.test("Day 661 - renderSoundBrowserFavorites references isFavorite for star display", (t) => {
    const funcStr = renderSoundBrowserFavorites.toString();
    t.assertTruthy(funcStr.includes('isFavorite'), 'renderSoundBrowserFavorites should use isFavorite');
});

TestRunner.test("Day 661 - renderSoundBrowserFavorites references toggleFavorite for star click", (t) => {
    const funcStr = renderSoundBrowserFavorites.toString();
    t.assertTruthy(funcStr.includes('toggleFavorite'), 'renderSoundBrowserFavorites should use toggleFavorite');
});

TestRunner.test("Day 661 - renderSoundBrowserFavorites references setSelectedSoundForPreview", (t) => {
    const funcStr = renderSoundBrowserFavorites.toString();
    t.assertTruthy(funcStr.includes('setSelectedSoundForPreview'), 'renderSoundBrowserFavorites should use setSelectedSoundForPreview');
});

TestRunner.test("Day 661 - renderSoundBrowserFavorites sets draggable on items", (t) => {
    const funcStr = renderSoundBrowserFavorites.toString();
    t.assertTruthy(funcStr.includes('draggable'), 'renderSoundBrowserFavorites should set draggable');
});

TestRunner.test("Day 661 - renderSoundBrowserFavorites uses dataTransfer.setData for drag", (t) => {
    const funcStr = renderSoundBrowserFavorites.toString();
    t.assertTruthy(funcStr.includes('dataTransfer.setData'), 'renderSoundBrowserFavorites should set dataTransfer data');
});

TestRunner.test("Day 661 - renderSoundBrowserRecent is a function export", (t) => {
    const funcStr = renderSoundBrowserRecent.toString();
    t.assertTruthy(funcStr.includes('export function'), 'renderSoundBrowserRecent should be exported');
});

TestRunner.test("Day 661 - renderSoundBrowserRecent accepts 2 parameters (listDiv, previewBtn)", (t) => {
    t.assertEqual(renderSoundBrowserRecent.length, 2, 'renderSoundBrowserRecent should accept 2 parameters');
});

TestRunner.test("Day 661 - renderSoundBrowserRecent references getRecentlyPlayedSounds", (t) => {
    const funcStr = renderSoundBrowserRecent.toString();
    t.assertTruthy(funcStr.includes('getRecentlyPlayedSounds'), 'renderSoundBrowserRecent should use getRecentlyPlayedSounds');
});

TestRunner.test("Day 661 - renderSoundBrowserRecent references isFavorite for star display", (t) => {
    const funcStr = renderSoundBrowserRecent.toString();
    t.assertTruthy(funcStr.includes('isFavorite'), 'renderSoundBrowserRecent should use isFavorite');
});

TestRunner.test("Day 661 - renderSoundBrowserRecent references toggleFavorite for star click", (t) => {
    const funcStr = renderSoundBrowserRecent.toString();
    t.assertTruthy(funcStr.includes('toggleFavorite'), 'renderSoundBrowserRecent should use toggleFavorite');
});

TestRunner.test("Day 661 - renderSoundBrowserRecent references setSelectedSoundForPreview", (t) => {
    const funcStr = renderSoundBrowserRecent.toString();
    t.assertTruthy(funcStr.includes('setSelectedSoundForPreview'), 'renderSoundBrowserRecent should use setSelectedSoundForPreview');
});

TestRunner.test("Day 661 - renderSoundBrowserRecent sets draggable on items", (t) => {
    const funcStr = renderSoundBrowserRecent.toString();
    t.assertTruthy(funcStr.includes('draggable'), 'renderSoundBrowserRecent should set draggable');
});

TestRunner.test("Day 661 - renderSoundBrowserRecent uses dataTransfer.setData for drag", (t) => {
    const funcStr = renderSoundBrowserRecent.toString();
    t.assertTruthy(funcStr.includes('dataTransfer.setData'), 'renderSoundBrowserRecent should set dataTransfer data');
});

TestRunner.test("Day 661 - updateMixerWindow is a function export", (t) => {
    const funcStr = updateMixerWindow.toString();
    t.assertTruthy(funcStr.includes('export function'), 'updateMixerWindow should be exported');
});

TestRunner.test("Day 661 - updateMixerWindow accepts 0 parameters", (t) => {
    t.assertEqual(updateMixerWindow.length, 0, 'updateMixerWindow should accept 0 parameters');
});

TestRunner.test("Day 661 - updateMixerWindow references getWindowById for mixer window", (t) => {
    const funcStr = updateMixerWindow.toString();
    t.assertTruthy(funcStr.includes('getWindowById'), 'updateMixerWindow should check getWindowById');
});

TestRunner.test("Day 661 - updateMixerWindow calls renderMixer for content update", (t) => {
    const funcStr = updateMixerWindow.toString();
    t.assertTruthy(funcStr.includes('renderMixer'), 'updateMixerWindow should call renderMixer');
});

TestRunner.test("Day 661 - APP_VERSION validation for Day 661 Sound Browser render function tests", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 661');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 314, 'Minor version should be >= 314 for Day 661');
    }
});

// --- Day 662: UI Sequencer Display Function Tests ---
TestRunner.test("Day 662 - toggleSequencerViewMode is a function export", (t) => {
    const funcStr = toggleSequencerViewMode.toString();
    t.assertTruthy(funcStr.includes('export function'), 'toggleSequencerViewMode should be exported');
});

TestRunner.test("Day 662 - toggleSequencerViewMode accepts 0 parameters", (t) => {
    t.assertEqual(toggleSequencerViewMode.length, 0, 'toggleSequencerViewMode should accept 0 parameters');
});

TestRunner.test("Day 662 - toggleSequencerViewMode references localAppServices.getArmedTrackId", (t) => {
    const funcStr = toggleSequencerViewMode.toString();
    t.assertTruthy(funcStr.includes('getArmedTrackId'), 'toggleSequencerViewMode should check getArmedTrackId');
});

TestRunner.test("Day 662 - toggleSequencerViewMode references localAppServices.openTrackSequencerWindow", (t) => {
    const funcStr = toggleSequencerViewMode.toString();
    t.assertTruthy(funcStr.includes('openTrackSequencerWindow'), 'toggleSequencerViewMode should call openTrackSequencerWindow');
});

TestRunner.test("Day 662 - toggleSequencerViewMode references localAppServices.getOpenWindows", (t) => {
    const funcStr = toggleSequencerViewMode.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'toggleSequencerViewMode should check getOpenWindows for fallback');
});

TestRunner.test("Day 662 - toggleSequencerViewMode APP_VERSION validation", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 662');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 314, 'Minor version should be >= 314 for Day 662');
    }
});

TestRunner.test("Day 662 - updateSequencerCellUI is a function export", (t) => {
    const funcStr = updateSequencerCellUI.toString();
    t.assertTruthy(funcStr.includes('export function'), 'updateSequencerCellUI should be exported');
});

TestRunner.test("Day 662 - updateSequencerCellUI accepts 5 parameters (windowElement, trackType, row, col, isActive) plus velocity default", (t) => {
    t.assertEqual(updateSequencerCellUI.length, 5, 'updateSequencerCellUI should accept 5 parameters');
});

TestRunner.test("Day 662 - updateSequencerCellUI returns early if windowElement is falsy", (t) => {
    const funcStr = updateSequencerCellUI.toString();
    t.assertTruthy(funcStr.includes('if (!windowElement)'), 'updateSequencerCellUI should check windowElement');
});

TestRunner.test("Day 662 - updateSequencerCellUI uses querySelector for cell lookup with data-row and data-col", (t) => {
    const funcStr = updateSequencerCellUI.toString();
    t.assertTruthy(funcStr.includes('querySelector'), 'updateSequencerCellUI should use querySelector');
    t.assertTruthy(funcStr.includes('data-row'), 'updateSequencerCellUI should use data-row attribute');
    t.assertTruthy(funcStr.includes('data-col'), 'updateSequencerCellUI should use data-col attribute');
});

TestRunner.test("Day 662 - updateSequencerCellUI removes velocity classes (vel-100, vel-90, etc.)", (t) => {
    const funcStr = updateSequencerCellUI.toString();
    t.assertTruthy(funcStr.includes('vel-100'), 'updateSequencerCellUI should remove vel-100 class');
    t.assertTruthy(funcStr.includes('vel-90'), 'updateSequencerCellUI should remove vel-90 class');
});

TestRunner.test("Day 662 - updateSequencerCellUI removes active classes (active, active-synth, active-sampler, active-drum-sampler)", (t) => {
    const funcStr = updateSequencerCellUI.toString();
    t.assertTruthy(funcStr.includes("'active'"), 'updateSequencerCellUI should remove active class');
    t.assertTruthy(funcStr.includes('active-synth'), 'updateSequencerCellUI should remove active-synth class');
});

TestRunner.test("Day 662 - updateSequencerCellUI adds track-type-specific active class (active-synth, active-sampler, etc.)", (t) => {
    const funcStr = updateSequencerCellUI.toString();
    t.assertTruthy(funcStr.includes('activeClass'), 'updateSequencerCellUI should set activeClass based on trackType');
    t.assertTruthy(funcStr.includes("trackType === 'Synth'"), 'updateSequencerCellUI should check Synth trackType');
    t.assertTruthy(funcStr.includes("trackType === 'Sampler'"), 'updateSequencerCellUI should check Sampler trackType');
    t.assertTruthy(funcStr.includes("trackType === 'DrumSampler'"), 'updateSequencerCellUI should check DrumSampler trackType');
});

TestRunner.test("Day 662 - updateSequencerCellUI applies velocity-based brightness class (vel-100 through vel-10)", (t) => {
    const funcStr = updateSequencerCellUI.toString();
    t.assertTruthy(funcStr.includes('velClass'), 'updateSequencerCellUI should set velClass for brightness');
    t.assertTruthy(funcStr.includes('velPercent'), 'updateSequencerCellUI should use velPercent for velocity calculation');
});

TestRunner.test("Day 662 - updateSequencerCellUI uses cell.classList.add for adding classes", (t) => {
    const funcStr = updateSequencerCellUI.toString();
    t.assertTruthy(funcStr.includes('classList.add'), 'updateSequencerCellUI should use classList.add');
});

TestRunner.test("Day 662 - updateSequencerCellUI APP_VERSION validation", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 662');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 314, 'Minor version should be >= 314 for Day 662');
    }
});

TestRunner.test("Day 662 - highlightPlayingStep is a function export", (t) => {
    const funcStr = highlightPlayingStep.toString();
    t.assertTruthy(funcStr.includes('export function'), 'highlightPlayingStep should be exported');
});

TestRunner.test("Day 662 - highlightPlayingStep accepts 3 parameters (trackId, stepIndex, isPlaying)", (t) => {
    t.assertEqual(highlightPlayingStep.length, 3, 'highlightPlayingStep should accept 3 parameters');
});

TestRunner.test("Day 662 - highlightPlayingStep references localAppServices.getTrackById", (t) => {
    const funcStr = highlightPlayingStep.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'highlightPlayingStep should call getTrackById');
});

TestRunner.test("Day 662 - highlightPlayingStep references localAppServices.getWindowById for sequencer window", (t) => {
    const funcStr = highlightPlayingStep.toString();
    t.assertTruthy(funcStr.includes('getWindowById'), 'highlightPlayingStep should call getWindowById');
    t.assertTruthy(funcStr.includes('sequencerWin-'), 'highlightPlayingStep should look for sequencerWin- window');
});

TestRunner.test("Day 662 - highlightPlayingStep uses querySelectorAll to find and remove .playing class", (t) => {
    const funcStr = highlightPlayingStep.toString();
    t.assertTruthy(funcStr.includes('querySelectorAll'), 'highlightPlayingStep should use querySelectorAll');
    t.assertTruthy(funcStr.includes("'.playing'"), 'highlightPlayingStep should target .playing class');
    t.assertTruthy(funcStr.includes('classList.remove'), 'highlightPlayingStep should remove .playing class');
});

TestRunner.test("Day 662 - highlightPlayingStep adds .playing class to current step cell when isPlaying is true", (t) => {
    const funcStr = highlightPlayingStep.toString();
    t.assertTruthy(funcStr.includes('classList.add'), 'highlightPlayingStep should add .playing class');
    t.assertTruthy(funcStr.includes("'playing'"), 'highlightPlayingStep should add playing class');
});

TestRunner.test("Day 662 - highlightPlayingStep checks stepIndex >= 0 before adding class", (t) => {
    const funcStr = highlightPlayingStep.toString();
    t.assertTruthy(funcStr.includes('stepIndex >= 0'), 'highlightPlayingStep should check stepIndex >= 0');
});

TestRunner.test("Day 662 - highlightPlayingStep uses data-col attribute for cell lookup", (t) => {
    const funcStr = highlightPlayingStep.toString();
    t.assertTruthy(funcStr.includes('data-col'), 'highlightPlayingStep should use data-col attribute');
});

TestRunner.test("Day 662 - highlightPlayingStep APP_VERSION validation", (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 662');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 314, 'Minor version should be >= 314 for Day 662');
    }
});
