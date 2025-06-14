// js/daw/audio/metronome.js

// Corrected import for Constants
import * as Constants from '../constants.js'; // Corrected path

let localAppServices = {};
let metronomeSynth = null;
let metronomeEventId = -1;
let isMetronomeEnabled = false;

function createMetronomeSynth() {
    // A simple membrane synth is great for click sounds
    return new Tone.MembraneSynth({
        pitchDecay: 0.01,
        octaves: 6,
        envelope: {
            attack: 0.001,
            decay: 0.2,
            sustain: 0,
        }
    }).toDestination();
}

export function initializeMetronome(appServices) {
    localAppServices = appServices;
}

function startMetronome() {
    if (metronomeEventId !== -1) {
        return;
    }
    if (!metronomeSynth) {
        metronomeSynth = createMetronomeSynth();
    }
    
    metronomeEventId = Tone.Transport.scheduleRepeat((time) => {
        const position = Tone.Transport.position.split(':');
        const measure = parseInt(position[0], 10);
        const beat = parseInt(position[1], 10);

        if (beat === 0) {
            metronomeSynth.triggerAttackRelease("C5", "16n", time);
        } else {
            metronomeSynth.triggerAttackRelease("C4", "16n", time);
        }
    }, "4n");

    isMetronomeEnabled = true;
}

function stopMetronome() {
    if (metronomeEventId !== -1) {
        Tone.Transport.clear(metronomeEventId);
        metronomeEventId = -1;
    }
    isMetronomeEnabled = false;
}

export function toggleMetronome() {
    isMetronomeEnabled ? stopMetronome() : startMetronome();
    return isMetronomeEnabled;
}
