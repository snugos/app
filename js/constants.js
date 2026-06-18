// Day 589: Quantize Sequence Tests - adds comprehensive tests for quantizeSequence method. The method snaps note columns to a quantize grid (1/16, 1/8, 1/4) to correct timing inaccuracies. Includes undo capture BEFORE mutation, getActiveSequence validation, Audio track handling, collision detection, and nearest-free-slot placement. Adds 16 tests. Version bump to 2.245.0.
/// Day 563: Shift Notes Up/Down - adds Ctrl+Alt+Up/Down for octave shifting (12 semitones) via context menu and keyboard shortcuts
// Added Ctrl+Q keyboard shortcut to quantize only the selected sequencer cells to the current snap grid.
// Uses selected-cell class to identify selected notes, snaps each note's column to the nearest snapValue grid point.
// Prevents collision by checking if target slot is empty before moving.
// Context menu already has Quantize to 1/16/1/8/1/4 options; this adds a keyboard shortcut for quick access.
// Version bump to 2.194.0.
// Day 532: Ctrl+A Select All Notes in Sequencer - Added Ctrl+A keyboard shortcut to select all notes in the active sequencer. Gets active sequencer track via getActiveSequencerTrackId(), selects all .sequencer-step-cell elements via querySelectorAll and adds selected-cell class for copy/paste compatibility. Uses getWindowByIdState to access sequencer window element. Shows notification with sequence name. Prevents default browser behavior. Added 7 tests for Ctrl+A functionality. All JS files pass node --check. // Day 531: Restore tests.js - revert substrate-bot test truncation commit - Restored tests.js from 7132 lines to 12614 lines (5494 insertions) after substrate-bot commit 472200e5 removed 1076 tests. Verified cleanupRecordingAudioResources is properly imported from audio.js (line 167). node --check passes. All tests restored.
// Day 521: Track State Management & Render Functions Tests - Added 54 unit tests for track state management functions (addTrackToStateInternal, removeTrackFromStateInternal, renameTrackInState) and UI render functions (renderMixer, renderSoundBrowserFavorites, renderSoundBrowserRecent, renderSoundBrowserDirectoryFiltered, toggleSequencerViewMode, openMixerWindow). Tests cover function exports, parameter counts, async nature, Track instance creation, undo capture, track element creation, and window management patterns. Also added missing imports for these functions in tests.js. Total tests increased from 2029 to 2081. // Day 520: Additional Window Function Tests - Added 53 unit tests for openTrackSequencerWindow, openTimelineWindow, openTrackInspectorWindow, openMasterEffectsRackWindow, openTrackEffectsRackWindow, and openProjectNotesWindow functions. Tests cover function exports, parameter counts, single-instance window management using getOpenWindows/getWindowByIdState, createWindow usage, localAppServices references, savedState handling, and function-specific behavior. Tests increased from 1976 to 2029. // Day 519: Core Window Function Tests - Added 31 unit tests for openMixerWindow, openSoundBrowserWindow, and openGlobalControlsWindow functions. Tests cover function exports, parameter counts, single-instance window management using getOpenWindows, createWindow usage, windowId values, HTML content building, UI element references (play/stop/record buttons, tempo, meter), onReadyCallback handling, localAppServices references, and savedState for window restoration. Version bump to 2.182.0. // Day 518: showKeyboardShortcutsHelpWindow Tests - Added 14 unit tests for the showKeyboardShortcutsHelpWindow function exported from ui.js. Tests cover function export, parameter count, getOpenWindows reference, single-instance window management, HTML content building, all keyboard shortcut sections (Playback Controls, Edit Operations, Track Controls, Piano Keys, Snap & Quantize), createWindow usage, and KEYBOARD_SHORTCUTS_HELP_WIDTH/HEIGHT constant references. Total tests increased from 1931 to 1945. // Day 517: Fix Missing Sequencer Context Menu Tests - Added 2 missing tests from Day 505 block: Scale Velocities (100%) and Quantize to 1/4. The Day 505 tests covered Scale Velocities at 50%, 75%, 125% but missed the 100% option, and covered Quantize to 1/16 and 1/8 but missed 1/4. Both menu items exist in ui.js but tests were never written. Total tests increased from 1929 to 1931. // Day 516: Fix tests.js syntax - duplicate stopMetronome import. // Day 515: Audio Track Inspector Implementation - Added buildAudioTrackInspectorDOM and initializeAudioTrackInspectorControls functions to provide Audio track inspector UI with audio input device selection, input gain knob, monitoring volume slider, and recording status indicator. Both functions are now wired in buildTrackInspectorContentDOM and initializeTypeSpecificInspectorControls. // Day 513: Sidechain Audio Functions Tests - Added 34 unit tests for Sidechain audio functions (handleSidechainParamChangeForEffect, enableSidechainFromTrackForEffect, enableSidechainFromTrackIn, disableSidechainBus) covering function exports, parameter counts, async nature, effectNode validation, sidechainTrackAssignments, localAppServices integration, inputChannel checks, bus connections, and dispose behavior. // Day 512: EffectsRegistry Functions Tests - Added 19 unit tests for EffectsRegistry functions (getEffectBypassState, setEffectBypassState, getEffectParamDefinitions) (getTransportPosition, getTransportSeconds, getTransportBpm, getTransportState) and audio mixdown export (exportMixdownToWav). Tests verify function exports, async nature, parameter counts, Tone.Recorder usage, masterGain connection, transport control, error handling, and recording size validation. Version bump to 2.176.0.

// App Version

export const APP_VERSION = '2.373.0';
// Day 378: Audio Clip Editor normalizeAudioClip Function Tests // Day 377: UI Constants Tests // Day 376: Utils Module Functions Tests // Day 375: Effects Registry Tests // Day 374: Sound Browser Extended Functions Tests // Day 373: Global Controls Window UI Tests // Day 372: DB Module Extended Tests // Day 371: Mixer UI Event Handler Functions Tests // Day 370: MIDI Import Functions Tests // Day 369: MIDI Export/Import Functions Tests
// Day 367: Audio Module Extended Utility Functions Tests // Day 366: Effect Presets State Functions Tests // Day 365: Timeline Zoom State Functions Tests // Day 364: Sequence & Note Methods Tests // Day 363: Knob UI & Inspector Initialization Function Tests // Day 362: Audio Track Inspector UI Functions Tests // Day 361: Scale Mode & Swing State Functions Tests // Day 360: Scale Mode & Swing State Functions Tests // Day 359: Chord Mode State Functions Tests // Day 358: Track Effect Instance Methods Tests // Day 357: Window Management State Functions Tests // Day 356: Project Save/Load Functions Tests // Day 355: Recording Audio Module Extended Function Tests
// Day 313: Extended UI Function Tests (2026-04-28)

// Desktop Background Constants
export const DESKTOP_BACKGROUND_KEY = 'snugos_desktop_background';
export const DESKTOP_BG_TYPE_KEY = 'snugos_desktop_bg_type';

// Performance Monitor Constants
export const PERFORMANCE_MONITOR_ENABLED = true; // Feature flag
export const PERFORMANCE_UPDATE_INTERVAL_MS = 500; // Update every 500ms
export const PERFORMANCE_CONTEXT_STATE_OK = 'running'; // Tone.context.state should be 'running'
export const PERFORMANCE_CONTEXT_STATE_SUSPENDED = 'suspended';
export const PERFORMANCE_CONTEXT_STATE_CLOSED = 'closed';
export const PERFORMANCE_AUDIO_BUFFER_SIZE_STEPS = 4; // Tone.js default buffer latency is ~3-4 blocks
export const PERFORMANCE_DEFAULT_LATENCY_HINT = 'interactive'; // Tone.js context latency hint
export const PERFORMANCE_MEMORY_PRESSURE_NONE = 'none';
export const PERFORMANCE_MEMORY_PRESSURE_LOW = 'low';
export const PERFORMANCE_MEMORY_PRESSURE_MEDIUM = 'medium';
export const PERFORMANCE_MEMORY_PRESSURE_HIGH = 'high';
export const PERFORMANCE_WARNING_THRESHOLD_MS = 50; // If callback takes >50ms, warn about audio glitch risk

export const STEPS_PER_BAR = 16;
export const defaultStepsPerBar = 16; // Default for new tracks
export const MAX_BARS = 512; // Maximum number of bars a sequence can have
export const MIN_TEMPO = 0; // Minimum tempo in BPM
export const MAX_TEMPO = 999; // Maximum tempo in BPM

// Randomize Sequence Constants
export const RANDOMIZE_DENSITY_MIN = 0.05; // Minimum density (5% chance per cell)
export const RANDOMIZE_DENSITY_MAX = 0.95; // Maximum density (95% chance per cell)
export const RANDOMIZE_DENSITY_DEFAULT = 0.25; // Default density (25% chance per cell)

// Fill Gaps Sequence Constants
export const FILL_GAPS_MIN_FACTOR = 0.1; // Minimum fill factor (10% chance to fill an empty cell)
export const FILL_GAPS_MAX_FACTOR = 1.0; // Maximum fill factor (100% chance)
export const FILL_GAPS_DEFAULT_FACTOR = 0.5; // Default fill factor (50% chance)
export const FILL_GAPS_VELOCITY_SCALE = 0.8; // Filled notes get 80% of surrounding average velocity

// Prune Redundancy Sequence Constants
export const PRUNE_REDUNDANCY_MIN_REPEATS = 2; // Minimum consecutive repeats to trigger pruning
export const PRUNE_REDUNDANCY_MAX_REPEATS = 16; // Maximum consecutive repeats to keep

// Euclidean Rhythm Constants (Bjorklund's algorithm)
export const EUCLIDEAN_MIN_PULSES = 0; // 0 pulses = all rests
export const EUCLIDEAN_MAX_PULSES = 64; // Upper bound for total steps
export const EUCLIDEAN_DEFAULT_TOTAL = 16; // Default total steps (1 bar at 1/16)
export const EUCLIDEAN_DEFAULT_PULSES = 4; // Default pulse count (4-on-the-floor)
export const EUCLIDEAN_ROTATION_MIN = 0;
export const EUCLIDEAN_ROTATION_MAX = 63;

// Stutter Notes Constants
export const STUTTER_MIN_REPEATS = 2; // Minimum repeat count (2x = original + 1 repeat)
export const STUTTER_MAX_REPEATS = 8; // Maximum repeat count (8x)
export const STUTTER_DEFAULT_REPEATS = 4; // Default 4x stutter
export const STUTTER_VELOCITY_DECAY_MIN = 0.3; // Minimum decay (0.3 = each repeat at 30% of prev)
export const STUTTER_VELOCITY_DECAY_MAX = 1.0; // Maximum decay (1.0 = no decay)
export const STUTTER_VELOCITY_DECAY_DEFAULT = 0.7; // Default velocity decay (70% per repeat)
// Arpeggiate Notes Constants (per-track arp that cycles overlapping notes N times at a chosen rate)
export const ARPEGGIATE_MIN_RATE_MS = 10; // Minimum ms between arpeggiated notes
export const ARPEGGIATE_MAX_RATE_MS = 500; // Maximum ms between arpeggiated notes
export const ARPEGGIATE_DEFAULT_RATE_MS = 80; // Default 80ms (12.5 notes/sec)
export const ARPEGGIATE_MIN_REPEATS = 1; // Minimum cycle repeats
export const ARPEGGIATE_MAX_REPEATS = 16; // Maximum cycle repeats
export const ARPEGGIATE_DEFAULT_REPEATS = 4; // Default cycle the pattern 4 times
export const ARPEGGIATE_VELOCITY_DECAY = 0.85; // Each repeat slightly softer

// Burst Notes Constants (ratchet: subdivide each note into N rapid micro-notes)
export const BURST_MIN_DIVISIONS = 2; // Minimum number of sub-notes per burst (2x)
export const BURST_MAX_DIVISIONS = 8; // Maximum sub-notes per burst (8x)
export const BURST_DEFAULT_DIVISIONS = 4; // Default 4 sub-notes per burst
export const BURST_MIN_VELOCITY = 0.1; // Floor velocity for last sub-note
export const BURST_VELOCITY_CURVE_FLAT = 'flat'; // All sub-notes at same velocity
export const BURST_VELOCITY_CURVE_DECAY = 'decay'; // Linear decay (machine gun effect)
export const BURST_VELOCITY_CURVE_ATTACK = 'attack'; // Crescendo (ramp up)
export const BURST_VELOCITY_CURVE_PYRAMID = 'pyramid'; // Crescendo then decay (accent in middle)
export const BURST_VELOCITY_CURVES = [BURST_VELOCITY_CURVE_FLAT, BURST_VELOCITY_CURVE_DECAY, BURST_VELOCITY_CURVE_ATTACK, BURST_VELOCITY_CURVE_PYRAMID];

export const STUTTER_MIN_VELOCITY = 0.1; // Floor velocity for last repeat

// Chord Harmonize Constants (Day 697)
// For each note, add chord-tone copies at semitone offsets from the current Chord Mode type
export const HARMONIZE_MIN_VELOCITY_FACTOR = 0.1; // Minimum velocity factor for harmonized copies (prevents silent copies)
export const HARMONIZE_MAX_INTERVALS_PER_CHORD = 7; // Maximum intervals allowed (matches largest chord: major7/minor7)
export const HARMONIZE_DEFAULT_VELOCITY_FACTOR = 0.7; // Default velocity factor for harmonized copies (70% of original)
export const HARMONIZE_VOICING_CLOSED = 'closed'; // Closed voicing (tight chord in same octave)
export const HARMONIZE_VOICING_WIDE = 'wide'; // Wide voicing (spread across two octaves)
export const HARMONIZE_VOICINGS = [HARMONIZE_VOICING_CLOSED, HARMONIZE_VOICING_WIDE];

export const ECHO_MIN_TAPS = 2; // Minimum number of delay taps per source note
export const ECHO_MAX_TAPS = 8; // Maximum number of delay taps per source note
export const ECHO_DEFAULT_TAPS = 4; // Default number of delay taps
export const ECHO_MIN_DELAY_STEPS = 1; // Minimum steps between delay taps
export const ECHO_MAX_DELAY_STEPS = 16; // Maximum steps between delay taps
export const ECHO_DEFAULT_DELAY_STEPS = 2; // Default 2 steps (1/8 note) between taps
export const ECHO_MIN_DECAY = 0.1; // Minimum velocity decay (each tap at 10% of prev)
export const ECHO_MAX_DECAY = 1.0; // Maximum decay (1.0 = no decay)
export const ECHO_DEFAULT_DECAY = 0.6; // Default 60% decay per tap (natural echo taper)

// Day 701: Invert Probabilities Constants - mirror of invertVelocities for probability values
// Inverts note probabilities around the center point of their current range.
// Rare notes become common, common notes become rare.
export const INVERT_PROB_MIN = 0.0; // Minimum probability value (0% chance of triggering)
export const INVERT_PROB_MAX = 1.0; // Maximum probability value (100% chance of triggering)

// Scale Probabilities Constants (Day 699) - mirrors Scale Velocities but for probability values
// Scale each note's probability by a factor. 1.0 = no change, 0.5 = halve probability, 1.5 = boost 1.5x
export const SCALE_PROB_MIN_FACTOR = 0.1; // Minimum scale factor (10% of original probability)
export const SCALE_PROB_MAX_FACTOR = 3.0; // Maximum scale factor (3x of original probability)
export const SCALE_PROB_DEFAULT_FACTOR = 1.0; // Default no-op
export const SCALE_PROB_FACTOR_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]; // Menu presets

// Day 702: Bounce Notes Constants - ricochets notes in random directions within a step range
// Creates bouncing, scattered patterns. Each note moves by a random shift within maxOffsetSteps.
// Each bounce independently chooses left or right.
export const BOUNCE_MIN_OFFSET_STEPS = 1; // Minimum step shift (1 step = 1/16 note at 16th grid)
export const BOUNCE_MAX_OFFSET_STEPS = 8; // Maximum step shift (8 steps = 1/2 note)
export const BOUNCE_DEFAULT_OFFSET_STEPS = 4; // Default 4 steps (1/4 note max shift)
export const BOUNCE_MIN_SKIP_CHANCE = 0.0; // Minimum probability of skipping a note
export const BOUNCE_MAX_SKIP_CHANCE = 0.9; // Maximum probability of skipping a note
export const BOUNCE_DEFAULT_SKIP_CHANCE = 0.0; // Default no skip (all notes bounce)
export const BOUNCE_MIN_VELOCITY_FACTOR = 0.1; // Minimum velocity factor (preserves 10% velocity at floor)
export const BOUNCE_MAX_VELOCITY_FACTOR = 1.0; // Maximum velocity factor (1.0 = no change)
export const BOUNCE_DEFAULT_VELOCITY_FACTOR = 0.9; // Default 90% velocity (slight attenuation per bounce)

// Day 703: Shuffle Notes Constants - randomly redistribute notes within a window
// For each active note, randomly shifts its position by -windowSteps..+windowSteps
// Preserves note count, density, and average velocity but creates organic, less-repetitive timing
export const SHUFFLE_MIN_WINDOW_STEPS = 1; // Minimum window size (1 step = ±1)
export const SHUFFLE_MAX_WINDOW_STEPS = 8; // Maximum window size (8 steps = ±1/2 note)
export const SHUFFLE_DEFAULT_WINDOW_STEPS = 2; // Default 2 step window (±1/8 note)
export const SHUFFLE_MIN_SKIP_CHANCE = 0.0; // Minimum probability of leaving a note in place
export const SHUFFLE_MAX_SKIP_CHANCE = 0.9; // Maximum skip chance (10% would shuffle)
export const SHUFFLE_DEFAULT_SKIP_CHANCE = 0.0; // Default: all notes shuffle
export const SHUFFLE_MIN_VELOCITY_FACTOR = 0.1; // Minimum velocity factor
export const SHUFFLE_MAX_VELOCITY_FACTOR = 1.0; // Maximum velocity factor (1.0 = no change)
export const SHUFFLE_DEFAULT_VELOCITY_FACTOR = 1.0; // Default: preserve velocity exactly

// Day 704: Accent Notes Constants - boost velocity of notes on specific beat positions
// Creates groove and rhythmic feel by accenting downbeats, onbeats, or offbeats
// Useful for adding swing-style pulse or emphasizing certain steps in the pattern
export const ACCENT_NOTES_MIN_TARGET_VELOCITY = 0.3; // Minimum accent target velocity
export const ACCENT_NOTES_MAX_TARGET_VELOCITY = 1.0; // Maximum accent target velocity
export const ACCENT_NOTES_DEFAULT_TARGET_VELOCITY = 0.95; // Default target velocity for accented notes (strong but not maxed)
export const ACCENT_NOTES_MIN_STEPS_PER_BEAT = 1; // Minimum steps per beat
export const ACCENT_NOTES_MAX_STEPS_PER_BEAT = 16; // Maximum steps per beat
export const ACCENT_NOTES_DEFAULT_STEPS_PER_BEAT = 4; // Default 4 steps per beat (16th note grid @ 4/4)
export const ACCENT_NOTES_MODE_DOWNBEATS = 'downbeats'; // Accent only bar starts (col % 16 === 0)
export const ACCENT_NOTES_MODE_ONBEATS = 'onbeats'; // Accent every beat (col % 4 === 0)
export const ACCENT_NOTES_MODE_OFFBEATS = 'offbeats'; // Accent between beats (col % 4 === 2)
export const ACCENT_NOTES_MODE_EIGHTHS = 'eighths'; // Accent every 8th note (col % 2 === 0)
export const ACCENT_NOTES_MODE_EVERY_STEP = 'every-step'; // Accent every step (all notes)
export const ACCENT_NOTES_MODE_CUSTOM = 'custom'; // Accent user-specified step positions
export const ACCENT_NOTES_MODES = [
    ACCENT_NOTES_MODE_DOWNBEATS,
    ACCENT_NOTES_MODE_ONBEATS,
    ACCENT_NOTES_MODE_OFFBEATS,
    ACCENT_NOTES_MODE_EIGHTHS,
    ACCENT_NOTES_MODE_EVERY_STEP,
    ACCENT_NOTES_MODE_CUSTOM
];

// Day 705: Stagger Notes Constants - spread simultaneous notes in a chord across multiple columns
// Creates cascading, rippling patterns at the sequencer (note) level
// Complements strumNotes (per-chord strum) with direction-aware multi-step spreading
export const STAGGER_NOTES_MIN_STAGGER_STEPS = 1; // Minimum 1 step between staggered notes
export const STAGGER_NOTES_MAX_STAGGER_STEPS = 8; // Maximum 8 steps (1/2 note) between staggered notes
export const STAGGER_NOTES_DEFAULT_STAGGER_STEPS = 2; // Default 2 steps (1/8 note) between staggered notes
export const STAGGER_NOTES_MIN_VELOCITY_FACTOR = 0.3; // Minimum velocity factor (preserves 30% velocity at floor)
export const STAGGER_NOTES_MAX_VELOCITY_FACTOR = 1.0; // Maximum velocity factor (1.0 = no change)
export const STAGGER_NOTES_DEFAULT_VELOCITY_FACTOR = 0.95; // Default slight attenuation per stagger position
export const STAGGER_NOTES_DIRECTION_UP = 'up'; // Stagger from bottom row up
export const STAGGER_NOTES_DIRECTION_DOWN = 'down'; // Stagger from top row down
export const STAGGER_NOTES_DIRECTION_OUTWARD = 'outward'; // Stagger from middle outward
export const STAGGER_NOTES_DIRECTION_INWARD = 'inward'; // Stagger from outside inward
export const STAGGER_NOTES_DIRECTIONS = [
    STAGGER_NOTES_DIRECTION_UP,
    STAGGER_NOTES_DIRECTION_DOWN,
    STAGGER_NOTES_DIRECTION_OUTWARD,
    STAGGER_NOTES_DIRECTION_INWARD
];

// Day 709: Crescent Notes Constants - shape a sequence into "crescent" patterns
// Groups consecutive notes (window) and shifts each group with rising velocity,
// creating an arc/crescent-moon shape in the sequencer
// Complements strumNotes (per-column strum) and staggerNotes (per-chord stagger)
// with a new per-group time-shift + velocity ramp pattern
export const CRESCENT_NOTES_MIN_WINDOW_STEPS = 1; // Minimum 1 step window between grouped notes
export const CRESCENT_NOTES_MAX_WINDOW_STEPS = 8; // Maximum 8 steps (1/2 note) window
export const CRESCENT_NOTES_DEFAULT_WINDOW_STEPS = 2; // Default 2 steps (1/8 note) window
export const CRESCENT_NOTES_MIN_SHIFT = 1; // Minimum 1 step time-shift per crescent position
export const CRESCENT_NOTES_MAX_SHIFT = 8; // Maximum 8 steps (1/2 note) time-shift per position
export const CRESCENT_NOTES_DEFAULT_SHIFT = 2; // Default 2 steps (1/8 note) shift per position
export const CRESCENT_NOTES_MIN_VELOCITY_FACTOR = 0.3; // Minimum velocity factor (30% velocity floor)
export const CRESCENT_NOTES_MAX_VELOCITY_FACTOR = 1.0; // Maximum velocity factor (1.0 = no scaling)
export const CRESCENT_NOTES_DEFAULT_VELOCITY_FACTOR = 0.85; // Default 85% velocity preservation
export const CRESCENT_NOTES_SHAPE_ARC = 'arc'; // Notes rise then fall (crescent moon)
export const CRESCENT_NOTES_SHAPE_ASCEND = 'ascend'; // Notes only rise (build)
export const CRESCENT_NOTES_SHAPE_DESCEND = 'descend'; // Notes only fall (decay)
export const CRESCENT_NOTES_SHAPES = [
    CRESCENT_NOTES_SHAPE_ARC,
    CRESCENT_NOTES_SHAPE_ASCEND,
    CRESCENT_NOTES_SHAPE_DESCEND
];

// Day 710: Trill Notes Constants - rapidly alternate two notes by re-pitching them up/down
// for `taps` cycles, each tap one semitone above (ascending) or below (descending) the source,
// creating a classic trill ornament effect at the sequencer (note) level.
// Complements strumNotes, staggerNotes, crescentNotes, etc. with a pitch-based ornament.
export const TRILL_NOTES_MIN_TAPS = 2; // Minimum trill taps (2 = single up+down oscillation)
export const TRILL_NOTES_MAX_TAPS = 16; // Maximum trill taps (16 = 8 full up-down oscillations)
export const TRILL_NOTES_DEFAULT_TAPS = 6; // Default 6 taps (~3 cycles of up/down)
export const TRILL_NOTES_MIN_INTERVAL = 1; // Minimum semitone interval from source (unison = no trill)
export const TRILL_NOTES_MAX_INTERVAL = 12; // Maximum semitone interval (1 octave)
export const TRILL_NOTES_DEFAULT_INTERVAL = 2; // Default 2 semitones (whole step) trill
export const TRILL_NOTES_MIN_VELOCITY_FACTOR = 0.5; // Floor for velocity scaling
export const TRILL_NOTES_MAX_VELOCITY_FACTOR = 1.0; // Maximum velocity factor (1.0 = no scaling)
export const TRILL_NOTES_DEFAULT_VELOCITY_FACTOR = 0.95; // Default 95% velocity preservation
export const TRILL_NOTES_DIRECTION_UP = 'up'; // Trill alternates: source, +N, source, +N...
export const TRILL_NOTES_DIRECTION_DOWN = 'down'; // Trill alternates: source, -N, source, -N...
export const TRILL_NOTES_DIRECTION_BOTH = 'both'; // Trill alternates: +N, -N, +N, -N (no source repeats)
export const TRILL_NOTES_DIRECTIONS = [
    TRILL_NOTES_DIRECTION_UP,
    TRILL_NOTES_DIRECTION_DOWN,
    TRILL_NOTES_DIRECTION_BOTH
];

// Day 711: Drift Notes Constants - progressively shift notes over the sequence
// Creates a "drifting" effect where notes shift by progressively larger or smaller
// amounts as they move through the bar. Complements bounceNotes (random shift)
// and shuffleNotes (random window shift) with a deterministic, evolving pattern.
//
// driftMode controls how the shift evolves across the bar:
//   'linear-up': shift grows linearly from 0 to maxShift (notes spread right as bar progresses)
//   'linear-down': shift starts at maxShift and shrinks to 0 (notes compress right as bar progresses)
//   'linear-center': shift = 0 at start and end, peak at middle (drift out and back)
//   'random-per-note': each note gets a per-note random shift within maxShift
//   'mirror': each note's shift is the mirror of its position's "linear-up" value
//
// skipChance: probability of leaving a note in place (0.0 = all notes drift)
// velocityFactor: scales the velocity of drifted notes (1.0 = no change)
// Complements strumNotes, staggerNotes, crescentNotes, trillNotes, etc.
export const DRIFT_NOTES_MIN_MAX_SHIFT = 1; // Minimum drift distance in steps
export const DRIFT_NOTES_MAX_MAX_SHIFT = 8; // Maximum drift distance in steps (1/2 note)
export const DRIFT_NOTES_DEFAULT_MAX_SHIFT = 4; // Default 4 steps (1/4 note) max drift
export const DRIFT_NOTES_MIN_SKIP_CHANCE = 0.0; // Minimum probability of skipping a note
export const DRIFT_NOTES_MAX_SKIP_CHANCE = 0.9; // Maximum probability of skipping a note
export const DRIFT_NOTES_DEFAULT_SKIP_CHANCE = 0.0; // Default: all notes drift
export const DRIFT_NOTES_MIN_VELOCITY_FACTOR = 0.1; // Minimum velocity factor (preserves 10% velocity at floor)
export const DRIFT_NOTES_MAX_VELOCITY_FACTOR = 1.0; // Maximum velocity factor (1.0 = no change)
export const DRIFT_NOTES_DEFAULT_VELOCITY_FACTOR = 0.95; // Default slight attenuation per drift step
export const DRIFT_NOTES_MODE_LINEAR_UP = 'linear-up'; // Shift grows from 0 to maxShift
export const DRIFT_NOTES_MODE_LINEAR_DOWN = 'linear-down'; // Shift shrinks from maxShift to 0
export const DRIFT_NOTES_MODE_LINEAR_CENTER = 'linear-center'; // V-shape: 0 shift at middle, full shift at start and end
export const DRIFT_NOTES_MODE_RANDOM_PER_NOTE = 'random-per-note'; // Each note gets a random shift in [-maxShift, +maxShift]
export const DRIFT_NOTES_MODE_MIRROR = 'mirror'; // Inverted V: 0 at start/end, maxShift at middle
export const DRIFT_NOTES_MODES = [
    DRIFT_NOTES_MODE_LINEAR_UP,
    DRIFT_NOTES_MODE_LINEAR_DOWN,
    DRIFT_NOTES_MODE_LINEAR_CENTER,
    DRIFT_NOTES_MODE_RANDOM_PER_NOTE,
    DRIFT_NOTES_MODE_MIRROR
];

// Cascade Notes - cascade each note into a waterfall of notes that follow the source into subsequent rows
// Creates dense, falling/rising patterns across the grid (column + row movement).
// Complements staggerNotes (row-only), driftNotes (column-only), and arpeggiateNotes (column-only cycles).
export const CASCADE_NOTES_MIN_STEPS = 1; // Minimum number of cascade steps per source note
export const CASCADE_NOTES_MAX_STEPS = 8; // Maximum cascade steps per source note (8 rows of fall)
export const CASCADE_NOTES_DEFAULT_STEPS = 4; // Default 4 cascade steps (4-row waterfall)
export const CASCADE_NOTES_MIN_STEP_DELAY = 0; // Minimum columns between cascade notes (0 = same column)
export const CASCADE_NOTES_MAX_STEP_DELAY = 8; // Maximum 8 columns between cascade notes (1/2 note)
export const CASCADE_NOTES_DEFAULT_STEP_DELAY = 2; // Default 2 columns (1/8 note) between cascade notes
export const CASCADE_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum velocity decay per cascade step
export const CASCADE_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum decay (1.0 = no decay)
export const CASCADE_NOTES_DEFAULT_VELOCITY_DECAY = 0.75; // Default 75% velocity preservation per cascade step (natural fade)
export const CASCADE_NOTES_DIRECTION_DOWN = 'down'; // Cascade flows downward (row +N)
export const CASCADE_NOTES_DIRECTION_UP = 'up'; // Cascade flows upward (row -N)
export const CASCADE_NOTES_DIRECTIONS = [
    CASCADE_NOTES_DIRECTION_DOWN,
    CASCADE_NOTES_DIRECTION_UP
];

// Spiral Notes - spawn N notes in a spiral/rotating pattern around each source note
// Complements cascadeNotes (linear 2D row+col), driftNotes (column-only), and crescentNotes (grouped arc).
export const SPIRAL_NOTES_MIN_LENGTH = 1;
export const SPIRAL_NOTES_MAX_LENGTH = 16;
export const SPIRAL_NOTES_DEFAULT_LENGTH = 8;
export const SPIRAL_NOTES_MIN_RADIUS_STEP = 0;
export const SPIRAL_NOTES_MAX_RADIUS_STEP = 4;
export const SPIRAL_NOTES_DEFAULT_RADIUS_STEP = 1;
export const SPIRAL_NOTES_MIN_COLUMN_STEP = 1;
export const SPIRAL_NOTES_MAX_COLUMN_STEP = 4;
export const SPIRAL_NOTES_DEFAULT_COLUMN_STEP = 1;
export const SPIRAL_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const SPIRAL_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const SPIRAL_NOTES_DEFAULT_VELOCITY_DECAY = 0.88;
export const SPIRAL_NOTES_DIRECTION_CW = 'cw';
export const SPIRAL_NOTES_DIRECTION_CCW = 'ccw';
export const SPIRAL_NOTES_DIRECTIONS = [
    SPIRAL_NOTES_DIRECTION_CW,
    SPIRAL_NOTES_DIRECTION_CCW
];

// Radial Notes constants - 2D radial spoke pattern (sunburst) per source note
export const RADIAL_NOTES_MIN_SPOKES = 3; // Minimum 3 spokes (triangle)
export const RADIAL_NOTES_MAX_SPOKES = 16; // Maximum 16 spokes (full 16th circle)
export const RADIAL_NOTES_DEFAULT_SPOKES = 8; // Default 8 spokes (octagonal starburst)
export const RADIAL_NOTES_MIN_RADIUS = 1; // Minimum 1 row out per spoke
export const RADIAL_NOTES_MAX_RADIUS = 8; // Maximum 8 rows out per spoke
export const RADIAL_NOTES_DEFAULT_RADIUS = 3; // Default 3 rows out per spoke
export const RADIAL_NOTES_MIN_COLUMN_STEP = 0; // Minimum 0 columns forward per spoke
export const RADIAL_NOTES_MAX_COLUMN_STEP = 4; // Maximum 4 columns forward per spoke
export const RADIAL_NOTES_DEFAULT_COLUMN_STEP = 1; // Default 1 column forward per spoke
export const RADIAL_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum velocity decay per spoke
export const RADIAL_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum decay (1.0 = no decay)
export const RADIAL_NOTES_DEFAULT_VELOCITY_DECAY = 0.85; // Default 85% velocity preservation per spoke
export const RADIAL_NOTES_DIRECTION_OUT = 'out'; // Spokes fan out from source
export const RADIAL_NOTES_DIRECTION_IN = 'in'; // Spokes fan in toward source
export const RADIAL_NOTES_DIRECTIONS = [
    RADIAL_NOTES_DIRECTION_OUT,
    RADIAL_NOTES_DIRECTION_IN
];

// Ripple Notes constants - concentric ring expansion (stone-in-pond) per source note
export const RIPPLE_NOTES_MIN_RINGS = 1; // Minimum 1 ring
export const RIPPLE_NOTES_MAX_RINGS = 8; // Maximum 8 rings outward
export const RIPPLE_NOTES_DEFAULT_RINGS = 4; // Default 4 rings of expansion
export const RIPPLE_NOTES_MIN_RING_STEP = 1; // Minimum 1 row/col per ring
export const RIPPLE_NOTES_MAX_RING_STEP = 3; // Maximum 3 rows/cols per ring
export const RIPPLE_NOTES_DEFAULT_RING_STEP = 1; // Default 1 row/col per ring
export const RIPPLE_NOTES_MIN_COLUMN_STEP = 0; // Minimum 0 columns forward per ring
export const RIPPLE_NOTES_MAX_COLUMN_STEP = 4; // Maximum 4 columns forward per ring
export const RIPPLE_NOTES_DEFAULT_COLUMN_STEP = 1; // Default 1 column forward per ring
export const RIPPLE_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum velocity decay per ring
export const RIPPLE_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum decay (1.0 = no decay)
export const RIPPLE_NOTES_DEFAULT_VELOCITY_DECAY = 0.8; // Default 80% velocity preservation per ring
export const RIPPLE_NOTES_SHAPE_SQUARE = 'square'; // Full Chebyshev ring (8 surrounding cells at corner distance)
export const RIPPLE_NOTES_SHAPE_CROSS = 'cross'; // 4 cardinal-only ring (N/S/E/W)
export const RIPPLE_NOTES_SHAPE_DIAGONAL = 'diagonal'; // 4 diagonal-only ring (NE/NW/SE/SW)
export const RIPPLE_NOTES_SHAPES = [
    RIPPLE_NOTES_SHAPE_SQUARE,
    RIPPLE_NOTES_SHAPE_CROSS,
    RIPPLE_NOTES_SHAPE_DIAGONAL
];

// Glider Notes constants - diagonal/curved gliding note trails (comet streaks) from each source note
export const GLIDER_NOTES_MIN_LENGTH = 1; // Minimum 1 note in the glide trail
export const GLIDER_NOTES_MAX_LENGTH = 16; // Maximum 16 notes in the glide trail
export const GLIDER_NOTES_DEFAULT_LENGTH = 6; // Default 6 notes per glide trail
export const GLIDER_NOTES_MIN_ROW_STEP = 0; // Minimum 0 rows of vertical drift per step (flat horizontal glide)
export const GLIDER_NOTES_MAX_ROW_STEP = 4; // Maximum 4 rows of vertical drift per step (steep diagonal)
export const GLIDER_NOTES_DEFAULT_ROW_STEP = 1; // Default 1 row of vertical drift per step (gentle diagonal)
export const GLIDER_NOTES_MIN_COLUMN_STEP = 1; // Minimum 1 column forward per step (forward-in-time requirement)
export const GLIDER_NOTES_MAX_COLUMN_STEP = 4; // Maximum 4 columns forward per step
export const GLIDER_NOTES_DEFAULT_COLUMN_STEP = 1; // Default 1 column forward per step
export const GLIDER_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum decay (10% preservation at trail end)
export const GLIDER_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum decay (1.0 = no decay)
export const GLIDER_NOTES_DEFAULT_VELOCITY_DECAY = 0.88; // Default 88% preservation per step (smooth fade)
export const GLIDER_NOTES_MODE_FORWARD = 'forward'; // Straight diagonal down-right trail
export const GLIDER_NOTES_MODE_BACKWARD = 'backward'; // Straight diagonal down-left trail
export const GLIDER_NOTES_MODE_V = 'v'; // V shape: two arms (down-right + up-right)
export const GLIDER_NOTES_MODE_INV_V = 'inv-v'; // Inverted V (chevron up): up-right + down-right
export const GLIDER_NOTES_MODE_X = 'x'; // X pattern: 4 diagonal arms from source
export const GLIDER_NOTES_MODE_ZIGZAG = 'zigzag'; // Alternating up-down trail (snake/zigzag line)
export const GLIDER_NOTES_MODES = [
    GLIDER_NOTES_MODE_FORWARD,
    GLIDER_NOTES_MODE_BACKWARD,
    GLIDER_NOTES_MODE_V,
    GLIDER_NOTES_MODE_INV_V,
    GLIDER_NOTES_MODE_X,
    GLIDER_NOTES_MODE_ZIGZAG
];

// Splatter Notes constants - randomized scatter of notes around each source (paint splatter texture)
export const SPLATTER_NOTES_MIN_COUNT = 1; // Minimum 1 scattered note per source
export const SPLATTER_NOTES_MAX_COUNT = 32; // Maximum 32 scattered notes per source
export const SPLATTER_NOTES_DEFAULT_COUNT = 8; // Default 8 scattered notes per source
export const SPLATTER_NOTES_MIN_ROW_RADIUS = 0; // Minimum 0 rows of vertical scatter (flat horizontal)
export const SPLATTER_NOTES_MAX_ROW_RADIUS = 8; // Maximum 8 rows of vertical scatter
export const SPLATTER_NOTES_DEFAULT_ROW_RADIUS = 3; // Default 3 rows of vertical scatter radius
export const SPLATTER_NOTES_MIN_COL_RADIUS = 1; // Minimum 1 column forward (forward-in-time requirement)
export const SPLATTER_NOTES_MAX_COL_RADIUS = 8; // Maximum 8 columns forward per scatter particle
export const SPLATTER_NOTES_DEFAULT_COL_RADIUS = 4; // Default 4 columns forward
export const SPLATTER_NOTES_MIN_MIN_VELOCITY = 0.05; // Minimum possible floor velocity
export const SPLATTER_NOTES_MAX_MIN_VELOCITY = 1.0; // Maximum possible floor velocity
export const SPLATTER_NOTES_DEFAULT_MIN_VELOCITY = 0.25; // Default floor velocity (low for soft splatter)
export const SPLATTER_NOTES_SHAPE_UNIFORM = 'uniform'; // Flat random within bounds (true splatter)
export const SPLATTER_NOTES_SHAPE_GAUSSIAN = 'gaussian'; // Clustered toward center (3-sample averaged)
export const SPLATTER_NOTES_SHAPE_SHELL = 'shell'; // Concentrated near max radius (outer halo)
export const SPLATTER_NOTES_SHAPE_WEIGHTED_TOP = 'weighted-top'; // Skewed upward (high pitch cluster)
export const SPLATTER_NOTES_SHAPE_WEIGHTED_BOTTOM = 'weighted-bottom'; // Skewed downward (low pitch cluster)
export const SPLATTER_NOTES_SHAPES = [
    SPLATTER_NOTES_SHAPE_UNIFORM,
    SPLATTER_NOTES_SHAPE_GAUSSIAN,
    SPLATTER_NOTES_SHAPE_SHELL,
    SPLATTER_NOTES_SHAPE_WEIGHTED_TOP,
    SPLATTER_NOTES_SHAPE_WEIGHTED_BOTTOM
];

// Strum Notes Constants
export const FAN_NOTES_MIN_LENGTH = 2; // Minimum 2 notes in the chord strum (at least a 2-note chord)
export const FAN_NOTES_MAX_LENGTH = 8; // Maximum 8 notes in the chord strum
export const FAN_NOTES_DEFAULT_LENGTH = 4; // Default 4-note chord strum
export const FAN_NOTES_MIN_ROW_SPAN = 1; // Minimum 1 row of vertical spread (tight cluster)
export const FAN_NOTES_MAX_ROW_SPAN = 8; // Maximum 8 rows of vertical spread (wide chord)
export const FAN_NOTES_DEFAULT_ROW_SPAN = 3; // Default 3 rows of vertical spread
export const FAN_NOTES_MIN_STAGGER = 0; // Minimum 0 columns delay (simultaneous chord)
export const FAN_NOTES_MAX_STAGGER = 4; // Maximum 4 columns delay between strum notes
export const FAN_NOTES_DEFAULT_STAGGER = 1; // Default 1 column delay (quick strum)
export const FAN_NOTES_MIN_VELOCITY_DECAY = 0.5; // Minimum velocity decay (50% preservation at last strum note)
export const FAN_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum decay (1.0 = no decay, all notes same velocity)
export const FAN_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per strum step (slight fade)
export const FAN_NOTES_DIRECTION_DOWN = 'down'; // Strum from top row down (higher pitch first)
export const FAN_NOTES_DIRECTION_UP = 'up'; // Strum from bottom row up (lower pitch first)
export const FAN_NOTES_DIRECTION_INWARD = 'inward'; // Strum from outside rows toward center
export const FAN_NOTES_DIRECTION_OUTWARD = 'outward'; // Strum from center toward outside rows
export const FAN_NOTES_DIRECTION_RANDOM = 'random'; // Random strum order
export const FAN_NOTES_DIRECTIONS = [
    FAN_NOTES_DIRECTION_DOWN,
    FAN_NOTES_DIRECTION_UP,
    FAN_NOTES_DIRECTION_INWARD,
    FAN_NOTES_DIRECTION_OUTWARD,
    FAN_NOTES_DIRECTION_RANDOM
];

export const MOSAIC_NOTES_MIN_ROWS = 1; // Minimum 1 row of tile vertically
export const MOSAIC_NOTES_MAX_ROWS = 8; // Maximum 8 rows of tile vertically
export const MOSAIC_NOTES_DEFAULT_ROWS = 3; // Default 3 rows of tile vertically
export const MOSAIC_NOTES_MIN_COLS = 1; // Minimum 1 column of tile horizontally
export const MOSAIC_NOTES_MAX_COLS = 8; // Maximum 8 columns of tile horizontally
export const MOSAIC_NOTES_DEFAULT_COLS = 3; // Default 3 columns of tile horizontally
export const MOSAIC_NOTES_MIN_ROW_SPACING = 1; // Minimum 1 row between tiles (adjacent)
export const MOSAIC_NOTES_MAX_ROW_SPACING = 4; // Maximum 4 rows between tiles (spread)
export const MOSAIC_NOTES_DEFAULT_ROW_SPACING = 1; // Default 1 row between tiles
export const MOSAIC_NOTES_MIN_COL_SPACING = 1; // Minimum 1 column between tiles (adjacent)
export const MOSAIC_NOTES_MAX_COL_SPACING = 4; // Maximum 4 columns between tiles (spread)
export const MOSAIC_NOTES_DEFAULT_COL_SPACING = 1; // Default 1 column between tiles
export const MOSAIC_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum decay (10% per manhattan step)
export const MOSAIC_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum decay (1.0 = no decay)
export const MOSAIC_NOTES_DEFAULT_VELOCITY_DECAY = 0.85; // Default 85% velocity preservation per manhattan step
export const MOSAIC_NOTES_SHAPE_SOLID = 'solid'; // All cells in the rows x cols grid are filled
export const MOSAIC_NOTES_SHAPE_CHECKER = 'checker'; // Alternating like a chessboard (only (r+c) even)
export const MOSAIC_NOTES_SHAPE_BRICK = 'brick'; // Offset alternating rows (only even c)
export const MOSAIC_NOTES_SHAPE_DIAMOND = 'diamond'; // Filled diamond where |dr|+|dc| <= radius
export const MOSAIC_NOTES_SHAPE_CROSS = 'cross'; // Plus sign — same row or same column as source
export const MOSAIC_NOTES_SHAPE_RING = 'ring'; // Single diamond outline where |dr|+|dc| === radius
export const MOSAIC_NOTES_SHAPES = [
    MOSAIC_NOTES_SHAPE_SOLID,
    MOSAIC_NOTES_SHAPE_CHECKER,
    MOSAIC_NOTES_SHAPE_BRICK,
    MOSAIC_NOTES_SHAPE_DIAMOND,
    MOSAIC_NOTES_SHAPE_CROSS,
    MOSAIC_NOTES_SHAPE_RING
];

export const WAVE_NOTES_MIN_LENGTH = 1; // Minimum 1 note in the wave sweep
export const WAVE_NOTES_MAX_LENGTH = 16; // Maximum 16 notes in the wave sweep
export const WAVE_NOTES_DEFAULT_LENGTH = 8; // Default 8 notes per wave sweep
export const WAVE_NOTES_MIN_AMPLITUDE = 0; // Minimum 0 rows of vertical swing (flat horizontal)
export const WAVE_NOTES_MAX_AMPLITUDE = 8; // Maximum 8 rows of vertical swing
export const WAVE_NOTES_DEFAULT_AMPLITUDE = 3; // Default 3 rows of vertical swing
export const WAVE_NOTES_MIN_FREQUENCY = 0; // Minimum 0 cycles per length (flat line)
export const WAVE_NOTES_MAX_FREQUENCY = 4; // Maximum 4 cycles per length (rapid oscillation)
export const WAVE_NOTES_DEFAULT_FREQUENCY = 1; // Default 1 cycle per length (single swoop)
export const WAVE_NOTES_MIN_PHASE = 0; // Minimum 0 radians phase shift
export const WAVE_NOTES_MAX_PHASE = 6.2832; // Maximum 2*PI radians phase shift (full cycle)
export const WAVE_NOTES_DEFAULT_PHASE = 0; // Default 0 radians phase shift
export const WAVE_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum decay (10% preservation at last step)
export const WAVE_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum decay (1.0 = no decay)
export const WAVE_NOTES_DEFAULT_VELOCITY_DECAY = 0.9; // Default 90% velocity preservation per step
export const WAVE_NOTES_WAVE_SINE = 'sine'; // Smooth sine wave (Math.sin)
export const WAVE_NOTES_WAVE_COSINE = 'cosine'; // Cosine wave (Math.cos)
export const WAVE_NOTES_WAVE_TRIANGLE = 'triangle'; // Triangle wave (linear up/down)
export const WAVE_NOTES_WAVE_SAWTOOTH = 'sawtooth'; // Sawtooth wave (linear ramp reset)
export const WAVE_NOTES_WAVE_SQUARE = 'square'; // Square wave (sign of sine)
export const WAVE_NOTES_WAVES = [
    WAVE_NOTES_WAVE_SINE,
    WAVE_NOTES_WAVE_COSINE,
    WAVE_NOTES_WAVE_TRIANGLE,
    WAVE_NOTES_WAVE_SAWTOOTH,
    WAVE_NOTES_WAVE_SQUARE
];

export const RICOCHET_NOTES_MIN_LENGTH = 1; // Minimum 1 bounce step (just the source row stamp)
export const RICOCHET_NOTES_MAX_LENGTH = 32; // Maximum 32 bounce steps (long ping-pong trail)
export const RICOCHET_NOTES_DEFAULT_LENGTH = 12; // Default 12 bounce steps (3-wall ping-pong)
export const RICOCHET_NOTES_MIN_ROW_VELOCITY = -4; // Minimum -4 row velocity (strong upward)
export const RICOCHET_NOTES_MAX_ROW_VELOCITY = 4; // Maximum +4 row velocity (strong downward)
export const RICOCHET_NOTES_DEFAULT_ROW_VELOCITY = 2; // Default +2 row velocity (gentle downward)
export const RICOCHET_NOTES_MIN_COL_VELOCITY = -4; // Minimum -4 col velocity (backward in time)
export const RICOCHET_NOTES_MAX_COL_VELOCITY = 4; // Maximum +4 col velocity (forward in time)
export const RICOCHET_NOTES_DEFAULT_COL_VELOCITY = 1; // Default +1 col velocity (steady forward)
export const RICOCHET_NOTES_MIN_WALL_ELASTICITY = 0.1; // Minimum wall elasticity (very lossy wall)
export const RICOCHET_NOTES_MAX_WALL_ELASTICITY = 1.0; // Maximum wall elasticity (perfectly elastic)
export const RICOCHET_NOTES_DEFAULT_WALL_ELASTICITY = 0.85; // Default 85% velocity preserved on bounce
export const RICOCHET_NOTES_MIN_ROW_GRAVITY = 0; // Minimum 0 row gravity (no gravity)
export const RICOCHET_NOTES_MAX_ROW_GRAVITY = 4; // Maximum +4 row gravity (strong downward pull)
export const RICOCHET_NOTES_DEFAULT_ROW_GRAVITY = 0; // Default 0 row gravity (clean bounce)
export const RICOCHET_NOTES_MIN_VELOCITY_DECAY = 0.5; // Minimum per-step velocity decay floor (50% per step)
export const RICOCHET_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no per-step velocity decay)
export const RICOCHET_NOTES_DEFAULT_VELOCITY_DECAY = 0.97; // Default 97% velocity preservation per step (slow fade)
export const RICOCHET_NOTES_AXIS_BOTH = 'both'; // Bounce off both top/bottom and left/right walls
export const RICOCHET_NOTES_AXIS_ROW_ONLY = 'row-only'; // Bounce off only top/bottom walls (col passes through)
export const RICOCHET_NOTES_AXIS_COL_ONLY = 'col-only'; // Bounce off only left/right walls (row passes through)
export const RICOCHET_NOTES_AXES = [
    RICOCHET_NOTES_AXIS_BOTH,
    RICOCHET_NOTES_AXIS_ROW_ONLY,
    RICOCHET_NOTES_AXIS_COL_ONLY
];

// Day 722: Phyllotaxis Notes Constants
// Phyllotaxis is the botanical arrangement of leaves (Fermat's golden-angle spiral used by sunflowers).
// Each source note spawns N notes at polar angles `i * angle` and radii `scale * sqrt(i)`,
// giving the classic sunflower / pinecone spiral pattern.
// rowOffset = round(cos(angleRad + angleOffset) * scale * sqrt(i))
// colOffset = round(sin(angleRad + angleOffset) * columnStep * sqrt(i))
export const PHYLLOTAXIS_NOTES_MIN_COUNT = 1; // Minimum 1 leaf in the spiral
export const PHYLLOTAXIS_NOTES_MAX_COUNT = 64; // Maximum 64 leaves (full 1/2-turn of a sunflower)
export const PHYLLOTAXIS_NOTES_DEFAULT_COUNT = 16; // Default 16 leaves (1 full turn)
export const PHYLLOTAXIS_NOTES_MIN_SCALE = 0; // Minimum 0 spiral radius (all leaves at source row)
export const PHYLLOTAXIS_NOTES_MAX_SCALE = 8; // Maximum 8 rows of spiral radius
export const PHYLLOTAXIS_NOTES_DEFAULT_SCALE = 2; // Default 2 rows of spiral radius
export const PHYLLOTAXIS_NOTES_MIN_ANGLE = 30; // Minimum 30 degrees between leaves (tight cluster)
export const PHYLLOTAXIS_NOTES_MAX_ANGLE = 180; // Maximum 180 degrees between leaves (half-turn)
export const PHYLLOTAXIS_NOTES_DEFAULT_ANGLE = 137; // Default 137.508 degrees — golden angle (sunflower optimal packing)
export const PHYLLOTAXIS_NOTES_MIN_COLUMN_STEP = 1; // Minimum 1 column forward per spiral unit (forward-in-time requirement)
export const PHYLLOTAXIS_NOTES_MAX_COLUMN_STEP = 4; // Maximum 4 columns forward per spiral unit
export const PHYLLOTAXIS_NOTES_DEFAULT_COLUMN_STEP = 1; // Default 1 column forward per unit
export const PHYLLOTAXIS_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% preservation at leaf N
export const PHYLLOTAXIS_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const PHYLLOTAXIS_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per leaf
export const PHYLLOTAXIS_NOTES_ORIENTATION_CW = 'cw'; // Clockwise spiral (positive angle)
export const PHYLLOTAXIS_NOTES_ORIENTATION_CCW = 'ccw'; // Counter-clockwise spiral (negative angle)
export const PHYLLOTAXIS_NOTES_ORIENTATIONS = [
    PHYLLOTAXIS_NOTES_ORIENTATION_CW,
    PHYLLOTAXIS_NOTES_ORIENTATION_CCW
];

export const STAIR_NOTES_MIN_LENGTH = 1; // Minimum 1 step in the staircase
export const STAIR_NOTES_MAX_LENGTH = 16; // Maximum 16 steps in the staircase
export const STAIR_NOTES_DEFAULT_LENGTH = 8; // Default 8 steps in the staircase
export const STAIR_NOTES_MIN_STEP_SIZE = 0; // Minimum 0 rows per step (flat line, no ascent)
export const STAIR_NOTES_MAX_STEP_SIZE = 4; // Maximum 4 rows per stair step (steep stairs)
export const STAIR_NOTES_DEFAULT_STEP_SIZE = 1; // Default 1 row per stair step (gentle slope)
export const STAIR_NOTES_MIN_COLUMN_STEP = 0; // Minimum 0 columns forward per step (column stack)
export const STAIR_NOTES_MAX_COLUMN_STEP = 4; // Maximum 4 columns forward per step (rapid diagonal)
export const STAIR_NOTES_DEFAULT_COLUMN_STEP = 1; // Default 1 column forward per step (diagonal)
export const STAIR_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum decay (10% preservation at last step)
export const STAIR_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum decay (1.0 = no decay)
export const STAIR_NOTES_DEFAULT_VELOCITY_DECAY = 0.9; // Default 90% velocity preservation per step
export const STAIR_NOTES_SHAPE_UP = 'up'; // Always ascend: each step rises by stepSize
export const STAIR_NOTES_SHAPE_DOWN = 'down'; // Always descend: each step falls by stepSize
export const STAIR_NOTES_SHAPE_UP_DOWN = 'up-down'; // Rise to peak at half then descend symmetrically
export const STAIR_NOTES_SHAPE_DOWN_UP = 'down-up'; // Fall to trough at half then ascend symmetrically
export const STAIR_NOTES_SHAPE_RANDOM = 'random'; // Each step randomly goes up or down by stepSize
export const STAIR_NOTES_SHAPES = [
    STAIR_NOTES_SHAPE_UP,
    STAIR_NOTES_SHAPE_DOWN,
    STAIR_NOTES_SHAPE_UP_DOWN,
    STAIR_NOTES_SHAPE_DOWN_UP,
    STAIR_NOTES_SHAPE_RANDOM
];

export const BEZIER_NOTES_MIN_LENGTH = 2; // Minimum 2 points on the curve (start and end)
export const BEZIER_NOTES_MAX_LENGTH = 16; // Maximum 16 points sampled along the curve
export const BEZIER_NOTES_DEFAULT_LENGTH = 8; // Default 8 points sampled along the curve
export const BEZIER_NOTES_MIN_AMPLITUDE = 0; // Minimum 0 rows of vertical bulge (flat horizontal line)
export const BEZIER_NOTES_MAX_AMPLITUDE = 8; // Maximum 8 rows of vertical bulge
export const BEZIER_NOTES_DEFAULT_AMPLITUDE = 3; // Default 3 rows of vertical bulge
export const BEZIER_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% preservation at last point
export const BEZIER_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const BEZIER_NOTES_DEFAULT_VELOCITY_DECAY = 0.9; // Default 90% velocity preservation per point
export const BEZIER_NOTES_MODE_ARC = 'arc'; // Symmetric hump: rises to peak at midpoint then returns to source row
export const BEZIER_NOTES_MODE_S_CURVE = 's-curve'; // S-shape: rises then falls (or vice versa) for smooth crossover
export const BEZIER_NOTES_MODE_LOOP = 'loop'; // Loop-the-loop: overshoots both directions for tangled knot
export const BEZIER_NOTES_MODE_WAVE = 'wave'; // End-to-mid wave: oscillates 3 times across the span
export const BEZIER_NOTES_MODE_LINEAR = 'linear'; // Straight horizontal line (control points coincide with endpoints)
export const BEZIER_NOTES_MODES = [
    BEZIER_NOTES_MODE_ARC,
    BEZIER_NOTES_MODE_S_CURVE,
    BEZIER_NOTES_MODE_LOOP,
    BEZIER_NOTES_MODE_WAVE,
    BEZIER_NOTES_MODE_LINEAR
];

export const DEFAULT_TEMPO = 120; // Default tempo in BPM

// Transport State Constants
export const TRANSPORT_STATE_STOPPED = 'stopped';
export const TRANSPORT_STATE_PAUSED = 'paused';
export const TRANSPORT_STATE_PLAYING = 'started';
export const DEFAULT_TRANSPORT_STATE = TRANSPORT_STATE_STOPPED;
export const TRANSPORT_STATES = [TRANSPORT_STATE_STOPPED, TRANSPORT_STATE_PAUSED, TRANSPORT_STATE_PLAYING];

// Metronome Constants
export const DEFAULT_METRONOME_ENABLED = false; // Metronome off by default
export const DEFAULT_METRONOME_VOLUME = 0.5; // Default volume (0-1 range)
export const MIN_METRONOME_VOLUME = 0; // Minimum volume
export const MAX_METRONOME_VOLUME = 1; // Maximum volume

// Tap Tempo Constants
export const TAP_TEMPO_TIMEOUT_MS = 2000; // Reset tap buffer after 2 seconds of inactivity
export const TAP_TEMPO_MIN_TAPS = 2; // Minimum taps needed to calculate tempo
export const TAP_TEMPO_MAX_TAPS = 8; // Maximum taps to keep for averaging
export const TAP_TEMPO_MIN_BPM = 20; // Minimum acceptable BPM
export const TAP_TEMPO_MAX_BPM = 300; // Maximum acceptable BPM

// Time Signature constants
export const TIME_SIG_MIN_NUMERATOR = 1;
export const TIME_SIG_MAX_NUMERATOR = 16;
export const TIME_SIG_MIN_DENOMINATOR = 1;
export const TIME_SIG_MAX_DENOMINATOR = 16;
export const DEFAULT_TIME_SIGNATURE_NUMERATOR = 4;
export const DEFAULT_TIME_SIGNATURE_DENOMINATOR = 4;
export const DEFAULT_TIME_SIGNATURE = {
    numerator: DEFAULT_TIME_SIGNATURE_NUMERATOR,
    denominator: DEFAULT_TIME_SIGNATURE_DENOMINATOR
};

// Timeline constants
export const TIMELINE_BEAT_WIDTH = 40; // pixels per beat
export const TIMELINE_TRACK_HEIGHT = 60; // pixels per track lane
export const TIMELINE_HEADER_HEIGHT = 30; // pixels for time ruler

// Timeline Zoom constants
export const TIMELINE_ZOOM_MIN = 0.25; // Minimum zoom level (25%)
export const TIMELINE_ZOOM_MAX = 4.0; // Maximum zoom level (400%)
export const TIMELINE_ZOOM_STEP = 0.25; // Zoom step size
export const TIMELINE_ZOOM_DEFAULT = 1.0; // Default zoom level (100%)
export const TIMELINE_VERTICAL_ZOOM_MIN = 0.5; // Minimum vertical zoom
export const TIMELINE_VERTICAL_ZOOM_MAX = 2.0; // Maximum vertical zoom
export const TIMELINE_VERTICAL_ZOOM_STEP = 0.1; // Vertical zoom step size
export const TIMELINE_VERTICAL_ZOOM_DEFAULT = 1.0; // Default vertical zoom (100%)

// Note: Reversed for typical top-to-bottom piano roll display in a UI
export const synthPitches = [
    'C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1',
    'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
    'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5',
    'C6', 'C#6', 'D6', 'D#6', 'E6', 'F6', 'F#6', 'G6', 'G#6', 'A6', 'A#6', 'B6'
].reverse();

export const soundLibraries = {
    "Drums": "assets/drums.zip",
    "Instruments": "assets/instruments.zip",
    "Instruments 2": "assets/instruments2.zip",
    "Instruments 3": "assets/instruments3.zip"
    // Add more libraries here as needed
};

export const numSlices = 8; // Default number of slices for a new Sampler track
export const numDrumSamplerPads = 8; // Number of pads for the DrumSampler
export const samplerMIDINoteStart = 36; // C2, used for mapping MIDI notes to sampler slices/pads

export const defaultVelocity = 0.7; // Default velocity for new notes
export const DEFAULT_STEP_PROBABILITY = 1.0; // Default probability (100%) — step always triggers unless overridden

export const defaultDesktopBg = '#101010'; // Matches style.css body background

export const MAX_HISTORY_STATES = 50; // Increased from 30 for more undo/redo capacity

// Computer Keyboard to MIDI mapping for Synthesizer-like instruments
// QWERTY layout, bottom row for C-major scale starting on C4 (MIDI 60) by default
// Top row for sharps/flats or extended notes.
// 'a' maps to C4 (MIDI 60)
export const computerKeySynthMap = {
    // Bottom row (white keys on piano often)
    'a': 48, // C3 (octave shift will modify this)
    's': 50, // D3
    'd': 52, // E3
    'f': 53, // F3
    'g': 55, // G3
    'h': 57, // A3
    'j': 59, // B3
    'k': 60, // C4

    // Top row (black keys on piano often)
    'w': 49, // C#3
    'e': 51, // D#3
    // 'r': // F (no black key)
    't': 54, // F#3
    'y': 56, // G#3
    'u': 58, // A#3
    // 'i': // C (no black key)

    // Alternative mapping for some DAWs (shifted QWERTY)
    // 'q': 60, // C4
    // '2': 61, // C#4
    // 'w': 62, // D4
    // '3': 63, // D#4
    // 'e': 64, // E4
    // 'r': 65, // F4
    // '5': 66, // F#4
    // 't': 67, // G4
    // '6': 68, // G#4
    // 'y': 69, // A4
    // '7': 70, // A#4
    // 'u': 71, // B4
    // 'i': 72  // C5
};

// Computer Keyboard to MIDI mapping for Sampler (slices/pads)
// Numbers 1-8 typically map to slices/pads
export const computerKeySamplerMap = {
    'Digit1': samplerMIDINoteStart + 0,
    'Digit2': samplerMIDINoteStart + 1,
    'Digit3': samplerMIDINoteStart + 2,
    'Digit4': samplerMIDINoteStart + 3,
    'Digit5': samplerMIDINoteStart + 4,
    'Digit6': samplerMIDINoteStart + 5,
    'Digit7': samplerMIDINoteStart + 6,
    'Digit8': samplerMIDINoteStart + 7
    // Can extend to 'Digit9', 'Digit0' or other keys if more pads/slices are common
};

// Musical Scales - intervals from root note (0 = root, 1 = semitone)
// Each scale is defined as an array of semitone intervals from the root
export const SCALES = {
    'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], // All 12 semitones
    'Major': [0, 2, 4, 5, 7, 9, 11], // Ionian mode
    'Minor': [0, 2, 3, 5, 7, 8, 10], // Natural minor / Aeolian mode
    'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11], // Harmonic minor
    'Melodic Minor': [0, 2, 3, 5, 7, 9, 11], // Melodic minor (ascending)
    'Pentatonic Major': [0, 2, 4, 7, 9], // Major pentatonic
    'Pentatonic Minor': [0, 3, 5, 7, 10], // Minor pentatonic
    'Blues': [0, 3, 5, 6, 7, 10], // Blues scale
    'Dorian': [0, 2, 3, 5, 7, 9, 10], // Dorian mode
    'Phrygian': [0, 1, 3, 5, 7, 8, 10], // Phrygian mode
    'Lydian': [0, 2, 4, 6, 7, 9, 11], // Lydian mode
    'Mixolydian': [0, 2, 4, 5, 7, 9, 10], // Mixolydian mode
    'Locrian': [0, 1, 3, 5, 6, 8, 10], // Locrian mode
    'Whole Tone': [0, 2, 4, 6, 8, 10], // Whole tone scale
    'Diminished': [0, 2, 3, 5, 6, 8, 9, 11], // Diminished scale (octatonic)
    'Arabic': [0, 1, 4, 5, 7, 8, 11], // Arabic scale
    'Japanese': [0, 1, 5, 7, 8], // Japanese pentatonic (In scale)
};

// Root notes for scale selection
export const SCALE_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Default scale mode settings
export const DEFAULT_SCALE_MODE = {
    enabled: false,
    scale: 'Major',
    root: 'C',
    lock: false // If true, only allow notes within the scale
};

// Default loop region settings
export const DEFAULT_LOOP_REGION = {
    enabled: false,
    startBar: 1,     // 1-indexed bar number
    endBar: 4,       // 1-indexed bar number
    minimumBars: 1   // Minimum loop length in bars
};

// Default swing/groove settings
export const DEFAULT_SWING = {
    enabled: false,
    amount: 0        // 0-100 percentage (0 = straight, 100 = maximum swing)
};

export const MAX_SWING_AMOUNT = 100;
export const SWING_SUBDIVISION = 8; // Swing applies to 8th notes (every other 16th note)

// Send Track Constants
export const MAX_SEND_TRACKS = 8; // Maximum number of send/aux tracks
export const DEFAULT_SEND_LEVEL = 0; // Default send level (0 = off, -infinity dB)
export const SEND_LEVEL_MIN = 0;
export const SEND_LEVEL_MAX = 1.2; // 0dB = 1.0, can boost slightly above unity
export const SEND_LEVEL_POST_FADER = true; // Sends are post-fader by default (after volume)
export const DEFAULT_SEND_PRE_FADER = false; // Default to post-fader (after volume)
export const SEND_PRE_FADER_ENABLED = true; // Feature flag to enable pre/post toggle UI

// Track Group Constants
export const MAX_TRACK_GROUPS = 16; // Maximum number of track groups
export const DEFAULT_TRACK_GROUP_NAME = 'Group'; // Default name for new groups
export const TRACK_GROUP_COLORS = [
    '#54a0ff', // Blue (default for groups)
    '#ff6b6b', // Red
    '#1dd1a1', // Green
    '#feca57', // Yellow
    '#ff9ff3', // Pink
    '#f368e0', // Magenta
    '#ff9f43', // Orange
    '#5f27cd', // Purple
    '#c8d6e5', // Gray
    '#00d2d3', // Teal
    '#ff6348', // Coral
    '#7bed9f', // Mint
    '#a29bfe', // Lavender
    '#fd79a8', // Rose
    '#e17055'  // Terra
];
export const DEFAULT_TRACK_GROUP_COLOR = '#54a0ff';
export const DEFAULT_TRACK_GROUP = {
    name: DEFAULT_TRACK_GROUP_NAME,
    color: DEFAULT_TRACK_GROUP_COLOR,
    trackIds: [],
    muted: false,
    soloed: false
};

// Default send track settings
export const DEFAULT_SEND_TRACK = {
    name: 'Send',
    effects: [], // Effects chain for this send bus
    level: 1.0,  // Output level of the send bus
    muted: false
};

// Note Probability constants
export const DEFAULT_NOTE_PROBABILITY = 1.0; // Default probability (1.0 = always play)

// Track Color constants
export const TRACK_COLORS = [
    '#ff6b6b', // Red
    '#feca57', // Yellow
    '#48dbfb', // Cyan
    '#1dd1a1', // Green
    '#ff9ff3', // Pink
    '#f368e0', // Magenta
    '#ff9f43', // Orange
    '#54a0ff', // Blue
    '#5f27cd', // Purple
    '#c8d6e5', // Gray
    '#00d2d3', // Teal
    '#ff6348', // Coral
    '#7bed9f', // Mint
    '#a29bfe', // Lavender
    '#fd79a8', // Rose
    '#e17055'  // Terra
];

export const DEFAULT_TRACK_COLOR_INDEX = 0; // Default to first color (red)
export const DEFAULT_TRACK_COLOR = TRACK_COLORS[DEFAULT_TRACK_COLOR_INDEX] || TRACK_COLORS[0]; // Derived default track color

// Clip Color constants
export const CLIP_COLORS = [
    '#4a9eff', // Bright Blue (default for audio clips)
    '#ff6b6b', // Red
    '#feca57', // Yellow
    '#48dbfb', // Cyan
    '#1dd1a1', // Green
    '#ff9ff3', // Pink
    '#f368e0', // Magenta
    '#ff9f43', // Orange
    '#5f27cd', // Purple
    '#c8d6e5', // Gray
    '#00d2d3', // Teal
    '#ff6348', // Coral
    '#7bed9f', // Mint
    '#a29bfe', // Lavender
    '#fd79a8', // Rose
    '#e17055'  // Terra
];
export const DEFAULT_CLIP_COLOR = '#4a9eff'; // Default clip color (matches current audio clip color)

// Audio Clip Fade In/Out Constants
export const DEFAULT_AUDIO_CLIP_FADE_IN = 0;    // Default fade in time in seconds
export const DEFAULT_AUDIO_CLIP_FADE_OUT = 0;   // Default fade out time in seconds
export const MAX_AUDIO_CLIP_FADE = 10;          // Maximum fade time in seconds
export const FADE_CURVE_LINEAR = 'linear';
export const FADE_CURVE_EXPONENTIAL = 'exponential';
export const FADE_CURVES = [FADE_CURVE_LINEAR, FADE_CURVE_EXPONENTIAL];
export const DEFAULT_FADE_IN_CURVE = FADE_CURVE_LINEAR;
export const DEFAULT_FADE_OUT_CURVE = FADE_CURVE_LINEAR;

// Audio Clip Crossfade Constants
export const DEFAULT_AUDIO_CLIP_CROSSFADE = 0; // Default crossfade time in seconds (0 = no crossfade)
export const MIN_AUDIO_CLIP_CROSSFADE = 0;       // Minimum crossfade
export const MAX_AUDIO_CLIP_CROSSFADE = 5;      // Maximum crossfade time in seconds

// Audio Clip Gain Constants
export const DEFAULT_AUDIO_CLIP_GAIN = 1.0;    // Default gain (0dB = 1.0, no change)
export const MIN_AUDIO_CLIP_GAIN = 0;          // Minimum gain (silence)
export const MAX_AUDIO_CLIP_GAIN = 4.0;         // Maximum gain (12dB boost)
export const GAIN_NORMALIZE_TARGET = 1.0;      // Target gain for normalize (0dB)

// Audio Clip Reverse Constants
export const DEFAULT_AUDIO_CLIP_REVERSE = false; // Default reverse state (false = forward)

// Audio Clip Playback Rate Constants
export const DEFAULT_AUDIO_CLIP_PLAYBACK_RATE = 1.0; // Default playback rate (normal speed)
export const MIN_AUDIO_CLIP_PLAYBACK_RATE = 0.25;    // Minimum playback rate (0.25x - very slow)
export const MAX_AUDIO_CLIP_PLAYBACK_RATE = 4.0;      // Maximum playback rate (4x - very fast)

// Audio Clip Start/End Offset Constants (for trimming source audio)
export const DEFAULT_AUDIO_CLIP_START_OFFSET = 0;    // Default start offset in seconds (0 = beginning)
export const MIN_AUDIO_CLIP_START_OFFSET = 0;         // Minimum start offset
export const DEFAULT_AUDIO_CLIP_END_OFFSET = -1;       // Default end offset (-1 = use full audio length)
export const MIN_AUDIO_CLIP_END_OFFSET = -1;           // -1 means use full audio length (useAudioDuration)

// Chord Mode constants
export const CHORD_TYPES = {
    'major': [0, 4, 7],
    'minor': [0, 3, 7],
    'augmented': [0, 4, 8],
    'diminished': [0, 3, 6],
    'sus2': [0, 2, 7],
    'sus4': [0, 5, 7],
    'major7': [0, 4, 7, 11],
    'minor7': [0, 3, 7, 10],
    'dominant7': [0, 4, 7, 10],
    'diminished7': [0, 3, 6, 9],
    'halfDiminished7': [0, 3, 6, 10],
    'major6': [0, 4, 7, 9],
    'minor6': [0, 3, 7, 9],
    'power': [0, 7],
    'fifth': [0, 7]
};

export const DEFAULT_CHORD_MODE = {
    enabled: false,
    root: 0,  // 0 = C, 1 = C#, etc.
    type: 'major',
    lockChord: false
};

// Chord Voicing constants - defines how chord voicings are spread across the keyboard
export const CHORD_VOICING_SPREAD = {
    'closed': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],   // All notes in tight position
    'wide': [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14],  // Wider spread with octave jumps
    'drop2': [0, 1, 2, 4, 5, 7, 8, 9, 11, 12, 13, 15], // Drop 2 voicing (adds 3rd octave)
    'rootless': [2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21] // Rootless voicings
};
export const CHORD_VOICINGS = Object.keys(CHORD_VOICING_SPREAD);
export const DEFAULT_CHORD_VOICING = 'closed';

// Timeline Markers constants
export const MAX_TIMELINE_MARKERS = 64; // Maximum number of markers
export const DEFAULT_MARKER_COLOR = '#ff9f43'; // Default marker color (orange)
export const MARKER_COLORS = [
    '#ff6b6b', // Red
    '#feca57', // Yellow
    '#48dbfb', // Cyan
    '#1dd1a1', // Green
    '#ff9ff3', // Pink
    '#f368e0', // Magenta
    '#ff9f43', // Orange
    '#54a0ff', // Blue
    '#5f27cd', // Purple
    '#c8d6e5', // Gray
];
export const DEFAULT_MARKER = {
    name: 'Marker',
    bar: 1, // 1-indexed bar number
    color: DEFAULT_MARKER_COLOR
};

// Track Freeze/Bounce Constants
export const MAX_FREEZE_LENGTH_SECONDS = 600; // Maximum 10 minutes of frozen audio
export const DEFAULT_FREEZE_FADE_OUT = 0.1; // Default fade out in seconds for frozen clips
export const FROZEN_TRACK_PREFIX = '[Frozen] '; // Prefix for frozen track names

// Automation Lane Constants
export const AUTOMATION_LANE_HEIGHT = 20; // pixels per lane
export const AUTOMATION_LANE_DEFAULT = 0.5; // Default value (50%)
export const AUTOMATION_LANE_PRECISION = 2; // Decimal places
export const AUTOMATION_LANE_STEP = 0.01; // Step size (1%)
export const AUTOMATION_LANE_PARAMETERS = ['volume', 'pan', 'filterCutoff', 'resonance', 'attack', 'decay', 'sustain', 'release']; // Supported parameters
export const AUTOMATION_LANE_COLORS = [
    '#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3',
    '#f368e0', '#ff9f43', '#54a0ff', '#5f27cd', '#c8d6e5'
];

// ============================================
// Audio Recording Constants
// ============================================
// Recording quality and format
export const RECORDING_SAMPLE_RATE = 44100; // Standard audio sample rate
export const RECORDING_NUM_CHANNELS = 1; // Mono recording (1 = mono, 2 = stereo)
export const RECORDING_BIT_DEPTH = 16; // Bits per sample (16-bit is standard for recordings)
export const RECORDING_MIME_TYPE = 'audio/webm'; // Browser-compatible recording format

// Recording input constraints
export const RECORDING_LATENCY_HINT = 0.01; // Suggested latency in seconds (10ms)
export const RECORDING_ECHO_CANCELLATION = false; // Disable for clean recording
export const RECORDING_AUTO_GAIN_CONTROL = false; // Disable for consistent levels
export const RECORDING_NOISE_SUPPRESSION = false; // Disable for clean recording

// Recording input gain (if supported by device)
export const DEFAULT_RECORDING_INPUT_GAIN = 1.0; // 0-1 range for software gain
export const MIN_RECORDING_INPUT_GAIN = 0;
export const MAX_RECORDING_INPUT_GAIN = 2.0; // Can boost input gain

// Monitoring settings
export const DEFAULT_RECORDING_MONITORING_ENABLED = false; // Monitoring off by default
export const DEFAULT_RECORDING_MONITORING_VOLUME = 0.5; // Monitor volume (0-1)
export const MIN_RECORDING_MONITORING_VOLUME = 0;
export const MAX_RECORDING_MONITORING_VOLUME = 1;

// Aliases for backwards compatibility with existing tests
export const MIN_MONITORING_VOLUME = MIN_RECORDING_MONITORING_VOLUME;
export const MAX_MONITORING_VOLUME = MAX_RECORDING_MONITORING_VOLUME;
export const DEFAULT_MONITORING_VOLUME = DEFAULT_RECORDING_MONITORING_VOLUME;

// Recording limits
export const MAX_RECORDING_LENGTH_SECONDS = 600; // 10 minute max recording
export const MIN_RECORDING_LENGTH_SECONDS = 0.1; // Minimum 100ms recording

// ============================================
// Track Template Constants
// ============================================
export const MAX_TRACK_TEMPLATES = 32; // Maximum number of saved track templates
export const DEFAULT_TEMPLATE_NAME_PREFIX = 'Template'; // Default name for new templates
export const TRACK_TEMPLATE_COLORS = TRACK_COLORS; // Templates can use same color palette as tracks
export const DEFAULT_TRACK_TEMPLATE_COLOR = '#54a0ff'; // Default template color (blue)

export const DEFAULT_TRACK_TEMPLATE = {
    name: DEFAULT_TEMPLATE_NAME_PREFIX,
    color: DEFAULT_TRACK_TEMPLATE_COLOR,
    type: 'Synth', // Default track type
    synthParams: {},
    instrumentSamplerSettings: null,
    drumSamplerPads: null,
    activeEffects: [],
    hasAutomation: false,
    automationLanes: []
};

// MIDI Export Constants
export const MIDI_EXPORT_VELOCITY_SCALE = 127; // Scale velocity from 0-1 to 0-127
export const MIDI_DEFAULT_CHANNEL = 0; // 0-indexed, will be 1 in MIDI (MIDI Ch 1)
export const MIDI_DEFAULT_PROGRAM = 0; // Default instrument program change
export const MIDI_EXPORT_TicksPerQuarterNote = 480; // Standard resolution for MIDI files
export const MIDI_FILE_FORMAT = 0; // Single track format
export const MIDI_FILE_TYPE_NAMES = ['Standard MIDI File Type 0 (Single Track)'];
export const DEFAULT_MIDI_EXPORT_FILENAME_PREFIX = 'snugos-export';
export const MAX_MIDI_EXPORT_TRACKS = 64; // MIDI standard max tracks

// MIDI Import Constants
export const MIDI_IMPORT_MIN_NOTES = 1; // Minimum notes required for import
export const MIDI_IMPORT_MAX_VELOCITY = 127; // Maximum velocity value
export const MIDI_IMPORT_DEFAULT_VELOCITY = 100; // Default velocity when not specified
export const MIDI_IMPORT_DEFAULT_PROBABILITY = 1.0; // Default note probability
export const MIDI_IMPORT_SNAP_TO_GRID = true; // Snap imported notes to 16th grid
export const MIDI_IMPORT_VELOCITY_SCALE = 1 / 127; // Scale MIDI velocity (127) to app velocity (0-1)


// ============================================
// SnugWindow Window Constants
// ============================================
export const DEFAULT_WINDOW_MIN_WIDTH = 150; // Minimum window width in pixels
export const DEFAULT_WINDOW_MIN_HEIGHT = 100; // Minimum window height in pixels
export const DEFAULT_WINDOW_WIDTH = 350; // Default window width in pixels
export const DEFAULT_WINDOW_HEIGHT = 250; // Default window height in pixels
export const TASKBAR_HEIGHT = 30; // Taskbar height in pixels

// ============================================
// Context Menu Constants
// ============================================
export const CONTEXT_MENU_ITEM_HEIGHT = 28; // Height of each context menu item in pixels
export const CONTEXT_MENU_MAX_WIDTH = 300; // Maximum width of context menu in pixels

// ============================================
// Drop Zone Constants
// ============================================
export const DROP_ZONE_MIN_WIDTH = 80; // Minimum drop zone width in pixels
export const DROP_ZONE_MIN_HEIGHT = 60; // Minimum drop zone height in pixels
export const DROP_ZONE_DEFAULT_HEIGHT = 50; // Default drop zone height in pixels
export const DROP_ZONE_BORDER_RADIUS = 4; // Border radius in pixels

// ============================================
// Sequencer Grid Constants
// ============================================
export const GRID_STEP_LABELS = {
    labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16']
};
export const STEP_LABELS_SIXTEENTHS = {
    labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16']
};

// Keyboard Shortcuts Help Constants
export const KEYBOARD_SHORTCUTS_HELP_TITLE = 'Keyboard Shortcuts';
export const KEYBOARD_SHORTCUTS_HELP_WIDTH = 600; // Modal width in pixels
export const KEYBOARD_SHORTCUTS_HELP_HEIGHT = 500; // Modal height in pixels
export const MIDI_LEARN_SHORTCUT_KEY = 'k'; // Keyboard shortcut to toggle MIDI Learn mode

// ============================================
// MIDI Learn Constants
// ============================================
export const MIDI_LEARN_MIN_CC = 0; // CC number range
export const MIDI_LEARN_MAX_CC = 127;
export const MIDI_LEARN_MIN_CHANNEL = 0; // 0-indexed (MIDI channel 1)
export const MIDI_LEARN_MAX_CHANNEL = 15; // 0-indexed (MIDI channel 16)
export const MAX_MIDI_LEARN_MAPPINGS = 64; // Maximum number of MIDI Learn mappings
export const MIDI_CC_COMMAND = 176; // CC message command (176-191 = CC on channels 1-16)
export const DEFAULT_MIDI_LEARN_MODE = false; // MIDI Learn mode disabled by default
export const MIDI_LEARN_INDICATOR_TIMEOUT_MS = 2000; // How long to show MIDI activity indicator

// Parameter types that can be MIDI learned
export const MIDI_LEARN_PARAM_TYPES = [
    'trackVolume',
    'trackPan',
    'trackMute',
    'trackSolo',
    'effectParam',
    'masterVolume',
    'metronomeVolume',
    'tempo'
];

// Default empty MIDI Learn mapping structure
export const DEFAULT_MIDI_LEARN_MAPPING = {
    channel: 0,      // MIDI channel (0-15)
    cc: 0,           // CC number (0-127)
    trackId: null,   // Track ID if track-specific
    paramType: null,  // Type of parameter
    paramPath: null, // Path to parameter (e.g., 'effects.0.params.decay')
    min: 0,          // Input range min
    max: 1           // Input range max
};

// ============================================
// Keyboard Shortcuts Registry
// ============================================
// Central registry of all keyboard shortcuts for documentation and UI generation
export const KEYBOARD_SHORTCUTS = {
    // Playback Controls
    PLAY_PAUSE: { key: 'Space', description: 'Play / Pause', category: 'Playback Controls' },
    TOGGLE_RECORDING: { key: 'Enter', description: 'Toggle Recording', category: 'Playback Controls' },
    CLOSE_WINDOWS: { key: 'Escape', description: 'Close Windows', category: 'Playback Controls' },

    // Transport & Tempo
    TOGGLE_METRONOME: { key: 'T', description: 'Toggle Metronome', category: 'Transport & Tempo' },
    TAP_TEMPO: { key: '`', description: 'Tap Tempo', category: 'Transport & Tempo' },
    TOGGLE_LOOP: { key: 'L', description: 'Toggle Loop Region', category: 'Transport & Tempo' },
    TOGGLE_MIDI_LEARN: { key: 'K', description: 'Toggle MIDI Learn', category: 'Transport & Tempo' },
    TOGGLE_SCALE_MODE: { key: 'Q', description: 'Toggle Scale Mode', category: 'Transport & Tempo' },

    // Track Controls (with armed track)
    TOGGLE_MUTE: { key: 'M', description: 'Toggle Mute', category: 'Track Controls' },
    TOGGLE_SOLO: { key: 'S', description: 'Toggle Solo', category: 'Track Controls' },
    TOGGLE_RECORD_ARM: { key: 'R', description: 'Toggle Record Arm', category: 'Track Controls' },

    // Sequencer & Piano Roll
    TOGGLE_CHORD_MODE: { key: 'C', description: 'Toggle Chord Mode', category: 'Sequencer & Piano Roll' },
    OCTAVE_UP: { key: 'X', description: 'Octave Up', category: 'Sequencer & Piano Roll' },
    OCTAVE_DOWN: { key: 'Z', description: 'Octave Down', category: 'Sequencer & Piano Roll' },

    // Edit Operations
    UNDO: { key: 'Ctrl+Z', description: 'Undo', category: 'Edit Operations' },
    REDO: { key: 'Ctrl+Y', description: 'Redo', category: 'Edit Operations' },
    REDO_ALT: { key: 'Ctrl+Shift+Z', description: 'Redo (Alt)', category: 'Edit Operations' },
    SAVE_PROJECT: { key: 'Ctrl+S', description: 'Save Project', category: 'Edit Operations' },
    LOAD_PROJECT: { key: 'Ctrl+O', description: 'Load Project', category: 'Edit Operations' },
    EXPORT_MIDI: { key: 'Ctrl+E', description: 'Export to MIDI', category: 'Edit Operations' },

    // Computer Keyboard Piano
    PIANO_WHITE_KEYS: { key: 'A-L', description: 'White keys (C3-B3)', category: 'Computer Keyboard Piano' },
    PIANO_BLACK_KEYS: { key: 'W,E,T,Y,U', description: 'Black keys', category: 'Computer Keyboard Piano' },
    SAMPLER_SLICES: { key: '1-8', description: 'Sampler slices', category: 'Computer Keyboard Piano' }
};

// Helper to get all shortcut categories
export const KEYBOARD_SHORTCUT_CATEGORIES = [
    'Playback Controls',
    'Transport & Tempo',
    'Track Controls',
    'Sequencer & Piano Roll',
    'Edit Operations',
    'Computer Keyboard Piano'
];

// ============================================
// Effect Preset Constants
// ============================================
export const MAX_EFFECT_PRESETS = 64; // Maximum number of saved effect presets per effect type
export const DEFAULT_PRESET_NAME_PREFIX = 'Preset'; // Default name for new presets
export const DEFAULT_EFFECT_PRESET = {
    name: DEFAULT_PRESET_NAME_PREFIX,
    effectType: null,  // The effect type (e.g., 'Reverb', 'Chorus')
    params: {}         // The effect parameters
};