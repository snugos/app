// js/state.js - Application State Management
import * as Constants from './constants.js'; 
import { showNotification, showConfirmationDialog } from './utils.js';
import { Track } from './Track.js';
import { createEffectInstance, getEffectDefaultParams, AVAILABLE_EFFECTS } from './effectsRegistry.js'; 
import { 
    rebuildMasterEffectChain as audioRebuildMasterEffectChain, 
    addMasterEffect as audioAddMasterEffect, 
    initAudioContextAndMasterMeter as audioInitAudioContextAndMasterMeter,
    clearMasterEffects as audioClearMasterEffects, 
    applyMasterEffectState // This function is crucial for restoring master effect states
} from './audio.js'; 
import { getAudio } from './db.js'; 


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
        if (newTrackId >= trackIdCounter) trackIdCounter = newTrackId + 1; 
    } else {
        newTrackId = trackIdCounter++;
    }
    
    if (initialData && initialData.id == null) {
        initialData.id = newTrackId;
    }

    const newTrack = new Track(newTrackId, type, initialData);
    tracks.push(newTrack);
    
    // Track constructor calls fullyInitializeAudioResources which is async.
    // UI updates that depend on the track being fully ready should ideally await this,
    // or be triggered by a callback/event once the track signals it's ready.
    // For now, we'll open inspector immediately, and mixer update is general.

    if (isBrandNewUserTrack) {
        showNotification(`${newTrack.name} added.`, 2000);
        if (typeof window.openTrackInspectorWindow === 'function') {
            window.openTrackInspectorWindow(newTrack.id);
        }
    }
    if (typeof window.updateMixerWindow === 'function') {
        window.updateMixerWindow();
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
            t.applySoloState(null); 
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
        const stringifiedState = JSON.stringify(currentState); 
        const parsedState = JSON.parse(stringifiedState); 
        
        parsedState.description = description; 
        undoStack.push(parsedState); 
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }
        redoStack = []; 
        updateUndoRedoButtons();
    } catch (error) {
        console.error("[State] Error capturing state for undo (JSON stringify/parse issue):", error, "Attempted state:", gatherProjectData()); // Log the problematic state
        showNotification("Error capturing undo state. Check console for details.", 3000);
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
    console.log("[State] Gathering project data...");
    const projectData = {
        version: "5.7.2", // Incremented for effect state serialization fix
        globalSettings: {
            tempo: Tone.Transport.bpm.value,
            masterVolume: window.masterGainNode && typeof window.masterGainNode.gain?.value === 'number' ? window.masterGainNode.gain.value : Tone.dbToGain(0),
            activeMIDIInputId: window.activeMIDIInput ? window.activeMIDIInput.id : null,
            soloedTrackId: soloedTrackId,
            armedTrackId: armedTrackId,
            highestZIndex: window.highestZIndex,
        },
        masterEffects: (window.masterEffectsChain || []).map(effect => {
            // Ensure params is always an object, even if empty, to avoid stringifying undefined
            const paramsCopy = effect.params ? JSON.parse(JSON.stringify(effect.params)) : {};
            return { 
                id: effect.id,
                type: effect.type,
                params: paramsCopy, 
                isBypassed: effect.isBypassed || false,             
                storedWetValue: effect.storedWetValue !== undefined ? effect.storedWetValue : 1 
            };
        }),
        tracks: tracks.map(track => {
            const trackData = {
                id: track.id, type: track.type, name: track.name,
                isMuted: track.isMuted,
                volume: track.previousVolumeBeforeMute, 
                activeEffects: track.activeEffects.map(effect => {
                    const paramsCopy = effect.params ? JSON.parse(JSON.stringify(effect.params)) : {};
                    return {
                        id: effect.id,
                        type: effect.type,
                        params: paramsCopy,
                        isBypassed: effect.isBypassed || false,             
                        storedWetValue: effect.storedWetValue !== undefined ? effect.storedWetValue : 1 
                    };
                }),
                sequenceLength: track.sequenceLength,
                sequenceData: JSON.parse(JSON.stringify(track.sequenceData)), 
                automation: JSON.parse(JSON.stringify(track.automation || { volume: [] })), 
                selectedSliceForEdit: track.selectedSliceForEdit,
                slicerIsPolyphonic: track.slicerIsPolyphonic,
                selectedDrumPadForEdit: track.selectedDrumPadForEdit,
                instrumentSamplerIsPolyphonic: track.instrumentSamplerIsPolyphonic,
            };
             if (track.type === 'Synth') {
                trackData.synthEngineType = track.synthEngineType || 'MonoSynth'; 
                trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams || {}));
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = { 
                    fileName: track.samplerAudioData.fileName, 
                    dbKey: track.samplerAudioData.dbKey, 
                    status: track.samplerAudioData.status 
                };
                trackData.slices = JSON.parse(JSON.stringify(track.slices));
            } else if (track.type === 'DrumSampler') {
                trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({
                    originalFileName: p.originalFileName,
                    dbKey: p.dbKey, 
                    volume: p.volume,
                    pitchShift: p.pitchShift,
                    envelope: JSON.parse(JSON.stringify(p.envelope || {})),
                    status: p.status
                }));
            } else if (track.type === 'InstrumentSampler') {
                trackData.instrumentSamplerSettings = {
                    originalFileName: track.instrumentSamplerSettings.originalFileName,
                    dbKey: track.instrumentSamplerSettings.dbKey, 
                    rootNote: track.instrumentSamplerSettings.rootNote,
                    loop: track.instrumentSamplerSettings.loop,
                    loopStart: track.instrumentSamplerSettings.loopStart,
                    loopEnd: track.instrumentSamplerSettings.loopEnd,
                    envelope: JSON.parse(JSON.stringify(track.instrumentSamplerSettings.envelope || {})),
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
    console.log("[State - reconstructDAW] Starting. Is Undo/Redo:", isUndoRedo, "Project Version:", projectData.version);
    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel();

    if (typeof audioInitAudioContextAndMasterMeter === 'function') {
        console.log("[State - reconstructDAW] Ensuring audio context and master bus are initialized before track creation...");
        await audioInitAudioContextAndMasterMeter(true); 
    }

    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0;

    if (typeof audioClearMasterEffects === 'function') audioClearMasterEffects();
    
    Object.values(window.openWindows || {}).forEach(win => { 
        if (win && typeof win.close === 'function') win.close(true); 
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
        if (window.masterGainNode && window.masterGainNode.gain && typeof window.masterGainNode.gain.value === 'number') {
            window.masterGainNode.gain.value = gs.masterVolume !== undefined ? gs.masterVolume : Tone.dbToGain(0);
        }

        if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        window.highestZIndex = gs.highestZIndex || 100;
    }

    if (projectData.masterEffects && Array.isArray(projectData.masterEffects)) {
        console.log("[State - reconstructDAW] Reconstructing master effects:", projectData.masterEffects.length);
        projectData.masterEffects.forEach(effectData => {
            if (typeof audioAddMasterEffect === 'function') {
                 const addedEffectId = audioAddMasterEffect(effectData.type, effectData.id, true); 
                 if(addedEffectId){
                    const addedEffect = window.masterEffectsChain.find(e => e.id === addedEffectId);
                    if(addedEffect) { 
                        if (effectData.params) addedEffect.params = JSON.parse(JSON.stringify(effectData.params));
                        addedEffect.isBypassed = effectData.isBypassed || false;
                        addedEffect.storedWetValue = effectData.storedWetValue !== undefined ? effectData.storedWetValue : (addedEffect.params?.wet !== undefined ? addedEffect.params.wet : 1);
                        
                        if (typeof applyMasterEffectState === 'function') {
                            applyMasterEffectState(addedEffectId, addedEffect.params, addedEffect.isBypassed, addedEffect.storedWetValue);
                        }
                    }
                 }
            } 
        });
        if (window.masterEffectsChain.length > 0 && typeof audioRebuildMasterEffectChain === 'function') {
             audioRebuildMasterEffectChain();
        }
    }


    const trackPromises = [];
    if (projectData.tracks && Array.isArray(projectData.tracks)) {
        console.log(`[State - reconstructDAW] Reconstructing ${projectData.tracks.length} tracks.`);
        for (const trackData of projectData.tracks) {
            if (trackData.type === 'Synth' && !trackData.synthEngineType) trackData.synthEngineType = 'MonoSynth';
            trackPromises.push(addTrackToState(trackData.type, trackData, false)); 
        }
    }
    
    await Promise.all(trackPromises); 
    console.log("[State - reconstructDAW] All tracks added to state array.");

    // Wait for all track audio resources to be fully initialized.
    // This assumes fullyInitializeAudioResources (called in Track constructor) is async and its completion needs to be awaited.
    // This might require a more robust mechanism if fullyInitializeAudioResources has deeply nested async operations.
    // For now, we'll iterate and await, assuming each track's promise resolves.
    const allTrackResourcePromises = tracks.map(track => {
        if (track.fullyInitializeAudioResourcesPromise) { // Assuming Track class stores this promise
            return track.fullyInitializeAudioResourcesPromise;
        }
        return Promise.resolve();
    });

    try {
        await Promise.all(allTrackResourcePromises);
        console.log("[State - reconstructDAW] All track audio resources finalized (awaited from constructors).");
    } catch (error) {
        console.error("[State - reconstructDAW] Error finalizing track audio resources:", error);
    }


    if (gs) {
        soloedTrackId = gs.soloedTrackId || null;
        armedTrackId = gs.armedTrackId || null;
        console.log(`[State - reconstructDAW] Restored global soloId: ${soloedTrackId}, armedId: ${armedTrackId}`);
        tracks.forEach(t => {
            t.isSoloed = (t.id === soloedTrackId);
            t.applySoloState(soloedTrackId); 
            t.applyMuteState();
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

    // Final rebuild of master chain AFTER tracks are fully initialized and potentially connected to it.
    if (typeof audioRebuildMasterEffectChain === 'function') {
        console.log("[State - reconstructDAW] Final rebuild of master effect chain after all tracks initialized.");
        audioRebuildMasterEffectChain();
    }

    if (projectData.windowStates && Array.isArray(projectData.windowStates)) {
        console.log(`[State - reconstructDAW] Reconstructing ${projectData.windowStates.length} window states.`);
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
                            console.warn(`[State - reconstructDAW] Track ID ${trackIdForWin} for window ${key} not found. Skipping window.`);
                            continue;
                        }
                    } else if (key !== 'masterEffectsRack') { 
                        console.warn(`[State - reconstructDAW] Could not parse track ID from window key ${key}. Skipping window.`);
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

            } catch (e) { console.error(`[State - reconstructDAW] Error reconstructing window ${winState.id} (Key: ${key}):`, e); }
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
        if (typeof audioInitAudioContextAndMasterMeter === 'function') { 
            const audioReady = await audioInitAudioContextAndMasterMeter(true);
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
        const recordSource = (window.masterGainNode && !window.masterGainNode.disposed) ? window.masterGainNode : Tone.getDestination(); 
        recordSource.connect(recorder);
        
        console.log(`[State - exportToWav] Starting recording for ${maxDuration.toFixed(1)}s`);
        recorder.start();
        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)...`, Math.max(3000, maxDuration * 1000 + 1000));

        tracks.forEach(track => {
            if (track.sequence && !track.sequence.disposed) { 
                track.sequence.start(0);
            }
        });
        Tone.Transport.start("+0.1", 0);

        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000));

        Tone.Transport.stop();
        tracks.forEach(track => {
            if (track.sequence && !track.sequence.disposed) { 
                track.sequence.stop(0);
            }
        });
        console.log("[State - exportToWav] Stopped transport and sequences.");

        const recording = await recorder.stop();
        console.log("[State - exportToWav] Recorder stopped.");
        recorder.dispose();
        
        if (recordSource.connected && typeof recordSource.connected.includes === 'function' && recordSource.connected.includes(recorder)) { 
             try { recordSource.disconnect(recorder); } catch (e) { console.warn("Error disconnecting recorder from source", e); }
        }


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

console.log("[State.js] Parsed and exports should be available (IndexedDB version with full debug in reconstructDAW).");
