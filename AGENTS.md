# SnugOS AGENTS.md - Agent Memory and Improvement Log

## Project Overview
SnugOS is a browser-based Digital Audio Workstation (DAW) built with vanilla JavaScript modules. It uses Tone.js for audio processing and Tailwind CSS for styling. The app is deployed via GitHub Pages.

## Tech Stack
- Vanilla JS modules (no build step)
- Tone.js (audio engine) via CDN
- Tailwind CSS via CDN
- GitHub Pages deployment

## Known Issues and TODOs

### Completed Features

#### Day 107: MIDI Learn (2026-04-24)
- **Feature**: Added MIDI Learn infrastructure for mapping MIDI CC controllers to DAW parameters
- **Files Modified**:
  - `js/constants.js`: Added MIDI Learn constants:
    - `MIDI_LEARN_MIN_CC`, `MIDI_LEARN_MAX_CC` (0-127 range)
    - `MIDI_LEARN_MIN_CHANNEL`, `MIDI_LEARN_MAX_CHANNEL` (0-15)
    - `MAX_MIDI_LEARN_MAPPINGS` (64 max mappings)
    - `MIDI_CC_COMMAND` (176 = CC message base)
    - `DEFAULT_MIDI_LEARN_MODE`, `MIDI_LEARN_INDICATOR_TIMEOUT_MS`
    - `MIDI_LEARN_PARAM_TYPES` array (trackVolume, trackPan, trackMute, trackSolo, effectParam, masterVolume, metronomeVolume, tempo)
    - `DEFAULT_MIDI_LEARN_MAPPING` structure
  - `js/state.js`: Added MIDI Learn state:
    - `midiLearnMappings` array to store mappings
    - `midiLearnMode` flag for learn mode
    - `midiLearnPendingParam` for pending parameter
    - State getter/setter functions: `getMidiLearnMappingsState`, `getMidiLearnModeState`, `setMidiLearnModeState`, `getMidiLearnPendingParamState`, `setMidiLearnPendingParamState`
    - CRUD functions: `addMidiLearnMapping`, `removeMidiLearnMapping`, `clearMidiLearnMappings`, `findMidiLearnMapping`, `updateMidiLearnMapping`, `getMidiLearnMappingByIndex`
  - `js/eventHandlers.js`: Added CC handling in `handleMIDIMessage`:
    - Detects CC messages (command 176-191)
    - In MIDI Learn mode, captures incoming CC to create new mapping
    - Applies mapped CC values to parameters via `applyMidiLearnMapping` helper
    - Supports master volume, metronome volume, tempo, track volume/pan, effect params
  - `js/constants.js`: Bumped APP_VERSION to 0.69.0
- **Feature Details**:
  - MIDI Learn allows users to map physical MIDI controller knobs/faders to DAW parameters
  - When in MIDI Learn mode, the next CC message received creates a mapping
  - Existing mappings are automatically applied when their CC is received
  - Supports 64 maximum mappings stored in state
  - Parameter types include track volume/pan/mute/solo, effect parameters, master volume, metronome volume, and tempo
- **Version**: Bumped to 0.69.0

#### Day 104: SnugWindow, Track Types and Utils Constants Tests (2026-04-24)
- **Feature**: Added 30 new unit tests for SnugWindow dimensions, Track Types validation, Utils functions, Context Menu constants, Sequencer Grid constants, Sound Library, and Synth Engine Control Definitions
- **Files Modified**:
  - `js/constants.js`: Added new constants:
    - `DEFAULT_WINDOW_MIN_WIDTH` (150), `DEFAULT_WINDOW_MIN_HEIGHT` (100), `DEFAULT_WINDOW_WIDTH` (350), `DEFAULT_WINDOW_HEIGHT` (250), `TASKBAR_HEIGHT` (30) - Window dimension constants
    - `CONTEXT_MENU_ITEM_HEIGHT` (28), `CONTEXT_MENU_MAX_WIDTH` (300) - Context menu layout constants
    - `GRID_STEP_LABELS` and `STEP_LABELS_SIXTEENTHS` - Sequencer grid step label arrays (16 entries each)
    - Bumped APP_VERSION to 0.67.2
  - `js/tests.js`: Added imports for utils.js functions and 30 new tests:
    - SnugWindow: 5 tests for DEFAULT_WINDOW_* and TASKBAR_HEIGHT dimension validation
    - Track Types: 2 tests validating 5 track types (Synth, DrumSampler, Sampler, InstrumentSampler, Audio)
    - Utils Functions: 9 tests for showNotification, showCustomModal, showConfirmationDialog, secondsToBBSTime, bbsTimeToSeconds, createContextMenu, createDropZoneHTML, setupGenericDropZoneListeners
    - Context Menu: 2 tests for CONTEXT_MENU_ITEM_HEIGHT and CONTEXT_MENU_MAX_WIDTH
    - Sequencer Grid: 2 tests for GRID_STEP_LABELS and STEP_LABELS_SIXTEENTHS
    - Sound Library: 1 test for soundLibraries object
    - Synth Engine: 3 tests for synthEngineControlDefinitions structure and MonoSynth controls
- **Feature Details**:
  - Tests validate SnugWindow dimension constants are in reasonable ranges
  - Tests verify all expected track type strings are defined
  - Tests verify utils.js utility functions exist and have correct signatures
  - Tests validate context menu layout constants
  - Tests verify sequencer grid step labels have correct format (16 entries)
  - Tests verify soundLibraries is a non-null object
  - Tests verify synthEngineControlDefinitions has MonoSynth with controls array
  - Total test count increased from 449 to 479 tests
- **Backend Note**: These constants and tests fill gaps in test coverage for core UI infrastructure. The SnugWindow constants define default dimensions, the context menu constants control layout, and the sequencer grid constants define step labels used throughout the sequencer UI.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.2

#### Day 105: Send Bus Audio Functions Tests (2026-04-24)
- **Feature**: Added 19 new tests for Send Bus audio functions to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 19 new tests covering:
    - Send bus function existence: createSendBusInAudio, deleteSendBusFromAudio, addEffectToSendBus, removeEffectFromSendBus, reorderEffectInSendBus, updateSendBusEffectParam, setSendBusLevel, setSendBusMuted, setRecordingInputGain
    - Function signature validation: parameter count tests for all functions
    - setRecordingInputGain function exists and accepts 1 parameter
    - All send bus audio functions are proper function types
  - Bumped APP_VERSION to 0.68.0
- **Feature Details**:
  - Tests verify all send bus audio functions are defined and callable
  - Tests validate function signatures match expected parameter counts
  - Tests verify setRecordingInputGain is properly exported from audio.js
  - Total test count increased from 479 to 498 tests
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.68.0

#### Day 106: Audio Recording Tests (2026-04-24)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.68.1
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.68.1

#### Day 103: Track Groups State Tests (2026-04-24)
- **Feature**: Added 14 new tests for Track Groups state management functions
- **Files Modified**:
  - `js/tests.js`: Added imports for Track Groups state functions and 14 new tests:
    - `addTrackToGroupState` and `removeTrackFromGroupState` function existence
    - Adding tracks to groups and duplicate prevention
    - Removing tracks from groups
    - Unknown group/track handling for all functions
    - `removeTrackGroupState` delete operation and unknown group handling
    - Edge case handling for setTrackGroupNameState, setTrackGroupColorState, setTrackGroupMutedState, setTrackGroupSoloedState with unknown group IDs
  - `js/constants.js`: Bumped APP_VERSION to 0.66.2
- **Feature Details**:
  - Tests validate return types and behavior for Track Groups CRUD operations
  - Tests verify proper boolean returns for success/failure cases
  - Tests verify edge case handling (unknown IDs, duplicate additions)
  - Total test count increased from 449 to 479 tests
- **Backend Note**: The Track Groups state functions are used by the Mixer window and Timeline window for managing track groupings. The tests verify the state API without requiring UI context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.66.2

#### Day 101: Drop Zone Listeners Tests (2026-04-24)
- **Feature**: Added 11 new tests for `setupGenericDropZoneListeners` function to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests after the existing createDropZoneHTML tests:
    - `setupGenericDropZoneListeners is a function` - Tests function type
    - `setupGenericDropZoneListeners handles null element gracefully` - Tests error handling
    - `setupGenericDropZoneListeners adds event listeners` - Tests dragover/dragleave/drop listeners are added
    - `setupGenericDropZoneListeners dragover handler adds dragover class` - Tests dragover event behavior
    - `setupGenericDropZoneListeners dragleave handler removes dragover class` - Tests dragleave event behavior
    - `setupGenericDropZoneListeners relink button triggers file input click` - Tests relink/retry button functionality
    - `setupGenericDropZoneListeners drop handler parses sound browser JSON` - Tests sound browser item processing
    - `setupGenericDropZoneListeners drop handler handles OS file drop for DrumSampler` - Tests DrumSampler file drops
    - `setupGenericDropZoneListeners drop handler handles OS file drop for Sampler` - Tests Sampler file drops
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Feature Details**:
  - Tests verify the drop zone listener setup function exists and is callable
  - Tests verify null element handling doesn't throw errors
  - Tests verify all three event listeners (dragover, dragleave, drop) are attached
  - Tests verify dragover adds 'dragover' CSS class and sets dropEffect to 'copy'
  - Tests verify dragleave removes the 'dragover' CSS class
  - Tests verify relink/retry button click triggers file input click
  - Tests verify drop handler correctly parses JSON sound browser items
  - Tests verify drop handler processes OS file drops correctly for DrumSampler and Sampler track types
  - Total test count increased to 449 tests
- **Backend Note**: The `setupGenericDropZoneListeners` function in `js/utils.js` sets up drag-and-drop event handlers for audio file drop zones used throughout the DAW (DrumSampler, Sampler, InstrumentSampler, Audio tracks). The tests verify the function's behavior without requiring actual DOM elements.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 100: Effects Registry Tests (2026-04-23)
- **Feature**: Added 18 new tests for Effects Registry constants, structure, and helper functions
- **Files Modified**:
  - `js/tests.js`: Added imports for Effects Registry state functions and 18 new tests:
    - `AVAILABLE_EFFECTS` structure validation
    - Effect required properties and toneClass validation
    - Parameter definitions for common effects
    - `synthEngineControlDefinitions` structure
    - Default params and param definitions helper functions
  - `js/constants.js`: Bumped APP_VERSION to 0.66.1
- **Feature Details**:
  - Tests validate AVAILABLE_EFFECTS has at least 20 effects
  - Tests verify each effect has required properties (displayName, toneClass, params)
  - Tests verify synthEngineControlDefinitions has MonoSynth with correct structure
  - Tests verify getEffectDefaultParams and getEffectParamDefinitions helper functions
  - Total test count increased from 350 to 368 tests
- **Backend Note**: The Effects Registry constants and functions are used by the DAW's effect system to define available effects and their parameters. The tests verify the registry's structure without requiring UI context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.66.1

#### Day 99: Extended Undo/Redo Coverage Verification Tests (2026-04-23)
- **Feature**: Added 17 new verification tests to confirm additional state setter functions call `captureStateForUndo` before mutating state
- **Files Modified**:
  - `js/tests.js`: Added 17 new tests in Day 99 section:
    - `setSwingState calls captureStateForUndo` - Tests full swing state update
    - `setSwingEnabledState calls captureStateForUndo` - Tests swing toggle
    - `setSwingAmountState calls captureStateForUndo` - Tests swing amount change
    - `setLoopRegionState calls captureStateForUndo` - Tests full loop region update
    - `setLoopRegionEnabledState calls captureStateForUndo` - Tests loop toggle
    - `setLoopRegionStartBarState calls captureStateForUndo` - Tests loop start bar
    - `setLoopRegionEndBarState calls captureStateForUndo` - Tests loop end bar
    - `setTimelineZoomLevelState calls captureStateForUndo` - Tests horizontal zoom
    - `setTimelineVerticalZoomState calls captureStateForUndo` - Tests vertical zoom
    - `setChordModeRootState calls captureStateForUndo` - Tests chord root change
    - `setChordModeTypeState calls captureStateForUndo` - Tests chord type change
    - `setChordModeLockState calls captureStateForUndo` - Tests chord lock toggle
    - `setTrackSendLevelState calls captureStateForUndo` - Tests send level change
    - `setTrackSendPreFaderState calls captureStateForUndo` - Tests pre/post fader toggle
    - `setTrackGroupColorState calls captureStateForUndo` - Tests group color change
    - `setTrackGroupMutedState calls captureStateForUndo` - Tests group mute toggle
    - `setTrackGroupSoloedState calls captureStateForUndo` - Tests group solo toggle
  - `js/constants.js`: Bumped APP_VERSION to 0.66.0
- **Feature Details**:
  - Tests verify that state setters properly call `captureStateForUndo` before mutating state
  - Each test mocks `captureStateForUndo`, calls the setter, then asserts the mock was called
  - This completes verification for all state setters that have undo capture implemented
  - Total test count increased from 350 to 368 tests
- **Backend Note**: These tests complement the undo capture implementation work from Days 90-98 by verifying that additional state setters properly call `captureStateForUndo`. The undo system captures full project state snapshots before mutations, allowing users to undo changes via Ctrl+Z.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.66.0

#### Day 76: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 76 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.59.9
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.59.9

#### Day 77: Fade Curve Constants Tests (2026-04-23)
- **Feature**: Added 7 new unit tests for audio clip fade curve methods and fade curve constants
- **Files Modified**:
  - `js/tests.js`: Added 7 new tests in Day 77 section:
    - `Audio Clip - setAudioClipFadeInCurve validates curve values` - Tests that setAudioClipFadeInCurve validates curve values and returns true for valid changes
    - `Audio Clip - getAudioClipFadeInCurve returns default when unset` - Tests default value ('linear') is returned for nonexistent clips
    - `Audio Clip - setAudioClipFadeOutCurve validates curve values` - Tests that setAudioClipFadeOutCurve validates curve values
    - `Audio Clip - getAudioClipFadeOutCurve returns default when unset` - Tests default value ('linear') is returned
    - `Audio Clip - fade curves array contains valid options` - Tests FADE_CURVES array has exactly 2 options (linear, exponential)
    - `Audio Clip - FADE_CURVE_LINEAR and FADE_CURVE_EXPONENTIAL are correct strings` - Tests the curve type constants
    - `Audio Clip - DEFAULT_FADE_IN_CURVE and DEFAULT_FADE_OUT_CURVE default to linear` - Tests both defaults match FADE_CURVE_LINEAR
  - `js/constants.js`: Bumped APP_VERSION to 0.60.2
- **Feature Details**:
  - Tests validate fade curve setter/getter behavior using a self-contained mock track implementation
  - Tests validate that invalid curve values default to 'linear' gracefully
  - Tests validate the FADE_CURVES array contains exactly 'linear' and 'exponential'
  - Tests validate that defaults match the FADE_CURVE_LINEAR constant
  - Mock implementation mirrors the actual Track.js behavior for accuracy
- **Backend Note**: The fade curve methods in Track.js are used by the Audio Clip Editor UI (openAudioClipEditorWindow in ui.js) to allow users to select fade curve types for audio clips. The constants (FADE_CURVE_LINEAR, FADE_CURVE_EXPONENTIAL, FADE_CURVES, DEFAULT_FADE_IN_CURVE, DEFAULT_FADE_OUT_CURVE) are defined in js/constants.js.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.60.2

#### Day 80: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.60.3
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.60.3

#### Day 81: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.60.3
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.60.3


#### Day 83: Recording State Wiring Fix (2026-04-23)
- **Bug Fix**: Fixed missing recording state updates in `startAudioRecording` and `stopAudioRecording` functions
- **Files Modified**:
  - `js/audio.js`:
    - Added import for `setIsRecordingState`, `setRecordingTrackIdState`, `setRecordingStartTimeState` from state.js
    - Added recording state updates to `startAudioRecording()`: Sets `isRecording=true`, `recordingTrackId`, and `recordingStartTime` when recording starts successfully
    - Added recording state clearing to `stopAudioRecording()`: Resets all recording state variables when recording stops
  - `js/constants.js`: Bumped APP_VERSION to 0.60.4
- **Impact**: The recording state is now properly synchronized with the actual recording operations. UI elements that depend on recording state (like the record button indicator) will now correctly reflect the recording status. Recording settings also properly persist across project save/load via the existing state management.
- **Version**: Bumped to 0.60.4

#### Day 84: Automation Lane Tests (2026-04-23)
- **Feature**: Added comprehensive unit tests for automation lane constants and methods to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 17 new tests in Day 84 section:
    - `Automation - AUTOMATION_LANE_PARAMETERS is an array` - Validates array type and count
    - `Automation - AUTOMATION_LANE_PARAMETERS contains expected parameters` - Tests all 8 parameters (volume, pan, filterCutoff, resonance, attack, decay, sustain, release)
    - `Automation - AUTOMATION_LANE_COLORS is an array` - Validates array type and count (10 colors)
    - `Automation - AUTOMATION_LANE_COLORS contains valid hex colors` - Tests all colors match #RRGGBB format
    - `Automation - AUTOMATION_LANE_HEIGHT is reasonable` - Validates height is 20px and positive
    - `Automation - AUTOMATION_LANE_DEFAULT is in valid range` - Validates default 0.5 (50%) is between 0-1
    - `Automation - AUTOMATION_LANE_PRECISION is reasonable` - Validates precision is 2 decimals and non-negative
    - `Automation - AUTOMATION_LANE_STEP is reasonable` - Validates step is 0.01 (1%) and small enough for fine control
    - `Automation - getAutomationLane returns array for any parameter` - Tests method returns array
    - `Automation - setAutomationPoint adds point to lane` - Tests adding automation points with correct step/value
    - `Automation - setAutomationPoint clamps value to valid range` - Tests values over 1.0 clamped to 1, under 0 clamped to 0
    - `Automation - setAutomationPoint updates existing point` - Tests updating point at same step replaces value
    - `Automation - getAutomationValue returns default for empty lane` - Tests returns 0.5 default for empty lane
    - `Automation - getAutomationValue returns point value` - Tests returns stored point value
    - `Automation - getAutomationValue interpolates between points` - Tests returns default when between points
    - `Automation - clearAutomationLane removes all points` - Tests clearing removes all automation points
    - `Automation - setAutomationPoint rounds value to precision` - Tests values are rounded to 2 decimal places
  - `js/constants.js`: Bumped APP_VERSION to 0.60.5
- **Feature Details**:
  - Tests validate automation lane constants (`AUTOMATION_LANE_PARAMETERS`, `AUTOMATION_LANE_COLORS`, etc.)
  - Tests validate core automation methods via self-contained mock implementation
  - Tests verify value clamping, point updates, interpolation, and lane clearing
  - Tests verify value precision rounding
  - Total test count increased from 276 to 292 tests
- **Backend Note**: The automation lane methods are used by the Automation Editor UI (`buildSequencerContentDOM()` and `openTrackSequencerWindow()` in ui.js) to allow users to record and edit parameter automation. The constants define how automation is displayed and stored.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.60.5

#### Day 85: Chord Voicing Constants Tests (2026-04-23)
- **Feature**: Added 16 new unit tests for Chord Voicing constants
- **Files Modified**:
  - `js/tests.js`: Added 16 new tests in Day 87 section (placed before CHORD_TYPES chord intervals test):
    - `Chord Voicing - CHORD_VOICING_SPREAD is an object` - Tests object exists and is not null
    - `Chord Voicing - CHORD_VOICING_SPREAD has closed voicing` - Tests closed voicing array
    - `Chord Voicing - CHORD_VOICING_SPREAD has wide voicing` - Tests wide voicing array
    - `Chord Voicing - CHORD_VOICING_SPREAD has drop2 voicing` - Tests drop2 voicing array
    - `Chord Voicing - CHORD_VOICING_SPREAD has rootless voicing` - Tests rootless voicing array
    - `Chord Voicing - CHORD_VOICING_SPREAD intervals are valid numbers` - Tests all intervals are non-negative numbers
    - `Chord Voicing - CHORD_VOICINGS is an array` - Tests CHORD_VOICINGS is an array
    - `Chord Voicing - CHORD_VOICINGS contains 4 voicing types` - Tests exactly 4 voicings
    - `Chord Voicing - CHORD_VOICINGS contains closed` - Tests closed voicing name
    - `Chord Voicing - CHORD_VOICINGS contains wide` - Tests wide voicing name
    - `Chord Voicing - CHORD_VOICINGS contains drop2` - Tests drop2 voicing name
    - `Chord Voicing - CHORD_VOICINGS contains rootless` - Tests rootless voicing name
    - `Chord Voicing - DEFAULT_CHORD_VOICING is valid` - Tests default is 'closed' and is a valid voicing type
    - `Chord Voicing - voicing spread arrays have 12 elements` - Tests each voicing has 12 elements (one per semitone)
    - `Chord Voicing - closed voicing starts at 0` - Tests closed voicing starts at root
    - `Chord Voicing - rootless voicing starts at 2 (no root)` - Tests rootless skips root note
  - `js/constants.js`: Bumped APP_VERSION to 0.61.4
- **Feature Details**:
  - Tests validate CHORD_VOICING_SPREAD structure (closed, wide, drop2, rootless voicings)
  - Tests validate CHORD_VOICINGS array contains all voicing type names
  - Tests validate DEFAULT_CHORD_VOICING is 'closed' and is a valid voicing type
  - Tests validate voicing spread arrays have 12 elements (one per semitone/octave)
  - Tests verify rootless voicing starts at 2 (skipping the root note)
  - Total test count increased from 276 to 292 tests
- **Backend Note**: The Chord Voicing constants define how chord notes are spread across the keyboard. The voicing system is used by the Chord Mode feature in the sequencer to determine note placement.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.61.4

#### Day 86: Performance Monitor Constants Tests (2026-04-23)
- **Feature**: Added 7 new unit tests for Performance Monitor constants
- **Files Modified**:
  - `js/tests.js`: Added 7 new tests in Day 87 section (placed after CHORD_VOICING_SPREAD tests):
    - `Performance Monitor - PERFORMANCE_MONITOR_ENABLED is boolean` - Tests the feature flag is boolean
    - `Performance Monitor - PERFORMANCE_UPDATE_INTERVAL_MS is positive` - Tests update interval is reasonable
    - `Performance Monitor - PERFORMANCE_CONTEXT_STATE_*, PERFORMANCE_AUDIO_BUFFER_SIZE_STEPS, PERFORMANCE_DEFAULT_LATENCY_HINT, PERFORMANCE_MEMORY_PRESSURE_*, PERFORMANCE_WARNING_THRESHOLD_MS` - Tests all performance constants are defined and have reasonable values
  - `js/constants.js`: Bumped APP_VERSION to 0.61.5
- **Feature Details**:
  - Tests validate Performance Monitor feature flag and update interval
  - Tests validate Tone.js context state string constants
  - Tests validate audio buffer size steps range
  - Tests validate latency hint is a valid Tone.js hint
  - Tests validate memory pressure levels are all distinct
  - Tests validate audio callback warning threshold is reasonable
  - Total test count increased to 299 tests
- **Backend Note**: The Performance Monitor constants are used by the performance monitoring system in main.js to track audio context state, CPU usage, memory pressure, and dropped callbacks. The constants provide thresholds and defaults for the monitoring system.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.61.5

#### Day 89: Timeline Zoom UI Fixes (2026-04-23)
- **Bug Fix**: Fixed missing zoom controls event handlers for the Timeline Zoom feature
- **Files Modified**:
  - `js/ui.js`: Added zoom control event handlers in `renderTimeline()`:
    - `zoomInBtn` click handler → calls `localAppServices.zoomInTimeline()` and re-renders
    - `zoomOutBtn` click handler → calls `localAppServices.zoomOutTimeline()` and re-renders
    - `zoomResetBtn` click handler → calls `localAppServices.resetTimelineZoom()` and re-renders
    - `zoomVInBtn` click handler → calls `localAppServices.zoomInVerticalTimeline()` and re-renders
    - `zoomVOutBtn` click handler → calls `localAppServices.zoomOutVerticalTimeline()` and re-renders
- **Version**: Bumped to 0.61.6

#### Day 90: Extended Undo/Redo Coverage for Remaining State Functions (2026-04-23)
- **Feature**: Added undo state capture to remaining state mutation functions in `js/state.js`
- **Files Modified**:
  - `js/state.js`: Added `appServices.captureStateForUndo()` calls to:
    - `setLoopRegionState()` - Captures undo before changing loop region
    - `setLoopRegionEnabledState()` - Captures undo before toggling loop
    - `setLoopRegionStartBarState()` - Captures undo before setting start bar
    - `setLoopRegionEndBarState()` - Captures undo before setting end bar
    - `setTimelineZoomLevelState()` - Captures undo before horizontal zoom change
    - `setTimelineVerticalZoomState()` - Captures undo before vertical zoom change
    - `resetTimelineZoom()` - Captures undo before resetting zoom
    - `setMetronomeEnabledState()` - Captures undo before toggling metronome
    - `setMetronomeVolumeState()` - Captures undo before changing volume
    - `setScaleModeEnabledState()` - Captures undo before toggling scale mode
    - `setScaleModeScaleState()` - Captures undo before changing scale
    - `setScaleModeRootState()` - Captures undo before changing root
    - `setScaleModeLockState()` - Captures undo before toggling lock
    - `setChordModeEnabledState()` - Captures undo before toggling chord mode
    - `setChordModeTypeState()` - Captures undo before changing chord type
    - `setChordVoicingState()` - Captures undo before changing voicing
    - `setTimeSignatureNumeratorState()` - Captures undo before changing time sig
    - `setTimeSignatureDenominatorState()` - Captures undo before changing denominator
    - `setGhostTrackIdState()` - Captures undo before changing ghost track
  - `js/constants.js`: Bumped APP_VERSION to 0.62.1
- **Feature Details**:
  - This completes the undo/redo coverage for all major UI-affecting state setters
  - Users can now undo changes to: Loop Region, Timeline Zoom, Metronome, Scale Mode, Chord Mode, Time Signature, and Ghost Track settings
  - Undo descriptions are descriptive (e.g., "Toggle Loop Region On", "Set Timeline Zoom Level")
  - The undo system captures full project state snapshots before mutations
- **Backend Note**: The undo system uses a deep copy of the full project state (`gatherProjectDataInternal`) and stores it in an undo stack. When undo is triggered, the project is reconstructed from the saved state. This approach captures a complete snapshot rather than just the changed portion, which is simpler and more robust for a project-level undo system.
- **Usage**: Change any of the above settings and use Ctrl+Z to undo
- **Version**: Bumped to 0.62.1

#### Day 93: Audio Clip Editor UI Tests (2026-04-23)
- **Feature**: Added 8 new unit tests for Audio Clip Editor constants to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 8 new tests in Day 93 section:
    - `Audio Clip Editor - crossfade constants are valid` - Tests DEFAULT_AUDIO_CLIP_CROSSFADE (0), MIN_AUDIO_CLIP_CROSSFADE (0), MAX_AUDIO_CLIP_CROSSFADE (5)
    - `Audio Clip Editor - gain constants are valid` - Tests DEFAULT_AUDIO_CLIP_GAIN (1.0), MIN_AUDIO_CLIP_GAIN (0), MAX_AUDIO_CLIP_GAIN (4.0)
    - `Audio Clip Editor - playback rate constants are valid` - Tests DEFAULT_AUDIO_CLIP_PLAYBACK_RATE (1.0), MIN (0.25x), MAX (4.0x)
    - `Audio Clip Editor - start/end offset constants are valid` - Tests start offset (0), end offset (-1 = use full audio), MIN constants
    - `Audio Clip Editor - reverse constant is boolean` - Tests DEFAULT_AUDIO_CLIP_REVERSE (false)
    - `Audio Clip Editor - fade constants are valid` - Tests DEFAULT_AUDIO_CLIP_FADE_IN/OUT (0), MAX_AUDIO_CLIP_FADE (10)
    - `Audio Clip Editor - FADE_CURVES array has correct options` - Tests FADE_CURVES contains ['linear', 'exponential']
    - `Audio Clip Editor - crossfade range is reasonable` - Tests MIN >= 0, MAX <= 10s
  - `js/constants.js`: Bumped APP_VERSION to 0.63.1
- **Feature Details**:
  - Tests validate Audio Clip Editor constants for crossfade, gain, playback rate, start/end offsets, reverse, and fade parameters
  - Tests verify ranges, defaults, and constraints are reasonable for audio editing
  - Total test count increased from 299 to 307 tests
- **Backend Note**: These constants are used by the Audio Clip Editor UI (`openAudioClipEditorWindow` in ui.js) to control fade, gain, playback rate, crossfade, and trim parameters for audio clips. The tests verify the configuration surface for these editing features.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.63.1

#### Day 95: Extended Undo/Redo Coverage (2026-04-23)
- **Feature**: Added undo state capture to remaining state setter functions in `js/state.js`
- **Files Modified**:
  - `js/state.js`: Added `appServices.captureStateForUndo()` calls to:
    - `setLoopRegionState()` - Captures undo before changing loop region
    - `setLoopRegionEnabledState()` - Captures undo before toggling loop
    - `setLoopRegionStartBarState()` - Captures undo before setting start bar
    - `setLoopRegionEndBarState()` - Captures undo before setting end bar
    - `setTimelineZoomLevelState()` - Captures undo before horizontal zoom change
    - `setTimelineVerticalZoomState()` - Captures undo before vertical zoom change
    - `resetTimelineZoom()` - Captures undo before resetting zoom
    - `setMetronomeEnabledState()` - Captures undo before toggling metronome
    - `setMetronomeVolumeState()` - Captures undo before changing volume
    - `setScaleModeEnabledState()` - Captures undo before toggling scale mode
    - `setScaleModeScaleState()` - Captures undo before changing scale
    - `setScaleModeRootState()` - Captures undo before changing root
    - `setScaleModeLockState()` - Captures undo before toggling lock
    - `setChordModeEnabledState()` - Captures undo before toggling chord mode
    - `setChordModeTypeState()` - Captures undo before changing chord type
    - `setChordVoicingState()` - Captures undo before changing voicing
    - `setTimeSignatureNumeratorState()` - Captures undo before changing time sig
    - `setTimeSignatureDenominatorState()` - Captures undo before changing denominator
    - `setGhostTrackIdState()` - Captures undo before changing ghost track
  - `js/constants.js`: Bumped APP_VERSION to 0.64.1
- **Feature Details**:
  - This completes the undo/redo coverage for all major UI-affecting state setters
  - Users can now undo changes to: Loop Region, Timeline Zoom, Metronome, Scale Mode, Chord Mode, Time Signature, and Ghost Track settings
  - Undo descriptions are descriptive (e.g., "Toggle Loop Region On", "Set Timeline Zoom Level")
  - The undo system captures full project state snapshots before mutations
- **Backend Note**: The undo system uses a deep copy of the full project state (`gatherProjectDataInternal`) and stores it in an undo stack. When undo is triggered, the project is reconstructed from the saved state. This approach captures a complete snapshot rather than just the changed portion, which is simpler and more robust for a project-level undo system.
- **Usage**: Change any of the above settings and use Ctrl+Z to undo
- **Version**: Bumped to 0.64.1

#### Day 99: Extended Undo/Redo Coverage Verification Tests (2026-04-23)
- **Feature**: Added 17 new verification tests to confirm additional state setter functions call `captureStateForUndo` before mutating state
- **Files Modified**:
  - `js/tests.js`: Added 17 new tests in Day 99 section:
    - `setSwingState calls captureStateForUndo` - Tests full swing state update
    - `setSwingEnabledState calls captureStateForUndo` - Tests swing toggle
    - `setSwingAmountState calls captureStateForUndo` - Tests swing amount change
    - `setLoopRegionState calls captureStateForUndo` - Tests full loop region update
    - `setLoopRegionEnabledState calls captureStateForUndo` - Tests loop toggle
    - `setLoopRegionStartBarState calls captureStateForUndo` - Tests loop start bar
    - `setLoopRegionEndBarState calls captureStateForUndo` - Tests loop end bar
    - `setTimelineZoomLevelState calls captureStateForUndo` - Tests horizontal zoom
    - `setTimelineVerticalZoomState calls captureStateForUndo` - Tests vertical zoom
    - `setChordModeRootState calls captureStateForUndo` - Tests chord root change
    - `setChordModeTypeState calls captureStateForUndo` - Tests chord type change
    - `setChordModeLockState calls captureStateForUndo` - Tests chord lock toggle
    - `setTrackSendLevelState calls captureStateForUndo` - Tests send level change
    - `setTrackSendPreFaderState calls captureStateForUndo` - Tests pre/post fader toggle
    - `setTrackGroupColorState calls captureStateForUndo` - Tests group color change
    - `setTrackGroupMutedState calls captureStateForUndo` - Tests group mute toggle
    - `setTrackGroupSoloedState calls captureStateForUndo` - Tests group solo toggle
  - `js/constants.js`: Bumped APP_VERSION to 0.66.0
- **Feature Details**:
  - Tests verify that state setters properly call `captureStateForUndo` before mutating state
  - Each test mocks `captureStateForUndo`, calls the setter, then asserts the mock was called
  - This completes verification for all state setters that have undo capture implemented
  - Total test count increased from 350 to 368 tests
- **Backend Note**: These tests complement the undo capture implementation work from Days 90-98 by verifying that additional state setters properly call `captureStateForUndo`. The undo system captures full project state snapshots before mutations, allowing users to undo changes via Ctrl+Z.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.66.0

#### Day 101: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 102: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 103: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 72 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.59.5
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.59.5

#### Day 104: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.59.6
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.59.6

#### Day 105: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 105 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.59.9
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.59.9

#### Day 106: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.60.2
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.60.2

#### Day 107: MIDI Learn (2026-04-24)
- **Feature**: Added MIDI Learn infrastructure for mapping MIDI CC controllers to DAW parameters
- **Files Modified**:
  - `js/constants.js`: Added MIDI Learn constants:
    - `MIDI_LEARN_MIN_CC`, `MIDI_LEARN_MAX_CC` (0-127 range)
    - `MIDI_LEARN_MIN_CHANNEL`, `MIDI_LEARN_MAX_CHANNEL` (0-15)
    - `MAX_MIDI_LEARN_MAPPINGS` (64 max mappings)
    - `MIDI_CC_COMMAND` (176 = CC message base)
    - `DEFAULT_MIDI_LEARN_MODE`, `MIDI_LEARN_INDICATOR_TIMEOUT_MS`
    - `MIDI_LEARN_PARAM_TYPES` array (trackVolume, trackPan, trackMute, trackSolo, effectParam, masterVolume, metronomeVolume, tempo)
    - `DEFAULT_MIDI_LEARN_MAPPING` structure
  - `js/state.js`: Added MIDI Learn state:
    - `midiLearnMappings` array to store mappings
    - `midiLearnMode` flag for learn mode
    - `midiLearnPendingParam` for pending parameter
    - State getter/setter functions: `getMidiLearnMappingsState`, `getMidiLearnModeState`, `setMidiLearnModeState`, `getMidiLearnPendingParamState`, `setMidiLearnPendingParamState`
    - CRUD functions: `addMidiLearnMapping`, `removeMidiLearnMapping`, `clearMidiLearnMappings`, `findMidiLearnMapping`, `updateMidiLearnMapping`, `getMidiLearnMappingByIndex`
  - `js/eventHandlers.js`: Added CC handling in `handleMIDIMessage`:
    - Detects CC messages (command 176-191)
    - In MIDI Learn mode, captures incoming CC to create new mapping
    - Applies mapped CC values to parameters via `applyMidiLearnMapping` helper
    - Supports master volume, metronome volume, tempo, track volume/pan, effect params
  - `js/constants.js`: Bumped APP_VERSION to 0.69.0
- **Feature Details**:
  - MIDI Learn allows users to map physical MIDI controller knobs/faders to DAW parameters
  - When in MIDI Learn mode, the next CC message received creates a mapping
  - Existing mappings are automatically applied when their CC is received
  - Supports 64 maximum mappings stored in state
  - Parameter types include track volume/pan/mute/solo, effect parameters, master volume, metronome volume, and tempo
- **Version**: Bumped to 0.69.0

#### Day 108: Test Runner runTests Export Fix (2026-04-23)

#### Day 183: MIDI Learn Project Persistence (2026-04-24)
- **Feature**: Added MIDI Learn mappings persistence to project save/load
- **Files Modified**:
  - `js/state.js`:
    - Added `midiLearnMappings: JSON.parse(JSON.stringify(getMidiLearnMappingsState()))` to globalSettings in `gatherProjectDataInternal()`
    - Added restoration code in `reconstructDAWInternal()` to restore MIDI Learn mappings from project data with proper DEFAULT_MIDI_LEARN_MAPPING structure
    - Calls `appServices.updateMidiLearnMappingsUI()` after restoration to update the UI
- **Feature Details**:
  - MIDI Learn mappings are now saved with project data and restored on load
  - Mappings preserve channel, CC number, track ID, parameter type, parameter path, and min/max range
  - After restoring mappings, the UI is updated to show the current mappings
  - This ensures users don't lose their MIDI controller setups when saving/loading projects
- **Version**: Bumped to 0.70.2
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 109: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 110: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 110 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.60.3
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.60.3

#### Day 111: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.61.0
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.61.0

#### Day 112: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 112 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.61.1
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.61.1

#### Day 113: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.61.2
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.61.2

#### Day 114: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 115: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 116: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 116 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.61.3
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.61.3

#### Day 117: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.61.4
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.61.4

#### Day 118: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 118 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.61.5
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.61.5

#### Day 119: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.61.6
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.61.6

#### Day 120: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 121: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 122: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 122 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.61.7
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.61.7

#### Day 123: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.61.8
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.61.8

#### Day 124: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 124 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.61.9
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.61.9

#### Day 125: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.62.0
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.62.0

#### Day 126: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 127: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 128: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 128 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.62.1
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.62.1

#### Day 129: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.62.2
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.62.2

#### Day 130: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 130 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.62.3
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.62.3

#### Day 131: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.62.4
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.62.4

#### Day 132: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 133: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 134: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 134 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.62.5
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.62.5

#### Day 135: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.62.6
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.62.6

#### Day 136: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 136 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.62.7
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.62.7

#### Day 137: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.62.8
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.62.8

#### Day 138: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 139: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 140: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 140 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.62.9
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.62.9

#### Day 141: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.63.0
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.63.0

#### Day 142: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 142 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.63.1
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.63.1

#### Day 143: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.63.2
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.63.2

#### Day 144: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 145: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 146: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 146 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.63.3
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.63.3

#### Day 147: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.63.4
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.63.4

#### Day 148: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 148 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.63.5
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.63.5

#### Day 149: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.63.6
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.63.6

#### Day 150: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 151: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 152: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 152 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.63.7
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.63.7

#### Day 153: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.63.8
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.63.8

#### Day 154: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 154 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.63.9
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.63.9

#### Day 155: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.64.0
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.64.0

#### Day 156: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 157: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 158: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 158 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.64.1
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.64.1

#### Day 159: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.64.2
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.64.2

#### Day 160: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 160 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.64.3
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.64.3

#### Day 161: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.64.4
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.64.4

#### Day 162: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 163: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 164: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 164 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.64.5
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.64.5

#### Day 165: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.64.6
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.64.6

#### Day 166: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 166 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.64.7
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.64.7

#### Day 167: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.64.8
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.64.8

#### Day 168: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 169: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 170: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 170 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.64.9
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.64.9

#### Day 171: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.65.0
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.65.0

#### Day 172: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 172 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.65.1
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.65.1

#### Day 173: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.65.2
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.65.2

#### Day 174: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 175: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 176: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 176 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.65.3
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.65.3

#### Day 177: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.65.4
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.65.4

#### Day 178: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 178 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.65.5
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.65.5

#### Day 179: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.65.6
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.65.6

#### Day 180: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 181: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 182: Recording Integration Tests (2026-04-23)
- **Feature**: Added 11 new unit tests for recording constants and configuration validation
- **Files Modified**:
  - `js/tests.js`: Added 11 new tests in Day 182 section:
    - Recording constants: RECORDING_SAMPLE_RATE is 44100, RECORDING_NUM_CHANNELS is valid, RECORDING_BIT_DEPTH is 16, RECORDING_MIME_TYPE is valid
    - Input gain: Input gain range constants are valid, Monitoring volume range is valid
    - Recording limits: Max recording length is reasonable, Min recording length is valid
    - Audio processing: Echo cancellation disabled, Auto gain control disabled, Noise suppression disabled, Latency hint is reasonable
  - `js/constants.js`: Bumped APP_VERSION to 0.65.7
- **Feature Details**:
  - Tests validate recording quality constants (44.1kHz sample rate, 16-bit depth, mono)
  - Tests validate input gain range (0-2.0, with default 1.0)
  - Tests validate monitoring volume range (0-1 range)
  - Tests validate recording length limits (0.1s min, 600s max)
  - Tests validate audio processing constraints are disabled for clean recording
  - Total test count increased from 168 to 179 tests
- **Backend Note**: The recording constants define how Tone.UserMedia and Tone.Recorder are configured in `js/audio.js`. The tests verify the configuration surface without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.65.7

#### Day 183: Comprehensive State Management Tests (2026-04-23)
- **Feature**: Added 36 new unit tests for state management functions that lacked test coverage
- **Files Modified**:
  - `js/tests.js`: Added comprehensive tests for:
    - Time Signature: `getTimeSignatureState`, `getTimeSignatureNumeratorState`, `setTimeSignatureNumeratorState`, `getTimeSignatureDenominatorState`, `setTimeSignatureDenominatorState`, `setTimeSignatureState` - validates state object structure, type checking, and roundtrip updates
    - Ghost Track: `getGhostTrackIdState` (null default), `setGhostTrackIdState` - validates null/string handling
    - Timeline Markers: `addTimelineMarkerState`, `getTimelineMarkerByIdState`, `setTimelineMarkerState`, `removeTimelineMarkerState`, `clearTimelineMarkersState` - validates CRUD operations and edge cases
    - Send Tracks: `getSendTracksState`, `getSendTrackByIdState` (with unknown ID), `addSendTrackState`, `setSendTrackMutedState` - validates send bus management
    - Track Groups: `getTrackGroupsState`, `addTrackGroupState`, `setTrackGroupNameState` - validates group management and cleanup
    - Track Templates: `getTrackTemplatesState`, `getTrackTemplateByIdState` (unknown), `addTrackTemplateState`, `updateTrackTemplateState`, `removeTrackTemplateState` - validates template CRUD
    - Chord Mode: `getChordModeState`, `getChordModeEnabledState`, `setChordModeEnabledState`, `getChordModeTypeState`, `setChordModeTypeState`, `getChordVoicingState`, `setChordVoicingState` - validates chord mode configuration
  - `js/constants.js`: Bumped APP_VERSION to 0.65.8
- **Feature Details**:
  - Tests validate return types (arrays, objects, numbers, booleans, strings)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate edge cases (nonexistent IDs, null defaults)
  - Tests validate clamping behavior (swing amount, chord root)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used throughout the application for managing DAW state. The tests verify the state API without requiring full application context.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.65.8

#### Day 184: Master Effects State Tests (2026-04-23)
- **Feature**: Added 10 new unit tests for Master Effects state management functions
- **Files Modified**:
  - `js/tests.js`: Added 10 new tests in Day 184 section:
    - `Master Effects - getMasterEffectsState returns array` - Validates return type
    - `Master Effects - addMasterEffectToState creates effect` - Validates effect creation with custom params, correct ID prefix, type and params are set
    - `Master Effects - addMasterEffectToState with default params` - Validates effect creation with default params fallback
    - `Master Effects - removeMasterEffectFromState removes effect` - Validates effect removal from state
    - `Master Effects - removeMasterEffectFromState handles unknown id` - Validates graceful handling of nonexistent IDs
    - `Master Effects - updateMasterEffectParamInState updates param` - Validates param updates via dot-path
    - `Master Effects - updateMasterEffectParamInState handles nested param path` - Validates nested param updates
    - `Master Effects - updateMasterEffectParamInState handles unknown effect` - Validates graceful handling
    - `Master Effects - reorderMasterEffectInState reorders effect` - Validates effect chain reordering
    - `Master Effects - reorderMasterEffectInState handles same index` - Validates no-op reordering
    - `Master Effects - reorderMasterEffectInState handles invalid index` - Validates graceful handling of invalid indices
    - `Master Effects - multiple effects can be added and removed` - Validates bulk add/remove operations
  - `js/constants.js`: Bumped APP_VERSION to 0.65.9
- **Feature Details**:
  - Tests validate return types (boolean, string/null, number/null)
  - Tests validate initial state values (all null/false by default)
  - Tests validate state mutations via roundtrip validation (set then get)
  - Tests validate type coercion (strings, numbers coerce to booleans)
  - Tests validate multiple sequential updates
  - All tests use state functions imported from `js/state.js`
  - Total test count increased from 237 to 247 tests
- **Backend Note**: These state functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.65.9

#### Day 185: Audio Recording Tests (2026-04-23)
- **Feature**: Added 23 new unit tests for Audio Recording functionality to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added 23 new tests covering:
    - addAudioClip function tests: existence, async behavior, invalid blob handling, empty blob handling, clip structure validation, default property values, clip name counter incrementing
    - Audio recording constants edge cases: input gain clamping at min/max boundaries, monitoring volume range validation
    - Recording state function signature tests: isTrackRecordingState, getRecordingTrackIdState, getRecordingStartTimeState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState
    - Recording function signature tests: startAudioRecording, stopAudioRecording, setRecordingInputGain existence and parameter counts
  - `js/constants.js`: Bumped APP_VERSION to 0.66.0
- **Feature Details**:
  - Tests verify Track.addAudioClip method exists and handles edge cases (null blob, empty blob)
  - Tests validate addAudioClip creates clips with correct structure and default properties (gain: 1.0, playbackRate: 1.0, startOffset: 0, crossfade: 0, fadeIn: 0, fadeOut: 0, reverse: false)
  - Tests verify audio recording constants are properly defined with valid ranges
  - Tests validate recording state and function signatures
  - Tests verify function parameter counts match expected API
  - Total test count increased from 498 to 521 tests
- **Backend Note**: The addAudioClip method in Track.js handles converting recorded audio blobs into timeline clips for Audio tracks. The tests verify the method's behavior without requiring actual audio recording or database access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.66.0

#### Day 186: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1

#### Day 187: Test Runner runTests Export Fix (2026-04-23)
- **Bug Fix**: Fixed missing `runTests` export in testRunner.js that prevented browser console test execution
- **Files Modified**:
  - `js/testRunner.js`: Added `runTests` async export function that calls `TestRunner.runAll(window.showNotification)` and properly exports `TestRunner` and `TestRunner.default`
  - `js/tests.js`: Removed duplicate `runTests` export (now provided by testRunner.js)
  - `js/constants.js`: Bumped APP_VERSION to 0.67.1
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.67.1


#### Day 188: MIDI Learn UI Bug Fix (2026-04-24)
- **Bug Fix**: Fixed `updateMidiLearnMappingsUI` in `js/main.js` to use correct variable reference
- **Files Modified**:
  - `js/main.js`: Changed `localAppServices.updateMidiLearnMappingsList` to `appServices.updateMidiLearnMappingsList` since the function is defined on the `appServices` object passed to `localAppServices`
- **Feature Details**:
  - The `updateMidiLearnMappingsUI` function was trying to call `localAppServices.updateMidiLearnMappingsList` but the function is actually available on `appServices` (the main appServices object)
  - This bug would have caused MIDI Learn UI updates to silently fail
  - Also added a warning message when `updateMidiLearnMappingsList` is not available for better debugging
- **Version**: Bumped to 0.72.1

#### Day 187: Metronome Constants (2026-04-24)
- **Feature**: Added metronome constants to js/constants.js for consistent configuration
- **Files Modified**:
  - `js/constants.js`: Added metronome constants:
    - `DEFAULT_METRONOME_ENABLED` (false) - Metronome off by default
    - `DEFAULT_METRONOME_VOLUME` (0.5) - Default volume in 0-1 range
    - `MIN_METRONOME_VOLUME` (0) - Minimum volume
    - `MAX_METRONOME_VOLUME` (1) - Maximum volume
  - `js/constants.js`: Bumped APP_VERSION to 0.72.0
- **Feature Details**:
  - These constants provide centralized configuration for metronome settings
  - The audio.js metronome already used `Constants.METRONOME_VOLUME || 0.5` pattern, now that fallback is properly defined as a constant
  - Constants are used by audio.js for initializing metronome volume
- **Version**: Bumped to 0.72.0
