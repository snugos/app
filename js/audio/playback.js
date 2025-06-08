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
        // Only schedule clips for Audio tracks in Timeline mode
        if (track.type === 'Audio' && track.timelineClips) {
            track.timelineClips.forEach(clip => {
                if (clip.audioBuffer) {
                    // Create a temporary player for this clip
                    const player = new Tone.Player(clip.audioBuffer).connect(track.input);
                    
                    // Schedule it to play at its start time, and dispose of it after
                    Tone.Transport.scheduleOnce((time) => {
                        player.start(time);
                        // Schedule disposal to free up memory after the clip has played
                        Tone.Transport.scheduleOnce(() => {
                            player.dispose();
                        }, time + clip.duration + 0.5);
                    }, clip.startTime);
                }
            });
        }
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
