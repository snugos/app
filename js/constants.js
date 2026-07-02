// Day 589: Quantize Sequence Tests - adds comprehensive tests for quantizeSequence method. The method snaps note columns to a quantize grid (1/16, 1/8, 1/4) to correct timing inaccuracies. Includes undo capture BEFORE mutation, getActiveSequence validation, Audio track handling, collision detection, and nearest-free-slot placement. Adds 16 tests. Version bump to 2.245.0.
/// Day 563: Shift Notes Up/Down - adds Ctrl+Alt+Up/Down for octave shifting (12 semitones) via context menu and keyboard shortcuts
// Added Ctrl+Q keyboard shortcut to quantize only the selected sequencer cells to the current snap grid.
// Uses selected-cell class to identify selected notes, snaps each note's column to the nearest snapValue grid point.
// Prevents collision by checking if target slot is empty before moving.
// Context menu already has Quantize to 1/16/1/8/1/4 options; this adds a keyboard shortcut for quick access.
// Version bump to 2.194.0.
// Day 532: Ctrl+A Select All Notes in Sequencer - Added Ctrl+A keyboard shortcut to select all notes in the active sequencer. Gets active sequencer track via getActiveSequencerTrackId(), selects all .sequencer-step-cell elements via querySelectorAll and adds selected-cell class for copy/paste compatibility. Uses getWindowByIdState to access sequencer window element. Shows notification with sequence name. Prevents default browser behavior. Added 7 tests for Ctrl+A functionality. All JS files pass node --check. // Day 531: Restore tests.js - revert substrate-bot test truncation commit - Restored tests.js from 7132 lines to 12614 lines (5494 insertions) after substrate-bot commit 472200e5 removed 1076 tests. Verified cleanupRecordingAudioResources is properly imported from audio.js (line 167). node --check passes. All tests restored.
// Day 521: Track State Management & Render Functions Tests - Added 54 unit tests for track state management functions (addTrackToStateInternal, removeTrackFromStateInternal, renameTrackInState) and UI render functions (renderMixer, renderSoundBrowserFavorites, renderSoundBrowserRecent, renderSoundBrowserDirectoryFiltered, toggleSequencerViewMode, openMixerWindow). Tests cover function exports, parameter counts, async nature, Track instance creation, undo capture, track element creation, and window management patterns. Also added missing imports for these functions in tests.js. Total tests increased from 2029 to 2081. // Day 520: Additional Window Function Tests - Added 53 unit tests for openTrackSequencerWindow, openTimelineWindow, openTrackInspectorWindow, openMasterEffectsRackWindow, openTrackEffectsRackWindow, and openProjectNotesWindow functions. Tests cover function exports, parameter counts, single-instance window management using getOpenWindows/getWindowByIdState, createWindow usage, localAppServices references, savedState handling, and function-specific behavior. Tests increased from 1976 to 2029. // Day 519: Core Window Function Tests - Added 31 unit tests for openMixerWindow, openSoundBrowserWindow, and openGlobalControlsWindow functions. Tests cover function exports, parameter counts, single-instance window management using getOpenWindows, createWindow usage, windowId values, HTML content building, UI element references (play/stop/record buttons, tempo, meter), onReadyCallback handling, localAppServices references, and savedState for window restoration. Version bump to 2.182.0. // Day 518: showKeyboardShortcutsHelpWindow Tests - Added 14 unit tests for the showKeyboardShortcutsHelpWindow function exported from ui.js. Tests cover function export, parameter count, getOpenWindows reference, single-instance window management, HTML content building, all keyboard shortcut sections (Playback Controls, Edit Operations, Track Controls, Piano Keys, Snap & Quantize), createWindow usage, and KEYBOARD_SHORTCUTS_HELP_WIDTH/HEIGHT constant references. Total tests increased from 1931 to 1945. // Day 517: Fix Missing Sequencer Context Menu Tests - Added 2 missing tests from Day 505 block: Scale Velocities (100%) and Quantize to 1/4. The Day 505 tests covered Scale Velocities at 50%, 75%, 125% but missed the 100% option, and covered Quantize to 1/16 and 1/8 but missed 1/4. Both menu items exist in ui.js but tests were never written. Total tests increased from 1929 to 1931. // Day 516: Fix tests.js syntax - duplicate stopMetronome import. // Day 515: Audio Track Inspector Implementation - Added buildAudioTrackInspectorDOM and initializeAudioTrackInspectorControls functions to provide Audio track inspector UI with audio input device selection, input gain knob, monitoring volume slider, and recording status indicator. Both functions are now wired in buildTrackInspectorContentDOM and initializeTypeSpecificInspectorControls. // Day 513: Sidechain Audio Functions Tests - Added 34 unit tests for Sidechain audio functions (handleSidechainParamChangeForEffect, enableSidechainFromTrackForEffect, enableSidechainFromTrackIn, disableSidechainBus) covering function exports, parameter counts, async nature, effectNode validation, sidechainTrackAssignments, localAppServices integration, inputChannel checks, bus connections, and dispose behavior. // Day 512: EffectsRegistry Functions Tests - Added 19 unit tests for EffectsRegistry functions (getEffectBypassState, setEffectBypassState, getEffectParamDefinitions) (getTransportPosition, getTransportSeconds, getTransportBpm, getTransportState) and audio mixdown export (exportMixdownToWav). Tests verify function exports, async nature, parameter counts, Tone.Recorder usage, masterGain connection, transport control, error handling, and recording size validation. Version bump to 2.176.0.

export const LIMACON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the curve
export const LIMACON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution limaçon)
export const LIMACON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the limaçon
export const LIMACON_NOTES_MIN_RADIUS = 1; // Minimum 1 base-circle radius a
export const LIMACON_NOTES_MAX_RADIUS = 8; // Maximum 8 base-circle radius a
export const LIMACON_NOTES_DEFAULT_RADIUS = 3; // Default 3 base-circle radius a
export const LIMACON_NOTES_MIN_OFFSET = 0; // Minimum 0 conchoid offset b (degenerates to circle at b=0)
export const LIMACON_NOTES_MAX_OFFSET = 12; // Maximum 12 conchoid offset b
export const LIMACON_NOTES_DEFAULT_OFFSET = 4; // Default 4 conchoid offset b (intermediate shape, b/a > 1)
export const LIMACON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const LIMACON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const LIMACON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const LIMACON_NOTES_SHAPE_CONVEX = 'convex'; // b < a: smooth convex oval
export const LIMACON_NOTES_SHAPE_CARDIOID = 'cardioid'; // b = a: classic cardioid heart (Pascal 1650, the namesake case)
export const LIMACON_NOTES_SHAPE_DIMPLED = 'dimpled'; // a < b < 2a: oval with small dimple on the inner side
export const LIMACON_NOTES_SHAPE_CUSPID = 'cuspid'; // b = 2a: vertical cusp through origin
export const LIMACON_NOTES_SHAPE_LOOPED = 'looped'; // b > 2a: inner loop, the most distinctive limaçon
export const LIMACON_NOTES_SHAPES = [
    LIMACON_NOTES_SHAPE_CONVEX,
    LIMACON_NOTES_SHAPE_CARDIOID,
    LIMACON_NOTES_SHAPE_DIMPLED,
    LIMACON_NOTES_SHAPE_CUSPID,
    LIMACON_NOTES_SHAPE_LOOPED
];

// Day 741: Conchoid of Nicomedes Notes
export const CONCHOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the curve
export const CONCHOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution conchoid)
export const CONCHOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the conchoid
export const CONCHOID_NOTES_MIN_DISTANCE = 1; // Minimum 1 distance from pole to base line a
export const CONCHOID_NOTES_MAX_DISTANCE = 8; // Maximum 8 distance from pole to base line a
export const CONCHOID_NOTES_DEFAULT_DISTANCE = 3; // Default 3 distance from pole to base line a
export const CONCHOID_NOTES_MIN_LENGTH_OFFSET = 1; // Minimum 1 conchoid arm length b (the offset distance from base line)
export const CONCHOID_NOTES_MAX_LENGTH_OFFSET = 8; // Maximum 8 conchoid arm length b
export const CONCHOID_NOTES_DEFAULT_LENGTH_OFFSET = 3; // Default 3 conchoid arm length b (the classical Nicomedes value)
export const CONCHOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const CONCHOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const CONCHOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const CONCHOID_NOTES_SHAPE_STANDARD = 'standard'; // b < a: no inner loop, classic Nicomedes conchoid (~200 BC default)
export const CONCHOID_NOTES_SHAPE_CUSPIDAL = 'cuspidal'; // b = a: cusp at the pole, the boundary case
export const CONCHOID_NOTES_SHAPE_LOOPED = 'looped'; // b > a: inner loop, the most distinctive conchoid shape
export const CONCHOID_NOTES_SHAPE_ASYMPTOTIC = 'asymptotic'; // b near 0: tight near the base line, near-asymptotic behavior
export const CONCHOID_NOTES_SHAPES = [
    CONCHOID_NOTES_SHAPE_STANDARD,
    CONCHOID_NOTES_SHAPE_CUSPIDAL,
    CONCHOID_NOTES_SHAPE_LOOPED,
    CONCHOID_NOTES_SHAPE_ASYMPTOTIC
];

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

// Lissajous Notes constants - classic oscilloscope/X-Y curves defined by x = sin(a*t + δ), y = sin(b*t)
export const LISSAJOUS_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the curve (full period resolution)
export const LISSAJOUS_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution rosette)
export const LISSAJOUS_NOTES_DEFAULT_LENGTH = 24; // Default 24 samples around the curve
export const LISSAJOUS_NOTES_MIN_AMPLITUDE = 1; // Minimum 1 row of vertical swing
export const LISSAJOUS_NOTES_MAX_AMPLITUDE = 8; // Maximum 8 rows of vertical swing
export const LISSAJOUS_NOTES_DEFAULT_AMPLITUDE = 3; // Default 3 rows of vertical swing
export const LISSAJOUS_NOTES_MIN_PHASE = 0; // Minimum 0 radians phase shift
export const LISSAJOUS_NOTES_MAX_PHASE = 6.2832; // Maximum 2*PI radians phase shift (full cycle)
export const LISSAJOUS_NOTES_DEFAULT_PHASE = 1.5708; // Default π/2 (90° phase, classic X-Y oscilloscope)
export const LISSAJOUS_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% preservation at last sample
export const LISSAJOUS_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const LISSAJOUS_NOTES_DEFAULT_VELOCITY_DECAY = 0.94; // Default 94% velocity preservation per sample
export const LISSAJOUS_NOTES_MODE_CIRCLE = 'circle'; // a=1, b=1 — perfect circle
export const LISSAJOUS_NOTES_MODE_FIGURE_8 = 'figure-8'; // a=1, b=2 — horizontal figure-8 (lemniscate)
export const LISSAJOUS_NOTES_MODE_THREE_LOBE = 'three-lobe'; // a=2, b=3 — three-lobed trefoil
export const LISSAJOUS_NOTES_MODE_ROSETTE_34 = 'rosette-34'; // a=3, b=4 — 4-petal rosette
export const LISSAJOUS_NOTES_MODE_ROSETTE_35 = 'rosette-35'; // a=3, b=5 — 5-petal rosette
export const LISSAJOUS_NOTES_MODE_ROSETTE_45 = 'rosette-45'; // a=4, b=5 — 10-lobe dense rosette
export const LISSAJOUS_NOTES_MODES = [
    LISSAJOUS_NOTES_MODE_CIRCLE,
    LISSAJOUS_NOTES_MODE_FIGURE_8,
    LISSAJOUS_NOTES_MODE_THREE_LOBE,
    LISSAJOUS_NOTES_MODE_ROSETTE_34,
    LISSAJOUS_NOTES_MODE_ROSETTE_35,
    LISSAJOUS_NOTES_MODE_ROSETTE_45
];

// Euclidean Notes Constants (Day 726)
// Euclidean rhythm generator (Bjorklund algorithm) — distributes K pulses across N steps
// as evenly as possible. Famous examples: E(3,8) = tresillo, E(5,8) = cinquillo, E(5,16) = Cuban
export const EUCLIDEAN_NOTES_MIN_PULSES = 1; // Minimum 1 pulse (single hit)
export const EUCLIDEAN_NOTES_MAX_PULSES = 16; // Maximum 16 pulses (dense pattern)
export const EUCLIDEAN_NOTES_MIN_STEPS = 1; // Minimum 1 step (all hits on one column)
export const EUCLIDEAN_NOTES_MAX_STEPS = 32; // Maximum 32 steps (long pattern)
export const EUCLIDEAN_NOTES_MIN_ROW_OFFSET = -8; // Minimum -8 rows of pitch shift
export const EUCLIDEAN_NOTES_MAX_ROW_OFFSET = 8; // Maximum +8 rows of pitch shift
export const EUCLIDEAN_NOTES_MIN_ROTATION = 0; // Minimum 0 steps rotation
export const EUCLIDEAN_NOTES_MAX_ROTATION = 15; // Maximum 15 steps rotation
export const EUCLIDEAN_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation
export const EUCLIDEAN_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const EUCLIDEAN_NOTES_DEFAULT_PULSES = 5; // Default 5 pulses (cinquillo-style)
export const EUCLIDEAN_NOTES_DEFAULT_STEPS = 8; // Default 8 steps (one measure of 8ths)
export const EUCLIDEAN_NOTES_DEFAULT_ROW_OFFSET = 0; // Default 0 rows (same pitch)
export const EUCLIDEAN_NOTES_DEFAULT_ROTATION = 0; // Default 0 rotation
export const EUCLIDEAN_NOTES_DEFAULT_VELOCITY_DECAY = 1.0; // Default 1.0 (no velocity decay — pattern is rhythmic not pitched)
export const EUCLIDEAN_NOTES_MODE_FORWARD = 'forward'; // Natural Bjorklund ordering
export const EUCLIDEAN_NOTES_MODE_REVERSE = 'reverse'; // Mirror the pattern (reverse temporal order)
export const EUCLIDEAN_NOTES_MODE_PENDULUM = 'pendulum'; // Bounce: forward then reverse (sounds palindromic)
export const EUCLIDEAN_NOTES_MODES = [
    EUCLIDEAN_NOTES_MODE_FORWARD,
    EUCLIDEAN_NOTES_MODE_REVERSE,
    EUCLIDEAN_NOTES_MODE_PENDULUM
];

// Hypotrochoid Notes (Day 727) — spirograph curves traced by the Spirograph toy.
// Hypotrochoid parametric equations:
//   x(t) = (R - r) * cos(t) + d * cos((R - r) / r * t)
//   y(t) = (R - r) * sin(t) - d * sin((R - r) / r * t)
// Where R = outer ring radius, r = inner gear radius, d = pen offset from gear center.
// Famous shapes: rose (R=5, r=3), star (R=7, r=3), astroid (R=4, r=1),
// trefoil (R=3, r=1), cardioid (R=2, r=1).
export const HYPOTROCHOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the curve (full period resolution)
export const HYPOTROCHOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution spirograph)
export const HYPOTROCHOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the curve
export const HYPOTROCHOID_NOTES_MIN_OUTER_RADIUS = 2; // Minimum outer ring radius R
export const HYPOTROCHOID_NOTES_MAX_OUTER_RADIUS = 12; // Maximum outer ring radius R
export const HYPOTROCHOID_NOTES_DEFAULT_OUTER_RADIUS = 5; // Default outer ring radius R
export const HYPOTROCHOID_NOTES_MIN_INNER_RADIUS = 1; // Minimum inner gear radius r (must be >= 1 for division)
export const HYPOTROCHOID_NOTES_MAX_INNER_RADIUS = 8; // Maximum inner gear radius r
export const HYPOTROCHOID_NOTES_DEFAULT_INNER_RADIUS = 3; // Default inner gear radius r
export const HYPOTROCHOID_NOTES_MIN_PEN_OFFSET = 1; // Minimum pen offset d from gear center
export const HYPOTROCHOID_NOTES_MAX_PEN_OFFSET = 12; // Maximum pen offset d
export const HYPOTROCHOID_NOTES_DEFAULT_PEN_OFFSET = 5; // Default pen offset d (matches R for full coverage)
export const HYPOTROCHOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const HYPOTROCHOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const HYPOTROCHOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const HYPOTROCHOID_NOTES_SHAPE_ROSE = 'rose'; // R=5, r=3: 5-petal rose
export const HYPOTROCHOID_NOTES_SHAPE_STAR = 'star'; // R=7, r=3: 7-point star
export const HYPOTROCHOID_NOTES_SHAPE_ASTROID = 'astroid'; // R=4, r=1: 4-cusp astroid (hypocycloid)
export const HYPOTROCHOID_NOTES_SHAPE_TREFOIL = 'trefoil'; // R=3, r=1: 3-lobed trefoil knot
export const HYPOTROCHOID_NOTES_SHAPE_CARDIOID = 'cardioid'; // R=2, r=1: heart-shape cardioid
export const HYPOTROCHOID_NOTES_SHAPE_CUSTOM = 'custom'; // Use user-supplied R/r/d (outerRadius/innerRadius/penOffset)
export const HYPOTROCHOID_NOTES_SHAPES = [
    HYPOTROCHOID_NOTES_SHAPE_ROSE,
    HYPOTROCHOID_NOTES_SHAPE_STAR,
    HYPOTROCHOID_NOTES_SHAPE_ASTROID,
    HYPOTROCHOID_NOTES_SHAPE_TREFOIL,
    HYPOTROCHOID_NOTES_SHAPE_CARDIOID,
    HYPOTROCHOID_NOTES_SHAPE_CUSTOM
];

// Epicycloid Notes (Day 728) — companion curves to the hypotrochoid (Day 727).
// An epicycloid is the curve traced by a point on a small circle of radius r rolling
// OUTSIDE a larger fixed circle of radius R, with pen offset d from the small circle's center.
// Epicycloid parametric equations:
//   x(t) = (R + r) * cos(t) - d * cos((R + r) / r * t)
//   y(t) = (R + r) * sin(t) - d * sin((R + r) / r * t)
// Where R = fixed circle radius, r = rolling circle radius, d = pen offset from rolling circle center.
// Famous shapes: cardioid (R=r, d=r), nephroid (R=2r, d=2r), 3-cusp (n=3), 4-cusp (n=4),
// 5-cusp (n=5), 6-cusp (n=6). Note the + signs contrast with the hypotrochoid's - signs.
export const EPICYCLOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the curve (full period resolution)
export const EPICYCLOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution epicycloid)
export const EPICYCLOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the curve
export const EPICYCLOID_NOTES_MIN_RADIUS_RATIO = 1; // Minimum 1 rolling circle radius r (must be >= 1 for division)
export const EPICYCLOID_NOTES_MAX_RADIUS_RATIO = 8; // Maximum 8 rolling circle radius r
export const EPICYCLOID_NOTES_DEFAULT_RADIUS_RATIO = 3; // Default 3 rolling circle radius r
export const EPICYCLOID_NOTES_MIN_BASE_RADIUS = 2; // Minimum 2 fixed circle radius R
export const EPICYCLOID_NOTES_MAX_BASE_RADIUS = 12; // Maximum 12 fixed circle radius R
export const EPICYCLOID_NOTES_DEFAULT_BASE_RADIUS = 3; // Default 3 fixed circle radius R
export const EPICYCLOID_NOTES_MIN_PEN_OFFSET = 1; // Minimum 1 pen offset d from rolling circle center
export const EPICYCLOID_NOTES_MAX_PEN_OFFSET = 12; // Maximum 12 pen offset d
export const EPICYCLOID_NOTES_DEFAULT_PEN_OFFSET = 3; // Default 3 pen offset d (matches default r for full coverage)
export const EPICYCLOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const EPICYCLOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const EPICYCLOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const EPICYCLOID_NOTES_SHAPE_CARDIOID = 'cardioid'; // R=1, r=1, d=1: 1-cusped heart curve
export const EPICYCLOID_NOTES_SHAPE_NEPHROID = 'nephroid'; // R=2, r=1, d=2: 2-cusped kidney shape
export const EPICYCLOID_NOTES_SHAPE_3CUSP = '3-cusp'; // n=3: 3-cusped trefoil
export const EPICYCLOID_NOTES_SHAPE_4CUSP = '4-cusp'; // n=4: 4-cusped quatrefoil
export const EPICYCLOID_NOTES_SHAPE_5CUSP = '5-cusp'; // n=5: 5-cusped cinquefoil
export const EPICYCLOID_NOTES_SHAPE_6CUSP = '6-cusp'; // n=6: 6-cusped hexafoil
export const EPICYCLOID_NOTES_SHAPES = [
    EPICYCLOID_NOTES_SHAPE_CARDIOID,
    EPICYCLOID_NOTES_SHAPE_NEPHROID,
    EPICYCLOID_NOTES_SHAPE_3CUSP,
    EPICYCLOID_NOTES_SHAPE_4CUSP,
    EPICYCLOID_NOTES_SHAPE_5CUSP,
    EPICYCLOID_NOTES_SHAPE_6CUSP
];

// ============================================================
// Cycloid Notes Constants (Day 729)
// ============================================================
// The cycloid is the curve traced by a point on a circle rolling along a
// straight line. It's the parent curve of the epicycloid/hypotrochoid family.
// Parametric equations:
//   x(t) = r * (t - sin(t))
//   y(t) = r - d * cos(t)
// where r is the rolling-circle radius and d is the pen offset from the
// rolling circle's center. For d = r, it's a standard cycloid with cusps
// (Galileo's brachistochrone — the fastest descent curve, also the
// tautochrone — the equal-time curve). For d < r, curtate cycloid
// (no cusps, flattened humps). For d > r, prolate cycloid (has loops).
export const CYCLOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples (full arch resolution)
export const CYCLOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples across multiple arches
export const CYCLOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples across the curve
export const CYCLOID_NOTES_MIN_RADIUS = 1; // Minimum 1 rolling circle radius r
export const CYCLOID_NOTES_MAX_RADIUS = 8; // Maximum 8 rolling circle radius r
export const CYCLOID_NOTES_DEFAULT_RADIUS = 3; // Default 3 rolling circle radius r
export const CYCLOID_NOTES_MIN_PEN_OFFSET = 1; // Minimum 1 pen offset d from rolling circle center
export const CYCLOID_NOTES_MAX_PEN_OFFSET = 12; // Maximum 12 pen offset d
export const CYCLOID_NOTES_DEFAULT_PEN_OFFSET = 3; // Default 3 pen offset d (custom mode)
export const CYCLOID_NOTES_MIN_ARCHES = 1; // Minimum 1 full arch of the cycloid
export const CYCLOID_NOTES_MAX_ARCHES = 4; // Maximum 4 full arches (4 cusps/loops)
export const CYCLOID_NOTES_DEFAULT_ARCHES = 2; // Default 2 full arches (classic 2-hump cycloid)
export const CYCLOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const CYCLOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const CYCLOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const CYCLOID_NOTES_SHAPE_STANDARD = 'standard'; // d=r: point on rim, cusps (brachistochrone/tautochrone)
export const CYCLOID_NOTES_SHAPE_PROLATE = 'prolate'; // d>r: point outside rim, has loops below baseline
export const CYCLOID_NOTES_SHAPE_CURTATE = 'curtate'; // d<r: point inside rim, flattened humps, no cusps
export const CYCLOID_NOTES_SHAPE_TROCHOID_CUSTOM = 'trochoid-custom'; // user-controlled d (any value)
export const CYCLOID_NOTES_SHAPES = [
    CYCLOID_NOTES_SHAPE_STANDARD,
    CYCLOID_NOTES_SHAPE_PROLATE,
    CYCLOID_NOTES_SHAPE_CURTATE,
    CYCLOID_NOTES_SHAPE_TROCHOID_CUSTOM
];

// ============================================================
// Involute Notes Constants (Day 730)
// ============================================================
// The involute of a circle is the curve traced by the end of a taut string
// as it's unwound from (or wound onto) the circle. Parametric equations:
//   x(t) = r * (cos(t) + t * sin(t))
//   y(t) = r * (sin(t) - t * cos(t))
// where r is the base-circle radius and t is the unwound string length
// in radians (also the angle in the original formulation by Huygens 1673).
// The involute is the geometric shape of involute gear teeth — every
// modern mechanical gear (cars, watches, industrial machinery) uses
// the involute because it maintains constant angular velocity ratio
// during meshing regardless of manufacturing errors or wear. The
// involute is also the evolute of the cycloid (Day 729): one unrolls
// the other, so they form a natural "dual" pair. Variants via t-range:
//   standard: t in [0, 2pi] — classic unwinding spiral (opens outward)
//   half:     t in [0, pi]  — one half of the spiral (one gear flank)
//   two-arm:  t in [-pi, +pi] — symmetric two-flank gear-tooth profile
//   reverse:  t in [-2pi, 0] — winding direction (mirrors standard)
export const INVOLUTE_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the involute
export const INVOLUTE_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution involute)
export const INVOLUTE_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the involute
export const INVOLUTE_NOTES_MIN_RADIUS = 1; // Minimum 1 base-circle radius r
export const INVOLUTE_NOTES_MAX_RADIUS = 8; // Maximum 8 base-circle radius r
export const INVOLUTE_NOTES_DEFAULT_RADIUS = 3; // Default 3 base-circle radius r
export const INVOLUTE_NOTES_MIN_TURNS = 1; // Minimum 1 full revolution of t (2*pi*turns)
export const INVOLUTE_NOTES_MAX_TURNS = 3; // Maximum 3 full revolutions (long spiral arm)
export const INVOLUTE_NOTES_DEFAULT_TURNS = 1; // Default 1 full revolution (t in [0, 2pi])
export const INVOLUTE_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const INVOLUTE_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const INVOLUTE_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const INVOLUTE_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, +2pi*turns]: unwinding spiral
export const INVOLUTE_NOTES_SHAPE_HALF = 'half'; // t in [0, +pi*turns]: one gear-tooth flank
export const INVOLUTE_NOTES_SHAPE_TWO_ARM = 'two-arm'; // t in [-pi*turns, +pi*turns]: symmetric profile
export const INVOLUTE_NOTES_SHAPE_REVERSE = 'reverse'; // t in [-2pi*turns, 0]: winding direction
export const INVOLUTE_NOTES_SHAPES = [
    INVOLUTE_NOTES_SHAPE_STANDARD,
    INVOLUTE_NOTES_SHAPE_HALF,
    INVOLUTE_NOTES_SHAPE_TWO_ARM,
    INVOLUTE_NOTES_SHAPE_REVERSE
];

// Lemniscate Notes constants (Day 731)
// The Bernoulli lemniscate: x(t) = a*cos(t)/(1+sin^2(t)), y(t) = a*sin(t)*cos(t)/(1+sin^2(t))
export const LEMNISCATE_NOTES_MIN_LENGTH = 8; // Minimum 8 samples (enough to resolve the self-intersection)
export const LEMNISCATE_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution lemniscate)
export const LEMNISCATE_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the lemniscate
export const LEMNISCATE_NOTES_MIN_RADIUS = 1; // Minimum 1 lobe half-width a
export const LEMNISCATE_NOTES_MAX_RADIUS = 8; // Maximum 8 lobe half-width a
export const LEMNISCATE_NOTES_DEFAULT_RADIUS = 4; // Default 4 lobe half-width a (the area = a^2 = 16, same as a circle of radius 4)
export const LEMNISCATE_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const LEMNISCATE_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const LEMNISCATE_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const LEMNISCATE_NOTES_SHAPE_HORIZONTAL = 'horizontal'; // sideways infinity: lobes extend along x-axis (Bernoulli 1694 default)
export const LEMNISCATE_NOTES_SHAPE_VERTICAL = 'vertical'; // upright figure-8: lobes extend along y-axis (rotated +pi/2)
export const LEMNISCATE_NOTES_SHAPE_RIGHT_LOBE = 'right-lobe'; // single lobe on the right (theta in [-pi/4, +pi/4])
export const LEMNISCATE_NOTES_SHAPE_LEFT_LOBE = 'left-lobe'; // single lobe on the left (theta in [3pi/4, 5pi/4])
export const LEMNISCATE_NOTES_SHAPES = [
    LEMNISCATE_NOTES_SHAPE_HORIZONTAL,
    LEMNISCATE_NOTES_SHAPE_VERTICAL,
    LEMNISCATE_NOTES_SHAPE_RIGHT_LOBE,
    LEMNISCATE_NOTES_SHAPE_LEFT_LOBE
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

// ============================================================
// Audio Recording Constants
// ============================================================
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

// ============================================================
// Track Template Constants
// ===========================
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


// ============================================================
// SnugWindow Window Constants
// ===========================
export const DEFAULT_WINDOW_MIN_WIDTH = 150; // Minimum window width in pixels
export const DEFAULT_WINDOW_MIN_HEIGHT = 100; // Minimum window height in pixels
export const DEFAULT_WINDOW_WIDTH = 350; // Default window width in pixels
export const DEFAULT_WINDOW_HEIGHT = 250; // Default window height in pixels
export const TASKBAR_HEIGHT = 30; // Taskbar height in pixels

// ============================================================
// Context Menu Constants
// ===========================
export const CONTEXT_MENU_ITEM_HEIGHT = 28; // Height of each context menu item in pixels
export const CONTEXT_MENU_MAX_WIDTH = 300; // Maximum width of context menu in pixels

// ============================================================
// Drop Zone Constants
// ===========================
export const DROP_ZONE_MIN_WIDTH = 80; // Minimum drop zone width in pixels
export const DROP_ZONE_MIN_HEIGHT = 60; // Minimum drop zone height in pixels
export const DROP_ZONE_DEFAULT_HEIGHT = 50; // Default drop zone height in pixels
export const DROP_ZONE_BORDER_RADIUS = 4; // Border radius in pixels

// ============================================================
// Sequencer Grid Constants
// ===========================
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

// ============================================================
// MIDI Learn Constants
// ===========================
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

// ============================================================
// Keyboard Shortcuts Registry
// ============================================================
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

// ============================================================
// Effect Preset Constants
// ===========================
export const MAX_EFFECT_PRESETS = 64; // Maximum number of saved effect presets per effect type
export const DEFAULT_PRESET_NAME_PREFIX = 'Preset'; // Default name for new presets
export const DEFAULT_EFFECT_PRESET = {
    name: DEFAULT_PRESET_NAME_PREFIX,
    effectType: null,  // The effect type (e.g., 'Reverb', 'Chorus')
    params: {}         // The effect parameters
};

// Rose Curve Notes (Day 732) — the rhodonea curve r = a * sin(k*θ),
// discovered by Guido Grandi in 1723 ("Flores geometrici") and studied
// later by Lucia Perazza and Colin Maclaurin. For k odd, one 2π sweep
// produces k petals (k=3→3 petals, k=5→5 petals). For k even, one 2π
// sweep produces 2k petals because each petal is traced twice (k=6→12
// petals, k=8→16 petals). Parametric: x = a*sin(k*θ)*cos(θ),
// y = a*sin(k*θ)*sin(θ), so x and y both lie in [-a, +a].
export const ROSE_NOTES_MIN_LENGTH = 8; // Minimum 8 samples (enough to resolve a single petal)
export const ROSE_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution rose)
export const ROSE_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the rose
export const ROSE_NOTES_MIN_RADIUS = 1; // Minimum 1 petal radius a (small tight rose)
export const ROSE_NOTES_MAX_RADIUS = 8; // Maximum 8 petal radius a (wide rose)
export const ROSE_NOTES_DEFAULT_RADIUS = 4; // Default 4 petal radius a
export const ROSE_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const ROSE_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const ROSE_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const ROSE_NOTES_DEFAULT_PETALS = 'standard'; // Default 5-petal rose
export const ROSE_NOTES_SHAPE_STANDARD = 'standard'; // k=5: classic 5-petal rose (odd, t in [0, 2π] → 5 petals)
export const ROSE_NOTES_SHAPE_DOUBLE = 'double'; // k=6: 12-petal rose (even, t in [0, 2π] → 12 petals, each traced twice)
export const ROSE_NOTES_SHAPE_HALF = 'half'; // k=3: 3-petal rose (odd, t in [0, 2π] → 3 petals)
export const ROSE_NOTES_SHAPE_QUARTER = 'quarter'; // k=8: 16-petal rose (even, t in [0, 2π] → 16 petals, each traced twice)
export const ROSE_NOTES_SHAPES = [
    ROSE_NOTES_SHAPE_STANDARD,
    ROSE_NOTES_SHAPE_DOUBLE,
    ROSE_NOTES_SHAPE_HALF,
    ROSE_NOTES_SHAPE_QUARTER
];
// Day 733: Hilbert Curve Notes - Hilbert curve is a 2D space-filling fractal that visits every cell of a 2^n × 2^n grid exactly once. Invented by David Hilbert in 1891, it's a continuous self-avoiding curve that preserves spatial locality better than other space-filling curves. Used in image processing (dithering, compression), cache-friendly traversal (Z-order), procedural generation, and mathematical visualizations. The curve recursively subdivides the grid into 4 quadrants, visiting them in a U-shape pattern. For each source note, we trace a Hilbert curve of order N through an N×N grid and place notes along that path, producing fractal/spiral patterns that fill 2D space evenly. Order 1 = U-shape of 4 cells, Order 2 = 16 cells in a tighter U, Order 3 = 64 cells, etc. Orientations: forward (natural Hilbert), reverse (back along curve), inverse (rotate 180°), transpose (transpose axes).
export const HILBERT_NOTES_MIN_ORDER = 1; // Minimum Hilbert curve order (1 = 2x2 = 4 cells, simple U)
export const HILBERT_NOTES_MAX_ORDER = 5; // Maximum Hilbert curve order (5 = 32x32 = 1024 cells, complex)
export const HILBERT_NOTES_DEFAULT_ORDER = 3; // Default order 3 (8x8 = 64 cells, balanced detail)
export const HILBERT_NOTES_MIN_SIZE = 2; // Minimum 2x2 grid size (smallest non-trivial Hilbert)
export const HILBERT_NOTES_MAX_SIZE = 32; // Maximum 32x32 grid (largest supported)
export const HILBERT_NOTES_DEFAULT_SIZE = 8; // Default 8x8 grid (matches default order=3)
export const HILBERT_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation
export const HILBERT_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const HILBERT_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% preservation per step (gentle decay)
export const HILBERT_NOTES_ORIENTATION_FORWARD = 'forward'; // Natural Hilbert curve traversal (U-shape outward)
export const HILBERT_NOTES_ORIENTATION_REVERSE = 'reverse'; // Backwards along curve (mirrored U-shape)
export const HILBERT_NOTES_ORIENTATION_INVERSE = 'inverse'; // Rotated 180° (still forward but inverted)
export const HILBERT_NOTES_ORIENTATION_TRANSPOSE = 'transpose'; // Transpose axes (swap x/y)
export const HILBERT_NOTES_ORIENTATIONS = [
    HILBERT_NOTES_ORIENTATION_FORWARD,
    HILBERT_NOTES_ORIENTATION_REVERSE,
    HILBERT_NOTES_ORIENTATION_INVERSE,
    HILBERT_NOTES_ORIENTATION_TRANSPOSE
];
// Tractrix Notes constants — the famous "drag curve" or "dog-walker curve" discovered by Christiaan Huygens in 1692
// while studying tautochrones. Parametric form: x(t) = a*(t - tanh(t)), y(t) = a/cosh(t) = a*sech(t).
// Famous as the cross-section of Beltrami's pseudosphere (a model of hyperbolic geometry).
// Arc length from t=0 to t=∞ is exactly a (Huygens' discovery).
export const TRACTRIX_NOTES_MIN_LENGTH = 8; // Minimum 8 samples (need enough to resolve the asymptotic tail)
export const TRACTRIX_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution tractrix)
export const TRACTRIX_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the curve
export const TRACTRIX_NOTES_MIN_RADIUS = 1; // Minimum 1 string length a (small tight tractrix)
export const TRACTRIX_NOTES_MAX_RADIUS = 8; // Maximum 8 string length a (wide tractrix)
export const TRACTRIX_NOTES_DEFAULT_RADIUS = 4; // Default 4 string length a
export const TRACTRIX_NOTES_MIN_T_RANGE = 1; // Minimum 1.0 t range (tight curve near cusp)
export const TRACTRIX_NOTES_MAX_T_RANGE = 6; // Maximum 6.0 t range (long asymptotic tail)
export const TRACTRIX_NOTES_DEFAULT_T_RANGE = 3; // Default 3.0 t range (well into asymptotic regime)
export const TRACTRIX_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const TRACTRIX_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const TRACTRIX_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const TRACTRIX_NOTES_SHAPE_STANDARD = 'standard'; // t in [-T, +T]: symmetric dog-walker curve (Huygens 1692 default)
export const TRACTRIX_NOTES_SHAPE_FORWARD = 'forward'; // t in [0, +T]: rightward-only drag (single tail)
export const TRACTRIX_NOTES_SHAPE_BACKWARD = 'backward'; // t in [-T, 0]: leftward-only drag (mirror of forward)
export const TRACTRIX_NOTES_SHAPE_TIGHT = 'tight'; // t in [-T/2, +T/2]: smaller range, more concentrated trail
export const TRACTRIX_NOTES_SHAPES = [
    TRACTRIX_NOTES_SHAPE_STANDARD,
    TRACTRIX_NOTES_SHAPE_FORWARD,
    TRACTRIX_NOTES_SHAPE_BACKWARD,
    TRACTRIX_NOTES_SHAPE_TIGHT
];
// Catenary curve (Huygens 1691, "catenaria" = chain): the iconic curve formed by a
// uniform hanging chain or cable, y(x) = a * cosh(x / a), which minimizes potential
// energy under gravity. It is the natural dual of the tractrix (Day 733): the
// tractrix is the involute of the catenary, and the catenary is the evolute of the
// tractrix — together they form one of the great dual pairs of classical mechanics,
// studied jointly by Huygens, Leibniz, and the Bernoullis in 1691-1692. The catenary
// governs the shape of suspension bridges (the roadway is approximately a parabola,
// but the chain is exactly the catenary — the source of the "parabolic bridge" myth),
// the Gateway Arch in St. Louis, draped power cables, spider webs, and the
// zero-gravity shape of a rotating chain.
export const CATENARY_NOTES_MIN_LENGTH = 8; // Minimum 8 samples (need enough to resolve both arms of the chain)
export const CATENARY_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution catenary)
export const CATENARY_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the chain
export const CATENARY_NOTES_MIN_A = 1; // Minimum 1 chain scale parameter a
export const CATENARY_NOTES_MAX_A = 8; // Maximum 8 chain scale parameter a
export const CATENARY_NOTES_DEFAULT_A = 2; // Default 2 chain scale parameter a
export const CATENARY_NOTES_MIN_X_RANGE = 1; // Minimum 1.0 x-domain half-width (tight chain near vertex)
export const CATENARY_NOTES_MAX_X_RANGE = 8; // Maximum 8.0 x-domain half-width (long chain arms)
export const CATENARY_NOTES_DEFAULT_X_RANGE = 4; // Default 4.0 x-domain half-width (well into cosh growth regime)
export const CATENARY_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const CATENARY_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const CATENARY_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const CATENARY_NOTES_SHAPE_STANDARD = 'standard'; // x in [-X, +X]: symmetric hanging chain (Huygens 1691 default)
export const CATENARY_NOTES_SHAPE_ARCH = 'arch'; // x in [0, +X]: rightward-only arch (Gateway Arch, inverted catenary)
export const CATENARY_NOTES_SHAPE_HALF = 'half'; // x in [-X, 0]: leftward-only half chain (mirror of arch)
export const CATENARY_NOTES_SHAPE_TIGHT = 'tight'; // x in [-X/2, +X/2]: tighter chain (half x-domain, more concentrated near vertex)
export const CATENARY_NOTES_SHAPES = [
    CATENARY_NOTES_SHAPE_STANDARD,
    CATENARY_NOTES_SHAPE_ARCH,
    CATENARY_NOTES_SHAPE_HALF,
    CATENARY_NOTES_SHAPE_TIGHT
];
export const SIERPINSKI_NOTES_MIN_ITERATIONS = 1; // Minimum 1 iteration (single equilateral triangle, 3 points)
export const SIERPINSKI_NOTES_MAX_ITERATIONS = 5; // Maximum 5 iterations (3^5 = 243 triangle centroids)
export const SIERPINSKI_NOTES_DEFAULT_ITERATIONS = 3; // Default 3 iterations (27 centroids, balanced detail)
export const SIERPINSKI_NOTES_MIN_SIZE = 2; // Minimum 2x2 grid extent
export const SIERPINSKI_NOTES_MAX_SIZE = 32; // Maximum 32x32 grid extent
export const SIERPINSKI_NOTES_DEFAULT_SIZE = 8; // Default 8x8 grid extent
export const SIERPINSKI_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation
export const SIERPINSKI_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const SIERPINSKI_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per step
export const SIERPINSKI_NOTES_ORIENTATION_CLASSIC = 'classic'; // Pointing-up equilateral triangle (apex at top)
export const SIERPINSKI_NOTES_ORIENTATION_INVERTED = 'inverted'; // Pointing-down (apex at bottom, mirror of classic)
export const SIERPINSKI_NOTES_ORIENTATION_LEFT = 'left'; // Tilted left (apex at upper-left)
export const SIERPINSKI_NOTES_ORIENTATION_RIGHT = 'right'; // Tilted right (apex at upper-right)
export const SIERPINSKI_NOTES_ORIENTATIONS = [
    SIERPINSKI_NOTES_ORIENTATION_CLASSIC,
    SIERPINSKI_NOTES_ORIENTATION_INVERTED,
    SIERPINSKI_NOTES_ORIENTATION_LEFT,
    SIERPINSKI_NOTES_ORIENTATION_RIGHT
];
// Clothoid (Euler Spiral / Cornu Spiral) Notes — Day 735
// Each active note spawns N samples along a clothoid curve, the canonical
// transition curve used in highway/railway engineering, computed via
// Fresnel integrals: x(s) = ∫₀ˢ cos(½πu²) du and y(s) = ∫₀ˢ sin(½πu²) du.
export const CLOTHOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples (need enough to resolve one arm)
export const CLOTHOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution clothoid)
export const CLOTHOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the clothoid
export const CLOTHOID_NOTES_MIN_S_MAX = 1; // Minimum 1.0 max arc-length (tight near origin)
export const CLOTHOID_NOTES_MAX_S_MAX = 6; // Maximum 6.0 max arc-length (well past first oscillation)
export const CLOTHOID_NOTES_DEFAULT_S_MAX = 3; // Default 3.0 max arc-length (past first Fresnel tail)
export const CLOTHOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const CLOTHOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const CLOTHOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const CLOTHOID_NOTES_SHAPE_STANDARD = 'standard'; // s in [-S, +S]: symmetric Euler spiral (Euler 1744 default)
export const CLOTHOID_NOTES_SHAPE_FORWARD = 'forward'; // s in [0, +S]: rightward-only first arm (one Fresnel tail)
export const CLOTHOID_NOTES_SHAPE_BACKWARD = 'backward'; // s in [-S, 0]: leftward-only first arm (mirror of forward)
export const CLOTHOID_NOTES_SHAPE_TIGHT = 'tight'; // s in [-S/2, +S/2] (rangeFactor=0.5): smaller range, more concentrated near origin
export const CLOTHOID_NOTES_SHAPES = [
    CLOTHOID_NOTES_SHAPE_STANDARD,
    CLOTHOID_NOTES_SHAPE_FORWARD,
    CLOTHOID_NOTES_SHAPE_BACKWARD,
    CLOTHOID_NOTES_SHAPE_TIGHT
];
// Archimedean Spiral Notes — Day 736
// Each active note spawns N samples along an Archimedean spiral — the canonical
// "equal-spacing" spiral discovered by Archimedes of Syracuse (~225 BC) in his
// "On Spirals". Polar form: r(θ) = a + b·θ. Parametric: x(θ) = (a + b·θ)·cos(θ),
// y(θ) = (a + b·θ)·sin(θ). Successive turn-to-turn spacing is a constant 2π·b —
// this is the defining property that distinguishes it from the logarithmic spiral
// (Bernoulli, 1638; spacing grows geometrically) and the Fermat spiral
// (phyllotaxis, Day 722; spacing grows with √θ).
export const ARCHIMEDEAN_NOTES_MIN_LENGTH = 8; // Minimum 8 samples (need at least one full turn)
export const ARCHIMEDEAN_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution spiral)
export const ARCHIMEDEAN_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the spiral
export const ARCHIMEDEAN_NOTES_MIN_TURNS = 1; // Minimum 1 full revolution (2π·turns total angle)
export const ARCHIMEDEAN_NOTES_MAX_TURNS = 8; // Maximum 8 revolutions
export const ARCHIMEDEAN_NOTES_DEFAULT_TURNS = 3; // Default 3 revolutions (classic tight Archimedean)
export const ARCHIMEDEAN_NOTES_MIN_START_RADIUS = 0; // Minimum 0 starting radius a (spiral starts at origin)
export const ARCHIMEDEAN_NOTES_MAX_START_RADIUS = 8; // Maximum 8 starting radius a
export const ARCHIMEDEAN_NOTES_DEFAULT_START_RADIUS = 1; // Default 1 starting radius a (spiral starts near origin)
export const ARCHIMEDEAN_NOTES_MIN_RADIAL_STEP = 0.1; // Minimum 0.1 per-radian growth rate b (very tight)
export const ARCHIMEDEAN_NOTES_MAX_RADIAL_STEP = 2.0; // Maximum 2.0 per-radian growth rate b (wide gaps)
export const ARCHIMEDEAN_NOTES_DEFAULT_RADIAL_STEP = 0.5; // Default 0.5 per-radian growth rate b (balanced)
export const ARCHIMEDEAN_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const ARCHIMEDEAN_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const ARCHIMEDEAN_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const ARCHIMEDEAN_NOTES_ORIENTATION_CW = 'cw'; // Clockwise spiral (positive θ, Archimedes ~225 BC default)
export const ARCHIMEDEAN_NOTES_ORIENTATION_CCW = 'ccw'; // Counter-clockwise spiral (negative θ, mirror)
export const ARCHIMEDEAN_NOTES_ORIENTATIONS = [
    ARCHIMEDEAN_NOTES_ORIENTATION_CW,
    ARCHIMEDEAN_NOTES_ORIENTATION_CCW
];
// (Day 737: Logarithmic spiral, r = a * exp(b*theta), geometric growth — the "spira mirabilis")
// The logarithmic spiral is the natural complement to the Archimedean spiral (Day 736,
// linear growth r = a + b*theta). For the Archimedean spiral, turn-to-turn spacing is
// constant (2*pi*b). For the logarithmic spiral, turn-to-turn spacing grows by the same
// factor (exp(2*pi*b)), giving the "self-similar" property that successive rotations
// about the origin by 2*pi scale the curve by a constant factor. This self-similarity
// is the defining geometric property that makes it the "spira mirabilis" (marvelous
// spiral) of Jacob Bernoulli 1691.
export const LOGARITHMIC_NOTES_MIN_LENGTH = 8; // Minimum 8 samples (need enough to resolve one full cycle)
export const LOGARITHMIC_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution logarithmic)
export const LOGARITHMIC_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the curve
export const LOGARITHMIC_NOTES_MIN_TURNS = 1; // Minimum 1 full revolution (2*pi*turns total angle)
export const LOGARITHMIC_NOTES_MAX_TURNS = 5; // Maximum 5 revolutions (since exp() grows fast, small N suffices)
export const LOGARITHMIC_NOTES_DEFAULT_TURNS = 3; // Default 3 revolutions (classic tight logarithmic)
export const LOGARITHMIC_NOTES_MIN_START_RADIUS = 1; // Minimum 1 starting radius a (must be > 0 for log behavior)
export const LOGARITHMIC_NOTES_MAX_START_RADIUS = 8; // Maximum 8 starting radius a
export const LOGARITHMIC_NOTES_DEFAULT_START_RADIUS = 1; // Default 1 starting radius a (spiral starts at r=1)
export const LOGARITHMIC_NOTES_MIN_GROWTH_RATE = 0.05; // Minimum 0.05 per-radian growth rate b (very tight, near-circle)
export const LOGARITHMIC_NOTES_MAX_GROWTH_RATE = 0.5; // Maximum 0.5 per-radian growth rate b (very wide gaps, exp(pi) ≈ 23x per turn)
export const LOGARITHMIC_NOTES_DEFAULT_GROWTH_RATE = 0.15; // Default 0.15 per-radian growth rate b (balanced, exp(2*pi*0.15) ≈ 2.57x per turn)
export const LOGARITHMIC_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const LOGARITHMIC_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const LOGARITHMIC_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const LOGARITHMIC_NOTES_ORIENTATION_CW = 'cw'; // Clockwise spiral (positive theta, Bernoulli 1691 default)
export const LOGARITHMIC_NOTES_ORIENTATION_CCW = 'ccw'; // Counter-clockwise spiral (negative theta, mirror)
export const LOGARITHMIC_NOTES_ORIENTATIONS = [
    LOGARITHMIC_NOTES_ORIENTATION_CW,
    LOGARITHMIC_NOTES_ORIENTATION_CCW
];

// Superellipse Notes (Day 738) - Lamé curves, the "rounded rectangle" curve of Piet Hein
export const SUPERELLIPSE_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the curve
export const SUPERELLIPSE_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution superellipse)
export const SUPERELLIPSE_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the superellipse
export const SUPERELLIPSE_NOTES_MIN_HALF_WIDTH = 1; // Minimum 1 half-width a
export const SUPERELLIPSE_NOTES_MAX_HALF_WIDTH = 8; // Maximum 8 half-width a
export const SUPERELLIPSE_NOTES_DEFAULT_HALF_WIDTH = 4; // Default 4 half-width a
export const SUPERELLIPSE_NOTES_MIN_HALF_HEIGHT = 1; // Minimum 1 half-height b
export const SUPERELLIPSE_NOTES_MAX_HALF_HEIGHT = 8; // Maximum 8 half-height b
export const SUPERELLIPSE_NOTES_DEFAULT_HALF_HEIGHT = 4; // Default 4 half-height b
export const SUPERELLIPSE_NOTES_MIN_EXPONENT = 0.5; // Minimum 0.5 exponent n (astroid-like, concave diamond)
export const SUPERELLIPSE_NOTES_MAX_EXPONENT = 8; // Maximum 8 exponent n (approaching square)
export const SUPERELLIPSE_NOTES_DEFAULT_EXPONENT = 2.5; // Default 2.5 exponent (Sergels Torg / Piet Hein rounded square)
export const SUPERELLIPSE_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const SUPERELLIPSE_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const SUPERELLIPSE_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const SUPERELLIPSE_NOTES_SHAPE_ROUNDED = 'rounded'; // n=2.5: classic rounded square (Piet Hein 1959 Sergels Torg)
export const SUPERELLIPSE_NOTES_SHAPE_ELLIPSE = 'ellipse'; // n=2: classic ellipse (the only "regular" superellipse)
export const SUPERELLIPSE_NOTES_SHAPE_DIAMOND = 'diamond'; // n=1: rhombus / diamond (Lamé 1818)
export const SUPERELLIPSE_NOTES_SHAPE_ASTROID = 'astroid'; // n=2/3: concave 4-cusp star (the only non-convex case)
export const SUPERELLIPSE_NOTES_SHAPE_SQUARE = 'square'; // n=8: nearly square (approaching the limit case)
export const SUPERELLIPSE_NOTES_SHAPES = [
    SUPERELLIPSE_NOTES_SHAPE_ROUNDED,
    SUPERELLIPSE_NOTES_SHAPE_ELLIPSE,
    SUPERELLIPSE_NOTES_SHAPE_DIAMOND,
    SUPERELLIPSE_NOTES_SHAPE_ASTROID,
    SUPERELLIPSE_NOTES_SHAPE_SQUARE
];

// Cassini Oval Notes (Day 739) - Cassini 1680 ovals, "peanut" shape when b<a, lemniscate at b=a
export const CASSINI_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the oval
export const CASSINI_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution Cassini oval)
export const CASSINI_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the oval
export const CASSINI_NOTES_MIN_HALF_FOCAL = 1; // Minimum 1 half-focal-distance a (foci at (±a, 0))
export const CASSINI_NOTES_MAX_HALF_FOCAL = 8; // Maximum 8 half-focal-distance a
export const CASSINI_NOTES_DEFAULT_HALF_FOCAL = 3; // Default 3 half-focal-distance a
export const CASSINI_NOTES_MIN_PRODUCT = 1; // Minimum 1 product of distances b (small tight curve)
export const CASSINI_NOTES_MAX_PRODUCT = 8; // Maximum 8 product of distances b (large oval)
export const CASSINI_NOTES_DEFAULT_PRODUCT = 4; // Default 4 product of distances b
export const CASSINI_NOTES_MIN_RATIO = 0.6; // Minimum 0.6 b/a ratio (single peanut)
export const CASSINI_NOTES_MAX_RATIO = 1.6; // Maximum 1.6 b/a ratio (two separated ovals)
export const CASSINI_NOTES_DEFAULT_RATIO = 1.2; // Default 1.2 b/a ratio (oval)
export const CASSINI_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const CASSINI_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const CASSINI_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const CASSINI_NOTES_SHAPE_OVAL = 'oval'; // b/a > 1: smooth oval, single connected loop
export const CASSINI_NOTES_SHAPE_LEMNISCATE = 'lemniscate'; // b/a = 1: sideways infinity (Cassini-Bernoulli lemniscate)
export const CASSINI_NOTES_SHAPE_PEANUT = 'peanut'; // 0.7 < b/a < 1: pinched waist, peanut shape
export const CASSINI_NOTES_SHAPE_DOUBLE = 'double'; // b/a < ~0.707: two separated ovals
export const CASSINI_NOTES_SHAPE_BIG = 'big'; // b/a >> 1: nearly circular, large
export const CASSINI_NOTES_SHAPES = [
    CASSINI_NOTES_SHAPE_OVAL,
    CASSINI_NOTES_SHAPE_LEMNISCATE,
    CASSINI_NOTES_SHAPE_PEANUT,
    CASSINI_NOTES_SHAPE_DOUBLE,
    CASSINI_NOTES_SHAPE_BIG
];

// Day 740: Cardioid Notes — Jean-Baptiste de la Faille 1637 heart-shaped curve (r = a(1 - cos θ))
export const CARDIOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the curve
export const CARDIOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution cardioid)
export const CARDIOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the cardioid
export const CARDIOID_NOTES_MIN_SCALE = 0.5; // Minimum 0.5 scale a (small heart)
export const CARDIOID_NOTES_MAX_SCALE = 8; // Maximum 8 scale a (large heart)
export const CARDIOID_NOTES_DEFAULT_SCALE = 4; // Default 4 scale a (medium heart)
export const CARDIOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const CARDIOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const CARDIOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const CARDIOID_NOTES_SHAPE_UP = 'up'; // r = a(1 - cos θ): cusp at top (y < 0), lobes downward (classic heart)
export const CARDIOID_NOTES_SHAPE_DOWN = 'down'; // r = a(1 + cos θ): cusp at bottom (y > 0), lobes upward (inverted heart)
export const CARDIOID_NOTES_SHAPE_LEFT = 'left'; // r = a(1 - sin θ): cusp at left (x < 0), lobes rightward
export const CARDIOID_NOTES_SHAPE_RIGHT = 'right'; // r = a(1 + sin θ): cusp at right (x > 0), lobes leftward
export const CARDIOID_NOTES_SHAPES = [
    CARDIOID_NOTES_SHAPE_UP,
    CARDIOID_NOTES_SHAPE_DOWN,
    CARDIOID_NOTES_SHAPE_LEFT,
    CARDIOID_NOTES_SHAPE_RIGHT
];

// Day 742: Strophoid Notes — Isaac Barrow 1670 (the conchoid of a line through the pole)
export const STROPHOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the curve
export const STROPHOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution strophoid)
export const STROPHOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the strophoid
export const STROPHOID_NOTES_MIN_A = 1; // Minimum 1 scale a (small strophoid)
export const STROPHOID_NOTES_MAX_A = 8; // Maximum 8 scale a (large strophoid)
export const STROPHOID_NOTES_DEFAULT_A = 3; // Default 3 scale a (medium strophoid)
export const STROPHOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const STROPHOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const STROPHOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const STROPHOID_NOTES_SHAPE_STANDARD = 'standard'; // t in (-∞, +∞): full strophoid with node at origin (Barrow 1670 default)
export const STROPHOID_NOTES_SHAPE_RIGHT = 'right'; // t in (0, +∞): right-loop only, single branch (the looped half)
export const STROPHOID_NOTES_SHAPE_LEFT = 'left'; // t in (-∞, 0): left-branch only (mirror of right, opens leftward)
export const STROPHOID_NOTES_SHAPE_NODE = 'node'; // |t| near 1: tight curve near node at origin (where curve self-intersects)
export const STROPHOID_NOTES_SHAPES = [
    STROPHOID_NOTES_SHAPE_STANDARD,
    STROPHOID_NOTES_SHAPE_RIGHT,
    STROPHOID_NOTES_SHAPE_LEFT,
    STROPHOID_NOTES_SHAPE_NODE
];

// Day 743: Witch of Agnesi (Versiera) Notes — Maria Gaetana Agnesi 1748
// The "Witch of Agnesi" is the iconic bell-shaped cubic curve named by John Colson
// in his 1731 mistranslation of Maria Gaetana Agnesi's Italian "versiera" (Latin
// "versare" = to turn, related to "avversiera" = witch/adversary) as "witch" instead
// of the correct "turning curve" or "bow" — the mistranslation stuck permanently.
// Parametric: x(t) = a·cos(t), y(t) = a·sin(t)·cos²(t), t ∈ [-π/2, +π/2].
export const WITCH_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the bell curve
export const WITCH_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution witch)
export const WITCH_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the witch
export const WITCH_NOTES_MIN_A = 1; // Minimum 1 scale a (small bell)
export const WITCH_NOTES_MAX_A = 8; // Maximum 8 scale a (wide bell)
export const WITCH_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium bell, x range [0, 4])
export const WITCH_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const WITCH_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const WITCH_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const WITCH_NOTES_SHAPE_STANDARD = 'standard'; // t ∈ [-π/2, +π/2]: classic bell curve (Agnesi 1748 default)
export const WITCH_NOTES_SHAPE_INVERTED = 'inverted'; // t ∈ [π/2, 3π/2]: inverted bell (skull/cup shape, peak at bottom)
export const WITCH_NOTES_SHAPE_UPPER = 'upper'; // t ∈ [0, π]: full right-half bell + mirror (the curve from x=−a back to x=−a, sweeping top)
export const WITCH_NOTES_SHAPE_RIGHT = 'right'; // t ∈ [−π/4, +π/4]: tight bell near peak (just the rising-and-falling crown)
export const WITCH_NOTES_SHAPES = [
    WITCH_NOTES_SHAPE_STANDARD,
    WITCH_NOTES_SHAPE_INVERTED,
    WITCH_NOTES_SHAPE_UPPER,
    WITCH_NOTES_SHAPE_RIGHT
];

export const FOLIUM_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the folium loop
export const FOLIUM_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution folium)
export const FOLIUM_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the folium
export const FOLIUM_NOTES_MIN_A = 1; // Minimum 1 scale a (small folium loop)
export const FOLIUM_NOTES_MAX_A = 8; // Maximum 8 scale a (large folium loop)
export const FOLIUM_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium folium loop, x and y in [0, 4])
export const FOLIUM_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const FOLIUM_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const FOLIUM_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const FOLIUM_NOTES_DEFAULT_T_MIN = -2; // Standard shape lower t bound (covers loop and asymptote)
export const FOLIUM_NOTES_DEFAULT_T_MAX = 5; // Standard shape upper t bound (passes through asymptote)
export const FOLIUM_NOTES_RIGHT_T_MIN = 0; // Right shape lower t bound (right arm only)
export const FOLIUM_NOTES_RIGHT_T_MAX = 5; // Right shape upper t bound (right arm only)
export const FOLIUM_NOTES_TIGHT_T_MIN = -1.5; // Tight shape lower t bound (concentrated near loop apex)
export const FOLIUM_NOTES_TIGHT_T_MAX = 1.5; // Tight shape upper t bound (concentrated near loop apex)
export const FOLIUM_NOTES_SHAPE_STANDARD = 'standard'; // t in [-2, +5]: full folium loop with asymptote arm (Descartes 1638 default)
export const FOLIUM_NOTES_SHAPE_INVERTED = 'inverted'; // t in [+5, -2]: reversed traversal direction
export const FOLIUM_NOTES_SHAPE_RIGHT = 'right'; // t in [0, +5]: right arm only (right half of folium)
export const FOLIUM_NOTES_SHAPE_TIGHT = 'tight'; // t in [-1.5, +1.5]: tight loop near apex (concentrated loop)
export const FOLIUM_NOTES_SHAPES = [
    FOLIUM_NOTES_SHAPE_STANDARD,
    FOLIUM_NOTES_SHAPE_INVERTED,
    FOLIUM_NOTES_SHAPE_RIGHT,
    FOLIUM_NOTES_SHAPE_TIGHT
];

export const KAMPYLE_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the kampyle curve
export const KAMPYLE_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution kampyle)
export const KAMPYLE_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the kampyle
export const KAMPYLE_NOTES_MIN_A = 1; // Minimum 1 scale a (small kampyle)
export const KAMPYLE_NOTES_MAX_A = 8; // Maximum 8 scale a (large kampyle)
export const KAMPYLE_NOTES_DEFAULT_A = 2; // Default 2 scale a (medium kampyle, well into the asymptotic regime where sec(t) >> 1)
export const KAMPYLE_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const KAMPYLE_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const KAMPYLE_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const KAMPYLE_NOTES_DEFAULT_T_MIN = -1.2; // Standard shape lower t bound (just before -pi/2 asymptote)
export const KAMPYLE_NOTES_DEFAULT_T_MAX = 1.2; // Standard shape upper t bound (just before +pi/2 asymptote)
export const KAMPYLE_NOTES_RIGHT_T_MIN = 0; // Right shape lower t bound (right branch only)
export const KAMPYLE_NOTES_RIGHT_T_MAX = 1.2; // Right shape upper t bound (right branch only)
export const KAMPYLE_NOTES_UPPER_T_MIN = -2.4; // Upper shape lower t bound (extended range past both asymptotes, traces both branches + cusp)
export const KAMPYLE_NOTES_UPPER_T_MAX = 2.4; // Upper shape upper t bound (extended range past both asymptotes)
export const KAMPYLE_NOTES_SHAPE_STANDARD = 'standard'; // t in [-1.2, +1.2]: full kampyle between asymptotes (Eudoxus ~390-340 BC default)
export const KAMPYLE_NOTES_SHAPE_INVERTED = 'inverted'; // t in [+1.2, -1.2]: reversed traversal direction
export const KAMPYLE_NOTES_SHAPE_RIGHT = 'right'; // t in [0, +1.2]: right branch only (t > 0, the right half of the kampyle)
export const KAMPYLE_NOTES_SHAPE_UPPER = 'upper'; // t in [-2.4, +2.4]: extended range past both asymptotes (traces both branches and the cusp at origin)
export const KAMPYLE_NOTES_SHAPES = [
    KAMPYLE_NOTES_SHAPE_STANDARD,
    KAMPYLE_NOTES_SHAPE_INVERTED,
    KAMPYLE_NOTES_SHAPE_RIGHT,
    KAMPYLE_NOTES_SHAPE_UPPER
];

// Bicorn (Cocked Hat) Notes constants — Day 746
// The Bicorn curve is a quartic defined parametrically as x = a·sin(t), y = a·cos²(t)·(2 + cos(t)) / (3 + cos²(t)),
// first studied by Sylvester in 1864. It has a cusp at (0, a) and is symmetric about the y-axis.
export const BICORN_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the bicorn
export const BICORN_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution bicorn)
export const BICORN_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the bicorn
export const BICORN_NOTES_MIN_A = 1; // Minimum 1 scale a (small bicorn)
export const BICORN_NOTES_MAX_A = 8; // Maximum 8 scale a (large bicorn)
export const BICORN_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium bicorn)
export const BICORN_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const BICORN_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const BICORN_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const BICORN_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full sweep from 0)
export const BICORN_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution)
export const BICORN_NOTES_HAT_T_MIN = -Math.PI; // Hat shape lower t bound (the central cocked-hat profile)
export const BICORN_NOTES_HAT_T_MAX = Math.PI; // Hat shape upper t bound
export const BICORN_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const BICORN_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound
export const BICORN_NOTES_TIGHT_T_MIN = -Math.PI / 2; // Tight shape lower t bound (concentrated near apex)
export const BICORN_NOTES_TIGHT_T_MAX = Math.PI / 2; // Tight shape upper t bound
export const BICORN_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2π]: full bicorn (Sylvester 1864 default)
export const BICORN_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2π, 0]: reversed traversal direction
export const BICORN_NOTES_SHAPE_HAT = 'hat'; // t in [-π, +π]: central cocked-hat profile (most distinctive bicorn)
export const BICORN_NOTES_SHAPE_TIGHT = 'tight'; // t in [-π/2, +π/2]: tight concentration near apex
export const BICORN_NOTES_SHAPES = [
    BICORN_NOTES_SHAPE_STANDARD,
    BICORN_NOTES_SHAPE_INVERTED,
    BICORN_NOTES_SHAPE_HAT,
    BICORN_NOTES_SHAPE_TIGHT
];

export const TRISECTRIX_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the trisectrix
export const TRISECTRIX_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution trisectrix)
export const TRISECTRIX_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the trisectrix
export const TRISECTRIX_NOTES_MIN_A = 1; // Minimum 1 scale a (small trisectrix)
export const TRISECTRIX_NOTES_MAX_A = 8; // Maximum 8 scale a (large trisectrix)
export const TRISECTRIX_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium trisectrix, classic Maclaurin 1742)
export const TRISECTRIX_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const TRISECTRIX_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const TRISECTRIX_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const TRISECTRIX_NOTES_DEFAULT_T_MIN = -2; // Standard shape lower t bound (full sweep)
export const TRISECTRIX_NOTES_DEFAULT_T_MAX = 2; // Standard shape upper t bound (full sweep)
export const TRISECTRIX_NOTES_INVERTED_T_MIN = 2; // Inverted shape lower t bound (reverse direction)
export const TRISECTRIX_NOTES_INVERTED_T_MAX = -2; // Inverted shape upper t bound (reverse direction)
export const TRISECTRIX_NOTES_OUTER_T_MIN = -1.7; // Outer shape lower t bound (avoid asymptote)
export const TRISECTRIX_NOTES_OUTER_T_MAX = 1.7; // Outer shape upper t bound (avoid asymptote)
export const TRISECTRIX_NOTES_TIGHT_T_MIN = -0.5; // Tight shape lower t bound (concentrated near node)
export const TRISECTRIX_NOTES_TIGHT_T_MAX = 0.5; // Tight shape upper t bound (concentrated near node)
export const TRISECTRIX_NOTES_SHAPE_STANDARD = 'standard'; // t in [-2.5, +2.5]: full trisectrix (Maclaurin 1742 default, both branches)
export const TRISECTRIX_NOTES_SHAPE_INVERTED = 'inverted'; // t in [+2.5, -2.5]: reversed traversal direction
export const TRISECTRIX_NOTES_SHAPE_OUTER = 'outer'; // t in [-1.5, +1.5]: outer branch only (right of the asymptote, the main loop)
export const TRISECTRIX_NOTES_SHAPE_TIGHT = 'tight'; // t in [-0.5, +0.5]: tight near node at origin (compact profile)
export const TRISECTRIX_NOTES_SHAPES = [
    TRISECTRIX_NOTES_SHAPE_STANDARD,
    TRISECTRIX_NOTES_SHAPE_INVERTED,
    TRISECTRIX_NOTES_SHAPE_OUTER,
    TRISECTRIX_NOTES_SHAPE_TIGHT
];

export const CISSOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the cissoid
export const CISSOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution cissoid)
export const CISSOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the cissoid
export const CISSOID_NOTES_MIN_A = 1; // Minimum 1 scale a (small cissoid loop)
export const CISSOID_NOTES_MAX_A = 8; // Maximum 8 scale a (large cissoid loop, asymptote at x=16)
export const CISSOID_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium cissoid, asymptote at x=8)
export const CISSOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const CISSOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const CISSOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const CISSOID_NOTES_DEFAULT_T_MIN = -1.5; // Standard shape lower t bound (just past the asymptote at ±π/2)
export const CISSOID_NOTES_DEFAULT_T_MAX = 1.5; // Standard shape upper t bound (just past the asymptote at ±π/2)
export const CISSOID_NOTES_INVERTED_T_MIN = 1.5; // Inverted shape lower t bound (reverse direction)
export const CISSOID_NOTES_INVERTED_T_MAX = -1.5; // Inverted shape upper t bound (reverse direction)
export const CISSOID_NOTES_UPPER_T_MIN = 0; // Upper shape lower t bound (right lobe only, t > 0)
export const CISSOID_NOTES_UPPER_T_MAX = 1.5; // Upper shape upper t bound (just past the asymptote)
export const CISSOID_NOTES_TIGHT_T_MIN = -0.7; // Tight shape lower t bound (concentrated near cusp at origin)
export const CISSOID_NOTES_TIGHT_T_MAX = 0.7; // Tight shape upper t bound (concentrated near cusp at origin)
export const CISSOID_NOTES_SHAPE_STANDARD = 'standard'; // t in [-1.5, +1.5]: full cissoid with both branches (Diocles ~180 BC default, both lobes meeting at the cusp)
export const CISSOID_NOTES_SHAPE_INVERTED = 'inverted'; // t in [+1.5, -1.5]: reversed traversal direction
export const CISSOID_NOTES_SHAPE_UPPER = 'upper'; // t in [0, +1.5]: right lobe only (the half to the right of the y-axis, the upward branch)
export const CISSOID_NOTES_SHAPE_TIGHT = 'tight'; // t in [-0.7, +0.7]: tight concentration near cusp at origin (compact central region)
export const CISSOID_NOTES_SHAPES = [
    CISSOID_NOTES_SHAPE_STANDARD,
    CISSOID_NOTES_SHAPE_INVERTED,
    CISSOID_NOTES_SHAPE_UPPER,
    CISSOID_NOTES_SHAPE_TIGHT
];

export const NEPHROID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the nephroid
export const NEPHROID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution nephroid)
export const NEPHROID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the nephroid
export const NEPHROID_NOTES_MIN_A = 1; // Minimum 1 scale a (small nephroid)
export const NEPHROID_NOTES_MAX_A = 8; // Maximum 8 scale a (large nephroid)
export const NEPHROID_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium nephroid, classic de la Hire ~1670)
export const NEPHROID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const NEPHROID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const NEPHROID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const NEPHROID_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const NEPHROID_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution)
export const NEPHROID_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const NEPHROID_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const NEPHROID_NOTES_UPPER_T_MIN = 0; // Upper shape lower t bound (upper lobe, both cusps at top)
export const NEPHROID_NOTES_UPPER_T_MAX = Math.PI; // Upper shape upper t bound (half revolution covering both upper cusps)
export const NEPHROID_NOTES_TIGHT_T_MIN = -Math.PI / 2; // Tight shape lower t bound (concentrated near one cusp)
export const NEPHROID_NOTES_TIGHT_T_MAX = Math.PI / 2; // Tight shape upper t bound (concentrated near opposite cusp)
export const NEPHROID_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2π]: full nephroid (de la Hire ~1670 default, both cusps visible)
export const NEPHROID_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2π, 0]: reversed traversal direction
export const NEPHROID_NOTES_SHAPE_UPPER = 'upper'; // t in [0, π]: upper lobe (the kidney "bowl" with both cusps at top)
export const NEPHROID_NOTES_SHAPE_TIGHT = 'tight'; // t in [-π/2, π/2]: tight concentration crossing through the kidney "valley" between cusps
export const NEPHROID_NOTES_SHAPES = [
    NEPHROID_NOTES_SHAPE_STANDARD,
    NEPHROID_NOTES_SHAPE_INVERTED,
    NEPHROID_NOTES_SHAPE_UPPER,
    NEPHROID_NOTES_SHAPE_TIGHT
];

export const ASTROID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the astroid
export const ASTROID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution astroid)
export const ASTROID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the astroid
export const ASTROID_NOTES_MIN_A = 1; // Minimum 1 scale a (small astroid)
export const ASTROID_NOTES_MAX_A = 8; // Maximum 8 scale a (large astroid)
export const ASTROID_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium astroid, classic Viviani 1692)
export const ASTROID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const ASTROID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const ASTROID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const ASTROID_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const ASTROID_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 4 cusps visited)
export const ASTROID_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const ASTROID_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const ASTROID_NOTES_UPPER_T_MIN = 0; // Upper shape lower t bound (covers upper-right cusp region)
export const ASTROID_NOTES_UPPER_T_MAX = Math.PI / 2; // Upper shape upper t bound (quarter revolution, 1 cusp)
export const ASTROID_NOTES_TIGHT_T_MIN = -Math.PI / 2; // Tight shape lower t bound (concentrated near left cusp)
export const ASTROID_NOTES_TIGHT_T_MAX = Math.PI / 2; // Tight shape upper t bound (concentrated around one cusp)
export const ASTROID_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2π]: full astroid with all 4 cusps (Rømer 1674 default)
export const ASTROID_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2π, 0]: reversed traversal direction
export const ASTROID_NOTES_SHAPE_UPPER = 'upper'; // t in [0, π/2]: quarter revolution, just 1 cusp region (the upper-right cusp)
export const ASTROID_NOTES_SHAPE_TIGHT = 'tight'; // t in [-π/2, π/2]: tight concentration around the right cusp region
export const ASTROID_NOTES_SHAPES = [
    ASTROID_NOTES_SHAPE_STANDARD,
    ASTROID_NOTES_SHAPE_INVERTED,
    ASTROID_NOTES_SHAPE_UPPER,
    ASTROID_NOTES_SHAPE_TIGHT
];

export const DELTOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the deltoid
export const DELTOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution deltoid)
export const DELTOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the deltoid
export const DELTOID_NOTES_MIN_A = 1; // Minimum 1 scale a (small deltoid)
export const DELTOID_NOTES_MAX_A = 8; // Maximum 8 scale a (large deltoid)
export const DELTOID_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium deltoid, classic Euler 1745 / Steiner 1856)
export const DELTOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const DELTOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const DELTOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const DELTOID_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const DELTOID_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 3 cusps visited)
export const DELTOID_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const DELTOID_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const DELTOID_NOTES_UPPER_T_MIN = 0; // Upper shape lower t bound (covers upper cusp region)
export const DELTOID_NOTES_UPPER_T_MAX = 2 * Math.PI / 3; // Upper shape upper t bound (third revolution, 1 cusp region)
export const DELTOID_NOTES_TIGHT_T_MIN = -Math.PI / 3; // Tight shape lower t bound (concentrated around 1 cusp)
export const DELTOID_NOTES_TIGHT_T_MAX = Math.PI / 3; // Tight shape upper t bound (concentrated around 1 cusp)
export const DELTOID_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2π]: full deltoid with all 3 cusps (Euler 1745 default)
export const DELTOID_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2π, 0]: reversed traversal direction
export const DELTOID_NOTES_SHAPE_UPPER = 'upper'; // t in [0, 2π/3]: third revolution, just 1 cusp region
export const DELTOID_NOTES_SHAPE_TIGHT = 'tight'; // t in [-π/3, +π/3]: tight concentration around the right cusp region
export const DELTOID_NOTES_SHAPES = [
    DELTOID_NOTES_SHAPE_STANDARD,
    DELTOID_NOTES_SHAPE_INVERTED,
    DELTOID_NOTES_SHAPE_UPPER,
    DELTOID_NOTES_SHAPE_TIGHT
];

export const PENTOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the pentoid
export const PENTOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution pentoid)
export const PENTOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the pentoid
export const PENTOID_NOTES_MIN_A = 1; // Minimum 1 scale a (small pentoid)
export const PENTOID_NOTES_MAX_A = 8; // Maximum 8 scale a (large pentoid)
export const PENTOID_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium pentoid)
export const PENTOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const PENTOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const PENTOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const PENTOID_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const PENTOID_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 5 cusps visited)
export const PENTOID_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const PENTOID_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const PENTOID_NOTES_PENTAGON_T_MIN = 0; // Pentagon shape lower t bound (fifth revolution, 1 cusp region)
export const PENTOID_NOTES_PENTAGON_T_MAX = 2 * Math.PI / 5; // Pentagon shape upper t bound (fifth revolution)
export const PENTOID_NOTES_TIGHT_T_MIN = -Math.PI / 5; // Tight shape lower t bound (concentrated around 1 cusp)
export const PENTOID_NOTES_TIGHT_T_MAX = Math.PI / 5; // Tight shape upper t bound (concentrated around 1 cusp)
export const PENTOID_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2π]: full pentoid with all 5 cusps
export const PENTOID_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2π, 0]: reversed traversal direction
export const PENTOID_NOTES_SHAPE_PENTAGON = 'pentagon'; // t in [0, 2π/5]: fifth revolution, just 1 cusp region
export const PENTOID_NOTES_SHAPE_TIGHT = 'tight'; // t in [-π/5, +π/5]: tight concentration around the right cusp region
export const PENTOID_NOTES_SHAPES = [
    PENTOID_NOTES_SHAPE_STANDARD,
    PENTOID_NOTES_SHAPE_INVERTED,
    PENTOID_NOTES_SHAPE_PENTAGON,
    PENTOID_NOTES_SHAPE_TIGHT
];

export const HEXACUSPID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the hexacuspid
export const HEXACUSPID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution hexacuspid)
export const HEXACUSPID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the hexacuspid
export const HEXACUSPID_NOTES_MIN_A = 1; // Minimum 1 scale a (small hexacuspid)
export const HEXACUSPID_NOTES_MAX_A = 8; // Maximum 8 scale a (large hexacuspid)
export const HEXACUSPID_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium hexacuspid)
export const HEXACUSPID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const HEXACUSPID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const HEXACUSPID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const HEXACUSPID_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const HEXACUSPID_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 6 cusps visited)
export const HEXACUSPID_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const HEXACUSPID_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const HEXACUSPID_NOTES_HEXAGON_T_MIN = 0; // Hexagon shape lower t bound (sixth revolution, 1 cusp region)
export const HEXACUSPID_NOTES_HEXAGON_T_MAX = 2 * Math.PI / 6; // Hexagon shape upper t bound (sixth revolution, 1 cusp)
export const HEXACUSPID_NOTES_TIGHT_T_MIN = -Math.PI / 6; // Tight shape lower t bound (concentrated around 1 cusp)
export const HEXACUSPID_NOTES_TIGHT_T_MAX = Math.PI / 6; // Tight shape upper t bound (concentrated around 1 cusp)
export const HEXACUSPID_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2π]: full hexacuspid with all 6 cusps (R/r=6 default)
export const HEXACUSPID_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2π, 0]: reversed traversal direction
export const HEXACUSPID_NOTES_SHAPE_HEXAGON = 'hexagon'; // t in [0, 2π/6]: sixth revolution, just 1 cusp region
export const HEXACUSPID_NOTES_SHAPE_TIGHT = 'tight'; // t in [-π/6, +π/6]: tight concentration around the right cusp region
export const HEXACUSPID_NOTES_SHAPES = [
    HEXACUSPID_NOTES_SHAPE_STANDARD,
    HEXACUSPID_NOTES_SHAPE_INVERTED,
    HEXACUSPID_NOTES_SHAPE_HEXAGON,
    HEXACUSPID_NOTES_SHAPE_TIGHT
];

// Heptoid (7-cusped Hypocycloid) Notes - 7-cusped hypocycloid (R/r = 7)
// extending the 1-2-3-4-5-6-7 cusp sequence (cardioid 1, nephroid 2, deltoid 3,
// astroid 4, pentoid 5, hexacuspid 6, heptoid 7). 7-fold D7 dihedral symmetry.
// Parametric: x = a*cos(t) + (a/6)*cos(6t), y = a*sin(t) - (a/6)*sin(6t).
export const HEPTOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the heptoid
export const HEPTOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution heptoid)
export const HEPTOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the heptoid
export const HEPTOID_NOTES_MIN_A = 1; // Minimum 1 scale a (small heptoid)
export const HEPTOID_NOTES_MAX_A = 8; // Maximum 8 scale a (large heptoid)
export const HEPTOID_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium heptoid)
export const HEPTOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const HEPTOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const HEPTOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const HEPTOID_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const HEPTOID_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 7 cusps visited)
export const HEPTOID_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const HEPTOID_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const HEPTOID_NOTES_HEPTAGON_T_MIN = 0; // Heptagon shape lower t bound (seventh revolution, 1 cusp region)
export const HEPTOID_NOTES_HEPTAGON_T_MAX = 2 * Math.PI / 7; // Heptagon shape upper t bound (seventh revolution, 1 cusp)
export const HEPTOID_NOTES_TIGHT_T_MIN = -Math.PI / 7; // Tight shape lower t bound (concentrated around 1 cusp)
export const HEPTOID_NOTES_TIGHT_T_MAX = Math.PI / 7; // Tight shape upper t bound (concentrated around 1 cusp)
export const HEPTOID_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2π]: full heptoid with all 7 cusps (R/r=7 default)
export const HEPTOID_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2π, 0]: reversed traversal direction
export const HEPTOID_NOTES_SHAPE_HEPTAGON = 'heptagon'; // t in [0, 2π/7]: seventh revolution, just 1 cusp region
export const HEPTOID_NOTES_SHAPE_TIGHT = 'tight'; // t in [-π/7, +π/7]: tight concentration around the right cusp region
export const HEPTOID_NOTES_SHAPES = [
    HEPTOID_NOTES_SHAPE_STANDARD,
    HEPTOID_NOTES_SHAPE_INVERTED,
    HEPTOID_NOTES_SHAPE_HEPTAGON,
    HEPTOID_NOTES_SHAPE_TIGHT
];

// Octoid (8-cusped Hypocycloid) Notes - 8-cusped hypocycloid (R/r = 8)
// extending the 1-2-3-4-5-6-7-8 cusp sequence (cardioid 1, nephroid 2, deltoid 3,
// astroid 4, pentoid 5, hexacuspid 6, heptoid 7, octoid 8). 8-fold D8 dihedral symmetry.
// Parametric: x = a*cos(t) + (a/7)*cos(7t), y = a*sin(t) - (a/7)*sin(7t).
export const OCTOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the octoid
export const OCTOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution octoid)
export const OCTOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the octoid
export const OCTOID_NOTES_MIN_A = 1; // Minimum 1 scale a (small octoid)
export const OCTOID_NOTES_MAX_A = 8; // Maximum 8 scale a (large octoid)
export const OCTOID_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium octoid)
export const OCTOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const OCTOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const OCTOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const OCTOID_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const OCTOID_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 8 cusps visited)
export const OCTOID_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const OCTOID_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const OCTOID_NOTES_OCTAGON_T_MIN = 0; // Octagon shape lower t bound (eighth revolution, 1 cusp region)
export const OCTOID_NOTES_OCTAGON_T_MAX = 2 * Math.PI / 8; // Octagon shape upper t bound (eighth revolution, 1 cusp)
export const OCTOID_NOTES_TIGHT_T_MIN = -Math.PI / 8; // Tight shape lower t bound (concentrated around 1 cusp)
export const OCTOID_NOTES_TIGHT_T_MAX = Math.PI / 8; // Tight shape upper t bound (concentrated around 1 cusp)
export const OCTOID_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2π]: full octoid with all 8 cusps (R/r=8 default)
export const OCTOID_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2π, 0]: reversed traversal direction
export const OCTOID_NOTES_SHAPE_OCTAGON = 'octagon'; // t in [0, 2π/8]: eighth revolution, just 1 cusp region
export const OCTOID_NOTES_SHAPE_TIGHT = 'tight'; // t in [-π/8, +π/8]: tight concentration around the right cusp region
export const OCTOID_NOTES_SHAPES = [
    OCTOID_NOTES_SHAPE_STANDARD,
    OCTOID_NOTES_SHAPE_INVERTED,
    OCTOID_NOTES_SHAPE_OCTAGON,
    OCTOID_NOTES_SHAPE_TIGHT
];


// Enneoid (9-cusped Hypocycloid) Notes - 9-cusped hypocycloid (R/r = 9)
// extending the 1-2-3-4-5-6-7-8-9 cusp sequence (cardioid 1, nephroid 2, deltoid 3,
// astroid 4, pentoid 5, hexacuspid 6, heptoid 7, octoid 8, enneoid 9). 9-fold D9 dihedral symmetry.
// Parametric: x = a*cos(t) + (a/8)*cos(8t), y = a*sin(t) - (a/8)*sin(8t).

export const ENNEOID_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the enneoid
export const ENNEOID_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution enneoid)
export const ENNEOID_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the enneoid
export const ENNEOID_NOTES_MIN_A = 1; // Minimum 1 scale a (small enneoid)
export const ENNEOID_NOTES_MAX_A = 8; // Maximum 8 scale a (large enneoid)
export const ENNEOID_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium enneoid)
export const ENNEOID_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const ENNEOID_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const ENNEOID_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const ENNEOID_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const ENNEOID_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 9 cusps visited)
export const ENNEOID_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const ENNEOID_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const ENNEOID_NOTES_NONAGON_T_MIN = 0; // Nonagon shape lower t bound (ninth revolution, 1 cusp region)
export const ENNEOID_NOTES_NONAGON_T_MAX = 2 * Math.PI / 9; // Nonagon shape upper t bound (ninth revolution, 1 cusp)
export const ENNEOID_NOTES_TIGHT_T_MIN = -Math.PI / 9; // Tight shape lower t bound (concentrated around 1 cusp)
export const ENNEOID_NOTES_TIGHT_T_MAX = Math.PI / 9; // Tight shape upper t bound (concentrated around 1 cusp)
export const ENNEOID_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2π]: full enneoid with all 9 cusps (R/r=9 default)
export const ENNEOID_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2π, 0]: reversed traversal direction
export const ENNEOID_NOTES_SHAPE_NONAGON = 'nonagon'; // t in [0, 2π/9]: ninth revolution, just 1 cusp region
export const ENNEOID_NOTES_SHAPE_TIGHT = 'tight'; // t in [-π/9, +π/9]: tight concentration around the right cusp region
export const ENNEOID_NOTES_SHAPES = [
    ENNEOID_NOTES_SHAPE_STANDARD,
    ENNEOID_NOTES_SHAPE_INVERTED,
    ENNEOID_NOTES_SHAPE_NONAGON,
    ENNEOID_NOTES_SHAPE_TIGHT
];




// Decussata (10-cusped Hypocycloid) Notes - 10-cusped hypocycloid (R/r = 10)
// extending the 1-2-3-4-5-6-7-8-9-10 cusp sequence (cardioid 1, nephroid 2, deltoid 3,
// astroid 4, pentoid 5, hexacuspid 6, heptoid 7, octoid 8, enneoid 9, decussata 10).
// 10-fold D10 dihedral symmetry. Parametric: x = a*cos(t) + (a/9)*cos(9t), y = a*sin(t) - (a/9)*sin(9t).
export const DECUSSATA_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the decussata
export const DECUSSATA_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution decussata)
export const DECUSSATA_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the decussata
export const DECUSSATA_NOTES_MIN_A = 1; // Minimum 1 scale a (small decussata)
export const DECUSSATA_NOTES_MAX_A = 8; // Maximum 8 scale a (large decussata)
export const DECUSSATA_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium decussata)
export const DECUSSATA_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const DECUSSATA_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const DECUSSATA_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const DECUSSATA_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const DECUSSATA_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 10 cusps visited)
export const DECUSSATA_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const DECUSSATA_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const DECUSSATA_NOTES_DECAGON_T_MIN = 0; // Decagon shape lower t bound (tenth revolution, 1 cusp region)
export const DECUSSATA_NOTES_DECAGON_T_MAX = 2 * Math.PI / 10; // Decagon shape upper t bound (tenth revolution, 1 cusp)
export const DECUSSATA_NOTES_TIGHT_T_MIN = -Math.PI / 10; // Tight shape lower t bound (concentrated around 1 cusp)
export const DECUSSATA_NOTES_TIGHT_T_MAX = Math.PI / 10; // Tight shape upper t bound (concentrated around 1 cusp)
export const DECUSSATA_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2π]: full decussata with all 10 cusps (R/r=10 default)
export const DECUSSATA_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2π, 0]: reversed traversal direction
export const DECUSSATA_NOTES_SHAPE_DECAGON = 'decagon'; // t in [0, 2π/10]: tenth revolution, just 1 cusp region
export const DECUSSATA_NOTES_SHAPE_TIGHT = 'tight'; // t in [-π/10, +π/10]: tight concentration around the right cusp region

// Day 759: Hendecagon (11-cusped Hypocycloid) Notes constants - the 11-cusped hypocycloid (R/r=11)
// 11-fold D11 dihedral symmetry. Parametric: x = a*cos(t) + (a/10)*cos(10t), y = a*sin(t) - (a/10)*sin(10t).
export const HENDECA_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the hendecagon
export const HENDECA_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution hendecagon)
export const HENDECA_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the hendecagon
export const HENDECA_NOTES_MIN_A = 1; // Minimum 1 scale a (small hendecagon)
export const HENDECA_NOTES_MAX_A = 8; // Maximum 8 scale a (large hendecagon)
export const HENDECA_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium hendecagon, classic R/r=11)
export const HENDECA_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const HENDECA_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const HENDECA_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const HENDECA_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const HENDECA_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 11 cusps visited)
export const HENDECA_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const HENDECA_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const HENDECA_NOTES_HENDECAGON_T_MIN = 0; // Hendecagon shape lower t bound (eleventh revolution, 1 cusp region)
export const HENDECA_NOTES_HENDECAGON_T_MAX = 2 * Math.PI / 11; // Hendecagon shape upper t bound (eleventh revolution, 1 cusp)
export const HENDECA_NOTES_TIGHT_T_MIN = -Math.PI / 11; // Tight shape lower t bound (concentrated around 1 cusp)
export const HENDECA_NOTES_TIGHT_T_MAX = Math.PI / 11; // Tight shape upper t bound (concentrated around 1 cusp)
export const HENDECA_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2π]: full hendecagon with all 11 cusps (R/r=11 default)
export const HENDECA_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2π, 0]: reversed traversal direction
export const HENDECA_NOTES_SHAPE_HENDECAGON = 'hendecagon'; // t in [0, 2π/11]: eleventh revolution, just 1 cusp region
export const HENDECA_NOTES_SHAPE_TIGHT = 'tight'; // t in [-π/11, +π/11]: tight concentration around the right cusp region
export const HENDECA_NOTES_SHAPES = [
    HENDECA_NOTES_SHAPE_STANDARD,
    HENDECA_NOTES_SHAPE_INVERTED,
    HENDECA_NOTES_SHAPE_HENDECAGON,
    HENDECA_NOTES_SHAPE_TIGHT
];

// Day 760: Dodecagon (12-cusped Hypocycloid) Notes constants - 12-fold D12 symmetric hypocycloid (R/r=12)
// The 12-cusped hypocycloid, the natural 12-cusped cousin of the cardioid (1 cusp), nephroid (2 cusps),
// deltoid (3 cusps), astroid (4 cusps), pentoid (5 cusps), hexacuspid (6 cusps), heptoid (7 cusps),
// octoid (8 cusps), enneoid (9 cusps), decussata (10 cusps), and hendecagon (11 cusps), extending the
// 1-2-3-4-5-6-7-8-9-10-11-12 cusp hypocycloid sequence. 12 = 2^2 * 3 is a product of distinct
// Fermat primes (3) times a power of 2, so the regular dodecagon IS constructible by compass and
// straightedge (Gauss-Wantzel 1837), the natural upper limit of the constructible regular polygons
// before the 15-gon (3*5, also constructible) and the 17-gon (a Fermat prime itself, constructible
// via Gauss's 1796 discovery). 12-fold rotational symmetry appears throughout nature: 12 hours on
// a clock, 12 months in a year, 12 chromatic semitones in an octave, 12 zodiac signs, 12 edges of
// a cube, 12 pentagons on a regular dodecahedron, etc. The 12-cusped hypocycloid has D12 dihedral
// symmetry. Parametric: x = a*cos(t) + (a/11)*cos(11t), y = a*sin(t) - (a/11)*sin(11t).
export const DODECAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the dodecagon
export const DODECAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution dodecagon)
export const DODECAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the dodecagon
export const DODECAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small dodecagon)
export const DODECAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large dodecagon)
export const DODECAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium dodecagon, classic R/r=12)
export const DODECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const DODECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const DODECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const DODECAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const DODECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 12 cusps)
export const DODECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const DODECAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const DODECAGON_NOTES_DODECAGON_T_MIN = 0; // Dodecagon shape lower t bound (twelfth revolution, 1 cusp)
export const DODECAGON_NOTES_DODECAGON_T_MAX = 2 * Math.PI / 12; // Dodecagon shape upper t bound (twelfth revolution)
export const DODECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 12; // Tight shape lower t bound (concentrated around 1 cusp)
export const DODECAGON_NOTES_TIGHT_T_MAX = Math.PI / 12; // Tight shape upper t bound (concentrated around 1 cusp)
export const DODECAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2*PI]: full dodecagon with all 12 cusps (R/r=12)
export const DODECAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2*PI, 0]: reversed traversal direction
export const DODECAGON_NOTES_SHAPE_DODECAGON = 'dodecagon'; // t in [0, 2*PI/12]: twelfth revolution, 1 cusp region
export const DODECAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-PI/12, +PI/12]: tight around the right cusp region
export const DODECAGON_NOTES_SHAPES = [
    DODECAGON_NOTES_SHAPE_STANDARD,
    DODECAGON_NOTES_SHAPE_INVERTED,
    DODECAGON_NOTES_SHAPE_DODECAGON,
    DODECAGON_NOTES_SHAPE_TIGHT
];

// Day 761: Tridecagon (13-cusped Hypocycloid) - the 13-cusped hypocycloid extending the
// 1-2-3-4-5-6-7-8-9-10-11-12-13 cusp sequence. Generated by a small circle of radius r = a/12
// rolling INSIDE a fixed circle of radius R = 13a/12 (R/r = 13, 13 cusps per revolution).
// The tridecagon has 13-fold rotational D13 dihedral symmetry. The regular 13-gon is the
// smallest regular polygon that is NOT constructible by compass and straightedge (Gauss-Wantzel
// 1837) — 13 is prime but not a Fermat prime (Fermat primes are 3, 5, 17, 257, 65537).
// Parametric: x = a*cos(t) + (a/12)*cos(12t), y = a*sin(t) - (a/12)*sin(12t).
export const TRIDECAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the tridecagon
export const TRIDECAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution tridecagon)
export const TRIDECAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the tridecagon
export const TRIDECAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small tridecagon)
export const TRIDECAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large tridecagon)
export const TRIDECAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium tridecagon, classic R/r=13)
export const TRIDECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const TRIDECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const TRIDECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const TRIDECAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const TRIDECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 13 cusps)
export const TRIDECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const TRIDECAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const TRIDECAGON_NOTES_TRIDECAGON_T_MIN = 0; // Tridecagon shape lower t bound (thirteenth revolution, 1 cusp)
export const TRIDECAGON_NOTES_TRIDECAGON_T_MAX = 2 * Math.PI / 13; // Tridecagon shape upper t bound (thirteenth revolution)
export const TRIDECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 13; // Tight shape lower t bound (concentrated around 1 cusp)
export const TRIDECAGON_NOTES_TIGHT_T_MAX = Math.PI / 13; // Tight shape upper t bound (concentrated around 1 cusp)
export const TRIDECAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2*PI]: full tridecagon with all 13 cusps (R/r=13)
export const TRIDECAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2*PI, 0]: reversed traversal direction
export const TRIDECAGON_NOTES_SHAPE_TRIDECAGON = 'tridecagon'; // t in [0, 2*PI/13]: thirteenth revolution, 1 cusp region
export const TRIDECAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-PI/13, +PI/13]: tight around the right cusp region
export const TRIDECAGON_NOTES_SHAPES = [
    TRIDECAGON_NOTES_SHAPE_STANDARD,
    TRIDECAGON_NOTES_SHAPE_INVERTED,
    TRIDECAGON_NOTES_SHAPE_TRIDECAGON,
    TRIDECAGON_NOTES_SHAPE_TIGHT
];

// Day 762: Tetradecagon (14-cusped Hypocycloid) Notes constants - 14-fold D14 symmetric hypocycloid (R/r=14)
// The 14-cusped hypocycloid in the 1-2-3-4-5-6-7-8-9-10-11-12-13-14 cusp hypocycloid sequence.
// Generated by a small circle of radius r = a/13 rolling inside a fixed circle of radius R = 14a/13.
// Parametric: x = a*cos(t) + (a/13)*cos(13t), y = a*sin(t) - (a/13)*sin(13t).
// At t=0: x = a + a/13 = 14a/13, y = 0 (the rightmost extreme).
// 14 = 2*7 is NOT a Fermat prime (Fermat primes are 3, 5, 17, 257, 65537), so the regular 14-gon is NOT constructible by compass and straightedge.
export const TETRADECAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the tetradecagon
export const TETRADECAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution tetradecagon)
export const TETRADECAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the tetradecagon
export const TETRADECAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small tetradecagon)
export const TETRADECAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large tetradecagon)
export const TETRADECAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium tetradecagon, classic R/r=14)
export const TETRADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const TETRADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const TETRADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const TETRADECAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const TETRADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 14 cusps)
export const TETRADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const TETRADECAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const TETRADECAGON_NOTES_TETRADECAGON_T_MIN = 0; // Tetradecagon shape lower t bound (fourteenth revolution, 1 cusp)
export const TETRADECAGON_NOTES_TETRADECAGON_T_MAX = 2 * Math.PI / 14; // Tetradecagon shape upper t bound (fourteenth revolution)
export const TETRADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 14; // Tight shape lower t bound (concentrated around 1 cusp)
export const TETRADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 14; // Tight shape upper t bound (concentrated around 1 cusp)
export const TETRADECAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2*PI]: full tetradecagon with all 14 cusps (R/r=14)
export const TETRADECAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2*PI, 0]: reversed traversal direction
export const TETRADECAGON_NOTES_SHAPE_TETRADECAGON = 'tetradecagon'; // t in [0, 2*PI/14]: fourteenth revolution, 1 cusp region
export const TETRADECAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-PI/14, +PI/14]: tight around the right cusp region
export const TETRADECAGON_NOTES_SHAPES = [
    TETRADECAGON_NOTES_SHAPE_STANDARD,
    TETRADECAGON_NOTES_SHAPE_INVERTED,
    TETRADECAGON_NOTES_SHAPE_TETRADECAGON,
    TETRADECAGON_NOTES_SHAPE_TIGHT
];

// Day 763: Pentadecagon (15-cusped Hypocycloid) Notes - 15-fold D15 symmetric hypocycloid (R/r=15)
export const PENTADECAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the pentadecagon
export const PENTADECAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution pentadecagon)
export const PENTADECAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the pentadecagon
export const PENTADECAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small pentadecagon)
export const PENTADECAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large pentadecagon)
export const PENTADECAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium pentadecagon, classic R/r=15)
export const PENTADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const PENTADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const PENTADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const PENTADECAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const PENTADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 15 cusps)
export const PENTADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const PENTADECAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const PENTADECAGON_NOTES_PENTADECAGON_T_MIN = 0; // Pentadecagon shape lower t bound (fifteenth revolution, 1 cusp)
export const PENTADECAGON_NOTES_PENTADECAGON_T_MAX = 2 * Math.PI / 15; // Pentadecagon shape upper t bound (fifteenth revolution)
export const PENTADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 15; // Tight shape lower t bound (concentrated around 1 cusp)
export const PENTADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 15; // Tight shape upper t bound (concentrated around 1 cusp)
export const PENTADECAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2*PI]: full pentadecagon with all 15 cusps (R/r=15)
export const PENTADECAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2*PI, 0]: reversed traversal direction
export const PENTADECAGON_NOTES_SHAPE_PENTADECAGON = 'pentadecagon'; // t in [0, 2*PI/15]: fifteenth revolution, 1 cusp region
export const PENTADECAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-PI/15, +PI/15]: tight around the right cusp region
export const PENTADECAGON_NOTES_SHAPES = [
    PENTADECAGON_NOTES_SHAPE_STANDARD,
    PENTADECAGON_NOTES_SHAPE_INVERTED,
    PENTADECAGON_NOTES_SHAPE_PENTADECAGON,
    PENTADECAGON_NOTES_SHAPE_TIGHT
];

// Day 764: Hexadecagon (16-cusped Hypocycloid) Notes constants - 16-fold D16 symmetric hypocycloid (R/r=16)
// The 16-cusped hypocycloid in the 1-2-3-4-5-6-7-8-9-10-11-12-13-14-15-16 cusp hypocycloid sequence.
// Generated by a small circle of radius r = a/15 rolling inside a fixed circle of radius R = 16a/15.
// Parametric: x = a*cos(t) + (a/15)*cos(15t), y = a*sin(t) - (a/15)*sin(15t).
// At t=0: x = a + a/15 = 16a/15, y = 0 (the rightmost extreme).
// 16 = 2^4 is a power of 2, so the regular 16-gon IS constructible by compass and straightedge (Gauss-Wantzel 1837).
export const HEXADECAGON_NOTES_MIN_LENGTH = 8;
export const HEXADECAGON_NOTES_MAX_LENGTH = 64;
export const HEXADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXADECAGON_NOTES_MIN_A = 1;
export const HEXADECAGON_NOTES_MAX_A = 8;
export const HEXADECAGON_NOTES_DEFAULT_A = 4;
export const HEXADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXADECAGON_NOTES_INVERTED_T_MAX = 0;
export const HEXADECAGON_NOTES_HEXADECAGON_T_MIN = 0;
export const HEXADECAGON_NOTES_HEXADECAGON_T_MAX = 2 * Math.PI / 16;
export const HEXADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 16;
export const HEXADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 16;
export const HEXADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXADECAGON_NOTES_SHAPE_HEXADECAGON = 'hexadecagon';
export const HEXADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXADECAGON_NOTES_SHAPES = [
    HEXADECAGON_NOTES_SHAPE_STANDARD,
    HEXADECAGON_NOTES_SHAPE_INVERTED,
    HEXADECAGON_NOTES_SHAPE_HEXADECAGON,
    HEXADECAGON_NOTES_SHAPE_TIGHT
];

export const HEPTADECAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the heptadecagon
export const HEPTADECAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution heptadecagon)
export const HEPTADECAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the heptadecagon
export const HEPTADECAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small heptadecagon)
export const HEPTADECAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large heptadecagon)
export const HEPTADECAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium heptadecagon, classic R/r=17)
export const HEPTADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const HEPTADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const HEPTADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const HEPTADECAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const HEPTADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 17 cusps)
export const HEPTADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const HEPTADECAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const HEPTADECAGON_NOTES_HEPTADECAGON_T_MIN = 0; // Heptadecagon shape lower t bound (seventeenth revolution, 1 cusp)
export const HEPTADECAGON_NOTES_HEPTADECAGON_T_MAX = 2 * Math.PI / 17; // Heptadecagon shape upper t bound (seventeenth revolution)
export const HEPTADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 17; // Tight shape lower t bound (concentrated around 1 cusp)
export const HEPTADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 17; // Tight shape upper t bound (concentrated around 1 cusp)
export const HEPTADECAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2*PI]: full heptadecagon with all 17 cusps (R/r=17)
export const HEPTADECAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2*PI, 0]: reversed traversal direction
export const HEPTADECAGON_NOTES_SHAPE_HEPTADECAGON = 'heptadecagon'; // t in [0, 2*PI/17]: seventeenth revolution, 1 cusp region
export const HEPTADECAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-PI/17, +PI/17]: tight around the right cusp region
export const HEPTADECAGON_NOTES_SHAPES = [
    HEPTADECAGON_NOTES_SHAPE_STANDARD,
    HEPTADECAGON_NOTES_SHAPE_INVERTED,
    HEPTADECAGON_NOTES_SHAPE_HEPTADECAGON,
    HEPTADECAGON_NOTES_SHAPE_TIGHT
];

// Day 767: Octadecagon (18-cusped Hypocycloid) Notes
export const OCTADECAGON_NOTES_MIN_LENGTH = 8;
export const OCTADECAGON_NOTES_MAX_LENGTH = 64;
export const OCTADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const OCTADECAGON_NOTES_MIN_A = 1;
export const OCTADECAGON_NOTES_MAX_A = 8;
export const OCTADECAGON_NOTES_DEFAULT_A = 4;
export const OCTADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const OCTADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const OCTADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const OCTADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const OCTADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const OCTADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const OCTADECAGON_NOTES_INVERTED_T_MAX = 0;
export const OCTADECAGON_NOTES_OCTADECAGON_T_MIN = 0;
export const OCTADECAGON_NOTES_OCTADECAGON_T_MAX = 2 * Math.PI / 18;
export const OCTADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 18;
export const OCTADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 18;
export const OCTADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const OCTADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const OCTADECAGON_NOTES_SHAPE_OCTADECAGON = 'octadecagon';
export const OCTADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const OCTADECAGON_NOTES_SHAPES = [
    OCTADECAGON_NOTES_SHAPE_STANDARD,
    OCTADECAGON_NOTES_SHAPE_INVERTED,
    OCTADECAGON_NOTES_SHAPE_OCTADECAGON,
    OCTADECAGON_NOTES_SHAPE_TIGHT
];

// Day 768: Enneadecagon (19-cusped Hypocycloid) Notes
export const ENNEADECAGON_NOTES_MIN_LENGTH = 8;
export const ENNEADECAGON_NOTES_MAX_LENGTH = 64;
export const ENNEADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const ENNEADECAGON_NOTES_MIN_A = 1;
export const ENNEADECAGON_NOTES_MAX_A = 8;
export const ENNEADECAGON_NOTES_DEFAULT_A = 4;
export const ENNEADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const ENNEADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const ENNEADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const ENNEADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const ENNEADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const ENNEADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const ENNEADECAGON_NOTES_INVERTED_T_MAX = 0;
export const ENNEADECAGON_NOTES_ENNEADECAGON_T_MIN = 0;
export const ENNEADECAGON_NOTES_ENNEADECAGON_T_MAX = 2 * Math.PI / 19;
export const ENNEADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 19;
export const ENNEADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 19;
export const ENNEADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const ENNEADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const ENNEADECAGON_NOTES_SHAPE_ENNEADECAGON = 'enneadecagon';
export const ENNEADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const ENNEADECAGON_NOTES_SHAPES = [
    ENNEADECAGON_NOTES_SHAPE_STANDARD,
    ENNEADECAGON_NOTES_SHAPE_INVERTED,
    ENNEADECAGON_NOTES_SHAPE_ENNEADECAGON,
    ENNEADECAGON_NOTES_SHAPE_TIGHT
];

// Day 769: Icosagon (20-cusped Hypocycloid) Notes
export const ICOSAGON_NOTES_MIN_LENGTH = 8;
export const ICOSAGON_NOTES_MAX_LENGTH = 64;
export const ICOSAGON_NOTES_DEFAULT_LENGTH = 32;
export const ICOSAGON_NOTES_MIN_A = 1;
export const ICOSAGON_NOTES_MAX_A = 8;
export const ICOSAGON_NOTES_DEFAULT_A = 4;
export const ICOSAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const ICOSAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const ICOSAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const ICOSAGON_NOTES_DEFAULT_T_MIN = 0;
export const ICOSAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const ICOSAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const ICOSAGON_NOTES_INVERTED_T_MAX = 0;
export const ICOSAGON_NOTES_ICOSAGON_T_MIN = 0;
export const ICOSAGON_NOTES_ICOSAGON_T_MAX = 2 * Math.PI / 20;
export const ICOSAGON_NOTES_TIGHT_T_MIN = -Math.PI / 20;
export const ICOSAGON_NOTES_TIGHT_T_MAX = Math.PI / 20;
export const ICOSAGON_NOTES_SHAPE_STANDARD = 'standard';
export const ICOSAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const ICOSAGON_NOTES_SHAPE_ICOSAGON = 'icosagon';
export const ICOSAGON_NOTES_SHAPE_TIGHT = 'tight';
export const ICOSAGON_NOTES_SHAPES = [
    ICOSAGON_NOTES_SHAPE_STANDARD,
    ICOSAGON_NOTES_SHAPE_INVERTED,
    ICOSAGON_NOTES_SHAPE_ICOSAGON,
    ICOSAGON_NOTES_SHAPE_TIGHT
];

// Day 770: Icosikaihenagon (21-cusped Hypocycloid) Notes
// The 21-cusped hypocycloid in the 1-2-3-4-5-6-7-8-9-10-11-12-13-14-15-16-17-18-19-20-21 cusp hypocycloid sequence.
// Generated by a small circle of radius r = a/20 rolling inside a fixed circle of radius R = 21a/20.
// Parametric: x = a*cos(t) + (a/20)*cos(20t), y = a*sin(t) - (a/20)*sin(20t).
// At t = 0: x = a + a/20 = 21a/20, y = 0 (the rightmost extreme).
export const ICOSIKAIHENAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the icosikaihenagon
export const ICOSIKAIHENAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution icosikaihenagon)
export const ICOSIKAIHENAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the icosikaihenagon
export const ICOSIKAIHENAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small icosikaihenagon)
export const ICOSIKAIHENAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large icosikaihenagon)
export const ICOSIKAIHENAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium icosikaihenagon)
export const ICOSIKAIHENAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const ICOSIKAIHENAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const ICOSIKAIHENAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const ICOSIKAIHENAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const ICOSIKAIHENAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 21 cusps visited)
export const ICOSIKAIHENAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const ICOSIKAIHENAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const ICOSIKAIHENAGON_NOTES_ICOSIKAIHENAGON_T_MIN = 0; // Icosikaihenagon shape lower t bound (twenty-first revolution, 1 cusp region)
export const ICOSIKAIHENAGON_NOTES_ICOSIKAIHENAGON_T_MAX = 2 * Math.PI / 21; // Icosikaihenagon shape upper t bound (twenty-first revolution, 1 cusp)
export const ICOSIKAIHENAGON_NOTES_TIGHT_T_MIN = -Math.PI / 21; // Tight shape lower t bound (concentrated around rightmost extreme)
export const ICOSIKAIHENAGON_NOTES_TIGHT_T_MAX = Math.PI / 21; // Tight shape upper t bound (concentrated around rightmost extreme)
export const ICOSIKAIHENAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full icosikaihenagon with all 21 cusps
export const ICOSIKAIHENAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const ICOSIKAIHENAGON_NOTES_SHAPE_ICOSIKAIHENAGON = 'icosikaihenagon'; // t in [0, 2pi/21]: twenty-first revolution, 1 cusp region
export const ICOSIKAIHENAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/21, pi/21]: tight concentration around the rightmost extreme
export const ICOSIKAIHENAGON_NOTES_SHAPES = [
    ICOSIKAIHENAGON_NOTES_SHAPE_STANDARD,
    ICOSIKAIHENAGON_NOTES_SHAPE_INVERTED,
    ICOSIKAIHENAGON_NOTES_SHAPE_ICOSIKAIHENAGON,
    ICOSIKAIHENAGON_NOTES_SHAPE_TIGHT
];

export const ICOSIKAIHEPTAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the icosikaiheptagon
export const ICOSIKAIHEPTAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution icosikaiheptagon)
export const ICOSIKAIHEPTAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the icosikaiheptagon
export const ICOSIKAIHEPTAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small icosikaiheptagon)
export const ICOSIKAIHEPTAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large icosikaiheptagon)
export const ICOSIKAIHEPTAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium icosikaiheptagon)
export const ICOSIKAIHEPTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const ICOSIKAIHEPTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const ICOSIKAIHEPTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const ICOSIKAIHEPTAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const ICOSIKAIHEPTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 22 cusps visited)
export const ICOSIKAIHEPTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const ICOSIKAIHEPTAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const ICOSIKAIHEPTAGON_NOTES_ICOSIKAIHEPTAGON_T_MIN = 0; // Icosikaiheptagon shape lower t bound (twenty-second revolution, 1 cusp region)
export const ICOSIKAIHEPTAGON_NOTES_ICOSIKAIHEPTAGON_T_MAX = 2 * Math.PI / 22; // Icosikaiheptagon shape upper t bound (twenty-second revolution, 1 cusp)
export const ICOSIKAIHEPTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 22; // Tight shape lower t bound (concentrated around rightmost extreme)
export const ICOSIKAIHEPTAGON_NOTES_TIGHT_T_MAX = Math.PI / 22; // Tight shape upper t bound (concentrated around rightmost extreme)
export const ICOSIKAIHEPTAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full icosikaiheptagon with all 22 cusps
export const ICOSIKAIHEPTAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const ICOSIKAIHEPTAGON_NOTES_SHAPE_ICOSIKAIHEPTAGON = 'icosikaiheptagon'; // t in [0, 2pi/22]: twenty-second revolution, 1 cusp region
export const ICOSIKAIHEPTAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/22, pi/22]: tight concentration around the rightmost extreme
export const ICOSIKAIHEPTAGON_NOTES_SHAPES = [
    ICOSIKAIHEPTAGON_NOTES_SHAPE_STANDARD,
    ICOSIKAIHEPTAGON_NOTES_SHAPE_INVERTED,
    ICOSIKAIHEPTAGON_NOTES_SHAPE_ICOSIKAIHEPTAGON,
    ICOSIKAIHEPTAGON_NOTES_SHAPE_TIGHT
];

export const ICOSIKAITETRAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the icosikaitetragon
export const ICOSIKAITETRAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution icosikaitetragon)
export const ICOSIKAITETRAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the icosikaitetragon
export const ICOSIKAITETRAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small icosikaitetragon)
export const ICOSIKAITETRAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large icosikaitetragon)
export const ICOSIKAITETRAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium icosikaitetragon)
export const ICOSIKAITETRAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const ICOSIKAITETRAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const ICOSIKAITETRAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const ICOSIKAITETRAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const ICOSIKAITETRAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 23 cusps visited)
export const ICOSIKAITETRAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const ICOSIKAITETRAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const ICOSIKAITETRAGON_NOTES_ICOSIKAITETRAGON_T_MIN = 0; // Icosikaitetragon shape lower t bound (twenty-third revolution, 1 cusp region)
export const ICOSIKAITETRAGON_NOTES_ICOSIKAITETRAGON_T_MAX = 2 * Math.PI / 23; // Icosikaitetragon shape upper t bound (twenty-third revolution, 1 cusp)
export const ICOSIKAITETRAGON_NOTES_TIGHT_T_MIN = -Math.PI / 23; // Tight shape lower t bound (concentrated around rightmost extreme)
export const ICOSIKAITETRAGON_NOTES_TIGHT_T_MAX = Math.PI / 23; // Tight shape upper t bound (concentrated around rightmost extreme)
export const ICOSIKAITETRAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full icosikaitetragon with all 23 cusps
export const ICOSIKAITETRAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const ICOSIKAITETRAGON_NOTES_SHAPE_ICOSIKAITETRAGON = 'icosikaitetragon'; // t in [0, 2pi/23]: twenty-third revolution, 1 cusp region
export const ICOSIKAITETRAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/23, pi/23]: tight concentration around the rightmost extreme
export const ICOSIKAITETRAGON_NOTES_SHAPES = [
    ICOSIKAITETRAGON_NOTES_SHAPE_STANDARD,
    ICOSIKAITETRAGON_NOTES_SHAPE_INVERTED,
    ICOSIKAITETRAGON_NOTES_SHAPE_ICOSIKAITETRAGON,
    ICOSIKAITETRAGON_NOTES_SHAPE_TIGHT
];



export const TETRACOSAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the tetracosagon
export const TETRACOSAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution tetracosagon)
export const TETRACOSAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the tetracosagon
export const TETRACOSAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small tetracosagon)
export const TETRACOSAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large tetracosagon)
export const TETRACOSAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium tetracosagon)
export const TETRACOSAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const TETRACOSAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const TETRACOSAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const TETRACOSAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const TETRACOSAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 24 cusps visited)
export const TETRACOSAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const TETRACOSAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const TETRACOSAGON_NOTES_TETRACOSAGON_T_MIN = 0; // Tetracosagon shape lower t bound (twenty-fourth revolution, 1 cusp region)
export const TETRACOSAGON_NOTES_TETRACOSAGON_T_MAX = 2 * Math.PI / 24; // Tetracosagon shape upper t bound (twenty-fourth revolution, 1 cusp)
export const TETRACOSAGON_NOTES_TIGHT_T_MIN = -Math.PI / 24; // Tight shape lower t bound (concentrated around rightmost extreme)
export const TETRACOSAGON_NOTES_TIGHT_T_MAX = Math.PI / 24; // Tight shape upper t bound (concentrated around rightmost extreme)
export const TETRACOSAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full tetracosagon with all 24 cusps
export const TETRACOSAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const TETRACOSAGON_NOTES_SHAPE_TETRACOSAGON = 'tetracosagon'; // t in [0, 2pi/24]: twenty-fourth revolution, 1 cusp region
export const TETRACOSAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/24, pi/24]: tight concentration around the rightmost extreme
export const TETRACOSAGON_NOTES_SHAPES = [
    TETRACOSAGON_NOTES_SHAPE_STANDARD,
    TETRACOSAGON_NOTES_SHAPE_INVERTED,
    TETRACOSAGON_NOTES_SHAPE_TETRACOSAGON,
    TETRACOSAGON_NOTES_SHAPE_TIGHT
];

export const PENTACOSAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the pentacosagon
export const PENTACOSAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution pentacosagon)
export const PENTACOSAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the pentacosagon
export const PENTACOSAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small pentacosagon)
export const PENTACOSAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large pentacosagon)
export const PENTACOSAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium pentacosagon)
export const PENTACOSAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const PENTACOSAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const PENTACOSAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const PENTACOSAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const PENTACOSAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 25 cusps visited)
export const PENTACOSAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const PENTACOSAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const PENTACOSAGON_NOTES_PENTACOSAGON_T_MIN = 0; // Pentacosagon shape lower t bound (twenty-fifth revolution, 1 cusp region)
export const PENTACOSAGON_NOTES_PENTACOSAGON_T_MAX = 2 * Math.PI / 25; // Pentacosagon shape upper t bound (twenty-fifth revolution, 1 cusp)
export const PENTACOSAGON_NOTES_TIGHT_T_MIN = -Math.PI / 25; // Tight shape lower t bound (concentrated around rightmost extreme)
export const PENTACOSAGON_NOTES_TIGHT_T_MAX = Math.PI / 25; // Tight shape upper t bound (concentrated around rightmost extreme)
export const PENTACOSAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full pentacosagon with all 25 cusps
export const PENTACOSAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const PENTACOSAGON_NOTES_SHAPE_PENTACOSAGON = 'pentacosagon'; // t in [0, 2pi/25]: twenty-fifth revolution, 1 cusp region
export const PENTACOSAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/25, pi/25]: tight concentration around the rightmost extreme
export const PENTACOSAGON_NOTES_SHAPES = [
    PENTACOSAGON_NOTES_SHAPE_STANDARD,
    PENTACOSAGON_NOTES_SHAPE_INVERTED,
    PENTACOSAGON_NOTES_SHAPE_PENTACOSAGON,
    PENTACOSAGON_NOTES_SHAPE_TIGHT
];


// Day 775: Hexacosagon (26-cusped Hypocycloid) Notes constants
export const HEXACOSAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the hexacosagon
export const HEXACOSAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution hexacosagon)
export const HEXACOSAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the hexacosagon
export const HEXACOSAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small hexacosagon)
export const HEXACOSAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large hexacosagon)
export const HEXACOSAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium hexacosagon)
export const HEXACOSAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const HEXACOSAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const HEXACOSAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const HEXACOSAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const HEXACOSAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 26 cusps visited)
export const HEXACOSAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const HEXACOSAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const HEXACOSAGON_NOTES_HEXACOSAGON_T_MIN = 0; // Hexacosagon shape lower t bound (twenty-sixth revolution, 1 cusp region)
export const HEXACOSAGON_NOTES_HEXACOSAGON_T_MAX = 2 * Math.PI / 26; // Hexacosagon shape upper t bound (twenty-sixth revolution, 1 cusp)
export const HEXACOSAGON_NOTES_TIGHT_T_MIN = -Math.PI / 26; // Tight shape lower t bound (concentrated around rightmost extreme)
export const HEXACOSAGON_NOTES_TIGHT_T_MAX = Math.PI / 26; // Tight shape upper t bound (concentrated around rightmost extreme)
export const HEXACOSAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full hexacosagon with all 26 cusps
export const HEXACOSAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const HEXACOSAGON_NOTES_SHAPE_HEXACOSAGON = 'hexacosagon'; // t in [0, 2pi/26]: twenty-sixth revolution, 1 cusp region
export const HEXACOSAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/26, pi/26]: tight concentration around the rightmost extreme
export const HEXACOSAGON_NOTES_SHAPES = [
    HEXACOSAGON_NOTES_SHAPE_STANDARD,
    HEXACOSAGON_NOTES_SHAPE_INVERTED,
    HEXACOSAGON_NOTES_SHAPE_HEXACOSAGON,
    HEXACOSAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACOSAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the heptacosagon
export const HEPTACOSAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution heptacosagon)
export const HEPTACOSAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the heptacosagon
export const HEPTACOSAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small heptacosagon)
export const HEPTACOSAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large heptacosagon)
export const HEPTACOSAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium heptacosagon)
export const HEPTACOSAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const HEPTACOSAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const HEPTACOSAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const HEPTACOSAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const HEPTACOSAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 27 cusps visited)
export const HEPTACOSAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const HEPTACOSAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const HEPTACOSAGON_NOTES_HEPTACOSAGON_T_MIN = 0; // Heptacosagon shape lower t bound (twenty-seventh revolution, 1 cusp region)
export const HEPTACOSAGON_NOTES_HEPTACOSAGON_T_MAX = 2 * Math.PI / 27; // Heptacosagon shape upper t bound (twenty-seventh revolution, 1 cusp)
export const HEPTACOSAGON_NOTES_TIGHT_T_MIN = -Math.PI / 27; // Tight shape lower t bound (concentrated around rightmost extreme)
export const HEPTACOSAGON_NOTES_TIGHT_T_MAX = Math.PI / 27; // Tight shape upper t bound (concentrated around rightmost extreme)
export const HEPTACOSAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full heptacosagon with all 27 cusps
export const HEPTACOSAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const HEPTACOSAGON_NOTES_SHAPE_HEPTACOSAGON = 'heptacosagon'; // t in [0, 2pi/27]: twenty-seventh revolution, 1 cusp region
export const HEPTACOSAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/27, pi/27]: tight concentration around the rightmost extreme
export const HEPTACOSAGON_NOTES_SHAPES = [
    HEPTACOSAGON_NOTES_SHAPE_STANDARD,
    HEPTACOSAGON_NOTES_SHAPE_INVERTED,
    HEPTACOSAGON_NOTES_SHAPE_HEPTACOSAGON,
    HEPTACOSAGON_NOTES_SHAPE_TIGHT
];

// Day 778: Octacosagon (28-cusped Hypocycloid) Notes
// 28-cusped hypocycloid generated by a small circle of radius r = a/27 rolling
// inside a fixed circle of radius R = 28a/27 (R/r = 28, 28 cusps per revolution).
// Parametric: x(t) = a*cos(t) + (a/27)*cos(27t); y(t) = a*sin(t) - (a/27)*sin(27t).
// 28 = 2^2 * 7 is NOT constructible by compass and straightedge (Gauss-Wantzel
// 1837: 7 is prime but NOT a Fermat prime, so 28 fails the distinctness criterion).
// 28 is the 2nd PERFECT number (1+2+4+7+14 = 28), one of only five perfect numbers
// below 10^8. 28-fold rotational symmetry is forbidden in classical crystallography
// (Bravais 1850 only allows 1, 2, 3, 4, 6-fold rotations) but appears in 28-fold
// quasicrystal approximants.
export const OCTACOSAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the octacosagon
export const OCTACOSAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution octacosagon)
export const OCTACOSAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the octacosagon
export const OCTACOSAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small octacosagon)
export const OCTACOSAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large octacosagon)
export const OCTACOSAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium octacosagon)
export const OCTACOSAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const OCTACOSAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const OCTACOSAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const OCTACOSAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const OCTACOSAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 28 cusps visited)
export const OCTACOSAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const OCTACOSAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const OCTACOSAGON_NOTES_OCTACOSAGON_T_MIN = 0; // Octacosagon shape lower t bound (twenty-eighth revolution, 1 cusp region)
export const OCTACOSAGON_NOTES_OCTACOSAGON_T_MAX = 2 * Math.PI / 28; // Octacosagon shape upper t bound (twenty-eighth revolution, 1 cusp)
export const OCTACOSAGON_NOTES_TIGHT_T_MIN = -Math.PI / 28; // Tight shape lower t bound (concentrated around rightmost extreme)
export const OCTACOSAGON_NOTES_TIGHT_T_MAX = Math.PI / 28; // Tight shape upper t bound (concentrated around rightmost extreme)
export const OCTACOSAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full octacosagon with all 28 cusps
export const OCTACOSAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const OCTACOSAGON_NOTES_SHAPE_OCTACOSAGON = 'octacosagon'; // t in [0, 2pi/28]: twenty-eighth revolution, 1 cusp region
export const OCTACOSAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/28, pi/28]: tight concentration around the rightmost extreme
export const OCTACOSAGON_NOTES_SHAPES = [
    OCTACOSAGON_NOTES_SHAPE_STANDARD,
    OCTACOSAGON_NOTES_SHAPE_INVERTED,
    OCTACOSAGON_NOTES_SHAPE_OCTACOSAGON,
    OCTACOSAGON_NOTES_SHAPE_TIGHT
];

// Day 779: Enneacosagon (29-cusped Hypocycloid) Notes constants
export const ENNEACOSAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the enneacosagon
export const ENNEACOSAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution enneacosagon)
export const ENNEACOSAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the enneacosagon
export const ENNEACOSAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small enneacosagon)
export const ENNEACOSAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large enneacosagon)
export const ENNEACOSAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium enneacosagon)
export const ENNEACOSAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const ENNEACOSAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const ENNEACOSAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const ENNEACOSAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const ENNEACOSAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 29 cusps visited)
export const ENNEACOSAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const ENNEACOSAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const ENNEACOSAGON_NOTES_ENNEACOSAGON_T_MIN = 0; // Enneacosagon shape lower t bound (twenty-ninth revolution, 1 cusp region)
export const ENNEACOSAGON_NOTES_ENNEACOSAGON_T_MAX = 2 * Math.PI / 29; // Enneacosagon shape upper t bound (twenty-ninth revolution, 1 cusp)
export const ENNEACOSAGON_NOTES_TIGHT_T_MIN = -Math.PI / 29; // Tight shape lower t bound (concentrated around rightmost extreme)
export const ENNEACOSAGON_NOTES_TIGHT_T_MAX = Math.PI / 29; // Tight shape upper t bound (concentrated around rightmost extreme)
export const ENNEACOSAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full enneacosagon with all 29 cusps
export const ENNEACOSAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const ENNEACOSAGON_NOTES_SHAPE_ENNEACOSAGON = 'enneacosagon'; // t in [0, 2pi/29]: twenty-ninth revolution, 1 cusp region
export const ENNEACOSAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/29, pi/29]: tight concentration around the rightmost extreme
export const ENNEACOSAGON_NOTES_SHAPES = [
    ENNEACOSAGON_NOTES_SHAPE_STANDARD,
    ENNEACOSAGON_NOTES_SHAPE_INVERTED,
    ENNEACOSAGON_NOTES_SHAPE_ENNEACOSAGON,
    ENNEACOSAGON_NOTES_SHAPE_TIGHT
];

// Day 781: Triacontagon (30-cusped Hypocycloid) Notes constants
export const TRIACONTAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the triacontagon
export const TRIACONTAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution triacontagon)
export const TRIACONTAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the triacontagon
export const TRIACONTAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small triacontagon)
export const TRIACONTAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large triacontagon)
export const TRIACONTAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium triacontagon)
export const TRIACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const TRIACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const TRIACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const TRIACONTAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const TRIACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 30 cusps visited)
export const TRIACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const TRIACONTAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const TRIACONTAGON_NOTES_TRIACONTAGON_T_MIN = 0; // Triacontagon shape lower t bound (thirtieth revolution, 1 cusp region)
export const TRIACONTAGON_NOTES_TRIACONTAGON_T_MAX = 2 * Math.PI / 30; // Triacontagon shape upper t bound (thirtieth revolution, 1 cusp)
export const TRIACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 30; // Tight shape lower t bound (concentrated around rightmost extreme)
export const TRIACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 30; // Tight shape upper t bound (concentrated around rightmost extreme)
export const TRIACONTAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full triacontagon with all 30 cusps
export const TRIACONTAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const TRIACONTAGON_NOTES_SHAPE_TRIACONTAGON = 'triacontagon'; // t in [0, 2pi/30]: thirtieth revolution, 1 cusp region
export const TRIACONTAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/30, pi/30]: tight concentration around the rightmost extreme
export const TRIACONTAGON_NOTES_SHAPES = [
    TRIACONTAGON_NOTES_SHAPE_STANDARD,
    TRIACONTAGON_NOTES_SHAPE_INVERTED,
    TRIACONTAGON_NOTES_SHAPE_TRIACONTAGON,
    TRIACONTAGON_NOTES_SHAPE_TIGHT
];

// Hentriacontagon Notes Constants (31-cusped hypocycloid: x = a*cos(t) + (a/30)*cos(30t), y = a*sin(t) - (a/30)*sin(30t))
export const HENTRIACONTAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the hentriacontagon
export const HENTRIACONTAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution hentriacontagon)
export const HENTRIACONTAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the hentriacontagon
export const HENTRIACONTAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small hentriacontagon)
export const HENTRIACONTAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large hentriacontagon)
export const HENTRIACONTAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium hentriacontagon)
export const HENTRIACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const HENTRIACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const HENTRIACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const HENTRIACONTAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const HENTRIACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 31 cusps visited)
export const HENTRIACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const HENTRIACONTAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const HENTRIACONTAGON_NOTES_HENTRIACONTAGON_T_MIN = 0; // Hentriacontagon shape lower t bound
export const HENTRIACONTAGON_NOTES_HENTRIACONTAGON_T_MAX = 2 * Math.PI / 31; // Hentriacontagon shape upper t bound (thirty-first revolution, 1 cusp region)
export const HENTRIACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 31; // Tight shape lower t bound (concentrated around rightmost extreme)
export const HENTRIACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 31; // Tight shape upper t bound (concentrated around rightmost extreme)
export const HENTRIACONTAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full hentriacontagon with all 31 cusps
export const HENTRIACONTAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const HENTRIACONTAGON_NOTES_SHAPE_HENTRIACONTAGON = 'hentriacontagon'; // t in [0, 2pi/31]: thirty-first revolution, 1 cusp region
export const HENTRIACONTAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/31, pi/31]: tight concentration around the rightmost extreme
export const HENTRIACONTAGON_NOTES_SHAPES = [
    HENTRIACONTAGON_NOTES_SHAPE_STANDARD,
    HENTRIACONTAGON_NOTES_SHAPE_INVERTED,
    HENTRIACONTAGON_NOTES_SHAPE_HENTRIACONTAGON,
    HENTRIACONTAGON_NOTES_SHAPE_TIGHT
];

// Dotriacontagon Notes Constants (32-cusped hypocycloid: x = a*cos(t) + (a/31)*cos(31t), y = a*sin(t) - (a/31)*sin(31t))
export const DOTRIACONTAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the dotriacontagon
export const DOTRIACONTAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution dotriacontagon)
export const DOTRIACONTAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the dotriacontagon
export const DOTRIACONTAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small dotriacontagon)
export const DOTRIACONTAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large dotriacontagon)
export const DOTRIACONTAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium dotriacontagon)
export const DOTRIACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const DOTRIACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const DOTRIACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const DOTRIACONTAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const DOTRIACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 32 cusps visited)
export const DOTRIACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const DOTRIACONTAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const DOTRIACONTAGON_NOTES_DOTRIACONTAGON_T_MIN = 0; // Dotriacontagon shape lower t bound
export const DOTRIACONTAGON_NOTES_DOTRIACONTAGON_T_MAX = 2 * Math.PI / 32; // Dotriacontagon shape upper t bound (thirty-second revolution, 1 cusp region)
export const DOTRIACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 32; // Tight shape lower t bound (concentrated around rightmost extreme)
export const DOTRIACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 32; // Tight shape upper t bound (concentrated around rightmost extreme)
export const DOTRIACONTAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full dotriacontagon with all 32 cusps
export const DOTRIACONTAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const DOTRIACONTAGON_NOTES_SHAPE_DOTRIACONTAGON = 'dotriacontagon'; // t in [0, 2pi/32]: thirty-second revolution, 1 cusp region
export const DOTRIACONTAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/32, pi/32]: tight concentration around the rightmost extreme
export const DOTRIACONTAGON_NOTES_SHAPES = [
    DOTRIACONTAGON_NOTES_SHAPE_STANDARD,
    DOTRIACONTAGON_NOTES_SHAPE_INVERTED,
    DOTRIACONTAGON_NOTES_SHAPE_DOTRIACONTAGON,
    DOTRIACONTAGON_NOTES_SHAPE_TIGHT
];
export const TRITRIACONTAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the tritriacontagon
export const TRITRIACONTAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution tritriacontagon)
export const TRITRIACONTAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the tritriacontagon
export const TRITRIACONTAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small tritriacontagon)
export const TRITRIACONTAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large tritriacontagon)
export const TRITRIACONTAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium tritriacontagon)
export const TRITRIACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const TRITRIACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const TRITRIACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const TRITRIACONTAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const TRITRIACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 33 cusps visited)
export const TRITRIACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const TRITRIACONTAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const TRITRIACONTAGON_NOTES_TRITRIACONTAGON_T_MIN = 0; // Tritriacontagon shape lower t bound
export const TRITRIACONTAGON_NOTES_TRITRIACONTAGON_T_MAX = 2 * Math.PI / 33; // Tritriacontagon shape upper t bound (thirty-third revolution, 1 cusp region)
export const TRITRIACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 33; // Tight shape lower t bound (concentrated around rightmost extreme)
export const TRITRIACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 33; // Tight shape upper t bound (concentrated around rightmost extreme)
export const TRITRIACONTAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full tritriacontagon with all 33 cusps
export const TRITRIACONTAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const TRITRIACONTAGON_NOTES_SHAPE_TRITRIACONTAGON = 'tritriacontagon'; // t in [0, 2pi/33]: thirty-third revolution, 1 cusp region
export const TRITRIACONTAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/33, pi/33]: tight concentration around the rightmost extreme
export const TRITRIACONTAGON_NOTES_SHAPES = [
    TRITRIACONTAGON_NOTES_SHAPE_STANDARD,
    TRITRIACONTAGON_NOTES_SHAPE_INVERTED,
    TRITRIACONTAGON_NOTES_SHAPE_TRITRIACONTAGON,
    TRITRIACONTAGON_NOTES_SHAPE_TIGHT
];
export const TETARTOTRIACONTAGON_NOTES_MIN_LENGTH = 8; // Minimum 8 samples around the tetartotriacontagon
export const TETARTOTRIACONTAGON_NOTES_MAX_LENGTH = 64; // Maximum 64 samples (high-resolution tetartotriacontagon)
export const TETARTOTRIACONTAGON_NOTES_DEFAULT_LENGTH = 32; // Default 32 samples around the tetartotriacontagon
export const TETARTOTRIACONTAGON_NOTES_MIN_A = 1; // Minimum 1 scale a (small tetartotriacontagon)
export const TETARTOTRIACONTAGON_NOTES_MAX_A = 8; // Maximum 8 scale a (large tetartotriacontagon)
export const TETARTOTRIACONTAGON_NOTES_DEFAULT_A = 4; // Default 4 scale a (medium tetartotriacontagon)
export const TETARTOTRIACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1; // Minimum 10% velocity preservation at last sample
export const TETARTOTRIACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0; // Maximum 1.0 (no decay)
export const TETARTOTRIACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95; // Default 95% velocity preservation per sample
export const TETARTOTRIACONTAGON_NOTES_DEFAULT_T_MIN = 0; // Standard shape lower t bound (full revolution from 0)
export const TETARTOTRIACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI; // Standard shape upper t bound (full revolution, 34 cusps visited)
export const TETARTOTRIACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI; // Inverted shape lower t bound (reverse direction)
export const TETARTOTRIACONTAGON_NOTES_INVERTED_T_MAX = 0; // Inverted shape upper t bound (reverse direction)
export const TETARTOTRIACONTAGON_NOTES_TETARTOTRIACONTAGON_T_MIN = 0; // Tetartotriacontagon shape lower t bound
export const TETARTOTRIACONTAGON_NOTES_TETARTOTRIACONTAGON_T_MAX = 2 * Math.PI / 34; // Tetartotriacontagon shape upper t bound (thirty-fourth revolution, 1 cusp region)
export const TETARTOTRIACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 34; // Tight shape lower t bound (concentrated around rightmost extreme)
export const TETARTOTRIACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 34; // Tight shape upper t bound (concentrated around rightmost extreme)
export const TETARTOTRIACONTAGON_NOTES_SHAPE_STANDARD = 'standard'; // t in [0, 2pi]: full tetartotriacontagon with all 34 cusps
export const TETARTOTRIACONTAGON_NOTES_SHAPE_INVERTED = 'inverted'; // t in [2pi, 0]: reversed traversal direction
export const TETARTOTRIACONTAGON_NOTES_SHAPE_TETARTOTRIACONTAGON = 'tetartotriacontagon'; // t in [0, 2pi/34]: thirty-fourth revolution, 1 cusp region
export const TETARTOTRIACONTAGON_NOTES_SHAPE_TIGHT = 'tight'; // t in [-pi/34, pi/34]: tight concentration around the rightmost extreme
export const TETARTOTRIACONTAGON_NOTES_SHAPES = [
    TETARTOTRIACONTAGON_NOTES_SHAPE_STANDARD,
    TETARTOTRIACONTAGON_NOTES_SHAPE_INVERTED,
    TETARTOTRIACONTAGON_NOTES_SHAPE_TETARTOTRIACONTAGON,
    TETARTOTRIACONTAGON_NOTES_SHAPE_TIGHT
];



export const PENTATRIACONTAGON_NOTES_MIN_LENGTH = 8;
export const PENTATRIACONTAGON_NOTES_MAX_LENGTH = 64;
export const PENTATRIACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const PENTATRIACONTAGON_NOTES_MIN_A = 1;
export const PENTATRIACONTAGON_NOTES_MAX_A = 8;
export const PENTATRIACONTAGON_NOTES_DEFAULT_A = 4;
export const PENTATRIACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const PENTATRIACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const PENTATRIACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const PENTATRIACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const PENTATRIACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const PENTATRIACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const PENTATRIACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const PENTATRIACONTAGON_NOTES_PENTATRIACONTAGON_T_MIN = 0;
export const PENTATRIACONTAGON_NOTES_PENTATRIACONTAGON_T_MAX = 2 * Math.PI / 35;
export const PENTATRIACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 35;
export const PENTATRIACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 35;
export const PENTATRIACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const PENTATRIACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const PENTATRIACONTAGON_NOTES_SHAPE_PENTATRIACONTAGON = 'pentatriacontagon';
export const PENTATRIACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const PENTATRIACONTAGON_NOTES_SHAPES = [
    PENTATRIACONTAGON_NOTES_SHAPE_STANDARD,
    PENTATRIACONTAGON_NOTES_SHAPE_INVERTED,
    PENTATRIACONTAGON_NOTES_SHAPE_PENTATRIACONTAGON,
    PENTATRIACONTAGON_NOTES_SHAPE_TIGHT
];


export const HEXATRIACONTAGON_NOTES_MIN_LENGTH = 8;
export const HEXATRIACONTAGON_NOTES_MAX_LENGTH = 64;
export const HEXATRIACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXATRIACONTAGON_NOTES_MIN_A = 1;
export const HEXATRIACONTAGON_NOTES_MAX_A = 8;
export const HEXATRIACONTAGON_NOTES_DEFAULT_A = 4;
export const HEXATRIACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXATRIACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXATRIACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXATRIACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXATRIACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXATRIACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXATRIACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const HEXATRIACONTAGON_NOTES_HEXATRIACONTAGON_T_MIN = 0;
export const HEXATRIACONTAGON_NOTES_HEXATRIACONTAGON_T_MAX = 2 * Math.PI / 36;
export const HEXATRIACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 36;
export const HEXATRIACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 36;
export const HEXATRIACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXATRIACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXATRIACONTAGON_NOTES_SHAPE_HEXATRIACONTAGON = 'hexatriacontagon';
export const HEXATRIACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXATRIACONTAGON_NOTES_SHAPES = [
    HEXATRIACONTAGON_NOTES_SHAPE_STANDARD,
    HEXATRIACONTAGON_NOTES_SHAPE_INVERTED,
    HEXATRIACONTAGON_NOTES_SHAPE_HEXATRIACONTAGON,
    HEXATRIACONTAGON_NOTES_SHAPE_TIGHT
];

export const HEPTATRIACONTAGON_NOTES_MIN_LENGTH = 8;
export const HEPTATRIACONTAGON_NOTES_MAX_LENGTH = 64;
export const HEPTATRIACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTATRIACONTAGON_NOTES_MIN_A = 1;
export const HEPTATRIACONTAGON_NOTES_MAX_A = 8;
export const HEPTATRIACONTAGON_NOTES_DEFAULT_A = 4;
export const HEPTATRIACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTATRIACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTATRIACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTATRIACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTATRIACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTATRIACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTATRIACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTATRIACONTAGON_NOTES_HEPTATRIACONTAGON_T_MIN = 0;
export const HEPTATRIACONTAGON_NOTES_HEPTATRIACONTAGON_T_MAX = 2 * Math.PI / 37;
export const HEPTATRIACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 37;
export const HEPTATRIACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 37;
export const HEPTATRIACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTATRIACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTATRIACONTAGON_NOTES_SHAPE_HEPTATRIACONTAGON = 'heptatriacontagon';
export const HEPTATRIACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTATRIACONTAGON_NOTES_SHAPES = [
    HEPTATRIACONTAGON_NOTES_SHAPE_STANDARD,
    HEPTATRIACONTAGON_NOTES_SHAPE_INVERTED,
    HEPTATRIACONTAGON_NOTES_SHAPE_HEPTATRIACONTAGON,
    HEPTATRIACONTAGON_NOTES_SHAPE_TIGHT
];

export const OCTATRIACONTAGON_NOTES_MIN_LENGTH = 8;
export const OCTATRIACONTAGON_NOTES_MAX_LENGTH = 64;
export const OCTATRIACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const OCTATRIACONTAGON_NOTES_MIN_A = 1;
export const OCTATRIACONTAGON_NOTES_MAX_A = 8;
export const OCTATRIACONTAGON_NOTES_DEFAULT_A = 4;
export const OCTATRIACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const OCTATRIACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const OCTATRIACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const OCTATRIACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const OCTATRIACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const OCTATRIACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const OCTATRIACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const OCTATRIACONTAGON_NOTES_OCTATRIACONTAGON_T_MIN = 0;
export const OCTATRIACONTAGON_NOTES_OCTATRIACONTAGON_T_MAX = 2 * Math.PI / 38;
export const OCTATRIACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 38;
export const OCTATRIACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 38;
export const OCTATRIACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const OCTATRIACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const OCTATRIACONTAGON_NOTES_SHAPE_OCTATRIACONTAGON = 'octatriacontagon';
export const OCTATRIACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const OCTATRIACONTAGON_NOTES_SHAPES = [
    OCTATRIACONTAGON_NOTES_SHAPE_STANDARD,
    OCTATRIACONTAGON_NOTES_SHAPE_INVERTED,
    OCTATRIACONTAGON_NOTES_SHAPE_OCTATRIACONTAGON,
    OCTATRIACONTAGON_NOTES_SHAPE_TIGHT
];


export const ENNEATRIACONTAGON_NOTES_MIN_LENGTH = 8;
export const ENNEATRIACONTAGON_NOTES_MAX_LENGTH = 64;
export const ENNEATRIACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const ENNEATRIACONTAGON_NOTES_MIN_A = 1;
export const ENNEATRIACONTAGON_NOTES_MAX_A = 8;
export const ENNEATRIACONTAGON_NOTES_DEFAULT_A = 4;
export const ENNEATRIACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const ENNEATRIACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const ENNEATRIACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const ENNEATRIACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const ENNEATRIACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const ENNEATRIACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const ENNEATRIACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const ENNEATRIACONTAGON_NOTES_ENNEATRIACONTAGON_T_MIN = 0;
export const ENNEATRIACONTAGON_NOTES_ENNEATRIACONTAGON_T_MAX = 2 * Math.PI / 39;
export const ENNEATRIACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 39;
export const ENNEATRIACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 39;
export const ENNEATRIACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const ENNEATRIACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const ENNEATRIACONTAGON_NOTES_SHAPE_ENNEATRIACONTAGON = 'enneatriacontagon';
export const ENNEATRIACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const ENNEATRIACONTAGON_NOTES_SHAPES = [
    ENNEATRIACONTAGON_NOTES_SHAPE_STANDARD,
    ENNEATRIACONTAGON_NOTES_SHAPE_INVERTED,
    ENNEATRIACONTAGON_NOTES_SHAPE_ENNEATRIACONTAGON,
    ENNEATRIACONTAGON_NOTES_SHAPE_TIGHT
];

export const TETRACONTAGON_NOTES_MIN_LENGTH = 8;
export const TETRACONTAGON_NOTES_MAX_LENGTH = 64;
export const TETRACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const TETRACONTAGON_NOTES_MIN_A = 1;
export const TETRACONTAGON_NOTES_MAX_A = 8;
export const TETRACONTAGON_NOTES_DEFAULT_A = 4;
export const TETRACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const TETRACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const TETRACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const TETRACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const TETRACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const TETRACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const TETRACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const TETRACONTAGON_NOTES_TETRACONTAGON_T_MIN = 0;
export const TETRACONTAGON_NOTES_TETRACONTAGON_T_MAX = 2 * Math.PI / 40;
export const TETRACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 40;
export const TETRACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 40;
export const TETRACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const TETRACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const TETRACONTAGON_NOTES_SHAPE_TETRACONTAGON = 'tetracontagon';
export const TETRACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const TETRACONTAGON_NOTES_SHAPES = [
    TETRACONTAGON_NOTES_SHAPE_STANDARD,
    TETRACONTAGON_NOTES_SHAPE_INVERTED,
    TETRACONTAGON_NOTES_SHAPE_TETRACONTAGON,
    TETRACONTAGON_NOTES_SHAPE_TIGHT
];

// Day 792: Hepatetracontagon (41-cusped Hypocycloid) Notes
export const HEPATETRACONTAGON_NOTES_MIN_LENGTH = 8;
export const HEPATETRACONTAGON_NOTES_MAX_LENGTH = 64;
export const HEPATETRACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPATETRACONTAGON_NOTES_MIN_A = 1;
export const HEPATETRACONTAGON_NOTES_MAX_A = 8;
export const HEPATETRACONTAGON_NOTES_DEFAULT_A = 4;
export const HEPATETRACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPATETRACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPATETRACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPATETRACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPATETRACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPATETRACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPATETRACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPATETRACONTAGON_NOTES_HEPATETRACONTAGON_T_MIN = 0;
export const HEPATETRACONTAGON_NOTES_HEPATETRACONTAGON_T_MAX = 2 * Math.PI / 41;
export const HEPATETRACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 41;
export const HEPATETRACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 41;
export const HEPATETRACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPATETRACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPATETRACONTAGON_NOTES_SHAPE_HEPATETRACONTAGON = 'hepatetracontagon';
export const HEPATETRACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPATETRACONTAGON_NOTES_SHAPES = [
    HEPATETRACONTAGON_NOTES_SHAPE_STANDARD,
    HEPATETRACONTAGON_NOTES_SHAPE_INVERTED,
    HEPATETRACONTAGON_NOTES_SHAPE_HEPATETRACONTAGON,
    HEPATETRACONTAGON_NOTES_SHAPE_TIGHT
];

// Day 793: Ditetracontagon (42-cusped Hypocycloid) Notes
export const DITETRACONTAGON_NOTES_MIN_LENGTH = 8;
export const DITETRACONTAGON_NOTES_MAX_LENGTH = 64;
export const DITETRACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const DITETRACONTAGON_NOTES_MIN_A = 1;
export const DITETRACONTAGON_NOTES_MAX_A = 8;
export const DITETRACONTAGON_NOTES_DEFAULT_A = 4;
export const DITETRACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const DITETRACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const DITETRACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const DITETRACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const DITETRACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const DITETRACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const DITETRACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const DITETRACONTAGON_NOTES_DITETRACONTAGON_T_MIN = 0;
export const DITETRACONTAGON_NOTES_DITETRACONTAGON_T_MAX = 2 * Math.PI / 42;
export const DITETRACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 42;
export const DITETRACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 42;
export const DITETRACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const DITETRACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const DITETRACONTAGON_NOTES_SHAPE_DITETRACONTAGON = 'ditetracontagon';
export const DITETRACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const DITETRACONTAGON_NOTES_SHAPES = [
    DITETRACONTAGON_NOTES_SHAPE_STANDARD,
    DITETRACONTAGON_NOTES_SHAPE_INVERTED,
    DITETRACONTAGON_NOTES_SHAPE_DITETRACONTAGON,
    DITETRACONTAGON_NOTES_SHAPE_TIGHT
];

// Day 794: Tritetracontagon (43-cusped Hypocycloid) Notes
export const TRITETRACONTAGON_NOTES_MIN_LENGTH = 8;
export const TRITETRACONTAGON_NOTES_MAX_LENGTH = 64;
export const TRITETRACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const TRITETRACONTAGON_NOTES_MIN_A = 1;
export const TRITETRACONTAGON_NOTES_MAX_A = 8;
export const TRITETRACONTAGON_NOTES_DEFAULT_A = 4;
export const TRITETRACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const TRITETRACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const TRITETRACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const TRITETRACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const TRITETRACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const TRITETRACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const TRITETRACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const TRITETRACONTAGON_NOTES_TRITETRACONTAGON_T_MIN = 0;
export const TRITETRACONTAGON_NOTES_TRITETRACONTAGON_T_MAX = 2 * Math.PI / 43;
export const TRITETRACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 43;
export const TRITETRACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 43;
export const TRITETRACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const TRITETRACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const TRITETRACONTAGON_NOTES_SHAPE_TRITETRACONTAGON = 'tritetracontagon';
export const TRITETRACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const TRITETRACONTAGON_NOTES_SHAPES = [
    TRITETRACONTAGON_NOTES_SHAPE_STANDARD,
    TRITETRACONTAGON_NOTES_SHAPE_INVERTED,
    TRITETRACONTAGON_NOTES_SHAPE_TRITETRACONTAGON,
    TRITETRACONTAGON_NOTES_SHAPE_TIGHT
];

// Day 795: Tetratetracontagon (44-cusped Hypocycloid) Notes
export const TETRATETRACONTAGON_NOTES_MIN_LENGTH = 8;
export const TETRATETRACONTAGON_NOTES_MAX_LENGTH = 64;
export const TETRATETRACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const TETRATETRACONTAGON_NOTES_MIN_A = 1;
export const TETRATETRACONTAGON_NOTES_MAX_A = 8;
export const TETRATETRACONTAGON_NOTES_DEFAULT_A = 4;
export const TETRATETRACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const TETRATETRACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const TETRATETRACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const TETRATETRACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const TETRATETRACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const TETRATETRACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const TETRATETRACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const TETRATETRACONTAGON_NOTES_TETRATETRACONTAGON_T_MIN = 0;
export const TETRATETRACONTAGON_NOTES_TETRATETRACONTAGON_T_MAX = 2 * Math.PI / 44;
export const TETRATETRACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 44;
export const TETRATETRACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 44;
export const TETRATETRACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const TETRATETRACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const TETRATETRACONTAGON_NOTES_SHAPE_TETRATETRACONTAGON = 'tetratetracontagon';
export const TETRATETRACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const TETRATETRACONTAGON_NOTES_SHAPES = [
    TETRATETRACONTAGON_NOTES_SHAPE_STANDARD,
    TETRATETRACONTAGON_NOTES_SHAPE_INVERTED,
    TETRATETRACONTAGON_NOTES_SHAPE_TETRATETRACONTAGON,
    TETRATETRACONTAGON_NOTES_SHAPE_TIGHT
];
// Day 795: Tetratetracontagon (44-cusped Hypocycloid) Notes
export const PENTATETRACONTAGON_NOTES_MIN_LENGTH = 8;
export const PENTATETRACONTAGON_NOTES_MAX_LENGTH = 64;
export const PENTATETRACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const PENTATETRACONTAGON_NOTES_MIN_A = 1;
export const PENTATETRACONTAGON_NOTES_MAX_A = 8;
export const PENTATETRACONTAGON_NOTES_DEFAULT_A = 4;
export const PENTATETRACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const PENTATETRACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const PENTATETRACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const PENTATETRACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const PENTATETRACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const PENTATETRACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const PENTATETRACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const PENTATETRACONTAGON_NOTES_PENTATETRACONTAGON_T_MIN = 0;
export const PENTATETRACONTAGON_NOTES_PENTATETRACONTAGON_T_MAX = 2 * Math.PI / 45;
export const PENTATETRACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 45;
export const PENTATETRACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 45;
export const PENTATETRACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const PENTATETRACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const PENTATETRACONTAGON_NOTES_SHAPE_PENTATETRACONTAGON = 'pentatetracontagon';
export const PENTATETRACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const PENTATETRACONTAGON_NOTES_SHAPES = [
    PENTATETRACONTAGON_NOTES_SHAPE_STANDARD,
    PENTATETRACONTAGON_NOTES_SHAPE_INVERTED,
    PENTATETRACONTAGON_NOTES_SHAPE_PENTATETRACONTAGON,
    PENTATETRACONTAGON_NOTES_SHAPE_TIGHT
];

// Day 797: Hexatetracontagon (46-cusped Hypocycloid) Notes
// 46-cusped hypocycloid generated by a small circle of radius r = a/45 rolling
// inside a fixed circle of radius R = 46a/45 (R/r = 46, 46 cusps per revolution).
// Parametric: x(t) = a*cos(t) + (a/45)*cos(45t); y(t) = a*sin(t) - (a/45)*sin(45t).
// 46 = 2 * 23 is NOT constructible by compass and straightedge (Gauss-Wantzel
// 1837 theorem: n-gon is constructible iff n is a product of DISTINCT Fermat primes
// and a power of 2; 23 is prime but NOT Fermat, so 46 = 2*23 fails the distinctness
// criterion despite 2 being a power of 2). 46 is the smallest number > 45 whose
// odd prime factor 23 is a Sophie Germain prime (since 2*23+1 = 47 is also prime,
// making 23 a Sophie Germain prime, the 8th SG prime after 2, 3, 5, 11, 23, 29, 41, 53
// wait actually 2*23+1 = 47 IS prime, so 23 IS a Sophie Germain prime; the 8th SG
// prime is 23; SG primes p have 2p+1 also prime, safe primes). 46-fold rotational
// symmetry is forbidden in classical crystallography (Bravais 1850 only allows
// 1, 2, 3, 4, 6-fold rotations) but appears in 46-fold quasicrystal approximants.
// 46 = 2 * 23 is the 14th even semiprime (product of exactly 2 primes, not necessarily
// distinct; semiprimes: 4, 6, 9, 10, 14, 15, 21, 22, 25, 26, 33, 34, 35, 38, 39, 46...).
export const HEXATETRACONTAGON_NOTES_MIN_LENGTH = 8;
export const HEXATETRACONTAGON_NOTES_MAX_LENGTH = 64;
export const HEXATETRACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXATETRACONTAGON_NOTES_MIN_A = 1;
export const HEXATETRACONTAGON_NOTES_MAX_A = 8;
export const HEXATETRACONTAGON_NOTES_DEFAULT_A = 4;
export const HEXATETRACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXATETRACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXATETRACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXATETRACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXATETRACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXATETRACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXATETRACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const HEXATETRACONTAGON_NOTES_HEXATETRACONTAGON_T_MIN = 0;
export const HEXATETRACONTAGON_NOTES_HEXATETRACONTAGON_T_MAX = 2 * Math.PI / 46;
export const HEXATETRACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 46;
export const HEXATETRACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 46;
export const HEXATETRACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXATETRACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXATETRACONTAGON_NOTES_SHAPE_HEXATETRACONTAGON = 'hexatetracontagon';
export const HEXATETRACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXATETRACONTAGON_NOTES_SHAPES = [
    HEXATETRACONTAGON_NOTES_SHAPE_STANDARD,
    HEXATETRACONTAGON_NOTES_SHAPE_INVERTED,
    HEXATETRACONTAGON_NOTES_SHAPE_HEXATETRACONTAGON,
    HEXATETRACONTAGON_NOTES_SHAPE_TIGHT
];

// Day 798: Heptatetracontagon (47-cusped Hypocycloid) Notes
// 47-cusped hypocycloid generated by a small circle of radius r = a/46 rolling
// inside a fixed circle of radius R = 47a/46 (R/r = 47, 47 cusps per revolution).
// Parametric: x(t) = a*cos(t) + (a/46)*cos(46t); y(t) = a*sin(t) - (a/46)*sin(46t).
// 47 is prime but NOT a Fermat prime (Fermat primes are 3, 5, 17, 257, 65537), so
// the 47-gon is NOT constructible by compass and straightedge (Gauss-Wantzel 1837
// theorem: n is constructible iff n is a product of DISTINCT Fermat primes and a
// power of 2; 47 is the 15th prime and fails the distinctness criterion). 47 is a
// safe prime (47 = 2*23+1 where 23 is prime), and 23 is a Sophie Germain prime
// (2*23+1 = 47 prime), so 47 is the corresponding safe prime (the 8th safe prime
// after 5, 7, 11, 23, 47, 59, 83, 107). 47 is also a Lucas prime (primes p where
// p divides a Fibonacci number F_{p-(10/p)}; 47 is one of the few primes satisfying
// the Lucas test, used in the Lucas primality test for n=2^p-1 Mersenne candidates),
// and a NewMersenne prime (47 = 2*23+1, related to the 23rd Mersenne number
// 2^23-1 = 8388607 which is prime, M_23 the 8th known Mersenne prime). 47-fold
// rotational symmetry is forbidden in classical crystallography (Bravais 1850
// crystallographic restriction theorem only allows 1, 2, 3, 4, 6-fold rotations in
// periodic crystal lattices) but appears in 47-fold quasicrystal approximants.
// 47 is the largest prime less than 50, the 15th prime, the atomic number of silver
// (Ag, a transition metal in Group 11, Period 5), the number of integer partitions
// of 7 (p(7) = 15... no, p(7) = 15 wait, p(1)=1, p(2)=2, p(3)=3, p(4)=5, p(5)=7,
// p(6)=11, p(7)=15, so 47 is NOT a partition number), and the number of seconds in
// 47/60 of a minute. 47 is the sum of the first 14 positive integers minus
// 47 = 14*15/2 = 105 - 58 = 47 (so 47 is T_9 + 2 = 45 + 2 = 47, NOT a triangular
// number since T_9 = 45 and T_10 = 55, 47 is between them and not triangular).
// 47 is a sexy prime (47, 53 differ by 6), a Chen prime (47+2 = 49 not prime, so
// NOT Chen; 47+2 = 49 = 7^2 not prime, so 47 is NOT Chen), a Pierpont prime
// (47 = 2^u*3^v+1 form? 47-1 = 46 = 2*23, 23 is not 3^v, so NOT Pierpont), a
// Pillai prime, a Ramanujan prime, and a strictly non-palindromic prime.
export const HEPTATETRACONTAGON_NOTES_MIN_LENGTH = 8;
export const HEPTATETRACONTAGON_NOTES_MAX_LENGTH = 64;
export const HEPTATETRACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTATETRACONTAGON_NOTES_MIN_A = 1;
export const HEPTATETRACONTAGON_NOTES_MAX_A = 8;
export const HEPTATETRACONTAGON_NOTES_DEFAULT_A = 4;
export const HEPTATETRACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTATETRACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTATETRACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTATETRACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTATETRACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTATETRACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTATETRACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTATETRACONTAGON_NOTES_HEPTATETRACONTAGON_T_MIN = 0;
export const HEPTATETRACONTAGON_NOTES_HEPTATETRACONTAGON_T_MAX = 2 * Math.PI / 47;
export const HEPTATETRACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 47;
export const HEPTATETRACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 47;
export const HEPTATETRACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTATETRACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTATETRACONTAGON_NOTES_SHAPE_HEPTATETRACONTAGON = 'heptatetracontagon';
export const HEPTATETRACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTATETRACONTAGON_NOTES_SHAPES = [
    HEPTATETRACONTAGON_NOTES_SHAPE_STANDARD,
    HEPTATETRACONTAGON_NOTES_SHAPE_INVERTED,
    HEPTATETRACONTAGON_NOTES_SHAPE_HEPTATETRACONTAGON,
    HEPTATETRACONTAGON_NOTES_SHAPE_TIGHT
];

// Day 799: Octatetracontagon (48-cusped Hypocycloid) Notes
// 48-cusped hypocycloid generated by a small circle of radius r = a/47 rolling
// inside a fixed circle of radius R = 48a/47 (R/r = 48, 48 cusps per revolution).
// Parametric: x(t) = a*cos(t) + (a/47)*cos(47t); y(t) = a*sin(t) - (a/47)*sin(47t).
// 48 = 2^4 * 3 IS constructible by compass and straightedge (Gauss-Wantzel 1837
// theorem: n-gon is constructible iff n is a product of DISTINCT Fermat primes
// and a power of 2; 2^4 is a power of 2 and 3 is a distinct Fermat prime, so
// 48 = 2^4 * 3 satisfies the criterion; the 48-gon can be constructed via
// repeated bisections of the regular triangle). 48-fold rotational symmetry is
// forbidden in classical crystallography (Bravais 1850 only allows 1, 2, 3, 4,
// 6-fold rotations) but appears in 48-fold quasicrystal approximants. 48 is
// highly composite (10 divisors), refactorable, the 15th 3-smooth number, the
// atomic number of cadmium (Cd), and the count of contiguous US states.
export const OCTATETRACONTAGON_NOTES_MIN_LENGTH = 8;
export const OCTATETRACONTAGON_NOTES_MAX_LENGTH = 64;
export const OCTATETRACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const OCTATETRACONTAGON_NOTES_MIN_A = 1;
export const OCTATETRACONTAGON_NOTES_MAX_A = 8;
export const OCTATETRACONTAGON_NOTES_DEFAULT_A = 4;
export const OCTATETRACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const OCTATETRACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const OCTATETRACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const OCTATETRACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const OCTATETRACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const OCTATETRACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const OCTATETRACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const OCTATETRACONTAGON_NOTES_OCTATETRACONTAGON_T_MIN = 0;
export const OCTATETRACONTAGON_NOTES_OCTATETRACONTAGON_T_MAX = 2 * Math.PI / 48;
export const OCTATETRACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 48;
export const OCTATETRACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 48;
export const OCTATETRACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const OCTATETRACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const OCTATETRACONTAGON_NOTES_SHAPE_OCTATETRACONTAGON = 'octatetracontagon';
export const OCTATETRACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const OCTATETRACONTAGON_NOTES_SHAPES = [
    OCTATETRACONTAGON_NOTES_SHAPE_STANDARD,
    OCTATETRACONTAGON_NOTES_SHAPE_INVERTED,
    OCTATETRACONTAGON_NOTES_SHAPE_OCTATETRACONTAGON,
    OCTATETRACONTAGON_NOTES_SHAPE_TIGHT
];

export const ENNEACONTACONTAGON_NOTES_MIN_LENGTH = 8;
export const ENNEACONTACONTAGON_NOTES_MAX_LENGTH = 64;
export const ENNEACONTACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const ENNEACONTACONTAGON_NOTES_MIN_A = 1;
export const ENNEACONTACONTAGON_NOTES_MAX_A = 8;
export const ENNEACONTACONTAGON_NOTES_DEFAULT_A = 4;
export const ENNEACONTACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const ENNEACONTACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const ENNEACONTACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const ENNEACONTACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const ENNEACONTACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const ENNEACONTACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const ENNEACONTACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const ENNEACONTACONTAGON_NOTES_ENNEACONTACONTAGON_T_MIN = 0;
export const ENNEACONTACONTAGON_NOTES_ENNEACONTACONTAGON_T_MAX = 2 * Math.PI / 49;
export const ENNEACONTACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 49;
export const ENNEACONTACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 49;
export const ENNEACONTACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const ENNEACONTACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const ENNEACONTACONTAGON_NOTES_SHAPE_ENNEACONTACONTAGON = 'enneacontacontagon';
export const ENNEACONTACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const ENNEACONTACONTAGON_NOTES_SHAPES = [
    ENNEACONTACONTAGON_NOTES_SHAPE_STANDARD,
    ENNEACONTACONTAGON_NOTES_SHAPE_INVERTED,
    ENNEACONTACONTAGON_NOTES_SHAPE_ENNEACONTACONTAGON,
    ENNEACONTACONTAGON_NOTES_SHAPE_TIGHT
];

export const PENTACONTAGON_NOTES_MIN_LENGTH = 8;
export const PENTACONTAGON_NOTES_MAX_LENGTH = 64;
export const PENTACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const PENTACONTAGON_NOTES_MIN_A = 1;
export const PENTACONTAGON_NOTES_MAX_A = 8;
export const PENTACONTAGON_NOTES_DEFAULT_A = 4;
export const PENTACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const PENTACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const PENTACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const PENTACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const PENTACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const PENTACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const PENTACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const PENTACONTAGON_NOTES_PENTACONTAGON_T_MIN = 0;
export const PENTACONTAGON_NOTES_PENTACONTAGON_T_MAX = 2 * Math.PI / 50;
export const PENTACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 50;
export const PENTACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 50;
export const PENTACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const PENTACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const PENTACONTAGON_NOTES_SHAPE_PENTACONTAGON = 'pentacontagon';
export const PENTACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const PENTACONTAGON_NOTES_SHAPES = [
    PENTACONTAGON_NOTES_SHAPE_STANDARD,
    PENTACONTAGON_NOTES_SHAPE_INVERTED,
    PENTACONTAGON_NOTES_SHAPE_PENTACONTAGON,
    PENTACONTAGON_NOTES_SHAPE_TIGHT
];

export const PENTACONTAHENAGON_NOTES_MIN_LENGTH = 8;
export const PENTACONTAHENAGON_NOTES_MAX_LENGTH = 64;
export const PENTACONTAHENAGON_NOTES_DEFAULT_LENGTH = 32;
export const PENTACONTAHENAGON_NOTES_MIN_A = 1;
export const PENTACONTAHENAGON_NOTES_MAX_A = 8;
export const PENTACONTAHENAGON_NOTES_DEFAULT_A = 4;
export const PENTACONTAHENAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const PENTACONTAHENAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const PENTACONTAHENAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const PENTACONTAHENAGON_NOTES_DEFAULT_T_MIN = 0;
export const PENTACONTAHENAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const PENTACONTAHENAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const PENTACONTAHENAGON_NOTES_INVERTED_T_MAX = 0;
export const PENTACONTAHENAGON_NOTES_PENTACONTAHENAGON_T_MIN = 0;
export const PENTACONTAHENAGON_NOTES_PENTACONTAHENAGON_T_MAX = 2 * Math.PI / 51;
export const PENTACONTAHENAGON_NOTES_TIGHT_T_MIN = -Math.PI / 51;
export const PENTACONTAHENAGON_NOTES_TIGHT_T_MAX = Math.PI / 51;
export const PENTACONTAHENAGON_NOTES_SHAPE_STANDARD = 'standard';
export const PENTACONTAHENAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const PENTACONTAHENAGON_NOTES_SHAPE_PENTACONTAHENAGON = 'pentacontahenagon';
export const PENTACONTAHENAGON_NOTES_SHAPE_TIGHT = 'tight';
export const PENTACONTAHENAGON_NOTES_SHAPES = [
    PENTACONTAHENAGON_NOTES_SHAPE_STANDARD,
    PENTACONTAHENAGON_NOTES_SHAPE_INVERTED,
    PENTACONTAHENAGON_NOTES_SHAPE_PENTACONTAHENAGON,
    PENTACONTAHENAGON_NOTES_SHAPE_TIGHT
];

export const PENTACONTADIGON_NOTES_MIN_LENGTH = 8;
export const PENTACONTADIGON_NOTES_MAX_LENGTH = 64;
export const PENTACONTADIGON_NOTES_DEFAULT_LENGTH = 32;
export const PENTACONTADIGON_NOTES_MIN_A = 1;
export const PENTACONTADIGON_NOTES_MAX_A = 8;
export const PENTACONTADIGON_NOTES_DEFAULT_A = 4;
export const PENTACONTADIGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const PENTACONTADIGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const PENTACONTADIGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const PENTACONTADIGON_NOTES_DEFAULT_T_MIN = 0;
export const PENTACONTADIGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const PENTACONTADIGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const PENTACONTADIGON_NOTES_INVERTED_T_MAX = 0;
export const PENTACONTADIGON_NOTES_PENTACONTADIGON_T_MIN = 0;
export const PENTACONTADIGON_NOTES_PENTACONTADIGON_T_MAX = 2 * Math.PI / 52;
export const PENTACONTADIGON_NOTES_TIGHT_T_MIN = -Math.PI / 52;
export const PENTACONTADIGON_NOTES_TIGHT_T_MAX = Math.PI / 52;
export const PENTACONTADIGON_NOTES_SHAPE_STANDARD = 'standard';
export const PENTACONTADIGON_NOTES_SHAPE_INVERTED = 'inverted';
export const PENTACONTADIGON_NOTES_SHAPE_PENTACONTADIGON = 'pentacontadigon';
export const PENTACONTADIGON_NOTES_SHAPE_TIGHT = 'tight';
export const PENTACONTADIGON_NOTES_SHAPES = [
    PENTACONTADIGON_NOTES_SHAPE_STANDARD,
    PENTACONTADIGON_NOTES_SHAPE_INVERTED,
    PENTACONTADIGON_NOTES_SHAPE_PENTACONTADIGON,
    PENTACONTADIGON_NOTES_SHAPE_TIGHT
];

export const PENTACONTATETRAGON_NOTES_MIN_LENGTH = 8;
export const PENTACONTATETRAGON_NOTES_MAX_LENGTH = 64;
export const PENTACONTATETRAGON_NOTES_DEFAULT_LENGTH = 32;
export const PENTACONTATETRAGON_NOTES_MIN_A = 1;
export const PENTACONTATETRAGON_NOTES_MAX_A = 8;
export const PENTACONTATETRAGON_NOTES_DEFAULT_A = 4;
export const PENTACONTATETRAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const PENTACONTATETRAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const PENTACONTATETRAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const PENTACONTATETRAGON_NOTES_DEFAULT_T_MIN = 0;
export const PENTACONTATETRAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const PENTACONTATETRAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const PENTACONTATETRAGON_NOTES_INVERTED_T_MAX = 0;
export const PENTACONTATETRAGON_NOTES_PENTACONTATETRAGON_T_MIN = 0;
export const PENTACONTATETRAGON_NOTES_PENTACONTATETRAGON_T_MAX = 2 * Math.PI / 53;
export const PENTACONTATETRAGON_NOTES_TIGHT_T_MIN = -Math.PI / 53;
export const PENTACONTATETRAGON_NOTES_TIGHT_T_MAX = Math.PI / 53;
export const PENTACONTATETRAGON_NOTES_SHAPE_STANDARD = 'standard';
export const PENTACONTATETRAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const PENTACONTATETRAGON_NOTES_SHAPE_PENTACONTATETRAGON = 'pentacontatetragon';
export const PENTACONTATETRAGON_NOTES_SHAPE_TIGHT = 'tight';
export const PENTACONTATETRAGON_NOTES_SHAPES = [
    PENTACONTATETRAGON_NOTES_SHAPE_STANDARD,
    PENTACONTATETRAGON_NOTES_SHAPE_INVERTED,
    PENTACONTATETRAGON_NOTES_SHAPE_PENTACONTATETRAGON,
    PENTACONTATETRAGON_NOTES_SHAPE_TIGHT
];

export const PENTACONTAPENTAGON_NOTES_MIN_LENGTH = 8;
export const PENTACONTAPENTAGON_NOTES_MAX_LENGTH = 64;
export const PENTACONTAPENTAGON_NOTES_DEFAULT_LENGTH = 32;
export const PENTACONTAPENTAGON_NOTES_MIN_A = 1;
export const PENTACONTAPENTAGON_NOTES_MAX_A = 8;
export const PENTACONTAPENTAGON_NOTES_DEFAULT_A = 4;
export const PENTACONTAPENTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const PENTACONTAPENTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const PENTACONTAPENTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const PENTACONTAPENTAGON_NOTES_DEFAULT_T_MIN = 0;
export const PENTACONTAPENTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const PENTACONTAPENTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const PENTACONTAPENTAGON_NOTES_INVERTED_T_MAX = 0;
export const PENTACONTAPENTAGON_NOTES_PENTACONTAPENTAGON_T_MIN = 0;
export const PENTACONTAPENTAGON_NOTES_PENTACONTAPENTAGON_T_MAX = 2 * Math.PI / 54;
export const PENTACONTAPENTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 54;
export const PENTACONTAPENTAGON_NOTES_TIGHT_T_MAX = Math.PI / 54;
export const PENTACONTAPENTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const PENTACONTAPENTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const PENTACONTAPENTAGON_NOTES_SHAPE_PENTACONTAPENTAGON = 'pentacontapentagon';
export const PENTACONTAPENTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const PENTACONTAPENTAGON_NOTES_SHAPES = [
    PENTACONTAPENTAGON_NOTES_SHAPE_STANDARD,
    PENTACONTAPENTAGON_NOTES_SHAPE_INVERTED,
    PENTACONTAPENTAGON_NOTES_SHAPE_PENTACONTAPENTAGON,
    PENTACONTAPENTAGON_NOTES_SHAPE_TIGHT
];

export const PENTACONTAHEXAGON_NOTES_MIN_LENGTH = 8;
export const PENTACONTAHEXAGON_NOTES_MAX_LENGTH = 64;
export const PENTACONTAHEXAGON_NOTES_DEFAULT_LENGTH = 32;
export const PENTACONTAHEXAGON_NOTES_MIN_A = 1;
export const PENTACONTAHEXAGON_NOTES_MAX_A = 8;
export const PENTACONTAHEXAGON_NOTES_DEFAULT_A = 4;
export const PENTACONTAHEXAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const PENTACONTAHEXAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const PENTACONTAHEXAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const PENTACONTAHEXAGON_NOTES_DEFAULT_T_MIN = 0;
export const PENTACONTAHEXAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const PENTACONTAHEXAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const PENTACONTAHEXAGON_NOTES_INVERTED_T_MAX = 0;
export const PENTACONTAHEXAGON_NOTES_PENTACONTAHEXAGON_T_MIN = 0;
export const PENTACONTAHEXAGON_NOTES_PENTACONTAHEXAGON_T_MAX = 2 * Math.PI / 55;
export const PENTACONTAHEXAGON_NOTES_TIGHT_T_MIN = -Math.PI / 55;
export const PENTACONTAHEXAGON_NOTES_TIGHT_T_MAX = Math.PI / 55;
export const PENTACONTAHEXAGON_NOTES_SHAPE_STANDARD = 'standard';
export const PENTACONTAHEXAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const PENTACONTAHEXAGON_NOTES_SHAPE_PENTACONTAHEXAGON = 'pentacontahexagon';
export const PENTACONTAHEXAGON_NOTES_SHAPE_TIGHT = 'tight';
export const PENTACONTAHEXAGON_NOTES_SHAPES = [
    PENTACONTAHEXAGON_NOTES_SHAPE_STANDARD,
    PENTACONTAHEXAGON_NOTES_SHAPE_INVERTED,
    PENTACONTAHEXAGON_NOTES_SHAPE_PENTACONTAHEXAGON,
    PENTACONTAHEXAGON_NOTES_SHAPE_TIGHT
];

export const PENTACONTAHEPTAGON_NOTES_MIN_LENGTH = 8;
export const PENTACONTAHEPTAGON_NOTES_MAX_LENGTH = 64;
export const PENTACONTAHEPTAGON_NOTES_DEFAULT_LENGTH = 32;
export const PENTACONTAHEPTAGON_NOTES_MIN_A = 1;
export const PENTACONTAHEPTAGON_NOTES_MAX_A = 8;
export const PENTACONTAHEPTAGON_NOTES_DEFAULT_A = 4;
export const PENTACONTAHEPTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const PENTACONTAHEPTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const PENTACONTAHEPTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const PENTACONTAHEPTAGON_NOTES_DEFAULT_T_MIN = 0;
export const PENTACONTAHEPTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const PENTACONTAHEPTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const PENTACONTAHEPTAGON_NOTES_INVERTED_T_MAX = 0;
export const PENTACONTAHEPTAGON_NOTES_PENTACONTAHEPTAGON_T_MIN = 0;
export const PENTACONTAHEPTAGON_NOTES_PENTACONTAHEPTAGON_T_MAX = 2 * Math.PI / 56;
export const PENTACONTAHEPTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 56;
export const PENTACONTAHEPTAGON_NOTES_TIGHT_T_MAX = Math.PI / 56;
export const PENTACONTAHEPTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const PENTACONTAHEPTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const PENTACONTAHEPTAGON_NOTES_SHAPE_PENTACONTAHEPTAGON = 'pentacontaheptagon';
export const PENTACONTAHEPTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const PENTACONTAHEPTAGON_NOTES_SHAPES = [
    PENTACONTAHEPTAGON_NOTES_SHAPE_STANDARD,
    PENTACONTAHEPTAGON_NOTES_SHAPE_INVERTED,
    PENTACONTAHEPTAGON_NOTES_SHAPE_PENTACONTAHEPTAGON,
    PENTACONTAHEPTAGON_NOTES_SHAPE_TIGHT
];

export const PENTACONTAOCTAGON_NOTES_MIN_LENGTH = 8;
export const PENTACONTAOCTAGON_NOTES_MAX_LENGTH = 64;
export const PENTACONTAOCTAGON_NOTES_DEFAULT_LENGTH = 32;
export const PENTACONTAOCTAGON_NOTES_MIN_A = 1;
export const PENTACONTAOCTAGON_NOTES_MAX_A = 8;
export const PENTACONTAOCTAGON_NOTES_DEFAULT_A = 4;
export const PENTACONTAOCTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const PENTACONTAOCTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const PENTACONTAOCTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const PENTACONTAOCTAGON_NOTES_DEFAULT_T_MIN = 0;
export const PENTACONTAOCTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const PENTACONTAOCTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const PENTACONTAOCTAGON_NOTES_INVERTED_T_MAX = 0;
export const PENTACONTAOCTAGON_NOTES_PENTACONTAOCTAGON_T_MIN = 0;
export const PENTACONTAOCTAGON_NOTES_PENTACONTAOCTAGON_T_MAX = 2 * Math.PI / 57;
export const PENTACONTAOCTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 57;
export const PENTACONTAOCTAGON_NOTES_TIGHT_T_MAX = Math.PI / 57;
export const PENTACONTAOCTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const PENTACONTAOCTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const PENTACONTAOCTAGON_NOTES_SHAPE_PENTACONTAOCTAGON = 'pentacontaoctagon';
export const PENTACONTAOCTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const PENTACONTAOCTAGON_NOTES_SHAPES = [
    PENTACONTAOCTAGON_NOTES_SHAPE_STANDARD,
    PENTACONTAOCTAGON_NOTES_SHAPE_INVERTED,
    PENTACONTAOCTAGON_NOTES_SHAPE_PENTACONTAOCTAGON,
    PENTACONTAOCTAGON_NOTES_SHAPE_TIGHT
];

export const PENTACONTAENNEAGON_NOTES_MIN_LENGTH = 8;
export const PENTACONTAENNEAGON_NOTES_MAX_LENGTH = 64;
export const PENTACONTAENNEAGON_NOTES_DEFAULT_LENGTH = 32;
export const PENTACONTAENNEAGON_NOTES_MIN_A = 1;
export const PENTACONTAENNEAGON_NOTES_MAX_A = 8;
export const PENTACONTAENNEAGON_NOTES_DEFAULT_A = 4;
export const PENTACONTAENNEAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const PENTACONTAENNEAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const PENTACONTAENNEAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const PENTACONTAENNEAGON_NOTES_DEFAULT_T_MIN = 0;
export const PENTACONTAENNEAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const PENTACONTAENNEAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const PENTACONTAENNEAGON_NOTES_INVERTED_T_MAX = 0;
export const PENTACONTAENNEAGON_NOTES_PENTACONTAENNEAGON_T_MIN = 0;
export const PENTACONTAENNEAGON_NOTES_PENTACONTAENNEAGON_T_MAX = 2 * Math.PI / 58;
export const PENTACONTAENNEAGON_NOTES_TIGHT_T_MIN = -Math.PI / 58;
export const PENTACONTAENNEAGON_NOTES_TIGHT_T_MAX = Math.PI / 58;
export const PENTACONTAENNEAGON_NOTES_SHAPE_STANDARD = 'standard';
export const PENTACONTAENNEAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const PENTACONTAENNEAGON_NOTES_SHAPE_PENTACONTAENNEAGON = 'pentacontaenneagon';
export const PENTACONTAENNEAGON_NOTES_SHAPE_TIGHT = 'tight';
export const PENTACONTAENNEAGON_NOTES_SHAPES = [
    PENTACONTAENNEAGON_NOTES_SHAPE_STANDARD,
    PENTACONTAENNEAGON_NOTES_SHAPE_INVERTED,
    PENTACONTAENNEAGON_NOTES_SHAPE_PENTACONTAENNEAGON,
    PENTACONTAENNEAGON_NOTES_SHAPE_TIGHT
];

export const PENTACONTADECAGON_NOTES_MIN_LENGTH = 8;
export const PENTACONTADECAGON_NOTES_MAX_LENGTH = 64;
export const PENTACONTADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const PENTACONTADECAGON_NOTES_MIN_A = 1;
export const PENTACONTADECAGON_NOTES_MAX_A = 8;
export const PENTACONTADECAGON_NOTES_DEFAULT_A = 4;
export const PENTACONTADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const PENTACONTADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const PENTACONTADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const PENTACONTADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const PENTACONTADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const PENTACONTADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const PENTACONTADECAGON_NOTES_INVERTED_T_MAX = 0;
export const PENTACONTADECAGON_NOTES_PENTACONTADECAGON_T_MIN = 0;
export const PENTACONTADECAGON_NOTES_PENTACONTADECAGON_T_MAX = 2 * Math.PI / 59;
export const PENTACONTADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 59;
export const PENTACONTADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 59;
export const PENTACONTADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const PENTACONTADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const PENTACONTADECAGON_NOTES_SHAPE_PENTACONTADECAGON = 'pentacontadecagon';
export const PENTACONTADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const PENTACONTADECAGON_NOTES_SHAPES = [
    PENTACONTADECAGON_NOTES_SHAPE_STANDARD,
    PENTACONTADECAGON_NOTES_SHAPE_INVERTED,
    PENTACONTADECAGON_NOTES_SHAPE_PENTACONTADECAGON,
    PENTACONTADECAGON_NOTES_SHAPE_TIGHT
];

export const HEXACONTAGON_NOTES_MIN_LENGTH = 8;
export const HEXACONTAGON_NOTES_MAX_LENGTH = 64;
export const HEXACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXACONTAGON_NOTES_MIN_A = 1;
export const HEXACONTAGON_NOTES_MAX_A = 8;
export const HEXACONTAGON_NOTES_DEFAULT_A = 4;
export const HEXACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const HEXACONTAGON_NOTES_HEXACONTAGON_T_MIN = 0;
export const HEXACONTAGON_NOTES_HEXACONTAGON_T_MAX = 2 * Math.PI / 60;
export const HEXACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 60;
export const HEXACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 60;
export const HEXACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXACONTAGON_NOTES_SHAPE_HEXACONTAGON = 'hexacontagon';
export const HEXACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXACONTAGON_NOTES_SHAPES = [
    HEXACONTAGON_NOTES_SHAPE_STANDARD,
    HEXACONTAGON_NOTES_SHAPE_INVERTED,
    HEXACONTAGON_NOTES_SHAPE_HEXACONTAGON,
    HEXACONTAGON_NOTES_SHAPE_TIGHT
];

export const HEXACONTAHENAGON_NOTES_MIN_LENGTH = 8;
export const HEXACONTAHENAGON_NOTES_MAX_LENGTH = 64;
export const HEXACONTAHENAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXACONTAHENAGON_NOTES_MIN_A = 1;
export const HEXACONTAHENAGON_NOTES_MAX_A = 8;
export const HEXACONTAHENAGON_NOTES_DEFAULT_A = 4;
export const HEXACONTAHENAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXACONTAHENAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXACONTAHENAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXACONTAHENAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXACONTAHENAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXACONTAHENAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXACONTAHENAGON_NOTES_INVERTED_T_MAX = 0;
export const HEXACONTAHENAGON_NOTES_HEXACONTAHENAGON_T_MIN = 0;
export const HEXACONTAHENAGON_NOTES_HEXACONTAHENAGON_T_MAX = 2 * Math.PI / 61;
export const HEXACONTAHENAGON_NOTES_TIGHT_T_MIN = -Math.PI / 61;
export const HEXACONTAHENAGON_NOTES_TIGHT_T_MAX = Math.PI / 61;
export const HEXACONTAHENAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXACONTAHENAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXACONTAHENAGON_NOTES_SHAPE_HEXACONTAHENAGON = 'hexacontahenagon';
export const HEXACONTAHENAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXACONTAHENAGON_NOTES_SHAPES = [
    HEXACONTAHENAGON_NOTES_SHAPE_STANDARD,
    HEXACONTAHENAGON_NOTES_SHAPE_INVERTED,
    HEXACONTAHENAGON_NOTES_SHAPE_HEXACONTAHENAGON,
    HEXACONTAHENAGON_NOTES_SHAPE_TIGHT
];

export const HEXACONTADIGON_NOTES_MIN_LENGTH = 8;
export const HEXACONTADIGON_NOTES_MAX_LENGTH = 64;
export const HEXACONTADIGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXACONTADIGON_NOTES_MIN_A = 1;
export const HEXACONTADIGON_NOTES_MAX_A = 8;
export const HEXACONTADIGON_NOTES_DEFAULT_A = 4;
export const HEXACONTADIGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXACONTADIGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXACONTADIGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXACONTADIGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXACONTADIGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXACONTADIGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXACONTADIGON_NOTES_INVERTED_T_MAX = 0;
export const HEXACONTADIGON_NOTES_HEXACONTADIGON_T_MIN = 0;
export const HEXACONTADIGON_NOTES_HEXACONTADIGON_T_MAX = 2 * Math.PI / 62;
export const HEXACONTADIGON_NOTES_TIGHT_T_MIN = -Math.PI / 62;
export const HEXACONTADIGON_NOTES_TIGHT_T_MAX = Math.PI / 62;
export const HEXACONTADIGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXACONTADIGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXACONTADIGON_NOTES_SHAPE_HEXACONTADIGON = 'hexacontadigon';
export const HEXACONTADIGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXACONTADIGON_NOTES_SHAPES = [
    HEXACONTADIGON_NOTES_SHAPE_STANDARD,
    HEXACONTADIGON_NOTES_SHAPE_INVERTED,
    HEXACONTADIGON_NOTES_SHAPE_HEXACONTADIGON,
    HEXACONTADIGON_NOTES_SHAPE_TIGHT
];

export const HEXACONTATRIGON_NOTES_MIN_LENGTH = 8;
export const HEXACONTATRIGON_NOTES_MAX_LENGTH = 64;
export const HEXACONTATRIGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXACONTATRIGON_NOTES_MIN_A = 1;
export const HEXACONTATRIGON_NOTES_MAX_A = 8;
export const HEXACONTATRIGON_NOTES_DEFAULT_A = 4;
export const HEXACONTATRIGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXACONTATRIGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXACONTATRIGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXACONTATRIGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXACONTATRIGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXACONTATRIGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXACONTATRIGON_NOTES_INVERTED_T_MAX = 0;
export const HEXACONTATRIGON_NOTES_HEXACONTATRIGON_T_MIN = 0;
export const HEXACONTATRIGON_NOTES_HEXACONTATRIGON_T_MAX = 2 * Math.PI / 63;
export const HEXACONTATRIGON_NOTES_TIGHT_T_MIN = -Math.PI / 63;
export const HEXACONTATRIGON_NOTES_TIGHT_T_MAX = Math.PI / 63;
export const HEXACONTATRIGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXACONTATRIGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXACONTATRIGON_NOTES_SHAPE_HEXACONTATRIGON = 'hexacontatrigon';
export const HEXACONTATRIGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXACONTATRIGON_NOTES_SHAPES = [
    HEXACONTATRIGON_NOTES_SHAPE_STANDARD,
    HEXACONTATRIGON_NOTES_SHAPE_INVERTED,
    HEXACONTATRIGON_NOTES_SHAPE_HEXACONTATRIGON,
    HEXACONTATRIGON_NOTES_SHAPE_TIGHT
];

export const HEXACONTATETRAGON_NOTES_MIN_LENGTH = 8;
export const HEXACONTATETRAGON_NOTES_MAX_LENGTH = 64;
export const HEXACONTATETRAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXACONTATETRAGON_NOTES_MIN_A = 1;
export const HEXACONTATETRAGON_NOTES_MAX_A = 8;
export const HEXACONTATETRAGON_NOTES_DEFAULT_A = 4;
export const HEXACONTATETRAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXACONTATETRAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXACONTATETRAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXACONTATETRAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXACONTATETRAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXACONTATETRAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXACONTATETRAGON_NOTES_INVERTED_T_MAX = 0;
export const HEXACONTATETRAGON_NOTES_HEXACONTATETRAGON_T_MIN = 0;
export const HEXACONTATETRAGON_NOTES_HEXACONTATETRAGON_T_MAX = 2 * Math.PI / 64;
export const HEXACONTATETRAGON_NOTES_TIGHT_T_MIN = -Math.PI / 64;
export const HEXACONTATETRAGON_NOTES_TIGHT_T_MAX = Math.PI / 64;
export const HEXACONTATETRAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXACONTATETRAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXACONTATETRAGON_NOTES_SHAPE_HEXACONTATETRAGON = 'hexacontatetragon';
export const HEXACONTATETRAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXACONTATETRAGON_NOTES_SHAPES = [
    HEXACONTATETRAGON_NOTES_SHAPE_STANDARD,
    HEXACONTATETRAGON_NOTES_SHAPE_INVERTED,
    HEXACONTATETRAGON_NOTES_SHAPE_HEXACONTATETRAGON,
    HEXACONTATETRAGON_NOTES_SHAPE_TIGHT
];

export const HEXACONTAPENTAGON_NOTES_MIN_LENGTH = 8;
export const HEXACONTAPENTAGON_NOTES_MAX_LENGTH = 64;
export const HEXACONTAPENTAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXACONTAPENTAGON_NOTES_MIN_A = 1;
export const HEXACONTAPENTAGON_NOTES_MAX_A = 8;
export const HEXACONTAPENTAGON_NOTES_DEFAULT_A = 4;
export const HEXACONTAPENTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXACONTAPENTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXACONTAPENTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXACONTAPENTAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXACONTAPENTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXACONTAPENTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXACONTAPENTAGON_NOTES_INVERTED_T_MAX = 0;
export const HEXACONTAPENTAGON_NOTES_HEXACONTAPENTAGON_T_MIN = 0;
export const HEXACONTAPENTAGON_NOTES_HEXACONTAPENTAGON_T_MAX = 2 * Math.PI / 65;
export const HEXACONTAPENTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 65;
export const HEXACONTAPENTAGON_NOTES_TIGHT_T_MAX = Math.PI / 65;
export const HEXACONTAPENTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXACONTAPENTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXACONTAPENTAGON_NOTES_SHAPE_HEXACONTAPENTAGON = 'hexacontapentagon';
export const HEXACONTAPENTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXACONTAPENTAGON_NOTES_SHAPES = [
    HEXACONTAPENTAGON_NOTES_SHAPE_STANDARD,
    HEXACONTAPENTAGON_NOTES_SHAPE_INVERTED,
    HEXACONTAPENTAGON_NOTES_SHAPE_HEXACONTAPENTAGON,
    HEXACONTAPENTAGON_NOTES_SHAPE_TIGHT
];

export const HEXACONTAHEXAGON_NOTES_MIN_LENGTH = 8;
export const HEXACONTAHEXAGON_NOTES_MAX_LENGTH = 64;
export const HEXACONTAHEXAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXACONTAHEXAGON_NOTES_MIN_A = 1;
export const HEXACONTAHEXAGON_NOTES_MAX_A = 8;
export const HEXACONTAHEXAGON_NOTES_DEFAULT_A = 4;
export const HEXACONTAHEXAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXACONTAHEXAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXACONTAHEXAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXACONTAHEXAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXACONTAHEXAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXACONTAHEXAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXACONTAHEXAGON_NOTES_INVERTED_T_MAX = 0;
export const HEXACONTAHEXAGON_NOTES_HEXACONTAHEXAGON_T_MIN = 0;
export const HEXACONTAHEXAGON_NOTES_HEXACONTAHEXAGON_T_MAX = 2 * Math.PI / 66;
export const HEXACONTAHEXAGON_NOTES_TIGHT_T_MIN = -Math.PI / 66;
export const HEXACONTAHEXAGON_NOTES_TIGHT_T_MAX = Math.PI / 66;
export const HEXACONTAHEXAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXACONTAHEXAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXACONTAHEXAGON_NOTES_SHAPE_HEXACONTAHEXAGON = 'hexacontahexagon';
export const HEXACONTAHEXAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXACONTAHEXAGON_NOTES_SHAPES = [
    HEXACONTAHEXAGON_NOTES_SHAPE_STANDARD,
    HEXACONTAHEXAGON_NOTES_SHAPE_INVERTED,
    HEXACONTAHEXAGON_NOTES_SHAPE_HEXACONTAHEXAGON,
    HEXACONTAHEXAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAGON_NOTES_MIN_A = 1;
export const HEPTACONTAGON_NOTES_MAX_A = 8;
export const HEPTACONTAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAGON_NOTES_HEPTACONTAGON_T_MIN = 0;
export const HEPTACONTAGON_NOTES_HEPTACONTAGON_T_MAX = 2 * Math.PI / 67;
export const HEPTACONTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 67;
export const HEPTACONTAGON_NOTES_TIGHT_T_MAX = Math.PI / 67;
export const HEPTACONTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAGON_NOTES_SHAPE_HEPTACONTAGON = 'heptacontagon';
export const HEPTACONTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAGON_NOTES_SHAPES = [
    HEPTACONTAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAGON_NOTES_SHAPE_HEPTACONTAGON,
    HEPTACONTAGON_NOTES_SHAPE_TIGHT
];

export const HEXACONTAOCTAGON_NOTES_MIN_LENGTH = 8;
export const HEXACONTAOCTAGON_NOTES_MAX_LENGTH = 64;
export const HEXACONTAOCTAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXACONTAOCTAGON_NOTES_MIN_A = 1;
export const HEXACONTAOCTAGON_NOTES_MAX_A = 8;
export const HEXACONTAOCTAGON_NOTES_DEFAULT_A = 4;
export const HEXACONTAOCTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXACONTAOCTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXACONTAOCTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXACONTAOCTAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXACONTAOCTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXACONTAOCTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXACONTAOCTAGON_NOTES_INVERTED_T_MAX = 0;
export const HEXACONTAOCTAGON_NOTES_HEXACONTAOCTAGON_T_MIN = 0;
export const HEXACONTAOCTAGON_NOTES_HEXACONTAOCTAGON_T_MAX = 2 * Math.PI / 68;
export const HEXACONTAOCTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 68;
export const HEXACONTAOCTAGON_NOTES_TIGHT_T_MAX = Math.PI / 68;
export const HEXACONTAOCTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXACONTAOCTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXACONTAOCTAGON_NOTES_SHAPE_HEXACONTAOCTAGON = 'hexacontaoctagon';
export const HEXACONTAOCTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXACONTAOCTAGON_NOTES_SHAPES = [
    HEXACONTAOCTAGON_NOTES_SHAPE_STANDARD,
    HEXACONTAOCTAGON_NOTES_SHAPE_INVERTED,
    HEXACONTAOCTAGON_NOTES_SHAPE_HEXACONTAOCTAGON,
    HEXACONTAOCTAGON_NOTES_SHAPE_TIGHT
];

export const HEXACONTENNEAGON_NOTES_MIN_LENGTH = 8;
export const HEXACONTENNEAGON_NOTES_MAX_LENGTH = 64;
export const HEXACONTENNEAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXACONTENNEAGON_NOTES_MIN_A = 1;
export const HEXACONTENNEAGON_NOTES_MAX_A = 8;
export const HEXACONTENNEAGON_NOTES_DEFAULT_A = 4;
export const HEXACONTENNEAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXACONTENNEAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXACONTENNEAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXACONTENNEAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXACONTENNEAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXACONTENNEAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXACONTENNEAGON_NOTES_INVERTED_T_MAX = 0;
export const HEXACONTENNEAGON_NOTES_HEXACONTENNEAGON_T_MIN = 0;
export const HEXACONTENNEAGON_NOTES_HEXACONTENNEAGON_T_MAX = 2 * Math.PI / 69;
export const HEXACONTENNEAGON_NOTES_TIGHT_T_MIN = -Math.PI / 69;
export const HEXACONTENNEAGON_NOTES_TIGHT_T_MAX = Math.PI / 69;
export const HEXACONTENNEAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXACONTENNEAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXACONTENNEAGON_NOTES_SHAPE_HEXACONTENNEAGON = 'hexacontenneagon';
export const HEXACONTENNEAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXACONTENNEAGON_NOTES_SHAPES = [
    HEXACONTENNEAGON_NOTES_SHAPE_STANDARD,
    HEXACONTENNEAGON_NOTES_SHAPE_INVERTED,
    HEXACONTENNEAGON_NOTES_SHAPE_HEXACONTENNEAGON,
    HEXACONTENNEAGON_NOTES_SHAPE_TIGHT
];

export const HEXACONTADECAGON_NOTES_MIN_LENGTH = 8;
export const HEXACONTADECAGON_NOTES_MAX_LENGTH = 64;
export const HEXACONTADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEXACONTADECAGON_NOTES_MIN_A = 1;
export const HEXACONTADECAGON_NOTES_MAX_A = 8;
export const HEXACONTADECAGON_NOTES_DEFAULT_A = 4;
export const HEXACONTADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEXACONTADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEXACONTADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEXACONTADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEXACONTADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEXACONTADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEXACONTADECAGON_NOTES_INVERTED_T_MAX = 0;
export const HEXACONTADECAGON_NOTES_HEXACONTADECAGON_T_MIN = 0;
export const HEXACONTADECAGON_NOTES_HEXACONTADECAGON_T_MAX = 2 * Math.PI / 70;
export const HEXACONTADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 70;
export const HEXACONTADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 70;
export const HEXACONTADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEXACONTADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEXACONTADECAGON_NOTES_SHAPE_HEXACONTADECAGON = 'hexacontadecagon';
export const HEXACONTADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEXACONTADECAGON_NOTES_SHAPES = [
    HEXACONTADECAGON_NOTES_SHAPE_STANDARD,
    HEXACONTADECAGON_NOTES_SHAPE_INVERTED,
    HEXACONTADECAGON_NOTES_SHAPE_HEXACONTADECAGON,
    HEXACONTADECAGON_NOTES_SHAPE_TIGHT
];


// Day 822: Heptacontahenagon (71-cusped Hypocycloid) Notes
export const HEPTACONTAHENAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAHENAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAHENAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAHENAGON_NOTES_MIN_A = 1;
export const HEPTACONTAHENAGON_NOTES_MAX_A = 8;
export const HEPTACONTAHENAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAHENAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAHENAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAHENAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAHENAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAHENAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAHENAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAHENAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAHENAGON_NOTES_HEPTACONTAHENAGON_T_MIN = 0;
export const HEPTACONTAHENAGON_NOTES_HEPTACONTAHENAGON_T_MAX = 2 * Math.PI / 71;
export const HEPTACONTAHENAGON_NOTES_TIGHT_T_MIN = -Math.PI / 71;
export const HEPTACONTAHENAGON_NOTES_TIGHT_T_MAX = Math.PI / 71;
export const HEPTACONTAHENAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAHENAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAHENAGON_NOTES_SHAPE_HEPTACONTAHENAGON = 'heptacontahenagon';
export const HEPTACONTAHENAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAHENAGON_NOTES_SHAPES = [
    HEPTACONTAHENAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAHENAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAHENAGON_NOTES_SHAPE_HEPTACONTAHENAGON,
    HEPTACONTAHENAGON_NOTES_SHAPE_TIGHT
];

// Day 823: Heptacontadigon (72-cusped Hypocycloid) Notes constants
export const HEPTACONTADIGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTADIGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTADIGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTADIGON_NOTES_MIN_A = 1;
export const HEPTACONTADIGON_NOTES_MAX_A = 8;
export const HEPTACONTADIGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTADIGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTADIGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTADIGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTADIGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTADIGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTADIGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTADIGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTADIGON_NOTES_HEPTACONTADIGON_T_MIN = 0;
export const HEPTACONTADIGON_NOTES_HEPTACONTADIGON_T_MAX = 2 * Math.PI / 72;
export const HEPTACONTADIGON_NOTES_TIGHT_T_MIN = -Math.PI / 72;
export const HEPTACONTADIGON_NOTES_TIGHT_T_MAX = Math.PI / 72;
export const HEPTACONTADIGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTADIGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTADIGON_NOTES_SHAPE_HEPTACONTADIGON = 'heptacontadigon';
export const HEPTACONTADIGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTADIGON_NOTES_SHAPES = [
    HEPTACONTADIGON_NOTES_SHAPE_STANDARD,
    HEPTACONTADIGON_NOTES_SHAPE_INVERTED,
    HEPTACONTADIGON_NOTES_SHAPE_HEPTACONTADIGON,
    HEPTACONTADIGON_NOTES_SHAPE_TIGHT
];


export const HEPTACONTATRIGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTATRIGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTATRIGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTATRIGON_NOTES_MIN_A = 1;
export const HEPTACONTATRIGON_NOTES_MAX_A = 8;
export const HEPTACONTATRIGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTATRIGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTATRIGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTATRIGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTATRIGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTATRIGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTATRIGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTATRIGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTATRIGON_NOTES_HEPTACONTATRIGON_T_MIN = 0;
export const HEPTACONTATRIGON_NOTES_HEPTACONTATRIGON_T_MAX = 2 * Math.PI / 73;
export const HEPTACONTATRIGON_NOTES_TIGHT_T_MIN = -Math.PI / 73;
export const HEPTACONTATRIGON_NOTES_TIGHT_T_MAX = Math.PI / 73;
export const HEPTACONTATRIGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTATRIGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTATRIGON_NOTES_SHAPE_HEPTACONTATRIGON = 'heptacontatrigon';
export const HEPTACONTATRIGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTATRIGON_NOTES_SHAPES = [
    HEPTACONTATRIGON_NOTES_SHAPE_STANDARD,
    HEPTACONTATRIGON_NOTES_SHAPE_INVERTED,
    HEPTACONTATRIGON_NOTES_SHAPE_HEPTACONTATRIGON,
    HEPTACONTATRIGON_NOTES_SHAPE_TIGHT
];


export const HEPTACONTATETRAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTATETRAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTATETRAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTATETRAGON_NOTES_MIN_A = 1;
export const HEPTACONTATETRAGON_NOTES_MAX_A = 8;
export const HEPTACONTATETRAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTATETRAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTATETRAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTATETRAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTATETRAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTATETRAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTATETRAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTATETRAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTATETRAGON_NOTES_HEPTACONTATETRAGON_T_MIN = 0;
export const HEPTACONTATETRAGON_NOTES_HEPTACONTATETRAGON_T_MAX = 2 * Math.PI / 74;
export const HEPTACONTATETRAGON_NOTES_TIGHT_T_MIN = -Math.PI / 74;
export const HEPTACONTATETRAGON_NOTES_TIGHT_T_MAX = Math.PI / 74;
export const HEPTACONTATETRAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTATETRAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTATETRAGON_NOTES_SHAPE_HEPTACONTATETRAGON = 'heptacontatetragon';
export const HEPTACONTATETRAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTATETRAGON_NOTES_SHAPES = [
    HEPTACONTATETRAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTATETRAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTATETRAGON_NOTES_SHAPE_HEPTACONTATETRAGON,
    HEPTACONTATETRAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAPENTAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAPENTAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAPENTAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAPENTAGON_NOTES_MIN_A = 1;
export const HEPTACONTAPENTAGON_NOTES_MAX_A = 8;
export const HEPTACONTAPENTAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAPENTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAPENTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAPENTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAPENTAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAPENTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAPENTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAPENTAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAPENTAGON_NOTES_HEPTACONTAPENTAGON_T_MIN = 0;
export const HEPTACONTAPENTAGON_NOTES_HEPTACONTAPENTAGON_T_MAX = 2 * Math.PI / 75;
export const HEPTACONTAPENTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 75;
export const HEPTACONTAPENTAGON_NOTES_TIGHT_T_MAX = Math.PI / 75;
export const HEPTACONTAPENTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAPENTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAPENTAGON_NOTES_SHAPE_HEPTACONTAPENTAGON = 'heptacontapentagon';
export const HEPTACONTAPENTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAPENTAGON_NOTES_SHAPES = [
    HEPTACONTAPENTAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAPENTAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAPENTAGON_NOTES_SHAPE_HEPTACONTAPENTAGON,
    HEPTACONTAPENTAGON_NOTES_SHAPE_TIGHT
];


export const HEPTACONTAHEXAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAHEXAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAHEXAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAHEXAGON_NOTES_MIN_A = 1;
export const HEPTACONTAHEXAGON_NOTES_MAX_A = 8;
export const HEPTACONTAHEXAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAHEXAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAHEXAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAHEXAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAHEXAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAHEXAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAHEXAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAHEXAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAHEXAGON_NOTES_HEPTACONTAHEXAGON_T_MIN = 0;
export const HEPTACONTAHEXAGON_NOTES_HEPTACONTAHEXAGON_T_MAX = 2 * Math.PI / 76;
export const HEPTACONTAHEXAGON_NOTES_TIGHT_T_MIN = -Math.PI / 76;
export const HEPTACONTAHEXAGON_NOTES_TIGHT_T_MAX = Math.PI / 76;
export const HEPTACONTAHEXAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAHEXAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAHEXAGON_NOTES_SHAPE_HEPTACONTAHEXAGON = 'heptacontahexagon';
export const HEPTACONTAHEXAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAHEXAGON_NOTES_SHAPES = [
    HEPTACONTAHEXAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAHEXAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAHEXAGON_NOTES_SHAPE_HEPTACONTAHEXAGON,
    HEPTACONTAHEXAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAHEPTAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAHEPTAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAHEPTAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAHEPTAGON_NOTES_MIN_A = 1;
export const HEPTACONTAHEPTAGON_NOTES_MAX_A = 8;
export const HEPTACONTAHEPTAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAHEPTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAHEPTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAHEPTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAHEPTAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAHEPTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAHEPTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAHEPTAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAHEPTAGON_NOTES_HEPTACONTAHEPTAGON_T_MIN = 0;
export const HEPTACONTAHEPTAGON_NOTES_HEPTACONTAHEPTAGON_T_MAX = 2 * Math.PI / 77;
export const HEPTACONTAHEPTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 77;
export const HEPTACONTAHEPTAGON_NOTES_TIGHT_T_MAX = Math.PI / 77;
export const HEPTACONTAHEPTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAHEPTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAHEPTAGON_NOTES_SHAPE_HEPTACONTAHEPTAGON = 'heptacontaheptagon';
export const HEPTACONTAHEPTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAHEPTAGON_NOTES_SHAPES = [
    HEPTACONTAHEPTAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAHEPTAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAHEPTAGON_NOTES_SHAPE_HEPTACONTAHEPTAGON,
    HEPTACONTAHEPTAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAOCTAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAOCTAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAOCTAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAOCTAGON_NOTES_MIN_A = 1;
export const HEPTACONTAOCTAGON_NOTES_MAX_A = 8;
export const HEPTACONTAOCTAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAOCTAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAOCTAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAOCTAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAOCTAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAOCTAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAOCTAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAOCTAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAOCTAGON_NOTES_HEPTACONTAOCTAGON_T_MIN = 0;
export const HEPTACONTAOCTAGON_NOTES_HEPTACONTAOCTAGON_T_MAX = 2 * Math.PI / 78;
export const HEPTACONTAOCTAGON_NOTES_TIGHT_T_MIN = -Math.PI / 78;
export const HEPTACONTAOCTAGON_NOTES_TIGHT_T_MAX = Math.PI / 78;
export const HEPTACONTAOCTAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAOCTAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAOCTAGON_NOTES_SHAPE_HEPTACONTAOCTAGON = 'heptacontaoctagon';
export const HEPTACONTAOCTAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAOCTAGON_NOTES_SHAPES = [
    HEPTACONTAOCTAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAOCTAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAOCTAGON_NOTES_SHAPE_HEPTACONTAOCTAGON,
    HEPTACONTAOCTAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTANENNEGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTANENNEGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTANENNEGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTANENNEGON_NOTES_MIN_A = 1;
export const HEPTACONTANENNEGON_NOTES_MAX_A = 8;
export const HEPTACONTANENNEGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTANENNEGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTANENNEGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTANENNEGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTANENNEGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTANENNEGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTANENNEGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTANENNEGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTANENNEGON_NOTES_HEPTACONTANENNEGON_T_MIN = 0;
export const HEPTACONTANENNEGON_NOTES_HEPTACONTANENNEGON_T_MAX = 2 * Math.PI / 79;
export const HEPTACONTANENNEGON_NOTES_TIGHT_T_MIN = -Math.PI / 79;
export const HEPTACONTANENNEGON_NOTES_TIGHT_T_MAX = Math.PI / 79;
export const HEPTACONTANENNEGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTANENNEGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTANENNEGON_NOTES_SHAPE_HEPTACONTANENNEGON = 'heptacontanennegon';
export const HEPTACONTANENNEGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTANENNEGON_NOTES_SHAPES = [
    HEPTACONTANENNEGON_NOTES_SHAPE_STANDARD,
    HEPTACONTANENNEGON_NOTES_SHAPE_INVERTED,
    HEPTACONTANENNEGON_NOTES_SHAPE_HEPTACONTANENNEGON,
    HEPTACONTANENNEGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTADECAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTADECAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTADECAGON_NOTES_MIN_A = 1;
export const HEPTACONTADECAGON_NOTES_MAX_A = 8;
export const HEPTACONTADECAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTADECAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTADECAGON_NOTES_HEPTACONTADECAGON_T_MIN = 0;
export const HEPTACONTADECAGON_NOTES_HEPTACONTADECAGON_T_MAX = 2 * Math.PI / 80;
export const HEPTACONTADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 80;
export const HEPTACONTADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 80;
export const HEPTACONTADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTADECAGON_NOTES_SHAPE_HEPTACONTADECAGON = 'heptacontadecagon';
export const HEPTACONTADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTADECAGON_NOTES_SHAPES = [
    HEPTACONTADECAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTADECAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTADECAGON_NOTES_SHAPE_HEPTACONTADECAGON,
    HEPTACONTADECAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAHENADECAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAHENADECAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAHENADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAHENADECAGON_NOTES_MIN_A = 1;
export const HEPTACONTAHENADECAGON_NOTES_MAX_A = 8;
export const HEPTACONTAHENADECAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAHENADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAHENADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAHENADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAHENADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAHENADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAHENADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAHENADECAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAHENADECAGON_NOTES_HEPTACONTAHENADECAGON_T_MIN = 0;
export const HEPTACONTAHENADECAGON_NOTES_HEPTACONTAHENADECAGON_T_MAX = 2 * Math.PI / 81;
export const HEPTACONTAHENADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 81;
export const HEPTACONTAHENADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 81;
export const HEPTACONTAHENADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAHENADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAHENADECAGON_NOTES_SHAPE_HEPTACONTAHENADECAGON = 'heptacontahenadecagon';
export const HEPTACONTAHENADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAHENADECAGON_NOTES_SHAPES = [
    HEPTACONTAHENADECAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAHENADECAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAHENADECAGON_NOTES_SHAPE_HEPTACONTAHENADECAGON,
    HEPTACONTAHENADECAGON_NOTES_SHAPE_TIGHT
];
export const HEPTACONTADODECAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTADODECAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTADODECAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTADODECAGON_NOTES_MIN_A = 1;
export const HEPTACONTADODECAGON_NOTES_MAX_A = 8;
export const HEPTACONTADODECAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTADODECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTADODECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTADODECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTADODECAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTADODECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTADODECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTADODECAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTADODECAGON_NOTES_HEPTACONTADODECAGON_T_MIN = 0;
export const HEPTACONTADODECAGON_NOTES_HEPTACONTADODECAGON_T_MAX = 2 * Math.PI / 82;
export const HEPTACONTADODECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 82;
export const HEPTACONTADODECAGON_NOTES_TIGHT_T_MAX = Math.PI / 82;
export const HEPTACONTADODECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTADODECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTADODECAGON_NOTES_SHAPE_HEPTACONTADODECAGON = 'heptacontadodecagon';
export const HEPTACONTADODECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTADODECAGON_NOTES_SHAPES = [
    HEPTACONTADODECAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTADODECAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTADODECAGON_NOTES_SHAPE_HEPTACONTADODECAGON,
    HEPTACONTADODECAGON_NOTES_SHAPE_TIGHT
];
export const HEPTACONTATRIDECAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTATRIDECAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTATRIDECAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTATRIDECAGON_NOTES_MIN_A = 1;
export const HEPTACONTATRIDECAGON_NOTES_MAX_A = 8;
export const HEPTACONTATRIDECAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTATRIDECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTATRIDECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTATRIDECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTATRIDECAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTATRIDECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTATRIDECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTATRIDECAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTATRIDECAGON_NOTES_HEPTACONTATRIDECAGON_T_MIN = 0;
export const HEPTACONTATRIDECAGON_NOTES_HEPTACONTATRIDECAGON_T_MAX = 2 * Math.PI / 83;
export const HEPTACONTATRIDECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 83;
export const HEPTACONTATRIDECAGON_NOTES_TIGHT_T_MAX = Math.PI / 83;
export const HEPTACONTATRIDECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTATRIDECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTATRIDECAGON_NOTES_SHAPE_HEPTACONTATRIDECAGON = 'heptacontatridecagon';
export const HEPTACONTATRIDECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTATRIDECAGON_NOTES_SHAPES = [
    HEPTACONTATRIDECAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTATRIDECAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTATRIDECAGON_NOTES_SHAPE_HEPTACONTATRIDECAGON,
    HEPTACONTATRIDECAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTATETRADECAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTATETRADECAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTATETRADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTATETRADECAGON_NOTES_MIN_A = 1;
export const HEPTACONTATETRADECAGON_NOTES_MAX_A = 8;
export const HEPTACONTATETRADECAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTATETRADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTATETRADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTATETRADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTATETRADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTATETRADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTATETRADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTATETRADECAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTATETRADECAGON_NOTES_HEPTACONTATETRADECAGON_T_MIN = 0;
export const HEPTACONTATETRADECAGON_NOTES_HEPTACONTATETRADECAGON_T_MAX = 2 * Math.PI / 84;
export const HEPTACONTATETRADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 84;
export const HEPTACONTATETRADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 84;
export const HEPTACONTATETRADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTATETRADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTATETRADECAGON_NOTES_SHAPE_HEPTACONTATETRADECAGON = 'heptacontatetradecagon';
export const HEPTACONTATETRADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTATETRADECAGON_NOTES_SHAPES = [
    HEPTACONTATETRADECAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTATETRADECAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTATETRADECAGON_NOTES_SHAPE_HEPTACONTATETRADECAGON,
    HEPTACONTATETRADECAGON_NOTES_SHAPE_TIGHT
];

// Day 836: Heptacontapentadecagon (85-cusped Hypocycloid) Notes - 85-cusped hypocycloid
// 85 = 5 * 17 IS CONSTRUCTIBLE per Gauss-Wantzel 1837 (5 and 17 are both Fermat primes)
export const HEPTACONTAPENTADECAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAPENTADECAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAPENTADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAPENTADECAGON_NOTES_MIN_A = 1;
export const HEPTACONTAPENTADECAGON_NOTES_MAX_A = 8;
export const HEPTACONTAPENTADECAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAPENTADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAPENTADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAPENTADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAPENTADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAPENTADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAPENTADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAPENTADECAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAPENTADECAGON_NOTES_HEPTACONTAPENTADECAGON_T_MIN = 0;
export const HEPTACONTAPENTADECAGON_NOTES_HEPTACONTAPENTADECAGON_T_MAX = 2 * Math.PI / 85;
export const HEPTACONTAPENTADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 85;
export const HEPTACONTAPENTADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 85;
export const HEPTACONTAPENTADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAPENTADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAPENTADECAGON_NOTES_SHAPE_HEPTACONTAPENTADECAGON = 'heptacontapentadecagon';
export const HEPTACONTAPENTADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAPENTADECAGON_NOTES_SHAPES = [
    HEPTACONTAPENTADECAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAPENTADECAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAPENTADECAGON_NOTES_SHAPE_HEPTACONTAPENTADECAGON,
    HEPTACONTAPENTADECAGON_NOTES_SHAPE_TIGHT
];

// Day 837: Heptacontahexadecagon (86-cusped Hypocycloid) Notes - 86-cusped hypocycloid
// 86 = 2 * 43 is NOT constructible per Gauss-Wantzel 1837 (2 is a power of 2 but 43 is prime and NOT a Fermat prime)
export const HEPTACONTAHEXADECAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAHEXADECAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAHEXADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAHEXADECAGON_NOTES_MIN_A = 1;
export const HEPTACONTAHEXADECAGON_NOTES_MAX_A = 8;
export const HEPTACONTAHEXADECAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAHEXADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAHEXADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAHEXADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAHEXADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAHEXADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAHEXADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAHEXADECAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAHEXADECAGON_NOTES_HEPTACONTAHEXADECAGON_T_MIN = 0;
export const HEPTACONTAHEXADECAGON_NOTES_HEPTACONTAHEXADECAGON_T_MAX = 2 * Math.PI / 86;
export const HEPTACONTAHEXADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 86;
export const HEPTACONTAHEXADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 86;
export const HEPTACONTAHEXADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAHEXADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAHEXADECAGON_NOTES_SHAPE_HEPTACONTAHEXADECAGON = 'heptacontahexadecagon';
export const HEPTACONTAHEXADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAHEXADECAGON_NOTES_SHAPES = [
    HEPTACONTAHEXADECAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAHEXADECAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAHEXADECAGON_NOTES_SHAPE_HEPTACONTAHEXADECAGON,
    HEPTACONTAHEXADECAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAKAIHEPTADECAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_MIN_A = 1;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_MAX_A = 8;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_HEPTACONTAKAIHEPTADECAGON_T_MIN = 0;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_HEPTACONTAKAIHEPTADECAGON_T_MAX = 2 * Math.PI / 87;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 87;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 87;
export const HEPTACONTAKAIHEPTADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAKAIHEPTADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAKAIHEPTADECAGON_NOTES_SHAPE_HEPTACONTAKAIHEPTADECAGON = 'heptacontakaiheptadecagon';
export const HEPTACONTAKAIHEPTADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAKAIHEPTADECAGON_NOTES_SHAPES = [
    HEPTACONTAKAIHEPTADECAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAKAIHEPTADECAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAKAIHEPTADECAGON_NOTES_SHAPE_HEPTACONTAKAIHEPTADECAGON,
    HEPTACONTAKAIHEPTADECAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAOCTADECAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAOCTADECAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAOCTADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAOCTADECAGON_NOTES_MIN_A = 1;
export const HEPTACONTAOCTADECAGON_NOTES_MAX_A = 8;
export const HEPTACONTAOCTADECAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAOCTADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAOCTADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAOCTADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAOCTADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAOCTADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAOCTADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAOCTADECAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAOCTADECAGON_NOTES_HEPTACONTAOCTADECAGON_T_MIN = 0;
export const HEPTACONTAOCTADECAGON_NOTES_HEPTACONTAOCTADECAGON_T_MAX = 2 * Math.PI / 88;
export const HEPTACONTAOCTADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 88;
export const HEPTACONTAOCTADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 88;
export const HEPTACONTAOCTADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAOCTADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAOCTADECAGON_NOTES_SHAPE_HEPTACONTAOCTADECAGON = 'heptacontaoctadecagon';
export const HEPTACONTAOCTADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAOCTADECAGON_NOTES_SHAPES = [
    HEPTACONTAOCTADECAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAOCTADECAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAOCTADECAGON_NOTES_SHAPE_HEPTACONTAOCTADECAGON,
    HEPTACONTAOCTADECAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAKAIENNEADECAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAKAIENNEADECAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAKAIENNEADECAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAKAIENNEADECAGON_NOTES_MIN_A = 1;
export const HEPTACONTAKAIENNEADECAGON_NOTES_MAX_A = 8;
export const HEPTACONTAKAIENNEADECAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAKAIENNEADECAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAKAIENNEADECAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAKAIENNEADECAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAKAIENNEADECAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAKAIENNEADECAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAKAIENNEADECAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAKAIENNEADECAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAKAIENNEADECAGON_NOTES_HEPTACONTAKAIENNEADECAGON_T_MIN = 0;
export const HEPTACONTAKAIENNEADECAGON_NOTES_HEPTACONTAKAIENNEADECAGON_T_MAX = 2 * Math.PI / 89;
export const HEPTACONTAKAIENNEADECAGON_NOTES_TIGHT_T_MIN = -Math.PI / 89;
export const HEPTACONTAKAIENNEADECAGON_NOTES_TIGHT_T_MAX = Math.PI / 89;
export const HEPTACONTAKAIENNEADECAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAKAIENNEADECAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAKAIENNEADECAGON_NOTES_SHAPE_HEPTACONTAKAIENNEADECAGON = 'heptacontakaienneadecagon';
export const HEPTACONTAKAIENNEADECAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAKAIENNEADECAGON_NOTES_SHAPES = [
    HEPTACONTAKAIENNEADECAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAKAIENNEADECAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAKAIENNEADECAGON_NOTES_SHAPE_HEPTACONTAKAIENNEADECAGON,
    HEPTACONTAKAIENNEADECAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAEICOSAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAEICOSAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAEICOSAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAEICOSAGON_NOTES_MIN_A = 1;
export const HEPTACONTAEICOSAGON_NOTES_MAX_A = 8;
export const HEPTACONTAEICOSAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAEICOSAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAEICOSAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAEICOSAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAEICOSAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAEICOSAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAEICOSAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAEICOSAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAEICOSAGON_NOTES_HEPTACONTAEICOSAGON_T_MIN = 0;
export const HEPTACONTAEICOSAGON_NOTES_HEPTACONTAEICOSAGON_T_MAX = 2 * Math.PI / 90;
export const HEPTACONTAEICOSAGON_NOTES_TIGHT_T_MIN = -Math.PI / 90;
export const HEPTACONTAEICOSAGON_NOTES_TIGHT_T_MAX = Math.PI / 90;
export const HEPTACONTAEICOSAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAEICOSAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAEICOSAGON_NOTES_SHAPE_HEPTACONTAEICOSAGON = 'heptacontaeicosagon';
export const HEPTACONTAEICOSAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAEICOSAGON_NOTES_SHAPES = [
    HEPTACONTAEICOSAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAEICOSAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAEICOSAGON_NOTES_SHAPE_HEPTACONTAEICOSAGON,
    HEPTACONTAEICOSAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAHENICOSAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAHENICOSAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAHENICOSAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAHENICOSAGON_NOTES_MIN_A = 1;
export const HEPTACONTAHENICOSAGON_NOTES_MAX_A = 8;
export const HEPTACONTAHENICOSAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAHENICOSAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAHENICOSAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAHENICOSAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAHENICOSAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAHENICOSAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAHENICOSAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAHENICOSAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAHENICOSAGON_NOTES_HEPTACONTAHENICOSAGON_T_MIN = 0;
export const HEPTACONTAHENICOSAGON_NOTES_HEPTACONTAHENICOSAGON_T_MAX = 2 * Math.PI / 91;
export const HEPTACONTAHENICOSAGON_NOTES_TIGHT_T_MIN = -Math.PI / 91;
export const HEPTACONTAHENICOSAGON_NOTES_TIGHT_T_MAX = Math.PI / 91;
export const HEPTACONTAHENICOSAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAHENICOSAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAHENICOSAGON_NOTES_SHAPE_HEPTACONTAHENICOSAGON = 'heptacontahenicosagon';
export const HEPTACONTAHENICOSAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAHENICOSAGON_NOTES_SHAPES = [
    HEPTACONTAHENICOSAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAHENICOSAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAHENICOSAGON_NOTES_SHAPE_HEPTACONTAHENICOSAGON,
    HEPTACONTAHENICOSAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTADIKOSEXAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTADIKOSEXAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTADIKOSEXAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTADIKOSEXAGON_NOTES_MIN_A = 1;
export const HEPTACONTADIKOSEXAGON_NOTES_MAX_A = 8;
export const HEPTACONTADIKOSEXAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTADIKOSEXAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTADIKOSEXAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTADIKOSEXAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTADIKOSEXAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTADIKOSEXAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTADIKOSEXAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTADIKOSEXAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTADIKOSEXAGON_NOTES_HEPTACONTADIKOSEXAGON_T_MIN = 0;
export const HEPTACONTADIKOSEXAGON_NOTES_HEPTACONTADIKOSEXAGON_T_MAX = 2 * Math.PI / 92;
export const HEPTACONTADIKOSEXAGON_NOTES_TIGHT_T_MIN = -Math.PI / 92;
export const HEPTACONTADIKOSEXAGON_NOTES_TIGHT_T_MAX = Math.PI / 92;
export const HEPTACONTADIKOSEXAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTADIKOSEXAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTADIKOSEXAGON_NOTES_SHAPE_HEPTACONTADIKOSEXAGON = 'heptacontadikosexagon';
export const HEPTACONTADIKOSEXAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTADIKOSEXAGON_NOTES_SHAPES = [
    HEPTACONTADIKOSEXAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTADIKOSEXAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTADIKOSEXAGON_NOTES_SHAPE_HEPTACONTADIKOSEXAGON,
    HEPTACONTADIKOSEXAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTATRISEXAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTATRISEXAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTATRISEXAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTATRISEXAGON_NOTES_MIN_A = 1;
export const HEPTACONTATRISEXAGON_NOTES_MAX_A = 8;
export const HEPTACONTATRISEXAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTATRISEXAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTATRISEXAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTATRISEXAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTATRISEXAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTATRISEXAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTATRISEXAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTATRISEXAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTATRISEXAGON_NOTES_HEPTACONTATRISEXAGON_T_MIN = 0;
export const HEPTACONTATRISEXAGON_NOTES_HEPTACONTATRISEXAGON_T_MAX = 2 * Math.PI / 93;
export const HEPTACONTATRISEXAGON_NOTES_TIGHT_T_MIN = -Math.PI / 93;
export const HEPTACONTATRISEXAGON_NOTES_TIGHT_T_MAX = Math.PI / 93;
export const HEPTACONTATRISEXAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTATRISEXAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTATRISEXAGON_NOTES_SHAPE_HEPTACONTATRISEXAGON = 'heptacontatrisexagon';
export const HEPTACONTATRISEXAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTATRISEXAGON_NOTES_SHAPES = [
    HEPTACONTATRISEXAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTATRISEXAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTATRISEXAGON_NOTES_SHAPE_HEPTACONTATRISEXAGON,
    HEPTACONTATRISEXAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTATETRAXAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTATETRAXAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTATETRAXAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTATETRAXAGON_NOTES_MIN_A = 1;
export const HEPTACONTATETRAXAGON_NOTES_MAX_A = 8;
export const HEPTACONTATETRAXAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTATETRAXAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTATETRAXAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTATETRAXAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTATETRAXAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTATETRAXAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTATETRAXAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTATETRAXAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTATETRAXAGON_NOTES_HEPTACONTATETRAXAGON_T_MIN = 0;
export const HEPTACONTATETRAXAGON_NOTES_HEPTACONTATETRAXAGON_T_MAX = 2 * Math.PI / 94;
export const HEPTACONTATETRAXAGON_NOTES_TIGHT_T_MIN = -Math.PI / 94;
export const HEPTACONTATETRAXAGON_NOTES_TIGHT_T_MAX = Math.PI / 94;
export const HEPTACONTATETRAXAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTATETRAXAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTATETRAXAGON_NOTES_SHAPE_HEPTACONTATETRAXAGON = 'heptacontatetraxagon';
export const HEPTACONTATETRAXAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTATETRAXAGON_NOTES_SHAPES = [
    HEPTACONTATETRAXAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTATETRAXAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTATETRAXAGON_NOTES_SHAPE_HEPTACONTATETRAXAGON,
    HEPTACONTATETRAXAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAPENTAXAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAPENTAXAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAPENTAXAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAPENTAXAGON_NOTES_MIN_A = 1;
export const HEPTACONTAPENTAXAGON_NOTES_MAX_A = 8;
export const HEPTACONTAPENTAXAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAPENTAXAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAPENTAXAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAPENTAXAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAPENTAXAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAPENTAXAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAPENTAXAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAPENTAXAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAPENTAXAGON_NOTES_HEPTACONTAPENTAXAGON_T_MIN = 0;
export const HEPTACONTAPENTAXAGON_NOTES_HEPTACONTAPENTAXAGON_T_MAX = 2 * Math.PI / 95;
export const HEPTACONTAPENTAXAGON_NOTES_TIGHT_T_MIN = -Math.PI / 95;
export const HEPTACONTAPENTAXAGON_NOTES_TIGHT_T_MAX = Math.PI / 95;
export const HEPTACONTAPENTAXAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAPENTAXAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAPENTAXAGON_NOTES_SHAPE_HEPTACONTAPENTAXAGON = 'heptacontapentaxagon';
export const HEPTACONTAPENTAXAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAPENTAXAGON_NOTES_SHAPES = [
    HEPTACONTAPENTAXAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAPENTAXAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAPENTAXAGON_NOTES_SHAPE_HEPTACONTAPENTAXAGON,
    HEPTACONTAPENTAXAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAHEXAXAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAHEXAXAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAHEXAXAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAHEXAXAGON_NOTES_MIN_A = 1;
export const HEPTACONTAHEXAXAGON_NOTES_MAX_A = 8;
export const HEPTACONTAHEXAXAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAHEXAXAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAHEXAXAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAHEXAXAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAHEXAXAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAHEXAXAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAHEXAXAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAHEXAXAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAHEXAXAGON_NOTES_HEPTACONTAHEXAXAGON_T_MIN = 0;
export const HEPTACONTAHEXAXAGON_NOTES_HEPTACONTAHEXAXAGON_T_MAX = 2 * Math.PI / 96;
export const HEPTACONTAHEXAXAGON_NOTES_TIGHT_T_MIN = -Math.PI / 96;
export const HEPTACONTAHEXAXAGON_NOTES_TIGHT_T_MAX = Math.PI / 96;
export const HEPTACONTAHEXAXAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAHEXAXAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAHEXAXAGON_NOTES_SHAPE_HEPTACONTAHEXAXAGON = 'heptacontahexaxagon';
export const HEPTACONTAHEXAXAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAHEXAXAGON_NOTES_SHAPES = [
    HEPTACONTAHEXAXAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAHEXAXAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAHEXAXAGON_NOTES_SHAPE_HEPTACONTAHEXAXAGON,
    HEPTACONTAHEXAXAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAHEPTAXAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAHEPTAXAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAHEPTAXAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAHEPTAXAGON_NOTES_MIN_A = 1;
export const HEPTACONTAHEPTAXAGON_NOTES_MAX_A = 8;
export const HEPTACONTAHEPTAXAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAHEPTAXAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAHEPTAXAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAHEPTAXAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAHEPTAXAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAHEPTAXAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAHEPTAXAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAHEPTAXAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAHEPTAXAGON_NOTES_HEPTACONTAHEPTAXAGON_T_MIN = 0;
export const HEPTACONTAHEPTAXAGON_NOTES_HEPTACONTAHEPTAXAGON_T_MAX = 2 * Math.PI / 97;
export const HEPTACONTAHEPTAXAGON_NOTES_TIGHT_T_MIN = -Math.PI / 97;
export const HEPTACONTAHEPTAXAGON_NOTES_TIGHT_T_MAX = Math.PI / 97;
export const HEPTACONTAHEPTAXAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAHEPTAXAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAHEPTAXAGON_NOTES_SHAPE_HEPTACONTAHEPTAXAGON = 'heptacontaheptaxagon';
export const HEPTACONTAHEPTAXAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAHEPTAXAGON_NOTES_SHAPES = [
    HEPTACONTAHEPTAXAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAHEPTAXAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAHEPTAXAGON_NOTES_SHAPE_HEPTACONTAHEPTAXAGON,
    HEPTACONTAHEPTAXAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAOCTAXAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAOCTAXAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAOCTAXAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAOCTAXAGON_NOTES_MIN_A = 1;
export const HEPTACONTAOCTAXAGON_NOTES_MAX_A = 8;
export const HEPTACONTAOCTAXAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAOCTAXAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAOCTAXAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAOCTAXAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAOCTAXAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAOCTAXAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAOCTAXAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAOCTAXAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAOCTAXAGON_NOTES_HEPTACONTAOCTAXAGON_T_MIN = 0;
export const HEPTACONTAOCTAXAGON_NOTES_HEPTACONTAOCTAXAGON_T_MAX = 2 * Math.PI / 98;
export const HEPTACONTAOCTAXAGON_NOTES_TIGHT_T_MIN = -Math.PI / 98;
export const HEPTACONTAOCTAXAGON_NOTES_TIGHT_T_MAX = Math.PI / 98;
export const HEPTACONTAOCTAXAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAOCTAXAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAOCTAXAGON_NOTES_SHAPE_HEPTACONTAOCTAXAGON = 'heptacontaoctaxagon';
export const HEPTACONTAOCTAXAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAOCTAXAGON_NOTES_SHAPES = [
    HEPTACONTAOCTAXAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAOCTAXAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAOCTAXAGON_NOTES_SHAPE_HEPTACONTAOCTAXAGON,
    HEPTACONTAOCTAXAGON_NOTES_SHAPE_TIGHT
];

export const HEPTACONTAEPTAXAGON_NOTES_MIN_LENGTH = 8;
export const HEPTACONTAEPTAXAGON_NOTES_MAX_LENGTH = 64;
export const HEPTACONTAEPTAXAGON_NOTES_DEFAULT_LENGTH = 32;
export const HEPTACONTAEPTAXAGON_NOTES_MIN_A = 1;
export const HEPTACONTAEPTAXAGON_NOTES_MAX_A = 8;
export const HEPTACONTAEPTAXAGON_NOTES_DEFAULT_A = 4;
export const HEPTACONTAEPTAXAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HEPTACONTAEPTAXAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HEPTACONTAEPTAXAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HEPTACONTAEPTAXAGON_NOTES_DEFAULT_T_MIN = 0;
export const HEPTACONTAEPTAXAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HEPTACONTAEPTAXAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HEPTACONTAEPTAXAGON_NOTES_INVERTED_T_MAX = 0;
export const HEPTACONTAEPTAXAGON_NOTES_HEPTACONTAEPTAXAGON_T_MIN = 0;
export const HEPTACONTAEPTAXAGON_NOTES_HEPTACONTAEPTAXAGON_T_MAX = 2 * Math.PI / 99;
export const HEPTACONTAEPTAXAGON_NOTES_TIGHT_T_MIN = -Math.PI / 99;
export const HEPTACONTAEPTAXAGON_NOTES_TIGHT_T_MAX = Math.PI / 99;
export const HEPTACONTAEPTAXAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HEPTACONTAEPTAXAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HEPTACONTAEPTAXAGON_NOTES_SHAPE_HEPTACONTAEPTAXAGON = 'heptacontaeptaxagon';
export const HEPTACONTAEPTAXAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HEPTACONTAEPTAXAGON_NOTES_SHAPES = [
    HEPTACONTAEPTAXAGON_NOTES_SHAPE_STANDARD,
    HEPTACONTAEPTAXAGON_NOTES_SHAPE_INVERTED,
    HEPTACONTAEPTAXAGON_NOTES_SHAPE_HEPTACONTAEPTAXAGON,
    HEPTACONTAEPTAXAGON_NOTES_SHAPE_TIGHT
];

export const HECTOGON_NOTES_MIN_LENGTH = 8;
export const HECTOGON_NOTES_MAX_LENGTH = 64;
export const HECTOGON_NOTES_DEFAULT_LENGTH = 32;
export const HECTOGON_NOTES_MIN_A = 1;
export const HECTOGON_NOTES_MAX_A = 8;
export const HECTOGON_NOTES_DEFAULT_A = 4;
export const HECTOGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HECTOGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HECTOGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HECTOGON_NOTES_DEFAULT_T_MIN = 0;
export const HECTOGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HECTOGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HECTOGON_NOTES_INVERTED_T_MAX = 0;
export const HECTOGON_NOTES_HECTOGON_T_MIN = 0;
export const HECTOGON_NOTES_HECTOGON_T_MAX = 2 * Math.PI / 100;
export const HECTOGON_NOTES_TIGHT_T_MIN = -Math.PI / 100;
export const HECTOGON_NOTES_TIGHT_T_MAX = Math.PI / 100;
export const HECTOGON_NOTES_SHAPE_STANDARD = 'standard';
export const HECTOGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HECTOGON_NOTES_SHAPE_HECTOGON = 'hectogon';
export const HECTOGON_NOTES_SHAPE_TIGHT = 'tight';
export const HECTOGON_NOTES_SHAPES = [
    HECTOGON_NOTES_SHAPE_STANDARD,
    HECTOGON_NOTES_SHAPE_INVERTED,
    HECTOGON_NOTES_SHAPE_HECTOGON,
    HECTOGON_NOTES_SHAPE_TIGHT
];
export const HECTOHENAGON_NOTES_MIN_LENGTH = 8;
export const HECTOHENAGON_NOTES_MAX_LENGTH = 64;
export const HECTOHENAGON_NOTES_DEFAULT_LENGTH = 32;
export const HECTOHENAGON_NOTES_MIN_A = 1;
export const HECTOHENAGON_NOTES_MAX_A = 8;
export const HECTOHENAGON_NOTES_DEFAULT_A = 4;
export const HECTOHENAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HECTOHENAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HECTOHENAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HECTOHENAGON_NOTES_DEFAULT_T_MIN = 0;
export const HECTOHENAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HECTOHENAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HECTOHENAGON_NOTES_INVERTED_T_MAX = 0;
export const HECTOHENAGON_NOTES_HECTOHENAGON_T_MIN = 0;
export const HECTOHENAGON_NOTES_HECTOHENAGON_T_MAX = 2 * Math.PI / 101;
export const HECTOHENAGON_NOTES_TIGHT_T_MIN = -Math.PI / 101;
export const HECTOHENAGON_NOTES_TIGHT_T_MAX = Math.PI / 101;
export const HECTOHENAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HECTOHENAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HECTOHENAGON_NOTES_SHAPE_HECTOHENAGON = 'hectohenagon';
export const HECTOHENAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HECTOHENAGON_NOTES_SHAPES = [
    HECTOHENAGON_NOTES_SHAPE_STANDARD,
    HECTOHENAGON_NOTES_SHAPE_INVERTED,
    HECTOHENAGON_NOTES_SHAPE_HECTOHENAGON,
    HECTOHENAGON_NOTES_SHAPE_TIGHT
];
export const APP_VERSION = '2.500.0';
