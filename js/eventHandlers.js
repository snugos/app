// js/eventHandlers.js - Global Event Listeners and Input Handling Module
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog, createContextMenu } from './utils.js';
import {
    getTracksState as getTracks,
    getTrackByIdState as getTrackById,
    captureStateForUndoInternal as captureStateForUndo,
    setSoloedTrackIdState as setSoloedTrackId,
    getSoloedTrackIdState as getSoloedTrackId,
    setArmedTrackIdState as setArmedTrackId,
    getArmedTrackIdState as getArmedTrackId,
    setActiveSequencerTrackIdState as setActiveSequencerTrackId,
    setIsRecordingState as setIsRecording,
    isTrackRecordingState as isTrackRecording,
    setRecordingTrackIdState as setRecordingTrackId,
    getRecordingTrackIdState as getRecordingTrackId,
    setRecordingStartTimeState as setRecordingStartTime,
    removeTrackFromStateInternal as coreRemoveTrackFromState,
    getPlaybackModeState,
    setPlaybackModeState,
    getMidiAccessState,
    getActiveMIDIInputState
} from './state.js';

let localAppServices = {};
let transportKeepAliveBufferSource = null; // To keep Tone.Transport "warm"
let silentKeepAliveBuffer = null; // A silent buffer for the keep-alive source

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    // Ensure playback mode functions are available, falling back to direct state fns if not on appServices
    if (!localAppServices.setPlaybackMode && setPlaybackModeState) {
        localAppServices.setPlaybackMode = setPlaybackModeState;
    }
    if (!localAppServices.getPlaybackMode && getPlaybackModeState) {
        localAppServices.getPlaybackMode = getPlaybackModeState;
    }
}

export let currentlyPressedComputerKeys = {}; // Tracks active computer keyboard keys for synth input
let currentOctaveShift = 0; // For computer keyboard synth octave
const MIN_OCTAVE_SHIFT = -2;
const MAX_OCTAVE_SHIFT = 2;

/**
 * Initializes primary event listeners for static UI elements like start menu, desktop context menu.
 * @param {object} appContext - The main application services object.
 */
export function initializePrimaryEventListeners(appContext) {
    const services = appContext || localAppServices;
    const uiCache = services.uiElementsCache || {};
    console.log('[EventHandlers initializePrimaryEventListeners] Initializing. uiCache keys:', Object.keys(uiCache));

    try {
        // Start Button and Menu
        if (uiCache.startButton) {
            uiCache.startButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent desktop click from immediately closing
                if (uiCache.startMenu) {
                    uiCache.startMenu.classList.toggle('hidden');
                } else {
                    console.error('[EventHandlers] Start Menu (uiCache.startMenu) not found when Start Button clicked!');
                }
            });
        } else {
            console.warn('[EventHandlers initializePrimaryEventListeners] Start Button (uiCache.startButton) NOT found in uiCache!');
        }

        // Desktop interactions (closing menus)
        if (uiCache.desktop) {
            uiCache.desktop.addEventListener('click', () => {
                if (uiCache.startMenu && !uiCache.startMenu.classList.contains('hidden')) {
                    uiCache.startMenu.classList.add('hidden');
                }
                const activeContextMenu = document.querySelector('.context-menu#snug-context-menu');
                if (activeContextMenu) {
                    activeContextMenu.remove();
                }
            });

            // Desktop Context Menu
            uiCache.desktop.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const menuItems = [
                    { label: "Add Synth Track", action: () => { if(services.addTrack) services.addTrack('Synth', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Slicer Sampler Track", action: () => { if(services.addTrack) services.addTrack('Sampler', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Sampler (Pads)", action: () => { if(services.addTrack) services.addTrack('DrumSampler', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Instrument Sampler Track", action: () => { if(services.addTrack) services.addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Audio Track", action: () => { if(services.addTrack) services.addTrack('Audio', {_isUserActionPlaceholder: true}); } },
                    { separator: true },
                    { label: "Open Sound Browser", action: () => { if(services.openSoundBrowserWindow) services.openSoundBrowserWindow(); } },
                    { label: "Open Timeline", action: () => { if(services.openTimelineWindow) services.openTimelineWindow(); } },
                    { label: "Open Global Controls", action: () => { if(services.openGlobalControlsWindow) services.openGlobalControlsWindow(); } },
                    { label: "Open Mixer", action: () => { if(services.openMixerWindow) services.openMixerWindow(); } },
                    { label: "Open Master Effects", action: () => { if(services.openMasterEffectsRackWindow) services.openMasterEffectsRackWindow(); } },
                    { separator: true },
                    { label: "Upload Custom Background", action: () => { if(services.triggerCustomBackgroundUpload) services.triggerCustomBackgroundUpload(); } },
                    { label: "Remove Custom Background", action: () => { if(services.removeCustomDesktopBackground) services.removeCustomDesktopBackground(); } },
                    { separator: true },
                    { label: "Toggle Full Screen", action: toggleFullScreen }
                ];
                if (typeof createContextMenu === 'function') {
                    createContextMenu(e, menuItems, services);
                } else {
                    console.error("[EventHandlers] createContextMenu function not available.");
                }
            });
        } else {
             console.warn('[EventHandlers initializePrimaryEventListeners] Desktop element (uiCache.desktop) NOT found in uiCache!');
        }

        // Start Menu Item Actions
        const menuActions = {
            menuAddSynthTrack: () => services.addTrack?.('Synth', {_isUserActionPlaceholder: true}),
            menuAddSamplerTrack: () => services.addTrack?.('Sampler', {_isUserActionPlaceholder: true}),
            menuAddDrumSamplerTrack: () => services.addTrack?.('DrumSampler', {_isUserActionPlaceholder: true}),
            menuAddInstrumentSamplerTrack: () => services.addTrack?.('InstrumentSampler', {_isUserActionPlaceholder: true}),
            menuAddAudioTrack: () => services.addTrack?.('Audio', {_isUserActionPlaceholder: true}),
            menuOpenSoundBrowser: () => services.openSoundBrowserWindow?.(),
            menuOpenTimeline: () => services.openTimelineWindow?.(),
            menuOpenGlobalControls: () => services.openGlobalControlsWindow?.(),
            menuOpenMixer: () => services.openMixerWindow?.(),
            menuOpenMasterEffects: () => services.openMasterEffectsRackWindow?.(),
            menuUndo: () => services.undoLastAction?.(),
            menuRedo: () => services.redoLastAction?.(),
            menuSaveProject: () => services.saveProject?.(),
            menuLoadProject: () => services.loadProject?.(),
            menuExportWav: () => services.exportToWav?.(),
            menuToggleFullScreen: toggleFullScreen,
        };

        for (const menuItemId in menuActions) {
            if (uiCache[menuItemId]) {
                uiCache[menuItemId].addEventListener('click', () => {
                    menuActions[menuItemId]();
                    if (uiCache.startMenu) uiCache.startMenu.classList.add('hidden'); // Close menu after action
                });
            }
        }

        // Project Load Input
        if (uiCache.loadProjectInput) {
            uiCache.loadProjectInput.addEventListener('change', (e) => {
                if (services.handleProjectFileLoad) {
                    services.handleProjectFileLoad(e);
                } else {
                    console.error("[EventHandlers] handleProjectFileLoad service not available.");
                }
            });
        } else {
            console.warn("[EventHandlers] Load project input (uiCache.loadProjectInput) not found.");
        }

    } catch (error) {
        console.error("[EventHandlers initializePrimaryEventListeners] Error during initialization:", error);
        showNotification("Error setting up primary interactions. Some UI might not work.", 5000);
    }
}

/**
 * Attaches event listeners to global transport control elements.
 * @param {object} elements - Object containing references to the DOM elements.
 */
export function attachGlobalControlEvents(elements) {
    if (!elements) {
        console.error("[EventHandlers attachGlobalControlEvents] Elements object is null or undefined.");
        return;
    }
    const { playBtnGlobal, recordBtnGlobal, stopBtnGlobal, tempoGlobalInput, midiInputSelectGlobal, playbackModeToggleBtnGlobal } = elements;

    // Play/Pause Button
    if (playBtnGlobal) {
        playBtnGlobal.addEventListener('click', async () => {
            try {
                if (!localAppServices.initAudioContextAndMasterMeter) {
                    console.error("initAudioContextAndMasterMeter service not available.");
                    showNotification("Audio system error.", 3000); return;
                }
                // Ensure AudioContext is started (user gesture)
                const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
                if (!audioReady) {
                    showNotification("Audio context not ready. Please interact with the page.", 3000);
                    return;
                }

                const transport = Tone.Transport;
                console.log(`[EventHandlers Play/Resume] Clicked. Transport state: ${transport.state}, time: ${transport.seconds.toFixed(2)}`);

                // Stop all track-specific playback before manipulating transport
                const tracks = getTracks();
                tracks.forEach(track => { if (typeof track.stopPlayback === 'function') track.stopPlayback(); });
                transport.cancel(0); // Clear any existing transport events

                // Dispose of old keep-alive source if it exists
                if (transportKeepAliveBufferSource && !transportKeepAliveBufferSource.disposed) {
                    try { transportKeepAliveBufferSource.stop(0); transportKeepAliveBufferSource.dispose(); } catch (e) {}
                    transportKeepAliveBufferSource = null;
                }

                if (transport.state === 'stopped' || transport.state === 'paused') {
                    const wasPaused = transport.state === 'paused';
                    const startTime = wasPaused ? transport.seconds : 0; // Resume from pause point or start from 0
                    if (!wasPaused) transport.position = 0; // Reset position if starting fresh

                    console.log(`[EventHandlers Play/Resume] Starting/Resuming from ${startTime.toFixed(2)}s.`);
                    transport.loop = true; // Default to loop, can be overridden by project settings later
                    transport.loopStart = 0;
                    transport.loopEnd = 3600; // Default long loop, actual loop points handled by timeline/sequencer logic

                    // Keep-alive buffer to prevent audio context suspension on some browsers
                    if (!silentKeepAliveBuffer && Tone.context) {
                        try {
                            silentKeepAliveBuffer = Tone.context.createBuffer(1, 1, Tone.context.sampleRate);
                            silentKeepAliveBuffer.getChannelData(0)[0] = 0; // Fill with silence
                        } catch (e) { console.error("Error creating silent buffer:", e); silentKeepAliveBuffer = null; }
                    }
                    if (silentKeepAliveBuffer) {
                        transportKeepAliveBufferSource = new Tone.BufferSource(silentKeepAliveBuffer).toDestination();
                        transportKeepAliveBufferSource.loop = true;
                        transportKeepAliveBufferSource.start(Tone.now() + 0.02, 0, transport.loopEnd); // Start slightly ahead
                    }

                    // Schedule playback for all tracks based on the current mode and start time
                    for (const track of tracks) {
                        if (typeof track.schedulePlayback === 'function') {
                            // schedulePlayback needs to know the overall transport stop time for timeline clips
                            await track.schedulePlayback(startTime, transport.loopEnd);
                        }
                    }
                    transport.start(Tone.now() + 0.05, startTime); // Start transport slightly ahead for scheduling
                    playBtnGlobal.textContent = 'Pause';
                } else { // Transport is 'started', so pause it
                    console.log(`[EventHandlers Play/Resume] Pausing transport.`);
                    transport.pause();
                    playBtnGlobal.textContent = 'Play';
                }
            } catch (error) {
                console.error("[EventHandlers Play/Pause] Error:", error);
                showNotification(`Error during playback: ${error.message}`, 4000);
                if (playBtnGlobal) playBtnGlobal.textContent = 'Play'; // Reset button state on error
            }
        });
    } else { console.warn("[EventHandlers] playBtnGlobal not found in provided elements."); }

    // Stop Button (Panic)
    if (stopBtnGlobal) {
        stopBtnGlobal.addEventListener('click', () => {
            console.log("[EventHandlers StopAll] Stop All button clicked.");
            if (localAppServices.panicStopAllAudio) {
                localAppServices.panicStopAllAudio();
            } else {
                // Fallback minimal stop if service not available
                console.error("[EventHandlers StopAll] panicStopAllAudio service not available.");
                if (typeof Tone !== 'undefined') {
                    Tone.Transport.stop();
                    Tone.Transport.cancel(0);
                }
                const playButton = localAppServices.uiElementsCache?.playBtnGlobal; // Try to get from cache
                if(playButton) playButton.textContent = 'Play';
                showNotification("Emergency stop executed (minimal).", 2000);
            }
        });
    } else {
        console.warn("[EventHandlers] stopBtnGlobal not found in provided elements.");
    }

    // Record Button
    if (recordBtnGlobal) {
        recordBtnGlobal.addEventListener('click', async () => {
            try {
                if (!localAppServices.initAudioContextAndMasterMeter) {
                    console.error("initAudioContextAndMasterMeter service not available.");
                    showNotification("Audio system error.", 3000); return;
                }
                const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
                if (!audioReady) { showNotification("Audio context not ready.", 3000); return; }

                const isCurrentlyRec = isTrackRecording();
                const trackToRecordId = getArmedTrackId();
                const trackToRecord = trackToRecordId !== null ? getTrackById(trackToRecordId) : null;

                if (!isCurrentlyRec) { // Start recording
                    if (!trackToRecord) { showNotification("No track armed for recording.", 2000); return; }
                    
                    let recordingInitialized = false;
                    if (trackToRecord.type === 'Audio') {
                        if (localAppServices.startAudioRecording) {
                            recordingInitialized = await localAppServices.startAudioRecording(trackToRecord, trackToRecord.isMonitoringEnabled);
                        } else { console.error("[EventHandlers] startAudioRecording service not available."); showNotification("Recording service unavailable.", 3000); }
                    } else { // For MIDI/Synth tracks, "recording" is more about capturing events
                        recordingInitialized = true; // Assume success for non-audio tracks for now
                    }

                    if (recordingInitialized) {
                        setIsRecording(true);
                        setRecordingTrackId(trackToRecord.id);
                        // If transport isn't running, reset and start it for recording
                        if (Tone.Transport.state !== 'started') { Tone.Transport.cancel(0); Tone.Transport.position = 0; }
                        setRecordingStartTime(Tone.Transport.seconds); // Record start time relative to transport
                        if (Tone.Transport.state !== 'started') Tone.Transport.start(); // Start transport if not already
                        
                        if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(true);
                        showNotification(`Recording started for ${trackToRecord.name}.`, 2000);
                    } else {
                        showNotification(`Failed to initialize recording for ${trackToRecord.name}.`, 3000);
                    }
                } else { // Stop recording
                    if (localAppServices.stopAudioRecording && getRecordingTrackId() !== null && getTrackById(getRecordingTrackId())?.type === 'Audio') {
                        await localAppServices.stopAudioRecording(); // This will handle blob processing
                    } 
                    // For non-audio tracks, stopping recording might involve finalizing MIDI data capture (TODO if needed)
                    
                    setIsRecording(false);
                    const previouslyRecordingTrackId = getRecordingTrackId();
                    setRecordingTrackId(null);
                    if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(false);
                    const prevTrack = previouslyRecordingTrackId !== null ? getTrackById(previouslyRecordingTrackId) : null;
                    showNotification(`Recording stopped${prevTrack ? ` for ${prevTrack.name}` : ''}.`, 2000);
                }
            } catch (error) {
                console.error("[EventHandlers Record] Error:", error);
                showNotification(`Error during recording: ${error.message}`, 4000);
                if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(false); // Reset UI
                setIsRecording(false); setRecordingTrackId(null); // Reset state
            }
        });
    } else { console.warn("[EventHandlers] recordBtnGlobal not found."); }

    // Tempo Input
    if (tempoGlobalInput) {
        tempoGlobalInput.addEventListener('input', (e) => { // Update Tone.Transport BPM in real-time
            try {
                const newTempo = parseFloat(e.target.value);
                if (!isNaN(newTempo) && newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) {
                    Tone.Transport.bpm.value = newTempo;
                    if (localAppServices.updateTaskbarTempoDisplay) localAppServices.updateTaskbarTempoDisplay(newTempo);
                }
            } catch (error) { console.error("[EventHandlers Tempo Input] Error:", error); }
        });
        tempoGlobalInput.addEventListener('change', () => { // Capture for undo on final change
            if (localAppServices.captureStateForUndo) {
                localAppServices.captureStateForUndo(`Set Tempo to ${Tone.Transport.bpm.value.toFixed(1)}`);
            }
        });
    } else { console.warn("[EventHandlers] tempoGlobalInput not found."); }

    // MIDI Input Select
    if (midiInputSelectGlobal) {
        midiInputSelectGlobal.addEventListener('change', (e) => {
            if (localAppServices.selectMIDIInput) localAppServices.selectMIDIInput(e.target.value);
            else console.error("[EventHandlers] selectMIDIInput service not available.");
        });
    } else { console.warn("[EventHandlers] midiInputSelectGlobal not found."); }

    // Playback Mode Toggle
    if (playbackModeToggleBtnGlobal) {
        playbackModeToggleBtnGlobal.addEventListener('click', () => {
            try {
                const currentGetMode = localAppServices.getPlaybackMode || getPlaybackModeState;
                const currentSetMode = localAppServices.setPlaybackMode || setPlaybackModeState; // setPlaybackModeState is internal
                if (currentGetMode && currentSetMode) {
                    const currentMode = currentGetMode();
                    const newMode = currentMode === 'sequencer' ? 'timeline' : 'sequencer';
                    currentSetMode(newMode); // This should trigger onPlaybackModeChange in appServices
                } else {
                    console.warn("[EventHandlers PlaybackModeToggle] getPlaybackMode or setPlaybackMode service not available.");
                }
            } catch (error) { console.error("[EventHandlers PlaybackModeToggle] Error:", error); }
        });
    } else { console.warn("[EventHandlers] playbackModeToggleBtnGlobal not found."); }
}

/**
 * Initializes MIDI access and populates the MIDI input select dropdown.
 */
export function setupMIDI() {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
            .then(onMIDISuccess, onMIDIFailure)
            .catch(onMIDIFailure); // Catch potential errors from requestMIDIAccess itself
    } else {
        console.warn("WebMIDI is not supported in this browser.");
        showNotification("WebMIDI not supported. Cannot use MIDI devices.", 3000);
    }
}

function onMIDISuccess(midiAccess) {
    if (localAppServices.setMidiAccess) {
        localAppServices.setMidiAccess(midiAccess); // Store the MIDI access object in state
    } else {
        console.error("[EventHandlers onMIDISuccess] setMidiAccess service not available.");
    }

    const inputs = midiAccess.inputs.values();
    const selectElement = localAppServices.uiElementsCache?.midiInputSelectGlobal;

    if (!selectElement) {
        console.warn("[EventHandlers onMIDISuccess] MIDI input select element not found in UI cache.");
        return;
    }

    selectElement.innerHTML = '<option value="">No MIDI Input</option>'; // Clear previous options
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        if (input.value) {
            const option = document.createElement('option');
            option.value = input.value.id;
            option.textContent = input.value.name || `Unknown MIDI Device ${input.value.id.slice(-4)}`;
            selectElement.appendChild(option);
        }
    }

    // Reselect previously active MIDI input if it still exists
    const activeMIDIId = getActiveMIDIInputState()?.id; // Get ID from state
    if (activeMIDIId) {
        selectElement.value = activeMIDIId; // This will trigger a 'change' event if the value is different
    }

    // Listen for MIDI device state changes (connect/disconnect)
    midiAccess.onstatechange = (event) => {
        console.log(`[MIDI] State change: ${event.port.name}, State: ${event.port.state}, Type: ${event.port.type}`);
        setupMIDI(); // Re-populate the list and re-select if necessary
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`MIDI device ${event.port.name} ${event.port.state}.`, 2500);
        }
    };
}

function onMIDIFailure(msg) {
    console.error(`[MIDI] Failed to get MIDI access - ${msg}`);
    showNotification(`Failed to access MIDI devices: ${msg.toString()}`, 4000);
}

/**
 * Selects a MIDI input device and sets up message handling.
 * @param {string} deviceId - The ID of the MIDI device to select.
 * @param {boolean} [silent=false] - If true, suppresses notifications.
 */
export function selectMIDIInput(deviceId, silent = false) {
    try {
        const midi = getMidiAccessState(); // Get from state
        const currentActiveInput = getActiveMIDIInputState(); // Get from state

        // Close and clear listener from previously active input
        if (currentActiveInput && typeof currentActiveInput.close === 'function') {
            currentActiveInput.onmidimessage = null; // Remove old listener
            try {
                currentActiveInput.close(); // Close the port
            } catch (e) {
                console.warn(`[MIDI] Error closing previously active input "${currentActiveInput.name}":`, e.message);
            }
        }

        if (deviceId && midi && midi.inputs) {
            const input = midi.inputs.get(deviceId);
            if (input) {
                input.open().then((port) => { // Open the selected port
                    port.onmidimessage = handleMIDIMessage; // Attach new listener
                    if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(port); // Update state
                    if (!silent && localAppServices.showNotification) localAppServices.showNotification(`MIDI Input: ${port.name} selected.`, 2000);
                    console.log(`[MIDI] Input selected: ${port.name}`);
                }).catch(err => {
                    console.error(`[MIDI] Error opening port ${input.name}:`, err);
                    if (!silent && localAppServices.showNotification) localAppServices.showNotification(`Error opening MIDI port: ${input.name}`, 3000);
                    if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null); // Clear active input on error
                });
            } else {
                // Selected device ID not found in available inputs
                if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null);
                if (!silent && localAppServices.showNotification) localAppServices.showNotification("Selected MIDI input not found.", 2000);
                console.warn(`[MIDI] Input with ID ${deviceId} not found.`);
            }
        } else { // No deviceId selected (e.g., "No MIDI Input" option) or midi access not available
            if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null);
            if (!silent && deviceId !== "" && localAppServices.showNotification) showNotification("MIDI input disconnected.", 2000);
        }
    } catch (error) {
        console.error("[EventHandlers selectMIDIInput] Error:", error);
        if (!silent && localAppServices.showNotification) localAppServices.showNotification("Error selecting MIDI input.", 3000);
    }
}

/**
 * Handles incoming MIDI messages from the selected input.
 * @param {MIDIMessageEvent} message - The MIDI message event.
 */
function handleMIDIMessage(message) {
    try {
        const [command, note, velocity] = message.data;
        const armedTrackId = getArmedTrackId(); // Get from state
        const armedTrack = armedTrackId !== null ? getTrackById(armedTrackId) : null; // Get from state
        const midiIndicator = localAppServices.uiElementsCache?.midiIndicatorGlobal;

        // Visual feedback for MIDI activity
        if (midiIndicator) {
            midiIndicator.classList.add('active'); // Assumes 'active' class handles styling
            setTimeout(() => midiIndicator.classList.remove('active'), 100);
        }

        if (!armedTrack) return; // No track armed to receive MIDI

        const freqOrNote = Tone.Frequency(note, "midi").toNote(); // Convert MIDI note number to note name (e.g., "C4")

        // Handle based on armed track type
        if (armedTrack.type === 'Synth') {
            if (!armedTrack.instrument || armedTrack.instrument.disposed) return;
            if (command === 144 && velocity > 0) { // Note On (channel 1, command 9, note on is 0x90 or 144)
                if (typeof armedTrack.instrument.triggerAttack === 'function') {
                    armedTrack.instrument.triggerAttack(freqOrNote, Tone.now(), velocity / 127);
                }
            } else if (command === 128 || (command === 144 && velocity === 0)) { // Note Off (channel 1, command 8, note off is 0x80 or 128)
                if (typeof armedTrack.instrument.triggerRelease === 'function') {
                    armedTrack.instrument.triggerRelease(freqOrNote, Tone.now() + 0.05); // Slight delay for release
                }
            }
        } else if (armedTrack.type === 'InstrumentSampler') {
            if (!armedTrack.toneSampler || armedTrack.toneSampler.disposed || !armedTrack.toneSampler.loaded) {
                // console.warn(`[MIDI] InstrumentSampler on track ${armedTrack.name} not ready.`);
                return;
            }
            if (command === 144 && velocity > 0) { // Note On
                armedTrack.toneSampler.triggerAttack(freqOrNote, Tone.now(), velocity / 127);
            } else if (command === 128 || (command === 144 && velocity === 0)) { // Note Off
                armedTrack.toneSampler.triggerRelease(freqOrNote, Tone.now() + 0.05);
            }
        }
        // Add handling for DrumSampler or other MIDI-controllable types if needed
        // e.g., mapping MIDI notes to drum pads

    } catch (error) {
        console.error("[EventHandlers handleMIDIMessage] Error:", error, "Message Data:", message?.data);
    }
}

// Computer Keyboard to MIDI Mapping (from constants)
const keyToMIDIMap = Constants.computerKeySynthMap || {
    // Default fallback if constants not loaded, though it should be
    'a': 48, 'w': 49, 's': 50, 'e': 51, 'd': 52, 'f': 53, 't': 54, 'g': 55, 'y': 56, 'h': 57, 'u': 58, 'j': 59, 'k': 60
};


// Global Keydown Listener (for computer keyboard synth, shortcuts)
document.addEventListener('keydown', (event) => {
    try {
        if (event.repeat) return; // Ignore key repeats
        const key = event.key.toLowerCase();
        const kbdIndicator = localAppServices.uiElementsCache?.keyboardIndicatorGlobal;

        // Ignore if typing in an input field, unless it's 'Escape'
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
            if (key === 'escape') activeEl.blur(); // Allow escape to blur inputs
            return; // Don't process further if typing in an input
        }

        // Handle global shortcuts (Undo/Redo)
        if (event.metaKey || event.ctrlKey) { // Cmd or Ctrl key
            if (key === 'z') { // Undo
                if (localAppServices.undoLastAction) localAppServices.undoLastAction();
                event.preventDefault(); return;
            }
            if (key === 'y') { // Redo
                 if (localAppServices.redoLastAction) localAppServices.redoLastAction();
                 event.preventDefault(); return;
            }
            // Allow other Ctrl/Cmd shortcuts to pass through for browser
            return; 
        }

        // Handle octave shift for computer keyboard synth
        if (key === 'z' && !(event.ctrlKey || event.metaKey)) {
            currentOctaveShift = Math.max(MIN_OCTAVE_SHIFT, currentOctaveShift - 1);
            if (localAppServices.showNotification) localAppServices.showNotification(`Octave: ${currentOctaveShift}`, 1000);
            return;
        }
        if (key === 'x' && !(event.ctrlKey || event.metaKey)) {
            currentOctaveShift = Math.min(MAX_OCTAVE_SHIFT, currentOctaveShift + 1);
            if (localAppServices.showNotification) localAppServices.showNotification(`Octave: ${currentOctaveShift}`, 1000);
            return;
        }

        // Spacebar for Play/Pause
        if (key === ' ' && !(activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA'))) { 
            event.preventDefault(); // Prevent page scroll
            const playBtn = localAppServices.uiElementsCache?.playBtnGlobal;
            if (playBtn) playBtn.click();
            return;
        }

        // Computer Keyboard as MIDI Input
        const armedTrackId = getArmedTrackId(); // Get from state
        const armedTrack = armedTrackId !== null ? getTrackById(armedTrackId) : null; // Get from state
        if (!armedTrack) return; // No track armed

        let targetInstrument;
        if (armedTrack.type === 'Synth') {
            targetInstrument = armedTrack.instrument;
        } else if (armedTrack.type === 'InstrumentSampler') {
            targetInstrument = armedTrack.toneSampler;
            if (targetInstrument && !targetInstrument.loaded) {
                // console.warn(`[Keyboard] InstrumentSampler on track ${armedTrack.name} not loaded.`);
                return; 
            }
        }
        // Add DrumSampler handling here if desired (map keys to pads)

        if (!targetInstrument || targetInstrument.disposed) return;


        let midiNote = keyToMIDIMap[event.key]; // Check event.key first (case-sensitive)
        if (midiNote === undefined && keyToMIDIMap[key]) midiNote = keyToMIDIMap[key]; // Fallback to lowercase key

        if (midiNote !== undefined && !currentlyPressedComputerKeys[midiNote]) { // Key is mapped and not already pressed
            if (kbdIndicator) kbdIndicator.classList.add('active'); // Visual feedback
            
            const finalNote = midiNote + (currentOctaveShift * 12);
            if (finalNote >=0 && finalNote <= 127 && typeof targetInstrument.triggerAttack === 'function') {
                const freq = Tone.Frequency(finalNote, "midi").toNote();
                targetInstrument.triggerAttack(freq, Tone.now(), 0.7); // Default velocity 0.7
                currentlyPressedComputerKeys[midiNote] = true; // Mark as pressed
            }
        }
    } catch (error) { console.error("[EventHandlers Keydown] Error:", error); }
});

// Global Keyup Listener
document.addEventListener('keyup', (event) => {
    let armedTrack = null;
    let midiNote = undefined;
    let freq = '';
    let targetInstrumentKeyUp;

    try {
        const key = event.key.toLowerCase();
        const kbdIndicator = localAppServices.uiElementsCache?.keyboardIndicatorGlobal;
        if (kbdIndicator) kbdIndicator.classList.remove('active'); // Remove visual feedback

        // Check if typing in an input field (shouldn't reach here if keydown returned early, but good safeguard)
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
            return;
        }
        if (event.metaKey || event.ctrlKey) return; // Ignore if modifier still held (e.g., for undo/redo release)


        const armedTrackId = getArmedTrackId(); // Get from state
        armedTrack = armedTrackId !== null ? getTrackById(armedTrackId) : null; // Get from state

        if (armedTrack && armedTrack.type === 'Synth') {
            targetInstrumentKeyUp = armedTrack.instrument;
        } else if (armedTrack && armedTrack.type === 'InstrumentSampler') {
            targetInstrumentKeyUp = armedTrack.toneSampler;
        }
        // Add DrumSampler handling if keys were mapped to trigger drum pads

        if (!armedTrack || !targetInstrumentKeyUp || typeof targetInstrumentKeyUp.triggerRelease !== 'function' || targetInstrumentKeyUp.disposed) {
            // If no valid target, clear all pressed keys as a safety measure
            Object.keys(currentlyPressedComputerKeys).forEach(noteKey => delete currentlyPressedComputerKeys[noteKey]);
            return;
        }

        midiNote = keyToMIDIMap[event.key]; // Check event.key first
        if (midiNote === undefined && keyToMIDIMap[key]) midiNote = keyToMIDIMap[key]; // Fallback to lowercase

        if (midiNote !== undefined && currentlyPressedComputerKeys[midiNote]) { // Key was mapped and pressed
            const finalNote = midiNote + (currentOctaveShift * 12);
             if (finalNote >=0 && finalNote <= 127) {
                freq = Tone.Frequency(finalNote, "midi").toNote();
                targetInstrumentKeyUp.triggerRelease(freq, Tone.now());
            }
            delete currentlyPressedComputerKeys[midiNote]; // Mark as released
        }
    } catch (error) {
        console.error("[EventHandlers Keyup] Error during specific note release:", error,
            "Key:", event.key,
            "Armed Track ID:", armedTrack ? armedTrack.id : 'N/A',
            "Instrument Type:", armedTrack ? armedTrack.type : 'N/A',
            "Target Frequency:", freq,
            "Calculated MIDI Note:", midiNote
        );

        // Emergency release all on the instrument if an error occurred during specific release
        if (armedTrack && targetInstrumentKeyUp && typeof targetInstrumentKeyUp.releaseAll === 'function' && !targetInstrumentKeyUp.disposed) {
            try {
                console.warn(`[EventHandlers Keyup] Forcing releaseAll on ${armedTrack.name} (instrument type: ${armedTrack.type}) due to error on keyup for note ${freq || 'unknown'}.`);
                targetInstrumentKeyUp.releaseAll(Tone.now());
            } catch (releaseAllError) {
                console.error("[EventHandlers Keyup] Error during emergency releaseAll:", releaseAllError);
            }
        }
        // Ensure the key is marked as released even if there was an error
        if (midiNote !== undefined && currentlyPressedComputerKeys[midiNote]) {
            delete currentlyPressedComputerKeys[midiNote]; 
        }
    }
});


// --- Track Control Handlers (called via appServices from UI or other modules) ---
export function handleTrackMute(trackId) {
    try {
        const track = getTrackById(trackId); // Get from state
        if (!track) { console.warn(`[EventHandlers] Mute: Track ${trackId} not found.`); return; }
        captureStateForUndo(`Toggle Mute for ${track.name}`); // Capture for undo
        track.isMuted = !track.isMuted;
        track.applyMuteState(); // Track updates its own Tone.js gain
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(trackId, 'muteChanged');
    } catch (error) { console.error(`[EventHandlers handleTrackMute] Error for track ${trackId}:`, error); }
}

export function handleTrackSolo(trackId) {
    try {
        const track = getTrackById(trackId); // Get from state
        if (!track) { console.warn(`[EventHandlers] Solo: Track ${trackId} not found.`); return; }
        const currentSoloed = getSoloedTrackId(); // Get from state
        captureStateForUndo(`Toggle Solo for ${track.name}`); // Capture for undo
        setSoloedTrackId(currentSoloed === trackId ? null : trackId); // Update state

        // Update all tracks based on new solo state
        const tracks = getTracks(); // Get from state
        if (tracks && Array.isArray(tracks)) {
            tracks.forEach(t => {
                if (t) {
                    t.isSoloed = (t.id === getSoloedTrackId()); // Update track's internal solo status
                    t.applySoloState(); // Track updates its own gain based on global solo
                    if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(t.id, 'soloChanged');
                }
            });
        }
    } catch (error) { console.error(`[EventHandlers handleTrackSolo] Error for track ${trackId}:`, error); }
}

export function handleTrackArm(trackId) {
    try {
        const track = getTrackById(trackId); // Get from state
        if (!track) { console.warn(`[EventHandlers] Arm: Track ${trackId} not found.`); return; }
        const currentArmedId = getArmedTrackId(); // Get from state
        const isCurrentlyArmed = currentArmedId === track.id;
        captureStateForUndo(`${isCurrentlyArmed ? "Disarm" : "Arm"} Track "${track.name}" for Input`); // Capture for undo
        setArmedTrackId(isCurrentlyArmed ? null : track.id); // Update state

        const newArmedTrack = getTrackById(getArmedTrackId()); // Get potentially new armed track
        const notificationMessage = newArmedTrack ? `${newArmedTrack.name} armed for input.` : "All tracks disarmed.";
        if (localAppServices.showNotification) localAppServices.showNotification(notificationMessage, 1500);
        else showNotification(notificationMessage, 1500); // Fallback

        // Update UI for all tracks as arm state might affect others (e.g., only one armed)
        const tracks = getTracks(); // Get from state
        if (tracks && Array.isArray(tracks)) {
            tracks.forEach(t => {
                if (t && localAppServices.updateTrackUI) localAppServices.updateTrackUI(t.id, 'armChanged');
            });
        }
    } catch (error) { console.error(`[EventHandlers handleTrackArm] Error for track ${trackId}:`, error); }
}

export function handleRemoveTrack(trackId) {
    try {
        const track = getTrackById(trackId); // Get from state
        if (!track) { console.warn(`[EventHandlers] Remove: Track ${trackId} not found.`); return; }
        
        // Use utility for confirmation dialog
        if (typeof showConfirmationDialog !== 'function') {
            console.error("[EventHandlers] showConfirmationDialog function not available.");
            // Fallback to basic confirm if utility is missing
            if (confirm(`Are you sure you want to remove track "${track.name}"? This can be undone.`)) {
                if (localAppServices.removeTrack) localAppServices.removeTrack(trackId); // Prefer service
                else coreRemoveTrackFromState(trackId); // Fallback to direct state manipulation
            }
            return;
        }

        showConfirmationDialog(
            'Confirm Delete Track',
            `Are you sure you want to remove track "${track.name}"? This can be undone.`,
            () => { // onConfirm
                if (localAppServices.removeTrack) { // Prefer using the appService for removal
                    localAppServices.removeTrack(trackId); 
                } else {
                    // Fallback if the service isn't wired up, directly call state (less ideal)
                    console.warn("[EventHandlers] removeTrack service not available, calling coreRemoveTrackFromState.");
                    coreRemoveTrackFromState(trackId); 
                }
            }
            // No onCancel needed if it just closes the dialog
        );
    } catch (error) { console.error(`[EventHandlers handleRemoveTrack] Error for track ${trackId}:`, error); }
}

// --- Window Opening Handlers (called via appServices from UI) ---
export function handleOpenTrackInspector(trackId) {
    if (localAppServices.openTrackInspectorWindow) {
        localAppServices.openTrackInspectorWindow(trackId);
    } else { console.error("[EventHandlers] openTrackInspectorWindow service not available."); }
}
export function handleOpenEffectsRack(trackId) {
    if (localAppServices.openTrackEffectsRackWindow) {
        localAppServices.openTrackEffectsRackWindow(trackId);
    } else { console.error("[EventHandlers] openTrackEffectsRackWindow service not available."); }
}
export function handleOpenSequencer(trackId) {
    if (localAppServices.openTrackSequencerWindow) {
        localAppServices.openTrackSequencerWindow(trackId);
    } else { console.error("[EventHandlers] openTrackSequencerWindow service not available."); }
}

// --- Fullscreen ---
function toggleFullScreen() {
    try {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                const message = `Error attempting to enable full-screen mode: ${err.message} (${err.name})`;
                if (localAppServices.showNotification) localAppServices.showNotification(message, 3000);
                else showNotification(message, 3000); // Fallback
                console.error(message, err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    } catch (error) {
        console.error("[EventHandlers toggleFullScreen] Error:", error);
        if (localAppServices.showNotification) localAppServices.showNotification("Fullscreen toggle error.", 3000);
    }
}

// --- Timeline Drop Handler ---
// MODIFIED: Now expects parsed droppedItemData directly, not the event object
export async function processTimelineDrop(droppedItemData, targetTrackId, startTime, appServicesPassed) {
    const services = appServicesPassed || localAppServices; // Use passed services or fallback

    // Ensure necessary services are available
    if (!services || !services.getTrackById || !services.showNotification || !services.captureStateForUndo || !services.renderTimeline) {
        console.error("Required appServices not available in processTimelineDrop");
        const utilShowNotification = typeof showNotification !== 'undefined' ? showNotification : alert; // Use util directly if service missing
        utilShowNotification("Internal error handling timeline drop.", 3000); 
        return;
    }

    const targetTrack = services.getTrackById(targetTrackId);
    if (!targetTrack) {
        services.showNotification("Target track not found for drop.", 3000);
        return;
    }

    try {
        if (droppedItemData) { // droppedItemData is now the already parsed object
            if (droppedItemData.type === 'sequence-timeline-drag') { // Dropped a sequence button
                if (targetTrack.type === 'Audio') {
                    services.showNotification("Cannot place sequence clips on Audio tracks.", 3000);
                    return;
                }
                if (typeof targetTrack.addSequenceClipToTimeline === 'function') {
                    targetTrack.addSequenceClipToTimeline(droppedItemData.sourceSequenceId, startTime, droppedItemData.clipName);
                } else {
                    services.showNotification("Error: Track cannot accept sequence clips.", 3000);
                }
            } else if (droppedItemData.type === 'sound-browser-item') { // Dropped from sound browser
                if (targetTrack.type !== 'Audio') {
                    services.showNotification("Sound browser audio files can only be dropped onto Audio Track timeline lanes.", 3000);
                    return;
                }
                if (services.getAudioBlobFromSoundBrowserItem && typeof targetTrack.addExternalAudioFileAsClip === 'function') {
                    const audioBlob = await services.getAudioBlobFromSoundBrowserItem(droppedItemData); // This service needs to exist in main.js
                    if (audioBlob) {
                        targetTrack.addExternalAudioFileAsClip(audioBlob, startTime, droppedItemData.fileName);
                    } else {
                        services.showNotification(`Could not load audio for "${droppedItemData.fileName}".`, 3000);
                    }
                } else {
                     services.showNotification("Error: Cannot process sound browser item for timeline.", 3000);
                }
            } else { // This case is for existing timeline clips being repositioned via Interact.js drop
                 if (droppedItemData.type === 'timeline-clip-reposition' && droppedItemData.originalClipData) {
                    const originalTrack = services.getTrackById(droppedItemData.originalTrackId);
                    const clipToMove = droppedItemData.originalClipData; // This should be a copy of the clip's data

                    if (originalTrack && clipToMove) {
                        if (targetTrack.id === originalTrack.id) { // Moved within the same track
                            if (typeof targetTrack.updateAudioClipPosition === 'function') {
                                targetTrack.updateAudioClipPosition(clipToMove.id, startTime); // Track handles its own undo
                            }
                        } else { // Moved to a different track
                            if (targetTrack.type === originalTrack.type) { // Ensure compatible track types
                                if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Move Clip "${clipToMove.name}" to Track "${targetTrack.name}"`);
                                
                                // Remove from original track's timelineClips array
                                if (typeof originalTrack.removeTimelineClip === 'function') { 
                                    originalTrack.removeTimelineClip(clipToMove.id, true); // true to skip its own undo
                                } else { // Fallback if method doesn't exist
                                    originalTrack.timelineClips = originalTrack.timelineClips.filter(c => c.id !== clipToMove.id);
                                }
                                
                                // Add to target track's timelineClips array
                                if (typeof targetTrack.addExistingClipFromOtherTrack === 'function') { 
                                    targetTrack.addExistingClipFromOtherTrack(clipToMove, startTime, true); // true to skip its own undo
                                } else { // Fallback
                                    const newClipInstance = {...JSON.parse(JSON.stringify(clipToMove)), startTime: startTime, id: `clip_${targetTrack.id}_${Date.now()}`}; // New ID
                                    targetTrack.timelineClips.push(newClipInstance);
                                }
                                if (services.renderTimeline) services.renderTimeline(); // Re-render after cross-track move
                            } else {
                                services.showNotification(`Cannot move ${originalTrack.type} clip to ${targetTrack.type} track.`, 3000);
                                if (services.renderTimeline) services.renderTimeline(); // Snap back by re-rendering
                            }
                        }
                    } else {
                         services.showNotification("Error moving clip: Original clip data not found.", 3000);
                    }
                 } else {
                    services.showNotification("Unrecognized item dropped on timeline.", 2000);
                 }
            }
        } else {
            console.log("[EventHandlers processTimelineDrop] No droppedItemData provided.");
        }
    } catch (e) {
        console.error("[EventHandlers processTimelineDrop] Error processing dropped data:", e);
        services.showNotification("Error processing dropped item.", 3000);
    }
}
// Export with the original name `handleTimelineLaneDrop` if main.js's appServices expects that,
// or update main.js to use `processTimelineDrop`.
export { processTimelineDrop as handleTimelineLaneDrop };
