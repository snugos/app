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

    if (isBrandNewUserTrack) {
        captureStateForUndo(`Add ${type} Track`);
        if (initialData && initialData._isUserActionPlaceholder) initialData = null; // Clear placeholder
    }

    let newTrackId;
    if (initialData && initialData.id != null) { // Check for non-null ID explicitly
        newTrackId = initialData.id;
        if (newTrackId > trackIdCounter) trackIdCounter = newTrackId; // Ensure counter is up-to-date
    } else {
        trackIdCounter++;
        newTrackId = trackIdCounter;
    }
    
    const newTrack = new Track(newTrackId, type, initialData);
    tracks.push(newTrack);

    if (isBrandNewUserTrack) {
        // For brand new tracks added by the user, ensure their audio resources are initialized.
        newTrack.fullyInitializeAudioResources().then(() => {
            console.log(`[State] Audio resources initialized for new track ${newTrack.id} (${newTrack.name}).`);
            showNotification(`${type} Track "${newTrack.name}" added.`, 2000);
            // Open inspector and update mixer AFTER resources are initialized
            if (typeof window.openTrackInspectorWindow === 'function') {
                window.openTrackInspectorWindow(newTrack.id);
            } else {
                console.warn("[State] window.openTrackInspectorWindow is not a function!");
            }
            if (typeof window.updateMixerWindow === 'function') {
                window.updateMixerWindow();
            } else {
                console.warn("[State] window.updateMixerWindow is not a function!");
            }
        }).catch(error => {
            console.error(`[State] Error initializing audio resources for new track ${newTrack.id}:`, error);
            showNotification(`Error setting up new ${type} track "${newTrack.name}". Audio may not work.`, 5000);
            // Still attempt to open inspector and update mixer so UI is consistent
            if (typeof window.openTrackInspectorWindow === 'function') {
                window.openTrackInspectorWindow(newTrack.id);
            }
            if (typeof window.updateMixerWindow === 'function') {
                window.updateMixerWindow();
            }
        });
    }
    // If it's not a brandNewUserTrack (i.e., from load/undo), 
    // reconstructDAW handles calling fullyInitializeAudioResources separately.
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
    
    // Dispose of track resources (including Tone.js objects and windows)
    track.dispose(); 
    
    tracks.splice(trackIndex, 1);

    // Update global states if the removed track was active in them
    if (armedTrackId === trackId) armedTrackId = null;
    if (soloedTrackId === trackId) {
        soloedTrackId = null;
        // Re-evaluate solo states for all remaining tracks
        tracks.forEach(t => { 
            t.isSoloed = false; // Reset local solo flag
            t.applySoloState(); 
        });
    }
    if (activeSequencerTrackId === trackId) activeSequencerTrackId = null;
    
    showNotification(`Track "${track.name}" removed.`, 2000);
    if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    updateUndoRedoButtons(); // Reflect change in history
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
    console.log("[State] Capturing state for undo:", description);
    try {
        const currentState = gatherProjectData();
        currentState.description = description; // Add description to the state object itself
        undoStack.push(JSON.parse(JSON.stringify(currentState))); // Deep copy
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift(); // Limit history size
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
        const currentStateForRedo = gatherProjectData();
        // Use the description from the state being undone for the redo action
        currentStateForRedo.description = stateToRestore.description; 
        redoStack.push(JSON.parse(JSON.stringify(currentStateForRedo))); // Deep copy
        if (redoStack.length > Constants.MAX_HISTORY_STATES) {
            redoStack.shift();
        }
        
        showNotification(`Undoing: ${stateToRestore.description || 'last action'}...`, 2000);
        await reconstructDAW(stateToRestore, true); // true for isUndoRedo
        updateUndoRedoButtons();
    } catch (error) {
        console.error("[State] Error during undo:", error);
        showNotification("Error during undo operation. Project may be unstable.", 4000);
        // Attempt to restore the popped state to undoStack if reconstruction fails?
        // For now, just update buttons. The state might be inconsistent.
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
        // Use the description from the state being redone for the undo action
        currentStateForUndo.description = stateToRestore.description;
        undoStack.push(JSON.parse(JSON.stringify(currentStateForUndo))); // Deep copy
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }

        showNotification(`Redoing: ${stateToRestore.description || 'last action'}...`, 2000);
        await reconstructDAW(stateToRestore, true); // true for isUndoRedo
        updateUndoRedoButtons();
    } catch (error) {
        console.error("[State] Error during redo:", error);
        showNotification("Error during redo operation. Project may be unstable.", 4000);
        updateUndoRedoButtons();
    }
}

export function gatherProjectData() {
    const projectData = {
        version: "5.5.2", // Updated version for Flanger addition
        globalSettings: {
            tempo: Tone.Transport.bpm.value,
            masterVolume: Tone.getDestination().volume.value,
            activeMIDIInputId: window.activeMIDIInput ? window.activeMIDIInput.id : null,
            soloedTrackId: soloedTrackId, // Directly from state
            armedTrackId: armedTrackId,   // Directly from state
            highestZIndex: window.highestZIndex,
        },
        tracks: tracks.map(track => {
            const trackData = {
                id: track.id, type: track.type, name: track.name,
                isMuted: track.isMuted, 
                volume: track.previousVolumeBeforeMute, // Save the pre-mute volume
                effects: JSON.parse(JSON.stringify(track.effects)), // Deep copy, includes flanger
                sequenceLength: track.sequenceLength,
                sequenceData: JSON.parse(JSON.stringify(track.sequenceData)), // Deep copy
                automation: JSON.parse(JSON.stringify(track.automation)), // Deep copy
                // Sampler specific
                selectedSliceForEdit: track.selectedSliceForEdit,
                waveformZoom: track.waveformZoom,
                waveformScrollOffset: track.waveformScrollOffset,
                slicerIsPolyphonic: track.slicerIsPolyphonic,
                // Drum Sampler specific
                selectedDrumPadForEdit: track.selectedDrumPadForEdit,
                // Instrument Sampler specific
                instrumentSamplerIsPolyphonic: track.instrumentSamplerIsPolyphonic,
            };
            // Type-specific data
            if (track.type === 'Synth') {
                trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams));
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = { 
                    fileName: track.originalFileName, 
                    audioBufferDataURL: track.audioBufferDataURL // Save Data URL
                };
                trackData.slices = JSON.parse(JSON.stringify(track.slices));
            } else if (track.type === 'DrumSampler') {
                trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({
                    originalFileName: p.originalFileName, 
                    audioBufferDataURL: p.audioBufferDataURL, // Save Data URL
                    volume: p.volume, 
                    pitchShift: p.pitchShift, 
                    envelope: JSON.parse(JSON.stringify(p.envelope))
                }));
            } else if (track.type === 'InstrumentSampler') {
                trackData.instrumentSamplerSettings = {
                    originalFileName: track.instrumentSamplerSettings.originalFileName,
                    audioBufferDataURL: track.instrumentSamplerSettings.audioBufferDataURL, // Save Data URL
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
            if (!win || !win.element) return null; // Skip if window or element is missing
            return {
                id: win.id, title: win.title,
                left: win.element.style.left, top: win.element.style.top,
                width: win.element.style.width, height: win.element.style.height,
                zIndex: parseInt(win.element.style.zIndex),
                isMinimized: win.isMinimized,
                initialContentKey: win.initialContentKey // Important for restoring correct window type
            };
        }).filter(ws => ws !== null) // Filter out nulls if any window was problematic
    };
    return projectData;
}

export async function reconstructDAW(projectData, isUndoRedo = false) {
    console.log("[State] Reconstructing DAW. Is Undo/Redo:", isUndoRedo);
    // Stop transport before making major changes
    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel(); // Clear all scheduled events

    console.log("[State] Clearing current state (tracks, windows)...");
    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0; // Reset track ID counter

    Object.values(window.openWindows).forEach(win => {
        if (win && typeof win.close === 'function') {
            // SnugWindow's close method handles its own cleanup, including taskbar button.
            // It also calls captureStateForUndo, which we want to avoid during reconstruction.
            // Temporarily replace captureStateForUndo if it's a SnugWindow.
            let originalCaptureUndo;
            if (win.constructor.name === 'SnugWindow') {
                originalCaptureUndo = window.captureStateForUndo;
                window.captureStateForUndo = () => {}; // No-op during this specific close
            }
            win.close();
            if (originalCaptureUndo) {
                window.captureStateForUndo = originalCaptureUndo; // Restore it
            }
        } else if (win && win.element && win.element.remove) {
            win.element.remove(); // Fallback for non-SnugWindow or problematic ones
        }
    });
    window.openWindows = {};
    window.highestZIndex = 100; // Reset z-index counter

    // Reset global player/recorder states
    armedTrackId = null; soloedTrackId = null; activeSequencerTrackId = null;
    isRecording = false; recordingTrackId = null;
    if (window.recordBtn) { window.recordBtn.classList.remove('recording'); window.recordBtn.textContent = 'Record';}
    console.log("[State] Current state cleared.");

    // Restore global settings
    const gs = projectData.globalSettings;
    if (gs) {
        console.log("[State] Restoring global settings:", gs);
        Tone.Transport.bpm.value = gs.tempo || 120;
        Tone.getDestination().volume.value = gs.masterVolume !== undefined ? gs.masterVolume : 0;
        if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        window.highestZIndex = gs.highestZIndex || 100;
    }

    // Initialize tracks - crucial step for audio resources
    const trackInitPromises = [];
    if (projectData.tracks && Array.isArray(projectData.tracks)) {
        console.log(`[State] Instantiating ${projectData.tracks.length} tracks...`);
        projectData.tracks.forEach(trackData => {
            // Call addTrackToState with isUserAction = false to prevent it from trying to capture undo state
            // and from auto-opening inspector etc.
            const newTrack = addTrackToState(trackData.type, trackData, false); 
            if (newTrack.id > trackIdCounter) trackIdCounter = newTrack.id; // Update counter based on loaded IDs
            
            // The fullyInitializeAudioResources will be called after all tracks are added
            // to ensure all base track objects exist first.
        });

        // Now that all track objects are created, initialize their audio resources
        for (const track of tracks) {
            if (typeof track.fullyInitializeAudioResources === 'function') {
                trackInitPromises.push(track.fullyInitializeAudioResources());
            } else {
                console.warn(`[State] Track ${track.id} does not have fullyInitializeAudioResources method.`);
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

    // Restore global track-related states (solo, arm) after tracks and their audio are ready
    if (gs) {
        soloedTrackId = gs.soloedTrackId || null;
        armedTrackId = gs.armedTrackId || null;
        console.log(`[State] Restored soloedTrackId: ${soloedTrackId}, armedTrackId: ${armedTrackId}`);
        
        tracks.forEach(t => {
            t.isSoloed = (t.id === soloedTrackId); // Set local solo flag based on global
            t.applyMuteState(); // Apply mute state first
            t.applySoloState(); // Then apply solo state, which considers mutes
        });

        // Restore MIDI input
        if (gs.activeMIDIInputId && window.midiAccess && window.midiInputSelectGlobal) {
            const inputExists = Array.from(window.midiInputSelectGlobal.options).some(opt => opt.value === gs.activeMIDIInputId);
            if (inputExists) {
                window.midiInputSelectGlobal.value = gs.activeMIDIInputId;
                console.log(`[State] Restored MIDI input to: ${gs.activeMIDIInputId}`);
            } else {
                 console.warn(`[State] MIDI input ID ${gs.activeMIDIInputId} from project not found.`);
                 window.midiInputSelectGlobal.value = ""; // Set to "No MIDI Input"
            }
            if(typeof window.selectMIDIInput === 'function') window.selectMIDIInput(true); // true to skip undo
        } else if (window.midiInputSelectGlobal && typeof window.selectMIDIInput === 'function') {
            console.log("[State] No saved MIDI input, selecting default/none.");
            window.midiInputSelectGlobal.value = "";
            window.selectMIDIInput(true); // true to skip undo
        }
    }

    // Reconstruct windows
    if (projectData.windowStates && Array.isArray(projectData.windowStates)) {
        console.log(`[State] Reconstructing ${projectData.windowStates.length} windows...`);
        const sortedWindowStates = projectData.windowStates.sort((a, b) => a.zIndex - b.zIndex);
        
        for (const winState of sortedWindowStates) {
            if (!winState || !winState.id) continue; // Skip invalid window states
            let newWin = null;
            const key = winState.initialContentKey || winState.id; // Use initialContentKey for type
            try {
                let trackForWindow = null;
                if (key && (key.startsWith('trackInspector-') || key.startsWith('effectsRack-') || key.startsWith('sequencerWin-'))) {
                    const trackIdForWinStr = key.split('-')[1];
                    if (trackIdForWinStr) {
                        const trackIdForWin = parseInt(trackIdForWinStr);
                        trackForWindow = getTrackById(trackIdForWin);
                        if (!trackForWindow) {
                            console.warn(`[State] Track ${trackIdForWin} for window ${key} not found. Skipping window reconstruction.`);
                            continue;
                        }
                    } else {
                         console.warn(`[State] Malformed window key for track-specific window: ${key}. Skipping.`);
                        continue;
                    }
                }

                // Re-open windows based on their type/key, passing savedState for positioning etc.
                if (key === 'globalControls' && typeof window.openGlobalControlsWindow === 'function') newWin = window.openGlobalControlsWindow(winState);
                else if (key === 'mixer' && typeof window.openMixerWindow === 'function') newWin = window.openMixerWindow(winState);
                else if (key === 'soundBrowser' && typeof window.openSoundBrowserWindow === 'function') newWin = window.openSoundBrowserWindow(winState);
                else if (trackForWindow && key.startsWith('trackInspector-') && typeof window.openTrackInspectorWindow === 'function') {
                    newWin = window.openTrackInspectorWindow(trackForWindow.id, winState);
                } else if (trackForWindow && key.startsWith('effectsRack-') && typeof window.openTrackEffectsRackWindow === 'function') {
                    newWin = window.openTrackEffectsRackWindow(trackForWindow.id, winState);
                } else if (trackForWindow && key.startsWith('sequencerWin-') && typeof window.openTrackSequencerWindow === 'function') {
                    // For sequencer, forceRedraw is true to rebuild content, pass savedState for position
                    newWin = window.openTrackSequencerWindow(trackForWindow.id, true, winState); 
                } else {
                    console.warn(`[State] Unknown window key or missing open function for: ${key}`);
                }

                if (newWin && newWin.element && typeof newWin.applyState === 'function') {
                    newWin.applyState(winState); // SnugWindow method to restore position, size, zIndex, minimized state
                } else if (key && !newWin) {
                    console.warn(`[State] Failed to reconstruct window for key: ${key}. Open function might be missing or returned null.`);
                }
            } catch (e) {
                console.error(`[State] Error reconstructing window ${winState.id} (Key: ${key}):`, e);
            }
        }
    }
    
    // Final UI updates
    if(typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    tracks.forEach(track => {
        // Update inspector buttons (mute, solo, arm)
        if (track.inspectorWindow && track.inspectorWindow.element) {
            const inspectorArmBtn = track.inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);
            if (inspectorArmBtn) inspectorArmBtn.classList.toggle('armed', armedTrackId === track.id);
            const inspectorSoloBtn = track.inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
            if (inspectorSoloBtn) inspectorSoloBtn.classList.toggle('soloed', track.isSoloed); // Use track's local isSoloed
            const inspectorMuteBtn = track.inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
            if (inspectorMuteBtn) inspectorMuteBtn.classList.toggle('muted', track.isMuted);
        }
        // Redraw waveforms if applicable
        if(typeof window.drawWaveform === 'function' && (track.type === 'Sampler') && track.audioBuffer && track.audioBuffer.loaded){
            window.drawWaveform(track);
        }
        if(typeof window.drawInstrumentWaveform === 'function' && (track.type === 'InstrumentSampler') && track.instrumentSamplerSettings.audioBuffer && track.instrumentSamplerSettings.audioBuffer.loaded){
            window.drawInstrumentWaveform(track);
        }
    });
    updateUndoRedoButtons();

    if (!isUndoRedo) {
        showNotification(`Project loaded successfully.`, 3500);
    }
    console.log("[State] DAW Reconstructed successfully.");
}

export function saveProject() {
    try {
        const projectData = gatherProjectData();
        const jsonString = JSON.stringify(projectData, null, 2); // Pretty print JSON
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Filesystem-friendly timestamp
        a.download = `snugos-project-${timestamp}.snug`;
        document.body.appendChild(a); // Required for Firefox
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification(`Project saved as ${a.download}`, 2000);
        // After saving, this state is the new "clean" state for undo purposes
        // If you want to prevent "undoing" the save itself, you might clear undoStack here
        // or capture a "Save Project" state if that's desired.
        // For now, let's assume saving doesn't create an undo state itself.
    } catch (error) {
        console.error("[State] Error saving project:", error);
        showNotification("Error saving project. See console for details.", 4000);
    }
}

export function loadProject() {
    // This just triggers the file input. The actual loading is handled by handleProjectFileLoad.
    const loadProjectInputEl = document.getElementById('loadProjectInput');
    if (loadProjectInputEl) {
        loadProjectInputEl.click();
    } else {
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
                console.log("[State] Project file read, attempting to reconstruct DAW...");
                // Clear undo/redo stacks as we are loading a new project state
                undoStack = []; 
                redoStack = [];
                await reconstructDAW(projectData, false); // false for isUndoRedo
                // After successful load, capture this as the initial state for undo
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
    // Reset file input to allow loading the same file again if needed
    if (event.target) event.target.value = null;
}

export async function exportToWav() {
    showNotification("Preparing export... Please wait.", 3000);
    try {
        // Ensure audio context is started and ready
        if (typeof window.initAudioContextAndMasterMeter === 'function') {
            const audioReady = await window.initAudioContextAndMasterMeter(true); // User initiated
            if (!audioReady) {
                showNotification("Audio system not ready for export. Please interact with the app (e.g. click Play) and try again.", 4000);
                return;
            }
        } else {
            console.warn("initAudioContextAndMasterMeter not found for exportToWav");
            // Attempt to proceed but warn that audio might not be initialized
        }

        // Stop transport and reset position
        if (Tone.Transport.state === 'started') {
            Tone.Transport.stop();
            await new Promise(resolve => setTimeout(resolve, 200)); // Short delay for events to settle
        }
        Tone.Transport.position = 0;

        // Determine maximum duration of the project
        let maxDuration = 0;
        tracks.forEach(track => {
            if (track.sequence && track.sequenceLength > 0) {
                // Calculate duration based on sequence length and tempo
                const sixteenthNoteTime = Tone.Time("16n").toSeconds();
                const trackDuration = track.sequenceLength * sixteenthNoteTime;
                if (trackDuration > maxDuration) maxDuration = trackDuration;
            }
        });
        if (maxDuration === 0) maxDuration = 5; // Default duration if no sequences
        maxDuration += 1; // Add a small buffer (e.g., for reverb tails)

        const recorder = new Tone.Recorder();
        Tone.getDestination().connect(recorder); // Connect master output to recorder
        
        recorder.start();
        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)... This may take a moment.`, Math.max(3000, maxDuration * 1000 + 1000));

        // Start all track sequences (they will play according to their own data)
        tracks.forEach(track => {
            if (track.sequence) {
                track.sequence.start(0); // Start sequence from the beginning of the transport
                if (track.sequence instanceof Tone.Sequence) track.sequence.progress = 0; // Reset progress for Tone.Sequence
            }
        });
        Tone.Transport.start("+0.1", 0); // Start transport slightly in the future from time 0

        // Wait for the determined duration
        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000));

        Tone.Transport.stop(); // Stop transport
        // Explicitly stop sequences to ensure they don't continue if transport stop is delayed
        tracks.forEach(track => {
            if (track.sequence) {
                track.sequence.stop(0); // Stop sequence at transport time 0 (effectively now)
                 if (track.sequence instanceof Tone.Sequence) track.sequence.progress = 0;
            }
        });

        const recording = await recorder.stop(); // Stop recording and get the blob
        recorder.dispose(); // Clean up recorder

        // Create a download link for the recorded WAV file
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
