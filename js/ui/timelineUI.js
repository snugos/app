// js/audio/playback.js - Unified Playback Engine

import * as Constants from '../constants.js';

let localAppServices = {};
let scheduledParts = []; // Keep track of scheduled MIDI parts to dispose of them

export function initializePlayback(appServices) {
    localAppServices = appServices;
}

function clearScheduledParts() {
    scheduledParts.forEach(part => part.dispose());
    scheduledParts = [];
}

// This is our new main playback function
export function scheduleUnifiedPlayback() {
    Tone.Transport.cancel(0); 
    clearScheduledParts();

    const tracks = localAppServices.getTracks?.() || [];

    tracks.forEach(track => {
        track.timelineClips?.forEach(clip => {
            if (clip.type === 'audio' && clip.audioBuffer) {
                // --- Audio Clip Scheduling ---
                const player = new Tone.Player(clip.audioBuffer).connect(track.input);
                Tone.Transport.scheduleOnce((time) => {
                    player.start(time, clip.offset || 0, clip.duration);
                    Tone.Transport.scheduleOnce(() => player.dispose(), time + clip.duration + 0.5);
                }, clip.startTime);

            } else if (clip.type === 'midi') {
                // --- MIDI Clip Scheduling ---
                const sequenceData = track.sequences?.find(s => s.id === clip.sequenceId);
                if (sequenceData) {
                    // Convert the grid data to a Tone.Part-compatible array of events
                    const events = [];
                    sequenceData.data.forEach((row, pitchIndex) => {
                        row.forEach((note, timeStep) => {
                            if (note) {
                                events.push({
                                    time: `0:${timeStep / 4}`, // Convert step to "bar:beat" format
                                    note: Constants.SYNTH_PITCHES[pitchIndex],
                                    duration: `${note.duration || 1}*16n`,
                                    velocity: note.velocity || 0.75
                                });
                            }
                        });
                    });
                    
                    const part = new Tone.Part((time, value) => {
                        track.instrument?.triggerAttackRelease(value.note, value.duration, time, value.velocity);
                    }, events).start(clip.startTime);
                    
                    part.loop = true;
                    part.loopEnd = clip.duration;
                    scheduledParts.push(part); // Keep track for disposal
                }
            }
        });
    });
}

// Stop function to clear MIDI parts when transport stops
export function stopAllPlayback() {
    clearScheduledParts();
    // The transport stop will handle the audio players
}


// --- Preview functions remain the same ---
export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0, time = undefined) {
    const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        localAppServices.showNotification?.("Audio not ready for preview.", 2000);
        return;
    }

    const track = localAppServices.getTrackById?.(trackId);

    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded || !track.slices[sliceIndex]) {
        return;
    }
    const sliceData = track.slices[sliceIndex];
    if (!sliceData || sliceData.duration <= 0) {
        return;
    }
    
    const scheduledTime = time !== undefined ? time : Tone.now();
    
    const totalPitchShift = (sliceData.pitchShift || 0) + additionalPitchShiftInSemitones;
    const playbackRate = Math.pow(2, totalPitchShift / 12);
    let playDuration = sliceData.duration / playbackRate;
    if (sliceData.loop) playDuration = Math.min(playDuration, 2);

    const masterBusInput = localAppServices.getMasterBusInputNode?.();
    if (!masterBusInput) {
        console.error("Master Bus not available for preview.");
        return;
    }
    
    const tempPlayer = new Tone.Player(track.audioBuffer).connect(masterBusInput);
    tempPlayer.playbackRate = playbackRate;
    tempPlayer.start(scheduledTime, sliceData.offset, playDuration);

    Tone.Transport.scheduleOnce(() => {
        tempPlayer.dispose();
    }, scheduledTime + playDuration + 0.5);
}

export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0, time = undefined) {
    const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        localAppServices.showNotification?.("Audio not ready for preview.", 2000);
        return;
    }

    const track = localAppServices.getTrackById?.(trackId);
    if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || track.drumPadPlayers[padIndex].disposed || !track.drumPadPlayers[padIndex].loaded) {
        return;
    }
    
    const player = track.drumPadPlayers[padIndex];
    const padData = track.drumSamplerPads[padIndex];
    if (!padData) return;

    const masterBusInput = localAppServices.getMasterBusInputNode?.();
    if (!masterBusInput) {
        console.error("Master Bus not available for preview.");
        return;
    }
    
    const scheduledTime = time !== undefined ? time : Tone.now();

    player.disconnect();
    player.connect(masterBusInput);
    player.volume.value = Tone.gainToDb(padData.volume * velocity * 0.8);
    
    const totalPadPitchShift = (padData.pitchShift || 0) + additionalPitchShiftInSemitones;
    player.playbackRate = Math.pow(2, totalPadPitchShift / 12);
    
    player.start(scheduledTime);
}
