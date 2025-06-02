// js/constants.js - Shared constants for SnugOS

export const APP_VERSION = "0.1.0";

export const STEPS_PER_BAR = 16;
export const defaultStepsPerBar = 16; // Default for new tracks
export const MAX_BARS = 256; // Maximum number of bars a sequence can have (16 bars * 16 steps/bar = 256 steps)

export const MIN_TEMPO = 1; // Minimum tempo in BPM
export const MAX_TEMPO = 999; // Maximum tempo in BPM

export const REFERENCE_TEMPO_FOR_VARISPEED = 120.0; // Reference BPM for Varispeed calculations (if feature were enabled)

// Note: Reversed for typical top-to-bottom piano roll display in a UI
export const synthPitches = [
    'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
    'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
].reverse();

export const soundLibraries = {
    "Drums": "https://storage.googleapis.com/snugos-public/sound-libraries/SnugOS_Drums_Vol1.zip",
    "Synths": "https://storage.googleapis.com/snugos-public/sound-libraries/SnugOS_Synths_Vol1.zip",
    "Loops": "https://storage.googleapis.com/snugos-public/sound-libraries/SnugOS_Loops_Vol1.zip"
    // Add more libraries here as they become available
};

export const numSlices = 16; // Default number of slices for Sampler track
export const numDrumSamplerPads = 16; // Number of pads for Drum Sampler

export const defaultVelocity = 0.7; // Default velocity for MIDI notes / sequencer steps

export const MAX_HISTORY_STATES = 1; // Max undo/redo states

export const defaultDesktopBg = '#101010'; // Default desktop background color


// Computer keyboard to MIDI note mapping
// This provides a basic 1-octave chromatic scale starting on C4 (MIDI 60) by default
// Top row for sharps/flats or extended notes.
// 'a' maps to C3 (MIDI 48) which means with octave shift 0, 'k' is C4.
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
};
