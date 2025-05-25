// js/state.js - Application State Management (Tracks, Undo/Redo, Save/Load)
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog } from './utils.js';
import { Track } from './Track.js';

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

export function getTracks() { return tracks; }
export function getTrackById(id) { return tracks.find(t => t.id === id); }
export function getArmedTrackId() { return armedTrackId; }
export function getSoloedTrackId() { return soloedTrackId; }
export function isTrackRecording() { return isRecording; }
export function getRecordingTrackId() { return recordingTrackId; }
export function getActiveSequencerTrackId() { return activeSequencerTrackId; }
export function getUndoStack() { return undoStack; }

export function setArmedTrackId(id) { armedTrackId = id; }
export function setSoloedTrackId(id) { soloedTrackId = id; }
export function setIsRecording(status) { isRecording = status; }
export function setRecordingTrackId(id) { recordingTrackId = id; }
export function setRecordingStartTime(time) { recordingStartTime = time; }
export function setActiveSequencerTrackId(id) { activeSequencerTrackId = id; }

export function addTrackToState(type, initialData = null, isUserAction = true) {
    const isBrandNewUserTrack = isUserAction && (!initialData || initialData._isUserActionPlaceholder);
    // console.log(`[State] addTrackToState called. Type: ${type}, isUserAction: ${isUserAction}, isBrandNewUserTrack: ${isBrandNewUserTrack}`);
    // if(initialData && !initialData._isUserActionPlaceholder) console.log("[State] addTrackToState initialData (from load/undo):", JSON.parse(JSON.stringify(initialData)));

    if (isBrandNewUserTrack) {
        captureStateForUndo(`Add ${type} Track`);
        if (initialData && initialData._isUserActionPlaceholder) initialData = null;
    }

    let newTrackId;
    if (initialData && initialData.id != null) {
        newTrackId = initialData.id;
        if (newTrackId > trackIdCounter) trackIdCounter = newTrackId;
    } else {
        trackIdCounter++;
        newTrackId = trackIdCounter;
    }
    
    const newTrack = new Track(newTrackId, type, initialData);
    tracks.push(newTrack);

    if (isBrandNewUserTrack) {
        // console.log(`[State] This is a brand new user track. ID: ${newTrack.id}. Opening inspector and updating mixer.`);
        showNotification(`${type} Track "${newTrack.name}" added.`, 2000);
        if (typeof window.openTrackInspectorWindow === 'function') {
            // console.log(`[State] Calling window.openTrackInspectorWindow for track ${newTrack.id}`);
            window.openTrackInspectorWindow(newTrack.id);
        } else {
            console.warn("[State] window.openTrackInspectorWindow is not a function!");
        }
        if (typeof window.updateMixerWindow === 'function') {
            // console.log("[State] Calling window.updateMixerWindow");
            window.updateMixerWindow();
        } else {
            console.warn("[State] window.updateMixerWindow is not a function!");
        }
    }
    return newTrack;
}

export function removeTrackFromState(trackId) {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    const track = tracks[trackIndex];
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

export function updateUndoRedoButtons() {
    const menuUndo = document.getElementById('menuUndo');
    const menuRedo = document.getElementById('menuRedo');
    if (menuUndo) {
        menuUndo.classList.toggle('disabled', undoStack.length === 0);
        menuUndo.title = undoStack.length > 0 && undoStack[undoStack.length - 1]?.description
                         ? `Undo: ${undoStack[undoStack.length - 1].description}` : 'Undo (Nothing to undo)';
    }
    if (menuRedo) {
        menuRedo.classList.toggle('disabled', redoStack.length === 0);
        menuRedo.title = redoStack.length > 0 && redoStack[redoStack.length - 1]?.description
                         ? `Redo: ${redoStack[redoStack.length - 1].description}` : 'Redo (Nothing to redo)';
    }
}

export function captureStateForUndo(description = "Unknown action") {
    // console.log("[State] Capturing state for undo:", description);
    try {
        const currentState = gatherProjectData();
        currentState.description = description;
        undoStack.push(JSON.parse(JSON.stringify(currentState)));
        if (undoStack.length > Constants.MAX_HISTORY_STATES) undoStack.shift();
        redoStack = [];
        updateUndoRedoButtons();
    } catch (error) {
        console.error("[State] Error capturing state for undo:", error);
        showNotification("Error capturing undo state.", 3000);
    }
}

export async function undoLastAction() {
    if (undoStack.length === 0) { showNotification("Nothing to undo.", 1500); return; }
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
        console.error("[State] Error during undo:", error);
        showNotification("Error during undo operation.", 4000);
        updateUndoRedoButtons();
    }
}

export async function redoLastAction() {
    if (redoStack.length === 0) { showNotification("Nothing to redo.", 1500); return; }
    try {
        const stateToRestore = redoStack.pop();
        const currentStateForUndo = gatherProjectData();
        currentStateForUndo.description = stateToRestore.description;
        undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo)));
        if (undoStack.length > Constants.MAX_HISTORY_STATES) undoStack.shift();
        showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
        await reconstructDAW(stateToRestore, true);
        updateUndoRedoButtons();
    } catch (error) {
        console.error("[State] Error during redo:", error);
        showNotification("Error during redo operation.", 4000);
        updateUndoRedoButtons();
    }
}

export function gatherProjectData() {
    // console.log("[State] Gathering project data...");
    const projectData = {
        version: "5.5.1",
        globalSettings: {
            tempo: Tone.Transport.bpm.value,
            masterVolume: Tone.getDestination().volume.value,
            activeMIDIInputId: window.activeMIDIInput ? window.activeMIDIInput.id : null,
            soloedTrackId: soloedTrackId,
            armedTrackId: armedTrackId,
            highestZIndex: window.highestZIndex,
        },
        tracks: tracks.map(track => {
            const trackData = {
                id: track.id, type: track.type, name: track.name,
                isMuted: track.isMuted, volume: track.previousVolumeBeforeMute,
                effects: JSON.parse(JSON.stringify(track.effects)),
                sequenceLength: track.sequenceLength,
                sequenceData: JSON.parse(JSON.stringify(track.sequenceData)),
                automation: JSON.parse(JSON.stringify(track.automation)),
                selectedSliceForEdit: track.selectedSliceForEdit,
                waveformZoom: track.waveformZoom,
                waveformScrollOffset: track.waveformScrollOffset,
                slicerIsPolyphonic: track.slicerIsPolyphonic,
                selectedDrumPadForEdit: track.selectedDrumPadForEdit,
                instrumentSamplerIsPolyphonic: track.instrumentSamplerIsPolyphonic,
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
    // console.log("[State] Project data gathered.");
    return projectData;
}

export async function reconstructDAW(projectData, isUndoRedo = false) {
    console.log("[State] Reconstructing DAW. Is Undo/Redo:", isUndoRedo);
    // console.log("[State] Project data for reconstruction:", JSON.parse(JSON.stringify(projectData)));

    console.log("[State] Clearing current state...");
    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0;

    Object.values(window.openWindows).forEach(win => {
        if (win && typeof win.close === 'function') win.close();
        else if (win && win.element) win.element.remove();
    });
    window.openWindows = {};
    window.highestZIndex = 100;

    armedTrackId = null; soloedTrackId = null; activeSequencerTrackId = null;
    isRecording = false; recordingTrackId = null;
    if (window.recordBtn) { window.recordBtn.classList.remove('recording'); window.recordBtn.textContent = 'Record';}
    console.log("[State] Current state cleared.");

    const gs = projectData.globalSettings;
    if (gs) {
        console.log("[State] Restoring global settings:", gs);
        Tone.Transport.bpm.value = gs.tempo || 120;
        Tone.getDestination().volume.value = gs.masterVolume !== undefined ? gs.masterVolume : 0;
        if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        window.highestZIndex = gs.highestZIndex || 100;
    }

    const trackInitPromises = [];
    if (projectData.tracks) {
        console.log(`[State] Instantiating ${projectData.tracks.length} tracks...`);
        for (const trackData of projectData.tracks) {
            const newTrack = addTrackToState(trackData.type, trackData, false); 
            if (newTrack.id > trackIdCounter) trackIdCounter = newTrack.id;
            if (typeof newTrack.fullyInitializeAudioResources === 'function') {
                trackInitPromises.push(newTrack.fullyInitializeAudioResources());
            } else {
                console.warn(`[State] Track ${newTrack.id} does not have fullyInitializeAudioResources method.`);
            }
        }
    }

    try {
        console.log(`[State] Waiting for ${trackInitPromises.length} track audio resources to initialize...`);
        await Promise.all(trackInitPromises);
        console.log("[State] All track audio resources initialized.");
    } catch (error) {
        console.error("[State] Error during track audio resource initialization:", error);
        showNotification("Error initializing some track audio. Project may not be fully loaded.", 5000);
    }
    
    console.log("[State] Tracks fully initialized. Proceeding with global track states and UI reconstruction.");

    if (gs) {
        soloedTrackId = gs.soloedTrackId || null;
        armedTrackId = gs.armedTrackId || null;
        console.log(`[State] Restored soloedTrackId: ${soloedTrackId}, armedTrackId: ${armedTrackId}`);
        tracks.forEach(t => {
            t.isSoloed = (t.id === soloedTrackId);
            t.applyMuteState(); 
            t.applySoloState(); 
        });

        if (gs.activeMIDIInputId && window.midiAccess && window.midiInputSelectGlobal) {
            const inputExists = Array.from(window.midiInputSelectGlobal.options).some(opt => opt.value === gs.activeMIDIInputId);
            if (inputExists) {
                window.midiInputSelectGlobal.value = gs.activeMIDIInputId;
                console.log(`[State] Restored MIDI input to: ${gs.activeMIDIInputId}`);
            } else {
                 console.warn(`[State] MIDI input ID ${gs.activeMIDIInputId} from project not found.`);
            }
            if(typeof window.selectMIDIInput === 'function') window.selectMIDIInput(true);
        } else if (window.midiInputSelectGlobal && typeof window.selectMIDIInput === 'function') {
            console.log("[State] No saved MIDI input, selecting default.");
            window.selectMIDIInput(true);
        }
    }

    if (projectData.windowStates) {
        console.log(`[State] Reconstructing ${projectData.windowStates.length} windows...`);
        const sortedWindowStates = projectData.windowStates.sort((a, b) => a.zIndex - b.zIndex);
        for (const winState of sortedWindowStates) {
            if (!winState) continue;
            // console.log(`[State] Reconstructing window: ${winState.id} (${winState.title})`);
            let newWin = null;
            const key = winState.initialContentKey;
            try {
                let trackForWindow = null;
                if (key && (key.startsWith('trackInspector-') || key.startsWith('effectsRack-') || key.startsWith('sequencerWin-'))) {
                    const trackIdForWin = parseInt(key.split('-')[1]);
                    trackForWindow = getTrackById(trackIdForWin);
                    if (!trackForWindow) {
                        console.warn(`[State] Track ${trackIdForWin} for window ${key} not found. Skipping window reconstruction.`);
                        continue;
                    }
                }

                if (key === 'globalControls' && typeof window.openGlobalControlsWindow === 'function') newWin = window.openGlobalControlsWindow(winState);
                else if (key === 'mixer' && typeof window.openMixerWindow === 'function') newWin = window.openMixerWindow(winState);
                else if (key === 'soundBrowser' && typeof window.openSoundBrowserWindow === 'function') newWin = window.openSoundBrowserWindow(winState);
                else if (trackForWindow && key.startsWith('trackInspector-') && typeof window.openTrackInspectorWindow === 'function') {
                    newWin = window.openTrackInspectorWindow(trackForWindow.id, winState);
                } else if (trackForWindow && key.startsWith('effectsRack-') && typeof window.openTrackEffectsRackWindow === 'function') {
                    newWin = window.openTrackEffectsRackWindow(trackForWindow.id, winState);
                } else if (trackForWindow && key.startsWith('sequencerWin-') && typeof window.openTrackSequencerWindow === 'function') {
                    newWin = window.openTrackSequencerWindow(trackForWindow.id, true, winState);
                }

                if (newWin && newWin.element) {
                    newWin.applyState(winState);
                    // console.log(`[State] Window ${winState.id} reconstructed and state applied.`);
                } else if (key) {
                    // console.warn(`[State] Failed to reconstruct window or newWin.element is null for key: ${key}`);
                }
            } catch (e) {
                console.error(`[State] Error reconstructing window ${winState.id}:`, e);
            }
        }
    }
    
    if(typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    tracks.forEach(track => {
        if (track.inspectorWindow && track.inspectorWindow.element) {
            const inspectorArmBtn = track.inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);
            if (inspectorArmBtn) inspectorArmBtn.classList.toggle('armed', armedTrackId === track.id);
             const inspectorSoloBtn = track.inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
            if (inspectorSoloBtn) inspectorSoloBtn.classList.toggle('soloed', track.isSoloed);
            const inspectorMuteBtn = track.inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
            if (inspectorMuteBtn) inspectorMuteBtn.classList.toggle('muted', track.isMuted);
        }
        if(typeof window.drawWaveform === 'function' && (track.type === 'Sampler' || track.type === 'InstrumentSampler') && track.audioBuffer && track.audioBuffer.loaded){
            window.drawWaveform(track);
        }
    });
    updateUndoRedoButtons();

    if (!isUndoRedo) {
        showNotification(`Project loaded successfully.`, 3500);
    }
    console.log("[State] DAW Reconstructed successfully.");
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
    showNotification(`Project saved as ${a.download}`, 2000);
}

export function loadProject() {
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
                undoStack = []; 
                redoStack = [];
                await reconstructDAW(projectData, false);
            } catch (error) {
                console.error("[State] Error loading project from file:", error);
                showNotification(`Error loading project: ${error.message}`, 5000);
            }
        };
        reader.readAsText(file);
    } else if (file) {
        showNotification("Invalid file type. Please select a .snug project file.", 3000);
    }
    event.target.value = null;
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
        tracks.forEach(track => {
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
        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)... This may take a moment.`, maxDuration * 1000 + 1000);

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
        console.error("[State] Error exporting WAV:", error);
        showNotification(`Error exporting WAV: ${error.message}`, 5000);
    }
}
