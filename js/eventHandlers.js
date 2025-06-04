// js/eventHandlers.js - Global Event Listeners and Input Handling Module

import * as Constants from './constants.js';
// Utils are used directly, or their functions are on appServices
import { showNotification, showConfirmationDialog, createContextMenu } from './utils.js'; 
// State functions are typically accessed via appServices after initialization
// For direct use here (if any before full appServices init), ensure they are available or refactor.

let localAppServices = {}; // Populated by initializeEventHandlersModule
let isAudioUnlocked = false; // Flag for simplified audio unlock

// --- SIMPLIFIED AUDIO UNLOCK (Replaces your previous playSilentBufferOnTouch) ---
const playSilentBufferOnTouch = async () => {
    if (isAudioUnlocked || typeof Tone === 'undefined') {
        return;
    }

    if (Tone.context.state !== 'running') {
        try {
            await Tone.start();
            isAudioUnlocked = true;
            console.log("[EventHandlers playSilentBufferOnTouch] (Simplified) Tone.start() called successfully. Audio unlocked.");

            // Remove listeners after the first successful interaction
            document.removeEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
            document.removeEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
            document.removeEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });

        } catch (e) {
            console.error("[EventHandlers playSilentBufferOnTouch] (Simplified) Error on Tone.start():", e);
            const notify = localAppServices.showNotification || showNotification; // Fallback
            notify("Audio could not be started. Please try interacting again.", "error");
        }
    } else {
        isAudioUnlocked = true; // Context was already running
        console.log("[EventHandlers playSilentBufferOnTouch] (Simplified) AudioContext already running. Considered unlocked.");
        document.removeEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
        document.removeEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
        document.removeEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });
    }
};
// --- END SIMPLIFIED AUDIO UNLOCK ---


export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    // Ensure critical appServices functions used by handlers are present
    if (!localAppServices.getTrackById && localAppServices.getTrackByIdState) localAppServices.getTrackById = localAppServices.getTrackByIdState;
    if (!localAppServices.getTracksState && localAppServices.getTracksState) localAppServices.getTracks = localAppServices.getTracksState;
    if (!localAppServices.getArmedTrackId && localAppServices.getArmedTrackIdState) localAppServices.getArmedTrackId = localAppServices.getArmedTrackIdState;
    if (!localAppServices.getActiveMIDIInput && localAppServices.getActiveMIDIInputState) localAppServices.getActiveMIDIInput = localAppServices.getActiveMIDIInputState;

    // console.log("[EventHandlers Init] Module initialized. localAppServices keys:", Object.keys(localAppServices).length);
}

export let currentlyPressedComputerKeys = {}; // Export if needed elsewhere, otherwise keep module-scoped
let currentOctaveShift = 0;
const MIN_OCTAVE_SHIFT = -2;
const MAX_OCTAVE_SHIFT = 2;

export function initializePrimaryEventListeners(appContext) {
    // Use appContext if provided (from main.js), otherwise fallback to module-scoped localAppServices
    const services = appContext || localAppServices;
    const uiCache = services.uiElementsCache || {};
    // console.log('[EventHandlers initializePrimaryEventListeners] Initializing. uiCache keys:', Object.keys(uiCache));

    // Attach audio unlock listeners (will be removed after first success)
    document.addEventListener('touchstart', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('mousedown', playSilentBufferOnTouch, { passive: true, capture: true });
    document.addEventListener('keydown', playSilentBufferOnTouch, { passive: true, capture: true });

    document.addEventListener('keydown', (e) => handleGlobalKeyDown(e, services)); // Pass services

    const startButton = uiCache.startMenuButton; // From your main.js cacheUIElements
    const startMenuEl = uiCache.startMenu;

    if (startButton && startMenuEl) {
        startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            startMenuEl.classList.toggle('hidden');
        });

        // Close start menu if clicking outside
        document.addEventListener('click', (event) => {
            if (!startMenuEl.classList.contains('hidden') && !startMenuEl.contains(event.target) && event.target !== startButton) {
                startMenuEl.classList.add('hidden');
            }
        });
        setupStartMenuItems(startMenuEl, services); // Pass services
    } else {
        console.warn('[EventHandlers initializePrimaryEventListeners] StartButton or StartMenu element not found in uiCache.');
    }
    
    // Top Taskbar controls (from your index.html and main.js cacheUIElements)
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

function setupStartMenuItems(startMenuEl, services) { // Receive services
    const uiCache = services.uiElementsCache || {};
    // console.log("[EventHandlers setupStartMenuItems] Setting up. Services available:", !!services.addTrack);

    const menuActions = {
        // Track Creation (from your index.html)
        menuAddSynthTrack: () => { console.log("Menu: Add Synth Track clicked"); services.addTrack?.('Synth', { _isUserActionPlaceholder: true }); },
        menuAddSamplerTrack: () => { console.log("Menu: Add Slicer Sampler Track clicked"); services.addTrack?.('Sampler', { _isUserActionPlaceholder: true }); },
        menuAddDrumSamplerTrack: () => { console.log("Menu: Add Sampler (Pads) clicked"); services.addTrack?.('DrumSampler', { _isUserActionPlaceholder: true }); },
        menuAddInstrumentSamplerTrack: () => { console.log("Menu: Add Instrument Sampler Track clicked"); services.addTrack?.('InstrumentSampler', { _isUserActionPlaceholder: true }); },
        menuAddAudioTrack: () => { console.log("Menu: Add Audio Track clicked"); services.addTrack?.('Audio', { _isUserActionPlaceholder: true }); },
        
        // Window Openers
        menuOpenSoundBrowser: () => services.openSoundBrowserWindow?.(),
        menuOpenTimeline: () => services.openArrangementWindow?.(), // Corrected to openArrangementWindow
        menuOpenGlobalControls: () => services.openGlobalControlsWindow?.(),
        menuOpenMixer: () => services.openMixerWindow?.(),
        menuOpenMasterEffects: () => services.openMasterEffectsRackWindow?.(),

        // File Operations
        menuNewProject: () => services.newProject?.(),
        menuSaveProject: () => services.saveProject?.(),
        menuLoadProject: () => services.loadProject?.(),
        menuExportWav: () => services.exportToWav?.(),
        
        // Edit Operations
        menuUndo: () => services.undo?.(),
        menuRedo: () => services.redo?.(),
        
        // View/Misc
        menuToggleFullScreen: toggleFullScreen,
    };

    for (const menuItemId in menuActions) {
        const menuItemElement = uiCache[menuItemId] || document.getElementById(menuItemId); // Fallback to direct getElementById
        if (menuItemElement) {
            // Remove old listeners if any, to prevent multiple attachments if this function is called again
            const newElement = menuItemElement.cloneNode(true);
            menuItemElement.parentNode.replaceChild(newElement, menuItemElement);
            uiCache[menuItemId] = newElement; // Update cache if needed, though ideally cacheUIElements is robust

            newElement.addEventListener('click', () => {
                // console.log(`[EventHandlers] Start Menu item clicked: ${menuItemId}`);
                if (typeof menuActions[menuItemId] === 'function') {
                    try {
                        menuActions[menuItemId]();
                    } catch (e) {
                        console.error(`Error executing action for menu item ${menuItemId}:`, e);
                    }
                } else {
                    console.warn(`No action defined for menu item: ${menuItemId}`);
                }
                if (startMenuEl) startMenuEl.classList.add('hidden');
            });
        } else {
            // console.warn(`[EventHandlers setupStartMenuItems] Menu item element not found for ID: ${menuItemId}`);
        }
    }
}

export function attachGlobalControlEvents(elements) { // elements are from GlobalControlsUI
    const services = localAppServices; // Use module-scoped services
    // ... (rest of attachGlobalControlEvents from your provided file, ensuring 'services' or 'localAppServices' is used)
    if (!elements) {
        console.error("[EventHandlers attachGlobalControlEvents] Elements object is null or undefined.");
        return;
    }
    const { playBtnGlobal, recordBtnGlobal, stopBtnGlobal, tempoGlobalInput, midiInputSelectGlobal, playbackModeToggleBtnGlobal } = elements;

    if (playBtnGlobal && services.togglePlayback) {
        playBtnGlobal.addEventListener('click', async () => {
            // This is the main play button logic from your eventhandlers.js
            // It needs access to Tone, tracks, and various appServices.
            // Ensure initAudioContextAndMasterMeter is called if audio not ready.
            try {
                if (!services.initAudioContextAndMasterMeter) {
                    console.error("initAudioContextAndMasterMeter service not available.");
                    showNotification("Audio system error.", 3000); return;
                }
                const audioReady = await services.initAudioContextAndMasterMeter(true); // true for user initiated
                if (!audioReady) {
                    showNotification("Audio context not ready. Please interact with the page.", 3000);
                    return;
                }

                const transport = Tone.Transport;
                const tracks = services.getTracksState ? services.getTracksState() : [];

                // Clear previous playback state before starting/toggling
                tracks.forEach(track => { if (typeof track.stopPlayback === 'function') track.stopPlayback(); });
                transport.cancel(0); // Cancel all scheduled Tone.Transport events

                if (transport.state === 'stopped' || transport.state === 'paused') {
                    const wasPaused = transport.state === 'paused';
                    const startTime = wasPaused ? transport.seconds : 0;
                    if (!wasPaused) transport.position = 0;

                    // Schedule all tracks for playback
                    for (const track of tracks) {
                        if (typeof track.schedulePlayback === 'function') {
                            // Schedule up to a reasonable future time, e.g., loopEnd or a long duration
                            await track.schedulePlayback(startTime, transport.loopEnd || 3600);
                        }
                    }
                    transport.start(Tone.now() + 0.05, startTime);
                    playBtnGlobal.innerHTML = '<i class="fas fa-pause"></i>'; // Update UI
                } else { // Was 'started'
                    transport.pause();
                    playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>'; // Update UI
                }
            } catch (error) {
                console.error("[EventHandlers Play/Pause Global] Error:", error);
                showNotification(`Error during playback: ${error.message}`, 4000);
                if (playBtnGlobal) playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>';
            }
        });
    } else { console.warn("[EventHandlers] playBtnGlobal not found in provided elements or service missing."); }

    if (stopBtnGlobal && services.panicStopAllAudio) {
        stopBtnGlobal.addEventListener('click', () => services.panicStopAllAudio());
    } else { console.warn("[EventHandlers] stopBtnGlobal not found or service missing."); }

    if (recordBtnGlobal && services.toggleRecording) { // toggleRecording should handle all logic
        recordBtnGlobal.addEventListener('click', () => services.toggleRecording());
    } else { console.warn("[EventHandlers] recordBtnGlobal not found or service missing."); }

    if (tempoGlobalInput) {
        if (typeof Tone !== 'undefined' && Tone.Transport) {
             tempoGlobalInput.value = Tone.Transport.bpm.value.toFixed(1);
        }
        tempoGlobalInput.addEventListener('input', (e) => { // Use 'input' for live update
            const newTempo = parseFloat(e.target.value);
            if (!isNaN(newTempo) && newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) {
                if (typeof Tone !== 'undefined' && Tone.Transport) Tone.Transport.bpm.value = newTempo;
                if (services.updateTaskbarTempoDisplay) services.updateTaskbarTempoDisplay(newTempo);
            }
        });
        tempoGlobalInput.addEventListener('change', () => { // For undo capture on final change
            if (services.captureStateForUndoInternal) {
                services.captureStateForUndoInternal(`Set Tempo to ${Tone.Transport.bpm.value.toFixed(1)}`);
            }
        });
    } else { console.warn("[EventHandlers] tempoGlobalInput not found."); }

    if (midiInputSelectGlobal && services.selectMIDIInput) {
        midiInputSelectGlobal.addEventListener('change', (e) => services.selectMIDIInput(e.target.value));
    } else { console.warn("[EventHandlers] midiInputSelectGlobal or service missing."); }

    if (playbackModeToggleBtnGlobal) {
        const getMode = services.getPlaybackMode || getPlaybackModeState; // Use local if service missing
        const setMode = services.setPlaybackMode || setPlaybackModeState; // Use local if service missing
        if (getMode && setMode) {
            const currentMode = getMode();
            playbackModeToggleBtnGlobal.textContent = currentMode === 'timeline' ? 'Mode: Timeline' : 'Mode: Sequencer';
            playbackModeToggleBtnGlobal.addEventListener('click', () => {
                const oldMode = getMode();
                const newMode = oldMode === 'sequencer' ? 'timeline' : 'sequencer';
                setMode(newMode); // This should trigger appServices.onPlaybackModeChange
            });
        } else { console.warn("[EventHandlers] Playback mode services missing."); }
    } else { console.warn("[EventHandlers] playbackModeToggleBtnGlobal not found."); }
}

function handleGlobalKeyDown(event, services) { // Receive services
    const uiCache = services.uiElementsCache || {};
    // ... (rest of handleGlobalKeyDown from your provided file, ensuring 'services' is used)
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        if (event.key === "Escape") activeEl.blur();
        return;
    }

    const key = event.key.toLowerCase();
    const ctrlOrMeta = event.ctrlKey || event.metaKey;

    // Global shortcuts (Play/Stop/Record, Undo/Redo, Save/Load)
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

    // Computer Keyboard as MIDI Input
    const getArmedTrackIdFn = services.getArmedTrackId || getArmedTrackIdState;
    const getActiveMIDIInputFn = services.getActiveMIDIInput || getActiveMIDIInputState;
    const getTrackByIdFn = services.getTrackById || getTrackByIdState;

    const armedTrackId = getArmedTrackIdFn ? getArmedTrackIdFn() : null;
    const activeMIDIInput = getActiveMIDIInputFn ? getActiveMIDIInputFn() : 'none';

    if (armedTrackId && (activeMIDIInput === 'computerKeyboard' || activeMIDIInput === 'none' || !activeMIDIInput)) {
        const track = getTrackByIdFn ? getTrackByIdFn(armedTrackId) : null;
        if (track && typeof track.playNote === 'function' && typeof Tone !== 'undefined') {
            let midiNote = Constants.computerKeySynthMap[event.key]; // Check event.key first (case-sensitive)
            if (midiNote === undefined && Constants.computerKeySynthMap[key]) { // Fallback to lowercase key
                midiNote = Constants.computerKeySynthMap[key];
            }

            if (midiNote !== undefined && !currentlyPressedComputerKeys[midiNote]) {
                event.preventDefault();
                const finalNote = midiNote + (currentOctaveShift * 12);
                if (finalNote >= 0 && finalNote <= 127) {
                    const freq = Tone.Frequency(finalNote, "midi").toNote();
                    track.playNote(freq, Tone.now(), 0.7); // Velocity 0.7
                    currentlyPressedComputerKeys[midiNote] = true; // Mark as pressed
                    if (uiCache.keyboardIndicatorGlobal) {
                        uiCache.keyboardIndicatorGlobal.classList.add('active');
                        setTimeout(() => { if(uiCache.keyboardIndicatorGlobal) uiCache.keyboardIndicatorGlobal.classList.remove('active'); }, 150);
                    }
                }
            }
        }
    }
}

// Keyup listener for computer keyboard MIDI
document.addEventListener('keyup', (event) => {
    const services = localAppServices; // Use module-scoped services
    const uiCache = services.uiElementsCache || {};
    const getArmedTrackIdFn = services.getArmedTrackId || getArmedTrackIdState;
    const getTrackByIdFn = services.getTrackById || getTrackByIdState;

    const key = event.key.toLowerCase();
    if (uiCache.keyboardIndicatorGlobal) {
        uiCache.keyboardIndicatorGlobal.classList.remove('active');
    }

    const armedTrackId = getArmedTrackIdFn ? getArmedTrackIdFn() : null;
    if (armedTrackId) {
        const track = getTrackByIdFn ? getTrackByIdFn(armedTrackId) : null;
        if (track && typeof track.stopNote === 'function' && typeof Tone !== 'undefined') {
            let midiNote = Constants.computerKeySynthMap[event.key];
            if (midiNote === undefined && Constants.computerKeySynthMap[key]) {
                midiNote = Constants.computerKeySynthMap[key];
            }
            if (midiNote !== undefined && currentlyPressedComputerKeys[midiNote]) {
                const finalNote = midiNote + (currentOctaveShift * 12);
                 if (finalNote >= 0 && finalNote <= 127) {
                    const freq = Tone.Frequency(finalNote, "midi").toNote();
                    track.stopNote(freq, Tone.now());
                }
                delete currentlyPressedComputerKeys[midiNote]; // Unmark
            }
        }
    }
});


export async function setupMIDI() {
    // ... (content from your provided file, ensuring localAppServices is used)
    const services = localAppServices;
    if (!services.getMidiAccessState || !services.setMidiAccessState || !services.setActiveMIDIInput || !services.selectMIDIInput) {
        console.warn("[EventHandlers setupMIDI] Core MIDI services not available in localAppServices.");
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
            services.setMidiAccessState(midiAccess);
            populateMIDIInputSelector(midiAccess, services);
            midiAccess.onstatechange = (e) => {
                populateMIDIInputSelector(services.getMidiAccessState(), services);
                const activeInputId = services.getActiveMIDIInput ? services.getActiveMIDIInput()?.id : null;
                if (activeInputId && e.port.id === activeInputId && e.port.state === 'disconnected') {
                    services.selectMIDIInput('none'); // Auto-select "None" if active device disconnects
                    if (services.showNotification) services.showNotification(`MIDI Device "${e.port.name}" disconnected.`, "warning");
                } else if (e.port.type === "input" && e.port.state === "connected") {
                     if (services.showNotification) services.showNotification(`MIDI Device "${e.port.name}" connected.`, "info");
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

    const previouslySelectedId = services.getActiveMIDIInput ? services.getActiveMIDIInput()?.id : selector.value;
    selector.innerHTML = '';
    selector.add(new Option("None", "none"));
    selector.add(new Option("Computer Keyboard", "computerKeyboard"));

    if (midiAccess && midiAccess.inputs.size > 0) {
        midiAccess.inputs.forEach(input => selector.add(new Option(input.name, input.id)));
    }

    let valueToSet = "computerKeyboard"; // Default
    if (previouslySelectedId && Array.from(selector.options).some(opt => opt.value === previouslySelectedId)) {
        valueToSet = previouslySelectedId;
    } else if (midiAccess && midiAccess.inputs.size > 0) {
        valueToSet = midiAccess.inputs.values().next().value.id;
    }
    selector.value = valueToSet;
    if (services.selectMIDIInput) services.selectMIDIInput(valueToSet, true); // true for silent
}

export function selectMIDIInput(deviceId, silent = false) {
    const services = localAppServices;
    if (!services.setActiveMIDIInput || !services.getMidiAccessState || !services.getActiveMIDIInput) return;

    const midiAccess = services.getMidiAccessState();
    const currentActiveInput = services.getActiveMIDIInput();

    if (currentActiveInput && currentActiveInput.id !== 'computerKeyboard' && currentActiveInput.id !== 'none') {
        if (currentActiveInput.onmidimessage) currentActiveInput.onmidimessage = null;
        // Don't close port here, onstatechange should handle disconnects.
    }

    if (deviceId && deviceId !== 'none' && deviceId !== 'computerKeyboard' && midiAccess) {
        const inputToSelect = midiAccess.inputs.get(deviceId);
        if (inputToSelect) {
            inputToSelect.open().then((port) => {
                port.onmidimessage = (msg) => handleMIDIMessage(msg, services);
                services.setActiveMIDIInput(port); // Store the port object
                if (!silent && services.showNotification) services.showNotification(`MIDI Input: ${port.name}`, "info");
            }).catch(err => {
                console.error(`Error opening MIDI port ${inputToSelect.name}:`, err);
                if (!silent && services.showNotification) services.showNotification(`Error opening MIDI: ${inputToSelect.name}`, "error");
                services.setActiveMIDIInput(null);
            });
        } else {
            services.setActiveMIDIInput(null); // Device ID not found
            if (!silent && services.showNotification) services.showNotification("Selected MIDI input not found.", "warning");
        }
    } else {
        services.setActiveMIDIInput(deviceId === 'computerKeyboard' ? 'computerKeyboard' : null); // Store string 'computerKeyboard' or null
        if (!silent && services.showNotification) {
            if (deviceId === 'computerKeyboard') services.showNotification("MIDI Input: Computer Keyboard", "info");
            else services.showNotification("MIDI Input: None", "info");
        }
    }
}

function handleMIDIMessage(message, services) { // Receive services
    const uiCache = services.uiElementsCache || {};
    const getArmedTrackIdFn = services.getArmedTrackId || getArmedTrackIdState;
    const getTrackByIdFn = services.getTrackById || getTrackByIdState;

    const [command, note, velocity] = message.data;
    if (uiCache.midiIndicatorGlobal) {
        uiCache.midiIndicatorGlobal.classList.add('active');
        setTimeout(() => { if(uiCache.midiIndicatorGlobal) uiCache.midiIndicatorGlobal.classList.remove('active'); }, 100);
    }

    const armedTrackId = getArmedTrackIdFn ? getArmedTrackIdFn() : null;
    if (armedTrackId) {
        const track = getTrackByIdFn ? getTrackByIdFn(armedTrackId) : null;
        if (track && typeof track.playNote === 'function' && typeof track.stopNote === 'function' && typeof Tone !== 'undefined') {
            const freq = Tone.Frequency(note, "midi").toNote();
            if (command === 144 && velocity > 0) { // Note On
                track.playNote(freq, Tone.now(), velocity / 127);
            } else if (command === 128 || (command === 144 && velocity === 0)) { // Note Off
                track.stopNote(freq, Tone.now());
            }
        }
    }
}

// --- Track Control Handlers (called by UI, use services) ---
export function handleTrackMute(trackId) {
    const services = localAppServices;
    const track = services.getTrackById ? services.getTrackById(trackId) : null;
    if (track && typeof track.setMute === 'function') {
        if (services.captureStateForUndoInternal) services.captureStateForUndoInternal(`Toggle Mute for ${track.name}`);
        track.setMute(!track.isMuted);
        if (services.updateMixerWindow) services.updateMixerWindow();
        if (services.renderTimeline) services.renderTimeline();
    }
}
export function handleTrackSolo(trackId) {
    const services = localAppServices;
    const track = services.getTrackById ? services.getTrackById(trackId) : null;
    if (track && services.setSoloedTrackId) {
        if (services.captureStateForUndoInternal) services.captureStateForUndoInternal(`Toggle Solo for ${track.name}`);
        services.setSoloedTrackId(trackId); // State setter handles logic and UI updates
    }
}
export function handleTrackArm(trackId) {
    const services = localAppServices;
    const track = services.getTrackById ? services.getTrackById(trackId) : null;
    if (track && services.setArmedTrackId) {
        services.setArmedTrackId(trackId); // State setter handles logic and UI updates
    }
}
export function handleRemoveTrack(trackId) {
    const services = localAppServices;
    const track = services.getTrackById ? services.getTrackById(trackId) : null;
    if (track && services.showConfirmationDialog && services.removeTrack) {
        services.showConfirmationDialog(`Are you sure you want to delete track "${track.name}"? This can be undone.`, () => {
            if (services.removeTrack) services.removeTrack(trackId);
        });
    }
}
export function handleOpenTrackInspector(trackId) {
    const services = localAppServices;
    if (services.openTrackInspectorWindow) services.openTrackInspectorWindow(trackId);
}
export function handleOpenEffectsRack(trackId) {
    const services = localAppServices;
    if (services.openTrackEffectsRackWindow) services.openTrackEffectsRackWindow(trackId);
}
export function handleOpenSequencer(trackId) {
    const services = localAppServices;
    if (services.openSequencerWindow) services.openSequencerWindow(trackId);
}
function toggleFullScreen() {
    // ... (same as before)
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            const notify = localAppServices.showNotification || showNotification;
            notify(`Error enabling full-screen: ${err.message}`, "warning");
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

export async function handleTimelineLaneDrop(event, targetTrackId, startTime) {
    // This function now uses localAppServices directly
    const services = localAppServices;
    if (!services.getTrackById || !services.showNotification || !services.captureStateForUndo || !services.renderTimeline) {
        console.error("Required appServices not available in handleTimelineLaneDrop");
        showNotification("Internal error handling timeline drop.", 3000);
        return;
    }
    // ... (rest of the logic from your eventhandlers.js, using 'services' instead of 'appServicesPassed')
    const targetTrack = services.getTrackById(targetTrackId);
    if (!targetTrack) { /* ... */ }
    const jsonDataString = event.dataTransfer.getData('application/json');
    const files = event.dataTransfer.files;
    try {
        if (jsonDataString) {
            const droppedData = JSON.parse(jsonDataString);
            if (droppedData.type === 'sequence-timeline-drag') {
                if (targetTrack.type === 'Audio') {
                    services.showNotification("Cannot place sequence clips on Audio tracks.", 3000); return;
                }
                if (typeof targetTrack.addSequenceClipToTimeline === 'function') {
                    targetTrack.addSequenceClipToTimeline(droppedData.sourceSequenceId, startTime, droppedData.clipName);
                } else { services.showNotification("Error: Track cannot accept sequence clips.", 3000); }
            } else if (droppedData.type === 'sound-browser-item') {
                if (targetTrack.type !== 'Audio') {
                    services.showNotification("Sound browser audio files can only be dropped onto Audio Track timeline lanes.", 3000); return;
                }
                if (services.getAudioBlobFromSoundBrowserItem && typeof targetTrack.addExternalAudioFileAsClip === 'function') {
                    const audioBlob = await services.getAudioBlobFromSoundBrowserItem(droppedData); // This service needs to exist on appServices
                    if (audioBlob) {
                        targetTrack.addExternalAudioFileAsClip(audioBlob, startTime, droppedData.fileName);
                    } else { services.showNotification(`Could not load audio for "${droppedData.fileName}".`, 3000); }
                } else { services.showNotification("Error: Cannot process sound browser item for timeline.", 3000); }
            } else { services.showNotification("Unrecognized item dropped on timeline.", 2000); }
        } else if (files && files.length > 0) { /* ... */ }
    } catch (e) { /* ... */ }
}
