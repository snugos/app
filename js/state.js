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

export async function addTrackToState(type, initialData = null, isUserAction = true) {
    const isBrandNewUserTrack = isUserAction && (!initialData || initialData._isUserActionPlaceholder);

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

    if (typeof newTrack.initializeAudioNodes === 'function') {
        await newTrack.initializeAudioNodes();
    } else {
        console.warn(`[State] Track ${newTrack.id} does not have initializeAudioNodes method.`);
    }

    if (isBrandNewUserTrack) {
        newTrack.fullyInitializeAudioResources().then(() => {
            console.log(`[State] Audio resources initialized for new track ${newTrack.id} (${newTrack.name}).`); // This log is present in user's console output
            showNotification(`${type} Track "${newTrack.name}" added.`, 2000);
            
            if (typeof window.openTrackInspectorWindow === 'function') {
                console.log(`[State] About to call openTrackInspectorWindow for track ${newTrack.id}`); // This log is present in user's console output
                window.openTrackInspectorWindow(newTrack.id);
            } else {
                console.error("[State] window.openTrackInspectorWindow is NOT a function!"); 
            }

            if (typeof window.updateMixerWindow === 'function') {
                console.log(`[State] About to call updateMixerWindow after adding track ${newTrack.id}`); // This log is present in user's console output
                window.updateMixerWindow();
            } else {
                console.warn("[State] window.updateMixerWindow is NOT a function!");
            }
        }).catch(error => {
            console.error(`[State] Error in fullyInitializeAudioResources promise for new track ${newTrack.id}:`, error);
            showNotification(`Error fully setting up new ${type} track "${newTrack.name}". Inspector/Mixer might not update.`, 5000);
            if (typeof window.openTrackInspectorWindow === 'function') {
                console.warn(`[State] Attempting to open inspector for track ${newTrack.id} despite earlier error.`);
                window.openTrackInspectorWindow(newTrack.id);
            }
            if (typeof window.updateMixerWindow === 'function') {
                 console.warn(`[State] Attempting to update mixer despite earlier error.`);
                window.updateMixerWindow();
            }
        });
    }
    return newTrack;
}

export function removeTrackFromState(trackId) {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) {
        console.warn(`[State] Attempted to remove non-existent track ID: ${trackId}`);
        return;
    }
    const track = tracks[trackIndex];
    captureStateForUndo(`Remove Track "${track.name}"`);
    
    track.dispose(); 
    
    tracks.splice(trackIndex, 1);

    if (armedTrackId === trackId) armedTrackId = null;
    if (soloedTrackId === trackId) {
        soloedTrackId = null;
        tracks.forEach(t => { 
            t.isSoloed = false; 
            t.applySoloState(); 
        });
    }
    if (activeSequencerTrackId === trackId) activeSequencerTrackId = null;
    
    showNotification(`Track "${track.name}" removed.`, 2000);
    if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    updateUndoRedoButtons();
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
    console.log("[State] Capturing state for undo:", description); // This log is present in user's console output
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
        console.error("[State] Error capturing state for undo:", error);
        showNotification("Error capturing undo state. See console for details.", 3000);
    }
}

export async function undoLastAction() {
    if (undoStack.length === 0) { 
        showNotification("Nothing to undo.", 1500); 
        return; 
    }
    try {
        const stateToRestore = undoStack.pop();
        const currentStateForRedo = gatherProjectData();
        currentStateForRedo.description = stateToRestore.description; 
        redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo))); 
        if (redoStack.length > Constants.MAX_HISTORY_STATES) {
            redoStack.shift();
        }
        
        showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        await reconstructDAW(stateToRestore, true); 
        updateUndoRedoButtons();
    } catch (error) {
        console.error("[State] Error during undo:", error);
        showNotification("Error during undo operation. Project may be unstable.", 4000);
        updateUndoRedoButtons(); 
    }
}

export async function redoLastAction() {
    if (redoStack.length === 0) { 
        showNotification("Nothing to redo.", 1500); 
        return; 
    }
    try {
        const stateToRestore = redoStack.pop();
        const currentStateForUndo = gatherProjectData();
        currentStateForUndo.description = stateToRestore.description;
        undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo)));
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }

        showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
        await reconstructDAW(stateToRestore, true);
        updateUndoRedoButtons();
    } catch (error) {
        console.error("[State] Error during redo:", error);
        showNotification("Error during redo operation. Project may be unstable.", 4000);
        updateUndoRedoButtons();
    }
}

export function gatherProjectData() {
    const projectData = {
        version: "5.5.4", 
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
                isMuted: track.isMuted, 
                volume: track.previousVolumeBeforeMute,
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
                trackData.synthEngineType = track.synthEngineType; 
                trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams)); 
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = { 
                    fileName: track.originalFileName, 
                    audioBufferDataURL: track.audioBufferDataURL
                };
                trackData.slices = JSON.parse(JSON.stringify(track.slices));
            } else if (track.type === 'DrumSampler') {
                trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({
                    originalFileName: p.originalFileName, 
                    audioBufferDataURL: p.audioBufferDataURL,
                    volume: p.volume, 
                    pitchShift: p.pitchShift, 
                    envelope: JSON.parse(JSON.stringify(p.envelope))
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
    return projectData;
}

export async function reconstructDAW(projectData, isUndoRedo = false) {
    console.log("[State] Reconstructing DAW. Is Undo/Redo:", isUndoRedo);
    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel();

    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0;

    Object.values(window.openWindows).forEach(win => {
        if (win && typeof win.close === 'function') {
            let originalCaptureUndo;
            if (win.constructor.name === 'SnugWindow') {
                originalCaptureUndo = window.captureStateForUndo;
                window.captureStateForUndo = () => {};
            }
            win.close();
            if (originalCaptureUndo) {
                window.captureStateForUndo = originalCaptureUndo;
            }
        } else if (win && win.element && win.element.remove) {
            win.element.remove();
        }
    });
    window.openWindows = {};
    window.highestZIndex = 100;

    armedTrackId = null; soloedTrackId = null; activeSequencerTrackId = null;
    isRecording = false; recordingTrackId = null;
    if (window.recordBtn) { window.recordBtn.classList.remove('recording'); window.recordBtn.textContent = 'Record';}
    
    const gs = projectData.globalSettings;
    if (gs) {
        Tone.Transport.bpm.value = gs.tempo || 120;
        Tone.getDestination().volume.value = gs.masterVolume !== undefined ? gs.masterVolume : 0;
        if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        window.highestZIndex = gs.highestZIndex || 100;
    }

    const trackCreationPromises = [];
    if (projectData.tracks && Array.isArray(projectData.tracks)) {
        projectData.tracks.forEach(trackData => {
            const newTrack = new Track(trackData.id, trackData.type, trackData); 
            tracks.push(newTrack);
            if (newTrack.id > trackIdCounter) trackIdCounter = newTrack.id;
            
            if (typeof newTrack.initializeAudioNodes === 'function') {
                trackCreationPromises.push(newTrack.initializeAudioNodes());
            } else {
                 console.warn(`[State] Track ${newTrack.id} does not have initializeAudioNodes method during reconstruct.`);
            }
        });
    }
    
    try {
        console.log(`[State] Waiting for ${trackCreationPromises.length} track audio nodes to initialize (reconstruct)...`);
        await Promise.all(trackCreationPromises);
        console.log("[State] All track audio nodes initialized during reconstruct.");
    } catch (error) {
        console.error("[State] Error during track audio node initialization (reconstruct):", error);
        showNotification("Error initializing some track audio nodes during load. Project may not be fully functional.", 5000);
    }

    const trackResourcePromises = [];
    for (const track of tracks) {
        if (typeof track.fullyInitializeAudioResources === 'function') {
            trackResourcePromises.push(track.fullyInitializeAudioResources());
        }
    }
    try {
        await Promise.all(trackResourcePromises);
        console.log("[State] All track audio resources (buffers, sequences) initialized during reconstruct.");
    } catch (error) {
        console.error("[State] Error initializing track audio resources (reconstruct):", error);
    }
    
    if (gs) {
        soloedTrackId = gs.soloedTrackId || null;
        armedTrackId = gs.armedTrackId || null;
        tracks.forEach(t => {
            t.isSoloed = (t.id === soloedTrackId);
            t.applyMuteState();
            t.applySoloState();
        });
        if (gs.activeMIDIInputId && window.midiAccess && window.midiInputSelectGlobal) {
            const inputExists = Array.from(window.midiInputSelectGlobal.options).some(opt => opt.value === gs.activeMIDIInputId);
            if (inputExists) window.midiInputSelectGlobal.value = gs.activeMIDIInputId;
            else window.midiInputSelectGlobal.value = "";
            if(typeof window.selectMIDIInput === 'function') window.selectMIDIInput(true);
        } else if (window.midiInputSelectGlobal && typeof window.selectMIDIInput === 'function') {
            window.midiInputSelectGlobal.value = "";
            window.selectMIDIInput(true);
        }
    }

    if (projectData.windowStates && Array.isArray(projectData.windowStates)) {
        const sortedWindowStates = projectData.windowStates.sort((a, b) => a.zIndex - b.zIndex);
        for (const winState of sortedWindowStates) {
            if (!winState || !winState.id) continue;
            let newWin = null;
            const key = winState.initialContentKey || winState.id;
            try {
                let trackForWindow = null;
                if (key && (key.startsWith('trackInspector-') || key.startsWith('effectsRack-') || key.startsWith('sequencerWin-'))) {
                    const trackIdForWinStr = key.split('-')[1];
                    if (trackIdForWinStr) {
                        const trackIdForWin = parseInt(trackIdForWinStr);
                        trackForWindow = getTrackById(trackIdForWin);
                        if (!trackForWindow) {
                            console.warn(`[State] Track ID ${trackIdForWin} for window ${key} not found during reconstruct. Skipping window.`);
                            continue;
                        }
                    } else {
                        console.warn(`[State] Could not parse track ID from window key ${key}. Skipping window.`);
                        continue;
                    }
                }
                if (key === 'globalControls' && typeof window.openGlobalControlsWindow === 'function') newWin = window.openGlobalControlsWindow(winState);
                else if (key === 'mixer' && typeof window.openMixerWindow === 'function') newWin = window.openMixerWindow(winState);
                else if (key === 'soundBrowser' && typeof window.openSoundBrowserWindow === 'function') newWin = window.openSoundBrowserWindow(winState);
                else if (trackForWindow && key.startsWith('trackInspector-') && typeof window.openTrackInspectorWindow === 'function') newWin = window.openTrackInspectorWindow(trackForWindow.id, winState);
                else if (trackForWindow && key.startsWith('effectsRack-') && typeof window.openTrackEffectsRackWindow === 'function') newWin = window.openTrackEffectsRackWindow(trackForWindow.id, winState);
                else if (trackForWindow && key.startsWith('sequencerWin-') && typeof window.openTrackSequencerWindow === 'function') newWin = window.openTrackSequencerWindow(trackForWindow.id, true, winState); 
                
                if (newWin && newWin.element && typeof newWin.applyState === 'function') newWin.applyState(winState);
            } catch (e) { console.error(`[State] Error reconstructing window ${winState.id} (Key: ${key}):`, e); }
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
        if(typeof window.drawWaveform === 'function' && (track.type === 'Sampler') && track.audioBuffer && track.audioBuffer.loaded) window.drawWaveform(track);
        if(typeof window.drawInstrumentWaveform === 'function' && (track.type === 'InstrumentSampler') && track.instrumentSamplerSettings.audioBuffer && track.instrumentSamplerSettings.audioBuffer.loaded) window.drawInstrumentWaveform(track);

    });
    updateUndoRedoButtons();

    if (!isUndoRedo) showNotification(`Project loaded successfully.`, 3500);
    console.log("[State] DAW Reconstructed successfully.");
}

export function saveProject() {
    try {
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
    } catch (error) {
        console.error("[State] Error saving project:", error);
        showNotification("Error saving project. See console for details.", 4000);
    }
}

export function loadProject() {
    const loadProjectInputEl = document.getElementById('loadProjectInput');
    if (loadProjectInputEl) loadProjectInputEl.click();
    else {
        console.error("[State] Load project input element not found.");
        showNotification("Error: File input for loading project not found.", 3000);
    }
}

export async function handleProjectFileLoad(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.snug')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                undoStack = []; 
                redoStack = [];
                await reconstructDAW(projectData, false);
                captureStateForUndo("Load Project"); 
            } catch (error) {
                console.error("[State] Error loading project from file:", error);
                showNotification(`Error loading project: ${error.message}. File might be corrupt or invalid.`, 5000);
            }
        };
        reader.onerror = (err) => {
            console.error("[State] FileReader error:", err);
            showNotification("Error reading project file.", 3000);
        };
        reader.readAsText(file);
    } else if (file) {
        showNotification("Invalid file type. Please select a .snug project file.", 3000);
    }
    if (event.target) event.target.value = null;
}

export async function exportToWav() {
    showNotification("Preparing export... Please wait.", 3000);
    try {
        if (typeof window.initAudioContextAndMasterMeter === 'function') {
            const audioReady = await window.initAudioContextAndMasterMeter(true);
            if (!audioReady) {
                showNotification("Audio system not ready for export. Please interact with the app (e.g. click Play) and try again.", 4000);
                return;
            }
        }

        if (Tone.Transport.state === 'started') {
            Tone.Transport.stop();
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        Tone.Transport.position = 0;

        let maxDuration = 0;
        tracks.forEach(track => {
            if (track.sequence && track.sequenceLength > 0) {
                const sixteenthNoteTime = Tone.Time("16n").toSeconds();
                const trackDuration = track.sequenceLength * sixteenthNoteTime;
                if (trackDuration > maxDuration) maxDuration = trackDuration;
            }
        });
        if (maxDuration === 0) maxDuration = 5;
        maxDuration += 1;

        const recorder = new Tone.Recorder();
        Tone.getDestination().connect(recorder);
        
        recorder.start();
        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)... This may take a moment.`, Math.max(3000, maxDuration * 1000 + 1000));

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