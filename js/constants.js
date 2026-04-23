// js/constants.js - Shared constants for SnugOS

export const APP_VERSION = '0.59.8'; // Day 75: Fix missing test imports

export const STEPS_PER_BAR = 16;
export const defaultStepsPerBar = 16; // Default for new tracks
export const MAX_BARS = 512; // Maximum number of bars a sequence can have
export const MIN_TEMPO = 0; // Minimum tempo in BPM
export const MAX_TEMPO = 999; // Maximum tempo in BPM

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
