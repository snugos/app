// js/constants.js - Shared constants for SnugOS

const APP_VERSION = "0.1.0"; 
const STEPS_PER_BAR = 16;
const DEFAULT_STEPS_PER_BAR = 16; 
const MAX_BARS = 32; 
const MIN_TEMPO = 30; 
const MAX_TEMPO = 300;
const DEFAULT_TEMPO = 120;
const MIDI_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const PIANO_ROLL_OCTAVES = 4;
const PIANO_ROLL_START_MIDI_NOTE = 36; // C2
const PIANO_ROLL_END_MIDI_NOTE = PIANO_ROLL_START_MIDI_NOTE + (PIANO_ROLL_OCTAVES * 12) - 1;
const SAMPLER_PIANO_ROLL_START_NOTE = 36; // C2 is the first key for Pad 1 / Slice 1
const NUM_SAMPLER_NOTES = 16; // 16 pads/slices

const SYNTH_PITCHES = (() => {
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

const PIANO_ROLL_KEY_WIDTH = 80; 
const PIANO_ROLL_NOTE_HEIGHT = 20; 
const PIANO_ROLL_SIXTEENTH_NOTE_WIDTH = 25; 

// UPDATED: Use relative paths to your assets folder
const soundLibraries = {
    "Drums": "assets/drums.zip",
    "Instruments": "assets/instruments.zip",
    "Instruments 2": "assets/instruments2.zip",
    "Instruments 3": "assets/instruments3.zip",
    "Srna's Piano": "assets/srnas_piano.zip"
};

const defaultDesktopBg = '#1e1e1e';
const defaultVelocity = 0.7;
const numSlices = 16;
const numDrumSamplerPads = 16;
const DRUM_MIDI_START_NOTE = 36; 

let COMPUTER_KEY_SYNTH_OCTAVE_SHIFT = 0; 
function incrementOctaveShift() { 
    COMPUTER_KEY_SYNTH_OCTAVE_SHIFT = Math.min(3, COMPUTER_KEY_SYNTH_OCTAVE_SHIFT + 1);
}
function decrementOctaveShift() {
    COMPUTER_KEY_SYNTH_OCTAVE_OCTAVE_SHIFT = Math.max(-2, COMPUTER_KEY_SYNTH_OCTAVE_SHIFT - 1);
}

const computerKeySynthMap = {
    'a': 60,  // C4
    'w': 61,  // C#4
    's': 62,  // D4
    'e': 63,  // D#4
    'd': 64,  // E4
    'f': 65,  // F4
    't': 66,  // F#4
    'g': 67,  // G4
    'y': 68,  // G#4
    'h': 69,  // A4
    'u': 70,  // A#4
    'j': 71,  // B4
    'k': 72,  // C5
    'o': 73,  // C#5
    'l': 74,  // D5
    'p': 75,  // D#5
    ';': 76,  // E5
    "'": 77,  // F5
    ']': 78,  // F#5
    '\\': 79, // G5
};

const authConstants = {
    TOKEN_KEY: 'snugos_token',
    USER_KEY: 'snugos_user',
    REMEMBER_ME_KEY: 'snugos_remember_me',
};
