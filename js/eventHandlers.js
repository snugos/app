// js/eventHandlers.js - Global Event Listeners and Input Handling Module

import * as Constants from './constants.js';
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
            const notify = localAppServices.showNotification || utilShowNotification;
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
}

export let currentlyPressedComputerKeys = {};
let currentOctaveShift = 0;
const MIN_OCTAVE_SHIFT = -2;
const MAX_OCTAVE_SHIFT = 2;

export function initializePrimaryEventListeners() {
    const services = localAppServices;
    const uiCache = services.uiElementsCache || {};
    // console.log('[EventHandlers initializePrimaryEventListeners] Initializing. appContext available (via localAppServices):', !!services.showNotification);
    // console.log('[EventHandlers initializePrimaryEventListeners] uiCache keys available:', Object.keys(uiCache).length > 0 ? Object.keys(uiCache) : "EMPTY");


    document.addEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });

    document.addEventListener('keydown', (e) => handleGlobalKeyDown(e, services));

    const startButton = uiCache.startMenuButton;
    const startMenuEl = uiCache.startMenu;

    if (startButton && startMenuEl) {
        // console.log("[EventHandlers initializePrimaryEventListeners] StartMenuButton and StartMenuEl FOUND in cache."); // Already confirmed by log
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
            // console.log("[EventHandlers initializePrimaryEventListeners] Found ul#fileMenu. Calling setupStartMenuItems."); // Already confirmed by log
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
    // console.log("[EventHandlers setupStartMenuItems] Called. StartMenuEl valid:", !!startMenuEl); // Already confirmed
    // console.log("[EventHandlers setupStartMenuItems] uiCache has 'menuAddSynthTrack':", !!(uiCache.menuAddSynthTrack)); // Already confirmed
    // console.log("[EventHandlers setupStartMenuItems] services.addTrack available:", typeof services.addTrack); // Already confirmed

    const menuActions = { /* ... as in response #87 ... */ };

    for (const menuItemId in menuActions) {
        const menuItemElement = uiCache[menuItemId] || startMenuEl.querySelector(`#${menuItemId}`);
        // console.log(`[EventHandlers setupStartMenuItems] Processing: ${menuItemId}. Element found: ${!!menuItemElement}`); // Already confirmed for most

        if (menuItemElement) {
            const newElement = menuItemElement.cloneNode(true);
            if (menuItemElement.parentNode) menuItemElement.parentNode.replaceChild(newElement, menuItemElement);
            if (uiCache[menuItemId]) uiCache[menuItemId] = newElement;
            newElement.addEventListener('click', () => {
                console.log(`[EventHandlers] CLICKED Start Menu Item: ${menuItemId}`);
                if (typeof menuActions[menuItemId] === 'function') {
                    try { menuActions[menuItemId](); } 
                    catch (e) { console.error(`Error executing action for menu item ${menuItemId}:`, e); if (services.showNotification) services.showNotification(`Error with ${menuItemId}: ${e.message}`, "error"); }
                }
                if (startMenuEl) startMenuEl.classList.add('hidden');
            });
        }
    }
    const loadProjectInputEl = uiCache.projectFileInput || document.getElementById('loadProjectInput');
    if (loadProjectInputEl) { /* ... as in response #87 ... */ }
}

export function attachGlobalControlEvents(elements) { /* ... as in response #87 ... */ }
function handleGlobalKeyDown(event, services) { /* ... as in response #87 ... */ }
document.addEventListener('keyup', (event) => { /* ... as in response #87 ... */ });

export async function setupMIDI() {
    const services = localAppServices;
    if (!services.getMidiAccess || !services.setMidiAccessState || 
        !services.setActiveMIDIInput || !services.selectMIDIInput) {
        console.warn("[EventHandlers setupMIDI] Core MIDI services not available in localAppServices. Needed: getMidiAccess, setMidiAccessState, setActiveMIDIInput, selectMIDIInput");
        return;
    }
    const uiCache = services.uiElementsCache || {};
    const selector = uiCache.midiInputSelectGlobal;
    if (!selector) { console.warn("[EventHandlers setupMIDI] MIDI input selector UI element not found in cache."); return; }

    if (navigator.requestMIDIAccess) {
        try {
            const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            services.setMidiAccessState(midiAccess);
            populateMIDIInputSelector(midiAccess, services); // Pass services
            midiAccess.onstatechange = (e) => {
                populateMIDIInputSelector(services.getMidiAccess(), services); // Pass services
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
            if (services.showNotification) services.showNotification("Could not access MIDI devices. " + error.message, "warning");
            populateMIDIInputSelector(null, services); // Pass services
        }
    } else { 
        console.warn("[EventHandlers setupMIDI] Web MIDI API not supported.");
        if (services.showNotification) services.showNotification("Web MIDI API not supported.", "info");
        populateMIDIInputSelector(null, services); // Pass services
    }
}

function populateMIDIInputSelector(midiAccess, services) { // services is localAppServices
    const uiCache = services.uiElementsCache || {};
    const selector = uiCache.midiInputSelectGlobal;
    if (!selector) return;

    const getActiveMIDIInputFn = services.getActiveMIDIInput;
    const currentActiveInputObj = getActiveMIDIInputFn ? getActiveMIDIInputFn() : null;
    // Correctly get the ID if it's an object, or use the value if it's a string (like 'computerKeyboard')
    const previouslySelectedId = currentActiveInputObj?.id || currentActiveInputObj || selector.value; 
    
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
    
    // Define currentActiveInputId within this scope before using it for comparison
    const finalCurrentActiveInputId = currentActiveInputObj?.id || currentActiveInputObj;

    // Call selectMIDIInput only if the value needs to be set or updated
    if (services.selectMIDIInput && selector.value !== finalCurrentActiveInputId) {
         services.selectMIDIInput(selector.value, true); // true for silent initial selection
    }
}
// ... (selectMIDIInput, handleMIDIMessage, and all track/timeline handlers as per your uploaded file, ensuring `services` or `localAppServices` is used consistently)
export function selectMIDIInput(deviceId, silent = false) {
    const services = localAppServices;
    if (!services.setActiveMIDIInput || !services.getMidiAccess || !services.getActiveMIDIInput) return;
    const midiAccess = services.getMidiAccess();
    const currentActiveInput = services.getActiveMIDIInput();
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
    const [command, note, velocityByte] = message.data; // Renamed velocity to velocityByte
    const velocity = velocityByte / 127; // Normalize velocity to 0-1
    if (uiCache.midiIndicatorGlobal) { uiCache.midiIndicatorGlobal.classList.add('active'); setTimeout(() => { if(uiCache.midiIndicatorGlobal) uiCache.midiIndicatorGlobal.classList.remove('active'); }, 100); }
    const armedTrackId = getArmedTrackIdFn ? getArmedTrackIdFn() : null;
    if (armedTrackId) {
        const track = getTrackByIdFn ? getTrackByIdFn(armedTrackId) : null;
        if (track && typeof track.playNote === 'function' && typeof track.stopNote === 'function' && typeof Tone !== 'undefined') {
            const freq = Tone.Frequency(note, "midi").toNote();
            if ((command & 0xF0) === 0x90 && velocityByte > 0) { // Note On (0x90 series, velocity > 0)
                track.playNote(freq, Tone.now(), velocity);
            } else if ((command & 0xF0) === 0x80 || ((command & 0xF0) === 0x90 && velocityByte === 0)) { // Note Off (0x80 series, or 0x90 with velocity 0)
                track.stopNote(freq, Tone.now());
            }
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
export async function handleTimelineLaneDrop(event, targetTrackId, startTime, appServicesPassed) { 
    const services = appServicesPassed || localAppServices; // Prefer passed appServices if available
    if (!services.getTrackById || !services.showNotification) {
        console.error("[EventHandlers handleTimelineLaneDrop] Core services missing for drop handling.");
        return;
    }
    // ... (rest of the logic from your eventhandlers.js, ensuring 'services' is used)
    const targetTrack = services.getTrackById(targetTrackId);
    if (!targetTrack) { services.showNotification("Target track not found for drop.", "warning"); return; }
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
                if (!['Audio', 'Sampler', 'DrumSampler', 'InstrumentSampler'].includes(targetTrack.type)) { services.showNotification("Sounds can only be dropped onto Audio or Sampler type tracks.", "warning"); return; }
                // Use appServices.getAudioBlobFromSoundBrowserItem which should be defined in main.js
                if (services.getAudioBlobFromSoundBrowserItem && (targetTrack.type === 'Audio' && typeof targetTrack.addExternalAudioFileAsClip === 'function')) {
                     const audioFile = await services.getAudioBlobFromSoundBrowserItem(droppedData); // Expects File object
                     if (audioFile instanceof File) await targetTrack.addExternalAudioFileAsClip(audioFile, startTime, droppedData.fileName);
                     else services.showNotification(`Could not load audio for "${droppedData.fileName}".`, "error");
                } else if (['Sampler', 'DrumSampler', 'InstrumentSampler'].includes(targetTrack.type) && typeof targetTrack.loadSampleFromBrowser === 'function') {
                    await targetTrack.loadSampleFromBrowser(droppedData, targetTrack.type === 'Sampler' ? 'Slicer' : (targetTrack.type === 'DrumSampler' ? 'DrumPad' : 'Instrument'), { startTime: startTime });
                } else { services.showNotification(`Cannot drop this sound onto a ${targetTrack.type} track this way.`, "warning"); }
            } else { services.showNotification("Unrecognized item dropped on timeline.", 2000); }
        } else if (files && files.length > 0) { 
            const file = files[0];
            if (targetTrack.type !== 'Audio') { services.showNotification("Audio files can only be dropped onto Audio Track timeline lanes.", 3000); return; }
            if (file.type.startsWith('audio/')) {
                if (typeof targetTrack.addExternalAudioFileAsClip === 'function') await targetTrack.addExternalAudioFileAsClip(file, startTime, file.name);
                else services.showNotification("Error: Track cannot accept audio file clips.", 3000);
            } else { services.showNotification("Invalid file type. Please drop an audio file.", 3000); }
        } else { console.log("[EventHandlers handleTimelineLaneDrop] No recognized data in drop event for timeline."); }
    } catch (e) {
        console.error("[EventHandlers handleTimelineLaneDrop] Error processing dropped data:", e);
        services.showNotification("Error processing dropped item.", 3000);
    }
}
