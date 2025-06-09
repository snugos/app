// js/audio/playback.js

import * as Constants from '../constants.js';

let localAppServices = {};

export function initializePlayback(appServices) {
    localAppServices = appServices;
}

export function scheduleTimelinePlayback() {
    // First, clear any existing scheduled events from the transport
    Tone.Transport.cancel(0);

    const tracks = localAppServices.getTracks?.() || [];

    tracks.forEach(track => {
        // Schedule all clips for this track
        track.timelineClips?.forEach(clip => {
            if (clip.type === 'audio' && clip.audioBuffer) {
                // --- Audio Clip Scheduling ---
                const player = new Tone.Player(clip.audioBuffer).connect(track.input);
                Tone.Transport.scheduleOnce((time) => {
                    // Start the player at the precise time, with offset and duration
                    player.start(time, clip.offset || 0, clip.duration);
                    // Schedule disposal to free up memory
                    Tone.Transport.scheduleOnce(() => player.dispose(), time + clip.duration + 0.5);
                }, clip.startTime);

            } else if (clip.type === 'midi') {
                // --- MIDI Clip Scheduling ---
                Tone.Transport.scheduleOnce((time) => {
                    track.startSequence?.();
                }, clip.startTime);

                Tone.Transport.scheduleOnce((time) => {
                    track.stopSequence?.();
                }, clip.startTime + clip.duration);
            }
        });
    });
}

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
    
    // For previews, we connect directly to the master output to bypass track effects
    const tempPlayer = new Tone.Player(track.audioBuffer).connect(masterBusInput);
    tempPlayer.playbackRate = playbackRate;
    tempPlayer.start(scheduledTime, sliceData.offset, playDuration);

    Tone.Transport.scheduleOnce(() => {
        tempPlayer.dispose();
    }, scheduledTime + playDuration + 0.5);
}

// *** REFACTORED FUNCTION to work with the new Tone.Sampler architecture ***
export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0, time = undefined) {
    const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        localAppServices.showNotification?.("Audio not ready for preview.", 2000);
        return;
    }

    const track = localAppServices.getTrackById?.(trackId);
    if (!track || track.type !== 'DrumSampler') {
        return;
    }

    const padData = track.drumSamplerPads?.[padIndex];

    // Check if the pad has a loaded audio buffer before trying to play it
    if (!padData || !padData.audioBuffer || !padData.audioBuffer.loaded) {
        return;
    }
    
    const masterBusInput = localAppServices.getMasterBusInputNode?.();
    if (!masterBusInput) {
        console.error("Master Bus not available for preview.");
        return;
    }
    
    const scheduledTime = time !== undefined ? time : Tone.now();

    // Create a new temporary player for the preview
    const tempPlayer = new Tone.Player(padData.audioBuffer).connect(masterBusInput);
    
    // Apply pad-specific settings
    tempPlayer.volume.value = Tone.gainToDb(padData.volume * velocity * 0.8);
    const totalPadPitchShift = (padData.pitchShift || 0) + additionalPitchShiftInSemitones;
    tempPlayer.playbackRate = Math.pow(2, totalPadPitchShift / 12);
    
    tempPlayer.start(scheduledTime);

    // Schedule disposal to prevent memory leaks
    Tone.Transport.scheduleOnce(() => {
        tempPlayer.dispose();
    }, scheduledTime + padData.audioBuffer.duration + 0.5);
}
