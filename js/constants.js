// js/constants.js - Shared constants for SnugOS

export const APP_VERSION = "0.1.1";

export const STEPS_PER_BAR = 16;
export const defaultStepsPerBar = 16;
export const MAX_BARS = 256;

export const MIN_TEMPO = 20;
export const MAX_TEMPO = 400;

export const MAX_HISTORY_STATES = 50;

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
    "Drums": "assets/drumss.zip", // Changed "samples/" to "assets/"
    "Instruments": "assets/instruments.zip" "assets/instruments2.zip" "assets/instruments3.zip", // Changed "samples/" to "assets/"
    "Instruments 2": "assets/instruments2.zip", // Changed "samples/" to "assets/"
    "Instruments 3": "assets/instruments3.zip", // Changed "samples/" to "assets/"
    // Add more libraries here as needed
};

export const defaultDesktopBg = '#181818';

export const TIMELINE_TRACK_NAME_WIDTH = 130; // In pixels, for UI layout

export const numSlices = 16;
export const numDrumSamplerPads = 16;

export const computerKeySynthMap = {
    'z': 48, 'x': 50, 'c': 52, 'v': 53, 'b': 55, 'n': 57, 'm': 59, ',': 60,
    's': 49, 'd': 51, 'g': 54, 'h': 56, 'j': 58,
    'q': 60, 'w': 62, 'e': 64, 'r': 65, 't': 67, 'y': 69, 'u': 71, 'i': 72,
    '2': 61, '3': 63, '5': 66, '6': 68, '7': 70,
};

export const defaultTrackNames = {
    Synth: "Synth Pluck",
    Sampler: "Slicer",
    DrumSampler: "Drum Kit",
    InstrumentSampler: "Melody Sampler",
    Audio: "Audio Input"
};

export const defaultProjectName = "My SnugOS Project";
