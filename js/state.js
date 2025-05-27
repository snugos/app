// js/state.js - Application State Management
import * as Constants from './constants.js'; // For MAX_HISTORY_STATES
import { showNotification, showConfirmationDialog } from './utils.js';
import { Track } from './Track.js';
import { createEffectInstance } from './effectsRegistry.js'; // For modular effects
import { rebuildMasterEffectChain, addMasterEffect as audioAddMasterEffect } from './audio.js'; // Renamed to avoid conflict

// --- State Variables ---
let tracks = [];
let trackIdCounter = 0;
let activeSequencerTrackId = null;
let soloedTrackId = null;
let armedTrackId = null;
let isRecording = false;
let recordingTrackId = null;
let recordingStartTime = 0; // Should be initialized

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
export function getUndoStack() { return undoStack; } // For main.js beforeunload check

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

    const newTrack = new Track(newTrackId, type, initialData); // Track constructor handles its own defaults
    tracks.push(newTrack);

    if (typeof newTrack.initializeAudioNodes === 'function') {
        await newTrack.initializeAudioNodes(); // Initializes gain, meter, and REBUILDS effect chain
    } else {
        console.warn(`[State] Track ${newTrack.id} does not have initializeAudioNodes method.`);
    }
    
    // fullyInitializeAudioResources loads samples and might call rebuildEffectChain again.
    // This is fine as rebuildEffectChain is designed to be idempotent.
    if (isBrandNewUserTrack || (initialData && !isUserAction)) { // Second condition for project load
        newTrack.fullyInitializeAudioResources().then(() => {
            console.log(`[State] Audio resources initialized for track ${newTrack.id} (${newTrack.name}).`);
            if (isBrandNewUserTrack) {
                showNotification(`${newTrack.name} added.`, 2000);
                if (typeof window.openTrackInspectorWindow === 'function') {
                    window.openTrackInspectorWindow(newTrack.id);
                } else {
                    console.error("[State] window.openTrackInspectorWindow is NOT a function!");
                }
            }
            if (typeof window.updateMixerWindow === 'function') {
                window.updateMixerWindow();
            } else {
                console.warn("[State] window.updateMixerWindow is NOT a function!");
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
        currentState.description = description; // Add description to the state object itself
        undoStack.push(JSON.parse(JSON.stringify(currentState))); // Deep copy
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }
        redoStack = []; // Clear redo stack on new action
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
        const currentStateForRedo = gatherProjectData(); // Capture current state before restoring
        currentStateForRedo.description = stateToRestore.description; // Keep original description for redo
        redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo))); // Deep copy
        if (redoStack.length > Constants.MAX_HISTORY_STATES) {
            redoStack.shift();
        }

        showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        window.isReconstructingDAW = true; // Flag to prevent unwanted side effects during reconstruct
        await reconstructDAW(stateToRestore, true); // true for isUndoRedo
        window.isReconstructingDAW = false;
        updateUndoRedoButtons();
    } catch (error) {
        window.isReconstructingDAW = false;
        console.error("[State] Error during undo:", error);
        showNotification("Error during undo operation. Project may be unstable.", 4000);
        updateUndoRedoButtons(); // Still update buttons
    }
}

export async function redoLastAction() {
    if (redoStack.length === 0) {
        showNotification("Nothing to redo.", 1500);
        return;
    }
    try {
        const stateToRestore = redoStack.pop();
        const currentStateForUndo = gatherProjectData(); // Capture current state before restoring
        currentStateForUndo.description = stateToRestore.description; // Keep original description for undo
        undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo))); // Deep copy
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }

        showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
        window.isReconstructingDAW = true;
        await reconstructDAW(stateToRestore, true); // true for isUndoRedo
        window.isReconstructingDAW = false;
        updateUndoRedoButtons();
    } catch (error) {
        window.isReconstructingDAW = false;
        console.error("[State] Error during redo:", error);
        showNotification("Error during redo operation. Project may be unstable.", 4000);
        updateUndoRedoButtons();
    }
}


// --- Project Data Handling (MODULAR EFFECTS VERSION) ---
export function gatherProjectData() {
    console.log("[State] Gathering project data...");
    const projectData = {
        version: "5.6.0", // Version for modular effects
        globalSettings: {
            tempo: Tone.Transport.bpm.value,
            masterVolume: window.masterGainNode ? window.masterGainNode.gain.value : Tone.dbToGain(0),
            activeMIDIInputId: window.activeMIDIInput ? window.activeMIDIInput.id : null,
            soloedTrackId: soloedTrackId,
            armedTrackId: armedTrackId,
            highestZIndex: window.highestZIndex,
        },
        masterEffects: (window.masterEffectsChain || []).map(effect => ({ // Ensure masterEffectsChain exists
            id: effect.id,
            type: effect.type,
            params: JSON.parse(JSON.stringify(effect.params))
        })),
        tracks: tracks.map(track => {
            const trackData = {
                id: track.id, type: track.type, name: track.name,
                isMuted: track.isMuted,
                volume: track.previousVolumeBeforeMute,
                activeEffects: track.activeEffects.map(effect => ({ // MODULAR
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
                trackData.synthEngineType = 'MonoSynth'; // Fixed
                trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams));
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = { fileName: track.originalFileName, audioBufferDataURL: track.audioBufferDataURL };
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
        windowStates: Object.values(window.openWindows || {}).map(win => { // Ensure openWindows exists
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
    console.log("[State] Reconstructing DAW. Is Undo/Redo:", isUndoRedo, "Project Version:", projectData.version);
    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel();

    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0;

    if (window.masterEffectsChain) { // Dispose existing master effects
        window.masterEffectsChain.forEach(effect => {
            if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose();
        });
    }
    window.masterEffectsChain = []; // Reset


    Object.values(window.openWindows || {}).forEach(win => { // Ensure openWindows exists
        if (win && typeof win.close === 'function') win.close();
        else if (win && win.element && win.element.remove) win.element.remove();
    });
    window.openWindows = {};
    window.highestZIndex = 100;


    armedTrackId = null; soloedTrackId = null; activeSequencerTrackId = null;
    isRecording = false; recordingTrackId = null;
    if (window.recordBtn) { window.recordBtn.classList.remove('recording'); window.recordBtn.textContent = 'Record';}


    const gs = projectData.globalSettings;
    if (gs) {
        Tone.Transport.bpm.value = gs.tempo || 120;
        if (window.masterGainNode) window.masterGainNode.gain.value = gs.masterVolume !== undefined ? gs.masterVolume : Tone.dbToGain(0);
        else if (Tone.getDestination()?.volume) Tone.getDestination().volume.value = gs.masterVolume !== undefined ? Tone.dbToGain(0) : 0;
        if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        window.highestZIndex = gs.highestZIndex || 100;
    }

    // Reconstruct Master Effects (using audioAddMasterEffect to avoid name clash if this file had its own addMasterEffect)
    if (projectData.masterEffects && Array.isArray(projectData.masterEffects)) {
        projectData.masterEffects.forEach(effectData => {
            // The addMasterEffect function in audio.js will create the Tone node and add to window.masterEffectsChain
            if (typeof audioAddMasterEffect === 'function') {
                 audioAddMasterEffect(effectData.type); // This will use default params
                 // Now, find the added effect and update its params. This is a bit indirect.
                 // A better `audioAddMasterEffect` would take initialParams.
                 // For now, let's assume it's added and we update it:
                 const addedEffect = window.masterEffectsChain.find(e => e.type === effectData.type && !e.paramsRestored); // Temp flag
                 if(addedEffect) {
                    Object.assign(addedEffect.params, effectData.params);
                    if(addedEffect.toneNode && typeof addedEffect.toneNode.set === 'function') {
                        addedEffect.toneNode.set(effectData.params);
                    }
                    addedEffect.paramsRestored = true; // Mark as restored
                 }
            } else {
                // Fallback: Manually recreate and add to chain if audio.js one isn't available
                const toneNode = createEffectInstance(effectData.type, effectData.params);
                if (toneNode) {
                    window.masterEffectsChain.push({
                        id: effectData.id || `mastereffect-${Date.now()}`, type: effectData.type,
                        toneNode: toneNode, params: { ...effectData.params }
                    });
                }
            }
        });
        if (window.masterEffectsChain.length > 0 && typeof rebuildMasterEffectChain === 'function') {
             rebuildMasterEffectChain();
        }
         window.masterEffectsChain.forEach(ef => delete ef.paramsRestored); // Clean up temp flag
    }


    const trackInitPromises = [];
    if (projectData.tracks && Array.isArray(projectData.tracks)) {
        for (const trackData of projectData.tracks) {
            if (trackData.type === 'Synth') trackData.synthEngineType = 'MonoSynth';
            // Track constructor now handles initialData.activeEffects
            trackInitPromises.push(addTrackToState(trackData.type, trackData, false));
        }
    }
    
    await Promise.all(trackInitPromises);

    const finalResourcePromises = tracks.map(track => {
        if (typeof track.fullyInitializeAudioResources === 'function') {
            return track.fullyInitializeAudioResources(); // This calls rebuildEffectChain internally for the track
        }
        return Promise.resolve();
    });
    try {
        await Promise.all(finalResourcePromises);
        console.log("[State] All track audio resources finalized during reconstruct.");
    } catch (error) {
        console.error("[State] Error finalizing track audio resources (reconstruct):", error);
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
        const sortedWindowStates = projectData.windowStates.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0) );
        for (const winState of sortedWindowStates) {
             if (!winState || !winState.id) continue;
            const key = winState.initialContentKey || winState.id;
            try {
                let trackForWindow = null;
                if (key && (key.startsWith('trackInspector-') || key.startsWith('effectsRack-') || key.startsWith('sequencerWin-'))) {
                    const trackIdForWinStr = key.split('-')[1];
                    if (trackIdForWinStr) {
                        const trackIdForWin = parseInt(trackIdForWinStr);
                        trackForWindow = getTrackById(trackIdForWin);
                        if (!trackForWindow && key !== 'masterEffectsRack') { 
                            console.warn(`[State] Track ID ${trackIdForWin} for window ${key} not found. Skipping window.`);
                            continue;
                        }
                    } else if (key !== 'masterEffectsRack') { 
                        console.warn(`[State] Could not parse track ID from window key ${key}. Skipping window.`);
                        continue;
                    }
                }

                if (key === 'globalControls' && typeof window.openGlobalControlsWindow === 'function') window.openGlobalControlsWindow(winState);
                else if (key === 'mixer' && typeof window.openMixerWindow === 'function') window.openMixerWindow(winState);
                else if (key === 'soundBrowser' && typeof window.openSoundBrowserWindow === 'function') window.openSoundBrowserWindow(winState);
                else if (key === 'masterEffectsRack' && typeof window.openMasterEffectsRackWindow === 'function') window.openMasterEffectsRackWindow(winState);
                else if (trackForWindow && key.startsWith('trackInspector-') && typeof window.openTrackInspectorWindow === 'function') window.openTrackInspectorWindow(trackForWindow.id, winState);
                else if (trackForWindow && key.startsWith('effectsRack-') && typeof window.openTrackEffectsRackWindow === 'function') window.openTrackEffectsRackWindow(trackForWindow.id, winState);
                else if (trackForWindow && key.startsWith('sequencerWin-') && typeof window.openTrackSequencerWindow === 'function') window.openTrackSequencerWindow(trackForWindow.id, true, winState);

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
        const recordSource = window.masterGainNode || Tone.getDestination(); // Use masterGainNode if available
        recordSource.connect(recorder);
        
        recorder.start();
        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)...`, Math.max(3000, maxDuration * 1000 + 1000));

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
        recordSource.disconnect(recorder);


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

// Ensure this log appears if the file is parsed
console.log("[State.js] Parsed and exports should be available.");
