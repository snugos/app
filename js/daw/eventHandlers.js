// js/daw/eventHandlers.js - Global Event Listeners and Input Handling Module

// Import state functions
import { getTracks, getTrackById, getSoloedTrackId, setSoloedTrackId, getArmedTrackId, setArmedTrackId, isRecording, setIsRecording, getRecordingTrackId, setRecordingTrackId, getRecordingStartTime, setRecordingStartTime } from '/app/js/daw/state/trackState.js';
import { getPlaybackMode, setPlaybackMode, getMidiAccess, setActiveMIDIInput, getActiveMIDIInput, getMidiRecordModeState, setCurrentUserThemePreference, setMidiRecordModeState } from '/app/js/daw/state/appState.js';
import { getUndoStack, getRedoStack, captureStateForUndo } from '/app/js/daw/state/projectState.js';
import { getWindowById } from '/app/js/daw/state/windowState.js';
import { getClipboardData } from '/app/js/daw/state/projectState.js';

// Corrected import for Constants - directly from current directory
import * as Constants from '/app/js/daw/constants.js';

let localAppServices = {};
const currentlyPressedKeys = new Set();
let isSustainPedalDown = false;
const sustainedNotes = new Map(); // Map to hold notes currently being sustained by pedal

// --- MIDI Helper Functions (defined as local functions, used internally or passed directly) ---

/**
 * Callback function for incoming MIDI messages.
 * @param {MIDIMessageEvent} message - The MIDI message event.
 */
function onMIDIMessage(message) {
    const [command, noteNumber, velocity] = message.data;
    const commandType = command & 0xF0; 
    const noteOn = commandType === 0x90 && velocity > 0; 
    const noteOff = commandType === 0x80 || (commandType === 0x90 && velocity === 0); 

    const armedTrackId = getArmedTrackId();
    if (armedTrackId === null) return; 
    const armedTrack = getTrackById(armedTrackId);
    if (!armedTrack || !armedTrack.instrument) return; 

    // Sustain Pedal (Controller Change message 0xB0, controller 64)
    if (commandType === 0xB0 && noteNumber === 64) { 
        if (velocity > 63) { 
            isSustainPedalDown = true;
        } else { 
            isSustainPedalDown = false;
            sustainedNotes.forEach((noteValue, midiNote) => {
                if (armedTrack.instrument) {
                    armedTrack.instrument.triggerRelease(noteValue, localAppServices.Tone.now());
                }
            });
            sustainedNotes.clear(); 
        }
        return; 
    }
    
    // Note On/Off messages
    if (noteOn || noteOff) {
        const noteName = localAppServices.Tone.Midi(noteNumber).toNote(); 
        
        if (noteOn) {
            // If this note was previously sustained, release it first to re-trigger cleanly
            if (sustainedNotes.has(noteNumber)) {
                if (armedTrack.instrument) {
                    armedTrack.instrument.triggerRelease(sustainedNotes.get(noteNumber), localAppServices.Tone.now());
                }
                sustainedNotes.delete(noteNumber);
            }
            armedTrack.instrument.triggerAttack(noteName, localAppServices.Tone.now(), velocity / 127); 
        } else { // Note Off
            if (isSustainPedalDown) {
                // If sustain pedal is down, add note to sustained notes map
                sustainedNotes.set(noteNumber, noteName);
            } else {
                // If pedal is up, release the note immediately
                armedTrack.instrument.triggerRelease(noteName, localAppServices.Tone.now());
            }
        }
    }
    
    // MIDI Recording Logic
    if (noteOn && isRecording()) {
        const track = armedTrack;
        // Only record MIDI notes for instrument/sampler tracks
        if (track.type !== 'Audio') {
            const activeSequence = track.sequences.getActiveSequence();
            if (activeSequence) {
                const ticksPerStep = localAppServices.Tone.Transport.PPQ / 4; 
                const currentTick = localAppServices.Tone.Transport.ticks;
                const currentStep = Math.floor(currentTick / ticksPerStep); 
                const loopStep = currentStep % activeSequence.length; 

                // Map MIDI note number to piano roll pitch index (inverted for visual display)
                let pitchIndex;
                if (track.type === 'DrumSampler') {
                    // For drum samplers, map MIDI note to pad index directly for recording
                    pitchIndex = noteNumber - Constants.DRUM_MIDI_START_NOTE; 
                } else {
                    // For synths/instrument samplers, map to the pitch array index
                    pitchIndex = Constants.PIANO_ROLL_END_MIDI_NOTE - noteNumber; 
                }
                
                if (pitchIndex >= 0 && pitchIndex < activeSequence.data.length) {
                    const recordMode = getMidiRecordModeState();
                    if (recordMode === 'replace') {
                        // In replace mode, clear any existing note at this step for this pitch row
                        // or even the entire column for the specific pitch if needed.
                        // Current implementation clears only the specific pitch/step if it exists.
                        if (activeSequence.data[pitchIndex][loopStep]) {
                             track.sequences.removeNoteFromSequence(activeSequence.id, pitchIndex, loopStep);
                        }
                        // If replacing the entire column for this new note, could iterate and remove
                        // for (let i = 0; i < activeSequence.data.length; i++) {
                        //     if (activeSequence.data[i][loopStep]) {
                        //         track.sequences.removeNoteFromSequence(activeSequence.id, i, loopStep); 
                        //     }
                        // }
                    }
                    
                    // Add the new note to the sequence
                    track.sequences.addNoteToSequence(activeSequence.id, pitchIndex, loopStep, { velocity: velocity / 127, duration: 1 }); // Default duration 1 step
                    
                    // Refresh Piano Roll UI if open
                    const pianoRollWindow = getWindowById(`pianoRollWin-${track.id}`);
                    if (pianoRollWindow && !pianoRollWindow.isMinimized) {
                       if(localAppServices.openPianoRollWindow) {
                           // For now, closing and re-opening to force full redraw.
                           // A more optimized approach would be to update Konva.js shapes directly.
                           pianoRollWindow.close(true); // Close silently
                           localAppServices.openPianoRollWindow(track.id, activeSequence.id); // Re-open
                       }
                    }
                }
            }
        }
    }
}

/**
 * Populates the MIDI input device dropdown selector.
 * @param {MIDIAccess} midiAccess - The MIDIAccess object.
 */
function populateMIDIInputSelector(midiAccess) {
    const midiSelect = document.getElementById('midiInputSelectGlobalTop');
    if (!midiSelect || !midiAccess) {
        return;
    }

    const currentInputs = new Set();
    midiSelect.innerHTML = ''; 

    // Add a default "None" option
    const noneOption = document.createElement('option');
    noneOption.value = "";
    noneOption.textContent = "None";
    midiSelect.appendChild(noneOption);
    
    // Add available MIDI input devices
    if (midiAccess.inputs.size > 0) {
        midiAccess.inputs.forEach(input => {
            currentInputs.add(input.id);
            const option = document.createElement('option');
            option.value = input.id;
            option.textContent = input.name || `MIDI Input ${input.id}`; 
            midiSelect.appendChild(option);
        });
    }

    // Restore previously active MIDI input if it's still available
    const activeInput = localAppServices.getActiveMIDIInput();
    if (activeInput && currentInputs.has(activeInput.id)) {
        midiSelect.value = activeInput.id;
        activeInput.onmidimessage = onMIDIMessage; // Assign local onMIDIMessage
    } else {
        // If the previously active input is no longer available, reset it
        localAppServices.setActiveMIDIInput(null);
        midiSelect.value = ""; // Select "None"
    }
}

/**
 * Callback for successful MIDI access.
 * @param {MIDIAccess} midiAccess - The MIDIAccess object.
 */
function onMIDISuccess(midiAccess) {
    localAppServices.setMidiAccess(midiAccess);
    populateMIDIInputSelector(midiAccess); // Call local function
    // Listen for state changes (e.g., MIDI device connected/disconnected)
    midiAccess.onstatechange = () => {
        populateMIDIInputSelector(midiAccess); // Call local function
    };
}

/**
 * Callback for failed MIDI access.
 * @param {Error} error - The error object.
 */
function onMIDIFailure(error) {
    console.error("Failed to get MIDI access -", error);
    localAppServices.showNotification(`Failed to get MIDI access: ${error.name}`, 4000); 
}

// --- End MIDI Helper Functions ---


/**
 * Handles track mute toggle.
 * @param {number} trackId - The ID of the track to mute/unmute.
 */
export function handleTrackMute(trackId) {
    console.log(`[eventHandlers.js] handleTrackMute called for trackId: ${trackId}`);
    const track = getTrackById(trackId);
    if (!track) {
        console.warn(`[eventHandlers.js] handleTrackMute: Track with ID ${trackId} not found.`);
        return;
    }
    localAppServices.captureStateForUndo?.(`${track.isMuted ? 'Unmute' : 'Mute'} Track: ${track.name}`);
    track.isMuted = !track.isMuted;
    track.applyMuteState(); // Apply the mute state to the track's audio nodes
    if (localAppServices.updateTrackUI) {
        getTracks().forEach(t => localAppServices.updateTrackUI(t.id, 'muteChanged'));
        localAppServices.updateMixerWindow(); 
    }
}

/**
 * Handles track solo toggle.
 * @param {number} trackId - The ID of the track to solo/unsolo.
 */
export function handleTrackSolo(trackId) {
    console.log(`[eventHandlers.js] handleTrackSolo called for trackId: ${trackId}`);
    const track = getTrackById(trackId);
    if (!track) {
        console.warn(`[eventHandlers.js] handleTrackSolo: Track with ID ${trackId} not found.`);
        return;
    }
    localAppServices.captureStateForUndo?.(`Solo Track: ${track.name}`);
    const currentSoloId = getSoloedTrackId();
    const newSoloId = (currentSoloId === trackId) ? null : trackId; // Toggle solo state
    setSoloedTrackId(newSoloId);
    getTracks().forEach(t => {
        if (t.updateSoloMuteState) {
            t.updateSoloMuteState(newSoloId); 
        }
        localAppServices.updateTrackUI(t.id, 'soloChanged'); 
    });
    if (localAppServices.updateMixerWindow) {
        localAppServices.updateMixerWindow(); 
    }
}

/**
 * Handles track arm toggle for recording.
 * @param {number} trackId - The ID of the track to arm/disarm.
 */
export function handleTrackArm(trackId) {
    console.log(`[eventHandlers.js] handleTrackArm called for trackId: ${trackId}`);
    const currentArmedId = getArmedTrackId();
    const newArmedId = (currentArmedId === trackId) ? null : trackId; // Toggle armed state
    setArmedTrackId(newArmedId);
    if (localAppServices.updateTrackUI) {
        localAppServices.updateTrackUI(trackId, 'armChanged');
        if (currentArmedId !== null && currentArmedId !== trackId) {
            localAppServices.updateTrackUI(currentArmedId, 'armChanged');
        }
    }
}

/**
 * Handles removal of a track after user confirmation.
 * @param {number} trackId - The ID of the track to remove.
 */
export function handleRemoveTrack(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    localAppServices.showConfirmationDialog('Remove Track', `Are you sure you want to remove "${track.name}"? This cannot be undone.`, () => {
        localAppServices.removeTrack(trackId);
    });
}

/**
 * Handles opening the inspector window for a specific track.
 * @param {number} trackId - The ID of the track.
 */
export function handleOpenTrackInspector(trackId) {
    if (localAppServices.openTrackInspectorWindow) {
        localAppServices.openTrackInspectorWindow(trackId);
    }
}

/**
 * Handles opening the effects rack window for a specific track.
 * @param {number} trackId - The ID of the track.
 */
export function handleOpenEffectsRack(trackId) {
    if (localAppServices.openTrackEffectsRackWindow) {
        localAppServices.openTrackEffectsRackWindow(trackId);
    }
}

/**
 * Handles opening the piano roll window for a specific track.
 * @param {number} trackId - The ID of the track.
 */
export function handleOpenPianoRoll(trackId) {
    if (localAppServices.openPianoRollWindow) {
        localAppServices.openPianoRollWindow(trackId);
    } else {
        localAppServices.showNotification("Piano Roll UI is currently unavailable.", 3000);
    }
}

/**
 * Handles drag-and-drop of files or MIDI clips onto a timeline lane.
 * @param {DragEvent} event - The drag event.
 * @param {number} targetTrackId - The ID of the track receiving the drop.
 * @param {number} startTime - The target start time for the clip on the timeline.
 */
export async function handleTimelineLaneDrop(event, targetTrackId, startTime) {
    const files = event.dataTransfer.files;
    const targetTrack = getTrackById(targetTrackId);

    if (!targetTrack) return;
    
    // Handle file drops (audio files)
    if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('audio/')) {
            if (targetTrack.type === 'Audio') {
                // Add audio clip to Audio track
                await targetTrack.clips.addAudioClip(file, startTime, file.name);
                localAppServices.showNotification(`Audio clip "${file.name}" added to ${targetTrack.name}.`, 2000);
            } else {
                localAppServices.showNotification(`Cannot add audio files to a ${targetTrack.type} track. Drop on an Audio track.`, 3500);
            }
        } else {
             localAppServices.showNotification(`Unsupported file type for timeline drop: ${file.type}`, 3000);
        }
    } else {
        // Handle drops of JSON data (e.g., piano-roll sequence from drag handle, sound browser item)
        const jsonDataString = event.dataTransfer.getData("application/json");
        if (jsonDataString) {
            try {
                const soundData = JSON.parse(jsonDataString);
                if (soundData.type === 'piano-roll-sequence') {
                    // Drop from Piano Roll drag handle to create a MIDI clip
                    const sourceTrack = getTrackById(soundData.sourceTrackId);
                    // Find the actual sequence object from the source track's sequences
                    const sequence = sourceTrack?.sequences.sequences.find(s => s.id === soundData.sequenceId);
                    if (targetTrack && sequence) {
                        if (targetTrack.type === 'Synth' || targetTrack.type === 'InstrumentSampler' || targetTrack.type === 'DrumSampler' || targetTrack.type === 'Sampler') {
                            // Add MIDI clip to a compatible track
                            targetTrack.clips.addMidiClip(sequence, startTime);
                            localAppServices.showNotification(`MIDI clip from ${sourceTrack.name} added to ${targetTrack.name}.`, 2000);
                        } else {
                             localAppServices.showNotification(`Cannot add MIDI clips to a ${targetTrack.type} track. Drop on an instrument track.`, 3500);
                        }
                    }
                } else if (soundData.type === 'sound-browser-item') {
                    // Drop from Sound Browser (not yet fully implemented for direct timeline drop)
                    localAppServices.showNotification(`Cannot drag from Sound Browser to timeline yet. Drop on a sampler track's inspector instead.`, 4000);
                }
            } catch(e) {
                console.error("Error parsing dropped JSON data:", e);
                localAppServices.showNotification("Error processing dropped data.", 3000);
            }
        }
    }
}

/**
 * Handles opening the YouTube Importer window.
 */
export function handleOpenYouTubeImporter() {
    if (localAppServices.openYouTubeImporterWindow) {
        localAppServices.openYouTubeImporterWindow();
    } else {
        localAppServices.showNotification("YouTube Importer UI is currently unavailable.", 3000);
    }
}

/**
 * Updates the disabled state and title of the Undo and Redo buttons.
 * This function is exposed to `main.js` via `initializeEventHandlersModule`.
 */
function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtnTop');
    const redoBtn = document.getElementById('redoBtnTop');
    
    if (undoBtn) {
        const undoStack = getUndoStack();
        if (undoStack.length > 0) {
            undoBtn.disabled = false;
            undoBtn.title = `Undo: ${undoStack[undoStack.length - 1].actionDescription}`;
        } else {
            undoBtn.disabled = true;
            undoBtn.title = 'Undo';
        }
    }
    if (redoBtn) {
        const redoStack = getRedoStack();
        if (redoStack.length > 0) {
            redoBtn.disabled = false;
            redoBtn.title = `Redo: ${redoStack[redoStack.length - 1].actionDescription}`;
        } else {
            redoBtn.disabled = true;
            redoBtn.title = 'Redo';
        }
    }
}

/**
 * Toggles the browser's full-screen mode.
 */
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            localAppServices.showNotification(`Error attempting to enable full-screen mode: ${err.message}`, 3000);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

/**
 * Sets up Web MIDI API access and populates the MIDI input selector.
 * This function is now EXPORTED and called by main.js.
 */
export function setupMIDI() {
    if (!navigator.requestMIDIAccess) {
        localAppServices.showNotification("Web MIDI is not supported in this browser.", 4000);
        return;
    }
    if (!window.isSecureContext) {
        localAppServices.showNotification("MIDI access requires a secure connection (HTTPS).", 6000);
        return;
    }

    navigator.requestMIDIAccess({ sysex: false })
        .then(onMIDISuccess)
        .catch(onMIDIFailure);
}

/**
 * Handles the selection of a MIDI input device from the dropdown.
 * @param {Event} event - The change event from the select element.
 */
export function selectMIDIInput(event) {
    const midiAccess = localAppServices.getMidiAccess();
    const selectedId = event.target.value;
    const currentActiveInput = localAppServices.getActiveMIDIInput();

    // Disconnect previous active input's listener
    if (currentActiveInput) {
        currentActiveInput.onmidimessage = null;
    }

    // Set new active input and attach listener
    if (selectedId && midiAccess) {
        const newActiveInput = midiAccess.inputs.get(selectedId);
        if (newActiveInput) {
            newActiveInput.onmidimessage = onMIDIMessage; // Assign local onMIDIMessage
            localAppServices.setActiveMIDIInput(newActiveInput);
            localAppServices.showNotification(`MIDI Input: ${newActiveInput.name} selected.`, 1500);
        } else {
            localAppServices.showNotification("MIDI device not found.", 2000);
            localAppServices.setActiveMIDIInput(null);
        }
    } else {
        localAppServices.setActiveMIDIInput(null);
        localAppServices.showNotification("MIDI Input: None selected.", 1500);
    }
}

/**
 * Handles changes to the global playback mode.
 * @param {'piano-roll'|'timeline'} newMode - The new playback mode.
 * @param {'piano-roll'|'timeline'} oldMode - The old playback mode.
 */
export function onPlaybackModeChange(newMode, oldMode) { // Changed to export function
    console.log(`Playback mode changed from ${oldMode} to ${newMode}`);
    const tracks = localAppServices.getTracks();

    if (localAppServices.Tone.Transport.state === 'started') {
        localAppServices.Tone.Transport.stop();
    }
    
    tracks.forEach(track => track.sequences.stopSequence?.());

    tracks.forEach(track => track.sequences.recreateToneSequence?.());

    const playbackModeToggle = document.getElementById('playbackModeToggleBtnGlobalTop');
    if (playbackModeToggle) {
        const modeText = newMode.charAt(0).toUpperCase() + newMode.slice(1);
        playbackModeToggle.textContent = `Mode: ${modeText}`;
    }
}

/**
 * Initializes the event handlers module.
 * @param {object} appServicesFromMain - The main app services object.
 * @returns {object} An object containing functions to be exposed via appServices.
 */
export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain;
    
    // Return all functions that are meant to be exposed via appServices.
    // Ensure all functions referenced here are defined in this file, either as export or local functions above this point.
    return {
        updateUndoRedoButtons: updateUndoRedoButtons,
        initializePrimaryEventListeners: initializePrimaryEventListeners,
        attachGlobalControlEvents: attachGlobalControlEvents,
        setupMIDI: setupMIDI,
        handleTrackMute: handleTrackMute,
        handleTrackSolo: handleTrackSolo,
        handleTrackArm: handleTrackArm,
        handleRemoveTrack: handleRemoveTrack,
        handleOpenTrackInspector: handleOpenTrackInspector,
        handleOpenEffectsRack: handleOpenEffectsRack,
        handleOpenPianoRoll: handleOpenPianoRoll,
        onPlaybackModeChange: onPlaybackModeChange,
        handleTimelineLaneDrop: handleTimelineLaneDrop,
        handleOpenYouTubeImporter: handleOpenYouTubeImporter,
        // Any other top-level functions that need to be called through appServices.
    };
}