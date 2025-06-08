// js/constants.js - Shared constants for SnugOS

export const APP_VERSION = "0.1.0"; 

export const STEPS_PER_BAR = 16;
export const DEFAULT_STEPS_PER_BAR = 16; 
export const MAX_BARS = 32; 

export const MIN_TEMPO = 30; 
export const MAX_TEMPO = 300;
export const DEFAULT_TEMPO = 120;

// For mapping MIDI note numbers to note names (including sharps)
export const MIDI_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Piano Roll / Synth Note Definitions
export const PIANO_ROLL_OCTAVES = 4;
export const PIANO_ROLL_START_MIDI_NOTE = 36; // C2
export const PIANO_ROLL_END_MIDI_NOTE = PIANO_ROLL_START_MIDI_NOTE + (PIANO_ROLL_OCTAVES * 12) - 1; // B5 (MIDI 83)

// --- NEW: Constants for mapping samplers to the Piano Roll ---
export const SAMPLER_PIANO_ROLL_START_NOTE = 36; // C2 is the first key for Pad 1 / Slice 1
export const NUM_SAMPLER_NOTES = 16; // 16 pads/slices


// SYNTH_PITCHES: Array of note names (e.g., "C4", "F#3") for UI display, typically high to low.
// This array is crucial for determining the number of rows in the piano roll/sequencer for synths.
export const SYNTH_PITCHES = (() => {
    const pitches = [];
    if (Array.isArray(MIDI_NOTE_NAMES) && MIDI_NOTE_NAMES.length === 12) {
        for (let midiNote = PIANO_ROLL_END_MIDI_NOTE; midiNote >= PIANO_ROLL_START_MIDI_NOTE; midiNote--) {
            const noteIndexInOctave = midiNote % 12;
            const octave = Math.floor(midiNote / 12) -1; 
            pitches.push(`${MIDI_NOTE_NAMES[noteIndexInOctave]}${octave}`);
        }
    } else {
        console.error("[Constants] MIDI_NOTE_NAMES is not correctly defined. SYNTH_PITCHES will be empty. Using fallback.");
        for (let i = 83; i >= 36; i--) { pitches.push(`N${i}`);} 
    }
    if (pitches.length === 0) { // Additional fallback if loop didn't run
        console.error("[Constants] SYNTH_PITCHES generation failed, using hardcoded fallback.");
        return ['B5', 'A#5', 'A5', 'G#5', 'G5', 'F#5', 'F5', 'E5', 'D#5', 'D5', 'C#5', 'C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4', 'C4', 'B3', 'A#3', 'A3', 'G#3', 'G3', 'F#3', 'F3', 'E3', 'D#3', 'D3', 'C#3', 'C3', 'B2', 'A#2', 'A2', 'G#2', 'G2', 'F#2', 'F2', 'E2', 'D#2', 'D2', 'C#2', 'C2'];
    }
    return pitches; 
})();


// Piano Roll Visuals
export const PIANO_ROLL_KEY_WIDTH = 60; 
export const PIANO_ROLL_HEADER_HEIGHT = 25; 
export const PIANO_ROLL_NOTE_HEIGHT = 20; 
export const PIANO_ROLL_SIXTEENTH_NOTE_WIDTH = 25; 
export const PIANO_ROLL_WHITE_KEY_COLOR = '#FFFFFF';
export const PIANO_ROLL_BLACK_KEY_COLOR = '#333333';
export const PIANO_ROLL_GRID_LINE_COLOR = '#404040'; 
export const PIANO_ROLL_BAR_LINE_COLOR = '#6c757d';  
export const PIANO_ROLL_SUBDIVISION_LINE_COLOR = '#505050'; 
export const PIANO_ROLL_NOTE_FILL_COLOR = 'skyblue';
export const PIANO_ROLL_NOTE_STROKE_COLOR = 'blue';
export const PIANO_ROLL_NOTE_SELECTED_STROKE_COLOR = 'gold';


export const soundLibraries = {
    "Drums": "assets/drums.zip",
    "Instruments": "assets/instruments.zip",
    "Instruments 2": "assets/instruments2.zip",
    "Instruments 3": "assets/instruments3.zip"
};

export const defaultDesktopBg = '#1e1e1e';
export const defaultVelocity = 0.7;
export const numSlices = 16; // For Sampler (Slicer)
export const numDrumSamplerPads = 16; // For Drum Sampler - Ensure this is a number
export const DRUM_MIDI_START_NOTE = 36; // C1, common for drum machine mapping

export const COMPUTER_KEY_SYNTH_OCTAVE_SHIFT = 0; 
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
};

// Safety check log to see what SYNTH_PITCHES resolves to
console.log('[Constants] Initialized SYNTH_PITCHES count:', SYNTH_PITCHES.length);
if (SYNTH_PITCHES.length === 0) {
    console.error("[Constants] CRITICAL FAILURE: SYNTH_PITCHES is empty after all fallbacks. Piano roll will likely fail for synth tracks.");
}
if (typeof numDrumSamplerPads !== 'number' || numDrumSamplerPads <= 0) {
    console.error("[Constants] CRITICAL: numDrumSamplerPads is not a valid positive number:", numDrumSamplerPads);
}
