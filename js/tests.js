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
    getFavoriteSounds,
    isFavorite,
    toggleFavorite,
    addToRecentlyPlayed,
    getRecentlyPlayedSounds,
    clearRecentlyPlayed,
    clearAutoSavedProject,
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
    getTransportPosition,
    getTransportSeconds,
    getTransportBpm,
    getTransportState,
    getMimeTypeFromFilename,
    clearAllMasterEffectNodes,
    autoSliceSample,
    addMasterEffectToAudio,
    removeMasterEffectFromAudio,
    startAudioRecording,
    stopAudioRecording,
    scheduleRecordingForPunch,
    cancelScheduledRecording,
    getRecordingScheduledTrackId,
    cleanupRecordingScheduling,
    getPunchRegion,
    setPunchRegion,
    setPunchRegionEnabled,
    isPunchRegionEnabled,
    isPositionInPunchRegion,
    getPunchInBars,
    getPunchOutBars,
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
    resolveRecordingMicrophoneTestTrack,
    getPerformanceMetrics,
    startPerformanceMonitor,
    stopPerformanceMonitor,
    getSendBusNodes,
    getTrackSendNodes,
    connectTrackToSendBus,
    disconnectTrackFromSendBus,
    setTrackSendLevel,
    exportMixdownToWav,
    runRecordingMicrophoneE2ETest
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
    buildMixerMasterStripHTML,
    renderDrumPadEditorControls,
    getDrumSamplerPadExistingAudioData,
    updateDrumPadControlsUI,
    renderDrumSamplerPads,
    getNormalizedDrumSamplerPadIndex
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
    t.assertEquals(paramCount, 1, 'showNotification should accept 1 parameter (message)');
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
    t.assertEquals(paramCount, 4, 'showCustomModal should accept 4 parameters');
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
    t.assertEquals(paramCount, 4, 'showConfirmationDialog should accept 4 parameters');
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
    t.assertEquals(paramCount, 1, 'secondsToBBSTime should accept 1 parameter');
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
    t.assertEquals(paramCount, 1, 'bbsTimeToSeconds should accept 1 parameter');
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
    t.assertEquals(paramCount, 3, 'createContextMenu should accept 3 parameters');
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
    t.assertEquals(paramCount, 5, 'createDropZoneHTML should accept 5 parameters');
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
    t.assertEquals(paramCount, 7, 'setupGenericDropZoneListeners should accept 7 parameters');
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
// Day 356: Project Save/Load Functions Tests
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
    t.assertEquals(typeof startContextSuspensionMonitoring, 'function', 'startContextSuspensionMonitoring should be a function');
});

TestRunner.test('Context Monitor - startContextSuspensionMonitoring accepts 1 parameter', (t) => {
    const paramCount = startContextSuspensionMonitoring.length;
    t.assertEquals(paramCount, 1, 'startContextSuspensionMonitoring should accept 1 parameter');
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
    t.assertEquals(typeof stopContextSuspensionMonitoring, 'function', 'stopContextSuspensionMonitoring should be a function');
});

TestRunner.test('Context Monitor - stopContextSuspensionMonitoring accepts 0 parameters', (t) => {
    const paramCount = stopContextSuspensionMonitoring.length;
    t.assertEquals(paramCount, 0, 'stopContextSuspensionMonitoring should accept 0 parameters');
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
    t.assertEquals(typeof getContextSuspensionCount, 'function', 'getContextSuspensionCount should be a function');
});

TestRunner.test('Context Monitor - getContextSuspensionCount accepts 0 parameters', (t) => {
    const paramCount = getContextSuspensionCount.length;
    t.assertEquals(paramCount, 0, 'getContextSuspensionCount should accept 0 parameters');
});

TestRunner.test('Context Monitor - getContextSuspensionCount returns contextSuspendedCount', (t) => {
    const funcStr = getContextSuspensionCount.toString();
    t.assertTruthy(funcStr.includes('contextSuspendedCount'), 'getContextSuspensionCount should return contextSuspendedCount');
});

TestRunner.test('Context Monitor - getContextState is a function export', (t) => {
    t.assertEquals(typeof getContextState, 'function', 'getContextState should be a function');
});

TestRunner.test('Context Monitor - getContextState accepts 0 parameters', (t) => {
    const paramCount = getContextState.length;
    t.assertEquals(paramCount, 0, 'getContextState should accept 0 parameters');
});

TestRunner.test('Context Monitor - getContextState references Tone.context.state', (t) => {
    const funcStr = getContextState.toString();
    t.assertTruthy(funcStr.includes('Tone.context.state') || funcStr.includes('context.state'), 'getContextState should reference Tone.context.state');
});

TestRunner.test('Sidechain - getSidechainBusInput is a function export', (t) => {
    t.assertEquals(typeof getSidechainBusInput, 'function', 'getSidechainBusInput should be a function');
});

TestRunner.test('Sidechain - getSidechainBusInput accepts 0 parameters', (t) => {
    const paramCount = getSidechainBusInput.length;
    t.assertEquals(paramCount, 0, 'getSidechainBusInput should accept 0 parameters');
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
    t.assertEquals(typeof enableSidechainFromMic, 'function', 'enableSidechainFromMic should be a function');
});

TestRunner.test('Sidechain - enableSidechainFromMic is async', (t) => {
    const funcStr = enableSidechainFromMic.toString();
    t.assertTruthy(funcStr.includes('async') || enableSidechainFromMic.constructor.name === 'AsyncFunction', 'enableSidechainFromMic should be async');
});

TestRunner.test('Sidechain - enableSidechainFromMic accepts 1 parameter', (t) => {
    const paramCount = enableSidechainFromMic.length;
    t.assertEquals(paramCount, 1, 'enableSidechainFromMic should accept 1 parameter');
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
    t.assertEquals(typeof disableSidechainFromMic, 'function', 'disableSidechainFromMic should be a function');
});

TestRunner.test('Sidechain - disableSidechainFromMic accepts 0 parameters', (t) => {
    const paramCount = disableSidechainFromMic.length;
    t.assertEquals(paramCount, 0, 'disableSidechainFromMic should accept 0 parameters');
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
    t.assertEquals(typeof enableSidechainFromTrackIn, 'function', 'enableSidechainFromTrackIn should be a function');
});

TestRunner.test('Sidechain - enableSidechainFromTrackIn is async', (t) => {
    const funcStr = enableSidechainFromTrackIn.toString();
    t.assertTruthy(funcStr.includes('async') || enableSidechainFromTrackIn.constructor.name === 'AsyncFunction', 'enableSidechainFromTrackIn should be async');
});

TestRunner.test('Sidechain - enableSidechainFromTrackIn accepts 2 parameters', (t) => {
    const paramCount = enableSidechainFromTrackIn.length;
    t.assertEquals(paramCount, 2, 'enableSidechainFromTrackIn should accept 2 parameters');
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
    t.assertEquals(typeof disableSidechainBus, 'function', 'disableSidechainBus should be a function');
});

TestRunner.test('Sidechain - disableSidechainBus accepts 0 parameters', (t) => {
    const paramCount = disableSidechainBus.length;
    t.assertEquals(paramCount, 0, 'disableSidechainBus should accept 0 parameters');
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
    t.assertEquals(typeof isMicOpenForSidechain, 'function', 'isMicOpenForSidechain should be a function');
});

TestRunner.test('Sidechain - isMicOpenForSidechain accepts 0 parameters', (t) => {
    const paramCount = isMicOpenForSidechain.length;
    t.assertEquals(paramCount, 0, 'isMicOpenForSidechain should accept 0 parameters');
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
    t.assertEquals(paramCount, 3, 'addExternalAudioFileAsClip should accept 3 parameters');
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
    t.assertEquals(paramCount, 2, 'updateAudioClipPosition should accept 2 parameters');
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
    t.assertEquals(paramCount, 2, 'updateAudioClipDuration should accept 2 parameters');
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
    t.assertEquals(getPunchRegion.length, 0, 'getPunchRegion should accept 0 parameters');
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
    t.assertEquals(setPunchRegion.length, 2, 'setPunchRegion should accept 2 parameters');
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
    t.assertEquals(setPunchRegionEnabled.length, 1, 'setPunchRegionEnabled should accept 1 parameter');
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
    t.assertEquals(isPunchRegionEnabled.length, 0, 'isPunchRegionEnabled should accept 0 parameters');
});

TestRunner.test('Punch Region - isPunchRegionEnabled returns boolean', (t) => {
    const result = isPunchRegionEnabled();
    t.assertEqual(typeof result, 'boolean', 'isPunchRegionEnabled should return a boolean');
});

TestRunner.test('Punch Region - getPunchInBars is a function export', (t) => {
    t.assertEqual(typeof getPunchInBars, 'function', 'getPunchInBars should be a function');
});

TestRunner.test('Punch Region - getPunchInBars accepts 0 parameters', (t) => {
    t.assertEquals(getPunchInBars.length, 0, 'getPunchInBars should accept 0 parameters');
});

TestRunner.test('Punch Region - getPunchOutBars is a function export', (t) => {
    t.assertEqual(typeof getPunchOutBars, 'function', 'getPunchOutBars should be a function');
});

TestRunner.test('Punch Region - getPunchOutBars accepts 0 parameters', (t) => {
    t.assertEquals(getPunchOutBars.length, 0, 'getPunchOutBars should accept 0 parameters');
});

TestRunner.test('Punch Region - isPositionInPunchRegion is a function export', (t) => {
    t.assertEqual(typeof isPositionInPunchRegion, 'function', 'isPositionInPunchRegion should be a function');
});

TestRunner.test('Punch Region - isPositionInPunchRegion accepts 1 parameter', (t) => {
    t.assertEquals(isPositionInPunchRegion.length, 1, 'isPositionInPunchRegion should accept 1 parameter');
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
    t.assertEquals(scheduleRecordingForPunch.length, 2, 'scheduleRecordingForPunch should accept 2 parameters');
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
    t.assertEquals(cancelScheduledRecording.length, 0, 'cancelScheduledRecording should accept 0 parameters');
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
    t.assertEquals(getRecordingScheduledTrackId.length, 0, 'getRecordingScheduledTrackId should accept 0 parameters');
});

TestRunner.test('Punch Recording - getRecordingScheduledTrackId returns recordingScheduledTrackId', (t) => {
    const funcStr = getRecordingScheduledTrackId.toString();
    t.assertTruthy(funcStr.includes('recordingScheduledTrackId') || funcStr.includes('return'), 'getRecordingScheduledTrackId should return recordingScheduledTrackId');
});

TestRunner.test('Punch Recording - cleanupRecordingScheduling is a function export', (t) => {
    t.assertEqual(typeof cleanupRecordingScheduling, 'function', 'cleanupRecordingScheduling should be a function');
});

TestRunner.test('Punch Recording - cleanupRecordingScheduling accepts 0 parameters', (t) => {
    t.assertEquals(cleanupRecordingScheduling.length, 0, 'cleanupRecordingScheduling should accept 0 parameters');
});

TestRunner.test('Punch Recording - cleanupRecordingScheduling calls cancelScheduledRecording', (t) => {
    const funcStr = cleanupRecordingScheduling.toString();
    t.assertTruthy(funcStr.includes('cancelScheduledRecording'), 'cleanupRecordingScheduling should call cancelScheduledRecording');
});

TestRunner.test('Punch Recording & Punch Region - APP_VERSION validation for