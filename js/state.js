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
    
    // If it's a brand new track added by the user, or if it's a track being reconstructed
    // (initialData exists, but it's not a direct user action like undo/redo),
    // then fully initialize its audio resources.
    if (isBrandNewUserTrack || (initialData && !isUserAction)) { 
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

    track.dispose(); // This should handle closing windows, disposing Tone nodes, etc.
    tracks.splice(trackIndex, 1);

    // Update global states if the removed track was active in them
    if (armedTrackId === trackId) armedTrackId = null;
    if (soloedTrackId === trackId) {
        soloedTrackId = null;
        // Re-evaluate solo states for all remaining tracks
        tracks.forEach(t => {
            t.isSoloed = false; // Reset first
            t.applySoloState(); // Then apply based on new global solo state (which is null)
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
        currentState.description = description; // Add description to the state object
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
        const currentStateForRedo = gatherProjectData(); // Capture current state BEFORE restoring
        currentStateForRedo.description = stateToRestore.description; // Keep the original action's description for redo
        redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo))); // Deep copy
        if (redoStack.length > Constants.MAX_HISTORY_STATES) {
            redoStack.shift();
        }

        showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        window.isReconstructingDAW = true; // Flag to prevent certain actions during reconstruction
        await reconstructDAW(stateToRestore, true); // true for isUndoRedo
        window.isReconstructingDAW = false;
        updateUndoRedoButtons();
    } catch (error) {
        window.isReconstructingDAW = false;
        console.error("[State] Error during undo:", error);
        showNotification("Error during undo operation. Project may be unstable.", 4000);
        updateUndoRedoButtons(); // Still update buttons even if error
    }
}

export async function redoLastAction() {
    if (redoStack.length === 0) {
        showNotification("Nothing to redo.", 1500);
        return;
    }
    try {
        const stateToRestore = redoStack.pop();
        const currentStateForUndo = gatherProjectData(); // Capture current state BEFORE restoring for undo
        currentStateForUndo.description = stateToRestore.description; // Keep the original action's description
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


// --- Project Data Handling ---
export function gatherProjectData() {
    console.log("[State] Gathering project data...");
    const projectData = {
        version: "5.6.0", // Increment as data structure changes significantly
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
                volume: track.previousVolumeBeforeMute, // Use previousVolumeBeforeMute for consistent saving
                activeEffects: track.activeEffects.map(effect => ({ 
                    id: effect.id,
                    type: effect.type,
                    params: JSON.parse(JSON.stringify(effect.params))
                })),
                sequenceLength: track.sequenceLength,
                sequenceData: JSON.parse(JSON.stringify(track.sequenceData)), // Deep copy
                automation: JSON.parse(JSON.stringify(track.automation)), // Deep copy
                selectedSliceForEdit: track.selectedSliceForEdit,
                waveformZoom: track.waveformZoom,
                waveformScrollOffset: track.waveformScrollOffset,
                slicerIsPolyphonic: track.slicerIsPolyphonic,
                selectedDrumPadForEdit: track.selectedDrumPadForEdit,
                instrumentSamplerIsPolyphonic: track.instrumentSamplerIsPolyphonic,
            };
             if (track.type === 'Synth') {
                trackData.synthEngineType = 'MonoSynth'; // Or track.synthEngineType if dynamic
                trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams));
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = { 
                    fileName: track.samplerAudioData.fileName, 
                    audioBufferDataURL: track.samplerAudioData.audioBufferDataURL, // Fallback
                    dbKey: track.samplerAudioData.dbKey, // Primary way to reload
                    status: track.samplerAudioData.status // Store status for UI hints on load
                };
                trackData.slices = JSON.parse(JSON.stringify(track.slices));
            } else if (track.type === 'DrumSampler') {
                trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({
                    originalFileName: p.originalFileName,
                    audioBufferDataURL: p.audioBufferDataURL, // Fallback
                    dbKey: p.dbKey, // Primary
                    volume: p.volume,
                    pitchShift: p.pitchShift,
                    envelope: JSON.parse(JSON.stringify(p.envelope)),
                    status: p.status
                }));
            } else if (track.type === 'InstrumentSampler') {
                trackData.instrumentSamplerSettings = {
                    originalFileName: track.instrumentSamplerSettings.originalFileName,
                    audioBufferDataURL: track.instrumentSamplerSettings.audioBufferDataURL, // Fallback
                    dbKey: track.instrumentSamplerSettings.dbKey, // Primary
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
             if (!win || !win.element) return null; // Skip if window or element is somehow gone
            return {
                id: win.id, title: win.title,
                left: win.element.style.left, top: win.element.style.top,
                width: win.element.style.width, height: win.element.style.height,
                zIndex: parseInt(win.element.style.zIndex),
                isMinimized: win.isMinimized,
                initialContentKey: win.initialContentKey // Store the key used to identify content type
            };
        }).filter(ws => ws !== null) // Filter out any null entries
    };
    return projectData;
}

export async function reconstructDAW(projectData, isUndoRedo = false) {
    window.isReconstructingDAW = true;
    console.log("[State - reconstructDAW] Starting. Is Undo/Redo:", isUndoRedo, "Project Version:", projectData.version);
    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel();

    // Ensure audio context and master bus are ready before creating tracks that connect to it
    if (typeof audioInitAudioContextAndMasterMeter === 'function') {
        console.log("[State - reconstructDAW] Ensuring audio context and master bus are initialized before track creation...");
        await audioInitAudioContextAndMasterMeter(true); // true for user-initiated context for safety
        console.log("[State - reconstructDAW] Master bus input after init:", window.masterEffectsBusInput);
        console.log("[State - reconstructDAW] Master gain node after init:", (typeof window.masterGainNode !== 'undefined' ? window.masterGainNode : " (masterGainNode not global)")); 
    } else {
        console.error("[State - reconstructDAW] audioInitAudioContextAndMasterMeter (from audio.js) is not defined!");
    }

    // Dispose existing tracks and their resources
    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0;

    // Dispose existing master effects
    if (window.masterEffectsChain) { // Check if it exists
        window.masterEffectsChain.forEach(effect => {
            if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose();
        });
    }
    window.masterEffectsChain = []; // Reset the array


    // Close all windows
    Object.values(window.openWindows || {}).forEach(win => { 
        if (win && typeof win.close === 'function') win.close(true); // Pass true to skip undo for this type of close
        else if (win && win.element && win.element.remove) win.element.remove();
    });
    window.openWindows = {};
    window.highestZIndex = 100;


    // Reset global states
    armedTrackId = null; soloedTrackId = null; activeSequencerTrackId = null;
    isRecording = false; recordingTrackId = null;
    if (window.recordBtn) { window.recordBtn.classList.remove('recording'); window.recordBtn.textContent = 'Record';}


    // Apply global settings
    const gs = projectData.globalSettings;
    if (gs) {
        Tone.Transport.bpm.value = gs.tempo || 120;
        if (window.masterGainNode && window.masterGainNode.gain && typeof window.masterGainNode.gain.value === 'number') {
            window.masterGainNode.gain.value = gs.masterVolume !== undefined ? gs.masterVolume : Tone.dbToGain(0);
             console.log(`[State - reconstructDAW] Set masterGainNode volume to: ${window.masterGainNode.gain.value}`);
        } else if (Tone.getDestination()?.volume) { // Fallback if masterGainNode isn't set up on window
            Tone.getDestination().volume.value = gs.masterVolume !== undefined ? gs.masterVolume : Tone.dbToGain(0); 
            console.warn(`[State - reconstructDAW] masterGainNode not available or invalid, set Tone.Destination().volume to: ${Tone.getDestination().volume.value}`);
        }

        if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        window.highestZIndex = gs.highestZIndex || 100;
    }

    // Reconstruct Master Effects
    if (projectData.masterEffects && Array.isArray(projectData.masterEffects)) {
        console.log("[State - reconstructDAW] Reconstructing master effects:", projectData.masterEffects.length);
        projectData.masterEffects.forEach(effectData => {
            if (typeof audioAddMasterEffect === 'function') {
                 const addedEffectId = audioAddMasterEffect(effectData.type); // This should create and add to window.masterEffectsChain
                 if(addedEffectId){
                    const addedEffect = window.masterEffectsChain.find(e => e.id === addedEffectId);
                    if(addedEffect && effectData.params) { // If params were saved
                        addedEffect.params = JSON.parse(JSON.stringify(effectData.params)); // Restore stored params
                        
                        // Apply these params to the actual Tone.js node
                        if(addedEffect.toneNode && !addedEffect.toneNode.disposed) {
                            try {
                                if (typeof addedEffect.toneNode.set === 'function') {
                                    addedEffect.toneNode.set(addedEffect.params);
                                } else {
                                    // Fallback for nodes without a .set method, try direct assignment
                                    for (const paramKey in addedEffect.params) {
                                        if (Object.hasOwnProperty.call(addedEffect.params, paramKey)) {
                                            const value = addedEffect.params[paramKey];
                                            let target = addedEffect.toneNode;
                                            const keys = paramKey.split('.');
                                            let currentParamObj = target;
                                            for (let i = 0; i < keys.length - 1; i++) {
                                                currentParamObj = currentParamObj[keys[i]];
                                                 if (!currentParamObj) break;
                                            }

                                            if (currentParamObj && typeof currentParamObj[keys[keys.length -1]] !== 'undefined') {
                                                if (currentParamObj[keys[keys.length -1]] && typeof currentParamObj[keys[keys.length -1]].value !== 'undefined') {
                                                    currentParamObj[keys[keys.length -1]].value = value; // For Signal/Param objects
                                                } else {
                                                    currentParamObj[keys[keys.length -1]] = value; // For direct properties
                                                }
                                            } else {
                                                 console.warn(`[State - reconstructDAW] Could not set nested param ${paramKey} on master effect ${effectData.type}`);
                                            }
                                        }
                                    }
                                }
                                console.log(`[State - reconstructDAW] Applied params to master effect ${effectData.type}`);
                            } catch (e) {
                                console.warn(`[State - reconstructDAW] Error setting params on master effect ${effectData.type}:`, e);
                            }
                        } else {
                             console.warn(`[State - reconstructDAW] Master effect ${effectData.type} toneNode is disposed or missing, cannot set params.`);
                        }
                    }
                 }
            } 
        });
        if (window.masterEffectsChain.length > 0 && typeof audioRebuildMasterEffectChain === 'function') {
             console.log("[State - reconstructDAW] Explicitly rebuilding master effect chain after loading all master effects and their params.");
             audioRebuildMasterEffectChain();
        }
    }


    // Reconstruct tracks
    const trackInitPromises = [];
    if (projectData.tracks && Array.isArray(projectData.tracks)) {
        console.log(`[State - reconstructDAW] Reconstructing ${projectData.tracks.length} tracks.`);
        for (const trackData of projectData.tracks) {
            if (trackData.type === 'Synth') trackData.synthEngineType = 'MonoSynth'; // Ensure this if it was implicit
            trackInitPromises.push(addTrackToState(trackData.type, trackData, false)); // false for isUserAction
        }
    }
    
    await Promise.all(trackInitPromises);
    console.log("[State - reconstructDAW] All tracks added to state.");

    // After all tracks are created, initialize their audio resources (which might involve async DB calls)
    const finalResourcePromises = tracks.map(track => {
        if (typeof track.fullyInitializeAudioResources === 'function') {
            return track.fullyInitializeAudioResources();
        }
        return Promise.resolve();
    });
    try {
        await Promise.all(finalResourcePromises);
        console.log("[State - reconstructDAW] All track audio resources finalized.");
    } catch (error) {
        console.error("[State - reconstructDAW] Error finalizing track audio resources:", error);
    }

    // One final rebuild of master chain to ensure tracks connect correctly
    if (typeof audioRebuildMasterEffectChain === 'function') {
        console.log("[State - reconstructDAW] Final rebuild of master effect chain after all tracks initialized.");
        audioRebuildMasterEffectChain();
    }


    // Restore global solo/arm states and MIDI input
    if (gs) {
        soloedTrackId = gs.soloedTrackId || null;
        armedTrackId = gs.armedTrackId || null;
        console.log(`[State - reconstructDAW] Restored global soloId: ${soloedTrackId}, armedId: ${armedTrackId}`);
        tracks.forEach(t => {
            t.isSoloed = (t.id === soloedTrackId);
            t.applyMuteState(); // This will also consider solo state
            t.applySoloState(); // Explicitly apply solo
        });
        // Restore MIDI input selection
         if (gs.activeMIDIInputId && window.midiAccess && window.midiInputSelectGlobal) {
            const inputExists = Array.from(window.midiInputSelectGlobal.options).some(opt => opt.value === gs.activeMIDIInputId);
            if (inputExists) window.midiInputSelectGlobal.value = gs.activeMIDIInputId;
            else window.midiInputSelectGlobal.value = ""; // Default if not found
            if(typeof window.selectMIDIInput === 'function') window.selectMIDIInput(true); // true to skip notification
        } else if (window.midiInputSelectGlobal && typeof window.selectMIDIInput === 'function') {
            window.midiInputSelectGlobal.value = ""; // No selection
            window.selectMIDIInput(true);
        }
    }

    // Reconstruct window states
    if (projectData.windowStates && Array.isArray(projectData.windowStates)) {
        console.log(`[State - reconstructDAW] Reconstructing ${projectData.windowStates.length} window states.`);
        // Sort by zIndex to open them in the correct visual order
        const sortedWindowStates = projectData.windowStates.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0) );
        for (const winState of sortedWindowStates) {
             if (!winState || !winState.id) continue; // Skip invalid states
            const key = winState.initialContentKey || winState.id; // Use initialContentKey for identification
            try {
                let trackForWindow = null;
                if (key && (key.startsWith('trackInspector-') || key.startsWith('effectsRack-') || key.startsWith('sequencerWin-'))) {
                    const trackIdForWinStr = key.split('-')[1];
                    if (trackIdForWinStr) {
                        const trackIdForWin = parseInt(trackIdForWinStr);
                        trackForWindow = getTrackById(trackIdForWin);
                        if (!trackForWindow && key !== 'masterEffectsRack') { // Allow masterEffectsRack to proceed without a track
                            console.warn(`[State - reconstructDAW] Track ID ${trackIdForWin} for window ${key} not found. Skipping window.`);
                            continue;
                        }
                    } else if (key !== 'masterEffectsRack') { // Allow masterEffectsRack
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
                else if (trackForWindow && key.startsWith('sequencerWin-') && typeof window.openTrackSequencerWindow === 'function') window.openTrackSequencerWindow(trackForWindow.id, true, winState); // true for forceRedraw with savedState

            } catch (e) { console.error(`[State - reconstructDAW] Error reconstructing window ${winState.id} (Key: ${key}):`, e); }
        }
    }


    // Final UI updates
    if(typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    tracks.forEach(track => { // Update individual track UI elements that might depend on global state
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
                undoStack = []; // Clear history on new project load
                redoStack = [];
                await reconstructDAW(projectData, false); // false for isUndoRedo
                captureStateForUndo("Load Project"); // Initial state after load
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
    if (event.target) event.target.value = null; // Reset file input
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
            await new Promise(resolve => setTimeout(resolve, 200)); // Short delay to ensure stop
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
        if (maxDuration === 0) maxDuration = 5; // Default to 5s if no sequences
        maxDuration += 1; // Add a little buffer


        const recorder = new Tone.Recorder();
        const recordSource = (window.masterGainNode && !window.masterGainNode.disposed) ? window.masterGainNode : Tone.getDestination(); 
        recordSource.connect(recorder);
        
        console.log(`[State - exportToWav] Starting recording for ${maxDuration.toFixed(1)}s`);
        recorder.start();
        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)...`, Math.max(3000, maxDuration * 1000 + 1000));

        tracks.forEach(track => {
            if (track.sequence) {
                track.sequence.start(0);
                // The problematic line "track.sequence.progress = 0;" has been removed.
            }
        });
        Tone.Transport.start("+0.1", 0);

        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000));

        Tone.Transport.stop();
        tracks.forEach(track => {
            if (track.sequence && !track.sequence.disposed) { // Check if disposed
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

