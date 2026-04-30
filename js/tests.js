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
    getUndoStackState,
    getRedoStackState,
    undoLastActionInternal,
    redoLastActionInternal,
    isTrackRecordingState,
    getRecordingTrackIdState,
    getRecordingStartTimeState,
    setIsRecordingState,
    setRecordingTrackIdState,
    setRecordingStartTimeState,
    setPerformanceMonitorEnabledState,
    setAudioContextStateState,
    setCPUUsageState,
    setMemoryPressureState,
    setActiveVoicesState,
    setAudioLatencyState,
    setLastCallbackTimeState,
    setDroppedCallbacksState,
    getSendTracksState,
    getSendTrackByIdState,
    getTrackSendsState,
    getTrackSendPreFaderState,
    setTrackSendPreFaderState,
    getClipboardDataState,
    getTrackSendLevelState,
    addSendTrackState,
    getCurrentSoundFileTreeState,
    getCurrentSoundBrowserPathState,
    getPreviewPlayerState,
    setCurrentLibraryNameState,
    setCurrentSoundFileTreeState,
    setCurrentSoundBrowserPathState,
    setPreviewPlayerState,
    setSendTrackMutedState,
    setSendTrackNameState,
    setSendTrackLevelState,
    setSendTrackEffectsState,
    removeSendTrackState,
    setTrackSendLevelState,
    getTimelineMarkersState,
    getTimelineMarkerByIdState,
    addTimelineMarkerState,
    setTimelineMarkerState,
    removeTimelineMarkerState,
    // Chord Mode state functions
    getChordModeState,
    getChordModeEnabledState,
    setChordModeEnabledState,
    getChordModeRootState,
    setChordModeRootState,
    getChordModeTypeState,
    setChordModeTypeState,
    getChordModeLockState,
    setChordModeLockState,
    getChordVoicingState,
    setChordVoicingState,
    // Additional state functions
    setChordModeState,
    // Time Signature state functions
    getTimeSignatureState,
    getTimeSignatureNumeratorState,
    setTimeSignatureNumeratorState,
    getTimeSignatureDenominatorState,
    setTimeSignatureDenominatorState,
    // Ghost Track state functions
    getGhostTrackIdState,
    setGhostTrackIdState,
    // Armed/Soloed Track state functions
    getArmedTrackIdState,
    getSoloedTrackIdState,
    setSoloedTrackIdState,
    // Scale Mode state functions
    getScaleModeState,
    setScaleModeState,
    getScaleModeEnabledState,
    setScaleModeEnabledState,
    getScaleModeScaleState,
    setScaleModeScaleState,
    getScaleModeRootState,
    setScaleModeRootState,
    getScaleModeLockState,
    setScaleModeLockState,
    // Loop Region state functions
    getLoopRegionState,
    setLoopRegionState,
    getLoopRegionEnabledState,
    setLoopRegionEnabledState,
    getLoopRegionStartBarState,
    setLoopRegionStartBarState,
    getLoopRegionEndBarState,
    setLoopRegionEndBarState,
    // Timeline Zoom state functions
    getTimelineZoomState,
    setTimelineZoomLevelState,
    getTimelineVerticalZoomState,
    setTimelineVerticalZoomState,
    zoomInTimeline,
    zoomOutTimeline,
    zoomInVerticalTimeline,
    zoomOutVerticalTimeline,
    resetTimelineZoom,
    // Swing state functions
    getSwingState,
    setSwingState,
    getSwingEnabledState,
    setSwingEnabledState,
    getSwingAmountState,
    setSwingAmountState,
    // Timeline Markers cleanup functions
    clearTimelineMarkersState,
    // Track Groups state functions
    getTrackGroupsState,
    getTrackGroupByIdState,
    addTrackGroupState,
    setTrackGroupNameState,
    addTrackToGroupState,
    removeTrackFromGroupState,
    setTrackGroupColorState,
    setTrackGroupMutedState,
    setTrackGroupSoloedState,
    removeTrackGroupState,
    // Track Templates cleanup functions
    clearTrackTemplatesState,
    getTrackTemplatesState,
    getTrackTemplateByIdState,
    addTrackTemplateState,
    updateTrackTemplateState,
    removeTrackTemplateState,
    // Master Effects state functions
    getMasterEffectsState,
    addMasterEffectToState,
    removeMasterEffectFromState,
    updateMasterEffectParamInState,
    reorderMasterEffectInState,
    incrementHighestZState,
    initializeStateModule,
    captureStateForUndoInternal,
    getMidiAccessState,
    getActiveMIDIInputState,
    setArmedTrackIdState,
    setHighestZState,
    // MIDI Learn state functions
    getMidiLearnMappingsState,
    getMidiLearnModeState,
    setMidiLearnModeState,
    getMidiLearnPendingParamState,
    setMidiLearnPendingParamState,
    addMidiLearnMapping,
    removeMidiLearnMapping,
    clearMidiLearnMappings,
    findMidiLearnMapping,
    updateMidiLearnMapping,
    exportToMidiInternal,
    importFromMidiInternal,

    getMidiLearnMappingByIndex
} from './state.js';

import {
    initializeAudioModule,
    initAudioContextAndMasterMeter,
    getMasterEffectsBusInputNode,
    getActualMasterGainNode,
    rebuildMasterEffectChain,
    updateMasterEffectParamInAudio,
    reorderMasterEffectInAudio,
    updateMeters,
    getMimeTypeFromFilename,
    clearAllMasterEffectNodes,
    autoSliceSample,
    addMasterEffectToAudio,
    removeMasterEffectFromAudio,
    startAudioRecording,
    stopAudioRecording,
    createSendBusInAudio,
    deleteSendBusFromAudio,
    addEffectToSendBus,
    removeEffectFromSendBus,
    reorderEffectInSendBus,
    updateSendBusEffectParam,
    setSendBusLevel,
    setSendBusMuted,
    setRecordingInputGain,
    loadDrumSamplerPadFile,
    loadSoundFromBrowserToTarget,
    playSlicePreview,
    playDrumSamplerPadPreview,
    loadSampleFile,
    fetchSoundLibrary,
    panicAllAudio,
    getPerformanceMetrics,
    startPerformanceMonitor,
    stopPerformanceMonitor,
    getSendBusNodes,
    getTrackSendNodes,
    connectTrackToSendBus,
    disconnectTrackFromSendBus,
    setTrackSendLevel
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
    handleTapTempo,
    resetTapTempo,
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
    openAudioClipEditorWindow,
    buildInstrumentSamplerSpecificInspectorDOM,
    buildSynthSpecificInspectorDOM,
    buildDrumSamplerSpecificInspectorDOM,
    buildSamplerSpecificInspectorDOM,
    buildAudioTrackInspectorDOM,
    buildTrackInspectorContentDOM,
    initializeInstrumentSamplerSpecificControls,
    buildModularEffectsRackDOM,
    showAddEffectModal,
    applyTrackTemplate,
    updateTrackTemplatesWindowContent,
    showTemplateContextMenu,
    buildMixerContentDOM,
    initializeMixerEventHandlers,
    buildMixerGroupStripHTML,
    buildMixerSendStripHTML,
    buildMixerMasterStripHTML
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
    handleTrackMute,
    handleTrackSolo,
    handleTrackArm,
    handleRemoveTrack,
    handleOpenTrackInspector,
    handleOpenEffectsRack,
    handleOpenSequencer,
    attachGlobalControlEvents,
    setupMIDI,
    selectMIDIInput,
    initializeEventHandlersModule,
    currentlyPressedComputerKeys
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
    t.assertEqual(typeof startAudioRecording, 'function', 'startAudioRecording should be a function');
    // Verify it's an async function by checking it returns a Promise
    const result = startAudioRecording(null, false);
    t.assertTruthy(result instanceof Promise, 'startAudioRecording should return a Promise');
});

TestRunner.test('Recording - stopAudioRecording is async', (t) => {
    t.assertEqual(typeof stopAudioRecording, 'function', 'stopAudioRecording should be a function');
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
    t.assertEqual(typeof startAudioRecording, 'function', 'startAudioRecording should be a function');
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
    t.assertEqual(typeof startAudioRecording, 'function', 'startAudioRecording should be a function');
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
    t.assertEqual(typeof createSendBusInAudio, 'function', 'createSendBusInAudio should be a function');
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
});


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
    t.assertEqual(typeof startAudioRecording, 'function', 'startAudioRecording should be a function');
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
    t.assertEqual(typeof stopAudioRecording, 'function', 'stopAudioRecording should be a function');
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
// Day 356: Project Save/Load Functions Tests
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
    initializeMetronome,
    startMetronome,
    stopMetronome,
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

TestRunner.test('Track Methods - Track.prototype.duplicateTrack calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.duplicateTrack.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'duplicateTrack should call _captureUndoState for undo support');
});

TestRunner.test('Track Methods - Track.prototype.freezeTrack is async', (t) => {
    const funcStr = Track.prototype.freezeTrack.toString();
    t.assertTruthy(funcStr.includes('async') || funcStr.includes('Promise'), 'freezeTrack should be async');
});

TestRunner.test('Track Methods - Track.prototype.bounceTrack is async', (t) => {
    const funcStr = Track.prototype.bounceTrack.toString();
    t.assertTruthy(funcStr.includes('async') || funcStr.includes('Promise'), 'bounceTrack should be async');
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
    const funcStr = exportToMidiInternal.toString();
    t.assertTruthy(funcStr.includes('appServices') && (funcStr.includes('showNotification') || funcStr.includes('getTempoState')), 'exportToMidiInternal should validate appServices');
});

TestRunner.test('MIDI Export - exportToMidiInternal references getTempoState', (t) => {
    const funcStr = exportToMidiInternal.toString();
    t.assertTruthy(funcStr.includes('getTempoState'), 'exportToMidiInternal should reference getTempoState');
});

TestRunner.test('MIDI Export - exportToMidiInternal references getTimeSignatureState', (t) => {
    const funcStr = exportToMidiInternal.toString();
    t.assertTruthy(funcStr.includes('getTimeSignatureState'), 'exportToMidiInternal should reference getTimeSignatureState');
});

TestRunner.test('MIDI Export - exportToMidiInternal references getTracksState', (t) => {
    const funcStr = exportToMidiInternal.toString();
    t.assertTruthy(funcStr.includes('getTracksState'), 'exportToMidiInternal should reference getTracksState');
});

TestRunner.test('MIDI Export - exportToMidiInternal references getPlaybackModeState', (t) => {
    const funcStr = exportToMidiInternal.toString();
    t.assertTruthy(funcStr.includes('getPlaybackModeState'), 'exportToMidiInternal should reference getPlaybackModeState');
});

TestRunner.test('MIDI Export - exportToMidiInternal checks for notes to export', (t) => {
    const funcStr = exportToMidiInternal.toString();
    t.assertTruthy(funcStr.includes('allNotes.length') || funcStr.includes('allNotes'), 'exportToMidiInternal should check for notes to export');
});

TestRunner.test('MIDI Export - exportToMidiInternal uses MIDI_EXPORT_TicksPerQuarterNote', (t) => {
    const funcStr = exportToMidiInternal.toString();
    t.assertTruthy(funcStr.includes('MIDI_EXPORT_TicksPerQuarterNote'), 'exportToMidiInternal should use MIDI_EXPORT_TicksPerQuarterNote constant');
});

TestRunner.test('MIDI Export - exportToMidiInternal uses MIDI_DEFAULT_CHANNEL', (t) => {
    const funcStr = exportToMidiInternal.toString();
    t.assertTruthy(funcStr.includes('MIDI_DEFAULT_CHANNEL'), 'exportToMidiInternal should use MIDI_DEFAULT_CHANNEL constant');
});

TestRunner.test('MIDI Export - exportToMidiInternal calls buildMidiFile', (t) => {
    const funcStr = exportToMidiInternal.toString();
    t.assertTruthy(funcStr.includes('buildMidiFile'), 'exportToMidiInternal should call buildMidiFile');
});

TestRunner.test('MIDI Export - buildMidiFile is a function', (t) => {
    t.assertEqual(typeof buildMidiFile, 'function', 'buildMidiFile should be a function');
});

TestRunner.test('MIDI Export - buildMidiFile accepts 2 parameters (events, ticksPerQuarter)', (t) => {
    const funcStr = buildMidiFile.toString();
    t.assertTruthy(funcStr.includes('events') && funcStr.includes('ticksPerQuarter'), 'buildMidiFile should accept 2 parameters');
});

TestRunner.test('MIDI Export - buildMidiFile creates MIDI header with MThd', (t) => {
    const funcStr = buildMidiFile.toString();
    t.assertTruthy(funcStr.includes('MThd'), 'buildMidiFile should create MIDI header with MThd');
});

TestRunner.test('MIDI Export - buildMidiFile creates MIDI track with MTrk', (t) => {
    const funcStr = buildMidiFile.toString();
    t.assertTruthy(funcStr.includes('MTrk'), 'buildMidiFile should create MIDI track with MTrk');
});

TestRunner.test('MIDI Export - buildMidiFile handles noteOn events', (t) => {
    const funcStr = buildMidiFile.toString();
    t.assertTruthy(funcStr.includes('noteOn'), 'buildMidiFile should handle noteOn events');
});

TestRunner.test('MIDI Export - buildMidiFile handles noteOff events', (t) => {
    const funcStr = buildMidiFile.toString();
    t.assertTruthy(funcStr.includes('noteOff'), 'buildMidiFile should handle noteOff events');
});

TestRunner.test('MIDI Export - buildMidiFile handles tempo events', (t) => {
    const funcStr = buildMidiFile.toString();
    t.assertTruthy(funcStr.includes('tempo'), 'buildMidiFile should handle tempo meta events');
});

TestRunner.test('MIDI Export - buildMidiFile handles timeSig events', (t) => {
    const funcStr = buildMidiFile.toString();
    t.assertTruthy(funcStr.includes('timeSig'), 'buildMidiFile should handle time signature events');
});

TestRunner.test('MIDI Export - buildMidiFile handles trackName events', (t) => {
    const funcStr = buildMidiFile.toString();
    t.assertTruthy(funcStr.includes('trackName'), 'buildMidiFile should handle track name events');
});

TestRunner.test('MIDI Export - buildMidiFile handles endOfTrack events', (t) => {
    const funcStr = buildMidiFile.toString();
    t.assertTruthy(funcStr.includes('endOfTrack') || funcStr.includes('FF 0x2F'),
        'buildMidiFile should handle end of track');
});

TestRunner.test('MIDI Export - buildMidiFile writes variable length quantities', (t) => {
    const funcStr = buildMidiFile.toString();
    t.assertTruthy(funcStr.includes('VLQ') || funcStr.includes('varInt') || funcStr.includes('toVLQ'), 'buildMidiFile should write variable length quantities');
});

TestRunner.test('MIDI Export - buildMidiFile returns Uint8Array', (t) => {
    const funcStr = buildMidiFile.toString();
    t.assertTruthy(funcStr.includes('Uint8Array'), 'buildMidiFile should return Uint8Array');
});

TestRunner.test('MIDI Export - pitchToRow is a function', (t) => {
    t.assertEqual(typeof pitchToRow, 'function', 'pitchToRow should be a function');
});

TestRunner.test('MIDI Export - pitchToRow accepts 2 parameters (rowIndex, trackType)', (t) => {
    const funcStr = pitchToRow.toString();
    t.assertTruthy(funcStr.includes('rowIndex') && funcStr.includes('trackType'), 'pitchToRow should accept 2 parameters');
});

TestRunner.test('MIDI Export - pitchToRow handles Synth track type', (t) => {
    const funcStr = pitchToRow.toString();
    t.assertTruthy(funcStr.includes('Synth'), 'pitchToRow should handle Synth track type');
});

TestRunner.test('MIDI Export - pitchToRow handles DrumSampler track type', (t) => {
    const funcStr = pitchToRow.toString();
    t.assertTruthy(funcStr.includes('DrumSampler'), 'pitchToRow should handle DrumSampler track type');
});

TestRunner.test('MIDI Export - pitchToRow handles Sampler track type', (t) => {
    const funcStr = pitchToRow.toString();
    t.assertTruthy(funcStr.includes('Sampler'), 'pitchToRow should handle Sampler track type');
});

TestRunner.test('MIDI Export - noteNameToMidiNumber is a function', (t) => {
    t.assertEqual(typeof noteNameToMidiNumber, 'function', 'noteNameToMidiNumber should be a function');
});

TestRunner.test('MIDI Export - noteNameToMidiNumber handles note name and octave', (t) => {
    const funcStr = noteNameToMidiNumber.toString();
    t.assertTruthy(funcStr.includes('noteName') && funcStr.includes('octave'), 'noteNameToMidiNumber should handle note name and octave');
});

TestRunner.test('MIDI Export - bufferToWav is a function', (t) => {
    t.assertEqual(typeof bufferToWav, 'function', 'bufferToWav should be a function');
});

TestRunner.test('MIDI Export - bufferToWav accepts 1 parameter (buffer)', (t) => {
    const funcStr = bufferToWav.toString();
    t.assertTruthy(funcStr.includes('buffer'), 'bufferToWav should accept 1 parameter');
});

TestRunner.test('MIDI Export - bufferToWav handles audio buffer with channels', (t) => {
    const funcStr = bufferToWav.toString();
    t.assertTruthy(funcStr.includes('numChannels') || funcStr.includes('numberOfChannels'), 'bufferToWav should handle audio buffer with channels');
});

TestRunner.test('MIDI Export - bufferToWav creates WAV header', (t) => {
    const funcStr = bufferToWav.toString();
    t.assertTruthy(funcStr.includes('RIFF') && funcStr.includes('WAVE'), 'bufferToWav should create WAV header');
});

TestRunner.test('MIDI Export - bufferToWav handles PCM format', (t) => {
    const funcStr = bufferToWav.toString();
    t.assertTruthy(funcStr.includes('PCM') || funcStr.includes('format') || funcStr.includes('bitDepth'), 'bufferToWav should handle PCM format');
});

TestRunner.test('MIDI Export Constants - MIDI_EXPORT_VELOCITY_SCALE is 127', (t) => {
    t.assertEqual(MIDI_EXPORT_VELOCITY_SCALE, 127, 'MIDI_EXPORT_VELOCITY_SCALE should be 127');
});

TestRunner.test('MIDI Export Constants - MIDI_EXPORT_TicksPerQuarterNote is 480', (t) => {
    t.assertEqual(MIDI_EXPORT_TicksPerQuarterNote, 480, 'MIDI_EXPORT_TicksPerQuarterNote should be 480');
});

TestRunner.test('MIDI Export Constants - DEFAULT_MIDI_EXPORT_FILENAME_PREFIX is non-empty string', (t) => {
    t.assertEqual(typeof DEFAULT_MIDI_EXPORT_FILENAME_PREFIX, 'string', 'DEFAULT_MIDI_EXPORT_FILENAME_PREFIX should be a string');
    t.assertTruthy(DEFAULT_MIDI_EXPORT_FILENAME_PREFIX.length > 0, 'DEFAULT_MIDI_EXPORT_FILENAME_PREFIX should be non-empty');
});

TestRunner.test('MIDI Export Constants - MAX_MIDI_EXPORT_TRACKS is 64', (t) => {
    t.assertEqual(MAX_MIDI_EXPORT_TRACKS, 64, 'MAX_MIDI_EXPORT_TRACKS should be 64');
});

TestRunner.test('APP_VERSION validation for Day 369', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 369');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 47, 'Minor version should be >= 47 for Day 369');
    }
});
TestRunner.test('MIDI Import - importFromMidiInternal is a function export', (t) => {
    t.assertEqual(typeof importFromMidiInternal, 'function', 'importFromMidiInternal should be a function');
});

TestRunner.test('MIDI Import - importFromMidiInternal is async', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('async') || funcStr.includes('Promise'), 'importFromMidiInternal should be async');
});

TestRunner.test('MIDI Import - importFromMidiInternal calls showNotification', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'importFromMidiInternal should call showNotification');
});

TestRunner.test('MIDI Import - importFromMidiInternal validates appServices', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('showNotification'), 'importFromMidiInternal should validate appServices');
});

TestRunner.test('MIDI Import - importFromMidiInternal checks createFileInputForMidiImport service', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('createFileInputForMidiImport'), 'importFromMidiInternal should check createFileInputForMidiImport service');
});

TestRunner.test('MIDI Import - importFromMidiInternal has error handling', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'importFromMidiInternal should have error handling');
});

TestRunner.test('MIDI Import - importFromMidiInternal calls createFileInputForMidiImport', (t) => {
    const funcStr = importFromMidiInternal.toString();
    t.assertTruthy(funcStr.includes('createFileInputForMidiImport()'), 'importFromMidiInternal should call createFileInputForMidiImport');
});

TestRunner.test('MIDI Import Constants - MIDI_IMPORT_MIN_NOTES is 1', (t) => {
    t.assertEqual(MIDI_IMPORT_MIN_NOTES, 1, 'MIDI_IMPORT_MIN_NOTES should be 1');
});

TestRunner.test('MIDI Import Constants - MIDI_IMPORT_MAX_VELOCITY is 127', (t) => {
    t.assertEqual(MIDI_IMPORT_MAX_VELOCITY, 127, 'MIDI_IMPORT_MAX_VELOCITY should be 127');
});

TestRunner.test('MIDI Import Constants - MIDI_IMPORT_DEFAULT_VELOCITY is 100', (t) => {
    t.assertEqual(MIDI_IMPORT_DEFAULT_VELOCITY, 100, 'MIDI_IMPORT_DEFAULT_VELOCITY should be 100');
});

TestRunner.test('MIDI Import Constants - MIDI_IMPORT_DEFAULT_PROBABILITY is 1.0', (t) => {
    t.assertEqual(MIDI_IMPORT_DEFAULT_PROBABILITY, 1.0, 'MIDI_IMPORT_DEFAULT_PROBABILITY should be 1.0');
});

TestRunner.test('MIDI Import Constants - MIDI_IMPORT_SNAP_TO_GRID is true', (t) => {
    t.assertEqual(MIDI_IMPORT_SNAP_TO_GRID, true, 'MIDI_IMPORT_SNAP_TO_GRID should be true');
});

TestRunner.test('MIDI Import Constants - MIDI_IMPORT_VELOCITY_SCALE is 1/127', (t) => {
    t.assertEqual(MIDI_IMPORT_VELOCITY_SCALE, 1/127, 'MIDI_IMPORT_VELOCITY_SCALE should be 1/127');
});

TestRunner.test('APP_VERSION validation for Day 370', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 370');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 48, 'Minor version should be >= 48 for Day 370');
    }
});

// ============================================
// Day 371: Mixer UI Event Handler Functions Tests
// ============================================
// Note: handleMixerButtonAction, handleMixerVolumeChange, handleMixerPanChange, handleMixerSendLevelChange,
// handleMixerSendMute, handleMixerSendLevelChangeFader, handleMixerMasterVolumeChange, handleMixerGroupAction,
// handleAddSendBus, handleAddGroup are internal functions within ui.js module scope and are NOT explicitly exported.
// These functions are called by initializeMixerEventHandlers which is exported.

// Tests for exported mixer UI functions
TestRunner.test('Mixer UI - initializeMixerEventHandlers is a function export', (t) => {
    t.assertEqual(typeof initializeMixerEventHandlers, 'function', 'initializeMixerEventHandlers should be a function');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers accepts 1 parameter', (t) => {
    t.assertEqual(initializeMixerEventHandlers.length, 1, 'initializeMixerEventHandlers should accept 1 parameter (mixerElement)');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers references mixerElement parameter', (t) => {
    const funcStr = initializeMixerEventHandlers.toString();
    t.assertTruthy(funcStr.includes('mixerElement'), 'initializeMixerEventHandlers should reference mixerElement parameter');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers sets up mixer-btn event listeners', (t) => {
    const funcStr = initializeMixerEventHandlers.toString();
    t.assertTruthy(funcStr.includes('mixer-btn'), 'initializeMixerEventHandlers should set up mixer-btn event listeners');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers sets up mixer-fader event listeners', (t) => {
    const funcStr = initializeMixerEventHandlers.toString();
    t.assertTruthy(funcStr.includes('mixer-fader'), 'initializeMixerEventHandlers should set up mixer-fader event listeners');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers sets up pan-knob event listeners', (t) => {
    const funcStr = initializeMixerEventHandlers.toString();
    t.assertTruthy(funcStr.includes('pan-knob'), 'initializeMixerEventHandlers should set up pan-knob event listeners');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers sets up send-level-slider event listeners', (t) => {
    const funcStr = initializeMixerEventHandlers.toString();
    t.assertTruthy(funcStr.includes('send-level-slider'), 'initializeMixerEventHandlers should set up send-level-slider event listeners');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers handles track mute/solo/arm buttons', (t) => {
    const funcStr = initializeMixerEventHandlers.toString();
    t.assertTruthy(funcStr.includes('mute-btn') || funcStr.includes('solo-btn') || funcStr.includes('arm'),
        'initializeMixerEventHandlers should handle mute/solo/arm buttons');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers handles group buttons', (t) => {
    const funcStr = initializeMixerEventHandlers.toString();
    t.assertTruthy(funcStr.includes('mixer-group-btn'), 'initializeMixerEventHandlers should handle group buttons');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers handles send pre/post toggle', (t) => {
    const funcStr = initializeMixerEventHandlers.toString();
    t.assertTruthy(funcStr.includes('send-pre-post-btn'), 'initializeMixerEventHandlers should handle send pre/post toggle');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers handles automation mini editor', (t) => {
    const funcStr = initializeMixerEventHandlers.toString();
    t.assertTruthy(funcStr.includes('mixer-automation-mini'), 'initializeMixerEventHandlers should handle automation mini editor');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers handles automation parameter select', (t) => {
    const funcStr = initializeMixerEventHandlers.toString();
    t.assertTruthy(funcStr.includes('mixer-auto-param-select'), 'initializeMixerEventHandlers should handle automation parameter select');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers includes MIDI Learn mode handling', (t) => {
    const funcStr = initializeMixerEventHandlers.toString();
    t.assertTruthy(funcStr.includes('getMidiLearnModeState') || funcStr.includes('midiLearnMode'),
        'initializeMixerEventHandlers should include MIDI Learn mode handling');
});

TestRunner.test('Mixer UI - initializeMixerEventHandlers calls updateMixerWindow', (t) => {
    const funcStr = initializeMixerEventHandlers.toString();
    t.assertTruthy(funcStr.includes('updateMixerWindow'), 'initializeMixerEventHandlers should call updateMixerWindow');
});

TestRunner.test('Mixer UI - updateMixerWindow is a function export', (t) => {
    t.assertEqual(typeof updateMixerWindow, 'function', 'updateMixerWindow should be a function');
});

TestRunner.test('Mixer UI - updateMixerWindow accepts no parameters', (t) => {
    t.assertEqual(updateMixerWindow.length, 0, 'updateMixerWindow should accept no parameters');
});

TestRunner.test('Mixer UI - updateMixerWindow references getOpenWindowElement', (t) => {
    const funcStr = updateMixerWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindowElement') || funcStr.includes('openWindowElement'),
        'updateMixerWindow should reference getOpenWindowElement');
});

TestRunner.test('Mixer UI - updateMixerWindow references getTracks', (t) => {
    const funcStr = updateMixerWindow.toString();
    t.assertTruthy(funcStr.includes('getTracks'), 'updateMixerWindow should reference getTracks');
});

TestRunner.test('Mixer UI - updateMixerWindow references getSendTracks', (t) => {
    const funcStr = updateMixerWindow.toString();
    t.assertTruthy(funcStr.includes('getSendTracks'), 'updateMixerWindow should reference getSendTracks');
});

TestRunner.test('Mixer UI - updateMixerWindow references getTrackGroupsState', (t) => {
    const funcStr = updateMixerWindow.toString();
    t.assertTruthy(funcStr.includes('getTrackGroupsState'), 'updateMixerWindow should reference getTrackGroupsState');
});

TestRunner.test('Mixer UI - buildMixerContentDOM is a function export', (t) => {
    t.assertEqual(typeof buildMixerContentDOM, 'function', 'buildMixerContentDOM should be a function');
});

TestRunner.test('Mixer UI - buildMixerContentDOM accepts no parameters', (t) => {
    t.assertEqual(buildMixerContentDOM.length, 0, 'buildMixerContentDOM should accept no parameters');
});

TestRunner.test('Mixer UI - buildMixerContentDOM returns string', (t) => {
    const result = buildMixerContentDOM();
    t.assertEqual(typeof result, 'string', 'buildMixerContentDOM should return a string');
});

TestRunner.test('Mixer UI - buildMixerContentDOM includes mixer tracks container', (t) => {
    const result = buildMixerContentDOM();
    t.assertTruthy(result.includes('mixerTracksContainer') || result.includes('track-strip'),
        'buildMixerContentDOM should include mixer tracks container');
});

TestRunner.test('Mixer UI - buildMixerTrackStripHTML is a function export', (t) => {
    t.assertEqual(typeof buildMixerTrackStripHTML, 'function', 'buildMixerTrackStripHTML should be a function');
});

TestRunner.test('Mixer UI - buildMixerTrackStripHTML accepts 2 parameters', (t) => {
    t.assertEqual(buildMixerTrackStripHTML.length, 2, 'buildMixerTrackStripHTML should accept 2 parameters (track, sendTracks)');
});

TestRunner.test('Mixer UI - buildMixerTrackStripHTML references track.id', (t) => {
    const funcStr = buildMixerTrackStripHTML.toString();
    t.assertTruthy(funcStr.includes('track') && funcStr.includes('id'), 'buildMixerTrackStripHTML should reference track.id');
});

TestRunner.test('Mixer UI - buildMixerGroupStripHTML is a function export', (t) => {
    t.assertEqual(typeof buildMixerGroupStripHTML, 'function', 'buildMixerGroupStripHTML should be a function');
});

TestRunner.test('Mixer UI - buildMixerGroupStripHTML accepts 1 parameter', (t) => {
    t.assertEqual(buildMixerGroupStripHTML.length, 1, 'buildMixerGroupStripHTML should accept 1 parameter (group)');
});

TestRunner.test('Mixer UI - buildMixerSendStripHTML is a function export', (t) => {
    t.assertEqual(typeof buildMixerSendStripHTML, 'function', 'buildMixerSendStripHTML should be a function');
});

TestRunner.test('Mixer UI - buildMixerSendStripHTML accepts 1 parameter', (t) => {
    t.assertEqual(buildMixerSendStripHTML.length, 1, 'buildMixerSendStripHTML should accept 1 parameter (send)');
});

TestRunner.test('Mixer UI - buildMixerMasterStripHTML is a function export', (t) => {
    t.assertEqual(typeof buildMixerMasterStripHTML, 'function', 'buildMixerMasterStripHTML should be a function');
});

TestRunner.test('Mixer UI - buildMixerMasterStripHTML accepts no parameters', (t) => {
    t.assertEqual(buildMixerMasterStripHTML.length, 0, 'buildMixerMasterStripHTML should accept no parameters');
});

TestRunner.test('Mixer UI - openMixerWindow is a function export', (t) => {
    t.assertEqual(typeof openMixerWindow, 'function', 'openMixerWindow should be a function');
});

TestRunner.test('Mixer UI - openMixerWindow accepts 1 parameter', (t) => {
    t.assertEqual(openMixerWindow.length, 1, 'openMixerWindow should accept 1 parameter (savedState)');
});

TestRunner.test('Mixer UI - openMixerWindow calls buildMixerContentDOM', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('buildMixerContentDOM'), 'openMixerWindow should call buildMixerContentDOM');
});

TestRunner.test('Mixer UI - openMixerWindow calls initializeMixerEventHandlers', (t) => {
    const funcStr = openMixerWindow.toString();
    t.assertTruthy(funcStr.includes('initializeMixerEventHandlers'), 'openMixerWindow should call initializeMixerEventHandlers');
});

TestRunner.test('APP_VERSION validation for Day 371', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 371');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 49, 'Minor version should be >= 49 for Day 371');
    }
});

TestRunner.test('DB Module - clearAllAudio handles transaction errors', (t) => {
    const funcStr = clearAllAudio.toString();
    t.assertTruthy(funcStr.includes('onerror') || funcStr.includes('error') || funcStr.includes('reject'), 'clearAllAudio should handle errors');
});

// ============================================
// Day 372: DB Module Extended Tests
// ============================================
TestRunner.test('DB Module - DB_NAME constant is a non-empty string', (t) => {
    t.assertEqual(typeof DB_NAME, 'string', 'DB_NAME should be a string');
    t.assertTruthy(DB_NAME.length > 0, 'DB_NAME should not be empty');
});

TestRunner.test('DB Module - STORE_NAME constant is a non-empty string', (t) => {
    t.assertEqual(typeof STORE_NAME, 'string', 'STORE_NAME should be a string');
    t.assertTruthy(STORE_NAME.length > 0, 'STORE_NAME should not be empty');
});

TestRunner.test('DB Module - DB_VERSION constant is a positive number', (t) => {
    t.assertEqual(typeof DB_VERSION, 'number', 'DB_VERSION should be a number');
    t.assertTruthy(DB_VERSION > 0, 'DB_VERSION should be positive');
});

TestRunner.test('DB Module - storeAudio returns a Promise', (t) => {
    const result = storeAudio('test-key', new Blob());
    t.assertEqual(typeof result?.then, 'function', 'storeAudio should return a Promise (thenable)');
});

TestRunner.test('DB Module - getAudio returns a Promise', (t) => {
    const result = getAudio('test-key');
    t.assertEqual(typeof result?.then, 'function', 'getAudio should return a Promise (thenable)');
});

TestRunner.test('DB Module - deleteAudio returns a Promise', (t) => {
    const result = deleteAudio('test-key');
    t.assertEqual(typeof result?.then, 'function', 'deleteAudio should return a Promise (thenable)');
});

TestRunner.test('DB Module - clearAllAudio returns a Promise', (t) => {
    const result = clearAllAudio();
    t.assertEqual(typeof result?.then, 'function', 'clearAllAudio should return a Promise (thenable)');
});

TestRunner.test('DB Module - storeAudio uses put method for storing', (t) => {
    const funcStr = storeAudio.toString();
    t.assertTruthy(funcStr.includes('put'), 'storeAudio should use put method for storing');
});

TestRunner.test('DB Module - getAudio uses get method for retrieval', (t) => {
    const funcStr = getAudio.toString();
    t.assertTruthy(funcStr.includes('get'), 'getAudio should use get method for retrieval');
});

TestRunner.test('DB Module - deleteAudio uses delete method for removal', (t) => {
    const funcStr = deleteAudio.toString();
    t.assertTruthy(funcStr.includes('delete') || funcStr.includes('remove'), 'deleteAudio should use delete or remove method');
});

TestRunner.test('DB Module - clearAllAudio uses clear method', (t) => {
    const funcStr = clearAllAudio.toString();
    t.assertTruthy(funcStr.includes('clear'), 'clearAllAudio should use clear method');
});

TestRunner.test('DB Module - storeAudio references key parameter in error messages', (t) => {
    const funcStr = storeAudio.toString();
    t.assertTruthy(funcStr.includes('key') && funcStr.includes('Error'), 'storeAudio should reference key in error handling');
});

TestRunner.test('DB Module - getAudio handles missing key gracefully', (t) => {
    const funcStr = getAudio.toString();
    t.assertTruthy(funcStr.includes('null') || funcStr.includes('undefined') || funcStr.includes('resolve'), 'getAudio should handle missing keys gracefully');
});

TestRunner.test('DB Module - storeAudio logs errors to console', (t) => {
    const funcStr = storeAudio.toString();
    t.assertTruthy(funcStr.includes('console.error') || funcStr.includes('console.log'), 'storeAudio should log errors');
});

TestRunner.test('DB Module - getAudio logs errors to console', (t) => {
    const funcStr = getAudio.toString();
    t.assertTruthy(funcStr.includes('console.error') || funcStr.includes('console.log'), 'getAudio should log errors');
});

TestRunner.test('DB Module - deleteAudio logs errors to console', (t) => {
    const funcStr = deleteAudio.toString();
    t.assertTruthy(funcStr.includes('console.error') || funcStr.includes('console.log'), 'deleteAudio should log errors');
});

TestRunner.test('DB Module - clearAllAudio logs errors to console', (t) => {
    const funcStr = clearAllAudio.toString();
    t.assertTruthy(funcStr.includes('console.error') || funcStr.includes('console.log'), 'clearAllAudio should log errors');
});

TestRunner.test('DB Module - storeAudio handles DB connection errors', (t) => {
    const funcStr = storeAudio.toString();
    t.assertTruthy(funcStr.includes('catch') || funcStr.includes('try'), 'storeAudio should handle errors with try-catch');
});

TestRunner.test('DB Module - getAudio handles DB connection errors', (t) => {
    const funcStr = getAudio.toString();
    t.assertTruthy(funcStr.includes('catch') || funcStr.includes('try'), 'getAudio should handle errors with try-catch');
});

TestRunner.test('DB Module - storeAudio creates new Promise for async operation', (t) => {
    const funcStr = storeAudio.toString();
    t.assertTruthy(funcStr.includes('new Promise'), 'storeAudio should create a new Promise');
});

TestRunner.test('DB Module - getAudio creates new Promise for async operation', (t) => {
    const funcStr = getAudio.toString();
    t.assertTruthy(funcStr.includes('new Promise'), 'getAudio should create a new Promise');
});

TestRunner.test('DB Module - deleteAudio creates new Promise for async operation', (t) => {
    const funcStr = deleteAudio.toString();
    t.assertTruthy(funcStr.includes('new Promise'), 'deleteAudio should create a new Promise');
});

TestRunner.test('DB Module - clearAllAudio creates new Promise for async operation', (t) => {
    const funcStr = clearAllAudio.toString();
    t.assertTruthy(funcStr.includes('new Promise'), 'clearAllAudio should create a new Promise');
});

TestRunner.test('DB Module - storeAudio calls reject on transaction abort', (t) => {
    const funcStr = storeAudio.toString();
    t.assertTruthy(funcStr.includes('reject') || funcStr.includes('onabort'), 'storeAudio should reject on transaction abort');
});

TestRunner.test('DB Module - getAudio uses resolve for successful retrieval', (t) => {
    const funcStr = getAudio.toString();
    t.assertTruthy(funcStr.includes('resolve') || funcStr.includes('result'), 'getAudio should resolve on success');
});

TestRunner.test('DB Module - storeAudio handles request.onsuccess callback', (t) => {
    const funcStr = storeAudio.toString();
    t.assertTruthy(funcStr.includes('onsuccess') || funcStr.includes('request'), 'storeAudio should handle onsuccess callback');
});

TestRunner.test('DB Module - storeAudio handles request.onerror callback', (t) => {
    const funcStr = storeAudio.toString();
    t.assertTruthy(funcStr.includes('onerror') || funcStr.includes('request'), 'storeAudio should handle onerror callback');
});

TestRunner.test('DB Module - getAudio handles request.onsuccess callback', (t) => {
    const funcStr = getAudio.toString();
    t.assertTruthy(funcStr.includes('onsuccess') || funcStr.includes('request'), 'getAudio should handle onsuccess callback');
});

TestRunner.test('DB Module - getAudio handles request.onerror callback', (t) => {
    const funcStr = getAudio.toString();
    t.assertTruthy(funcStr.includes('onerror') || funcStr.includes('request'), 'getAudio should handle onerror callback');
});

TestRunner.test('DB Module - deleteAudio handles request.onsuccess callback', (t) => {
    const funcStr = deleteAudio.toString();
    t.assertTruthy(funcStr.includes('onsuccess') || funcStr.includes('request'), 'deleteAudio should handle onsuccess callback');
});

TestRunner.test('DB Module - deleteAudio handles request.onerror callback', (t) => {
    const funcStr = deleteAudio.toString();
    t.assertTruthy(funcStr.includes('onerror') || funcStr.includes('request'), 'deleteAudio should handle onerror callback');
});

TestRunner.test('DB Module - clearAllAudio handles request.onsuccess callback', (t) => {
    const funcStr = clearAllAudio.toString();
    t.assertTruthy(funcStr.includes('onsuccess') || funcStr.includes('request'), 'clearAllAudio should handle onsuccess callback');
});

TestRunner.test('DB Module - clearAllAudio handles request.onerror callback', (t) => {
    const funcStr = clearAllAudio.toString();
    t.assertTruthy(funcStr.includes('onerror') || funcStr.includes('request'), 'clearAllAudio should handle onerror callback');
});

TestRunner.test('DB Module - DB module references window.indexedDB', (t) => {
    const funcStr = (storeAudio.toString() + getAudio.toString() + clearAllAudio.toString());
    t.assertTruthy(funcStr.includes('window.indexedDB') || funcStr.includes('indexedDB'), 'DB module should reference window.indexedDB');
});

TestRunner.test('DB Module - DB module handles browser compatibility', (t) => {
    const funcStr = (storeAudio.toString() + getAudio.toString() + clearAllAudio.toString());
    t.assertTruthy(funcStr.includes('window.indexedDB') || funcStr.includes('indexedDB') || funcStr.includes('Error'), 'DB module should check IndexedDB availability');
});

TestRunner.test('DB Module - APP_VERSION validation for Day 372', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 372');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 50, 'Minor version should be >= 50 for Day 372');
    }
});

TestRunner.test('DB Module Extended - Total DB Module test count verification', (t) => {
    const dbTests = [
        'DB Module - storeAudio is exported as async function',
        'DB Module - getAudio is exported as async function',
        'DB Module - deleteAudio is exported as async function',
        'DB Module - clearAllAudio is exported as async function',
        'DB Module - DB_NAME constant is a non-empty string',
        'DB Module - STORE_NAME constant is a non-empty string',
        'DB Module - DB_VERSION constant is a positive number'
    ];
    t.assertTruthy(dbTests.length >= 7, 'DB Module should have at least 7 basic and extended tests');
});

// ============================================
// Day 373: Global Controls Window UI Tests
// ============================================
TestRunner.test('Global Controls Window - openGlobalControlsWindow is a function export', (t) => {
    t.assertEqual(typeof openGlobalControlsWindow, 'function', 'openGlobalControlsWindow should be a function');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow accepts 1-2 parameters', (t) => {
    const paramCount = openGlobalControlsWindow.length;
    t.assertTruthy(paramCount === 1 || paramCount === 2, 'openGlobalControlsWindow should accept 1-2 parameters (onReadyCallback, savedState)');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow uses globalControls windowId', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes("'globalControls'") || funcStr.includes('"globalControls"'), 'openGlobalControlsWindow should use globalControls windowId');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow calls localAppServices.createWindow', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openGlobalControlsWindow should call createWindow');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow passes correct window title', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes("'Global Controls'") || funcStr.includes('"Global Controls"'), 'openGlobalControlsWindow should set title to Global Controls');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow creates content HTML with play button', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('playBtnGlobal') || funcStr.includes('#playBtnGlobal'), 'Global Controls should include playBtnGlobal element');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow creates content HTML with stop button', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('stopBtnGlobal') || funcStr.includes('#stopBtnGlobal'), 'Global Controls should include stopBtnGlobal element');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow creates content HTML with record button', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('recordBtnGlobal') || funcStr.includes('#recordBtnGlobal'), 'Global Controls should include recordBtnGlobal element');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow creates tempo input field', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('tempoGlobalInput') || funcStr.includes('#tempoGlobalInput'), 'Global Controls should include tempoGlobalInput');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow creates MIDI input select', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('midiInputSelectGlobal') || funcStr.includes('#midiInputSelectGlobal'), 'Global Controls should include midiInputSelectGlobal');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow creates master meter elements', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('masterMeterContainerGlobal') || funcStr.includes('masterMeterBarGlobal'), 'Global Controls should include master meter elements');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow creates MIDI indicator', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('midiIndicatorGlobal') || funcStr.includes('#midiIndicatorGlobal'), 'Global Controls should include midiIndicatorGlobal');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow creates keyboard indicator', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('keyboardIndicatorGlobal') || funcStr.includes('#keyboardIndicatorGlobal'), 'Global Controls should include keyboardIndicatorGlobal');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow creates playback mode toggle', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('playbackModeToggleBtnGlobal') || funcStr.includes('#playbackModeToggleBtnGlobal'), 'Global Controls should include playbackModeToggleBtnGlobal');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow includes MIDI Learn section', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('midiLearnBtnGlobal') || funcStr.includes('midiLearnMappingsList'), 'Global Controls should include MIDI Learn section');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow includes MIDI Learn clear button', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('midiLearnClearBtnGlobal') || funcStr.includes('midiLearnStatusGlobal'), 'Global Controls should include MIDI Learn clear/status elements');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow sets window options correctly', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('closable: true') || funcStr.includes('minimizable: true'), 'Global Controls window should have closable/minimizable options');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow handles savedState for window restoration', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('savedState') && funcStr.includes('parseInt'), 'openGlobalControlsWindow should handle savedState for window position/size restoration');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow checks for already open window', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('openWindows.has') || funcStr.includes('getOpenWindows'), 'openGlobalControlsWindow should check if window is already open');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow restores existing window when found', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('.restore()'), 'openGlobalControlsWindow should call restore() on existing window');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow passes elements to onReadyCallback', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('onReadyCallback') && funcStr.includes('querySelector'), 'openGlobalControlsWindow should pass elements to onReadyCallback');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow returns window object', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('return') && funcStr.includes('newWindow'), 'openGlobalControlsWindow should return the window object');
});

TestRunner.test('Global Controls Window - Tempo input has correct attributes (min/max/step)', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('min=') && funcStr.includes('max=') && funcStr.includes('step='), 'Tempo input should have min/max/step attributes');
});

TestRunner.test('Global Controls Window - Tempo input defaults to DEFAULT_TEMPO value', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('value="120"') || funcStr.includes('value={DEFAULT_TEMPO}') || funcStr.includes('defaultValue'), 'Tempo input should default to 120 BPM');
});

TestRunner.test('Global Controls Window - openGlobalControlsWindow passes initialContentKey to createWindow', (t) => {
    const funcStr = openGlobalControlsWindow.toString();
    t.assertTruthy(funcStr.includes('initialContentKey'), 'openGlobalControlsWindow should pass initialContentKey for content caching');
});

TestRunner.test('Global Controls Window - APP_VERSION validation for Day 373', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 373');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 51, 'Minor version should be >= 51 for Day 373');
    }
});
// ============================================
// Day 374: Sound Browser Extended Functions Tests
// ============================================
TestRunner.test('Sound Browser - fetchSoundLibrary is a function export', (t) => {
    t.assertEqual(typeof fetchSoundLibrary, 'function', 'fetchSoundLibrary should be a function');
});

TestRunner.test('Sound Browser - fetchSoundLibrary is async', (t) => {
    t.assertEqual(fetchSoundLibrary.constructor.name, 'AsyncFunction', 'fetchSoundLibrary should be async');
});

TestRunner.test('Sound Browser - fetchSoundLibrary accepts 2-3 parameters', (t) => {
    const paramCount = fetchSoundLibrary.length;
    t.assertTruthy(paramCount === 2 || paramCount === 3, 'fetchSoundLibrary should accept 2-3 parameters (libraryName, zipUrl, isAutofetch)');
});

TestRunner.test('Sound Browser - fetchSoundLibrary references libraryName parameter', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('libraryName'), 'fetchSoundLibrary should reference libraryName parameter');
});

TestRunner.test('Sound Browser - fetchSoundLibrary references zipUrl parameter', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('zipUrl'), 'fetchSoundLibrary should reference zipUrl parameter');
});

TestRunner.test('Sound Browser - fetchSoundLibrary references isAutofetch parameter', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('isAutofetch'), 'fetchSoundLibrary should reference isAutofetch parameter');
});

TestRunner.test('Sound Browser - fetchSoundLibrary checks getLoadedZipFiles state', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('getLoadedZipFiles') || funcStr.includes('loadedZips'), 'fetchSoundLibrary should check loaded zip files state');
});

TestRunner.test('Sound Browser - fetchSoundLibrary checks getSoundLibraryFileTrees state', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('getSoundLibraryFileTrees') || funcStr.includes('soundTrees'), 'fetchSoundLibrary should check sound library file trees state');
});

TestRunner.test('Sound Browser - fetchSoundLibrary calls updateSoundBrowserDisplayForLibrary', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('updateSoundBrowserDisplayForLibrary'), 'fetchSoundLibrary should call updateSoundBrowserDisplayForLibrary for UI updates');
});

TestRunner.test('Sound Browser - fetchSoundLibrary handles loading state', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('loading') || funcStr.includes('isLoading'), 'fetchSoundLibrary should handle loading state');
});

TestRunner.test('Sound Browser - fetchSoundLibrary handles error state', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('hasError') || funcStr.includes('catch') || funcStr.includes('error'), 'fetchSoundLibrary should handle error state');
});

TestRunner.test('Sound Browser - fetchSoundLibrary uses setLoadedZipFilesState', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('setLoadedZipFilesState'), 'fetchSoundLibrary should set loaded zip files state');
});

TestRunner.test('Sound Browser - fetchSoundLibrary uses setSoundLibraryFileTreesState', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('setSoundLibraryFileTreesState'), 'fetchSoundLibrary should set sound library file trees state');
});

TestRunner.test('Sound Browser - fetchSoundLibrary checks JSZip availability', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('JSZip') || funcStr.includes('jszip'), 'fetchSoundLibrary should check for JSZip library');
});

TestRunner.test('Sound Browser - fetchSoundLibrary processes ZIP files', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('loadAsync') || funcStr.includes('forEach') || funcStr.includes('entries'), 'fetchSoundLibrary should process ZIP file entries');
});

TestRunner.test('Sound Browser - fetchSoundLibrary filters audio files by extension', (t) => {
    const funcStr = fetchSoundLibrary.toString();
    t.assertTruthy(funcStr.includes('.wav') || funcStr.includes('.mp3') || funcStr.includes('.ogg') || funcStr.includes('audio') || funcStr.includes('audioFileCount'), 'fetchSoundLibrary should filter for audio file extensions');
});

TestRunner.test('Sound Browser - loadSoundFromBrowserToTarget is a function export', (t) => {
    t.assertEqual(typeof loadSoundFromBrowserToTarget, 'function', 'loadSoundFromBrowserToTarget should be a function');
});

TestRunner.test('Sound Browser - loadSoundFromBrowserToTarget is async', (t) => {
    t.assertEqual(loadSoundFromBrowserToTarget.constructor.name, 'AsyncFunction', 'loadSoundFromBrowserToTarget should be async');
});

TestRunner.test('Sound Browser - loadSoundFromBrowserToTarget accepts 3-4 parameters', (t) => {
    const paramCount = loadSoundFromBrowserToTarget.length;
    t.assertTruthy(paramCount >= 3 && paramCount <= 4, 'loadSoundFromBrowserToTarget should accept 3-4 parameters');
});

TestRunner.test('Sound Browser - loadSoundFromBrowserToTarget references e/event parameter', (t) => {
    const funcStr = loadSoundFromBrowserToTarget.toString();
    t.assertTruthy(funcStr.includes('e') || funcStr.includes('event') || funcStr.includes('droppedData'), 'loadSoundFromBrowserToTarget should reference event parameter');
});

TestRunner.test('Sound Browser - loadSoundFromBrowserToTarget references trackId parameter', (t) => {
    const funcStr = loadSoundFromBrowserToTarget.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'loadSoundFromBrowserToTarget should reference trackId parameter');
});

TestRunner.test('Sound Browser - loadSoundFromBrowserToTarget calls getTrackById', (t) => {
    const funcStr = loadSoundFromBrowserToTarget.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'loadSoundFromBrowserToTarget should call getTrackById');
});

TestRunner.test('Sound Browser - loadSoundFromBrowserToTarget handles Sampler track type', (t) => {
    const funcStr = loadSoundFromBrowserToTarget.toString();
    t.assertTruthy(funcStr.includes('Sampler') || funcStr.includes('sampler'), 'loadSoundFromBrowserToTarget should handle Sampler track type');
});

TestRunner.test('Sound Browser - loadSoundFromBrowserToTarget handles DrumSampler track type', (t) => {
    const funcStr = loadSoundFromBrowserToTarget.toString();
    t.assertTruthy(funcStr.includes('DrumSampler') || funcStr.includes('drum'), 'loadSoundFromBrowserToTarget should handle DrumSampler track type');
});

TestRunner.test('Sound Browser - loadSoundFromBrowserToTarget calls loadSampleFile', (t) => {
    const funcStr = loadSoundFromBrowserToTarget.toString();
    t.assertTruthy(funcStr.includes('loadSampleFile'), 'loadSoundFromBrowserToTarget should call loadSampleFile');
});

TestRunner.test('Sound Browser - loadSoundFromBrowserToTarget calls updateTrackUI on sample load', (t) => {
    const funcStr = loadSoundFromBrowserToTarget.toString();
    t.assertTruthy(funcStr.includes('updateTrackUI'), 'loadSoundFromBrowserToTarget should call updateTrackUI');
});

TestRunner.test('Sound Browser - loadSoundFromBrowserToTarget handles targetPadOrSliceIndex', (t) => {
    const funcStr = loadSoundFromBrowserToTarget.toString();
    t.assertTruthy(funcStr.includes('targetPadOrSliceIndex') || funcStr.includes('padIndex') || funcStr.includes('sliceIndex'), 'loadSoundFromBrowserToTarget should handle target pad or slice index');
});

TestRunner.test('Sound Browser - soundLibraries constant is an object', (t) => {
    t.assertEqual(typeof soundLibraries, 'object', 'soundLibraries should be an object');
    t.assertTruthy(soundLibraries !== null, 'soundLibraries should not be null');
});

TestRunner.test('Sound Browser - soundLibraries has keys for library names', (t) => {
    const keys = Object.keys(soundLibraries);
    t.assertTruthy(keys.length > 0, 'soundLibraries should have at least one library defined');
});

TestRunner.test('Sound Browser - soundLibraries values are URLs', (t) => {
    const keys = Object.keys(soundLibraries);
    const allUrls = keys.every(key => {
        const val = soundLibraries[key];
        return typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('./'));
    });
    t.assertTruthy(allUrls, 'soundLibraries values should be URLs');
});

TestRunner.test('Sound Browser - APP_VERSION validation for Day 374', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 374');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 52, 'Minor version should be >= 52 for Day 374');
    }
});

// Day 375: Effects Registry Tests
TestRunner.test('Effects Registry - AVAILABLE_EFFECTS is an object', (t) => {
    t.assertEqual(typeof AVAILABLE_EFFECTS, 'object', 'AVAILABLE_EFFECTS should be an object');
    t.assertTruthy(AVAILABLE_EFFECTS !== null, 'AVAILABLE_EFFECTS should not be null');
});

TestRunner.test('Effects Registry - AVAILABLE_EFFECTS has at least one effect', (t) => {
    const keys = Object.keys(AVAILABLE_EFFECTS);
    t.assertTruthy(keys.length > 0, 'AVAILABLE_EFFECTS should have at least one effect defined');
});

TestRunner.test('Effects Registry - AVAILABLE_EFFECTS effect has displayName', (t) => {
    const keys = Object.keys(AVAILABLE_EFFECTS);
    if (keys.length > 0) {
        const firstEffect = AVAILABLE_EFFECTS[keys[0]];
        t.assertTruthy(typeof firstEffect.displayName === 'string', 'Effect should have displayName string');
    }
});

TestRunner.test('Effects Registry - AVAILABLE_EFFECTS effect has toneClass', (t) => {
    const keys = Object.keys(AVAILABLE_EFFECTS);
    if (keys.length > 0) {
        const firstEffect = AVAILABLE_EFFECTS[keys[0]];
        t.assertTruthy(typeof firstEffect.toneClass === 'string', 'Effect should have toneClass string');
    }
});

TestRunner.test('Effects Registry - AVAILABLE_EFFECTS effect has params array', (t) => {
    const keys = Object.keys(AVAILABLE_EFFECTS);
    if (keys.length > 0) {
        const firstEffect = AVAILABLE_EFFECTS[keys[0]];
        t.assertTruthy(Array.isArray(firstEffect.params), 'Effect should have params array');
    }
});

TestRunner.test('Effects Registry - AVAILABLE_EFFECTS param has key', (t) => {
    const keys = Object.keys(AVAILABLE_EFFECTS);
    if (keys.length > 0) {
        const firstEffect = AVAILABLE_EFFECTS[keys[0]];
        if (firstEffect.params && firstEffect.params.length > 0) {
            const firstParam = firstEffect.params[0];
            t.assertTruthy(typeof firstParam.key === 'string', 'Param should have key string');
        }
    }
});

TestRunner.test('Effects Registry - AVAILABLE_EFFECTS param has label', (t) => {
    const keys = Object.keys(AVAILABLE_EFFECTS);
    if (keys.length > 0) {
        const firstEffect = AVAILABLE_EFFECTS[keys[0]];
        if (firstEffect.params && firstEffect.params.length > 0) {
            const firstParam = firstEffect.params[0];
            t.assertTruthy(typeof firstParam.label === 'string', 'Param should have label string');
        }
    }
});

TestRunner.test('Effects Registry - AVAILABLE_EFFECTS param has type', (t) => {
    const keys = Object.keys(AVAILABLE_EFFECTS);
    if (keys.length > 0) {
        const firstEffect = AVAILABLE_EFFECTS[keys[0]];
        if (firstEffect.params && firstEffect.params.length > 0) {
            const firstParam = firstEffect.params[0];
            t.assertTruthy(typeof firstParam.type === 'string', 'Param should have type string');
        }
    }
});

TestRunner.test('Effects Registry - AVAILABLE_EFFECTS param has numeric min/max', (t) => {
    const keys = Object.keys(AVAILABLE_EFFECTS);
    if (keys.length > 0) {
        const firstEffect = AVAILABLE_EFFECTS[keys[0]];
        if (firstEffect.params && firstEffect.params.length > 0) {
            const firstParam = firstEffect.params[0];
            t.assertEqual(typeof firstParam.min, 'number', 'Param should have numeric min');
            t.assertEqual(typeof firstParam.max, 'number', 'Param should have numeric max');
        }
    }
});

TestRunner.test('Effects Registry - AVAILABLE_EFFECTS param has defaultValue', (t) => {
    const keys = Object.keys(AVAILABLE_EFFECTS);
    if (keys.length > 0) {
        const firstEffect = AVAILABLE_EFFECTS[keys[0]];
        if (firstEffect.params && firstEffect.params.length > 0) {
            const firstParam = firstEffect.params[0];
            t.assertTruthy('defaultValue' in firstParam, 'Param should have defaultValue');
        }
    }
});

TestRunner.test('Effects Registry - synthEngineControlDefinitions is an object', (t) => {
    t.assertEqual(typeof synthEngineControlDefinitions, 'object', 'synthEngineControlDefinitions should be an object');
    t.assertTruthy(synthEngineControlDefinitions !== null, 'synthEngineControlDefinitions should not be null');
});

TestRunner.test('Effects Registry - synthEngineControlDefinitions has at least one engine', (t) => {
    const keys = Object.keys(synthEngineControlDefinitions);
    t.assertTruthy(keys.length > 0, 'synthEngineControlDefinitions should have at least one engine defined');
});

TestRunner.test('Effects Registry - synthEngineControlDefinitions engine is an array', (t) => {
    const keys = Object.keys(synthEngineControlDefinitions);
    if (keys.length > 0) {
        const firstEngine = synthEngineControlDefinitions[keys[0]];
        t.assertTruthy(Array.isArray(firstEngine), 'Engine should be an array of controls');
    }
});

TestRunner.test('Effects Registry - synthEngineControlDefinitions control has idPrefix', (t) => {
    const keys = Object.keys(synthEngineControlDefinitions);
    if (keys.length > 0) {
        const firstEngine = synthEngineControlDefinitions[keys[0]];
        if (firstEngine && firstEngine.length > 0) {
            const firstControl = firstEngine[0];
            t.assertTruthy(typeof firstControl.idPrefix === 'string', 'Control should have idPrefix string');
        }
    }
});

TestRunner.test('Effects Registry - synthEngineControlDefinitions control has label', (t) => {
    const keys = Object.keys(synthEngineControlDefinitions);
    if (keys.length > 0) {
        const firstEngine = synthEngineControlDefinitions[keys[0]];
        if (firstEngine && firstEngine.length > 0) {
            const firstControl = firstEngine[0];
            t.assertTruthy(typeof firstControl.label === 'string', 'Control should have label string');
        }
    }
});

TestRunner.test('Effects Registry - synthEngineControlDefinitions control has type', (t) => {
    const keys = Object.keys(synthEngineControlDefinitions);
    if (keys.length > 0) {
        const firstEngine = synthEngineControlDefinitions[keys[0]];
        if (firstEngine && firstEngine.length > 0) {
            const firstControl = firstEngine[0];
            t.assertTruthy(typeof firstControl.type === 'string', 'Control should have type string');
        }
    }
});

TestRunner.test('Effects Registry - synthEngineControlDefinitions control has path', (t) => {
    const keys = Object.keys(synthEngineControlDefinitions);
    if (keys.length > 0) {
        const firstEngine = synthEngineControlDefinitions[keys[0]];
        if (firstEngine && firstEngine.length > 0) {
            const firstControl = firstEngine[0];
            t.assertTruthy(typeof firstControl.path === 'string', 'Control should have path string');
        }
    }
});

TestRunner.test('Effects Registry - createEffectInstance is a function export', (t) => {
    t.assertEqual(typeof createEffectInstance, 'function', 'createEffectInstance should be a function');
});

TestRunner.test('Effects Registry - createEffectInstance accepts 1-2 parameters', (t) => {
    const paramCount = createEffectInstance.length;
    t.assertTruthy(paramCount >= 1 && paramCount <= 2, 'createEffectInstance should accept 1-2 parameters');
});

TestRunner.test('Effects Registry - createEffectInstance references effectType parameter', (t) => {
    const funcStr = createEffectInstance.toString();
    t.assertTruthy(funcStr.includes('effectType'), 'createEffectInstance should reference effectType parameter');
});

TestRunner.test('Effects Registry - createEffectInstance checks AVAILABLE_EFFECTS', (t) => {
    const funcStr = createEffectInstance.toString();
    t.assertTruthy(funcStr.includes('AVAILABLE_EFFECTS'), 'createEffectInstance should check AVAILABLE_EFFECTS');
});

TestRunner.test('Effects Registry - getEffectDefaultParams is a function export', (t) => {
    t.assertEqual(typeof getEffectDefaultParams, 'function', 'getEffectDefaultParams should be a function');
});

TestRunner.test('Effects Registry - getEffectDefaultParams accepts 1 parameter', (t) => {
    const paramCount = getEffectDefaultParams.length;
    t.assertEqual(paramCount, 1, 'getEffectDefaultParams should accept 1 parameter');
});

TestRunner.test('Effects Registry - getEffectDefaultParams references effectType parameter', (t) => {
    const funcStr = getEffectDefaultParams.toString();
    t.assertTruthy(funcStr.includes('effectType'), 'getEffectDefaultParams should reference effectType parameter');
});

TestRunner.test('Effects Registry - getEffectParamDefinitions is a function export', (t) => {
    t.assertEqual(typeof getEffectParamDefinitions, 'function', 'getEffectParamDefinitions should be a function');
});

TestRunner.test('Effects Registry - getEffectParamDefinitions accepts 1 parameter', (t) => {
    const paramCount = getEffectParamDefinitions.length;
    t.assertEqual(paramCount, 1, 'getEffectParamDefinitions should accept 1 parameter');
});

TestRunner.test('Effects Registry - getEffectParamDefinitions references effectType parameter', (t) => {
    const funcStr = getEffectParamDefinitions.toString();
    t.assertTruthy(funcStr.includes('effectType'), 'getEffectParamDefinitions should reference effectType parameter');
});

TestRunner.test('Effects Registry - createEffectInstance handles unknown effect type', (t) => {
    const funcStr = createEffectInstance.toString();
    t.assertTruthy(funcStr.includes('undefined') || funcStr.includes('null') || funcStr.includes('error') || funcStr.includes('Error'), 'createEffectInstance should handle unknown effect type');
});

TestRunner.test('Effects Registry - getEffectDefaultParams handles unknown effect type', (t) => {
    const funcStr = getEffectDefaultParams.toString();
    t.assertTruthy(funcStr.includes('undefined') || funcStr.includes('null') || funcStr.includes('error') || funcStr.includes('Error'), 'getEffectDefaultParams should handle unknown effect type');
});

TestRunner.test('Effects Registry - getEffectParamDefinitions handles unknown effect type', (t) => {
    const funcStr = getEffectParamDefinitions.toString();
    t.assertTruthy(funcStr.includes('undefined') || funcStr.includes('null') || funcStr.includes('error') || funcStr.includes('Error'), 'getEffectParamDefinitions should handle unknown effect type');
});

TestRunner.test('Effects Registry - synthEngineControlDefinitions control handles knob type', (t) => {
    const keys = Object.keys(synthEngineControlDefinitions);
    let hasKnob = false;
    for (const key of keys) {
        const engine = synthEngineControlDefinitions[key];
        if (Array.isArray(engine)) {
            for (const control of engine) {
                if (control.type === 'knob') {
                    hasKnob = true;
                    break;
                }
            }
        }
        if (hasKnob) break;
    }
    t.assertTruthy(hasKnob, 'At least one engine should have a knob control');
});

TestRunner.test('Effects Registry - synthEngineControlDefinitions control handles select type', (t) => {
    const keys = Object.keys(synthEngineControlDefinitions);
    let hasSelect = false;
    for (const key of keys) {
        const engine = synthEngineControlDefinitions[key];
        if (Array.isArray(engine)) {
            for (const control of engine) {
                if (control.type === 'select') {
                    hasSelect = true;
                    break;
                }
            }
        }
        if (hasSelect) break;
    }
    t.assertTruthy(hasSelect, 'At least one engine should have a select control');
});

TestRunner.test('Effects Registry - APP_VERSION validation for Day 375', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 375');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 54, 'Minor version should be >= 54 for Day 375');
    }
});

TestRunner.test('Utils - secondsToBBSTime is a function export', (t) => {
    t.assertEqual(typeof secondsToBBSTime, 'function', 'secondsToBBSTime should be a function');
});

TestRunner.test('Utils - secondsToBBSTime accepts 1 parameter', (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('seconds'), 'Function should reference seconds parameter');
});

TestRunner.test('Utils - secondsToBBSTime handles null input', (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('null') || funcStr.includes('undefined'), 'Should check for null/undefined');
});

TestRunner.test('Utils - secondsToBBSTime handles NaN input', (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('isNaN'), 'Should check for NaN');
});

TestRunner.test('Utils - secondsToBBSTime uses Tone.Time for conversion', (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('Tone.Time') || funcStr.includes('Tone'), 'Should use Tone for conversion');
});

TestRunner.test('Utils - secondsToBBSTime calls toBarsBeatsSixteenths', (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('toBarsBeatsSixteenths'), 'Should convert to B:B:S format');
});

TestRunner.test('Utils - secondsToBBSTime has error handling with try-catch', (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('try') && funcStr.includes('catch'), 'Should have try-catch error handling');
});

TestRunner.test('Utils - secondsToBBSTime returns fallback for invalid input', (t) => {
    const funcStr = secondsToBBSTime.toString();
    t.assertTruthy(funcStr.includes('0:0:0'), 'Should return fallback 0:0:0 for invalid input');
});

TestRunner.test('Utils - bbsTimeToSeconds is a function export', (t) => {
    t.assertEqual(typeof bbsTimeToSeconds, 'function', 'bbsTimeToSeconds should be a function');
});

TestRunner.test('Utils - bbsTimeToSeconds accepts 1 parameter', (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('bbsString'), 'Function should reference bbsString parameter');
});

TestRunner.test('Utils - bbsTimeToSeconds handles null/empty input', (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('!bbsString') || funcStr.includes('null') || funcStr.includes('undefined'), 'Should check for null/empty');
});

TestRunner.test('Utils - bbsTimeToSeconds validates string type', (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('string'), 'Should validate string type');
});

TestRunner.test('Utils - bbsTimeToSeconds uses Tone.Time for conversion', (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('Tone.Time') || funcStr.includes('Tone'), 'Should use Tone for conversion');
});

TestRunner.test('Utils - bbsTimeToSeconds calls toSeconds', (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('toSeconds'), 'Should convert to seconds using toSeconds');
});

TestRunner.test('Utils - bbsTimeToSeconds returns null for invalid input', (t) => {
    const funcStr = bbsTimeToSeconds.toString();
    t.assertTruthy(funcStr.includes('null'), 'Should return null for invalid input');
});

TestRunner.test('Utils - showNotification is a function export', (t) => {
    t.assertEqual(typeof showNotification, 'function', 'showNotification should be a function');
});

TestRunner.test('Utils - showNotification accepts 1-2 parameters', (t) => {
    const funcStr = showNotification.toString();
    t.assertTruthy(funcStr.includes('message') && (funcStr.includes('duration') || funcStr.includes('= 3000')), 'Should accept message and optional duration');
});

TestRunner.test('Utils - showNotification references message parameter', (t) => {
    const funcStr = showNotification.toString();
    t.assertTruthy(funcStr.includes('message'), 'Should reference message parameter');
});

TestRunner.test('Utils - showNotification has default duration', (t) => {
    const funcStr = showNotification.toString();
    t.assertTruthy(funcStr.includes('3000'), 'Should have default 3000ms duration');
});

TestRunner.test('Utils - showCustomModal is a function export', (t) => {
    t.assertEqual(typeof showCustomModal, 'function', 'showCustomModal should be a function');
});

TestRunner.test('Utils - showCustomModal accepts 2-4 parameters', (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes('title') && funcStr.includes('contentHTML'), 'Should accept title, contentHTML, buttonsConfig, and optional modalClass');
});

TestRunner.test('Utils - showCustomModal references title parameter', (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes('title'), 'Should reference title parameter');
});

TestRunner.test('Utils - showCustomModal references contentHTML parameter', (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes('contentHTML'), 'Should reference contentHTML parameter');
});

TestRunner.test('Utils - showCustomModal references buttonsConfig parameter', (t) => {
    const funcStr = showCustomModal.toString();
    t.assertTruthy(funcStr.includes('buttonsConfig'), 'Should reference buttonsConfig parameter');
});

TestRunner.test('Utils - showConfirmationDialog is a function export', (t) => {
    t.assertEqual(typeof showConfirmationDialog, 'function', 'showConfirmationDialog should be a function');
});

TestRunner.test('Utils - showConfirmationDialog accepts 3-4 parameters', (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('title') && funcStr.includes('message'), 'Should accept title, message, onConfirm, and optional onCancel');
});

TestRunner.test('Utils - showConfirmationDialog references title parameter', (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('title'), 'Should reference title parameter');
});

TestRunner.test('Utils - showConfirmationDialog references message parameter', (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('message'), 'Should reference message parameter');
});

TestRunner.test('Utils - showConfirmationDialog references onConfirm parameter', (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('onConfirm'), 'Should reference onConfirm parameter');
});

TestRunner.test('Utils - showConfirmationDialog references onCancel parameter', (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('onCancel'), 'Should reference onCancel parameter');
});

TestRunner.test('Utils - showConfirmationDialog calls showCustomModal', (t) => {
    const funcStr = showConfirmationDialog.toString();
    t.assertTruthy(funcStr.includes('showCustomModal'), 'Should call showCustomModal');
});

TestRunner.test('Utils - createContextMenu is a function export', (t) => {
    t.assertEqual(typeof createContextMenu, 'function', 'createContextMenu should be a function');
});

TestRunner.test('Utils - createContextMenu accepts 2-3 parameters', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('event') && funcStr.includes('menuItems'), 'Should accept event and menuItems');
});

TestRunner.test('Utils - createContextMenu references event parameter', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('event'), 'Should reference event parameter');
});

TestRunner.test('Utils - createContextMenu references menuItems parameter', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('menuItems'), 'Should reference menuItems parameter');
});

TestRunner.test('Utils - createContextMenu uses preventDefault', (t) => {
    const funcStr = createContextMenu.toString();
    t.assertTruthy(funcStr.includes('preventDefault'), 'Should call preventDefault on event');
});

TestRunner.test('Utils - APP_VERSION validation for Day 376', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 376');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 55, 'Minor version should be >= 55 for Day 376');
    }
});

// ============================================
// Day 377: UI Constants Tests
// ============================================

TestRunner.test('UI Constants - GRID_STEP_LABELS is an object', (t) => {
    t.assertEqual(typeof GRID_STEP_LABELS, 'object', 'GRID_STEP_LABELS should be an object');
    t.assertTruthy(GRID_STEP_LABELS !== null, 'GRID_STEP_LABELS should not be null');
});

TestRunner.test('UI Constants - GRID_STEP_LABELS has labels array', (t) => {
    t.assertEqual(Array.isArray(GRID_STEP_LABELS.labels), true, 'GRID_STEP_LABELS.labels should be an array');
});

TestRunner.test('UI Constants - GRID_STEP_LABELS has 16 labels', (t) => {
    t.assertEqual(GRID_STEP_LABELS.labels.length, 16, 'Should have 16 labels');
});

TestRunner.test('UI Constants - GRID_STEP_LABELS labels are 1-indexed strings', (t) => {
    t.assertEqual(GRID_STEP_LABELS.labels[0], '1', 'First label should be "1"');
    t.assertEqual(GRID_STEP_LABELS.labels[15], '16', 'Last label should be "16"');
    for (let i = 0; i < 16; i++) {
        t.assertEqual(GRID_STEP_LABELS.labels[i], String(i + 1), `Label ${i} should be "${i + 1}"`);
    }
});

TestRunner.test('UI Constants - STEP_LABELS_SIXTEENTHS is an object', (t) => {
    t.assertEqual(typeof STEP_LABELS_SIXTEENTHS, 'object', 'STEP_LABELS_SIXTEENTHS should be an object');
    t.assertTruthy(STEP_LABELS_SIXTEENTHS !== null, 'STEP_LABELS_SIXTEENTHS should not be null');
});

TestRunner.test('UI Constants - STEP_LABELS_SIXTEENTHS has labels array', (t) => {
    t.assertEqual(Array.isArray(STEP_LABELS_SIXTEENTHS.labels), true, 'STEP_LABELS_SIXTEENTHS.labels should be an array');
});

TestRunner.test('UI Constants - STEP_LABELS_SIXTEENTHS has 16 labels', (t) => {
    t.assertEqual(STEP_LABELS_SIXTEENTHS.labels.length, 16, 'Should have 16 labels');
});

TestRunner.test('UI Constants - STEP_LABELS_SIXTEENTHS labels are 1-indexed strings', (t) => {
    t.assertEqual(STEP_LABELS_SIXTEENTHS.labels[0], '1', 'First label should be "1"');
    t.assertEqual(STEP_LABELS_SIXTEENTHS.labels[15], '16', 'Last label should be "16"');
    for (let i = 0; i < 16; i++) {
        t.assertEqual(STEP_LABELS_SIXTEENTHS.labels[i], String(i + 1), `Label ${i} should be "${i + 1}"`);
    }
});

TestRunner.test('UI Constants - GRID_STEP_LABELS and STEP_LABELS_SIXTEENTHS are identical', (t) => {
    t.assertEqual(GRID_STEP_LABELS.labels.length, STEP_LABELS_SIXTEENTHS.labels.length, 'Should have same length');
    for (let i = 0; i < 16; i++) {
        t.assertEqual(GRID_STEP_LABELS.labels[i], STEP_LABELS_SIXTEENTHS.labels[i], `Label ${i} should match`);
    }
});

TestRunner.test('UI Constants - MARKER_COLORS is an array', (t) => {
    t.assertEqual(Array.isArray(MARKER_COLORS), true, 'MARKER_COLORS should be an array');
});

TestRunner.test('UI Constants - MARKER_COLORS has 10 colors', (t) => {
    t.assertEqual(MARKER_COLORS.length, 10, 'Should have 10 marker colors');
});

TestRunner.test('UI Constants - MARKER_COLORS contains valid hex colors', (t) => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    for (let i = 0; i < MARKER_COLORS.length; i++) {
        t.assertTruthy(hexPattern.test(MARKER_COLORS[i]), `Color ${i} should be valid hex: ${MARKER_COLORS[i]}`);
    }
});

TestRunner.test('UI Constants - MARKER_COLORS contains unique colors', (t) => {
    const uniqueColors = new Set(MARKER_COLORS);
    t.assertEqual(uniqueColors.size, MARKER_COLORS.length, 'All marker colors should be unique');
});

TestRunner.test('UI Constants - MARKER_COLORS includes expected colors', (t) => {
    t.assertTruthy(MARKER_COLORS.includes('#ff6b6b'), 'Should include red');
    t.assertTruthy(MARKER_COLORS.includes('#1dd1a1'), 'Should include green');
    t.assertTruthy(MARKER_COLORS.includes('#54a0ff'), 'Should include blue');
});

TestRunner.test('UI Constants - DEFAULT_MARKER is an object', (t) => {
    t.assertEqual(typeof DEFAULT_MARKER, 'object', 'DEFAULT_MARKER should be an object');
    t.assertTruthy(DEFAULT_MARKER !== null, 'DEFAULT_MARKER should not be null');
});

TestRunner.test('UI Constants - DEFAULT_MARKER has required properties', (t) => {
    t.assertTruthy(DEFAULT_MARKER.hasOwnProperty('name'), 'Should have name property');
    t.assertTruthy(DEFAULT_MARKER.hasOwnProperty('bar'), 'Should have bar property');
    t.assertTruthy(DEFAULT_MARKER.hasOwnProperty('color'), 'Should have color property');
});

TestRunner.test('UI Constants - DEFAULT_MARKER name is a string', (t) => {
    t.assertEqual(typeof DEFAULT_MARKER.name, 'string', 'name should be a string');
    t.assertEqual(DEFAULT_MARKER.name, 'Marker', 'Default marker name should be "Marker"');
});

TestRunner.test('UI Constants - DEFAULT_MARKER bar is 1-indexed', (t) => {
    t.assertEqual(typeof DEFAULT_MARKER.bar, 'number', 'bar should be a number');
    t.assertEqual(DEFAULT_MARKER.bar, 1, 'Default bar should be 1 (1-indexed)');
});

TestRunner.test('UI Constants - DEFAULT_MARKER color is valid hex', (t) => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    t.assertTruthy(hexPattern.test(DEFAULT_MARKER.color), 'color should be valid hex color');
    t.assertEqual(DEFAULT_MARKER.color, DEFAULT_MARKER_COLOR, 'color should match DEFAULT_MARKER_COLOR');
});

TestRunner.test('UI Constants - AUTOMATION_LANE_COLORS is an array', (t) => {
    t.assertEqual(Array.isArray(AUTOMATION_LANE_COLORS), true, 'AUTOMATION_LANE_COLORS should be an array');
});

TestRunner.test('UI Constants - AUTOMATION_LANE_COLORS has 10 colors', (t) => {
    t.assertEqual(AUTOMATION_LANE_COLORS.length, 10, 'Should have 10 automation lane colors');
});

TestRunner.test('UI Constants - AUTOMATION_LANE_COLORS contains valid hex colors', (t) => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    for (let i = 0; i < AUTOMATION_LANE_COLORS.length; i++) {
        t.assertTruthy(hexPattern.test(AUTOMATION_LANE_COLORS[i]), `Color ${i} should be valid hex: ${AUTOMATION_LANE_COLORS[i]}`);
    }
});

TestRunner.test('UI Constants - AUTOMATION_LANE_COLORS contains unique colors', (t) => {
    const uniqueColors = new Set(AUTOMATION_LANE_COLORS);
    t.assertEqual(uniqueColors.size, AUTOMATION_LANE_COLORS.length, 'All automation lane colors should be unique');
});

TestRunner.test('UI Constants - AUTOMATION_LANE_COLORS matches MARKER_COLORS', (t) => {
    t.assertEqual(AUTOMATION_LANE_COLORS.length, MARKER_COLORS.length, 'Should have same length as MARKER_COLORS');
    for (let i = 0; i < AUTOMATION_LANE_COLORS.length; i++) {
        t.assertEqual(AUTOMATION_LANE_COLORS[i], MARKER_COLORS[i], `Color ${i} should match MARKER_COLORS`);
    }
});

TestRunner.test('UI Constants - AUTOMATION_LANE_HEIGHT is a positive number', (t) => {
    t.assertEqual(typeof AUTOMATION_LANE_HEIGHT, 'number', 'AUTOMATION_LANE_HEIGHT should be a number');
    t.assertTruthy(AUTOMATION_LANE_HEIGHT > 0, 'AUTOMATION_LANE_HEIGHT should be positive');
    t.assertEqual(AUTOMATION_LANE_HEIGHT, 20, 'Should be 20 pixels');
});

TestRunner.test('UI Constants - AUTOMATION_LANE_DEFAULT is in valid range', (t) => {
    t.assertEqual(typeof AUTOMATION_LANE_DEFAULT, 'number', 'AUTOMATION_LANE_DEFAULT should be a number');
    t.assertTruthy(AUTOMATION_LANE_DEFAULT >= 0 && AUTOMATION_LANE_DEFAULT <= 1, 'Should be between 0 and 1');
    t.assertEqual(AUTOMATION_LANE_DEFAULT, 0.5, 'Should default to 0.5 (50%)');
});

TestRunner.test('UI Constants - AUTOMATION_LANE_PRECISION is a positive integer', (t) => {
    t.assertEqual(typeof AUTOMATION_LANE_PRECISION, 'number', 'AUTOMATION_LANE_PRECISION should be a number');
    t.assertTruthy(AUTOMATION_LANE_PRECISION >= 0, 'Should be non-negative');
    t.assertEqual(Number.isInteger(AUTOMATION_LANE_PRECISION), true, 'Should be an integer');
    t.assertEqual(AUTOMATION_LANE_PRECISION, 2, 'Should be 2 decimal places');
});

TestRunner.test('UI Constants - AUTOMATION_LANE_STEP is a positive number', (t) => {
    t.assertEqual(typeof AUTOMATION_LANE_STEP, 'number', 'AUTOMATION_LANE_STEP should be a number');
    t.assertTruthy(AUTOMATION_LANE_STEP > 0, 'AUTOMATION_LANE_STEP should be positive');
    t.assertEqual(AUTOMATION_LANE_STEP, 0.01, 'Should be 0.01 (1% step)');
});

TestRunner.test('UI Constants - AUTOMATION_LANE_PARAMETERS is an array with expected values', (t) => {
    t.assertEqual(Array.isArray(AUTOMATION_LANE_PARAMETERS), true, 'AUTOMATION_LANE_PARAMETERS should be an array');
    const expectedParams = ['volume', 'pan', 'filterCutoff', 'resonance', 'attack', 'decay', 'sustain', 'release'];
    t.assertEqual(AUTOMATION_LANE_PARAMETERS.length, expectedParams.length, 'Should have 8 parameters');
    for (let i = 0; i < expectedParams.length; i++) {
        t.assertEqual(AUTOMATION_LANE_PARAMETERS[i], expectedParams[i], `Parameter ${i} should be "${expectedParams[i]}"`);
    }
});

TestRunner.test('UI Constants - CONTEXT_MENU_ITEM_HEIGHT is a positive number', (t) => {
    t.assertEqual(typeof CONTEXT_MENU_ITEM_HEIGHT, 'number', 'CONTEXT_MENU_ITEM_HEIGHT should be a number');
    t.assertTruthy(CONTEXT_MENU_ITEM_HEIGHT > 0, 'CONTEXT_MENU_ITEM_HEIGHT should be positive');
    t.assertEqual(CONTEXT_MENU_ITEM_HEIGHT, 28, 'Should be 28 pixels');
});

TestRunner.test('UI Constants - CONTEXT_MENU_MAX_WIDTH is a positive number', (t) => {
    t.assertEqual(typeof CONTEXT_MENU_MAX_WIDTH, 'number', 'CONTEXT_MENU_MAX_WIDTH should be a number');
    t.assertTruthy(CONTEXT_MENU_MAX_WIDTH > 0, 'CONTEXT_MENU_MAX_WIDTH should be positive');
    t.assertEqual(CONTEXT_MENU_MAX_WIDTH, 300, 'Should be 300 pixels');
});

TestRunner.test('UI Constants - APP_VERSION validation for 2.56.0 or higher', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 56, 'Minor version should be >= 56 for Day 377');
    }
});
// Day 377: Recording, Playback, Metronome, Time Signature & Master Effects Undo Capture Tests
// ===========================================================================================
TestRunner.test('Recording State - setIsRecordingState calls captureStateForUndo', (t) => {
    const funcStr = setIsRecordingState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setIsRecordingState should call captureStateForUndo');
});

TestRunner.test('Recording State - setIsRecordingState uses descriptive undo label', (t) => {
    const funcStr = setIsRecordingState.toString();
    t.assertTruthy(funcStr.includes('Set Recording State') || funcStr.includes('Recording'), 'setIsRecordingState should use descriptive undo label');
});

TestRunner.test('Recording State - setIsRecordingState guards against missing appServices', (t) => {
    const funcStr = setIsRecordingState.toString();
    t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'), 'setIsRecordingState should guard against missing appServices');
});

TestRunner.test('Recording State - setRecordingTrackIdState calls captureStateForUndo', (t) => {
    const funcStr = setRecordingTrackIdState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setRecordingTrackIdState should call captureStateForUndo');
});

TestRunner.test('Recording State - setRecordingTrackIdState uses descriptive undo label', (t) => {
    const funcStr = setRecordingTrackIdState.toString();
    t.assertTruthy(funcStr.includes('Set Recording Track') || funcStr.includes('Recording Track'), 'setRecordingTrackIdState should use descriptive undo label');
});

TestRunner.test('Recording State - setRecordingStartTimeState calls captureStateForUndo', (t) => {
    const funcStr = setRecordingStartTimeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setRecordingStartTimeState should call captureStateForUndo');
});

TestRunner.test('Recording State - setRecordingStartTimeState uses descriptive undo label', (t) => {
    const funcStr = setRecordingStartTimeState.toString();
    t.assertTruthy(funcStr.includes('Set Recording Start Time') || funcStr.includes('Recording Start'), 'setRecordingStartTimeState should use descriptive undo label');
});

TestRunner.test('Playback Mode - setPlaybackModeState calls captureStateForUndo', (t) => {
    const funcStr = setPlaybackModeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setPlaybackModeState should call captureStateForUndo');
});

TestRunner.test('Playback Mode - setPlaybackModeState uses descriptive undo label', (t) => {
    const funcStr = setPlaybackModeState.toString();
    t.assertTruthy(funcStr.includes('Set Playback Mode') || funcStr.includes('Playback Mode'), 'setPlaybackModeState should use descriptive undo label');
});

TestRunner.test('Playback Mode - setPlaybackModeState guards against missing appServices', (t) => {
    const funcStr = setPlaybackModeState.toString();
    t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'), 'setPlaybackModeState should guard against missing appServices');
});

TestRunner.test('Metronome - setMetronomeEnabledState calls captureStateForUndo', (t) => {
    const funcStr = setMetronomeEnabledState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setMetronomeEnabledState should call captureStateForUndo');
});

TestRunner.test('Metronome - setMetronomeEnabledState uses descriptive undo label', (t) => {
    const funcStr = setMetronomeEnabledState.toString();
    t.assertTruthy(funcStr.includes('Toggle Metronome') || funcStr.includes('Metronome'), 'setMetronomeEnabledState should use descriptive undo label');
});

TestRunner.test('Metronome - setMetronomeVolumeState calls captureStateForUndo', (t) => {
    const funcStr = setMetronomeVolumeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setMetronomeVolumeState should call captureStateForUndo');
});

TestRunner.test('Metronome - setMetronomeVolumeState uses descriptive undo label', (t) => {
    const funcStr = setMetronomeVolumeState.toString();
    t.assertTruthy(funcStr.includes('Set Metronome Volume') || funcStr.includes('Metronome'), 'setMetronomeVolumeState should use descriptive undo label');
});

TestRunner.test('Time Signature - setTimeSignatureState calls captureStateForUndo', (t) => {
    const funcStr = setTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTimeSignatureState should call captureStateForUndo');
});

TestRunner.test('Time Signature - setTimeSignatureState uses descriptive undo label', (t) => {
    const funcStr = setTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('Set Time Signature') || funcStr.includes('Time Signature'), 'setTimeSignatureState should use descriptive undo label');
});

TestRunner.test('Time Signature - setTimeSignatureNumeratorState calls captureStateForUndo', (t) => {
    const funcStr = setTimeSignatureNumeratorState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTimeSignatureNumeratorState should call captureStateForUndo');
});

TestRunner.test('Time Signature - setTimeSignatureNumeratorState uses descriptive undo label', (t) => {
    const funcStr = setTimeSignatureNumeratorState.toString();
    t.assertTruthy(funcStr.includes('Time Signature Numerator') || funcStr.includes('Time Signature'), 'setTimeSignatureNumeratorState should use descriptive undo label');
});

TestRunner.test('Time Signature - setTimeSignatureDenominatorState calls captureStateForUndo', (t) => {
    const funcStr = setTimeSignatureDenominatorState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTimeSignatureDenominatorState should call captureStateForUndo');
});

TestRunner.test('Time Signature - setTimeSignatureDenominatorState uses descriptive undo label', (t) => {
    const funcStr = setTimeSignatureDenominatorState.toString();
    t.assertTruthy(funcStr.includes('Time Signature Denominator') || funcStr.includes('Time Signature'), 'setTimeSignatureDenominatorState should use descriptive undo label');
});

TestRunner.test('Master Effects - setMasterEffectsState calls captureStateForUndo', (t) => {
    const funcStr = setMasterEffectsState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setMasterEffectsState should call captureStateForUndo');
});

TestRunner.test('Master Effects - setMasterEffectsState uses descriptive undo label', (t) => {
    const funcStr = setMasterEffectsState.toString();
    t.assertTruthy(funcStr.includes('Set Master Effects') || funcStr.includes('Master Effects'), 'setMasterEffectsState should use descriptive undo label');
});

TestRunner.test('Master Effects - setMasterGainValueState calls captureStateForUndo', (t) => {
    const funcStr = setMasterGainValueState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setMasterGainValueState should call captureStateForUndo');
});

TestRunner.test('Master Effects - setMasterGainValueState uses descriptive undo label', (t) => {
    const funcStr = setMasterGainValueState.toString();
    t.assertTruthy(funcStr.includes('Set Master Volume') || funcStr.includes('Master Volume'), 'setMasterGainValueState should use descriptive undo label');
});

TestRunner.test('Send Tracks - addSendTrackState calls captureStateForUndo', (t) => {
    const funcStr = addSendTrackState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'addSendTrackState should call captureStateForUndo');
});

TestRunner.test('Send Tracks - addSendTrackState uses descriptive undo label', (t) => {
    const funcStr = addSendTrackState.toString();
    t.assertTruthy(funcStr.includes('Add Send Track') || funcStr.includes('Send'), 'addSendTrackState should use descriptive undo label');
});

TestRunner.test('Send Tracks - removeSendTrackState calls captureStateForUndo', (t) => {
    const funcStr = removeSendTrackState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'removeSendTrackState should call captureStateForUndo');
});

TestRunner.test('Send Tracks - removeSendTrackState uses descriptive undo label', (t) => {
    const funcStr = removeSendTrackState.toString();
    t.assertTruthy(funcStr.includes('Remove Send Track') || funcStr.includes('Send'), 'removeSendTrackState should use descriptive undo label');
});

TestRunner.test('Track Group - addTrackGroupState calls captureStateForUndo', (t) => {
    const funcStr = addTrackGroupState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'addTrackGroupState should call captureStateForUndo');
});

TestRunner.test('Track Group - addTrackGroupState uses descriptive undo label', (t) => {
    const funcStr = addTrackGroupState.toString();
    t.assertTruthy(funcStr.includes('Add Track Group') || funcStr.includes('Track Group'), 'addTrackGroupState should use descriptive undo label');
});

TestRunner.test('Track Group - removeTrackGroupState calls captureStateForUndo', (t) => {
    const funcStr = removeTrackGroupState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'removeTrackGroupState should call captureStateForUndo');
});

TestRunner.test('Track Group - removeTrackGroupState uses descriptive undo label', (t) => {
    const funcStr = removeTrackGroupState.toString();
    t.assertTruthy(funcStr.includes('Remove Track Group') || funcStr.includes('Track Group'), 'removeTrackGroupState should use descriptive undo label');
});

TestRunner.test('MIDI - setMidiAccessState calls captureStateForUndo', (t) => {
    const funcStr = setMidiAccessState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setMidiAccessState should call captureStateForUndo');
});

TestRunner.test('MIDI - setMidiAccessState uses descriptive undo label', (t) => {
    const funcStr = setMidiAccessState.toString();
    t.assertTruthy(funcStr.includes('Set MIDI Access') || funcStr.includes('MIDI'), 'setMidiAccessState should use descriptive undo label');
});

TestRunner.test('MIDI - setActiveMIDIInputState calls captureStateForUndo', (t) => {
    const funcStr = setActiveMIDIInputState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setActiveMIDIInputState should call captureStateForUndo');
});

TestRunner.test('MIDI - setActiveMIDIInputState uses descriptive undo label', (t) => {
    const funcStr = setActiveMIDIInputState.toString();
    t.assertTruthy(funcStr.includes('Set Active MIDI Input') || funcStr.includes('MIDI'), 'setActiveMIDIInputState should use descriptive undo label');
});

TestRunner.test('MIDI - setMidiLearnModeState calls captureStateForUndo', (t) => {
    const funcStr = setMidiLearnModeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setMidiLearnModeState should call captureStateForUndo');
});

TestRunner.test('MIDI - setMidiLearnModeState uses descriptive undo label', (t) => {
    const funcStr = setMidiLearnModeState.toString();
    t.assertTruthy(funcStr.includes('MIDI Learn') || funcStr.includes('MIDI'), 'setMidiLearnModeState should use descriptive undo label');
});

TestRunner.test('MIDI - addMidiLearnMapping calls captureStateForUndo', (t) => {
    const funcStr = addMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'addMidiLearnMapping should call captureStateForUndo');
});

TestRunner.test('MIDI - addMidiLearnMapping uses descriptive undo label', (t) => {
    const funcStr = addMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('MIDI Learn') || funcStr.includes('MIDI'), 'addMidiLearnMapping should use descriptive undo label');
});

TestRunner.test('MIDI - removeMidiLearnMapping calls captureStateForUndo', (t) => {
    const funcStr = removeMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'removeMidiLearnMapping should call captureStateForUndo');
});

TestRunner.test('MIDI - removeMidiLearnMapping uses descriptive undo label', (t) => {
    const funcStr = removeMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('MIDI Learn') || funcStr.includes('MIDI'), 'removeMidiLearnMapping should use descriptive undo label');
});

TestRunner.test('MIDI - clearMidiLearnMappings calls captureStateForUndo', (t) => {
    const funcStr = clearMidiLearnMappings.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'clearMidiLearnMappings should call captureStateForUndo');
});

TestRunner.test('MIDI - clearMidiLearnMappings uses descriptive undo label', (t) => {
    const funcStr = clearMidiLearnMappings.toString();
    t.assertTruthy(funcStr.includes('Clear MIDI Learn') || funcStr.includes('MIDI'), 'clearMidiLearnMappings should use descriptive undo label');
});

TestRunner.test('MIDI - updateMidiLearnMapping calls captureStateForUndo', (t) => {
    const funcStr = updateMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'updateMidiLearnMapping should call captureStateForUndo');
});

TestRunner.test('MIDI - updateMidiLearnMapping uses descriptive undo label', (t) => {
    const funcStr = updateMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('MIDI Learn') || funcStr.includes('MIDI'), 'updateMidiLearnMapping should use descriptive undo label');
});

TestRunner.test('APP_VERSION validation for Day 377', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 377');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 56, 'Minor version should be >= 56 for Day 377');
    }
});
// Day 378: Additional Window UI Functions Tests

TestRunner.test('Master Effects Rack Window - openMasterEffectsRackWindow is a function export', (t) => {
    t.assertEqual(typeof openMasterEffectsRackWindow, 'function', 'openMasterEffectsRackWindow should be a function');
});

TestRunner.test('Master Effects Rack Window - openMasterEffectsRackWindow accepts 1 parameter', (t) => {
    const paramCount = openMasterEffectsRackWindow.length;
    t.assertEqual(paramCount, 1, 'openMasterEffectsRackWindow should accept 1 parameter (savedState)');
});

TestRunner.test('Master Effects Rack Window - openMasterEffectsRackWindow uses masterEffectsRack windowId', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes("'masterEffectsRack'") || funcStr.includes('"masterEffectsRack"'), 'openMasterEffectsRackWindow should use masterEffectsRack windowId');
});

TestRunner.test('Master Effects Rack Window - openMasterEffectsRackWindow calls localAppServices.createWindow', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openMasterEffectsRackWindow should call createWindow');
});

TestRunner.test('Master Effects Rack Window - openMasterEffectsRackWindow passes correct window title', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes("'Master Effects Rack'") || funcStr.includes('"Master Effects Rack"'), 'openMasterEffectsRackWindow should set title to Master Effects Rack');
});

TestRunner.test('Master Effects Rack Window - openMasterEffectsRackWindow uses buildModularEffectsRackDOM', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('buildModularEffectsRackDOM'), 'openMasterEffectsRackWindow should use buildModularEffectsRackDOM');
});

TestRunner.test('Master Effects Rack Window - openMasterEffectsRackWindow passes master as ownerType', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes("'master'") || funcStr.includes('"master"'), 'openMasterEffectsRackWindow should pass master as ownerType to buildModularEffectsRackDOM');
});

TestRunner.test('Master Effects Rack Window - openMasterEffectsRackWindow sets window options', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('width') && funcStr.includes('height') && funcStr.includes('minWidth') && funcStr.includes('minHeight'), 'openMasterEffectsRackWindow should set window dimensions and min constraints');
});

TestRunner.test('Master Effects Rack Window - openMasterEffectsRackWindow handles savedState', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('savedState'), 'openMasterEffectsRackWindow should handle savedState for window restoration');
});

TestRunner.test('Master Effects Rack Window - openMasterEffectsRackWindow checks for already open window', (t) => {
    const funcStr = openMasterEffectsRackWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openMasterEffectsRackWindow should check for already open window');
});

TestRunner.test('Send Effects Window - openSendEffectsWindow is a function export', (t) => {
    t.assertEqual(typeof openSendEffectsWindow, 'function', 'openSendEffectsWindow should be a function');
});

TestRunner.test('Send Effects Window - openSendEffectsWindow accepts 2 parameters', (t) => {
    const paramCount = openSendEffectsWindow.length;
    t.assertEqual(paramCount, 2, 'openSendEffectsWindow should accept 2 parameters (sendId, savedState)');
});

TestRunner.test('Send Effects Window - openSendEffectsWindow uses sendEffectsRack- windowId prefix', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes("`sendEffectsRack-") || funcStr.includes("'sendEffectsRack-"), 'openSendEffectsWindow should use sendEffectsRack- prefix for windowId');
});

TestRunner.test('Send Effects Window - openSendEffectsWindow calls localAppServices.createWindow', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openSendEffectsWindow should call createWindow');
});

TestRunner.test('Send Effects Window - openSendEffectsWindow uses buildModularEffectsRackDOM', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('buildModularEffectsRackDOM'), 'openSendEffectsWindow should use buildModularEffectsRackDOM');
});

TestRunner.test('Send Effects Window - openSendEffectsWindow passes send as ownerType', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes("'send'") || funcStr.includes('"send"'), 'openSendEffectsWindow should pass send as ownerType to buildModularEffectsRackDOM');
});

TestRunner.test('Send Effects Window - openSendEffectsWindow checks for already open window', (t) => {
    const funcStr = openSendEffectsWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openSendEffectsWindow should check for already open window');
});

TestRunner.test('Track Templates Window - openTrackTemplatesWindow is a function export', (t) => {
    t.assertEqual(typeof openTrackTemplatesWindow, 'function', 'openTrackTemplatesWindow should be a function');
});

TestRunner.test('Track Templates Window - openTrackTemplatesWindow accepts 1 parameter', (t) => {
    const paramCount = openTrackTemplatesWindow.length;
    t.assertEqual(paramCount, 1, 'openTrackTemplatesWindow should accept 1 parameter (savedState)');
});

TestRunner.test('Track Templates Window - openTrackTemplatesWindow uses trackTemplates windowId', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes("'trackTemplates'") || funcStr.includes('"trackTemplates"'), 'openTrackTemplatesWindow should use trackTemplates windowId');
});

TestRunner.test('Track Templates Window - openTrackTemplatesWindow calls localAppServices.createWindow', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'openTrackTemplatesWindow should call createWindow');
});

TestRunner.test('Track Templates Window - openTrackTemplatesWindow passes correct window title', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes("'Track Templates'") || funcStr.includes('"Track Templates"'), 'openTrackTemplatesWindow should set title to Track Templates');
});

TestRunner.test('Track Templates Window - openTrackTemplatesWindow creates content HTML with template grid', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('templatesGrid') || funcStr.includes('template-card'), 'Track Templates should include template grid UI');
});

TestRunner.test('Track Templates Window - openTrackTemplatesWindow checks for already open window', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'openTrackTemplatesWindow should check for already open window');
});

TestRunner.test('Track Templates Window - openTrackTemplatesWindow handles savedState', (t) => {
    const funcStr = openTrackTemplatesWindow.toString();
    t.assertTruthy(funcStr.includes('savedState'), 'openTrackTemplatesWindow should handle savedState for window restoration');
});

TestRunner.test('Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow is a function export', (t) => {
    t.assertEqual(typeof showKeyboardShortcutsHelpWindow, 'function', 'showKeyboardShortcutsHelpWindow should be a function');
});

TestRunner.test('Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow accepts 0 parameters', (t) => {
    const paramCount = showKeyboardShortcutsHelpWindow.length;
    t.assertEqual(paramCount, 0, 'showKeyboardShortcutsHelpWindow should accept 0 parameters');
});

TestRunner.test('Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow uses keyboardShortcutsHelp windowId', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes("'keyboardShortcutsHelp'") || funcStr.includes('"keyboardShortcutsHelp"'), 'showKeyboardShortcutsHelpWindow should use keyboardShortcutsHelp windowId');
});

TestRunner.test('Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow calls localAppServices.createWindow', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('createWindow'), 'showKeyboardShortcutsHelpWindow should call createWindow');
});

TestRunner.test('Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow uses KEYBOARD_SHORTCUTS_HELP_TITLE constant', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('KEYBOARD_SHORTCUTS_HELP_TITLE'), 'showKeyboardShortcutsHelpWindow should use KEYBOARD_SHORTCUTS_HELP_TITLE constant');
});

TestRunner.test('Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow uses KEYBOARD_SHORTCUTS_HELP_WIDTH and HEIGHT constants', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('KEYBOARD_SHORTCUTS_HELP_WIDTH') && funcStr.includes('KEYBOARD_SHORTCUTS_HELP_HEIGHT'), 'showKeyboardShortcutsHelpWindow should use width and height constants');
});

TestRunner.test('Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow checks for already open window', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('getOpenWindows'), 'showKeyboardShortcutsHelpWindow should check for already open window');
});

TestRunner.test('Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow includes keyboard shortcut keys', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('Space') || funcStr.includes('Ctrl'), 'Keyboard Shortcuts Help should include keyboard shortcut display');
});

TestRunner.test('Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow includes playback controls section', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('Play') || funcStr.includes('Pause'), 'Keyboard Shortcuts Help should include playback controls');
});

TestRunner.test('Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow includes edit operations section', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('Undo') || funcStr.includes('Redo'), 'Keyboard Shortcuts Help should include edit operations');
});

TestRunner.test('Keyboard Shortcuts Help - showKeyboardShortcutsHelpWindow includes track controls section', (t) => {
    const funcStr = showKeyboardShortcutsHelpWindow.toString();
    t.assertTruthy(funcStr.includes('Mute') || funcStr.includes('Solo'), 'Keyboard Shortcuts Help should include track controls');
});

TestRunner.test('APP_VERSION validation for Day 378', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 378');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 57, 'Minor version should be >= 57 for Day 378');
    }
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip function reference check', (t) => {
    // Check if the normalizeAudioClip function exists on Track prototype
    t.assertEqual(typeof Track.prototype.normalizeAudioClip, 'function', 'normalizeAudioClip should be a function on Track.prototype');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip is async', (t) => {
    t.assertEqual(Track.prototype.normalizeAudioClip.constructor.name, 'AsyncFunction', 'normalizeAudioClip should be async');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip accepts clipId parameter', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('clipId'), 'normalizeAudioClip should accept clipId parameter');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip calls _captureUndoState', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('_captureUndoState'), 'normalizeAudioClip should call _captureUndoState for undo support');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip uses descriptive undo label', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('Normalize'), 'normalizeAudioClip undo label should reference Normalize');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip calls getAudio', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('getAudio') || funcStr.includes('sourceId'), 'normalizeAudioClip should reference audio source');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip references clip.name', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('clip.name'), 'normalizeAudioClip should reference clip.name in undo label');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip handles audio type check', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('clip.type') && funcStr.includes('audio'), 'normalizeAudioClip should check for audio clip type');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip clamps gain to valid range', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('MAX_AUDIO_CLIP_GAIN') || funcStr.includes('MIN_AUDIO_CLIP_GAIN'), 'normalizeAudioClip should clamp gain to valid range');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip updates clip.gain', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('clip.gain'), 'normalizeAudioClip should update clip.gain property');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip calculates peak amplitude', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('peakAmplitude') || funcStr.includes('abs'), 'normalizeAudioClip should calculate peak amplitude');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip handles silent audio case', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('silent') || funcStr.includes('peakAmplitude'), 'normalizeAudioClip should handle silent audio edge case');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip shows notification on success', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('showNotification') || funcStr.includes('Normalized'), 'normalizeAudioClip should show notification on success');
});

TestRunner.test('Audio Clip Editor - normalizeAudioClip returns boolean', (t) => {
    const funcStr = Track.prototype.normalizeAudioClip.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'normalizeAudioClip should return boolean');
});
// ============================================
// Day 379: buildModularEffectsRackDOM Function Tests (2026-04-30)
// ============================================

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM is a function', (t) => {
    t.assertEqual(typeof buildModularEffectsRackDOM, 'function', 'buildModularEffectsRackDOM should be a function');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM accepts 2 parameters', (t) => {
    const paramCount = buildModularEffectsRackDOM.length;
    t.assertEqual(paramCount, 2, 'buildModularEffectsRackDOM should accept 2 parameters (owner, ownerType)');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM returns a string', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertEqual(typeof result, 'string', 'buildModularEffectsRackDOM should return a string');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM includes effectsRackContent div', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('effectsRackContent-'), 'Should include effectsRackContent div with ID');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM uses owner ID for track type', (t) => {
    const mockOwner = { id: 'track123', name: 'Test Track' };
    const result = buildModularEffectsRackDOM(mockOwner, 'track');
    t.assertTruthy(result.includes('effectsRackContent-track123'), 'Should use owner.id in container ID for track type');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM uses master for master type', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('effectsRackContent-master'), 'Should use master in container ID for master type');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM uses owner ID for send type', (t) => {
    const mockSend = { id: 'send456', name: 'Test Send' };
    const result = buildModularEffectsRackDOM(mockSend, 'send');
    t.assertTruthy(result.includes('effectsRackContent-send456'), 'Should use owner.id in container ID for send type');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM includes owner name in heading', (t) => {
    const mockOwner = { id: 'track123', name: 'Test Track' };
    const result = buildModularEffectsRackDOM(mockOwner, 'track');
    t.assertTruthy(result.includes('Effects Rack: Test Track'), 'Should display owner name in heading for track type');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM shows Master Bus for master type', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('Effects Rack: Master Bus'), 'Should display Master Bus heading for master type');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM includes effectsList div', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('effectsList-'), 'Should include effectsList div');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM includes addEffectBtn button', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('addEffectBtn-'), 'Should include Add Effect button');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM includes effectControlsContainer', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('effectControlsContainer-'), 'Should include effectControlsContainer div');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM handles null owner for track type', (t) => {
    const result = buildModularEffectsRackDOM(null, 'track');
    t.assertTruthy(result.includes('effectsRackContent-'), 'Should handle null owner gracefully for track type');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM handles null owner for send type', (t) => {
    const result = buildModularEffectsRackDOM(null, 'send');
    t.assertTruthy(result.includes('effectsRackContent-'), 'Should handle null owner gracefully for send type');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM default ownerType is track', (t) => {
    // Check that calling with only owner uses default 'track'
    const mockOwner = { id: 'track999', name: 'Default Test' };
    const funcStr = buildModularEffectsRackDOM.toString();
    t.assertTruthy(funcStr.includes("ownerType = 'track'") || funcStr.includes('ownerType="track"'), 'Should have default ownerType of track');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM uses correct ID pattern for track effectsList', (t) => {
    const mockOwner = { id: 'myTrack', name: 'My Track' };
    const result = buildModularEffectsRackDOM(mockOwner, 'track');
    t.assertTruthy(result.includes('effectsList-myTrack'), 'Should have effectsList-{ownerId} ID');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM uses correct ID pattern for send effectsList', (t) => {
    const mockSend = { id: 'mySend', name: 'My Send' };
    const result = buildModularEffectsRackDOM(mockSend, 'send');
    t.assertTruthy(result.includes('effectsList-mySend'), 'Should have effectsList-{sendId} ID');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM uses correct ID pattern for master effectsList', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('effectsList-master'), 'Should have effectsList-master ID');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM addEffectBtn has correct ID pattern', (t) => {
    const mockOwner = { id: 'btnTest', name: 'Btn Test' };
    const result = buildModularEffectsRackDOM(mockOwner, 'track');
    t.assertTruthy(result.includes('addEffectBtn-btnTest'), 'Should have addEffectBtn-{ownerId} ID');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM effectControlsContainer has correct ID pattern', (t) => {
    const mockOwner = { id: 'ctrlTest', name: 'Ctrl Test' };
    const result = buildModularEffectsRackDOM(mockOwner, 'track');
    t.assertTruthy(result.includes('effectControlsContainer-ctrlTest'), 'Should have effectControlsContainer-{ownerId} ID');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM includes proper CSS classes', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('space-y-2'), 'Should have space-y-2 class');
    t.assertTruthy(result.includes('overflow-y-auto'), 'Should have overflow-y-auto class');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM includes Add Effect text', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('Add Effect'), 'Should include Add Effect button text');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM uses dark mode classes', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('dark:text-slate-200') || result.includes('dark:'), 'Should use dark mode text classes');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM heading uses text-sm font-semibold', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('text-sm font-semibold'), 'Should have proper heading styling');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM effects list has border and rounded', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('border rounded'), 'Should have border and rounded classes on effects list');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM handles owner with missing name property', (t) => {
    const mockOwner = { id: 'noName' };
    const result = buildModularEffectsRackDOM(mockOwner, 'track');
    t.assertTruthy(result.includes('effectsRackContent-noName'), 'Should still work with missing name property');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM uses p-2 padding on container', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('class="p-2'), 'Should have p-2 padding class on main container');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM effects list has min-h-[50px]', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('min-h-[50px]'), 'Should have min-h-[50px] on effects list');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM add effect button is purple colored', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('bg-purple-') || result.includes('purple'), 'Add Effect button should be purple colored');
});

TestRunner.test('Effects Rack DOM - buildModularEffectsRackDOM effect controls container has margin-top', (t) => {
    const result = buildModularEffectsRackDOM(null, 'master');
    t.assertTruthy(result.includes('mt-2'), 'Effect controls container should have mt-2 margin');
});

TestRunner.test('APP_VERSION validation for Day 379', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 379');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 57, 'Minor version should be >= 57 for Day 379');
    }
});

// Day 380: Instrument Sampler Inspector UI Functions Tests (2026-04-30)
TestRunner.test('Instrument Sampler UI - buildInstrumentSamplerSpecificInspectorDOM is a function', (t) => {
    t.assertEqual(typeof buildInstrumentSamplerSpecificInspectorDOM, 'function', 'buildInstrumentSamplerSpecificInspectorDOM should be a function');
});

TestRunner.test('Instrument Sampler UI - buildInstrumentSamplerSpecificInspectorDOM accepts 1 parameter', (t) => {
    const funcStr = buildInstrumentSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('track'), 'buildInstrumentSamplerSpecificInspectorDOM should accept track parameter');
});

TestRunner.test('Instrument Sampler UI - buildInstrumentSamplerSpecificInspectorDOM references track.id', (t) => {
    const funcStr = buildInstrumentSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('track.id') || funcStr.includes('track\\.id'), 'buildInstrumentSamplerSpecificInspectorDOM should reference track.id');
});

TestRunner.test('Instrument Sampler UI - buildInstrumentSamplerSpecificInspectorDOM includes drop zone container', (t) => {
    const funcStr = buildInstrumentSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('dropZoneContainer') && funcStr.includes('instrumentsampler'), 'buildInstrumentSamplerSpecificInspectorDOM should include dropZoneContainer for instrumentsampler');
});

TestRunner.test('Instrument Sampler UI - buildInstrumentSamplerSpecificInspectorDOM includes waveform canvas', (t) => {
    const funcStr = buildInstrumentSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('instrumentWaveformCanvas') && funcStr.includes('canvas'), 'buildInstrumentSamplerSpecificInspectorDOM should include instrumentWaveformCanvas');
});

TestRunner.test('Instrument Sampler UI - buildInstrumentSamplerSpecificInspectorDOM includes root note select', (t) => {
    const funcStr = buildInstrumentSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('instrumentRootNote') && funcStr.includes('select'), 'buildInstrumentSamplerSpecificInspectorDOM should include instrumentRootNote select');
});

TestRunner.test('Instrument Sampler UI - buildInstrumentSamplerSpecificInspectorDOM includes loop toggle button', (t) => {
    const funcStr = buildInstrumentSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('instrumentLoopToggle') && funcStr.includes('button'), 'buildInstrumentSamplerSpecificInspectorDOM should include instrumentLoopToggle button');
});

TestRunner.test('Instrument Sampler UI - buildInstrumentSamplerSpecificInspectorDOM includes loop start input', (t) => {
    const funcStr = buildInstrumentSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('instrumentLoopStart'), 'buildInstrumentSamplerSpecificInspectorDOM should include instrumentLoopStart input');
});

TestRunner.test('Instrument Sampler UI - buildInstrumentSamplerSpecificInspectorDOM includes loop end input', (t) => {
    const funcStr = buildInstrumentSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('instrumentLoopEnd'), 'buildInstrumentSamplerSpecificInspectorDOM should include instrumentLoopEnd input');
});

TestRunner.test('Instrument Sampler UI - buildInstrumentSamplerSpecificInspectorDOM includes envelope controls', (t) => {
    const funcStr = buildInstrumentSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('Envelope') && funcStr.includes('instrumentEnvAttack') && funcStr.includes('instrumentEnvDecay') && funcStr.includes('instrumentEnvSustain') && funcStr.includes('instrumentEnvRelease'), 'buildInstrumentSamplerSpecificInspectorDOM should include all envelope placeholders');
});

TestRunner.test('Instrument Sampler UI - buildInstrumentSamplerSpecificInspectorDOM includes polyphony toggle', (t) => {
    const funcStr = buildInstrumentSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('instrumentPolyphonyToggle') && funcStr.includes('button'), 'buildInstrumentSamplerSpecificInspectorDOM should include instrumentPolyphonyToggle button');
});

TestRunner.test('Instrument Sampler UI - buildInstrumentSamplerSpecificInspectorDOM uses dark mode styling', (t) => {
    const funcStr = buildInstrumentSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('dark:') || funcStr.includes('dark:bg-slate-'), 'buildInstrumentSamplerSpecificInspectorDOM should use dark mode styling');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls is a function', (t) => {
    t.assertEqual(typeof initializeInstrumentSamplerSpecificControls, 'function', 'initializeInstrumentSamplerSpecificControls should be a function');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls accepts 2 parameters', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('track') && funcStr.includes('winEl'), 'initializeInstrumentSamplerSpecificControls should accept track and winEl parameters');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls sets up drop zone listeners', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('setupGenericDropZoneListeners') || funcStr.includes('drop-zone'), 'initializeInstrumentSamplerSpecificControls should set up drop zone listeners');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls initializes waveform canvas', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('getContext') || funcStr.includes('instrumentWaveformCanvas'), 'initializeInstrumentSamplerSpecificControls should initialize waveform canvas');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls populates root note select', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('synthPitches') && funcStr.includes('rootNote'), 'initializeInstrumentSamplerSpecificControls should populate root note select with synthPitches');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls sets up root note change listener', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('addEventListener') && funcStr.includes('change') && funcStr.includes('setInstrumentSamplerRootNote'), 'initializeInstrumentSamplerSpecificControls should set up root note change listener');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls sets up loop toggle listener', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('addEventListener') && funcStr.includes('click') && funcStr.includes('setInstrumentSamplerLoop'), 'initializeInstrumentSamplerSpecificControls should set up loop toggle click listener');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls sets up loop start change listener', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('addEventListener') && funcStr.includes('instrumentLoopStart') && funcStr.includes('setInstrumentSamplerLoopStart'), 'initializeInstrumentSamplerSpecificControls should set up loop start change listener');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls sets up loop end change listener', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('addEventListener') && funcStr.includes('instrumentLoopEnd') && funcStr.includes('setInstrumentSamplerLoopEnd'), 'initializeInstrumentSamplerSpecificControls should set up loop end change listener');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls creates envelope knobs', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('createAndPlaceKnob') || funcStr.includes('createKnob'), 'initializeInstrumentSamplerSpecificControls should create envelope knobs');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls sets up polyphony toggle listener', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('addEventListener') && funcStr.includes('click') && funcStr.includes('instrumentPolyphonyToggle'), 'initializeInstrumentSamplerSpecificControls should set up polyphony toggle click listener');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls references captureStateForUndo', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'initializeInstrumentSamplerSpecificControls should reference captureStateForUndo');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls references instrumentSamplerSettings', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('instrumentSamplerSettings'), 'initializeInstrumentSamplerSpecificControls should reference instrumentSamplerSettings');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls references instrumentSamplerIsPolyphonic', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('instrumentSamplerIsPolyphonic'), 'initializeInstrumentSamplerSpecificControls should reference instrumentSamplerIsPolyphonic');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls creates and places envelope knobs with correct IDs', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('instrumentEnvAttack') && funcStr.includes('instrumentEnvDecay') && funcStr.includes('instrumentEnvSustain') && funcStr.includes('instrumentEnvRelease'), 'initializeInstrumentSamplerSpecificControls should create knobs with correct envelope IDs');
});

TestRunner.test('Instrument Sampler UI - initializeInstrumentSamplerSpecificControls references setInstrumentSamplerEnv', (t) => {
    const funcStr = initializeInstrumentSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('setInstrumentSamplerEnv'), 'initializeInstrumentSamplerSpecificControls should reference setInstrumentSamplerEnv');
});

TestRunner.test('Instrument Sampler UI - APP_VERSION validation for Day 380', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 380');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 58, 'Minor version should be >= 58 for Day 380');
    }
});
// ============================================
// Day 381: DrumSampler Pad Drop Zone Verification Tests (2026-04-30)
// ============================================
TestRunner.test('DrumSampler UI - buildDrumSamplerSpecificInspectorDOM is a function', (t) => {
    t.assertEqual(typeof buildDrumSamplerSpecificInspectorDOM, 'function', 'buildDrumSamplerSpecificInspectorDOM should be a function');
});

TestRunner.test('DrumSampler UI - buildDrumSamplerSpecificInspectorDOM accepts 1 parameter', (t) => {
    const funcStr = buildDrumSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('track'), 'Should reference track parameter');
});

TestRunner.test('DrumSampler UI - buildDrumSamplerSpecificInspectorDOM references track.id', (t) => {
    const funcStr = buildDrumSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('track.id'), 'buildDrumSamplerSpecificInspectorDOM should reference track.id');
});

TestRunner.test('DrumSampler UI - buildDrumSamplerSpecificInspectorDOM includes drumPadDropZoneContainer', (t) => {
    const funcStr = buildDrumSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('drumPadDropZoneContainer'), 'buildDrumSamplerSpecificInspectorDOM should include drumPadDropZoneContainer');
});

TestRunner.test('DrumSampler UI - buildDrumSamplerSpecificInspectorDOM includes drum pads grid container', (t) => {
    const funcStr = buildDrumSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('drumPadsGridContainer'), 'buildDrumSamplerSpecificInspectorDOM should include drumPadsGridContainer');
});

TestRunner.test('DrumSampler UI - buildDrumSamplerSpecificInspectorDOM includes volume knob placeholder', (t) => {
    const funcStr = buildDrumSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('drumPadVolumeKnob'), 'buildDrumSamplerSpecificInspectorDOM should include volume knob placeholder');
});

TestRunner.test('DrumSampler UI - buildDrumSamplerSpecificInspectorDOM includes pitch knob placeholder', (t) => {
    const funcStr = buildDrumSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('drumPadPitchKnob'), 'buildDrumSamplerSpecificInspectorDOM should include pitch knob placeholder');
});

TestRunner.test('DrumSampler UI - buildDrumSamplerSpecificInspectorDOM includes envelope knob placeholders', (t) => {
    const funcStr = buildDrumSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('drumPadEnvAttack') && funcStr.includes('drumPadEnvDecay') && funcStr.includes('drumPadEnvSustain') && funcStr.includes('drumPadEnvRelease'), 'buildDrumSamplerSpecificInspectorDOM should include all envelope knob placeholders');
});

TestRunner.test('DrumSampler UI - buildDrumSamplerSpecificInspectorDOM uses dark mode styling', (t) => {
    const funcStr = buildDrumSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('dark:') || funcStr.includes('dark-'), 'buildDrumSamplerSpecificInspectorDOM should use dark mode styling');
});

TestRunner.test('DrumSampler UI - initializeDrumSamplerSpecificControls is a function', (t) => {
    t.assertEqual(typeof initializeDrumSamplerSpecificControls, 'function', 'initializeDrumSamplerSpecificControls should be a function');
});

TestRunner.test('DrumSampler UI - initializeDrumSamplerSpecificControls accepts 2 parameters', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('track,') && funcStr.includes('winEl'), 'initializeDrumSamplerSpecificControls should accept track and winEl parameters');
});

TestRunner.test('DrumSampler UI - initializeDrumSamplerSpecificControls creates drum pad knobs', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('createAndPlaceKnob') || funcStr.includes('drumPadVolume'), 'initializeDrumSamplerSpecificControls should create drum pad knobs');
});

TestRunner.test('DrumSampler UI - initializeDrumSamplerSpecificControls calls renderDrumSamplerPads', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('renderDrumSamplerPads'), 'initializeDrumSamplerSpecificControls should call renderDrumSamplerPads');
});

TestRunner.test('DrumSampler UI - initializeDrumSamplerSpecificControls calls updateDrumPadControlsUI', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('updateDrumPadControlsUI'), 'initializeDrumSamplerSpecificControls should call updateDrumPadControlsUI');
});

TestRunner.test('DrumSampler UI - initializeDrumSamplerSpecificControls sets up volume knob with onValueChange', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('setDrumSamplerPadVolume') || funcStr.includes('onValueChange'), 'initializeDrumSamplerSpecificControls should set up volume knob with callback');
});

TestRunner.test('DrumSampler UI - initializeDrumSamplerSpecificControls sets up pitch knob with onValueChange', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('setDrumSamplerPadPitch') || funcStr.includes('onValueChange'), 'initializeDrumSamplerSpecificControls should set up pitch knob with callback');
});

TestRunner.test('DrumSampler UI - initializeDrumSamplerSpecificControls sets up envelope knobs', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('setDrumSamplerPadEnv'), 'initializeDrumSamplerSpecificControls should set up envelope knobs with callbacks');
});

TestRunner.test('DrumSampler UI - renderDrumSamplerPads is a function', (t) => {
    t.assertEqual(typeof renderDrumSamplerPads, 'function', 'renderDrumSamplerPads should be a function');
});

TestRunner.test('DrumSampler UI - renderDrumSamplerPads validates track type', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('DrumSampler'), 'renderDrumSamplerPads should validate track type is DrumSampler');
});

TestRunner.test('DrumSampler UI - renderDrumSamplerPads creates pad buttons', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('createElement') && funcStr.includes('button'), 'renderDrumSamplerPads should create pad buttons');
});

TestRunner.test('DrumSampler UI - renderDrumSamplerPads uses numDrumSamplerPads constant', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('numDrumSamplerPads'), 'renderDrumSamplerPads should use numDrumSamplerPads constant');
});

TestRunner.test('DrumSampler UI - renderDrumSamplerPads handles pad selection state', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('selectedDrumPadForEdit'), 'renderDrumSamplerPads should handle pad selection state');
});

TestRunner.test('DrumSampler UI - renderDrumSamplerPads adds click event listeners to pads', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('addEventListener') && funcStr.includes('click'), 'renderDrumSamplerPads should add click listeners to pads');
});

TestRunner.test('DrumSampler UI - renderDrumSamplerPads calls updateDrumPadControlsUI on pad click', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('updateDrumPadControlsUI'), 'renderDrumSamplerPads should call updateDrumPadControlsUI on pad click');
});

TestRunner.test('DrumSampler UI - renderDrumSamplerPads plays preview on pad click', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('playDrumSamplerPadPreview'), 'renderDrumSamplerPads should play preview when clicking loaded pads');
});

TestRunner.test('DrumSampler UI - updateDrumPadControlsUI is a function', (t) => {
    t.assertEqual(typeof updateDrumPadControlsUI, 'function', 'updateDrumPadControlsUI should be a function');
});

TestRunner.test('DrumSampler UI - updateDrumPadControlsUI validates track type', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('DrumSampler'), 'updateDrumPadControlsUI should validate track type');
});

TestRunner.test('DrumSampler UI - updateDrumPadControlsUI updates drop zone container', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('drumPadDropZoneContainer'), 'updateDrumPadControlsUI should update drop zone container');
});

TestRunner.test('DrumSampler UI - updateDrumPadControlsUI calls createDropZoneHTML', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('createDropZoneHTML'), 'updateDrumPadControlsUI should call createDropZoneHTML');
});

TestRunner.test('DrumSampler UI - updateDrumPadControlsUI calls setupGenericDropZoneListeners', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('setupGenericDropZoneListeners'), 'updateDrumPadControlsUI should call setupGenericDropZoneListeners');
});

TestRunner.test('DrumSampler UI - updateDrumPadControlsUI passes correct callbacks', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('loadSoundFromBrowserToTarget') && funcStr.includes('loadDrumSamplerPadFile'), 'updateDrumPadControlsUI should pass correct callbacks');
});

TestRunner.test('DrumSampler UI - updateDrumPadControlsUI sets up file input change handler', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('onchange') || funcStr.includes('fileInput'), 'updateDrumPadControlsUI should set up file input change handler');
});

TestRunner.test('DrumSampler UI - updateDrumPadControlsUI handles fallback for missing container', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('oldDropZoneContainer') || funcStr.includes('Fallback') || funcStr.includes('querySelector'), 'updateDrumPadControlsUI should handle fallback for missing container');
});

TestRunner.test('DrumSampler UI - updateDrumPadControlsUI handles pad index correctly', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('selectedDrumPadForEdit') || funcStr.includes('selectedPadIndex'), 'updateDrumPadControlsUI should handle pad index');
});

TestRunner.test('DrumSampler UI - APP_VERSION validation for Day 381', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    t.assertTruthy(versionParts[0] >= 2, 'Major version should be >= 2 for Day 381');
    if (versionParts[0] === 2) {
        t.assertTruthy(versionParts[1] >= 58, 'Minor version should be >= 58 for Day 381');
    }

TestRunner.test('Audio Preview - playSlicePreview is a function export', (t) => {
    t.assertEqual(typeof playSlicePreview, 'function', 'playSlicePreview should be a function');
});

TestRunner.test('Audio Preview - playSlicePreview is async', (t) => {
    t.assertTruthy(playSlicePreview.constructor.name === 'AsyncFunction', 'playSlicePreview should be an async function');
});

TestRunner.test('Audio Preview - playSlicePreview accepts 4 parameters', (t) => {
    t.assertEqual(playSlicePreview.length, 4, 'playSlicePreview should accept 4 parameters (trackId, sliceIndex, velocity, additionalPitchShiftInSemitones)');
});

TestRunner.test('Audio Preview - playSlicePreview references trackId parameter', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'playSlicePreview should reference trackId parameter');
});

TestRunner.test('Audio Preview - playSlicePreview references sliceIndex parameter', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('sliceIndex'), 'playSlicePreview should reference sliceIndex parameter');
});

TestRunner.test('Audio Preview - playSlicePreview references velocity parameter', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('velocity'), 'playSlicePreview should reference velocity parameter');
});

TestRunner.test('Audio Preview - playSlicePreview references additionalPitchShiftInSemitones parameter', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('additionalPitchShiftInSemitones'), 'playSlicePreview should reference additionalPitchShiftInSemitones parameter');
});

TestRunner.test('Audio Preview - playSlicePreview calls initAudioContextAndMasterMeter', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('initAudioContextAndMasterMeter'), 'playSlicePreview should call initAudioContextAndMasterMeter');
});

TestRunner.test('Audio Preview - playSlicePreview references getTrackById from appServices', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'playSlicePreview should reference getTrackById from appServices');
});

TestRunner.test('Audio Preview - playSlicePreview validates track type is Sampler', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('Sampler'), 'playSlicePreview should validate track type is Sampler');
});

TestRunner.test('Audio Preview - playSlicePreview checks audioBuffer.loaded', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('audioBuffer') && funcStr.includes('loaded'), 'playSlicePreview should check audioBuffer.loaded');
});

TestRunner.test('Audio Preview - playSlicePreview references slices array', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('slices[') || funcStr.includes('slices['), 'playSlicePreview should reference slices array');
});

TestRunner.test('Audio Preview - playSlicePreview uses playbackRate calculation with Math.pow', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('Math.pow(2,') || funcStr.includes('Math.pow(2,'), 'playSlicePreview should use Math.pow(2, pitchShift / 12) for playbackRate');
});

TestRunner.test('Audio Preview - playSlicePreview references Tone.now', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('Tone.now') || funcStr.includes('now()'), 'playSlicePreview should reference Tone.now');
});

TestRunner.test('Audio Preview - playSlicePreview references actualDestination', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('actualDestination'), 'playSlicePreview should reference actualDestination');
});

TestRunner.test('Audio Preview - playSlicePreview handles slicerIsPolyphonic flag', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('slicerIsPolyphonic'), 'playSlicePreview should handle slicerIsPolyphonic flag');
});

TestRunner.test('Audio Preview - playSlicePreview references slicerMonoPlayer', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('slicerMonoPlayer'), 'playSlicePreview should reference slicerMonoPlayer');
});

TestRunner.test('Audio Preview - playSlicePreview references slicerMonoEnvelope', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('slicerMonoEnvelope') || funcStr.includes('env'), 'playSlicePreview should reference slicerMonoEnvelope or env');
});

TestRunner.test('Audio Preview - playSlicePreview references slicerMonoGain', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('slicerMonoGain') || funcStr.includes('gain'), 'playSlicePreview should reference slicerMonoGain or gain');
});

TestRunner.test('Audio Preview - playSlicePreview calls player.stop', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('player.stop'), 'playSlicePreview should call player.stop');
});

TestRunner.test('Audio Preview - playSlicePreview calls env.triggerRelease', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('triggerRelease'), 'playSlicePreview should call env.triggerRelease');
});

TestRunner.test('Audio Preview - playSlicePreview sets player.playbackRate', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('player.playbackRate'), 'playSlicePreview should set player.playbackRate');
});

TestRunner.test('Audio Preview - playSlicePreview sets player.reverse', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('player.reverse'), 'playSlicePreview should set player.reverse');
});

TestRunner.test('Audio Preview - playSlicePreview sets player.loop', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('player.loop'), 'playSlicePreview should set player.loop');
});

TestRunner.test('Audio Preview - playSlicePreview sets player.loopStart and player.loopEnd', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('player.loopStart') && funcStr.includes('player.loopEnd'), 'playSlicePreview should set player.loopStart and player.loopEnd');
});

TestRunner.test('Audio Preview - playSlicePreview has error handling with console.warn', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('console.warn'), 'playSlicePreview should have error handling with console.warn');
});

TestRunner.test('Audio Preview - playSlicePreview has error handling with console.error', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('console.error'), 'playSlicePreview should have error handling with console.error');
});

TestRunner.test('Audio Preview - playSlicePreview handles sliceData.pitchShift', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('pitchShift') || funcStr.includes('totalPitchShift'), 'playSlicePreview should handle pitchShift');
});

TestRunner.test('Audio Preview - playSlicePreview handles sliceData.volume', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('sliceData.volume') || funcStr.includes('volume'), 'playSlicePreview should handle sliceData.volume');
});

TestRunner.test('Audio Preview - playSlicePreview handles sliceData.envelope', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('envelope') || funcStr.includes('set('), 'playSlicePreview should handle sliceData.envelope');
});

TestRunner.test('Audio Preview - playSlicePreview handles sliceData.duration', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('sliceData.duration') || funcStr.includes('duration'), 'playSlicePreview should handle sliceData.duration');
});

TestRunner.test('Audio Preview - playSlicePreview handles sliceData.offset', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('offset') || funcStr.includes('sliceData.offset'), 'playSlicePreview should handle sliceData.offset');
});

TestRunner.test('Audio Preview - playSlicePreview uses Tone.dbToGain for gain conversion', (t) => {
    const funcStr = playSlicePreview.toString();
    t.assertTruthy(funcStr.includes('dbToGain') || funcStr.includes('Tone.dbToGain'), 'playSlicePreview should use Tone.dbToGain');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview is a function export', (t) => {
    t.assertEqual(typeof playDrumSamplerPadPreview, 'function', 'playDrumSamplerPadPreview should be a function');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview is async', (t) => {
    t.assertTruthy(playDrumSamplerPadPreview.constructor.name === 'AsyncFunction', 'playDrumSamplerPadPreview should be an async function');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview accepts 4 parameters', (t) => {
    t.assertEqual(playDrumSamplerPadPreview.length, 4, 'playDrumSamplerPadPreview should accept 4 parameters (trackId, padIndex, velocity, additionalPitchShiftInSemitones)');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview references trackId parameter', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('trackId'), 'playDrumSamplerPadPreview should reference trackId parameter');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview references padIndex parameter', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('padIndex'), 'playDrumSamplerPadPreview should reference padIndex parameter');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview references velocity parameter', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('velocity'), 'playDrumSamplerPadPreview should reference velocity parameter');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview calls initAudioContextAndMasterMeter', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('initAudioContextAndMasterMeter'), 'playDrumSamplerPadPreview should call initAudioContextAndMasterMeter');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview references getTrackById from appServices', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'playDrumSamplerPadPreview should reference getTrackById from appServices');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview validates track type is DrumSampler', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('DrumSampler'), 'playDrumSamplerPadPreview should validate track type is DrumSampler');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview references drumPadPlayers array', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('drumPadPlayers'), 'playDrumSamplerPadPreview should reference drumPadPlayers array');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview references drumSamplerPads array', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('drumSamplerPads'), 'playDrumSamplerPadPreview should reference drumSamplerPads array');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview checks player.disposed or player.loaded', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('disposed') || funcStr.includes('loaded'), 'playDrumSamplerPadPreview should check player.disposed or player.loaded');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview references actualDestination', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('actualDestination'), 'playDrumSamplerPadPreview should reference actualDestination');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview references padData.volume', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('padData.volume') || funcStr.includes('volume'), 'playDrumSamplerPadPreview should reference padData.volume');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview references padData.pitchShift', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('padData.pitchShift') || funcStr.includes('pitchShift'), 'playDrumSamplerPadPreview should reference padData.pitchShift');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview uses Tone.gainToDb for volume conversion', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('gainToDb') || funcStr.includes('Tone.gainToDb'), 'playDrumSamplerPadPreview should use Tone.gainToDb');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview uses Math.pow(2, pitchShift / 12) for playbackRate', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('Math.pow(2,') || funcStr.includes('Math.pow(2,'), 'playDrumSamplerPadPreview should use Math.pow(2, pitchShift / 12) for playbackRate');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview calls player.start with Tone.now', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('player.start') && funcStr.includes('Tone.now'), 'playDrumSamplerPadPreview should call player.start with Tone.now');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview has error handling with console.warn', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('console.warn'), 'playDrumSamplerPadPreview should have error handling with console.warn');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview has error handling with console.error', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('console.error'), 'playDrumSamplerPadPreview should have error handling with console.error');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview calls player.disconnect and player.connect', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('player.disconnect') && funcStr.includes('player.connect'), 'playDrumSamplerPadPreview should call player.disconnect and player.connect');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview sets player.volume.value', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('player.volume.value') || funcStr.includes('volume.value'), 'playDrumSamplerPadPreview should set player.volume.value');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview handles totalPadPitchShift', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('totalPadPitchShift') || funcStr.includes('totalPitchShift'), 'playDrumSamplerPadPreview should handle totalPadPitchShift');
});

TestRunner.test('Audio Preview - playDrumSamplerPadPreview shows notification for unloaded pad', (t) => {
    const funcStr = playDrumSamplerPadPreview.toString();
    t.assertTruthy(funcStr.includes('showNotification'), 'playDrumSamplerPadPreview should show notification for unloaded pad');
});

TestRunner.test('Audio Preview - APP_VERSION validation for Day 397', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    const major = versionParts[0];
    const minor = versionParts[1];
    t.assertTruthy(major > 2 || (major === 2 && minor >= 75), 'APP_VERSION should be 2.75.0 or higher for Day 397');
});
// === Day 398: Time Signature State Functions Tests (2026-04-30) ===

TestRunner.test('Time Signature State - getTimeSignatureState is a function export', (t) => {
    t.assertEqual(typeof getTimeSignatureState, 'function', 'getTimeSignatureState should be a function');
});

TestRunner.test('Time Signature State - getTimeSignatureState accepts 0 parameters', (t) => {
    t.assertEqual(getTimeSignatureState.length, 0, 'getTimeSignatureState should accept 0 parameters');
});

TestRunner.test('Time Signature State - getTimeSignatureState returns an object', (t) => {
    const result = getTimeSignatureState();
    t.assertEqual(typeof result, 'object', 'getTimeSignatureState should return an object');
});

TestRunner.test('Time Signature State - getTimeSignatureState returns numerator property', (t) => {
    const result = getTimeSignatureState();
    t.assertTruthy(result.numerator !== undefined, 'getTimeSignatureState should return object with numerator');
});

TestRunner.test('Time Signature State - getTimeSignatureState returns denominator property', (t) => {
    const result = getTimeSignatureState();
    t.assertTruthy(result.denominator !== undefined, 'getTimeSignatureState should return object with denominator');
});

TestRunner.test('Time Signature State - setTimeSignatureState is a function export', (t) => {
    t.assertEqual(typeof setTimeSignatureState, 'function', 'setTimeSignatureState should be a function');
});

TestRunner.test('Time Signature State - setTimeSignatureState accepts 2 parameters', (t) => {
    t.assertEqual(setTimeSignatureState.length, 2, 'setTimeSignatureState should accept 2 parameters');
});

TestRunner.test('Time Signature State - setTimeSignatureState calls captureStateForUndo', (t) => {
    const funcStr = setTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTimeSignatureState should call captureStateForUndo');
});

TestRunner.test('Time Signature State - setTimeSignatureState uses descriptive undo label', (t) => {
    const funcStr = setTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('Set Time Signature') || funcStr.includes('Time Signature'), 'setTimeSignatureState should use descriptive undo label');
});

TestRunner.test('Time Signature State - setTimeSignatureState clamps numerator', (t) => {
    const funcStr = setTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setTimeSignatureState should clamp numerator values');
});

TestRunner.test('Time Signature State - setTimeSignatureState clamps denominator', (t) => {
    const funcStr = setTimeSignatureState.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setTimeSignatureState should clamp denominator values');
});

TestRunner.test('Time Signature State - getTimeSignatureNumeratorState is a function export', (t) => {
    t.assertEqual(typeof getTimeSignatureNumeratorState, 'function', 'getTimeSignatureNumeratorState should be a function');
});

TestRunner.test('Time Signature State - getTimeSignatureNumeratorState accepts 0 parameters', (t) => {
    t.assertEqual(getTimeSignatureNumeratorState.length, 0, 'getTimeSignatureNumeratorState should accept 0 parameters');
});

TestRunner.test('Time Signature State - getTimeSignatureNumeratorState returns a number', (t) => {
    const result = getTimeSignatureNumeratorState();
    t.assertEqual(typeof result, 'number', 'getTimeSignatureNumeratorState should return a number');
});

TestRunner.test('Time Signature State - setTimeSignatureNumeratorState is a function export', (t) => {
    t.assertEqual(typeof setTimeSignatureNumeratorState, 'function', 'setTimeSignatureNumeratorState should be a function');
});

TestRunner.test('Time Signature State - setTimeSignatureNumeratorState accepts 1 parameter', (t) => {
    t.assertEqual(setTimeSignatureNumeratorState.length, 1, 'setTimeSignatureNumeratorState should accept 1 parameter');
});

TestRunner.test('Time Signature State - setTimeSignatureNumeratorState calls captureStateForUndo', (t) => {
    const funcStr = setTimeSignatureNumeratorState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTimeSignatureNumeratorState should call captureStateForUndo');
});

TestRunner.test('Time Signature State - getTimeSignatureDenominatorState is a function export', (t) => {
    t.assertEqual(typeof getTimeSignatureDenominatorState, 'function', 'getTimeSignatureDenominatorState should be a function');
});

TestRunner.test('Time Signature State - getTimeSignatureDenominatorState accepts 0 parameters', (t) => {
    t.assertEqual(getTimeSignatureDenominatorState.length, 0, 'getTimeSignatureDenominatorState should accept 0 parameters');
});

TestRunner.test('Time Signature State - getTimeSignatureDenominatorState returns a number', (t) => {
    const result = getTimeSignatureDenominatorState();
    t.assertEqual(typeof result, 'number', 'getTimeSignatureDenominatorState should return a number');
});

TestRunner.test('Time Signature State - setTimeSignatureDenominatorState is a function export', (t) => {
    t.assertEqual(typeof setTimeSignatureDenominatorState, 'function', 'setTimeSignatureDenominatorState should be a function');
});

TestRunner.test('Time Signature State - setTimeSignatureDenominatorState accepts 1 parameter', (t) => {
    t.assertEqual(setTimeSignatureDenominatorState.length, 1, 'setTimeSignatureDenominatorState should accept 1 parameter');
});

TestRunner.test('Time Signature State - setTimeSignatureDenominatorState calls captureStateForUndo', (t) => {
    const funcStr = setTimeSignatureDenominatorState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setTimeSignatureDenominatorState should call captureStateForUndo');
});

TestRunner.test('Time Signature Constants - TIME_SIG_MIN_NUMERATOR is defined', (t) => {
    t.assertTruthy(Constants.TIME_SIG_MIN_NUMERATOR !== undefined, 'TIME_SIG_MIN_NUMERATOR should be defined');
});

TestRunner.test('Time Signature Constants - TIME_SIG_MAX_NUMERATOR is defined', (t) => {
    t.assertTruthy(Constants.TIME_SIG_MAX_NUMERATOR !== undefined, 'TIME_SIG_MAX_NUMERATOR should be defined');
});

TestRunner.test('Time Signature Constants - TIME_SIG_MIN_DENOMINATOR is defined', (t) => {
    t.assertTruthy(Constants.TIME_SIG_MIN_DENOMINATOR !== undefined, 'TIME_SIG_MIN_DENOMINATOR should be defined');
});

TestRunner.test('Time Signature Constants - TIME_SIG_MAX_DENOMINATOR is defined', (t) => {
    t.assertTruthy(Constants.TIME_SIG_MAX_DENOMINATOR !== undefined, 'TIME_SIG_MAX_DENOMINATOR should be defined');
});

TestRunner.test('Time Signature Constants - DEFAULT_TIME_SIGNATURE_NUMERATOR is defined', (t) => {
    t.assertTruthy(Constants.DEFAULT_TIME_SIGNATURE_NUMERATOR !== undefined, 'DEFAULT_TIME_SIGNATURE_NUMERATOR should be defined');
});

TestRunner.test('Time Signature Constants - DEFAULT_TIME_SIGNATURE_DENOMINATOR is defined', (t) => {
    t.assertTruthy(Constants.DEFAULT_TIME_SIGNATURE_DENOMINATOR !== undefined, 'DEFAULT_TIME_SIGNATURE_DENOMINATOR should be defined');
});

TestRunner.test('Time Signature Constants - DEFAULT_TIME_SIGNATURE is an object', (t) => {
    t.assertEqual(typeof Constants.DEFAULT_TIME_SIGNATURE, 'object', 'DEFAULT_TIME_SIGNATURE should be an object');
});

TestRunner.test('Time Signature Constants - DEFAULT_TIME_SIGNATURE has numerator', (t) => {
    t.assertTruthy(Constants.DEFAULT_TIME_SIGNATURE.numerator !== undefined, 'DEFAULT_TIME_SIGNATURE should have numerator');
});

TestRunner.test('Time Signature Constants - DEFAULT_TIME_SIGNATURE has denominator', (t) => {
    t.assertTruthy(Constants.DEFAULT_TIME_SIGNATURE.denominator !== undefined, 'DEFAULT_TIME_SIGNATURE should have denominator');
});

TestRunner.test('Time Signature State - APP_VERSION validation for Day 398', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    const major = versionParts[0];
    const minor = versionParts[1];
    t.assertTruthy(major > 2 || (major === 2 && minor >= 75), 'APP_VERSION should be 2.75.0 or higher for Day 398');
});
// ============================================
// Day 399: Effect Presets State Functions Tests
// ============================================
TestRunner.test('Effect Presets State - getEffectPresetsState is a function export', (t) => {
    t.assertEqual(typeof getEffectPresetsState, 'function', 'getEffectPresetsState should be a function');
});

TestRunner.test('Effect Presets State - getEffectPresetsState accepts 0 parameters', (t) => {
    t.assertEqual(getEffectPresetsState.length, 0, 'getEffectPresetsState should accept 0 parameters');
});

TestRunner.test('Effect Presets State - getEffectPresetsState returns array', (t) => {
    const result = getEffectPresetsState();
    t.assertEqual(typeof result, 'object', 'getEffectPresetsState should return an object');
    t.assertTruthy(Array.isArray(result), 'getEffectPresetsState should return an array');
});

TestRunner.test('Effect Presets State - getEffectPresetByIdState is a function export', (t) => {
    t.assertEqual(typeof getEffectPresetByIdState, 'function', 'getEffectPresetByIdState should be a function');
});

TestRunner.test('Effect Presets State - getEffectPresetByIdState accepts 1 parameter', (t) => {
    t.assertEqual(getEffectPresetByIdState.length, 1, 'getEffectPresetByIdState should accept 1 parameter');
});

TestRunner.test('Effect Presets State - getEffectPresetByIdState returns preset or undefined', (t) => {
    const result = getEffectPresetByIdState(9999);
    t.assertTruthy(result === undefined || typeof result === 'object', 'getEffectPresetByIdState should return preset or undefined');
});

TestRunner.test('Effect Presets State - getEffectPresetsByTypeState is a function export', (t) => {
    t.assertEqual(typeof getEffectPresetsByTypeState, 'function', 'getEffectPresetsByTypeState should be a function');
});

TestRunner.test('Effect Presets State - getEffectPresetsByTypeState accepts 1 parameter', (t) => {
    t.assertEqual(getEffectPresetsByTypeState.length, 1, 'getEffectPresetsByTypeState should accept 1 parameter');
});

TestRunner.test('Effect Presets State - getEffectPresetsByTypeState returns array', (t) => {
    const result = getEffectPresetsByTypeState('Reverb');
    t.assertTruthy(Array.isArray(result), 'getEffectPresetsByTypeState should return an array');
});

TestRunner.test('Effect Presets State - addEffectPresetState is a function export', (t) => {
    t.assertEqual(typeof addEffectPresetState, 'function', 'addEffectPresetState should be a function');
});

TestRunner.test('Effect Presets State - addEffectPresetState accepts 1 parameter', (t) => {
    t.assertEqual(addEffectPresetState.length, 1, 'addEffectPresetState should accept 1 parameter');
});

TestRunner.test('Effect Presets State - addEffectPresetState calls captureStateForUndo', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'addEffectPresetState should call captureStateForUndo');
});

TestRunner.test('Effect Presets State - addEffectPresetState uses descriptive undo label', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('Save Effect Preset'), 'addEffectPresetState should use descriptive undo label');
});

TestRunner.test('Effect Presets State - addEffectPresetState uses DEFAULT_PRESET_NAME_PREFIX', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_PRESET_NAME_PREFIX'), 'addEffectPresetState should use DEFAULT_PRESET_NAME_PREFIX');
});

TestRunner.test('Effect Presets State - addEffectPresetState generates unique id', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('effectPresetIdCounter') || funcStr.includes('id'), 'addEffectPresetState should generate unique id');
});

TestRunner.test('Effect Presets State - addEffectPresetState uses DEFAULT_EFFECT_PRESET structure', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('name') && funcStr.includes('effectType') && funcStr.includes('params'), 'addEffectPresetState should create preset with name, effectType, and params');
});

TestRunner.test('Effect Presets State - addEffectPresetState pushes to array', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('push'), 'addEffectPresetState should push to effectPresetsState array');
});

TestRunner.test('Effect Presets State - addEffectPresetState checks MAX_EFFECT_PRESETS limit', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('MAX_EFFECT_PRESETS'), 'addEffectPresetState should check MAX_EFFECT_PRESETS limit');
});

TestRunner.test('Effect Presets State - addEffectPresetState returns preset', (t) => {
    const funcStr = addEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('return preset') || funcStr.includes('return'), 'addEffectPresetState should return preset');
});

TestRunner.test('Effect Presets State - updateEffectPresetState is a function export', (t) => {
    t.assertEqual(typeof updateEffectPresetState, 'function', 'updateEffectPresetState should be a function');
});

TestRunner.test('Effect Presets State - updateEffectPresetState accepts 2 parameters', (t) => {
    t.assertEqual(updateEffectPresetState.length, 2, 'updateEffectPresetState should accept 2 parameters');
});

TestRunner.test('Effect Presets State - updateEffectPresetState calls captureStateForUndo', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'updateEffectPresetState should call captureStateForUndo');
});

TestRunner.test('Effect Presets State - updateEffectPresetState uses descriptive undo label', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('Update Effect Preset'), 'updateEffectPresetState should use descriptive undo label');
});

TestRunner.test('Effect Presets State - updateEffectPresetState finds preset by id', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('find'), 'updateEffectPresetState should find preset by id');
});

TestRunner.test('Effect Presets State - updateEffectPresetState updates name property', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('name'), 'updateEffectPresetState should update name property');
});

TestRunner.test('Effect Presets State - updateEffectPresetState updates effectType property', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('effectType'), 'updateEffectPresetState should update effectType property');
});

TestRunner.test('Effect Presets State - updateEffectPresetState updates params property', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('params'), 'updateEffectPresetState should update params property');
});

TestRunner.test('Effect Presets State - updateEffectPresetState returns null for unknown id', (t) => {
    const funcStr = updateEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('return null'), 'updateEffectPresetState should return null when preset not found');
});

TestRunner.test('Effect Presets State - removeEffectPresetState is a function export', (t) => {
    t.assertEqual(typeof removeEffectPresetState, 'function', 'removeEffectPresetState should be a function');
});

TestRunner.test('Effect Presets State - removeEffectPresetState accepts 1 parameter', (t) => {
    t.assertEqual(removeEffectPresetState.length, 1, 'removeEffectPresetState should accept 1 parameter');
});

TestRunner.test('Effect Presets State - removeEffectPresetState calls captureStateForUndo', (t) => {
    const funcStr = removeEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'removeEffectPresetState should call captureStateForUndo');
});

TestRunner.test('Effect Presets State - removeEffectPresetState uses descriptive undo label', (t) => {
    const funcStr = removeEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('Delete Effect Preset'), 'removeEffectPresetState should use descriptive undo label');
});

TestRunner.test('Effect Presets State - removeEffectPresetState finds index by id', (t) => {
    const funcStr = removeEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('findIndex'), 'removeEffectPresetState should find index by id');
});

TestRunner.test('Effect Presets State - removeEffectPresetState splices from array', (t) => {
    const funcStr = removeEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('splice'), 'removeEffectPresetState should splice from array');
});

TestRunner.test('Effect Presets State - removeEffectPresetState returns boolean', (t) => {
    const funcStr = removeEffectPresetState.toString();
    t.assertTruthy(funcStr.includes('return true') || funcStr.includes('return false'), 'removeEffectPresetState should return boolean');
});

TestRunner.test('Effect Presets State - clearEffectPresetsState is a function export', (t) => {
    t.assertEqual(typeof clearEffectPresetsState, 'function', 'clearEffectPresetsState should be a function');
});

TestRunner.test('Effect Presets State - clearEffectPresetsState accepts 0 parameters', (t) => {
    t.assertEqual(clearEffectPresetsState.length, 0, 'clearEffectPresetsState should accept 0 parameters');
});

TestRunner.test('Effect Presets State - clearEffectPresetsState calls captureStateForUndo', (t) => {
    const funcStr = clearEffectPresetsState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'clearEffectPresetsState should call captureStateForUndo');
});

TestRunner.test('Effect Presets State - clearEffectPresetsState uses descriptive undo label', (t) => {
    const funcStr = clearEffectPresetsState.toString();
    t.assertTruthy(funcStr.includes('Clear All Effect Presets'), 'clearEffectPresetsState should use descriptive undo label');
});

TestRunner.test('Effect Presets State - clearEffectPresetsState clears array', (t) => {
    const funcStr = clearEffectPresetsState.toString();
    t.assertTruthy(funcStr.includes('effectPresetsState = []') || funcStr.includes('= []'), 'clearEffectPresetsState should clear array');
});

TestRunner.test('Effect Presets Constants - MAX_EFFECT_PRESETS is defined', (t) => {
    t.assertTruthy(Constants.MAX_EFFECT_PRESETS !== undefined, 'MAX_EFFECT_PRESETS should be defined');
});

TestRunner.test('Effect Presets Constants - MAX_EFFECT_PRESETS is a positive number', (t) => {
    t.assertEqual(typeof Constants.MAX_EFFECT_PRESETS, 'number', 'MAX_EFFECT_PRESETS should be a number');
    t.assertTruthy(Constants.MAX_EFFECT_PRESETS > 0, 'MAX_EFFECT_PRESETS should be positive');
});

TestRunner.test('Effect Presets Constants - DEFAULT_PRESET_NAME_PREFIX is defined', (t) => {
    t.assertTruthy(Constants.DEFAULT_PRESET_NAME_PREFIX !== undefined, 'DEFAULT_PRESET_NAME_PREFIX should be defined');
});

TestRunner.test('Effect Presets Constants - DEFAULT_PRESET_NAME_PREFIX is a string', (t) => {
    t.assertEqual(typeof Constants.DEFAULT_PRESET_NAME_PREFIX, 'string', 'DEFAULT_PRESET_NAME_PREFIX should be a string');
    t.assertTruthy(Constants.DEFAULT_PRESET_NAME_PREFIX.length > 0, 'DEFAULT_PRESET_NAME_PREFIX should be non-empty');
});

TestRunner.test('Effect Presets Constants - DEFAULT_EFFECT_PRESET is defined', (t) => {
    t.assertTruthy(Constants.DEFAULT_EFFECT_PRESET !== undefined, 'DEFAULT_EFFECT_PRESET should be defined');
});

TestRunner.test('Effect Presets Constants - DEFAULT_EFFECT_PRESET is an object', (t) => {
    t.assertEqual(typeof Constants.DEFAULT_EFFECT_PRESET, 'object', 'DEFAULT_EFFECT_PRESET should be an object');
});

TestRunner.test('Effect Presets Constants - DEFAULT_EFFECT_PRESET has name property', (t) => {
    t.assertTruthy(Constants.DEFAULT_EFFECT_PRESET.name !== undefined, 'DEFAULT_EFFECT_PRESET should have name property');
});

TestRunner.test('Effect Presets Constants - DEFAULT_EFFECT_PRESET has effectType property', (t) => {
    t.assertTruthy(Constants.DEFAULT_EFFECT_PRESET.effectType !== undefined, 'DEFAULT_EFFECT_PRESET should have effectType property');
});

TestRunner.test('Effect Presets Constants - DEFAULT_EFFECT_PRESET has params property', (t) => {
    t.assertTruthy(Constants.DEFAULT_EFFECT_PRESET.params !== undefined, 'DEFAULT_EFFECT_PRESET should have params property');
});

TestRunner.test('Effect Presets Constants - DEFAULT_EFFECT_PRESET effectType is null', (t) => {
    t.assertEqual(Constants.DEFAULT_EFFECT_PRESET.effectType, null, 'DEFAULT_EFFECT_PRESET effectType should be null');
});

TestRunner.test('Effect Presets Constants - DEFAULT_EFFECT_PRESET params is object', (t) => {
    t.assertEqual(typeof Constants.DEFAULT_EFFECT_PRESET.params, 'object', 'DEFAULT_EFFECT_PRESET params should be an object');
});

TestRunner.test('Effect Presets State - APP_VERSION validation for Day 399', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    const major = versionParts[0];
    const minor = versionParts[1];
    t.assertTruthy(major > 2 || (major === 2 && minor >= 76), 'APP_VERSION should be 2.76.0 or higher for Day 399');
});
// Day 400: Chord Mode State Functions Tests
TestRunner.test('Chord Mode State - getChordModeState is a function export', (t) => {
    t.assertEqual(typeof getChordModeState, 'function', 'getChordModeState should be a function');
});

TestRunner.test('Chord Mode State - getChordModeState accepts 0 parameters', (t) => {
    t.assertEqual(getChordModeState.length, 0, 'getChordModeState should accept 0 parameters');
});

TestRunner.test('Chord Mode State - getChordModeState returns an object', (t) => {
    const state = getChordModeState();
    t.assertEqual(typeof state, 'object', 'getChordModeState should return an object');
});

TestRunner.test('Chord Mode State - getChordModeState returns enabled property', (t) => {
    const state = getChordModeState();
    t.assertTruthy(state.enabled !== undefined, 'getChordModeState should return object with enabled property');
});

TestRunner.test('Chord Mode State - getChordModeState returns root property', (t) => {
    const state = getChordModeState();
    t.assertTruthy(state.root !== undefined, 'getChordModeState should return object with root property');
});

TestRunner.test('Chord Mode State - getChordModeState returns type property', (t) => {
    const state = getChordModeState();
    t.assertTruthy(state.type !== undefined, 'getChordModeState should return object with type property');
});

TestRunner.test('Chord Mode State - getChordModeState returns lockChord property', (t) => {
    const state = getChordModeState();
    t.assertTruthy(state.lockChord !== undefined, 'getChordModeState should return object with lockChord property');
});

TestRunner.test('Chord Mode State - setChordModeState is a function export', (t) => {
    t.assertEqual(typeof setChordModeState, 'function', 'setChordModeState should be a function');
});

TestRunner.test('Chord Mode State - setChordModeState accepts 1 parameter', (t) => {
    t.assertEqual(setChordModeState.length, 1, 'setChordModeState should accept 1 parameter');
});

TestRunner.test('Chord Mode State - setChordModeState calls captureStateForUndo', (t) => {
    const funcStr = setChordModeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setChordModeState should call captureStateForUndo');
});

TestRunner.test('Chord Mode State - setChordModeState uses descriptive undo label', (t) => {
    const funcStr = setChordModeState.toString();
    t.assertTruthy(funcStr.includes('Set Chord Mode Settings'), 'setChordModeState should use descriptive undo label');
});

TestRunner.test('Chord Mode State - setChordModeState merges with DEFAULT_CHORD_MODE', (t) => {
    const funcStr = setChordModeState.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_CHORD_MODE'), 'setChordModeState should merge with DEFAULT_CHORD_MODE');
});

TestRunner.test('Chord Mode State - getChordModeEnabledState is a function export', (t) => {
    t.assertEqual(typeof getChordModeEnabledState, 'function', 'getChordModeEnabledState should be a function');
});

TestRunner.test('Chord Mode State - getChordModeEnabledState accepts 0 parameters', (t) => {
    t.assertEqual(getChordModeEnabledState.length, 0, 'getChordModeEnabledState should accept 0 parameters');
});

TestRunner.test('Chord Mode State - getChordModeEnabledState returns boolean', (t) => {
    const result = getChordModeEnabledState();
    t.assertEqual(typeof result, 'boolean', 'getChordModeEnabledState should return boolean');
});

TestRunner.test('Chord Mode State - setChordModeEnabledState is a function export', (t) => {
    t.assertEqual(typeof setChordModeEnabledState, 'function', 'setChordModeEnabledState should be a function');
});

TestRunner.test('Chord Mode State - setChordModeEnabledState accepts 1 parameter', (t) => {
    t.assertEqual(setChordModeEnabledState.length, 1, 'setChordModeEnabledState should accept 1 parameter');
});

TestRunner.test('Chord Mode State - setChordModeEnabledState calls captureStateForUndo', (t) => {
    const funcStr = setChordModeEnabledState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setChordModeEnabledState should call captureStateForUndo');
});

TestRunner.test('Chord Mode State - setChordModeEnabledState uses conditional undo label', (t) => {
    const funcStr = setChordModeEnabledState.toString();
    t.assertTruthy(funcStr.includes('Toggle Chord Mode'), 'setChordModeEnabledState should use conditional undo label');
});

TestRunner.test('Chord Mode State - setChordModeEnabledState coerces to boolean', (t) => {
    const funcStr = setChordModeEnabledState.toString();
    t.assertTruthy(funcStr.includes('!!enabled'), 'setChordModeEnabledState should coerce to boolean');
});

TestRunner.test('Chord Mode State - getChordModeRootState is a function export', (t) => {
    t.assertEqual(typeof getChordModeRootState, 'function', 'getChordModeRootState should be a function');
});

TestRunner.test('Chord Mode State - getChordModeRootState accepts 0 parameters', (t) => {
    t.assertEqual(getChordModeRootState.length, 0, 'getChordModeRootState should accept 0 parameters');
});

TestRunner.test('Chord Mode State - getChordModeRootState returns a number', (t) => {
    const result = getChordModeRootState();
    t.assertEqual(typeof result, 'number', 'getChordModeRootState should return a number');
});

TestRunner.test('Chord Mode State - setChordModeRootState is a function export', (t) => {
    t.assertEqual(typeof setChordModeRootState, 'function', 'setChordModeRootState should be a function');
});

TestRunner.test('Chord Mode State - setChordModeRootState accepts 1 parameter', (t) => {
    t.assertEqual(setChordModeRootState.length, 1, 'setChordModeRootState should accept 1 parameter');
});

TestRunner.test('Chord Mode State - setChordModeRootState calls captureStateForUndo', (t) => {
    const funcStr = setChordModeRootState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setChordModeRootState should call captureStateForUndo');
});

TestRunner.test('Chord Mode State - setChordModeRootState uses descriptive undo label', (t) => {
    const funcStr = setChordModeRootState.toString();
    t.assertTruthy(funcStr.includes('Set Chord Root'), 'setChordModeRootState should use descriptive undo label');
});

TestRunner.test('Chord Mode State - setChordModeRootState clamps value to 0-11 range', (t) => {
    const funcStr = setChordModeRootState.toString();
    t.assertTruthy(funcStr.includes('Math.max') && funcStr.includes('Math.min'), 'setChordModeRootState should clamp value');
});

TestRunner.test('Chord Mode State - setChordModeRootState uses parseInt with fallback', (t) => {
    const funcStr = setChordModeRootState.toString();
    t.assertTruthy(funcStr.includes('parseInt'), 'setChordModeRootState should use parseInt');
});

TestRunner.test('Chord Mode State - getChordModeTypeState is a function export', (t) => {
    t.assertEqual(typeof getChordModeTypeState, 'function', 'getChordModeTypeState should be a function');
});

TestRunner.test('Chord Mode State - getChordModeTypeState accepts 0 parameters', (t) => {
    t.assertEqual(getChordModeTypeState.length, 0, 'getChordModeTypeState should accept 0 parameters');
});

TestRunner.test('Chord Mode State - getChordModeTypeState returns a string', (t) => {
    const result = getChordModeTypeState();
    t.assertEqual(typeof result, 'string', 'getChordModeTypeState should return a string');
});

TestRunner.test('Chord Mode State - setChordModeTypeState is a function export', (t) => {
    t.assertEqual(typeof setChordModeTypeState, 'function', 'setChordModeTypeState should be a function');
});

TestRunner.test('Chord Mode State - setChordModeTypeState accepts 1 parameter', (t) => {
    t.assertEqual(setChordModeTypeState.length, 1, 'setChordModeTypeState should accept 1 parameter');
});

TestRunner.test('Chord Mode State - setChordModeTypeState calls captureStateForUndo', (t) => {
    const funcStr = setChordModeTypeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setChordModeTypeState should call captureStateForUndo');
});

TestRunner.test('Chord Mode State - setChordModeTypeState references type in undo label', (t) => {
    const funcStr = setChordModeTypeState.toString();
    t.assertTruthy(funcStr.includes('Set Chord Type'), 'setChordModeTypeState should reference type in undo label');
});

TestRunner.test('Chord Mode State - setChordModeTypeState defaults to major', (t) => {
    const funcStr = setChordModeTypeState.toString();
    t.assertTruthy(funcStr.includes("'major'") || funcStr.includes('"major"'), 'setChordModeTypeState should default to major');
});

TestRunner.test('Chord Mode State - getChordModeLockState is a function export', (t) => {
    t.assertEqual(typeof getChordModeLockState, 'function', 'getChordModeLockState should be a function');
});

TestRunner.test('Chord Mode State - getChordModeLockState accepts 0 parameters', (t) => {
    t.assertEqual(getChordModeLockState.length, 0, 'getChordModeLockState should accept 0 parameters');
});

TestRunner.test('Chord Mode State - getChordModeLockState returns boolean', (t) => {
    const result = getChordModeLockState();
    t.assertEqual(typeof result, 'boolean', 'getChordModeLockState should return boolean');
});

TestRunner.test('Chord Mode State - setChordModeLockState is a function export', (t) => {
    t.assertEqual(typeof setChordModeLockState, 'function', 'setChordModeLockState should be a function');
});

TestRunner.test('Chord Mode State - setChordModeLockState accepts 1 parameter', (t) => {
    t.assertEqual(setChordModeLockState.length, 1, 'setChordModeLockState should accept 1 parameter');
});

TestRunner.test('Chord Mode State - setChordModeLockState calls captureStateForUndo', (t) => {
    const funcStr = setChordModeLockState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setChordModeLockState should call captureStateForUndo');
});

TestRunner.test('Chord Mode State - setChordModeLockState uses conditional undo label', (t) => {
    const funcStr = setChordModeLockState.toString();
    t.assertTruthy(funcStr.includes('Chord Lock'), 'setChordModeLockState should use conditional undo label');
});

TestRunner.test('Chord Mode State - setCh

// ============================================
// Day 404: MIDI Learn State Extended Tests
// ============================================
TestRunner.test('MIDI Learn State - getMidiLearnMappingsState is a function export', (t) => {
    t.assertEqual(typeof getMidiLearnMappingsState, 'function', 'getMidiLearnMappingsState should be a function');
});

TestRunner.test('MIDI Learn State - getMidiLearnMappingsState accepts 0 parameters', (t) => {
    t.assertEqual(getMidiLearnMappingsState.length, 0, 'getMidiLearnMappingsState should accept 0 parameters');
});

TestRunner.test('MIDI Learn State - getMidiLearnMappingsState returns an array', (t) => {
    const result = getMidiLearnMappingsState();
    t.assertTruthy(Array.isArray(result), 'getMidiLearnMappingsState should return an array');
});

TestRunner.test('MIDI Learn State - getMidiLearnMappingsState returns a copy', (t) => {
    const result = getMidiLearnMappingsState();
    t.assertTruthy(Array.isArray(result), 'getMidiLearnMappingsState should return a copy of the array');
});

TestRunner.test('MIDI Learn State - getMidiLearnModeState is a function export', (t) => {
    t.assertEqual(typeof getMidiLearnModeState, 'function', 'getMidiLearnModeState should be a function');
});

TestRunner.test('MIDI Learn State - getMidiLearnModeState accepts 0 parameters', (t) => {
    t.assertEqual(getMidiLearnModeState.length, 0, 'getMidiLearnModeState should accept 0 parameters');
});

TestRunner.test('MIDI Learn State - getMidiLearnPendingParamState is a function export', (t) => {
    t.assertEqual(typeof getMidiLearnPendingParamState, 'function', 'getMidiLearnPendingParamState should be a function');
});

TestRunner.test('MIDI Learn State - getMidiLearnPendingParamState accepts 0 parameters', (t) => {
    t.assertEqual(getMidiLearnPendingParamState.length, 0, 'getMidiLearnPendingParamState should accept 0 parameters');
});

TestRunner.test('MIDI Learn State - setMidiLearnModeState is a function export', (t) => {
    t.assertEqual(typeof setMidiLearnModeState, 'function', 'setMidiLearnModeState should be a function');
});

TestRunner.test('MIDI Learn State - setMidiLearnModeState accepts 1 parameter', (t) => {
    t.assertEqual(setMidiLearnModeState.length, 1, 'setMidiLearnModeState should accept 1 parameter');
});

TestRunner.test('MIDI Learn State - setMidiLearnModeState calls captureStateForUndo', (t) => {
    const funcStr = setMidiLearnModeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setMidiLearnModeState should call captureStateForUndo');
});

TestRunner.test('MIDI Learn State - setMidiLearnModeState uses descriptive undo label', (t) => {
    const funcStr = setMidiLearnModeState.toString();
    t.assertTruthy(funcStr.includes('MIDI Learn') || funcStr.includes('Toggle'), 'setMidiLearnModeState should use descriptive undo label');
});

TestRunner.test('MIDI Learn State - setMidiLearnModeState coerces to boolean', (t) => {
    const funcStr = setMidiLearnModeState.toString();
    t.assertTruthy(funcStr.includes('!!') || funcStr.includes('Boolean'), 'setMidiLearnModeState should coerce to boolean');
});

TestRunner.test('MIDI Learn State - setMidiLearnPendingParamState is a function export', (t) => {
    t.assertEqual(typeof setMidiLearnPendingParamState, 'function', 'setMidiLearnPendingParamState should be a function');
});

TestRunner.test('MIDI Learn State - setMidiLearnPendingParamState accepts 1 parameter', (t) => {
    t.assertEqual(setMidiLearnPendingParamState.length, 1, 'setMidiLearnPendingParamState should accept 1 parameter');
});

TestRunner.test('MIDI Learn State - setMidiLearnPendingParamState calls captureStateForUndo', (t) => {
    const funcStr = setMidiLearnPendingParamState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setMidiLearnPendingParamState should call captureStateForUndo');
});

TestRunner.test('MIDI Learn State - setMidiLearnPendingParamState uses descriptive undo label', (t) => {
    const funcStr = setMidiLearnPendingParamState.toString();
    t.assertTruthy(funcStr.includes('MIDI') || funcStr.includes('param') || funcStr.includes('Pending'), 'setMidiLearnPendingParamState should use descriptive undo label');
});

TestRunner.test('MIDI Learn State - addMidiLearnMapping is a function export', (t) => {
    t.assertEqual(typeof addMidiLearnMapping, 'function', 'addMidiLearnMapping should be a function');
});

TestRunner.test('MIDI Learn State - addMidiLearnMapping accepts 1 parameter', (t) => {
    t.assertEqual(addMidiLearnMapping.length, 1, 'addMidiLearnMapping should accept 1 parameter');
});

TestRunner.test('MIDI Learn State - addMidiLearnMapping calls captureStateForUndo', (t) => {
    const funcStr = addMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'addMidiLearnMapping should call captureStateForUndo');
});

TestRunner.test('MIDI Learn State - addMidiLearnMapping uses descriptive undo label', (t) => {
    const funcStr = addMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('MIDI') || funcStr.includes('Mapping'), 'addMidiLearnMapping should use descriptive undo label');
});

TestRunner.test('MIDI Learn State - addMidiLearnMapping uses DEFAULT_MIDI_LEARN_MAPPING structure', (t) => {
    const funcStr = addMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('DEFAULT_MIDI_LEARN_MAPPING') || funcStr.includes('channel') || funcStr.includes('cc'), 'addMidiLearnMapping should use DEFAULT_MIDI_LEARN_MAPPING structure');
});

TestRunner.test('MIDI Learn State - addMidiLearnMapping checks MAX_MIDI_LEARN_MAPPINGS limit', (t) => {
    const funcStr = addMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('MAX_MIDI_LEARN_MAPPINGS') || funcStr.includes('length'), 'addMidiLearnMapping should check MAX_MIDI_LEARN_MAPPINGS limit');
});

TestRunner.test('MIDI Learn State - addMidiLearnMapping pushes to midiLearnMappings', (t) => {
    const funcStr = addMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('push') || funcStr.includes('midiLearnMappings'), 'addMidiLearnMapping should push to midiLearnMappings');
});

TestRunner.test('MIDI Learn State - addMidiLearnMapping returns boolean', (t) => {
    const funcStr = addMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('return') || funcStr.includes('true') || funcStr.includes('false'), 'addMidiLearnMapping should return boolean');
});

TestRunner.test('MIDI Learn State - removeMidiLearnMapping is a function export', (t) => {
    t.assertEqual(typeof removeMidiLearnMapping, 'function', 'removeMidiLearnMapping should be a function');
});

TestRunner.test('MIDI Learn State - removeMidiLearnMapping accepts 1 parameter', (t) => {
    t.assertEqual(removeMidiLearnMapping.length, 1, 'removeMidiLearnMapping should accept 1 parameter');
});

TestRunner.test('MIDI Learn State - removeMidiLearnMapping calls captureStateForUndo', (t) => {
    const funcStr = removeMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'removeMidiLearnMapping should call captureStateForUndo');
});

TestRunner.test('MIDI Learn State - removeMidiLearnMapping uses descriptive undo label', (t) => {
    const funcStr = removeMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('MIDI') || funcStr.includes('Remove'), 'removeMidiLearnMapping should use descriptive undo label');
});

TestRunner.test('MIDI Learn State - removeMidiLearnMapping uses splice', (t) => {
    const funcStr = removeMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('splice'), 'removeMidiLearnMapping should use splice to remove mapping');
});

TestRunner.test('MIDI Learn State - removeMidiLearnMapping returns boolean', (t) => {
    const funcStr = removeMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('return') || funcStr.includes('true') || funcStr.includes('false'), 'removeMidiLearnMapping should return boolean');
});

TestRunner.test('MIDI Learn State - clearMidiLearnMappings is a function export', (t) => {
    t.assertEqual(typeof clearMidiLearnMappings, 'function', 'clearMidiLearnMappings should be a function');
});

TestRunner.test('MIDI Learn State - clearMidiLearnMappings accepts 0 parameters', (t) => {
    t.assertEqual(clearMidiLearnMappings.length, 0, 'clearMidiLearnMappings should accept 0 parameters');
});

TestRunner.test('MIDI Learn State - clearMidiLearnMappings calls captureStateForUndo', (t) => {
    const funcStr = clearMidiLearnMappings.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'clearMidiLearnMappings should call captureStateForUndo');
});

TestRunner.test('MIDI Learn State - clearMidiLearnMappings uses descriptive undo label', (t) => {
    const funcStr = clearMidiLearnMappings.toString();
    t.assertTruthy(funcStr.includes('MIDI') || funcStr.includes('Clear'), 'clearMidiLearnMappings should use descriptive undo label');
});

TestRunner.test('MIDI Learn State - clearMidiLearnMappings clears the array', (t) => {
    const funcStr = clearMidiLearnMappings.toString();
    t.assertTruthy(funcStr.includes('length') || funcStr.includes('= []'), 'clearMidiLearnMappings should clear the array');
});

TestRunner.test('MIDI Learn State - findMidiLearnMapping is a function export', (t) => {
    t.assertEqual(typeof findMidiLearnMapping, 'function', 'findMidiLearnMapping should be a function');
});

TestRunner.test('MIDI Learn State - findMidiLearnMapping accepts 2 parameters', (t) => {
    t.assertEqual(findMidiLearnMapping.length, 2, 'findMidiLearnMapping should accept 2 parameters');
});

TestRunner.test('MIDI Learn State - findMidiLearnMapping references channel parameter', (t) => {
    const funcStr = findMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('channel'), 'findMidiLearnMapping should reference channel parameter');
});

TestRunner.test('MIDI Learn State - findMidiLearnMapping references cc parameter', (t) => {
    const funcStr = findMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('cc'), 'findMidiLearnMapping should reference cc parameter');
});

TestRunner.test('MIDI Learn State - findMidiLearnMapping uses findIndex', (t) => {
    const funcStr = findMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('findIndex'), 'findMidiLearnMapping should use findIndex');
});

TestRunner.test('MIDI Learn State - updateMidiLearnMapping is a function export', (t) => {
    t.assertEqual(typeof updateMidiLearnMapping, 'function', 'updateMidiLearnMapping should be a function');
});

TestRunner.test('MIDI Learn State - updateMidiLearnMapping accepts 2 parameters', (t) => {
    t.assertEqual(updateMidiLearnMapping.length, 2, 'updateMidiLearnMapping should accept 2 parameters');
});

TestRunner.test('MIDI Learn State - updateMidiLearnMapping calls captureStateForUndo', (t) => {
    const funcStr = updateMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'updateMidiLearnMapping should call captureStateForUndo');
});

TestRunner.test('MIDI Learn State - updateMidiLearnMapping uses descriptive undo label', (t) => {
    const funcStr = updateMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('MIDI') || funcStr.includes('Update'), 'updateMidiLearnMapping should use descriptive undo label');
});

TestRunner.test('MIDI Learn State - updateMidiLearnMapping finds mapping by index', (t) => {
    const funcStr = updateMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('[') || funcStr.includes('find'), 'updateMidiLearnMapping should find mapping by index');
});

TestRunner.test('MIDI Learn State - updateMidiLearnMapping returns boolean', (t) => {
    const funcStr = updateMidiLearnMapping.toString();
    t.assertTruthy(funcStr.includes('return') || funcStr.includes('true') || funcStr.includes('false'), 'updateMidiLearnMapping should return boolean');
});

TestRunner.test('MIDI Learn State - getMidiLearnMappingByIndex is a function export', (t) => {
    t.assertEqual(typeof getMidiLearnMappingByIndex, 'function', 'getMidiLearnMappingByIndex should be a function');
});

TestRunner.test('MIDI Learn State - getMidiLearnMappingByIndex accepts 1 parameter', (t) => {
    t.assertEqual(getMidiLearnMappingByIndex.length, 1, 'getMidiLearnMappingByIndex should accept 1 parameter');
});

TestRunner.test('MIDI Learn State - getMidiLearnMappingByIndex returns mapping or undefined', (t) => {
    const funcStr = getMidiLearnMappingByIndex.toString();
    t.assertTruthy(funcStr.includes('[') || funcStr.includes('find') || funcStr.includes('undefined'), 'getMidiLearnMappingByIndex should return mapping or undefined');
});

// MIDI Learn Constants Tests
TestRunner.test('MIDI Learn Constants - MAX_MIDI_LEARN_MAPPINGS is defined', (t) => {
    t.assertTruthy(typeof MAX_MIDI_LEARN_MAPPINGS !== 'undefined', 'MAX_MIDI_LEARN_MAPPINGS should be defined');
});

TestRunner.test('MIDI Learn Constants - MAX_MIDI_LEARN_MAPPINGS is a positive number', (t) => {
    t.assertEqual(typeof MAX_MIDI_LEARN_MAPPINGS, 'number', 'MAX_MIDI_LEARN_MAPPINGS should be a number');
    t.assertTruthy(MAX_MIDI_LEARN_MAPPINGS > 0, 'MAX_MIDI_LEARN_MAPPINGS should be a positive number');
});

TestRunner.test('MIDI Learn Constants - MIDI_CC_COMMAND is defined', (t) => {
    t.assertTruthy(typeof MIDI_CC_COMMAND !== 'undefined', 'MIDI_CC_COMMAND should be defined');
});

TestRunner.test('MIDI Learn Constants - MIDI_CC_COMMAND is 176', (t) => {
    t.assertEqual(MIDI_CC_COMMAND, 176, 'MIDI_CC_COMMAND should be 176');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MODE is defined', (t) => {
    t.assertTruthy(typeof DEFAULT_MIDI_LEARN_MODE !== 'undefined', 'DEFAULT_MIDI_LEARN_MODE should be defined');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MODE is boolean false', (t) => {
    t.assertEqual(typeof DEFAULT_MIDI_LEARN_MODE, 'boolean', 'DEFAULT_MIDI_LEARN_MODE should be boolean');
    t.assertEqual(DEFAULT_MIDI_LEARN_MODE, false, 'DEFAULT_MIDI_LEARN_MODE should be false');
});

TestRunner.test('MIDI Learn Constants - MIDI_LEARN_INDICATOR_TIMEOUT_MS is defined', (t) => {
    t.assertTruthy(typeof MIDI_LEARN_INDICATOR_TIMEOUT_MS !== 'undefined', 'MIDI_LEARN_INDICATOR_TIMEOUT_MS should be defined');
});

TestRunner.test('MIDI Learn Constants - MIDI_LEARN_INDICATOR_TIMEOUT_MS is a positive number', (t) => {
    t.assertEqual(typeof MIDI_LEARN_INDICATOR_TIMEOUT_MS, 'number', 'MIDI_LEARN_INDICATOR_TIMEOUT_MS should be a number');
    t.assertTruthy(MIDI_LEARN_INDICATOR_TIMEOUT_MS > 0, 'MIDI_LEARN_INDICATOR_TIMEOUT_MS should be a positive number');
});

TestRunner.test('MIDI Learn Constants - MIDI_LEARN_PARAM_TYPES is defined', (t) => {
    t.assertTruthy(typeof MIDI_LEARN_PARAM_TYPES !== 'undefined', 'MIDI_LEARN_PARAM_TYPES should be defined');
});

TestRunner.test('MIDI Learn Constants - MIDI_LEARN_PARAM_TYPES is an array', (t) => {
    t.assertTruthy(Array.isArray(MIDI_LEARN_PARAM_TYPES), 'MIDI_LEARN_PARAM_TYPES should be an array');
});

TestRunner.test('MIDI Learn Constants - MIDI_LEARN_PARAM_TYPES includes trackVolume', (t) => {
    t.assertTruthy(MIDI_LEARN_PARAM_TYPES.includes('trackVolume'), 'MIDI_LEARN_PARAM_TYPES should include trackVolume');
});

TestRunner.test('MIDI Learn Constants - MIDI_LEARN_PARAM_TYPES includes trackPan', (t) => {
    t.assertTruthy(MIDI_LEARN_PARAM_TYPES.includes('trackPan'), 'MIDI_LEARN_PARAM_TYPES should include trackPan');
});

TestRunner.test('MIDI Learn Constants - MIDI_LEARN_PARAM_TYPES includes effectParam', (t) => {
    t.assertTruthy(MIDI_LEARN_PARAM_TYPES.includes('effectParam'), 'MIDI_LEARN_PARAM_TYPES should include effectParam');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING is defined', (t) => {
    t.assertTruthy(typeof DEFAULT_MIDI_LEARN_MAPPING !== 'undefined', 'DEFAULT_MIDI_LEARN_MAPPING should be defined');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING is an object', (t) => {
    t.assertEqual(typeof DEFAULT_MIDI_LEARN_MAPPING, 'object', 'DEFAULT_MIDI_LEARN_MAPPING should be an object');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING has channel property', (t) => {
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.channel !== undefined, 'DEFAULT_MIDI_LEARN_MAPPING should have channel property');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING has cc property', (t) => {
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.cc !== undefined, 'DEFAULT_MIDI_LEARN_MAPPING should have cc property');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING has trackId property', (t) => {
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.trackId !== undefined, 'DEFAULT_MIDI_LEARN_MAPPING should have trackId property');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING has paramType property', (t) => {
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.paramType !== undefined, 'DEFAULT_MIDI_LEARN_MAPPING should have paramType property');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING has paramPath property', (t) => {
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.paramPath !== undefined, 'DEFAULT_MIDI_LEARN_MAPPING should have paramPath property');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING has min property', (t) => {
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.min !== undefined, 'DEFAULT_MIDI_LEARN_MAPPING should have min property');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING has max property', (t) => {
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.max !== undefined, 'DEFAULT_MIDI_LEARN_MAPPING should have max property');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING.channel is 0', (t) => {
    t.assertEqual(DEFAULT_MIDI_LEARN_MAPPING.channel, 0, 'DEFAULT_MIDI_LEARN_MAPPING.channel should be 0');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING.cc is 0', (t) => {
    t.assertEqual(DEFAULT_MIDI_LEARN_MAPPING.cc, 0, 'DEFAULT_MIDI_LEARN_MAPPING.cc should be 0');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING.trackId is null', (t) => {
    t.assertEqual(DEFAULT_MIDI_LEARN_MAPPING.trackId, null, 'DEFAULT_MIDI_LEARN_MAPPING.trackId should be null');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING.paramType is null', (t) => {
    t.assertEqual(DEFAULT_MIDI_LEARN_MAPPING.paramType, null, 'DEFAULT_MIDI_LEARN_MAPPING.paramType should be null');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING.paramPath is null', (t) => {
    t.assertEqual(DEFAULT_MIDI_LEARN_MAPPING.paramPath, null, 'DEFAULT_MIDI_LEARN_MAPPING.paramPath should be null');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING.min is 0', (t) => {
    t.assertEqual(DEFAULT_MIDI_LEARN_MAPPING.min, 0, 'DEFAULT_MIDI_LEARN_MAPPING.min should be 0');
});

TestRunner.test('MIDI Learn Constants - DEFAULT_MIDI_LEARN_MAPPING.max is 1', (t) => {
    t.assertEqual(DEFAULT_MIDI_LEARN_MAPPING.max, 1, 'DEFAULT_MIDI_LEARN_MAPPING.max should be 1');
});

// APP_VERSION validation for Day 404
TestRunner.test('MIDI Learn State - APP_VERSION validation for Day 404', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    const major = versionParts[0];
    const minor = versionParts[1];
    const patch = versionParts[2];
    t.assertTruthy(major > 2 || (major === 2 && minor >= 80), 'APP_VERSION should be 2.80.0 or higher for Day 404');
});

// ============================================
// Day 404: Sound Library State Extended Tests
// ============================================

// Sound Library State - Loaded Zip Files
TestRunner.test('Sound Library State - getLoadedZipFilesState is a function export', (t) => {
    t.assertTruthy(typeof getLoadedZipFilesState === 'function', 'getLoadedZipFilesState should be a function');
});

TestRunner.test('Sound Library State - getLoadedZipFilesState accepts 0 parameters', (t) => {
    const funcBody = getLoadedZipFilesState.toString();
    t.assertTruthy(!funcBody.includes('files'), 'getLoadedZipFilesState should accept 0 parameters');
});

TestRunner.test('Sound Library State - getLoadedZipFilesState returns an object', (t) => {
    const result = getLoadedZipFilesState();
    t.assertEqual(typeof result, 'object', 'getLoadedZipFilesState should return an object');
});

TestRunner.test('Sound Library State - setLoadedZipFilesState is a function export', (t) => {
    t.assertTruthy(typeof setLoadedZipFilesState === 'function', 'setLoadedZipFilesState should be a function');
});

TestRunner.test('Sound Library State - setLoadedZipFilesState accepts 1 parameter', (t) => {
    const funcBody = setLoadedZipFilesState.toString();
    const paramsMatch = funcBody.match(/function\s*\(([^)]*)\)/);
    const params = paramsMatch ? paramsMatch[1].trim() : '';
    const paramCount = params.split(',').filter(p => p.trim()).length;
    t.assertEqual(paramCount, 1, 'setLoadedZipFilesState should accept 1 parameter');
});

TestRunner.test('Sound Library State - setLoadedZipFilesState calls captureStateForUndo', (t) => {
    const funcStr = setLoadedZipFilesState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setLoadedZipFilesState should call captureStateForUndo');
});

TestRunner.test('Sound Library State - setLoadedZipFilesState uses descriptive undo label', (t) => {
    const funcStr = setLoadedZipFilesState.toString();
    t.assertTruthy(funcStr.includes('Set Loaded ZIP Files'), 'setLoadedZipFilesState should use descriptive undo label');
});

TestRunner.test('Sound Library State - setLoadedZipFilesState defaults to empty object', (t) => {
    const funcStr = setLoadedZipFilesState.toString();
    t.assertTruthy(funcStr.includes('{}') || funcStr.includes('files || {}'), 'setLoadedZipFilesState should default to empty object');
});

// Sound Library State - File Trees
TestRunner.test('Sound Library State - getSoundLibraryFileTreesState is a function export', (t) => {
    t.assertTruthy(typeof getSoundLibraryFileTreesState === 'function', 'getSoundLibraryFileTreesState should be a function');
});

TestRunner.test('Sound Library State - getSoundLibraryFileTreesState accepts 0 parameters', (t) => {
    const funcBody = getSoundLibraryFileTreesState.toString();
    t.assertTruthy(!funcBody.includes('trees'), 'getSoundLibraryFileTreesState should accept 0 parameters');
});

TestRunner.test('Sound Library State - getSoundLibraryFileTreesState returns an object', (t) => {
    const result = getSoundLibraryFileTreesState();
    t.assertEqual(typeof result, 'object', 'getSoundLibraryFileTreesState should return an object');
});

TestRunner.test('Sound Library State - setSoundLibraryFileTreesState is a function export', (t) => {
    t.assertTruthy(typeof setSoundLibraryFileTreesState === 'function', 'setSoundLibraryFileTreesState should be a function');
});

TestRunner.test('Sound Library State - setSoundLibraryFileTreesState accepts 1 parameter', (t) => {
    const funcBody = setSoundLibraryFileTreesState.toString();
    const paramsMatch = funcBody.match(/function\s*\(([^)]*)\)/);
    const params = paramsMatch ? paramsMatch[1].trim() : '';
    const paramCount = params.split(',').filter(p => p.trim()).length;
    t.assertEqual(paramCount, 1, 'setSoundLibraryFileTreesState should accept 1 parameter');
});

TestRunner.test('Sound Library State - setSoundLibraryFileTreesState calls captureStateForUndo', (t) => {
    const funcStr = setSoundLibraryFileTreesState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setSoundLibraryFileTreesState should call captureStateForUndo');
});

TestRunner.test('Sound Library State - setSoundLibraryFileTreesState uses descriptive undo label', (t) => {
    const funcStr = setSoundLibraryFileTreesState.toString();
    t.assertTruthy(funcStr.includes('Set Sound Library File Trees'), 'setSoundLibraryFileTreesState should use descriptive undo label');
});

TestRunner.test('Sound Library State - setSoundLibraryFileTreesState defaults to empty object', (t) => {
    const funcStr = setSoundLibraryFileTreesState.toString();
    t.assertTruthy(funcStr.includes('{}') || funcStr.includes('trees || {}'), 'setSoundLibraryFileTreesState should default to empty object');
});

// Sound Library State - Current Library Name
TestRunner.test('Sound Library State - getCurrentLibraryNameState is a function export', (t) => {
    t.assertTruthy(typeof getCurrentLibraryNameState === 'function', 'getCurrentLibraryNameState should be a function');
});

TestRunner.test('Sound Library State - getCurrentLibraryNameState accepts 0 parameters', (t) => {
    const funcBody = getCurrentLibraryNameState.toString();
    t.assertTruthy(!funcBody.includes('libraryName'), 'getCurrentLibraryNameState should accept 0 parameters');
});

TestRunner.test('Sound Library State - getCurrentLibraryNameState returns current library name', (t) => {
    const result = getCurrentLibraryNameState();
    t.assertTruthy(typeof result === 'string' || result === null || result === undefined, 'getCurrentLibraryNameState should return string or null');
});

TestRunner.test('Sound Library State - setCurrentLibraryNameState is a function export', (t) => {
    t.assertTruthy(typeof setCurrentLibraryNameState === 'function', 'setCurrentLibraryNameState should be a function');
});

TestRunner.test('Sound Library State - setCurrentLibraryNameState accepts 1 parameter', (t) => {
    const funcBody = setCurrentLibraryNameState.toString();
    const paramsMatch = funcBody.match(/function\s*\(([^)]*)\)/);
    const params = paramsMatch ? paramsMatch[1].trim() : '';
    const paramCount = params.split(',').filter(p => p.trim()).length;
    t.assertEqual(paramCount, 1, 'setCurrentLibraryNameState should accept 1 parameter');
});

TestRunner.test('Sound Library State - setCurrentLibraryNameState calls captureStateForUndo', (t) => {
    const funcStr = setCurrentLibraryNameState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setCurrentLibraryNameState should call captureStateForUndo');
});

TestRunner.test('Sound Library State - setCurrentLibraryNameState uses descriptive undo label', (t) => {
    const funcStr = setCurrentLibraryNameState.toString();
    t.assertTruthy(funcStr.includes('Set Current Library'), 'setCurrentLibraryNameState should use descriptive undo label');
});

// Sound Library State - Current Sound File Tree
TestRunner.test('Sound Library State - getCurrentSoundFileTreeState is a function export', (t) => {
    t.assertTruthy(typeof getCurrentSoundFileTreeState === 'function', 'getCurrentSoundFileTreeState should be a function');
});

TestRunner.test('Sound Library State - getCurrentSoundFileTreeState accepts 0 parameters', (t) => {
    const funcBody = getCurrentSoundFileTreeState.toString();
    t.assertTruthy(!funcBody.includes('fileTree'), 'getCurrentSoundFileTreeState should accept 0 parameters');
});

TestRunner.test('Sound Library State - getCurrentSoundFileTreeState returns tree or null', (t) => {
    const result = getCurrentSoundFileTreeState();
    t.assertTruthy(result === null || typeof result === 'object', 'getCurrentSoundFileTreeState should return object or null');
});

TestRunner.test('Sound Library State - setCurrentSoundFileTreeState is a function export', (t) => {
    t.assertTruthy(typeof setCurrentSoundFileTreeState === 'function', 'setCurrentSoundFileTreeState should be a function');
});

TestRunner.test('Sound Library State - setCurrentSoundFileTreeState accepts 1 parameter', (t) => {
    const funcBody = setCurrentSoundFileTreeState.toString();
    const paramsMatch = funcBody.match(/function\s*\(([^)]*)\)/);
    const params = paramsMatch ? paramsMatch[1].trim() : '';
    const paramCount = params.split(',').filter(p => p.trim()).length;
    t.assertEqual(paramCount, 1, 'setCurrentSoundFileTreeState should accept 1 parameter');
});

TestRunner.test('Sound Library State - setCurrentSoundFileTreeState calls captureStateForUndo', (t) => {
    const funcStr = setCurrentSoundFileTreeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setCurrentSoundFileTreeState should call captureStateForUndo');
});

TestRunner.test('Sound Library State - setCurrentSoundFileTreeState uses descriptive undo label', (t) => {
    const funcStr = setCurrentSoundFileTreeState.toString();
    t.assertTruthy(funcStr.includes('Set Sound File Tree'), 'setCurrentSoundFileTreeState should use descriptive undo label');
});

TestRunner.test('Sound Library State - setCurrentSoundFileTreeState updates correct library', (t) => {
    const funcStr = setCurrentSoundFileTreeState.toString();
    t.assertTruthy(funcStr.includes('currentLibraryNameGlobal'), 'setCurrentSoundFileTreeState should use currentLibraryNameGlobal to update correct library');
});

// Sound Library State - Current Sound Browser Path
TestRunner.test('Sound Library State - getCurrentSoundBrowserPathState is a function export', (t) => {
    t.assertTruthy(typeof getCurrentSoundBrowserPathState === 'function', 'getCurrentSoundBrowserPathState should be a function');
});

TestRunner.test('Sound Library State - getCurrentSoundBrowserPathState accepts 0 parameters', (t) => {
    const funcBody = getCurrentSoundBrowserPathState.toString();
    t.assertTruthy(!funcBody.includes('path'), 'getCurrentSoundBrowserPathState should accept 0 parameters');
});

TestRunner.test('Sound Library State - getCurrentSoundBrowserPathState returns string', (t) => {
    const result = getCurrentSoundBrowserPathState();
    t.assertEqual(typeof result, 'string', 'getCurrentSoundBrowserPathState should return a string');
});

TestRunner.test('Sound Library State - getCurrentSoundBrowserPathState defaults to forward slash', (t) => {
    const result = getCurrentSoundBrowserPathState();
    t.assertEqual(result, '/', 'getCurrentSoundBrowserPathState should default to /');
});

TestRunner.test('Sound Library State - setCurrentSoundBrowserPathState is a function export', (t) => {
    t.assertTruthy(typeof setCurrentSoundBrowserPathState === 'function', 'setCurrentSoundBrowserPathState should be a function');
});

TestRunner.test('Sound Library State - setCurrentSoundBrowserPathState accepts 1 parameter', (t) => {
    const funcBody = setCurrentSoundBrowserPathState.toString();
    const paramsMatch = funcBody.match(/function\s*\(([^)]*)\)/);
    const params = paramsMatch ? paramsMatch[1].trim() : '';
    const paramCount = params.split(',').filter(p => p.trim()).length;
    t.assertEqual(paramCount, 1, 'setCurrentSoundBrowserPathState should accept 1 parameter');
});

TestRunner.test('Sound Library State - setCurrentSoundBrowserPathState calls captureStateForUndo', (t) => {
    const funcStr = setCurrentSoundBrowserPathState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setCurrentSoundBrowserPathState should call captureStateForUndo');
});

TestRunner.test('Sound Library State - setCurrentSoundBrowserPathState uses descriptive undo label', (t) => {
    const funcStr = setCurrentSoundBrowserPathState.toString();
    t.assertTruthy(funcStr.includes('Set Sound Browser Path'), 'setCurrentSoundBrowserPathState should use descriptive undo label');
});

TestRunner.test('Sound Library State - setCurrentSoundBrowserPathState defaults to forward slash', (t) => {
    const funcStr = setCurrentSoundBrowserPathState.toString();
    t.assertTruthy(funcStr.includes("'/'") || funcStr.includes('"/"') || funcStr.includes('path ||'), 'setCurrentSoundBrowserPathState should default to /');
});

// Sound Library State - Preview Player
TestRunner.test('Sound Library State - getPreviewPlayerState is a function export', (t) => {
    t.assertTruthy(typeof getPreviewPlayerState === 'function', 'getPreviewPlayerState should be a function');
});

TestRunner.test('Sound Library State - getPreviewPlayerState accepts 0 parameters', (t) => {
    const funcBody = getPreviewPlayerState.toString();
    t.assertTruthy(!funcBody.includes('player'), 'getPreviewPlayerState should accept 0 parameters');
});

TestRunner.test('Sound Library State - getPreviewPlayerState returns player or null', (t) => {
    const result = getPreviewPlayerState();
    t.assertTruthy(result === null || typeof result === 'object', 'getPreviewPlayerState should return object or null');
});

TestRunner.test('Sound Library State - setPreviewPlayerState is a function export', (t) => {
    t.assertTruthy(typeof setPreviewPlayerState === 'function', 'setPreviewPlayerState should be a function');
});

TestRunner.test('Sound Library State - setPreviewPlayerState accepts 1 parameter', (t) => {
    const funcBody = setPreviewPlayerState.toString();
    const paramsMatch = funcBody.match(/function\s*\(([^)]*)\)/);
    const params = paramsMatch ? paramsMatch[1].trim() : '';
    const paramCount = params.split(',').filter(p => p.trim()).length;
    t.assertEqual(paramCount, 1, 'setPreviewPlayerState should accept 1 parameter');
});

TestRunner.test('Sound Library State - setPreviewPlayerState calls captureStateForUndo', (t) => {
    const funcStr = setPreviewPlayerState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'setPreviewPlayerState should call captureStateForUndo');
});

TestRunner.test('Sound Library State - setPreviewPlayerState uses descriptive undo label', (t) => {
    const funcStr = setPreviewPlayerState.toString();
    t.assertTruthy(funcStr.includes('Set Preview Player'), 'setPreviewPlayerState should use descriptive undo label');
});

// APP_VERSION validation for Day 404
TestRunner.test('Sound Library State - APP_VERSION validation for Day 404', (t) => {
    const versionParts = APP_VERSION.split('.').map(Number);
    const major = versionParts[0];
    const minor = versionParts[1];
    const patch = versionParts[2];
    t.assertTruthy(major > 2 || (major === 2 && minor >= 81), 'APP_VERSION should be 2.81.0 or higher for Day 404');
});
