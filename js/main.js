// js/main.js - Main Application Logic Orchestrator

// --- Module Imports ---
import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import { showNotification } from './utils.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    selectMIDIInput, handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js';
import {
    initializeStateModule, getTracks, getTrackById, addTrackToState, removeTrackFromState as coreRemoveTrackFromState,
    captureStateForUndo, undoLastAction, redoLastAction, gatherProjectData, reconstructDAW, saveProject,
    loadProject, handleProjectFileLoad, exportToWav, getUndoStack,
    getArmedTrackId, getSoloedTrackId, isTrackRecording, setActiveSequencerTrackId, getActiveSequencerTrackId
} from './state.js';
import {
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary,
    loadSoundFromBrowserToTarget, playSlicePreview, playDrumSamplerPadPreview,
    loadSampleFile, loadDrumSamplerPadFile, autoSliceSample, addMasterEffect, removeMasterEffect,
    updateMasterEffectParam, reorderMasterEffect
} from './audio.js';
import {
    initializeUIModule, openTrackEffectsRackWindow, openTrackSequencerWindow, openGlobalControlsWindow,
    openTrackInspectorWindow, openMixerWindow, updateMixerWindow, openSoundBrowserWindow,
    renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary, highlightPlayingStep, drawWaveform,
    drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, updateDrumPadControlsUI, renderDrumSamplerPads,
    renderEffectsList, renderEffectControls
} from './ui.js';

console.log("SCRIPT EXECUTION STARTED - SnugOS (main.js refactored)");

// --- Global State & Variables (Pragmatically kept on `window` for this pass) ---
window.openWindows = {};
window.highestZIndex = 100;
window.isReconstructingDAW = false;
// Core audio nodes, MIDI access, and other library-dependent states
window.masterEffectsBusInput = null; window.masterEffectsChain = []; window.masterGainNode = null; window.masterMeter = null;
window.midiAccess = null; window.activeMIDIInput = null;
// Sound browser state
window.loadedZipFiles = {}; window.soundLibraryFileTrees = {}; window.currentLibraryName = null;
window.currentSoundFileTree = null; window.currentSoundBrowserPath = []; window.previewPlayer = null;
// Clipboard
window.clipboardData = { type: null, data: null, sourceTrackType: null, sequenceLength: null };

// --- Main App State (Managed internally, not on window) ---
let globalControlsUI = {}; // Will hold references to global control elements
const DESKTOP_BACKGROUND_KEY = 'snugosDesktopBackground';


// --- UI Update Router ---
// Central function to handle UI updates based on state changes
function handleTrackUIUpdate(trackId, reason, detail) {
    const track = getTrackById(trackId);
    if (!track) return;
    const inspectorWindow = window.openWindows[`trackInspector-${trackId}`];
    const mixerWindow = window.openWindows['mixer'];

    switch(reason) {
        case 'muteChanged':
        case 'soloChanged':
        case 'armChanged':
            if (inspectorWindow && !inspectorWindow.isMinimized) {
                const muteBtn = inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
                const soloBtn = inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
                const armBtn = inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);
                if (muteBtn) muteBtn.classList.toggle('muted', track.isMuted);
                if (soloBtn) soloBtn.classList.toggle('soloed', track.isSoloed);
                if (armBtn) armBtn.classList.toggle('armed', getArmedTrackId() === track.id);
            }
            if (mixerWindow && !mixerWindow.isMinimized) {
                updateMixerWindow(); // Redraw the whole mixer for simplicity
            }
            break;
        case 'effectsListChanged':
             if (window.openWindows[track.effectsRackWindowId] && !window.openWindows[track.effectsRackWindowId].isMinimized) {
                const rackWindow = window.openWindows[track.effectsRackWindowId];
                const listDiv = rackWindow.element.querySelector(`#effectsList-${track.id}`);
                const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-${track.id}`);
                renderEffectsList(track, 'track', listDiv, controlsContainer);
             }
             if (mixerWindow && !mixerWindow.isMinimized) updateMixerWindow(); // Effects count might be shown on mixer in future
            break;
        case 'samplerLoaded':
        case 'instrumentSamplerLoaded':
        case 'sampleSliced':
            if (inspectorWindow && !inspectorWindow.isMinimized) {
                if (track.type === 'Sampler') {
                    drawWaveform(track);
                    renderSamplePads(track);
                    updateSliceEditorUI(track);
                } else if (track.type === 'InstrumentSampler') {
                    drawInstrumentWaveform(track);
                }
                const dzContainer = inspectorWindow.element.querySelector('.drop-zone')?.parentElement;
                if(dzContainer) {
                    const audioData = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                    const inputId = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;
                    dzContainer.innerHTML = createDropZoneHTML(track.id, inputId, track.type, null, {originalFileName: audioData.fileName, status: 'loaded'});
                    dzContainer.querySelector(`#${inputId}`).onchange = (e) => loadSampleFile(e, track.id, track.type);
                }
            }
            break;
        case 'drumPadLoaded':
             if (inspectorWindow && !inspectorWindow.isMinimized) {
                updateDrumPadControlsUI(track);
                renderDrumSamplerPads(track);
             }
            break;
        case 'sequencerContentChanged':
            if (window.openWindows[track.sequencerWindowId]) {
                 openTrackSequencerWindow(trackId, true, window.openWindows[track.sequencerWindowId].options);
            }
            break;
    }
}


// --- Main Application Initialization ---
async function initializeSnugOS() {
    console.log("[Main] Initializing SnugOS...");

    // Set up background
    applyDesktopBackground(localStorage.getItem(DESKTOP_BACKGROUND_KEY));
    document.getElementById('customBgInput')?.addEventListener('change', handleCustomBackgroundUpload);

    // --- App Services Object (Dependency Injection) ---
    const appServices = {
        // State
        getTracks, getTrackById, addTrack: addTrackToState, captureStateForUndo, getArmedTrackId, getSoloedTrackId, getActiveSequencerTrackId,
        // UI
        openTrackInspectorWindow, openTrackEffectsRackWindow, openTrackSequencerWindow, openMixerWindow,
        openSoundBrowserWindow, openMasterEffectsRackWindow, updateMixerWindow, highlightPlayingStep,
        renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary,
        updateTaskbarTempoDisplay: (tempo) => {
            const el = document.getElementById('taskbarTempoDisplay');
            if(el) el.textContent = `${parseFloat(tempo).toFixed(1)} BPM`;
        },
        updateUndoRedoButtonsUI: (undoState, redoState) => {
            const menuUndo = document.getElementById('menuUndo');
            const menuRedo = document.getElementById('menuRedo');
            if (menuUndo) {
                menuUndo.classList.toggle('disabled', !undoState);
                menuUndo.title = undoState ? `Undo: ${undoState.description}` : 'Undo (Nothing to undo)';
            }
            if (menuRedo) {
                menuRedo.classList.toggle('disabled', !redoState);
                menuRedo.title = redoState ? `Redo: ${redoState.description}` : 'Redo (Nothing to redo)';
            }
        },
        updateRecordButtonUI: (isRec) => {
             if (globalControlsUI.recordBtnGlobal) {
                globalControlsUI.recordBtnGlobal.textContent = isRec ? 'Stop Rec' : 'Record';
                globalControlsUI.recordBtnGlobal.classList.toggle('recording', isRec);
            }
        },
        closeAllWindows: (isReconstruction = false) => {
            Object.values(window.openWindows).forEach(win => win.close(isReconstruction));
            window.openWindows = {};
        },
        updateTrackUI: handleTrackUIUpdate,
        // Audio
        initAudioContextAndMasterMeter, fetchSoundLibrary, loadSoundFromBrowserToTarget, loadSampleFile,
        loadDrumSamplerPadFile, autoSliceSample, playSlicePreview, playDrumSamplerPadPreview,
        addMasterEffect, removeMasterEffect, updateMasterEffectParam, reorderMasterEffect,
        // Event Handlers
        selectMIDIInput,
        handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer,
        // Other
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        uiElements: globalControlsUI
    };

    // Initialize all modules with the services they need
    initializeStateModule(appServices);
    initializeUIModule(appServices);
    initializeAudioModule(appServices);
    initializeEventHandlersModule(appServices);

    // Set up primary event listeners for the Start Menu, etc.
    const primaryAppContext = {
        addTrack: addTrackToState, openSoundBrowserWindow, undoLastAction, redoLastAction, saveProject,
        loadProject, exportToWav, openGlobalControlsWindow, openMixerWindow, openMasterEffectsRackWindow,
        handleProjectFileLoad,
        triggerCustomBackgroundUpload: () => document.getElementById('customBgInput')?.click(),
        removeCustomDesktopBackground,
        uiElements: globalControlsUI
    };
    initializePrimaryEventListeners(primaryAppContext);

    // Open the global controls window and use the callback to ensure its elements exist before proceeding
    openGlobalControlsWindow((elements) => {
        // Store references to the created UI elements
        globalControlsUI.playBtnGlobal = elements.playBtnGlobal;
        globalControlsUI.recordBtnGlobal = elements.recordBtnGlobal;
        globalControlsUI.tempoGlobalInput = elements.tempoGlobalInput;
        globalControlsUI.midiInputSelectGlobal = elements.midiInputSelectGlobal;
        globalControlsUI.masterMeterContainerGlobal = elements.masterMeterContainerGlobal;
        globalControlsUI.masterMeterBarGlobal = elements.masterMeterBarGlobal;
        globalControlsUI.midiIndicatorGlobal = elements.midiIndicatorGlobal;
        globalControlsUI.keyboardIndicatorGlobal = elements.keyboardIndicatorGlobal;

        // Now that the elements are guaranteed to exist, attach their event listeners
        attachGlobalControlEvents(globalControlsUI);
        // And initialize MIDI, which needs the dropdown element
        setupMIDI();
    });

    // Pre-load sound libraries in the background
    Object.entries(Constants.soundLibraries).forEach(([name, url]) => fetchSoundLibrary(name, url, true));

    // Start the animation loop for meters
    requestAnimationFrame(updateMetersLoop);
    appServices.updateUndoRedoButtonsUI(null, null); // Initial UI state for undo/redo

    showNotification("Welcome to SnugOS!", 2500);
    console.log("[Main] SnugOS Initialized.");
}

function updateMetersLoop() {
    // We need to get the UI elements every frame in case windows are opened/closed
    const mixerMasterMeterBar = document.getElementById('mixerMasterMeterBar');
    const tracks = getTracks();
    const openWindows = window.openWindows || {};

    updateMeters(globalControlsUI.masterMeterBarGlobal, globalControlsUI.masterMeterBarGlobal, mixerMasterMeterBar, tracks);

    // Decouple track meter updates
    tracks.forEach(track => {
        if (track?.trackMeter?.getValue) {
            const meterValue = track.trackMeter.getValue();
            const level = Tone.dbToGain(meterValue);
            const isClipping = meterValue > -0.1;

            const inspectorWindow = openWindows[`trackInspector-${track.id}`];
            if (inspectorWindow && !inspectorWindow.isMinimized) {
                const inspectorMeterBar = inspectorWindow.element.querySelector(`#trackMeterBar-${track.id}`);
                if (inspectorMeterBar) {
                    inspectorMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                    inspectorMeterBar.classList.toggle('clipping', isClipping);
                }
            }

            const mixerWindow = openWindows['mixer'];
            if (mixerWindow && !mixerWindow.isMinimized) {
                const mixerMeterBar = mixerWindow.element.querySelector(`#mixerTrackMeterBar-${track.id}`);
                 if (mixerMeterBar) {
                    mixerMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                    mixerMeterBar.classList.toggle('clipping', isClipping);
                }
            }
        }
    });

    requestAnimationFrame(updateMetersLoop);
}

function applyDesktopBackground(imageUrl) {
    const desktopEl = document.getElementById('desktop');
    if (desktopEl && imageUrl) {
        desktopEl.style.backgroundImage = `url('${imageUrl}')`;
        desktopEl.style.backgroundSize = 'cover';
        desktopEl.style.backgroundPosition = 'center center';
        desktopEl.style.backgroundRepeat = 'no-repeat';
        desktopEl.style.backgroundColor = '';
    } else if (desktopEl) {
        desktopEl.style.backgroundImage = '';
        desktopEl.style.backgroundColor = Constants.defaultDesktopBg || '#101010';
    }
}

function handleCustomBackgroundUpload(event) {
    const file = event.target.files[0];
    if (file?.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataURL = e.target.result;
            try {
                localStorage.setItem(DESKTOP_BACKGROUND_KEY, dataURL);
                applyDesktopBackground(dataURL);
                showNotification("Custom background applied.", 2000);
            } catch (error) {
                console.error("Error saving background to localStorage:", error);
                showNotification("Could not save background: Storage full or image too large.", 4000);
            }
        };
        reader.readAsDataURL(file);
    } else if (file) {
        showNotification("Invalid file type. Please select an image.", 3000);
    }
    if (event.target) event.target.value = null;
}

function removeCustomDesktopBackground() {
    localStorage.removeItem(DESKTOP_BACKGROUND_KEY);
    applyDesktopBackground(null);
    showNotification("Custom background removed.", 2000);
}

// --- Global Event Listeners ---
window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    // Check if there's unsaved work
    if (getTracks().length > 0 || getUndoStack().length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Standard for most browsers
    }
});
