// js/constants.js - Shared constants for SnugOS

export const APP_VERSION = "0.1.0"; 
export const STEPS_PER_BAR = 16;
export const DEFAULT_STEPS_PER_BAR = 16; 
export const MAX_BARS = 32; 
export const MIN_TEMPO = 30; 
export const MAX_TEMPO = 300;
export const DEFAULT_TEMPO = 120;
export const MIDI_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const PIANO_ROLL_OCTAVES = 4;
export const PIANO_ROLL_START_MIDI_NOTE = 36; // C2
export const PIANO_ROLL_END_MIDI_NOTE = PIANO_ROLL_START_MIDI_NOTE + (PIANO_ROLL_OCTAVES * 12) - 1;
export const SAMPLER_PIANO_ROLL_START_NOTE = 36; // C2 is the first key for Pad 1 / Slice 1
export const NUM_SAMPLER_NOTES = 16; // 16 pads/slices

export const SYNTH_PITCHES = (() => {
    const pitches = [];
    if (Array.isArray(MIDI_NOTE_NAMES) && MIDI_NOTE_NAMES.length === 12) {
        for (let midiNote = PIANO_ROLL_END_MIDI_NOTE; midiNote >= PIANO_ROLL_START_MIDI_NOTE; midiNote--) {
            const octave = Math.floor(midiNote / 12) - 1;
            const noteName = MIDI_NOTE_NAMES[midiNote % 12];
            pitches.push(`${noteName}${octave}`);
        }
        console.log(`[Constants] Initialized SYNTH_PITCHES count: ${pitches.length}`);
    }
    return pitches;
})();

export const PIANO_ROLL_KEY_WIDTH = 80; 
export const PIANO_ROLL_NOTE_HEIGHT = 20; 
export const PIANO_ROLL_SIXTEENTH_NOTE_WIDTH = 25; 

// UPDATED: Use relative paths to your assets folder
export const soundLibraries = {
    "Drums": "/assets/drums.zip",
    "Instruments": "/assets/instruments.zip",
    "Instruments 2": "/assets/instruments2.zip",
    "Instruments 3": "/assets/instruments3.zip",
    "Srna's Piano": "/assets/srnas_piano.zip"
};

export const defaultDesktopBg = '#1e1e1e';
export const defaultVelocity = 0.7;
export const numSlices = 16;
export const numDrumSamplerPads = 16;
export const DRUM_MIDI_START_NOTE = 36; 

export let COMPUTER_KEY_SYNTH_OCTAVE_SHIFT = 0; 
export function incrementOctaveShift() { 
    COMPUTER_KEY_SYNTH_OCTAVE_SHIFT = Math.min(3, COMPUTER_KEY_SYNTH_OCTAVE_SHIFT + 1);
}
export function decrementOctaveShift() { 
    COMPUTER_KEY_SYNTH_OCTAVE_SHIFT = Math.max(-3, COMPUTER_KEY_SYNTH_OCTAVE_SHIFT - 1);
}

export const computerKeySynthMap = {
    'a': 48, 
    's': 50,
    'd': 52,
    'f': 53,
    'g': 55,
    'h': 57,
    'j': 59,
    'k': 60,
    'l': 62,
    ';': 64,
    "'": 65,
    'w': 49,
    'e': 51,
    't': 54,
    'y': 56,
    'u': 58,
    'o': 61,
    'p': 63,
};
