// js/daw/eventHandlers.js - Global Event Listeners and Input Handling Module

// Import state functions
import { getTracks, getTrackById, getSoloedTrackId, setSoloedTrackId, getArmedTrackId, setArmedTrackId, isRecording, setIsRecording, getRecordingTrackId, setRecordingTrackId, getRecordingStartTime, setRecordingStartTime } from './state/trackState.js';
import { getPlaybackMode, setPlaybackMode, getMidiAccess, setActiveMIDIInput, getActiveMIDIInput, getMidiRecordModeState, setCurrentUserThemePreference, setMidiRecordModeState } from './state/appState.js';
import { getUndoStack, getRedoStack, captureStateForUndo } from './state/projectState.js';
import { getWindowById } from './state/windowState.js';
import { getClipboardData } from './state/projectState.js';

// Corrected import for Constants - directly from current directory
import { incrementOctaveShift, decrementOctaveShift, COMPUTER_KEY_SYNTH_OCTAVE_SHIFT, computerKeySynthMap, PIANO_ROLL_END_MIDI_NOTE, SYNTH_PITCHES, DRUM_MIDI_START_NOTE } from './constants.js';

let localAppServices = {};
const currentlyPressedKeys = new Set();
let isSustainPedalDown = false;
const sustainedNotes = new Map(); // Map to hold notes currently being sustained by pedal

/**
 * Initializes the event handlers module.
 * This function is designed to be called once during app startup by main.js.
 * It now returns an object containing functions that main.js needs to expose via appServices.
 * @param {object} appServicesFromMain - The main appServices object.
 * @returns {object} An object containing functions to be exposed via appServices.
 */
export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain;
    
    // Return functions that main.js needs to assign to appServices
    return {
        updateUndoRedoButtons: updateUndoRedoButtons,
        // Add other functions here if they need to be callable directly from appServices
    };
}

/**
 * Initializes primary global event listeners, mostly related to the desktop and start menu.
 */
export function initializePrimaryEventListeners() {
    const startButton = document.getElementById('startButton');
    const startMenu = document.getElementById('startMenu');
    const desktopEl = document.getElementById('desktop');
    const customBgInput = document.getElementById('customBgInput');

    startButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        startMenu?.classList.toggle('hidden');
        if (!startMenu?.classList.contains('hidden')) {
            updateUndoRedoButtons(); // Update buttons when start menu opens
        }
    });

    document.addEventListener('click', (e) => {
        if (startMenu && !startMenu.classList.contains('hidden')) {
            if (!startMenu.contains(e.target) && e.target !== startButton) {
                startMenu.classList.add('hidden');
            }
        }
    });
    
    desktopEl?.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const menuItems = [
            {
                label: 'Change Background',
                action: () => customBgInput?.click()
            }
        ];
        localAppServices.createContextMenu(e, menuItems); // Use localAppServices.createContextMenu
    });
    
    customBgInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            localAppServices.handleBackgroundUpload(file); // Use localAppServices.handleBackgroundUpload
        }
        e.target.value = null; // Clear input after selection
    });


    // Handlers for "Add Track" menu items
    const addTrackHandler = async (type) => {
        await localAppServices.initAudioContextAndMasterMeter?.(true); // Ensure audio context is running
        const newTrack = await localAppServices.addTrack(type); // Add the track
        if (newTrack) {
            localAppServices.openTrackInspectorWindow?.(newTrack.id); // Open inspector for new track
        }
        startMenu?.classList.add('hidden'); // Close start menu
    };
    
    document.getElementById('menuAddSynthTrack')?.addEventListener('click', () => addTrackHandler('Synth'));
    document.getElementById('menuAddSamplerTrack')?.addEventListener('click', () => addTrackHandler('Sampler'));
    document.getElementById('menuAddDrumSamplerTrack')?.addEventListener('click', () => addTrackHandler('DrumSampler'));
    document.getElementById('menuAddInstrumentSamplerTrack')?.addEventListener('click', () => addTrackHandler('InstrumentSampler'));
    document.getElementById('menuAddAudioTrack')?.addEventListener('click', () => addTrackHandler('Audio'));
    
    document.getElementById('menuOpenSoundBrowser')?.addEventListener('click', () => {
        localAppServices.openSoundBrowserWindow?.(); // Open Sound Browser
        startMenu?.classList.add('hidden');
    });
    
    document.getElementById('menuOpenYouTubeImporter')?.addEventListener('click', () => {
        localAppServices.openYouTubeImporterWindow?.(); // Open YouTube Importer
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuOpenPianoRoll')?.addEventListener('click', () => {
        const currentTracks = getTracks();
        // Find the first instrument or sampler track to open its piano roll by default
        const firstInstrumentTrack = currentTracks.find(t => t.type === 'Synth' || t.type === 'InstrumentSampler' || t.type === 'Sampler' || t.type === 'DrumSampler');
        if (firstInstrumentTrack) {
            localAppServices.openPianoRollWindow?.(firstInstrumentTrack.id); // Open Piano Roll
        } else {
            localAppServices.showNotification("Add an instrument or sampler track first.", 3000);
        }
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuOpenMixer')?.addEventListener('click', () => {
        localAppServices.openMixerWindow?.(); // Open Mixer
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuOpenMasterEffects')?.addEventListener('click', () => {
        localAppServices.openMasterEffectsRackWindow?.(); // Open Master Effects Rack
        startMenu?.classList.add('hidden');
    });

    document.getElementById('undoBtnTop')?.addEventListener('click', () => {
        localAppServices.undoLastAction(); // Perform undo
        updateUndoRedoButtons(); // Update button states
    });

    document.getElementById('redoBtnTop')?.addEventListener('click', () => {
        localAppServices.redoLastAction(); // Perform redo
        updateUndoRedoButtons(); // Update button states
    });


    document.getElementById('menuSaveProject')?.addEventListener('click', () => {
        localAppServices.saveProject(); // Save project
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuLoadProject')?.addEventListener('click', () => {
        document.getElementById('loadProjectInput')?.click(); // Trigger hidden file input click
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuExportWav')?.addEventListener('click', () => {
        localAppServices.exportToWav(); // Export to WAV
        startMenu?.classList.add('hidden');
    });
    
    document.getElementById('menuOpenTestProfile')?.addEventListener('click', () => {
        const usernameToOpen = 'testuser'; // Example username for testing
        // Open profile in a new browser tab/window (or SnugWindow if that feature is implemented)
        window.open(`profile.html?user=${usernameToOpen}`, '_blank'); // Opens in new browser window/tab
        document.getElementById('startMenu')?.classList.add('hidden');
    });

    document.getElementById('menuRefreshMidi')?.addEventListener('click', () => {
        localAppServices.showNotification('Refreshing MIDI devices...', 1500);
        setupMIDI(); // Re-scan for MIDI devices
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuToggleFullScreen')?.addEventListener('click', () => {
        toggleFullScreen(); // Toggle full screen mode
        startMenu?.classList.add('hidden');
    });

    // Event listener for loading project file via file input
    const loadProjectInput = document.getElementById('loadProjectInput');
    if (loadProjectInput) {
        loadProjectInput.addEventListener('change', localAppServices.handleProjectFileLoad); // Use localAppServices
    }
}

/**
 * Attaches global control event listeners (play, stop, record, tempo, MIDI input, theme toggle).
 * These are listeners for the top taskbar controls.
 */
export function attachGlobalControlEvents() { // Removed `uiCache` param, `localAppServices` is used
    const playBtn = document.getElementById('playBtnGlobalTop');
    const stopBtn = document.getElementById('stopBtnGlobalTop');
    const recordBtn = document.getElementById('recordBtnGlobalTop');
    const tempoInput = document.getElementById('tempoGlobalInputTop');
    const midiSelect = document.getElementById('midiInputSelectGlobalTop');
    const playbackModeToggle = document.getElementById('playbackModeToggleBtnGlobalTop');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const metronomeBtn = document.getElementById('metronomeToggleBtn');
    const midiRecordModeBtn = document.getElementById('midiRecordModeBtn');
    
    // Handler for Play/Pause button
    const handlePlayPause = async () => {
        const audioReady = await localAppServices.initAudioContextAndMasterMeter?.(true);
        if (!audioReady) {
            localAppServices.showNotification("Audio context not running. Please interact with the page.", 3000);
            return;
        }

        const transportState = localAppServices.Tone.Transport.state;

        if (transportState === 'started') {
            localAppServices.Tone.Transport.pause();
        } else {
            if (transportState === 'stopped') {
                // If stopped, re-schedule playback based on current mode (piano-roll or timeline)
                localAppServices.onPlaybackModeChange?.(getPlaybackMode(), 'reschedule');
            }
            localAppServices.Tone.Transport.start();
        }
    };

    // Handler for Play/Stop button (currently only Stop if playing, otherwise Start from beginning)
    const handlePlayStop = async () => {
        const audioReady = await localAppServices.initAudioContextAndMasterMeter?.(true);
        if (!audioReady) {
            localAppServices.showNotification("Audio context not running. Please interact with the page.", 3000);
            return;
        }

        if (localAppServices.Tone.Transport.state === 'started') {
            handleStop(); // If playing, stop
        } else {
            // If stopped, reschedule playback and start
            localAppServices.onPlaybackModeChange?.(getPlaybackMode(), 'reschedule');
            localAppServices.Tone.Transport.start();
        }
    };
    
    // Handler for Stop button (stops all audio playback)
    const handleStop = () => {
        localAppServices.forceStopAllAudio?.(); // Force stop all currently playing notes/samples
        
        if (localAppServices.Tone.Transport.state !== 'stopped') {
            localAppServices.Tone.Transport.stop(); // Stop the Tone.js Transport
        }
    };

    // Handler for Record button
    const handleRecord = async () => {
        const audioReady = await localAppServices.initAudioContextAndMasterMeter?.(true);
        if (!audioReady) return;
    
        const currentlyRecording = isRecording();
        const armedTrackId = getArmedTrackId();
        const armedTrack = getTrackById(armedTrackId);
        
        const recordBtn = document.getElementById('recordBtnGlobalTop');

        if (currentlyRecording) {
            // Stop recording
            setIsRecording(false);
            recordBtn.classList.remove('recording'); // Remove recording indicator
            // If the armed track was an Audio track and recording was active, stop audio recording
            if (getRecordingTrackId() === armedTrackId && armedTrack?.type === 'Audio' && localAppServices.stopAudioRecording) {
                await localAppServices.stopAudioRecording();
            }
            // If transport was started by recording, stop it now (or just stop if it was already playing)
            if (localAppServices.Tone.Transport.state === 'started') {
                handleStop();
            }
        } else if (armedTrack) {
            // Start recording
            setRecordingTrackId(armedTrackId); // Set which track is being recorded
            setIsRecording(true);
            recordBtn.classList.add('recording'); // Add recording indicator
            
            // Set the recording start time based on current transport position
            setRecordingStartTime(localAppServices.Tone.Transport.seconds);
    
            if (armedTrack.type === 'Audio') {
                // If armed track is Audio, start actual audio recording (microphone)
                const success = await localAppServices.startAudioRecording(armedTrack, armedTrack.isMonitoringEnabled);
                if (!success) {
                    // If audio recording failed, revert recording state
                    setIsRecording(false);
                    recordBtn.classList.remove('recording');
                    return;
                }
            }
    
            // If transport is not already started, start it
            if (localAppServices.Tone.Transport.state !== 'started') {
                localAppServices.Tone.Transport.start();
            }
        } else {
            // If no track is armed, show notification
            localAppServices.showNotification("No track armed for recording. Arm a track by clicking its 'Arm' button.", 2500);
        }
    };

    playBtn?.addEventListener('click', handlePlayPause);
    stopBtn?.addEventListener('click', handleStop);
    recordBtn?.addEventListener('click', handleRecord);
    
    // Metronome toggle
    metronomeBtn?.addEventListener('click', () => {
        const isEnabled = localAppServices.toggleMetronome();
        metronomeBtn.classList.toggle('active', isEnabled);
    });

    // MIDI Record Mode toggle
    midiRecordModeBtn?.addEventListener('click', () => {
        const currentMode = getMidiRecordModeState();
        const newMode = currentMode === 'overdub' ? 'replace' : 'overdub';
        setMidiRecordModeState(newMode);
        midiRecordModeBtn.textContent = newMode.charAt(0).toUpperCase() + newMode.slice(1);
        localAppServices.showNotification(`MIDI Record Mode: ${newMode.charAt(0).toUpperCase() + newMode.slice(1)}`, 1500);
    });

    // Tempo input change
    tempoInput?.addEventListener('change', (e) => {
        const newTempo = parseFloat(e.target.value);
        if (!isNaN(newTempo) && newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) {
            localAppServices.Tone.Transport.bpm.value = newTempo;
        } else {
            // Revert to current tempo if invalid input
            e.target.value = localAppServices.Tone.Transport.bpm.value.toFixed(1);
            localAppServices.showNotification(`Tempo must be between ${Constants.MIN_TEMPO} and ${Constants.MAX_TEMPO}.`, 2000);
        }
    });

    // Click on tempo display to select input
    document.getElementById('taskbarTempoDisplay')?.addEventListener('click', () => {
        tempoInput?.select();
    });

    // MIDI Input selector change
    midiSelect?.addEventListener('change', selectMIDIInput);

    // Playback Mode Toggle (Piano Roll / Timeline)
    playbackModeToggle?.addEventListener('click', () => {
        const currentMode = getPlaybackMode();
        const newMode = currentMode === 'piano-roll' ? 'timeline' : 'piano-roll';
        setPlaybackMode(newMode); // This triggers onPlaybackModeChange via appState
    });
    
    // Theme Toggle
    themeToggleBtn?.addEventListener('click', () => {
        const isLightTheme = document.body.classList.contains('theme-light');
        const newTheme = isLightTheme ? 'dark' : 'light';
        setCurrentUserThemePreference(newTheme); // This applies the theme and stores preference
    });

    // Global Keyboard Event Listener (for computer keyboard as piano, shortcuts)
    document.addEventListener('keydown', (e) => {
        // Ignore key presses if target is an input field or content editable
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }
        // Prevent key repeat triggering multiple events
        if (e.repeat) return;
        
        const key = typeof e.key === 'string' ? e.key.toLowerCase() : '';

        // Computer Keyboard as Piano
        if (computerKeySynthMap[key] && !currentlyPressedKeys.has(key)) {
            e.preventDefault(); // Prevent default browser action (e.g., scrolling)
            const armedTrackId = getArmedTrackId();
            const armedTrack = getTrackById(armedTrackId);
            
            if (armedTrack && armedTrack.instrument) {
                const noteNumber = computerKeySynthMap[key] + (COMPUTER_KEY_SYNTH_OCTAVE_SHIFT * 12);
                const noteName = localAppServices.Tone.Midi(noteNumber).toNote();
                armedTrack.instrument.triggerAttack(noteName, localAppServices.Tone.now(), 0.75); // Trigger note
                currentlyPressedKeys.add(key); // Mark key as pressed
            }
        } else {
            // Global Shortcuts
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent page scroll
                handlePlayStop();
            } else if (e.key === 'Escape') {
                handleStop();
            } else if (key === 'r' && !e.ctrlKey && !e.metaKey) { // 'r' for record (not with Ctrl/Cmd)
                handleRecord();
            } else if (key === 'z' && !e.ctrlKey && !e.metaKey) { // 'z' to decrement octave (not with Ctrl/Cmd)
                decrementOctaveShift();
                localAppServices.showNotification?.(`Keyboard Octave: ${COMPUTER_KEY_SYNTH_OCTAVE_SHIFT > 0 ? '+' : ''}${COMPUTER_KEY_SYNTH_OCTAVE_SHIFT}`, 1000);
            } else if (key === 'x' && !e.ctrlKey && !e.metaKey) { // 'x' to increment octave (not with Ctrl/Cmd)
                incrementOctaveShift();
                localAppServices.showNotification?.(`Keyboard Octave: ${COMPUTER_KEY_SYNTH_OCTAVE_SHIFT > 0 ? '+' : ''}${COMPUTER_KEY_SYNTH_OCTAVE_SHIFT}`, 1000);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                // Future: Add functionality for deleting selected clips/notes on timeline/piano roll
                // Removed timeline interaction code
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                // Future: Add functionality for navigating selected clips/notes
                // Removed timeline interaction code
            } else if (e.ctrlKey && key === 'z') { // Ctrl+Z for Undo
                localAppServices.undoLastAction();
            } else if ((e.ctrlKey && key === 'y') || (e.shiftKey && e.ctrlKey && key === 'z')) { // Ctrl+Y or Ctrl+Shift+Z for Redo
                localAppServices.redoLastAction();
            } else if (e.ctrlKey && key === 's') { // Ctrl+S for Save Project
                e.preventDefault(); // Prevent browser save dialog
                localAppServices.saveProject();
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = typeof e.key === 'string' ? e.key.toLowerCase() : '';
        // Release note when key is lifted
        if (computerKeySynthMap[key]) {
            e.preventDefault();
            const armedTrackId = getArmedTrackId();
            const armedTrack = getTrackById(armedTrackId);

            if (armedTrack && armedTrack.instrument) {
                const noteNumber = computerKeySynthMap[key] + (COMPUTER_KEY_SYNTH_OCTAVE_SHIFT * 12);
                const noteName = localAppServices.Tone.Midi(noteNumber).toNote();
                armedTrack.instrument.triggerRelease(noteName, localAppServices.Tone.now()); // Release note
                currentlyPressedKeys.delete(key); // Mark key as released
            }
        }
    });
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

    navigator.requestMIDIAccess({ sysex: false }) // Request sysex access if needed, but safer to start false
        .then(onMIDISuccess)
        .catch(onMIDIFailure);
}

/**
 * Callback for successful MIDI access.
 * @param {MIDIAccess} midiAccess - The MIDIAccess object.
 */
function onMIDISuccess(midiAccess) {
    localAppServices.setMidiAccess(midiAccess);
    populateMIDIInputSelector(midiAccess);
    // Listen for state changes (e.g., MIDI device connected/disconnected)
    midiAccess.onstatechange = () => {
        populateMIDIInputSelector(midiAccess);
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
    midiSelect.innerHTML = ''; // Clear existing options

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
            option.textContent = input.name || `MIDI Input ${input.id}`; // Fallback name
            midiSelect.appendChild(option);
        });
    }

    // Restore previously active MIDI input if it's still available
    const activeInput = localAppServices.getActiveMIDIInput();
    if (activeInput && currentInputs.has(activeInput.id)) {
        midiSelect.value = activeInput.id;
        // Re-attach listener if the device object might have changed (e.g. after refresh)
        activeInput.onmidimessage = onMIDIMessage; 
    } else {
        // If the previously active input is no longer available, reset it
        localAppServices.setActiveMIDIInput(null);
        midiSelect.value = ""; // Select "None"
    }
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
        if (newActiveInput) { // Ensure device actually exists
            newActiveInput.onmidimessage = onMIDIMessage;
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
 * Callback function for incoming MIDI messages.
 * @param {MIDIMessageEvent} message - The MIDI message event.
 */
function onMIDIMessage(message) {
    const [command, noteNumber, velocity] = message.data;
    const commandType = command & 0xF0; // Mask to get command type (e.g., Note On, Note Off)
    const noteOn = commandType === 0x90 && velocity > 0; // Note On (0x90) with non-zero velocity
    const noteOff = commandType === 0x80 || (commandType === 0x90 && velocity === 0); // Note Off (0x80) or Note On with zero velocity

    const armedTrackId = getArmedTrackId();
    if (armedTrackId === null) return; // No track armed, ignore MIDI
    const armedTrack = getTrackById(armedTrackId);
    if (!armedTrack || !armedTrack.instrument) return; // Armed track not found or has no instrument

    // Sustain Pedal (Controller Change message 0xB0, controller 64)
    if (commandType === 0xB0 && noteNumber === 64) { 
        if (velocity > 63) { // Pedal down
            isSustainPedalDown = true;
        } else { // Pedal up
            isSustainPedalDown = false;
            // Release all sustained notes
            sustainedNotes.forEach((noteValue, midiNote) => {
                if (armedTrack.instrument) { // Ensure instrument still exists
                    armedTrack.instrument.triggerRelease(noteValue, localAppServices.Tone.now());
                }
            });
            sustainedNotes.clear(); // Clear the map of sustained notes
        }
        return; // Handle sustain pedal and exit
    }
    
    // Note On/Off messages
    if (noteOn || noteOff) {
        const noteName = localAppServices.Tone.Midi(noteNumber).toNote(); // Convert MIDI number to note name (e.g., "C4")
        
        if (noteOn) {
            // If this note was previously sustained, release it first to re-trigger cleanly
            if (sustainedNotes.has(noteNumber)) {
                if (armedTrack.instrument) {
                    armedTrack.instrument.triggerRelease(sustainedNotes.get(noteNumber), localAppServices.Tone.now());
                }
                sustainedNotes.delete(noteNumber);
            }
            armedTrack.instrument.triggerAttack(noteName, localAppServices.Tone.now(), velocity / 127); // Trigger note attack
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
                const ticksPerStep = localAppServices.Tone.Transport.PPQ / 4; // Assuming 16th note steps
                const currentTick = localAppServices.Tone.Transport.ticks;
                const currentStep = Math.floor(currentTick / ticksPerStep); // Determine current grid step
                const loopStep = currentStep % activeSequence.length; // Ensure step is within sequence length

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
        getTracks().forEach(t => localAppServices.updateTrackUI(t.id, 'muteChanged')); // Update all track UIs
        localAppServices.updateMixerWindow(); // Update mixer UI
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
    setSoloedTrackId(newSoloId); // Update global soloed track ID
    getTracks().forEach(t => {
        if (t.updateSoloMuteState) {
            t.updateSoloMuteState(newSoloId); // Update each track's individual solo/mute state
        }
        localAppServices.updateTrackUI(t.id, 'soloChanged'); // Update each track's UI
    });
    if (localAppServices.updateMixerWindow) {
        localAppServices.updateMixerWindow(); // Update mixer UI
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
    setArmedTrackId(newArmedId); // Update global armed track ID
    if (localAppServices.updateTrackUI) {
        localAppServices.updateTrackUI(trackId, 'armChanged'); // Update armed track's UI
        if (currentArmedId !== null && currentArmedId !== trackId) {
            // If another track was armed, update its UI to reflect disarming
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
        localAppServices.removeTrack(trackId); // Remove track after confirmation
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