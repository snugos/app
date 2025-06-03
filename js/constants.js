// js/constants.js - Shared constants for SnugOS (MODIFIED)

export const APP_VERSION = "0.1.1"; // Updated version

export const STEPS_PER_BAR = 16;
export const defaultStepsPerBar = 16;
export const MAX_BARS = 256; // Increased from 32 to allow longer sequences

export const MIN_TEMPO = 20; // Adjusted min tempo
export const MAX_TEMPO = 400; // Adjusted max tempo

export const MAX_HISTORY_STATES = 50; // Max undo/redo steps

// Note: Reversed for typical top-to-bottom piano roll display in a UI
export const synthPitches = [
    'C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1',
    'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
    'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5',
    'C6', 'C#6', 'D6', 'D#6', 'E6', 'F6', 'F#6', 'G6', 'G#6', 'A6', 'A#6', 'B6',
    'C7', 'C#7', 'D7', 'D#7', 'E7', 'F7', 'F#7', 'G7', 'G#7', 'A7', 'A#7', 'B7'
].reverse();

export const soundLibraries = {
    // Path restored from old version for "Drums"
    "Drums": "samples/drum_kits.zip", // Example path, ensure this is correct for your project structure
    "Synths": "samples/synth_loops.zip", // Example path
    // Add more libraries here as needed
};

export const defaultDesktopBg = '#181818'; // Dark grey, consistent with dark theme base

export const TIMELINE_TRACK_NAME_WIDTH = 130; // In pixels, for UI layout

export const numSlices = 16; // Default number of slices for Sampler (Slicer)
export const numDrumSamplerPads = 16; // Number of pads for DrumSampler

// Keyboard to MIDI note mapping (example)
// Maps QWERTY keys to a chromatic scale starting on C3 (MIDI 48) by default
// Top row for sharps/flats or extended notes.
export const computerKeySynthMap = {
    // Bottom row (white keys on piano often)
    'z': 48, // C3
    'x': 50, // D3
    'c': 52, // E3
    'v': 53, // F3
    'b': 55, // G3
    'n': 57, // A3
    'm': 59, // B3
    ',': 60, // C4

    // Top row (black keys on piano often)
    's': 49, // C#3
    'd': 51, // D#3
    // 'f': // F (no black key, already used for F3)
    'g': 54, // F#3
    'h': 56, // G#3
    'j': 58, // A#3
    // 'k': // C (no black key, already used for C4)

    // Example for one octave higher using number row (Shift functionality would need to be handled in event logic)
    'q': 60, // C4 (alternative mapping)
    'w': 62, // D4
    'e': 64, // E4
    'r': 65, // F4
    't': 67, // G4
    'y': 69, // A4
    'u': 71, // B4
    'i': 72, // C5

    '2': 61, // C#4
    '3': 63, // D#4
    '5': 66, // F#4
    '6': 68, // G#4
    '7': 70, // A#4
};

// Default names for new tracks (can be overridden by specific track type logic)
export const defaultTrackNames = {
    Synth: "Synth Pluck",
    Sampler: "Slicer",
    DrumSampler: "Drum Kit",
    InstrumentSampler: "Melody Sampler",
    Audio: "Audio Input"
};

export const defaultProjectName = "My SnugOS Project";
