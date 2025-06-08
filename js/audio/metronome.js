// js/audio/metronome.js

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

export function startMetronome() {
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

export function stopMetronome() {
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
