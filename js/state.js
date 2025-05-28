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

    if (typeof newTrack.initializeAudioNodes === 'function') {
        await newTrack.initializeAudioNodes();
    } else {
        console.warn(`[State] Track ${newTrack.id} does not have initializeAudioNodes method.`);
    }

    if (isBrandNewUserTrack || (initialData && !isUserAction && !window.isReconstructingDAW)) {
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
/**
 * Gathers all relevant project data into a serializable object.
 * Audio data is referenced by IndexedDB keys, not included directly.
 * @returns {object} The project data object.
 */
export function gatherProjectData() {
    console.log("[State] Gathering project data...");
    const projectData = {
        version: "5.7.0", // Version indicating IndexedDB usage for audio
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
                trackData.synthEngineType = track.synthEngineType || 'MonoSynth';
                trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams));
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = {
                    fileName: track.originalFileName, // Or track.samplerAudioData.fileName if preferred
                    audioDbKey: track.samplerAudioData?.audioDbKey || null
                };
                trackData.slices = JSON.parse(JSON.stringify(track.slices));
            } else if (track.type === 'DrumSampler') {
                trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({
                    originalFileName: p.originalFileName,
                    audioDbKey: p.audioDbKey || null,
                    volume: p.volume,
                    pitchShift: p.pitchShift,
                    envelope: JSON.parse(JSON.stringify(p.envelope))
                }));
            } else if (track.type === 'InstrumentSampler') {
                trackData.instrumentSamplerSettings = {
                    originalFileName: track.instrumentSamplerSettings.originalFileName,
                    audioDbKey: track.instrumentSamplerSettings.audioDbKey || null,
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

/**
 * Reconstructs the entire DAW state from a project data object.
 * This involves clearing current state, recreating tracks, loading audio from IndexedDB,
 * setting up effects, and restoring window positions.
 * @param {object} projectData - The project data object to load.
 * @param {boolean} [isUndoRedo=false] - True if called from an undo/redo operation.
 */
export async function reconstructDAW(projectData, isUndoRedo = false) {
    window.isReconstructingDAW = true;
    console.log("[State - reconstructDAW] Starting. Is Undo/Redo:", isUndoRedo, "Project Version:", projectData.version);

    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel();

    if (typeof audioInitAudioContextAndMasterMeter === 'function') {
        await audioInitAudioContextAndMasterMeter(true);
    }

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
        if (win && typeof win.close === 'function') win.close(true); // Pass true to skip undo capture for close
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
             console.log(`[State - reconstructDAW] Set masterGainNode volume to: ${window.masterGainNode.gain.value}`);
        } else if (Tone.getDestination()?.volume) {
            Tone.getDestination().volume.value = gs.masterVolume !== undefined ? gs.masterVolume : Tone.dbToGain(0);
            console.warn(`[State - reconstructDAW] masterGainNode not available or invalid, set Tone.Destination().volume to: ${Tone.getDestination().volume.value}`);
        }

        if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        window.highestZIndex = gs.highestZIndex || 100;
    }

    if (projectData.masterEffects && Array.isArray(projectData.masterEffects)) {
        console.log("[State - reconstructDAW] Reconstructing master effects:", projectData.masterEffects.length);
        projectData.masterEffects.forEach(effectData => {
            if (typeof audioAddMasterEffect === 'function') {
                 const addedEffectId = audioAddMasterEffect(effectData.type);
                 if(addedEffectId){
                    const addedEffect = window.masterEffectsChain.find(e => e.id === addedEffectId);
                    if(addedEffect && effectData.params) {
                        addedEffect.params = JSON.parse(JSON.stringify(effectData.params));
                        if(addedEffect.toneNode && !addedEffect.toneNode.disposed) {
                            try {
                                if (typeof addedEffect.toneNode.set === 'function') {
                                    addedEffect.toneNode.set(addedEffect.params);
                                } else { // Manual param setting if .set is not available
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
                                                    currentParamObj[keys[keys.length -1]].value = value;
                                                } else {
                                                    currentParamObj[keys[keys.length -1]] = value;
                                                }
                                            } else { console.warn(`[State - reconstructDAW] Could not set nested param ${paramKey} on master effect ${effectData.type}`); }
                                        }
                                    }
                                }
                            } catch (e) { console.warn(`[State - reconstructDAW] Error setting params on master effect ${effectData.type}:`, e); }
                        } else { console.warn(`[State - reconstructDAW] Master effect ${effectData.type} toneNode is disposed or missing, cannot set params.`); }
                    }
                 }
            }
        });
        if (window.masterEffectsChain.length > 0 && typeof audioRebuildMasterEffectChain === 'function') {
             console.log("[State - reconstructDAW] Explicitly rebuilding master effect chain after loading all master effects and their params.");
             audioRebuildMasterEffectChain();
        }
    }

    const trackCreationPromises = [];
    if (projectData.tracks && Array.isArray(projectData.tracks)) {
        console.log(`[State - reconstructDAW] Re-creating ${projectData.tracks.length} track instances.`);
        for (const trackData of projectData.tracks) {
            if (trackData.type === 'Synth' && !trackData.synthEngineType) trackData.synthEngineType = 'MonoSynth';
            trackCreationPromises.push(addTrackToState(trackData.type, trackData, false));
        }
    }
    await Promise.all(trackCreationPromises);
    console.log("[State - reconstructDAW] All track instances created. Current tracks count:", tracks.length);

    console.log("%c[State - reconstructDAW] Starting audio loading from IndexedDB for tracks...", "color: blue; font-weight: bold;");
    for (const track of tracks) {
        console.log(`[State - reconstructDAW] Processing track ID: ${track.id}, Name: ${track.name}, Type: ${track.type}`);
        try {
            if (track.type === 'Sampler' && track.samplerAudioData?.audioDbKey) {
                const dbKey = track.samplerAudioData.audioDbKey;
                const fileName = track.samplerAudioData.fileName;
                console.log(`[State - reconstructDAW] Sampler track ${track.id} has audioDbKey: ${dbKey}, FileName: ${fileName}`);
                const audioBlob = await getAudio(dbKey);
                if (audioBlob) {
                    console.log(`[State - reconstructDAW] Sampler track ${track.id}: Retrieved Blob from DB for key ${dbKey}`, audioBlob);
                    const objectURL = URL.createObjectURL(audioBlob);
                    console.log(`[State - reconstructDAW] Sampler track ${track.id}: Created ObjectURL ${objectURL}`);
                    try {
                        if (track.audioBuffer && !track.audioBuffer.disposed) {
                            console.log(`[State - reconstructDAW] Sampler track ${track.id}: Disposing existing audioBuffer.`);
                            track.audioBuffer.dispose();
                        }
                        track.audioBuffer = await new Tone.Buffer().load(objectURL);
                        track.originalFileName = fileName;
                        console.log(`%c[State - reconstructDAW] Sampler track ${track.id}: SUCCESSFULLY loaded Tone.Buffer. Duration: ${track.audioBuffer.duration}s. Loaded: ${track.audioBuffer.loaded}`, "color: green");
                    } catch (loadError) {
                        console.error(`%c[State - reconstructDAW] Sampler track ${track.id}: FAILED to load Tone.Buffer from ObjectURL ${objectURL} for key ${dbKey}`, "color: red", loadError);
                        track.audioBuffer = null;
                    } finally {
                        URL.revokeObjectURL(objectURL);
                        console.log(`[State - reconstructDAW] Sampler track ${track.id}: Revoked ObjectURL ${objectURL}`);
                    }
                } else {
                     console.warn(`%c[State - reconstructDAW] Sampler track ${track.id}: Audio Blob NOT FOUND in DB for key ${dbKey}. File: ${fileName}`, "color: orange");
                }
            } else if (track.type === 'InstrumentSampler' && track.instrumentSamplerSettings?.audioDbKey) {
                const dbKey = track.instrumentSamplerSettings.audioDbKey;
                const fileName = track.instrumentSamplerSettings.originalFileName;
                console.log(`[State - reconstructDAW] InstrumentSampler track ${track.id} has audioDbKey: ${dbKey}, FileName: ${fileName}`);
                const audioBlob = await getAudio(dbKey);
                if (audioBlob) {
                    console.log(`[State - reconstructDAW] InstrumentSampler track ${track.id}: Retrieved Blob from DB for key ${dbKey}`, audioBlob);
                    const objectURL = URL.createObjectURL(audioBlob);
                    console.log(`[State - reconstructDAW] InstrumentSampler track ${track.id}: Created ObjectURL ${objectURL}`);
                    try {
                        if (track.instrumentSamplerSettings.audioBuffer && !track.instrumentSamplerSettings.audioBuffer.disposed) {
                             console.log(`[State - reconstructDAW] InstrumentSampler track ${track.id}: Disposing existing audioBuffer.`);
                            track.instrumentSamplerSettings.audioBuffer.dispose();
                        }
                        track.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(objectURL);
                        console.log(`%c[State - reconstructDAW] InstrumentSampler track ${track.id}: SUCCESSFULLY loaded Tone.Buffer. Duration: ${track.instrumentSamplerSettings.audioBuffer.duration}s. Loaded: ${track.instrumentSamplerSettings.audioBuffer.loaded}`, "color: green");
                    } catch (loadError) {
                        console.error(`%c[State - reconstructDAW] InstrumentSampler track ${track.id}: FAILED to load Tone.Buffer from ObjectURL ${objectURL} for key ${dbKey}`, "color: red", loadError);
                        track.instrumentSamplerSettings.audioBuffer = null;
                    } finally {
                        URL.revokeObjectURL(objectURL);
                        console.log(`[State - reconstructDAW] InstrumentSampler track ${track.id}: Revoked ObjectURL ${objectURL}`);
                    }
                } else {
                    console.warn(`%c[State - reconstructDAW] InstrumentSampler track ${track.id}: Audio Blob NOT FOUND in DB for key ${dbKey}. File: ${fileName}`, "color: orange");
                }
            } else if (track.type === 'DrumSampler') {
                console.log(`[State - reconstructDAW] DrumSampler track ${track.id}: Processing ${track.drumSamplerPads.length} pads.`);
                for (let i = 0; i < track.drumSamplerPads.length; i++) {
                    const pad = track.drumSamplerPads[i];
                    if (pad.audioDbKey) {
                        const dbKey = pad.audioDbKey;
                        const fileName = pad.originalFileName;
                        console.log(`[State - reconstructDAW] DrumSampler track ${track.id}, Pad ${i}: has audioDbKey: ${dbKey}, FileName: ${fileName}`);
                        const audioBlob = await getAudio(dbKey);
                        if (audioBlob) {
                            console.log(`[State - reconstructDAW] DrumSampler track ${track.id}, Pad ${i}: Retrieved Blob from DB for key ${dbKey}`, audioBlob);
                            const objectURL = URL.createObjectURL(audioBlob);
                            console.log(`[State - reconstructDAW] DrumSampler track ${track.id}, Pad ${i}: Created ObjectURL ${objectURL}`);
                            try {
                                if (pad.audioBuffer && !pad.audioBuffer.disposed) {
                                    console.log(`[State - reconstructDAW] DrumSampler track ${track.id}, Pad ${i}: Disposing existing audioBuffer.`);
                                    pad.audioBuffer.dispose();
                                }
                                pad.audioBuffer = await new Tone.Buffer().load(objectURL);
                                console.log(`%c[State - reconstructDAW] DrumSampler track ${track.id}, Pad ${i}: SUCCESSFULLY loaded Tone.Buffer. Duration: ${pad.audioBuffer.duration}s. Loaded: ${pad.audioBuffer.loaded}`, "color: green");
                            } catch (loadError) {
                                 console.error(`%c[State - reconstructDAW] DrumSampler track ${track.id}, Pad ${i}: FAILED to load Tone.Buffer from ObjectURL ${objectURL} for key ${dbKey}`, "color: red", loadError);
                                pad.audioBuffer = null;
                            } finally {
                                URL.revokeObjectURL(objectURL);
                                console.log(`[State - reconstructDAW] DrumSampler track ${track.id}, Pad ${i}: Revoked ObjectURL ${objectURL}`);
                            }
                        } else {
                             console.warn(`%c[State - reconstructDAW] DrumSampler track ${track.id}, Pad ${i}: Audio Blob NOT FOUND in DB for key ${dbKey}. File: ${fileName}`, "color: orange");
                        }
                    }
                }
            }
        } catch (e) {
            console.error(`%c[State - reconstructDAW] MAJOR ERROR processing audio for track ${track.id} (${track.name}):`, "color: red; font-size: 1.2em;", e);
            showNotification(`Error loading audio for ${track.name}. Some samples may be missing.`, 3000);
        }
    }
    console.log("%c[State - reconstructDAW] Finished loading audio from IndexedDB for all tracks.", "color: blue; font-weight: bold;");

    const finalResourcePromises = tracks.map(track => {
        console.log(`[State - reconstructDAW] Calling fullyInitializeAudioResources for track ${track.id} (${track.name})`);
        if (typeof track.fullyInitializeAudioResources === 'function') {
            return track.fullyInitializeAudioResources();
        }
        return Promise.resolve();
    });

    try {
        await Promise.all(finalResourcePromises);
        console.log("%c[State - reconstructDAW] All track audio resources finalized (players, samplers, sequences).", "color: green; font-weight: bold;");
    } catch (error) {
        console.error("%c[State - reconstructDAW] Error finalizing track audio resources:", "color: red;", error);
    }

    if (typeof audioRebuildMasterEffectChain === 'function') {
        console.log("[State - reconstructDAW] Final rebuild of master effect chain.");
        audioRebuildMasterEffectChain();
    }

    if (gs) {
        soloedTrackId = gs.soloedTrackId || null;
        armedTrackId = gs.armedTrackId || null;
        console.log(`[State - reconstructDAW] Restored global soloId: ${soloedTrackId}, armedId: ${armedTrackId}`);
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
        if(typeof window.drawWaveform === 'function' && (track.type === 'Sampler') && track.audioBuffer?.loaded) window.drawWaveform(track);
        if(typeof window.drawInstrumentWaveform === 'function' && (track.type === 'InstrumentSampler') && track.instrumentSamplerSettings.audioBuffer?.loaded) window.drawInstrumentWaveform(track);
    });
    updateUndoRedoButtons();


    window.isReconstructingDAW = false;
    if (!isUndoRedo) {
        showNotification(`Project loaded successfully.`, 3500);
    } else {
        const stateRestored = (undoStack.length >= redoStack.length && undoStack.length > 0) ? undoStack[undoStack.length-1] : (redoStack.length > 0 ? redoStack[redoStack.length-1] : null);
        const actionDescription = stateRestored?.description || projectData?.description || 'last action';
        const operationType = undoStack.length >= redoStack.length ? 'Undone' : 'Redone';
        showNotification(`${operationType}: ${actionDescription}.`, 2000);
    }
    console.log("%c[State] DAW Reconstructed successfully.", "color: green; font-weight: bold;");
}

/**
 * Saves the current project data to a .snug file.
 */
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
        maxDuration += 1; // Add a little buffer


        const recorder = new Tone.Recorder();
        const recordSource = (window.masterGainNode && !window.masterGainNode.disposed) ? window.masterGainNode : Tone.getDestination();
        recordSource.connect(recorder);

        console.log(`[State - exportToWav] Starting recording for ${maxDuration.toFixed(1)}s`);
        recorder.start();
        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)... This may take a moment.`, Math.max(3000, maxDuration * 1000 + 1000));

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
