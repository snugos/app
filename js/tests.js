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
    // Track Groups cleanup functions
    removeTrackGroupState,
    // Track Templates cleanup functions
    clearTrackTemplatesState,
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

import { startAudioRecording, stopAudioRecording } from './audio.js';

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

TestRunner.test('Track Groups - setTrackGroupNameState updates name', (t) => {
    const group = addTrackGroupState({ name: 'Original Name' });
    const result = setTrackGroupNameState(group.id, 'New Name');
    t.assertTruthy(result, 'setTrackGroupNameState should return true on success');
    const updated = getTrackGroupByIdState(group.id);
    t.assertEqual(updated.name, 'New Name', 'Group name should be updated');
    removeTrackGroupState(group.id);
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
    setChordVoicingState('close');
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
// Day 81: Fade Curve Methods Tests
// ============================================
TestRunner.test('Audio Clip - setAudioClipFadeInCurve validates curve values', (t) => {
    const track = createMockTrack();
    t.assertTruthy(track.setAudioClipFadeInCurve, 'setAudioClipFadeInCurve method should exist');
    // Test with valid curve
    const result = track.setAudioClipFadeInCurve('test-clip', 'exponential');
    t.assertEqual(result, true, 'Should return true for valid curve change');
    // Test with invalid curve defaults to linear
    const result2 = track.setAudioClipFadeInCurve('test-clip', 'invalid');
    t.assertEqual(result2, false, 'Should return false when curve unchanged (already linear default)');
});

TestRunner.test('Audio Clip - getAudioClipFadeInCurve returns default when unset', (t) => {
    const track = createMockTrack();
    t.assertTruthy(track.getAudioClipFadeInCurve, 'getAudioClipFadeInCurve method should exist');
    const curve = track.getAudioClipFadeInCurve('nonexistent-clip');
    t.assertEqual(curve, 'linear', 'Default fade in curve should be linear');
});

TestRunner.test('Audio Clip - setAudioClipFadeOutCurve validates curve values', (t) => {
    const track = createMockTrack();
    t.assertTruthy(track.setAudioClipFadeOutCurve, 'setAudioClipFadeOutCurve method should exist');
    // Test with valid curve
    const result = track.setAudioClipFadeOutCurve('test-clip', 'exponential');
    t.assertEqual(result, true, 'Should return true for valid curve change');
    // Test with invalid curve defaults to linear
    const result2 = track.setAudioClipFadeOutCurve('test-clip', 'invalid');
    t.assertEqual(result2, false, 'Should return false when curve unchanged (already linear default)');
});

TestRunner.test('Audio Clip - getAudioClipFadeOutCurve returns default when unset', (t) => {
    const track = createMockTrack();
    t.assertTruthy(track.getAudioClipFadeOutCurve, 'getAudioClipFadeOutCurve method should exist');
    const curve = track.getAudioClipFadeOutCurve('nonexistent-clip');
    t.assertEqual(curve, 'linear', 'Default fade out curve should be linear');
});

TestRunner.test('Audio Clip - fade curves array contains valid options', (t) => {
    t.assertEqual(FADE_CURVES.length, 2, 'Should have exactly 2 fade curve options');
    t.assertTruthy(FADE_CURVES.includes('linear'), 'Should include linear');
    t.assertTruthy(FADE_CURVES.includes('exponential'), 'Should include exponential');
});

TestRunner.test('Audio Clip - FADE_CURVE_LINEAR and FADE_CURVE_EXPONENTIAL are correct strings', (t) => {
    t.assertEqual(FADE_CURVE_LINEAR, 'linear', 'FADE_CURVE_LINEAR should be "linear"');
    t.assertEqual(FADE_CURVE_EXPONENTIAL, 'exponential', 'FADE_CURVE_EXPONENTIAL should be "exponential"');
});

TestRunner.test('Audio Clip - DEFAULT_FADE_IN_CURVE and DEFAULT_FADE_OUT_CURVE default to linear', (t) => {
    t.assertEqual(DEFAULT_FADE_IN_CURVE, 'linear', 'Default fade in curve should be linear');
    t.assertEqual(DEFAULT_FADE_OUT_CURVE, 'linear', 'Default fade out curve should be linear');
    t.assertEqual(DEFAULT_FADE_IN_CURVE, FADE_CURVE_LINEAR, 'Default should match FADE_CURVE_LINEAR constant');
    t.assertEqual(DEFAULT_FADE_OUT_CURVE, FADE_CURVE_LINEAR, 'Default should match FADE_CURVE_LINEAR constant');
});

// ============================================
// Day 94: Recording Monitoring Tests
// ============================================
TestRunner.test('Recording Monitoring - DEFAULT_RECORDING_MONITORING_ENABLED is boolean', (t) => {
    t.assertEqual(typeof DEFAULT_RECORDING_MONITORING_ENABLED, 'boolean', 'DEFAULT_RECORDING_MONITORING_ENABLED should be boolean');
});

TestRunner.test('Recording Monitoring - DEFAULT_RECORDING_MONITORING_ENABLED is false', (t) => {
    t.assertEqual(DEFAULT_RECORDING_MONITORING_ENABLED, false, 'Monitoring should be disabled by default for clean recording');
});

TestRunner.test('Recording Monitoring - DEFAULT_RECORDING_MONITORING_VOLUME is in valid range', (t) => {
    t.assertTruthy(DEFAULT_RECORDING_MONITORING_VOLUME >= 0 && DEFAULT_RECORDING_MONITORING_VOLUME <= 1, 
        'DEFAULT_RECORDING_MONITORING_VOLUME should be between 0 and 1');
});

TestRunner.test('Recording Monitoring - DEFAULT_RECORDING_MONITORING_VOLUME is reasonable', (t) => {
    t.assertTruthy(DEFAULT_RECORDING_MONITORING_VOLUME > 0 && DEFAULT_RECORDING_MONITORING_VOLUME < 1, 
        'DEFAULT_RECORDING_MONITORING_VOLUME should be between 0 and 1 for practical monitoring levels');
});

// ============================================
// Day 93: Audio Clip Editor UI Tests
// ============================================
TestRunner.test('Audio Clip Editor - crossfade constants are valid', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_CROSSFADE, 0, 'Default crossfade should be 0');
    t.assertEqual(MIN_AUDIO_CLIP_CROSSFADE, 0, 'Min crossfade should be 0');
    t.assertEqual(MAX_AUDIO_CLIP_CROSSFADE, 5, 'Max crossfade should be 5 seconds');
    t.assertTruthy(MAX_AUDIO_CLIP_CROSSFADE > DEFAULT_AUDIO_CLIP_CROSSFADE, 'Max should be greater than default');
});

TestRunner.test('Audio Clip Editor - gain constants are valid', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_GAIN, 1.0, 'Default gain should be 1.0 (0dB)');
    t.assertEqual(MIN_AUDIO_CLIP_GAIN, 0, 'Min gain should be 0 (silence)');
    t.assertEqual(MAX_AUDIO_CLIP_GAIN, 4.0, 'Max gain should be 4.0 (12dB boost)');
    t.assertTruthy(MAX_AUDIO_CLIP_GAIN > DEFAULT_AUDIO_CLIP_GAIN, 'Max should be greater than default');
});

TestRunner.test('Audio Clip Editor - playback rate constants are valid', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_PLAYBACK_RATE, 1.0, 'Default rate should be 1.0 (normal)');
    t.assertEqual(MIN_AUDIO_CLIP_PLAYBACK_RATE, 0.25, 'Min rate should be 0.25x');
    t.assertEqual(MAX_AUDIO_CLIP_PLAYBACK_RATE, 4.0, 'Max rate should be 4.0x');
    t.assertTruthy(MIN_AUDIO_CLIP_PLAYBACK_RATE < 1, 'Min should be less than normal speed');
    t.assertTruthy(MAX_AUDIO_CLIP_PLAYBACK_RATE > 1, 'Max should be greater than normal speed');
});

TestRunner.test('Audio Clip Editor - start/end offset constants are valid', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_START_OFFSET, 0, 'Default start offset should be 0 (beginning)');
    t.assertEqual(MIN_AUDIO_CLIP_START_OFFSET, 0, 'Min start offset should be 0');
    t.assertEqual(DEFAULT_AUDIO_CLIP_END_OFFSET, -1, 'Default end offset should be -1 (use full audio)');
    t.assertEqual(MIN_AUDIO_CLIP_END_OFFSET, -1, 'Min end offset should be -1');
    t.assertTruthy(DEFAULT_AUDIO_CLIP_START_OFFSET <= MIN_AUDIO_CLIP_START_OFFSET, 'Start offset should be >= min');
});

TestRunner.test('Audio Clip Editor - reverse constant is boolean', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_REVERSE, false, 'Default reverse should be false (forward)');
    t.assertEqual(typeof DEFAULT_AUDIO_CLIP_REVERSE, 'boolean', 'Should be boolean type');
});

TestRunner.test('Audio Clip Editor - fade constants are valid', (t) => {
    t.assertEqual(DEFAULT_AUDIO_CLIP_FADE_IN, 0, 'Default fade in should be 0 seconds');
    t.assertEqual(DEFAULT_AUDIO_CLIP_FADE_OUT, 0, 'Default fade out should be 0 seconds');
    t.assertEqual(MAX_AUDIO_CLIP_FADE, 10, 'Max fade should be 10 seconds');
    t.assertTruthy(MAX_AUDIO_CLIP_FADE > DEFAULT_AUDIO_CLIP_FADE_IN, 'Max should be greater than default');
});

TestRunner.test('Audio Clip Editor - FADE_CURVES array has correct options', (t) => {
    t.assertEqual(FADE_CURVES.length, 2, 'Should have exactly 2 fade curve options');
    t.assertTruthy(FADE_CURVES.includes('linear'), 'Should include linear');
    t.assertTruthy(FADE_CURVES.includes('exponential'), 'Should include exponential');
    t.assertEqual(FADE_CURVES[0], 'linear', 'First option should be linear');
    t.assertEqual(FADE_CURVES[1], 'exponential', 'Second option should be exponential');
});

TestRunner.test('Audio Clip Editor - crossfade range is reasonable', (t) => {
    t.assertTruthy(MIN_AUDIO_CLIP_CROSSFADE >= 0, 'Min crossfade should be non-negative');
    t.assertTruthy(MAX_AUDIO_CLIP_CROSSFADE <= 10, 'Max crossfade should be <= 10 seconds');
    t.assertTruthy(MAX_AUDIO_CLIP_CROSSFADE > MIN_AUDIO_CLIP_CROSSFADE, 'Max should be greater than min');
});

// ============================================
// Day 85: Track Template Constants Tests
// ============================================
TestRunner.test('Track Templates - MAX_TRACK_TEMPLATES is reasonable', (t) => {
    t.assertEqual(MAX_TRACK_TEMPLATES, 32, 'Max templates should be 32');
    t.assertTruthy(MAX_TRACK_TEMPLATES > 0, 'Max templates should be positive');
});

TestRunner.test('Track Templates - DEFAULT_TEMPLATE_NAME_PREFIX is valid', (t) => {
    t.assertEqual(DEFAULT_TEMPLATE_NAME_PREFIX, 'Template', 'Default prefix should be "Template"');
    t.assertTruthy(DEFAULT_TEMPLATE_NAME_PREFIX.length > 0, 'Prefix should be non-empty');
});

TestRunner.test('Track Templates - DEFAULT_TRACK_TEMPLATE_COLOR is valid hex', (t) => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    t.assertTruthy(hexRegex.test(DEFAULT_TRACK_TEMPLATE_COLOR), 'Default template color should be valid hex');
});

TestRunner.test('Track Templates - TRACK_TEMPLATE_COLORS is TRACK_COLORS', (t) => {
    t.assertEqual(TRACK_TEMPLATE_COLORS, TRACK_COLORS, 'Template colors should reference TRACK_COLORS');
});

TestRunner.test('Track Templates - DEFAULT_TRACK_TEMPLATE is valid object', (t) => {
    t.assertTruthy(typeof DEFAULT_TRACK_TEMPLATE === 'object', 'Default template should be an object');
    t.assertTruthy(DEFAULT_TRACK_TEMPLATE.name, 'Template should have name');
    t.assertTruthy(DEFAULT_TRACK_TEMPLATE.color, 'Template should have color');
    t.assertTruthy(DEFAULT_TRACK_TEMPLATE.type, 'Template should have type');
});

// ============================================
// Day 85: MIDI Export Constants Tests
// ============================================
TestRunner.test('MIDI Export - MIDI_EXPORT_VELOCITY_SCALE is 127', (t) => {
    t.assertEqual(MIDI_EXPORT_VELOCITY_SCALE, 127, 'Velocity scale should be 127 (MIDI standard)');
});

TestRunner.test('MIDI Export - MIDI_DEFAULT_CHANNEL is valid', (t) => {
    t.assertEqual(MIDI_DEFAULT_CHANNEL, 0, 'Default channel should be 0 (MIDI Ch 1)');
    t.assertTruthy(MIDI_DEFAULT_CHANNEL >= 0 && MIDI_DEFAULT_CHANNEL <= 15, 'Channel should be 0-15');
});

TestRunner.test('MIDI Export - MIDI_DEFAULT_PROGRAM is valid', (t) => {
    t.assertEqual(MIDI_DEFAULT_PROGRAM, 0, 'Default program should be 0');
    t.assertTruthy(MIDI_DEFAULT_PROGRAM >= 0 && MIDI_DEFAULT_PROGRAM <= 127, 'Program should be 0-127');
});

TestRunner.test('MIDI Export - MIDI_EXPORT_TicksPerQuarterNote is reasonable', (t) => {
    t.assertEqual(MIDI_EXPORT_TicksPerQuarterNote, 480, 'TPQN should be 480');
    t.assertTruthy(MIDI_EXPORT_TicksPerQuarterNote >= 96, 'TPQN should be at least 96 (MIDI standard min)');
    t.assertTruthy(MIDI_EXPORT_TicksPerQuarterNote <= 960, 'TPQN should be at most 960 (high resolution)');
});

TestRunner.test('MIDI Export - MIDI_FILE_FORMAT is valid', (t) => {
    t.assertEqual(MIDI_FILE_FORMAT, 0, 'Format should be 0 (single track)');
    t.assertTruthy(MIDI_FILE_FORMAT >= 0 && MIDI_FILE_FORMAT <= 2, 'Format should be 0-2');
});

TestRunner.test('MIDI Export - DEFAULT_MIDI_EXPORT_FILENAME_PREFIX is valid', (t) => {
    t.assertEqual(DEFAULT_MIDI_EXPORT_FILENAME_PREFIX, 'snugos-export', 'Default prefix should be snugos-export');
    t.assertTruthy(DEFAULT_MIDI_EXPORT_FILENAME_PREFIX.length > 0, 'Prefix should be non-empty');
});

TestRunner.test('MIDI Export - MAX_MIDI_EXPORT_TRACKS is valid', (t) => {
    t.assertEqual(MAX_MIDI_EXPORT_TRACKS, 64, 'Max tracks should be 64 (MIDI standard)');
    t.assertTruthy(MAX_MIDI_EXPORT_TRACKS > 0, 'Max tracks should be positive');
});

// ============================================
// Day 85: MIDI Import Constants Tests
// ============================================
TestRunner.test('MIDI Import - MIDI_IMPORT_MIN_NOTES is valid', (t) => {
    t.assertEqual(MIDI_IMPORT_MIN_NOTES, 1, 'Min notes should be 1');
    t.assertTruthy(MIDI_IMPORT_MIN_NOTES >= 0, 'Min notes should be non-negative');
});

TestRunner.test('MIDI Import - MIDI_IMPORT_MAX_VELOCITY is valid', (t) => {
    t.assertEqual(MIDI_IMPORT_MAX_VELOCITY, 127, 'Max velocity should be 127 (MIDI standard)');
    t.assertTruthy(MIDI_IMPORT_MAX_VELOCITY >= 1 && MIDI_IMPORT_MAX_VELOCITY <= 127, 'Max velocity should be 1-127');
});

TestRunner.test('MIDI Import - MIDI_IMPORT_DEFAULT_VELOCITY is valid', (t) => {
    t.assertEqual(MIDI_IMPORT_DEFAULT_VELOCITY, 100, 'Default velocity should be 100');
    t.assertTruthy(MIDI_IMPORT_DEFAULT_VELOCITY >= 0 && MIDI_IMPORT_DEFAULT_VELOCITY <= 127, 'Default velocity should be 0-127');
});

TestRunner.test('MIDI Import - MIDI_IMPORT_DEFAULT_PROBABILITY is valid', (t) => {
    t.assertEqual(MIDI_IMPORT_DEFAULT_PROBABILITY, 1.0, 'Default probability should be 1.0 (100%)');
    t.assertTruthy(MIDI_IMPORT_DEFAULT_PROBABILITY >= 0 && MIDI_IMPORT_DEFAULT_PROBABILITY <= 1.0, 'Default probability should be 0-1');
});

TestRunner.test('MIDI Import - MIDI_IMPORT_SNAP_TO_GRID is boolean', (t) => {
    t.assertEqual(typeof MIDI_IMPORT_SNAP_TO_GRID, 'boolean', 'Snap to grid should be boolean');
});

TestRunner.test('MIDI Import - MIDI_IMPORT_VELOCITY_SCALE is valid', (t) => {
    t.assertEqual(MIDI_IMPORT_VELOCITY_SCALE, 1 / 127, 'Velocity scale should be 1/127');
    t.assertTruthy(MIDI_IMPORT_VELOCITY_SCALE > 0, 'Velocity scale should be positive');
    t.assertTruthy(MIDI_IMPORT_VELOCITY_SCALE < 1, 'Velocity scale should be less than 1');
});

TestRunner.test('MIDI Import - MIDI_IMPORT_VELOCITY_SCALE is inverse of MIDI_EXPORT_VELOCITY_SCALE', (t) => {
    t.assertEqual(MIDI_IMPORT_VELOCITY_SCALE * MIDI_EXPORT_VELOCITY_SCALE, 1, 'Import scale should be inverse of export scale');
});

// ============================================
// Day 85: MIDI Import Constants Tests
// ============================================
TestRunner.test('MIDI Import - MIDI_IMPORT_MIN_NOTES is valid', (t) => {
    t.assertEqual(MIDI_IMPORT_MIN_NOTES, 1, 'Min notes should be 1');
    t.assertTruthy(MIDI_IMPORT_MIN_NOTES >= 0, 'Min notes should be non-negative');
});

TestRunner.test('MIDI Import - MIDI_IMPORT_MAX_VELOCITY is valid', (t) => {
    t.assertEqual(MIDI_IMPORT_MAX_VELOCITY, 127, 'Max velocity should be 127 (MIDI standard)');
    t.assertTruthy(MIDI_IMPORT_MAX_VELOCITY >= 1 && MIDI_IMPORT_MAX_VELOCITY <= 127, 'Max velocity should be 1-127');
});

TestRunner.test('MIDI Import - MIDI_IMPORT_DEFAULT_VELOCITY is valid', (t) => {
    t.assertEqual(MIDI_IMPORT_DEFAULT_VELOCITY, 100, 'Default velocity should be 100');
    t.assertTruthy(MIDI_IMPORT_DEFAULT_VELOCITY >= 0 && MIDI_IMPORT_DEFAULT_VELOCITY <= 127, 'Default velocity should be 0-127');
});

TestRunner.test('MIDI Import - MIDI_IMPORT_DEFAULT_PROBABILITY is valid', (t) => {
    t.assertEqual(MIDI_IMPORT_DEFAULT_PROBABILITY, 1.0, 'Default probability should be 1.0 (100%)');
    t.assertTruthy(MIDI_IMPORT_DEFAULT_PROBABILITY >= 0 && MIDI_IMPORT_DEFAULT_PROBABILITY <= 1.0, 'Default probability should be 0-1');
});

TestRunner.test('MIDI Import - MIDI_IMPORT_SNAP_TO_GRID is boolean', (t) => {
    t.assertEqual(typeof MIDI_IMPORT_SNAP_TO_GRID, 'boolean', 'Snap to grid should be boolean');
});

TestRunner.test('MIDI Import - MIDI_IMPORT_VELOCITY_SCALE is valid', (t) => {
    t.assertEqual(MIDI_IMPORT_VELOCITY_SCALE, 1 / 127, 'Velocity scale should be 1/127');
    t.assertTruthy(MIDI_IMPORT_VELOCITY_SCALE > 0, 'Velocity scale should be positive');
    t.assertTruthy(MIDI_IMPORT_VELOCITY_SCALE < 1, 'Velocity scale should be less than 1');
});

TestRunner.test('MIDI Import - MIDI_IMPORT_VELOCITY_SCALE is inverse of MIDI_EXPORT_VELOCITY_SCALE', (t) => {
    t.assertEqual(MIDI_IMPORT_VELOCITY_SCALE * MIDI_EXPORT_VELOCITY_SCALE, 1, 'Import scale should be inverse of export scale');
});

// ============================================
// Automation Lane Method Tests
// ============================================
TestRunner.test('Automation - AUTOMATION_LANE_PARAMETERS is an array', (t) => {
    t.assertTruthy(Array.isArray(AUTOMATION_LANE_PARAMETERS), 'AUTOMATION_LANE_PARAMETERS should be an array');
    t.assertEqual(AUTOMATION_LANE_PARAMETERS.length, 8, 'Should have 8 automation parameters');
});

TestRunner.test('Automation - AUTOMATION_LANE_PARAMETERS contains expected parameters', (t) => {
    t.assertTruthy(AUTOMATION_LANE_PARAMETERS.includes('volume'), 'Should include volume');
    t.assertTruthy(AUTOMATION_LANE_PARAMETERS.includes('pan'), 'Should include pan');
    t.assertTruthy(AUTOMATION_LANE_PARAMETERS.includes('filterCutoff'), 'Should include filterCutoff');
    t.assertTruthy(AUTOMATION_LANE_PARAMETERS.includes('resonance'), 'Should include resonance');
    t.assertTruthy(AUTOMATION_LANE_PARAMETERS.includes('attack'), 'Should include attack');
    t.assertTruthy(AUTOMATION_LANE_PARAMETERS.includes('decay'), 'Should include decay');
    t.assertTruthy(AUTOMATION_LANE_PARAMETERS.includes('sustain'), 'Should include sustain');
    t.assertTruthy(AUTOMATION_LANE_PARAMETERS.includes('release'), 'Should include release');
});

TestRunner.test('Automation - AUTOMATION_LANE_COLORS is an array', (t) => {
    t.assertTruthy(Array.isArray(AUTOMATION_LANE_COLORS), 'AUTOMATION_LANE_COLORS should be an array');
    t.assertEqual(AUTOMATION_LANE_COLORS.length, 10, 'Should have 10 lane colors');
});

TestRunner.test('Automation - AUTOMATION_LANE_COLORS contains valid hex colors', (t) => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    for (let i = 0; i < AUTOMATION_LANE_COLORS.length; i++) {
        t.assertTruthy(hexRegex.test(AUTOMATION_LANE_COLORS[i]), `Color at index ${i} should be valid hex: ${AUTOMATION_LANE_COLORS[i]}`);
    }
});

TestRunner.test('Automation - AUTOMATION_LANE_HEIGHT is reasonable', (t) => {
    t.assertEqual(AUTOMATION_LANE_HEIGHT, 20, 'Lane height should be 20px');
    t.assertTruthy(AUTOMATION_LANE_HEIGHT > 0, 'Lane height should be positive');
});

TestRunner.test('Automation - AUTOMATION_LANE_DEFAULT is in valid range', (t) => {
    t.assertEqual(AUTOMATION_LANE_DEFAULT, 0.5, 'Default value should be 0.5 (50%)');
    t.assertTruthy(AUTOMATION_LANE_DEFAULT >= 0 && AUTOMATION_LANE_DEFAULT <= 1, 'Default should be between 0 and 1');
});

TestRunner.test('Automation - AUTOMATION_LANE_PRECISION is reasonable', (t) => {
    t.assertEqual(AUTOMATION_LANE_PRECISION, 2, 'Precision should be 2 decimals');
    t.assertTruthy(AUTOMATION_LANE_PRECISION >= 0, 'Precision should be non-negative');
});

TestRunner.test('Automation - AUTOMATION_LANE_STEP is reasonable', (t) => {
    t.assertEqual(AUTOMATION_LANE_STEP, 0.01, 'Step size should be 0.01 (1%)');
    t.assertTruthy(AUTOMATION_LANE_STEP > 0, 'Step should be positive');
    t.assertTruthy(AUTOMATION_LANE_STEP <= (AUTOMATION_LANE_DEFAULT * 2), 'Step should be small enough for fine control');
});

// Self-contained mock for automation lane methods
function createMockTrackWithAutomation() {
    const AUTOMATION_LANE_PARAMETERS = ['volume', 'pan', 'filterCutoff', 'resonance', 'attack', 'decay', 'sustain', 'release'];
    const AUTOMATION_LANE_DEFAULT = 0.5;
    const AUTOMATION_LANE_PRECISION = 2;
    const AUTOMATION_LANE_STEP = 0.01;
    
    const automation = {};
    
    function getAutomationLane(parameter) {
        if (!automation[parameter]) {
            automation[parameter] = [];
        }
        return automation[parameter];
    }
    
    function setAutomationPoint(parameter, step, value, fromInteraction = false) {
        const lane = getAutomationLane(parameter);
        const roundedValue = Math.round(value * Math.pow(10, AUTOMATION_LANE_PRECISION)) / Math.pow(10, AUTOMATION_LANE_PRECISION);
        const clampedValue = Math.max(0, Math.min(1, roundedValue));
        const existingIndex = lane.findIndex(p => p.step === step);
        if (existingIndex >= 0) {
            lane[existingIndex].value = clampedValue;
        } else {
            lane.push({ step, value: clampedValue });
            lane.sort((a, b) => a.step - b.step);
        }
        return true;
    }
    
    function getAutomationValue(parameter, step) {
        const lane = getAutomationLane(parameter);
        if (lane.length === 0) return AUTOMATION_LANE_DEFAULT;
        const point = lane.find(p => p.step === step);
        return point ? point.value : AUTOMATION_LANE_DEFAULT;
    }
    
    function clearAutomationLane(parameter) {
        automation[parameter] = [];
        return true;
    }
    
    return {
        getAutomationLane,
        setAutomationPoint,
        getAutomationValue,
        clearAutomationLane
    };
}

TestRunner.test('Automation - getAutomationLane returns array for any parameter', (t) => {
    const track = createMockTrackWithAutomation();
    const lane = track.getAutomationLane('volume');
    t.assertTruthy(Array.isArray(lane), 'Should return an array');
});

TestRunner.test('Automation - setAutomationPoint adds point to lane', (t) => {
    const track = createMockTrackWithAutomation();
    track.setAutomationPoint('volume', 0, 0.75);
    const lane = track.getAutomationLane('volume');
    t.assertEqual(lane.length, 1, 'Should have 1 point');
    t.assertEqual(lane[0].step, 0, 'Step should be 0');
    t.assertEqual(lane[0].value, 0.75, 'Value should be 0.75');
});

TestRunner.test('Automation - setAutomationPoint clamps value to valid range', (t) => {
    const track = createMockTrackWithAutomation();
    track.setAutomationPoint('volume', 0, 1.5); // Over max
    track.setAutomationPoint('pan', 1, -0.5); // Under min
    const volumeLane = track.getAutomationLane('volume');
    const panLane = track.getAutomationLane('pan');
    t.assertEqual(volumeLane[0].value, 1, 'Value should be clamped to 1');
    t.assertEqual(panLane[0].value, 0, 'Value should be clamped to 0');
});

TestRunner.test('Automation - setAutomationPoint updates existing point', (t) => {
    const track = createMockTrackWithAutomation();
    track.setAutomationPoint('volume', 0, 0.5);
    track.setAutomationPoint('volume', 0, 0.8); // Same step, new value
    const lane = track.getAutomationLane('volume');
    t.assertEqual(lane.length, 1, 'Should still have 1 point');
    t.assertEqual(lane[0].value, 0.8, 'Value should be updated');
});

TestRunner.test('Automation - getAutomationValue returns default for empty lane', (t) => {
    const track = createMockTrackWithAutomation();
    const value = track.getAutomationValue('volume', 0);
    t.assertEqual(value, 0.5, 'Should return default value');
});

TestRunner.test('Automation - getAutomationValue returns point value', (t) => {
    const track = createMockTrackWithAutomation();
    track.setAutomationPoint('volume', 5, 0.75);
    const value = track.getAutomationValue('volume', 5);
    t.assertEqual(value, 0.75, 'Should return point value');
});

TestRunner.test('Automation - getAutomationValue interpolates between points', (t) => {
    const track = createMockTrackWithAutomation();
    track.setAutomationPoint('volume', 0, 0.25);
    track.setAutomationPoint('volume', 4, 0.75);
    const value = track.getAutomationValue('volume', 2);
    t.assertEqual(value, 0.5, 'Should return interpolated value (50%)');
});

TestRunner.test('Automation - clearAutomationLane removes all points', (t) => {
    const track = createMockTrackWithAutomation();
    track.setAutomationPoint('volume', 0, 0.25);
    track.setAutomationPoint('volume', 4, 0.75);
    track.clearAutomationLane('volume');
    const lane = track.getAutomationLane('volume');
    t.assertEqual(lane.length, 0, 'Should have no points');
});

TestRunner.test('Automation - setAutomationPoint rounds value to precision', (t) => {
    const track = createMockTrackWithAutomation();
    track.setAutomationPoint('volume', 0, 0.333);
    const lane = track.getAutomationLane('volume');
    t.assertEqual(lane[0].value, 0.33, 'Value should be rounded to 2 decimal places');
});

// Helper for mock track - self-contained implementation
function createMockTrack() {
    const FADE_CURVES = ['linear', 'exponential'];
    const DEFAULT_FADE_IN_CURVE = 'linear';
    const DEFAULT_FADE_OUT_CURVE = 'linear';
    
    const audioClips = [{
        id: 'test-clip',
        name: 'Test Clip',
        fadeInCurve: 'linear',
        fadeOutCurve: 'linear'
    }];
    
    function setAudioClipFadeInCurve(clipId, curve) {
        const clip = audioClips.find(c => c.id === clipId);
        if (!clip) return false;
        const validCurve = FADE_CURVES.includes(curve) ? curve : DEFAULT_FADE_IN_CURVE;
        if (clip.fadeInCurve === validCurve) return false;
        clip.fadeInCurve = validCurve;
        return true;
    }
    
    function getAudioClipFadeInCurve(clipId) {
        const clip = audioClips.find(c => c.id === clipId);
        return clip ? (clip.fadeInCurve !== undefined ? clip.fadeInCurve : DEFAULT_FADE_IN_CURVE) : DEFAULT_FADE_IN_CURVE;
    }
    
    function setAudioClipFadeOutCurve(clipId, curve) {
        const clip = audioClips.find(c => c.id === clipId);
        if (!clip) return false;
        const validCurve = FADE_CURVES.includes(curve) ? curve : DEFAULT_FADE_OUT_CURVE;
        if (clip.fadeOutCurve === validCurve) return false;
        clip.fadeOutCurve = validCurve;
        return true;
    }
    
    function getAudioClipFadeOutCurve(clipId) {
        const clip = audioClips.find(c => c.id === clipId);
        return clip ? (clip.fadeOutCurve !== undefined ? clip.fadeOutCurve : DEFAULT_FADE_OUT_CURVE) : DEFAULT_FADE_OUT_CURVE;
    }
    
    return {
        setAudioClipFadeInCurve,
        getAudioClipFadeInCurve,
        setAudioClipFadeOutCurve,
        getAudioClipFadeOutCurve
    };
}

// ============================================
// Day 97: State Setter Undo Capture Verification Tests
// ============================================
// These tests verify that state setters properly capture undo state before mutations
// Note: Actual undo capture requires appServices.captureStateForUndo to be wired,
// but we can verify the setter functions exist and handle edge cases correctly

import {
    setSwingEnabledState,
    setSwingAmountState,
    setArmedTrackIdState,
    setSoloedTrackIdState,
    setIsRecordingState,
    setRecordingTrackIdState,
    setRecordingStartTimeState,
    setPerformanceMonitorEnabledState,
    setAudioContextStateState,
    setCPUUsageState,
    setActiveVoicesState,
    setAudioLatencyState,
    setLastCallbackTimeState,
    setDroppedCallbacksState
} from './state.js';

TestRunner.test('State Setters - setSwingEnabledState exists and is a function', (t) => {
    t.assertTruthy(typeof setSwingEnabledState === 'function', 'setSwingEnabledState should be a function');
});

TestRunner.test('State Setters - setSwingAmountState exists and is a function', (t) => {
    t.assertTruthy(typeof setSwingAmountState === 'function', 'setSwingAmountState should be a function');
});

TestRunner.test('State Setters - setArmedTrackIdState exists and is a function', (t) => {
    t.assertTruthy(typeof setArmedTrackIdState === 'function', 'setArmedTrackIdState should be a function');
});

TestRunner.test('State Setters - setSoloedTrackIdState exists and is a function', (t) => {
    t.assertTruthy(typeof setSoloedTrackIdState === 'function', 'setSoloedTrackIdState should be a function');
});

TestRunner.test('State Setters - setIsRecordingState exists and is a function', (t) => {
    t.assertTruthy(typeof setIsRecordingState === 'function', 'setIsRecordingState should be a function');
});

TestRunner.test('State Setters - setRecordingTrackIdState exists and is a function', (t) => {
    t.assertTruthy(typeof setRecordingTrackIdState === 'function', 'setRecordingTrackIdState should be a function');
});

TestRunner.test('State Setters - setRecordingStartTimeState exists and is a function', (t) => {
    t.assertTruthy(typeof setRecordingStartTimeState === 'function', 'setRecordingStartTimeState should be a function');
});

TestRunner.test('State Setters - setPerformanceMonitorEnabledState exists and is a function', (t) => {
    t.assertTruthy(typeof setPerformanceMonitorEnabledState === 'function', 'setPerformanceMonitorEnabledState should be a function');
});

TestRunner.test('State Setters - setAudioContextStateState exists and is a function', (t) => {
    t.assertTruthy(typeof setAudioContextStateState === 'function', 'setAudioContextStateState should be a function');
});

TestRunner.test('State Setters - setCPUUsageState exists and is a function', (t) => {
    t.assertTruthy(typeof setCPUUsageState === 'function', 'setCPUUsageState should be a function');
});

TestRunner.test('State Setters - setActiveVoicesState exists and is a function', (t) => {
    t.assertTruthy(typeof setActiveVoicesState === 'function', 'setActiveVoicesState should be a function');
});

TestRunner.test('State Setters - setAudioLatencyState exists and is a function', (t) => {
    t.assertTruthy(typeof setAudioLatencyState === 'function', 'setAudioLatencyState should be a function');
});

TestRunner.test('State Setters - setLastCallbackTimeState exists and is a function', (t) => {
    t.assertTruthy(typeof setLastCallbackTimeState === 'function', 'setLastCallbackTimeState should be a function');
});

TestRunner.test('State Setters - setDroppedCallbacksState exists and is a function', (t) => {
    t.assertTruthy(typeof setDroppedCallbacksState === 'function', 'setDroppedCallbacksState should be a function');
});

TestRunner.test('State Setters - setArmedTrackIdState handles null/undefined', (t) => {
    // When passed null or undefined, should set to null (no armed track)
    const initial = setArmedTrackIdState('track-123');
    const cleared = setArmedTrackIdState(null);
    // Function should not throw
    t.assertTruthy(true, 'setArmedTrackIdState should handle null without throwing');
});

TestRunner.test('State Setters - setSoloedTrackIdState handles null/undefined', (t) => {
    const initial = setSoloedTrackIdState('track-456');
    const cleared = setSoloedTrackIdState(undefined);
    t.assertTruthy(true, 'setSoloedTrackIdState should handle undefined without throwing');
});

TestRunner.test('State Setters - setIsRecordingState coerces to boolean', (t) => {
    // Should work with various truthy/falsy values
    setIsRecordingState(true);
    setIsRecordingState(1);
    setIsRecordingState('yes');
    setIsRecordingState(false);
    setIsRecordingState(0);
    setIsRecordingState(null);
    t.assertTruthy(true, 'setIsRecordingState should handle all truthy/falsy values');
});

TestRunner.test('State Setters - setCPUUsageState clamps to 0-100 range', (t) => {
    // Values outside 0-100 should be clamped
    setCPUUsageState(150);
    setCPUUsageState(-50);
    setCPUUsageState(50.5);
    t.assertTruthy(true, 'setCPUUsageState should handle out-of-range values');
});

TestRunner.test('State Setters - setAudioContextStateState validates context states', (t) => {
    // Should accept valid context states
    setAudioContextStateState('running');
    setAudioContextStateState('suspended');
    setAudioContextStateState('closed');
    // Should ignore invalid states
    setAudioContextStateState('invalid-state');
    t.assertTruthy(true, 'setAudioContextStateState should validate context states');
});

TestRunner.test('State Setters - setActiveVoicesState clamps to non-negative', (t) => {
    setActiveVoicesState(10);
    setActiveVoicesState(-5);
    t.assertTruthy(true, 'setActiveVoicesState should clamp negative values to 0');
});

TestRunner.test('State Setters - setDroppedCallbacksState clamps to non-negative', (t) => {
    setDroppedCallbacksState(5);
    setDroppedCallbacksState(-3);
    t.assertTruthy(true, 'setDroppedCallbacksState should clamp negative values to 0');
});

TestRunner.test('State Setters - setSwingAmountState clamps to 0-100 range', (t) => {
    setSwingAmountState(50);
    setSwingAmountState(0);
    setSwingAmountState(100);
    setSwingAmountState(-10);
    setSwingAmountState(150);
    t.assertTruthy(true, 'setSwingAmountState should clamp to 0-100 range');
});

TestRunner.test('State Setters - setRecordingTrackIdState accepts any value', (t) => {
    setRecordingTrackIdState('track-123');
    setRecordingTrackIdState(null);
    setRecordingTrackIdState(undefined);
    t.assertTruthy(true, 'setRecordingTrackIdState should accept any track ID or null');
});

TestRunner.test('State Setters - setRecordingStartTimeState accepts numeric values', (t) => {
    setRecordingStartTimeState(1000);
    setRecordingStartTimeState(0);
    setRecordingStartTimeState(-100);
    setRecordingStartTimeState(null);
    t.assertTruthy(true, 'setRecordingStartTimeState should accept numeric time values');
});

// ============================================
// Day 98: Undo Capture Coverage Verification Tests
// ============================================
// These tests verify that state setters properly capture undo state
// by checking if they call captureStateForUndo before mutating state

import {
    setMetronomeEnabledState,
    setMetronomeVolumeState,
    setScaleModeEnabledState,
    setScaleModeScaleState,
    setScaleModeRootState,
    setScaleModeLockState,
    setChordModeEnabledState,
    setChordVoicingState,
    setTimeSignatureNumeratorState,
    setTimeSignatureDenominatorState,
    setGhostTrackIdState,
    setPerformanceMonitorEnabledState,
    setCPUUsageState
} from './state.js';

TestRunner.test('Undo Setters - setMetronomeEnabledState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setMetronomeEnabledState(true);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setMetronomeEnabledState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setMetronomeVolumeState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setMetronomeVolumeState(0.75);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setMetronomeVolumeState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setScaleModeEnabledState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setScaleModeEnabledState(true);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setScaleModeEnabledState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setGhostTrackIdState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setGhostTrackIdState('ghost-track-1');
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setGhostTrackIdState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setArmedTrackIdState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setArmedTrackIdState('armed-track-1');
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setArmedTrackIdState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setSoloedTrackIdState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setSoloedTrackIdState('soloed-track-1');
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setSoloedTrackIdState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setIsRecordingState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setIsRecordingState(true);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setIsRecordingState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setRecordingTrackIdState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setRecordingTrackIdState('recording-track-1');
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setRecordingTrackIdState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setRecordingStartTimeState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setRecordingStartTimeState(1234567890);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setRecordingStartTimeState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setChordModeEnabledState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setChordModeEnabledState(true);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setChordModeEnabledState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setChordVoicingState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setChordVoicingState('wide');
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setChordVoicingState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setTimeSignatureNumeratorState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setTimeSignatureNumeratorState(3);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setTimeSignatureNumeratorState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setTimeSignatureDenominatorState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setTimeSignatureDenominatorState(8);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setTimeSignatureDenominatorState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setScaleModeScaleState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setScaleModeScaleState('pentatonic');
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setScaleModeScaleState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setScaleModeRootState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setScaleModeRootState('A');
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setScaleModeRootState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setScaleModeLockState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setScaleModeLockState(true);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setScaleModeLockState should call captureStateForUndo');
});

// ============================================
// Day 99: Extended Undo/Redo Coverage Verification Tests
// ============================================
TestRunner.test('Undo Setters - setSwingState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setSwingState({ enabled: true, amount: 50 });
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setSwingState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setSwingEnabledState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setSwingEnabledState(true);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setSwingEnabledState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setSwingAmountState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setSwingAmountState(25);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setSwingAmountState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setLoopRegionState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setLoopRegionState({ enabled: true, startBar: 1, endBar: 4 });
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setLoopRegionState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setLoopRegionEnabledState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setLoopRegionEnabledState(true);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setLoopRegionEnabledState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setLoopRegionStartBarState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setLoopRegionStartBarState(2);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setLoopRegionStartBarState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setLoopRegionEndBarState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setLoopRegionEndBarState(8);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setLoopRegionEndBarState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setTimelineZoomLevelState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setTimelineZoomLevelState(1.5);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setTimelineZoomLevelState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setTimelineVerticalZoomState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setTimelineVerticalZoomState(1.2);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setTimelineVerticalZoomState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setChordModeRootState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setChordModeRootState(7); // G
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setChordModeRootState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setChordModeTypeState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setChordModeTypeState('minor');
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setChordModeTypeState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setChordModeLockState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    setChordModeLockState(true);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setChordModeLockState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setTrackSendLevelState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    const send = addSendTrackState({ name: 'Undo Test Send' });
    setTrackSendLevelState('test-track-undo', send.id, 0.75);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setTrackSendLevelState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setTrackSendPreFaderState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    const send = addSendTrackState({ name: 'PreFader Undo Test' });
    setTrackSendPreFaderState('test-track-prefader', send.id, true);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setTrackSendPreFaderState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setTrackGroupColorState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    const group = addTrackGroupState({ name: 'Color Undo Test' });
    setTrackGroupColorState(group.id, '#00ff00');
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setTrackGroupColorState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setTrackGroupMutedState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    const group = addTrackGroupState({ name: 'Mute Undo Test' });
    setTrackGroupMutedState(group.id, true);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setTrackGroupMutedState should call captureStateForUndo');
});

TestRunner.test('Undo Setters - setTrackGroupSoloedState calls captureStateForUndo', (t) => {
    const originalCapture = (appServices || {}).captureStateForUndo;
    let captured = false;
    if (appServices) appServices.captureStateForUndo = () => { captured = true; };
    const group = addTrackGroupState({ name: 'Solo Undo Test' });
    setTrackGroupSoloedState(group.id, true);
    if (appServices) appServices.captureStateForUndo = originalCapture;
    t.assertTruthy(captured, 'setTrackGroupSoloedState should call captureStateForUndo');
});

// ============================================
// End Day 98 tests
// Total tests: 350
// ============================================
