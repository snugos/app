// js/constants.js - Shared constants for SnugOS

export const APP_VERSION = "0.1.0";

export const STEPS_PER_BAR = 16;
export const defaultStepsPerBar = 16;
export const MAX_BARS = 256; // 16 bars * 16 steps/bar = 256 steps max

export const MIN_TEMPO = 1;
export const MAX_TEMPO = 999;

export const REFERENCE_TEMPO_FOR_VARISPEED = 120.0;

export const synthPitches = [
    'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
    'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
].reverse();

export const soundLibraries = {
    "Drums": "/assets/drums.zip",
    "Instruments 1": "/assets/instruments.zip",
    "Instruments 2": "/assets/instruments2.zip",
    "Instruments 3": "/assets/instruments3.zip",

};

// --- Customizable Slices and Pads ---
export const DEFAULT_SLICES = 8;
export const MIN_SLICES = 4;
export const MAX_SLICES = 64; // Example maximum

export const DEFAULT_DRUM_PADS = 8;
export const MIN_DRUM_PADS = 4;
export const MAX_DRUM_PADS = 64; // Example maximum
// --- End Customizable Slices and Pads ---

// The old numSlices and numDrumSamplerPads are now effectively replaced by the defaults above.
// We keep them here commented out for a short while during transition or if any code still references them directly by mistake.
// export const numSlices = 16; // Default number of slices for Sampler track (DEPRECATED by DEFAULT_SLICES)
// export const numDrumSamplerPads = 16; // Number of pads for Drum Sampler (DEPRECATED by DEFAULT_DRUM_PADS)


export const defaultVelocity = 0.7;
export const MAX_HISTORY_STATES = 50;
export const defaultDesktopBg = '#101010';

export const computerKeySynthMap = {
    'a': 48, 's': 50, 'd': 52, 'f': 53, 'g': 55, 'h': 57, 'j': 59, 'k': 60,
    'w': 49, 'e': 51, 't': 54, 'y': 56, 'u': 58,
};
