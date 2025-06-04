// js/eventHandlers.js - Global Event Listeners and Input Handling Module

import * as Constants from './constants.js';
// utils.js functions are primarily accessed via appServices after main.js sets them up
import { showNotification as utilShowNotification, createContextMenu as utilCreateContextMenu } from './utils.js'; 

let localAppServices = {};
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
            const notify = localAppServices.showNotification || utilShowNotification; // Fallback
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
    // console.log("[EventHandlers Init] Module initialized. localAppServices keys:", Object.keys(localAppServices).length > 0 ? Object.keys(localAppServices) : "EMPTY/NOT_SET_YET");
}

export let currentlyPressedComputerKeys = {};
let currentOctaveShift = 0;
const MIN_OCTAVE_SHIFT = -2;
const MAX_OCTAVE_SHIFT = 2;

export function initializePrimaryEventListeners() {
    const services = localAppServices;
    const uiCache = services.uiElementsCache || {};
    console.log('[EventHandlers initializePrimaryEventListeners] Initializing. appContext available (via localAppServices):', !!services.showNotification);
    console.log('[EventHandlers initializePrimaryEventListeners] uiCache keys available:', Object.keys(uiCache).length);

    document.addEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });

    document.addEventListener('keydown', (e) => handleGlobalKeyDown(e, services)); // Pass services

    const startButton = uiCache.startMenuButton;
    const startMenuEl = uiCache.startMenu;

    if (startButton && startMenuEl) {
        console.log("[EventHandlers initializePrimaryEventListeners] StartMenuButton and StartMenuEl FOUND in cache.");
        startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasHidden = startMenuEl.classList.contains('hidden');
            startMenuEl.classList.toggle('hidden');
            // ADDED LOG TO CONFIRM TOGGLE:
            console.log(`[EventHandlers] StartMenuButton CLICKED. Menu was hidden: ${wasHidden}, Menu now hidden: ${startMenuEl.classList.contains('hidden')}`);
            if (!startMenuEl.classList.contains('hidden')) {
                console.log("[EventHandlers] Start menu should BE VISIBLE. Computed style display:", getComputedStyle(startMenuEl).display, "Opacity:", getComputedStyle(startMenuEl).opacity);
            } else {
                console.log("[EventHandlers] Start menu should BE HIDDEN.");
            }
        });
        document.addEventListener('click', (event) => {
            if (startMenuEl && !startMenuEl.classList.contains('hidden') && !startMenuEl.contains(event.target) && event.target !== startButton) {
                startMenuEl.classList.add('hidden');
            }
        });
        
        const fileMenuUl = startMenuEl.querySelector('#fileMenu');
        if (fileMenuUl) {
            console.log("[EventHandlers initializePrimaryEventListeners] Found ul#fileMenu. Calling setupStartMenuItems.");
            setupStartMenuItems(startMenuEl, services);
        } else {
            console.warn("[EventHandlers initializePrimaryEventListeners] ul#fileMenu NOT FOUND inside startMenuEl. Start Menu items might not be set up correctly.");
        }
    } else {
        console.warn('[EventHandlers initializePrimaryEventListeners] StartButton or StartMenu element not found in uiCache.');
    }
    
    const topPlayBtn = uiCache.playBtn;
    const topStopBtn = uiCache.stopBtn;
    const topRecordBtn = uiCache.recordBtn;

    if (topPlayBtn && services.togglePlayback) topPlayBtn.addEventListener('click', () => services.togglePlayback());
    if (topStopBtn && services.stopPlayback) topStopBtn.addEventListener('click', () => services.stopPlayback());
    if (topRecordBtn && services.toggleRecording) topRecordBtn.addEventListener('click', () => services.toggleRecording());
}

function setupStartMenuItems(startMenuEl, services) {
    const uiCache = services.uiElementsCache || {};
    console.log("[EventHandlers setupStartMenuItems] Called. StartMenuEl valid:", !!startMenuEl);
    console.log("[EventHandlers setupStartMenuItems] uiCache contains 'menuAddSynthTrack':", !!(uiCache.menuAddSynthTrack));
    console.log("[EventHandlers setupStartMenuItems] services.addTrack available:", typeof services.addTrack);

    const menuActions = {
        menuNewProject: () => services.newProject?.(),
        menuAddSynthTrack: () => { console.log("Action: Add Synth Track"); services.addTrack?.('Synth'); },
        menuAddSamplerTrack: () => { console.log("Action: Add Slicer Sampler Track"); services.addTrack?.('Sampler'); },
        menuAddDrumSamplerTrack: () => { console.log("Action: Add Sampler (Pads)"); services.addTrack?.('DrumSampler'); },
        menuAddInstrumentSamplerTrack: () => { console.log("Action: Add Instrument Sampler Track"); services.addTrack?.('InstrumentSampler'); },
        menuAddAudioTrack: () => { console.log("Action: Add Audio Track"); services.addTrack?.('Audio'); },
        menuOpenSoundBrowser: () => services.openSoundBrowserWindow?.(),
        menuOpenTimeline: () => services.openArrangementWindow?.(),
        menuOpenGlobalControls: () => services.openGlobalControlsWindow?.(),
        menuOpenMixer: () => services.openMixerWindow?.(),
        menuOpenMasterEffects: () => services.openMasterEffectsRackWindow?.(),
        menuUndo: () => services.undo?.(),
        menuRedo: () => services.redo?.(),
        menuSaveProject: () => services.saveProject?.(),
        menuLoadProject: () => {
            console.log("Menu: Load Project clicked");
            const inputEl = uiCache.projectFileInput || document.getElementById('loadProjectInput'); // From your main.js caching
            if (inputEl) {
                console.log("Load project input element found, clicking.");
                inputEl.click();
            } else {
                console.error("Load project input element not found!");
                if(services.showNotification) services.showNotification("Error: Project file input not found.", "error");
            }
        },
        menuExportWav: () => services.exportToWav?.(),
        menuToggleFullScreen: toggleFullScreen,
        menuUploadBackground: () => services.triggerCustomBackgroundUpload?.(),
        menuRemoveBackground: () => services.removeCustomDesktopBackground?.(),
    };

    for (const menuItemId in menuActions) {
        const menuItemElement = uiCache[menuItemId] || startMenuEl.querySelector(`#${menuItemId}`);
        
        console.log(`[EventHandlers setupStartMenuItems] Processing: ${menuItemId}. Element in uiCache: ${!!uiCache[menuItemId]}. Element from querySelector: ${!!startMenuEl.querySelector(`#${menuItemId}`)}. Final Element: ${!!menuItemElement}`);

        if (menuItemElement) {
            const newElement = menuItemElement.cloneNode(true);
            if (menuItemElement.parentNode) {
                menuItemElement.parentNode.replaceChild(newElement, menuItemElement);
            }
            if (uiCache[menuItemId]) uiCache[menuItemId] = newElement;

            newElement.addEventListener('click', () => {
                console.log(`[EventHandlers] CLICKED Start Menu Item: ${menuItemId}`);
                if (typeof menuActions[menuItemId] === 'function') {
                    try {
                        menuActions[menuItemId]();
                    } catch (e) {
                        console.error(`Error executing action for menu item ${menuItemId}:`, e);
                        if (services.showNotification) services.showNotification(`Error with ${menuItemId}: ${e.message}`, "error");
                    }
                }
                if (startMenuEl) startMenuEl.classList.add('hidden');
            });
        } else {
            // This log was shown in your console for menuUploadBackground & menuRemoveBackground
            // It means they were NOT in uiCache from main.js, but were found by querySelector in StartMenuEl. This is OK.
            // console.warn(`[EventHandlers setupStartMenuItems] Menu item element NOT FOUND for ID: ${menuItemId}`);
        }
    }
    
    // Listener for the project file input (from your eventhandlers.js)
    const loadProjectInputEl = uiCache.projectFileInput || document.getElementById('loadProjectInput');
    if (loadProjectInputEl) {
        loadProjectInputEl.addEventListener('change', (e) => {
            if (services.handleProjectFileLoad && e.target.files && e.target.files.length > 0) {
                services.handleProjectFileLoad(e); // Pass the event object
            }
            e.target.value = null; // Reset file input
        });
    } else {
        // This log also appeared in your console, meaning the ID 'loadProjectInput' was not in uiCache initially.
        // The `main.js` from response #87 *does* cache `uiElementsCache.projectFileInput = document.getElementById('loadProjectInput');`
        // And your `index.html` from response #88 *does* have `<input type="file" id="loadProjectInput" ...>`
        // So this should ideally be found in uiCache. If not, querySelector is the fallback.
        console.warn("[EventHandlers setupStartMenuItems] Load project input element ('loadProjectInput' or 'file-input-project') not initially found in uiCache.");
    }
}

export function attachGlobalControlEvents(elements) {
    const services = localAppServices;
    if (!elements) { console.error("[EventHandlers attachGlobalControlEvents] Elements object is null."); return; }
    const { playBtnGlobal, recordBtnGlobal, stopBtnGlobal, tempoGlobalInput, midiInputSelectGlobal, playbackModeToggleBtnGlobal } = elements;
    if (playBtnGlobal && services.togglePlayback) playBtnGlobal.addEventListener('click', () => services.togglePlayback());
    if (stopBtnGlobal && services.panicStopAllAudio) stopBtnGlobal.addEventListener('click', () => services.panicStopAllAudio());
    if (recordBtnGlobal && services.toggleRecording) recordBtnGlobal.addEventListener('click', () => services.toggleRecording());
    if (tempoGlobalInput && typeof Tone !== 'undefined' && Tone.Transport) {
        tempoGlobalInput.value = Tone.Transport.bpm.value.toFixed(1);
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
    }
    if (midiInputSelectGlobal && services.selectMIDIInput) { midiInputSelectGlobal.addEventListener('change', (e) => services.selectMIDIInput(e.target.value)); }
    if (playbackModeToggleBtnGlobal && services.getPlaybackMode && services.setPlaybackMode) {
        const currentMode = services.getPlaybackMode();
        playbackModeToggleBtnGlobal.textContent = currentMode === 'timeline' ? 'Timeline Mode' : 'Sequencer Mode';
        playbackModeToggleBtnGlobal.addEventListener('click', () => {
            const oldMode = services.getPlaybackMode();
            const newMode = oldMode === 'sequencer' ? 'timeline' : 'sequencer';
            services.setPlaybackMode(newMode);
        });
    }
}

function handleGlobalKeyDown(event, services) { 
    const uiCache = services.uiElementsCache || {};
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) { if (event.key === "Escape") activeEl.blur(); return; }
    const key = event.key.toLowerCase();
    const ctrlOrMeta = event.ctrlKey || event.metaKey;
    if (key === ' ' && !(activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA'))) { event.preventDefault(); if (services.togglePlayback) services.togglePlayback(); } 
    else if (key === 'enter' && typeof Tone !== 'undefined' && Tone.Transport.state === 'started') { if (services.stopPlayback) services.stopPlayback(); } 
    else if (key === 'r' && !ctrlOrMeta) { if (services.toggleRecording) services.toggleRecording(); } 
    else if (key === 'z' && ctrlOrMeta && !event.shiftKey) { event.preventDefault(); if (services.undo) services.undo(); } 
    else if ((key === 'y' && ctrlOrMeta) || (key === 'z' && ctrlOrMeta && event.shiftKey)) { event.preventDefault(); if (services.redo) services.redo(); } 
    else if (key === 's' && ctrlOrMeta) { event.preventDefault(); if (services.saveProject) services.saveProject(); } 
    else if (key === 'o' && ctrlOrMeta) { event.preventDefault(); if (services.loadProject) { const inputEl = uiCache.projectFileInput || document.getElementById('loadProjectInput'); if(inputEl) inputEl.click(); } }
    else if (key === '.' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); if (services.panicStopAllAudio) services.panicStopAllAudio(); }
    else if (key === 'arrowleft' && (event.ctrlKey || event.metaKey) && !(activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA'))) {
        event.preventDefault(); if(typeof Tone !== 'undefined' && Tone.Transport.state === 'started') { Tone.Transport.rewind(Constants.STEPS_PER_BAR * Tone.Time('16n').toSeconds()); }
    } else if (key === 'arrowright' && (event.ctrlKey || event.metaKey) && !(activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA'))) {
        event.preventDefault(); if(typeof Tone !== 'undefined' && Tone.Transport.state === 'started') { Tone.Transport.fastForward(Constants.STEPS_PER_BAR * Tone.Time('16n').toSeconds()); }
    }


    const armedTrackId = services.getArmedTrackId ? services.getArmedTrackId() : null;
    const activeMIDIInput = services.getActiveMIDIInput ? services.getActiveMIDIInput() : 'none';
    if (armedTrackId && (activeMIDIInput === 'computerKeyboard' || activeMIDIInput === 'none' || !activeMIDIInput)) {
        const track = services.getTrackById ? services.getTrackById(armedTrackId) : null;
        if (track && typeof track.playNote === 'function' && typeof Tone !== 'undefined') {
            let midiNote = Constants.computerKeySynthMap[event.key]; 
            if (midiNote === undefined && Constants.computerKeySynthMap[key]) midiNote = Constants.computerKeySynthMap[key];
            if (midiNote !== undefined && !currentlyPressedComputerKeys[midiNote]) {
                event.preventDefault();
                const finalNote = midiNote + (currentOctaveShift * 12);
                if (finalNote >=0 && finalNote <= 127) {
                    const freq = Tone.Frequency(finalNote, "midi").toNote();
                    track.playNote(freq, Tone.now(), 0.7); 
                    currentlyPressedComputerKeys[midiNote] = true; 
                    if (uiCache.keyboardIndicatorGlobal) { uiCache.keyboardIndicatorGlobal.classList.add('active'); setTimeout(() => { if(uiCache.keyboardIndicatorGlobal) uiCache.keyboardIndicatorGlobal.classList.remove('active'); }, 150); }
                }
            }
        }
    }
}

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
                 if (finalNote >=0 && finalNote <= 127) {
                    const freq = Tone.Frequency(finalNote, "midi").toNote();
                    track.stopNote(freq, Tone.now());
                }
                delete currentlyPressedComputerKeys[midiNote];
            }
        }
    }
});

export async function setupMIDI() {
    const services = localAppServices;
    if (!services.getMidiAccess || !services.setMidiAccessState || 
        !services.setActiveMIDIInput || !services.selectMIDIInput) {
        console.warn("[EventHandlers setupMIDI] Core MIDI services not available in localAppServices.");
        return;
    }
    const uiCache = services.uiElementsCache || {};
    const selector = uiCache.midiInputSelectGlobal;
    if (!selector) { console.warn("[EventHandlers setupMIDI] MIDI input selector UI element not found in cache."); return; }

    if (navigator.requestMIDIAccess) {
        try {
            const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            services.setMidiAccessState(midiAccess);
            populateMIDIInputSelector(midiAccess, services);
            midiAccess.onstatechange = (e) => {
                populateMIDIInputSelector(services.getMidiAccess(), services);
                const activeInput = services.getActiveMIDIInput ? services.getActiveMIDIInput() : null;
                const activeInputId = activeInput?.id || activeInput;
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
        } catch (error) { 
            console.warn("[EventHandlers setupMIDI] MIDI Access request failed:", error);
            if (services.showNotification) services.showNotification("Could not access MIDI devices.", "warning");
            populateMIDIInputSelector(null, services);
        }
    } else { 
        console.warn("[EventHandlers setupMIDI] Web MIDI API not supported.");
        if (services.showNotification) services.showNotification("Web MIDI API not supported.", "info");
        populateMIDIInputSelector(null, services);
    }
}

function populateMIDIInputSelector(midiAccess, services) {
    const uiCache = services.uiElementsCache || {};
    const selector = uiCache.midiInputSelectGlobal;
    if (!selector) return;
    const getActiveMIDIInputFn = services.getActiveMIDIInput;
    const currentActiveInput = getActiveMIDIInputFn ? getActiveMIDIInputFn() : null;
    const previouslySelectedId = currentActiveInput?.id || currentActiveInput || selector.value; // Handles both object and string
    
    selector.innerHTML = '';
    selector.add(new Option("None", "none"));
    selector.add(new Option("Computer Keyboard", "computerKeyboard"));

    if (midiAccess && midiAccess.inputs.size > 0) {
        midiAccess.inputs.forEach(input => selector.add(new Option(input.name, input.id)));
    }

    let valueToSet = "computerKeyboard";
    if (previouslySelectedId && Array.from(selector.options).some(opt => opt.value === previouslySelectedId)) {
        valueToSet = previouslySelectedId;
    } else if (midiAccess && midiAccess.inputs.size > 0) {
        valueToSet = midiAccess.inputs.values().next().value.id;
    }
    selector.value = valueToSet;
    if (services.selectMIDIInput && selector.value !== currentActiveInputId) { // Use currentActiveInputId for comparison
         services.selectMIDIInput(selector.value, true);
    }
}

export function selectMIDIInput(deviceId, silent = false) {
    const services = localAppServices;
    if (!services.setActiveMIDIInput || !services.getMidiAccess || !services.getActiveMIDIInput) return;
    const midiAccess = services.getMidiAccess();
    const currentActiveInput = services.getActiveMIDIInput(); // This is the MIDIInput object or string 'computerKeyboard'/null
    const currentActiveInputId = currentActiveInput?.id || currentActiveInput;

    if (currentActiveInput && typeof currentActiveInput.id !== 'undefined' && currentActiveInput.id !== 'computerKeyboard' && currentActiveInput.id !== 'none') {
        if (midiAccess && midiAccess.inputs.has(currentActiveInput.id)) {
            const portToClose = midiAccess.inputs.get(currentActiveInput.id);
            if (portToClose) portToClose.onmidimessage = null;
        }
    }
    
    if (deviceId && deviceId !== 'none' && deviceId !== 'computerKeyboard' && midiAccess) {
        const inputToSelect = midiAccess.inputs.get(deviceId);
        if (inputToSelect) {
            inputToSelect.open().then((port) => {
                port.onmidimessage = (msg) => handleMIDIMessage(msg, services);
                services.setActiveMIDIInput(port);
                if (!silent && services.showNotification) services.showNotification(`MIDI Input: ${port.name}`, "info");
            }).catch(err => {
                if (!silent && services.showNotification) services.showNotification(`Error opening MIDI port ${inputToSelect.name}.`, "error");
                services.setActiveMIDIInput(null); 
            });
        } else {
            services.setActiveMIDIInput(null);
            if (!silent && services.showNotification) services.showNotification("Selected MIDI input not found.", "warning");
        }
    } else {
        services.setActiveMIDIInput(deviceId === 'computerKeyboard' ? 'computerKeyboard' : null);
        if (!silent && services.showNotification) {
            if (deviceId === 'computerKeyboard') services.showNotification("MIDI Input: Computer Keyboard", "info");
            else services.showNotification("MIDI Input: None", "info");
        }
    }
}

function handleMIDIMessage(message, services) {
    const uiCache = services.uiElementsCache || {};
    const getArmedTrackIdFn = services.getArmedTrackId;
    const getTrackByIdFn = services.getTrackById;
    const [command, note, velocity] = message.data;
    if (uiCache.midiIndicatorGlobal) { uiCache.midiIndicatorGlobal.classList.add('active'); setTimeout(() => { if(uiCache.midiIndicatorGlobal) uiCache.midiIndicatorGlobal.classList.remove('active'); }, 100); }
    const armedTrackId = getArmedTrackIdFn ? getArmedTrackIdFn() : null;
    if (armedTrackId) {
        const track = getTrackByIdFn ? getTrackByIdFn(armedTrackId) : null;
        if (track && typeof track.playNote === 'function' && typeof track.stopNote === 'function' && typeof Tone !== 'undefined') {
            const freq = Tone.Frequency(note, "midi").toNote();
            if (command === 144 && velocity > 0) track.playNote(freq, Tone.now(), velocity / 127);
            else if (command === 128 || (command === 144 && velocity === 0)) track.stopNote(freq, Tone.now());
        }
    }
}

export function handleTrackMute(trackId) { 
    const services = localAppServices;
    const track = services.getTrackById(trackId);
    if (track) {
        if(services.captureStateForUndoInternal) services.captureStateForUndoInternal(`Toggle Mute for ${track.name}`);
        track.setMute(!track.isMuted); 
        if(services.updateMixerWindow) services.updateMixerWindow();
        if(services.renderTimeline) services.renderTimeline();
    }
}
export function handleTrackSolo(trackId) { 
    const services = localAppServices;
    const track = services.getTrackById(trackId);
    if (track && services.setSoloedTrackId) {
        if(services.captureStateForUndoInternal) services.captureStateForUndoInternal(`Toggle Solo for ${track.name}`);
        services.setSoloedTrackId(trackId);
    }
}
export function handleTrackArm(trackId) { 
    const services = localAppServices;
    const track = services.getTrackById(trackId);
    if (track && services.setArmedTrackId) {
        if(services.captureStateForUndoInternal) services.captureStateForUndoInternal(`${track.isArmedForRec ? "Disarm" : "Arm"} track ${track.name}`);
        services.setArmedTrackId(trackId);
    }
}
export function handleRemoveTrack(trackId) { 
    const services = localAppServices;
    const track = services.getTrackById(trackId);
    if (track && services.showConfirmationDialog && services.removeTrack) {
        services.showConfirmationDialog(`Are you sure you want to delete track "${track.name}"? This can be undone.`, () => {
            if (services.removeTrack) services.removeTrack(trackId); 
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
            (localAppServices.showNotification || utilShowNotification)(`Error enabling full-screen: ${err.message}`, "warning");
        });
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}
export async function handleTimelineLaneDrop(droppedItemData, targetTrackId, startTime, services) { 
    if (!services) services = localAppServices;
    if (!services.getTrackById || !services.showNotification) {
        console.error("[EventHandlers handleTimelineLaneDrop] Core services missing for drop handling.");
        return;
    }
    const targetTrack = services.getTrackById(targetTrackId);
    if (!targetTrack) { services.showNotification("Target track not found for drop.", "warning"); return; }
    try {
        if (droppedItemData && droppedItemData.type === 'sound-browser-item') {
            if (!['Audio', 'Sampler', 'DrumSampler', 'InstrumentSampler'].includes(targetTrack.type)) {
                services.showNotification("Sounds can only be dropped onto Audio or Sampler type tracks.", "warning"); return;
            }
            if (services.getAudioBlobFromSoundBrowserItem && typeof targetTrack.addExternalAudioFileAsClip === 'function' && targetTrack.type === 'Audio') {
                 const audioFile = await services.getAudioBlobFromSoundBrowserItem(droppedItemData); // This needs to return a File/Blob
                 if (audioFile) await targetTrack.addExternalAudioFileAsClip(audioFile, startTime, droppedItemData.fileName);
                 else services.showNotification(`Could not load audio for "${droppedItemData.fileName}".`, "error");
            } else if (['Sampler', 'DrumSampler', 'InstrumentSampler'].includes(targetTrack.type) && typeof targetTrack.loadSampleFromBrowser === 'function') {
                await targetTrack.loadSampleFromBrowser(droppedItemData, targetTrack.type === 'Sampler' ? 'Slicer' : (targetTrack.type === 'DrumSampler' ? 'DrumPad' : 'Instrument'), { startTime: startTime });
            } else { services.showNotification(`Cannot drop this sound onto a ${targetTrack.type} track.`, "warning"); }
        }
        else if (droppedItemData instanceof FileList || (Array.isArray(droppedItemData) && droppedItemData[0] instanceof File)) { 
            const file = (droppedItemData instanceof FileList) ? droppedItemData[0] : droppedItemData[0];
            if (targetTrack.type !== 'Audio') { services.showNotification("Audio files can only be dropped onto Audio Track timeline lanes.", "warning"); return; }
            if (file && file.type.startsWith('audio/')) {
                if (typeof targetTrack.addExternalAudioFileAsClip === 'function') await targetTrack.addExternalAudioFileAsClip(file, startTime, file.name);
                else services.showNotification("Error: Track cannot accept audio file clips.", "error");
            } else if (file) { services.showNotification("Invalid file type. Please drop an audio file.", "warning"); }
        }
        else { services.showNotification("Unrecognized item dropped on timeline.", "warning"); }
    } catch (e) {
        console.error("[EventHandlers handleTimelineLaneDrop] Error processing dropped data:", e);
        services.showNotification("Error processing dropped item on timeline.", "error");
    }
}
