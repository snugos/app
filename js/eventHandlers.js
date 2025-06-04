// js/eventHandlers.js - Global Event Listeners and Input Handling Module

import * as Constants from './constants.js';
// Utils are used directly, or their functions are on appServices
import { showNotification, showConfirmationDialog, createContextMenu } from './utils.js';
// No direct state imports here; all state access should be via localAppServices

let localAppServices = {}; // Populated by initializeEventHandlersModule
let isAudioUnlocked = false;

// --- SIMPLIFIED AUDIO UNLOCK ---
const playSilentBufferOnTouch = async () => {
    if (isAudioUnlocked || typeof Tone === 'undefined') {
        return;
    }
    if (Tone.context.state !== 'running') {
        try {
            await Tone.start();
            isAudioUnlocked = true;
            console.log("[EventHandlers playSilentBufferOnTouch] (Simplified) Tone.start() called successfully. Audio unlocked.");
            document.removeEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
            document.removeEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
            document.removeEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });
        } catch (e) {
            console.error("[EventHandlers playSilentBufferOnTouch] (Simplified) Error on Tone.start():", e);
            const notify = localAppServices.showNotification || showNotification;
            notify("Audio could not be started. Please try interacting again.", "error");
        }
    } else {
        isAudioUnlocked = true;
        console.log("[EventHandlers playSilentBufferOnTouch] (Simplified) AudioContext already running. Considered unlocked.");
        document.removeEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
        document.removeEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
        document.removeEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });
    }
};
// --- END SIMPLIFIED AUDIO UNLOCK ---

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    // console.log("[EventHandlers Init] Module initialized. localAppServices keys:", Object.keys(localAppServices).length);
}

export let currentlyPressedComputerKeys = {};
let currentOctaveShift = 0;
const MIN_OCTAVE_SHIFT = -2;
const MAX_OCTAVE_SHIFT = 2;

export function initializePrimaryEventListeners() { // Removed appContext, will use module-scoped localAppServices
    const services = localAppServices; // Use module-scoped localAppServices
    const uiCache = services.uiElementsCache || {};

    document.addEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });

    document.addEventListener('keydown', (e) => handleGlobalKeyDown(e, services));

    const startButton = uiCache.startMenuButton;
    const startMenuEl = uiCache.startMenu;

    if (startButton && startMenuEl) {
        startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            startMenuEl.classList.toggle('hidden');
        });
        document.addEventListener('click', (event) => {
            if (!startMenuEl.classList.contains('hidden') && !startMenuEl.contains(event.target) && event.target !== startButton) {
                startMenuEl.classList.add('hidden');
            }
        });
        setupStartMenuItems(startMenuEl, services);
    } else {
        console.warn('[EventHandlers initializePrimaryEventListeners] StartButton or StartMenu element not found in uiCache.');
    }
    
    const topPlayBtn = uiCache.playBtn;
    const topStopBtn = uiCache.stopBtn;
    const topRecordBtn = uiCache.recordBtn;

    if (topPlayBtn && services.togglePlayback) {
        topPlayBtn.addEventListener('click', () => services.togglePlayback());
    }
    if (topStopBtn && services.stopPlayback) {
        topStopBtn.addEventListener('click', () => services.stopPlayback());
    }
    if (topRecordBtn && services.toggleRecording) {
        topRecordBtn.addEventListener('click', () => services.toggleRecording());
    }
}

function setupStartMenuItems(startMenuEl, services) {
    const uiCache = services.uiElementsCache || {};
    // console.log("[EventHandlers setupStartMenuItems] Setting up. Services.addTrack available:", !!services.addTrack);

    // Menu items from your index.html
    const menuActions = {
        menuNewProject: () => services.newProject?.(),
        menuAddSynthTrack: () => { console.log("Menu: Add Synth Track clicked"); services.addTrack?.('Synth', { _isUserActionPlaceholder: true }); },
        menuAddSamplerTrack: () => { console.log("Menu: Add Slicer Sampler Track clicked"); services.addTrack?.('Sampler', { _isUserActionPlaceholder: true }); },
        menuAddDrumSamplerTrack: () => { console.log("Menu: Add Sampler (Pads) clicked"); services.addTrack?.('DrumSampler', { _isUserActionPlaceholder: true }); },
        menuAddInstrumentSamplerTrack: () => { console.log("Menu: Add Instrument Sampler Track clicked"); services.addTrack?.('InstrumentSampler', { _isUserActionPlaceholder: true }); },
        menuAddAudioTrack: () => { console.log("Menu: Add Audio Track clicked"); services.addTrack?.('Audio', { _isUserActionPlaceholder: true }); },
        menuOpenSoundBrowser: () => services.openSoundBrowserWindow?.(),
        menuOpenTimeline: () => services.openArrangementWindow?.(),
        menuOpenGlobalControls: () => services.openGlobalControlsWindow?.(),
        menuOpenMixer: () => services.openMixerWindow?.(),
        menuOpenMasterEffects: () => services.openMasterEffectsRackWindow?.(),
        menuUndo: () => services.undo?.(),
        menuRedo: () => services.redo?.(),
        menuSaveProject: () => services.saveProject?.(),
        menuLoadProject: () => services.loadProject?.(),
        menuExportWav: () => services.exportToWav?.(),
        menuToggleFullScreen: toggleFullScreen,
    };

    for (const menuItemId in menuActions) {
        const menuItemElement = uiCache[menuItemId] || document.getElementById(menuItemId);
        if (menuItemElement) {
            const newElement = menuItemElement.cloneNode(true); // Prevents multiple listeners on HMR
            menuItemElement.parentNode.replaceChild(newElement, menuItemElement);
            if (uiCache[menuItemId]) uiCache[menuItemId] = newElement; // Update cache reference

            newElement.addEventListener('click', () => {
                if (typeof menuActions[menuItemId] === 'function') {
                    try {
                        menuActions[menuItemId]();
                    } catch (e) { console.error(`Error executing action for menu item ${menuItemId}:`, e); }
                }
                if (startMenuEl) startMenuEl.classList.add('hidden');
            });
        }
    }
}

export function attachGlobalControlEvents(elements) {
    const services = localAppServices;
    // ... (rest of function from your eventhandlers.js, using `services` for appServices calls) ...
    // Ensure togglePlayback, panicStopAllAudio, toggleRecording, etc. use `services.FUNCTION_NAME`
    if (!elements) {
        console.error("[EventHandlers attachGlobalControlEvents] Elements object is null or undefined.");
        return;
    }
    const { playBtnGlobal, recordBtnGlobal, stopBtnGlobal, tempoGlobalInput, midiInputSelectGlobal, playbackModeToggleBtnGlobal } = elements;

    if (playBtnGlobal && services.togglePlayback) { // togglePlayback is now on AudioModule, accessed via appServices
        playBtnGlobal.addEventListener('click', () => services.togglePlayback());
    } else { console.warn("[EventHandlers] playBtnGlobal not found or togglePlayback service missing."); }

    if (stopBtnGlobal && services.panicStopAllAudio) { // panicStopAllAudio is on appServices from main.js
        stopBtnGlobal.addEventListener('click', () => services.panicStopAllAudio());
    } else { console.warn("[EventHandlers] stopBtnGlobal not found or panicStopAllAudio service missing."); }

    if (recordBtnGlobal && services.toggleRecording) { // toggleRecording is on AudioModule, accessed via appServices
        recordBtnGlobal.addEventListener('click', () => services.toggleRecording());
    } else { console.warn("[EventHandlers] recordBtnGlobal not found or toggleRecording service missing."); }
    
    if (tempoGlobalInput) {
        if (typeof Tone !== 'undefined' && Tone.Transport) {
             tempoGlobalInput.value = Tone.Transport.bpm.value.toFixed(1);
        }
        tempoGlobalInput.addEventListener('input', (e) => {
            const newTempo = parseFloat(e.target.value);
            if (!isNaN(newTempo) && newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) {
                if (typeof Tone !== 'undefined' && Tone.Transport) Tone.Transport.bpm.value = newTempo;
                if (services.updateTaskbarTempoDisplay) services.updateTaskbarTempoDisplay(newTempo);
            }
        });
        tempoGlobalInput.addEventListener('change', () => { 
            if (services.captureStateForUndoInternal) {
                services.captureStateForUndoInternal(`Set Tempo to ${Tone.Transport.bpm.value.toFixed(1)}`);
            }
        });
    } else { console.warn("[EventHandlers] tempoGlobalInput not found."); }

    if (midiInputSelectGlobal && services.selectMIDIInput) {
        midiInputSelectGlobal.addEventListener('change', (e) => services.selectMIDIInput(e.target.value));
    } else { console.warn("[EventHandlers] midiInputSelectGlobal or service missing."); }

    if (playbackModeToggleBtnGlobal) {
        const getMode = services.getPlaybackMode; 
        const setMode = services.setPlaybackMode;
        if (getMode && setMode) {
            const currentMode = getMode();
            playbackModeToggleBtnGlobal.textContent = currentMode === 'timeline' ? 'Mode: Timeline' : 'Mode: Sequencer';
            playbackModeToggleBtnGlobal.addEventListener('click', () => {
                const oldMode = getMode();
                const newMode = oldMode === 'sequencer' ? 'timeline' : 'sequencer';
                setMode(newMode); 
            });
        } else { console.warn("[EventHandlers] Playback mode services missing."); }
    } else { console.warn("[EventHandlers] playbackModeToggleBtnGlobal not found."); }
}

function handleGlobalKeyDown(event, services) { // services is localAppServices
    const uiCache = services.uiElementsCache || {};
    // ... (rest of handleGlobalKeyDown from your eventhandlers.js, using `services`)
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        if (event.key === "Escape") activeEl.blur();
        return;
    }

    const key = event.key.toLowerCase();
    const ctrlOrMeta = event.ctrlKey || event.metaKey;

    if (key === ' ' && !(activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA'))) {
        event.preventDefault();
        if (services.togglePlayback) services.togglePlayback();
    } else if (key === 'enter' && Tone.Transport.state === 'started') {
        if (services.stopPlayback) services.stopPlayback();
    } else if (key === 'r' && !ctrlOrMeta) {
        if (services.toggleRecording) services.toggleRecording();
    } else if (key === 'z' && ctrlOrMeta && !event.shiftKey) {
        event.preventDefault(); if (services.undo) services.undo();
    } else if ((key === 'y' && ctrlOrMeta) || (key === 'z' && ctrlOrMeta && event.shiftKey)) {
        event.preventDefault(); if (services.redo) services.redo();
    } else if (key === 's' && ctrlOrMeta) {
        event.preventDefault(); if (services.saveProject) services.saveProject();
    } else if (key === 'o' && ctrlOrMeta) {
        event.preventDefault(); if (services.loadProject) services.loadProject();
    }
     else if (key === '.' && (event.ctrlKey || event.metaKey)) { // Ctrl+. or Cmd+. for panic
        event.preventDefault();
        if (services.panicStopAllAudio) services.panicStopAllAudio();
    }


    const getArmedTrackIdFn = services.getArmedTrackId;
    const getActiveMIDIInputFn = services.getActiveMIDIInput;
    const getTrackByIdFn = services.getTrackById;

    const armedTrackId = getArmedTrackIdFn ? getArmedTrackIdFn() : null;
    const activeMIDIInput = getActiveMIDIInputFn ? getActiveMIDIInputFn() : 'none';

    if (armedTrackId && (activeMIDIInput === 'computerKeyboard' || activeMIDIInput === 'none' || !activeMIDIInput)) {
        const track = getTrackByIdFn ? getTrackByIdFn(armedTrackId) : null;
        if (track && typeof track.playNote === 'function' && typeof Tone !== 'undefined') {
            let midiNote = Constants.computerKeySynthMap[event.key]; 
            if (midiNote === undefined && Constants.computerKeySynthMap[key]) {
                midiNote = Constants.computerKeySynthMap[key];
            }

            if (midiNote !== undefined && !currentlyPressedComputerKeys[midiNote]) {
                event.preventDefault();
                const finalNote = midiNote + (currentOctaveShift * 12);
                if (finalNote >= 0 && finalNote <= 127) {
                    const freq = Tone.Frequency(finalNote, "midi").toNote();
                    track.playNote(freq, Tone.now(), 0.7); 
                    currentlyPressedComputerKeys[midiNote] = true; 
                    if (uiCache.keyboardIndicatorGlobal) {
                        uiCache.keyboardIndicatorGlobal.classList.add('active');
                        setTimeout(() => { if(uiCache.keyboardIndicatorGlobal) uiCache.keyboardIndicatorGlobal.classList.remove('active'); }, 150);
                    }
                }
            }
        }
    }
}

// Keyup listener for computer keyboard MIDI - uses localAppServices
document.addEventListener('keyup', (event) => {
    const services = localAppServices;
    const uiCache = services.uiElementsCache || {};
    const getArmedTrackIdFn = services.getArmedTrackId;
    const getTrackByIdFn = services.getTrackById;
    const key = event.key.toLowerCase();
    if (uiCache.keyboardIndicatorGlobal) uiCache.keyboardIndicatorGlobal.classList.remove('active');
    const armedTrackId = getArmedTrackIdFn ? getArmedTrackIdFn() : null;
    if (armedTrackId) {
        const track = getTrackByIdFn ? getTrackByIdFn(armedTrackId) : null;
        if (track && typeof track.stopNote === 'function' && typeof Tone !== 'undefined') {
            let midiNote = Constants.computerKeySynthMap[event.key];
            if (midiNote === undefined && Constants.computerKeySynthMap[key]) midiNote = Constants.computerKeySynthMap[key];
            if (midiNote !== undefined && currentlyPressedComputerKeys[midiNote]) {
                const finalNote = midiNote + (currentOctaveShift * 12);
                 if (finalNote >= 0 && finalNote <= 127) {
                    const freq = Tone.Frequency(finalNote, "midi").toNote();
                    track.stopNote(freq, Tone.now());
                }
                delete currentlyPressedComputerKeys[midiNote];
            }
        }
    }
});

export async function setupMIDI() {
    const services = localAppServices; // Use module-scoped services
    // Check against the exact names assigned in main.js appServices
    if (!services.getMidiAccess || !services.setMidiAccessState || 
        !services.setActiveMIDIInput || !services.selectMIDIInput) {
        console.warn("[EventHandlers setupMIDI] Core MIDI services not available in localAppServices. Needed: getMidiAccess, setMidiAccessState, setActiveMIDIInput, selectMIDIInput");
        return;
    }
    const uiCache = services.uiElementsCache || {};
    const selector = uiCache.midiInputSelectGlobal;
    if (!selector) {
        console.warn("[EventHandlers setupMIDI] MIDI input selector UI element not found in cache.");
        return;
    }

    if (navigator.requestMIDIAccess) {
        try {
            const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            services.setMidiAccessState(midiAccess); // Uses appServices function that calls State
            populateMIDIInputSelector(midiAccess, services);
            midiAccess.onstatechange = (e) => {
                populateMIDIInputSelector(services.getMidiAccess(), services); // Use getter from appServices
                const activeInput = services.getActiveMIDIInput ? services.getActiveMIDIInput() : null; // Use getter
                const activeInputId = activeInput?.id || activeInput; // Handle if activeInput is string or object

                if (activeInputId && activeInputId !== 'none' && activeInputId !== 'computerKeyboard') {
                    if (e.port.id === activeInputId && e.port.state === 'disconnected') {
                        services.selectMIDIInput('none');
                        if (services.showNotification) services.showNotification(`MIDI Device "${e.port.name}" disconnected.`, "warning");
                    }
                }
                 if (e.port.type === "input" && e.port.state === "connected") {
                     if (services.showNotification) services.showNotification(`MIDI Device "${e.port.name}" connected. Re-select if needed.`, "info");
                }
            };
        } catch (error) { /* ... */ }
    } else { /* ... */ }
}

function populateMIDIInputSelector(midiAccess, services) { // services is localAppServices
    const uiCache = services.uiElementsCache || {};
    const selector = uiCache.midiInputSelectGlobal;
    if (!selector) return;

    const getActiveMIDIInputFn = services.getActiveMIDIInput;
    const previouslySelected = getActiveMIDIInputFn ? (getActiveMIDIInputFn()?.id || getActiveMIDIInputFn()) : selector.value;
    
    selector.innerHTML = '';
    selector.add(new Option("None", "none"));
    selector.add(new Option("Computer Keyboard", "computerKeyboard"));

    if (midiAccess && midiAccess.inputs.size > 0) {
        midiAccess.inputs.forEach(input => selector.add(new Option(input.name, input.id)));
    }

    let valueToSet = "computerKeyboard";
    if (previouslySelected && Array.from(selector.options).some(opt => opt.value === previouslySelected)) {
        valueToSet = previouslySelected;
    } else if (midiAccess && midiAccess.inputs.size > 0) {
        valueToSet = midiAccess.inputs.values().next().value.id;
    }
    selector.value = valueToSet;

    const currentActiveInputObj = getActiveMIDIInputFn ? getActiveMIDIInputFn() : null;
    const currentActiveInputId = currentActiveInputObj?.id || currentActiveInputObj;

    if (services.selectMIDIInput && selector.value !== currentActiveInputId) {
         services.selectMIDIInput(selector.value, true); // true for silent initial selection
    }
}

export function selectMIDIInput(deviceId, silent = false) {
    const services = localAppServices;
    if (!services.setActiveMIDIInput || !services.getMidiAccess || !services.getActiveMIDIInput) return;

    const midiAccess = services.getMidiAccess(); // This gets the MIDI Access object from state via appServices
    const currentActiveInput = services.getActiveMIDIInput(); // This gets the currently stored active MIDIInputDevice object or ID string

    // Detach from previously active port object if it exists and is a MIDIInputMap entry
    if (currentActiveInput && typeof currentActiveInput.id !== 'undefined' && currentActiveInput.id !== 'computerKeyboard' && currentActiveInput.id !== 'none') {
        if (midiAccess && midiAccess.inputs.has(currentActiveInput.id)) {
            const portToClose = midiAccess.inputs.get(currentActiveInput.id);
            if (portToClose) portToClose.onmidimessage = null;
            // Do not call port.close() here, as it can prevent reconnection.
        }
    }
    
    if (deviceId && deviceId !== 'none' && deviceId !== 'computerKeyboard' && midiAccess) {
        const inputToSelect = midiAccess.inputs.get(deviceId);
        if (inputToSelect) {
            inputToSelect.open().then((port) => { // Port is MIDIInput
                port.onmidimessage = (msg) => handleMIDIMessage(msg, services);
                services.setActiveMIDIInput(port); // Store the full MIDIInput object in state
                if (!silent && services.showNotification) services.showNotification(`MIDI Input: ${port.name}`, "info");
            }).catch(err => {
                if (!silent && services.showNotification) services.showNotification(`Error opening MIDI port ${inputToSelect.name}.`, "error");
                services.setActiveMIDIInput(null); 
            });
        } else {
            services.setActiveMIDIInput(null);
            if (!silent && services.showNotification) services.showNotification("Selected MIDI input not found.", "warning");
        }
    } else { // "none" or "computerKeyboard"
        services.setActiveMIDIInput(deviceId === 'computerKeyboard' ? 'computerKeyboard' : null); // Store string or null
        if (!silent && services.showNotification) {
            if (deviceId === 'computerKeyboard') services.showNotification("MIDI Input: Computer Keyboard", "info");
            else services.showNotification("MIDI Input: None", "info");
        }
    }
}

// --- Track Control Handlers (called by UI, use localAppServices) ---
export function handleTrackMute(trackId) {
    const track = localAppServices.getTrackById(trackId);
    if (track) {
        localAppServices.captureStateForUndoInternal(`Toggle Mute for ${track.name}`);
        track.setMute(!track.isMuted);
        if(localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
        if(localAppServices.renderTimeline) localAppServices.renderTimeline();
    }
}
export function handleTrackSolo(trackId) {
    const track = localAppServices.getTrackById(trackId);
    if (track) {
        localAppServices.captureStateForUndoInternal(`Toggle Solo for ${track.name}`);
        localAppServices.setSoloedTrackId(trackId);
    }
}
export function handleTrackArm(trackId) {
    const track = localAppServices.getTrackById(trackId);
    if (track) {
        localAppServices.captureStateForUndoInternal(`Arm track ${track.name}`); // Or disarm
        localAppServices.setArmedTrackId(trackId);
    }
}
export function handleRemoveTrack(trackId) {
    const track = localAppServices.getTrackById(trackId);
    if (track) {
        localAppServices.showConfirmationDialog(`Are you sure you want to delete track "${track.name}"? This can be undone.`, () => {
            localAppServices.removeTrack(trackId);
        });
    }
}
export function handleOpenTrackInspector(trackId) {
    if (localAppServices.openTrackInspectorWindow) localAppServices.openTrackInspectorWindow(trackId);
}
export function handleOpenEffectsRack(trackId) {
    if (localAppServices.openTrackEffectsRackWindow) localAppServices.openTrackEffectsRackWindow(trackId);
}
export function handleOpenSequencer(trackId) {
    if (localAppServices.openSequencerWindow) localAppServices.openSequencerWindow(trackId);
}
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            (localAppServices.showNotification || showNotification)(`Error enabling full-screen: ${err.message}`, "warning");
        });
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}
export async function handleTimelineLaneDrop(event, targetTrackId, startTime) {
    const services = localAppServices;
    // ... (rest of the logic from your eventhandlers.js, using `services`)
    if (!services.getTrackById || !services.showNotification) {
        console.error("[EventHandlers handleTimelineLaneDrop] Core services missing for drop handling.");
        return;
    }
    const targetTrack = services.getTrackById(targetTrackId);
    if (!targetTrack) {
        services.showNotification("Target track not found for drop.", "warning");
        return;
    }
    const jsonDataString = event.dataTransfer.getData('application/json');
    const files = event.dataTransfer.files;
    try {
        if (jsonDataString) {
            const droppedData = JSON.parse(jsonDataString);
            if (droppedData.type === 'sequence-timeline-drag') {
                if (targetTrack.type === 'Audio') { services.showNotification("Cannot place sequence clips on Audio tracks.", 3000); return; }
                if (typeof targetTrack.addSequenceClipToTimeline === 'function') {
                    targetTrack.addSequenceClipToTimeline(droppedData.sourceSequenceId, startTime, droppedData.clipName);
                } else { services.showNotification("Error: Track cannot accept sequence clips.", 3000); }
            } else if (droppedData.type === 'sound-browser-item') {
                if (targetTrack.type !== 'Audio') { services.showNotification("Sound browser audio files can only be dropped onto Audio Track timeline lanes.", 3000); return; }
                if (services.getAudioBlobFromSoundBrowserItem && typeof targetTrack.addExternalAudioFileAsClip === 'function') { // Ensure getAudioBlobFromSoundBrowserItem exists
                    const audioBlob = await services.getAudioBlobFromSoundBrowserItem(droppedData);
                    if (audioBlob) {
                        targetTrack.addExternalAudioFileAsClip(audioBlob, startTime, droppedData.fileName);
                    } else { services.showNotification(`Could not load audio for "${droppedData.fileName}".`, 3000); }
                } else { services.showNotification("Error: Cannot process sound browser item for timeline.", 3000); }
            } else { services.showNotification("Unrecognized item dropped on timeline.", 2000); }
        } else if (files && files.length > 0) {
            const file = files[0];
            if (targetTrack.type !== 'Audio') { services.showNotification("Audio files can only be dropped onto Audio Track timeline lanes.", 3000); return; }
            if (file.type.startsWith('audio/')) {
                if (typeof targetTrack.addExternalAudioFileAsClip === 'function') {
                    targetTrack.addExternalAudioFileAsClip(file, startTime, file.name);
                } else { services.showNotification("Error: Track cannot accept audio file clips.", 3000); }
            } else { services.showNotification("Invalid file type. Please drop an audio file.", 3000); }
        } else { console.log("[EventHandlers handleTimelineLaneDrop] No recognized data in drop event."); }
    } catch (e) {
        console.error("[EventHandlers handleTimelineLaneDrop] Error processing dropped data:", e);
        services.showNotification("Error processing dropped item.", 3000);
    }
}
