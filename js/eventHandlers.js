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
}

export let currentlyPressedComputerKeys = {};
let currentOctaveShift = 0;
const MIN_OCTAVE_SHIFT = -2;
const MAX_OCTAVE_SHIFT = 2;

export function initializePrimaryEventListeners() {
    const services = localAppServices;
    const uiCache = services.uiElementsCache || {};
    console.log('[EventHandlers initializePrimaryEventListeners] Initializing. appContext available (via localAppServices):', !!services.showNotification);
    console.log('[EventHandlers initializePrimaryEventListeners] uiCache keys available:', Object.keys(uiCache).length > 0);

    document.addEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });

    document.addEventListener('keydown', (e) => handleGlobalKeyDown(e, services));

    const startButton = uiCache.startMenuButton;
    const startMenuEl = uiCache.startMenu;

    if (startButton && startMenuEl) {
        console.log("[EventHandlers initializePrimaryEventListeners] StartMenuButton and StartMenuEl FOUND in cache.");
        startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasHidden = startMenuEl.classList.contains('hidden');
            startMenuEl.classList.toggle('hidden');
            console.log(`[EventHandlers] StartMenuButton CLICKED. Menu was hidden: ${wasHidden}, Menu now hidden: ${startMenuEl.classList.contains('hidden')}`);
        });
        document.addEventListener('click', (event) => {
            if (!startMenuEl.classList.contains('hidden') && !startMenuEl.contains(event.target) && event.target !== startButton) {
                startMenuEl.classList.add('hidden');
            }
        });
        
        const fileMenuUl = startMenuEl.querySelector('#fileMenu'); // Assuming your <ul> has id="fileMenu" based on index.html
        if (fileMenuUl) {
            console.log("[EventHandlers initializePrimaryEventListeners] Found ul#fileMenu. Calling setupStartMenuItems.");
            setupStartMenuItems(startMenuEl, services);
        } else {
            console.warn("[EventHandlers initializePrimaryEventListeners] ul#fileMenu NOT FOUND inside startMenuEl. Start Menu items might not be set up correctly.");
        }
    } else {
        console.warn('[EventHandlers initializePrimaryEventListeners] StartMenuButton or StartMenu element not found in uiCache.');
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
    // ADDED LOGS FOR DEBUGGING START MENU ITEMS
    console.log("[EventHandlers setupStartMenuItems] Called. StartMenuEl valid:", !!startMenuEl);
    console.log("[EventHandlers setupStartMenuItems] uiCache has 'menuAddSynthTrack':", !!(uiCache.menuAddSynthTrack));
    console.log("[EventHandlers setupStartMenuItems] services.addTrack available:", typeof services.addTrack);

    const menuActions = {
        menuNewProject: () => services.newProject?.(),
        menuAddSynthTrack: () => { console.log("Action: Add Synth Track"); services.addTrack?.('Synth'); },
        menuAddSamplerTrack: () => { console.log("Action: Add Slicer Sampler Track"); services.addTrack?.('Sampler'); },
        menuAddDrumSamplerTrack: () => { console.log("Action: Add Sampler (Pads)"); services.addTrack?.('DrumSampler'); },
        menuAddInstrumentSamplerTrack: () => { console.log("Action: Add Instrument Sampler Track"); services.addTrack?.('InstrumentSampler'); },
        menuAddAudioTrack: () => { console.log("Action: Add Audio Track"); services.addTrack?.('Audio'); },
        menuOpenSoundBrowser: () => services.openSoundBrowserWindow?.(),
        menuOpenTimeline: () => services.openArrangementWindow?.(), // Corrected to openArrangementWindow
        menuOpenGlobalControls: () => services.openGlobalControlsWindow?.(),
        menuOpenMixer: () => services.openMixerWindow?.(),
        menuOpenMasterEffects: () => services.openMasterEffectsRackWindow?.(),
        menuUndo: () => services.undo?.(),
        menuRedo: () => services.redo?.(),
        menuSaveProject: () => services.saveProject?.(),
        menuLoadProject: () => services.loadProject?.(),
        menuExportWav: () => services.exportToWav?.(),
        menuToggleFullScreen: toggleFullScreen,
        menuUploadBackground: () => services.triggerCustomBackgroundUpload?.(), // From your index.html
        menuRemoveBackground: () => services.removeCustomDesktopBackground?.(), // From your index.html
    };

    for (const menuItemId in menuActions) {
        const menuItemElement = uiCache[menuItemId] || startMenuEl.querySelector(`#${menuItemId}`);
        
        console.log(`[EventHandlers setupStartMenuItems] Processing: ${menuItemId}. Element in uiCache: ${!!uiCache[menuItemId]}. Element from querySelector: ${!!startMenuEl.querySelector(`#${menuItemId}`)}. Final Element: ${!!menuItemElement}`);

        if (menuItemElement) {
            // Clone and replace to ensure no old listeners are lingering
            const newElement = menuItemElement.cloneNode(true);
            if (menuItemElement.parentNode) {
                menuItemElement.parentNode.replaceChild(newElement, menuItemElement);
            } else {
                console.warn(`[EventHandlers setupStartMenuItems] Parent node not found for ${menuItemId} during clone replace.`);
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
            console.warn(`[EventHandlers setupStartMenuItems] Menu item element NOT FOUND for ID: ${menuItemId}`);
        }
    }
     // Event listener for the project file input (from your eventhandlers.js)
    const loadProjectInputEl = uiCache.projectFileInput || document.getElementById('loadProjectInput'); // Use the ID from your index/main
    if (loadProjectInputEl) {
        loadProjectInputEl.addEventListener('change', (e) => {
            if (services.handleProjectFileLoad && e.target.files.length > 0) {
                services.handleProjectFileLoad(e); // Pass the event object
            }
            e.target.value = null; // Reset file input
        });
    } else {
        console.warn("[EventHandlers setupStartMenuItems] Load project input element ('loadProjectInput') not found in uiCache.");
    }
}

export function attachGlobalControlEvents(elements) {
    const services = localAppServices;
    // ... (Content from your `eventhandlers.js`, ensuring `services` is used for appService calls) ...
    if (!elements) { console.error("[EventHandlers attachGlobalControlEvents] Elements object is null."); return; }
    const { playBtnGlobal, recordBtnGlobal, stopBtnGlobal, tempoGlobalInput, midiInputSelectGlobal, playbackModeToggleBtnGlobal } = elements;
    if (playBtnGlobal && services.togglePlayback) playBtnGlobal.addEventListener('click', () => services.togglePlayback());
    if (stopBtnGlobal && services.panicStopAllAudio) stopBtnGlobal.addEventListener('click', () => services.panicStopAllAudio());
    if (recordBtnGlobal && services.toggleRecording) recordBtnGlobal.addEventListener('click', () => services.toggleRecording());
    if (tempoGlobalInput && typeof Tone !== 'undefined' && Tone.Transport) {
        tempoGlobalInput.value = Tone.Transport.bpm.value.toFixed(1);
        tempoGlobalInput.addEventListener('input', (e) => { /* ... your logic ... */ });
        tempoGlobalInput.addEventListener('change', () => { /* ... your logic ... */ });
    }
    if (midiInputSelectGlobal && services.selectMIDIInput) { midiInputSelectGlobal.addEventListener('change', (e) => services.selectMIDIInput(e.target.value)); }
    if (playbackModeToggleBtnGlobal && services.getPlaybackMode && services.setPlaybackMode) {
        const currentMode = services.getPlaybackMode();
        playbackModeToggleBtnGlobal.textContent = currentMode === 'timeline' ? 'Mode: Timeline' : 'Mode: Sequencer';
        playbackModeToggleBtnGlobal.addEventListener('click', () => { /* ... your logic ... */ });
    }
}

function handleGlobalKeyDown(event, services) {
    // ... (Content from your `eventhandlers.js`, ensuring `services` is used) ...
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
    else if (key === 'o' && ctrlOrMeta) { event.preventDefault(); if (services.loadProject) services.loadProject(); }
    else if (key === '.' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); if (services.panicStopAllAudio) services.panicStopAllAudio(); }

    const armedTrackId = services.getArmedTrackId ? services.getArmedTrackId() : null;
    const activeMIDIInput = services.getActiveMIDIInput ? services.getActiveMIDIInput() : 'none';
    if (armedTrackId && (activeMIDIInput === 'computerKeyboard' || activeMIDIInput === 'none' || !activeMIDIInput)) { /* ... your KBD MIDI logic ... */ }
}

document.addEventListener('keyup', (event) => { /* ... Content from your `eventhandlers.js` ... */ });

export async function setupMIDI() {
    const services = localAppServices;
    // Corrected check for existence of all necessary MIDI-related services on appServices
    if (!services.getMidiAccess || !services.setMidiAccessState || 
        !services.setActiveMIDIInput || !services.selectMIDIInput) {
        console.warn("[EventHandlers setupMIDI] Core MIDI services not available in localAppServices. Needed: getMidiAccess, setMidiAccessState, setActiveMIDIInput, selectMIDIInput");
        return;
    }
    // ... (Rest of setupMIDI from your `eventhandlers.js`)
    const uiCache = services.uiElementsCache || {};
    const selector = uiCache.midiInputSelectGlobal;
    if (!selector) { console.warn("[EventHandlers setupMIDI] MIDI input selector UI element not found in cache."); return; }
    if (navigator.requestMIDIAccess) { try { /* ... your MIDI access logic ... */ } catch (error) { /* ... */ } } else { /* ... */ }
}

function populateMIDIInputSelector(midiAccess, services) { /* ... Content from your `eventhandlers.js`, ensure `services` is used ... */ }
export function selectMIDIInput(deviceId, silent = false) { /* ... Content from your `eventhandlers.js`, ensure `localAppServices` is used ... */ }
function handleMIDIMessage(message, services) { /* ... Content from your `eventhandlers.js`, ensure `services` is used ... */ }

export function handleTrackMute(trackId) { /* ... Content from your `eventhandlers.js`, ensure `localAppServices` is used ... */ }
export function handleTrackSolo(trackId) { /* ... Content from your `eventhandlers.js`, ensure `localAppServices` is used ... */ }
export function handleTrackArm(trackId) { /* ... Content from your `eventhandlers.js`, ensure `localAppServices` is used ... */ }
export function handleRemoveTrack(trackId) { /* ... Content from your `eventhandlers.js`, ensure `localAppServices` is used ... */ }
export function handleOpenTrackInspector(trackId) { /* ... Content from your `eventhandlers.js` ... */ }
export function handleOpenEffectsRack(trackId) { /* ... Content from your `eventhandlers.js` ... */ }
export function handleOpenSequencer(trackId) { /* ... Content from your `eventhandlers.js` ... */ }
function toggleFullScreen() { /* ... Content from your `eventhandlers.js`, ensure `localAppServices` is used ... */ }
export async function handleTimelineLaneDrop(event, targetTrackId, startTime, appServicesPassed) { /* ... Content from your `eventhandlers.js` ... */ }
