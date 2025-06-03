// js/eventHandlers.js - Global Event Listeners and Input Handling Module (MODIFIED for Start Menu Debug)
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog, createContextMenu } from './utils.js';

let localAppServices = {};
let transportKeepAliveBufferSource = null;
let silentKeepAliveBuffer = null;

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    if (!localAppServices.setPlaybackMode && localAppServices.setPlaybackModeState) { // Example of ensuring service exists
        localAppServices.setPlaybackMode = localAppServices.setPlaybackModeState;
    }
    console.log("[EventHandlers Init] Module initialized. localAppServices ready:", !!localAppServices.uiElementsCache);
}

export function initializePrimaryEventListeners() {
    console.log("[EventHandlers initializePrimaryEventListeners] Attempting to set up primary event listeners.");
    
    // Keyboard Shortcuts
    document.addEventListener('keydown', handleGlobalKeyDown);

    // Start Menu
    const startButton = localAppServices.uiElementsCache?.startMenuButton;
    const startMenuEl = localAppServices.uiElementsCache?.startMenu;

    if (startButton && startMenuEl) {
        console.log("[EventHandlers] StartMenuButton and StartMenuEl FOUND in cache.", startButton, startMenuEl);
        startButton.addEventListener('click', (event) => {
            event.stopPropagation();
            console.log("[EventHandlers] StartMenuButton CLICKED.");
            const wasHidden = startMenuEl.classList.contains('hidden');
            startMenuEl.classList.toggle('hidden');
            console.log(`[EventHandlers] Start menu class 'hidden' toggled. Was hidden: ${wasHidden}, Now hidden: ${startMenuEl.classList.contains('hidden')}`);
            if (!startMenuEl.classList.contains('hidden')) {
                console.log("[EventHandlers] Start menu should be visible.Computed style display:", getComputedStyle(startMenuEl).display);
            }
        });

        // Click outside to close start menu
        document.addEventListener('click', (event) => {
            if (!startMenuEl.classList.contains('hidden') && !startMenuEl.contains(event.target) && event.target !== startButton) {
                console.log("[EventHandlers] Click outside start menu detected. Closing.");
                startMenuEl.classList.add('hidden');
            }
        });
        setupStartMenuItems(startMenuEl);
    } else {
        // Fallback and detailed logging if elements are not in cache (should not happen given main.js order)
        console.error("[EventHandlers initializePrimaryEventListeners] StartMenuButton or StartMenuEl NOT FOUND in localAppServices.uiElementsCache.");
        console.log("localAppServices.uiElementsCache content:", localAppServices.uiElementsCache);
        
        const directStartButton = document.getElementById('startMenuButton');
        const directStartMenuEl = document.getElementById('startMenu');
        if (directStartButton && directStartMenuEl) {
            console.warn("[EventHandlers initializePrimaryEventListeners] Fallback: Attaching to directly fetched start menu elements.");
            directStartButton.addEventListener('click', (event) => {
                event.stopPropagation();
                directStartMenuEl.classList.toggle('hidden');
                 console.log(`[EventHandlers Fallback] Start menu class 'hidden' toggled. Now hidden: ${directStartMenuEl.classList.contains('hidden')}`);
            });
        } else {
            console.error("[EventHandlers initializePrimaryEventListeners] CRITICAL: Cannot find start menu elements even by direct ID fetch. Button found:", !!directStartButton, "Menu found:", !!directStartMenuEl);
        }
    }

    // iOS Audio Context Keep-Alive
    const playSilentBufferOnTouch = async () => {
        // ... (rest of the keep-alive logic remains the same as response #36)
        if (Tone.context.state !== 'running') {
            await Tone.start();
        }
        if (!silentKeepAliveBuffer && Tone.context.createBuffer) {
            silentKeepAliveBuffer = Tone.context.createBuffer(1, 1, Tone.context.sampleRate);
        }
        if (silentKeepAliveBuffer && (!transportKeepAliveBufferSource || transportKeepAliveBufferSource.context.state === 'closed')) {
            if(transportKeepAliveBufferSource) transportKeepAliveBufferSource.disconnect(); // Clean up old one if context closed
            transportKeepAliveBufferSource = Tone.context.createBufferSource();
            transportKeepAliveBufferSource.buffer = silentKeepAliveBuffer;
            transportKeepAliveBufferSource.loop = true;
            transportKeepAliveBufferSource.connect(Tone.Destination);
            transportKeepAliveBufferSource.start();
            console.log("[EventHandlers] iOS keep-alive silent buffer started/restarted.");
        }
        // No longer removing listener to allow re-trigger if context suspends
        // document.removeEventListener('touchstart', playSilentBufferOnTouch);
        // document.removeEventListener('mousedown', playSilentBufferOnTouch);
    };
    // Add these listeners with 'once: false' or re-add them if context suspends. For simplicity, keep them active.
    document.addEventListener('touchstart', playSilentBufferOnTouch, { passive: true });
    document.addEventListener('mousedown', playSilentBufferOnTouch, { passive: true });
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
        if (localAppServices.undo && localAppServices.getUndoStackState && localAppServices.getUndoStackState().length > 0) localAppServices.undo();
        startMenuEl.classList.add('hidden');
    });
    startMenuEl.querySelector('#menuRedo')?.addEventListener('click', () => {
        if (localAppServices.redo && localAppServices.getRedoStackState && localAppServices.getRedoStackState().length > 0) localAppServices.redo();
        startMenuEl.classList.add('hidden');
    });
    
    // --- View Menu ---
    startMenuEl.querySelector('#menuToggleFullScreen')?.addEventListener('click', () => {
        toggleFullScreen(); // toggleFullScreen is defined below
        startMenuEl.classList.add('hidden');
    });
}

export function attachGlobalControlEvents(elementsToAttachTo) {
    // ... (rest of the function remains the same as response #36)
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
                e.target.value = Tone.Transport.bpm.value; 
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
        });
    } else console.warn("[EventHandlers] Global playback mode toggle not found for attachment.");
    
    if (midiInputSelectGlobal) {
        midiInputSelectGlobal.addEventListener('change', (e) => {
            if (localAppServices.selectMIDIInput) localAppServices.selectMIDIInput(e.target.value);
        });
    } else console.warn("[EventHandlers] Global MIDI input select not found for attachment.");
}

function handleGlobalKeyDown(event) {
    // ... (rest of the function remains the same as response #36)
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT' || event.target.isContentEditable) {
        if (event.key === "Escape") event.target.blur();
        return; 
    }
    const key = event.key.toLowerCase();
    const ctrlOrMeta = event.ctrlKey || event.metaKey;
    switch (key) {
        case ' ': event.preventDefault(); if (localAppServices.togglePlayback) localAppServices.togglePlayback(); break;
        case 'enter': if (Tone.Transport.state === 'started' && localAppServices.stopPlayback) { event.preventDefault(); localAppServices.stopPlayback(); } break;
        case 'r': if (!ctrlOrMeta && localAppServices.toggleRecording) { event.preventDefault(); localAppServices.toggleRecording(); } break;
        case 's': if (ctrlOrMeta) { event.preventDefault(); if (localAppServices.saveProject) localAppServices.saveProject(); } break;
        case 'o': if (ctrlOrMeta) { event.preventDefault(); if (localAppServices.loadProject) localAppServices.loadProject(); } break;
        case 'z': if (ctrlOrMeta) { event.preventDefault(); if (event.shiftKey && localAppServices.redo) localAppServices.redo(); else if (!event.shiftKey && localAppServices.undo) localAppServices.undo(); } break;
        case 'y': if (ctrlOrMeta && localAppServices.redo) { event.preventDefault(); localAppServices.redo(); } break;
    }
    const armedTrackId = localAppServices.getArmedTrackIdState ? localAppServices.getArmedTrackIdState() : null;
    const activeMIDIInput = localAppServices.getActiveMIDIInputState ? localAppServices.getActiveMIDIInputState() : 'none';
    if (armedTrackId && (activeMIDIInput === 'computerKeyboard' || activeMIDIInput === 'none' || !activeMIDIInput)) {
        const track = localAppServices.getTrackById(armedTrackId);
        if (track && typeof track.playNote === 'function') {
            const midiNote = Constants.computerKeySynthMap[key];
            if (midiNote !== undefined) {
                event.preventDefault();
                track.playNote(midiNote, 1.0, Tone.now(), '8n');
                if (localAppServices.uiElementsCache?.keyboardIndicatorGlobal) {
                    localAppServices.uiElementsCache.keyboardIndicatorGlobal.classList.add('active');
                    setTimeout(() => localAppServices.uiElementsCache.keyboardIndicatorGlobal.classList.remove('active'), 150);
                }
            }
        }
    }
}

export async function setupMIDI() { /* ... (same as response #36) ... */ 
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
                populateMIDIInputSelector(midiAccess);
                const activeInput = localAppServices.getActiveMIDIInputState();
                if (activeInput && activeInput !== 'none' && activeInput !== 'computerKeyboard') {
                    let stillConnected = false;
                    midiAccess.inputs.forEach(input => { if (input.id === activeInput) stillConnected = true; });
                    if (!stillConnected) {
                        console.log(`[EventHandlers MIDI] Active MIDI input "${activeInput}" disconnected. Resetting.`);
                        if(localAppServices.selectMIDIInput) localAppServices.selectMIDIInput('none'); 
                    }
                }
            };
        } catch (error) {
            console.warn("[EventHandlers setupMIDI] MIDI Access request failed:", error);
            showNotification("Could not access MIDI devices. " + error.message, "warning");
            populateMIDIInputSelector(null); 
        }
    } else {
        console.warn("[EventHandlers setupMIDI] Web MIDI API not supported in this browser.");
        showNotification("Web MIDI API not supported. Using computer keyboard only.", "info");
        populateMIDIInputSelector(null); 
    }
}
function populateMIDIInputSelector(midiAccess) { /* ... (same as response #36) ... */
    const selector = localAppServices.uiElementsCache?.midiInputSelectGlobal;
    if (!selector) {
        console.warn("[EventHandlers populateMIDIInputSelector] MIDI input selector UI element not found.");
        return;
    }
    const previouslySelected = selector.value;
    selector.innerHTML = ''; 
    const noneOption = new Option("None", "none");
    selector.add(noneOption);
    const compKeyboardOption = new Option("Computer Keyboard", "computerKeyboard");
    selector.add(compKeyboardOption);
    if (midiAccess && midiAccess.inputs.size > 0) {
        midiAccess.inputs.forEach(input => {
            selector.add(new Option(input.name, input.id));
        });
    }
    if (previouslySelected && Array.from(selector.options).some(opt => opt.value === previouslySelected)) {
        selector.value = previouslySelected;
    } else if (midiAccess && midiAccess.inputs.size > 0) {
        selector.value = midiAccess.inputs.values().next().value.id; 
    } else {
        selector.value = "computerKeyboard"; 
    }
    if(localAppServices.getActiveMIDIInputState && selector.value !== localAppServices.getActiveMIDIInputState()){
         if (localAppServices.selectMIDIInput) localAppServices.selectMIDIInput(selector.value);
    }
}
export function selectMIDIInput(deviceId) { /* ... (same as response #36) ... */
    if (!localAppServices.getActiveMIDIInputState || !localAppServices.setActiveMIDIInput || !localAppServices.getMidiAccessState) {
        console.warn("[EventHandlers selectMIDIInput] Core MIDI state services not available for input selection.");
        return;
    }
    const midiAccess = localAppServices.getMidiAccessState();
    const currentActiveInputId = localAppServices.getActiveMIDIInputState();
    if (currentActiveInputId && currentActiveInputId !== 'none' && currentActiveInputId !== 'computerKeyboard' && midiAccess) {
        midiAccess.inputs.forEach(input => {
            if (input.id === currentActiveInputId) input.onmidimessage = null;
        });
    }
    localAppServices.setActiveMIDIInput(deviceId); 
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
function handleMIDIMessage(message) { /* ... (same as response #36) ... */
    if (!localAppServices.getArmedTrackIdState || !localAppServices.getTrackById) {
        console.warn("[EventHandlers handleMIDIMessage] Armed track services not available.");
        return;
    }
    const command = message.data[0] >> 4; 
    const note = message.data[1];
    const velocity = message.data.length > 2 ? message.data[2] : 0; 
    if (localAppServices.uiElementsCache?.midiIndicatorGlobal) {
        localAppServices.uiElementsCache.midiIndicatorGlobal.classList.add('active');
        setTimeout(() => localAppServices.uiElementsCache.midiIndicatorGlobal.classList.remove('active'), 150);
    }
    const armedTrackId = localAppServices.getArmedTrackIdState();
    if (armedTrackId) {
        const track = localAppServices.getTrackById(armedTrackId);
        if (track && typeof track.playNote === 'function' && typeof track.stopNote === 'function') {
            if (command === 9 && velocity > 0) track.playNote(note, velocity / 127, Tone.now());
            else if (command === 8 || (command === 9 && velocity === 0)) track.stopNote(note, Tone.now() + 0.05);
        }
    }
}

export function handleTrackMute(trackId) { /* ... (same as response #36) ... */
    const track = localAppServices.getTrackById(trackId);
    if (track) {
        if (localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Toggle Mute for ${track.name}`);
        track.setMute(!track.isMuted); 
        if(localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
    }
}
export function handleTrackSolo(trackId) { /* ... (same as response #36) ... */
    const track = localAppServices.getTrackById(trackId);
    if (track && localAppServices.setSoloedTrackId) {
        if (localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Toggle Solo for ${track.name}`);
        localAppServices.setSoloedTrackId(trackId); 
    }
}
export function handleTrackArm(trackId) { /* ... (same as response #36) ... */
    const track = localAppServices.getTrackById(trackId);
    if (track && localAppServices.setArmedTrackId) {
        localAppServices.setArmedTrackId(trackId);
    }
}
export function handleRemoveTrack(trackId) { /* ... (same as response #36) ... */
    const track = localAppServices.getTrackById(trackId);
    if (track) {
        showConfirmationDialog(`Are you sure you want to delete track "${track.name}"?`, () => {
            if (localAppServices.removeTrack) localAppServices.removeTrack(trackId); 
        });
    }
}

export function handleOpenTrackInspector(trackId) { /* ... (same as response #36) ... */
    if (localAppServices.openTrackInspectorWindow && typeof localAppServices.openTrackInspectorWindow === 'function') {
        localAppServices.openTrackInspectorWindow(trackId);
    } else { console.error("[EventHandlers] openTrackInspectorWindow service not available or not a function."); }
}
export function handleOpenEffectsRack(trackId) { /* ... (same as response #36) ... */
    if (localAppServices.openTrackEffectsRackWindow && typeof localAppServices.openTrackEffectsRackWindow === 'function') {
        localAppServices.openTrackEffectsRackWindow(trackId);
    } else { console.error("[EventHandlers] openTrackEffectsRackWindow service not available or not a function."); }
}
export function handleOpenSequencer(trackId) { /* ... (same as response #36) ... */
    if (localAppServices.openSequencerWindow && typeof localAppServices.openSequencerWindow === 'function') {
        localAppServices.openSequencerWindow(trackId);
    } else { console.error("[EventHandlers] openSequencerWindow service not available or not a function."); }
}

function toggleFullScreen() { /* ... (same as response #36) ... */
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
export async function handleTimelineLaneDrop(droppedItemData, targetTrackId, startTime, services = localAppServices) { /* ... (same as response #36) ... */
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
            if (services.loadSoundFromBrowserToTarget) {
                let samplePurpose = 'AudioClip'; 
                let context = { startTime: startTime }; 
                if (targetTrack.type === 'Sampler') samplePurpose = 'Slicer'; 
                else if (targetTrack.type === 'DrumSampler') { samplePurpose = 'DrumPad'; context = { padIndex: 0 }; }
                else if (targetTrack.type === 'InstrumentSampler') samplePurpose = 'Instrument';

                if (samplePurpose === 'AudioClip' && typeof targetTrack.addSoundBrowserItemAsClip === 'function') {
                    await targetTrack.addSoundBrowserItemAsClip(droppedItemData, startTime);
                } else if (['Slicer', 'DrumPad', 'Instrument'].includes(samplePurpose)) {
                    await services.loadSoundFromBrowserToTarget(droppedItemData, targetTrack.id, samplePurpose, context);
                } else {
                     services.showNotification(`Cannot directly drop onto ${targetTrack.type} for this action.`, "warning");
                }
            } else {
                services.showNotification("Error: Cannot process sound browser item drop (internal).", "error");
            }
        }
        else {
             services.showNotification("Unrecognized item dropped on timeline.", "warning");
        }
    } catch (e) {
        console.error("[EventHandlers handleTimelineLaneDrop] Error processing dropped data:", e);
        services.showNotification("Error processing dropped item on timeline.", "error");
    }
}
