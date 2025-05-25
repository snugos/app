// js/state.js - Application State Management (Tracks, Undo/Redo, Save/Load)
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog } from './utils.js';
import { Track } from './Track.js'; // Essential for reconstructing tracks

// --- Core Application State Variables ---
let tracks = [];
let trackIdCounter = 0;
let activeSequencerTrackId = null;
let soloedTrackId = null;
let armedTrackId = null;
let isRecording = false;
let recordingTrackId = null;
let recordingStartTime = 0;

let undoStack = [];
let redoStack = [];

// --- Getters for state ---
export function getTracks() { return tracks; }
export function getTrackById(id) { return tracks.find(t => t.id === id); }
export function getArmedTrackId() { return armedTrackId; }
export function getSoloedTrackId() { return soloedTrackId; }
export function isTrackRecording() { return isRecording; }
export function getRecordingTrackId() { return recordingTrackId; }
export function getActiveSequencerTrackId() { return activeSequencerTrackId; }


// --- Setters for state ---
export function setArmedTrackId(id) { armedTrackId = id; }
export function setSoloedTrackId(id) { soloedTrackId = id; }
export function setIsRecording(status) { isRecording = status; }
export function setRecordingTrackId(id) { recordingTrackId = id; }
export function setRecordingStartTime(time) { recordingStartTime = time; }
export function setActiveSequencerTrackId(id) { activeSequencerTrackId = id; }


// --- Track Management ---
export function addTrackToState(type, initialData = null, isUserAction = true) {
    if (isUserAction && initialData === null) { // Only capture undo for brand new tracks by user
        captureStateForUndo(`Add ${type} Track`);
    }
    // If initialData is present (from loading or undo/redo), trackIdCounter should be managed carefully
    // to avoid conflicts if we're not just incrementing.
    // For loading, the ID comes from initialData. We need to ensure trackIdCounter is higher than any loaded ID.
    let newTrackId;
    if (initialData && initialData.id) {
        newTrackId = initialData.id;
        if (newTrackId > trackIdCounter) {
            trackIdCounter = newTrackId;
        }
    } else {
        trackIdCounter++;
        newTrackId = trackIdCounter;
    }
    
    const newTrack = new Track(newTrackId, type, initialData);
    tracks.push(newTrack);

    if (isUserAction && initialData === null) {
        showNotification(`${type} Track "${newTrack.name}" added.`, 2000);
        if (typeof window.openTrackInspectorWindow === 'function') window.openTrackInspectorWindow(newTrack.id);
        if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    }
    return newTrack;
}

export function removeTrackFromState(trackId) {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    const track = tracks[trackIndex];

    // Confirmation dialog is handled by the event handler that calls this.
    // This function should focus on the state change.
    captureStateForUndo(`Remove Track "${track.name}"`);
    track.dispose();
    tracks.splice(trackIndex, 1);

    if (armedTrackId === trackId) armedTrackId = null;
    if (soloedTrackId === trackId) {
        soloedTrackId = null;
        tracks.forEach(t => { t.isSoloed = false; t.applySoloState(); });
    }
    if (activeSequencerTrackId === trackId) activeSequencerTrackId = null;

    showNotification(`Track "${track.name}" removed.`, 2000);
    if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
}


// --- Undo/Redo Logic ---
export function updateUndoRedoButtons() {
    const menuUndo = document.getElementById('menuUndo');
    const menuRedo = document.getElementById('menuRedo');
    if (menuUndo) {
        menuUndo.classList.toggle('disabled', undoStack.length === 0);
        menuUndo.title = undoStack.length > 0 && undoStack[undoStack.length - 1]?.description
                         ? `Undo: ${undoStack[undoStack.length - 1].description}`
                         : 'Undo (Nothing to undo)';
    }
    if (menuRedo) {
        menuRedo.classList.toggle('disabled', redoStack.length === 0);
        menuRedo.title = redoStack.length > 0 && redoStack[redoStack.length - 1]?.description
                         ? `Redo: ${redoStack[redoStack.length - 1].description}`
                         : 'Redo (Nothing to redo)';
    }
}

export function captureStateForUndo(description = "Unknown action") {
    console.log("Capturing state for undo:", description);
    try {
        const currentState = gatherProjectData();
        currentState.description = description;
        undoStack.push(JSON.parse(JSON.stringify(currentState)));
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }
        redoStack = [];
        updateUndoRedoButtons();
    } catch (error) {
        console.error("Error capturing state for undo:", error);
        showNotification("Error capturing undo state. Undo may not work correctly.", 3000);
    }
}

export async function undoLastAction() {
    if (undoStack.length === 0) {
        showNotification("Nothing to undo.", 1500); return;
    }
    try {
        const stateToRestore = undoStack.pop();
        const currentStateForRedo = gatherProjectData();
        currentStateForRedo.description = stateToRestore.description;
        redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo)));
        if (redoStack.length > Constants.MAX_HISTORY_STATES) redoStack.shift();

        showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        await reconstructDAW(stateToRestore, true);
        updateUndoRedoButtons();
    } catch (error) {
        console.error("Error during undo:", error);
        showNotification("Error during undo operation. Project state might be unstable.", 4000);
        updateUndoRedoButtons();
    }
}

export async function redoLastAction() {
    if (redoStack.length === 0) {
        showNotification("Nothing to redo.", 1500); return;
    }
    try {
        const stateToRestore = redoStack.pop();
        const currentStateForUndo = gatherProjectData();
        currentStateForUndo.description = stateToRestore.description;
        undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo)));
        if (undoStack.length > Constants.MAX_HISTORY_STATES) undoStack.shift();

        showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
        await reconstructDAW(stateToRestore, true);
        updateUndoRedoButtons();
    } catch (error)
