// js/daw/metronome.js

// Removed import * as Constants from '../constants.js'; // Removed as Constants is global
// Removed Tone.MembraneSynth import as Tone is global

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

// Removed export
function initializeMetronome(appServices) {
    // The appServices variable is still used, but its specific properties
    // like showNotification would need to be accessed via the appServices object
    // if needed within this module. For now, it's just passed for consistency.
    localAppServices = appServices;
}

// Removed export
function startMetronome() {
    if (metronomeEventId !== -1) {
        // Already running
        return;
    }
    if (!metronomeSynth) {
        metronomeSynth = createMetronomeSynth();
    }
    
    // Schedule a repeating event every quarter note
    metronomeEventId = Tone.Transport.scheduleRepeat((time) => {
        // Use the transport's position to determine the beat number
        const position = Tone.Transport.position.split(':');
        const measure = parseInt(position[0], 10);
        const beat = parseInt(position[1], 10);

        // Play a high note on the downbeat (first beat of a measure), and a lower note on others
        if (beat === 0) {
            metronomeSynth.triggerAttackRelease("C5", "16n", time);
        } else {
            metronomeSynth.triggerAttackRelease("C4", "16n", time);
        }
    }, "4n"); // "4n" means every quarter note (every beat)

    isMetronomeEnabled = true;
}

// Removed export
function stopMetronome() {
    if (metronomeEventId !== -1) {
        Tone.Transport.clear(metronomeEventId);
        metronomeEventId = -1;
    }
    isMetronomeEnabled = false;
}

// Removed export
function toggleMetronome() {
    isMetronomeEnabled ? stopMetronome() : startMetronome();
    return isMetronomeEnabled;
}
