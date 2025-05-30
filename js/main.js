// js/main.js - Main Application Logic Orchestrator (Improved)

// --- Module Imports ---
import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import { showNotification, createContextMenu, createDropZoneHTML, setupGenericDropZoneListeners } from './utils.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    // Direct event handlers like handleTrackMute are not called from main, but from UI/eventHandlers themselves
} from './eventHandlers.js';
import {
    initializeStateModule, getTracks, getTrackById, addTrackToState,
    captureStateForUndo, undoLastAction, redoLastAction, gatherProjectData, reconstructDAW, saveProject,
    loadProject, handleProjectFileLoad, exportToWav, getUndoStack,
    getArmedTrackId, getSoloedTrackId, isTrackRecording, setActiveSequencerTrackId, getActiveSequencerTrackId,
    setRecordingTrackId, setIsRecording,
    // Import new state accessors
    getOpenWindows, addWindowToStore, removeWindowFromStore,
    getHighestZIndex, incrementHighestZIndex,
    getIsReconstructingDAW, setIsReconstructingDAW,
    getMasterEffectsChain, setMasterEffectsChain,
    getActiveMIDIInput, setActiveMIDIInput,
    getMidiAccess, setMidiAccess,
    getLoadedZipFiles, getSoundLibraryFileTrees,
    getCurrentLibraryName, setCurrentLibraryName,
    getCurrentSoundFileTree, setCurrentSoundFileTree,
    getCurrentSoundBrowserPath,
    getPreviewPlayer, setPreviewPlayer,
    getClipboardData, setClipboardData,
    getMasterGainNodeValue, setMasterGainNodeValue
} from './state.js';
import {
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary,
    loadSoundFromBrowserToTarget, playSlicePreview, playDrumSamplerPadPreview,
    loadSampleFile, loadDrumSamplerPadFile, autoSliceSample, addMasterEffect, removeMasterEffect,
    updateMasterEffectParam, reorderMasterEffect, getMimeTypeFromFilename,
    rebuildMasterEffectChain as audioRebuildMasterEffectChain // For direct call if needed
} from './audio.js';
import {
    initializeUIModule, openTrackEffectsRackWindow, openTrackSequencerWindow, openGlobalControlsWindow,
    openTrackInspectorWindow, openMixerWindow, updateMixerWindow, openSoundBrowserWindow,
    renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary, highlightPlayingStep, drawWaveform,
    drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, updateDrumPadControlsUI, renderDrumSamplerPads,
    renderEffectsList, renderEffectControls, createKnob,
    updateSequencerCellUI,
    openMasterEffectsRackWindow
} from './ui.js';

console.log("SCRIPT EXECUTION STARTED - SnugOS (main.js improved)");

// --- Main App State (Managed via state.js or appServices) ---
let globalControlsUI = {}; // Holds references to global control DOM elements
const domCache = {}; // For caching frequently accessed static DOM elements
const DESKTOP_BACKGROUND_KEY = 'snugosDesktopBackground';


// --- UI Update Router ---
function handleTrackUIUpdate(trackId, reason, detail) {
    const track = getTrackById(trackId);
    if (!track) return;

    const openWindows = getOpenWindows(); // Use getter from state.js
    const inspectorWindow = openWindows[`trackInspector-${trackId}`];
    const effectsRackWindow = openWindows[`effectsRack-${trackId}`];
    const sequencerWindow = openWindows[`sequencerWin-${trackId}`];
    const mixerWindow = openWindows['mixer'];


    switch(reason) {
        case 'muteChanged':
        case 'soloChanged':
        case 'armChanged':
            if (inspectorWindow && !inspectorWindow.isMinimized && inspectorWindow.element) {
                const muteBtn = inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
                const soloBtn = inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
                const armBtn = inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);
                if (muteBtn) muteBtn.classList.toggle('muted', track.isMuted);
                if (soloBtn) soloBtn.classList.toggle('soloed', getSoloedTrackId() === track.id);
                if (armBtn) armBtn.classList.toggle('armed', getArmedTrackId() === track.id);
            }
            if (mixerWindow && !mixerWindow.isMinimized) {
                updateMixerWindow();
            }
            break;
        case 'effectsListChanged':
             if (effectsRackWindow && !effectsRackWindow.isMinimized && effectsRackWindow.element) {
                const listDiv = effectsRackWindow.element.querySelector(`#effectsList-${track.id}`);
                const controlsContainer = effectsRackWindow.element.querySelector(`#effectControlsContainer-${track.id}`);
                renderEffectsList(track, 'track', listDiv, controlsContainer);
             }
             if (mixerWindow && !mixerWindow.isMinimized) updateMixerWindow();
            break;
        case 'samplerLoaded':
        case 'instrumentSamplerLoaded':
        case 'sampleSliced':
            if (inspectorWindow && !inspectorWindow.isMinimized && inspectorWindow.element) {
                if (track.type === 'Sampler') {
                    drawWaveform(track);
                    renderSamplePads(track);
                    updateSliceEditorUI(track);
                } else if (track.type === 'InstrumentSampler') {
                    drawInstrumentWaveform(track);
                }
                const dzContainer = inspectorWindow.element.querySelector(track.type === 'Sampler' ? `#dropZoneContainer-${track.id}-sampler` : `#dropZoneContainer-${track.id}-instrumentsampler`);
                if(dzContainer) {
                    const audioData = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                    const inputId = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;
                    dzContainer.innerHTML = createDropZoneHTML(track.id, inputId, track.type, null, {originalFileName: audioData.fileName, status: 'loaded'});
                    const fileInputEl = dzContainer.querySelector(`#${inputId}`);
                    if (fileInputEl) fileInputEl.onchange = (e) => loadSampleFile(e, track.id, track.type);
                }
            }
            break;
        case 'drumPadLoaded':
             if (inspectorWindow && !inspectorWindow.isMinimized && inspectorWindow.element) {
                updateDrumPadControlsUI(track);
                renderDrumSamplerPads(track);
             }
            break;
        case 'sequencerContentChanged':
            if (sequencerWindow && !sequencerWindow.isMinimized && sequencerWindow.element) {
                 openTrackSequencerWindow(trackId, true, sequencerWindow.options);
            }
            break;
        case 'sampleLoadError':
            if (inspectorWindow && !inspectorWindow.isMinimized && inspectorWindow.element) {
                if (track.type === 'DrumSampler' && detail !== undefined) {
                    updateDrumPadControlsUI(track);
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

    // Cache static DOM elements
    domCache.desktop = document.getElementById('desktop');
    domCache.customBgInput = document.getElementById('customBgInput');
    domCache.loadProjectInput = document.getElementById('loadProjectInput');
    // Add other frequently accessed static elements if needed

    applyDesktopBackground(localStorage.getItem(DESKTOP_BACKGROUND_KEY));
    if (domCache.customBgInput) {
        domCache.customBgInput.addEventListener('change', handleCustomBackgroundUpload);
    }


    const appServicesForModules = {
        // State accessors and mutators
        getTracks, getTrackById, addTrack: addTrackToState, captureStateForUndo, getArmedTrackId, getSoloedTrackId,
        getActiveSequencerTrackId, setActiveSequencerTrackId,
        getUndoStack, // For beforeunload check
        // Global-like state accessors from state.js will be added by initializeStateModule
        getOpenWindows, addWindowToStore, removeWindowFromStore,
        getHighestZIndex, incrementHighestZIndex, setHighestZIndex,
        getIsReconstructingDAW, setIsReconstructingDAW,
        getMasterEffectsChain, setMasterEffectsChain,
        getActiveMIDIInput, setActiveMIDIInput,
        getMidiAccess, setMidiAccess,
        getLoadedZipFiles, getSoundLibraryFileTrees,
        getCurrentLibraryName, setCurrentLibraryName,
        getCurrentSoundFileTree, setCurrentSoundFileTree,
        getCurrentSoundBrowserPath,
        getPreviewPlayer, setPreviewPlayer,
        getClipboardData, setClipboardData,
        getMasterGainNodeValue, setMasterGainNodeValue,

        // UI functions
        openTrackInspectorWindow, openTrackEffectsRackWindow, openTrackSequencerWindow, openMixerWindow,
        openSoundBrowserWindow, openMasterEffectsRackWindow, updateMixerWindow, highlightPlayingStep,
        renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary,
        updateTaskbarTempoDisplay: (tempo) => {
            const el = document.getElementById('taskbarTempoDisplay'); // Taskbar element might not be cached if dynamic
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
            Object.values(getOpenWindows()).forEach(win => win.close(isReconstruction));
            // _openWindows is managed in state.js, so clear it there if needed, or rely on SnugWindow.onCloseCallback
        },
        closeAllTrackWindows: (trackIdToClose) => {
            const windowIdsToClose = [
                `trackInspector-${trackIdToClose}`,
                `effectsRack-${trackIdToClose}`,
                `sequencerWin-${trackIdToClose}`
            ];
            const currentOpenWindows = getOpenWindows();
            windowIdsToClose.forEach(winId => {
                if (currentOpenWindows[winId] && typeof currentOpenWindows[winId].close === 'function') {
                    currentOpenWindows[winId].close(true); // true for silent close
                }
            });
        },
        updateTrackUI: handleTrackUIUpdate,
        // Audio functions
        initAudioContextAndMasterMeter, fetchSoundLibrary, loadSoundFromBrowserToTarget, loadSampleFile,
        loadDrumSamplerPadFile, autoSliceSample, playSlicePreview, playDrumSamplerPadPreview,
        addMasterEffect, removeMasterEffect, updateMasterEffectParam, reorderMasterEffect,
        rebuildMasterEffectChain: audioRebuildMasterEffectChain, // Expose for state.js reconstructDAW
        // MIDI
        selectMIDIInput: (id, skipNotify) => { // Wrapper for eventhandlers.selectMIDIInput
            // This assumes selectMIDIInput is exported from eventhandlers and available
            // If selectMIDIInput is not directly part of appServices, eventhandlers.js uses its local one
        },
        // Window creation
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServicesForModules),
        // DOM element references
        uiElements: globalControlsUI, // For global control buttons, indicators
        domCache: domCache,          // For other static DOM elements
        // State setters needed by other modules (e.g., eventHandlers)
        setIsRecording, setRecordingTrackId,
        // UI update functions for specific components
        updateSequencerCellUI, updateDrumPadControlsUI,
    };

    initializeStateModule(appServicesForModules); // This will also populate appServicesForModules with state accessors
    initializeUIModule(appServicesForModules);
    initializeAudioModule(appServicesForModules);
    initializeEventHandlersModule(appServicesForModules);

    // Context for primary event listeners (Start Menu, global file inputs)
    const primaryAppContext = {
        addTrack: addTrackToState, openSoundBrowserWindow, undoLastAction, redoLastAction, saveProject,
        loadProject, exportToWav, openGlobalControlsWindow, openMixerWindow, openMasterEffectsRackWindow,
        handleProjectFileLoad,
        triggerCustomBackgroundUpload: () => domCache.customBgInput?.click(),
        removeCustomDesktopBackground,
        uiElements: globalControlsUI, // Pass the live object for global controls
        domCache: domCache,          // Pass the cache for static elements
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
        attachGlobalControlEvents(globalControlsUI); // Attaches listeners to these elements
        setupMIDI(); // Sets up MIDI access and populates the select dropdown
    });

    Object.entries(Constants.soundLibraries).forEach(([name, url]) => fetchSoundLibrary(name, url, true));

    requestAnimationFrame(updateMetersLoop);
    appServicesForModules.updateUndoRedoButtonsUI(null, null); // Initial UI state for undo/redo

    showNotification("Welcome to SnugOS!", 2500);
    console.log("[Main] SnugOS Initialized.");
}

function updateMetersLoop() {
    const mixerMasterMeterBar = document.getElementById('mixerMasterMeterBar'); // Mixer elements are dynamic
    const currentTracks = getTracks(); // Use getter
    // Pass globalControlsUI elements directly for master meter
    updateMeters(globalControlsUI.masterMeterBarGlobal, globalControlsUI.masterMeterBarGlobal, mixerMasterMeterBar, currentTracks);
    requestAnimationFrame(updateMetersLoop);
}

function applyDesktopBackground(imageUrl) {
    if (domCache.desktop && imageUrl) {
        domCache.desktop.style.backgroundImage = `url('${imageUrl}')`;
        domCache.desktop.style.backgroundSize = 'cover';
        domCache.desktop.style.backgroundPosition = 'center center';
        domCache.desktop.style.backgroundRepeat = 'no-repeat';
        domCache.desktop.style.backgroundColor = '';
    } else if (domCache.desktop) {
        domCache.desktop.style.backgroundImage = '';
        domCache.desktop.style.backgroundColor = Constants.defaultDesktopBg || '#101010';
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
    if (getTracks().length > 0 || getUndoStack().length > 0) { // Use getters
        e.preventDefault();
        e.returnValue = '';
    }
});

console.log("SCRIPT EXECUTION FINISHED - SnugOS (main.js improved)");
