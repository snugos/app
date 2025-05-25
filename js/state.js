// js/state.js - Application State Management (Tracks, Undo/Redo, Save/Load)
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog } from './utils.js';
// Track class will be needed to instantiate tracks during project reconstruction
import { Track } from './Track.js';
// UI update functions will be called. For now, assume they are globally available via window.
// e.g., window.updateMixerWindow, window.openTrackInspectorWindow, etc.
// Audio functions might also be needed by reconstructDAW
// e.g., window.initAudioContextAndMasterMeter, window.setupMIDI

// --- Core Application State Variables ---
// These are now managed by this module.
// Other modules will interact with them via functions exported from here if needed,
// or by passing them around. For now, some direct window. references might persist in other files during transition.
let tracks = [];
let trackIdCounter = 0;
let activeSequencerTrackId = null; // This might also be UI state
let soloedTrackId = null;
let armedTrackId = null;
let isRecording = false;
let recordingTrackId = null;
let recordingStartTime = 0;

let undoStack = [];
let redoStack = [];

// --- Getters for state (examples, expand as needed) ---
export function getTracks() { return tracks; }
export function getTrackById(id) { return tracks.find(t => t.id === id); }
export function getArmedTrackId() { return armedTrackId; }
export function getSoloedTrackId() { return soloedTrackId; }
export function isTrackRecording() { return isRecording; }
export function getRecordingTrackId() { return recordingTrackId; }
export function getActiveSequencerTrackId() { return activeSequencerTrackId; }


// --- Setters for state (examples, expand as needed) ---
export function setArmedTrackId(id) { armedTrackId = id; }
export function setSoloedTrackId(id) { soloedTrackId = id; }
export function setIsRecording(status) { isRecording = status; }
export function setRecordingTrackId(id) { recordingTrackId = id; }
export function setRecordingStartTime(time) { recordingStartTime = time; }
export function setActiveSequencerTrackId(id) { activeSequencerTrackId = id; }


// --- Track Management (Moved from main.js/app.js) ---
export function addTrackToState(type, initialData = null, isUserAction = true) {
    if (isUserAction) {
        captureStateForUndo(`Add ${type} Track`);
    }
    trackIdCounter++;
    const newTrack = new Track(trackIdCounter, type, initialData); // Uses imported Track class
    tracks.push(newTrack);

    if (isUserAction) { // Only show UI feedback if it's a direct user action, not project load
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

    showConfirmationDialog(
        'Confirm Delete Track',
        `Are you sure you want to remove track "${track.name}"?`,
        () => {
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
    );
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
    console.log("Capturing state for undo (from state.js):", description);
    try {
        const currentState = gatherProjectData(); // Uses local gatherProjectData
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
        await reconstructDAW(stateToRestore, true); // Uses local reconstructDAW
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
        await reconstructDAW(stateToRestore, true); // Uses local reconstructDAW
        updateUndoRedoButtons();
    } catch (error) {
        console.error("Error during redo:", error);
        showNotification("Error during redo operation. Project state might be unstable.", 4000);
        updateUndoRedoButtons();
    }
}

// --- Project Save/Load Logic ---
export function gatherProjectData() {
    const projectData = {
        version: "5.5.1", // Consider moving to Constants
        globalSettings: {
            tempo: Tone.Transport.bpm.value,
            masterVolume: Tone.getDestination().volume.value,
            activeMIDIInputId: window.activeMIDIInput ? window.activeMIDIInput.id : null, // Still relies on global activeMIDIInput
            soloedTrackId: soloedTrackId,
            armedTrackId: armedTrackId,
            highestZIndex: window.highestZIndex, // This is more UI state
        },
        tracks: tracks.map(track => { // Uses local tracks
            const trackData = {
                id: track.id, type: track.type, name: track.name,
                isMuted: track.isMuted, volume: track.previousVolumeBeforeMute,
                effects: track.effects, sequenceLength: track.sequenceLength,
                sequenceData: track.sequenceData, automation: track.automation,
            };
            // Type-specific data serialization
            if (track.type === 'Synth') {
                trackData.synthParams = track.synthParams;
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = { fileName: track.originalFileName, audioBufferDataURL: track.audioBufferDataURL };
                trackData.slices = track.slices.map(s => ({ ...s }));
                trackData.waveformZoom = track.waveformZoom;
                trackData.waveformScrollOffset = track.waveformScrollOffset;
                trackData.slicerIsPolyphonic = track.slicerIsPolyphonic;
            } else if (track.type === 'DrumSampler') {
                trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({
                    originalFileName: p.originalFileName, audioBufferDataURL: p.audioBufferDataURL,
                    volume: p.volume, pitchShift: p.pitchShift, envelope: p.envelope
                }));
            } else if (track.type === 'InstrumentSampler') {
                // Ensure audioBuffer itself is not serialized, only its DataURL
                trackData.instrumentSamplerSettings = { ...track.instrumentSamplerSettings, audioBuffer: undefined };
                trackData.instrumentSamplerSettings.audioBufferDataURL = track.instrumentSamplerSettings.audioBufferDataURL;
                trackData.instrumentSamplerIsPolyphonic = track.instrumentSamplerIsPolyphonic;
            }
            return trackData;
        }),
        windowStates: Object.values(window.openWindows).map(win => { // Relies on global openWindows
            if (!win || !win.element) return null;
            return {
                id: win.id, title: win.title,
                left: win.element.style.left, top: win.element.style.top,
                width: win.element.style.width, height: win.element.style.height,
                zIndex: parseInt(win.element.style.zIndex),
                isMinimized: win.isMinimized,
                initialContentKey: win.initialContentKey
            };
        }).filter(ws => ws !== null)
    };
    return projectData;
}

export async function reconstructDAW(projectData, isUndoRedo = false) {
    console.log("Reconstructing DAW from state.js data...");
    // 1. Clear current state
    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0;

    Object.values(window.openWindows).forEach(win => { // Still uses global openWindows
        if(win.close) win.close(); // Ensure proper close method if available
        else if (win.element) win.element.remove();
    });
    window.openWindows = {}; // Reset global openWindows
    window.highestZIndex = 100; // Reset global highestZIndex

    armedTrackId = null;
    soloedTrackId = null;
    activeSequencerTrackId = null;
    isRecording = false;
    recordingTrackId = null;
    if (window.recordBtn) { window.recordBtn.classList.remove('recording'); window.recordBtn.textContent = 'Record';}

    // 2. Restore Global Settings
    const gs = projectData.globalSettings;
    if (gs) {
        Tone.Transport.bpm.value = gs.tempo || 120;
        Tone.getDestination().volume.value = gs.masterVolume !== undefined ? gs.masterVolume : 0;
        if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        window.highestZIndex = gs.highestZIndex || 100; // Update global highestZIndex
        soloedTrackId = gs.soloedTrackId || null;
        armedTrackId = gs.armedTrackId || null;
    }

    // 3. Reconstruct Tracks
    if (projectData.tracks) {
        for (const trackData of projectData.tracks) {
            // Use addTrackToState which is local to this module
            const newTrack = addTrackToState(trackData.type, trackData, false); // false for isUserAction
            if (newTrack && newTrack.id > trackIdCounter) trackIdCounter = newTrack.id;
        }
    }

    // 4. Restore Global Track States (Solo, Arm are now local) & MIDI Input
    if (gs) {
        tracks.forEach(t => {
            t.isSoloed = (t.id === soloedTrackId);
            // applySoloState will be called effectively by UI updates later
        });

        if (gs.activeMIDIInputId && window.midiAccess && window.midiInputSelectGlobal) {
            const inputExists = Array.from(window.midiInputSelectGlobal.options).some(opt => opt.value === gs.activeMIDIInputId);
            if (inputExists) window.midiInputSelectGlobal.value = gs.activeMIDIInputId;
            else console.warn(`MIDI input ID ${gs.activeMIDIInputId} from project not found.`);
            if(typeof window.selectMIDIInput === 'function') window.selectMIDIInput(true); // true to skip undo
        } else if (window.midiInputSelectGlobal && typeof window.selectMIDIInput === 'function') {
            window.selectMIDIInput(true);
        }
    }

    // 5. Reconstruct Windows (This part heavily relies on UI functions being globally available)
    if (projectData.windowStates) {
        const sortedWindowStates = projectData.windowStates.sort((a, b) => a.zIndex - b.zIndex);
        for (const winState of sortedWindowStates) {
            if (!winState) continue;
            let newWin = null;
            const key = winState.initialContentKey;

            if (key === 'globalControls' && typeof window.openGlobalControlsWindow === 'function') newWin = window.openGlobalControlsWindow(winState);
            else if (key === 'mixer' && typeof window.openMixerWindow === 'function') newWin = window.openMixerWindow(winState);
            else if (key === 'soundBrowser' && typeof window.openSoundBrowserWindow === 'function') newWin = window.openSoundBrowserWindow(winState);
            else if (key && key.startsWith('trackInspector-') && typeof window.openTrackInspectorWindow === 'function') {
                newWin = window.openTrackInspectorWindow(parseInt(key.split('-')[1]), winState);
            } else if (key && key.startsWith('effectsRack-') && typeof window.openTrackEffectsRackWindow === 'function') {
                newWin = window.openTrackEffectsRackWindow(parseInt(key.split('-')[1]), winState);
            } else if (key && key.startsWith('sequencerWin-') && typeof window.openTrackSequencerWindow === 'function') {
                newWin = window.openTrackSequencerWindow(parseInt(key.split('-')[1]), true, winState);
            }

            if (newWin && newWin.element) {
                newWin.element.style.zIndex = winState.zIndex;
                if (winState.isMinimized && !newWin.isMinimized) newWin.minimize(true);
                else if (!winState.isMinimized && newWin.isMinimized) newWin.restore(true);
                newWin.updateTaskbarButtonActiveState();
            }
        }
    }

    // 6. Final UI Updates
    if(typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    tracks.forEach(track => { // Update individual track UI elements
        if (track.inspectorWindow && track.inspectorWindow.element) {
            const inspectorArmBtn = track.inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);
            if (inspectorArmBtn) inspectorArmBtn.classList.toggle('armed', armedTrackId === track.id);
            const inspectorSoloBtn = track.inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
            if (inspectorSoloBtn) inspectorSoloBtn.classList.toggle('soloed', track.isSoloed);
            const inspectorMuteBtn = track.inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
            if (inspectorMuteBtn) inspectorMuteBtn.classList.toggle('muted', track.isMuted);
        }
    });


    if (!isUndoRedo) {
        showNotification(`Project loaded.`, 3500);
    }
    console.log("DAW Reconstructed by state.js");
}


export function saveProject() {
    const projectData = gatherProjectData();
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `snugos-project-${timestamp}.snug`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`Project saved.`, 2000);
}

export function loadProject() {
    // This function in main.js or eventHandlers.js will trigger the click
    // document.getElementById('loadProjectInput').click();
    // The actual loading is handled by handleProjectFileLoad
    console.log("loadProject called in state.js - actual input click is in eventHandlers or main");
}

export async function handleProjectFileLoad(event) { // event from file input
    const file = event.target.files[0];
    if (file && file.name.endsWith('.snug')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                undoStack = []; // Clear history for new project
                redoStack = [];
                updateUndoRedoButtons();
                await reconstructDAW(projectData); // Use local reconstructDAW
            } catch (error) {
                console.error("Error loading project:", error);
                showNotification(`Error loading project: ${error.message}`, 5000);
            }
        };
        reader.readAsText(file);
    } else if (file) {
        showNotification("Invalid file type. Please select a .snug project file.", 3000);
    }
    event.target.value = null; // Reset file input
}

export async function exportToWav() {
    showNotification("Preparing export... Please wait.", 3000);
    try {
        if (typeof window.initAudioContextAndMasterMeter === 'function') await window.initAudioContextAndMasterMeter();
        else console.warn("initAudioContextAndMasterMeter not found for exportToWav");

        if (Tone.Transport.state === 'started') {
            Tone.Transport.stop();
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        Tone.Transport.position = 0;

        let maxDuration = 0;
        tracks.forEach(track => { // Uses local tracks
            if (track.sequence) {
                const trackDuration = Tone.Time(track.sequenceLength + " * 16n").toSeconds();
                if (trackDuration > maxDuration) maxDuration = trackDuration;
            }
        });
        if (maxDuration === 0) maxDuration = 5;
        maxDuration += 1;

        const recorder = new Tone.Recorder();
        Tone.getDestination().connect(recorder);
        recorder.start();
        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)...`, maxDuration * 1000 + 500); // Slightly longer notification

        tracks.forEach(track => {
            if (track.sequence) {
                track.sequence.start(0);
                if (track.sequence instanceof Tone.Sequence) track.sequence.progress = 0;
            }
        });
        Tone.Transport.start("+0.1", 0);

        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000));

        Tone.Transport.stop();
        tracks.forEach(track => {
            if (track.sequence) {
                track.sequence.stop(0);
                if (track.sequence instanceof Tone.Sequence) track.sequence.progress = 0;
            }
        });

        const recording = await recorder.stop();
        recorder.dispose();

        const url = URL.createObjectURL(recording);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `snugos-export-${timestamp}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification("Export to WAV successful!", 3000);

    } catch (error) {
        console.error("Error exporting WAV:", error);
        showNotification(`Error exporting WAV: ${error.message}`, 5000);
    }
}
