// js/daw/audio/recording.js

// Removed import { getRecordingStartTimeState } from '../state.js'; as getRecordingStartTimeState is global

let localAppServices = {};

export function initializeRecording(appServices) { // Added 'export' here
    localAppServices = appServices;
}

export async function startAudioRecording(track, isMonitoringEnabled) { // Added 'export' here
    if (mic?.state === "started") mic.close();
    if (recorder?.state === "started") await recorder.stop();

    try {
        // Tone.UserMedia and Tone.Recorder are global
        mic = new Tone.UserMedia({
            audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false }
        });
        recorder = new Tone.Recorder();

        if (!track || track.type !== 'Audio' || !track.inputChannel) {
            // showNotification is global
            localAppServices.showNotification?.('Invalid track for recording.', 3000);
            return false;
        }

        await mic.open();
        mic.connect(recorder);
        if (isMonitoringEnabled) {
            mic.connect(track.inputChannel);
        }
        await recorder.start();
        return true;
    } catch (error) {
        console.error("Error starting recording:", error);
        // showNotification is global
        localAppServices.showNotification?.('Could not start recording. Check microphone permissions.', 4000);
        return false;
    }
}

export async function stopAudioRecording() { // Added 'export' here
    if (!recorder) return;
    
    let blob = null;
    if (recorder.state === "started") {
        blob = await recorder.stop();
    }

    if (mic) {
        mic.close();
        mic = null;
    }
    recorder = null;

    if (blob && blob.size > 0) {
        // getRecordingTrackIdState is global
        const recordingTrackId = localAppServices.getRecordingTrackId?.();
        // getRecordingStartTimeState is global
        const startTime = getRecordingStartTimeState();
        // getTrackByIdState is global
        const track = localAppServices.getTrackById?.(recordingTrackId);

        if (track && typeof track.addAudioClip === 'function') {
            const clipName = `Recording-${new Date().toLocaleTimeString()}`;
            await track.addAudioClip(blob, startTime, clipName);
        } else {
            console.error("Could not find track to add recorded clip to.");
            // showNotification is global
            localAppServices.showNotification?.('Error: Could not find track to place recording.', 3000);
        }
    }
}
