// js/eventHandlers.js - Global Event Listeners and Input Handling Module (MODIFIED - Ensured appServices reference and robust audio unlock)
import * as Constants from './constants.js';
// Assuming showNotification, showConfirmationDialog, createContextMenu are available via localAppServices from main.js

// This will be the single appServices instance from main.js
let localAppServices = {};
let transportKeepAliveBufferSource = null;
let silentKeepAliveBuffer = null;
let isAudioUnlocked = false; // Flag to ensure unlock happens only once

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain; // Use the direct reference
    // console.log("[EventHandlers Init] Module initialized. localAppServices ready:", !!localAppServices.uiElementsCache);
}

const playSilentBufferOnTouch = async () => {
    if (isAudioUnlocked || typeof Tone === 'undefined') {
        return;
    }

    let audioContextJustStarted = false;
    if (Tone.context.state !== 'running') {
        try {
            await Tone.start();
            audioContextJustStarted = true;
            console.log("[EventHandlers playSilentBufferOnTouch] Tone.start() successfully called.");
        } catch (e) {
            console.error("[EventHandlers playSilentBufferOnTouch] Error on Tone.start():", e);
            if (localAppServices && localAppServices.showNotification) {
                localAppServices.showNotification("Audio could not be started. Please interact with the page again or refresh.", "error");
            }
            return; // Don't proceed if Tone.start() fails
        }
    }

    // Optional: Small delay if context was just started, to allow full stabilization
    // This can sometimes help with race conditions on older/slower devices.
    if (audioContextJustStarted) {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
    }

    try {
        if (!silentKeepAliveBuffer && Tone.context.createBuffer) {
            // Native AudioContext createBuffer
            silentKeepAliveBuffer = Tone.context.createBuffer(1, 1, Tone.context.sampleRate);
        }

        if (silentKeepAliveBuffer) {
            // Dispose of old source if it exists and is not already disposed/closed
            if (transportKeepAliveBufferSource && transportKeepAliveBufferSource.context && transportKeepAliveBufferSource.context.state !== 'closed') {
                try {
                    transportKeepAliveBufferSource.stop();
                    transportKeepAliveBufferSource.disconnect();
                } catch (e) {
                    // console.warn("[EventHandlers playSilentBufferOnTouch] Error stopping/disconnecting old source:", e.message);
                }
            }

            transportKeepAliveBufferSource = Tone.context.createBufferSource(); // Native BufferSource
            transportKeepAliveBufferSource.buffer = silentKeepAliveBuffer;
            transportKeepAliveBufferSource.loop = true;

            // Ensure Tone.Destination is valid and connected
            const destination = Tone.getDestination();
            if (destination && !destination.disposed) {
                transportKeepAliveBufferSource.connect(destination);
                transportKeepAliveBufferSource.start();
                isAudioUnlocked = true; // Set flag to true after successful start
                console.log("[EventHandlers playSilentBufferOnTouch] Silent buffer playing. Audio unlocked.");

                // Remove the event listeners after the first successful interaction
                document.removeEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
                document.removeEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
                document.removeEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });


            } else {
                console.error("[EventHandlers playSilentBufferOnTouch] Tone.Destination is not valid or disposed.");
                if (localAppServices && localAppServices.showNotification) {
                    localAppServices.showNotification("Audio output destination error.", "error");
                }
            }
        }
    } catch (e) {
        console.error("[EventHandlers playSilentBufferOnTouch] Error creating/starting silent buffer:", e);
        if (localAppServices && localAppServices.showNotification) {
            localAppServices.showNotification("Error playing silent audio to unlock context.", "error");
        }
    }
};


export function initializePrimaryEventListeners() {
    // console.log("[EventHandlers initializePrimaryEventListeners] Setting up primary event listeners.");

    // Attach audio unlock listeners (will be removed after first success)
    // Using capture: true to ensure these run before other potential handlers that might stop propagation.
    document.addEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
    // Also consider keydown as an unlocking event, as users might interact via keyboard first.
    document.addEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });


    document.addEventListener('keydown', handleGlobalKeyDown);

    const startButton = localAppServices.uiElementsCache?.startMenuButton;
    const startMenuEl = localAppServices.uiElementsCache?.startMenu;

    if (startButton && startMenuEl) {
        startButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const wasHidden = startMenuEl.classList.contains('hidden');
            startMenuEl.classList.toggle('hidden');
            if (!wasHidden && !startMenuEl.classList.contains('hidden')) {
                 // console.log("[EventHandlers] Start menu should be visible. Computed style display:", getComputedStyle(startMenuEl).display);
            }
        });

        document.addEventListener('click', (event) => {
            if (!startMenuEl.classList.contains('hidden') && !startMenuEl.contains(event.target) && event.target !== startButton) {
                startMenuEl.classList.add('hidden');
            }
        });
        setupStartMenuItems(startMenuEl);
    } else {
        console.error("[EventHandlers initializePrimaryEventListeners] StartMenuButton or StartMenuEl NOT FOUND in localAppServices.uiElementsCache.");
    }

    const topTaskbarPlayBtn = localAppServices.uiElementsCache?.playBtn;
    const topTaskbarStopBtn = localAppServices.uiElementsCache?.stopBtn;
    const topTaskbarRecordBtn = localAppServices.uiElementsCache?.recordBtn;

    if (topTaskbarPlayBtn && localAppServices.togglePlayback) {
        topTaskbarPlayBtn.addEventListener('click', () => localAppServices.togglePlayback());
    } else {
        console.warn("[EventHandlers] Top taskbar playBtn not found or togglePlayback service missing.");
    }
    if (topTaskbarStopBtn && localAppServices.stopPlayback) {
        topTaskbarStopBtn.addEventListener('click', () => localAppServices.stopPlayback());
    } else {
        console.warn("[EventHandlers] Top taskbar stopBtn not found or stopPlayback service missing.");
    }
    if (topTaskbarRecordBtn && localAppServices.toggleRecording) {
        topTaskbarRecordBtn.addEventListener('click', () => localAppServices.toggleRecording());
    } else {
        console.warn("[EventHandlers] Top taskbar recordBtn not found or toggleRecording service missing.");
    }
}

function setupStartMenuItems(startMenuEl) {
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
    startMenuEl.querySelector('#menuUndo')?.addEventListener('click', () => {
        if (localAppServices.undo && localAppServices.getUndoStackState && localAppServices.getUndoStackState().length > 0) localAppServices.undo();
        startMenuEl.classList.add('hidden');
    });
    startMenuEl.querySelector('#menuRedo')?.addEventListener('click', () => {
        if (localAppServices.redo && localAppServices.getRedoStackState && localAppServices.getRedoStackState().length > 0) localAppServices.redo();
        startMenuEl.classList.add('hidden');
    });
    startMenuEl.querySelector('#menuToggleFullScreen')?.addEventListener('click', () => {
        toggleFullScreen();
        startMenuEl.classList.add('hidden');
    });
}

export function attachGlobalControlEvents(elementsToAttachTo) {
    const { playBtnGlobal, stopBtnGlobal, recordBtnGlobal, tempoGlobalInput, playbackModeToggleBtnGlobal, midiInputSelectGlobal } = elementsToAttachTo;

    if (playBtnGlobal && localAppServices.togglePlayback) playBtnGlobal.addEventListener('click', () => localAppServices.togglePlayback());
    else if (playBtnGlobal) console.warn("[EventHandlers GCW] playBtnGlobal found but togglePlayback service missing.");

    if (stopBtnGlobal && localAppServices.stopPlayback) stopBtnGlobal.addEventListener('click', () => localAppServices.stopPlayback());
    else if (stopBtnGlobal) console.warn("[EventHandlers GCW] stopBtnGlobal found but stopPlayback service missing.");

    if (recordBtnGlobal && localAppServices.toggleRecording) recordBtnGlobal.addEventListener('click', () => localAppServices.toggleRecording());
    else if (recordBtnGlobal) console.warn("[EventHandlers GCW] recordBtnGlobal found but toggleRecording service missing.");

    if (tempoGlobalInput) {
        if (typeof Tone !== 'undefined' && Tone.Transport) {
             tempoGlobalInput.value = Tone.Transport.bpm.value.toFixed(1);
        }
        tempoGlobalInput.addEventListener('change', (e) => {
            const newTempo = parseFloat(e.target.value);
            if (newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) {
                if (typeof Tone !== 'undefined' && Tone.Transport) Tone.Transport.bpm.value = newTempo;
                if (localAppServices.updateTaskbarTempoDisplay) localAppServices.updateTaskbarTempoDisplay(newTempo);
                if (localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Set Tempo to ${newTempo}`);
            } else {
                if (typeof Tone !== 'undefined' && Tone.Transport) e.target.value = Tone.Transport.bpm.value.toFixed(1);
                if (localAppServices.showNotification) localAppServices.showNotification(`Tempo must be between ${Constants.MIN_TEMPO} and ${Constants.MAX_TEMPO}.`, "warning");
            }
        });
    } else console.warn("[EventHandlers GCW] tempoGlobalInput not found for attachment.");

    if (playbackModeToggleBtnGlobal && localAppServices.getPlaybackMode && localAppServices.setPlaybackMode) {
        const currentMode = localAppServices.getPlaybackMode();
        playbackModeToggleBtnGlobal.textContent = currentMode === 'timeline' ? 'Timeline Mode' : 'Sequencer Mode';
        playbackModeToggleBtnGlobal.addEventListener('click', () => {
            const oldMode = localAppServices.getPlaybackMode();
            const newMode = oldMode === 'sequencer' ? 'timeline' : 'sequencer';
            localAppServices.setPlaybackMode(newMode); // This should trigger onPlaybackModeChange in main.js via state
        });
    } else console.warn("[EventHandlers GCW] playbackModeToggleBtnGlobal or required services not found.");

    if (midiInputSelectGlobal && localAppServices.selectMIDIInput) {
        midiInputSelectGlobal.addEventListener('change', (e) => localAppServices.selectMIDIInput(e.target.value));
    } else console.warn("[EventHandlers GCW] midiInputSelectGlobal or selectMIDIInput service not found.");
}

function handleGlobalKeyDown(event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT' || event.target.isContentEditable) {
        if (event.key === "Escape") event.target.blur();
        return;
    }
    const key = event.key.toLowerCase();
    const ctrlOrMeta = event.ctrlKey || event.metaKey;
    switch (key) {
        case ' ': event.preventDefault(); if (localAppServices.togglePlayback) localAppServices.togglePlayback(); break;
        case 'enter': if (typeof Tone !== 'undefined' && Tone.Transport.state === 'started' && localAppServices.stopPlayback) { event.preventDefault(); localAppServices.stopPlayback(); } break;
        case 'r': if (!ctrlOrMeta && localAppServices.toggleRecording) { event.preventDefault(); localAppServices.toggleRecording(); } break;
        case 's': if (ctrlOrMeta) { event.preventDefault(); if (localAppServices.saveProject) localAppServices.saveProject(); } break;
        case 'o': if (ctrlOrMeta) { event.preventDefault(); if (localAppServices.loadProject) localAppServices.loadProject(); } break;
        case 'z': if (ctrlOrMeta) { event.preventDefault(); if (event.shiftKey && localAppServices.redo) localAppServices.redo(); else if (!event.shiftKey && localAppServices.undo) localAppServices.undo(); } break;
        case 'y': if (ctrlOrMeta && localAppServices.redo) { event.preventDefault(); localAppServices.redo(); } break;
    }
    const armedTrackId = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() : null;
    const activeMIDIInput = localAppServices.getActiveMIDIInput ? localAppServices.getActiveMIDIInput() : 'none';

    if (armedTrackId && (activeMIDIInput === 'computerKeyboard' || activeMIDIInput === 'none' || !activeMIDIInput)) {
        const track = localAppServices.getTrackById ? localAppServices.getTrackById(armedTrackId) : null;
        if (track && typeof track.playNote === 'function' && typeof Tone !== 'undefined') {
            const midiNote = Constants.computerKeySynthMap[key];
            if (midiNote !== undefined) {
                event.preventDefault();
                track.playNote(midiNote, 1.0, Tone.now(), '8n'); // playNote needs Tone.now() for timing
                if (localAppServices.uiElementsCache?.keyboardIndicatorGlobal) {
                    localAppServices.uiElementsCache.keyboardIndicatorGlobal.classList.add('active');
                    setTimeout(() => localAppServices.uiElementsCache.keyboardIndicatorGlobal.classList.remove('active'), 150);
                }
            }
        }
    }
}

export async function setupMIDI() {
    if (!localAppServices.getMidiAccess || !localAppServices.setMidiAccessState || !localAppServices.setActiveMIDIInput || !localAppServices.selectMIDIInput) {
        console.warn("[EventHandlers setupMIDI] Core MIDI services not available in localAppServices.");
        return;
    }

    const selector = localAppServices.uiElementsCache?.midiInputSelectGlobal;
    if (!selector) {
        console.warn("[EventHandlers setupMIDI] MIDI input selector UI element not found in cache. MIDI setup will be incomplete until GlobalControls window is ready.");
        // We can't populate if the selector isn't ready. It will be called again from main.js when GCW is ready.
        return;
    }

    if (navigator.requestMIDIAccess) {
        try {
            const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            localAppServices.setMidiAccessState(midiAccess); // This calls the state module's setter
            populateMIDIInputSelector(midiAccess); // Populate now that we have access
            midiAccess.onstatechange = (e) => {
                console.log("[EventHandlers MIDI] MIDI state changed:", e.port.name, e.port.state);
                populateMIDIInputSelector(localAppServices.getMidiAccess()); // Repopulate with current access object
                const activeInput = localAppServices.getActiveMIDIInput();
                if (activeInput && activeInput !== 'none' && activeInput !== 'computerKeyboard') {
                    let stillConnected = false;
                    const currentMidiAccess = localAppServices.getMidiAccess();
                    if (currentMidiAccess) {
                        currentMidiAccess.inputs.forEach(input => { if (input.id === activeInput) stillConnected = true; });
                    }
                    if (!stillConnected) {
                        console.log(`[EventHandlers MIDI] Active MIDI input "${activeInput}" disconnected. Resetting.`);
                        if(localAppServices.selectMIDIInput) localAppServices.selectMIDIInput('none'); // Re-select to update state and UI
                    }
                }
            };
        } catch (error) {
            console.warn("[EventHandlers setupMIDI] MIDI Access request failed:", error);
            if (localAppServices.showNotification) localAppServices.showNotification("Could not access MIDI devices. " + error.message, "warning");
            populateMIDIInputSelector(null); // Populate with no devices
        }
    } else {
        console.warn("[EventHandlers setupMIDI] Web MIDI API not supported in this browser.");
        if (localAppServices.showNotification) localAppServices.showNotification("Web MIDI API not supported. Using computer keyboard only.", "info");
        populateMIDIInputSelector(null); // Populate with no devices
    }
}

function populateMIDIInputSelector(midiAccess) {
    const selector = localAppServices.uiElementsCache?.midiInputSelectGlobal;
    if (!selector) {
        // console.warn("[EventHandlers populateMIDIInputSelector] MIDI input selector UI element not found.");
        return; // Can't do anything if the element doesn't exist
    }
    const previouslySelected = localAppServices.getActiveMIDIInput ? localAppServices.getActiveMIDIInput() : selector.value;
    selector.innerHTML = ''; // Clear existing options

    const noneOption = new Option("None", "none");
    selector.add(noneOption);
    const compKeyboardOption = new Option("Computer Keyboard", "computerKeyboard");
    selector.add(compKeyboardOption);

    if (midiAccess && midiAccess.inputs.size > 0) {
        midiAccess.inputs.forEach(input => {
            selector.add(new Option(input.name, input.id));
        });
    }

    let valueToSet = "computerKeyboard"; // Default
    if (previouslySelected && Array.from(selector.options).some(opt => opt.value === previouslySelected)) {
        valueToSet = previouslySelected;
    } else if (midiAccess && midiAccess.inputs.size > 0) {
        // If previously selected is no longer valid, default to the first actual MIDI device if available
        valueToSet = midiAccess.inputs.values().next().value.id;
    }
    selector.value = valueToSet;

    // Call selectMIDIInput only if the final selected value has changed or was not set
    // This avoids redundant calls if the list repopulates but selection remains effectively the same.
    if (localAppServices.selectMIDIInput && selector.value !== (localAppServices.getActiveMIDIInput ? localAppServices.getActiveMIDIInput() : null)) {
         localAppServices.selectMIDIInput(selector.value);
    } else if (localAppServices.getActiveMIDIInput && !localAppServices.getActiveMIDIInput() && localAppServices.selectMIDIInput) {
        // If no input was active and now we have one (even if it's keyboard), set it
        localAppServices.selectMIDIInput(selector.value);
    }
}

export function selectMIDIInput(deviceId) {
    if (!localAppServices.setActiveMIDIInput || !localAppServices.getMidiAccess || !localAppServices.getActiveMIDIInput) {
        console.warn("[EventHandlers selectMIDIInput] Core MIDI services not available for input selection.");
        return;
    }
    const midiAccess = localAppServices.getMidiAccess();
    const currentActiveInputId = localAppServices.getActiveMIDIInput();

    // Detach listener from the previously active MIDI input (if any)
    if (currentActiveInputId && currentActiveInputId !== 'none' && currentActiveInputId !== 'computerKeyboard' && midiAccess) {
        midiAccess.inputs.forEach(input => {
            if (input.id === currentActiveInputId) input.onmidimessage = null;
        });
    }

    localAppServices.setActiveMIDIInput(deviceId); // Update state

    // Attach listener to the new MIDI input (if any)
    if (deviceId && deviceId !== 'none' && deviceId !== 'computerKeyboard' && midiAccess) {
        midiAccess.inputs.forEach(input => {
            if (input.id === deviceId) {
                input.onmidimessage = handleMIDIMessage;
                // console.log(`[EventHandlers MIDI] Listening to MIDI input: ${input.name}`);
                if (localAppServices.showNotification) localAppServices.showNotification(`MIDI Input: ${input.name}`, "info");
            }
        });
    } else if (deviceId === 'computerKeyboard') {
        if (localAppServices.showNotification) localAppServices.showNotification("MIDI Input: Computer Keyboard", "info");
    } else {
        if (localAppServices.showNotification) localAppServices.showNotification("MIDI Input: None", "info");
    }
     // Update the selector in the UI if it's not already showing the new deviceId
    const selector = localAppServices.uiElementsCache?.midiInputSelectGlobal;
    if (selector && selector.value !== deviceId) {
        selector.value = deviceId;
    }
}

function handleMIDIMessage(message) {
    if (!localAppServices.getArmedTrackId || !localAppServices.getTrackById) {
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

    const armedTrackId = localAppServices.getArmedTrackId();
    if (armedTrackId) {
        const track = localAppServices.getTrackById(armedTrackId);
        if (track && typeof track.playNote === 'function' && typeof track.stopNote === 'function' && typeof Tone !== 'undefined') {
            if (command === 9 && velocity > 0) { // Note On
                track.playNote(note, velocity / 127, Tone.now()); // Assuming playNote handles timing
            } else if (command === 8 || (command === 9 && velocity === 0)) { // Note Off
                track.stopNote(note, Tone.now() + 0.05); // Add a small delay for release
            }
        }
    }
}

export function handleTrackMute(trackId) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (track && track.setMute) { // Ensure setMute exists on track instance
        if (localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Toggle Mute for ${track.name}`);
        track.setMute(!track.isMuted);
        if(localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
        if(localAppServices.renderTimeline) localAppServices.renderTimeline();
    }
}
export function handleTrackSolo(trackId) {
    // const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null; // Not strictly needed here
    if (localAppServices.setSoloedTrackId) { // setSoloedTrackId in state handles logic and UI updates
        const trackForUndoName = localAppServices.getTrackById(trackId)?.name || `Track ${trackId}`;
        if (localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Toggle Solo for ${trackForUndoName}`);
        localAppServices.setSoloedTrackId(trackId);
    }
}
export function handleTrackArm(trackId) {
    // const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null; // Not strictly needed here
    if (localAppServices.setArmedTrackId) { // setArmedTrackId in state handles logic and UI updates
        // Undo for arming is typically not implemented as it's a transient UI state, but can be added if desired.
        localAppServices.setArmedTrackId(trackId);
    }
}
export function handleRemoveTrack(trackId) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (track && localAppServices.showConfirmationDialog && localAppServices.removeTrack) {
        localAppServices.showConfirmationDialog(`Are you sure you want to delete track "${track.name}"?`, () => {
            if (localAppServices.removeTrack) localAppServices.removeTrack(trackId);
        });
    }
}

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
    if (localAppServices.openSequencerWindow) {
        localAppServices.openSequencerWindow(trackId);
    } else { console.error("[EventHandlers] openSequencerWindow service not available."); }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            if(localAppServices.showNotification) localAppServices.showNotification(`Error enabling full-screen: ${err.message}`, "warning");
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}
export async function handleTimelineLaneDrop(droppedItemData, targetTrackId, startTime, services) {
    if (!services) services = localAppServices;
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
        if (droppedItemData && droppedItemData.type === 'sound-browser-item') {
            if (!['Audio', 'Sampler', 'DrumSampler', 'InstrumentSampler'].includes(targetTrack.type)) {
                services.showNotification("Sounds can only be dropped onto Audio or Sampler type tracks.", "warning");
                return;
            }

            let samplePurpose = 'AudioClip';
            let context = { startTime: startTime };

            if (targetTrack.type === 'Sampler') {
                 samplePurpose = 'Slicer'; // Sampler tracks use 'Slicer' purpose
                 // No specific context change needed here beyond what loadSampleFromBrowser might expect
            } else if (targetTrack.type === 'DrumSampler') {
                samplePurpose = 'DrumPad';
                // For DrumSampler, you might need to determine which pad to load to,
                // or have a default behavior (e.g., load to first empty pad, or a specific pad).
                // This might require more context or UI interaction. For now, assuming a default.
                const firstEmptyPad = targetTrack.drumSamplerPads?.findIndex(p => !p.sampleId);
                context = { padIndex: firstEmptyPad !== -1 ? firstEmptyPad : 0 };
            } else if (targetTrack.type === 'InstrumentSampler') {
                samplePurpose = 'Instrument';
                // Context might include info like root note if applicable
            }


            if (targetTrack.type === 'Audio' && typeof targetTrack.addSoundBrowserItemAsClip === 'function') {
                await targetTrack.addSoundBrowserItemAsClip(droppedItemData, startTime);
            } else if (['Slicer', 'DrumPad', 'Instrument'].includes(samplePurpose) && typeof targetTrack.loadSampleFromBrowser === 'function'){
                await targetTrack.loadSampleFromBrowser(droppedItemData, samplePurpose, context);
            } else {
                 services.showNotification(`Cannot directly drop this sound onto a ${targetTrack.type} track this way. Missing appropriate handler.`, "warning");
            }

        } else if (droppedItemData instanceof FileList || (Array.isArray(droppedItemData) && droppedItemData[0] instanceof File)) {
            const file = (droppedItemData instanceof FileList) ? droppedItemData[0] : droppedItemData[0];
            if (targetTrack.type !== 'Audio') {
                services.showNotification("Audio files can only be dropped onto Audio Track timeline lanes.", "warning");
                return;
            }
            if (file && file.type.startsWith('audio/')) {
                if (typeof targetTrack.addExternalAudioFileAsClip === 'function') {
                    await targetTrack.addExternalAudioFileAsClip(file, startTime, file.name);
                } else {
                    services.showNotification("Error: Track cannot accept external audio file clips.", "error");
                }
            } else if (file) {
                services.showNotification("Invalid file type. Please drop an audio file.", "warning");
            }
        } else {
             services.showNotification("Unrecognized item dropped on timeline.", "warning");
        }
    } catch (e) {
        console.error("[EventHandlers handleTimelineLaneDrop] Error processing dropped data:", e);
        services.showNotification("Error processing dropped item on timeline.", "error");
    }
}
