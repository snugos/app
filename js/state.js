// js/state.js - Application State Management
import * as Constants from './constants.js'; // For MAX_HISTORY_STATES
import { showNotification, showConfirmationDialog } from './utils.js';
import { Track } from './Track.js';
import { createEffectInstance } from './effectsRegistry.js'; // For modular effects
// Ensure audioAddMasterEffect is correctly named if it's being imported from audio.js
import { rebuildMasterEffectChain as audioRebuildMasterEffectChain, addMasterEffect as audioAddMasterEffect, initAudioContextAndMasterMeter as audioInitAudioContextAndMasterMeter } from './audio.js';
import { getAudio } from './db.js'; // ADDED for IndexedDB access


// --- State Variables ---
let tracks = [];
let trackIdCounter = 0;
let activeSequencerTrackId = null;
let soloedTrackId = null;
let armedTrackId = null;
let isRecording = false;
let recordingTrackId = null;
let recordingStartTime = 0;

// --- Undo/Redo ---
let undoStack = [];
let redoStack = [];

// --- Getters and Setters ---
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


// --- Track Management ---
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
    
    if (isBrandNewUserTrack || (initialData && !isUserAction)) { 
        newTrack.fullyInitializeAudioResources().then(() => {
            console.log(`[State] Audio resources initialized for track ${newTrack.id} (${newTrack.name}).`);
            if (isBrandNewUserTrack) {
                showNotification(`${newTrack.name} added.`, 2000);
                if (typeof window.openTrackInspectorWindow === 'function') {
                    window.openTrackInspectorWindow(newTrack.id);
                }
            }
            if (typeof window.updateMixerWindow === 'function') {
                window.updateMixerWindow();
            }
        }).catch(error => {
            console.error(`[State] Error in fullyInitializeAudioResources promise for track ${newTrack.id}:`, error);
            showNotification(`Error fully setting up ${type} track "${newTrack.name}".`, 5000);
            if (isBrandNewUserTrack && typeof window.openTrackInspectorWindow === 'function') {
                window.openTrackInspectorWindow(newTrack.id);
            }
            if (typeof window.updateMixerWindow === 'function') {
                window.updateMixerWindow();
            }
        });
    }
    return newTrack;
}

export function removeTrackFromState(trackId) {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) {
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


// --- Undo/Redo Logic ---
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
    console.log("[State] Capturing state for undo:", description);
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
        window.isReconstructingDAW = true; 
        await reconstructDAW(stateToRestore, true); 
        window.isReconstructingDAW = false;
        updateUndoRedoButtons();
    } catch (error) {
        window.isReconstructingDAW = false;
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
        window.isReconstructingDAW = true;
        await reconstructDAW(stateToRestore, true); 
        window.isReconstructingDAW = false;
        updateUndoRedoButtons();
    } catch (error) {
        window.isReconstructingDAW = false;
        console.error("[State] Error during redo:", error);
        showNotification("Error during redo operation. Project may be unstable.", 4000);
        updateUndoRedoButtons();
    }
}


// --- Project Data Handling ---
export function gatherProjectData() {
    const projectData = {
        version: "5.6.0",
        globalSettings: {
            tempo: Tone.Transport.bpm.value,
            masterVolume: window.masterGainNode && typeof window.masterGainNode.gain?.value === 'number' ? window.masterGainNode.gain.value : Tone.dbToGain(0),
            activeMIDIInputId: window.activeMIDIInput ? window.activeMIDIInput.id : null,
            soloedTrackId: soloedTrackId,
            armedTrackId: armedTrackId,
            highestZIndex: window.highestZIndex,
        },
        masterEffects: (window.masterEffectsChain || []).map(effect => ({ 
            id: effect.id,
            type: effect.type,
            params: JSON.parse(JSON.stringify(effect.params))
        })),
        tracks: tracks.map(track => {
            const trackData = {
                id: track.id, type: track.type, name: track.name,
                isMuted: track.isMuted,
                volume: track.previousVolumeBeforeMute,
                activeEffects: track.activeEffects.map(effect => ({ 
                    id: effect.id,
                    type: effect.type,
                    params: JSON.parse(JSON.stringify(effect.params))
                })),
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
                trackData.synthEngineType = 'MonoSynth';
                trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams));
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = { 
                    fileName: track.samplerAudioData.fileName, 
                    audioBufferDataURL: track.samplerAudioData.audioBufferDataURL,
                    dbKey: track.samplerAudioData.dbKey,
                    status: track.samplerAudioData.status
                };
                trackData.slices = JSON.parse(JSON.stringify(track.slices));
            } else if (track.type === 'DrumSampler') {
                trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({
                    originalFileName: p.originalFileName,
                    audioBufferDataURL: p.audioBufferDataURL,
                    dbKey: p.dbKey,
                    volume: p.volume,
                    pitchShift: p.pitchShift,
                    envelope: JSON.parse(JSON.stringify(p.envelope)),
                    status: p.status
                }));
            } else if (track.type === 'InstrumentSampler') {
                trackData.instrumentSamplerSettings = {
                    originalFileName: track.instrumentSamplerSettings.originalFileName,
                    audioBufferDataURL: track.instrumentSamplerSettings.audioBufferDataURL,
                    dbKey: track.instrumentSamplerSettings.dbKey,
                    rootNote: track.instrumentSamplerSettings.rootNote,
                    loop: track.instrumentSamplerSettings.loop,
                    loopStart: track.instrumentSamplerSettings.loopStart,
                    loopEnd: track.instrumentSamplerSettings.loopEnd,
                    envelope: JSON.parse(JSON.stringify(track.instrumentSamplerSettings.envelope)),
                    status: track.instrumentSamplerSettings.status
                };
            }
            return trackData;
        }),
        windowStates: Object.values(window.openWindows || {}).map(win => { 
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
    window.isReconstructingDAW = true;
    console.log("[State] Starting DAW Reconstruction. Is Undo/Redo:", isUndoRedo);
    
    // 1. Stop all audio and clear transport
    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel();

    await audioInitAudioContextAndMasterMeter(true);

    // 2. Dispose existing resources
    console.log("[State] Disposing existing tracks and windows...");
    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0;
    if (window.masterEffectsChain) {
        window.masterEffectsChain.forEach(effect => {
            if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose();
        });
    }
    window.masterEffectsChain = [];
    Object.values(window.openWindows || {}).forEach(win => { 
        if (win && typeof win.close === 'function') win.close(true);
    });
    window.openWindows = {};
    window.highestZIndex = 100;

    // 3. Reset global states
    armedTrackId = null; soloedTrackId = null; activeSequencerTrackId = null;
    isRecording = false; recordingTrackId = null;
    if (window.recordBtn) { window.recordBtn.classList.remove('recording'); window.recordBtn.textContent = 'Record';}

    // 4. Apply global settings
    console.log("[State] Applying global settings...");
    const gs = projectData.globalSettings;
    if (gs) {
        Tone.Transport.bpm.value = gs.tempo || 120;
        if (window.masterGainNode?.gain) {
            window.masterGainNode.gain.value = gs.masterVolume ?? Tone.dbToGain(0);
        }
        if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        window.highestZIndex = gs.highestZIndex || 100;
    }

    // 5. Reconstruct Master Effects
    if (projectData.masterEffects && Array.isArray(projectData.masterEffects)) {
        projectData.masterEffects.forEach(effectData => {
            if (typeof audioAddMasterEffect === 'function') {
                audioAddMasterEffect(effectData.type, effectData.params);
            } 
        });
        if (typeof audioRebuildMasterEffectChain === 'function') {
            audioRebuildMasterEffectChain();
        }
    }

    // 6. Reconstruct tracks (data only first)
    console.log(`[State] Reconstructing ${projectData.tracks?.length || 0} tracks (data only).`);
    const trackPromises = (projectData.tracks || []).map(trackData => addTrackToState(trackData.type, trackData, false));
    await Promise.all(trackPromises);

    // 7. Reconstruct windows
    console.log(`[State] Reconstructing ${projectData.windowStates?.length || 0} windows.`);
    if (projectData.windowStates) {
        const sortedWindowStates = projectData.windowStates.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        for (const winState of sortedWindowStates) {
            // This part remains largely the same, but it's crucial it happens after track data is created
            if (!winState || !winState.id) continue;
            const key = winState.initialContentKey || winState.id;
            const openWindowFunction = window[`open${key.charAt(0).toUpperCase() + key.slice(1)}Window`]; // Heuristic to find function
            if (key === 'globalControls' && typeof window.openGlobalControlsWindow === 'function') window.openGlobalControlsWindow(null, winState); // Use the callback version
            else if (key === 'mixer' && typeof window.openMixerWindow === 'function') window.openMixerWindow(winState);
            else if (key === 'soundBrowser' && typeof window.openSoundBrowserWindow === 'function') window.openSoundBrowserWindow(winState);
            else if (key === 'masterEffectsRack' && typeof window.openMasterEffectsRackWindow === 'function') window.openMasterEffectsRackWindow(winState);
            else if (key.startsWith('track')) {
                const trackIdStr = key.split('-')[1];
                const trackIdNum = parseInt(trackIdStr);
                if (!isNaN(trackIdNum) && getTrackById(trackIdNum)) {
                    if(key.startsWith('trackInspector-')) window.openTrackInspectorWindow(trackIdNum, winState);
                    else if(key.startsWith('effectsRack-')) window.openTrackEffectsRackWindow(trackIdNum, winState);
                    else if(key.startsWith('sequencerWin-')) window.openTrackSequencerWindow(trackIdNum, true, winState);
                }
            }
        }
    }

    // 8. Initialize all audio resources now that structure is in place
    console.log("[State] Finalizing audio resources for all tracks...");
    const resourcePromises = tracks.map(track => track.fullyInitializeAudioResources());
    await Promise.all(resourcePromises);
    
    // 9. Restore global solo/arm states and UI
    console.log("[State] Restoring global states and UI...");
    if (gs) {
        setSoloedTrackId(gs.soloedTrackId || null);
        setArmedTrackId(gs.armedTrackId || null);
        tracks.forEach(t => {
            t.isSoloed = (t.id === soloedTrackId);
            t.applySoloState();
        });
        if (gs.activeMIDIInputId && window.midiInputSelectGlobal) {
            window.midiInputSelectGlobal.value = gs.activeMIDIInputId;
            if (typeof window.selectMIDIInput === 'function') window.selectMIDIInput(true);
        }
    }
    
    // 10. Final UI updates
    if(typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    updateUndoRedoButtons();
    window.isReconstructingDAW = false;
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
    showNotification("Preparing export...", 3000);
    try {
        const audioReady = await audioInitAudioContextAndMasterMeter(true);
        if (!audioReady) {
            showNotification("Audio system not ready for export.", 4000);
            return;
        }

        if (Tone.Transport.state === 'started') {
            Tone.Transport.stop();
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        Tone.Transport.position = 0;
        let maxDuration = 0;
        tracks.forEach(track => {
            if (track.sequence && track.sequenceLength > 0) {
                const trackDuration = Tone.Time(`${track.sequenceLength}*16n`).toSeconds();
                if (trackDuration > maxDuration) maxDuration = trackDuration;
            }
        });
        if (maxDuration === 0) maxDuration = 5;
        maxDuration += 1; // Buffer

        const recorder = new Tone.Recorder();
        const recordSource = (window.masterGainNode && !window.masterGainNode.disposed) ? window.masterGainNode : Tone.getDestination(); 
        recordSource.connect(recorder);
        
        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)...`, Math.max(3000, maxDuration * 1000 + 1000));
        
        recorder.start();
        Tone.Transport.start("+0.1", 0);

        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000));

        const recording = await recorder.stop();
        Tone.Transport.stop();
        
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
