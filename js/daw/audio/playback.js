// js/daw/audio/playback.js

// Removed import * as Constants from '../constants.js'; as Constants is global
// Removed import { showNotification } from '../utils.js'; as showNotification is global

let localAppServices = {};

export function initializePlayback(appServices) { // Added 'export' here
    localAppServices = appServices;
}

export function scheduleTimelinePlayback() { // Added 'export' here
    // First, clear any existing scheduled events from the transport
    Tone.Transport.cancel(0);

    // getTracksState is global
    const tracks = localAppServices.getTracks?.() || [];

    tracks.forEach(track => {
        // Schedule all clips for this track
        track.timelineClips?.forEach(clip => {
            if (clip.type === 'audio' && clip.audioBuffer) {
                // --- Audio Clip Scheduling ---
                Tone.Transport.scheduleOnce((time) => {
                    const player = new Tone.Player(clip.audioBuffer).connect(track.input);
                    player.start(time, clip.offset || 0, clip.duration);
                    Tone.Transport.scheduleOnce(() => player.dispose(), time + clip.duration + 0.5);
                }, clip.startTime);

            } else if (clip.type === 'midi' && clip.sequenceData && track.instrument) {
                // --- MIDI Clip Scheduling ---
                const events = [];
                const sequenceLength = clip.sequenceData[0]?.length || 0;

                for (let pitchIndex = 0; pitchIndex < clip.sequenceData.length; pitchIndex++) {
                    for (let step = 0; step < sequenceLength; step++) {
                        const note = clip.sequenceData[pitchIndex][step];
                        if (note) {
                            // Constants is global
                            events.push({
                                time: `${step}*16n`,
                                note: Constants.SYNTH_PITCHES[pitchIndex],
                                duration: `${note.duration || 1}*16n`,
                                velocity: note.velocity || 0.75
                            });
                        }
                    }
                }
                
                // Tone.Part is global
                const part = new Tone.Part((time, value) => {
                    track.instrument.triggerAttackRelease(value.note, value.duration, time, value.velocity);
                }, events);

                part.start(clip.startTime);
                
                Tone.Transport.scheduleOnce(() => {
                    part.dispose();
                }, clip.startTime + clip.duration + 0.1);
            }
        });
    });
}

export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0, time = undefined) { // Added 'export' here
    const audioReady = await localAppServices.initAudioContextAndMasterMeter?.(true);
    if (!audioReady) {
        // showNotification is global
        localAppServices.showNotification?.("Audio not ready for preview.", 2000);
        return;
    }

    // getTrackByIdState is global
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
    
    // For previews, we connect directly to the master output to bypass track effects
    // Tone.Player is global
    const tempPlayer = new Tone.Player(track.audioBuffer).connect(masterBusInput);
    tempPlayer.playbackRate = playbackRate;
    tempPlayer.start(scheduledTime, sliceData.offset, playDuration);

    Tone.Transport.scheduleOnce(() => {
        tempPlayer.dispose();
    }, scheduledTime + playDuration + 0.5);
}

export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0, time = undefined) { // Added 'export' here
    const audioReady = await localAppServices.initAudioContextAndMasterMeter?.(true);
    if (!audioReady) {
        // showNotification is global
        localAppServices.showNotification?.("Audio not ready for preview.", 2000);
        return;
    }

    // getTrackByIdState is global
    const track = localAppServices.getTrackById?.(trackId);
    if (!track || track.type !== 'DrumSampler') {
        return;
    }

    const padData = track.drumSamplerPads?.[padIndex];

    if (!padData || !padData.audioBuffer || !padData.audioBuffer.loaded) {
        return;
    }
    
    const masterBusInput = localAppServices.getMasterBusInputNode?.();
    if (!masterBusInput) {
        console.error("Master Bus not available for preview.");
        return;
    }
    
    const scheduledTime = time !== undefined ? time : Tone.now();

    // Tone.Player is global
    const tempPlayer = new Tone.Player(padData.audioBuffer).connect(masterBusInput);
    
    tempPlayer.volume.value = Tone.gainToDb(padData.volume * velocity * 0.8);
    const totalPadPitchShift = (padData.pitchShift || 0) + additionalPitchShiftInSemitones;
    tempPlayer.playbackRate = Math.pow(2, totalPadPitchShift / 12);
    
    tempPlayer.start(scheduledTime);

    Tone.Transport.scheduleOnce(() => {
        tempPlayer.dispose();
    }, scheduledTime + padData.audioBuffer.duration + 0.5);
}
