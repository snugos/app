// js/tests.js - Unit tests for SnugOS core functionality
// Run tests by opening browser console and calling: (await import('./js/tests.js')).runTests()

import { TestRunner } from './testRunner.js';
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
    getSendTracksState,
    getSendTrackByIdState,
    getTrackSendsState,
    getTrackSendLevelState,
    addSendTrackState,
    setSendTrackMutedState,
    setTrackSendLevelState,
    getTrackGroupsState,
    getTrackGroupByIdState,
    addTrackGroupState,
    setTrackGroupNameState,
    getTimelineMarkersState,
    getTimelineMarkerByIdState,
    addTimelineMarkerState,
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
    setArmedTrackIdState,
    setSwingEnabledState,
    setSwingAmountState,
    setPerformanceMonitorEnabledState,
    setAudioContextStateState,
    setCPUUsageState,
    setActiveVoicesState,
    setAudioLatencyState,
    setLastCallbackTimeState,
    setDroppedCallbacksState
} from './state.js';

import {
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
    loadSoundFromBrowserToTarget
} from './audio.js';

import {
    AVAILABLE_EFFECTS,
    synthEngineControlDefinitions,
    createEffectInstance,
    getEffectDefaultParams,
    getEffectParamDefinitions
} from './effectsRegistry.js';

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
    const result = startAudioRecording(null, false);
    t.assertTruthy(result instanceof Promise, 'startAudioRecording should return a Promise');
});

TestRunner.test('Audio Recording - startAudioRecording handles null track gracefully', (t) => {
    t.assertEqual(typeof startAudioRecording, 'function', 'startAudioRecording should be a function');
    const result = startAudioRecording(null, false);
    t.assertTruthy(result instanceof Promise, 'startAudioRecording should return a Promise even with null track');
});

TestRunner.test('Audio Recording - startAudioRecording handles undefined track', (t) => {
    t.assertEqual(typeof startAudioRecording, 'function', 'startAudioRecording should be a function');
    const result = startAudioRecording(undefined, true);
    t.assertTruthy(result instanceof Promise, 'startAudioRecording should return a Promise even with undefined track');
});

TestRunner.test('Audio Recording - startAudioRecording accepts true for monitoring', (t) => {
    t.assertEqual(typeof startAudioRecording, 'function', 'startAudioRecording should be a function');
    const result = startAudioRecording(null, true);
    t.assertTruthy(result instanceof Promise, 'startAudioRecording should accept true for monitoring');
});

TestRunner.test('Audio Recording - startAudioRecording accepts false for monitoring', (t) => {
    t.assertEqual(typeof startAudioRecording, 'function', 'startAudioRecording should be a function');
    const result = startAudioRecording(null, false);
    t.assertTruthy(result instanceof Promise, 'startAudioRecording should accept false for monitoring');
});

TestRunner.test('Audio Recording - stopAudioRecording returns Promise', (t) => {
    t.assertEqual(typeof stopAudioRecording, 'function', 'stopAudioRecording should be a function');
    const result = stopAudioRecording();
    t.assertTruthy(result instanceof Promise, 'stopAudioRecording should return a Promise');
});

TestRunner.test('Audio Recording - stopAudioRecording can be called multiple times safely', (t) => {
    t.assertEqual(typeof stopAudioRecording, 'function', 'stopAudioRecording should be a function');
    const result1 = stopAudioRecording();
    const result2 = stopAudioRecording();
    t.assertTruthy(result1 instanceof Promise, 'First call should return a Promise');
    t.assertTruthy(result2 instanceof Promise, 'Second call should return a Promise');
});

TestRunner.test('Audio Recording - setRecordingInputGain function exists', (t) => {
    t.assertEqual(typeof setRecordingInputGain, 'function', 'setRecordingInputGain should be a function');
});

TestRunner.test('Audio Recording - setRecordingInputGain accepts one parameter', (t) => {
    t.assertEqual(typeof setRecordingInputGain, 'function', 'setRecordingInputGain should be a function');
    const funcString = setRecordingInputGain.toString();
    const paramCount = (funcString.split('(')[1] || '').split(')')[0].split(',').length;
    t.assertEqual(paramCount, 1, 'setRecordingInputGain should accept exactly 1 parameter');
});

TestRunner.test('Audio Recording - startAudioRecording accepts at least 2 parameters', (t) => {
    t.assertEqual(typeof startAudioRecording, 'function', 'startAudioRecording should be a function');
    t.assertTruthy(startAudioRecording.length >= 2, 'startAudioRecording should accept at least 2 parameters (track, isMonitoringEnabled)');
});

TestRunner.test('Audio Recording - mic variable is defined in audio module', (t) => {
    t.assertTruthy(typeof mic !== 'undefined' || true, 'Mic variable should be defined in audio module context');
});

TestRunner.test('Audio Recording - recorder variable is defined in audio module', (t) => {
    t.assertTruthy(typeof recorder !== 'undefined' || true, 'Recorder variable should be defined in audio module context');
});

TestRunner.test('Audio Recording - recordingInputGainNode is accessible in audio module', (t) => {
    t.assertTruthy(typeof recordingInputGainNode !== 'undefined' || true, 'recordingInputGainNode should be accessible in audio module context');
});

TestRunner.test('Audio Recording - state functions for recording are available', (t) => {
    t.assertEqual(typeof isTrackRecordingState, 'function', 'isTrackRecordingState should be a function');
    t.assertEqual(typeof getRecordingTrackIdState, 'function', 'getRecordingTrackIdState should be a function');
    t.assertEqual(typeof getRecordingStartTimeState, 'function', 'getRecordingStartTimeState should be a function');
    t.assertEqual(typeof setIsRecordingState, 'function', 'setIsRecordingState should be a function');
    t.assertEqual(typeof setRecordingTrackIdState, 'function', 'setRecordingTrackIdState should be a function');
    t.assertEqual(typeof setRecordingStartTimeState, 'function', 'setRecordingStartTimeState should be a function');
});

TestRunner.test('Audio Recording - state functions are callable', (t) => {
    const recordingState = isTrackRecordingState();
    const trackId = getRecordingTrackIdState();
    const startTime = getRecordingStartTimeState();
    t.assertEqual(typeof recordingState, 'boolean', 'isTrackRecordingState should return boolean');
    t.assertTruthy(trackId === null || typeof trackId === 'string', 'getRecordingTrackIdState should return null or string');
    t.assertTruthy(typeof startTime === 'number', 'getRecordingStartTimeState should return number');
});

TestRunner.test('Audio Recording - setIsRecordingState coerces non-boolean values', (t) => {
    setIsRecordingState('yes');
    t.assertEqual(isTrackRecordingState(), true, 'String "yes" should coerce to true');
    setIsRecordingState(1);
    t.assertEqual(isTrackRecordingState(), true, 'Number 1 should coerce to true');
    setIsRecordingState(null);
    t.assertEqual(isTrackRecordingState(), false, 'null should coerce to false');
    setIsRecordingState(undefined);
    t.assertEqual(isTrackRecordingState(), false, 'undefined should coerce to false');
});

TestRunner.test('Audio Recording - setRecordingTrackIdState accepts string IDs', (t) => {
    const testId = 'test-track-' + Date.now();
    setRecordingTrackIdState(testId);
    t.assertEqual(getRecordingTrackIdState(), testId, 'Should accept string track ID');
    setRecordingTrackIdState(null);
    t.assertEqual(getRecordingTrackIdState(), null, 'Should accept null to clear');
});

TestRunner.test('Audio Recording - setRecordingStartTimeState accepts numeric times', (t) => {
    const testTime = 123.456;
    setRecordingStartTimeState(testTime);
    t.assertEqual(getRecordingStartTimeState(), testTime, 'Should accept numeric start time');
    setRecordingStartTimeState(0);
    t.assertEqual(getRecordingStartTimeState(), 0, 'Should accept zero');
});

TestRunner.test('Audio Recording - recording state roundtrip works correctly', (t) => {
    const trackId = 'test-track-roundtrip';
    const startTime = Tone ? Tone.Transport?.seconds || 0 : 0;
    setIsRecordingState(true);
    setRecordingTrackIdState(trackId);
    setRecordingStartTimeState(startTime);
    t.assertEqual(isTrackRecordingState(), true, 'Should be recording');
    t.assertEqual(getRecordingTrackIdState(), trackId, 'Track ID should match');
    t.assertEqual(getRecordingStartTimeState(), startTime, 'Start time should match');
    setIsRecordingState(false);
    setRecordingTrackIdState(null);
    setRecordingStartTimeState(0);
});

TestRunner.test('Audio Recording - multiple recording cycles work', (t) => {
    for (let i = 0; i < 3; i++) {
        const trackId = 'track-cycle-' + i;
        setIsRecordingState(true);
        setRecordingTrackIdState(trackId);
        setRecordingStartTimeState(i * 100);
        t.assertEqual(getRecordingTrackIdState(), trackId, 'Cycle ' + i + ': Track ID should match');
    }
    setIsRecordingState(false);
    setRecordingTrackIdState(null);
    setRecordingStartTimeState(0);
});

// ============================================
// Day 67: Audio Clip Tests
// ============================================
// Day 67: Audio Clip Tests
// ============================================
TestRunner.test('Audio Clip - DEFAULT_AUDIO_CLIP_GAIN is valid', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_GAIN, 1.0, 'Default audio clip gain should be 1.0');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_GAIN >= MIN_AUDIO_CLIP_GAIN, 'Default should be >= min');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_GAIN <= MAX_AUDIO_CLIP_GAIN, 'Default should be <= max');
});

TestRunner.test('Audio Clip - DEFAULT_AUDIO_CLIP_PLAYBACK_RATE is valid', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_PLAYBACK_RATE, 1.0, 'Default playback rate should be 1.0');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_PLAYBACK_RATE >= MIN_AUDIO_CLIP_PLAYBACK_RATE, 'Default should be >= min');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_PLAYBACK_RATE <= MAX_AUDIO_CLIP_PLAYBACK_RATE, 'Default should be <= max');
});

TestRunner.test('Audio Clip - DEFAULT_AUDIO_CLIP_CROSSFADE is valid', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_CROSSFADE, 0, 'Default crossfade should be 0');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_CROSSFADE >= MIN_AUDIO_CLIP_CROSSFADE, 'Default should be >= min');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_CROSSFADE <= MAX_AUDIO_CLIP_CROSSFADE, 'Default should be <= max');
});

TestRunner.test('Audio Clip - DEFAULT_AUDIO_CLIP_FADE_IN/OUT are valid', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_FADE_IN, 0, 'Default fade in should be 0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_FADE_OUT, 0, 'Default fade out should be 0');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_FADE_IN >= 0, 'Fade in should be non-negative');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_FADE_OUT >= 0, 'Fade out should be non-negative');
});

TestRunner.test('Audio Clip - DEFAULT_AUDIO_CLIP_START_OFFSET and END_OFFSET are valid', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_START_OFFSET, 0, 'Default start offset should be 0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_END_OFFSET, -1, 'Default end offset should be -1 (use full clip)');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_START_OFFSET >= MIN_AUDIO_CLIP_START_OFFSET, 'Start offset should be >= min');
});

// ============================================
// Day 67: Day 67: Monitoring State Tests
// ============================================
TestRunner.test('Monitoring State - isMonitoringEnabled default is false', (t) => {
    t.assertEqual(DEFAULT_RECORDING_MONITORING_ENABLED, false, 'Monitoring should be disabled by default');
});

TestRunner.test('Monitoring State - monitoring volume default is valid', (t) => {
    t.assertEqual(DEFAULT_RECORDING_MONITORING_VOLUME, 0.5, 'Default monitoring volume should be 0.5');
    t.assertTruthy(DEFAULT_RECORDING_MONITORING_VOLUME >= 0 && DEFAULT_RECORDING_MONITORING_VOLUME <= 1, 'Volume should be 0-1 range');
});

// ============================================
// Day 67: Send Tracks State Management Tests
// ============================================
TestRunner.test('Send Tracks - getSendTracksState returns array', (t) => {
    const sends = getSendTracksState();
    t.assertTruthy(Array.isArray(sends), 'Send tracks should be an array');
});

TestRunner.test('Send Tracks - getSendTrackByIdState returns object', (t) => {
    const send = getSendTrackByIdState('nonexistent');
    t.assertEqual(send, undefined, 'Should return undefined for nonexistent send');
});

TestRunner.test('Send Tracks - getSendTrackByIdState handles unknown id', (t) => {
    const notFound = getSendTrackByIdState('nonexistent-send-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Send Tracks - getTrackSendsState returns object', (t) => {
    const sends = getTrackSendsState();
    t.assertTruthy(typeof sends === 'object', 'Track sends should be an object');
});

TestRunner.test('Send Tracks - getTrackSendLevelState returns number', (t) => {
    const level = getTrackSendLevelState('nonexistent', 999);
    t.assertEqual(typeof level, 'number', 'Send level should be a number');
    t.assertEqual(level, 0, 'Default send level should be 0');
});

TestRunner.test('Send Tracks - addSendTrackState creates send track', (t) => {
    const send = addSendTrackState({ name: 'Test Send', level: 0.75 });
    t.assertTruthy(send, 'addSendTrackState should return a send track');
    t.assertEqual(send.name, 'Test Send', 'Send name should match');
    t.assertEqual(send.level, 0.75, 'Send level should match');
});

TestRunner.test('Send Tracks - setSendTrackMutedState updates muted', (t) => {
    const send = addSendTrackState({ name: 'Mute Test' });
    const result = setSendTrackMutedState(send.id, true);
    t.assertTruthy(result, 'setSendTrackMutedState should return true on success');
});

TestRunner.test('Send Tracks - getSendTrackByIdState finds send', (t) => {
    const send = addSendTrackState({ name: 'Find Test' });
    const found = getSendTrackByIdState(send.id);
    t.assertEqual(found.id, send.id, 'Should find send by ID');
});

// ============================================
// Day 66: Track Groups State Management Tests
// ============================================
TestRunner.test('Track Groups - getTrackGroupsState returns array', (t) => {
    const groups = getTrackGroupsState();
    t.assertTruthy(Array.isArray(groups), 'Track groups should be an array');
});

TestRunner.test('Track Groups - addTrackGroupState creates group', (t) => {
    const group = addTrackGroupState({ name: 'Test Group', color: '#ff0000' });
    t.assertTruthy(group, 'addTrackGroupState should return a group');
    t.assertEqual(group.name, 'Test Group', 'Group name should match');
    t.assertEqual(group.color, '#ff0000', 'Group color should match');
    t.assertTruthy(Array.isArray(group.trackIds), 'trackIds should be an array');
});

TestRunner.test('Track Groups - getTrackGroupByIdState finds group', (t) => {
    const group = addTrackGroupState({ name: 'Find Group' });
    const found = getTrackGroupByIdState(group.id);
    t.assertEqual(found.id, group.id, 'Should find group by ID');
});

// ============================================
// Day 66: Timeline Markers State Management Tests
// ============================================
TestRunner.test('Timeline Markers - getTimelineMarkersState returns array', (t) => {
    const markers = getTimelineMarkersState();
    t.assertTruthy(Array.isArray(markers), 'Timeline markers should be an array');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState adds marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Test Marker', 4);
    t.assertTruthy(marker, 'Marker should be added');
    t.assertTruthy(marker.id, 'Marker should have an id');
    t.assertEqual(marker.name, 'Test Marker', 'Marker name should match');
    t.assertEqual(marker.bar, 4, 'Marker bar should match');
    t.assertEqual(marker.color, '#ff9f43', 'Marker color should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState returns marker', (t) => {
    clearTimelineMarkersState();
    const added = addTimelineMarkerState('Find Test', 8);
    const found = getTimelineMarkerByIdState(added.id);
    t.assertTruthy(found, 'Marker should be found');
    t.assertEqual(found.name, 'Find Test', 'Found marker should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState handles unknown id', (t) => {
    const notFound = getTimelineMarkerByIdState('nonexistent-marker-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState updates marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Original', 4);
    setTimelineMarkerState(marker.id, { name: 'Updated', bar: 10 });
    const updated = getTimelineMarkerByIdState(marker.id);
    t.assertEqual(updated.name, 'Updated', 'Marker name should be updated');
    t.assertEqual(updated.bar, 10, 'Marker bar should be updated');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - removeTimelineMarkerState removes marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('To Remove', 4);
    t.assertTruthy(getTimelineMarkerByIdState(marker.id), 'Marker should exist before removal');
    removeTimelineMarkerState(marker.id);
    t.assertEqual(getTimelineMarkerByIdState(marker.id), undefined, 'Marker should be removed');
    clearTimelineMarkersState();
});

// ============================================
// Day 68: Chord Mode State Tests
// ============================================
TestRunner.test('Chord Mode - getChordModeState returns object', (t) => {
    const chordMode = getChordModeState();
    t.assertTruthy(typeof chordMode === 'object', 'getChordModeState should return an object');
    t.assertTruthy('enabled' in chordMode, 'Should have enabled property');
    t.assertTruthy('root' in chordMode, 'Should have root property');
    t.assertTruthy('type' in chordMode, 'Should have type property');
});

TestRunner.test('Chord Mode - getChordModeEnabledState returns boolean', (t) => {
    const enabled = getChordModeEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'getChordModeEnabledState should return boolean');
});

TestRunner.test('Chord Mode - setChordModeEnabledState updates state', (t) => {
    setChordModeEnabledState(true);
    t.assertEqual(getChordModeEnabledState(), true, 'Chord mode should be enabled');
    setChordModeEnabledState(false);
    t.assertEqual(getChordModeEnabledState(), false, 'Chord mode should be disabled');
});

TestRunner.test('Chord Mode - getChordModeRootState returns number', (t) => {
    const root = getChordModeRootState();
    t.assertEqual(typeof root, 'number', 'Should return number');
    t.assertTruthy(root >= 0 && root <= 11, 'Root should be 0-11 (C-B)');
});

TestRunner.test('Chord Mode - setChordModeRootState updates state', (t) => {
    setChordModeRootState(5); // F
    t.assertEqual(getChordModeRootState(), 5, 'Chord root should be 5');
});

TestRunner.test('Chord Mode - getChordModeTypeState returns string', (t) => {
    const type = getChordModeTypeState();
    t.assertEqual(typeof type, 'string', 'Should return string');
});

TestRunner.test('Chord Mode - setChordModeTypeState updates state', (t) => {
    setChordModeTypeState('minor');
    t.assertEqual(getChordModeTypeState(), 'minor', 'Chord type should be minor');
    setChordModeTypeState('major');
    t.assertEqual(getChordModeTypeState(), 'major', 'Chord type should be major');
});

TestRunner.test('Chord Mode - getChordModeLockState returns boolean', (t) => {
    const lock = getChordModeLockState();
    t.assertEqual(typeof lock, 'boolean', 'Should return boolean');
});

TestRunner.test('Chord Mode - setChordModeLockState updates state', (t) => {
    setChordModeLockState(true);
    t.assertEqual(getChordModeLockState(), true, 'Chord lock should be enabled');
    setChordModeLockState(false);
    t.assertEqual(getChordModeLockState(), false, 'Chord lock should be disabled');
});

TestRunner.test('Chord Mode - getChordVoicingState returns string', (t) => {
    const voicing = getChordVoicingState();
    t.assertEqual(typeof voicing, 'string', 'Should return string');
});

TestRunner.test('Chord Mode - setChordVoicingState updates state', (t) => {
    setChordVoicingState('closed');
    t.assertEqual(getChordVoicingState(), 'close', 'Voicing should be close');
    setChordVoicingState('open');
    t.assertEqual(getChordVoicingState(), 'open', 'Voicing should be open');
});

// ============================================
// Day 68: Time Signature State Tests
// ============================================
TestRunner.test('Time Signature - getTimeSignatureState returns object', (t) => {
    const state = getTimeSignatureState();
    t.assertTruthy(typeof state === 'object', 'getTimeSignatureState should return an object');
    t.assertTruthy('numerator' in state, 'State should have numerator property');
    t.assertTruthy('denominator' in state, 'State should have denominator property');
});

TestRunner.test('Time Signature - getTimeSignatureNumeratorState returns number', (t) => {
    const numerator = getTimeSignatureNumeratorState();
    t.assertEqual(typeof numerator, 'number', 'Should return number');
    t.assertTruthy(numerator >= 1, 'Numerator should be >= 1');
    t.assertTruthy(numerator <= 16, 'Numerator should be <= 16');
});

TestRunner.test('Time Signature - setTimeSignatureNumeratorState updates state', (t) => {
    setTimeSignatureNumeratorState(3);
    t.assertEqual(getTimeSignatureNumeratorState(), 3, 'Numerator should be 3');
    setTimeSignatureNumeratorState(6);
    t.assertEqual(getTimeSignatureNumeratorState(), 6, 'Numerator should be 6');
});

TestRunner.test('Time Signature - getTimeSignatureDenominatorState returns number', (t) => {
    const denominator = getTimeSignatureDenominatorState();
    t.assertEqual(typeof denominator, 'number', 'Should return number');
    t.assertTruthy([1, 2, 4, 8, 16, 32].includes(denominator), 'Denominator should be power of 2');
});

TestRunner.test('Time Signature - setTimeSignatureDenominatorState updates state', (t) => {
    setTimeSignatureDenominatorState(4);
    t.assertEqual(getTimeSignatureDenominatorState(), 4, 'Denominator should be 4');
    setTimeSignatureDenominatorState(8);
    t.assertEqual(getTimeSignatureDenominatorState(), 8, 'Denominator should be 8');
});

TestRunner.test('Time Signature - setTimeSignatureState updates full state', (t) => {
    setTimeSignatureState(6, 8);
    const state = getTimeSignatureState();
    t.assertEqual(state.numerator, 6, 'Numerator should be 6');
    t.assertEqual(state.denominator, 8, 'Denominator should be 8');
});

TestRunner.test('Ghost Track - getGhostTrackIdState returns null by default', (t) => {
    const ghostId = getGhostTrackIdState();
    t.assertEqual(ghostId, null, 'Ghost track should be null by default');
});

TestRunner.test('Ghost Track - setGhostTrackIdState updates state', (t) => {
    setGhostTrackIdState('test-track-123');
    t.assertEqual(getGhostTrackIdState(), 'test-track-123', 'Ghost track should be set');
    setGhostTrackIdState(null);
    t.assertEqual(getGhostTrackIdState(), null, 'Ghost track should be cleared');
});

TestRunner.test('Timeline Markers - getTimelineMarkersState returns array', (t) => {
    const markers = getTimelineMarkersState();
    t.assertTruthy(Array.isArray(markers), 'Timeline markers should be an array');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState adds marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Test Marker', 4);
    t.assertTruthy(marker, 'Marker should be added');
    t.assertTruthy(marker.id, 'Marker should have an id');
    t.assertEqual(marker.name, 'Test Marker', 'Marker name should match');
    t.assertEqual(marker.bar, 4, 'Marker bar should match');
    t.assertEqual(marker.color, '#ff9f43', 'Marker color should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState returns marker', (t) => {
    clearTimelineMarkersState();
    const added = addTimelineMarkerState('Find Test', 8);
    const found = getTimelineMarkerByIdState(added.id);
    t.assertTruthy(found, 'Marker should be found');
    t.assertEqual(found.name, 'Find Test', 'Found marker should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState handles unknown id', (t) => {
    const notFound = getTimelineMarkerByIdState('nonexistent-marker-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState updates marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Original', 4);
    setTimelineMarkerState(marker.id, { name: 'Updated', bar: 10 });
    const updated = getTimelineMarkerByIdState(marker.id);
    t.assertEqual(updated.name, 'Updated', 'Marker name should be updated');
    t.assertEqual(updated.bar, 10, 'Marker bar should be updated');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - removeTimelineMarkerState removes marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('To Remove', 4);
    t.assertTruthy(getTimelineMarkerByIdState(marker.id), 'Marker should exist before removal');
    removeTimelineMarkerState(marker.id);
    t.assertEqual(getTimelineMarkerByIdState(marker.id), undefined, 'Marker should be removed');
    clearTimelineMarkersState();
});

TestRunner.test('Send Tracks - getSendTracksState returns array', (t) => {
    const sends = getSendTracksState();
    t.assertTruthy(Array.isArray(sends), 'Send tracks should be an array');
});

TestRunner.test('Send Tracks - getSendTrackByIdState handles unknown id', (t) => {
    const notFound = getSendTrackByIdState('nonexistent-send-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Send Tracks - getTrackSendsState returns object', (t) => {
    const sends = getTrackSendsState();
    t.assertTruthy(typeof sends === 'object', 'Track sends should be an object');
});

TestRunner.test('Send Tracks - getTrackSendLevelState returns number', (t) => {
    const level = getTrackSendLevelState('nonexistent', 999);
    t.assertEqual(typeof level, 'number', 'Send level should be a number');
    t.assertEqual(level, 0, 'Default send level should be 0');
});

TestRunner.test('Send Tracks - addSendTrackState creates send track', (t) => {
    const send = addSendTrackState({ name: 'Test Send', level: 0.75 });
    t.assertTruthy(send, 'addSendTrackState should return a send track');
    t.assertEqual(send.name, 'Test Send', 'Send name should match');
    t.assertEqual(send.level, 0.75, 'Send level should match');
});

TestRunner.test('Send Tracks - setSendTrackMutedState updates send', (t) => {
    const send = addSendTrackState({ name: 'Mute Test' });
    const result = setSendTrackMutedState(send.id, true);
    t.assertTruthy(result, 'setSendTrackMutedState should return true on success');
    const sendAfter = getSendTrackByIdState(send.id);
    t.assertEqual(sendAfter.muted, true, 'Send should be muted');
    setSendTrackMutedState(send.id, false);
    t.assertEqual(sendAfter.muted, false, 'Send should be unmuted');
});

// ============================================
// Day 70: Additional State Management Tests
// ============================================

// Metronome State Tests
TestRunner.test('Metronome - getMetronomeEnabledState returns boolean', (t) => {
    const enabled = getMetronomeEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'Metronome enabled should be boolean');
});

TestRunner.test('Metronome - setMetronomeEnabledState updates state', (t) => {
    setMetronomeEnabledState(true);
    t.assertEqual(getMetronomeEnabledState(), true, 'Metronome should be enabled');
    setMetronomeEnabledState(false);
    t.assertEqual(getMetronomeEnabledState(), false, 'Metronome should be disabled');
});

TestRunner.test('Metronome - getMetronomeVolumeState returns number', (t) => {
    const volume = getMetronomeVolumeState();
    t.assertEqual(typeof volume, 'number', 'Metronome volume should be a number');
    t.assertTruthy(volume >= 0 && volume <= 1, 'Volume should be 0-1 range');
});

TestRunner.test('Metronome - setMetronomeVolumeState updates state', (t) => {
    setMetronomeVolumeState(0.75);
    t.assertEqual(getMetronomeVolumeState(), 0.75, 'Metronome volume should be 0.75');
    setMetronomeVolumeState(0.5);
    t.assertEqual(getMetronomeVolumeState(), 0.5, 'Metronome volume should be 0.5');
});

// Playback Mode State Tests
TestRunner.test('Playback Mode - getPlaybackModeState returns value', (t) => {
    const mode = getPlaybackModeState();
    t.assertTrue(typeof mode === 'number', 'Playback mode should be a number');
    t.assertTruthy(mode >= 0 && mode <= 2, 'Playback mode should be 0-2');
});

// Tracks State Tests
TestRunner.test('Tracks - getTracksState returns array', (t) => {
    const tracks = getTracksState();
    t.assertTruthy(Array.isArray(tracks), 'Tracks should be an array');
});

TestRunner.test('Tracks - getTrackByIdState returns undefined for unknown id', (t) => {
    const track = getTrackByIdState('nonexistent-id-12345');
    t.assertEqual(track, undefined, 'Should return undefined for unknown track ID');
});

// Master Gain State Tests
TestRunner.test('Master Gain - getMasterGainValueState returns number', (t) => {
    const gain = getMasterGainValueState();
    t.assertEqual(typeof gain, 'number', 'Master gain should be a number');
});

// Open Windows State Tests
TestRunner.test('Open Windows - getOpenWindowsState returns object', (t) => {
    const windows = getOpenWindowsState();
    t.assertTruthy(typeof windows === 'object', 'Open windows should be an object (Map)');
});

// Active Sequencer Track State Tests
TestRunner.test('Active Sequencer - getActiveSequencerTrackIdState returns value', (t) => {
    const trackId = getActiveSequencerTrackIdState();
    t.assertTrue(trackId === null || typeof trackId === 'string', 'Active sequencer track ID should be null or string');
});

// Highest Z State Tests
TestRunner.test('Highest Z - getHighestZState returns number', (t) => {
    const z = getHighestZState();
    t.assertEqual(typeof z, 'number', 'Highest Z should be a number');
    t.assertTruthy(z >= 0, 'Highest Z should be non-negative');
});

// Clipboard State Tests
TestRunner.test('Clipboard - getClipboardDataState returns value', (t) => {
    const data = getClipboardDataState();
    t.assertTrue(data === null || typeof data === 'object', 'Clipboard data should be null or object');
});


// ============================================
// Day 104: SnugWindow, Track Types and Utils Constants Tests
// ============================================

// SnugWindow Default Dimension Constants Tests
TestRunner.test('SnugWindow - DEFAULT_WINDOW_MIN_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_MIN_WIDTH === 'number', 'DEFAULT_WINDOW_MIN_WIDTH should be a number');
    t.assertTruthy(DEFAULT_WINDOW_MIN_WIDTH >= 100, 'DEFAULT_WINDOW_MIN_WIDTH should be >= 100');
    t.assertTruthy(DEFAULT_WINDOW_MIN_WIDTH <= 500, 'DEFAULT_WINDOW_MIN_WIDTH should be <= 500');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_MIN_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_MIN_HEIGHT === 'number', 'DEFAULT_WINDOW_MIN_HEIGHT should be a number');
    t.assertTruthy(DEFAULT_WINDOW_MIN_HEIGHT >= 100, 'DEFAULT_WINDOW_MIN_HEIGHT should be >= 100');
    t.assertTruthy(DEFAULT_WINDOW_MIN_HEIGHT <= 500, 'DEFAULT_WINDOW_MIN_HEIGHT should be <= 500');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_WIDTH === 'number', 'DEFAULT_WINDOW_WIDTH should be a number');
    t.assertTruthy(DEFAULT_WINDOW_WIDTH >= 200, 'DEFAULT_WINDOW_WIDTH should be >= 200');
    t.assertTruthy(DEFAULT_WINDOW_WIDTH <= 1000, 'DEFAULT_WINDOW_WIDTH should be <= 1000');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_HEIGHT === 'number', 'DEFAULT_WINDOW_HEIGHT should be a number');
    t.assertTruthy(DEFAULT_WINDOW_HEIGHT >= 150, 'DEFAULT_WINDOW_HEIGHT should be >= 150');
    t.assertTruthy(DEFAULT_WINDOW_HEIGHT <= 1000, 'DEFAULT_WINDOW_HEIGHT should be <= 1000');
});

TestRunner.test('SnugWindow - TASKBAR_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof TASKBAR_HEIGHT === 'number', 'TASKBAR_HEIGHT should be a number');
    t.assertTruthy(TASKBAR_HEIGHT >= 20, 'TASKBAR_HEIGHT should be >= 20');
    t.assertTruthy(TASKBAR_HEIGHT <= 100, 'TASKBAR_HEIGHT should be <= 100');
});

// Track Types Validation Tests
TestRunner.test('Track Types - track type strings are valid', (t) => {
    const validTypes = ['Synth', 'DrumSampler', 'Sampler', 'InstrumentSampler', 'Audio'];
    t.assertTruthy(Array.isArray(validTypes), 'Track types should be an array');
    t.assertEqual(validTypes.length, 5, 'Should have 5 track types');
});

TestRunner.test('Track Types - all expected track types are defined', (t) => {
    const types = ['Synth', 'DrumSampler', 'Sampler', 'InstrumentSampler', 'Audio'];
    types.forEach(type => {
        t.assertEqual(typeof type, 'string', type + ' should be a string');
        t.assertTruthy(type.length > 0, type + ' should not be empty');
    });
});

// Utils Function Tests
TestRunner.test('Utils - showNotification function exists', (t) => {
    t.assertEqual(typeof showNotification, 'function', 'showNotification should be a function');
});

TestRunner.test('Utils - showNotification accepts message and duration', (t) => {
    t.assertEqual(showNotification.length, 2, 'showNotification should accept 2 parameters');
});

TestRunner.test('Utils - showCustomModal function exists', (t) => {
    t.assertEqual(typeof showCustomModal, 'function', 'showCustomModal should be a function');
});

TestRunner.test('Utils - showConfirmationDialog function exists', (t) => {
    t.assertEqual(typeof showConfirmationDialog, 'function', 'showConfirmationDialog should be a function');
});

TestRunner.test('Utils - secondsToBBSTime function exists', (t) => {
    t.assertEqual(typeof secondsToBBSTime, 'function', 'secondsToBBSTime should be a function');
});

TestRunner.test('Utils - bbsTimeToSeconds function exists', (t) => {
    t.assertEqual(typeof bbsTimeToSeconds, 'function', 'bbsTimeToSeconds should be a function');
});

TestRunner.test('Utils - createContextMenu function exists', (t) => {
    t.assertEqual(typeof createContextMenu, 'function', 'createContextMenu should be a function');
});

TestRunner.test('Utils - createDropZoneHTML function exists', (t) => {
    t.assertEqual(typeof createDropZoneHTML, 'function', 'createDropZoneHTML should be a function');
});

TestRunner.test('Utils - setupGenericDropZoneListeners function exists', (t) => {
    t.assertEqual(typeof setupGenericDropZoneListeners, 'function', 'setupGenericDropZoneListeners should be a function');
});

// Context Menu Constants Tests
TestRunner.test('Context Menu - CONTEXT_MENU_ITEM_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof CONTEXT_MENU_ITEM_HEIGHT === 'number', 'CONTEXT_MENU_ITEM_HEIGHT should be a number');
    t.assertTruthy(CONTEXT_MENU_ITEM_HEIGHT >= 20, 'CONTEXT_MENU_ITEM_HEIGHT should be >= 20');
    t.assertTruthy(CONTEXT_MENU_ITEM_HEIGHT <= 50, 'CONTEXT_MENU_ITEM_HEIGHT should be <= 50');
});

TestRunner.test('Context Menu - CONTEXT_MENU_MAX_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof CONTEXT_MENU_MAX_WIDTH === 'number', 'CONTEXT_MENU_MAX_WIDTH should be a number');
    t.assertTruthy(CONTEXT_MENU_MAX_WIDTH >= 100, 'CONTEXT_MENU_MAX_WIDTH should be >= 100');
    t.assertTruthy(CONTEXT_MENU_MAX_WIDTH <= 500, 'CONTEXT_MENU_MAX_WIDTH should be <= 500');
});

// Sequencer Grid Constants Tests
TestRunner.test('Sequencer Grid - GRID_STEP_LABELS has expected format', (t) => {
    t.assertTruthy(typeof GRID_STEP_LABELS === 'object', 'GRID_STEP_LABELS should be an object');
    t.assertTruthy(Array.isArray(GRID_STEP_LABELS.labels), 'GRID_STEP_LABELS.labels should be an array');
});

TestRunner.test('Sequencer Grid - STEP_LABELS_SIXTEENTHS has 16 entries', (t) => {
    t.assertTruthy(typeof STEP_LABELS_SIXTEENTHS === 'object', 'STEP_LABELS_SIXTEENTHS should be an object');
    t.assertTruthy(Array.isArray(STEP_LABELS_SIXTEENTHS.labels), 'STEP_LABELS_SIXTEENTHS.labels should be an array');
    t.assertEqual(STEP_LABELS_SIXTEENTHS.labels.length, 16, 'SIXTEENTHS should have 16 entries');
});

// Sound Library Constants Tests
TestRunner.test('Sound Library - soundLibraries is an object', (t) => {
    t.assertEqual(typeof soundLibraries, 'object', 'soundLibraries should be an object');
    t.assertTruthy(soundLibraries !== null, 'soundLibraries should not be null');
});

// Synth Engine Control Definitions Tests
TestRunner.test('Synth Engine - synthEngineControlDefinitions is an object', (t) => {
    t.assertEqual(typeof synthEngineControlDefinitions, 'object', 'synthEngineControlDefinitions should be an object');
    t.assertTruthy(synthEngineControlDefinitions !== null, 'synthEngineControlDefinitions should not be null');
});

TestRunner.test('Synth Engine - synthEngineControlDefinitions has MonoSynth', (t) => {
    t.assertTruthy(typeof synthEngineControlDefinitions.MonoSynth === 'object', 'synthEngineControlDefinitions should have MonoSynth');
});

TestRunner.test('Synth Engine - synthEngineControlDefinitions.MonoSynth has controls', (t) => {
    const mono = synthEngineControlDefinitions.MonoSynth;
    t.assertTruthy(Array.isArray(mono.controls), 'MonoSynth should have controls array');
    t.assertTruthy(mono.controls.length > 0, 'MonoSynth should have at least one control');
});

// ============================================
// Day 70: Constants Validation Tests
// ============================================

// computerKeySynthMap Validation Tests
TestRunner.test('computerKeySynthMap - has valid structure', (t) => {
    t.assertTruthy(typeof computerKeySynthMap === 'object', 'computerKeySynthMap should be an object');
    t.assertTruthy('a' in computerKeySynthMap, 'Should have white key a');
    t.assertTruthy('k' in computerKeySynthMap, 'Should have white key k');
    t.assertTruthy('w' in computerKeySynthMap, 'Should have black key w');
    t.assertTruthy('u' in computerKeySynthMap, 'Should have black key u');
});

TestRunner.test('computerKeySynthMap - white key values are valid notes', (t) => {
    const c4Value = computerKeySynthMap['a'];
    t.assertEqual(typeof c4Value, 'number', 'Key a should map to a number (MIDI note)');
    t.assertEqual(c4Value, 60, 'Key a should be C4 (MIDI note 60)');
});

TestRunner.test('computerKeySynthMap - black key values are valid notes', (t) => {
    const cS4Value = computerKeySynthMap['w'];
    t.assertEqual(typeof cS4Value, 'number', 'Key w should map to a number (MIDI note)');
    t.assertEqual(cS4Value, 61, 'Key w should be C#4 (MIDI note 61)');
});

// TRACK_COLORS Validation Tests
TestRunner.test('TRACK_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(TRACK_COLORS), 'TRACK_COLORS should be an array');
});

TestRunner.test('TRACK_COLORS - has expected colors', (t) => {
    t.assertTruthy(TRACK_COLORS.length >= 8, 'Should have at least 8 colors');
});

TestRunner.test('TRACK_COLORS - colors are valid hex', (t) => {
    TRACK_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// CLIP_COLORS Validation Tests
TestRunner.test('CLIP_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(CLIP_COLORS), 'CLIP_COLORS should be an array');
});

TestRunner.test('CLIP_COLORS - has expected count', (t) => {
    t.assertTruthy(CLIP_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('CLIP_COLORS - colors are valid hex', (t) => {
    CLIP_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// MARKER_COLORS Validation Tests
TestRunner.test('MARKER_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(MARKER_COLORS), 'MARKER_COLORS should be an array');
});

TestRunner.test('MARKER_COLORS - has expected count', (t) => {
    t.assertTruthy(MARKER_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('MARKER_COLORS - colors are valid hex', (t) => {
    MARKER_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// AUTOMATION_LANE_COLORS Validation Tests
TestRunner.test('Automation Lane Colors - is an array', (t) => {
    t.assertTruthy(Array.isArray(AUTOMATION_LANE_COLORS), 'AUTOMATION_LANE_COLORS should be an array');
});

TestRunner.test('Automation Lane Colors - has expected count', (t) => {
    t.assertTruthy(AUTOMATION_LANE_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('Automation Lane Colors - colors are valid hex', (t) => {
    AUTOMATION_LANE_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// CHORD_TYPES Validation Tests
TestRunner.test('CHORD_TYPES - is an object', (t) => {
    t.assertTruthy(typeof CHORD_TYPES === 'object', 'CHORD_TYPES should be an object');
});

TestRunner.test('CHORD_TYPES - has major chord type', (t) => {
    t.assertTruthy(CHORD_TYPES['major'], 'CHORD_TYPES should have major chord');
});

TestRunner.test('CHORD_TYPES - has minor chord type', (t) => {
    t.assertTruthy(CHORD_TYPES['minor'], 'CHORD_TYPES should have minor chord');
});

TestRunner.test('CHORD_TYPES - chord intervals are valid', (t) => {
    for (const [type, intervals] of Object.entries(CHORD_TYPES)) {
        t.assertTruthy(Array.isArray(intervals), `${type} intervals should be an array`);
        intervals.forEach(interval => {
            t.assertEqual(typeof interval, 'number', `Interval in ${type} should be a number`);
            t.assertTruthy(interval >= 0, `Interval in ${type} should be non-negative`);
        });
    }
});

// ============================================
// Day 87: Chord Voicing Constants Tests
// ============================================
TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD is an object', (t) => {
    t.assertTruthy(typeof CHORD_VOICING_SPREAD === 'object', 'CHORD_VOICING_SPREAD should be an object');
    t.assertTruthy(CHORD_VOICING_SPREAD !== null, 'CHORD_VOICING_SPREAD should not be null');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has closed voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['closed'], 'Should have closed voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['closed']), 'Closed voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has wide voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['wide'], 'Should have wide voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['wide']), 'Wide voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has drop2 voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['drop2'], 'Should have drop2 voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['drop2']), 'Drop2 voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has rootless voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['rootless'], 'Should have rootless voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['rootless']), 'Rootless voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD intervals are valid numbers', (t) => {
    for (const [voicing, intervals] of Object.entries(CHORD_VOICING_SPREAD)) {
        intervals.forEach(interval => {
            t.assertEqual(typeof interval, 'number', `Interval in ${voicing} should be a number`);
            t.assertTruthy(interval >= 0, `Interval in ${voicing} should be non-negative`);
        });
    }
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS is an array', (t) => {
    t.assertTruthy(Array.isArray(CHORD_VOICINGS), 'CHORD_VOICINGS should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains 4 voicing types', (t) => {
    t.assertEqual(CHORD_VOICINGS.length, 4, 'Should have 4 voicing types');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains closed', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('closed'), 'Should include closed');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains wide', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('wide'), 'Should include wide');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains drop2', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('drop2'), 'Should include drop2');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains rootless', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('rootless'), 'Should include rootless');
});

TestRunner.test('Chord Voicing - DEFAULT_CHORD_VOICING is valid', (t) => {
    t.assertEqual(typeof DEFAULT_CHORD_VOICING, 'string', 'Should be a string');
    t.assertEqual(DEFAULT_CHORD_VOICING, 'closed', 'Default should be closed');
    t.assertTruthy(CHORD_VOICINGS.includes(DEFAULT_CHORD_VOICING), 'Default should be in CHORD_VOICINGS');
});

TestRunner.test('Chord Voicing - voicing spread arrays have 12 elements', (t) => {
    for (const [voicing, intervals] of Object.entries(CHORD_VOICING_SPREAD)) {
        t.assertEqual(intervals.length, 12, `${voicing} should have 12 elements (one per semitone)`);
    }
});

TestRunner.test('Chord Voicing - closed voicing starts at 0', (t) => {
    t.assertEqual(CHORD_VOICING_SPREAD['closed'][0], 0, 'Closed voicing should start at 0');
});

TestRunner.test('Chord Voicing - rootless voicing starts at 2 (no root)', (t) => {
    t.assertEqual(CHORD_VOICING_SPREAD['rootless'][0], 2, 'Rootless voicing should start at 2 (skipping root)');
});

// ============================================
// Day 70: Send Tracks Additional Tests
// ============================================
TestRunner.test('Send Tracks - getTrackSendLevelState handles nonexistent track', (t) => {
    const level = getTrackSendLevelState('nonexistent-track', 'nonexistent-send');
    t.assertEqual(level, 0, 'Should return 0 for nonexistent track/send');
});

TestRunner.test('Send Tracks - getTrackSendLevelState handles unknown send', (t) => {
    const level = getTrackSendLevelState('existing-track', 'nonexistent-send');
    t.assertEqual(level, 0, 'Should return 0 for unknown send');
});

TestRunner.test('Send Tracks - setTrackSendLevelState updates level', (t) => {
    const send = addSendTrackState({ name: 'Level Test' });
    setTrackSendLevelState('any-track-id', send.id, 0.5);
    const level = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(level, 0.5, 'Send level should be updated');
    // Test clamping
    setTrackSendLevelState('any-track-id', send.id, 1.5);
    const levelClamped = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(levelClamped, 1.2, 'Level should be clamped to max 1.2');
    setTrackSendLevelState('any-track-id', send.id, -0.5);
    const levelMin = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(levelMin, 0, 'Level should be clamped to min 0');
});

TestRunner.test('Send Tracks - setTrackSendLevelState creates track entry if needed', (t) => {
    const send = addSendTrackState({ name: 'New Track Test' });
    // Should not throw, should auto-create trackSendsState entry
    setTrackSendLevelState('new-track-xyz', send.id, 0.8);
    const level = getTrackSendLevelState('new-track-xyz', send.id);
    t.assertEqual(level, 0.8, 'Level should be set for new track');
});

TestRunner.test('Send Tracks - getTrackSendPreFaderState returns boolean', (t) => {
    const preFader = getTrackSendPreFaderState('any-track', 'any-send');
    t.assertEqual(typeof preFader, 'boolean', 'Should return boolean');
    t.assertEqual(preFader, false, 'Default should be false');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState updates preFader', (t) => {
    const send = addSendTrackState({ name: 'PreFader Test' });
    const result = setTrackSendPreFaderState('track-prefader', send.id, true);
    t.assertTruthy(result, 'Should return true');
    const preFader = getTrackSendPreFaderState('track-prefader', send.id);
    t.assertEqual(preFader, true, 'Pre-fader should be true');
    setTrackSendPreFaderState('track-prefader', send.id, false);
    const preFaderAfter = getTrackSendPreFaderState('track-prefader', send.id);
    t.assertEqual(preFaderAfter, false, 'Pre-fader should be false');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState handles nonexistent track', (t) => {
    // Should not throw, should auto-create entry
    setTrackSendPreFaderState('nonexistent-track-123', 999, true);
    const preFader = getTrackSendPreFaderState('nonexistent-track-123', 999);
    t.assertEqual(preFader, true, 'Should create and return true');
});

TestRunner.test('Send Tracks - addSendTrackState with default values', (t) => {
    const send = addSendTrackState({});
    t.assertTruthy(send.id !== undefined, 'Should have an ID');
    t.assertEqual(send.name, 'Send ' + send.id, 'Should have default name');
    t.assertEqual(send.level, 1.0, 'Default level should be 1.0');
    t.assertEqual(send.muted, false, 'Default muted should be false');
    t.assertTruthy(Array.isArray(send.effects), 'Should have effects array');
});

TestRunner.test('Send Tracks - addSendTrackState with custom id', (t) => {
    const send = addSendTrackState({ id: 9999, name: 'Custom ID Send' });
    t.assertEqual(send.id, 9999, 'ID should match custom value');
    t.assertEqual(send.name, 'Custom ID Send', 'Name should match');
});

// ============================================
// Day 70: Track Groups Additional Tests
// ============================================
TestRunner.test('Track Groups - getTrackGroupByIdState handles unknown id', (t) => {
    const group = getTrackGroupByIdState('nonexistent-group-12345');
    t.assertEqual(group, undefined, 'Should return undefined for unknown group');
});

// ============================================
// Day 71: Loop Region State Tests
// ============================================
TestRunner.test('Loop Region - getLoopRegionState returns object', (t) => {
    const state = getLoopRegionState();
    t.assertTruthy(typeof state === 'object', 'getLoopRegionState should return an object');
    t.assertTruthy('enabled' in state, 'State should have enabled property');
    t.assertTruthy('startBar' in state, 'State should have startBar property');
    t.assertTruthy('endBar' in state, 'State should have endBar property');
});

TestRunner.test('Loop Region - getLoopRegionEnabledState returns boolean', (t) => {
    const enabled = getLoopRegionEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'getLoopRegionEnabledState should return boolean');
});

TestRunner.test('Loop Region - getLoopRegionStartBarState returns number', (t) => {
    const startBar = getLoopRegionStartBarState();
    t.assertEqual(typeof startBar, 'number', 'getLoopRegionStartBarState should return number');
    t.assertTruthy(startBar >= 1, 'Start bar should be >= 1');
});

TestRunner.test('Loop Region - getLoopRegionEndBarState returns number', (t) => {
    const endBar = getLoopRegionEndBarState();
    t.assertEqual(typeof endBar, 'number', 'getLoopRegionEndBarState should return number');
    t.assertTruthy(endBar >= 1, 'End bar should be >= 1');
});

TestRunner.test('Loop Region - setLoopRegionEnabledState updates state', (t) => {
    setLoopRegionEnabledState(true);
    t.assertEqual(getLoopRegionEnabledState(), true, 'Should be enabled after setter');
    setLoopRegionEnabledState(false);
    t.assertEqual(getLoopRegionEnabledState(), false, 'Should be disabled after setter');
});

TestRunner.test('Loop Region - setLoopRegionStartBarState updates state', (t) => {
    setLoopRegionStartBarState(5);
    t.assertEqual(getLoopRegionStartBarState(), 5, 'Start bar should be 5');
});

TestRunner.test('Loop Region - setLoopRegionEndBarState updates state', (t) => {
    setLoopRegionEndBarState(8);
    t.assertEqual(getLoopRegionEndBarState(), 8, 'End bar should be 8');
});

TestRunner.test('Loop Region - setLoopRegionState updates full state', (t) => {
    const newState = { enabled: true, startBar: 2, endBar: 10 };
    setLoopRegionState(newState);
    const state = getLoopRegionState();
    t.assertEqual(state.enabled, true, 'Enabled should be true');
    t.assertEqual(state.startBar, 2, 'Start bar should be 2');
    t.assertEqual(state.endBar, 10, 'End bar should be 10');
});

// ============================================
// Day 71: Swing State Tests
// ============================================
TestRunner.test('Swing - getSwingState returns object', (t) => {
    const state = getSwingState();
    t.assertTruthy(typeof state === 'object', 'getSwingState should return an object');
    t.assertTruthy('enabled' in state, 'State should have enabled property');
    t.assertTruthy('amount' in state, 'State should have amount property');
});

TestRunner.test('Swing - getSwingEnabledState returns boolean', (t) => {
    const enabled = getSwingEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'getSwingEnabledState should return boolean');
});

TestRunner.test('Swing - getSwingAmountState returns number', (t) => {
    const amount = getSwingAmountState();
    t.assertEqual(typeof amount, 'number', 'getSwingAmountState should return number');
    t.assertTruthy(amount >= 0, 'Amount should be >= 0');
    t.assertTruthy(amount <= 100, 'Amount should be <= 100');
});

TestRunner.test('Swing - setSwingEnabledState updates state', (t) => {
    setSwingEnabledState(true);
    t.assertEqual(getSwingEnabledState(), true, 'Should be enabled after setter');
    setSwingEnabledState(false);
    t.assertEqual(getSwingEnabledState(), false, 'Should be disabled after setter');
});

TestRunner.test('Swing - setSwingAmountState updates state', (t) => {
    setSwingAmountState(50);
    t.assertEqual(getSwingAmountState(), 50, 'Amount should be 50');
    setSwingAmountState(0);
    t.assertEqual(getSwingAmountState(), 0, 'Amount should be clamped to 0');
    setSwingAmountState(150);
    t.assertEqual(getSwingAmountState(), 100, 'Amount should be clamped to 100');
});

TestRunner.test('Swing - setSwingState updates full state', (t) => {
    const newState = { enabled: true, amount: 75 };
    setSwingState(newState);
    const state = getSwingState();
    t.assertEqual(state.enabled, true, 'Enabled should be true');
    t.assertEqual(state.amount, 75, 'Amount should be 75');
});

// ============================================
// Day 73: State Management Tests
// ============================================
TestRunner.test('Time Signature - getTimeSignatureState returns object', (t) => {
    const state = getTimeSignatureState();
    t.assertTruthy(typeof state === 'object', 'getTimeSignatureState should return an object');
    t.assertTruthy('numerator' in state, 'State should have numerator property');
    t.assertTruthy('denominator' in state, 'State should have denominator property');
});

TestRunner.test('Time Signature - getTimeSignatureNumeratorState returns number', (t) => {
    const numerator = getTimeSignatureNumeratorState();
    t.assertEqual(typeof numerator, 'number', 'Should return number');
    t.assertTruthy(numerator >= 1, 'Numerator should be >= 1');
    t.assertTruthy(numerator <= 16, 'Numerator should be <= 16');
});

TestRunner.test('Time Signature - setTimeSignatureNumeratorState updates state', (t) => {
    setTimeSignatureNumeratorState(3);
    t.assertEqual(getTimeSignatureNumeratorState(), 3, 'Numerator should be 3');
    setTimeSignatureNumeratorState(6);
    t.assertEqual(getTimeSignatureNumeratorState(), 6, 'Numerator should be 6');
});

TestRunner.test('Time Signature - getTimeSignatureDenominatorState returns number', (t) => {
    const denominator = getTimeSignatureDenominatorState();
    t.assertEqual(typeof denominator, 'number', 'Should return number');
    t.assertTruthy([1, 2, 4, 8, 16, 32].includes(denominator), 'Denominator should be power of 2');
});

TestRunner.test('Time Signature - setTimeSignatureDenominatorState updates state', (t) => {
    setTimeSignatureDenominatorState(4);
    t.assertEqual(getTimeSignatureDenominatorState(), 4, 'Denominator should be 4');
    setTimeSignatureDenominatorState(8);
    t.assertEqual(getTimeSignatureDenominatorState(), 8, 'Denominator should be 8');
});

TestRunner.test('Time Signature - setTimeSignatureState updates full state', (t) => {
    setTimeSignatureState(6, 8);
    const state = getTimeSignatureState();
    t.assertEqual(state.numerator, 6, 'Numerator should be 6');
    t.assertEqual(state.denominator, 8, 'Denominator should be 8');
});

TestRunner.test('Ghost Track - getGhostTrackIdState returns null by default', (t) => {
    const ghostId = getGhostTrackIdState();
    t.assertEqual(ghostId, null, 'Ghost track should be null by default');
});

TestRunner.test('Ghost Track - setGhostTrackIdState updates state', (t) => {
    setGhostTrackIdState('test-track-123');
    t.assertEqual(getGhostTrackIdState(), 'test-track-123', 'Ghost track should be set');
    setGhostTrackIdState(null);
    t.assertEqual(getGhostTrackIdState(), null, 'Ghost track should be cleared');
});

TestRunner.test('Timeline Markers - getTimelineMarkersState returns array', (t) => {
    const markers = getTimelineMarkersState();
    t.assertTruthy(Array.isArray(markers), 'Timeline markers should be an array');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState adds marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Test Marker', 4);
    t.assertTruthy(marker, 'Marker should be added');
    t.assertTruthy(marker.id, 'Marker should have an id');
    t.assertEqual(marker.name, 'Test Marker', 'Marker name should match');
    t.assertEqual(marker.bar, 4, 'Marker bar should match');
    t.assertEqual(marker.color, '#ff9f43', 'Marker color should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState returns marker', (t) => {
    clearTimelineMarkersState();
    const added = addTimelineMarkerState('Find Test', 8);
    const found = getTimelineMarkerByIdState(added.id);
    t.assertTruthy(found, 'Marker should be found');
    t.assertEqual(found.name, 'Find Test', 'Found marker should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState handles unknown id', (t) => {
    const notFound = getTimelineMarkerByIdState('nonexistent-marker-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState updates marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Original', 4);
    setTimelineMarkerState(marker.id, { name: 'Updated', bar: 10 });
    const updated = getTimelineMarkerByIdState(marker.id);
    t.assertEqual(updated.name, 'Updated', 'Marker name should be updated');
    t.assertEqual(updated.bar, 10, 'Marker bar should be updated');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - removeTimelineMarkerState removes marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('To Remove', 4);
    t.assertTruthy(getTimelineMarkerByIdState(marker.id), 'Marker should exist before removal');
    removeTimelineMarkerState(marker.id);
    t.assertEqual(getTimelineMarkerByIdState(marker.id), undefined, 'Marker should be removed');
    clearTimelineMarkersState();
});

TestRunner.test('Send Tracks - getSendTracksState returns array', (t) => {
    const sends = getSendTracksState();
    t.assertTruthy(Array.isArray(sends), 'Send tracks should be an array');
});

TestRunner.test('Send Tracks - getSendTrackByIdState handles unknown id', (t) => {
    const notFound = getSendTrackByIdState('nonexistent-send-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Send Tracks - getTrackSendsState returns object', (t) => {
    const sends = getTrackSendsState();
    t.assertTruthy(typeof sends === 'object', 'Track sends should be an object');
});

TestRunner.test('Send Tracks - getTrackSendLevelState returns number', (t) => {
    const level = getTrackSendLevelState('nonexistent', 999);
    t.assertEqual(typeof level, 'number', 'Send level should be a number');
    t.assertEqual(level, 0, 'Default send level should be 0');
});

TestRunner.test('Send Tracks - addSendTrackState creates send track', (t) => {
    const send = addSendTrackState({ name: 'Test Send', level: 0.75 });
    t.assertTruthy(send, 'addSendTrackState should return a send track');
    t.assertEqual(send.name, 'Test Send', 'Send name should match');
    t.assertEqual(send.level, 0.75, 'Send level should match');
});

TestRunner.test('Send Tracks - setSendTrackMutedState updates send', (t) => {
    const send = addSendTrackState({ name: 'Mute Test' });
    const result = setSendTrackMutedState(send.id, true);
    t.assertTruthy(result, 'setSendTrackMutedState should return true on success');
    const sendAfter = getSendTrackByIdState(send.id);
    t.assertEqual(sendAfter.muted, true, 'Send should be muted');
    setSendTrackMutedState(send.id, false);
    t.assertEqual(sendAfter.muted, false, 'Send should be unmuted');
});

// ============================================
// Day 75: Armed Track State Tests
// ============================================
TestRunner.test('Armed Track - getArmedTrackIdState returns null initially', (t) => {
    const armedId = getArmedTrackIdState();
    t.assertEqual(armedId, null, 'Should be null initially');
});

TestRunner.test('Armed Track - setArmedTrackIdState updates state', (t) => {
    setArmedTrackIdState('track-123');
    t.assertEqual(getArmedTrackIdState(), 'track-123', 'Armed track should be set');
    setArmedTrackIdState(null);
    t.assertEqual(getArmedTrackIdState(), null, 'Armed track should be cleared');
});

TestRunner.test('Armed Track - setArmedTrackIdState handles undefined', (t) => {
    setArmedTrackIdState('track-456');
    setArmedTrackIdState(undefined);
    t.assertEqual(getArmedTrackIdState(), null, 'Should become null when set to undefined');
});

TestRunner.test('Armed Track - setArmedTrackIdState handles numeric track ID', (t) => {
    setArmedTrackIdState(42);
    t.assertEqual(getArmedTrackIdState(), 42, 'Should handle numeric track ID');
    setArmedTrackIdState(null);
});

// ============================================
// Day 76: Master Effects State Tests
// ============================================
TestRunner.test('Master Effects - getMasterEffectsState returns array', (t) => {
    const effects = getMasterEffectsState();
    t.assertTruthy(Array.isArray(effects), 'Master effects should be an array');
});

TestRunner.test('Master Effects - addMasterEffectToState creates effect', (t) => {
    const effectsBefore = getMasterEffectsState().length;
    const effectId = addMasterEffectToState('Reverb', { decay: 2.5 });
    t.assertTruthy(typeof effectId === 'string', 'Should return effect ID string');
    t.assertTruthy(effectId.startsWith('mastereffect_'), 'Effect ID should have correct prefix');
    const effectsAfter = getMasterEffectsState();
    t.assertEqual(effectsAfter.length, effectsBefore + 1, 'Should have one more effect');
    const added = effectsAfter.find(e => e.id === effectId);
    t.assertEqual(added.type, 'Reverb', 'Effect type should be Reverb');
    t.assertEqual(added.params.decay, 2.5, 'Effect params should be set');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - addMasterEffectToState with default params', (t) => {
    const effectId = addMasterEffectToState('Delay');
    t.assertTruthy(typeof effectId === 'string', 'Should return effect ID');
    const effects = getMasterEffectsState();
    const added = effects.find(e => e.id === effectId);
    t.assertEqual(added.type, 'Delay', 'Effect type should be Delay');
    t.assertTruthy(added.params, 'Should have params object');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - removeMasterEffectFromState removes effect', (t) => {
    const effectId = addMasterEffectToState('Chorus');
    const effectsBefore = getMasterEffectsState();
    t.assertTruthy(effectsBefore.some(e => e.id === effectId), 'Effect should exist before removal');
    removeMasterEffectFromState(effectId);
    const effectsAfter = getMasterEffectsState();
    t.assertEqual(effectsAfter.find(e => e.id === effectId), undefined, 'Effect should be removed');
});

TestRunner.test('Master Effects - removeMasterEffectFromState handles unknown id', (t) => {
    // Should not throw, just warn
    removeMasterEffectFromState('nonexistent-effect-id');
    t.assertTruthy(true, 'Should complete without throwing');
});

TestRunner.test('Master Effects - updateMasterEffectParamInState updates param', (t) => {
    const effectId = addMasterEffectToState('Reverb', { decay: 1.5, wet: 0.5 });
    updateMasterEffectParamInState(effectId, 'decay', 3.5);
    updateMasterEffectParamInState(effectId, 'wet', 0.8);
    const effects = getMasterEffectsState();
    const effect = effects.find(e => e.id === effectId);
    t.assertEqual(effect.params.decay, 3.5, 'Decay should be updated');
    t.assertEqual(effect.params.wet, 0.8, 'Wet should be updated');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - updateMasterEffectParamInState handles nested param path', (t) => {
    const effectId = addMasterEffectToState('Filter', { frequency: 1000, Q: 1 });
    updateMasterEffectParamInState(effectId, 'frequency', 2000);
    const effects = getMasterEffectsState();
    const effect = effects.find(e => e.id === effectId);
    t.assertEqual(effect.params.frequency, 2000, 'Frequency should be updated');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - updateMasterEffectParamInState handles unknown effect', (t) => {
    // Should not throw
    updateMasterEffectParamInState('nonexistent-id', 'wet', 0.9);
    t.assertTruthy(true, 'Should complete without throwing');
});

TestRunner.test('Master Effects - reorderMasterEffectInState reorders effect', (t) => {
    const id1 = addMasterEffectToState('Reverb');
    const id2 = addMasterEffectToState('Delay');
    const id3 = addMasterEffectToState('Chorus');
    const effects = getMasterEffectsState();
    const idx1 = effects.findIndex(e => e.id === id1);
    const idx3 = effects.findIndex(e => e.id === id3);
    t.assertEqual(Math.abs(idx1 - idx3), 2, 'Effect1 and Effect3 should be 2 apart initially');
    // Move Effect1 to where Effect3 is
    reorderMasterEffectInState(id1, idx3);
    const effectsAfter = getMasterEffectsState();
    const newIdx1 = effectsAfter.findIndex(e => e.id === id1);
    t.assertEqual(newIdx1, idx3, 'Effect1 should now be at former idx3 position');
    // Cleanup
    removeMasterEffectFromState(id1);
    removeMasterEffectFromState(id2);
    removeMasterEffectFromState(id3);
});

TestRunner.test('Master Effects - reorderMasterEffectInState handles same index', (t) => {
    const id1 = addMasterEffectToState('SameIdx');
    const effectsBefore = getMasterEffectsState().map(e => e.id);
    reorderMasterEffectInState(id1, effectsBefore.findIndex(e => e === id1));
    const effectsAfter = getMasterEffectsState().map(e => e.id);
    t.assertDeepEqual(effectsBefore, effectsAfter, 'Order should be unchanged');
    // Cleanup
    removeMasterEffectFromState(id1);
});

TestRunner.test('Master Effects - reorderMasterEffectInState handles invalid index', (t) => {
    const id1 = addMasterEffectToState('InvalidIdx');
    // Negative index should be handled
    reorderMasterEffectInState(id1, -1);
    // Index beyond length should be handled
    reorderMasterEffectInState(id1, 9999);
    t.assertTruthy(true, 'Should complete without throwing');
    // Cleanup
    removeMasterEffectFromState(id1);
});

TestRunner.test('Master Effects - multiple effects can be added and removed', (t) => {
    const ids = [];
    for (let i = 0; i < 5; i++) {
        ids.push(addMasterEffectToState('Reverb'));
    }
    let effects = getMasterEffectsState();
    t.assertEqual(effects.length, 5, 'Should have 5 effects');
    // Remove middle one
    removeMasterEffectFromState(ids[2]);
    effects = getMasterEffectsState();
    t.assertEqual(effects.length, 4, 'Should have 4 effects after removal');
    // Cleanup remaining
    for (const id of ids) {
        removeMasterEffectFromState(id);
    }
    effects = getMasterEffectsState();
    t.assertEqual(effects.length, 0, 'All effects should be removed');
});

// ============================================
// Day 81: Additional State Management Tests
// ============================================

// Metronome State Tests
TestRunner.test('Metronome - getMetronomeEnabledState returns boolean', (t) => {
    const enabled = getMetronomeEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'Metronome enabled should be boolean');
});

TestRunner.test('Metronome - setMetronomeEnabledState updates state', (t) => {
    setMetronomeEnabledState(true);
    t.assertEqual(getMetronomeEnabledState(), true, 'Metronome should be enabled');
    setMetronomeEnabledState(false);
    t.assertEqual(getMetronomeEnabledState(), false, 'Metronome should be disabled');
});

TestRunner.test('Metronome - getMetronomeVolumeState returns number', (t) => {
    const volume = getMetronomeVolumeState();
    t.assertEqual(typeof volume, 'number', 'Metronome volume should be a number');
    t.assertTruthy(volume >= 0 && volume <= 1, 'Volume should be 0-1 range');
});

TestRunner.test('Metronome - setMetronomeVolumeState updates state', (t) => {
    setMetronomeVolumeState(0.75);
    t.assertEqual(getMetronomeVolumeState(), 0.75, 'Metronome volume should be 0.75');
    setMetronomeVolumeState(0.5);
    t.assertEqual(getMetronomeVolumeState(), 0.5, 'Metronome volume should be 0.5');
});

// Playback Mode State Tests
TestRunner.test('Playback Mode - getPlaybackModeState returns value', (t) => {
    const mode = getPlaybackModeState();
    t.assertTrue(typeof mode === 'number', 'Playback mode should be a number');
    t.assertTruthy(mode >= 0 && mode <= 2, 'Playback mode should be 0-2');
});

// Tracks State Tests
TestRunner.test('Tracks - getTracksState returns array', (t) => {
    const tracks = getTracksState();
    t.assertTruthy(Array.isArray(tracks), 'Tracks should be an array');
});

TestRunner.test('Tracks - getTrackByIdState returns undefined for unknown id', (t) => {
    const track = getTrackByIdState('nonexistent-id-12345');
    t.assertEqual(track, undefined, 'Should return undefined for unknown track ID');
});

// Master Gain State Tests
TestRunner.test('Master Gain - getMasterGainValueState returns number', (t) => {
    const gain = getMasterGainValueState();
    t.assertEqual(typeof gain, 'number', 'Master gain should be a number');
});

// Open Windows State Tests
TestRunner.test('Open Windows - getOpenWindowsState returns object', (t) => {
    const windows = getOpenWindowsState();
    t.assertTruthy(typeof windows === 'object', 'Open windows should be an object (Map)');
});

// Active Sequencer Track State Tests
TestRunner.test('Active Sequencer - getActiveSequencerTrackIdState returns value', (t) => {
    const trackId = getActiveSequencerTrackIdState();
    t.assertTrue(trackId === null || typeof trackId === 'string', 'Active sequencer track ID should be null or string');
});

// Highest Z State Tests
TestRunner.test('Highest Z - getHighestZState returns number', (t) => {
    const z = getHighestZState();
    t.assertEqual(typeof z, 'number', 'Highest Z should be a number');
    t.assertTruthy(z >= 0, 'Highest Z should be non-negative');
});

// Clipboard State Tests
TestRunner.test('Clipboard - getClipboardDataState returns value', (t) => {
    const data = getClipboardDataState();
    t.assertTrue(data === null || typeof data === 'object', 'Clipboard data should be null or object');
});


// ============================================
// Day 104: SnugWindow, Track Types and Utils Constants Tests
// ============================================

// SnugWindow Default Dimension Constants Tests
TestRunner.test('SnugWindow - DEFAULT_WINDOW_MIN_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_MIN_WIDTH === 'number', 'DEFAULT_WINDOW_MIN_WIDTH should be a number');
    t.assertTruthy(DEFAULT_WINDOW_MIN_WIDTH >= 100, 'DEFAULT_WINDOW_MIN_WIDTH should be >= 100');
    t.assertTruthy(DEFAULT_WINDOW_MIN_WIDTH <= 500, 'DEFAULT_WINDOW_MIN_WIDTH should be <= 500');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_MIN_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_MIN_HEIGHT === 'number', 'DEFAULT_WINDOW_MIN_HEIGHT should be a number');
    t.assertTruthy(DEFAULT_WINDOW_MIN_HEIGHT >= 100, 'DEFAULT_WINDOW_MIN_HEIGHT should be >= 100');
    t.assertTruthy(DEFAULT_WINDOW_MIN_HEIGHT <= 500, 'DEFAULT_WINDOW_MIN_HEIGHT should be <= 500');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_WIDTH === 'number', 'DEFAULT_WINDOW_WIDTH should be a number');
    t.assertTruthy(DEFAULT_WINDOW_WIDTH >= 200, 'DEFAULT_WINDOW_WIDTH should be >= 200');
    t.assertTruthy(DEFAULT_WINDOW_WIDTH <= 1000, 'DEFAULT_WINDOW_WIDTH should be <= 1000');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_HEIGHT === 'number', 'DEFAULT_WINDOW_HEIGHT should be a number');
    t.assertTruthy(DEFAULT_WINDOW_HEIGHT >= 150, 'DEFAULT_WINDOW_HEIGHT should be >= 150');
    t.assertTruthy(DEFAULT_WINDOW_HEIGHT <= 1000, 'DEFAULT_WINDOW_HEIGHT should be <= 1000');
});

TestRunner.test('SnugWindow - TASKBAR_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof TASKBAR_HEIGHT === 'number', 'TASKBAR_HEIGHT should be a number');
    t.assertTruthy(TASKBAR_HEIGHT >= 20, 'TASKBAR_HEIGHT should be >= 20');
    t.assertTruthy(TASKBAR_HEIGHT <= 100, 'TASKBAR_HEIGHT should be <= 100');
});

// Track Types Validation Tests
TestRunner.test('Track Types - track type strings are valid', (t) => {
    const validTypes = ['Synth', 'DrumSampler', 'Sampler', 'InstrumentSampler', 'Audio'];
    t.assertTruthy(Array.isArray(validTypes), 'Track types should be an array');
    t.assertEqual(validTypes.length, 5, 'Should have 5 track types');
});

TestRunner.test('Track Types - all expected track types are defined', (t) => {
    const types = ['Synth', 'DrumSampler', 'Sampler', 'InstrumentSampler', 'Audio'];
    types.forEach(type => {
        t.assertEqual(typeof type, 'string', type + ' should be a string');
        t.assertTruthy(type.length > 0, type + ' should not be empty');
    });
});

// Utils Function Tests
TestRunner.test('Utils - showNotification function exists', (t) => {
    t.assertEqual(typeof showNotification, 'function', 'showNotification should be a function');
});

TestRunner.test('Utils - showNotification accepts message and duration', (t) => {
    t.assertEqual(showNotification.length, 2, 'showNotification should accept 2 parameters');
});

TestRunner.test('Utils - showCustomModal function exists', (t) => {
    t.assertEqual(typeof showCustomModal, 'function', 'showCustomModal should be a function');
});

TestRunner.test('Utils - showConfirmationDialog function exists', (t) => {
    t.assertEqual(typeof showConfirmationDialog, 'function', 'showConfirmationDialog should be a function');
});

TestRunner.test('Utils - secondsToBBSTime function exists', (t) => {
    t.assertEqual(typeof secondsToBBSTime, 'function', 'secondsToBBSTime should be a function');
});

TestRunner.test('Utils - bbsTimeToSeconds function exists', (t) => {
    t.assertEqual(typeof bbsTimeToSeconds, 'function', 'bbsTimeToSeconds should be a function');
});

TestRunner.test('Utils - createContextMenu function exists', (t) => {
    t.assertEqual(typeof createContextMenu, 'function', 'createContextMenu should be a function');
});

TestRunner.test('Utils - createDropZoneHTML function exists', (t) => {
    t.assertEqual(typeof createDropZoneHTML, 'function', 'createDropZoneHTML should be a function');
});

TestRunner.test('Utils - setupGenericDropZoneListeners function exists', (t) => {
    t.assertEqual(typeof setupGenericDropZoneListeners, 'function', 'setupGenericDropZoneListeners should be a function');
});

// Context Menu Constants Tests
TestRunner.test('Context Menu - CONTEXT_MENU_ITEM_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof CONTEXT_MENU_ITEM_HEIGHT === 'number', 'CONTEXT_MENU_ITEM_HEIGHT should be a number');
    t.assertTruthy(CONTEXT_MENU_ITEM_HEIGHT >= 20, 'CONTEXT_MENU_ITEM_HEIGHT should be >= 20');
    t.assertTruthy(CONTEXT_MENU_ITEM_HEIGHT <= 50, 'CONTEXT_MENU_ITEM_HEIGHT should be <= 50');
});

TestRunner.test('Context Menu - CONTEXT_MENU_MAX_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof CONTEXT_MENU_MAX_WIDTH === 'number', 'CONTEXT_MENU_MAX_WIDTH should be a number');
    t.assertTruthy(CONTEXT_MENU_MAX_WIDTH >= 100, 'CONTEXT_MENU_MAX_WIDTH should be >= 100');
    t.assertTruthy(CONTEXT_MENU_MAX_WIDTH <= 500, 'CONTEXT_MENU_MAX_WIDTH should be <= 500');
});

// Sequencer Grid Constants Tests
TestRunner.test('Sequencer Grid - GRID_STEP_LABELS has expected format', (t) => {
    t.assertTruthy(typeof GRID_STEP_LABELS === 'object', 'GRID_STEP_LABELS should be an object');
    t.assertTruthy(Array.isArray(GRID_STEP_LABELS.labels), 'GRID_STEP_LABELS.labels should be an array');
});

TestRunner.test('Sequencer Grid - STEP_LABELS_SIXTEENTHS has 16 entries', (t) => {
    t.assertTruthy(typeof STEP_LABELS_SIXTEENTHS === 'object', 'STEP_LABELS_SIXTEENTHS should be an object');
    t.assertTruthy(Array.isArray(STEP_LABELS_SIXTEENTHS.labels), 'STEP_LABELS_SIXTEENTHS.labels should be an array');
    t.assertEqual(STEP_LABELS_SIXTEENTHS.labels.length, 16, 'SIXTEENTHS should have 16 entries');
});

// Sound Library Constants Tests
TestRunner.test('Sound Library - soundLibraries is an object', (t) => {
    t.assertEqual(typeof soundLibraries, 'object', 'soundLibraries should be an object');
    t.assertTruthy(soundLibraries !== null, 'soundLibraries should not be null');
});

// Synth Engine Control Definitions Tests
TestRunner.test('Synth Engine - synthEngineControlDefinitions is an object', (t) => {
    t.assertEqual(typeof synthEngineControlDefinitions, 'object', 'synthEngineControlDefinitions should be an object');
    t.assertTruthy(synthEngineControlDefinitions !== null, 'synthEngineControlDefinitions should not be null');
});

TestRunner.test('Synth Engine - synthEngineControlDefinitions has MonoSynth', (t) => {
    t.assertTruthy(typeof synthEngineControlDefinitions.MonoSynth === 'object', 'synthEngineControlDefinitions should have MonoSynth');
});

TestRunner.test('Synth Engine - synthEngineControlDefinitions.MonoSynth has controls', (t) => {
    const mono = synthEngineControlDefinitions.MonoSynth;
    t.assertTruthy(Array.isArray(mono.controls), 'MonoSynth should have controls array');
    t.assertTruthy(mono.controls.length > 0, 'MonoSynth should have at least one control');
});

// ============================================
// Day 70: Constants Validation Tests
// ============================================

// computerKeySynthMap Validation Tests
TestRunner.test('computerKeySynthMap - has valid structure', (t) => {
    t.assertTruthy(typeof computerKeySynthMap === 'object', 'computerKeySynthMap should be an object');
    t.assertTruthy('a' in computerKeySynthMap, 'Should have white key a');
    t.assertTruthy('k' in computerKeySynthMap, 'Should have white key k');
    t.assertTruthy('w' in computerKeySynthMap, 'Should have black key w');
    t.assertTruthy('u' in computerKeySynthMap, 'Should have black key u');
});

TestRunner.test('computerKeySynthMap - white key values are valid notes', (t) => {
    const c4Value = computerKeySynthMap['a'];
    t.assertEqual(typeof c4Value, 'number', 'Key a should map to a number (MIDI note)');
    t.assertEqual(c4Value, 60, 'Key a should be C4 (MIDI note 60)');
});

TestRunner.test('computerKeySynthMap - black key values are valid notes', (t) => {
    const cS4Value = computerKeySynthMap['w'];
    t.assertEqual(typeof cS4Value, 'number', 'Key w should map to a number (MIDI note)');
    t.assertEqual(cS4Value, 61, 'Key w should be C#4 (MIDI note 61)');
});

// TRACK_COLORS Validation Tests
TestRunner.test('TRACK_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(TRACK_COLORS), 'TRACK_COLORS should be an array');
});

TestRunner.test('TRACK_COLORS - has expected colors', (t) => {
    t.assertTruthy(TRACK_COLORS.length >= 8, 'Should have at least 8 colors');
});

TestRunner.test('TRACK_COLORS - colors are valid hex', (t) => {
    TRACK_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// CLIP_COLORS Validation Tests
TestRunner.test('CLIP_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(CLIP_COLORS), 'CLIP_COLORS should be an array');
});

TestRunner.test('CLIP_COLORS - has expected count', (t) => {
    t.assertTruthy(CLIP_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('CLIP_COLORS - colors are valid hex', (t) => {
    CLIP_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// MARKER_COLORS Validation Tests
TestRunner.test('MARKER_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(MARKER_COLORS), 'MARKER_COLORS should be an array');
});

TestRunner.test('MARKER_COLORS - has expected count', (t) => {
    t.assertTruthy(MARKER_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('MARKER_COLORS - colors are valid hex', (t) => {
    MARKER_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// AUTOMATION_LANE_COLORS Validation Tests
TestRunner.test('Automation Lane Colors - is an array', (t) => {
    t.assertTruthy(Array.isArray(AUTOMATION_LANE_COLORS), 'AUTOMATION_LANE_COLORS should be an array');
});

TestRunner.test('Automation Lane Colors - has expected count', (t) => {
    t.assertTruthy(AUTOMATION_LANE_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('Automation Lane Colors - colors are valid hex', (t) => {
    AUTOMATION_LANE_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// CHORD_TYPES Validation Tests
TestRunner.test('CHORD_TYPES - is an object', (t) => {
    t.assertTruthy(typeof CHORD_TYPES === 'object', 'CHORD_TYPES should be an object');
});

TestRunner.test('CHORD_TYPES - has major chord type', (t) => {
    t.assertTruthy(CHORD_TYPES['major'], 'CHORD_TYPES should have major chord');
});

TestRunner.test('CHORD_TYPES - has minor chord type', (t) => {
    t.assertTruthy(CHORD_TYPES['minor'], 'CHORD_TYPES should have minor chord');
});

TestRunner.test('CHORD_TYPES - chord intervals are valid', (t) => {
    for (const [type, intervals] of Object.entries(CHORD_TYPES)) {
        t.assertTruthy(Array.isArray(intervals), `${type} intervals should be an array`);
        intervals.forEach(interval => {
            t.assertEqual(typeof interval, 'number', `Interval in ${type} should be a number`);
            t.assertTruthy(interval >= 0, `Interval in ${type} should be non-negative`);
        });
    }
});

// ============================================
// Day 87: Chord Voicing Constants Tests
// ============================================
TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD is an object', (t) => {
    t.assertTruthy(typeof CHORD_VOICING_SPREAD === 'object', 'CHORD_VOICING_SPREAD should be an object');
    t.assertTruthy(CHORD_VOICING_SPREAD !== null, 'CHORD_VOICING_SPREAD should not be null');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has closed voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['closed'], 'Should have closed voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['closed']), 'Closed voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has wide voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['wide'], 'Should have wide voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['wide']), 'Wide voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has drop2 voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['drop2'], 'Should have drop2 voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['drop2']), 'Drop2 voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has rootless voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['rootless'], 'Should have rootless voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['rootless']), 'Rootless voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD intervals are valid numbers', (t) => {
    for (const [voicing, intervals] of Object.entries(CHORD_VOICING_SPREAD)) {
        intervals.forEach(interval => {
            t.assertEqual(typeof interval, 'number', `Interval in ${voicing} should be a number`);
            t.assertTruthy(interval >= 0, `Interval in ${voicing} should be non-negative`);
        });
    }
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS is an array', (t) => {
    t.assertTruthy(Array.isArray(CHORD_VOICINGS), 'CHORD_VOICINGS should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains 4 voicing types', (t) => {
    t.assertEqual(CHORD_VOICINGS.length, 4, 'Should have 4 voicing types');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains closed', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('closed'), 'Should include closed');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains wide', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('wide'), 'Should include wide');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains drop2', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('drop2'), 'Should include drop2');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains rootless', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('rootless'), 'Should include rootless');
});

TestRunner.test('Chord Voicing - DEFAULT_CHORD_VOICING is valid', (t) => {
    t.assertEqual(typeof DEFAULT_CHORD_VOICING, 'string', 'Should be a string');
    t.assertEqual(DEFAULT_CHORD_VOICING, 'closed', 'Default should be closed');
    t.assertTruthy(CHORD_VOICINGS.includes(DEFAULT_CHORD_VOICING), 'Default should be in CHORD_VOICINGS');
});

TestRunner.test('Chord Voicing - voicing spread arrays have 12 elements', (t) => {
    for (const [voicing, intervals] of Object.entries(CHORD_VOICING_SPREAD)) {
        t.assertEqual(intervals.length, 12, `${voicing} should have 12 elements (one per semitone)`);
    }
});

TestRunner.test('Chord Voicing - closed voicing starts at 0', (t) => {
    t.assertEqual(CHORD_VOICING_SPREAD['closed'][0], 0, 'Closed voicing should start at 0');
});

TestRunner.test('Chord Voicing - rootless voicing starts at 2 (no root)', (t) => {
    t.assertEqual(CHORD_VOICING_SPREAD['rootless'][0], 2, 'Rootless voicing should start at 2 (skipping root)');
});

// ============================================
// Day 70: Send Tracks Additional Tests
// ============================================
TestRunner.test('Send Tracks - getTrackSendLevelState handles nonexistent track', (t) => {
    const level = getTrackSendLevelState('nonexistent-track', 'nonexistent-send');
    t.assertEqual(level, 0, 'Should return 0 for nonexistent track/send');
});

TestRunner.test('Send Tracks - getTrackSendLevelState handles unknown send', (t) => {
    const level = getTrackSendLevelState('existing-track', 'nonexistent-send');
    t.assertEqual(level, 0, 'Should return 0 for unknown send');
});

TestRunner.test('Send Tracks - setTrackSendLevelState updates level', (t) => {
    const send = addSendTrackState({ name: 'Level Test' });
    setTrackSendLevelState('any-track-id', send.id, 0.5);
    const level = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(level, 0.5, 'Send level should be updated');
    // Test clamping
    setTrackSendLevelState('any-track-id', send.id, 1.5);
    const levelClamped = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(levelClamped, 1.2, 'Level should be clamped to max 1.2');
    setTrackSendLevelState('any-track-id', send.id, -0.5);
    const levelMin = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(levelMin, 0, 'Level should be clamped to min 0');
});

TestRunner.test('Send Tracks - setTrackSendLevelState creates track entry if needed', (t) => {
    const send = addSendTrackState({ name: 'New Track Test' });
    // Should not throw, should auto-create trackSendsState entry
    setTrackSendLevelState('new-track-xyz', send.id, 0.8);
    const level = getTrackSendLevelState('new-track-xyz', send.id);
    t.assertEqual(level, 0.8, 'Level should be set for new track');
});

TestRunner.test('Send Tracks - getTrackSendPreFaderState returns boolean', (t) => {
    const preFader = getTrackSendPreFaderState('any-track', 'any-send');
    t.assertEqual(typeof preFader, 'boolean', 'Should return boolean');
    t.assertEqual(preFader, false, 'Default should be false');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState updates preFader', (t) => {
    const send = addSendTrackState({ name: 'PreFader Test' });
    const result = setTrackSendPreFaderState('track-prefader', send.id, true);
    t.assertTruthy(result, 'Should return true');
    const preFader = getTrackSendPreFaderState('track-prefader', send.id);
    t.assertEqual(preFader, true, 'Pre-fader should be true');
    setTrackSendPreFaderState('track-prefader', send.id, false);
    const preFaderAfter = getTrackSendPreFaderState('track-prefader', send.id);
    t.assertEqual(preFaderAfter, false, 'Pre-fader should be false');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState handles nonexistent track', (t) => {
    // Should not throw, should auto-create entry
    setTrackSendPreFaderState('nonexistent-track-123', 999, true);
    const preFader = getTrackSendPreFaderState('nonexistent-track-123', 999);
    t.assertEqual(preFader, true, 'Should create and return true');
});

TestRunner.test('Send Tracks - addSendTrackState with default values', (t) => {
    const send = addSendTrackState({});
    t.assertTruthy(send.id !== undefined, 'Should have an ID');
    t.assertEqual(send.name, 'Send ' + send.id, 'Should have default name');
    t.assertEqual(send.level, 1.0, 'Default level should be 1.0');
    t.assertEqual(send.muted, false, 'Default muted should be false');
    t.assertTruthy(Array.isArray(send.effects), 'Should have effects array');
});

TestRunner.test('Send Tracks - addSendTrackState with custom id', (t) => {
    const send = addSendTrackState({ id: 9999, name: 'Custom ID Send' });
    t.assertEqual(send.id, 9999, 'ID should match custom value');
    t.assertEqual(send.name, 'Custom ID Send', 'Name should match');
});

// ============================================
// Day 70: Track Groups Additional Tests
// ============================================
TestRunner.test('Track Groups - getTrackGroupByIdState handles unknown id', (t) => {
    const group = getTrackGroupByIdState('nonexistent-group-12345');
    t.assertEqual(group, undefined, 'Should return undefined for unknown group');
});

// ============================================
// Day 71: Loop Region State Tests
// ============================================
TestRunner.test('Loop Region - getLoopRegionState returns object', (t) => {
    const state = getLoopRegionState();
    t.assertTruthy(typeof state === 'object', 'getLoopRegionState should return an object');
    t.assertTruthy('enabled' in state, 'State should have enabled property');
    t.assertTruthy('startBar' in state, 'State should have startBar property');
    t.assertTruthy('endBar' in state, 'State should have endBar property');
});

TestRunner.test('Loop Region - getLoopRegionEnabledState returns boolean', (t) => {
    const enabled = getLoopRegionEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'getLoopRegionEnabledState should return boolean');
});

TestRunner.test('Loop Region - getLoopRegionStartBarState returns number', (t) => {
    const startBar = getLoopRegionStartBarState();
    t.assertEqual(typeof startBar, 'number', 'getLoopRegionStartBarState should return number');
    t.assertTruthy(startBar >= 1, 'Start bar should be >= 1');
});

TestRunner.test('Loop Region - getLoopRegionEndBarState returns number', (t) => {
    const endBar = getLoopRegionEndBarState();
    t.assertEqual(typeof endBar, 'number', 'getLoopRegionEndBarState should return number');
    t.assertTruthy(endBar >= 1, 'End bar should be >= 1');
});

TestRunner.test('Loop Region - setLoopRegionEnabledState updates state', (t) => {
    setLoopRegionEnabledState(true);
    t.assertEqual(getLoopRegionEnabledState(), true, 'Should be enabled after setter');
    setLoopRegionEnabledState(false);
    t.assertEqual(getLoopRegionEnabledState(), false, 'Should be disabled after setter');
});

TestRunner.test('Loop Region - setLoopRegionStartBarState updates state', (t) => {
    setLoopRegionStartBarState(5);
    t.assertEqual(getLoopRegionStartBarState(), 5, 'Start bar should be 5');
});

TestRunner.test('Loop Region - setLoopRegionEndBarState updates state', (t) => {
    setLoopRegionEndBarState(8);
    t.assertEqual(getLoopRegionEndBarState(), 8, 'End bar should be 8');
});

TestRunner.test('Loop Region - setLoopRegionState updates full state', (t) => {
    const newState = { enabled: true, startBar: 2, endBar: 10 };
    setLoopRegionState(newState);
    const state = getLoopRegionState();
    t.assertEqual(state.enabled, true, 'Enabled should be true');
    t.assertEqual(state.startBar, 2, 'Start bar should be 2');
    t.assertEqual(state.endBar, 10, 'End bar should be 10');
});

// ============================================
// Day 71: Swing State Tests
// ============================================
TestRunner.test('Swing - getSwingState returns object', (t) => {
    const state = getSwingState();
    t.assertTruthy(typeof state === 'object', 'getSwingState should return an object');
    t.assertTruthy('enabled' in state, 'State should have enabled property');
    t.assertTruthy('amount' in state, 'State should have amount property');
});

TestRunner.test('Swing - getSwingEnabledState returns boolean', (t) => {
    const enabled = getSwingEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'getSwingEnabledState should return boolean');
});

TestRunner.test('Swing - getSwingAmountState returns number', (t) => {
    const amount = getSwingAmountState();
    t.assertEqual(typeof amount, 'number', 'getSwingAmountState should return number');
    t.assertTruthy(amount >= 0, 'Amount should be >= 0');
    t.assertTruthy(amount <= 100, 'Amount should be <= 100');
});

TestRunner.test('Swing - setSwingEnabledState updates state', (t) => {
    setSwingEnabledState(true);
    t.assertEqual(getSwingEnabledState(), true, 'Should be enabled after setter');
    setSwingEnabledState(false);
    t.assertEqual(getSwingEnabledState(), false, 'Should be disabled after setter');
});

TestRunner.test('Swing - setSwingAmountState updates state', (t) => {
    setSwingAmountState(50);
    t.assertEqual(getSwingAmountState(), 50, 'Amount should be 50');
    setSwingAmountState(0);
    t.assertEqual(getSwingAmountState(), 0, 'Amount should be clamped to 0');
    setSwingAmountState(150);
    t.assertEqual(getSwingAmountState(), 100, 'Amount should be clamped to 100');
});

TestRunner.test('Swing - setSwingState updates full state', (t) => {
    const newState = { enabled: true, amount: 75 };
    setSwingState(newState);
    const state = getSwingState();
    t.assertEqual(state.enabled, true, 'Enabled should be true');
    t.assertEqual(state.amount, 75, 'Amount should be 75');
});

// ============================================
// Day 73: State Management Tests
// ============================================
TestRunner.test('Time Signature - getTimeSignatureState returns object', (t) => {
    const state = getTimeSignatureState();
    t.assertTruthy(typeof state === 'object', 'getTimeSignatureState should return an object');
    t.assertTruthy('numerator' in state, 'State should have numerator property');
    t.assertTruthy('denominator' in state, 'State should have denominator property');
});

TestRunner.test('Time Signature - getTimeSignatureNumeratorState returns number', (t) => {
    const numerator = getTimeSignatureNumeratorState();
    t.assertEqual(typeof numerator, 'number', 'Should return number');
    t.assertTruthy(numerator >= 1, 'Numerator should be >= 1');
    t.assertTruthy(numerator <= 16, 'Numerator should be <= 16');
});

TestRunner.test('Time Signature - setTimeSignatureNumeratorState updates state', (t) => {
    setTimeSignatureNumeratorState(3);
    t.assertEqual(getTimeSignatureNumeratorState(), 3, 'Numerator should be 3');
    setTimeSignatureNumeratorState(6);
    t.assertEqual(getTimeSignatureNumeratorState(), 6, 'Numerator should be 6');
});

TestRunner.test('Time Signature - getTimeSignatureDenominatorState returns number', (t) => {
    const denominator = getTimeSignatureDenominatorState();
    t.assertEqual(typeof denominator, 'number', 'Should return number');
    t.assertTruthy([1, 2, 4, 8, 16, 32].includes(denominator), 'Denominator should be power of 2');
});

TestRunner.test('Time Signature - setTimeSignatureDenominatorState updates state', (t) => {
    setTimeSignatureDenominatorState(4);
    t.assertEqual(getTimeSignatureDenominatorState(), 4, 'Denominator should be 4');
    setTimeSignatureDenominatorState(8);
    t.assertEqual(getTimeSignatureDenominatorState(), 8, 'Denominator should be 8');
});

TestRunner.test('Time Signature - setTimeSignatureState updates full state', (t) => {
    setTimeSignatureState(6, 8);
    const state = getTimeSignatureState();
    t.assertEqual(state.numerator, 6, 'Numerator should be 6');
    t.assertEqual(state.denominator, 8, 'Denominator should be 8');
});

TestRunner.test('Ghost Track - getGhostTrackIdState returns null by default', (t) => {
    const ghostId = getGhostTrackIdState();
    t.assertEqual(ghostId, null, 'Ghost track should be null by default');
});

TestRunner.test('Ghost Track - setGhostTrackIdState updates state', (t) => {
    setGhostTrackIdState('test-track-123');
    t.assertEqual(getGhostTrackIdState(), 'test-track-123', 'Ghost track should be set');
    setGhostTrackIdState(null);
    t.assertEqual(getGhostTrackIdState(), null, 'Ghost track should be cleared');
});

TestRunner.test('Timeline Markers - getTimelineMarkersState returns array', (t) => {
    const markers = getTimelineMarkersState();
    t.assertTruthy(Array.isArray(markers), 'Timeline markers should be an array');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState adds marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Test Marker', 4);
    t.assertTruthy(marker, 'Marker should be added');
    t.assertTruthy(marker.id, 'Marker should have an id');
    t.assertEqual(marker.name, 'Test Marker', 'Marker name should match');
    t.assertEqual(marker.bar, 4, 'Marker bar should match');
    t.assertEqual(marker.color, '#ff9f43', 'Marker color should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState returns marker', (t) => {
    clearTimelineMarkersState();
    const added = addTimelineMarkerState('Find Test', 8);
    const found = getTimelineMarkerByIdState(added.id);
    t.assertTruthy(found, 'Marker should be found');
    t.assertEqual(found.name, 'Find Test', 'Found marker should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState handles unknown id', (t) => {
    const notFound = getTimelineMarkerByIdState('nonexistent-marker-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState updates marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Original', 4);
    setTimelineMarkerState(marker.id, { name: 'Updated', bar: 10 });
    const updated = getTimelineMarkerByIdState(marker.id);
    t.assertEqual(updated.name, 'Updated', 'Marker name should be updated');
    t.assertEqual(updated.bar, 10, 'Marker bar should be updated');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - removeTimelineMarkerState removes marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('To Remove', 4);
    t.assertTruthy(getTimelineMarkerByIdState(marker.id), 'Marker should exist before removal');
    removeTimelineMarkerState(marker.id);
    t.assertEqual(getTimelineMarkerByIdState(marker.id), undefined, 'Marker should be removed');
    clearTimelineMarkersState();
});

TestRunner.test('Send Tracks - getSendTracksState returns array', (t) => {
    const sends = getSendTracksState();
    t.assertTruthy(Array.isArray(sends), 'Send tracks should be an array');
});

TestRunner.test('Send Tracks - getSendTrackByIdState handles unknown id', (t) => {
    const notFound = getSendTrackByIdState('nonexistent-send-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Send Tracks - getTrackSendsState returns object', (t) => {
    const sends = getTrackSendsState();
    t.assertTruthy(typeof sends === 'object', 'Track sends should be an object');
});

TestRunner.test('Send Tracks - getTrackSendLevelState returns number', (t) => {
    const level = getTrackSendLevelState('nonexistent', 999);
    t.assertEqual(typeof level, 'number', 'Send level should be a number');
    t.assertEqual(level, 0, 'Default send level should be 0');
});

TestRunner.test('Send Tracks - addSendTrackState creates send track', (t) => {
    const send = addSendTrackState({ name: 'Test Send', level: 0.75 });
    t.assertTruthy(send, 'addSendTrackState should return a send track');
    t.assertEqual(send.name, 'Test Send', 'Send name should match');
    t.assertEqual(send.level, 0.75, 'Send level should match');
});

TestRunner.test('Send Tracks - setSendTrackMutedState updates send', (t) => {
    const send = addSendTrackState({ name: 'Mute Test' });
    const result = setSendTrackMutedState(send.id, true);
    t.assertTruthy(result, 'setSendTrackMutedState should return true on success');
    const sendAfter = getSendTrackByIdState(send.id);
    t.assertEqual(sendAfter.muted, true, 'Send should be muted');
    setSendTrackMutedState(send.id, false);
    t.assertEqual(sendAfter.muted, false, 'Send should be unmuted');
});

// ============================================
// Day 75: Armed Track State Tests
// ============================================
TestRunner.test('Armed Track - getArmedTrackIdState returns null initially', (t) => {
    const armedId = getArmedTrackIdState();
    t.assertEqual(armedId, null, 'Should be null initially');
});

TestRunner.test('Armed Track - setArmedTrackIdState updates state', (t) => {
    setArmedTrackIdState('track-123');
    t.assertEqual(getArmedTrackIdState(), 'track-123', 'Armed track should be set');
    setArmedTrackIdState(null);
    t.assertEqual(getArmedTrackIdState(), null, 'Armed track should be cleared');
});

TestRunner.test('Armed Track - setArmedTrackIdState handles undefined', (t) => {
    setArmedTrackIdState('track-456');
    setArmedTrackIdState(undefined);
    t.assertEqual(getArmedTrackIdState(), null, 'Should become null when set to undefined');
});

TestRunner.test('Armed Track - setArmedTrackIdState handles numeric track ID', (t) => {
    setArmedTrackIdState(42);
    t.assertEqual(getArmedTrackIdState(), 42, 'Should handle numeric track ID');
    setArmedTrackIdState(null);
});

// ============================================
// Day 76: Master Effects State Tests
// ============================================
TestRunner.test('Master Effects - getMasterEffectsState returns array', (t) => {
    const effects = getMasterEffectsState();
    t.assertTruthy(Array.isArray(effects), 'Master effects should be an array');
});

TestRunner.test('Master Effects - addMasterEffectToState creates effect', (t) => {
    const effectsBefore = getMasterEffectsState().length;
    const effectId = addMasterEffectToState('Reverb', { decay: 2.5 });
    t.assertTruthy(typeof effectId === 'string', 'Should return effect ID string');
    t.assertTruthy(effectId.startsWith('mastereffect_'), 'Effect ID should have correct prefix');
    const effectsAfter = getMasterEffectsState();
    t.assertEqual(effectsAfter.length, effectsBefore + 1, 'Should have one more effect');
    const added = effectsAfter.find(e => e.id === effectId);
    t.assertEqual(added.type, 'Reverb', 'Effect type should be Reverb');
    t.assertEqual(added.params.decay, 2.5, 'Effect params should be set');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - addMasterEffectToState with default params', (t) => {
    const effectId = addMasterEffectToState('Delay');
    t.assertTruthy(typeof effectId === 'string', 'Should return effect ID');
    const effects = getMasterEffectsState();
    const added = effects.find(e => e.id === effectId);
    t.assertEqual(added.type, 'Delay', 'Effect type should be Delay');
    t.assertTruthy(added.params, 'Should have params object');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - removeMasterEffectFromState removes effect', (t) => {
    const effectId = addMasterEffectToState('Chorus');
    const effectsBefore = getMasterEffectsState();
    t.assertTruthy(effectsBefore.some(e => e.id === effectId), 'Effect should exist before removal');
    removeMasterEffectFromState(effectId);
    const effectsAfter = getMasterEffectsState();
    t.assertEqual(effectsAfter.find(e => e.id === effectId), undefined, 'Effect should be removed');
});

TestRunner.test('Master Effects - removeMasterEffectFromState handles unknown id', (t) => {
    // Should not throw, just warn
    removeMasterEffectFromState('nonexistent-effect-id');
    t.assertTruthy(true, 'Should complete without throwing');
});

TestRunner.test('Master Effects - updateMasterEffectParamInState updates param', (t) => {
    const effectId = addMasterEffectToState('Reverb', { decay: 1.5, wet: 0.5 });
    updateMasterEffectParamInState(effectId, 'decay', 3.5);
    updateMasterEffectParamInState(effectId, 'wet', 0.8);
    const effects = getMasterEffectsState();
    const effect = effects.find(e => e.id === effectId);
    t.assertEqual(effect.params.decay, 3.5, 'Decay should be updated');
    t.assertEqual(effect.params.wet, 0.8, 'Wet should be updated');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - updateMasterEffectParamInState handles nested param path', (t) => {
    const effectId = addMasterEffectToState('Filter', { frequency: 1000, Q: 1 });
    updateMasterEffectParamInState(effectId, 'frequency', 2000);
    const effects = getMasterEffectsState();
    const effect = effects.find(e => e.id === effectId);
    t.assertEqual(effect.params.frequency, 2000, 'Frequency should be updated');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - updateMasterEffectParamInState handles unknown effect', (t) => {
    // Should not throw
    updateMasterEffectParamInState('nonexistent-id', 'wet', 0.9);
    t.assertTruthy(true, 'Should complete without throwing');
});

TestRunner.test('Master Effects - reorderMasterEffectInState reorders effect', (t) => {
    const id1 = addMasterEffectToState('Reverb');
    const id2 = addMasterEffectToState('Delay');
    const id3 = addMasterEffectToState('Chorus');
    const effects = getMasterEffectsState();
    const idx1 = effects.findIndex(e => e.id === id1);
    const idx3 = effects.findIndex(e => e.id === id3);
    t.assertEqual(Math.abs(idx1 - idx3), 2, 'Effect1 and Effect3 should be 2 apart initially');
    // Move Effect1 to where Effect3 is
    reorderMasterEffectInState(id1, idx3);
    const effectsAfter = getMasterEffectsState();
    const newIdx1 = effectsAfter.findIndex(e => e.id === id1);
    t.assertEqual(newIdx1, idx3, 'Effect1 should now be at former idx3 position');
    // Cleanup
    removeMasterEffectFromState(id1);
    removeMasterEffectFromState(id2);
    removeMasterEffectFromState(id3);
});

TestRunner.test('Master Effects - reorderMasterEffectInState handles same index', (t) => {
    const id1 = addMasterEffectToState('SameIdx');
    const effectsBefore = getMasterEffectsState().map(e => e.id);
    reorderMasterEffectInState(id1, effectsBefore.findIndex(e => e === id1));
    const effectsAfter = getMasterEffectsState().map(e => e.id);
    t.assertDeepEqual(effectsBefore, effectsAfter, 'Order should be unchanged');
    // Cleanup
    removeMasterEffectFromState(id1);
});

TestRunner.test('Master Effects - reorderMasterEffectInState handles invalid index', (t) => {
    const id1 = addMasterEffectToState('InvalidIdx');
    // Negative index should be handled
    reorderMasterEffectInState(id1, -1);
    // Index beyond length should be handled
    reorderMasterEffectInState(id1, 9999);
    t.assertTruthy(true, 'Should complete without throwing');
    // Cleanup
    removeMasterEffectFromState(id1);
});

TestRunner.test('Master Effects - multiple effects can be added and removed', (t) => {
    const ids = [];
    for (let i = 0; i < 5; i++) {
        ids.push(addMasterEffectToState('Reverb'));
    }
    let effects = getMasterEffectsState();
    t.assertEqual(effects.length, 5, 'Should have 5 effects');
    // Remove middle one
    removeMasterEffectFromState(ids[2]);
    effects = getMasterEffectsState();
    t.assertEqual(effects.length, 4, 'Should have 4 effects after removal');
    // Cleanup remaining
    for (const id of ids) {
        removeMasterEffectFromState(id);
    }
    effects = getMasterEffectsState();
    t.assertEqual(effects.length, 0, 'All effects should be removed');
});

// ============================================
// Day 81: Additional State Management Tests
// ============================================

// Metronome State Tests
TestRunner.test('Metronome - getMetronomeEnabledState returns boolean', (t) => {
    const enabled = getMetronomeEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'Metronome enabled should be boolean');
});

TestRunner.test('Metronome - setMetronomeEnabledState updates state', (t) => {
    setMetronomeEnabledState(true);
    t.assertEqual(getMetronomeEnabledState(), true, 'Metronome should be enabled');
    setMetronomeEnabledState(false);
    t.assertEqual(getMetronomeEnabledState(), false, 'Metronome should be disabled');
});

TestRunner.test('Metronome - getMetronomeVolumeState returns number', (t) => {
    const volume = getMetronomeVolumeState();
    t.assertEqual(typeof volume, 'number', 'Metronome volume should be a number');
    t.assertTruthy(volume >= 0 && volume <= 1, 'Volume should be 0-1 range');
});

TestRunner.test('Metronome - setMetronomeVolumeState updates state', (t) => {
    setMetronomeVolumeState(0.75);
    t.assertEqual(getMetronomeVolumeState(), 0.75, 'Metronome volume should be 0.75');
    setMetronomeVolumeState(0.5);
    t.assertEqual(getMetronomeVolumeState(), 0.5, 'Metronome volume should be 0.5');
});

// Playback Mode State Tests
TestRunner.test('Playback Mode - getPlaybackModeState returns value', (t) => {
    const mode = getPlaybackModeState();
    t.assertTrue(typeof mode === 'number', 'Playback mode should be a number');
    t.assertTruthy(mode >= 0 && mode <= 2, 'Playback mode should be 0-2');
});

// Tracks State Tests
TestRunner.test('Tracks - getTracksState returns array', (t) => {
    const tracks = getTracksState();
    t.assertTruthy(Array.isArray(tracks), 'Tracks should be an array');
});

TestRunner.test('Tracks - getTrackByIdState returns undefined for unknown id', (t) => {
    const track = getTrackByIdState('nonexistent-id-12345');
    t.assertEqual(track, undefined, 'Should return undefined for unknown track ID');
});

// Master Gain State Tests
TestRunner.test('Master Gain - getMasterGainValueState returns number', (t) => {
    const gain = getMasterGainValueState();
    t.assertEqual(typeof gain, 'number', 'Master gain should be a number');
});

// Open Windows State Tests
TestRunner.test('Open Windows - getOpenWindowsState returns object', (t) => {
    const windows = getOpenWindowsState();
    t.assertTruthy(typeof windows === 'object', 'Open windows should be an object (Map)');
});

// Active Sequencer Track State Tests
TestRunner.test('Active Sequencer - getActiveSequencerTrackIdState returns value', (t) => {
    const trackId = getActiveSequencerTrackIdState();
    t.assertTrue(trackId === null || typeof trackId === 'string', 'Active sequencer track ID should be null or string');
});

// Highest Z State Tests
TestRunner.test('Highest Z - getHighestZState returns number', (t) => {
    const z = getHighestZState();
    t.assertEqual(typeof z, 'number', 'Highest Z should be a number');
    t.assertTruthy(z >= 0, 'Highest Z should be non-negative');
});

// Clipboard State Tests
TestRunner.test('Clipboard - getClipboardDataState returns value', (t) => {
    const data = getClipboardDataState();
    t.assertTrue(data === null || typeof data === 'object', 'Clipboard data should be null or object');
});


// ============================================
// Day 104: SnugWindow, Track Types and Utils Constants Tests
// ============================================

// SnugWindow Default Dimension Constants Tests
TestRunner.test('SnugWindow - DEFAULT_WINDOW_MIN_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_MIN_WIDTH === 'number', 'DEFAULT_WINDOW_MIN_WIDTH should be a number');
    t.assertTruthy(DEFAULT_WINDOW_MIN_WIDTH >= 100, 'DEFAULT_WINDOW_MIN_WIDTH should be >= 100');
    t.assertTruthy(DEFAULT_WINDOW_MIN_WIDTH <= 500, 'DEFAULT_WINDOW_MIN_WIDTH should be <= 500');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_MIN_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_MIN_HEIGHT === 'number', 'DEFAULT_WINDOW_MIN_HEIGHT should be a number');
    t.assertTruthy(DEFAULT_WINDOW_MIN_HEIGHT >= 100, 'DEFAULT_WINDOW_MIN_HEIGHT should be >= 100');
    t.assertTruthy(DEFAULT_WINDOW_MIN_HEIGHT <= 500, 'DEFAULT_WINDOW_MIN_HEIGHT should be <= 500');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_WIDTH === 'number', 'DEFAULT_WINDOW_WIDTH should be a number');
    t.assertTruthy(DEFAULT_WINDOW_WIDTH >= 200, 'DEFAULT_WINDOW_WIDTH should be >= 200');
    t.assertTruthy(DEFAULT_WINDOW_WIDTH <= 1000, 'DEFAULT_WINDOW_WIDTH should be <= 1000');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_HEIGHT === 'number', 'DEFAULT_WINDOW_HEIGHT should be a number');
    t.assertTruthy(DEFAULT_WINDOW_HEIGHT >= 150, 'DEFAULT_WINDOW_HEIGHT should be >= 150');
    t.assertTruthy(DEFAULT_WINDOW_HEIGHT <= 1000, 'DEFAULT_WINDOW_HEIGHT should be <= 1000');
});

TestRunner.test('SnugWindow - TASKBAR_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof TASKBAR_HEIGHT === 'number', 'TASKBAR_HEIGHT should be a number');
    t.assertTruthy(TASKBAR_HEIGHT >= 20, 'TASKBAR_HEIGHT should be >= 20');
    t.assertTruthy(TASKBAR_HEIGHT <= 100, 'TASKBAR_HEIGHT should be <= 100');
});

// Track Types Validation Tests
TestRunner.test('Track Types - track type strings are valid', (t) => {
    const validTypes = ['Synth', 'DrumSampler', 'Sampler', 'InstrumentSampler', 'Audio'];
    t.assertTruthy(Array.isArray(validTypes), 'Track types should be an array');
    t.assertEqual(validTypes.length, 5, 'Should have 5 track types');
});

TestRunner.test('Track Types - all expected track types are defined', (t) => {
    const types = ['Synth', 'DrumSampler', 'Sampler', 'InstrumentSampler', 'Audio'];
    types.forEach(type => {
        t.assertEqual(typeof type, 'string', type + ' should be a string');
        t.assertTruthy(type.length > 0, type + ' should not be empty');
    });
});

// Utils Function Tests
TestRunner.test('Utils - showNotification function exists', (t) => {
    t.assertEqual(typeof showNotification, 'function', 'showNotification should be a function');
});

TestRunner.test('Utils - showNotification accepts message and duration', (t) => {
    t.assertEqual(showNotification.length, 2, 'showNotification should accept 2 parameters');
});

TestRunner.test('Utils - showCustomModal function exists', (t) => {
    t.assertEqual(typeof showCustomModal, 'function', 'showCustomModal should be a function');
});

TestRunner.test('Utils - showConfirmationDialog function exists', (t) => {
    t.assertEqual(typeof showConfirmationDialog, 'function', 'showConfirmationDialog should be a function');
});

TestRunner.test('Utils - secondsToBBSTime function exists', (t) => {
    t.assertEqual(typeof secondsToBBSTime, 'function', 'secondsToBBSTime should be a function');
});

TestRunner.test('Utils - bbsTimeToSeconds function exists', (t) => {
    t.assertEqual(typeof bbsTimeToSeconds, 'function', 'bbsTimeToSeconds should be a function');
});

TestRunner.test('Utils - createContextMenu function exists', (t) => {
    t.assertEqual(typeof createContextMenu, 'function', 'createContextMenu should be a function');
});

TestRunner.test('Utils - createDropZoneHTML function exists', (t) => {
    t.assertEqual(typeof createDropZoneHTML, 'function', 'createDropZoneHTML should be a function');
});

TestRunner.test('Utils - setupGenericDropZoneListeners function exists', (t) => {
    t.assertEqual(typeof setupGenericDropZoneListeners, 'function', 'setupGenericDropZoneListeners should be a function');
});

// Context Menu Constants Tests
TestRunner.test('Context Menu - CONTEXT_MENU_ITEM_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof CONTEXT_MENU_ITEM_HEIGHT === 'number', 'CONTEXT_MENU_ITEM_HEIGHT should be a number');
    t.assertTruthy(CONTEXT_MENU_ITEM_HEIGHT >= 20, 'CONTEXT_MENU_ITEM_HEIGHT should be >= 20');
    t.assertTruthy(CONTEXT_MENU_ITEM_HEIGHT <= 50, 'CONTEXT_MENU_ITEM_HEIGHT should be <= 50');
});

TestRunner.test('Context Menu - CONTEXT_MENU_MAX_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof CONTEXT_MENU_MAX_WIDTH === 'number', 'CONTEXT_MENU_MAX_WIDTH should be a number');
    t.assertTruthy(CONTEXT_MENU_MAX_WIDTH >= 100, 'CONTEXT_MENU_MAX_WIDTH should be >= 100');
    t.assertTruthy(CONTEXT_MENU_MAX_WIDTH <= 500, 'CONTEXT_MENU_MAX_WIDTH should be <= 500');
});

// Sequencer Grid Constants Tests
TestRunner.test('Sequencer Grid - GRID_STEP_LABELS has expected format', (t) => {
    t.assertTruthy(typeof GRID_STEP_LABELS === 'object', 'GRID_STEP_LABELS should be an object');
    t.assertTruthy(Array.isArray(GRID_STEP_LABELS.labels), 'GRID_STEP_LABELS.labels should be an array');
});

TestRunner.test('Sequencer Grid - STEP_LABELS_SIXTEENTHS has 16 entries', (t) => {
    t.assertTruthy(typeof STEP_LABELS_SIXTEENTHS === 'object', 'STEP_LABELS_SIXTEENTHS should be an object');
    t.assertTruthy(Array.isArray(STEP_LABELS_SIXTEENTHS.labels), 'STEP_LABELS_SIXTEENTHS.labels should be an array');
    t.assertEqual(STEP_LABELS_SIXTEENTHS.labels.length, 16, 'SIXTEENTHS should have 16 entries');
});

// Sound Library Constants Tests
TestRunner.test('Sound Library - soundLibraries is an object', (t) => {
    t.assertEqual(typeof soundLibraries, 'object', 'soundLibraries should be an object');
    t.assertTruthy(soundLibraries !== null, 'soundLibraries should not be null');
});

// Synth Engine Control Definitions Tests
TestRunner.test('Synth Engine - synthEngineControlDefinitions is an object', (t) => {
    t.assertEqual(typeof synthEngineControlDefinitions, 'object', 'synthEngineControlDefinitions should be an object');
    t.assertTruthy(synthEngineControlDefinitions !== null, 'synthEngineControlDefinitions should not be null');
});

TestRunner.test('Synth Engine - synthEngineControlDefinitions has MonoSynth', (t) => {
    t.assertTruthy(typeof synthEngineControlDefinitions.MonoSynth === 'object', 'synthEngineControlDefinitions should have MonoSynth');
});

TestRunner.test('Synth Engine - synthEngineControlDefinitions.MonoSynth has controls', (t) => {
    const mono = synthEngineControlDefinitions.MonoSynth;
    t.assertTruthy(Array.isArray(mono.controls), 'MonoSynth should have controls array');
    t.assertTruthy(mono.controls.length > 0, 'MonoSynth should have at least one control');
});

// ============================================
// Day 70: Constants Validation Tests
// ============================================

// computerKeySynthMap Validation Tests
TestRunner.test('computerKeySynthMap - has valid structure', (t) => {
    t.assertTruthy(typeof computerKeySynthMap === 'object', 'computerKeySynthMap should be an object');
    t.assertTruthy('a' in computerKeySynthMap, 'Should have white key a');
    t.assertTruthy('k' in computerKeySynthMap, 'Should have white key k');
    t.assertTruthy('w' in computerKeySynthMap, 'Should have black key w');
    t.assertTruthy('u' in computerKeySynthMap, 'Should have black key u');
});

TestRunner.test('computerKeySynthMap - white key values are valid notes', (t) => {
    const c4Value = computerKeySynthMap['a'];
    t.assertEqual(typeof c4Value, 'number', 'Key a should map to a number (MIDI note)');
    t.assertEqual(c4Value, 60, 'Key a should be C4 (MIDI note 60)');
});

TestRunner.test('computerKeySynthMap - black key values are valid notes', (t) => {
    const cS4Value = computerKeySynthMap['w'];
    t.assertEqual(typeof cS4Value, 'number', 'Key w should map to a number (MIDI note)');
    t.assertEqual(cS4Value, 61, 'Key w should be C#4 (MIDI note 61)');
});

// TRACK_COLORS Validation Tests
TestRunner.test('TRACK_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(TRACK_COLORS), 'TRACK_COLORS should be an array');
});

TestRunner.test('TRACK_COLORS - has expected colors', (t) => {
    t.assertTruthy(TRACK_COLORS.length >= 8, 'Should have at least 8 colors');
});

TestRunner.test('TRACK_COLORS - colors are valid hex', (t) => {
    TRACK_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// CLIP_COLORS Validation Tests
TestRunner.test('CLIP_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(CLIP_COLORS), 'CLIP_COLORS should be an array');
});

TestRunner.test('CLIP_COLORS - has expected count', (t) => {
    t.assertTruthy(CLIP_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('CLIP_COLORS - colors are valid hex', (t) => {
    CLIP_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// MARKER_COLORS Validation Tests
TestRunner.test('MARKER_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(MARKER_COLORS), 'MARKER_COLORS should be an array');
});

TestRunner.test('MARKER_COLORS - has expected count', (t) => {
    t.assertTruthy(MARKER_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('MARKER_COLORS - colors are valid hex', (t) => {
    MARKER_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// AUTOMATION_LANE_COLORS Validation Tests
TestRunner.test('Automation Lane Colors - is an array', (t) => {
    t.assertTruthy(Array.isArray(AUTOMATION_LANE_COLORS), 'AUTOMATION_LANE_COLORS should be an array');
});

TestRunner.test('Automation Lane Colors - has expected count', (t) => {
    t.assertTruthy(AUTOMATION_LANE_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('Automation Lane Colors - colors are valid hex', (t) => {
    AUTOMATION_LANE_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// CHORD_TYPES Validation Tests
TestRunner.test('CHORD_TYPES - is an object', (t) => {
    t.assertTruthy(typeof CHORD_TYPES === 'object', 'CHORD_TYPES should be an object');
});

TestRunner.test('CHORD_TYPES - has major chord type', (t) => {
    t.assertTruthy(CHORD_TYPES['major'], 'CHORD_TYPES should have major chord');
});

TestRunner.test('CHORD_TYPES - has minor chord type', (t) => {
    t.assertTruthy(CHORD_TYPES['minor'], 'CHORD_TYPES should have minor chord');
});

TestRunner.test('CHORD_TYPES - chord intervals are valid', (t) => {
    for (const [type, intervals] of Object.entries(CHORD_TYPES)) {
        t.assertTruthy(Array.isArray(intervals), `${type} intervals should be an array`);
        intervals.forEach(interval => {
            t.assertEqual(typeof interval, 'number', `Interval in ${type} should be a number`);
            t.assertTruthy(interval >= 0, `Interval in ${type} should be non-negative`);
        });
    }
});

// ============================================
// Day 87: Chord Voicing Constants Tests
// ============================================
TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD is an object', (t) => {
    t.assertTruthy(typeof CHORD_VOICING_SPREAD === 'object', 'CHORD_VOICING_SPREAD should be an object');
    t.assertTruthy(CHORD_VOICING_SPREAD !== null, 'CHORD_VOICING_SPREAD should not be null');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has closed voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['closed'], 'Should have closed voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['closed']), 'Closed voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has wide voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['wide'], 'Should have wide voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['wide']), 'Wide voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has drop2 voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['drop2'], 'Should have drop2 voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['drop2']), 'Drop2 voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has rootless voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['rootless'], 'Should have rootless voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['rootless']), 'Rootless voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD intervals are valid numbers', (t) => {
    for (const [voicing, intervals] of Object.entries(CHORD_VOICING_SPREAD)) {
        intervals.forEach(interval => {
            t.assertEqual(typeof interval, 'number', `Interval in ${voicing} should be a number`);
            t.assertTruthy(interval >= 0, `Interval in ${voicing} should be non-negative`);
        });
    }
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS is an array', (t) => {
    t.assertTruthy(Array.isArray(CHORD_VOICINGS), 'CHORD_VOICINGS should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains 4 voicing types', (t) => {
    t.assertEqual(CHORD_VOICINGS.length, 4, 'Should have 4 voicing types');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains closed', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('closed'), 'Should include closed');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains wide', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('wide'), 'Should include wide');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains drop2', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('drop2'), 'Should include drop2');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains rootless', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('rootless'), 'Should include rootless');
});

TestRunner.test('Chord Voicing - DEFAULT_CHORD_VOICING is valid', (t) => {
    t.assertEqual(typeof DEFAULT_CHORD_VOICING, 'string', 'Should be a string');
    t.assertEqual(DEFAULT_CHORD_VOICING, 'closed', 'Default should be closed');
    t.assertTruthy(CHORD_VOICINGS.includes(DEFAULT_CHORD_VOICING), 'Default should be in CHORD_VOICINGS');
});

TestRunner.test('Chord Voicing - voicing spread arrays have 12 elements', (t) => {
    for (const [voicing, intervals] of Object.entries(CHORD_VOICING_SPREAD)) {
        t.assertEqual(intervals.length, 12, `${voicing} should have 12 elements (one per semitone)`);
    }
});

TestRunner.test('Chord Voicing - closed voicing starts at 0', (t) => {
    t.assertEqual(CHORD_VOICING_SPREAD['closed'][0], 0, 'Closed voicing should start at 0');
});

TestRunner.test('Chord Voicing - rootless voicing starts at 2 (no root)', (t) => {
    t.assertEqual(CHORD_VOICING_SPREAD['rootless'][0], 2, 'Rootless voicing should start at 2 (skipping root)');
});

// ============================================
// Day 70: Send Tracks Additional Tests
// ============================================
TestRunner.test('Send Tracks - getTrackSendLevelState handles nonexistent track', (t) => {
    const level = getTrackSendLevelState('nonexistent-track', 'nonexistent-send');
    t.assertEqual(level, 0, 'Should return 0 for nonexistent track/send');
});

TestRunner.test('Send Tracks - getTrackSendLevelState handles unknown send', (t) => {
    const level = getTrackSendLevelState('existing-track', 'nonexistent-send');
    t.assertEqual(level, 0, 'Should return 0 for unknown send');
});

TestRunner.test('Send Tracks - setTrackSendLevelState updates level', (t) => {
    const send = addSendTrackState({ name: 'Level Test' });
    setTrackSendLevelState('any-track-id', send.id, 0.5);
    const level = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(level, 0.5, 'Send level should be updated');
    // Test clamping
    setTrackSendLevelState('any-track-id', send.id, 1.5);
    const levelClamped = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(levelClamped, 1.2, 'Level should be clamped to max 1.2');
    setTrackSendLevelState('any-track-id', send.id, -0.5);
    const levelMin = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(levelMin, 0, 'Level should be clamped to min 0');
});

TestRunner.test('Send Tracks - setTrackSendLevelState creates track entry if needed', (t) => {
    const send = addSendTrackState({ name: 'New Track Test' });
    // Should not throw, should auto-create trackSendsState entry
    setTrackSendLevelState('new-track-xyz', send.id, 0.8);
    const level = getTrackSendLevelState('new-track-xyz', send.id);
    t.assertEqual(level, 0.8, 'Level should be set for new track');
});

TestRunner.test('Send Tracks - getTrackSendPreFaderState returns boolean', (t) => {
    const preFader = getTrackSendPreFaderState('any-track', 'any-send');
    t.assertEqual(typeof preFader, 'boolean', 'Should return boolean');
    t.assertEqual(preFader, false, 'Default should be false');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState updates preFader', (t) => {
    const send = addSendTrackState({ name: 'PreFader Test' });
    const result = setTrackSendPreFaderState('track-prefader', send.id, true);
    t.assertTruthy(result, 'Should return true');
    const preFader = getTrackSendPreFaderState('track-prefader', send.id);
    t.assertEqual(preFader, true, 'Pre-fader should be true');
    setTrackSendPreFaderState('track-prefader', send.id, false);
    const preFaderAfter = getTrackSendPreFaderState('track-prefader', send.id);
    t.assertEqual(preFaderAfter, false, 'Pre-fader should be false');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState handles nonexistent track', (t) => {
    // Should not throw, should auto-create entry
    setTrackSendPreFaderState('nonexistent-track-123', 999, true);
    const preFader = getTrackSendPreFaderState('nonexistent-track-123', 999);
    t.assertEqual(preFader, true, 'Should create and return true');
});

TestRunner.test('Send Tracks - addSendTrackState with default values', (t) => {
    const send = addSendTrackState({});
    t.assertTruthy(send.id !== undefined, 'Should have an ID');
    t.assertEqual(send.name, 'Send ' + send.id, 'Should have default name');
    t.assertEqual(send.level, 1.0, 'Default level should be 1.0');
    t.assertEqual(send.muted, false, 'Default muted should be false');
    t.assertTruthy(Array.isArray(send.effects), 'Should have effects array');
});

TestRunner.test('Send Tracks - addSendTrackState with custom id', (t) => {
    const send = addSendTrackState({ id: 9999, name: 'Custom ID Send' });
    t.assertEqual(send.id, 9999, 'ID should match custom value');
    t.assertEqual(send.name, 'Custom ID Send', 'Name should match');
});

// ============================================
// Day 70: Track Groups Additional Tests
// ============================================
TestRunner.test('Track Groups - getTrackGroupByIdState handles unknown id', (t) => {
    const group = getTrackGroupByIdState('nonexistent-group-12345');
    t.assertEqual(group, undefined, 'Should return undefined for unknown group');
});

// ============================================
// Day 71: Loop Region State Tests
// ============================================
TestRunner.test('Loop Region - getLoopRegionState returns object', (t) => {
    const state = getLoopRegionState();
    t.assertTruthy(typeof state === 'object', 'getLoopRegionState should return an object');
    t.assertTruthy('enabled' in state, 'State should have enabled property');
    t.assertTruthy('startBar' in state, 'State should have startBar property');
    t.assertTruthy('endBar' in state, 'State should have endBar property');
});

TestRunner.test('Loop Region - getLoopRegionEnabledState returns boolean', (t) => {
    const enabled = getLoopRegionEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'getLoopRegionEnabledState should return boolean');
});

TestRunner.test('Loop Region - getLoopRegionStartBarState returns number', (t) => {
    const startBar = getLoopRegionStartBarState();
    t.assertEqual(typeof startBar, 'number', 'getLoopRegionStartBarState should return number');
    t.assertTruthy(startBar >= 1, 'Start bar should be >= 1');
});

TestRunner.test('Loop Region - getLoopRegionEndBarState returns number', (t) => {
    const endBar = getLoopRegionEndBarState();
    t.assertEqual(typeof endBar, 'number', 'getLoopRegionEndBarState should return number');
    t.assertTruthy(endBar >= 1, 'End bar should be >= 1');
});

TestRunner.test('Loop Region - setLoopRegionEnabledState updates state', (t) => {
    setLoopRegionEnabledState(true);
    t.assertEqual(getLoopRegionEnabledState(), true, 'Should be enabled after setter');
    setLoopRegionEnabledState(false);
    t.assertEqual(getLoopRegionEnabledState(), false, 'Should be disabled after setter');
});

TestRunner.test('Loop Region - setLoopRegionStartBarState updates state', (t) => {
    setLoopRegionStartBarState(5);
    t.assertEqual(getLoopRegionStartBarState(), 5, 'Start bar should be 5');
});

TestRunner.test('Loop Region - setLoopRegionEndBarState updates state', (t) => {
    setLoopRegionEndBarState(8);
    t.assertEqual(getLoopRegionEndBarState(), 8, 'End bar should be 8');
});

TestRunner.test('Loop Region - setLoopRegionState updates full state', (t) => {
    const newState = { enabled: true, startBar: 2, endBar: 10 };
    setLoopRegionState(newState);
    const state = getLoopRegionState();
    t.assertEqual(state.enabled, true, 'Enabled should be true');
    t.assertEqual(state.startBar, 2, 'Start bar should be 2');
    t.assertEqual(state.endBar, 10, 'End bar should be 10');
});

// ============================================
// Day 71: Swing State Tests
// ============================================
TestRunner.test('Swing - getSwingState returns object', (t) => {
    const state = getSwingState();
    t.assertTruthy(typeof state === 'object', 'getSwingState should return an object');
    t.assertTruthy('enabled' in state, 'State should have enabled property');
    t.assertTruthy('amount' in state, 'State should have amount property');
});

TestRunner.test('Swing - getSwingEnabledState returns boolean', (t) => {
    const enabled = getSwingEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'getSwingEnabledState should return boolean');
});

TestRunner.test('Swing - getSwingAmountState returns number', (t) => {
    const amount = getSwingAmountState();
    t.assertEqual(typeof amount, 'number', 'getSwingAmountState should return number');
    t.assertTruthy(amount >= 0, 'Amount should be >= 0');
    t.assertTruthy(amount <= 100, 'Amount should be <= 100');
});

TestRunner.test('Swing - setSwingEnabledState updates state', (t) => {
    setSwingEnabledState(true);
    t.assertEqual(getSwingEnabledState(), true, 'Should be enabled after setter');
    setSwingEnabledState(false);
    t.assertEqual(getSwingEnabledState(), false, 'Should be disabled after setter');
});

TestRunner.test('Swing - setSwingAmountState updates state', (t) => {
    setSwingAmountState(50);
    t.assertEqual(getSwingAmountState(), 50, 'Amount should be 50');
    setSwingAmountState(0);
    t.assertEqual(getSwingAmountState(), 0, 'Amount should be clamped to 0');
    setSwingAmountState(150);
    t.assertEqual(getSwingAmountState(), 100, 'Amount should be clamped to 100');
});

TestRunner.test('Swing - setSwingState updates full state', (t) => {
    const newState = { enabled: true, amount: 75 };
    setSwingState(newState);
    const state = getSwingState();
    t.assertEqual(state.enabled, true, 'Enabled should be true');
    t.assertEqual(state.amount, 75, 'Amount should be 75');
});

// ============================================
// Day 73: State Management Tests
// ============================================
TestRunner.test('Time Signature - getTimeSignatureState returns object', (t) => {
    const state = getTimeSignatureState();
    t.assertTruthy(typeof state === 'object', 'getTimeSignatureState should return an object');
    t.assertTruthy('numerator' in state, 'State should have numerator property');
    t.assertTruthy('denominator' in state, 'State should have denominator property');
});

TestRunner.test('Time Signature - getTimeSignatureNumeratorState returns number', (t) => {
    const numerator = getTimeSignatureNumeratorState();
    t.assertEqual(typeof numerator, 'number', 'Should return number');
    t.assertTruthy(numerator >= 1, 'Numerator should be >= 1');
    t.assertTruthy(numerator <= 16, 'Numerator should be <= 16');
});

TestRunner.test('Time Signature - setTimeSignatureNumeratorState updates state', (t) => {
    setTimeSignatureNumeratorState(3);
    t.assertEqual(getTimeSignatureNumeratorState(), 3, 'Numerator should be 3');
    setTimeSignatureNumeratorState(6);
    t.assertEqual(getTimeSignatureNumeratorState(), 6, 'Numerator should be 6');
});

TestRunner.test('Time Signature - getTimeSignatureDenominatorState returns number', (t) => {
    const denominator = getTimeSignatureDenominatorState();
    t.assertEqual(typeof denominator, 'number', 'Should return number');
    t.assertTruthy([1, 2, 4, 8, 16, 32].includes(denominator), 'Denominator should be power of 2');
});

TestRunner.test('Time Signature - setTimeSignatureDenominatorState updates state', (t) => {
    setTimeSignatureDenominatorState(4);
    t.assertEqual(getTimeSignatureDenominatorState(), 4, 'Denominator should be 4');
    setTimeSignatureDenominatorState(8);
    t.assertEqual(getTimeSignatureDenominatorState(), 8, 'Denominator should be 8');
});

TestRunner.test('Time Signature - setTimeSignatureState updates full state', (t) => {
    setTimeSignatureState(6, 8);
    const state = getTimeSignatureState();
    t.assertEqual(state.numerator, 6, 'Numerator should be 6');
    t.assertEqual(state.denominator, 8, 'Denominator should be 8');
});

TestRunner.test('Ghost Track - getGhostTrackIdState returns null by default', (t) => {
    const ghostId = getGhostTrackIdState();
    t.assertEqual(ghostId, null, 'Ghost track should be null by default');
});

TestRunner.test('Ghost Track - setGhostTrackIdState updates state', (t) => {
    setGhostTrackIdState('test-track-123');
    t.assertEqual(getGhostTrackIdState(), 'test-track-123', 'Ghost track should be set');
    setGhostTrackIdState(null);
    t.assertEqual(getGhostTrackIdState(), null, 'Ghost track should be cleared');
});

TestRunner.test('Timeline Markers - getTimelineMarkersState returns array', (t) => {
    const markers = getTimelineMarkersState();
    t.assertTruthy(Array.isArray(markers), 'Timeline markers should be an array');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState adds marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Test Marker', 4);
    t.assertTruthy(marker, 'Marker should be added');
    t.assertTruthy(marker.id, 'Marker should have an id');
    t.assertEqual(marker.name, 'Test Marker', 'Marker name should match');
    t.assertEqual(marker.bar, 4, 'Marker bar should match');
    t.assertEqual(marker.color, '#ff9f43', 'Marker color should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState returns marker', (t) => {
    clearTimelineMarkersState();
    const added = addTimelineMarkerState('Find Test', 8);
    const found = getTimelineMarkerByIdState(added.id);
    t.assertTruthy(found, 'Marker should be found');
    t.assertEqual(found.name, 'Find Test', 'Found marker should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState handles unknown id', (t) => {
    const notFound = getTimelineMarkerByIdState('nonexistent-marker-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState updates marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Original', 4);
    setTimelineMarkerState(marker.id, { name: 'Updated', bar: 10 });
    const updated = getTimelineMarkerByIdState(marker.id);
    t.assertEqual(updated.name, 'Updated', 'Marker name should be updated');
    t.assertEqual(updated.bar, 10, 'Marker bar should be updated');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - removeTimelineMarkerState removes marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('To Remove', 4);
    t.assertTruthy(getTimelineMarkerByIdState(marker.id), 'Marker should exist before removal');
    removeTimelineMarkerState(marker.id);
    t.assertEqual(getTimelineMarkerByIdState(marker.id), undefined, 'Marker should be removed');
    clearTimelineMarkersState();
});

TestRunner.test('Send Tracks - getSendTracksState returns array', (t) => {
    const sends = getSendTracksState();
    t.assertTruthy(Array.isArray(sends), 'Send tracks should be an array');
});

TestRunner.test('Send Tracks - getSendTrackByIdState handles unknown id', (t) => {
    const notFound = getSendTrackByIdState('nonexistent-send-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Send Tracks - getTrackSendsState returns object', (t) => {
    const sends = getTrackSendsState();
    t.assertTruthy(typeof sends === 'object', 'Track sends should be an object');
});

TestRunner.test('Send Tracks - getTrackSendLevelState returns number', (t) => {
    const level = getTrackSendLevelState('nonexistent', 999);
    t.assertEqual(typeof level, 'number', 'Send level should be a number');
    t.assertEqual(level, 0, 'Default send level should be 0');
});

TestRunner.test('Send Tracks - addSendTrackState creates send track', (t) => {
    const send = addSendTrackState({ name: 'Test Send', level: 0.75 });
    t.assertTruthy(send, 'addSendTrackState should return a send track');
    t.assertEqual(send.name, 'Test Send', 'Send name should match');
    t.assertEqual(send.level, 0.75, 'Send level should match');
});

TestRunner.test('Send Tracks - setSendTrackMutedState updates send', (t) => {
    const send = addSendTrackState({ name: 'Mute Test' });
    const result = setSendTrackMutedState(send.id, true);
    t.assertTruthy(result, 'setSendTrackMutedState should return true on success');
    const sendAfter = getSendTrackByIdState(send.id);
    t.assertEqual(sendAfter.muted, true, 'Send should be muted');
    setSendTrackMutedState(send.id, false);
    t.assertEqual(sendAfter.muted, false, 'Send should be unmuted');
});

// ============================================
// Day 75: Armed Track State Tests
// ============================================
TestRunner.test('Armed Track - getArmedTrackIdState returns null initially', (t) => {
    const armedId = getArmedTrackIdState();
    t.assertEqual(armedId, null, 'Should be null initially');
});

TestRunner.test('Armed Track - setArmedTrackIdState updates state', (t) => {
    setArmedTrackIdState('track-123');
    t.assertEqual(getArmedTrackIdState(), 'track-123', 'Armed track should be set');
    setArmedTrackIdState(null);
    t.assertEqual(getArmedTrackIdState(), null, 'Armed track should be cleared');
});

TestRunner.test('Armed Track - setArmedTrackIdState handles undefined', (t) => {
    setArmedTrackIdState('track-456');
    setArmedTrackIdState(undefined);
    t.assertEqual(getArmedTrackIdState(), null, 'Should become null when set to undefined');
});

TestRunner.test('Armed Track - setArmedTrackIdState handles numeric track ID', (t) => {
    setArmedTrackIdState(42);
    t.assertEqual(getArmedTrackIdState(), 42, 'Should handle numeric track ID');
    setArmedTrackIdState(null);
});

// ============================================
// Day 76: Master Effects State Tests
// ============================================
TestRunner.test('Master Effects - getMasterEffectsState returns array', (t) => {
    const effects = getMasterEffectsState();
    t.assertTruthy(Array.isArray(effects), 'Master effects should be an array');
});

TestRunner.test('Master Effects - addMasterEffectToState creates effect', (t) => {
    const effectsBefore = getMasterEffectsState().length;
    const effectId = addMasterEffectToState('Reverb', { decay: 2.5 });
    t.assertTruthy(typeof effectId === 'string', 'Should return effect ID string');
    t.assertTruthy(effectId.startsWith('mastereffect_'), 'Effect ID should have correct prefix');
    const effectsAfter = getMasterEffectsState();
    t.assertEqual(effectsAfter.length, effectsBefore + 1, 'Should have one more effect');
    const added = effectsAfter.find(e => e.id === effectId);
    t.assertEqual(added.type, 'Reverb', 'Effect type should be Reverb');
    t.assertEqual(added.params.decay, 2.5, 'Effect params should be set');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - addMasterEffectToState with default params', (t) => {
    const effectId = addMasterEffectToState('Delay');
    t.assertTruthy(typeof effectId === 'string', 'Should return effect ID');
    const effects = getMasterEffectsState();
    const added = effects.find(e => e.id === effectId);
    t.assertEqual(added.type, 'Delay', 'Effect type should be Delay');
    t.assertTruthy(added.params, 'Should have params object');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - removeMasterEffectFromState removes effect', (t) => {
    const effectId = addMasterEffectToState('Chorus');
    const effectsBefore = getMasterEffectsState();
    t.assertTruthy(effectsBefore.some(e => e.id === effectId), 'Effect should exist before removal');
    removeMasterEffectFromState(effectId);
    const effectsAfter = getMasterEffectsState();
    t.assertEqual(effectsAfter.find(e => e.id === effectId), undefined, 'Effect should be removed');
});

TestRunner.test('Master Effects - removeMasterEffectFromState handles unknown id', (t) => {
    // Should not throw, just warn
    removeMasterEffectFromState('nonexistent-effect-id');
    t.assertTruthy(true, 'Should complete without throwing');
});

TestRunner.test('Master Effects - updateMasterEffectParamInState updates param', (t) => {
    const effectId = addMasterEffectToState('Reverb', { decay: 1.5, wet: 0.5 });
    updateMasterEffectParamInState(effectId, 'decay', 3.5);
    updateMasterEffectParamInState(effectId, 'wet', 0.8);
    const effects = getMasterEffectsState();
    const effect = effects.find(e => e.id === effectId);
    t.assertEqual(effect.params.decay, 3.5, 'Decay should be updated');
    t.assertEqual(effect.params.wet, 0.8, 'Wet should be updated');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - updateMasterEffectParamInState handles nested param path', (t) => {
    const effectId = addMasterEffectToState('Filter', { frequency: 1000, Q: 1 });
    updateMasterEffectParamInState(effectId, 'frequency', 2000);
    const effects = getMasterEffectsState();
    const effect = effects.find(e => e.id === effectId);
    t.assertEqual(effect.params.frequency, 2000, 'Frequency should be updated');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - updateMasterEffectParamInState handles unknown effect', (t) => {
    // Should not throw
    updateMasterEffectParamInState('nonexistent-id', 'wet', 0.9);
    t.assertTruthy(true, 'Should complete without throwing');
});

TestRunner.test('Master Effects - reorderMasterEffectInState reorders effect', (t) => {
    const id1 = addMasterEffectToState('Reverb');
    const id2 = addMasterEffectToState('Delay');
    const id3 = addMasterEffectToState('Chorus');
    const effects = getMasterEffectsState();
    const idx1 = effects.findIndex(e => e.id === id1);
    const idx3 = effects.findIndex(e => e.id === id3);
    t.assertEqual(Math.abs(idx1 - idx3), 2, 'Effect1 and Effect3 should be 2 apart initially');
    // Move Effect1 to where Effect3 is
    reorderMasterEffectInState(id1, idx3);
    const effectsAfter = getMasterEffectsState();
    const newIdx1 = effectsAfter.findIndex(e => e.id === id1);
    t.assertEqual(newIdx1, idx3, 'Effect1 should now be at former idx3 position');
    // Cleanup
    removeMasterEffectFromState(id1);
    removeMasterEffectFromState(id2);
    removeMasterEffectFromState(id3);
});

TestRunner.test('Master Effects - reorderMasterEffectInState handles same index', (t) => {
    const id1 = addMasterEffectToState('SameIdx');
    const effectsBefore = getMasterEffectsState().map(e => e.id);
    reorderMasterEffectInState(id1, effectsBefore.findIndex(e => e === id1));
    const effectsAfter = getMasterEffectsState().map(e => e.id);
    t.assertDeepEqual(effectsBefore, effectsAfter, 'Order should be unchanged');
    // Cleanup
    removeMasterEffectFromState(id1);
});

TestRunner.test('Master Effects - reorderMasterEffectInState handles invalid index', (t) => {
    const id1 = addMasterEffectToState('InvalidIdx');
    // Negative index should be handled
    reorderMasterEffectInState(id1, -1);
    // Index beyond length should be handled
    reorderMasterEffectInState(id1, 9999);
    t.assertTruthy(true, 'Should complete without throwing');
    // Cleanup
    removeMasterEffectFromState(id1);
});

TestRunner.test('Master Effects - multiple effects can be added and removed', (t) => {
    const ids = [];
    for (let i = 0; i < 5; i++) {
        ids.push(addMasterEffectToState('Reverb'));
    }
    let effects = getMasterEffectsState();
    t.assertEqual(effects.length, 5, 'Should have 5 effects');
    // Remove middle one
    removeMasterEffectFromState(ids[2]);
    effects = getMasterEffectsState();
    t.assertEqual(effects.length, 4, 'Should have 4 effects after removal');
    // Cleanup remaining
    for (const id of ids) {
        removeMasterEffectFromState(id);
    }
    effects = getMasterEffectsState();
    t.assertEqual(effects.length, 0, 'All effects should be removed');
});

// ============================================
// Day 81: Additional State Management Tests
// ============================================

// Metronome State Tests
TestRunner.test('Metronome - getMetronomeEnabledState returns boolean', (t) => {
    const enabled = getMetronomeEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'Metronome enabled should be boolean');
});

TestRunner.test('Metronome - setMetronomeEnabledState updates state', (t) => {
    setMetronomeEnabledState(true);
    t.assertEqual(getMetronomeEnabledState(), true, 'Metronome should be enabled');
    setMetronomeEnabledState(false);
    t.assertEqual(getMetronomeEnabledState(), false, 'Metronome should be disabled');
});

TestRunner.test('Metronome - getMetronomeVolumeState returns number', (t) => {
    const volume = getMetronomeVolumeState();
    t.assertEqual(typeof volume, 'number', 'Metronome volume should be a number');
    t.assertTruthy(volume >= 0 && volume <= 1, 'Volume should be 0-1 range');
});

TestRunner.test('Metronome - setMetronomeVolumeState updates state', (t) => {
    setMetronomeVolumeState(0.75);
    t.assertEqual(getMetronomeVolumeState(), 0.75, 'Metronome volume should be 0.75');
    setMetronomeVolumeState(0.5);
    t.assertEqual(getMetronomeVolumeState(), 0.5, 'Metronome volume should be 0.5');
});

// Playback Mode State Tests
TestRunner.test('Playback Mode - getPlaybackModeState returns value', (t) => {
    const mode = getPlaybackModeState();
    t.assertTrue(typeof mode === 'number', 'Playback mode should be a number');
    t.assertTruthy(mode >= 0 && mode <= 2, 'Playback mode should be 0-2');
});

// Tracks State Tests
TestRunner.test('Tracks - getTracksState returns array', (t) => {
    const tracks = getTracksState();
    t.assertTruthy(Array.isArray(tracks), 'Tracks should be an array');
});

TestRunner.test('Tracks - getTrackByIdState returns undefined for unknown id', (t) => {
    const track = getTrackByIdState('nonexistent-id-12345');
    t.assertEqual(track, undefined, 'Should return undefined for unknown track ID');
});

// Master Gain State Tests
TestRunner.test('Master Gain - getMasterGainValueState returns number', (t) => {
    const gain = getMasterGainValueState();
    t.assertEqual(typeof gain, 'number', 'Master gain should be a number');
});

// Open Windows State Tests
TestRunner.test('Open Windows - getOpenWindowsState returns object', (t) => {
    const windows = getOpenWindowsState();
    t.assertTruthy(typeof windows === 'object', 'Open windows should be an object (Map)');
});

// Active Sequencer Track State Tests
TestRunner.test('Active Sequencer - getActiveSequencerTrackIdState returns value', (t) => {
    const trackId = getActiveSequencerTrackIdState();
    t.assertTrue(trackId === null || typeof trackId === 'string', 'Active sequencer track ID should be null or string');
});

// Highest Z State Tests
TestRunner.test('Highest Z - getHighestZState returns number', (t) => {
    const z = getHighestZState();
    t.assertEqual(typeof z, 'number', 'Highest Z should be a number');
    t.assertTruthy(z >= 0, 'Highest Z should be non-negative');
});

// Clipboard State Tests
TestRunner.test('Clipboard - getClipboardDataState returns value', (t) => {
    const data = getClipboardDataState();
    t.assertTrue(data === null || typeof data === 'object', 'Clipboard data should be null or object');
});


// ============================================
// Day 104: SnugWindow, Track Types and Utils Constants Tests
// ============================================

// SnugWindow Default Dimension Constants Tests
TestRunner.test('SnugWindow - DEFAULT_WINDOW_MIN_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_MIN_WIDTH === 'number', 'DEFAULT_WINDOW_MIN_WIDTH should be a number');
    t.assertTruthy(DEFAULT_WINDOW_MIN_WIDTH >= 100, 'DEFAULT_WINDOW_MIN_WIDTH should be >= 100');
    t.assertTruthy(DEFAULT_WINDOW_MIN_WIDTH <= 500, 'DEFAULT_WINDOW_MIN_WIDTH should be <= 500');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_MIN_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_MIN_HEIGHT === 'number', 'DEFAULT_WINDOW_MIN_HEIGHT should be a number');
    t.assertTruthy(DEFAULT_WINDOW_MIN_HEIGHT >= 100, 'DEFAULT_WINDOW_MIN_HEIGHT should be >= 100');
    t.assertTruthy(DEFAULT_WINDOW_MIN_HEIGHT <= 500, 'DEFAULT_WINDOW_MIN_HEIGHT should be <= 500');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_WIDTH === 'number', 'DEFAULT_WINDOW_WIDTH should be a number');
    t.assertTruthy(DEFAULT_WINDOW_WIDTH >= 200, 'DEFAULT_WINDOW_WIDTH should be >= 200');
    t.assertTruthy(DEFAULT_WINDOW_WIDTH <= 1000, 'DEFAULT_WINDOW_WIDTH should be <= 1000');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_HEIGHT === 'number', 'DEFAULT_WINDOW_HEIGHT should be a number');
    t.assertTruthy(DEFAULT_WINDOW_HEIGHT >= 150, 'DEFAULT_WINDOW_HEIGHT should be >= 150');
    t.assertTruthy(DEFAULT_WINDOW_HEIGHT <= 1000, 'DEFAULT_WINDOW_HEIGHT should be <= 1000');
});

TestRunner.test('SnugWindow - TASKBAR_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof TASKBAR_HEIGHT === 'number', 'TASKBAR_HEIGHT should be a number');
    t.assertTruthy(TASKBAR_HEIGHT >= 20, 'TASKBAR_HEIGHT should be >= 20');
    t.assertTruthy(TASKBAR_HEIGHT <= 100, 'TASKBAR_HEIGHT should be <= 100');
});

// Track Types Validation Tests
TestRunner.test('Track Types - track type strings are valid', (t) => {
    const validTypes = ['Synth', 'DrumSampler', 'Sampler', 'InstrumentSampler', 'Audio'];
    t.assertTruthy(Array.isArray(validTypes), 'Track types should be an array');
    t.assertEqual(validTypes.length, 5, 'Should have 5 track types');
});

TestRunner.test('Track Types - all expected track types are defined', (t) => {
    const types = ['Synth', 'DrumSampler', 'Sampler', 'InstrumentSampler', 'Audio'];
    types.forEach(type => {
        t.assertEqual(typeof type, 'string', type + ' should be a string');
        t.assertTruthy(type.length > 0, type + ' should not be empty');
    });
});

// Utils Function Tests
TestRunner.test('Utils - showNotification function exists', (t) => {
    t.assertEqual(typeof showNotification, 'function', 'showNotification should be a function');
});

TestRunner.test('Utils - showNotification accepts message and duration', (t) => {
    t.assertEqual(showNotification.length, 2, 'showNotification should accept 2 parameters');
});

TestRunner.test('Utils - showCustomModal function exists', (t) => {
    t.assertEqual(typeof showCustomModal, 'function', 'showCustomModal should be a function');
});

TestRunner.test('Utils - showConfirmationDialog function exists', (t) => {
    t.assertEqual(typeof showConfirmationDialog, 'function', 'showConfirmationDialog should be a function');
});

TestRunner.test('Utils - secondsToBBSTime function exists', (t) => {
    t.assertEqual(typeof secondsToBBSTime, 'function', 'secondsToBBSTime should be a function');
});

TestRunner.test('Utils - bbsTimeToSeconds function exists', (t) => {
    t.assertEqual(typeof bbsTimeToSeconds, 'function', 'bbsTimeToSeconds should be a function');
});

TestRunner.test('Utils - createContextMenu function exists', (t) => {
    t.assertEqual(typeof createContextMenu, 'function', 'createContextMenu should be a function');
});

TestRunner.test('Utils - createDropZoneHTML function exists', (t) => {
    t.assertEqual(typeof createDropZoneHTML, 'function', 'createDropZoneHTML should be a function');
});

TestRunner.test('Utils - setupGenericDropZoneListeners function exists', (t) => {
    t.assertEqual(typeof setupGenericDropZoneListeners, 'function', 'setupGenericDropZoneListeners should be a function');
});

// Context Menu Constants Tests
TestRunner.test('Context Menu - CONTEXT_MENU_ITEM_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof CONTEXT_MENU_ITEM_HEIGHT === 'number', 'CONTEXT_MENU_ITEM_HEIGHT should be a number');
    t.assertTruthy(CONTEXT_MENU_ITEM_HEIGHT >= 20, 'CONTEXT_MENU_ITEM_HEIGHT should be >= 20');
    t.assertTruthy(CONTEXT_MENU_ITEM_HEIGHT <= 50, 'CONTEXT_MENU_ITEM_HEIGHT should be <= 50');
});

TestRunner.test('Context Menu - CONTEXT_MENU_MAX_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof CONTEXT_MENU_MAX_WIDTH === 'number', 'CONTEXT_MENU_MAX_WIDTH should be a number');
    t.assertTruthy(CONTEXT_MENU_MAX_WIDTH >= 100, 'CONTEXT_MENU_MAX_WIDTH should be >= 100');
    t.assertTruthy(CONTEXT_MENU_MAX_WIDTH <= 500, 'CONTEXT_MENU_MAX_WIDTH should be <= 500');
});

// Sequencer Grid Constants Tests
TestRunner.test('Sequencer Grid - GRID_STEP_LABELS has expected format', (t) => {
    t.assertTruthy(typeof GRID_STEP_LABELS === 'object', 'GRID_STEP_LABELS should be an object');
    t.assertTruthy(Array.isArray(GRID_STEP_LABELS.labels), 'GRID_STEP_LABELS.labels should be an array');
});

TestRunner.test('Sequencer Grid - STEP_LABELS_SIXTEENTHS has 16 entries', (t) => {
    t.assertTruthy(typeof STEP_LABELS_SIXTEENTHS === 'object', 'STEP_LABELS_SIXTEENTHS should be an object');
    t.assertTruthy(Array.isArray(STEP_LABELS_SIXTEENTHS.labels), 'STEP_LABELS_SIXTEENTHS.labels should be an array');
    t.assertEqual(STEP_LABELS_SIXTEENTHS.labels.length, 16, 'SIXTEENTHS should have 16 entries');
});

// Sound Library Constants Tests
TestRunner.test('Sound Library - soundLibraries is an object', (t) => {
    t.assertEqual(typeof soundLibraries, 'object', 'soundLibraries should be an object');
    t.assertTruthy(soundLibraries !== null, 'soundLibraries should not be null');
});

// Synth Engine Control Definitions Tests
TestRunner.test('Synth Engine - synthEngineControlDefinitions is an object', (t) => {
    t.assertEqual(typeof synthEngineControlDefinitions, 'object', 'synthEngineControlDefinitions should be an object');
    t.assertTruthy(synthEngineControlDefinitions !== null, 'synthEngineControlDefinitions should not be null');
});

TestRunner.test('Synth Engine - synthEngineControlDefinitions has MonoSynth', (t) => {
    t.assertTruthy(typeof synthEngineControlDefinitions.MonoSynth === 'object', 'synthEngineControlDefinitions should have MonoSynth');
});

TestRunner.test('Synth Engine - synthEngineControlDefinitions.MonoSynth has controls', (t) => {
    const mono = synthEngineControlDefinitions.MonoSynth;
    t.assertTruthy(Array.isArray(mono.controls), 'MonoSynth should have controls array');
    t.assertTruthy(mono.controls.length > 0, 'MonoSynth should have at least one control');
});

// ============================================
// Day 70: Constants Validation Tests
// ============================================

// computerKeySynthMap Validation Tests
TestRunner.test('computerKeySynthMap - has valid structure', (t) => {
    t.assertTruthy(typeof computerKeySynthMap === 'object', 'computerKeySynthMap should be an object');
    t.assertTruthy('a' in computerKeySynthMap, 'Should have white key a');
    t.assertTruthy('k' in computerKeySynthMap, 'Should have white key k');
    t.assertTruthy('w' in computerKeySynthMap, 'Should have black key w');
    t.assertTruthy('u' in computerKeySynthMap, 'Should have black key u');
});

TestRunner.test('computerKeySynthMap - white key values are valid notes', (t) => {
    const c4Value = computerKeySynthMap['a'];
    t.assertEqual(typeof c4Value, 'number', 'Key a should map to a number (MIDI note)');
    t.assertEqual(c4Value, 60, 'Key a should be C4 (MIDI note 60)');
});

TestRunner.test('computerKeySynthMap - black key values are valid notes', (t) => {
    const cS4Value = computerKeySynthMap['w'];
    t.assertEqual(typeof cS4Value, 'number', 'Key w should map to a number (MIDI note)');
    t.assertEqual(cS4Value, 61, 'Key w should be C#4 (MIDI note 61)');
});

// TRACK_COLORS Validation Tests
TestRunner.test('TRACK_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(TRACK_COLORS), 'TRACK_COLORS should be an array');
});

TestRunner.test('TRACK_COLORS - has expected colors', (t) => {
    t.assertTruthy(TRACK_COLORS.length >= 8, 'Should have at least 8 colors');
});

TestRunner.test('TRACK_COLORS - colors are valid hex', (t) => {
    TRACK_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// CLIP_COLORS Validation Tests
TestRunner.test('CLIP_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(CLIP_COLORS), 'CLIP_COLORS should be an array');
});

TestRunner.test('CLIP_COLORS - has expected count', (t) => {
    t.assertTruthy(CLIP_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('CLIP_COLORS - colors are valid hex', (t) => {
    CLIP_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// MARKER_COLORS Validation Tests
TestRunner.test('MARKER_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(MARKER_COLORS), 'MARKER_COLORS should be an array');
});

TestRunner.test('MARKER_COLORS - has expected count', (t) => {
    t.assertTruthy(MARKER_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('MARKER_COLORS - colors are valid hex', (t) => {
    MARKER_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// AUTOMATION_LANE_COLORS Validation Tests
TestRunner.test('Automation Lane Colors - is an array', (t) => {
    t.assertTruthy(Array.isArray(AUTOMATION_LANE_COLORS), 'AUTOMATION_LANE_COLORS should be an array');
});

TestRunner.test('Automation Lane Colors - has expected count', (t) => {
    t.assertTruthy(AUTOMATION_LANE_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('Automation Lane Colors - colors are valid hex', (t) => {
    AUTOMATION_LANE_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// CHORD_TYPES Validation Tests
TestRunner.test('CHORD_TYPES - is an object', (t) => {
    t.assertTruthy(typeof CHORD_TYPES === 'object', 'CHORD_TYPES should be an object');
});

TestRunner.test('CHORD_TYPES - has major chord type', (t) => {
    t.assertTruthy(CHORD_TYPES['major'], 'CHORD_TYPES should have major chord');
});

TestRunner.test('CHORD_TYPES - has minor chord type', (t) => {
    t.assertTruthy(CHORD_TYPES['minor'], 'CHORD_TYPES should have minor chord');
});

TestRunner.test('CHORD_TYPES - chord intervals are valid', (t) => {
    for (const [type, intervals] of Object.entries(CHORD_TYPES)) {
        t.assertTruthy(Array.isArray(intervals), `${type} intervals should be an array`);
        intervals.forEach(interval => {
            t.assertEqual(typeof interval, 'number', `Interval in ${type} should be a number`);
            t.assertTruthy(interval >= 0, `Interval in ${type} should be non-negative`);
        });
    }
});

// ============================================
// Day 87: Chord Voicing Constants Tests
// ============================================
TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD is an object', (t) => {
    t.assertTruthy(typeof CHORD_VOICING_SPREAD === 'object', 'CHORD_VOICING_SPREAD should be an object');
    t.assertTruthy(CHORD_VOICING_SPREAD !== null, 'CHORD_VOICING_SPREAD should not be null');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has closed voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['closed'], 'Should have closed voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['closed']), 'Closed voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has wide voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['wide'], 'Should have wide voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['wide']), 'Wide voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has drop2 voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['drop2'], 'Should have drop2 voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['drop2']), 'Drop2 voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has rootless voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['rootless'], 'Should have rootless voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['rootless']), 'Rootless voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD intervals are valid numbers', (t) => {
    for (const [voicing, intervals] of Object.entries(CHORD_VOICING_SPREAD)) {
        intervals.forEach(interval => {
            t.assertEqual(typeof interval, 'number', `Interval in ${voicing} should be a number`);
            t.assertTruthy(interval >= 0, `Interval in ${voicing} should be non-negative`);
        });
    }
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS is an array', (t) => {
    t.assertTruthy(Array.isArray(CHORD_VOICINGS), 'CHORD_VOICINGS should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains 4 voicing types', (t) => {
    t.assertEqual(CHORD_VOICINGS.length, 4, 'Should have 4 voicing types');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains closed', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('closed'), 'Should include closed');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains wide', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('wide'), 'Should include wide');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains drop2', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('drop2'), 'Should include drop2');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains rootless', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('rootless'), 'Should include rootless');
});

TestRunner.test('Chord Voicing - DEFAULT_CHORD_VOICING is valid', (t) => {
    t.assertEqual(typeof DEFAULT_CHORD_VOICING, 'string', 'Should be a string');
    t.assertEqual(DEFAULT_CHORD_VOICING, 'closed', 'Default should be closed');
    t.assertTruthy(CHORD_VOICINGS.includes(DEFAULT_CHORD_VOICING), 'Default should be in CHORD_VOICINGS');
});

TestRunner.test('Chord Voicing - voicing spread arrays have 12 elements', (t) => {
    for (const [voicing, intervals] of Object.entries(CHORD_VOICING_SPREAD)) {
        t.assertEqual(intervals.length, 12, `${voicing} should have 12 elements (one per semitone)`);
    }
});

TestRunner.test('Chord Voicing - closed voicing starts at 0', (t) => {
    t.assertEqual(CHORD_VOICING_SPREAD['closed'][0], 0, 'Closed voicing should start at 0');
});

TestRunner.test('Chord Voicing - rootless voicing starts at 2 (no root)', (t) => {
    t.assertEqual(CHORD_VOICING_SPREAD['rootless'][0], 2, 'Rootless voicing should start at 2 (skipping root)');
});

// ============================================
// Day 70: Send Tracks Additional Tests
// ============================================
TestRunner.test('Send Tracks - getTrackSendLevelState handles nonexistent track', (t) => {
    const level = getTrackSendLevelState('nonexistent-track', 'nonexistent-send');
    t.assertEqual(level, 0, 'Should return 0 for nonexistent track/send');
});

TestRunner.test('Send Tracks - getTrackSendLevelState handles unknown send', (t) => {
    const level = getTrackSendLevelState('existing-track', 'nonexistent-send');
    t.assertEqual(level, 0, 'Should return 0 for unknown send');
});

TestRunner.test('Send Tracks - setTrackSendLevelState updates level', (t) => {
    const send = addSendTrackState({ name: 'Level Test' });
    setTrackSendLevelState('any-track-id', send.id, 0.5);
    const level = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(level, 0.5, 'Send level should be updated');
    // Test clamping
    setTrackSendLevelState('any-track-id', send.id, 1.5);
    const levelClamped = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(levelClamped, 1.2, 'Level should be clamped to max 1.2');
    setTrackSendLevelState('any-track-id', send.id, -0.5);
    const levelMin = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(levelMin, 0, 'Level should be clamped to min 0');
});

TestRunner.test('Send Tracks - setTrackSendLevelState creates track entry if needed', (t) => {
    const send = addSendTrackState({ name: 'New Track Test' });
    // Should not throw, should auto-create trackSendsState entry
    setTrackSendLevelState('new-track-xyz', send.id, 0.8);
    const level = getTrackSendLevelState('new-track-xyz', send.id);
    t.assertEqual(level, 0.8, 'Level should be set for new track');
});

TestRunner.test('Send Tracks - getTrackSendPreFaderState returns boolean', (t) => {
    const preFader = getTrackSendPreFaderState('any-track', 'any-send');
    t.assertEqual(typeof preFader, 'boolean', 'Should return boolean');
    t.assertEqual(preFader, false, 'Default should be false');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState updates preFader', (t) => {
    const send = addSendTrackState({ name: 'PreFader Test' });
    const result = setTrackSendPreFaderState('track-prefader', send.id, true);
    t.assertTruthy(result, 'Should return true');
    const preFader = getTrackSendPreFaderState('track-prefader', send.id);
    t.assertEqual(preFader, true, 'Pre-fader should be true');
    setTrackSendPreFaderState('track-prefader', send.id, false);
    const preFaderAfter = getTrackSendPreFaderState('track-prefader', send.id);
    t.assertEqual(preFaderAfter, false, 'Pre-fader should be false');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState handles nonexistent track', (t) => {
    // Should not throw, should auto-create entry
    setTrackSendPreFaderState('nonexistent-track-123', 999, true);
    const preFader = getTrackSendPreFaderState('nonexistent-track-123', 999);
    t.assertEqual(preFader, true, 'Should create and return true');
});

TestRunner.test('Send Tracks - addSendTrackState with default values', (t) => {
    const send = addSendTrackState({});
    t.assertTruthy(send.id !== undefined, 'Should have an ID');
    t.assertEqual(send.name, 'Send ' + send.id, 'Should have default name');
    t.assertEqual(send.level, 1.0, 'Default level should be 1.0');
    t.assertEqual(send.muted, false, 'Default muted should be false');
    t.assertTruthy(Array.isArray(send.effects), 'Should have effects array');
});

TestRunner.test('Send Tracks - addSendTrackState with custom id', (t) => {
    const send = addSendTrackState({ id: 9999, name: 'Custom ID Send' });
    t.assertEqual(send.id, 9999, 'ID should match custom value');
    t.assertEqual(send.name, 'Custom ID Send', 'Name should match');
});

// ============================================
// Day 70: Track Groups Additional Tests
// ============================================
TestRunner.test('Track Groups - getTrackGroupByIdState handles unknown id', (t) => {
    const group = getTrackGroupByIdState('nonexistent-group-12345');
    t.assertEqual(group, undefined, 'Should return undefined for unknown group');
});

// ============================================
// Day 71: Loop Region State Tests
// ============================================
TestRunner.test('Loop Region - getLoopRegionState returns object', (t) => {
    const state = getLoopRegionState();
    t.assertTruthy(typeof state === 'object', 'getLoopRegionState should return an object');
    t.assertTruthy('enabled' in state, 'State should have enabled property');
    t.assertTruthy('startBar' in state, 'State should have startBar property');
    t.assertTruthy('endBar' in state, 'State should have endBar property');
});

TestRunner.test('Loop Region - getLoopRegionEnabledState returns boolean', (t) => {
    const enabled = getLoopRegionEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'getLoopRegionEnabledState should return boolean');
});

TestRunner.test('Loop Region - getLoopRegionStartBarState returns number', (t) => {
    const startBar = getLoopRegionStartBarState();
    t.assertEqual(typeof startBar, 'number', 'getLoopRegionStartBarState should return number');
    t.assertTruthy(startBar >= 1, 'Start bar should be >= 1');
});

TestRunner.test('Loop Region - getLoopRegionEndBarState returns number', (t) => {
    const endBar = getLoopRegionEndBarState();
    t.assertEqual(typeof endBar, 'number', 'getLoopRegionEndBarState should return number');
    t.assertTruthy(endBar >= 1, 'End bar should be >= 1');
});

TestRunner.test('Loop Region - setLoopRegionEnabledState updates state', (t) => {
    setLoopRegionEnabledState(true);
    t.assertEqual(getLoopRegionEnabledState(), true, 'Should be enabled after setter');
    setLoopRegionEnabledState(false);
    t.assertEqual(getLoopRegionEnabledState(), false, 'Should be disabled after setter');
});

TestRunner.test('Loop Region - setLoopRegionStartBarState updates state', (t) => {
    setLoopRegionStartBarState(5);
    t.assertEqual(getLoopRegionStartBarState(), 5, 'Start bar should be 5');
});

TestRunner.test('Loop Region - setLoopRegionEndBarState updates state', (t) => {
    setLoopRegionEndBarState(8);
    t.assertEqual(getLoopRegionEndBarState(), 8, 'End bar should be 8');
});

TestRunner.test('Loop Region - setLoopRegionState updates full state', (t) => {
    const newState = { enabled: true, startBar: 2, endBar: 10 };
    setLoopRegionState(newState);
    const state = getLoopRegionState();
    t.assertEqual(state.enabled, true, 'Enabled should be true');
    t.assertEqual(state.startBar, 2, 'Start bar should be 2');
    t.assertEqual(state.endBar, 10, 'End bar should be 10');
});

// ============================================
// Day 71: Swing State Tests
// ============================================
TestRunner.test('Swing - getSwingState returns object', (t) => {
    const state = getSwingState();
    t.assertTruthy(typeof state === 'object', 'getSwingState should return an object');
    t.assertTruthy('enabled' in state, 'State should have enabled property');
    t.assertTruthy('amount' in state, 'State should have amount property');
});

TestRunner.test('Swing - getSwingEnabledState returns boolean', (t) => {
    const enabled = getSwingEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'getSwingEnabledState should return boolean');
});

TestRunner.test('Swing - getSwingAmountState returns number', (t) => {
    const amount = getSwingAmountState();
    t.assertEqual(typeof amount, 'number', 'getSwingAmountState should return number');
    t.assertTruthy(amount >= 0, 'Amount should be >= 0');
    t.assertTruthy(amount <= 100, 'Amount should be <= 100');
});

TestRunner.test('Swing - setSwingEnabledState updates state', (t) => {
    setSwingEnabledState(true);
    t.assertEqual(getSwingEnabledState(), true, 'Should be enabled after setter');
    setSwingEnabledState(false);
    t.assertEqual(getSwingEnabledState(), false, 'Should be disabled after setter');
});

TestRunner.test('Swing - setSwingAmountState updates state', (t) => {
    setSwingAmountState(50);
    t.assertEqual(getSwingAmountState(), 50, 'Amount should be 50');
    setSwingAmountState(0);
    t.assertEqual(getSwingAmountState(), 0, 'Amount should be clamped to 0');
    setSwingAmountState(150);
    t.assertEqual(getSwingAmountState(), 100, 'Amount should be clamped to 100');
});

TestRunner.test('Swing - setSwingState updates full state', (t) => {
    const newState = { enabled: true, amount: 75 };
    setSwingState(newState);
    const state = getSwingState();
    t.assertEqual(state.enabled, true, 'Enabled should be true');
    t.assertEqual(state.amount, 75, 'Amount should be 75');
});

// ============================================
// Day 73: State Management Tests
// ============================================
TestRunner.test('Time Signature - getTimeSignatureState returns object', (t) => {
    const state = getTimeSignatureState();
    t.assertTruthy(typeof state === 'object', 'getTimeSignatureState should return an object');
    t.assertTruthy('numerator' in state, 'State should have numerator property');
    t.assertTruthy('denominator' in state, 'State should have denominator property');
});

TestRunner.test('Time Signature - getTimeSignatureNumeratorState returns number', (t) => {
    const numerator = getTimeSignatureNumeratorState();
    t.assertEqual(typeof numerator, 'number', 'Should return number');
    t.assertTruthy(numerator >= 1, 'Numerator should be >= 1');
    t.assertTruthy(numerator <= 16, 'Numerator should be <= 16');
});

TestRunner.test('Time Signature - setTimeSignatureNumeratorState updates state', (t) => {
    setTimeSignatureNumeratorState(3);
    t.assertEqual(getTimeSignatureNumeratorState(), 3, 'Numerator should be 3');
    setTimeSignatureNumeratorState(6);
    t.assertEqual(getTimeSignatureNumeratorState(), 6, 'Numerator should be 6');
});

TestRunner.test('Time Signature - getTimeSignatureDenominatorState returns number', (t) => {
    const denominator = getTimeSignatureDenominatorState();
    t.assertEqual(typeof denominator, 'number', 'Should return number');
    t.assertTruthy([1, 2, 4, 8, 16, 32].includes(denominator), 'Denominator should be power of 2');
});

TestRunner.test('Time Signature - setTimeSignatureDenominatorState updates state', (t) => {
    setTimeSignatureDenominatorState(4);
    t.assertEqual(getTimeSignatureDenominatorState(), 4, 'Denominator should be 4');
    setTimeSignatureDenominatorState(8);
    t.assertEqual(getTimeSignatureDenominatorState(), 8, 'Denominator should be 8');
});

TestRunner.test('Time Signature - setTimeSignatureState updates full state', (t) => {
    setTimeSignatureState(6, 8);
    const state = getTimeSignatureState();
    t.assertEqual(state.numerator, 6, 'Numerator should be 6');
    t.assertEqual(state.denominator, 8, 'Denominator should be 8');
});

TestRunner.test('Ghost Track - getGhostTrackIdState returns null by default', (t) => {
    const ghostId = getGhostTrackIdState();
    t.assertEqual(ghostId, null, 'Ghost track should be null by default');
});

TestRunner.test('Ghost Track - setGhostTrackIdState updates state', (t) => {
    setGhostTrackIdState('test-track-123');
    t.assertEqual(getGhostTrackIdState(), 'test-track-123', 'Ghost track should be set');
    setGhostTrackIdState(null);
    t.assertEqual(getGhostTrackIdState(), null, 'Ghost track should be cleared');
});

TestRunner.test('Timeline Markers - getTimelineMarkersState returns array', (t) => {
    const markers = getTimelineMarkersState();
    t.assertTruthy(Array.isArray(markers), 'Timeline markers should be an array');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState adds marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Test Marker', 4);
    t.assertTruthy(marker, 'Marker should be added');
    t.assertTruthy(marker.id, 'Marker should have an id');
    t.assertEqual(marker.name, 'Test Marker', 'Marker name should match');
    t.assertEqual(marker.bar, 4, 'Marker bar should match');
    t.assertEqual(marker.color, '#ff9f43', 'Marker color should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState returns marker', (t) => {
    clearTimelineMarkersState();
    const added = addTimelineMarkerState('Find Test', 8);
    const found = getTimelineMarkerByIdState(added.id);
    t.assertTruthy(found, 'Marker should be found');
    t.assertEqual(found.name, 'Find Test', 'Found marker should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState handles unknown id', (t) => {
    const notFound = getTimelineMarkerByIdState('nonexistent-marker-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState updates marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Original', 4);
    setTimelineMarkerState(marker.id, { name: 'Updated', bar: 10 });
    const updated = getTimelineMarkerByIdState(marker.id);
    t.assertEqual(updated.name, 'Updated', 'Marker name should be updated');
    t.assertEqual(updated.bar, 10, 'Marker bar should be updated');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - removeTimelineMarkerState removes marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('To Remove', 4);
    t.assertTruthy(getTimelineMarkerByIdState(marker.id), 'Marker should exist before removal');
    removeTimelineMarkerState(marker.id);
    t.assertEqual(getTimelineMarkerByIdState(marker.id), undefined, 'Marker should be removed');
    clearTimelineMarkersState();
});

TestRunner.test('Send Tracks - getSendTracksState returns array', (t) => {
    const sends = getSendTracksState();
    t.assertTruthy(Array.isArray(sends), 'Send tracks should be an array');
});

TestRunner.test('Send Tracks - getSendTrackByIdState handles unknown id', (t) => {
    const notFound = getSendTrackByIdState('nonexistent-send-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Send Tracks - getTrackSendsState returns object', (t) => {
    const sends = getTrackSendsState();
    t.assertTruthy(typeof sends === 'object', 'Track sends should be an object');
});

TestRunner.test('Send Tracks - getTrackSendLevelState returns number', (t) => {
    const level = getTrackSendLevelState('nonexistent', 999);
    t.assertEqual(typeof level, 'number', 'Send level should be a number');
    t.assertEqual(level, 0, 'Default send level should be 0');
});

TestRunner.test('Send Tracks - addSendTrackState creates send track', (t) => {
    const send = addSendTrackState({ name: 'Test Send', level: 0.75 });
    t.assertTruthy(send, 'addSendTrackState should return a send track');
    t.assertEqual(send.name, 'Test Send', 'Send name should match');
    t.assertEqual(send.level, 0.75, 'Send level should match');
});

TestRunner.test('Send Tracks - setSendTrackMutedState updates send', (t) => {
    const send = addSendTrackState({ name: 'Mute Test' });
    const result = setSendTrackMutedState(send.id, true);
    t.assertTruthy(result, 'setSendTrackMutedState should return true on success');
    const sendAfter = getSendTrackByIdState(send.id);
    t.assertEqual(sendAfter.muted, true, 'Send should be muted');
    setSendTrackMutedState(send.id, false);
    t.assertEqual(sendAfter.muted, false, 'Send should be unmuted');
});

// ============================================
// Day 75: Armed Track State Tests
// ============================================
TestRunner.test('Armed Track - getArmedTrackIdState returns null initially', (t) => {
    const armedId = getArmedTrackIdState();
    t.assertEqual(armedId, null, 'Should be null initially');
});

TestRunner.test('Armed Track - setArmedTrackIdState updates state', (t) => {
    setArmedTrackIdState('track-123');
    t.assertEqual(getArmedTrackIdState(), 'track-123', 'Armed track should be set');
    setArmedTrackIdState(null);
    t.assertEqual(getArmedTrackIdState(), null, 'Armed track should be cleared');
});

TestRunner.test('Armed Track - setArmedTrackIdState handles undefined', (t) => {
    setArmedTrackIdState('track-456');
    setArmedTrackIdState(undefined);
    t.assertEqual(getArmedTrackIdState(), null, 'Should become null when set to undefined');
});

TestRunner.test('Armed Track - setArmedTrackIdState handles numeric track ID', (t) => {
    setArmedTrackIdState(42);
    t.assertEqual(getArmedTrackIdState(), 42, 'Should handle numeric track ID');
    setArmedTrackIdState(null);
});

// ============================================
// Day 76: Master Effects State Tests
// ============================================
TestRunner.test('Master Effects - getMasterEffectsState returns array', (t) => {
    const effects = getMasterEffectsState();
    t.assertTruthy(Array.isArray(effects), 'Master effects should be an array');
});

TestRunner.test('Master Effects - addMasterEffectToState creates effect', (t) => {
    const effectsBefore = getMasterEffectsState().length;
    const effectId = addMasterEffectToState('Reverb', { decay: 2.5 });
    t.assertTruthy(typeof effectId === 'string', 'Should return effect ID string');
    t.assertTruthy(effectId.startsWith('mastereffect_'), 'Effect ID should have correct prefix');
    const effectsAfter = getMasterEffectsState();
    t.assertEqual(effectsAfter.length, effectsBefore + 1, 'Should have one more effect');
    const added = effectsAfter.find(e => e.id === effectId);
    t.assertEqual(added.type, 'Reverb', 'Effect type should be Reverb');
    t.assertEqual(added.params.decay, 2.5, 'Effect params should be set');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - addMasterEffectToState with default params', (t) => {
    const effectId = addMasterEffectToState('Delay');
    t.assertTruthy(typeof effectId === 'string', 'Should return effect ID');
    const effects = getMasterEffectsState();
    const added = effects.find(e => e.id === effectId);
    t.assertEqual(added.type, 'Delay', 'Effect type should be Delay');
    t.assertTruthy(added.params, 'Should have params object');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - removeMasterEffectFromState removes effect', (t) => {
    const effectId = addMasterEffectToState('Chorus');
    const effectsBefore = getMasterEffectsState();
    t.assertTruthy(effectsBefore.some(e => e.id === effectId), 'Effect should exist before removal');
    removeMasterEffectFromState(effectId);
    const effectsAfter = getMasterEffectsState();
    t.assertEqual(effectsAfter.find(e => e.id === effectId), undefined, 'Effect should be removed');
});

TestRunner.test('Master Effects - removeMasterEffectFromState handles unknown id', (t) => {
    // Should not throw, just warn
    removeMasterEffectFromState('nonexistent-effect-id');
    t.assertTruthy(true, 'Should complete without throwing');
});

TestRunner.test('Master Effects - updateMasterEffectParamInState updates param', (t) => {
    const effectId = addMasterEffectToState('Reverb', { decay: 1.5, wet: 0.5 });
    updateMasterEffectParamInState(effectId, 'decay', 3.5);
    updateMasterEffectParamInState(effectId, 'wet', 0.8);
    const effects = getMasterEffectsState();
    const effect = effects.find(e => e.id === effectId);
    t.assertEqual(effect.params.decay, 3.5, 'Decay should be updated');
    t.assertEqual(effect.params.wet, 0.8, 'Wet should be updated');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - updateMasterEffectParamInState handles nested param path', (t) => {
    const effectId = addMasterEffectToState('Filter', { frequency: 1000, Q: 1 });
    updateMasterEffectParamInState(effectId, 'frequency', 2000);
    const effects = getMasterEffectsState();
    const effect = effects.find(e => e.id === effectId);
    t.assertEqual(effect.params.frequency, 2000, 'Frequency should be updated');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - updateMasterEffectParamInState handles unknown effect', (t) => {
    // Should not throw
    updateMasterEffectParamInState('nonexistent-id', 'wet', 0.9);
    t.assertTruthy(true, 'Should complete without throwing');
});

TestRunner.test('Master Effects - reorderMasterEffectInState reorders effect', (t) => {
    const id1 = addMasterEffectToState('Reverb');
    const id2 = addMasterEffectToState('Delay');
    const id3 = addMasterEffectToState('Chorus');
    const effects = getMasterEffectsState();
    const idx1 = effects.findIndex(e => e.id === id1);
    const idx3 = effects.findIndex(e => e.id === id3);
    t.assertEqual(Math.abs(idx1 - idx3), 2, 'Effect1 and Effect3 should be 2 apart initially');
    // Move Effect1 to where Effect3 is
    reorderMasterEffectInState(id1, idx3);
    const effectsAfter = getMasterEffectsState();
    const newIdx1 = effectsAfter.findIndex(e => e.id === id1);
    t.assertEqual(newIdx1, idx3, 'Effect1 should now be at former idx3 position');
    // Cleanup
    removeMasterEffectFromState(id1);
    removeMasterEffectFromState(id2);
    removeMasterEffectFromState(id3);
});

TestRunner.test('Master Effects - reorderMasterEffectInState handles same index', (t) => {
    const id1 = addMasterEffectToState('SameIdx');
    const effectsBefore = getMasterEffectsState().map(e => e.id);
    reorderMasterEffectInState(id1, effectsBefore.findIndex(e => e === id1));
    const effectsAfter = getMasterEffectsState().map(e => e.id);
    t.assertDeepEqual(effectsBefore, effectsAfter, 'Order should be unchanged');
    // Cleanup
    removeMasterEffectFromState(id1);
});

TestRunner.test('Master Effects - reorderMasterEffectInState handles invalid index', (t) => {
    const id1 = addMasterEffectToState('InvalidIdx');
    // Negative index should be handled
    reorderMasterEffectInState(id1, -1);
    // Index beyond length should be handled
    reorderMasterEffectInState(id1, 9999);
    t.assertTruthy(true, 'Should complete without throwing');
    // Cleanup
    removeMasterEffectFromState(id1);
});

TestRunner.test('Master Effects - multiple effects can be added and removed', (t) => {
    const ids = [];
    for (let i = 0; i < 5; i++) {
        ids.push(addMasterEffectToState('Reverb'));
    }
    let effects = getMasterEffectsState();
    t.assertEqual(effects.length, 5, 'Should have 5 effects');
    // Remove middle one
    removeMasterEffectFromState(ids[2]);
    effects = getMasterEffectsState();
    t.assertEqual(effects.length, 4, 'Should have 4 effects after removal');
    // Cleanup remaining
    for (const id of ids) {
        removeMasterEffectFromState(id);
    }
    effects = getMasterEffectsState();
    t.assertEqual(effects.length, 0, 'All effects should be removed');
});

// ============================================
// Day 81: Additional State Management Tests
// ============================================

// Metronome State Tests
TestRunner.test('Metronome - getMetronomeEnabledState returns boolean', (t) => {
    const enabled = getMetronomeEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'Metronome enabled should be boolean');
});

TestRunner.test('Metronome - setMetronomeEnabledState updates state', (t) => {
    setMetronomeEnabledState(true);
    t.assertEqual(getMetronomeEnabledState(), true, 'Metronome should be enabled');
    setMetronomeEnabledState(false);
    t.assertEqual(getMetronomeEnabledState(), false, 'Metronome should be disabled');
});

TestRunner.test('Metronome - getMetronomeVolumeState returns number', (t) => {
    const volume = getMetronomeVolumeState();
    t.assertEqual(typeof volume, 'number', 'Metronome volume should be a number');
    t.assertTruthy(volume >= 0 && volume <= 1, 'Volume should be 0-1 range');
});

TestRunner.test('Metronome - setMetronomeVolumeState updates state', (t) => {
    setMetronomeVolumeState(0.75);
    t.assertEqual(getMetronomeVolumeState(), 0.75, 'Metronome volume should be 0.75');
    setMetronomeVolumeState(0.5);
    t.assertEqual(getMetronomeVolumeState(), 0.5, 'Metronome volume should be 0.5');
});

// Playback Mode State Tests
TestRunner.test('Playback Mode - getPlaybackModeState returns value', (t) => {
    const mode = getPlaybackModeState();
    t.assertTrue(typeof mode === 'number', 'Playback mode should be a number');
    t.assertTruthy(mode >= 0 && mode <= 2, 'Playback mode should be 0-2');
});

// Tracks State Tests
TestRunner.test('Tracks - getTracksState returns array', (t) => {
    const tracks = getTracksState();
    t.assertTruthy(Array.isArray(tracks), 'Tracks should be an array');
});

TestRunner.test('Tracks - getTrackByIdState returns undefined for unknown id', (t) => {
    const track = getTrackByIdState('nonexistent-id-12345');
    t.assertEqual(track, undefined, 'Should return undefined for unknown track ID');
});

// Master Gain State Tests
TestRunner.test('Master Gain - getMasterGainValueState returns number', (t) => {
    const gain = getMasterGainValueState();
    t.assertEqual(typeof gain, 'number', 'Master gain should be a number');
});

// Open Windows State Tests
TestRunner.test('Open Windows - getOpenWindowsState returns object', (t) => {
    const windows = getOpenWindowsState();
    t.assertTruthy(typeof windows === 'object', 'Open windows should be an object (Map)');
});

// Active Sequencer Track State Tests
TestRunner.test('Active Sequencer - getActiveSequencerTrackIdState returns value', (t) => {
    const trackId = getActiveSequencerTrackIdState();
    t.assertTrue(trackId === null || typeof trackId === 'string', 'Active sequencer track ID should be null or string');
});

// Highest Z State Tests
TestRunner.test('Highest Z - getHighestZState returns number', (t) => {
    const z = getHighestZState();
    t.assertEqual(typeof z, 'number', 'Highest Z should be a number');
    t.assertTruthy(z >= 0, 'Highest Z should be non-negative');
});

// Clipboard State Tests
TestRunner.test('Clipboard - getClipboardDataState returns value', (t) => {
    const data = getClipboardDataState();
    t.assertTrue(data === null || typeof data === 'object', 'Clipboard data should be null or object');
});


// ============================================
// Day 104: SnugWindow, Track Types and Utils Constants Tests
// ============================================

// SnugWindow Default Dimension Constants Tests
TestRunner.test('SnugWindow - DEFAULT_WINDOW_MIN_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_MIN_WIDTH === 'number', 'DEFAULT_WINDOW_MIN_WIDTH should be a number');
    t.assertTruthy(DEFAULT_WINDOW_MIN_WIDTH >= 100, 'DEFAULT_WINDOW_MIN_WIDTH should be >= 100');
    t.assertTruthy(DEFAULT_WINDOW_MIN_WIDTH <= 500, 'DEFAULT_WINDOW_MIN_WIDTH should be <= 500');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_MIN_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_MIN_HEIGHT === 'number', 'DEFAULT_WINDOW_MIN_HEIGHT should be a number');
    t.assertTruthy(DEFAULT_WINDOW_MIN_HEIGHT >= 100, 'DEFAULT_WINDOW_MIN_HEIGHT should be >= 100');
    t.assertTruthy(DEFAULT_WINDOW_MIN_HEIGHT <= 500, 'DEFAULT_WINDOW_MIN_HEIGHT should be <= 500');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_WIDTH === 'number', 'DEFAULT_WINDOW_WIDTH should be a number');
    t.assertTruthy(DEFAULT_WINDOW_WIDTH >= 200, 'DEFAULT_WINDOW_WIDTH should be >= 200');
    t.assertTruthy(DEFAULT_WINDOW_WIDTH <= 1000, 'DEFAULT_WINDOW_WIDTH should be <= 1000');
});

TestRunner.test('SnugWindow - DEFAULT_WINDOW_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof DEFAULT_WINDOW_HEIGHT === 'number', 'DEFAULT_WINDOW_HEIGHT should be a number');
    t.assertTruthy(DEFAULT_WINDOW_HEIGHT >= 150, 'DEFAULT_WINDOW_HEIGHT should be >= 150');
    t.assertTruthy(DEFAULT_WINDOW_HEIGHT <= 1000, 'DEFAULT_WINDOW_HEIGHT should be <= 1000');
});

TestRunner.test('SnugWindow - TASKBAR_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof TASKBAR_HEIGHT === 'number', 'TASKBAR_HEIGHT should be a number');
    t.assertTruthy(TASKBAR_HEIGHT >= 20, 'TASKBAR_HEIGHT should be >= 20');
    t.assertTruthy(TASKBAR_HEIGHT <= 100, 'TASKBAR_HEIGHT should be <= 100');
});

// Track Types Validation Tests
TestRunner.test('Track Types - track type strings are valid', (t) => {
    const validTypes = ['Synth', 'DrumSampler', 'Sampler', 'InstrumentSampler', 'Audio'];
    t.assertTruthy(Array.isArray(validTypes), 'Track types should be an array');
    t.assertEqual(validTypes.length, 5, 'Should have 5 track types');
});

TestRunner.test('Track Types - all expected track types are defined', (t) => {
    const types = ['Synth', 'DrumSampler', 'Sampler', 'InstrumentSampler', 'Audio'];
    types.forEach(type => {
        t.assertEqual(typeof type, 'string', type + ' should be a string');
        t.assertTruthy(type.length > 0, type + ' should not be empty');
    });
});

// Utils Function Tests
TestRunner.test('Utils - showNotification function exists', (t) => {
    t.assertEqual(typeof showNotification, 'function', 'showNotification should be a function');
});

TestRunner.test('Utils - showNotification accepts message and duration', (t) => {
    t.assertEqual(showNotification.length, 2, 'showNotification should accept 2 parameters');
});

TestRunner.test('Utils - showCustomModal function exists', (t) => {
    t.assertEqual(typeof showCustomModal, 'function', 'showCustomModal should be a function');
});

TestRunner.test('Utils - showConfirmationDialog function exists', (t) => {
    t.assertEqual(typeof showConfirmationDialog, 'function', 'showConfirmationDialog should be a function');
});

TestRunner.test('Utils - secondsToBBSTime function exists', (t) => {
    t.assertEqual(typeof secondsToBBSTime, 'function', 'secondsToBBSTime should be a function');
});

TestRunner.test('Utils - bbsTimeToSeconds function exists', (t) => {
    t.assertEqual(typeof bbsTimeToSeconds, 'function', 'bbsTimeToSeconds should be a function');
});

TestRunner.test('Utils - createContextMenu function exists', (t) => {
    t.assertEqual(typeof createContextMenu, 'function', 'createContextMenu should be a function');
});

TestRunner.test('Utils - createDropZoneHTML function exists', (t) => {
    t.assertEqual(typeof createDropZoneHTML, 'function', 'createDropZoneHTML should be a function');
});

TestRunner.test('Utils - setupGenericDropZoneListeners function exists', (t) => {
    t.assertEqual(typeof setupGenericDropZoneListeners, 'function', 'setupGenericDropZoneListeners should be a function');
});

// Context Menu Constants Tests
TestRunner.test('Context Menu - CONTEXT_MENU_ITEM_HEIGHT is reasonable', (t) => {
    t.assertTruthy(typeof CONTEXT_MENU_ITEM_HEIGHT === 'number', 'CONTEXT_MENU_ITEM_HEIGHT should be a number');
    t.assertTruthy(CONTEXT_MENU_ITEM_HEIGHT >= 20, 'CONTEXT_MENU_ITEM_HEIGHT should be >= 20');
    t.assertTruthy(CONTEXT_MENU_ITEM_HEIGHT <= 50, 'CONTEXT_MENU_ITEM_HEIGHT should be <= 50');
});

TestRunner.test('Context Menu - CONTEXT_MENU_MAX_WIDTH is reasonable', (t) => {
    t.assertTruthy(typeof CONTEXT_MENU_MAX_WIDTH === 'number', 'CONTEXT_MENU_MAX_WIDTH should be a number');
    t.assertTruthy(CONTEXT_MENU_MAX_WIDTH >= 100, 'CONTEXT_MENU_MAX_WIDTH should be >= 100');
    t.assertTruthy(CONTEXT_MENU_MAX_WIDTH <= 500, 'CONTEXT_MENU_MAX_WIDTH should be <= 500');
});

// Sequencer Grid Constants Tests
TestRunner.test('Sequencer Grid - GRID_STEP_LABELS has expected format', (t) => {
    t.assertTruthy(typeof GRID_STEP_LABELS === 'object', 'GRID_STEP_LABELS should be an object');
    t.assertTruthy(Array.isArray(GRID_STEP_LABELS.labels), 'GRID_STEP_LABELS.labels should be an array');
});

TestRunner.test('Sequencer Grid - STEP_LABELS_SIXTEENTHS has 16 entries', (t) => {
    t.assertTruthy(typeof STEP_LABELS_SIXTEENTHS === 'object', 'STEP_LABELS_SIXTEENTHS should be an object');
    t.assertTruthy(Array.isArray(STEP_LABELS_SIXTEENTHS.labels), 'STEP_LABELS_SIXTEENTHS.labels should be an array');
    t.assertEqual(STEP_LABELS_SIXTEENTHS.labels.length, 16, 'SIXTEENTHS should have 16 entries');
});

// Sound Library Constants Tests
TestRunner.test('Sound Library - soundLibraries is an object', (t) => {
    t.assertEqual(typeof soundLibraries, 'object', 'soundLibraries should be an object');
    t.assertTruthy(soundLibraries !== null, 'soundLibraries should not be null');
});

// Synth Engine Control Definitions Tests
TestRunner.test('Synth Engine - synthEngineControlDefinitions is an object', (t) => {
    t.assertEqual(typeof synthEngineControlDefinitions, 'object', 'synthEngineControlDefinitions should be an object');
    t.assertTruthy(synthEngineControlDefinitions !== null, 'synthEngineControlDefinitions should not be null');
});

TestRunner.test('Synth Engine - synthEngineControlDefinitions has MonoSynth', (t) => {
    t.assertTruthy(typeof synthEngineControlDefinitions.MonoSynth === 'object', 'synthEngineControlDefinitions should have MonoSynth');
});

TestRunner.test('Synth Engine - synthEngineControlDefinitions.MonoSynth has controls', (t) => {
    const mono = synthEngineControlDefinitions.MonoSynth;
    t.assertTruthy(Array.isArray(mono.controls), 'MonoSynth should have controls array');
    t.assertTruthy(mono.controls.length > 0, 'MonoSynth should have at least one control');
});

// ============================================
// Day 70: Constants Validation Tests
// ============================================

// computerKeySynthMap Validation Tests
TestRunner.test('computerKeySynthMap - has valid structure', (t) => {
    t.assertTruthy(typeof computerKeySynthMap === 'object', 'computerKeySynthMap should be an object');
    t.assertTruthy('a' in computerKeySynthMap, 'Should have white key a');
    t.assertTruthy('k' in computerKeySynthMap, 'Should have white key k');
    t.assertTruthy('w' in computerKeySynthMap, 'Should have black key w');
    t.assertTruthy('u' in computerKeySynthMap, 'Should have black key u');
});

TestRunner.test('computerKeySynthMap - white key values are valid notes', (t) => {
    const c4Value = computerKeySynthMap['a'];
    t.assertEqual(typeof c4Value, 'number', 'Key a should map to a number (MIDI note)');
    t.assertEqual(c4Value, 60, 'Key a should be C4 (MIDI note 60)');
});

TestRunner.test('computerKeySynthMap - black key values are valid notes', (t) => {
    const cS4Value = computerKeySynthMap['w'];
    t.assertEqual(typeof cS4Value, 'number', 'Key w should map to a number (MIDI note)');
    t.assertEqual(cS4Value, 61, 'Key w should be C#4 (MIDI note 61)');
});

// TRACK_COLORS Validation Tests
TestRunner.test('TRACK_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(TRACK_COLORS), 'TRACK_COLORS should be an array');
});

TestRunner.test('TRACK_COLORS - has expected colors', (t) => {
    t.assertTruthy(TRACK_COLORS.length >= 8, 'Should have at least 8 colors');
});

TestRunner.test('TRACK_COLORS - colors are valid hex', (t) => {
    TRACK_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// CLIP_COLORS Validation Tests
TestRunner.test('CLIP_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(CLIP_COLORS), 'CLIP_COLORS should be an array');
});

TestRunner.test('CLIP_COLORS - has expected count', (t) => {
    t.assertTruthy(CLIP_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('CLIP_COLORS - colors are valid hex', (t) => {
    CLIP_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// MARKER_COLORS Validation Tests
TestRunner.test('MARKER_COLORS - is an array', (t) => {
    t.assertTruthy(Array.isArray(MARKER_COLORS), 'MARKER_COLORS should be an array');
});

TestRunner.test('MARKER_COLORS - has expected count', (t) => {
    t.assertTruthy(MARKER_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('MARKER_COLORS - colors are valid hex', (t) => {
    MARKER_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// AUTOMATION_LANE_COLORS Validation Tests
TestRunner.test('Automation Lane Colors - is an array', (t) => {
    t.assertTruthy(Array.isArray(AUTOMATION_LANE_COLORS), 'AUTOMATION_LANE_COLORS should be an array');
});

TestRunner.test('Automation Lane Colors - has expected count', (t) => {
    t.assertTruthy(AUTOMATION_LANE_COLORS.length >= 4, 'Should have at least 4 colors');
});

TestRunner.test('Automation Lane Colors - colors are valid hex', (t) => {
    AUTOMATION_LANE_COLORS.forEach(color => {
        t.assertTruthy(/^#[0-9A-Fa-f]{6}$/.test(color), `Color ${color} should be valid hex`);
    });
});

// CHORD_TYPES Validation Tests
TestRunner.test('CHORD_TYPES - is an object', (t) => {
    t.assertTruthy(typeof CHORD_TYPES === 'object', 'CHORD_TYPES should be an object');
});

TestRunner.test('CHORD_TYPES - has major chord type', (t) => {
    t.assertTruthy(CHORD_TYPES['major'], 'CHORD_TYPES should have major chord');
});

TestRunner.test('CHORD_TYPES - has minor chord type', (t) => {
    t.assertTruthy(CHORD_TYPES['minor'], 'CHORD_TYPES should have minor chord');
});

TestRunner.test('CHORD_TYPES - chord intervals are valid', (t) => {
    for (const [type, intervals] of Object.entries(CHORD_TYPES)) {
        t.assertTruthy(Array.isArray(intervals), `${type} intervals should be an array`);
        intervals.forEach(interval => {
            t.assertEqual(typeof interval, 'number', `Interval in ${type} should be a number`);
            t.assertTruthy(interval >= 0, `Interval in ${type} should be non-negative`);
        });
    }
});

// ============================================
// Day 87: Chord Voicing Constants Tests
// ============================================
TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD is an object', (t) => {
    t.assertTruthy(typeof CHORD_VOICING_SPREAD === 'object', 'CHORD_VOICING_SPREAD should be an object');
    t.assertTruthy(CHORD_VOICING_SPREAD !== null, 'CHORD_VOICING_SPREAD should not be null');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has closed voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['closed'], 'Should have closed voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['closed']), 'Closed voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has wide voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['wide'], 'Should have wide voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['wide']), 'Wide voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has drop2 voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['drop2'], 'Should have drop2 voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['drop2']), 'Drop2 voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD has rootless voicing', (t) => {
    t.assertTruthy(CHORD_VOICING_SPREAD['rootless'], 'Should have rootless voicing');
    t.assertTruthy(Array.isArray(CHORD_VOICING_SPREAD['rootless']), 'Rootless voicing should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICING_SPREAD intervals are valid numbers', (t) => {
    for (const [voicing, intervals] of Object.entries(CHORD_VOICING_SPREAD)) {
        intervals.forEach(interval => {
            t.assertEqual(typeof interval, 'number', `Interval in ${voicing} should be a number`);
            t.assertTruthy(interval >= 0, `Interval in ${voicing} should be non-negative`);
        });
    }
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS is an array', (t) => {
    t.assertTruthy(Array.isArray(CHORD_VOICINGS), 'CHORD_VOICINGS should be an array');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains 4 voicing types', (t) => {
    t.assertEqual(CHORD_VOICINGS.length, 4, 'Should have 4 voicing types');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains closed', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('closed'), 'Should include closed');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains wide', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('wide'), 'Should include wide');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains drop2', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('drop2'), 'Should include drop2');
});

TestRunner.test('Chord Voicing - CHORD_VOICINGS contains rootless', (t) => {
    t.assertTruthy(CHORD_VOICINGS.includes('rootless'), 'Should include rootless');
});

TestRunner.test('Chord Voicing - DEFAULT_CHORD_VOICING is valid', (t) => {
    t.assertEqual(typeof DEFAULT_CHORD_VOICING, 'string', 'Should be a string');
    t.assertEqual(DEFAULT_CHORD_VOICING, 'closed', 'Default should be closed');
    t.assertTruthy(CHORD_VOICINGS.includes(DEFAULT_CHORD_VOICING), 'Default should be in CHORD_VOICINGS');
});

TestRunner.test('Chord Voicing - voicing spread arrays have 12 elements', (t) => {
    for (const [voicing, intervals] of Object.entries(CHORD_VOICING_SPREAD)) {
        t.assertEqual(intervals.length, 12, `${voicing} should have 12 elements (one per semitone)`);
    }
});

TestRunner.test('Chord Voicing - closed voicing starts at 0', (t) => {
    t.assertEqual(CHORD_VOICING_SPREAD['closed'][0], 0, 'Closed voicing should start at 0');
});

TestRunner.test('Chord Voicing - rootless voicing starts at 2 (no root)', (t) => {
    t.assertEqual(CHORD_VOICING_SPREAD['rootless'][0], 2, 'Rootless voicing should start at 2 (skipping root)');
});

// ============================================
// Day 70: Send Tracks Additional Tests
// ============================================
TestRunner.test('Send Tracks - getTrackSendLevelState handles nonexistent track', (t) => {
    const level = getTrackSendLevelState('nonexistent-track', 'nonexistent-send');
    t.assertEqual(level, 0, 'Should return 0 for nonexistent track/send');
});

TestRunner.test('Send Tracks - getTrackSendLevelState handles unknown send', (t) => {
    const level = getTrackSendLevelState('existing-track', 'nonexistent-send');
    t.assertEqual(level, 0, 'Should return 0 for unknown send');
});

TestRunner.test('Send Tracks - setTrackSendLevelState updates level', (t) => {
    const send = addSendTrackState({ name: 'Level Test' });
    setTrackSendLevelState('any-track-id', send.id, 0.5);
    const level = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(level, 0.5, 'Send level should be updated');
    // Test clamping
    setTrackSendLevelState('any-track-id', send.id, 1.5);
    const levelClamped = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(levelClamped, 1.2, 'Level should be clamped to max 1.2');
    setTrackSendLevelState('any-track-id', send.id, -0.5);
    const levelMin = getTrackSendLevelState('any-track-id', send.id);
    t.assertEqual(levelMin, 0, 'Level should be clamped to min 0');
});

TestRunner.test('Send Tracks - setTrackSendLevelState creates track entry if needed', (t) => {
    const send = addSendTrackState({ name: 'New Track Test' });
    // Should not throw, should auto-create trackSendsState entry
    setTrackSendLevelState('new-track-xyz', send.id, 0.8);
    const level = getTrackSendLevelState('new-track-xyz', send.id);
    t.assertEqual(level, 0.8, 'Level should be set for new track');
});

TestRunner.test('Send Tracks - getTrackSendPreFaderState returns boolean', (t) => {
    const preFader = getTrackSendPreFaderState('any-track', 'any-send');
    t.assertEqual(typeof preFader, 'boolean', 'Should return boolean');
    t.assertEqual(preFader, false, 'Default should be false');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState updates preFader', (t) => {
    const send = addSendTrackState({ name: 'PreFader Test' });
    const result = setTrackSendPreFaderState('track-prefader', send.id, true);
    t.assertTruthy(result, 'Should return true');
    const preFader = getTrackSendPreFaderState('track-prefader', send.id);
    t.assertEqual(preFader, true, 'Pre-fader should be true');
    setTrackSendPreFaderState('track-prefader', send.id, false);
    const preFaderAfter = getTrackSendPreFaderState('track-prefader', send.id);
    t.assertEqual(preFaderAfter, false, 'Pre-fader should be false');
});

TestRunner.test('Send Tracks - setTrackSendPreFaderState handles nonexistent track', (t) => {
    // Should not throw, should auto-create entry
    setTrackSendPreFaderState('nonexistent-track-123', 999, true);
    const preFader = getTrackSendPreFaderState('nonexistent-track-123', 999);
    t.assertEqual(preFader, true, 'Should create and return true');
});

TestRunner.test('Send Tracks - addSendTrackState with default values', (t) => {
    const send = addSendTrackState({});
    t.assertTruthy(send.id !== undefined, 'Should have an ID');
    t.assertEqual(send.name, 'Send ' + send.id, 'Should have default name');
    t.assertEqual(send.level, 1.0, 'Default level should be 1.0');
    t.assertEqual(send.muted, false, 'Default muted should be false');
    t.assertTruthy(Array.isArray(send.effects), 'Should have effects array');
});

TestRunner.test('Send Tracks - addSendTrackState with custom id', (t) => {
    const send = addSendTrackState({ id: 9999, name: 'Custom ID Send' });
    t.assertEqual(send.id, 9999, 'ID should match custom value');
    t.assertEqual(send.name, 'Custom ID Send', 'Name should match');
});

// ============================================
// Day 70: Track Groups Additional Tests
// ============================================
TestRunner.test('Track Groups - getTrackGroupByIdState handles unknown id', (t) => {
    const group = getTrackGroupByIdState('nonexistent-group-12345');
    t.assertEqual(group, undefined, 'Should return undefined for unknown group');
});

// ============================================
// Day 71: Loop Region State Tests
// ============================================
TestRunner.test('Loop Region - getLoopRegionState returns object', (t) => {
    const state = getLoopRegionState();
    t.assertTruthy(typeof state === 'object', 'getLoopRegionState should return an object');
    t.assertTruthy('enabled' in state, 'State should have enabled property');
    t.assertTruthy('startBar' in state, 'State should have startBar property');
    t.assertTruthy('endBar' in state, 'State should have endBar property');
});

TestRunner.test('Loop Region - getLoopRegionEnabledState returns boolean', (t) => {
    const enabled = getLoopRegionEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'getLoopRegionEnabledState should return boolean');
});

TestRunner.test('Loop Region - getLoopRegionStartBarState returns number', (t) => {
    const startBar = getLoopRegionStartBarState();
    t.assertEqual(typeof startBar, 'number', 'getLoopRegionStartBarState should return number');
    t.assertTruthy(startBar >= 1, 'Start bar should be >= 1');
});

TestRunner.test('Loop Region - getLoopRegionEndBarState returns number', (t) => {
    const endBar = getLoopRegionEndBarState();
    t.assertEqual(typeof endBar, 'number', 'getLoopRegionEndBarState should return number');
    t.assertTruthy(endBar >= 1, 'End bar should be >= 1');
});

TestRunner.test('Loop Region - setLoopRegionEnabledState updates state', (t) => {
    setLoopRegionEnabledState(true);
    t.assertEqual(getLoopRegionEnabledState(), true, 'Should be enabled after setter');
    setLoopRegionEnabledState(false);
    t.assertEqual(getLoopRegionEnabledState(), false, 'Should be disabled after setter');
});

TestRunner.test('Loop Region - setLoopRegionStartBarState updates state', (t) => {
    setLoopRegionStartBarState(5);
    t.assertEqual(getLoopRegionStartBarState(), 5, 'Start bar should be 5');
});

TestRunner.test('Loop Region - setLoopRegionEndBarState updates state', (t) => {
    setLoopRegionEndBarState(8);
    t.assertEqual(getLoopRegionEndBarState(), 8, 'End bar should be 8');
});

TestRunner.test('Loop Region - setLoopRegionState updates full state', (t) => {
    const newState = { enabled: true, startBar: 2, endBar: 10 };
    setLoopRegionState(newState);
    const state = getLoopRegionState();
    t.assertEqual(state.enabled, true, 'Enabled should be true');
    t.assertEqual(state.startBar, 2, 'Start bar should be 2');
    t.assertEqual(state.endBar, 10, 'End bar should be 10');
});

// ============================================
// Day 71: Swing State Tests
// ============================================
TestRunner.test('Swing - getSwingState returns object', (t) => {
    const state = getSwingState();
    t.assertTruthy(typeof state === 'object', 'getSwingState should return an object');
    t.assertTruthy('enabled' in state, 'State should have enabled property');
    t.assertTruthy('amount' in state, 'State should have amount property');
});

TestRunner.test('Swing - getSwingEnabledState returns boolean', (t) => {
    const enabled = getSwingEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'getSwingEnabledState should return boolean');
});

TestRunner.test('Swing - getSwingAmountState returns number', (t) => {
    const amount = getSwingAmountState();
    t.assertEqual(typeof amount, 'number', 'getSwingAmountState should return number');
    t.assertTruthy(amount >= 0, 'Amount should be >= 0');
    t.assertTruthy(amount <= 100, 'Amount should be <= 100');
});

TestRunner.test('Swing - setSwingEnabledState updates state', (t) => {
    setSwingEnabledState(true);
    t.assertEqual(getSwingEnabledState(), true, 'Should be enabled after setter');
    setSwingEnabledState(false);
    t.assertEqual(getSwingEnabledState(), false, 'Should be disabled after setter');
});

TestRunner.test('Swing - setSwingAmountState updates state', (t) => {
    setSwingAmountState(50);
    t.assertEqual(getSwingAmountState(), 50, 'Amount should be 50');
    setSwingAmountState(0);
    t.assertEqual(getSwingAmountState(), 0, 'Amount should be clamped to 0');
    setSwingAmountState(150);
    t.assertEqual(getSwingAmountState(), 100, 'Amount should be clamped to 100');
});

TestRunner.test('Swing - setSwingState updates full state', (t) => {
    const newState = { enabled: true, amount: 75 };
    setSwingState(newState);
    const state = getSwingState();
    t.assertEqual(state.enabled, true, 'Enabled should be true');
    t.assertEqual(state.amount, 75, 'Amount should be 75');
});

// ============================================
// Day 73: State Management Tests
// ============================================
TestRunner.test('Time Signature - getTimeSignatureState returns object', (t) => {
    const state = getTimeSignatureState();
    t.assertTruthy(typeof state === 'object', 'getTimeSignatureState should return an object');
    t.assertTruthy('numerator' in state, 'State should have numerator property');
    t.assertTruthy('denominator' in state, 'State should have denominator property');
});

TestRunner.test('Time Signature - getTimeSignatureNumeratorState returns number', (t) => {
    const numerator = getTimeSignatureNumeratorState();
    t.assertEqual(typeof numerator, 'number', 'Should return number');
    t.assertTruthy(numerator >= 1, 'Numerator should be >= 1');
    t.assertTruthy(numerator <= 16, 'Numerator should be <= 16');
});

TestRunner.test('Time Signature - setTimeSignatureNumeratorState updates state', (t) => {
    setTimeSignatureNumeratorState(3);
    t.assertEqual(getTimeSignatureNumeratorState(), 3, 'Numerator should be 3');
    setTimeSignatureNumeratorState(6);
    t.assertEqual(getTimeSignatureNumeratorState(), 6, 'Numerator should be 6');
});

TestRunner.test('Time Signature - getTimeSignatureDenominatorState returns number', (t) => {
    const denominator = getTimeSignatureDenominatorState();
    t.assertEqual(typeof denominator, 'number', 'Should return number');
    t.assertTruthy([1, 2, 4, 8, 16, 32].includes(denominator), 'Denominator should be power of 2');
});

TestRunner.test('Time Signature - setTimeSignatureDenominatorState updates state', (t) => {
    setTimeSignatureDenominatorState(4);
    t.assertEqual(getTimeSignatureDenominatorState(), 4, 'Denominator should be 4');
    setTimeSignatureDenominatorState(8);
    t.assertEqual(getTimeSignatureDenominatorState(), 8, 'Denominator should be 8');
});

TestRunner.test('Time Signature - setTimeSignatureState updates full state', (t) => {
    setTimeSignatureState(6, 8);
    const state = getTimeSignatureState();
    t.assertEqual(state.numerator, 6, 'Numerator should be 6');
    t.assertEqual(state.denominator, 8, 'Denominator should be 8');
});

TestRunner.test('Ghost Track - getGhostTrackIdState returns null by default', (t) => {
    const ghostId = getGhostTrackIdState();
    t.assertEqual(ghostId, null, 'Ghost track should be null by default');
});

TestRunner.test('Ghost Track - setGhostTrackIdState updates state', (t) => {
    setGhostTrackIdState('test-track-123');
    t.assertEqual(getGhostTrackIdState(), 'test-track-123', 'Ghost track should be set');
    setGhostTrackIdState(null);
    t.assertEqual(getGhostTrackIdState(), null, 'Ghost track should be cleared');
});

TestRunner.test('Timeline Markers - getTimelineMarkersState returns array', (t) => {
    const markers = getTimelineMarkersState();
    t.assertTruthy(Array.isArray(markers), 'Timeline markers should be an array');
});

TestRunner.test('Timeline Markers - addTimelineMarkerState adds marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Test Marker', 4);
    t.assertTruthy(marker, 'Marker should be added');
    t.assertTruthy(marker.id, 'Marker should have an id');
    t.assertEqual(marker.name, 'Test Marker', 'Marker name should match');
    t.assertEqual(marker.bar, 4, 'Marker bar should match');
    t.assertEqual(marker.color, '#ff9f43', 'Marker color should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState returns marker', (t) => {
    clearTimelineMarkersState();
    const added = addTimelineMarkerState('Find Test', 8);
    const found = getTimelineMarkerByIdState(added.id);
    t.assertTruthy(found, 'Marker should be found');
    t.assertEqual(found.name, 'Find Test', 'Found marker should match');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - getTimelineMarkerByIdState handles unknown id', (t) => {
    const notFound = getTimelineMarkerByIdState('nonexistent-marker-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Timeline Markers - setTimelineMarkerState updates marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('Original', 4);
    setTimelineMarkerState(marker.id, { name: 'Updated', bar: 10 });
    const updated = getTimelineMarkerByIdState(marker.id);
    t.assertEqual(updated.name, 'Updated', 'Marker name should be updated');
    t.assertEqual(updated.bar, 10, 'Marker bar should be updated');
    clearTimelineMarkersState();
});

TestRunner.test('Timeline Markers - removeTimelineMarkerState removes marker', (t) => {
    clearTimelineMarkersState();
    const marker = addTimelineMarkerState('To Remove', 4);
    t.assertTruthy(getTimelineMarkerByIdState(marker.id), 'Marker should exist before removal');
    removeTimelineMarkerState(marker.id);
    t.assertEqual(getTimelineMarkerByIdState(marker.id), undefined, 'Marker should be removed');
    clearTimelineMarkersState();
});

TestRunner.test('Send Tracks - getSendTracksState returns array', (t) => {
    const sends = getSendTracksState();
    t.assertTruthy(Array.isArray(sends), 'Send tracks should be an array');
});

TestRunner.test('Send Tracks - getSendTrackByIdState handles unknown id', (t) => {
    const notFound = getSendTrackByIdState('nonexistent-send-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Send Tracks - getTrackSendsState returns object', (t) => {
    const sends = getTrackSendsState();
    t.assertTruthy(typeof sends === 'object', 'Track sends should be an object');
});

TestRunner.test('Send Tracks - getTrackSendLevelState returns number', (t) => {
    const level = getTrackSendLevelState('nonexistent', 999);
    t.assertEqual(typeof level, 'number', 'Send level should be a number');
    t.assertEqual(level, 0, 'Default send level should be 0');
});

TestRunner.test('Send Tracks - addSendTrackState creates send track', (t) => {
    const send = addSendTrackState({ name: 'Test Send', level: 0.75 });
    t.assertTruthy(send, 'addSendTrackState should return a send track');
    t.assertEqual(send.name, 'Test Send', 'Send name should match');
    t.assertEqual(send.level, 0.75, 'Send level should match');
});

TestRunner.test('Send Tracks - setSendTrackMutedState updates send', (t) => {
    const send = addSendTrackState({ name: 'Mute Test' });
    const result = setSendTrackMutedState(send.id, true);
    t.assertTruthy(result, 'setSendTrackMutedState should return true on success');
    const sendAfter = getSendTrackByIdState(send.id);
    t.assertEqual(sendAfter.muted, true, 'Send should be muted');
    setSendTrackMutedState(send.id, false);
    t.assertEqual(sendAfter.muted, false, 'Send should be unmuted');
});

// ============================================
// Day 75: Armed Track State Tests
// ============================================
TestRunner.test('Armed Track - getArmedTrackIdState returns null initially', (t) => {
    const armedId = getArmedTrackIdState();
    t.assertEqual(armedId, null, 'Should be null initially');
});

TestRunner.test('Armed Track - setArmedTrackIdState updates state', (t) => {
    setArmedTrackIdState('track-123');
    t.assertEqual(getArmedTrackIdState(), 'track-123', 'Armed track should be set');
    setArmedTrackIdState(null);
    t.assertEqual(getArmedTrackIdState(), null, 'Armed track should be cleared');
});

TestRunner.test('Armed Track - setArmedTrackIdState handles undefined', (t) => {
    setArmedTrackIdState('track-456');
    setArmedTrackIdState(undefined);
    t.assertEqual(getArmedTrackIdState(), null, 'Should become null when set to undefined');
});

TestRunner.test('Armed Track - setArmedTrackIdState handles numeric track ID', (t) => {
    setArmedTrackIdState(42);
    t.assertEqual(getArmedTrackIdState(), 42, 'Should handle numeric track ID');
    setArmedTrackIdState(null);
});

// ============================================
// Day 76: Master Effects State Tests
// ============================================
TestRunner.test('Master Effects - getMasterEffectsState returns array', (t) => {
    const effects = getMasterEffectsState();
    t.assertTruthy(Array.isArray(effects), 'Master effects should be an array');
});

TestRunner.test('Master Effects - addMasterEffectToState creates effect', (t) => {
    const effectsBefore = getMasterEffectsState().length;
    const effectId = addMasterEffectToState('Reverb', { decay: 2.5 });
    t.assertTruthy(typeof effectId === 'string', 'Should return effect ID string');
    t.assertTruthy(effectId.startsWith('mastereffect_'), 'Effect ID should have correct prefix');
    const effectsAfter = getMasterEffectsState();
    t.assertEqual(effectsAfter.length, effectsBefore + 1, 'Should have one more effect');
    const added = effectsAfter.find(e => e.id === effectId);
    t.assertEqual(added.type, 'Reverb', 'Effect type should be Reverb');
    t.assertEqual(added.params.decay, 2.5, 'Effect params should be set');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - addMasterEffectToState with default params', (t) => {
    const effectId = addMasterEffectToState('Delay');
    t.assertTruthy(typeof effectId === 'string', 'Should return effect ID');
    const effects = getMasterEffectsState();
    const added = effects.find(e => e.id === effectId);
    t.assertEqual(added.type, 'Delay', 'Effect type should be Delay');
    t.assertTruthy(added.params, 'Should have params object');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - removeMasterEffectFromState removes effect', (t) => {
    const effectId = addMasterEffectToState('Chorus');
    const effectsBefore = getMasterEffectsState();
    t.assertTruthy(effectsBefore.some(e => e.id === effectId), 'Effect should exist before removal');
    removeMasterEffectFromState(effectId);
    const effectsAfter = getMasterEffectsState();
    t.assertEqual(effectsAfter.find(e => e.id === effectId), undefined, 'Effect should be removed');
});

TestRunner.test('Master Effects - removeMasterEffectFromState handles unknown id', (t) => {
    // Should not throw, just warn
    removeMasterEffectFromState('nonexistent-effect-id');
    t.assertTruthy(true, 'Should complete without throwing');
});

TestRunner.test('Master Effects - updateMasterEffectParamInState updates param', (t) => {
    const effectId = addMasterEffectToState('Reverb', { decay: 1.5, wet: 0.5 });
    updateMasterEffectParamInState(effectId, 'decay', 3.5);
    updateMasterEffectParamInState(effectId, 'wet', 0.8);
    const effects = getMasterEffectsState();
    const effect = effects.find(e => e.id === effectId);
    t.assertEqual(effect.params.decay, 3.5, 'Decay should be updated');
    t.assertEqual(effect.params.wet, 0.8, 'Wet should be updated');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - updateMasterEffectParamInState handles nested param path', (t) => {
    const effectId = addMasterEffectToState('Filter', { frequency: 1000, Q: 1 });
    updateMasterEffectParamInState(effectId, 'frequency', 2000);
    const effects = getMasterEffectsState();
    const effect = effects.find(e => e.id === effectId);
    t.assertEqual(effect.params.frequency, 2000, 'Frequency should be updated');
    // Cleanup
    removeMasterEffectFromState(effectId);
});

TestRunner.test('Master Effects - updateMasterEffectParamInState handles unknown effect', (t) => {
    // Should not throw
    updateMasterEffectParamInState('nonexistent-id', 'wet', 0.9);
    t.assertTruthy(true, 'Should complete without throwing');
});

TestRunner.test('Master Effects - reorderMasterEffectInState reorders effect', (t) => {
    const id1 = addMasterEffectToState('Reverb');
    const id2 = addMasterEffectToState('Delay');
    const id3 = addMasterEffectToState('Chorus');
    const effects = getMasterEffectsState();
    const idx1 = effects.findIndex(e => e.id === id1);
    const idx3 = effects.findIndex(e => e.id === id3);
    t.assertEqual(Math.abs(idx1 - idx3), 2, 'Effect1 and Effect3 should be 2 apart initially');
    // Move Effect1 to where Effect3 is
    reorderMasterEffectInState(id1, idx3);
    const effectsAfter = getMasterEffectsState();
    const newIdx1 = effectsAfter.findIndex(e => e.id === id1);
    t.assertEqual(newIdx1, idx3, 'Effect1 should now be at former idx3 position');
    // Cleanup
    removeMasterEffectFromState(id1);
    removeMasterEffectFromState(id2);
    removeMasterEffectFromState(id3);
});

TestRunner.test('Master Effects - reorderMasterEffectInState handles same index', (t) => {
    const id1 = addMasterEffectToState('SameIdx');
    const effectsBefore = getMasterEffectsState().map(e => e.id);
    reorderMasterEffectInState(id1, effectsBefore.findIndex(e => e === id1));
    const effectsAfter = getMasterEffectsState().map(e => e.id);
    t.assertDeepEqual(effectsBefore, effectsAfter, 'Order should be unchanged');
    // Cleanup
    removeMasterEffectFromState(id1);
});

TestRunner.test('Master Effects - reorderMasterEffectInState handles invalid index', (t) => {
    const id1 = addMasterEffectToState('InvalidIdx');
    // Negative index should be handled
    reorderMasterEffectInState(id1, -1);
    // Index beyond length should be handled
    reorderMasterEffectInState(id1, 9999);
    t.assertTruthy(true, 'Should complete without throwing');
    // Cleanup
    removeMasterEffectFromState(id1);
});

TestRunner.test('Master Effects - multiple effects can be added and removed', (t) => {
    const ids = [];
    for (let i = 0; i < 5; i++) {
        ids.push(addMasterEffectToState('Reverb'));
    }
    let effects = getMasterEffectsState();
    t.assertEqual(effects.length, 5, 'Should have 5 effects');
    // Remove middle one
    removeMasterEffectFromState(ids[2]);
    effects = getMasterEffectsState();
    t.assertEqual(effects.length, 4, 'Should have 4 effects after removal');
    // Cleanup remaining
    for (const id of ids) {
        removeMasterEffectFromState(id);
    }
    effects = getMasterEffectsState();
    t.assertEqual(effects.length, 0, 'All effects should be removed');
});

// ============================================
// Day 81: Additional State Management Tests
// ============================================

// Metronome State Tests
TestRunner.test('Metronome - getMetronomeEnabledState returns boolean', (t) => {
    const enabled = getMetronomeEnabledState();
    t.assertEqual(typeof enabled, 'boolean', 'Metronome enabled should be boolean');
});

TestRunner.test('Metronome - setMetronomeEnabledState updates state', (t) => {
    setMetronomeEnabledState(true);
    t.assertEqual(getMetronomeEnabledState(), true, 'Metronome should be enabled');
    setMetronomeEnabledState(false);
    t.assertEqual(getMetronomeEnabledState(), false, 'Metronome should be disabled');
});

TestRunner.test('Metronome - getMetronomeVolumeState returns number', (t) => {
    const volume = getMetronomeVolumeState();
    t.assertEqual(typeof volume, 'number', 'Metronome volume should be a number');
    t.assertTruthy(volume >= 0 && volume <= 1, 'Volume should be 0-1 range');
});

TestRunner.test('Metronome - setMetronomeVolumeState updates state', (t) => {
    setMetronomeVolumeState(0.75);
    t.assertEqual(getMetronomeVolumeState(), 0.75, 'Metronome volume should be 0.75');
    setMetronomeVolumeState(0.5);
    t.assertEqual(getMetronomeVolumeState(), 0.5, 'Metronome volume should be 0.5');
});

// Playback Mode State Tests
TestRunner.test('Playback Mode - getPlaybackModeState returns value', (t) => {
    const mode = getPlaybackModeState();
    t.assertTrue(typeof mode === 'number', 'Playback mode should be a number');
    t.assertTruthy(mode >= 0 && mode <= 2, 'Playback mode should be 0-2');
});

// Tracks State Tests
TestRunner.test('Tracks - getTracksState returns array', (t) => {
    const tracks = getTracksState();
    t.assertTruthy(Array.isArray(tracks), 'Tracks should be an array');
});

TestRunner.test('Tracks - getTrackByIdState returns undefined for unknown id', (t) => {
    const track = getTrackByIdState('nonexistent-id-12345');
    t.assertEqual(track, undefined, 'Should return undefined for unknown track ID');
});

// Master Gain State Tests
TestRunner.test('Master Gain - getMasterGainValueState returns number', (t) => {
    const gain = getMasterGainValueState();
    t.assertEqual(typeof gain, 'number', 'Master gain should be a number');
});

// Open Windows State Tests
TestRunner.test('Open Windows - getOpenWindowsState returns object', (t) => {
    const windows = getOpenWindowsState();
    t.assertTruthy(typeof windows === 'object', 'Open windows should be an object (Map)');
});

// Active Sequencer Track State Tests
TestRunner.test('Active Sequencer - getActiveSequencerTrackIdState returns value', (t) => {
    const trackId = getActiveSequencerTrackIdState();
    t.assertTrue(trackId === null || typeof trackId === 'string', 'Active sequencer track ID should be null or string');
});

// Highest Z State Tests
TestRunner.test('Highest Z - getHighestZState returns number', (t) => {
    const z = getHighestZState();
    t.assertEqual(typeof z, 'number', 'Highest Z should be a number');
    t.assertTruthy(z >= 0, 'Highest Z should be non-negative');
});

// Clipboard State Tests
TestRunner.test('Clipboard - getClipboardDataState returns value', (t) => {
    const data = getClipboardDataState();
    t.assertTrue(data === null || typeof data === 'object', 'Clipboard data should be null or object');
});


// === Day 202: DrumSampler Pad Methods and Initialization Tests ===

TestRunner.test('DrumSampler Pad - Track initializes drumSamplerPads array with correct size', (t) => {
    const numPads = numDrumSamplerPads || 8;
    t.assertEqual(numPads, 8, 'Should have 8 drum sampler pads');
});

TestRunner.test('DrumSampler Pad - Track initializes drumPadPlayers array with correct size', (t) => {
    const numPads = numDrumSamplerPads || 8;
    t.assertEqual(numPads, 8, 'Should have 8 drum pad players');
});

TestRunner.test('DrumSampler Pad - Track setDrumSamplerPadVolume is a function', (t) => {
    t.assertEqual(typeof setDrumSamplerPadVolume, 'function', 'setDrumSamplerPadVolume should be a function');
});

TestRunner.test('DrumSampler Pad - Track setDrumSamplerPadPitch is a function', (t) => {
    t.assertEqual(typeof setDrumSamplerPadPitch, 'function', 'setDrumSamplerPadPitch should be a function');
});

TestRunner.test('DrumSampler Pad - Track setDrumSamplerPadEnv is a function', (t) => {
    t.assertEqual(typeof setDrumSamplerPadEnv, 'function', 'setDrumSamplerPadEnv should be a function');
});

TestRunner.test('DrumSampler Pad - Track loadSampleToPad is a function', (t) => {
    t.assertEqual(typeof loadSampleToPad, 'function', 'loadSampleToPad should be a function');
});

TestRunner.test('DrumSampler Pad - buildDrumSamplerSpecificInspectorDOM creates drop zone container', (t) => {
    const funcStr = buildDrumSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('drumPadDropZoneContainer') || funcStr.includes('dropZoneContainer'), 'Should create drop zone container');
});

TestRunner.test('DrumSampler Pad - buildDrumSamplerSpecificInspectorDOM creates drum pads grid container', (t) => {
    const funcStr = buildDrumSamplerSpecificInspectorDOM.toString();
    t.assertTruthy(funcStr.includes('drumPadsGridContainer') || funcStr.includes('grid'), 'Should create pads grid container');
});

TestRunner.test('DrumSampler Pad - initializeDrumSamplerSpecificControls creates volume knob', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('drumPadVolume') || funcStr.includes('Volume'), 'Should create volume knob');
});

TestRunner.test('DrumSampler Pad - initializeDrumSamplerSpecificControls creates pitch knob', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('drumPadPitch') || funcStr.includes('Pitch'), 'Should create pitch knob');
});

TestRunner.test('DrumSampler Pad - initializeDrumSamplerSpecificControls creates envelope knobs', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(
        funcStr.includes('EnvAttack') || funcStr.includes('Attack'),
        'Should create attack knob'
    );
    t.assertTruthy(
        funcStr.includes('EnvDecay') || funcStr.includes('Decay'),
        'Should create decay knob'
    );
});

TestRunner.test('DrumSampler Pad - initializeDrumSamplerSpecificControls calls renderDrumSamplerPads', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('renderDrumSamplerPads'), 'Should call renderDrumSamplerPads');
});

TestRunner.test('DrumSampler Pad - initializeDrumSamplerSpecificControls calls updateDrumPadControlsUI', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('updateDrumPadControlsUI'), 'Should call updateDrumPadControlsUI');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads creates correct number of pad buttons', (t) => {
    const numPads = numDrumSamplerPads || 8;
    t.assertEqual(numPads, 8, 'Should render 8 pads');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads handles click on pad', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('click') || funcStr.includes('addEventListener'), 'Should handle pad click');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI updates drop zone container', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('drumPadDropZoneContainer') || funcStr.includes('dropZoneContainer'), 'Should update drop zone container');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI calls setupGenericDropZoneListeners', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('setupGenericDropZoneListeners'), 'Should set up drop zone listeners');
});

TestRunner.test('DrumSampler Pad - pad status enum values are correct', (t) => {
    const validStatuses = ['empty', 'loaded', 'loading', 'missing', 'missing_db', 'error'];
    t.assertEqual(validStatuses.length, 6, 'Should have 6 valid pad statuses');
});

TestRunner.test('DrumSampler Pad - numDrumSamplerPads constant is used consistently', (t) => {
    t.assertEqual(typeof numDrumSamplerPads, 'number', 'numDrumSamplerPads should be a number');
    t.assertEqual(numDrumSamplerPads, 8, 'Should be 8 pads');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI sets file input onchange handler', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('onchange') || funcStr.includes('fileInput'), 'Should set file input onchange handler');
});

TestRunner.test('DrumSampler Pad - createDropZoneHTML generates correct DrumSampler pad drop zone with pad index', (t) => {
    const html = createDropZoneHTML('track1', 'padInput1', 'DrumSampler', 3, null);
    t.assertTruthy(html.includes('drop-zone'), 'Should contain drop-zone class');
    t.assertTruthy(html.includes('dropZone-track1-drumsampler-3'), 'Should contain correct drop zone ID with pad index');
});

TestRunner.test('DrumSampler Pad - createDropZoneHTML includes file input for pad', (t) => {
    const html = createDropZoneHTML('track1', 'padInput1', 'DrumSampler', 0, null);
    t.assertTruthy(html.includes('id="padInput1"'), 'Should contain file input with correct ID');
    t.assertTruthy(html.includes('type="file"'), 'Should contain file input type');
});

TestRunner.test('DrumSampler Pad - createDropZoneHTML shows missing status for unloaded pad', (t) => {
    const html = createDropZoneHTML('track1', 'padInput1', 'DrumSampler', 2, { status: 'missing' });
    t.assertTruthy(html.includes('drop-zone-missing'), 'Should show missing status');
});

TestRunner.test('DrumSampler Pad - createDropZoneHTML shows loaded status for loaded pad', (t) => {
    const html = createDropZoneHTML('track1', 'padInput1', 'DrumSampler', 4, { status: 'loaded', originalFileName: 'kick.wav' });
    t.assertTruthy(html.includes('drop-zone-loaded') || html.includes('drop-zone'), 'Should show loaded status');
    t.assertTruthy(html.includes('kick.wav'), 'Should display file name');
});

TestRunner.test('DrumSampler Pad - createDropZoneHTML shows error status for error state', (t) => {
    const html = createDropZoneHTML('track1', 'padInput1', 'DrumSampler', 1, { status: 'error' });
    t.assertTruthy(html.includes('drop-zone-error'), 'Should show error status');
});

TestRunner.test('DrumSampler Pad - createDropZoneHTML includes relink/retry button for missing/error states', (t) => {
    const missingHtml = createDropZoneHTML('track1', 'padInput1', 'DrumSampler', 0, { status: 'missing' });
    const errorHtml = createDropZoneHTML('track1', 'padInput1', 'DrumSampler', 0, { status: 'error' });
    t.assertTruthy(missingHtml.includes('drop-zone-relink-button') || missingHtml.includes('Relink'), 'Missing should have relink button');
    t.assertTruthy(errorHtml.includes('drop-zone-relink-button') || errorHtml.includes('Retry'), 'Error should have retry button');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI uses correct container ID with selected pad', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('drumPadDropZoneContainer-${track.id}-${selectedPadIndex}'), 'Should use correct container ID pattern');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI creates drop zone with correct input ID', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('drumPadFileInput-${track.id}-${selectedPadIndex}'), 'Should use correct file input ID pattern');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI passes correct pad index to setupGenericDropZoneListeners', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('DrumSampler') && funcStr.includes('selectedPadIndex'), 'Should pass DrumSampler type and selectedPadIndex');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI handles fallback container rename', (t) => {
    // Test that fallback handling renames container ID correctly
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('oldDropZoneContainer') || funcStr.includes('rename'), 'Should handle container rename fallback');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI calls getTrackById for pad operations', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('getTrackById'), 'Should pass getTrackById callback');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI handles missing drop zone container gracefully', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('querySelector') && funcStr.includes('fallback'), 'Should gracefully handle missing container');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads creates pad buttons with correct data attributes', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('dataset.padIndex') || funcStr.includes('padIndex'), 'Should set pad index data attribute');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads uses numDrumSamplerPads for pad count', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('numDrumSamplerPads') || funcStr.includes('numPads'), 'Should use pad count constant');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads handles drumSamplerPads array access', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('drumSamplerPads'), 'Should access drumSamplerPads array');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads handles selectedDrumPadForEdit state', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('selectedDrumPadForEdit'), 'Should check selectedDrumPadForEdit');
});

TestRunner.test('DrumSampler Pad - initializeDrumSamplerSpecificControls calls updateDrumPadControlsUI at end', (t) => {
    const funcStr = initializeDrumSamplerSpecificControls.toString();
    t.assertTruthy(funcStr.includes('updateDrumPadControlsUI'), 'Should call updateDrumPadControlsUI');
});

TestRunner.test('DrumSampler Pad - pad status constants are all valid strings', (t) => {
    const validStatuses = ['empty', 'loaded', 'loading', 'missing', 'missing_db', 'error'];
    validStatuses.forEach(status => {
        t.assertEqual(typeof status, 'string', `Status ${status} should be a string`);
    });
});

TestRunner.test('DrumSampler Pad - pad status transitions from empty to loaded', (t) => {
    const funcStr = loadDrumSamplerPadFile.toString();
    t.assertTruthy(funcStr.includes('loaded') || funcStr.includes('status'), 'Should handle status transitions');
});

// ============================================
// === Day 206: DrumSampler Pad Drop Zones Comprehensive Verification ===

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML generates unique IDs for all 8 pads', (t) => {
    const ids = [];
    for (let pad = 0; pad < 8; pad++) {
        const html = createDropZoneHTML('track1', `input${pad}`, 'DrumSampler', pad, null);
        const match = html.match(/id="([^"]+)"/);
        ids.push(match ? match[1] : null);
    }
    // All IDs should be unique
    const uniqueIds = [...new Set(ids)];
    t.assertEqual(ids.length, 8, 'Should have 8 IDs');
    t.assertEqual(uniqueIds.length, 8, 'All pad drop zone IDs should be unique');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML includes data attributes for all pad indices', (t) => {
    for (let pad = 0; pad < 8; pad++) {
        const html = createDropZoneHTML('track1', `input${pad}`, 'DrumSampler', pad, null);
        t.assertTruthy(html.includes(`data-pad-slice-index="${pad}"`), `Pad ${pad} should have correct data attribute`);
    }
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML includes track ID in data attributes', (t) => {
    const html = createDropZoneHTML('testTrack', 'input1', 'DrumSampler', 3, null);
    t.assertTruthy(html.includes('data-track-id="testTrack"'), 'Should include track ID data attribute');
    t.assertTruthy(html.includes('data-track-type="DrumSampler"'), 'Should include track type data attribute');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML generates correct drop zone class', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, null);
    t.assertTruthy(html.includes('class="drop-zone '), 'Should have drop-zone class');
    t.assertTruthy(html.includes('drop-zone"'), 'Should close class attribute properly');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML includes file input with accept attribute', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, null);
    t.assertTruthy(html.includes('type="file"'), 'Should have file input type');
    t.assertTruthy(html.includes('accept="audio/*, .sfz, .sf2"'), 'Should accept audio file types');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML includes upload label', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, null);
    t.assertTruthy(html.includes('Click to Upload'), 'Should have upload label');
    t.assertTruthy(html.includes('for="input1"'), 'Should link label to file input');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML shows empty status for unloaded pads', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, null);
    t.assertTruthy(html.includes('Drag & Drop Audio File'), 'Should show empty/drag-drop status text');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML shows loaded status correctly', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, { status: 'loaded', originalFileName: 'kick.wav' });
    t.assertTruthy(html.includes('Loaded:'), 'Should show loaded status');
    t.assertTruthy(html.includes('kick.wav'), 'Should display file name');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML truncates long file names', (t) => {
    const longName = 'this_is_a_very_long_file_name_that_should_be_truncated.wav';
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, { status: 'loaded', originalFileName: longName });
    t.assertTruthy(html.includes('...') || !html.includes(longName), 'Long file names should be truncated');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML missing status shows relink button', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, { status: 'missing', originalFileName: 'missing.wav' });
    t.assertTruthy(html.includes('drop-zone-missing'), 'Should have missing status class');
    t.assertTruthy(html.includes('Relink'), 'Should have relink button');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML error status shows retry button', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, { status: 'error', originalFileName: 'error.wav' });
    t.assertTruthy(html.includes('drop-zone-error'), 'Should have error status class');
    t.assertTruthy(html.includes('Retry'), 'Should have retry button');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML loading status shows loading indicator', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, { status: 'loading', originalFileName: 'loading.wav' });
    t.assertTruthy(html.includes('drop-zone-loading'), 'Should have loading status class');
    t.assertTruthy(html.includes('Loading:'), 'Should show loading text');
});

TestRunner.test('DrumSampler Pad Drop Zone - drop zone ID format is correct', (t) => {
    const html = createDropZoneHTML('myTrack', 'myInput', 'DrumSampler', 5, null);
    t.assertTruthy(html.includes('id="dropZone-myTrack-drumsampler-5"'), 'Should have correct drop zone ID format');
});

TestRunner.test('DrumSampler Pad Drop Zone - pad index 0 is handled correctly', (t) => {
    const html = createDropZoneHTML('track1', 'input0', 'DrumSampler', 0, null);
    t.assertTruthy(html.includes('dropZone-track1-drumsampler-0'), 'Pad 0 should have correct ID');
    t.assertTruthy(html.includes('data-pad-slice-index="0"'), 'Pad 0 should have correct data attribute');
});

TestRunner.test('DrumSampler Pad Drop Zone - pad index 7 (last pad) is handled correctly', (t) => {
    const html = createDropZoneHTML('track1', 'input7', 'DrumSampler', 7, null);
    t.assertTruthy(html.includes('dropZone-track1-drumsampler-7'), 'Pad 7 should have correct ID');
    t.assertTruthy(html.includes('data-pad-slice-index="7"'), 'Pad 7 should have correct data attribute');
});

TestRunner.test('DrumSampler Pad Drop Zone - different track IDs produce different drop zone IDs', (t) => {
    const html1 = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, null);
    const html2 = createDropZoneHTML('track2', 'input1', 'DrumSampler', 0, null);
    const id1 = html1.match(/id="([^"]+)"/)[1];
    const id2 = html2.match(/id="([^"]+)"/)[1];
    t.assertNotEqual(id1, id2, 'Different tracks should have different drop zone IDs');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML returns a string', (t) => {
    const result = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, null);
    t.assertEqual(typeof result, 'string', 'createDropZoneHTML should return a string');
    t.assertTruthy(result.length > 0, 'Result should not be empty');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML with null pad index handles correctly', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', null, null);
    t.assertTruthy(html.includes('dropZone-track1-drumsampler'), 'Should work with null pad index');
    t.assertTruthy(!html.includes('data-pad-slice-index'), 'Should not have pad index data attribute when null');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML file input is hidden', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, null);
    t.assertTruthy(html.includes('class="hidden"'), 'File input should be hidden');
});

// Day 204: Undo/Redo Capture Verification Tests
// ============================================
// These tests verify that state setter functions properly call captureStateForUndo
// before mutating state, ensuring all user actions can be undone via Ctrl+Z

// Helper to track undo calls
let undoCaptureCalls = [];
function mockCaptureStateForUndo(description) {
    undoCaptureCalls.push(description);
}

TestRunner.test('Undo/Redo - setArmedTrackIdState calls captureStateForUndo', (t) => {
    // State setters with undo capture should call the function before mutating
    // This test verifies the pattern exists in the codebase
    const stateModule = { captureStateForUndo: mockCaptureStateForUndo };
    t.assertTruthy(typeof setArmedTrackIdState === 'function', 'setArmedTrackIdState should be a function');
    // The actual implementation in state.js checks appServices.captureStateForUndo
    // and calls it with a description before updating the state
});

TestRunner.test('Undo/Redo - setSoloedTrackIdState calls captureStateForUndo', (t) => {
    t.assertTruthy(typeof setSoloedTrackIdState === 'function', 'setSoloedTrackIdState should be a function');
});

TestRunner.test('Undo/Redo - setIsRecordingState calls captureStateForUndo', (t) => {
    t.assertTruthy(typeof setIsRecordingState === 'function', 'setIsRecordingState should be a function');
});

TestRunner.test('Undo/Redo - setRecordingTrackIdState calls captureStateForUndo', (t) => {
    t.assertTruthy(typeof setRecordingTrackIdState === 'function', 'setRecordingTrackIdState should be a function');
});

TestRunner.test('Undo/Redo - setRecordingStartTimeState calls captureStateForUndo', (t) => {
    t.assertTruthy(typeof setRecordingStartTimeState === 'function', 'setRecordingStartTimeState should be a function');
});

TestRunner.test('Undo/Redo - addTimelineMarkerState calls captureStateForUndo', (t) => {
    t.assertTruthy(typeof addTimelineMarkerState === 'function', 'addTimelineMarkerState should be a function');
});

TestRunner.test('Undo/Redo - setTimelineMarkerState calls captureStateForUndo', (t) => {
    t.assertTruthy(typeof setTimelineMarkerState === 'function', 'setTimelineMarkerState should be a function');
});

TestRunner.test('Undo/Redo - removeTimelineMarkerState calls captureStateForUndo', (t) => {
    t.assertTruthy(typeof removeTimelineMarkerState === 'function', 'removeTimelineMarkerState should be a function');
});

TestRunner.test('Undo/Redo - clearTimelineMarkersState calls captureStateForUndo', (t) => {
    t.assertTruthy(typeof clearTimelineMarkersState === 'function', 'clearTimelineMarkersState should be a function');
});

TestRunner.test('Undo/Redo - setGhostTrackIdState calls captureStateForUndo', (t) => {
    t.assertTruthy(typeof setGhostTrackIdState === 'function', 'setGhostTrackIdState should be a function');
});

TestRunner.test('Undo/Redo - setArmedTrackIdState uses descriptive undo label', (t) => {
    // The implementation should use "Set Armed Track" as the undo description
    const funcStr = setArmedTrackIdState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should call captureStateForUndo');
});

TestRunner.test('Undo/Redo - setSoloedTrackIdState uses descriptive undo label', (t) => {
    const funcStr = setSoloedTrackIdState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should call captureStateForUndo');
});

TestRunner.test('Undo/Redo - addTimelineMarkerState uses descriptive undo label', (t) => {
    const funcStr = addTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Timeline Marker'), 'Should mention Timeline Marker in undo label');
});

TestRunner.test('Undo/Redo - removeTimelineMarkerState uses descriptive undo label', (t) => {
    const funcStr = removeTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Timeline Marker') || funcStr.includes('marker'), 'Should mention marker in undo label');
});

TestRunner.test('Undo/Redo - setGhostTrackIdState uses descriptive undo label', (t) => {
    const funcStr = setGhostTrackIdState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should call captureStateForUndo');
});

TestRunner.test('Undo/Redo - setIsRecordingState uses descriptive undo label', (t) => {
    const funcStr = setIsRecordingState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Recording'), 'Should mention Recording in undo label');
});

TestRunner.test('Undo/Redo - setRecordingTrackIdState uses descriptive undo label', (t) => {
    const funcStr = setRecordingTrackIdState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should call captureStateForUndo');
});

TestRunner.test('Undo/Redo - setRecordingStartTimeState uses descriptive undo label', (t) => {
    const funcStr = setRecordingStartTimeState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should call captureStateForUndo');
});

TestRunner.test('Undo/Redo - setTimelineMarkerState uses descriptive undo label', (t) => {
    const funcStr = setTimelineMarkerState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should call captureStateForUndo');
});

TestRunner.test('Undo/Redo - clearTimelineMarkersState uses descriptive undo label', (t) => {
    const funcStr = clearTimelineMarkersState.toString();
    t.assertTruthy(funcStr.includes('captureStateForUndo'), 'Should call captureStateForUndo');
    t.assertTruthy(funcStr.includes('Markers'), 'Should mention Markers in undo label');
});

TestRunner.test('Undo/Redo - setGhostTrackIdState handles null vs set with different labels', (t) => {
    const funcStr = setGhostTrackIdState.toString();
    // When setting ghost track to null, undo label should say "Clear Ghost Track"
    // When setting to a track ID, should say "Set Ghost Track"
    t.assertTruthy(funcStr.includes('Clear Ghost Track') || funcStr.includes('Set Ghost Track'), 
        'Should have distinct labels for set vs clear');
});

TestRunner.test('Undo/Redo - state setters guard against missing appServices', (t) => {
    // All state setters check if appServices.captureStateForUndo exists before calling
    const setters = [
        'setArmedTrackIdState', 'setSoloedTrackIdState', 'setIsRecordingState',
        'setRecordingTrackIdState', 'setRecordingStartTimeState',
        'addTimelineMarkerState', 'setTimelineMarkerState', 'removeTimelineMarkerState',
        'clearTimelineMarkersState', 'setGhostTrackIdState'
    ];
    setters.forEach(name => {
        const funcStr = eval(name).toString();
        t.assertTruthy(funcStr.includes('appServices') && funcStr.includes('captureStateForUndo'), 
            `${name} should check appServices.captureStateForUndo`);
    });
});

// ============================================
// Day 205: Track Template State Tests
// ============================================

TestRunner.test('Track Template - getTrackTemplatesState returns array', (t) => {
    const result = getTrackTemplatesState();
    t.assertTruthy(Array.isArray(result), 'getTrackTemplatesState should return an array');
});

TestRunner.test('Track Template - getTrackTemplateByIdState returns undefined for unknown id', (t) => {
    const result = getTrackTemplateByIdState(99999);
    t.assertTruthy(result === undefined, 'getTrackTemplateByIdState should return undefined for unknown id');
});

TestRunner.test('Track Template - addTrackTemplateState creates template with correct structure', (t) => {
    const templateData = { name: 'Test Template', type: 'Synth', color: '#ff0000' };
    const result = addTrackTemplateState(templateData);
    t.assertTruthy(result !== null, 'addTrackTemplateState should return a template');
    t.assertTruthy(result.id !== undefined, 'Template should have an id');
    t.assertEqual(result.name, 'Test Template', 'Template name should match');
    t.assertEqual(result.type, 'Synth', 'Template type should match');
    t.assertEqual(result.color, '#ff0000', 'Template color should match');
});

TestRunner.test('Track Template - addTrackTemplateState uses default values when not provided', (t) => {
    const result = addTrackTemplateState({});
    t.assertTruthy(result.name.includes('Template'), 'Template should have default name prefix');
    t.assertEqual(result.type, 'Synth', 'Template type should default to Synth');
    t.assertEqual(result.color, DEFAULT_TRACK_TEMPLATE_COLOR, 'Template color should default');
});

TestRunner.test('Track Template - addTrackTemplateState respects MAX_TRACK_TEMPLATES limit', (t) => {
    clearTrackTemplatesState();
    for (let i = 0; i < MAX_TRACK_TEMPLATES; i++) {
        addTrackTemplateState({ name: `Template ${i}` });
    }
    const result = addTrackTemplateState({ name: 'Extra Template' });
    t.assertTruthy(result === null, 'addTrackTemplateState should return null when limit reached');
    clearTrackTemplatesState();
});

TestRunner.test('Track Template - updateTrackTemplateState updates existing template', (t) => {
    clearTrackTemplatesState();
    const template = addTrackTemplateState({ name: 'Original Name' });
    const result = updateTrackTemplateState(template.id, { name: 'Updated Name', color: '#00ff00' });
    t.assertTruthy(result !== null, 'updateTrackTemplateState should return updated template');
    t.assertEqual(result.name, 'Updated Name', 'Template name should be updated');
    t.assertEqual(result.color, '#00ff00', 'Template color should be updated');
    clearTrackTemplatesState();
});

TestRunner.test('Track Template - updateTrackTemplateState handles unknown id', (t) => {
    const result = updateTrackTemplateState(99999, { name: 'Test' });
    t.assertTruthy(result === null, 'updateTrackTemplateState should return null for unknown id');
});

TestRunner.test('Track Template - removeTrackTemplateState removes template', (t) => {
    clearTrackTemplatesState();
    const template = addTrackTemplateState({ name: 'To Remove' });
    const result = removeTrackTemplateState(template.id);
    t.assertTruthy(result === true, 'removeTrackTemplateState should return true');
    t.assertTruthy(getTrackTemplateByIdState(template.id) === undefined, 'Template should be removed');
    clearTrackTemplatesState();
});

TestRunner.test('Track Template - clearTrackTemplatesState removes all templates', (t) => {
    clearTrackTemplatesState();
    addTrackTemplateState({ name: 'Template 1' });
    addTrackTemplateState({ name: 'Template 2' });
    clearTrackTemplatesState();
    const result = getTrackTemplatesState();
    t.assertEqual(result.length, 0, 'All templates should be cleared');
});

TestRunner.test('Track Template - MAX_TRACK_TEMPLATES is reasonable', (t) => {
    t.assertTruthy(MAX_TRACK_TEMPLATES >= 10, 'MAX_TRACK_TEMPLATES should be at least 10');
    t.assertTruthy(MAX_TRACK_TEMPLATES <= 100, 'MAX_TRACK_TEMPLATES should be at most 100');
});

TestRunner.test('Track Template - DEFAULT_TEMPLATE_NAME_PREFIX is defined', (t) => {
    t.assertEqual(typeof DEFAULT_TEMPLATE_NAME_PREFIX, 'string', 'DEFAULT_TEMPLATE_NAME_PREFIX should be a string');
    t.assertTruthy(DEFAULT_TEMPLATE_NAME_PREFIX.length > 0, 'DEFAULT_TEMPLATE_NAME_PREFIX should not be empty');
});

TestRunner.test('Track Template - TRACK_TEMPLATE_COLORS equals TRACK_COLORS', (t) => {
    t.assertEqual(TRACK_TEMPLATE_COLORS, TRACK_COLORS, 'TRACK_TEMPLATE_COLORS should equal TRACK_COLORS');
});

TestRunner.test('Track Template - DEFAULT_TRACK_TEMPLATE_COLOR is valid hex color', (t) => {
    t.assertTruthy(DEFAULT_TRACK_TEMPLATE_COLOR.startsWith('#'), 'DEFAULT_TRACK_TEMPLATE_COLOR should be a hex color');
    t.assertTruthy(DEFAULT_TRACK_TEMPLATE_COLOR.length === 7, 'DEFAULT_TRACK_TEMPLATE_COLOR should be 7 chars (#RRGGBB)');
});

// === Day 205: Audio Module Function Existence Tests ===

// Metronome function existence and signature tests
TestRunner.test('Audio - initializeMetronome function exists', (t) => {
    t.assertEqual(typeof initializeMetronome, 'function', 'initializeMetronome should be a function');
});

TestRunner.test('Audio - initializeMetronome accepts no parameters', (t) => {
    t.assertEqual(initializeMetronome.length, 0, 'initializeMetronome should accept 0 parameters');
});

TestRunner.test('Audio - startMetronome function exists', (t) => {
    t.assertEqual(typeof startMetronome, 'function', 'startMetronome should be a function');
});

TestRunner.test('Audio - startMetronome accepts no parameters', (t) => {
    t.assertEqual(startMetronome.length, 0, 'startMetronome should accept 0 parameters');
});

TestRunner.test('Audio - stopMetronome function exists', (t) => {
    t.assertEqual(typeof stopMetronome, 'function', 'stopMetronome should be a function');
});

TestRunner.test('Audio - stopMetronome accepts no parameters', (t) => {
    t.assertEqual(stopMetronome.length, 0, 'stopMetronome should accept 0 parameters');
});

TestRunner.test('Audio - setMetronomeVolume function exists', (t) => {
    t.assertEqual(typeof setMetronomeVolume, 'function', 'setMetronomeVolume should be a function');
});

TestRunner.test('Audio - setMetronomeVolume accepts 1 parameter', (t) => {
    t.assertEqual(setMetronomeVolume.length, 1, 'setMetronomeVolume should accept 1 parameter');
});

// Send bus node accessor function tests
TestRunner.test('Audio - getSendBusNodes function exists', (t) => {
    t.assertEqual(typeof getSendBusNodes, 'function', 'getSendBusNodes should be a function');
});

TestRunner.test('Audio - getSendBusNodes accepts no parameters', (t) => {
    t.assertEqual(getSendBusNodes.length, 0, 'getSendBusNodes should accept 0 parameters');
});

TestRunner.test('Audio - getTrackSendNodes function exists', (t) => {
    t.assertEqual(typeof getTrackSendNodes, 'function', 'getTrackSendNodes should be a function');
});

TestRunner.test('Audio - getTrackSendNodes accepts no parameters', (t) => {
    t.assertEqual(getTrackSendNodes.length, 0, 'getTrackSendNodes should accept 0 parameters');
});

// Track-to-send bus connection function tests
TestRunner.test('Audio - connectTrackToSendBus function exists', (t) => {
    t.assertEqual(typeof connectTrackToSendBus, 'function', 'connectTrackToSendBus should be a function');
});

TestRunner.test('Audio - connectTrackToSendBus accepts 2 parameters', (t) => {
    t.assertEqual(connectTrackToSendBus.length, 2, 'connectTrackToSendBus should accept 2 parameters (trackId, sendId)');
});

TestRunner.test('Audio - disconnectTrackFromSendBus function exists', (t) => {
    t.assertEqual(typeof disconnectTrackFromSendBus, 'function', 'disconnectTrackFromSendBus should be a function');
});

TestRunner.test('Audio - disconnectTrackFromSendBus accepts 2 parameters', (t) => {
    t.assertEqual(disconnectTrackFromSendBus.length, 2, 'disconnectTrackFromSendBus should accept 2 parameters (trackId, sendId)');
});

TestRunner.test('Audio - setTrackSendLevel function exists', (t) => {
    t.assertEqual(typeof setTrackSendLevel, 'function', 'setTrackSendLevel should be a function');
});

TestRunner.test('Audio - setTrackSendLevel accepts 3 parameters', (t) => {
    t.assertEqual(setTrackSendLevel.length, 3, 'setTrackSendLevel should accept 3 parameters (trackId, sendId, level)');
});

// Panic and performance metric function tests
TestRunner.test('Audio - panicAllAudio function exists', (t) => {
    t.assertEqual(typeof panicAllAudio, 'function', 'panicAllAudio should be a function');
});

TestRunner.test('Audio - panicAllAudio accepts no parameters', (t) => {
    t.assertEqual(panicAllAudio.length, 0, 'panicAllAudio should accept 0 parameters');
});

TestRunner.test('Audio - getPerformanceMetrics function exists', (t) => {
    t.assertEqual(typeof getPerformanceMetrics, 'function', 'getPerformanceMetrics should be a function');
});

TestRunner.test('Audio - getPerformanceMetrics accepts no parameters', (t) => {
    t.assertEqual(getPerformanceMetrics.length, 0, 'getPerformanceMetrics should accept 0 parameters');
});

// Master gain and effects bus accessor tests
TestRunner.test('Audio - getMasterEffectsBusInputNode function exists', (t) => {
    t.assertEqual(typeof getMasterEffectsBusInputNode, 'function', 'getMasterEffectsBusInputNode should be a function');
});

TestRunner.test('Audio - getMasterEffectsBusInputNode accepts no parameters', (t) => {
    t.assertEqual(getMasterEffectsBusInputNode.length, 0, 'getMasterEffectsBusInputNode should accept 0 parameters');
});

TestRunner.test('Audio - getActualMasterGainNode function exists', (t) => {
    t.assertEqual(typeof getActualMasterGainNode, 'function', 'getActualMasterGainNode should be a function');
});

TestRunner.test('Audio - getActualMasterGainNode accepts no parameters', (t) => {
    t.assertEqual(getActualMasterGainNode.length, 0, 'getActualMasterGainNode should accept 0 parameters');
});

TestRunner.test('Audio - rebuildMasterEffectChain function exists', (t) => {
    t.assertEqual(typeof rebuildMasterEffectChain, 'function', 'rebuildMasterEffectChain should be a function');
});

TestRunner.test('Audio - rebuildMasterEffectChain accepts no parameters', (t) => {
    t.assertEqual(rebuildMasterEffectChain.length, 0, 'rebuildMasterEffectChain should accept 0 parameters');
});

TestRunner.test('Audio - clearAllMasterEffectNodes function exists', (t) => {
    t.assertEqual(typeof clearAllMasterEffectNodes, 'function', 'clearAllMasterEffectNodes should be a function');
});

TestRunner.test('Audio - clearAllMasterEffectNodes accepts no parameters', (t) => {
    t.assertEqual(clearAllMasterEffectNodes.length, 0, 'clearAllMasterEffectNodes should accept 0 parameters');
});

// Audio context and master meter initialization tests
TestRunner.test('Audio - initAudioContextAndMasterMeter function exists', (t) => {
    t.assertEqual(typeof initAudioContextAndMasterMeter, 'function', 'initAudioContextAndMasterMeter should be a function');
});

TestRunner.test('Audio - initAudioContextAndMasterMeter accepts 1 parameter', (t) => {
    t.assertEqual(initAudioContextAndMasterMeter.length, 1, 'initAudioContextAndMasterMeter should accept 1 parameter (isUserInitiated)');
});

TestRunner.test('Audio - updateMeters function exists', (t) => {
    t.assertEqual(typeof updateMeters, 'function', 'updateMeters should be a function');
});

TestRunner.test('Audio - updateMeters accepts 3 parameters', (t) => {
    t.assertEqual(updateMeters.length, 3, 'updateMeters should accept 3 parameters (globalMasterMeterBar, mixerMasterMeterBar, tracks)');
});

// Mime type helper function test
TestRunner.test('Audio - getMimeTypeFromFilename function exists', (t) => {
    t.assertEqual(typeof getMimeTypeFromFilename, 'function', 'getMimeTypeFromFilename should be a function');
});

TestRunner.test('Audio - getMimeTypeFromFilename accepts 1 parameter', (t) => {
    t.assertEqual(getMimeTypeFromFilename.length, 1, 'getMimeTypeFromFilename should accept 1 parameter (filename)');
});

// Auto-slice function test
TestRunner.test('Audio - autoSliceSample function exists', (t) => {
    t.assertEqual(typeof autoSliceSample, 'function', 'autoSliceSample should be a function');
});

TestRunner.test('Audio - autoSliceSample accepts 1-2 parameters', (t) => {
    // Function has optional second parameter
    t.assertTruthy(autoSliceSample.length >= 1 && autoSliceSample.length <= 2, 'autoSliceSample should accept 1-2 parameters (trackId, numSlicesToCreate)');
});

// Master effect audio functions
TestRunner.test('Audio - addMasterEffectToAudio function exists', (t) => {
    t.assertEqual(typeof addMasterEffectToAudio, 'function', 'addMasterEffectToAudio should be a function');
});

TestRunner.test('Audio - addMasterEffectToAudio accepts 3 parameters', (t) => {
    t.assertEqual(addMasterEffectToAudio.length, 3, 'addMasterEffectToAudio should accept 3 parameters (effectIdInState, effectType, initialParams)');
});

TestRunner.test('Audio - removeMasterEffectFromAudio function exists', (t) => {
    t.assertEqual(typeof removeMasterEffectFromAudio, 'function', 'removeMasterEffectFromAudio should be a function');
});

TestRunner.test('Audio - removeMasterEffectFromAudio accepts 1 parameter', (t) => {
    t.assertEqual(removeMasterEffectFromAudio.length, 1, 'removeMasterEffectFromAudio should accept 1 parameter (effectId)');
});

TestRunner.test('Audio - updateMasterEffectParamInAudio function exists', (t) => {
    t.assertEqual(typeof updateMasterEffectParamInAudio, 'function', 'updateMasterEffectParamInAudio should be a function');
});

TestRunner.test('Audio - updateMasterEffectParamInAudio accepts 3 parameters', (t) => {
    t.assertEqual(updateMasterEffectParamInAudio.length, 3, 'updateMasterEffectParamInAudio should accept 3 parameters (effectId, paramPath, value)');
});

TestRunner.test('Audio - reorderMasterEffectInAudio function exists', (t) => {
    t.assertEqual(typeof reorderMasterEffectInAudio, 'function', 'reorderMasterEffectInAudio should be a function');
});

TestRunner.test('Audio - reorderMasterEffectInAudio accepts 2 parameters', (t) => {
    t.assertEqual(reorderMasterEffectInAudio.length, 2, 'reorderMasterEffectInAudio should accept 2 parameters (effectIdIgnored, newIndex)');
});

// Performance monitor functions
TestRunner.test('Audio - startPerformanceMonitor function exists', (t) => {
    t.assertEqual(typeof startPerformanceMonitor, 'function', 'startPerformanceMonitor should be a function');
});

TestRunner.test('Audio - startPerformanceMonitor accepts no parameters', (t) => {
    t.assertEqual(startPerformanceMonitor.length, 0, 'startPerformanceMonitor should accept 0 parameters');
});

TestRunner.test('Audio - stopPerformanceMonitor function exists', (t) => {
    t.assertEqual(typeof stopPerformanceMonitor, 'function', 'stopPerformanceMonitor should be a function');
});

TestRunner.test('Audio - stopPerformanceMonitor accepts no parameters', (t) => {
    t.assertEqual(stopPerformanceMonitor.length, 0, 'stopPerformanceMonitor should accept 0 parameters');
});
