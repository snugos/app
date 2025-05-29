// js/main.js - Main Application Logic Orchestrator

// --- Module Imports ---
import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import { showNotification, createContextMenu, createDropZoneHTML, setupGenericDropZoneListeners } from './utils.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    selectMIDIInput, handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js';
import {
    initializeStateModule, getTracks, getTrackById, addTrackToState, removeTrackFromState as coreRemoveTrackFromState,
    captureStateForUndo, undoLastAction, redoLastAction, gatherProjectData, reconstructDAW, saveProject,
    loadProject, handleProjectFileLoad, exportToWav, getUndoStack,
    getArmedTrackId, getSoloedTrackId, isTrackRecording, setActiveSequencerTrackId, getActiveSequencerTrackId,
    setRecordingTrackId, setIsRecording // Added missing setters that state.js exports
} from './state.js';
import {
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary,
    loadSoundFromBrowserToTarget, playSlicePreview, playDrumSamplerPadPreview,
    loadSampleFile, loadDrumSamplerPadFile, autoSliceSample, addMasterEffect, removeMasterEffect,
    updateMasterEffectParam, reorderMasterEffect, getMimeTypeFromFilename
} from './audio.js';
import {
    initializeUIModule, openTrackEffectsRackWindow, openTrackSequencerWindow, openGlobalControlsWindow,
    openTrackInspectorWindow, openMixerWindow, updateMixerWindow, openSoundBrowserWindow,
    renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary, highlightPlayingStep, drawWaveform,
    drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, updateDrumPadControlsUI, renderDrumSamplerPads,
    renderEffectsList, renderEffectControls, createKnob,
    updateSequencerCellUI
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
    const track = getTrackById(trackId); // from state.js
    if (!track) return;

    // Safely get window instances from the global window.openWindows
    const inspectorWindow = window.openWindows[`trackInspector-${trackId}`];
    const effectsRackWindow = window.openWindows[`effectsRack-${trackId}`];
    const sequencerWindow = window.openWindows[`sequencerWin-${trackId}`];
    const mixerWindow = window.openWindows['mixer'];


    switch(reason) {
        case 'muteChanged':
        case 'soloChanged':
        case 'armChanged':
            if (inspectorWindow && !inspectorWindow.isMinimized && inspectorWindow.element) {
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
             if (effectsRackWindow && !effectsRackWindow.isMinimized && effectsRackWindow.element) {
                const listDiv = effectsRackWindow.element.querySelector(`#effectsList-${track.id}`);
                const controlsContainer = effectsRackWindow.element.querySelector(`#effectControlsContainer-${track.id}`);
                renderEffectsList(track, 'track', listDiv, controlsContainer);
             }
             if (mixerWindow && !mixerWindow.isMinimized) updateMixerWindow(); // Effects count might be shown on mixer in future
            break;
        case 'samplerLoaded':
        case 'instrumentSamplerLoaded':
        case 'sampleSliced': // This case implies a sample was loaded and then sliced
            if (inspectorWindow && !inspectorWindow.isMinimized && inspectorWindow.element) {
                if (track.type === 'Sampler') {
                    drawWaveform(track); // from ui.js
                    renderSamplePads(track); // from ui.js
                    updateSliceEditorUI(track); // from ui.js
                } else if (track.type === 'InstrumentSampler') {
                    drawInstrumentWaveform(track); // from ui.js
                }
                // Update dropzone text
                const dzContainer = inspectorWindow.element.querySelector(track.type === 'Sampler' ? `#dropZoneContainer-${track.id}-sampler` : `#dropZoneContainer-${track.id}-instrumentsampler`);
                if(dzContainer) {
                    const audioData = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                    const inputId = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;
                    dzContainer.innerHTML = createDropZoneHTML(track.id, inputId, track.type, null, {originalFileName: audioData.fileName, status: 'loaded'});
                    // Re-attach listener to the new input
                    const fileInputEl = dzContainer.querySelector(`#${inputId}`);
                    if (fileInputEl) fileInputEl.onchange = (e) => loadSampleFile(e, track.id, track.type);
                }
            }
            break;
        case 'drumPadLoaded': // detail here would be padIndex
             if (inspectorWindow && !inspectorWindow.isMinimized && inspectorWindow.element) {
                updateDrumPadControlsUI(track); // from ui.js
                renderDrumSamplerPads(track); // from ui.js
             }
            break;
        case 'sequencerContentChanged':
            // If sequencer window is open, refresh its content
            if (sequencerWindow && !sequencerWindow.isMinimized && sequencerWindow.element) {
                 openTrackSequencerWindow(trackId, true, sequencerWindow.options); // forceRedraw = true
            }
            break;
        case 'sampleLoadError': // detail might be padIndex for drum sampler
            if (inspectorWindow && !inspectorWindow.isMinimized && inspectorWindow.element) {
                if (track.type === 'DrumSampler' && detail !== undefined) {
                    updateDrumPadControlsUI(track); // To show error state on dropzone
                } else if (track.type === 'Sampler' || track.type === 'InstrumentSampler') {
                    const dzContainerId = track.type === 'Sampler' ? `dropZoneContainer-${track.id}-sampler` : `dropZoneContainer-${track.id}-instrumentsampler`;
                    const dzContainer = inspectorWindow.element.querySelector(`#${dzContainerId}`);
                    if (dzContainer) {
                        const audioData = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                        const inputId = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;
                        dzContainer.innerHTML = createDropZoneHTML(track.id, inputId, track.type, null, {originalFileName: audioData.fileName, status: 'error'});
                        const fileInputEl = dzContainer.querySelector(`#${inputId}`);
                        if (fileInputEl) fileInputEl.onchange = (e) => loadSampleFile(e, track.id, track.type);
                    }
                }
            }
            break;
    }
}


// --- Main Application Initialization ---
async function initializeSnugOS() {
    console.log("[Main] Initializing SnugOS...");

    applyDesktopBackground(localStorage.getItem(DESKTOP_BACKGROUND_KEY));
    document.getElementById('customBgInput')?.addEventListener('change', handleCustomBackgroundUpload);

    const appServices = {
        getTracks, getTrackById, addTrack: addTrackToState, captureStateForUndo, getArmedTrackId, getSoloedTrackId,
        getActiveSequencerTrackId, setActiveSequencerTrackId,
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
            window.openWindows = {}; // Reset after closing all
        },
        closeAllTrackWindows: (trackIdToClose) => { // New service for Track.dispose
            const windowIdsToClose = [
                `trackInspector-${trackIdToClose}`,
                `effectsRack-${trackIdToClose}`,
                `sequencerWin-${trackIdToClose}`
            ];
            windowIdsToClose.forEach(winId => {
                if (window.openWindows[winId] && typeof window.openWindows[winId].close === 'function') {
                    window.openWindows[winId].close(true); // true for isReconstruction/silent close
                }
            });
        },
        updateTrackUI: handleTrackUIUpdate,
        initAudioContextAndMasterMeter, fetchSoundLibrary, loadSoundFromBrowserToTarget, loadSampleFile,
        loadDrumSamplerPadFile, autoSliceSample, playSlicePreview, playDrumSamplerPadPreview,
        addMasterEffect, removeMasterEffect, updateMasterEffectParam, reorderMasterEffect,
        selectMIDIInput,
        handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer,
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        uiElements: globalControlsUI, // Pass the reference to the global UI elements object
        // State setters needed by eventHandlers
        setIsRecording, setRecordingTrackId,
        // UI functions that might be called from eventHandlers or state
        updateSequencerCellUI, updateDrumPadControlsUI,
    };

    initializeStateModule(appServices);
    initializeUIModule(appServices);
    initializeAudioModule(appServices);
    initializeEventHandlersModule(appServices);

    const primaryAppContext = {
        addTrack: addTrackToState, openSoundBrowserWindow, undoLastAction, redoLastAction, saveProject,
        loadProject, exportToWav, openGlobalControlsWindow, openMixerWindow, openMasterEffectsRackWindow,
        handleProjectFileLoad,
        triggerCustomBackgroundUpload: () => document.getElementById('customBgInput')?.click(),
        removeCustomDesktopBackground,
        uiElements: globalControlsUI // Pass the live object
    };
    initializePrimaryEventListeners(primaryAppContext);

    openGlobalControlsWindow((elements) => {
        globalControlsUI.playBtnGlobal = elements.playBtnGlobal;
        globalControlsUI.recordBtnGlobal = elements.recordBtnGlobal;
        globalControlsUI.tempoGlobalInput = elements.tempoGlobalInput;
        globalControlsUI.midiInputSelectGlobal = elements.midiInputSelectGlobal;
        globalControlsUI.masterMeterContainerGlobal = elements.masterMeterContainerGlobal;
        globalControlsUI.masterMeterBarGlobal = elements.masterMeterBarGlobal;
        globalControlsUI.midiIndicatorGlobal = elements.midiIndicatorGlobal;
        globalControlsUI.keyboardIndicatorGlobal = elements.keyboardIndicatorGlobal;
        attachGlobalControlEvents(globalControlsUI);
        setupMIDI();
    });

    Object.entries(Constants.soundLibraries).forEach(([name, url]) => fetchSoundLibrary(name, url, true));

    requestAnimationFrame(updateMetersLoop);
    appServices.updateUndoRedoButtonsUI(null, null);

    showNotification("Welcome to SnugOS!", 2500);
    console.log("[Main] SnugOS Initialized.");
}

function updateMetersLoop() {
    const mixerMasterMeterBar = document.getElementById('mixerMasterMeterBar');
    const currentTracks = getTracks();
    updateMeters(globalControlsUI.masterMeterBarGlobal, globalControlsUI.masterMeterBarGlobal, mixerMasterMeterBar, currentTracks);
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

window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    if (getTracks().length > 0 || getUndoStack().length > 0) {
        e.preventDefault();
        e.returnValue = '';
    }
});

console.log("SCRIPT EXECUTION FINISHED - SnugOS (main.js refactored)");
