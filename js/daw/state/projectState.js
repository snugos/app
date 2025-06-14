// js/daw/state/projectState.js

// Corrected imports for Constants and Utils
import * as Constants from '../constants.js'; //
import { showNotification } from '../utils.js'; //

let undoStack = []; //
let redoStack = []; //
const MAX_UNDO_HISTORY = 50; //

let isReconstructingDAW = false; //

let clipboardData = { type: null, data: null, sourceTrackType: null, sequenceLength: null }; //

let localAppServices = {}; //

export function initializeProjectState(appServices) { //
    localAppServices = appServices; //
}

export function getIsReconstructingDAW() { //
    return isReconstructingDAW; //
}

export function setIsReconstructingDAW(isReconstructing) { //
    isReconstructingDAW = isReconstructing; //
}

export function getUndoStack() { //
    return undoStack; //
}

export function getRedoStack() { //
    return redoStack; //
}

export function getClipboardData() { //
    return clipboardData; //
}

export function setClipboardData(data) { //
    clipboardData = data; //
}

export function captureStateForUndo(actionDescription) { //
    if (getIsReconstructingDAW()) return; //
    const state = gatherProjectData(); //
    undoStack.push({ state, actionDescription }); //
    if (undoStack.length > MAX_UNDO_HISTORY) { //
        undoStack.shift(); //
    }
    redoStack = []; // Clear redo stack on new action
}

export function undoLastAction() { //
    if (undoStack.length > 0) { //
        const lastState = undoStack.pop(); //
        const currentState = gatherProjectData(); //
        redoStack.push({ state: currentState, actionDescription: lastState.actionDescription }); //
        reconstructDAW(lastState.state); //
    }
}

export function redoLastAction() { //
    if (redoStack.length > 0) { //
        const nextState = redoStack.pop(); //
        const currentState = gatherProjectData(); //
        undoStack.push({ state: currentState, actionDescription: nextState.actionDescription }); //
        reconstructDAW(nextState.state); //
    }
}

export function gatherProjectData() { //
    const tracks = localAppServices.getTracks?.() || []; //
    return { //
        tracks: tracks.map(t => t.serialize()), //
        masterEffects: localAppServices.getMasterEffects?.(), //
        masterVolume: localAppServices.getMasterGainValue?.(), //
        tempo: Tone.Transport.bpm.value, //
        version: Constants.APP_VERSION, //
    };
}

export async function reconstructDAW(projectData) { //
    setIsReconstructingDAW(true); //
    
    // Clear existing state
    const tracks = localAppServices.getTracks?.() || []; //
    tracks.forEach(t => t.dispose()); //
    localAppServices.setTracks?.([]); //
    localAppServices.setTrackIdCounter?.(0); //
    
    // Reconstruct tracks
    if (projectData.tracks) { //
        for (const trackData of projectData.tracks) { //
            const newTrack = await localAppServices.addTrack(trackData.type); //
            // This is complex and needs a dedicated deserialization method in Track.js
            // For now, this is a placeholder for a more robust implementation
            Object.assign(newTrack, trackData); //
            await newTrack.initializeInstrument(); //
        }
    }
    
    // Reconstruct master state
    localAppServices.setMasterGainValue?.(projectData.masterVolume); //
    Tone.Transport.bpm.value = projectData.tempo; //
    localAppServices.setMasterEffects?.(projectData.masterEffects); //
    localAppServices.rebuildMasterEffectChain?.(); //
    
    // Update UI
    localAppServices.updateMixerWindow?.(); //
    // Removed renderTimeline call as timeline is removed
    // localAppServices.renderTimeline?.(); 
    
    setIsReconstructingDAW(false); //
}

export function saveProject() { //
    const projectData = gatherProjectData(); //
    const jsonString = JSON.stringify(projectData, null, 2); //
    const blob = new Blob([jsonString], { type: 'application/json' }); //
    const url = URL.createObjectURL(blob); //
    const a = document.createElement('a'); //
    a.href = url; //
    a.download = 'snugos-project.snug'; //
    document.body.appendChild(a); //
    a.click(); //
    document.body.removeChild(a); //
    URL.revokeObjectURL(url); //
}

export function loadProject(file) { //
    const reader = new FileReader(); //
    reader.onload = (e) => { //
        try {
            const projectData = JSON.parse(e.target.result); //
            reconstructDAW(projectData); //
        } catch (error) {
            showNotification("Error: Could not parse project file.", 3000); //
            console.error("Project file parsing error:", error); //
        }
    };
    reader.readAsText(file); //
}

export async function handleProjectFileLoad(event) { //
    const file = event.target.files[0]; //
    if (file) { //
        loadProject(file); //
    }
}

export async function exportToWav() { //
    try {
        await localAppServices.initAudioContextAndMasterMeter(true); //
        const recorder = new Tone.Recorder(); //
        Tone.getDestination().connect(recorder); //

        const exportDuration = 10; //
        localAppServices.showNotification(`Rendering ${exportDuration} seconds... Please wait.`, exportDuration * 1000); //
        
        recorder.start(); //
        Tone.Transport.stop(); //
        Tone.Transport.position = 0; //
        Tone.Transport.start(); //

        Tone.Transport.scheduleOnce(async () => { //
            Tone.Transport.stop(); //
            const recording = await recorder.stop(); //
            
            const url = URL.createObjectURL(recording); //
            const anchor = document.createElement("a"); //
            anchor.download = "snugos-export.wav"; //
            anchor.href = url; //
            document.body.appendChild(anchor); //
            anchor.click(); //

            URL.revokeObjectURL(url); //
            recorder.dispose(); //
            Tone.getDestination().disconnect(recorder); //
            localAppServices.showNotification('Export finished!', 3000); //

        }, exportDuration); //
    } catch (error) {
        console.error("Error exporting to WAV:", error); //
        localAppServices.showNotification('Failed to export WAV file.', 3000); //
    }
}
