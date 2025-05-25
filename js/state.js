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
export function getUndoStack() { return undoStack; } // For main.js beforeunload check


// --- Setters for state ---
export function setArmedTrackId(id) { armedTrackId = id; }
export function setSoloedTrackId(id) { soloedTrackId = id; }
export function setIsRecording(status) { isRecording = status; }
export function setRecordingTrackId(id) { recordingTrackId = id; }
export function setRecordingStartTime(time) { recordingStartTime = time; }
export function setActiveSequencerTrackId(id) { activeSequencerTrackId = id; }


// --- Track Management ---
export function addTrackToState(type, initialData = null, isUserAction = true) {
    // Only capture undo for brand new tracks created by direct user action
    if (isUserAction && initialData === null) {
        captureStateForUndo(`Add ${type} Track`);
    }

    let newTrackId;
    if (initialData && initialData.id != null) { // Check for null or undefined explicitly
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

    // Only trigger UI updates if it's a direct user action creating a new track from scratch
    if (isUserAction && initialData === null) {
        showNotification(`${type} Track "${newTrack.name}" added.`, 2000);
        // These window functions are expected to be globally available or handled by main.js
        if (typeof window.openTrackInspectorWindow === 'function') window.openTrackInspectorWindow(newTrack.id);
        if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    }
    return newTrack;
}

export function removeTrackFromState(trackId) { // Renamed from coreRemoveTrackFromState for clarity
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    const track = tracks[trackIndex];

    // The confirmation dialog is handled by the event handler that calls this.
    // This function focuses on the state change and core logic.
    captureStateForUndo(`Remove Track "${track.name}"`);
    track.dispose(); // Dispose Tone.js objects and close associated windows
    tracks.splice(trackIndex, 1);

    if (armedTrackId === trackId) armedTrackId = null;
    if (soloedTrackId === trackId) {
        soloedTrackId = null;
        // When a soloed track is removed, all tracks should revert to their normal mute state
        tracks.forEach(t => { 
            t.isSoloed = false; // Ensure no track thinks it's soloed
            t.applySoloState(); // Re-evaluate gain based on new solo state (which is none)
        });
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
    console.log("[State] Capturing state for undo:", description);
    try {
        const currentState = gatherProjectData();
        currentState.description = description;
        undoStack.push(JSON.parse(JSON.stringify(currentState))); // Deep clone
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }
        redoStack = []; // Clear redo stack on new action
        updateUndoRedoButtons();
    } catch (error) {
        console.error("[State] Error capturing state for undo:", error);
        showNotification("Error capturing undo state. Undo may not work correctly.", 3000);
    }
}

export async function undoLastAction() {
    if (undoStack.length === 0) {
        showNotification("Nothing to undo.", 1500); return;
    }
    try {
        const stateToRestore = undoStack.pop();
        const currentStateForRedo = gatherProjectData(); // Capture current state BEFORE restoring
        currentStateForRedo.description = stateToRestore.description; // Use description from the undone action
        redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo)));
        if (redoStack.length > Constants.MAX_HISTORY_STATES) redoStack.shift();

        showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        await reconstructDAW(stateToRestore, true); // true for isUndoRedo
        updateUndoRedoButtons();
    } catch (error) {
        console.error("[State] Error during undo:", error);
        showNotification("Error during undo operation. Project state might be unstable.", 4000);
        updateUndoRedoButtons(); // Still update buttons
    }
}

export async function redoLastAction() {
    if (redoStack.length === 0) {
        showNotification("Nothing to redo.", 1500); return;
    }
    try {
        const stateToRestore = redoStack.pop();
        const currentStateForUndo = gatherProjectData(); // Capture current state BEFORE restoring
        currentStateForUndo.description = stateToRestore.description; // Use description from the redone action
        undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo)));
        if (undoStack.length > Constants.MAX_HISTORY_STATES) undoStack.shift();

        showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
        await reconstructDAW(stateToRestore, true); // true for isUndoRedo
        updateUndoRedoButtons();
    } catch (error) {
        console.error("[State] Error during redo:", error);
        showNotification("Error during redo operation. Project state might be unstable.", 4000);
        updateUndoRedoButtons();
    }
}

// --- Project Save/Load Logic ---
export function gatherProjectData() {
    console.log("[State] Gathering project data...");
    const projectData = {
        version: "5.5.1",
        globalSettings: {
            tempo: Tone.Transport.bpm.value,
            masterVolume: Tone.getDestination().volume.value,
            activeMIDIInputId: window.activeMIDIInput ? window.activeMIDIInput.id : null,
            soloedTrackId: soloedTrackId, // Uses module-local variable
            armedTrackId: armedTrackId,   // Uses module-local variable
            highestZIndex: window.highestZIndex, // UI state, might move later
        },
        tracks: tracks.map(track => { // Uses module-local tracks
            const trackData = {
                id: track.id, type: track.type, name: track.name,
                isMuted: track.isMuted, volume: track.previousVolumeBeforeMute,
                effects: JSON.parse(JSON.stringify(track.effects)), // Deep clone effects
                sequenceLength: track.sequenceLength,
                sequenceData: JSON.parse(JSON.stringify(track.sequenceData)), // Deep clone sequence
                automation: JSON.parse(JSON.stringify(track.automation)), // Deep clone automation
                // Type-specific data
                selectedSliceForEdit: track.selectedSliceForEdit, // For Sampler
                waveformZoom: track.waveformZoom, // For Sampler
                waveformScrollOffset: track.waveformScrollOffset, // For Sampler
                slicerIsPolyphonic: track.slicerIsPolyphonic, // For Sampler
                selectedDrumPadForEdit: track.selectedDrumPadForEdit, // For DrumSampler
                instrumentSamplerIsPolyphonic: track.instrumentSamplerIsPolyphonic, // For InstrumentSampler
            };
            if (track.type === 'Synth') {
                trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams));
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = { fileName: track.originalFileName, audioBufferDataURL: track.audioBufferDataURL };
                trackData.slices = JSON.parse(JSON.stringify(track.slices));
            } else if (track.type === 'DrumSampler') {
                trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({
                    originalFileName: p.originalFileName, audioBufferDataURL: p.audioBufferDataURL,
                    volume: p.volume, pitchShift: p.pitchShift, envelope: JSON.parse(JSON.stringify(p.envelope))
                }));
            } else if (track.type === 'InstrumentSampler') {
                trackData.instrumentSamplerSettings = {
                    originalFileName: track.instrumentSamplerSettings.originalFileName,
                    audioBufferDataURL: track.instrumentSamplerSettings.audioBufferDataURL,
                    rootNote: track.instrumentSamplerSettings.rootNote,
                    loop: track.instrumentSamplerSettings.loop,
                    loopStart: track.instrumentSamplerSettings.loopStart,
                    loopEnd: track.instrumentSamplerSettings.loopEnd,
                    envelope: JSON.parse(JSON.stringify(track.instrumentSamplerSettings.envelope)),
                };
            }
            return trackData;
        }),
        windowStates: Object.values(window.openWindows).map(win => {
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
    console.log("[State] Project data gathered:", projectData);
    return projectData;
}

export async function reconstructDAW(projectData, isUndoRedo = false) {
    console.log("[State] Reconstructing DAW. Is Undo/Redo:", isUndoRedo);
    console.log("[State] Project data for reconstruction:", JSON.parse(JSON.stringify(projectData)));

    // 1. Clear current state thoroughly
    console.log("[State] Clearing current state...");
    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0; // Reset for project loading, will be updated by loaded track IDs

    // Close all windows (SnugWindow.close handles taskbar button removal)
    Object.values(window.openWindows).forEach(win => {
        if (win && typeof win.close === 'function') {
            win.close(); // This should also remove from window.openWindows via its own logic
        } else if (win && win.element) {
            win.element.remove(); // Fallback
        }
    });
    window.openWindows = {}; // Ensure it's empty
    window.highestZIndex = 100;

    // Reset other relevant global/module states
    armedTrackId = null;
    soloedTrackId = null;
    activeSequencerTrackId = null;
    isRecording = false;
    recordingTrackId = null;
    if (window.recordBtn) { window.recordBtn.classList.remove('recording'); window.recordBtn.textContent = 'Record';}
    console.log("[State] Current state cleared.");

    // 2. Restore Global Settings
    const gs = projectData.globalSettings;
    if (gs) {
        console.log("[State] Restoring global settings:", gs);
        Tone.Transport.bpm.value = gs.tempo || 120;
        Tone.getDestination().volume.value = gs.masterVolume !== undefined ? gs.masterVolume : 0;
        if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        window.highestZIndex = gs.highestZIndex || 100;
        // soloedTrackId and armedTrackId will be set after tracks are created
    }

    // 3. Reconstruct Tracks
    // We need to await the asynchronous parts of track initialization (loading audio buffers)
    const trackPromises = [];
    if (projectData.tracks) {
        console.log(`[State] Reconstructing ${projectData.tracks.length} tracks...`);
        for (const trackData of projectData.tracks) {
            console.log(`[State] Reconstructing track ID: ${trackData.id}, Type: ${trackData.type}`);
            // addTrackToState creates the Track instance. The Track constructor now handles async init.
            const newTrack = addTrackToState(trackData.type, trackData, false); // isUserAction = false
            if (newTrack.id > trackIdCounter) trackIdCounter = newTrack.id; // Ensure counter is up-to-date

            // The Track constructor's async initializeInstrumentFromInitialData needs to complete.
            // We can collect these promises if Track's constructor or init method returns one.
            // For now, Track's constructor calls an async method but doesn't return its promise directly.
            // This is a point of potential improvement: Track constructor could return/store the promise.
            // As a workaround, we'll add a small delay or rely on UI updates happening later.
            // A better way: Track.initializeInstrumentFromInitialData should be awaitable.
            // Let's assume Track's internal async init will eventually resolve.
        }
    }
    
    // It's tricky to perfectly await all internal async operations of Track constructor
    // without modifying Track to explicitly return promises for full initialization.
    // For now, we proceed, and UI updates might need to be robust to data not being ready.
    console.log("[State] All tracks instantiated. Proceeding with global state and UI reconstruction.");


    // 4. Restore Global Track States (Solo, Arm) & MIDI Input AFTER tracks are created
    if (gs) {
        soloedTrackId = gs.soloedTrackId || null;
        armedTrackId = gs.armedTrackId || null;
        console.log(`[State] Restored soloedTrackId: ${soloedTrackId}, armedTrackId: ${armedTrackId}`);

        tracks.forEach(t => {
            t.isSoloed = (t.id === soloedTrackId);
            t.applySoloState(); // Apply the solo state which affects gain
        });

        if (gs.activeMIDIInputId && window.midiAccess && window.midiInputSelectGlobal) {
            const inputExists = Array.from(window.midiInputSelectGlobal.options).some(opt => opt.value === gs.activeMIDIInputId);
            if (inputExists) {
                window.midiInputSelectGlobal.value = gs.activeMIDIInputId;
                console.log(`[State] Restored MIDI input to: ${gs.activeMIDIInputId}`);
            } else {
                 console.warn(`[State] MIDI input ID ${gs.activeMIDIInputId} from project not found.`);
            }
            // selectMIDIInput should be called by eventHandlers.js or main.js after UI is ready
            if(typeof window.selectMIDIInput === 'function') window.selectMIDIInput(true);
        } else if (window.midiInputSelectGlobal && typeof window.selectMIDIInput === 'function') {
            console.log("[State] No saved MIDI input, selecting default.");
            window.selectMIDIInput(true);
        }
    }

    // 5. Reconstruct Windows (This relies on UI functions being available on window)
    // Ensure tracks are fully initialized (especially audio buffers) before opening windows that might use them.
    // This is why awaiting track initializations would be ideal.
    // Adding a small timeout as a temporary measure to allow some async ops to settle.
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

    if (projectData.windowStates) {
        console.log(`[State] Reconstructing ${projectData.windowStates.length} windows...`);
        const sortedWindowStates = projectData.windowStates.sort((a, b) => a.zIndex - b.zIndex);
        for (const winState of sortedWindowStates) {
            if (!winState) continue;
            console.log(`[State] Reconstructing window: ${winState.id} (${winState.title})`);
            let newWin = null;
            const key = winState.initialContentKey;

            try {
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
                    // SnugWindow's constructor now handles zIndex from options.
                    // applyState can be used for position, size, and minimized state.
                    newWin.applyState(winState); // applyState should handle isMinimized too
                    console.log(`[State] Window ${winState.id} reconstructed and state applied.`);
                } else if (key) {
                    console.warn(`[State] Failed to reconstruct window or newWin.element is null for key: ${key}`);
                }
            } catch (e) {
                console.error(`[State] Error reconstructing window ${winState.id}:`, e);
            }
        }
    }
    
    // 6. Final UI Updates
    if(typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    // Update individual track UI elements (like arm buttons in inspectors)
    tracks.forEach(track => {
        if (track.inspectorWindow && track.inspectorWindow.element) {
            const inspectorArmBtn = track.inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);
            if (inspectorArmBtn) inspectorArmBtn.classList.toggle('armed', armedTrackId === track.id);
            // Mute/Solo buttons are usually updated by their own handlers or applyMute/SoloState
        }
        // Re-draw waveforms if necessary, as canvas contexts might be new
        if(typeof window.drawWaveform === 'function' && (track.type === 'Sampler' || track.type === 'InstrumentSampler') && track.audioBuffer && track.audioBuffer.loaded){
            window.drawWaveform(track);
        }
    });
    updateUndoRedoButtons(); // Ensure undo/redo buttons reflect the loaded state

    if (!isUndoRedo) {
        showNotification(`Project loaded successfully.`, 3500);
    }
    console.log("[State] DAW Reconstructed successfully by state.js.");
}


export function saveProject() {
    const projectData = gatherProjectData();
    const jsonString = JSON.stringify(projectData, null, 2); // Pretty print
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
    showNotification(`Project saved as ${a.download}`, 2000);
}

export function loadProject() {
    // This function is now just a trigger. The actual loading is handled by handleProjectFileLoad.
    // The event listener for 'loadProjectInput' is set up in eventHandlers.js
    document.getElementById('loadProjectInput').click();
}

export async function handleProjectFileLoad(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.snug')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                console.log("[State] Project file read, attempting to reconstruct DAW...");
                undoStack = []; // Clear history for new project
                redoStack = [];
                // updateUndoRedoButtons(); // Called at the end of reconstructDAW
                await reconstructDAW(projectData, false); // false for isUndoRedo
            } catch (error) {
                console.error("[State] Error loading project from file:", error);
                showNotification(`Error loading project: ${error.message}`, 5000);
            }
        };
        reader.readAsText(file);
    } else if (file) {
        showNotification("Invalid file type. Please select a .snug project file.", 3000);
    }
    event.target.value = null; // Reset file input for next load
}

export async function exportToWav() {
    showNotification("Preparing export... Please wait.", 3000);
    try {
        if (typeof window.initAudioContextAndMasterMeter === 'function') await window.initAudioContextAndMasterMeter();
        else console.warn("initAudioContextAndMasterMeter not found for exportToWav");

        if (Tone.Transport.state === 'started') {
            Tone.Transport.stop();
            await new Promise(resolve => setTimeout(resolve, 200)); // Allow transport to fully stop
        }
        Tone.Transport.position = 0;

        let maxDuration = 0;
        tracks.forEach(track => {
            if (track.sequence) { // Check if sequence exists
                const trackDuration = Tone.Time(track.sequenceLength + " * 16n").toSeconds();
                if (trackDuration > maxDuration) maxDuration = trackDuration;
            }
        });
        if (maxDuration === 0) maxDuration = 5; // Default duration if no sequences
        maxDuration += 1; // Add a little buffer for reverb tails etc.

        const recorder = new Tone.Recorder();
        Tone.getDestination().connect(recorder);
        recorder.start();
        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)... This may take a moment.`, maxDuration * 1000 + 1000);

        tracks.forEach(track => {
            if (track.sequence) {
                track.sequence.start(0); // Start sequence at the beginning of the transport
                if (track.sequence instanceof Tone.Sequence) {
                     track.sequence.progress = 0; // Reset sequence progress
                }
            }
        });
        Tone.Transport.start("+0.1", 0); // Start transport slightly offset to ensure all events trigger

        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000));

        Tone.Transport.stop(); // Stop transport after recording duration
        tracks.forEach(track => { // Ensure all sequences are stopped
            if (track.sequence) {
                track.sequence.stop(0);
                 if (track.sequence instanceof Tone.Sequence) {
                     track.sequence.progress = 0;
                }
            }
        });

        const recording = await recorder.stop(); // Stop recorder and get the blob
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
        console.error("[State] Error exporting WAV:", error);
        showNotification(`Error exporting WAV: ${error.message}`, 5000);
    }
}
