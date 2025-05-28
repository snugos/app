// js/state.js - Application State Management
import * as Constants from './constants.js'; // For MAX_HISTORY_STATES
import { showNotification, showConfirmationDialog } from './utils.js';
import { Track } from './Track.js';
import { createEffectInstance } from './effectsRegistry.js';
import {
    rebuildMasterEffectChain as audioRebuildMasterEffectChain,
    addMasterEffect as audioAddMasterEffect,
    initAudioContextAndMasterMeter as audioInitAudioContextAndMasterMeter
} from './audio.js';
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
/**
 * Adds a new track to the application state.
 * @param {string} type - The type of track to add (e.g., 'Synth', 'Sampler').
 * @param {object|null} [initialData=null] - Data to initialize the track with (used for loading projects/undo).
 * @param {boolean} [isUserAction=true] - Whether this is a direct user action (for undo capture).
 * @returns {Promise<Track>} The newly created track instance.
 */
export async function addTrackToState(type, initialData = null, isUserAction = true) {
    const isBrandNewUserTrack = isUserAction && (!initialData || initialData._isUserActionPlaceholder);

    if (isBrandNewUserTrack) {
        captureStateForUndo(`Add ${type} Track`);
        if (initialData && initialData._isUserActionPlaceholder) initialData = null;
    }

    let newTrackId;
    if (initialData && initialData.id != null) {
        newTrackId = initialData.id;
        // Ensure trackIdCounter is always higher than any loaded ID
        if (newTrackId > trackIdCounter) trackIdCounter = newTrackId;
    } else {
        trackIdCounter++;
        newTrackId = trackIdCounter;
    }

    const newTrack = new Track(newTrackId, type, initialData);
    tracks.push(newTrack);

    // Initialize basic audio nodes (Gain, Meter).
    // The actual audio buffer loading for samplers will happen in reconstructDAW or via audio.js for new loads.
    if (typeof newTrack.initializeAudioNodes === 'function') {
        await newTrack.initializeAudioNodes();
    } else {
        console.warn(`[State] Track ${newTrack.id} does not have initializeAudioNodes method.`);
    }

    // For brand new tracks created by user, or tracks being loaded (where initialData is present but not a user action placeholder),
    // call fullyInitializeAudioResources. This will set up instruments, players, sequences.
    // For loaded tracks, this should happen AFTER audio buffers are loaded from IndexedDB in reconstructDAW.
    if (isBrandNewUserTrack || (initialData && !isUserAction && !window.isReconstructingDAW)) { // Avoid double init during reconstructDAW
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

/**
 * Removes a track from the application state and disposes its resources.
 * @param {number} trackId - The ID of the track to remove.
 */
export function removeTrackFromState(trackId) {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) {
        console.warn(`[State] Attempted to remove non-existent track ID: ${trackId}`);
        return;
    }
    const track = tracks[trackIndex];
    captureStateForUndo(`Remove Track "${track.name}"`);

    track.dispose(); // This should handle Tone.js objects and potentially DB cleanup via Track.dispose()
    tracks.splice(trackIndex, 1);

    // Update global state if the removed track was active
    if (armedTrackId === trackId) armedTrackId = null;
    if (soloedTrackId === trackId) {
        soloedTrackId = null;
        // Re-evaluate solo states for all remaining tracks
        tracks.forEach(t => {
            t.isSoloed = false; // Reset solo flag
            t.applySoloState(); // Apply new state (will unmute if no other solo)
        });
    }
    if (activeSequencerTrackId === trackId) activeSequencerTrackId = null;

    showNotification(`Track "${track.name}" removed.`, 2000);
    if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    updateUndoRedoButtons();
}


// --- Undo/Redo Logic ---
/**
 * Updates the enabled/disabled state and tooltips of undo/redo menu items.
 */
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

/**
 * Captures the current application state for undo history.
 * @param {string} [description="Unknown action"] - A description of the action being undone.
 */
export function captureStateForUndo(description = "Unknown action") {
    console.log("[State] Capturing state for undo:", description);
    try {
        // IMPORTANT: gatherProjectData now returns state with audioDbKeys, not full audio data.
        const currentState = gatherProjectData();
        currentState.description = description;
        undoStack.push(JSON.parse(JSON.stringify(currentState))); // Stringify/parse for deep copy
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift(); // Limit undo history size
        }
        redoStack = []; // Clear redo stack on new action
        updateUndoRedoButtons();
    } catch (error) {
        console.error("[State] Error capturing state for undo:", error);
        showNotification("Error capturing undo state. See console for details.", 3000);
    }
}

/**
 * Reverts to the previous state in the undo history.
 */
export async function undoLastAction() {
    if (undoStack.length === 0) {
        showNotification("Nothing to undo.", 1500);
        return;
    }
    try {
        const stateToRestore = undoStack.pop();
        const currentStateForRedo = gatherProjectData(); // Capture current state for redo
        currentStateForRedo.description = stateToRestore.description; // Use description from undone action
        redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo)));
        if (redoStack.length > Constants.MAX_HISTORY_STATES) {
            redoStack.shift();
        }

        showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        window.isReconstructingDAW = true; // Flag to prevent certain actions during reconstruction
        await reconstructDAW(stateToRestore, true); // Pass true for isUndoRedo
        window.isReconstructingDAW = false;
        updateUndoRedoButtons();
    } catch (error) {
        window.isReconstructingDAW = false;
        console.error("[State] Error during undo:", error);
        showNotification("Error during undo operation. Project may be unstable.", 4000);
        updateUndoRedoButtons();
    }
}

/**
 * Re-applies the last undone action from the redo history.
 */
export async function redoLastAction() {
    if (redoStack.length === 0) {
        showNotification("Nothing to redo.", 1500);
        return;
    }
    try {
        const stateToRestore = redoStack.pop();
        const currentStateForUndo = gatherProjectData(); // Capture current state for undo
        currentStateForUndo.description = stateToRestore.description;
        undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo)));
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }

        showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
        window.isReconstructingDAW = true;
        await reconstructDAW(stateToRestore, true); // Pass true for isUndoRedo
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
/**
 * Gathers all relevant project data into a serializable object.
 * Audio data is referenced by IndexedDB keys, not included directly.
 * @returns {object} The project data object.
 */
export function gatherProjectData() {
    console.log("[State] Gathering project data...");
    const projectData = {
        version: "5.7.0", // Incremented version for IndexedDB change
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
            params: JSON.parse(JSON.stringify(effect.params)) // Deep copy params
        })),
        tracks: tracks.map(track => {
            const trackData = {
                id: track.id, type: track.type, name: track.name,
                isMuted: track.isMuted,
                volume: track.previousVolumeBeforeMute, // Save the pre-mute volume
                activeEffects: track.activeEffects.map(effect => ({
                    id: effect.id,
                    type: effect.type,
                    params: JSON.parse(JSON.stringify(effect.params))
                })),
                sequenceLength: track.sequenceLength,
                sequenceData: JSON.parse(JSON.stringify(track.sequenceData)), // Deep copy sequence
                automation: JSON.parse(JSON.stringify(track.automation)),
                selectedSliceForEdit: track.selectedSliceForEdit, // For Sampler
                waveformZoom: track.waveformZoom,
                waveformScrollOffset: track.waveformScrollOffset,
                slicerIsPolyphonic: track.slicerIsPolyphonic,
                selectedDrumPadForEdit: track.selectedDrumPadForEdit, // For DrumSampler
                instrumentSamplerIsPolyphonic: track.instrumentSamplerIsPolyphonic,
            };
             if (track.type === 'Synth') {
                trackData.synthEngineType = 'MonoSynth'; // Or track.synthEngineType
                trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams));
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = { // Store reference, not data
                    fileName: track.originalFileName, // Or track.samplerAudioData.fileName
                    audioDbKey: track.samplerAudioData?.audioDbKey || null
                };
                trackData.slices = JSON.parse(JSON.stringify(track.slices));
            } else if (track.type === 'DrumSampler') {
                trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({
                    originalFileName: p.originalFileName,
                    audioDbKey: p.audioDbKey || null, // Store reference
                    volume: p.volume,
                    pitchShift: p.pitchShift,
                    envelope: JSON.parse(JSON.stringify(p.envelope))
                }));
            } else if (track.type === 'InstrumentSampler') {
                trackData.instrumentSamplerSettings = {
                    originalFileName: track.instrumentSamplerSettings.originalFileName,
                    audioDbKey: track.instrumentSamplerSettings.audioDbKey || null, // Store reference
                    rootNote: track.instrumentSamplerSettings.rootNote,
                    loop: track.instrumentSamplerSettings.loop,
                    loopStart: track.instrumentSamplerSettings.loopStart,
                    loopEnd: track.instrumentSamplerSettings.loopEnd,
                    envelope: JSON.parse(JSON.stringify(track.instrumentSamplerSettings.envelope)),
                };
            }
            return trackData;
        }),
        windowStates: Object.values(window.openWindows || {}).map(win => {
             if (!win || !win.element) return null; // Skip if window somehow became invalid
            return {
                id: win.id, title: win.title,
                left: win.element.style.left, top: win.element.style.top,
                width: win.element.style.width, height: win.element.style.height,
                zIndex: parseInt(win.element.style.zIndex),
                isMinimized: win.isMinimized,
                initialContentKey: win.initialContentKey // Used to reopen the correct window type
            };
        }).filter(ws => ws !== null) // Remove any null entries
    };
    return projectData;
}

/**
 * Reconstructs the entire DAW state from a project data object.
 * This involves clearing current state, recreating tracks, loading audio from IndexedDB,
 * setting up effects, and restoring window positions.
 * @param {object} projectData - The project data object to load.
 * @param {boolean} [isUndoRedo=false] - True if called from an undo/redo operation.
 */
export async function reconstructDAW(projectData, isUndoRedo = false) {
    window.isReconstructingDAW = true; // Set flag
    console.log("[State - reconstructDAW] Starting. Is Undo/Redo:", isUndoRedo, "Project Version:", projectData.version);

    // Stop transport and cancel scheduled events
    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel();

    // Ensure audio context and master bus are ready
    if (typeof audioInitAudioContextAndMasterMeter === 'function') {
        await audioInitAudioContextAndMasterMeter(true); // Force user interaction if needed
    }

    // Clear existing tracks and their resources
    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0; // Reset counter, will be updated by loaded track IDs

    // Clear master effects
    if (window.masterEffectsChain) {
        window.masterEffectsChain.forEach(effect => {
            if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose();
        });
    }
    window.masterEffectsChain = [];

    // Close all open windows
    Object.values(window.openWindows || {}).forEach(win => {
        if (win && typeof win.close === 'function') win.close(true); // Pass true to skip undo capture
        else if (win && win.element && win.element.remove) win.element.remove();
    });
    window.openWindows = {};
    window.highestZIndex = 100; // Reset z-index counter

    // Reset global playback/recording states
    armedTrackId = null; soloedTrackId = null; activeSequencerTrackId = null;
    isRecording = false; recordingTrackId = null;
    if (window.recordBtn) { window.recordBtn.classList.remove('recording'); window.recordBtn.textContent = 'Record';}

    // Apply global settings
    const gs = projectData.globalSettings;
    if (gs) {
        Tone.Transport.bpm.value = gs.tempo || 120;
        if (window.masterGainNode && window.masterGainNode.gain && typeof window.masterGainNode.gain.value === 'number') {
            window.masterGainNode.gain.value = gs.masterVolume !== undefined ? gs.masterVolume : Tone.dbToGain(0);
        } else if (Tone.getDestination()?.volume) {
            Tone.getDestination().volume.value = gs.masterVolume !== undefined ? gs.masterVolume : Tone.dbToGain(0);
        }
        if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        window.highestZIndex = gs.highestZIndex || 100;
    }

    // Reconstruct master effects (before tracks, so tracks can connect to it)
    if (projectData.masterEffects && Array.isArray(projectData.masterEffects)) {
        console.log("[State - reconstructDAW] Reconstructing master effects:", projectData.masterEffects.length);
        projectData.masterEffects.forEach(effectData => {
            if (typeof audioAddMasterEffect === 'function') {
                 const addedEffectId = audioAddMasterEffect(effectData.type); // This adds to window.masterEffectsChain and rebuilds
                 if(addedEffectId){
                    const addedEffect = window.masterEffectsChain.find(e => e.id === addedEffectId);
                    if(addedEffect && effectData.params) {
                        addedEffect.params = JSON.parse(JSON.stringify(effectData.params)); // Restore saved params
                        if(addedEffect.toneNode && !addedEffect.toneNode.disposed && typeof addedEffect.toneNode.set === 'function') {
                            try {
                                addedEffect.toneNode.set(addedEffect.params); // Apply params to Tone node
                            } catch (e) { console.warn(`Error setting params on master effect ${effectData.type}:`, e); }
                        }
                    }
                 }
            }
        });
        if (window.masterEffectsChain.length > 0 && typeof audioRebuildMasterEffectChain === 'function') {
             audioRebuildMasterEffectChain(); // Final rebuild after all master effects are added and params potentially set
        }
    }


    // Create track instances (without fully initializing audio resources yet if they depend on DB)
    const trackCreationPromises = [];
    if (projectData.tracks && Array.isArray(projectData.tracks)) {
        console.log(`[State - reconstructDAW] Re-creating ${projectData.tracks.length} track instances.`);
        for (const trackData of projectData.tracks) {
            if (trackData.type === 'Synth' && !trackData.synthEngineType) trackData.synthEngineType = 'MonoSynth'; // Ensure default
            // Pass false for isUserAction, as this is part of project load/undo
            trackCreationPromises.push(addTrackToState(trackData.type, trackData, false));
        }
    }
    await Promise.all(trackCreationPromises); // `tracks` global array is now populated
    console.log("[State - reconstructDAW] All track instances created.");

    // Load audio from IndexedDB for all sample-based tracks
    console.log("[State - reconstructDAW] Loading audio from IndexedDB for tracks...");
    for (const track of tracks) { // Iterate over the newly created track instances
        try {
            if (track.type === 'Sampler' && track.samplerAudioData?.audioDbKey) {
                const audioBlob = await getAudio(track.samplerAudioData.audioDbKey);
                if (audioBlob) {
                    const objectURL = URL.createObjectURL(audioBlob);
                    try {
                        if (track.audioBuffer && !track.audioBuffer.disposed) track.audioBuffer.dispose();
                        track.audioBuffer = await new Tone.Buffer().load(objectURL);
                        track.originalFileName = track.samplerAudioData.fileName; // Restore original filename
                        console.log(`[State - reconstructDAW] Loaded Sampler audio for track ${track.id} from DB key ${track.samplerAudioData.audioDbKey}`);
                    } finally { URL.revokeObjectURL(objectURL); }
                } else { console.warn(`[State - reconstructDAW] Sampler audio not found in DB for track ${track.id}, key: ${track.samplerAudioData.audioDbKey}. File: ${track.samplerAudioData.fileName}`); }
            } else if (track.type === 'InstrumentSampler' && track.instrumentSamplerSettings?.audioDbKey) {
                const audioBlob = await getAudio(track.instrumentSamplerSettings.audioDbKey);
                if (audioBlob) {
                    const objectURL = URL.createObjectURL(audioBlob);
                    try {
                        if (track.instrumentSamplerSettings.audioBuffer && !track.instrumentSamplerSettings.audioBuffer.disposed) track.instrumentSamplerSettings.audioBuffer.dispose();
                        track.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(objectURL);
                        track.instrumentSamplerSettings.originalFileName = track.instrumentSamplerSettings.fileName || track.instrumentSamplerSettings.originalFileName; // Restore
                         console.log(`[State - reconstructDAW] Loaded InstrumentSampler audio for track ${track.id} from DB key ${track.instrumentSamplerSettings.audioDbKey}`);
                    } finally { URL.revokeObjectURL(objectURL); }
                } else { console.warn(`[State - reconstructDAW] InstrumentSampler audio not found for track ${track.id}, key: ${track.instrumentSamplerSettings.audioDbKey}. File: ${track.instrumentSamplerSettings.originalFileName}`);}
            } else if (track.type === 'DrumSampler') {
                for (const pad of track.drumSamplerPads) {
                    if (pad.audioDbKey) {
                        const audioBlob = await getAudio(pad.audioDbKey);
                        if (audioBlob) {
                            const objectURL = URL.createObjectURL(audioBlob);
                            try {
                                if (pad.audioBuffer && !pad.audioBuffer.disposed) pad.audioBuffer.dispose();
                                pad.audioBuffer = await new Tone.Buffer().load(objectURL);
                                // pad.originalFileName is already set from initialData during Track construction
                                console.log(`[State - reconstructDAW] Loaded DrumSampler pad audio for track ${track.id} (pad file: ${pad.originalFileName}) from DB key ${pad.audioDbKey}`);
                            } finally { URL.revokeObjectURL(objectURL); }
                        } else { console.warn(`[State - reconstructDAW] DrumSampler pad audio not found for track ${track.id}, pad file: ${pad.originalFileName}, key: ${pad.audioDbKey}`); }
                    }
                }
            }
        } catch (e) {
            console.error(`[State - reconstructDAW] Error loading audio from DB for track ${track.id}:`, e);
            showNotification(`Error loading audio for ${track.name}. Some samples may be missing.`, 3000);
        }
    }
    console.log("[State - reconstructDAW] Finished loading audio from IndexedDB for tracks.");

    // Now, fully initialize track resources (players, samplers, sequences which might depend on loaded buffers or slice counts)
    const finalResourcePromises = tracks.map(track => {
        if (typeof track.fullyInitializeAudioResources === 'function') {
            return track.fullyInitializeAudioResources();
        }
        return Promise.resolve();
    });
    try {
        await Promise.all(finalResourcePromises);
        console.log("[State - reconstructDAW] All track audio resources finalized (players, samplers, sequences).");
    } catch (error) {
        console.error("[State - reconstructDAW] Error finalizing track audio resources:", error);
    }

    // Rebuild master effect chain one last time in case track connections need it
    if (typeof audioRebuildMasterEffectChain === 'function') {
        audioRebuildMasterEffectChain();
    }

    // Restore global solo/arm states and apply them
    if (gs) {
        soloedTrackId = gs.soloedTrackId || null;
        armedTrackId = gs.armedTrackId || null;
        console.log(`[State - reconstructDAW] Restored global soloId: ${soloedTrackId}, armedId: ${armedTrackId}`);
        tracks.forEach(t => {
            t.isSoloed = (t.id === soloedTrackId);
            t.applyMuteState(); // Apply mute first
            t.applySoloState(); // Then apply solo logic
        });
         if (gs.activeMIDIInputId && window.midiAccess && window.midiInputSelectGlobal) {
            const inputExists = Array.from(window.midiInputSelectGlobal.options).some(opt => opt.value === gs.activeMIDIInputId);
            if (inputExists) window.midiInputSelectGlobal.value = gs.activeMIDIInputId;
            else window.midiInputSelectGlobal.value = ""; // Default if saved MIDI device not found
            if(typeof window.selectMIDIInput === 'function') window.selectMIDIInput(true); // true to skip notification
        } else if (window.midiInputSelectGlobal && typeof window.selectMIDIInput === 'function') {
            window.midiInputSelectGlobal.value = ""; // No MIDI input selected
            window.selectMIDIInput(true);
        }
    }

    // Restore window states
    if (projectData.windowStates && Array.isArray(projectData.windowStates)) {
        console.log(`[State - reconstructDAW] Reconstructing ${projectData.windowStates.length} window states.`);
        const sortedWindowStates = projectData.windowStates.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0) );
        for (const winState of sortedWindowStates) {
             if (!winState || !winState.id) continue;
            const key = winState.initialContentKey || winState.id; // Key used to determine which function opens the window
            try {
                let trackForWindow = null;
                if (key && (key.startsWith('trackInspector-') || key.startsWith('effectsRack-') || key.startsWith('sequencerWin-'))) {
                    const trackIdForWinStr = key.split('-')[1];
                    if (trackIdForWinStr) {
                        const trackIdForWin = parseInt(trackIdForWinStr);
                        trackForWindow = getTrackById(trackIdForWin); // Use the newly populated tracks array
                        if (!trackForWindow && key !== 'masterEffectsRack') {
                            console.warn(`[State - reconstructDAW] Track ID ${trackIdForWin} for window ${key} not found. Skipping window.`);
                            continue;
                        }
                    } else if (key !== 'masterEffectsRack') {
                        console.warn(`[State - reconstructDAW] Could not parse track ID from window key ${key}. Skipping window.`);
                        continue;
                    }
                }

                // Call appropriate window opening functions
                if (key === 'globalControls' && typeof window.openGlobalControlsWindow === 'function') window.openGlobalControlsWindow(winState);
                else if (key === 'mixer' && typeof window.openMixerWindow === 'function') window.openMixerWindow(winState);
                else if (key === 'soundBrowser' && typeof window.openSoundBrowserWindow === 'function') window.openSoundBrowserWindow(winState);
                else if (key === 'masterEffectsRack' && typeof window.openMasterEffectsRackWindow === 'function') window.openMasterEffectsRackWindow(winState);
                else if (trackForWindow && key.startsWith('trackInspector-') && typeof window.openTrackInspectorWindow === 'function') window.openTrackInspectorWindow(trackForWindow.id, winState);
                else if (trackForWindow && key.startsWith('effectsRack-') && typeof window.openTrackEffectsRackWindow === 'function') window.openTrackEffectsRackWindow(trackForWindow.id, winState);
                else if (trackForWindow && key.startsWith('sequencerWin-') && typeof window.openTrackSequencerWindow === 'function') window.openTrackSequencerWindow(trackForWindow.id, true, winState); // true for forceRedraw

            } catch (e) { console.error(`[State - reconstructDAW] Error reconstructing window ${winState.id} (Key: ${key}):`, e); }
        }
    }

    // Final UI updates
    if(typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    tracks.forEach(track => { // Update UI state for armed/solo/mute buttons in inspectors
        if (track.inspectorWindow && track.inspectorWindow.element) {
            const inspectorArmBtn = track.inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);
            if (inspectorArmBtn) inspectorArmBtn.classList.toggle('armed', armedTrackId === track.id);
            const inspectorSoloBtn = track.inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
            if (inspectorSoloBtn) inspectorSoloBtn.classList.toggle('soloed', track.isSoloed);
            const inspectorMuteBtn = track.inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
            if (inspectorMuteBtn) inspectorMuteBtn.classList.toggle('muted', track.isMuted);
        }
        // Redraw waveforms if applicable and buffers are loaded
        if(typeof window.drawWaveform === 'function' && (track.type === 'Sampler') && track.audioBuffer?.loaded) window.drawWaveform(track);
        if(typeof window.drawInstrumentWaveform === 'function' && (track.type === 'InstrumentSampler') && track.instrumentSamplerSettings.audioBuffer?.loaded) window.drawInstrumentWaveform(track);
    });
    updateUndoRedoButtons();

    window.isReconstructingDAW = false; // Clear flag
    if (!isUndoRedo) showNotification(`Project loaded successfully.`, 3500);
    else showNotification(`Operation ${stateToRestore.description} ${undoStack.length > redoStack.length ? 'undone' : 'redone'}.`, 2000); // Simple undo/redo message
    console.log("[State] DAW Reconstructed successfully.");
}

/**
 * Saves the current project data to a .snug file.
 */
export function saveProject() {
    try {
        const projectData = gatherProjectData();
        const jsonString = JSON.stringify(projectData, null, 2); // Pretty print JSON
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

/**
 * Triggers the file input dialog for loading a project.
 */
export function loadProject() {
    const loadProjectInputEl = document.getElementById('loadProjectInput');
    if (loadProjectInputEl) loadProjectInputEl.click();
    else {
        console.error("[State] Load project input element not found.");
        showNotification("Error: File input for loading project not found.", 3000);
    }
}

/**
 * Handles the loading of a project file selected by the user.
 * @param {Event} event - The file input change event.
 */
export async function handleProjectFileLoad(event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.snug')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                // Clear undo/redo stacks before loading a new project
                undoStack = [];
                redoStack = [];
                await reconstructDAW(projectData, false); // false for isUndoRedo
                captureStateForUndo("Load Project"); // Initial state after load for undo
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

/**
 * Exports the current project audio to a WAV file.
 */
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
            await new Promise(resolve => setTimeout(resolve, 200)); // Short delay for transport to fully stop
        }
        Tone.Transport.position = 0; // Reset transport to the beginning
        let maxDuration = 0;
        tracks.forEach(track => {
            if (track.sequence && track.sequenceLength > 0) {
                const sixteenthNoteTime = Tone.Time("16n").toSeconds();
                const trackDuration = track.sequenceLength * sixteenthNoteTime;
                if (trackDuration > maxDuration) maxDuration = trackDuration;
            }
        });
        if (maxDuration === 0) maxDuration = 5; // Default duration if no sequences
        maxDuration += 1; // Add a little buffer for reverb tails etc.


        const recorder = new Tone.Recorder();
        // Connect the main output (after master effects) to the recorder
        const recordSource = (window.masterGainNode && !window.masterGainNode.disposed) ? window.masterGainNode : Tone.getDestination();
        recordSource.connect(recorder);

        console.log(`[State - exportToWav] Starting recording for ${maxDuration.toFixed(1)}s`);
        recorder.start();
        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)... This may take a moment.`, Math.max(3000, maxDuration * 1000 + 1000));

        // Start all track sequences
        tracks.forEach(track => {
            if (track.sequence && !track.sequence.disposed) {
                track.sequence.start(0); // Start sequence at time 0 of the transport
            }
        });
        Tone.Transport.start("+0.1", 0); // Start transport slightly ahead, at time 0

        // Wait for the duration of the recording
        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000));

        Tone.Transport.stop(); // Stop transport
        tracks.forEach(track => { // Stop individual sequences
            if (track.sequence && !track.sequence.disposed) {
                track.sequence.stop(0);
            }
        });
        console.log("[State - exportToWav] Stopped transport and sequences.");

        const recording = await recorder.stop(); // Stop recorder and get Blob
        console.log("[State - exportToWav] Recorder stopped.");
        recorder.dispose();

        // Disconnect recorder from source
        if (recordSource.connected && recordSource.connected.includes && recordSource.connected.includes(recorder)) {
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

console.log("[State.js] Parsed and exports should be available (IndexedDB version).");
