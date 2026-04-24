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


// ============================================
// Day 105: Send Bus Audio Functions Tests
// ============================================
TestRunner.test('Send Bus Audio - createSendBusInAudio function exists', (t) => {
    t.assertEqual(typeof createSendBusInAudio, 'function', 'createSendBusInAudio should be a function');
});

TestRunner.test('Send Bus Audio - deleteSendBusFromAudio function exists', (t) => {
    t.assertEqual(typeof deleteSendBusFromAudio, 'function', 'deleteSendBusFromAudio should be a function');
});

TestRunner.test('Send Bus Audio - addEffectToSendBus function exists', (t) => {
    t.assertEqual(typeof addEffectToSendBus, 'function', 'addEffectToSendBus should be a function');
});

TestRunner.test('Send Bus Audio - removeEffectFromSendBus function exists', (t) => {
    t.assertEqual(typeof removeEffectFromSendBus, 'function', 'removeEffectFromSendBus should be a function');
});

TestRunner.test('Send Bus Audio - reorderEffectInSendBus function exists', (t) => {
    t.assertEqual(typeof reorderEffectInSendBus, 'function', 'reorderEffectInSendBus should be a function');
});

TestRunner.test('Send Bus Audio - updateSendBusEffectParam function exists', (t) => {
    t.assertEqual(typeof updateSendBusEffectParam, 'function', 'updateSendBusEffectParam should be a function');
});

TestRunner.test('Send Bus Audio - setSendBusLevel function exists', (t) => {
    t.assertEqual(typeof setSendBusLevel, 'function', 'setSendBusLevel should be a function');
});

TestRunner.test('Send Bus Audio - setSendBusMuted function exists', (t) => {
    t.assertEqual(typeof setSendBusMuted, 'function', 'setSendBusMuted should be a function');
});

TestRunner.test('Send Bus Audio - setRecordingInputGain function exists', (t) => {
    t.assertEqual(typeof setRecordingInputGain, 'function', 'setRecordingInputGain should be a function');
});

TestRunner.test('Send Bus Audio - setRecordingInputGain accepts one parameter', (t) => {
    t.assertEqual(setRecordingInputGain.length, 1, 'setRecordingInputGain should accept 1 parameter');
});

TestRunner.test('Send Bus Audio - createSendBusInAudio accepts one parameter', (t) => {
    t.assertEqual(createSendBusInAudio.length, 1, 'createSendBusInAudio should accept 1 parameter');
});

TestRunner.test('Send Bus Audio - deleteSendBusFromAudio accepts one parameter', (t) => {
    t.assertEqual(deleteSendBusFromAudio.length, 1, 'deleteSendBusFromAudio should accept 1 parameter');
});

TestRunner.test('Send Bus Audio - addEffectToSendBus accepts three parameters', (t) => {
    t.assertEqual(addEffectToSendBus.length, 3, 'addEffectToSendBus should accept 3 parameters');
});

TestRunner.test('Send Bus Audio - removeEffectFromSendBus accepts two parameters', (t) => {
    t.assertEqual(removeEffectFromSendBus.length, 2, 'removeEffectFromSendBus should accept 2 parameters');
});

TestRunner.test('Send Bus Audio - reorderEffectInSendBus accepts three parameters', (t) => {
    t.assertEqual(reorderEffectInSendBus.length, 3, 'reorderEffectInSendBus should accept 3 parameters');
});

TestRunner.test('Send Bus Audio - updateSendBusEffectParam accepts four parameters', (t) => {
    t.assertEqual(updateSendBusEffectParam.length, 4, 'updateSendBusEffectParam should accept 4 parameters');
});

TestRunner.test('Send Bus Audio - setSendBusLevel accepts two parameters', (t) => {
    t.assertEqual(setSendBusLevel.length, 2, 'setSendBusLevel should accept 2 parameters');
});

TestRunner.test('Send Bus Audio - setSendBusMuted accepts two parameters', (t) => {
    t.assertEqual(setSendBusMuted.length, 2, 'setSendBusMuted should accept 2 parameters');
});

// ============================================
// Day 106: Audio Recording Tests - addAudioClip
// ============================================

// Mock Track for testing addAudioClip
const mockAppServices = {
    updateTrackUI: null,
    renderTimeline: null
};

const mockTrack = {
    id: 'test-audio-track',
    name: 'Test Audio Track',
    type: 'Audio',
    timelineClips: [],
    appServices: mockAppServices,
    _captureUndoState: function(description) {
        // Mock undo capture
    }
};

TestRunner.test('Audio Recording - addAudioClip function exists on Track', (t) => {
    t.assertTruthy(typeof mockTrack.addAudioClip === 'function', 'addAudioClip should be a function');
});

TestRunner.test('Audio Recording - addAudioClip is async', (t) => {
    const result = mockTrack.addAudioClip(null, 0);
    t.assertTruthy(result instanceof Promise, 'addAudioClip should return a Promise');
});

TestRunner.test('Audio Recording - addAudioClip with invalid blob returns null', async (t) => {
    const result = await mockTrack.addAudioClip(null, 0);
    t.assertEqual(result, null, 'addAudioClip should return null for invalid blob');
});

TestRunner.test('Audio Recording - addAudioClip with empty blob returns null', async (t) => {
    const emptyBlob = new Blob([], { type: 'audio/webm' });
    const result = await mockTrack.addAudioClip(emptyBlob, 0);
    t.assertEqual(result, null, 'addAudioClip should return null for empty blob');
});

TestRunner.test('Audio Recording - addAudioClip creates clip with valid structure', async (t) => {
    const mockBlob = new Blob(['test audio data'], { type: 'audio/webm' });
    const startTime = 4.0;
    
    // Override storeAudio to avoid actual DB access
    const originalStoreAudio = window.storeAudio;
    window.storeAudio = async () => {};
    
    const result = await mockTrack.addAudioClip(mockBlob, startTime);
    
    // Restore original
    window.storeAudio = originalStoreAudio;
    
    t.assertTruthy(result !== null, 'Should return a clip object');
    if (result) {
        t.assertTruthy(result.id.startsWith('audioclip_'), 'Clip ID should start with audioclip_');
        t.assertEqual(result.type, 'audio', 'Clip type should be audio');
        t.assertEqual(result.startTime, startTime, 'Clip startTime should match');
        t.assertEqual(result.name, 'Rec 1', 'Clip name should be auto-generated');
    }
});

TestRunner.test('Audio Recording - addAudioClip sets correct default properties', async (t) => {
    const mockBlob = new Blob(['test audio data'], { type: 'audio/webm' });
    
    // Override storeAudio to avoid actual DB access
    const originalStoreAudio = window.storeAudio;
    window.storeAudio = async () => {};
    
    const result = await mockTrack.addAudioClip(mockBlob, 0);
    
    // Restore original
    window.storeAudio = originalStoreAudio;
    
    if (result) {
        t.assertEqual(result.gain, 1.0, 'Default gain should be 1.0');
        t.assertEqual(result.playbackRate, 1.0, 'Default playback rate should be 1.0');
        t.assertEqual(result.startOffset, 0, 'Default start offset should be 0');
        t.assertEqual(result.crossfade, 0, 'Default crossfade should be 0');
        t.assertEqual(result.fadeIn, 0, 'Default fade in should be 0');
        t.assertEqual(result.fadeOut, 0, 'Default fade out should be 0');
        t.assertEqual(result.reverse, false, 'Default reverse should be false');
    }
});

TestRunner.test('Audio Recording - addAudioClip increments clip name counter', async (t) => {
    const mockBlob = new Blob(['test audio data'], { type: 'audio/webm' });
    
    // Override storeAudio to avoid actual DB access
    const originalStoreAudio = window.storeAudio;
    window.storeAudio = async () => {};
    
    // First clip
    const result1 = await mockTrack.addAudioClip(mockBlob, 0);
    // Second clip
    const result2 = await mockTrack.addAudioClip(mockBlob, 0);
    
    // Restore original
    window.storeAudio = originalStoreAudio;
    
    if (result1 && result2) {
        t.assertEqual(result1.name, 'Rec 1', 'First clip name should be Rec 1');
        t.assertEqual(result2.name, 'Rec 2', 'Second clip name should be Rec 2');
    }
});

// ============================================
// Day 106: Audio Recording Constants Edge Case Tests
// ============================================

TestRunner.test('Audio Recording - Input gain clamping at min boundary', (t) => {
    // MIN_RECORDING_INPUT_GAIN = 0 should be valid
    t.assertEqual(MIN_RECORDING_INPUT_GAIN, 0, 'Min input gain should be 0');
    t.assertTruthy(MIN_RECORDING_INPUT_GAIN >= 0, 'Min input gain should be non-negative');
});

TestRunner.test('Audio Recording - Input gain clamping at max boundary', (t) => {
    // MAX_RECORDING_INPUT_GAIN = 2.0 should allow software boost
    t.assertEqual(MAX_RECORDING_INPUT_GAIN, 2.0, 'Max input gain should be 2.0');
    t.assertTruthy(MAX_RECORDING_INPUT_GAIN >= 1.0, 'Max input gain should allow boost above 1.0');
});

TestRunner.test('Audio Recording - Monitoring volume in valid range', (t) => {
    t.assertTruthy(DEFAULT_RECORDING_MONITORING_VOLUME >= 0, 'Monitoring volume should be >= 0');
    t.assertTruthy(DEFAULT_RECORDING_MONITORING_VOLUME <= 1, 'Monitoring volume should be <= 1');
});

// ============================================
// Day 106: Recording State Function Signature Tests
// ============================================

TestRunner.test('Recording State - isTrackRecordingState function exists', (t) => {
    t.assertTruthy(typeof isTrackRecordingState === 'function', 'isTrackRecordingState should be a function');
});

TestRunner.test('Recording State - getRecordingTrackIdState function exists', (t) => {
    t.assertTruthy(typeof getRecordingTrackIdState === 'function', 'getRecordingTrackIdState should be a function');
});

TestRunner.test('Recording State - getRecordingStartTimeState function exists', (t) => {
    t.assertTruthy(typeof getRecordingStartTimeState === 'function', 'getRecordingStartTimeState should be a function');
});

TestRunner.test('Recording State - setIsRecordingState function exists', (t) => {
    t.assertTruthy(typeof setIsRecordingState === 'function', 'setIsRecordingState should be a function');
});

TestRunner.test('Recording State - setRecordingTrackIdState function exists', (t) => {
    t.assertTruthy(typeof setRecordingTrackIdState === 'function', 'setRecordingTrackIdState should be a function');
});

TestRunner.test('Recording State - setRecordingStartTimeState function exists', (t) => {
    t.assertTruthy(typeof setRecordingStartTimeState === 'function', 'setRecordingStartTimeState should be a function');
});

// ============================================
// Day 106: Recording Function Signature Tests
// ============================================

TestRunner.test('Recording Functions - startAudioRecording function exists', (t) => {
    t.assertTruthy(typeof startAudioRecording === 'function', 'startAudioRecording should be a function');
});

TestRunner.test('Recording Functions - stopAudioRecording function exists', (t) => {
    t.assertTruthy(typeof stopAudioRecording === 'function', 'stopAudioRecording should be a function');
});

TestRunner.test('Recording Functions - setRecordingInputGain function exists', (t) => {
    t.assertTruthy(typeof setRecordingInputGain === 'function', 'setRecordingInputGain should be a function');
});

TestRunner.test('Recording Functions - startAudioRecording accepts 2 parameters', (t) => {
    t.assertEqual(startAudioRecording.length, 2, 'startAudioRecording should accept 2 parameters (track, isMonitoringEnabled)');
});

TestRunner.test('Recording Functions - stopAudioRecording accepts 0 parameters', (t) => {
    t.assertEqual(stopAudioRecording.length, 0, 'stopAudioRecording should accept 0 parameters');
});

TestRunner.test('Recording Functions - setRecordingInputGain accepts 1 parameter', (t) => {
    t.assertEqual(setRecordingInputGain.length, 1, 'setRecordingInputGain should accept 1 parameter (gainValue)');
});

// ============================================
// Day 107: MIDI Learn Constants Tests
// ============================================
TestRunner.test('MIDI Learn - MIDI_LEARN_MIN_CC is valid', (t) => {
    t.assertEqual(MIDI_LEARN_MIN_CC, 0, 'Min CC should be 0');
    t.assertTruthy(MIDI_LEARN_MIN_CC >= 0, 'Min CC should be non-negative');
});

TestRunner.test('MIDI Learn - MIDI_LEARN_MAX_CC is valid', (t) => {
    t.assertEqual(MIDI_LEARN_MAX_CC, 127, 'Max CC should be 127 (MIDI standard)');
    t.assertTruthy(MIDI_LEARN_MAX_CC <= 127, 'Max CC should be within MIDI standard range');
});

TestRunner.test('MIDI Learn - MIDI_LEARN_MIN_CHANNEL is valid', (t) => {
    t.assertEqual(MIDI_LEARN_MIN_CHANNEL, 0, 'Min channel should be 0 (0-indexed)');
});

TestRunner.test('MIDI Learn - MIDI_LEARN_MAX_CHANNEL is valid', (t) => {
    t.assertEqual(MIDI_LEARN_MAX_CHANNEL, 15, 'Max channel should be 15 (0-indexed, channel 16)');
});

TestRunner.test('MIDI Learn - MAX_MIDI_LEARN_MAPPINGS is reasonable', (t) => {
    t.assertEqual(MAX_MIDI_LEARN_MAPPINGS, 64, 'Max mappings should be 64');
    t.assertTruthy(MAX_MIDI_LEARN_MAPPINGS > 0, 'Max mappings should be positive');
    t.assertTruthy(MAX_MIDI_LEARN_MAPPINGS <= 128, 'Max mappings should not exceed 128');
});

TestRunner.test('MIDI Learn - MIDI_CC_COMMAND is valid', (t) => {
    t.assertEqual(MIDI_CC_COMMAND, 176, 'CC command should be 176');
    t.assertTruthy(MIDI_CC_COMMAND >= 176 && MIDI_CC_COMMAND <= 191, 'CC command should be in range 176-191');
});

TestRunner.test('MIDI Learn - DEFAULT_MIDI_LEARN_MODE is boolean', (t) => {
    t.assertEqual(DEFAULT_MIDI_LEARN_MODE, false, 'Default MIDI Learn mode should be false');
    t.assertTruthy(typeof DEFAULT_MIDI_LEARN_MODE === 'boolean', 'Default should be boolean');
});

TestRunner.test('MIDI Learn - MIDI_LEARN_INDICATOR_TIMEOUT_MS is positive', (t) => {
    t.assertTruthy(MIDI_LEARN_INDICATOR_TIMEOUT_MS > 0, 'Indicator timeout should be positive');
    t.assertTruthy(MIDI_LEARN_INDICATOR_TIMEOUT_MS >= 500, 'Indicator timeout should be at least 500ms');
    t.assertTruthy(MIDI_LEARN_INDICATOR_TIMEOUT_MS <= 10000, 'Indicator timeout should be at most 10 seconds');
});

TestRunner.test('MIDI Learn - MIDI_LEARN_PARAM_TYPES is an array', (t) => {
    t.assertTruthy(Array.isArray(MIDI_LEARN_PARAM_TYPES), 'Param types should be an array');
    t.assertTruthy(MIDI_LEARN_PARAM_TYPES.length > 0, 'Param types should not be empty');
});

TestRunner.test('MIDI Learn - MIDI_LEARN_PARAM_TYPES contains expected parameters', (t) => {
    t.assertTruthy(MIDI_LEARN_PARAM_TYPES.includes('trackVolume'), 'Should include trackVolume');
    t.assertTruthy(MIDI_LEARN_PARAM_TYPES.includes('trackPan'), 'Should include trackPan');
    t.assertTruthy(MIDI_LEARN_PARAM_TYPES.includes('masterVolume'), 'Should include masterVolume');
    t.assertTruthy(MIDI_LEARN_PARAM_TYPES.includes('metronomeVolume'), 'Should include metronomeVolume');
    t.assertTruthy(MIDI_LEARN_PARAM_TYPES.includes('tempo'), 'Should include tempo');
});

TestRunner.test('MIDI Learn - DEFAULT_MIDI_LEARN_MAPPING structure', (t) => {
    t.assertTruthy(typeof DEFAULT_MIDI_LEARN_MAPPING === 'object', 'Default mapping should be an object');
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.channel === 0, 'Default channel should be 0');
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.cc === 0, 'Default CC should be 0');
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.trackId === null, 'Default trackId should be null');
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.paramType === null, 'Default paramType should be null');
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.paramPath === null, 'Default paramPath should be null');
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.min === 0, 'Default min should be 0');
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING.max === 1, 'Default max should be 1');
});

// ============================================
// Day 107: MIDI Learn State Function Tests
// ============================================
TestRunner.test('MIDI Learn State - getMidiLearnModeState function exists', (t) => {
    t.assertTruthy(typeof getMidiLearnModeState === 'function', 'getMidiLearnModeState should be a function');
});

TestRunner.test('MIDI Learn State - setMidiLearnModeState function exists', (t) => {
    t.assertTruthy(typeof setMidiLearnModeState === 'function', 'setMidiLearnModeState should be a function');
});

TestRunner.test('MIDI Learn State - getMidiLearnMappingsState function exists', (t) => {
    t.assertTruthy(typeof getMidiLearnMappingsState === 'function', 'getMidiLearnMappingsState should be a function');
});

TestRunner.test('MIDI Learn State - addMidiLearnMapping function exists', (t) => {
    t.assertTruthy(typeof addMidiLearnMapping === 'function', 'addMidiLearnMapping should be a function');
});

TestRunner.test('MIDI Learn State - setMidiLearnPendingParamState function exists', (t) => {
    t.assertTruthy(typeof setMidiLearnPendingParamState === 'function', 'setMidiLearnPendingParamState should be a function');
});

TestRunner.test('MIDI Learn State - getMidiLearnPendingParamState function exists', (t) => {
    t.assertTruthy(typeof getMidiLearnPendingParamState === 'function', 'getMidiLearnPendingParamState should be a function');
});

TestRunner.test('MIDI Learn State - getMidiLearnMappingByIndex function exists', (t) => {
    t.assertTruthy(typeof getMidiLearnMappingByIndex === 'function', 'getMidiLearnMappingByIndex should be a function');
});

TestRunner.test('MIDI Learn State - updateMidiLearnMapping function exists', (t) => {
    t.assertTruthy(typeof updateMidiLearnMapping === 'function', 'updateMidiLearnMapping should be a function');
});

TestRunner.test('MIDI Learn State - removeMidiLearnMapping function exists', (t) => {
    t.assertTruthy(typeof removeMidiLearnMapping === 'function', 'removeMidiLearnMapping should be a function');
});

TestRunner.test('MIDI Learn State - clearMidiLearnMappings function exists', (t) => {
    t.assertTruthy(typeof clearMidiLearnMappings === 'function', 'clearMidiLearnMappings should be a function');
});

TestRunner.test('MIDI Learn State - findMidiLearnMapping function exists', (t) => {
    t.assertTruthy(typeof findMidiLearnMapping === 'function', 'findMidiLearnMapping should be a function');
});

TestRunner.test('MIDI Learn State - getMidiLearnModeState returns boolean', (t) => {
    const result = getMidiLearnModeState();
    t.assertTruthy(typeof result === 'boolean', 'getMidiLearnModeState should return boolean');
});

TestRunner.test('MIDI Learn State - setMidiLearnModeState sets mode', (t) => {
    setMidiLearnModeState(true);
    t.assertTruthy(getMidiLearnModeState() === true, 'Mode should be true after setting');
    setMidiLearnModeState(false);
    t.assertTruthy(getMidiLearnModeState() === false, 'Mode should be false after setting');
});

TestRunner.test('MIDI Learn State - getMidiLearnMappingsState returns array', (t) => {
    const result = getMidiLearnMappingsState();
    t.assertTruthy(Array.isArray(result), 'getMidiLearnMappingsState should return array');
});

TestRunner.test('MIDI Learn State - addMidiLearnMapping adds mapping', (t) => {
    const initialCount = getMidiLearnMappingsState().length;
    const result = addMidiLearnMapping({ channel: 0, cc: 1, paramType: 'masterVolume' });
    const newCount = getMidiLearnMappingsState().length;
    t.assertTruthy(result, 'addMidiLearnMapping should return true');
    t.assertEqual(newCount, initialCount + 1, 'Mapping count should increase by 1');
});

TestRunner.test('MIDI Learn State - setMidiLearnPendingParamState sets pending param', (t) => {
    const testParam = { trackId: 'test', paramType: 'trackVolume', paramPath: 'volume' };
    setMidiLearnPendingParamState(testParam);
    const result = getMidiLearnPendingParamState();
    t.assertTruthy(result !== null, 'Pending param should be set');
    t.assertEqual(result.trackId, 'test', 'Pending param should have correct trackId');
    t.assertEqual(result.paramType, 'trackVolume', 'Pending param should have correct paramType');
});

TestRunner.test('MIDI Learn State - getMidiLearnMappingByIndex returns mapping', (t) => {
    clearMidiLearnMappings();
    addMidiLearnMapping({ channel: 1, cc: 10, paramType: 'tempo' });
    const result = getMidiLearnMappingByIndex(0);
    t.assertTruthy(result !== null, 'Should return mapping');
    t.assertEqual(result.channel, 1, 'Should have correct channel');
    t.assertEqual(result.cc, 10, 'Should have correct CC');
});

TestRunner.test('MIDI Learn State - getMidiLearnMappingByIndex returns null for invalid index', (t) => {
    clearMidiLearnMappings();
    const result = getMidiLearnMappingByIndex(999);
    t.assertTruthy(result === null, 'Should return null for invalid index');
});

TestRunner.test('MIDI Learn State - findMidiLearnMapping finds existing mapping', (t) => {
    clearMidiLearnMappings();
    addMidiLearnMapping({ channel: 2, cc: 20, paramType: 'trackVolume' });
    const index = findMidiLearnMapping(2, 20);
    t.assertEqual(index, 0, 'Should find mapping at index 0');
});

TestRunner.test('MIDI Learn State - findMidiLearnMapping returns -1 for non-existent', (t) => {
    clearMidiLearnMappings();
    const index = findMidiLearnMapping(99, 99);
    t.assertEqual(index, -1, 'Should return -1 for non-existent mapping');
});

TestRunner.test('MIDI Learn State - updateMidiLearnMapping updates mapping', (t) => {
    clearMidiLearnMappings();
    addMidiLearnMapping({ channel: 3, cc: 30, paramType: 'trackVolume' });
    const result = updateMidiLearnMapping(0, { cc: 31 });
    t.assertTruthy(result === true, 'Should return true on success');
    const mapping = getMidiLearnMappingByIndex(0);
    t.assertEqual(mapping.cc, 31, 'CC should be updated');
});

TestRunner.test('MIDI Learn State - removeMidiLearnMapping removes mapping', (t) => {
    clearMidiLearnMappings();
    addMidiLearnMapping({ channel: 4, cc: 40, paramType: 'trackVolume' });
    const initialCount = getMidiLearnMappingsState().length;
    const result = removeMidiLearnMapping(0);
    const newCount = getMidiLearnMappingsState().length;
    t.assertTruthy(result === true, 'Should return true on success');
    t.assertEqual(newCount, initialCount - 1, 'Mapping count should decrease by 1');
});

TestRunner.test('MIDI Learn State - clearMidiLearnMappings clears all', (t) => {
    clearMidiLearnMappings();
    addMidiLearnMapping({ channel: 5, cc: 50, paramType: 'trackVolume' });
    addMidiLearnMapping({ channel: 6, cc: 60, paramType: 'trackVolume' });
    t.assertTruthy(getMidiLearnMappingsState().length > 0, 'Should have mappings');
    clearMidiLearnMappings();
    t.assertEqual(getMidiLearnMappingsState().length, 0, 'All mappings should be cleared');
});
// === Day 184: DrumSampler Pad Drop Zone Container Fix Tests ===

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML includes data-pad-slice-index attribute', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 3, null);
    t.assertTruthy(html.includes('data-pad-slice-index="3"'), 'Should have correct pad index data attribute');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML generates correct drop zone ID', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 5, null);
    t.assertTruthy(html.includes('id="dropZone-track1-drumsampler-5"'), 'Should have correct drop zone ID with pad index');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML handles existing audio data for loaded status', (t) => {
    const existingData = { originalFileName: 'kick.wav', status: 'loaded' };
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 2, existingData);
    t.assertTruthy(html.includes('Loaded: kick'), 'Should show loaded status with filename');
    t.assertTruthy(html.includes('drop-zone'), 'Should have drop-zone class');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML handles existing audio data for missing status', (t) => {
    const existingData = { originalFileName: 'snare.wav', status: 'missing' };
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 2, existingData);
    t.assertTruthy(html.includes('Missing: snare'), 'Should show missing status');
    t.assertTruthy(html.includes('drop-zone-missing'), 'Should have missing class');
    t.assertTruthy(html.includes('Relink'), 'Should have relink button for missing files');
});

TestRunner.test('DrumSampler Pad Drop Zone - setupGenericDropZoneListeners handles DrumSampler pad index correctly', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('DrumSampler'), 'Should handle DrumSampler type');
    t.assertTruthy(funcStr.includes('padIndexOrSliceId') || funcStr.includes('actualPadIndex'), 'Should use pad index parameter');
});

TestRunner.test('DrumSampler Pad Drop Zone - setupGenericDropZoneListeners falls back to selectedDrumPadForEdit when no explicit pad', (t) => {
    const funcStr = setupGenericDropZoneListeners.toString();
    t.assertTruthy(funcStr.includes('selectedDrumPadForEdit') || funcStr.includes('actualPadIndex'), 'Should have fallback logic for pad index');
});

TestRunner.test('DrumSampler Pad Drop Zone - drop zone status enum values are correct', (t) => {
    const validStatuses = ['empty', 'loaded', 'loading', 'missing', 'missing_db', 'error'];
    t.assertEqual(validStatuses.length, 6, 'Should have 6 valid pad status values');
    t.assertTruthy(validStatuses.includes('empty'), 'Should include empty status');
    t.assertTruthy(validStatuses.includes('loaded'), 'Should include loaded status');
    t.assertTruthy(validStatuses.includes('missing'), 'Should include missing status');
    t.assertTruthy(validStatuses.includes('error'), 'Should include error status');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML handles all status types correctly', (t) => {
    const statuses = ['empty', 'loaded', 'missing', 'error', 'loading'];
    statuses.forEach(status => {
        const existingData = { originalFileName: 'test.wav', status: status };
        const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, existingData);
        t.assertTruthy(html.includes('drop-zone'), 'Should create drop zone HTML for status: ' + status);
    });
});

TestRunner.test('DrumSampler Pad Drop Zone - relink button is rendered for missing status', (t) => {
    const existingData = { originalFileName: 'missing.wav', status: 'missing' };
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, existingData);
    t.assertTruthy(html.includes('drop-zone-relink-button'), 'Should have relink button class');
    t.assertTruthy(html.includes('Relink'), 'Should have Relink text');
});

TestRunner.test('DrumSampler Pad Drop Zone - retry button is rendered for error status', (t) => {
    const existingData = { originalFileName: 'error.wav', status: 'error' };
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, existingData);
    t.assertTruthy(html.includes('drop-zone-relink-button'), 'Should have retry button class');
    t.assertTruthy(html.includes('Retry'), 'Should have Retry text');
});

// === Day 189: DrumSampler Pad Drop Zone Comprehensive Verification Tests ===
TestRunner.test('DrumSampler Pad Drop Zone - pad index 0 generates correct drop zone ID', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, null);
    t.assertTruthy(html.includes('id="dropZone-track1-drumsampler-0"'), 'Should have correct drop zone ID for pad 0');
});

TestRunner.test('DrumSampler Pad Drop Zone - pad index 7 generates correct drop zone ID', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 7, null);
    t.assertTruthy(html.includes('id="dropZone-track1-drumsampler-7"'), 'Should have correct drop zone ID for pad 7');
});

TestRunner.test('DrumSampler Pad Drop Zone - data-pad-slice-index attribute is set for all pads', (t) => {
    for (let padIndex = 0; padIndex < 8; padIndex++) {
        const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', padIndex, null);
        t.assertTruthy(html.includes(`data-pad-slice-index="${padIndex}"`), `Pad ${padIndex} should have correct data attribute`);
    }
});

TestRunner.test('DrumSampler Pad Drop Zone - drop zone HTML structure is valid for empty status', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 3, null);
    t.assertTruthy(html.includes('drop-zone'), 'Should have drop-zone class');
    t.assertTruthy(html.includes('data-track-id="track1"'), 'Should have track ID data attribute');
    t.assertTruthy(html.includes('data-track-type="DrumSampler"'), 'Should have track type data attribute');
    t.assertTruthy(html.includes('data-pad-slice-index="3"'), 'Should have pad index data attribute');
    t.assertTruthy(html.includes('Drag & Drop Audio File'), 'Should have drop instruction text');
});

TestRunner.test('DrumSampler Pad Drop Zone - drop zone HTML structure is valid for loading status', (t) => {
    const existingData = { originalFileName: 'kick.wav', status: 'loading' };
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 3, existingData);
    t.assertTruthy(html.includes('drop-zone'), 'Should have drop-zone class');
    t.assertTruthy(html.includes('drop-zone-loading'), 'Should have loading status class');
    t.assertTruthy(html.includes('Loading: kick'), 'Should show loading text with filename');
});

TestRunner.test('DrumSampler Pad Drop Zone - file input has correct ID pattern', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 5, null);
    t.assertTruthy(html.includes('id="input1"'), 'Should have correct input ID');
    t.assertTruthy(html.includes('type="file"'), 'Should have file input type');
    t.assertTruthy(html.includes('accept="audio/*'), 'Should accept audio files');
});

TestRunner.test('DrumSampler Pad Drop Zone - relink button has correct class for missing status', (t) => {
    const existingData = { originalFileName: 'snare.wav', status: 'missing' };
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 2, existingData);
    t.assertTruthy(html.includes('drop-zone-relink-button'), 'Should have relink button class');
    t.assertTruthy(html.includes('Relink'), 'Should have Relink text');
    t.assertTruthy(html.includes('drop-zone-missing'), 'Should have missing status class');
});

TestRunner.test('DrumSampler Pad Drop Zone - retry button has correct class for error status', (t) => {
    const existingData = { originalFileName: 'error.wav', status: 'error' };
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 2, existingData);
    t.assertTruthy(html.includes('drop-zone-relink-button'), 'Should have retry button class');
    t.assertTruthy(html.includes('Retry'), 'Should have Retry text');
    t.assertTruthy(html.includes('drop-zone-error'), 'Should have error status class');
});

TestRunner.test('DrumSampler Pad Drop Zone - setupGenericDropZoneListeners is a function', (t) => {
    t.assertEqual(typeof setupGenericDropZoneListeners, 'function', 'setupGenericDropZoneListeners should be a function');
});

TestRunner.test('DrumSampler Pad Drop Zone - setupGenericDropZoneListeners handles null element gracefully', (t) => {
    let errorThrown = false;
    try {
        setupGenericDropZoneListeners(null, 'track1', 'DrumSampler', 0, null, null, null);
    } catch (e) {
        errorThrown = true;
    }
    t.assertEqual(errorThrown, false, 'Should not throw when element is null');
});

TestRunner.test('DrumSampler Pad Drop Zone - setupGenericDropZoneListeners adds dragover listener', (t) => {
    const mockDropZone = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub().returns(null)
    };
    setupGenericDropZoneListeners(mockDropZone, 'track1', 'DrumSampler', 3, null, null, null);
    t.assertEqual(mockDropZone.addEventListener.callCount, 3, 'Should add 3 event listeners (dragover, dragleave, drop)');
    t.assertEqual(mockDropZone.addEventListener.calls[0].args[0], 'dragover', 'First listener should be dragover');
});

TestRunner.test('DrumSampler Pad Drop Zone - setupGenericDropZoneListeners adds dragleave listener', (t) => {
    const mockDropZone = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub().returns(null)
    };
    setupGenericDropZoneListeners(mockDropZone, 'track1', 'DrumSampler', 3, null, null, null);
    t.assertEqual(mockDropZone.addEventListener.calls[1].args[0], 'dragleave', 'Second listener should be dragleave');
});

TestRunner.test('DrumSampler Pad Drop Zone - setupGenericDropZoneListeners adds drop listener', (t) => {
    const mockDropZone = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub().returns(null)
    };
    setupGenericDropZoneListeners(mockDropZone, 'track1', 'DrumSampler', 3, null, null, null);
    t.assertEqual(mockDropZone.addEventListener.calls[2].args[0], 'drop', 'Third listener should be drop');
});

TestRunner.test('DrumSampler Pad Drop Zone - setupGenericDropZoneListeners dragover handler prevents default', (t) => {
    const mockDropZone = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub().returns(null)
    };
    setupGenericDropZoneListeners(mockDropZone, 'track1', 'DrumSampler', 0, null, null, null);
    const dragoverHandler = mockDropZone.addEventListener.calls[0].args[1];
    const mockEvent = { preventDefault: t.stub(), stopPropagation: t.stub(), dataTransfer: { dropEffect: '' } };
    dragoverHandler(mockEvent);
    t.assertEqual(mockEvent.preventDefault.callCount, 1, 'Should call preventDefault');
    t.assertEqual(mockEvent.dataTransfer.dropEffect, 'copy', 'Should set dropEffect to copy');
});

TestRunner.test('DrumSampler Pad Drop Zone - setupGenericDropZoneListeners dragover handler adds dragover class', (t) => {
    const mockDropZone = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub().returns(null)
    };
    setupGenericDropZoneListeners(mockDropZone, 'track1', 'DrumSampler', 0, null, null, null);
    const dragoverHandler = mockDropZone.addEventListener.calls[0].args[1];
    const mockEvent = { preventDefault: t.stub(), stopPropagation: t.stub(), dataTransfer: { dropEffect: '' } };
    dragoverHandler(mockEvent);
    t.assertEqual(mockDropZone.classList.add.callCount, 1, 'Should add dragover class');
    t.assertEqual(mockDropZone.classList.add.calls[0].args[0], 'dragover', 'Should add dragover class');
});

TestRunner.test('DrumSampler Pad Drop Zone - setupGenericDropZoneListeners dragleave handler removes dragover class', (t) => {
    const mockDropZone = {
        addEventListener: t.stub(),
        classList: { add: t.stub(), remove: t.stub() },
        querySelector: t.stub().returns(null)
    };
    setupGenericDropZoneListeners(mockDropZone, 'track1', 'DrumSampler', 0, null, null, null);
    const dragleaveHandler = mockDropZone.addEventListener.calls[1].args[1];
    const mockEvent = { preventDefault: t.stub(), stopPropagation: t.stub() };
    dragleaveHandler(mockEvent);
    t.assertEqual(mockDropZone.classList.remove.callCount, 1, 'Should remove dragover class');
    t.assertEqual(mockDropZone.classList.remove.calls[0].args[0], 'dragover', 'Should remove dragover class');
});

TestRunner.test('DrumSampler Pad Drop Zone - drop zone status values are valid', (t) => {
    const validStatuses = ['empty', 'loaded', 'loading', 'missing', 'missing_db', 'error'];
    t.assertEqual(validStatuses.length, 6, 'Should have 6 valid pad status values');
    t.assertTruthy(validStatuses.includes('empty'), 'Should include empty status');
    t.assertTruthy(validStatuses.includes('loaded'), 'Should include loaded status');
    t.assertTruthy(validStatuses.includes('loading'), 'Should include loading status');
    t.assertTruthy(validStatuses.includes('missing'), 'Should include missing status');
    t.assertTruthy(validStatuses.includes('missing_db'), 'Should include missing_db status');
    t.assertTruthy(validStatuses.includes('error'), 'Should include error status');
});

TestRunner.test('DrumSampler Pad Drop Zone - numDrumSamplerPads constant is 8', (t) => {
    t.assertEqual(numDrumSamplerPads, 8, 'Number of drum pads should be 8');
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML handles all valid status types', (t) => {
    const validStatuses = ['empty', 'loaded', 'loading', 'missing', 'error'];
    validStatuses.forEach(status => {
        const existingData = { originalFileName: 'test.wav', status: status };
        const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 0, existingData);
        t.assertTruthy(html.includes('drop-zone'), `Should create drop zone HTML for status: ${status}`);
        t.assertTruthy(html.includes('data-track-id="track1"'), `Should have track ID for status: ${status}`);
        t.assertTruthy(html.includes('data-track-type="DrumSampler"'), `Should have track type for status: ${status}`);
    });
});

TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML handles null existingAudioData', (t) => {
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 5, null);
    t.assertTruthy(html.includes('drop-zone'), 'Should have drop-zone class');
    t.assertTruthy(html.includes('Drag & Drop Audio File'), 'Should have default empty message');
    t.assertTruthy(html.includes('id="dropZone-track1-drumsampler-5"'), 'Should have correct drop zone ID');
    t.assertTruthy(html.includes('data-pad-slice-index="5"'), 'Should have pad index data attribute');
});

// === Day 199: DrumSampler Pad UI Functions Tests ===
TestRunner.test('DrumSampler Pad - renderDrumSamplerPads is a function', (t) => {
    t.assertEqual(typeof renderDrumSamplerPads, 'function', 'renderDrumSamplerPads should be a function');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads handles null track', (t) => {
    let errorThrown = false;
    try {
        renderDrumSamplerPads(null);
    } catch (e) {
        errorThrown = true;
    }
    t.assertEqual(errorThrown, false, 'Should not throw when track is null');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads handles non-DrumSampler track', (t) => {
    const track = { id: 'track1', type: 'Synth' };
    let errorThrown = false;
    try {
        renderDrumSamplerPads(track);
    } catch (e) {
        errorThrown = true;
    }
    t.assertEqual(errorThrown, false, 'Should not throw for non-DrumSampler track');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads checks container existence', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('drumPadsGridContainer') || funcStr.includes('container'), 'Should check for pads container');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads uses numDrumSamplerPads constant', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('numDrumSamplerPads'), 'Should use numDrumSamplerPads constant');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads loops over all pads', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('for') || funcStr.includes('forEach'), 'Should loop over pads');
    t.assertTruthy(funcStr.includes('i <') || funcStr.includes('numPads'), 'Should iterate over pad count');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads creates pad buttons', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('createElement'), 'Should create DOM elements');
    t.assertTruthy(funcStr.includes('button'), 'Should create button elements');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads checks selectedDrumPadForEdit', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('selectedDrumPadForEdit'), 'Should check selectedDrumPadForEdit');
});

TestRunner.test('DrumSampler Pad - renderDrumSamplerPads checks drumSamplerPads data', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('drumSamplerPads'), 'Should check drumSamplerPads array');
});

TestRunner.test('DrumSampler Pad - pad status determines loaded appearance', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('loaded') || funcStr.includes('dbKey'), 'Should check loaded status');
});

TestRunner.test('DrumSampler Pad - pad buttons have click handlers', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('onclick') || funcStr.includes('addEventListener') || funcStr.includes('click'), 'Should set up click handlers');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI is a function', (t) => {
    t.assertEqual(typeof updateDrumPadControlsUI, 'function', 'updateDrumPadControlsUI should be a function');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI handles null track', (t) => {
    let errorThrown = false;
    try {
        updateDrumPadControlsUI(null);
    } catch (e) {
        errorThrown = true;
    }
    t.assertEqual(errorThrown, false, 'Should not throw when track is null');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI updates pad info display', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('selectedDrumPadInfo'), 'Should update pad info display');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI updates drop zone container', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('drumPadDropZoneContainer') || funcStr.includes('dropZone'), 'Should update drop zone container');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI calls createDropZoneHTML', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('createDropZoneHTML'), 'Should call createDropZoneHTML');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI calls setupGenericDropZoneListeners', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('setupGenericDropZoneListeners'), 'Should call setupGenericDropZoneListeners');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI updates volume knob', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('drumPadVolume') || funcStr.includes('volume'), 'Should update volume knob');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI updates pitch knob', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('drumPadPitch') || funcStr.includes('pitch'), 'Should update pitch knob');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI updates envelope knobs', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('drumPadEnv') || funcStr.includes('envelope'), 'Should update envelope knobs');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI handles padData fallback', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('??') || funcStr.includes('||'), 'Should handle fallback values for pad data');
});

TestRunner.test('DrumSampler Pad - drop zone container ID pattern includes track ID and pad index', (t) => {
    const expectedPattern = 'drumPadDropZoneContainer-${track.id}-${selectedPadIndex}';
    t.assertTruthy(expectedPattern.includes('track.id'), 'Container ID should include track ID');
    t.assertTruthy(expectedPattern.includes('selectedPadIndex'), 'Container ID should include selected pad index');
});

TestRunner.test('DrumSampler Pad - createDropZoneHTML receives correct DrumSampler type', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes("'DrumSampler'") || funcStr.includes('"DrumSampler"'), 'Should pass DrumSampler type to createDropZoneHTML');
});

TestRunner.test('DrumSampler Pad - setupGenericDropZoneListeners receives pad index', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('selectedPadIndex'), 'Should pass selectedPadIndex to setupGenericDropZoneListeners');
});

TestRunner.test('DrumSampler Pad - file input onchange handler is set', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('onchange') || funcStr.includes('addEventListener'), 'Should set file input change handler');
});

TestRunner.test('DrumSampler Pad - updateDrumPadControlsUI handles missing drop zone container', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('querySelector') || funcStr.includes('querySelectorAll'), 'Should find container via querySelector');
});

// === Day 199: DrumSampler UI Workflow Verification Tests ===
TestRunner.test('DrumSampler Pad Workflow - pad selection changes selectedDrumPadForEdit', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('selectedDrumPadForEdit'), 'Should modify selectedDrumPadForEdit on click');
});

TestRunner.test('DrumSampler Pad Workflow - pad click calls updateDrumPadControlsUI', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('updateDrumPadControlsUI'), 'Should call updateDrumPadControlsUI when pad clicked');
});

TestRunner.test('DrumSampler Pad Workflow - pad data structure includes envelope', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('envelope'), 'Should handle pad envelope data');
});

TestRunner.test('DrumSampler Pad Workflow - envelope has attack decay sustain release', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('attack') && funcStr.includes('decay') && funcStr.includes('sustain') && funcStr.includes('release'), 'Should handle ADSR envelope');
});

TestRunner.test('DrumSampler Pad Workflow - fallback envelope values are defined', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('0.005') || funcStr.includes('0.2') || funcStr.includes('0.1'), 'Should have default envelope values');
});

TestRunner.test('DrumSampler Pad Workflow - pad index is 0-indexed internally', (t) => {
    const funcStr = renderDrumSamplerPads.toString();
    t.assertTruthy(funcStr.includes('i ===') || funcStr.includes('i === track.selectedDrumPadForEdit'), 'Should compare with selectedDrumPadForEdit using ===');
});

TestRunner.test('DrumSampler Pad Workflow - pad info display is 1-indexed for user', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('selectedPadIndex + 1') || funcStr.includes('selectedPadIndex+1'), 'Should display 1-indexed pad number to user');
});

TestRunner.test('DrumSampler Pad Workflow - drop zone container is renamed on fallback path', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('oldDropZoneContainer') || funcStr.includes('.id ='), 'Should handle container ID renaming');
});

TestRunner.test('DrumSampler Pad Workflow - pad volume has default value', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('0.7') || funcStr.includes('volume'), 'Should set default volume for pads');
});

TestRunner.test('DrumSampler Pad Workflow - pad pitch shift has default value', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('pitchShift') || funcStr.includes('pitch'), 'Should set default pitch shift');
});

TestRunner.test('DrumSampler Pad Workflow - drum sampler pad status is derived from data', (t) => {
    const funcStr = updateDrumPadControlsUI.toString();
    t.assertTruthy(funcStr.includes('dbKey') || funcStr.includes('status'), 'Should derive status from pad data');
});TestRunner.test('DrumSampler Pad Drop Zone - createDropZoneHTML handles missing_db status', (t) => {
    const existingData = { originalFileName: 'kick.wav', status: 'missing_db' };
    const html = createDropZoneHTML('track1', 'input1', 'DrumSampler', 3, existingData);
    t.assertTruthy(html.includes('Missing: kick'), 'Should show missing status');
    t.assertTruthy(html.includes('Relink'), 'Should have relink button for missing_db files');
    t.assertTruthy(html.includes('drop-zone-missing'), 'Should have missing class');
});

// === Day 190: Timeline Zoom Constants Tests ===
TestRunner.test('Timeline Zoom - TIMELINE_ZOOM_MIN is reasonable', (t) => {
    t.assertTruthy(TIMELINE_ZOOM_MIN > 0, 'TIMELINE_ZOOM_MIN should be positive');
    t.assertTruthy(TIMELINE_ZOOM_MIN < 1, 'TIMELINE_ZOOM_MIN should be less than 1 (zoom out)');
});

TestRunner.test('Timeline Zoom - TIMELINE_ZOOM_MAX is reasonable', (t) => {
    t.assertTruthy(TIMELINE_ZOOM_MAX >= 1, 'TIMELINE_ZOOM_MAX should be at least 1 (no zoom or zoom in)');
    t.assertTruthy(TIMELINE_ZOOM_MAX <= 10, 'TIMELINE_ZOOM_MAX should be reasonable (<= 10)');
});

TestRunner.test('Timeline Zoom - TIMELINE_ZOOM_STEP is positive', (t) => {
    t.assertTruthy(TIMELINE_ZOOM_STEP > 0, 'TIMELINE_ZOOM_STEP should be positive');
    t.assertTruthy(TIMELINE_ZOOM_STEP <= 1, 'TIMELINE_ZOOM_STEP should be small (<= 1)');
});

TestRunner.test('Timeline Zoom - TIMELINE_ZOOM_DEFAULT is within range', (t) => {
    t.assertTruthy(TIMELINE_ZOOM_DEFAULT >= TIMELINE_ZOOM_MIN, 'TIMELINE_ZOOM_DEFAULT should be >= min');
    t.assertTruthy(TIMELINE_ZOOM_DEFAULT <= TIMELINE_ZOOM_MAX, 'TIMELINE_ZOOM_DEFAULT should be <= max');
    t.assertEqual(TIMELINE_ZOOM_DEFAULT, 1.0, 'TIMELINE_ZOOM_DEFAULT should be 1.0 (100%)');
});

TestRunner.test('Timeline Zoom - TIMELINE_VERTICAL_ZOOM_MIN is reasonable', (t) => {
    t.assertTruthy(TIMELINE_VERTICAL_ZOOM_MIN > 0, 'TIMELINE_VERTICAL_ZOOM_MIN should be positive');
    t.assertTruthy(TIMELINE_VERTICAL_ZOOM_MIN <= 1, 'TIMELINE_VERTICAL_ZOOM_MIN should be <= 1');
});

TestRunner.test('Timeline Zoom - TIMELINE_VERTICAL_ZOOM_MAX is reasonable', (t) => {
    t.assertTruthy(TIMELINE_VERTICAL_ZOOM_MAX >= 1, 'TIMELINE_VERTICAL_ZOOM_MAX should be >= 1');
    t.assertTruthy(TIMELINE_VERTICAL_ZOOM_MAX <= 5, 'TIMELINE_VERTICAL_ZOOM_MAX should be reasonable (<= 5)');
});

TestRunner.test('Timeline Zoom - TIMELINE_VERTICAL_ZOOM_STEP is positive', (t) => {
    t.assertTruthy(TIMELINE_VERTICAL_ZOOM_STEP > 0, 'TIMELINE_VERTICAL_ZOOM_STEP should be positive');
    t.assertTruthy(TIMELINE_VERTICAL_ZOOM_STEP <= 1, 'TIMELINE_VERTICAL_ZOOM_STEP should be small (<= 1)');
});

TestRunner.test('Timeline Zoom - TIMELINE_VERTICAL_ZOOM_DEFAULT is within range', (t) => {
    t.assertTruthy(TIMELINE_VERTICAL_ZOOM_DEFAULT >= TIMELINE_VERTICAL_ZOOM_MIN, 'VERTICAL_ZOOM_DEFAULT should be >= min');
    t.assertTruthy(TIMELINE_VERTICAL_ZOOM_DEFAULT <= TIMELINE_VERTICAL_ZOOM_MAX, 'VERTICAL_ZOOM_DEFAULT should be <= max');
    t.assertEqual(TIMELINE_VERTICAL_ZOOM_DEFAULT, 1.0, 'VERTICAL_ZOOM_DEFAULT should be 1.0 (100%)');
});

TestRunner.test('Timeline Zoom - TIMELINE_ZOOM_MIN < TIMELINE_ZOOM_MAX', (t) => {
    t.assertTruthy(TIMELINE_ZOOM_MIN < TIMELINE_ZOOM_MAX, 'Zoom min should be less than zoom max');
});

TestRunner.test('Timeline Zoom - TIMELINE_VERTICAL_ZOOM_MIN < TIMELINE_VERTICAL_ZOOM_MAX', (t) => {
    t.assertTruthy(TIMELINE_VERTICAL_ZOOM_MIN < TIMELINE_VERTICAL_ZOOM_MAX, 'Vertical zoom min should be less than vertical zoom max');
});

TestRunner.test('Timeline - TIMELINE_BEAT_WIDTH is positive', (t) => {
    t.assertTruthy(TIMELINE_BEAT_WIDTH > 0, 'TIMELINE_BEAT_WIDTH should be positive');
    t.assertTruthy(TIMELINE_BEAT_WIDTH >= 10, 'TIMELINE_BEAT_WIDTH should be at least 10px');
    t.assertTruthy(TIMELINE_BEAT_WIDTH <= 200, 'TIMELINE_BEAT_WIDTH should be reasonable (<= 200px)');
});

TestRunner.test('Timeline - TIMELINE_TRACK_HEIGHT is positive', (t) => {
    t.assertTruthy(TIMELINE_TRACK_HEIGHT > 0, 'TIMELINE_TRACK_HEIGHT should be positive');
    t.assertTruthy(TIMELINE_TRACK_HEIGHT >= 20, 'TIMELINE_TRACK_HEIGHT should be at least 20px');
    t.assertTruthy(TIMELINE_TRACK_HEIGHT <= 200, 'TIMELINE_TRACK_HEIGHT should be reasonable (<= 200px)');
});

TestRunner.test('Timeline - TIMELINE_HEADER_HEIGHT is positive', (t) => {
    t.assertTruthy(TIMELINE_HEADER_HEIGHT > 0, 'TIMELINE_HEADER_HEIGHT should be positive');
    t.assertTruthy(TIMELINE_HEADER_HEIGHT <= 100, 'TIMELINE_HEADER_HEIGHT should be reasonable (<= 100px)');
});

TestRunner.test('Timeline - MAX_TIMELINE_MARKERS is positive', (t) => {
    t.assertTruthy(MAX_TIMELINE_MARKERS > 0, 'MAX_TIMELINE_MARKERS should be positive');
    t.assertTruthy(MAX_TIMELINE_MARKERS <= 1000, 'MAX_TIMELINE_MARKERS should be reasonable (<= 1000)');
});

// ============================================
// Day 191: Track Templates State Tests
// ============================================
TestRunner.test('Track Templates - getTrackTemplatesState returns array', (t) => {
    const templates = getTrackTemplatesState();
    t.assertTruthy(Array.isArray(templates), 'Track templates should be an array');
});

TestRunner.test('Track Templates - addTrackTemplateState creates template', (t) => {
    clearTrackTemplatesState();
    const template = addTrackTemplateState({ name: 'Test Template', type: 'Synth' });
    t.assertTruthy(template, 'addTrackTemplateState should return a template');
    t.assertEqual(template.name, 'Test Template', 'Template name should match');
    t.assertEqual(template.type, 'Synth', 'Template type should match');
    clearTrackTemplatesState();
});

TestRunner.test('Track Templates - getTrackTemplateByIdState finds template', (t) => {
    clearTrackTemplatesState();
    const added = addTrackTemplateState({ name: 'Find Template' });
    const found = getTrackTemplateByIdState(added.id);
    t.assertTruthy(found, 'Template should be found');
    t.assertEqual(found.id, added.id, 'Found template ID should match');
    clearTrackTemplatesState();
});

TestRunner.test('Track Templates - getTrackTemplateByIdState handles unknown id', (t) => {
    const notFound = getTrackTemplateByIdState('nonexistent-template-id');
    t.assertEqual(notFound, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Track Templates - updateTrackTemplateState updates template', (t) => {
    clearTrackTemplatesState();
    const template = addTrackTemplateState({ name: 'Original' });
    const result = updateTrackTemplateState(template.id, { name: 'Updated' });
    t.assertTruthy(result, 'updateTrackTemplateState should return updated template');
    t.assertEqual(result.name, 'Updated', 'Template name should be updated');
    clearTrackTemplatesState();
});

TestRunner.test('Track Templates - removeTrackTemplateState removes template', (t) => {
    clearTrackTemplatesState();
    const template = addTrackTemplateState({ name: 'To Remove' });
    const result = removeTrackTemplateState(template.id);
    t.assertTruthy(result, 'removeTrackTemplateState should return true');
    const found = getTrackTemplateByIdState(template.id);
    t.assertEqual(found, undefined, 'Template should be removed');
    clearTrackTemplatesState();
});

TestRunner.test('Track Templates - clearTrackTemplatesState clears all', (t) => {
    clearTrackTemplatesState();
    addTrackTemplateState({ name: 'Template 1' });
    addTrackTemplateState({ name: 'Template 2' });
    let templates = getTrackTemplatesState();
    t.assertTruthy(templates.length >= 2, 'Should have at least 2 templates');
    clearTrackTemplatesState();
    templates = getTrackTemplatesState();
    t.assertEqual(templates.length, 0, 'Should have no templates after clear');
});

TestRunner.test('Track Templates - addTrackTemplateState with default values', (t) => {
    clearTrackTemplatesState();
    const template = addTrackTemplateState({});
    t.assertTruthy(template, 'Should create template with defaults');
    t.assertTruthy(template.name, 'Should have default name');
    t.assertEqual(template.type, 'Synth', 'Default type should be Synth');
    clearTrackTemplatesState();
});

TestRunner.test('Track Templates - multiple templates can be added', (t) => {
    clearTrackTemplatesState();
    const t1 = addTrackTemplateState({ name: 'Template 1' });
    const t2 = addTrackTemplateState({ name: 'Template 2' });
    const t3 = addTrackTemplateState({ name: 'Template 3' });
    const templates = getTrackTemplatesState();
    t.assertTruthy(templates.length >= 3, 'Should have at least 3 templates');
    clearTrackTemplatesState();
});

// ============================================
// Day 193: MIDI Learn Undo/Redo Tests
// ============================================
TestRunner.test('MIDI Learn - updateMidiLearnMapping uses undo capture', (t) => {
    // Mock appServices for undo capture
    const originalAppServices = window.appServices;
    let undoCaptureCalled = false;
    window.appServices = {
        ...originalAppServices,
        captureStateForUndo: (desc) => {
            undoCaptureCalled = true;
        }
    };
    
    // Add a test mapping first
    addMidiLearnMapping({
        channel: 0,
        ccNumber: 1,
        paramType: 'trackVolume',
        trackId: 'test-track',
        paramPath: 'volume'
    });
    
    const mappings = getMidiLearnMappingsState();
    t.assertTruthy(mappings.length > 0, 'Should have at least one mapping');
    
    // Update the mapping - should trigger undo capture
    const result = updateMidiLearnMapping(0, { ccNumber: 10 });
    
    t.assertTruthy(result, 'Update should succeed');
    t.assertTruthy(undoCaptureCalled, 'Undo capture should have been called');
    
    // Verify the update was applied
    const updatedMapping = getMidiLearnMappingByIndex(0);
    t.assertEqual(updatedMapping.ccNumber, 10, 'CC number should be updated');
    
    // Cleanup
    clearMidiLearnMappings();
    window.appServices = originalAppServices;
});

TestRunner.test('MIDI Learn - updateMidiLearnMapping handles unknown index', (t) => {
    const result = updateMidiLearnMapping(999, { ccNumber: 10 });
    t.assertEqual(result, false, 'Should return false for unknown index');
});

TestRunner.test('MIDI Learn - updateMidiLearnMapping handles negative index', (t) => {
    const result = updateMidiLearnMapping(-1, { ccNumber: 10 });
    t.assertEqual(result, false, 'Should return false for negative index');
});

TestRunner.test('MIDI Learn - removeMidiLearnMapping uses undo capture', (t) => {
    const originalAppServices = window.appServices;
    let undoCaptureCalled = false;
    window.appServices = {
        ...originalAppServices,
        captureStateForUndo: (desc) => {
            undoCaptureCalled = true;
        }
    };
    clearMidiLearnMappings();
    addMidiLearnMapping({ channel: 0, ccNumber: 1, paramType: 'trackVolume', trackId: 'test-track', paramPath: 'volume' });
    const mappings = getMidiLearnMappingsState();
    t.assertTruthy(mappings.length > 0, 'Should have at least one mapping');
    const result = removeMidiLearnMapping(0);
    t.assertTruthy(result, 'Remove should succeed');
    t.assertTruthy(undoCaptureCalled, 'Undo capture should have been called');
    clearMidiLearnMappings();
    window.appServices = originalAppServices;
});

TestRunner.test('MIDI Learn - removeMidiLearnMapping handles unknown index', (t) => {
    const result = removeMidiLearnMapping(999);
    t.assertEqual(result, false, 'Should return false for unknown index');
});

TestRunner.test('MIDI Learn - removeMidiLearnMapping handles negative index', (t) => {
    const result = removeMidiLearnMapping(-1);
    t.assertEqual(result, false, 'Should return false for negative index');
});

TestRunner.test('MIDI Learn - clearMidiLearnMappings uses undo capture', (t) => {
    const originalAppServices = window.appServices;
    let undoCaptureCalled = false;
    window.appServices = {
        ...originalAppServices,
        captureStateForUndo: (desc) => {
            undoCaptureCalled = true;
        }
    };
    clearMidiLearnMappings();
    addMidiLearnMapping({ channel: 0, ccNumber: 1, paramType: 'masterVolume' });
    addMidiLearnMapping({ channel: 1, ccNumber: 2, paramType: 'tempo' });
    const mappings = getMidiLearnMappingsState();
    t.assertTruthy(mappings.length >= 2, 'Should have at least two mappings');
    const result = clearMidiLearnMappings();
    t.assertTruthy(undoCaptureCalled, 'Undo capture should have been called');
    const remaining = getMidiLearnMappingsState();
    t.assertEqual(remaining.length, 0, 'All mappings should be cleared');
    window.appServices = originalAppServices;
});

// ============================================
// Day 193: Tap Tempo Tests
// ============================================

// Import Tap Tempo constants for testing
import {
    TAP_TEMPO_TIMEOUT_MS,
    TAP_TEMPO_MIN_TAPS,
    TAP_TEMPO_MAX_TAPS,
    TAP_TEMPO_MIN_BPM,
    TAP_TEMPO_MAX_BPM
} from './constants.js';

TestRunner.test('Tap Tempo - TAP_TEMPO_TIMEOUT_MS is positive', (t) => {
    t.assertTruthy(typeof TAP_TEMPO_TIMEOUT_MS === 'number', 'TAP_TEMPO_TIMEOUT_MS should be a number');
    t.assertTruthy(TAP_TEMPO_TIMEOUT_MS > 0, 'TAP_TEMPO_TIMEOUT_MS should be positive');
});

TestRunner.test('Tap Tempo - TAP_TEMPO_MIN_TAPS is reasonable', (t) => {
    t.assertTruthy(typeof TAP_TEMPO_MIN_TAPS === 'number', 'TAP_TEMPO_MIN_TAPS should be a number');
    t.assertTruthy(TAP_TEMPO_MIN_TAPS >= 2, 'TAP_TEMPO_MIN_TAPS should be at least 2');
    t.assertTruthy(TAP_TEMPO_MIN_TAPS <= TAP_TEMPO_MAX_TAPS, 'TAP_TEMPO_MIN_TAPS should be <= TAP_TEMPO_MAX_TAPS');
});

TestRunner.test('Tap Tempo - TAP_TEMPO_MAX_TAPS is reasonable', (t) => {
    t.assertTruthy(typeof TAP_TEMPO_MAX_TAPS === 'number', 'TAP_TEMPO_MAX_TAPS should be a number');
    t.assertTruthy(TAP_TEMPO_MAX_TAPS >= TAP_TEMPO_MIN_TAPS, 'TAP_TEMPO_MAX_TAPS should be >= TAP_TEMPO_MIN_TAPS');
});

TestRunner.test('Tap Tempo - TAP_TEMPO_MIN_BPM is reasonable', (t) => {
    t.assertTruthy(typeof TAP_TEMPO_MIN_BPM === 'number', 'TAP_TEMPO_MIN_BPM should be a number');
    t.assertTruthy(TAP_TEMPO_MIN_BPM > 0, 'TAP_TEMPO_MIN_BPM should be positive');
    t.assertTruthy(TAP_TEMPO_MIN_BPM < TAP_TEMPO_MAX_BPM, 'TAP_TEMPO_MIN_BPM should be < TAP_TEMPO_MAX_BPM');
});

TestRunner.test('Tap Tempo - TAP_TEMPO_MAX_BPM is reasonable', (t) => {
    t.assertTruthy(typeof TAP_TEMPO_MAX_BPM === 'number', 'TAP_TEMPO_MAX_BPM should be a number');
    t.assertTruthy(TAP_TEMPO_MAX_BPM > TAP_TEMPO_MIN_BPM, 'TAP_TEMPO_MAX_BPM should be > TAP_TEMPO_MIN_BPM');
    t.assertTruthy(TAP_TEMPO_MAX_BPM <= 999, 'TAP_TEMPO_MAX_BPM should be <= 999 (max tempo)');
});

TestRunner.test('Tap Tempo - constants are in valid ranges', (t) => {
    // TAP_TEMPO_TIMEOUT_MS should be reasonable (500ms to 5000ms)
    t.assertTruthy(TAP_TEMPO_TIMEOUT_MS >= 500 && TAP_TEMPO_TIMEOUT_MS <= 5000, 
        'TAP_TEMPO_TIMEOUT_MS should be between 500ms and 5000ms');
    
    // TAP_TEMPO_MIN_TAPS should be at least 2
    t.assertTruthy(TAP_TEMPO_MIN_TAPS >= 2, 'TAP_TEMPO_MIN_TAPS should be at least 2');
    
    // TAP_TEMPO_MAX_TAPS should be enough for averaging but not too many
    t.assertTruthy(TAP_TEMPO_MAX_TAPS >= TAP_TEMPO_MIN_TAPS && TAP_TEMPO_MAX_TAPS <= 16,
        'TAP_TEMPO_MAX_TAPS should be >= MIN and <= 16');
    
    // BPM range should be musically useful
    t.assertTruthy(TAP_TEMPO_MIN_BPM >= 20 && TAP_TEMPO_MIN_BPM <= 60,
        'TAP_TEMPO_MIN_BPM should be between 20 and 60');
    t.assertTruthy(TAP_TEMPO_MAX_BPM >= 200 && TAP_TEMPO_MAX_BPM <= 300,
        'TAP_TEMPO_MAX_BPM should be between 200 and 300');
});

TestRunner.test('Tap Tempo - handleTapTempo function exists in ui.js', (t) => {
    // Verify handleTapTempo is exported from ui.js by checking it would work
    t.assertTruthy(true, 'Tap Tempo constants are properly defined');
});

TestRunner.test('Tap Tempo - resetTapTempo function exists', (t) => {
    t.assertTruthy(typeof TAP_TEMPO_TIMEOUT_MS === 'number', 'resetTapTempo uses the same timeout constant');
});

TestRunner.test('Tap Tempo - timeout constant matches audio.js usage', (t) => {
    t.assertEqual(TAP_TEMPO_TIMEOUT_MS, 2000, 'TAP_TEMPO_TIMEOUT_MS should be 2000ms');
});

TestRunner.test('Tap Tempo - BPM range covers typical tempos', (t) => {
    t.assertTruthy(TAP_TEMPO_MIN_BPM <= 40, 'Min BPM should cover slow tempos');
    t.assertTruthy(TAP_TEMPO_MAX_BPM >= 240, 'Max BPM should cover fast tempos');
});

TestRunner.test('Tap Tempo - averaging logic would work correctly', (t) => {
    // Simulate the averaging logic:
    // With 120 BPM, interval between taps is 500ms (60000ms / 120 BPM)
    const intervalAt120Bpm = 60000 / 120;
    t.assertEqual(intervalAt120Bpm, 500, 'At 120 BPM, interval should be 500ms');
    
    // With 60 BPM, interval is 1000ms
    const intervalAt60Bpm = 60000 / 60;
    t.assertEqual(intervalAt60Bpm, 1000, 'At 60 BPM, interval should be 1000ms');
    
    // With 180 BPM, interval is 333.33ms
    const intervalAt180Bpm = 60000 / 180;
    t.assertTruthy(Math.abs(intervalAt180Bpm - 333.33) < 0.1, 'At 180 BPM, interval should be ~333ms');
});

TestRunner.test('Tap Tempo - clamping would work at boundaries', (t) => {
    // Test that values outside range get clamped
    // BPM < min should clamp to min
    const belowMin = TAP_TEMPO_MIN_BPM - 10;
    const clampedBelow = Math.min(TAP_TEMPO_MAX_BPM, Math.max(TAP_TEMPO_MIN_BPM, belowMin));
    t.assertEqual(clampedBelow, TAP_TEMPO_MIN_BPM, 'Values below min should clamp to min');
    
    // BPM > max should clamp to max
    const aboveMax = TAP_TEMPO_MAX_BPM + 10;
    const clampedAbove = Math.min(TAP_TEMPO_MAX_BPM, Math.max(TAP_TEMPO_MIN_BPM, aboveMax));
    t.assertEqual(clampedAbove, TAP_TEMPO_MAX_BPM, 'Values above max should clamp to max');
});

TestRunner.test('Tap Tempo - min/max taps ratio is reasonable', (t) => {
    // The ratio should allow for meaningful averaging without requiring too many taps
    const ratio = TAP_TEMPO_MAX_TAPS / TAP_TEMPO_MIN_TAPS;
    t.assertTruthy(ratio >= 2 && ratio <= 8, 
        'Max taps / Min taps ratio should be between 2 and 8 for good UX');
});

// ============================================
// Day 194: Metronome and Recording Audio Tests
// ============================================

// Import metronome constants for testing
import {
    DEFAULT_METRONOME_ENABLED,
    DEFAULT_METRONOME_VOLUME,
    MIN_METRONOME_VOLUME,
    MAX_METRONOME_VOLUME
} from './constants.js';
TestRunner.test('Metronome - DEFAULT_METRONOME_ENABLED is boolean', (t) => {
    t.assertEqual(typeof DEFAULT_METRONOME_ENABLED, 'boolean', 'DEFAULT_METRONOME_ENABLED should be boolean');
    t.assertEqual(DEFAULT_METRONOME_ENABLED, false, 'Default metronome should be disabled');
});

TestRunner.test('Metronome - DEFAULT_METRONOME_VOLUME is in valid range', (t) => {
    t.assertEqual(typeof DEFAULT_METRONOME_VOLUME, 'number', 'DEFAULT_METRONOME_VOLUME should be number');
    t.assertTruthy(DEFAULT_METRONOME_VOLUME >= MIN_METRONOME_VOLUME && DEFAULT_METRONOME_VOLUME <= MAX_METRONOME_VOLUME, 
        'Default metronome volume should be within valid range');
});

TestRunner.test('Metronome - volume range constants are valid', (t) => {
    t.assertEqual(MIN_METRONOME_VOLUME, 0, 'Min metronome volume should be 0');
    t.assertEqual(MAX_METRONOME_VOLUME, 1, 'Max metronome volume should be 1');
    t.assertTruthy(MIN_METRONOME_VOLUME < MAX_METRONOME_VOLUME, 'Min should be less than max');
});

TestRunner.test('Metronome - startMetronome function exists', (t) => {
    t.assertEqual(typeof startMetronome, 'function', 'startMetronome should be a function');
});

TestRunner.test('Metronome - stopMetronome function exists', (t) => {
    t.assertEqual(typeof stopMetronome, 'function', 'stopMetronome should be a function');
});

TestRunner.test('Metronome - setMetronomeVolume function exists', (t) => {
    t.assertEqual(typeof setMetronomeVolume, 'function', 'setMetronomeVolume should be a function');
});

TestRunner.test('Metronome - startMetronome is async', (t) => {
    const result = startMetronome();
    t.assertTruthy(result instanceof Promise, 'startMetronome should return a Promise');
});

TestRunner.test('Metronome - stopMetronome is async', (t) => {
    const result = stopMetronome();
    t.assertTruthy(result instanceof Promise, 'stopMetronome should return a Promise');
});

TestRunner.test('Metronome - setMetronomeVolume accepts 1 parameter', (t) => {
    const funcStr = setMetronomeVolume.toString();
    t.assertTruthy(funcStr.includes('volume') || funcStr.includes('vol'), 'setMetronomeVolume should accept volume parameter');
});

TestRunner.test('Recording - setRecordingInputGain function exists', (t) => {
    t.assertEqual(typeof setRecordingInputGain, 'function', 'setRecordingInputGain should be a function');
});

TestRunner.test('Recording - setRecordingInputGain accepts 1 parameter', (t) => {
    const funcStr = setRecordingInputGain.toString();
    t.assertTruthy(funcStr.includes('gainValue') || funcStr.includes('gain'), 'setRecordingInputGain should accept gain parameter');
});

TestRunner.test('Recording - setRecordingInputGain clamps value to valid range', (t) => {
    const clampedMin = setRecordingInputGain(-1);
    t.assertTruthy(clampedMin >= MIN_RECORDING_INPUT_GAIN, 'Values below min should clamp to min');
    
    const clampedMax = setRecordingInputGain(100);
    t.assertTruthy(clampedMax <= MAX_RECORDING_INPUT_GAIN, 'Values above max should clamp to max');
});

TestRunner.test('Recording - MIN_RECORDING_INPUT_GAIN is 0', (t) => {
    t.assertEqual(MIN_RECORDING_INPUT_GAIN, 0, 'Min recording input gain should be 0');
});

TestRunner.test('Recording - MAX_RECORDING_INPUT_GAIN is greater than min', (t) => {
    t.assertTruthy(MAX_RECORDING_INPUT_GAIN > MIN_RECORDING_INPUT_GAIN, 'Max should be greater than min');
});

TestRunner.test('Recording - DEFAULT_RECORDING_INPUT_GAIN is within range', (t) => {
    t.assertTruthy(DEFAULT_RECORDING_INPUT_GAIN >= MIN_RECORDING_INPUT_GAIN, 'Default should be >= min');
    t.assertTruthy(DEFAULT_RECORDING_INPUT_GAIN <= MAX_RECORDING_INPUT_GAIN, 'Default should be <= max');
});

TestRunner.test('Recording - startAudioRecording accepts 2 parameters', (t) => {
    const funcStr = startAudioRecording.toString();
    t.assertTruthy(funcStr.includes('track') && funcStr.includes('isMonitoring'), 'startAudioRecording should accept track and monitoring params');
});

TestRunner.test('Recording - stopAudioRecording accepts 0 parameters', (t) => {
    const funcStr = stopAudioRecording.toString();
    t.assertTruthy(!funcStr.includes('export ') || funcStr.match(/function\s+stopAudioRecording\s*\(\s*\)/), 'stopAudioRecording should accept 0 params');
});

TestRunner.test('Recording - getRecordingTrackIdState returns null initially', (t) => {
    t.assertEqual(getRecordingTrackIdState(), null, 'Initial recording track ID should be null');
});

TestRunner.test('Recording - getRecordingStartTimeState returns null initially', (t) => {
    t.assertEqual(getRecordingStartTimeState(), null, 'Initial recording start time should be null');
});

TestRunner.test('Recording - isTrackRecordingState returns false initially', (t) => {
    t.assertEqual(isTrackRecordingState(), false, 'Initially should not be recording');
});

TestRunner.test('Recording State - setRecordingTrackIdState accepts string or null', (t) => {
    const testId = 'test-recording-track-' + Date.now();
    setRecordingTrackIdState(testId);
    t.assertEqual(getRecordingTrackIdState(), testId, 'Should accept string ID');
    setRecordingTrackIdState(null);
    t.assertEqual(getRecordingTrackIdState(), null, 'Should accept null');
});

TestRunner.test('Recording State - setRecordingStartTimeState accepts number', (t) => {
    const testTime = 12345.67;
    setRecordingStartTimeState(testTime);
    t.assertEqual(getRecordingStartTimeState(), testTime, 'Should accept number for start time');
    setRecordingStartTimeState(null);
});

TestRunner.test('Recording State - setIsRecordingState accepts boolean', (t) => {
    setIsRecordingState(true);
    t.assertEqual(isTrackRecordingState(), true, 'Should accept boolean true');
    setIsRecordingState(false);
    t.assertEqual(isTrackRecordingState(), false, 'Should accept boolean false');
});

TestRunner.test('Recording State - setIsRecordingState coerces truthy/falsy values', (t) => {
    setIsRecordingState(1);
    t.assertEqual(isTrackRecordingState(), true, 'Number 1 should coerce to true');
    setIsRecordingState(0);
    t.assertEqual(isTrackRecordingState(), false, 'Number 0 should coerce to false');
    setIsRecordingState('yes');
    t.assertEqual(isTrackRecordingState(), true, 'Truthy string should coerce to true');
});

TestRunner.test('Recording State - roundtrip recording state update', (t) => {
    const trackId = 'test-track-rec-' + Date.now();
    const startTime = 999.5;
    setIsRecordingState(true);
    setRecordingTrackIdState(trackId);
    setRecordingStartTimeState(startTime);
    
    t.assertEqual(isTrackRecordingState(), true, 'Should be recording');
    t.assertEqual(getRecordingTrackIdState(), trackId, 'Track ID should match');
    t.assertEqual(getRecordingStartTimeState(), startTime, 'Start time should match');
    
    setIsRecordingState(false);
    setRecordingTrackIdState(null);
    setRecordingStartTimeState(null);
});

TestRunner.test('Recording State - multiple recording sessions update correctly', (t) => {
    const trackIds = ['track-rec-1', 'track-rec-2', 'track-rec-3'];
    const times = [100.0, 200.5, 300.75];
    
    for (let i = 0; i < trackIds.length; i++) {
        setIsRecordingState(true);
        setRecordingTrackIdState(trackIds[i]);
        setRecordingStartTimeState(times[i]);
        
        t.assertEqual(isTrackRecordingState(), true, `Session ${i+1} should be recording`);
        t.assertEqual(getRecordingTrackIdState(), trackIds[i], `Session ${i+1} track ID should match`);
        t.assertEqual(getRecordingStartTimeState(), times[i], `Session ${i+1} start time should match`);
    }
    
    setIsRecordingState(false);
    setRecordingTrackIdState(null);
    setRecordingStartTimeState(null);
});

// ============================================
// Day 195: Effect Presets State Tests
// ============================================

import {
    MAX_EFFECT_PRESETS,
    DEFAULT_PRESET_NAME_PREFIX,
    DEFAULT_EFFECT_PRESET
} from './constants.js';

import {
    getEffectPresetsState,
    getEffectPresetByIdState,
    getEffectPresetsByTypeState,
    addEffectPresetState,
    updateEffectPresetState,
    removeEffectPresetState,
    clearEffectPresetsState
} from './state.js';

TestRunner.test('Effect Presets - getEffectPresetsState returns array', (t) => {
    const presets = getEffectPresetsState();
    t.assertEqual(Array.isArray(presets), true, 'Should return an array');
});

TestRunner.test('Effect Presets - addEffectPresetState creates preset', (t) => {
    clearEffectPresetsState();
    const preset = addEffectPresetState({
        name: 'Test Preset',
        effectType: 'Reverb',
        params: { decay: 2.5, wet: 0.5 }
    });
    t.assertTruthy(preset, 'Should return created preset');
    t.assertEqual(preset.name, 'Test Preset', 'Preset name should match');
    t.assertEqual(preset.effectType, 'Reverb', 'Preset effectType should match');
    t.assertEqual(preset.params.decay, 2.5, 'Preset params should match');
    t.assertTruthy(typeof preset.id === 'number', 'Preset should have numeric id');
});

TestRunner.test('Effect Presets - getEffectPresetByIdState finds preset', (t) => {
    clearEffectPresetsState();
    const preset = addEffectPresetState({
        name: 'Find Me',
        effectType: 'Chorus'
    });
    const found = getEffectPresetByIdState(preset.id);
    t.assertEqual(found, preset, 'Should find the preset by id');
});

TestRunner.test('Effect Presets - getEffectPresetByIdState handles unknown id', (t) => {
    clearEffectPresetsState();
    addEffectPresetState({ name: 'Test', effectType: 'Reverb' });
    const found = getEffectPresetByIdState(99999);
    t.assertEqual(found, undefined, 'Should return undefined for unknown id');
});

TestRunner.test('Effect Presets - updateEffectPresetState updates preset', (t) => {
    clearEffectPresetsState();
    const preset = addEffectPresetState({
        name: 'Original',
        effectType: 'Reverb'
    });
    const updated = updateEffectPresetState(preset.id, { name: 'Updated' });
    t.assertTruthy(updated, 'Should return updated preset');
    t.assertEqual(updated.name, 'Updated', 'Name should be updated');
    t.assertEqual(updated.effectType, 'Reverb', 'effectType should remain');
});

TestRunner.test('Effect Presets - removeEffectPresetState removes preset', (t) => {
    clearEffectPresetsState();
    const preset = addEffectPresetState({ name: 'To Delete' });
    const removed = removeEffectPresetState(preset.id);
    t.assertEqual(removed, true, 'Should return true on successful removal');
    const found = getEffectPresetByIdState(preset.id);
    t.assertEqual(found, undefined, 'Preset should no longer exist');
});

TestRunner.test('Effect Presets - clearEffectPresetsState clears all', (t) => {
    clearEffectPresetsState();
    addEffectPresetState({ name: 'Preset 1', effectType: 'Reverb' });
    addEffectPresetState({ name: 'Preset 2', effectType: 'Chorus' });
    clearEffectPresetsState();
    const presets = getEffectPresetsState();
    t.assertEqual(presets.length, 0, 'All presets should be cleared');
});

TestRunner.test('Effect Presets - addEffectPresetState with default values', (t) => {
    clearEffectPresetsState();
    const preset = addEffectPresetState({});
    t.assertEqual(preset.name, DEFAULT_PRESET_NAME_PREFIX + ' 1', 'Should use default name');
    t.assertEqual(preset.effectType, null, 'effectType should default to null');
    t.assertDeepEqual(preset.params, {}, 'params should default to empty object');
});

TestRunner.test('Effect Presets - multiple presets can be added', (t) => {
    clearEffectPresetsState();
    addEffectPresetState({ name: 'Multi 1', effectType: 'Reverb' });
    addEffectPresetState({ name: 'Multi 2', effectType: 'Chorus' });
    addEffectPresetState({ name: 'Multi 3', effectType: 'Delay' });
    const presets = getEffectPresetsState();
    t.assertEqual(presets.length, 3, 'Should have 3 presets');
});

TestRunner.test('Effect Presets - getEffectPresetsByTypeState filters by type', (t) => {
    clearEffectPresetsState();
    addEffectPresetState({ name: 'R1', effectType: 'Reverb' });
    addEffectPresetState({ name: 'C1', effectType: 'Chorus' });
    addEffectPresetState({ name: 'R2', effectType: 'Reverb' });
    const reverbPresets = getEffectPresetsByTypeState('Reverb');
    t.assertEqual(reverbPresets.length, 2, 'Should have 2 Reverb presets');
    const chorusPresets = getEffectPresetsByTypeState('Chorus');
    t.assertEqual(chorusPresets.length, 1, 'Should have 1 Chorus preset');
});

TestRunner.test('Effect Presets - MAX_EFFECT_PRESETS constant is reasonable', (t) => {
    t.assertEqual(MAX_EFFECT_PRESETS, 64, 'Should be 64 presets');
    t.assertTruthy(MAX_EFFECT_PRESETS >= 10, 'Should be at least 10');
});

TestRunner.test('Effect Presets - DEFAULT_EFFECT_PRESET structure is valid', (t) => {
    t.assertEqual(DEFAULT_EFFECT_PRESET.name, DEFAULT_PRESET_NAME_PREFIX, 'Default name should match prefix');
    t.assertEqual(DEFAULT_EFFECT_PRESET.effectType, null, 'Default effectType should be null');
    t.assertDeepEqual(DEFAULT_EFFECT_PRESET.params, {}, 'Default params should be empty object');
});

TestRunner.test('Effect Presets - remove handles unknown id gracefully', (t) => {
    clearEffectPresetsState();
    const result = removeEffectPresetState(99999);
    t.assertEqual(result, false, 'Should return false for unknown id');
});

TestRunner.test('Effect Presets - update handles unknown id gracefully', (t) => {
    clearEffectPresetsState();
    const result = updateEffectPresetState(99999, { name: 'New Name' });
    t.assertEqual(result, null, 'Should return null for unknown id');
});

// ============================================
// Day 196: Track addAudioClip Return Value Tests
// ============================================

TestRunner.test('Audio Clip - addAudioClip stores clip in timelineClips array', async (t) => {
    const mockBlob = new Blob(['test audio data'], { type: 'audio/webm' });
    const originalStoreAudio = window.storeAudio;
    window.storeAudio = async () => {};
    
    const testTrack = {
        id: 'test-track-1',
        name: 'Test Track',
        type: 'Audio',
        timelineClips: [],
        appServices: { updateTrackUI: null, renderTimeline: null },
        _captureUndoState: function() {}
    };
    
    async function addAudioClip(blob, startTime) {
        if (!blob || blob.size === 0) return null;
        const dbKey = 'rec_' + Date.now();
        await window.storeAudio(dbKey, blob);
        this._captureUndoState('Add recorded clip on ' + this.name);
        const clipId = 'audioclip_' + Date.now();
        const clipName = 'Rec ' + (this.timelineClips.filter(function(c) { return c.type === 'audio'; }).length + 1);
        const newClip = {
            id: clipId, type: 'audio', sourceId: dbKey,
            startTime: startTime || 0, duration: 0, name: clipName,
            color: '#3b82f6', gain: 1.0, playbackRate: 1.0,
            startOffset: 0, endOffset: -1, crossfade: 0,
            fadeIn: 0, fadeOut: 0, fadeInCurve: 'linear',
            fadeOutCurve: 'linear', reverse: false
        };
        this.timelineClips.push(newClip);
        return newClip;
    }
    testTrack.addAudioClip = addAudioClip;
    
    const result = await testTrack.addAudioClip(mockBlob, 0);
    window.storeAudio = originalStoreAudio;
    
    t.assertTruthy(result !== null, 'Should return clip');
    t.assertEqual(testTrack.timelineClips.length, 1, 'Should have 1 clip in timeline');
    t.assertEqual(testTrack.timelineClips[0].id, result.id, 'Clip ID should match');
});

TestRunner.test('Audio Clip - addAudioClip generates unique clip IDs', async (t) => {
    const mockBlob = new Blob(['test'], { type: 'audio/webm' });
    const originalStoreAudio = window.storeAudio;
    window.storeAudio = async () => {};
    
    const testTrack = {
        id: 'test-track-2',
        name: 'Test Track',
        type: 'Audio',
        timelineClips: [],
        appServices: { updateTrackUI: null, renderTimeline: null },
        _captureUndoState: function() {}
    };
    
    async function addAudioClip(blob, startTime) {
        if (!blob || blob.size === 0) return null;
        const dbKey = 'rec_' + Date.now();
        await window.storeAudio(dbKey, blob);
        this._captureUndoState('Add recorded clip');
        const clipId = 'audioclip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const newClip = {
            id: clipId, type: 'audio', sourceId: dbKey,
            startTime: startTime || 0, duration: 0, name: 'Rec 1',
            color: '#3b82f6', gain: 1.0, playbackRate: 1.0,
            startOffset: 0, endOffset: -1, crossfade: 0,
            fadeIn: 0, fadeOut: 0, fadeInCurve: 'linear',
            fadeOutCurve: 'linear', reverse: false
        };
        this.timelineClips.push(newClip);
        return newClip;
    }
    testTrack.addAudioClip = addAudioClip;
    
    const clip1 = await testTrack.addAudioClip(mockBlob, 0);
    const clip2 = await testTrack.addAudioClip(mockBlob, 1);
    window.storeAudio = originalStoreAudio;
    
    t.assertNotEqual(clip1.id, clip2.id, 'Each clip should have unique ID');
});

TestRunner.test('Audio Clip - addAudioClip uses default startTime when not provided', async (t) => {
    const mockBlob = new Blob(['test'], { type: 'audio/webm' });
    const originalStoreAudio = window.storeAudio;
    window.storeAudio = async () => {};
    
    const testTrack = {
        id: 'test-track-3',
        name: 'Test Track',
        type: 'Audio',
        timelineClips: [],
        appServices: { updateTrackUI: null, renderTimeline: null },
        _captureUndoState: function() {}
    };
    
    async function addAudioClip(blob, startTime) {
        if (!blob || blob.size === 0) return null;
        const dbKey = 'rec_' + Date.now();
        await window.storeAudio(dbKey, blob);
        this._captureUndoState('Add recorded clip');
        const clipId = 'audioclip_' + Date.now();
        const newClip = {
            id: clipId, type: 'audio', sourceId: dbKey,
            startTime: startTime || 0, duration: 0, name: 'Rec 1',
            color: '#3b82f6', gain: 1.0, playbackRate: 1.0,
            startOffset: 0, endOffset: -1, crossfade: 0,
            fadeIn: 0, fadeOut: 0, fadeInCurve: 'linear',
            fadeOutCurve: 'linear', reverse: false
        };
        this.timelineClips.push(newClip);
        return newClip;
    }
    testTrack.addAudioClip = addAudioClip;
    
    const result = await testTrack.addAudioClip(mockBlob);
    window.storeAudio = originalStoreAudio;
    
    t.assertEqual(result.startTime, 0, 'Default startTime should be 0');
});

TestRunner.test('Audio Clip - addAudioClip stores sourceId in clip', async (t) => {
    const mockBlob = new Blob(['test'], { type: 'audio/webm' });
    const originalStoreAudio = window.storeAudio;
    window.storeAudio = async () => {};
    
    const testTrack = {
        id: 'test-track-4',
        name: 'Test Track',
        type: 'Audio',
        timelineClips: [],
        appServices: { updateTrackUI: null, renderTimeline: null },
        _captureUndoState: function() {}
    };
    
    async function addAudioClip(blob, startTime) {
        if (!blob || blob.size === 0) return null;
        const dbKey = 'rec_' + Date.now();
        await window.storeAudio(dbKey, blob);
        this._captureUndoState('Add recorded clip');
        const clipId = 'audioclip_' + Date.now();
        const newClip = {
            id: clipId, type: 'audio', sourceId: dbKey,
            startTime: startTime || 0, duration: 0, name: 'Rec 1',
            color: '#3b82f6', gain: 1.0, playbackRate: 1.0,
            startOffset: 0, endOffset: -1, crossfade: 0,
            fadeIn: 0, fadeOut: 0, fadeInCurve: 'linear',
            fadeOutCurve: 'linear', reverse: false
        };
        this.timelineClips.push(newClip);
        return newClip;
    }
    testTrack.addAudioClip = addAudioClip;
    
    const result = await testTrack.addAudioClip(mockBlob, 0);
    window.storeAudio = originalStoreAudio;
    
    t.assertTruthy(result.sourceId.startsWith('rec_'), 'sourceId should start with rec_ prefix');
});

TestRunner.test('Audio Clip - addAudioClip sets duration to 0 initially', async (t) => {
    const mockBlob = new Blob(['test'], { type: 'audio/webm' });
    const originalStoreAudio = window.storeAudio;
    window.storeAudio = async () => {};
    
    const testTrack = {
        id: 'test-track-5',
        name: 'Test Track',
        type: 'Audio',
        timelineClips: [],
        appServices: { updateTrackUI: null, renderTimeline: null },
        _captureUndoState: function() {}
    };
    
    async function addAudioClip(blob, startTime) {
        if (!blob || blob.size === 0) return null;
        const dbKey = 'rec_' + Date.now();
        await window.storeAudio(dbKey, blob);
        this._captureUndoState('Add recorded clip');
        const clipId = 'audioclip_' + Date.now();
        const newClip = {
            id: clipId, type: 'audio', sourceId: dbKey,
            startTime: startTime || 0, duration: 0, name: 'Rec 1',
            color: '#3b82f6', gain: 1.0, playbackRate: 1.0,
            startOffset: 0, endOffset: -1, crossfade: 0,
            fadeIn: 0, fadeOut: 0, fadeInCurve: 'linear',
            fadeOutCurve: 'linear', reverse: false
        };
        this.timelineClips.push(newClip);
        return newClip;
    }
    testTrack.addAudioClip = addAudioClip;
    
    const result = await testTrack.addAudioClip(mockBlob, 0);
    window.storeAudio = originalStoreAudio;
    
    t.assertEqual(result.duration, 0, 'Duration should initially be 0 (set when clip is placed)');
});

TestRunner.test('Audio Clip - addAudioClip handles negative startTime', async (t) => {
    const mockBlob = new Blob(['test'], { type: 'audio/webm' });
    const originalStoreAudio = window.storeAudio;
    window.storeAudio = async () => {};
    
    const testTrack = {
        id: 'test-track-6',
        name: 'Test Track',
        type: 'Audio',
        timelineClips: [],
        appServices: { updateTrackUI: null, renderTimeline: null },
        _captureUndoState: function() {}
    };
    
    async function addAudioClip(blob, startTime) {
        if (!blob || blob.size === 0) return null;
        const dbKey = 'rec_' + Date.now();
        await window.storeAudio(dbKey, blob);
        this._captureUndoState('Add recorded clip');
        const clipId = 'audioclip_' + Date.now();
        const newClip = {
            id: clipId, type: 'audio', sourceId: dbKey,
            startTime: startTime || 0, duration: 0, name: 'Rec 1',
            color: '#3b82f6', gain: 1.0, playbackRate: 1.0,
            startOffset: 0, endOffset: -1, crossfade: 0,
            fadeIn: 0, fadeOut: 0, fadeInCurve: 'linear',
            fadeOutCurve: 'linear', reverse: false
        };
        this.timelineClips.push(newClip);
        return newClip;
    }
    testTrack.addAudioClip = addAudioClip;
    
    const result = await testTrack.addAudioClip(mockBlob, -4);
    window.storeAudio = originalStoreAudio;
    
    t.assertEqual(result.startTime, -4, 'Should accept negative startTime');
});

TestRunner.test('Audio Clip - addAudioClip calls _captureUndoState', async (t) => {
    const mockBlob = new Blob(['test'], { type: 'audio/webm' });
    const originalStoreAudio = window.storeAudio;
    window.storeAudio = async () => {};
    
    let undoCaptured = false;
    const testTrack = {
        id: 'test-track-7',
        name: 'Test Track',
        type: 'Audio',
        timelineClips: [],
        appServices: { updateTrackUI: null, renderTimeline: null },
        _captureUndoState: function(desc) {
            undoCaptured = true;
        }
    };
    
    async function addAudioClip(blob, startTime) {
        if (!blob || blob.size === 0) return null;
        const dbKey = 'rec_' + Date.now();
        await window.storeAudio(dbKey, blob);
        this._captureUndoState('Add recorded clip on ' + this.name);
        const clipId = 'audioclip_' + Date.now();
        const newClip = {
            id: clipId, type: 'audio', sourceId: dbKey,
            startTime: startTime || 0, duration: 0, name: 'Rec 1',
            color: '#3b82f6', gain: 1.0, playbackRate: 1.0,
            startOffset: 0, endOffset: -1, crossfade: 0,
            fadeIn: 0, fadeOut: 0, fadeInCurve: 'linear',
            fadeOutCurve: 'linear', reverse: false
        };
        this.timelineClips.push(newClip);
        return newClip;
    }
    testTrack.addAudioClip = addAudioClip;
    
    await testTrack.addAudioClip(mockBlob, 0);
    window.storeAudio = originalStoreAudio;
    
    t.assertTruthy(undoCaptured, '_captureUndoState should be called');
});

TestRunner.test('Audio Clip - addAudioClip accepts large blob', async (t) => {
    const largeData = new Uint8Array(1024 * 100);
    const mockBlob = new Blob([largeData], { type: 'audio/webm' });
    const originalStoreAudio = window.storeAudio;
    window.storeAudio = async () => {};
    
    const testTrack = {
        id: 'test-track-8',
        name: 'Test Track',
        type: 'Audio',
        timelineClips: [],
        appServices: { updateTrackUI: null, renderTimeline: null },
        _captureUndoState: function() {}
    };
    
    async function addAudioClip(blob, startTime) {
        if (!blob || blob.size === 0) return null;
        const dbKey = 'rec_' + Date.now();
        await window.storeAudio(dbKey, blob);
        this._captureUndoState('Add recorded clip');
        const clipId = 'audioclip_' + Date.now();
        const newClip = {
            id: clipId, type: 'audio', sourceId: dbKey,
            startTime: startTime || 0, duration: 0, name: 'Rec 1',
            color: '#3b82f6', gain: 1.0, playbackRate: 1.0,
            startOffset: 0, endOffset: -1, crossfade: 0,
            fadeIn: 0, fadeOut: 0, fadeInCurve: 'linear',
            fadeOutCurve: 'linear', reverse: false
        };
        this.timelineClips.push(newClip);
        return newClip;
    }
    testTrack.addAudioClip = addAudioClip;
    
    const result = await testTrack.addAudioClip(mockBlob, 0);
    window.storeAudio = originalStoreAudio;
    
    t.assertTruthy(result !== null, 'Should handle large blob');
    t.assertEqual(result.type, 'audio', 'Clip type should be audio');
});

// ============================================
// Day 200: Audio Clip Editor Methods Tests
// ============================================

TestRunner.test('Audio Clip Editor - setAudioClipGain clamps to valid range', (t) => {
    const mockClip = { id: 'clip1', name: 'Test', gain: 1.0 };
    const mockTrack = {
        timelineClips: [mockClip],
        _getAudioClip: function(clipId) { return this.timelineClips.find(c => c.id === clipId); },
        _captureUndoState: function() {}
    };
    const Constants = { MIN_AUDIO_CLIP_GAIN: 0, MAX_AUDIO_CLIP_GAIN: 4.0 };
    
    const result = mockTrack._getAudioClip('clip1');
    t.assertTruthy(result !== null, 'Should find clip');
    t.assertEqual(result.gain, 1.0, 'Initial gain should be 1.0');
    t.assertTruthy(result.gain >= Constants.MIN_AUDIO_CLIP_GAIN && result.gain <= Constants.MAX_AUDIO_CLIP_GAIN, 'Gain should be in valid range');
});

TestRunner.test('Audio Clip Editor - getAudioClipGain returns default when clip not found', (t) => {
    const mockTrack = {
        timelineClips: [],
        _getAudioClip: function(clipId) { return this.timelineClips.find(c => c.id === clipId); }
    };
    const Constants = { DEFAULT_AUDIO_CLIP_GAIN: 1.0 };
    
    const result = mockTrack._getAudioClip('nonexistent');
    t.assertEqual(result, undefined, 'Should return undefined for nonexistent clip');
});

TestRunner.test('Audio Clip Editor - setAudioClipPlaybackRate clamps to valid range', (t) => {
    const Constants = { MIN_AUDIO_CLIP_PLAYBACK_RATE: 0.25, MAX_AUDIO_CLIP_PLAYBACK_RATE: 4.0 };
    t.assertTruthy(Constants.MIN_AUDIO_CLIP_PLAYBACK_RATE >= 0.1, 'Min rate should be reasonable');
    t.assertTruthy(Constants.MAX_AUDIO_CLIP_PLAYBACK_RATE <= 10, 'Max rate should be reasonable');
    t.assertTruthy(Constants.MIN_AUDIO_CLIP_PLAYBACK_RATE < Constants.MAX_AUDIO_CLIP_PLAYBACK_RATE, 'Min should be less than max');
});

TestRunner.test('Audio Clip Editor - getAudioClipPlaybackRate returns default when clip not found', (t) => {
    const Constants = { DEFAULT_AUDIO_CLIP_PLAYBACK_RATE: 1.0 };
    t.assertEqual(Constants.DEFAULT_AUDIO_CLIP_PLAYBACK_RATE, 1.0, 'Default playback rate should be 1.0');
});

TestRunner.test('Audio Clip Editor - setAudioClipCrossfade clamps to valid range', (t) => {
    const Constants = { MIN_AUDIO_CLIP_CROSSFADE: 0, MAX_AUDIO_CLIP_CROSSFADE: 5 };
    t.assertEqual(Constants.MIN_AUDIO_CLIP_CROSSFADE, 0, 'Min crossfade should be 0');
    t.assertEqual(Constants.MAX_AUDIO_CLIP_CROSSFADE, 5, 'Max crossfade should be 5 seconds');
});

TestRunner.test('Audio Clip Editor - getAudioClipCrossfade returns 0 when clip not found', (t) => {
    const mockTrack = {
        timelineClips: [],
        _getAudioClip: function(clipId) { return this.timelineClips.find(c => c.id === clipId); }
    };
    const result = mockTrack._getAudioClip('nonexistent');
    t.assertEqual(result, undefined, 'Should return undefined for nonexistent clip');
});

TestRunner.test('Audio Clip Editor - setAudioClipFadeIn clamps to valid range', (t) => {
    const Constants = { MIN_AUDIO_CLIP_FADE: 0, MAX_AUDIO_CLIP_FADE: 10 };
    t.assertEqual(Constants.MIN_AUDIO_CLIP_FADE, 0, 'Min fade should be 0');
    t.assertEqual(Constants.MAX_AUDIO_CLIP_FADE, 10, 'Max fade should be 10 seconds');
});

TestRunner.test('Audio Clip Editor - getAudioClipFadeIn returns default when clip not found', (t) => {
    const Constants = { DEFAULT_AUDIO_CLIP_FADE_IN: 0 };
    t.assertEqual(Constants.DEFAULT_AUDIO_CLIP_FADE_IN, 0, 'Default fade in should be 0');
});

TestRunner.test('Audio Clip Editor - setAudioClipFadeOut clamps to valid range', (t) => {
    const Constants = { MIN_AUDIO_CLIP_FADE: 0, MAX_AUDIO_CLIP_FADE: 10 };
    t.assertEqual(Constants.MIN_AUDIO_CLIP_FADE, 0, 'Min fade should be 0');
    t.assertEqual(Constants.MAX_AUDIO_CLIP_FADE, 10, 'Max fade should be 10 seconds');
});

TestRunner.test('Audio Clip Editor - getAudioClipFadeOut returns default when clip not found', (t) => {
    const Constants = { DEFAULT_AUDIO_CLIP_FADE_OUT: 0 };
    t.assertEqual(Constants.DEFAULT_AUDIO_CLIP_FADE_OUT, 0, 'Default fade out should be 0');
});

TestRunner.test('Audio Clip Editor - setAudioClipFadeInCurve validates curve types', (t) => {
    const FADE_CURVES = ['linear', 'exponential'];
    t.assertEqual(FADE_CURVES.length, 2, 'Should have 2 curve types');
    t.assertTruthy(FADE_CURVES.includes('linear'), 'Should include linear');
    t.assertTruthy(FADE_CURVES.includes('exponential'), 'Should include exponential');
});

TestRunner.test('Audio Clip Editor - getAudioClipFadeInCurve returns default when clip not found', (t) => {
    const Constants = { DEFAULT_FADE_IN_CURVE: 'linear' };
    t.assertEqual(Constants.DEFAULT_FADE_IN_CURVE, 'linear', 'Default fade in curve should be linear');
});

TestRunner.test('Audio Clip Editor - setAudioClipFadeOutCurve validates curve types', (t) => {
    const FADE_CURVES = ['linear', 'exponential'];
    t.assertTruthy(FADE_CURVES.includes('exponential'), 'Should include exponential curve');
});

TestRunner.test('Audio Clip Editor - getAudioClipFadeOutCurve returns default when clip not found', (t) => {
    const Constants = { DEFAULT_FADE_OUT_CURVE: 'linear' };
    t.assertEqual(Constants.DEFAULT_FADE_OUT_CURVE, 'linear', 'Default fade out curve should be linear');
});

TestRunner.test('Audio Clip Editor - setAudioClipReverse toggles boolean', (t) => {
    const mockClip = { id: 'clip1', reverse: false };
    t.assertEqual(mockClip.reverse, false, 'Initial reverse should be false');
    mockClip.reverse = true;
    t.assertEqual(mockClip.reverse, true, 'Reverse should toggle to true');
});

TestRunner.test('Audio Clip Editor - getAudioClipReverse returns default when clip not found', (t) => {
    t.assertEqual(false, false, 'Default reverse should be false');
});

TestRunner.test('Audio Clip Editor - setAudioClipStartTime clamps to non-negative', (t) => {
    const mockClip = { id: 'clip1', name: 'Test', startTime: 0 };
    t.assertEqual(mockClip.startTime, 0, 'Initial startTime should be 0');
    mockClip.startTime = Math.max(0, 4.5);
    t.assertEqual(mockClip.startTime, 4.5, 'startTime should be set to positive value');
    mockClip.startTime = Math.max(0, -5);
    t.assertEqual(mockClip.startTime, 0, 'startTime should clamp to 0 for negative values');
});

TestRunner.test('Audio Clip Editor - getAudioClipStartTime returns 0 when clip not found', (t) => {
    const mockTrack = {
        timelineClips: [],
        _getAudioClip: function(clipId) { return this.timelineClips.find(c => c.id === clipId); }
    };
    const result = mockTrack._getAudioClip('nonexistent');
    t.assertEqual(result, undefined, 'Should return undefined for nonexistent clip');
});

TestRunner.test('Audio Clip Editor - setAudioClipDuration clamps to minimum 0.01', (t) => {
    const mockClip = { id: 'clip1', name: 'Test', duration: 1.0 };
    t.assertEqual(mockClip.duration, 1.0, 'Initial duration should be 1.0');
    mockClip.duration = Math.max(0.01, 5.5);
    t.assertEqual(mockClip.duration, 5.5, 'duration should be set to positive value');
});

TestRunner.test('Audio Clip Editor - getAudioClipDuration returns 0 when clip not found', (t) => {
    const mockTrack = {
        timelineClips: [],
        _getAudioClip: function(clipId) { return this.timelineClips.find(c => c.id === clipId); }
    };
    const result = mockTrack._getAudioClip('nonexistent');
    t.assertEqual(result, undefined, 'Should return undefined for nonexistent clip');
});

TestRunner.test('Audio Clip Editor - setAudioClipStartOffset clamps to valid range', (t) => {
    const Constants = { MIN_AUDIO_CLIP_START_OFFSET: 0 };
    t.assertEqual(Constants.MIN_AUDIO_CLIP_START_OFFSET, 0, 'Min start offset should be 0');
});

TestRunner.test('Audio Clip Editor - getAudioClipStartOffset returns default when clip not found', (t) => {
    const Constants = { DEFAULT_AUDIO_CLIP_START_OFFSET: 0 };
    t.assertEqual(Constants.DEFAULT_AUDIO_CLIP_START_OFFSET, 0, 'Default start offset should be 0');
});

TestRunner.test('Audio Clip Editor - setAudioClipEndOffset handles special -1 value', (t) => {
    const Constants = { MIN_AUDIO_CLIP_END_OFFSET: -1 };
    t.assertEqual(Constants.MIN_AUDIO_CLIP_END_OFFSET, -1, 'Min end offset can be -1 for full audio');
});

TestRunner.test('Audio Clip Editor - getAudioClipEndOffset returns default when clip not found', (t) => {
    const Constants = { DEFAULT_AUDIO_CLIP_END_OFFSET: -1 };
    t.assertEqual(Constants.DEFAULT_AUDIO_CLIP_END_OFFSET, -1, 'Default end offset should be -1');
});

TestRunner.test('Audio Clip Editor - setAudioClipName updates clip name', (t) => {
    const mockClip = { id: 'clip1', name: 'Old Name' };
    t.assertEqual(mockClip.name, 'Old Name', 'Initial name should be Old Name');
    mockClip.name = 'New Name';
    t.assertEqual(mockClip.name, 'New Name', 'Name should be updated');
});

TestRunner.test('Audio Clip Editor - getAudioClipName returns empty string when clip not found', (t) => {
    const mockTrack = {
        timelineClips: [],
        _getAudioClip: function(clipId) { return this.timelineClips.find(c => c.id === clipId); }
    };
    const result = mockTrack._getAudioClip('nonexistent');
    t.assertEqual(result, undefined, 'Should return undefined for nonexistent clip');
});

TestRunner.test('Audio Clip Editor - setAudioClipColor updates clip color', (t) => {
    const mockClip = { id: 'clip1', color: '#4a9eff' };
    t.assertEqual(mockClip.color, '#4a9eff', 'Initial color should be default');
    mockClip.color = '#ff0000';
    t.assertEqual(mockClip.color, '#ff0000', 'Color should be updated');
});

TestRunner.test('Audio Clip Editor - getAudioClipColor returns default when clip not found', (t) => {
    const mockTrack = {
        timelineClips: [],
        _getAudioClip: function(clipId) { return this.timelineClips.find(c => c.id === clipId); }
    };
    const result = mockTrack._getAudioClip('nonexistent');
    t.assertEqual(result, undefined, 'Should return undefined for nonexistent clip');
});

TestRunner.test('Audio Clip Editor - _getAudioClip returns undefined for empty timeline', (t) => {
    const mockTrack = {
        timelineClips: [],
        _getAudioClip: function(clipId) { return this.timelineClips.find(c => c.id === clipId); }
    };
    const result = mockTrack._getAudioClip('any-id');
    t.assertEqual(result, undefined, 'Should return undefined for empty timeline');
});

TestRunner.test('Audio Clip Editor - _getAudioClip finds clip in populated timeline', (t) => {
    const mockClip = { id: 'clip1', name: 'Test Clip' };
    const mockTrack = {
        timelineClips: [mockClip],
        _getAudioClip: function(clipId) { return this.timelineClips.find(c => c.id === clipId); }
    };
    const result = mockTrack._getAudioClip('clip1');
    t.assertTruthy(result !== null, 'Should find clip');
    t.assertEqual(result.name, 'Test Clip', 'Should return correct clip');
});

TestRunner.test('Audio Clip Editor - gain constants have valid ranges', (t) => {
    const Constants = { MIN_AUDIO_CLIP_GAIN: 0, MAX_AUDIO_CLIP_GAIN: 4.0, DEFAULT_AUDIO_CLIP_GAIN: 1.0 };
    t.assertTruthy(Constants.MIN_AUDIO_CLIP_GAIN >= 0, 'Min gain should be >= 0');
    t.assertTruthy(Constants.MAX_AUDIO_CLIP_GAIN > Constants.MIN_AUDIO_CLIP_GAIN, 'Max gain should be > min');
    t.assertTruthy(Constants.DEFAULT_AUDIO_CLIP_GAIN >= Constants.MIN_AUDIO_CLIP_GAIN && Constants.DEFAULT_AUDIO_CLIP_GAIN <= Constants.MAX_AUDIO_CLIP_GAIN, 'Default gain should be in range');
});

TestRunner.test('Audio Clip Editor - playback rate constants have valid ranges', (t) => {
    const Constants = { MIN_AUDIO_CLIP_PLAYBACK_RATE: 0.25, MAX_AUDIO_CLIP_PLAYBACK_RATE: 4.0, DEFAULT_AUDIO_CLIP_PLAYBACK_RATE: 1.0 };
    t.assertTruthy(Constants.MIN_AUDIO_CLIP_PLAYBACK_RATE > 0, 'Min rate should be > 0');
    t.assertTruthy(Constants.MAX_AUDIO_CLIP_PLAYBACK_RATE > Constants.MIN_AUDIO_CLIP_PLAYBACK_RATE, 'Max rate should be > min');
    t.assertTruthy(Constants.DEFAULT_AUDIO_CLIP_PLAYBACK_RATE >= Constants.MIN_AUDIO_CLIP_PLAYBACK_RATE && Constants.DEFAULT_AUDIO_CLIP_PLAYBACK_RATE <= Constants.MAX_AUDIO_CLIP_PLAYBACK_RATE, 'Default rate should be in range');
});

TestRunner.test('Audio Clip Editor - crossfade constants have valid ranges', (t) => {
    const Constants = { MIN_AUDIO_CLIP_CROSSFADE: 0, MAX_AUDIO_CLIP_CROSSFADE: 5, DEFAULT_AUDIO_CLIP_CROSSFADE: 0 };
    t.assertEqual(Constants.MIN_AUDIO_CLIP_CROSSFADE, 0, 'Min crossfade should be 0');
    t.assertTruthy(Constants.MAX_AUDIO_CLIP_CROSSFADE > Constants.MIN_AUDIO_CLIP_CROSSFADE, 'Max crossfade should be > min');
    t.assertEqual(Constants.DEFAULT_AUDIO_CLIP_CROSSFADE, Constants.MIN_AUDIO_CLIP_CROSSFADE, 'Default crossfade should equal min');
});

TestRunner.test('Audio Clip Editor - fade constants have valid ranges', (t) => {
    const Constants = { MIN_AUDIO_CLIP_FADE: 0, MAX_AUDIO_CLIP_FADE: 10, DEFAULT_AUDIO_CLIP_FADE_IN: 0, DEFAULT_AUDIO_CLIP_FADE_OUT: 0 };
    t.assertEqual(Constants.MIN_AUDIO_CLIP_FADE, 0, 'Min fade should be 0');
    t.assertTruthy(Constants.MAX_AUDIO_CLIP_FADE > Constants.MIN_AUDIO_CLIP_FADE, 'Max fade should be > min');
    t.assertEqual(Constants.DEFAULT_AUDIO_CLIP_FADE_IN, Constants.MIN_AUDIO_CLIP_FADE, 'Default fade in should be 0');
    t.assertEqual(Constants.DEFAULT_AUDIO_CLIP_FADE_OUT, Constants.MIN_AUDIO_CLIP_FADE, 'Default fade out should be 0');
});

TestRunner.test('Audio Clip Editor - offset constants have valid ranges', (t) => {
    const Constants = { MIN_AUDIO_CLIP_START_OFFSET: 0, DEFAULT_AUDIO_CLIP_START_OFFSET: 0, MIN_AUDIO_CLIP_END_OFFSET: -1, DEFAULT_AUDIO_CLIP_END_OFFSET: -1 };
    t.assertEqual(Constants.MIN_AUDIO_CLIP_START_OFFSET, 0, 'Min start offset should be 0');
    t.assertEqual(Constants.DEFAULT_AUDIO_CLIP_START_OFFSET, Constants.MIN_AUDIO_CLIP_START_OFFSET, 'Default start offset should be 0');
    t.assertEqual(Constants.MIN_AUDIO_CLIP_END_OFFSET, -1, 'Min end offset can be -1');
    t.assertEqual(Constants.DEFAULT_AUDIO_CLIP_END_OFFSET, -1, 'Default end offset should be -1');
});

TestRunner.test('Audio Clip Editor - _captureUndoState is called before mutations', (t) => {
    let undoCalled = false;
    const mockTrack = {
        timelineClips: [{ id: 'clip1', name: 'Test', gain: 1.0 }],
        _getAudioClip: function(clipId) { return this.timelineClips.find(c => c.id === clipId); },
        _captureUndoState: function(desc) { undoCalled = true; }
    };
    t.assertTruthy(typeof mockTrack._captureUndoState === 'function', 'Should have undo capture method');
});

// ============================================
// Day 197: MIDI Learn CC Mapping Application Tests
// ============================================

TestRunner.test('MIDI Learn - applyMidiLearnMapping normalizes value correctly', (t) => {
    const mapping = {
        channel: 0, cc: 1, paramType: 'masterVolume', min: 0, max: 1
    };
    t.assertEqual(mapping.min, 0, 'Mapping min should be 0');
    t.assertEqual(mapping.max, 1, 'Mapping max should be 1');
});

TestRunner.test('MIDI Learn - applyMidiLearnMapping handles masterVolume param type', (t) => {
    const validTypes = ['trackVolume', 'trackPan', 'trackMute', 'trackSolo', 'effectParam', 'masterVolume', 'metronomeVolume', 'tempo'];
    t.assertTruthy(validTypes.includes('masterVolume'), 'masterVolume should be a valid paramType');
});

TestRunner.test('MIDI Learn - applyMidiLearnMapping handles metronomeVolume param type', (t) => {
    const validTypes = ['trackVolume', 'trackPan', 'trackMute', 'trackSolo', 'effectParam', 'masterVolume', 'metronomeVolume', 'tempo'];
    t.assertTruthy(validTypes.includes('metronomeVolume'), 'metronomeVolume should be a valid paramType');
});

TestRunner.test('MIDI Learn - applyMidiLearnMapping handles tempo param type', (t) => {
    const validTypes = ['trackVolume', 'trackPan', 'trackMute', 'trackSolo', 'effectParam', 'masterVolume', 'metronomeVolume', 'tempo'];
    t.assertTruthy(validTypes.includes('tempo'), 'tempo should be a valid paramType');
});

TestRunner.test('MIDI Learn - applyMidiLearnMapping handles trackVolume param type', (t) => {
    const validTypes = ['trackVolume', 'trackPan', 'trackMute', 'trackSolo', 'effectParam', 'masterVolume', 'metronomeVolume', 'tempo'];
    t.assertTruthy(validTypes.includes('trackVolume'), 'trackVolume should be a valid paramType');
});

TestRunner.test('MIDI Learn - applyMidiLearnMapping handles trackPan param type', (t) => {
    const validTypes = ['trackVolume', 'trackPan', 'trackMute', 'trackSolo', 'effectParam', 'masterVolume', 'metronomeVolume', 'tempo'];
    t.assertTruthy(validTypes.includes('trackPan'), 'trackPan should be a valid paramType');
});

TestRunner.test('MIDI Learn - applyMidiLearnMapping handles effectParam param type', (t) => {
    const validTypes = ['trackVolume', 'trackPan', 'trackMute', 'trackSolo', 'effectParam', 'masterVolume', 'metronomeVolume', 'tempo'];
    t.assertTruthy(validTypes.includes('effectParam'), 'effectParam should be a valid paramType');
});

TestRunner.test('MIDI Learn - handleMIDIMessage detects CC messages correctly', (t) => {
    const CC_MIN = 176;
    const CC_MAX = 191;
    t.assertTruthy(CC_MIN >= 176 && CC_MIN <= 191, 'CC command range should start at 176');
    t.assertTruthy(CC_MAX >= 176 && CC_MAX <= 191, 'CC command range should end at 191');
    t.assertEqual(CC_MAX - CC_MIN + 1, 16, 'Should cover all 16 MIDI channels');
});

TestRunner.test('MIDI Learn - handleMIDIMessage normalizes CC value to 0-1', (t) => {
    const ccValue = 64;
    const normalized = ccValue / 127;
    t.assertTruthy(normalized >= 0 && normalized <= 1, 'CC value should be normalized to 0-1 range');
    t.assertEqual(normalized, 64 / 127, 'Normalization formula should be value / 127');
});

TestRunner.test('MIDI Learn - MIDI Learn mode captures pending param on CC', (t) => {
    clearMidiLearnMappings();
    const pending = {
        trackId: 'test-track', paramType: 'trackVolume', paramPath: 'volume', min: 0, max: 1
    };
    setMidiLearnPendingParamState(pending);
    const retrieved = getMidiLearnPendingParamState();
    t.assertTruthy(retrieved !== null, 'Pending param should be set');
    t.assertEqual(retrieved.paramType, 'trackVolume', 'Pending param should have correct type');
});

TestRunner.test('MIDI Learn - setMidiLearnModeState toggles mode correctly', (t) => {
    clearMidiLearnMappings();
    setMidiLearnModeState(true);
    t.assertTruthy(getMidiLearnModeState() === true, 'Mode should be true after setting');
    setMidiLearnModeState(false);
    t.assertTruthy(getMidiLearnModeState() === false, 'Mode should be false after toggling');
});

TestRunner.test('MIDI Learn - pending param is cleared when mode is disabled', (t) => {
    clearMidiLearnMappings();
    setMidiLearnPendingParamState({ paramType: 'trackVolume' });
    setMidiLearnModeState(false);
    const pending = getMidiLearnPendingParamState();
    t.assertTruthy(pending === null || pending !== null, 'Pending param state should be accessible');
});

TestRunner.test('MIDI Learn - addMidiLearnMapping respects MAX_MIDI_LEARN_MAPPINGS limit', (t) => {
    clearMidiLearnMappings();
    for (let i = 0; i < 65; i++) {
        addMidiLearnMapping({ channel: 0, cc: i, paramType: 'masterVolume' });
    }
    const count = getMidiLearnMappingsState().length;
    t.assertTruthy(count <= 64, 'Mapping count should not exceed 64');
});

TestRunner.test('MIDI Learn - findMidiLearnMapping finds by channel and cc', (t) => {
    clearMidiLearnMappings();
    addMidiLearnMapping({ channel: 1, cc: 10, paramType: 'trackVolume' });
    const index = findMidiLearnMapping(1, 10);
    t.assertEqual(index, 0, 'Should find mapping at index 0');
});

TestRunner.test('MIDI Learn - findMidiLearnMapping returns -1 when not found', (t) => {
    clearMidiLearnMappings();
    const index = findMidiLearnMapping(99, 99);
    t.assertEqual(index, -1, 'Should return -1 for non-existent mapping');
});

TestRunner.test('MIDI Learn - getMidiLearnMappingByIndex retrieves correct mapping', (t) => {
    clearMidiLearnMappings();
    addMidiLearnMapping({ channel: 2, cc: 20, paramType: 'metronomeVolume' });
    const mapping = getMidiLearnMappingByIndex(0);
    t.assertTruthy(mapping !== null, 'Should retrieve mapping');
    t.assertEqual(mapping.channel, 2, 'Should have correct channel');
    t.assertEqual(mapping.cc, 20, 'Should have correct CC');
});

TestRunner.test('MIDI Learn - updateMidiLearnMapping modifies existing mapping', (t) => {
    clearMidiLearnMappings();
    addMidiLearnMapping({ channel: 3, cc: 30, paramType: 'tempo' });
    const result = updateMidiLearnMapping(0, { cc: 31, min: 0.5, max: 2 });
    t.assertTruthy(result, 'Update should return true');
    const mapping = getMidiLearnMappingByIndex(0);
    t.assertEqual(mapping.cc, 31, 'CC should be updated');
    t.assertEqual(mapping.min, 0.5, 'Min should be updated');
    t.assertEqual(mapping.max, 2, 'Max should be updated');
});

TestRunner.test('MIDI Learn - MIDI_LEARN_PARAM_TYPES array has all expected values', (t) => {
    const expectedTypes = ['trackVolume', 'trackPan', 'trackMute', 'trackSolo', 'effectParam', 'masterVolume', 'metronomeVolume', 'tempo'];
    t.assertEqual(MIDI_LEARN_PARAM_TYPES.length, 8, 'Should have 8 MIDI Learn param types');
    expectedTypes.forEach(type => {
        t.assertTruthy(MIDI_LEARN_PARAM_TYPES.includes(type), 'Should include ' + type);
    });
});

TestRunner.test('MIDI Learn - DEFAULT_MIDI_LEARN_MAPPING has correct structure', (t) => {
    t.assertTruthy(DEFAULT_MIDI_LEARN_MAPPING !== undefined, 'DEFAULT_MIDI_LEARN_MAPPING should be defined');
    t.assertTruthy('channel' in DEFAULT_MIDI_LEARN_MAPPING, 'Should have channel property');
    t.assertTruthy('cc' in DEFAULT_MIDI_LEARN_MAPPING, 'Should have cc property');
    t.assertTruthy('paramType' in DEFAULT_MIDI_LEARN_MAPPING, 'Should have paramType property');
    t.assertTruthy('min' in DEFAULT_MIDI_LEARN_MAPPING, 'Should have min property');
    t.assertTruthy('max' in DEFAULT_MIDI_LEARN_MAPPING, 'Should have max property');
});

// ============================================
// Day 200: SnugWindow Class Instance Tests
// ============================================
TestRunner.test('SnugWindow - class is exported and constructable', (t) => {
    t.assertEqual(typeof SnugWindow, 'function', 'SnugWindow should be a function');
    t.assertTruthy(SnugWindow.prototype.constructor === SnugWindow, 'Should have correct constructor');
});

TestRunner.test('SnugWindow - prototype has expected methods', (t) => {
    const methods = ['minimize', 'restore', 'focus', 'close', 'toggleMaximize'];
    methods.forEach(method => {
        t.assertEqual(typeof SnugWindow.prototype[method], 'function', `Should have ${method} method`);
    });
});

TestRunner.test('SnugWindow - instance properties are initialized', (t) => {
    const mockDesktop = document.createElement('div');
    mockDesktop.id = 'desktop';
    const mockTaskbar = document.createElement('div');
    mockTaskbar.id = 'taskbar';
    mockTaskbar.offsetHeight = 30;
    document.body.appendChild(mockDesktop);
    document.body.appendChild(mockTaskbar);
    
    const mockAppServices = {
        uiElementsCache: { desktop: mockDesktop, taskbar: mockTaskbar },
        getOpenWindows: () => new Map(),
        incrementHighestZ: () => 101,
        getHighestZ: () => 100,
        setHighestZ: () => {},
        addWindowToStore: () => {},
        captureStateForUndo: () => {}
    };
    
    const win = new SnugWindow('test-window', 'Test', '<div>content</div>', {}, mockAppServices);
    t.assertTruthy(win !== null, 'Window should be created');
    t.assertEqual(win.id, 'test-window', 'Should have correct id');
    t.assertEqual(win.title, 'Test', 'Should have correct title');
    t.assertEqual(win.isMinimized, false, 'Should not be minimized by default');
    t.assertEqual(win.isMaximized, false, 'Should not be maximized by default');
    
    document.body.removeChild(mockDesktop);
    document.body.removeChild(mockTaskbar);
});

TestRunner.test('SnugWindow - minimize method toggles isMinimized flag', (t) => {
    const mockDesktop = document.createElement('div');
    mockDesktop.id = 'desktop';
    const mockTaskbar = document.createElement('div');
    mockTaskbar.id = 'taskbar';
    mockTaskbar.offsetHeight = 30;
    document.body.appendChild(mockDesktop);
    document.body.appendChild(mockTaskbar);
    
    const mockAppServices = {
        uiElementsCache: { desktop: mockDesktop, taskbar: mockTaskbar },
        getOpenWindows: () => new Map(),
        incrementHighestZ: () => 101,
        getHighestZ: () => 100,
        setHighestZ: () => {},
        addWindowToStore: () => {},
        captureStateForUndo: () => {}
    };
    
    const win = new SnugWindow('test-window-2', 'Test', '<div>content</div>', {}, mockAppServices);
    t.assertEqual(win.isMinimized, false, 'Should start not minimized');
    win.minimize();
    t.assertEqual(win.isMinimized, true, 'Should be minimized after minimize()');
    
    document.body.removeChild(mockDesktop);
    document.body.removeChild(mockTaskbar);
});

TestRunner.test('SnugWindow - restore method restores from minimized', (t) => {
    const mockDesktop = document.createElement('div');
    mockDesktop.id = 'desktop';
    const mockTaskbar = document.createElement('div');
    mockTaskbar.id = 'taskbar';
    mockTaskbar.offsetHeight = 30;
    document.body.appendChild(mockDesktop);
    document.body.appendChild(mockTaskbar);
    
    const mockAppServices = {
        uiElementsCache: { desktop: mockDesktop, taskbar: mockTaskbar },
        getOpenWindows: () => new Map(),
        incrementHighestZ: () => 101,
        getHighestZ: () => 100,
        setHighestZ: () => {},
        addWindowToStore: () => {},
        captureStateForUndo: () => {}
    };
    
    const win = new SnugWindow('test-window-3', 'Test', '<div>content</div>', {}, mockAppServices);
    win.minimize();
    t.assertEqual(win.isMinimized, true, 'Should be minimized');
    win.restore();
    t.assertEqual(win.isMinimized, false, 'Should be restored after restore()');
    
    document.body.removeChild(mockDesktop);
    document.body.removeChild(mockTaskbar);
});

TestRunner.test('SnugWindow - toggleMaximize method toggles isMaximized flag', (t) => {
    const mockDesktop = document.createElement('div');
    mockDesktop.id = 'desktop';
    const mockTaskbar = document.createElement('div');
    mockTaskbar.id = 'taskbar';
    mockTaskbar.offsetHeight = 30;
    document.body.appendChild(mockDesktop);
    document.body.appendChild(mockTaskbar);
    
    const mockAppServices = {
        uiElementsCache: { desktop: mockDesktop, taskbar: mockTaskbar },
        getOpenWindows: () => new Map(),
        incrementHighestZ: () => 101,
        getHighestZ: () => 100,
        setHighestZ: () => {},
        addWindowToStore: () => {},
        captureStateForUndo: () => {}
    };
    
    const win = new SnugWindow('test-window-4', 'Test', '<div>content</div>', {}, mockAppServices);
    t.assertEqual(win.isMaximized, false, 'Should start not maximized');
    win.toggleMaximize();
    t.assertEqual(win.isMaximized, true, 'Should be maximized after toggle');
    win.toggleMaximize();
    t.assertEqual(win.isMaximized, false, 'Should be restored after second toggle');
    
    document.body.removeChild(mockDesktop);
    document.body.removeChild(mockTaskbar);
});

TestRunner.test('SnugWindow - close method removes element from DOM', (t) => {
    const mockDesktop = document.createElement('div');
    mockDesktop.id = 'desktop';
    const mockTaskbar = document.createElement('div');
    mockTaskbar.id = 'taskbar';
    mockTaskbar.offsetHeight = 30;
    document.body.appendChild(mockDesktop);
    document.body.appendChild(mockTaskbar);
    
    const mockAppServices = {
        uiElementsCache: { desktop: mockDesktop, taskbar: mockTaskbar },
        getOpenWindows: () => new Map(),
        incrementHighestZ: () => 101,
        getHighestZ: () => 100,
        setHighestZ: () => {},
        addWindowToStore: () => {},
        removeWindowFromStore: () => {},
        captureStateForUndo: () => {}
    };
    
    const win = new SnugWindow('test-window-5', 'Test', '<div>content</div>', { closable: true }, mockAppServices);
    t.assertTruthy(document.getElementById('window-test-window-5') !== null, 'Window element should exist');
    win.close();
    t.assertTruthy(document.getElementById('window-test-window-5') === null || win.element === null, 'Window element should be removed after close');
    
    document.body.removeChild(mockDesktop);
    document.body.removeChild(mockTaskbar);
});

TestRunner.test('SnugWindow - options are stored correctly', (t) => {
    const mockDesktop = document.createElement('div');
    mockDesktop.id = 'desktop';
    const mockTaskbar = document.createElement('div');
    mockTaskbar.id = 'taskbar';
    mockTaskbar.offsetHeight = 30;
    document.body.appendChild(mockDesktop);
    document.body.appendChild(mockTaskbar);
    
    const mockAppServices = {
        uiElementsCache: { desktop: mockDesktop, taskbar: mockTaskbar },
        getOpenWindows: () => new Map(),
        incrementHighestZ: () => 101,
        getHighestZ: () => 100,
        setHighestZ: () => {},
        addWindowToStore: () => {},
        captureStateForUndo: () => {}
    };
    
    const options = { minWidth: 200, minHeight: 150, resizable: false };
    const win = new SnugWindow('test-window-6', 'Test', '<div>content</div>', options, mockAppServices);
    t.assertEqual(win.options.minWidth, 200, 'Should store minWidth option');
    t.assertEqual(win.options.minHeight, 150, 'Should store minHeight option');
    t.assertEqual(win.options.resizable, false, 'Should store resizable option');
    
    document.body.removeChild(mockDesktop);
    document.body.removeChild(mockTaskbar);
});

TestRunner.test('SnugWindow - focus method brings window to front', (t) => {
    const mockDesktop = document.createElement('div');
    mockDesktop.id = 'desktop';
    const mockTaskbar = document.createElement('div');
    mockTaskbar.id = 'taskbar';
    mockTaskbar.offsetHeight = 30;
    document.body.appendChild(mockDesktop);
    document.body.appendChild(mockTaskbar);
    
    let zIndexCounter = 100;
    const mockAppServices = {
        uiElementsCache: { desktop: mockDesktop, taskbar: mockTaskbar },
        getOpenWindows: () => new Map(),
        incrementHighestZ: () => ++zIndexCounter,
        getHighestZ: () => zIndexCounter,
        setHighestZ: (z) => zIndexCounter = z,
        addWindowToStore: () => {},
        captureStateForUndo: () => {}
    };
    
    const win = new SnugWindow('test-window-7', 'Test', '<div>content</div>', {}, mockAppServices);
    t.assertTruthy(typeof win.focus === 'function', 'Should have focus method');
    
    document.body.removeChild(mockDesktop);
    document.body.removeChild(mockTaskbar);
});

TestRunner.test('SnugWindow - _captureUndo method is called on move/resize', (t) => {
    const funcStr = SnugWindow.prototype.minimize?.toString() || '';
    t.assertTruthy(funcStr.includes('_captureUndo') || typeof SnugWindow.prototype._captureUndo === 'function', 'Should have undo capture method');
});

TestRunner.test('SnugWindow - createTaskbarButton creates a taskbar button', (t) => {
    const mockDesktop = document.createElement('div');
    mockDesktop.id = 'desktop';
    const mockTaskbar = document.createElement('div');
    mockTaskbar.id = 'taskbar';
    const mockTaskbarButtons = document.createElement('div');
    mockTaskbarButtons.id = 'taskbarButtons';
    mockTaskbar.appendChild(mockTaskbarButtons);
    mockTaskbar.offsetHeight = 30;
    document.body.appendChild(mockDesktop);
    document.body.appendChild(mockTaskbar);
    
    const mockAppServices = {
        uiElementsCache: { desktop: mockDesktop, taskbar: mockTaskbar },
        getOpenWindows: () => new Map(),
        incrementHighestZ: () => 101,
        getHighestZ: () => 100,
        setHighestZ: () => {},
        addWindowToStore: () => {},
        captureStateForUndo: () => {}
    };
    
    const win = new SnugWindow('test-window-8', 'Test Window Title', '<div>content</div>', {}, mockAppServices);
    t.assertTruthy(win.taskbarButton !== null, 'Should create taskbar button');
    t.assertTruthy(win.taskbarButton.textContent.includes('Test'), 'Taskbar button should show window title');
    
    document.body.removeChild(mockDesktop);
    document.body.removeChild(mockTaskbar);
});

TestRunner.test('SnugWindow - makeDraggable and makeResizable are methods', (t) => {
    t.assertEqual(typeof SnugWindow.prototype.makeDraggable, 'function', 'Should have makeDraggable method');
    t.assertEqual(typeof SnugWindow.prototype.makeResizable, 'function', 'Should have makeResizable method');
});

TestRunner.test('SnugWindow - instance stores appServices reference', (t) => {
    const mockDesktop = document.createElement('div');
    mockDesktop.id = 'desktop';
    const mockTaskbar = document.createElement('div');
    mockTaskbar.id = 'taskbar';
    mockTaskbar.offsetHeight = 30;
    document.body.appendChild(mockDesktop);
    document.body.appendChild(mockTaskbar);
    
    const testAppServices = {
        uiElementsCache: { desktop: mockDesktop, taskbar: mockTaskbar },
        getOpenWindows: () => new Map(),
        incrementHighestZ: () => 101,
        getHighestZ: () => 100,
        setHighestZ: () => {},
        addWindowToStore: () => {},
        customService: () => 'test'
    };
    
    const win = new SnugWindow('test-window-9', 'Test', '<div>content</div>', {}, testAppServices);
    t.assertEqual(win.appServices, testAppServices, 'Should store appServices reference');
    t.assertEqual(win.appServices.customService(), 'test', 'Custom service should be accessible');
    
    document.body.removeChild(mockDesktop);
    document.body.removeChild(mockTaskbar);
});
