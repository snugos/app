// js/state.js - Application State Management
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog } from './utils.js';
import { Track } from './Track.js';
import { createEffectInstance } from './effectsRegistry.js';
import {
    rebuildMasterEffectChain as audioRebuildMasterEffectChain,
    addMasterEffect as audioAddMasterEffectToChain, // Renamed to avoid conflict
    initAudioContextAndMasterMeter as audioInitAudioContextAndMasterMeter
} from './audio.js';
import { getAudio } from './db.js';

// --- State Variables ---
let tracks = [];
let trackIdCounter = 0;
let activeSequencerTrackId = null;
let soloedTrackId = null;
let armedTrackId = null; // Critical variable we are tracking
let isRecordingGlobal = false;
let recordingTrackIdGlobal = null;
let recordingStartTime = 0;

// --- Undo/Redo ---
let undoStack = [];
let redoStack = [];

// --- AppServices Placeholder ---
let appServices = {
    openTrackInspectorWindow: () => {},
    updateMixerWindow: () => {},
    openGlobalControlsWindow: () => {},
    openTrackEffectsRackWindow: () => {},
    openTrackSequencerWindow: () => {},
    openSoundBrowserWindow: () => {},
    openMasterEffectsRackWindow: () => {},
    selectMIDIInput: () => {},
    updateUndoRedoButtonsUI: () => {},
    closeAllTrackWindows: (trackId) => {},
    updateTrackUI: (trackId, reason, detail) => {},
    highlightPlayingStep: (trackId, step) => {},
    autoSliceSample: (trackId) => {},
};

export function initializeStateModule(services) {
    appServices = { ...appServices, ...services };
    if (typeof window !== 'undefined' && !Array.isArray(window.masterEffectsChain)) {
        window.masterEffectsChain = [];
    }
    console.log('[State] initializeStateModule: armedTrackId is initially:', armedTrackId);
}

// --- Getters ---
export function getTracks() { return tracks; }
export function getTrackById(id) { return tracks.find(t => t.id === id); }

export function getArmedTrackId() {
    console.log('[State DEBUG] getArmedTrackId() CALLED. Returning:', armedTrackId);
    return armedTrackId;
}

export function getSoloedTrackId() { return soloedTrackId; }
export function isTrackRecording() { return isRecordingGlobal; }
export function getRecordingTrackId() { return recordingTrackIdGlobal; }
export function getActiveSequencerTrackId() { return activeSequencerTrackId; }
export function getUndoStack() { return undoStack; }

// --- Setters (used internally or by eventhandlers.js via main.js) ---
export function setArmedTrackId(id) {
    console.log('[State DEBUG] setArmedTrackId() CALLED with id:', id, '. Current armedTrackId was:', armedTrackId);
    armedTrackId = id;
    console.log('[State DEBUG] armedTrackId is NOW:', armedTrackId);
}

export function setSoloedTrackId(id) { soloedTrackId = id; }
export function setIsRecording(status) { isRecordingGlobal = status; }
export function setRecordingTrackId(id) { recordingTrackIdGlobal = id; }
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
        if (newTrackId >= trackIdCounter) trackIdCounter = newTrackId + 1; // Ensure next ID is higher
    } else {
        newTrackId = trackIdCounter++;
    }

    const trackAppServices = {
        getSoloedTrackId,
        captureStateForUndo,
        updateTrackUI: appServices.updateTrackUI,
        highlightPlayingStep: appServices.highlightPlayingStep,
        autoSliceSample: appServices.autoSliceSample,
        closeTrackWindows: appServices.closeAllTrackWindows,
    };
    const newTrack = new Track(newTrackId, type, initialData, trackAppServices);
    tracks.push(newTrack);

    if (typeof newTrack.initializeAudioNodes === 'function') {
        await newTrack.initializeAudioNodes();
    }

    try {
        await newTrack.fullyInitializeAudioResources();
        console.log(`[State] Audio resources initialized for track ${newTrack.id} (${newTrack.name}).`);
        if (isBrandNewUserTrack) {
            showNotification(`${newTrack.name} added.`, 2000);
            if (appServices.openTrackInspectorWindow) {
                appServices.openTrackInspectorWindow(newTrack.id);
            }
        }
        if (appServices.updateMixerWindow) {
            appServices.updateMixerWindow();
        }
    } catch (error) {
        console.error(`[State] Error in fullyInitializeAudioResources for track ${newTrack.id}:`, error);
        showNotification(`Error fully setting up ${type} track "${newTrack.name}".`, 5000);
        if (isBrandNewUserTrack && appServices.openTrackInspectorWindow) {
            appServices.openTrackInspectorWindow(newTrack.id);
        }
        if (appServices.updateMixerWindow) {
            appServices.updateMixerWindow();
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

    if (armedTrackId === trackId) {
        console.log(`[State DEBUG] Removing armed track ${trackId}. Setting armedTrackId to null.`);
        setArmedTrackId(null); // Explicitly log this change
    }
    if (soloedTrackId === trackId) {
        soloedTrackId = null;
        tracks.forEach(t => {
            t.isSoloed = false;
            t.applySoloState();
        });
    }
    if (activeSequencerTrackId === trackId) activeSequencerTrackId = null;

    showNotification(`Track "${track.name}" removed.`, 2000);
    if (appServices.updateMixerWindow) appServices.updateMixerWindow();
    if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI();
}


// --- Undo/Redo Logic ---
function updateInternalUndoRedoState() {
    if (appServices.updateUndoRedoButtonsUI) {
        appServices.updateUndoRedoButtonsUI(undoStack.length > 0 ? undoStack[undoStack.length - 1] : null, redoStack.length > 0 ? redoStack[redoStack.length - 1] : null);
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
        updateInternalUndoRedoState();
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
        if (typeof window !== 'undefined') window.isReconstructingDAW = true;
        await reconstructDAW(stateToRestore, true);
        if (typeof window !== 'undefined') window.isReconstructingDAW = false;
        updateInternalUndoRedoState();
    } catch (error) {
        if (typeof window !== 'undefined') window.isReconstructingDAW = false;
        console.error("[State] Error during undo:", error);
        showNotification("Error during undo operation. Project may be unstable.", 4000);
        updateInternalUndoRedoState();
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
        if (typeof window !== 'undefined') window.isReconstructingDAW = true;
        await reconstructDAW(stateToRestore, true);
        if (typeof window !== 'undefined') window.isReconstructingDAW = false;
        updateInternalUndoRedoState();
    } catch (error) {
        if (typeof window !== 'undefined') window.isReconstructingDAW = false;
        console.error("[State] Error during redo:", error);
        showNotification("Error during redo operation. Project may be unstable.", 4000);
        updateInternalUndoRedoState();
    }
}


// --- Project Data Handling ---
export function gatherProjectData() {
    const projectData = {
        version: "5.7.0",
        globalSettings: {
            tempo: Tone.Transport.bpm.value,
            masterVolume: (typeof window !== 'undefined' && window.masterGainNode && typeof window.masterGainNode.gain?.value === 'number') ? window.masterGainNode.gain.value : Tone.dbToGain(0),
            activeMIDIInputId: (typeof window !== 'undefined' && window.activeMIDIInput) ? window.activeMIDIInput.id : null,
            soloedTrackId: soloedTrackId,
            armedTrackId: armedTrackId, // Make sure this is the actual current armedTrackId
            highestZIndex: (typeof window !== 'undefined' && window.highestZIndex) ? window.highestZIndex : 100,
        },
        masterEffects: ((typeof window !== 'undefined' && window.masterEffectsChain) || []).map(effect => ({
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
                    fileName: track.samplerAudioData.fileName,
                    dbKey: track.samplerAudioData.dbKey,
                    status: track.samplerAudioData.dbKey ? 'missing_db' : 'empty'
                };
                trackData.slices = JSON.parse(JSON.stringify(track.slices));
            } else if (track.type === 'DrumSampler') {
                trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({
                    originalFileName: p.originalFileName,
                    dbKey: p.dbKey,
                    volume: p.volume,
                    pitchShift: p.pitchShift,
                    envelope: JSON.parse(JSON.stringify(p.envelope)),
                    status: p.dbKey ? 'missing_db' : 'empty'
                }));
            } else if (track.type === 'InstrumentSampler') {
                trackData.instrumentSamplerSettings = {
                    originalFileName: track.instrumentSamplerSettings.originalFileName,
                    dbKey: track.instrumentSamplerSettings.dbKey,
                    rootNote: track.instrumentSamplerSettings.rootNote,
                    loop: track.instrumentSamplerSettings.loop,
                    loopStart: track.instrumentSamplerSettings.loopStart,
                    loopEnd: track.instrumentSamplerSettings.loopEnd,
                    envelope: JSON.parse(JSON.stringify(track.instrumentSamplerSettings.envelope)),
                    status: track.instrumentSamplerSettings.dbKey ? 'missing_db' : 'empty'
                };
            }
            return trackData;
        }),
        windowStates: Object.values((typeof window !== 'undefined' && window.openWindows) || {}).map(win => {
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
    if (typeof window !== 'undefined') window.isReconstructingDAW = true;
    console.log("[State] Starting DAW Reconstruction. Is Undo/Redo:", isUndoRedo);
    console.log("[State DEBUG] armedTrackId at START of reconstructDAW:", armedTrackId);


    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel();

    await audioInitAudioContextAndMasterMeter(true);

    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0;

    if (typeof window !== 'undefined' && window.masterEffectsChain) {
        window.masterEffectsChain.forEach(effect => {
            if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose();
        });
        window.masterEffectsChain = [];
    }

    if (appServices.closeAllWindows) {
        appServices.closeAllWindows(true);
    } else if (typeof window !== 'undefined' && window.openWindows) {
        Object.values(window.openWindows).forEach(win => {
            if (win && typeof win.close === 'function') win.close(true);
        });
        window.openWindows = {};
    }
    if (typeof window !== 'undefined') window.highestZIndex = 100;


    // Explicitly reset these state variables before loading from projectData
    console.log("[State DEBUG] Resetting armedTrackId, soloedTrackId, etc. before loading from project data.");
    setArmedTrackId(null); // Use the setter to log
    setSoloedTrackId(null);
    setActiveSequencerTrackId(null);
    setIsRecording(false);
    setRecordingTrackId(null);

    if (appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(false);


    const gs = projectData.globalSettings;
    if (gs) {
        Tone.Transport.bpm.value = gs.tempo || 120;
        if (typeof window !== 'undefined' && window.masterGainNode?.gain) {
            window.masterGainNode.gain.value = gs.masterVolume ?? Tone.dbToGain(0);
        }
        if (appServices.updateTaskbarTempoDisplay) appServices.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        if (typeof window !== 'undefined') window.highestZIndex = gs.highestZIndex || 100;

        // Set armed and soloed IDs from the loaded project data *after* resetting them
        console.log("[State DEBUG] Attempting to set armedTrackId from projectData.globalSettings.armedTrackId:", gs.armedTrackId);
        setArmedTrackId(gs.armedTrackId || null); // Use the setter to log
        setSoloedTrackId(gs.soloedTrackId || null);
    } else {
         console.warn("[State DEBUG] projectData.globalSettings is undefined during reconstructDAW. armedTrackId remains null.");
    }


    if (projectData.masterEffects && Array.isArray(projectData.masterEffects)) {
        projectData.masterEffects.forEach(effectData => {
            audioAddMasterEffectToChain(effectData.type, effectData.params);
        });
        audioRebuildMasterEffectChain();
    }

    const trackPromises = (projectData.tracks || []).map(trackData => addTrackToState(trackData.type, trackData, false));
    await Promise.all(trackPromises);

    if (projectData.windowStates) {
        const sortedWindowStates = projectData.windowStates.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        for (const winState of sortedWindowStates) {
            if (!winState || !winState.id) continue;
            const key = winState.initialContentKey || winState.id;

            if (key === 'globalControls' && appServices.openGlobalControlsWindow) appServices.openGlobalControlsWindow(null, winState);
            else if (key === 'mixer' && appServices.openMixerWindow) appServices.openMixerWindow(winState);
            else if (key === 'soundBrowser' && appServices.openSoundBrowserWindow) appServices.openSoundBrowserWindow(winState);
            else if (key === 'masterEffectsRack' && appServices.openMasterEffectsRackWindow) appServices.openMasterEffectsRackWindow(winState);
            else if (key.startsWith('trackInspector-') && appServices.openTrackInspectorWindow) {
                const trackIdNum = parseInt(key.split('-')[1]);
                if (!isNaN(trackIdNum) && getTrackById(trackIdNum)) appServices.openTrackInspectorWindow(trackIdNum, winState);
            } else if (key.startsWith('effectsRack-') && appServices.openTrackEffectsRackWindow) {
                const trackIdNum = parseInt(key.split('-')[1]);
                if (!isNaN(trackIdNum) && getTrackById(trackIdNum)) appServices.openTrackEffectsRackWindow(trackIdNum, winState);
            } else if (key.startsWith('sequencerWin-') && appServices.openTrackSequencerWindow) {
                const trackIdNum = parseInt(key.split('-')[1]);
                if (!isNaN(trackIdNum) && getTrackById(trackIdNum)) appServices.openTrackSequencerWindow(trackIdNum, true, winState);
            }
        }
    }

    const resourcePromises = tracks.map(track => track.fullyInitializeAudioResources());
    await Promise.all(resourcePromises);

    // Apply solo state to all tracks based on the now-loaded soloedTrackId
    tracks.forEach(t => {
        t.isSoloed = (t.id === soloedTrackId); // soloedTrackId is from gs or null
        t.applySoloState();
    });

    // Select MIDI input if specified in global settings
    if (gs && gs.activeMIDIInputId && appServices.selectMIDIInput) {
        appServices.selectMIDIInput(gs.activeMIDIInputId, true);
    }


    if(appServices.updateMixerWindow) appServices.updateMixerWindow();
    updateInternalUndoRedoState();
    if (typeof window !== 'undefined') window.isReconstructingDAW = false;
    if (!isUndoRedo) showNotification(`Project loaded successfully.`, 3500);
    console.log("[State DEBUG] armedTrackId at END of reconstructDAW:", armedTrackId);
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
                const sixteenthNoteTime = Tone.Time("16n").toSeconds();
                const trackDuration = track.sequenceLength * sixteenthNoteTime;
                if (trackDuration > maxDuration) maxDuration = trackDuration;
            }
        });
        if (maxDuration === 0) maxDuration = 5;
        maxDuration += 1;

        const recorder = new Tone.Recorder();
        const recordSource = (typeof window !== 'undefined' && window.masterGainNode && !window.masterGainNode.disposed)
                           ? window.masterGainNode
                           : Tone.getDestination();
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
