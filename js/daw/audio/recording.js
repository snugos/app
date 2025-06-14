// js/daw/audio/recording.js

// Corrected import path for Track and added getRecordingStartTime as import
import { getRecordingStartTime } from '../state/trackState.js'; //

let localAppServices = {}; //

export function initializeRecording(appServices) { //
    localAppServices = appServices; //
}

export async function startAudioRecording(track, isMonitoringEnabled) { //
    let micInstance = null; //
    let recorderInstance = null; //
    
    try {
        micInstance = new Tone.UserMedia({ //
            audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false } //
        });
        recorderInstance = new Tone.Recorder(); //

        if (!track || track.type !== 'Audio' || !track.inputChannel) { //
            localAppServices.showNotification?.('Invalid track for recording.', 3000); //
            return false; //
        }

        await micInstance.open(); //
        micInstance.connect(recorderInstance); //
        if (isMonitoringEnabled) { //
            micInstance.connect(track.inputChannel); //
        }
        await recorderInstance.start(); //

        localAppServices._currentMicInstance = micInstance; //
        localAppServices._currentRecorderInstance = recorderInstance; //

        return true; //
    } catch (error) {
        console.error("Error starting recording:", error); //
        localAppServices.showNotification?.('Could not start recording. Check microphone permissions.', 4000); //
        return false; //
    }
}

export async function stopAudioRecording() { //
    const recorderInstance = localAppServices._currentRecorderInstance; //
    const micInstance = localAppServices._currentMicInstance; //

    if (!recorderInstance) return; //
    
    let blob = null; //
    if (recorderInstance.state === "started") { //
        blob = await recorderInstance.stop(); //
    }

    if (micInstance) { //
        micInstance.close(); //
        localAppServices._currentMicInstance = null; //
    }
    if (recorderInstance && typeof recorderInstance.dispose === 'function') { //
        recorderInstance.dispose(); //
    }
    localAppServices._currentRecorderInstance = null; //

    if (blob && blob.size > 0) { //
        const recordingTrackId = localAppServices.getRecordingTrackId?.(); //
        const startTime = localAppServices.getRecordingStartTime(); //
        const track = localAppServices.getTrackById?.(recordingTrackId); //

        if (track && typeof track.addAudioClip === 'function') { //
            const clipName = `Recording-${new Date().toLocaleTimeString()}`; //
            await track.addAudioClip(blob, startTime, clipName); //
        } else {
            console.error("Could not find track to add recorded clip to."); //
            localAppServices.showNotification?.('Error: Could not find track to place recording.', 3000); //
        }
    }
}
