// js/daw/audio/recording.js

// Corrected import path for Track and added getRecordingStartTime as import
import { getRecordingStartTime } from '../state/trackState.js'; // Corrected path
// Assuming showNotification is passed via appServices, no direct import needed here

let localAppServices = {};

export function initializeRecording(appServices) {
    localAppServices = appServices;
}

export async function startAudioRecording(track, isMonitoringEnabled) {
    // These need to be managed as part of the appServices state or returned.
    // For simplicity, for now, let's assume they are handled by the AudioContext itself
    // or passed implicitly. But ideally, they should be properties of an audio state.
    // For immediate fix, let's keep it simple, but be aware of potential closure/scope issues.
    let micInstance = null; // Declare locally
    let recorderInstance = null; // Declare locally

    // Check if mic or recorder were already created (e.g. from a previous start attempt)
    // This part is tricky if mic/recorder are not centralized.
    // For now, let's create new instances each time.
    
    try {
        micInstance = new Tone.UserMedia({
            audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false }
        });
        recorderInstance = new Tone.Recorder();

        if (!track || track.type !== 'Audio' || !track.inputChannel) {
            localAppServices.showNotification?.('Invalid track for recording.', 3000);
            return false;
        }

        await micInstance.open();
        micInstance.connect(recorderInstance);
        if (isMonitoringEnabled) {
            micInstance.connect(track.inputChannel);
        }
        await recorderInstance.start();

        // Store these instances in a way they can be accessed by stopAudioRecording
        // This is a missing piece of state management. For now, rely on closure for simplicity,
        // but for a robust app, they'd be in appState or a dedicated audio context manager.
        localAppServices._currentMicInstance = micInstance;
        localAppServices._currentRecorderInstance = recorderInstance;

        return true;
    } catch (error) {
        console.error("Error starting recording:", error);
        localAppServices.showNotification?.('Could not start recording. Check microphone permissions.', 4000);
        return false;
    }
}

export async function stopAudioRecording() {
    // Retrieve instances stored by startAudioRecording
    const recorderInstance = localAppServices._currentRecorderInstance;
    const micInstance = localAppServices._currentMicInstance;

    if (!recorderInstance) return;
    
    let blob = null;
    if (recorderInstance.state === "started") {
        blob = await recorderInstance.stop();
    }

    if (micInstance) {
        micInstance.close();
        // Clear references
        localAppServices._currentMicInstance = null;
    }
    recorderInstance.dispose(); // Dispose Tone.js recorder node
    localAppServices._currentRecorderInstance = null; // Clear reference


    if (blob && blob.size > 0) {
        const recordingTrackId = localAppServices.getRecordingTrackId?.();
        const startTime = localAppServices.getRecordingStartTime(); // Access via appServices
        const track = localAppServices.getTrackById?.(recordingTrackId);

        if (track && typeof track.addAudioClip === 'function') {
            const clipName = `Recording-${new Date().toLocaleTimeString()}`;
            await track.addAudioClip(blob, startTime, clipName);
        } else {
            console.error("Could not find track to add recorded clip to.");
            localAppServices.showNotification?.('Error: Could not find track to place recording.', 3000);
        }
    }
}
