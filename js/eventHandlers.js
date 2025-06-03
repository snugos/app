// js/eventHandlers.js - Global Event Listeners and Input Handling Module (MODIFIED)
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog, createContextMenu } from './utils.js'; // Direct utils imports
// State and other services are accessed via localAppServices

let localAppServices = {};
let transportKeepAliveBufferSource = null; // For iOS audio context keep-alive
let silentKeepAliveBuffer = null; // Buffer for the keep-alive source

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    // Ensure necessary services are available, with fallbacks or warnings
    if (!localAppServices.setPlaybackMode && localAppServices.setPlaybackModeState) {
        localAppServices.setPlaybackMode = localAppServices.setPlaybackModeState;
    }
    // console.log("[EventHandlers Init] Module initialized.");
}

// --- Primary Event Listeners Setup (called from main.js) ---
export function initializePrimaryEventListeners() {
    // console.log("[EventHandlers initializePrimaryEventListeners] Setting up primary event listeners.");
    // Keyboard Shortcuts
    document.addEventListener('keydown', handleGlobalKeyDown);

    // Start Menu
    const startButton = localAppServices.uiElementsCache?.startMenuButton;
    const startMenuEl = localAppServices.uiElementsCache?.startMenu;
    if (startButton && startMenuEl) {
        startButton.addEventListener('click', (event) => {
            event.stopPropagation();
            startMenuEl.classList.toggle('hidden');
        });
        document.addEventListener('click', (event) => {
            if (!startMenuEl.classList.contains('hidden') && !startMenuEl.contains(event.target) && event.target !== startButton) {
                startMenuEl.classList.add('hidden');
            }
        });
        // Start Menu Item Listeners
        setupStartMenuItems(startMenuEl);
    } else {
        console.warn("[EventHandlers] Start menu button or element not found in cache.");
    }

    // iOS Audio Context Keep-Alive (play silent buffer on first touch)
    const playSilentBufferOnTouch = async () => {
        if (Tone.context.state !== 'running') {
            await Tone.start(); // Ensure context is started
        }
        if (!silentKeepAliveBuffer && Tone.context.createBuffer) {
            silentKeepAliveBuffer = Tone.context.createBuffer(1, 1, Tone.context.sampleRate); // 1 sample buffer
        }
        if (silentKeepAliveBuffer && !transportKeepAliveBufferSource) {
            transportKeepAliveBufferSource = Tone.context.createBufferSource();
            transportKeepAliveBufferSource.buffer = silentKeepAliveBuffer;
            transportKeepAliveBufferSource.loop = true;
            transportKeepAliveBufferSource.connect(Tone.Destination); // Connect to main output
            transportKeepAliveBufferSource.start();
            console.log("[EventHandlers] iOS keep-alive silent buffer started.");
        }
        document.removeEventListener('touchstart', playSilentBufferOnTouch); // Remove after first touch
        document.removeEventListener('mousedown', playSilentBufferOnTouch);
    };
    document.addEventListener('touchstart', playSilentBufferOnTouch, { once: true });
    document.addEventListener('mousedown', playSilentBufferOnTouch, { once: true });
}

function setupStartMenuItems(startMenuEl) {
    // --- File Menu ---
    startMenuEl.querySelector('#menuNewProject')?.addEventListener('click', () => {
        if (localAppServices.newProject) localAppServices.newProject();
        startMenuEl.classList.add('hidden');
    });
    startMenuEl.querySelector('#menuSaveProject')?.addEventListener('click', () => {
        if (localAppServices.saveProject) localAppServices.saveProject();
        startMenuEl.classList.add('hidden');
    });
    startMenuEl.querySelector('#menuLoadProject')?.addEventListener('click', () => {
        if (localAppServices.loadProject) localAppServices.loadProject();
        startMenuEl.classList.add('hidden');
    });
     startMenuEl.querySelector('#menuExportWav')?.addEventListener('click', () => {
        if (localAppServices.exportToWav) localAppServices.exportToWav();
        startMenuEl.classList.add('hidden');
    });

    // --- Edit Menu ---
    startMenuEl.querySelector('#menuUndo')?.addEventListener('click', () => {
        if (localAppServices.undo && localAppServices.getUndoStackState().length > 0) localAppServices.undo();
        startMenuEl.classList.add('hidden');
    });
    startMenuEl.querySelector('#menuRedo')?.addEventListener('click', () => {
        if (localAppServices.redo && localAppServices.getRedoStackState().length > 0) localAppServices.redo();
        startMenuEl.classList.add('hidden');
    });
    
    // --- View Menu ---
    startMenuEl.querySelector('#menuToggleFullScreen')?.addEventListener('click', toggleFullScreen);


    // --- Open Window Links from Old Version (if needed, or handled by specific UI buttons) ---
    // Example: if these were in start menu in old version
    // startMenuEl.querySelector('#menuOpenSoundBrowser')?.addEventListener('click', () => localAppServices.openSoundBrowserWindow && localAppServices.openSoundBrowserWindow());
    // startMenuEl.querySelector('#menuOpenTimeline')?.addEventListener('click', () => localAppServices.openArrangementWindow && localAppServices.openArrangementWindow());
    // startMenuEl.querySelector('#menuOpenGlobalControls')?.addEventListener('click', () => localAppServices.openGlobalControlsWindow && localAppServices.openGlobalControlsWindow(attachGlobalControlEvents));
    // startMenuEl.querySelector('#menuOpenMixer')?.addEventListener('click', () => localAppServices.openMixerWindow && localAppServices.openMixerWindow());
    // startMenuEl.querySelector('#menuOpenMasterEffects')?.addEventListener('click', () => localAppServices.openMasterEffectsRackWindow && localAppServices.openMasterEffectsRackWindow());

    // --- Add Track Links (Example, if they were in start menu) ---
    // startMenuEl.querySelector('#menuAddSynthTrack')?.addEventListener('click', () => localAppServices.showAddTrackModal && localAppServices.showAddTrackModal());

}


// --- Attach Global Transport and Control Listeners (called from main.js or global controls UI) ---
export function attachGlobalControlEvents(elementsToAttachTo) {
    // console.log("[EventHandlers attachGlobalControlEvents] Attaching to elements:", elementsToAttachTo);
    const { playBtn, stopBtn, recordBtn, tempoGlobalInput, playbackModeToggleBtnGlobal, midiInputSelectGlobal } = elementsToAttachTo;

    if (playBtn) playBtn.addEventListener('click', () => localAppServices.togglePlayback && localAppServices.togglePlayback());
    else console.warn("[EventHandlers] Global play button not found for attachment.");

    if (stopBtn) stopBtn.addEventListener('click', () => localAppServices.stopPlayback && localAppServices.stopPlayback());
    else console.warn("[EventHandlers] Global stop button not found for attachment.");
    
    if (recordBtn) recordBtn.addEventListener('click', () => localAppServices.toggleRecording && localAppServices.toggleRecording());
    else console.warn("[EventHandlers] Global record button not found for attachment.");

    if (tempoGlobalInput) {
        tempoGlobalInput.addEventListener('change', (e) => {
            const newTempo = parseFloat(e.target.value);
            if (newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) {
                Tone.Transport.bpm.value = newTempo;
                if (localAppServices.updateTaskbarTempoDisplay) localAppServices.updateTaskbarTempoDisplay(newTempo);
                if (localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Set Tempo to ${newTempo}`);
            } else {
                e.target.value = Tone.Transport.bpm.value; // Revert to current if invalid
                showNotification(`Tempo must be between ${Constants.MIN_TEMPO} and ${Constants.MAX_TEMPO}.`, "warning");
            }
        });
    } else console.warn("[EventHandlers] Global tempo input not found for attachment.");

    if (playbackModeToggleBtnGlobal) {
        const currentMode = localAppServices.getPlaybackModeState ? localAppServices.getPlaybackModeState() : 'sequencer';
        playbackModeToggleBtnGlobal.textContent = currentMode === 'timeline' ? 'Timeline Mode' : 'Sequencer Mode';
        playbackModeToggleBtnGlobal.addEventListener('click', () => {
            const oldMode = localAppServices.getPlaybackModeState ? localAppServices.getPlaybackModeState() : 'sequencer';
            const newMode = oldMode === 'sequencer' ? 'timeline' : 'sequencer';
            if (localAppServices.setPlaybackMode) localAppServices.setPlaybackMode(newMode);
            // Text content update is handled by the state setter's callback (appServices.onPlaybackModeChange in main.js)
        });
    } else console.warn("[EventHandlers] Global playback mode toggle not found for attachment.");
    
    if (midiInputSelectGlobal) {
        midiInputSelectGlobal.addEventListener('change', (e) => {
            if (localAppServices.selectMIDIInput) localAppServices.selectMIDIInput(e.target.value);
        });
    } else console.warn("[EventHandlers] Global MIDI input select not found for attachment.");
}


// --- Global Key Down Handler ---
function handleGlobalKeyDown(event) {
    // console.log(`[EventHandlers handleGlobalKeyDown] Key pressed: ${event.key}, Ctrl: ${event.ctrlKey}, Meta: ${event.metaKey}`);
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT' || event.target.isContentEditable) {
        if (event.key === "Escape") event.target.blur(); // Allow Esc to unfocus inputs
        return; // Don't interfere with text input
    }

    const key = event.key.toLowerCase();
    const ctrlOrMeta = event.ctrlKey || event.metaKey;

    switch (key) {
        case ' ': // Spacebar
            event.preventDefault();
            if (localAppServices.togglePlayback) localAppServices.togglePlayback();
            break;
        case 'enter': // Enter often used as stop
            if (Tone.Transport.state === 'started' && localAppServices.stopPlayback) {
                event.preventDefault();
                localAppServices.stopPlayback();
            }
            break;
        case 'r':
            if (ctrlOrMeta) { /* Potentially Redo if not handled by 'z' + Shift */ }
            else if (localAppServices.toggleRecording) { // 'R' for record
                event.preventDefault();
                localAppServices.toggleRecording();
            }
            break;
        case 's': // Ctrl+S for Save
            if (ctrlOrMeta) {
                event.preventDefault();
                if (localAppServices.saveProject) localAppServices.saveProject();
            }
            break;
        case 'o': // Ctrl+O for Load
            if (ctrlOrMeta) {
                event.preventDefault();
                if (localAppServices.loadProject) localAppServices.loadProject();
            }
            break;
        case 'z': // Ctrl+Z for Undo, Ctrl+Shift+Z for Redo
            if (ctrlOrMeta) {
                event.preventDefault();
                if (event.shiftKey && localAppServices.redo) {
                    localAppServices.redo();
                } else if (!event.shiftKey && localAppServices.undo) {
                    localAppServices.undo();
                }
            }
            break;
        case 'y': // Ctrl+Y common for Redo
             if (ctrlOrMeta && localAppServices.redo) {
                event.preventDefault();
                localAppServices.redo();
            }
            break;
        // Add more shortcuts here, e.g., for opening windows, adding tracks, etc.
    }

    // Computer keyboard to MIDI for armed track (if any)
    const armedTrackId = localAppServices.getArmedTrackIdState ? localAppServices.getArmedTrackIdState() : null;
    const activeMIDIInput = localAppServices.getActiveMIDIInputState ? localAppServices.getActiveMIDIInputState() : 'none';

    if (armedTrackId && (activeMIDIInput === 'computerKeyboard' || activeMIDIInput === 'none' || !activeMIDIInput)) {
        const track = localAppServices.getTrackById(armedTrackId);
        if (track && typeof track.playNote === 'function') {
            const midiNote = Constants.computerKeySynthMap[key];
            if (midiNote !== undefined) {
                event.preventDefault();
                // Check if key is already pressed to avoid retriggering, or handle note off on keyup
                // For simplicity, this is a basic trigger on keydown
                track.playNote(midiNote, 1.0, Tone.now(), '8n'); // Velocity 1, default duration
                if (localAppServices.uiElementsCache?.keyboardIndicatorGlobal) {
                    localAppServices.uiElementsCache.keyboardIndicatorGlobal.classList.add('active');
                    setTimeout(() => localAppServices.uiElementsCache.keyboardIndicatorGlobal.classList.remove('active'), 150);
                }
            }
        }
    }
}

// --- MIDI Setup and Handling ---
export async function setupMIDI() {
    if (!localAppServices.getMidiAccessState || !localAppServices.setMidiAccessState || !localAppServices.setActiveMIDIInput) {
        console.warn("[EventHandlers setupMIDI] Core MIDI state services not available.");
        return;
    }
    if (navigator.requestMIDIAccess) {
        try {
            const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            localAppServices.setMidiAccessState(midiAccess);
            populateMIDIInputSelector(midiAccess);
            midiAccess.onstatechange = (event) => {
                console.log("[EventHandlers MIDI] MIDI state changed:", event.port.name, event.port.state);
                populateMIDIInputSelector(midiAccess); // Re-populate on device change
                // If active input disconnects, reset to 'none'
                const activeInput = localAppServices.getActiveMIDIInputState();
                if (activeInput && activeInput !== 'none' && activeInput !== 'computerKeyboard') {
                    let stillConnected = false;
                    midiAccess.inputs.forEach(input => { if (input.id === activeInput) stillConnected = true; });
                    if (!stillConnected) {
                        console.log(`[EventHandlers MIDI] Active MIDI input "${activeInput}" disconnected. Resetting.`);
                        localAppServices.selectMIDIInput('none'); // Or specific handling
                    }
                }
            };
        } catch (error) {
            console.warn("[EventHandlers setupMIDI] MIDI Access request failed:", error);
            showNotification("Could not access MIDI devices. " + error.message, "warning");
            populateMIDIInputSelector(null); // Still populate with 'None' and 'Computer Keyboard'
        }
    } else {
        console.warn("[EventHandlers setupMIDI] Web MIDI API not supported in this browser.");
        showNotification("Web MIDI API not supported. Using computer keyboard only.", "info");
        populateMIDIInputSelector(null); // Populate with 'None' and 'Computer Keyboard'
    }
}

function populateMIDIInputSelector(midiAccess) {
    const selector = localAppServices.uiElementsCache?.midiInputSelectGlobal;
    if (!selector) {
        console.warn("[EventHandlers populateMIDIInputSelector] MIDI input selector UI element not found.");
        return;
    }
    const previouslySelected = selector.value;
    selector.innerHTML = ''; // Clear existing

    const noneOption = new Option("None", "none");
    selector.add(noneOption);
    const compKeyboardOption = new Option("Computer Keyboard", "computerKeyboard");
    selector.add(compKeyboardOption);

    if (midiAccess && midiAccess.inputs.size > 0) {
        midiAccess.inputs.forEach(input => {
            selector.add(new Option(input.name, input.id));
        });
    }
    // Try to reselect previous, or default to 'computerKeyboard' or 'none'
    if (previouslySelected && Array.from(selector.options).some(opt => opt.value === previouslySelected)) {
        selector.value = previouslySelected;
    } else if (midiAccess && midiAccess.inputs.size > 0) {
        selector.value = midiAccess.inputs.values().next().value.id; // Select first available MIDI device
    } else {
        selector.value = "computerKeyboard"; // Default if no MIDI devices
    }
    // Trigger change to apply selection if it's different from app state
    if(localAppServices.getActiveMIDIInputState && selector.value !== localAppServices.getActiveMIDIInputState()){
         if (localAppServices.selectMIDIInput) localAppServices.selectMIDIInput(selector.value);
    }
}

export function selectMIDIInput(deviceId) {
    if (!localAppServices.getActiveMIDIInputState || !localAppServices.setActiveMIDIInput || !localAppServices.getMidiAccessState) {
        console.warn("[EventHandlers selectMIDIInput] Core MIDI state services not available for input selection.");
        return;
    }
    const midiAccess = localAppServices.getMidiAccessState();
    const currentActiveInputId = localAppServices.getActiveMIDIInputState();

    // Remove listener from previously active MIDI input
    if (currentActiveInputId && currentActiveInputId !== 'none' && currentActiveInputId !== 'computerKeyboard' && midiAccess) {
        midiAccess.inputs.forEach(input => {
            if (input.id === currentActiveInputId) {
                input.onmidimessage = null;
                // console.log(`[EventHandlers MIDI] Listener removed from ${input.name}`);
            }
        });
    }

    localAppServices.setActiveMIDIInput(deviceId); // Update state

    if (deviceId && deviceId !== 'none' && deviceId !== 'computerKeyboard' && midiAccess) {
        midiAccess.inputs.forEach(input => {
            if (input.id === deviceId) {
                input.onmidimessage = handleMIDIMessage;
                console.log(`[EventHandlers MIDI] Listening to MIDI input: ${input.name}`);
                showNotification(`MIDI Input: ${input.name}`, "info");
            }
        });
    } else if (deviceId === 'computerKeyboard') {
        showNotification("MIDI Input: Computer Keyboard", "info");
    } else {
        showNotification("MIDI Input: None", "info");
    }
}

function handleMIDIMessage(message) {
    if (!localAppServices.getArmedTrackIdState || !localAppServices.getTrackById) {
        console.warn("[EventHandlers handleMIDIMessage] Armed track services not available.");
        return;
    }
    const command = message.data[0] >> 4; // Command type (e.g., 9 for note on, 8 for note off)
    const channel = message.data[0] & 0xf;  // MIDI channel (0-15)
    const note = message.data[1];           // MIDI note number
    const velocity = message.data.length > 2 ? message.data[2] : 0; // Velocity

    // console.log(`[EventHandlers MIDI] Received: cmd=${command}, ch=${channel}, note=${note}, vel=${velocity}`);
    if (localAppServices.uiElementsCache?.midiIndicatorGlobal) {
        localAppServices.uiElementsCache.midiIndicatorGlobal.classList.add('active');
        setTimeout(() => localAppServices.uiElementsCache.midiIndicatorGlobal.classList.remove('active'), 150);
    }

    const armedTrackId = localAppServices.getArmedTrackIdState();
    if (armedTrackId) {
        const track = localAppServices.getTrackById(armedTrackId);
        if (track && typeof track.playNote === 'function' && typeof track.stopNote === 'function') {
            if (command === 9 && velocity > 0) { // Note On
                track.playNote(note, velocity / 127, Tone.now());
            } else if (command === 8 || (command === 9 && velocity === 0)) { // Note Off
                track.stopNote(note, Tone.now() + 0.05); // Small delay for release
            }
            // Could handle other MIDI messages like CC, Pitch Bend here
        }
    }
}

// --- Action Dispatchers (called by UI elements) ---
export function handleTrackMute(trackId) {
    const track = localAppServices.getTrackById(trackId);
    if (track) {
        if (localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Toggle Mute for ${track.name}`);
        track.setMute(!track.isMuted); // This should update UI via appServices.updateTrackUI
        if(localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
    }
}
export function handleTrackSolo(trackId) {
    const track = localAppServices.getTrackById(trackId);
    if (track && localAppServices.setSoloedTrackId) {
        if (localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Toggle Solo for ${track.name}`);
        localAppServices.setSoloedTrackId(trackId); // This handles toggling and updates other tracks
    }
}
export function handleTrackArm(trackId) {
    const track = localAppServices.getTrackById(trackId);
    if (track && localAppServices.setArmedTrackId) {
        // No undo capture here, arming is usually transient UI state not part of project save
        localAppServices.setArmedTrackId(trackId);
    }
}
export function handleRemoveTrack(trackId) {
    const track = localAppServices.getTrackById(trackId);
    if (track) {
        showConfirmationDialog(`Are you sure you want to delete track "${track.name}"?`, () => {
            if (localAppServices.removeTrack) localAppServices.removeTrack(trackId); // State module handles undo
        });
    }
}

// --- Window Opening Dispatchers ---
export function handleOpenTrackInspector(trackId) {
    // console.log(`[EventHandlers handleOpenTrackInspector] Called for trackId: ${trackId}`);
    if (localAppServices.openTrackInspectorWindow && typeof localAppServices.openTrackInspectorWindow === 'function') {
        localAppServices.openTrackInspectorWindow(trackId);
    } else { console.error("[EventHandlers] openTrackInspectorWindow service not available or not a function."); }
}
export function handleOpenEffectsRack(trackId) {
    // console.log(`[EventHandlers handleOpenEffectsRack] Called for trackId: ${trackId}`);
    if (localAppServices.openTrackEffectsRackWindow && typeof localAppServices.openTrackEffectsRackWindow === 'function') {
        localAppServices.openTrackEffectsRackWindow(trackId);
    } else { console.error("[EventHandlers] openTrackEffectsRackWindow service not available or not a function."); }
}
export function handleOpenSequencer(trackId) {
    // console.log(`[EventHandlers handleOpenSequencer] Called for trackId: ${trackId}`);
    if (localAppServices.openSequencerWindow && typeof localAppServices.openSequencerWindow === 'function') {
        localAppServices.openSequencerWindow(trackId);
    } else { console.error("[EventHandlers] openSequencerWindow service not available or not a function."); }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showNotification(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`, "warning");
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// --- Timeline Drop Handling (called by arrangementMixingUI) ---
export async function handleTimelineLaneDrop(droppedItemData, targetTrackId, startTime, services = localAppServices) {
    if (!services.getTrackById || !services.showNotification) {
        console.error("[EventHandlers handleTimelineLaneDrop] Core services missing for drop handling.");
        return;
    }
    const targetTrack = services.getTrackById(targetTrackId);
    if (!targetTrack) {
        services.showNotification("Target track not found for drop.", "warning");
        return;
    }

    try {
        if (droppedItemData.type === 'sound-browser-item') {
            if (targetTrack.type !== 'Audio' && targetTrack.type !== 'Sampler' && targetTrack.type !== 'DrumSampler' && targetTrack.type !== 'InstrumentSampler') {
                services.showNotification("Can only drop sounds onto Audio or Sampler type tracks.", "warning");
                return;
            }
            // Use loadSoundFromBrowserToTarget for this, assuming it creates a clip or loads into sampler
            if (services.loadSoundFromBrowserToTarget) {
                // Determine targetType and context based on targetTrack.type
                let samplePurpose = 'AudioClip'; // Default for Audio tracks
                let context = { startTime: startTime }; // Context for AudioClip creation
                if (targetTrack.type === 'Sampler') samplePurpose = 'Slicer'; // load into slicer
                else if (targetTrack.type === 'DrumSampler') {
                    samplePurpose = 'DrumPad';
                    // Potentially determine padIndex if dropping on a specific part of the track UI for pads
                    context = { padIndex: 0 }; // Default to first pad if not specified
                } else if (targetTrack.type === 'InstrumentSampler') samplePurpose = 'Instrument';

                if (samplePurpose === 'AudioClip' && typeof targetTrack.addSoundBrowserItemAsClip === 'function') {
                    // This method needs to exist on Track class to handle creating a timeline clip
                    // It would internally call loadSoundFromBrowserToTarget or similar to get the audio data
                    // then create a timelineClip entry.
                    await targetTrack.addSoundBrowserItemAsClip(droppedItemData, startTime);
                } else if (['Slicer', 'DrumPad', 'Instrument'].includes(samplePurpose)) {
                    // For sampler types, load into the sampler instrument itself, not as a timeline clip directly from drop
                    await services.loadSoundFromBrowserToTarget(droppedItemData, targetTrack.id, samplePurpose, context);
                } else {
                     services.showNotification(`Cannot directly drop onto ${targetTrack.type} for this action.`, "warning");
                }


            } else {
                services.showNotification("Error: Cannot process sound browser item drop (internal).", "error");
            }
        }
        // Add handling for other draggable types like existing clips (move/copy)
        else {
             services.showNotification("Unrecognized item dropped on timeline.", "warning");
        }
    } catch (e) {
        console.error("[EventHandlers handleTimelineLaneDrop] Error processing dropped data:", e);
        services.showNotification("Error processing dropped item on timeline.", "error");
    }
}
