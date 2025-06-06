// js/constants.js - Shared constants for SnugOS

export const APP_VERSION = "0.1.0"; 

export const STEPS_PER_BAR = 16;
export const DEFAULT_STEPS_PER_BAR = 16; 
export const MAX_BARS = 32; 

export const MIN_TEMPO = 30; 
export const MAX_TEMPO = 300;
export const DEFAULT_TEMPO = 120;

// Note: Reversed for typical top-to-bottom piano roll display in a UI
// C2 (MIDI 36) to B5 (MIDI 83) - 4 octaves
export const PIANO_ROLL_OCTAVES = 4;
export const PIANO_ROLL_START_MIDI_NOTE = 36; // C2
export const PIANO_ROLL_END_MIDI_NOTE = PIANO_ROLL_START_MIDI_NOTE + (PIANO_ROLL_OCTAVES * 12) -1; // B5 is 83

// For mapping MIDI note numbers to note names (including sharps)
export const MIDI_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const SYNTH_PITCHES = [];
for (let midiNote = PIANO_ROLL_END_MIDI_NOTE; midiNote >= PIANO_ROLL_START_MIDI_NOTE; midiNote--) {
    const noteIndex = midiNote % 12;
    const octave = Math.floor(midiNote / 12) -1; // MIDI C4 is octave 4, Tone.js C4 is octave 4. MIDI C2 is octave 2.
    SYNTH_PITCHES.push(`${MIDI_NOTE_NAMES[noteIndex]}${octave}`);
}
// SYNTH_PITCHES will now be ['B5', 'A#5', ..., 'C#2', 'C2'] for top-to-bottom display

// Piano Roll Visuals
export const PIANO_ROLL_KEY_WIDTH = 60; // Width of the piano key area on the left
export const PIANO_ROLL_HEADER_HEIGHT = 20; // Height for ruler/bar numbers
export const PIANO_ROLL_NOTE_HEIGHT = 18; // Height of each note row in pixels
export const PIANO_ROLL_SIXTEENTH_NOTE_WIDTH = 20; // Width of a 16th note step in pixels
export const PIANO_ROLL_WHITE_KEY_COLOR = '#FFFFFF';
export const PIANO_ROLL_BLACK_KEY_COLOR = '#333333';
export const PIANO_ROLL_GRID_LINE_COLOR = '#444444'; // Dark grid lines
export const PIANO_ROLL_BAR_LINE_COLOR = '#777777';   // Slightly more prominent bar lines
export const PIANO_ROLL_SUBDIVISION_LINE_COLOR = '#555555'; // For 4th note lines if needed
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
export const numSlices = 16;
export const numDrumSamplerPads = 16;
export const DRUM_MIDI_START_NOTE = 36; // C1, common for drum machine mapping

export const COMPUTER_KEY_SYNTH_OCTAVE_SHIFT = 0; // Shift in octaves for computer keyboard piano
// 'a' maps to C3 (MIDI 48) by default if octave shift is 0.
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

