// js/eventHandlers.js - Global Event Listeners and Input Handling Module
import * as Constants from './constants.js';
// Assuming showNotification, showConfirmationDialog, createContextMenu are available via localAppServices from main.js

let localAppServices = {};
// let transportKeepAliveBufferSource = null; // Temporarily removed for testing
// let silentKeepAliveBuffer = null;        // Temporarily removed for testing
let isAudioUnlocked = false;

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

// --- TEMPORARY SIMPLIFIED AUDIO UNLOCK FOR TESTING ---
const playSilentBufferOnTouch = async () => {
    if (isAudioUnlocked || typeof Tone === 'undefined') {
        return;
    }

    if (Tone.context.state !== 'running') {
        try {
            await Tone.start();
            isAudioUnlocked = true; // Set flag after successful start
            console.log("[EventHandlers playSilentBufferOnTouch] (Simplified Test) Tone.start() called successfully. Audio unlocked.");

            // Remove listeners after the first successful interaction
            document.removeEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
            document.removeEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
            document.removeEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });

        } catch (e) {
            console.error("[EventHandlers playSilentBufferOnTouch] (Simplified Test) Error on Tone.start():", e);
            if (localAppServices && localAppServices.showNotification) {
                localAppServices.showNotification("Audio could not be started.", "error");
            }
            // Do not set isAudioUnlocked = true if Tone.start() fails
        }
    } else {
        // If context is already running, we can consider it unlocked for this test's purpose
        isAudioUnlocked = true;
        console.log("[EventHandlers playSilentBufferOnTouch] (Simplified Test) AudioContext already running. Considered unlocked.");
        // Remove listeners as well if already running
        document.removeEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
        document.removeEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
        document.removeEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });
    }
};
// --- END TEMPORARY SIMPLIFIED AUDIO UNLOCK ---

export function initializePrimaryEventListeners() {
    // Attach audio unlock listeners (will be removed after first success)
    document.addEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });

    document.addEventListener('keydown', handleGlobalKeyDown);

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
        setupStartMenuItems(startMenuEl);
    } else {
        console.error("[EventHandlers initializePrimaryEventListeners] StartMenuButton or StartMenuEl NOT FOUND.");
    }

    const topTaskbarPlayBtn = localAppServices.uiElementsCache?.playBtn;
    const topTaskbarStopBtn = localAppServices.uiElementsCache?.stopBtn;
    const topTaskbarRecordBtn = localAppServices.uiElementsCache?.recordBtn;

    if (topTaskbarPlayBtn && localAppServices.togglePlayback) {
        topTaskbarPlayBtn.addEventListener('click', () => localAppServices.togglePlayback());
    }
    if (topTaskbarStopBtn && localAppServices.stopPlayback) {
        topTaskbarStopBtn.addEventListener('click', () => localAppServices.stopPlayback());
    }
    if (topTaskbarRecordBtn && localAppServices.toggleRecording) {
        topTaskbarRecordBtn.addEventListener('click', () => localAppServices.toggleRecording());
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
    // ... (content as before)
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
            localAppServices.setPlaybackMode(newMode);
        });
    } else console.warn("[EventHandlers GCW] playbackModeToggleBtnGlobal or required services not found.");

    if (midiInputSelectGlobal && localAppServices.selectMIDIInput) {
        midiInputSelectGlobal.addEventListener('change', (e) => localAppServices.selectMIDIInput(e.target.value));
    } else console.warn("[EventHandlers GCW] midiInputSelectGlobal or selectMIDIInput service not found.");
}

function handleGlobalKeyDown(event) {
    // ... (content as before) ...
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
                track.playNote(midiNote, 1.0, Tone.now(), '8n');
                if (localAppServices.uiElementsCache?.keyboardIndicatorGlobal) {
                    localAppServices.uiElementsCache.keyboardIndicatorGlobal.classList.add('active');
                    setTimeout(() => localAppServices.uiElementsCache.keyboardIndicatorGlobal.classList.remove('active'), 150);
                }
            }
        }
    }
}

export async function setupMIDI() {
    // ... (content as before) ...
    if (!localAppServices.getMidiAccess || !localAppServices.setMidiAccessState || !localAppServices.setActiveMIDIInput || !localAppServices.selectMIDIInput) {
        console.warn("[EventHandlers setupMIDI] Core MIDI services not available in localAppServices.");
        return;
    }

    const selector = localAppServices.uiElementsCache?.midiInputSelectGlobal;
    if (!selector) {
        console.warn("[EventHandlers setupMIDI] MIDI input selector UI element not found in cache. MIDI setup will be incomplete until GlobalControls window is ready.");
        return;
    }

    if (navigator.requestMIDIAccess) {
        try {
            const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            localAppServices.setMidiAccessState(midiAccess);
            populateMIDIInputSelector(midiAccess);
            midiAccess.onstatechange = (e) => {
                console.log("[EventHandlers MIDI] MIDI state changed:", e.port.name, e.port.state);
                populateMIDIInputSelector(localAppServices.getMidiAccess());
                const activeInput = localAppServices.getActiveMIDIInput();
                if (activeInput && activeInput !== 'none' && activeInput !== 'computerKeyboard') {
                    let stillConnected = false;
                    const currentMidiAccess = localAppServices.getMidiAccess();
                    if (currentMidiAccess) {
                        currentMidiAccess.inputs.forEach(input => { if (input.id === activeInput) stillConnected = true; });
                    }
                    if (!stillConnected) {
                        console.log(`[EventHandlers MIDI] Active MIDI input "${activeInput}" disconnected. Resetting.`);
                        if(localAppServices.selectMIDIInput) localAppServices.selectMIDIInput('none');
                    }
                }
            };
        } catch (error) {
            console.warn("[EventHandlers setupMIDI] MIDI Access request failed:", error);
            if (localAppServices.showNotification) localAppServices.showNotification("Could not access MIDI devices. " + error.message, "warning");
            populateMIDIInputSelector(null);
        }
    } else {
        console.warn("[EventHandlers setupMIDI] Web MIDI API not supported in this browser.");
        if (localAppServices.showNotification) localAppServices.showNotification("Web MIDI API not supported. Using computer keyboard only.", "info");
        populateMIDIInputSelector(null);
    }
}
function populateMIDIInputSelector(midiAccess) {
    // ... (content as before) ...
    const selector = localAppServices.uiElementsCache?.midiInputSelectGlobal;
    if (!selector) {
        return;
    }
    const previouslySelected = localAppServices.getActiveMIDIInput ? localAppServices.getActiveMIDIInput() : selector.value;
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

    let valueToSet = "computerKeyboard";
    if (previouslySelected && Array.from(selector.options).some(opt => opt.value === previouslySelected)) {
        valueToSet = previouslySelected;
    } else if (midiAccess && midiAccess.inputs.size > 0) {
        valueToSet = midiAccess.inputs.values().next().value.id;
    }
    selector.value = valueToSet;

    if (localAppServices.selectMIDIInput && selector.value !== (localAppServices.getActiveMIDIInput ? localAppServices.getActiveMIDIInput() : null)) {
         localAppServices.selectMIDIInput(selector.value);
    } else if (localAppServices.getActiveMIDIInput && !localAppServices.getActiveMIDIInput() && localAppServices.selectMIDIInput) {
        localAppServices.selectMIDIInput(selector.value);
    }
}
export function selectMIDIInput(deviceId) {
    // ... (content as before) ...
    if (!localAppServices.setActiveMIDIInput || !localAppServices.getMidiAccess || !localAppServices.getActiveMIDIInput) {
        console.warn("[EventHandlers selectMIDIInput] Core MIDI services not available for input selection.");
        return;
    }
    const midiAccess = localAppServices.getMidiAccess();
    const currentActiveInputId = localAppServices.getActiveMIDIInput();

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
                if (localAppServices.showNotification) localAppServices.showNotification(`MIDI Input: ${input.name}`, "info");
            }
        });
    } else if (deviceId === 'computerKeyboard') {
        if (localAppServices.showNotification) localAppServices.showNotification("MIDI Input: Computer Keyboard", "info");
    } else {
        if (localAppServices.showNotification) localAppServices.showNotification("MIDI Input: None", "info");
    }
    const selector = localAppServices.uiElementsCache?.midiInputSelectGlobal;
    if (selector && selector.value !== deviceId) {
        selector.value = deviceId;
    }
}

function handleMIDIMessage(message) {
    // ... (content as before) ...
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
            if (command === 9 && velocity > 0) {
                track.playNote(note, velocity / 127, Tone.now());
            } else if (command === 8 || (command === 9 && velocity === 0)) {
                track.stopNote(note, Tone.now() + 0.05);
            }
        }
    }
}

// ... (handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack, handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer, toggleFullScreen, handleTimelineLaneDrop as before) ...
export function handleTrackMute(trackId) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (track && track.setMute) {
        if (localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Toggle Mute for ${track.name}`);
        track.setMute(!track.isMuted);
        if(localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
        if(localAppServices.renderTimeline) localAppServices.renderTimeline();
    }
}
export function handleTrackSolo(trackId) {
    if (localAppServices.setSoloedTrackId) {
        const trackForUndoName = localAppServices.getTrackById(trackId)?.name || `Track ${trackId}`;
        if (localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Toggle Solo for ${trackForUndoName}`);
        localAppServices.setSoloedTrackId(trackId);
    }
}
export function handleTrackArm(trackId) {
    if (localAppServices.setArmedTrackId) {
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
                 samplePurpose = 'Slicer';
            } else if (targetTrack.type === 'DrumSampler') {
                samplePurpose = 'DrumPad';
                const firstEmptyPad = targetTrack.drumSamplerPads?.findIndex(p => !p.sampleId);
                context = { padIndex: firstEmptyPad !== -1 ? firstEmptyPad : 0 };
            } else if (targetTrack.type === 'InstrumentSampler') {
                samplePurpose = 'Instrument';
            }

            if (targetTrack.type === 'Audio' && typeof targetTrack.addSoundBrowserItemAsClip === 'function') {
                await targetTrack.addSoundBrowserItemAsClip(droppedItemData, startTime);
            } else if (['Sampler', 'DrumSampler', 'InstrumentSampler'].includes(targetTrack.type) && typeof targetTrack.loadSampleFromBrowser === 'function'){
                await targetTrack.loadSampleFromBrowser(droppedItemData, samplePurpose, context);
            } else if (typeof targetTrack.loadSample === 'function') {
                 const loadedZips = localAppServices.getLoadedZipFilesState ? localAppServices.getLoadedZipFilesState() : {};
                 const zipInstance = loadedZips[droppedItemData.libraryName];
                 if (zipInstance && zipInstance !== "loading" && zipInstance !== "error") {
                     const fileEntry = zipInstance.file(droppedItemData.fullPath);
                     if (fileEntry) {
                         const blob = await fileEntry.async('blob');
                         const audioFile = new File([blob], droppedItemData.fileName, { type: blob.type || localAppServices.getMimeTypeFromFilename(droppedItemData.fileName) });
                         await targetTrack.loadSample(audioFile, samplePurpose, context);
                     } else {
                          services.showNotification(`File ${droppedItemData.fileName} not found in library for drop.`, "error"); return;
                     }
                 } else {
                     services.showNotification(`Library ${droppedItemData.libraryName} not ready for drop.`, "warning"); return;
                 }
            }
            else {
                console.error(`Track ${targetTrackId} (type ${targetTrack.type}) cannot load samples for targetType ${samplePurpose}.`);
                services.showNotification(`Error loading sample to track. Incompatible type or method missing.`, "error");
                return;
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
