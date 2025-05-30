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
    initializeStateModule,
    // State Getters (renamed with 'State' suffix)
    getTracksState, getTrackByIdState, getOpenWindowsState, getWindowByIdState, getHighestZState,
    getMasterEffectsState, getMasterGainNodeState, getMidiAccessState, getActiveMIDIInputState,
    getLoadedZipFilesState, getSoundLibraryFileTreesState, getCurrentLibraryNameState,
    getCurrentSoundFileTreeState, getCurrentSoundBrowserPathState, getPreviewPlayerState,
    getClipboardDataState, getArmedTrackIdState, getSoloedTrackIdState, isTrackRecordingState,
    getActiveSequencerTrackIdState, getUndoStackState, getRedoStackState,
    // State Setters (renamed with 'State' suffix)
    addWindowToStoreState, removeWindowFromStoreState, setHighestZState, incrementHighestZState,
    setMasterEffectsState, setMasterGainNodeState, setMidiAccessState, setActiveMIDIInputState,
    setLoadedZipFilesState, setSoundLibraryFileTreesState, setCurrentLibraryNameState,
    setCurrentSoundFileTreeState, setCurrentSoundBrowserPathState, setPreviewPlayerState,
    setClipboardDataState, setArmedTrackIdState, setSoloedTrackIdState, setIsRecordingState,
    setRecordingTrackIdState, setRecordingStartTimeState, setActiveSequencerTrackIdState,
    // Core State Actions
    addTrackToStateInternal, removeTrackFromStateInternal,
    captureStateForUndoInternal, undoLastActionInternal, redoLastActionInternal,
    gatherProjectDataInternal, reconstructDAWInternal, saveProjectInternal,
    loadProjectInternal, handleProjectFileLoadInternal, exportToWavInternal
} from './state.js';
import {
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary,
    loadSoundFromBrowserToTarget, playSlicePreview, playDrumSamplerPadPreview,
    loadSampleFile, loadDrumSamplerPadFile, autoSliceSample, addMasterEffectToAudio,
    removeMasterEffectFromAudio, updateMasterEffectParamInAudio, reorderMasterEffectInAudio,
    getMimeTypeFromFilename, getMasterEffectsBusInputNode // Getter for the actual Tone.js node
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

console.log("SCRIPT EXECUTION STARTED - SnugOS (main.js refactored v1)");

// --- Global UI Elements Cache ---
const uiElementsCache = {
    desktop: null,
    taskbar: null,
    startButton: null,
    startMenu: null,
    taskbarButtonsContainer: null,
    taskbarTempoDisplay: null,
    loadProjectInput: null,
    customBgInput: null,
    sampleFileInput: null,
    notificationArea: null,
    modalContainer: null,
    // Start Menu Items
    menuAddSynthTrack: null,
    menuAddSamplerTrack: null,
    menuAddDrumSamplerTrack: null,
    menuAddInstrumentSamplerTrack: null,
    menuOpenSoundBrowser: null,
    menuUndo: null,
    menuRedo: null,
    menuSaveProject: null,
    menuLoadProject: null,
    menuExportWav: null,
    menuOpenGlobalControls: null,
    menuOpenMixer: null,
    menuOpenMasterEffects: null,
    menuUploadCustomBg: null,
    menuRemoveCustomBg: null,
    menuToggleFullScreen: null,
    // Global Controls (will be populated when window opens)
    playBtnGlobal: null,
    recordBtnGlobal: null,
    tempoGlobalInput: null,
    midiInputSelectGlobal: null,
    masterMeterContainerGlobal: null,
    masterMeterBarGlobal: null,
    midiIndicatorGlobal: null,
    keyboardIndicatorGlobal: null,
};

const DESKTOP_BACKGROUND_KEY = 'snugosDesktopBackground';

// --- AppServices Object (centralized access to services and state) ---
// This object will be built up and passed around.
const appServices = {
    // UI Module Functions
    openTrackInspectorWindow, openTrackEffectsRackWindow, openTrackSequencerWindow,
    openMixerWindow, updateMixerWindow, openSoundBrowserWindow, openMasterEffectsRackWindow,
    renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary, highlightPlayingStep,
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI,
    updateDrumPadControlsUI, renderDrumSamplerPads, renderEffectsList, renderEffectControls,
    createKnob, updateSequencerCellUI, showNotification, createContextMenu,
    // Audio Module Functions
    initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary, loadSoundFromBrowserToTarget,
    playSlicePreview, playDrumSamplerPadPreview, loadSampleFile, loadDrumSamplerPadFile,
    autoSliceSample, getMimeTypeFromFilename,
    // State Module Getters (wrapped for consistent naming if desired, or direct)
    getTracks: getTracksState,
    getTrackById: getTrackByIdState,
    getOpenWindows: getOpenWindowsState,
    getWindowById: getWindowByIdState,
    getHighestZ: getHighestZState,
    getMasterEffects: getMasterEffectsState, // Gets the state representation
    getMasterGainNode: getMasterGainNodeState, // Gets the state representation of master gain
    getMidiAccess: getMidiAccessState,
    getActiveMIDIInput: getActiveMIDIInputState,
    getLoadedZipFiles: getLoadedZipFilesState,
    getSoundLibraryFileTrees: getSoundLibraryFileTreesState,
    getCurrentLibraryName: getCurrentLibraryNameState,
    getCurrentSoundFileTree: getCurrentSoundFileTreeState,
    getCurrentSoundBrowserPath: getCurrentSoundBrowserPathState,
    getPreviewPlayer: getPreviewPlayerState,
    getClipboardData: getClipboardDataState,
    getArmedTrackId: getArmedTrackIdState,
    getSoloedTrackId: getSoloedTrackIdState,
    isTrackRecording: isTrackRecordingState,
    getRecordingTrackId: getRecordingTrackIdState,
    getActiveSequencerTrackId: getActiveSequencerTrackIdState,
    getUndoStack: getUndoStackState,
    getRedoStack: getRedoStackState,
    getMasterEffectsBusInputNode, // Direct from audio.js for Tone.js node

    // State Module Setters (wrapped for consistent naming)
    addWindowToStore: addWindowToStoreState,
    removeWindowFromStore: removeWindowFromStoreState,
    setHighestZ: setHighestZState,
    incrementHighestZ: incrementHighestZState,
    setMasterEffects: setMasterEffectsState,
    setMasterGainNode: setMasterGainNodeState,
    setMidiAccess: setMidiAccessState,
    setActiveMIDIInput: setActiveMIDIInputState,
    setLoadedZipFiles: setLoadedZipFilesState,
    setSoundLibraryFileTrees: setSoundLibraryFileTreesState,
    setCurrentLibraryName: setCurrentLibraryNameState,
    setCurrentSoundFileTree: setCurrentSoundFileTreeState,
    setCurrentSoundBrowserPath: setCurrentSoundBrowserPathState,
    setPreviewPlayer: setPreviewPlayerState,
    setClipboardData: setClipboardDataState,
    setArmedTrackId: setArmedTrackIdState,
    setSoloedTrackId: setSoloedTrackIdState,
    setIsRecording: setIsRecordingState,
    setRecordingTrackId: setRecordingTrackIdState,
    setRecordingStartTime: setRecordingStartTimeState,
    setActiveSequencerTrackId: setActiveSequencerTrackIdState,

    // Core State Actions (wrapped)
    addTrack: addTrackToStateInternal,
    removeTrack: removeTrackFromStateInternal,
    captureStateForUndo: captureStateForUndoInternal,
    undoLastAction: undoLastActionInternal,
    redoLastAction: redoLastActionInternal,
    gatherProjectData: gatherProjectDataInternal,
    reconstructDAW: reconstructDAWInternal,
    saveProject: saveProjectInternal,
    loadProject: loadProjectInternal,
    handleProjectFileLoad: handleProjectFileLoadInternal,
    exportToWav: exportToWavInternal,

    // Event Handler Passthroughs (if needed, or eventHandlers directly use appServices)
    selectMIDIInput, handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer,

    // UI Update Triggers / Callbacks
    updateTaskbarTempoDisplay: (tempo) => {
        if (uiElementsCache.taskbarTempoDisplay) {
            uiElementsCache.taskbarTempoDisplay.textContent = `${parseFloat(tempo).toFixed(1)} BPM`;
        }
    },
    updateUndoRedoButtonsUI: (undoState, redoState) => {
        if (uiElementsCache.menuUndo) {
            uiElementsCache.menuUndo.classList.toggle('disabled', !undoState);
            uiElementsCache.menuUndo.title = undoState ? `Undo: ${undoState.description}` : 'Undo (Nothing to undo)';
        }
        if (uiElementsCache.menuRedo) {
            uiElementsCache.menuRedo.classList.toggle('disabled', !redoState);
            uiElementsCache.menuRedo.title = redoState ? `Redo: ${redoState.description}` : 'Redo (Nothing to redo)';
        }
    },
    updateRecordButtonUI: (isRec) => {
        if (uiElementsCache.recordBtnGlobal) {
            uiElementsCache.recordBtnGlobal.textContent = isRec ? 'Stop Rec' : 'Record';
            uiElementsCache.recordBtnGlobal.classList.toggle('recording', isRec);
        }
    },
    closeAllWindows: (isReconstruction = false) => {
        getOpenWindowsState().forEach(win => win.close(isReconstruction));
        openWindowsMap.clear(); // Reset after closing all
    },
    closeAllTrackWindows: (trackIdToClose) => {
        const windowIdsToClose = [
            `trackInspector-${trackIdToClose}`,
            `effectsRack-${trackIdToClose}`,
            `sequencerWin-${trackIdToClose}`
        ];
        windowIdsToClose.forEach(winId => {
            const win = getWindowByIdState(winId);
            if (win && typeof win.close === 'function') {
                win.close(true); // true for silent close
            }
        });
    },
    updateTrackUI: handleTrackUIUpdate, // Central UI update router
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices), // Pass appServices to SnugWindow
    uiElementsCache: uiElementsCache, // Provide cached DOM elements

    // Master Effects Chain - State and Audio interaction
    // These now interact with both state.js (for serializable data) and audio.js (for Tone.js nodes)
    addMasterEffect: async (effectType) => {
        const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;
        if (!isReconstructing) captureStateForUndoInternal(`Add ${effectType} to Master`);
        const defaultParams = appServices.getEffectDefaultParams(effectType); // Assuming this is exposed via appServices
        const effectIdInState = addMasterEffectToState(effectType, defaultParams); // Add to state.js
        await audioAddMasterEffectToChain(effectIdInState, effectType, defaultParams); // Add to audio.js and get ToneNode
        // No need to call rebuildMasterEffectChain here, audio.js should handle it
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    removeMasterEffect: async (effectId) => {
        const effect = getMasterEffectsState().find(e => e.id === effectId);
        if (effect) {
            const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;
            if (!isReconstructing) captureStateForUndoInternal(`Remove ${effect.type} from Master`);
            removeMasterEffectFromState(effectId); // Remove from state.js
            await removeMasterEffectFromAudio(effectId); // Remove from audio.js
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        }
    },
    updateMasterEffectParam: (effectId, paramPath, value) => {
        updateMasterEffectParamInState(effectId, paramPath, value); // Update state.js
        updateMasterEffectParamInAudio(effectId, paramPath, value); // Update audio.js
        // Potentially a targeted UI update for this specific control
    },
    reorderMasterEffect: (effectId, newIndex) => {
        const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;
        if (!isReconstructing) captureStateForUndoInternal(`Reorder Master effect`);
        reorderMasterEffectInState(effectId, newIndex); // Reorder in state.js
        reorderMasterEffectInAudio(effectId, newIndex); // Reorder in audio.js (which calls rebuild)
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    getEffectDefaultParams: (effectType) => { // Helper for addMasterEffect
        // This function might live in effectsRegistry.js and be exposed via appServices
        const { AVAILABLE_EFFECTS, getEffectDefaultParams: getParams } = appServices.effectsRegistryAccess;
        return getParams(effectType);
    },
    // Access to effects registry for UI and other modules
    effectsRegistryAccess: {
        AVAILABLE_EFFECTS: null, // Will be populated from effectsRegistry.js
        getEffectParamDefinitions: null, // Will be populated
    },
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag, // Internal flag
    _isReconstructingDAW_flag: false, // Internal flag for undo/redo/load
};


// --- UI Update Router ---
function handleTrackUIUpdate(trackId, reason, detail) {
    const track = getTrackByIdState(trackId);
    if (!track) {
        console.warn(`[Main UI Update] Track ${trackId} not found for reason: ${reason}`);
        return;
    }

    const inspectorWindow = getWindowByIdState(`trackInspector-${trackId}`);
    const effectsRackWindow = getWindowByIdState(`effectsRack-${trackId}`);
    const sequencerWindow = getWindowByIdState(`sequencerWin-${trackId}`);
    const mixerWindow = getWindowByIdState('mixer');

    switch(reason) {
        case 'muteChanged':
        case 'soloChanged':
        case 'armChanged':
            if (inspectorWindow && !inspectorWindow.isMinimized && inspectorWindow.element) {
                const muteBtn = inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
                const soloBtn = inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
                const armBtn = inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);
                if (muteBtn) muteBtn.classList.toggle('muted', track.isMuted);
                if (soloBtn) soloBtn.classList.toggle('soloed', getSoloedTrackIdState() === track.id);
                if (armBtn) armBtn.classList.toggle('armed', getArmedTrackIdState() === track.id);
            }
            if (mixerWindow && !mixerWindow.isMinimized) {
                updateMixerWindow(); // Redraw the whole mixer
            }
            break;
        case 'effectsListChanged':
             if (effectsRackWindow && !effectsRackWindow.isMinimized && effectsRackWindow.element) {
                const listDiv = effectsRackWindow.element.querySelector(`#effectsList-${track.id}`);
                const controlsContainer = effectsRackWindow.element.querySelector(`#effectControlsContainer-${track.id}`);
                renderEffectsList(track, 'track', listDiv, controlsContainer);
             }
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
                const dzContainerId = track.type === 'Sampler' ? `#dropZoneContainer-${track.id}-sampler` : `#dropZoneContainer-${track.id}-instrumentsampler`;
                const dzContainer = inspectorWindow.element.querySelector(dzContainerId);
                if(dzContainer) {
                    const audioData = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                    const inputId = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;
                    dzContainer.innerHTML = createDropZoneHTML(track.id, inputId, track.type, null, {originalFileName: audioData.fileName, status: 'loaded'});
                    const fileInputEl = dzContainer.querySelector(`#${inputId}`);
                    if (fileInputEl) fileInputEl.onchange = (e) => loadSampleFile(e, track.id, track.type);
                }
            }
            break;
        case 'drumPadLoaded': // detail here would be padIndex
             if (inspectorWindow && !inspectorWindow.isMinimized && inspectorWindow.element) {
                updateDrumPadControlsUI(track);
                renderDrumSamplerPads(track);
             }
            break;
        case 'sequencerContentChanged':
            if (sequencerWindow && !sequencerWindow.isMinimized && sequencerWindow.element) {
                 openTrackSequencerWindow(trackId, true, sequencerWindow.options); // forceRedraw = true
            }
            break;
        case 'sampleLoadError':
            if (inspectorWindow && !inspectorWindow.isMinimized && inspectorWindow.element) {
                let dzContainerId, audioDataKey, inputIdBase;
                if (track.type === 'DrumSampler' && typeof detail === 'number') { // detail is padIndex
                    dzContainerId = `#drumPadDropZoneContainer-${track.id}-${detail}`;
                    audioDataKey = track.drumSamplerPads[detail];
                    inputIdBase = `drumPadFileInput-${track.id}-${detail}`;
                } else if (track.type === 'Sampler') {
                    dzContainerId = `#dropZoneContainer-${track.id}-sampler`;
                    audioDataKey = track.samplerAudioData;
                    inputIdBase = `fileInput-${track.id}`;
                } else if (track.type === 'InstrumentSampler') {
                    dzContainerId = `#dropZoneContainer-${track.id}-instrumentsampler`;
                    audioDataKey = track.instrumentSamplerSettings;
                    inputIdBase = `instrumentFileInput-${track.id}`;
                }

                if (dzContainerId && audioDataKey) {
                    const dzContainer = inspectorWindow.element.querySelector(dzContainerId);
                    if (dzContainer) {
                        dzContainer.innerHTML = createDropZoneHTML(track.id, inputIdBase, track.type, (track.type === 'DrumSampler' ? detail : null), {originalFileName: audioDataKey.fileName, status: 'error'});
                        const fileInputEl = dzContainer.querySelector(`#${inputIdBase}`);
                        if (fileInputEl) {
                            if (track.type === 'DrumSampler') {
                                fileInputEl.onchange = (e) => loadDrumSamplerPadFile(e, track.id, detail);
                            } else {
                                fileInputEl.onchange = (e) => loadSampleFile(e, track.id, track.type);
                            }
                        }
                    }
                }
            }
            break;
        // Add other cases as needed
    }
}


// --- Main Application Initialization ---
async function initializeSnugOS() {
    console.log("[Main] Initializing SnugOS...");

    // Cache DOM Elements
    uiElementsCache.desktop = document.getElementById('desktop');
    uiElementsCache.taskbar = document.getElementById('taskbar');
    uiElementsCache.startButton = document.getElementById('startButton');
    uiElementsCache.startMenu = document.getElementById('startMenu');
    uiElementsCache.taskbarButtonsContainer = document.getElementById('taskbarButtons');
    uiElementsCache.taskbarTempoDisplay = document.getElementById('taskbarTempoDisplay');
    uiElementsCache.loadProjectInput = document.getElementById('loadProjectInput');
    uiElementsCache.customBgInput = document.getElementById('customBgInput');
    uiElementsCache.sampleFileInput = document.getElementById('sampleFileInput');
    uiElementsCache.notificationArea = document.getElementById('notification-area');
    uiElementsCache.modalContainer = document.getElementById('modalContainer');
    uiElementsCache.menuAddSynthTrack = document.getElementById('menuAddSynthTrack');
    uiElementsCache.menuAddSamplerTrack = document.getElementById('menuAddSamplerTrack');
    uiElementsCache.menuAddDrumSamplerTrack = document.getElementById('menuAddDrumSamplerTrack');
    uiElementsCache.menuAddInstrumentSamplerTrack = document.getElementById('menuAddInstrumentSamplerTrack');
    uiElementsCache.menuOpenSoundBrowser = document.getElementById('menuOpenSoundBrowser');
    uiElementsCache.menuUndo = document.getElementById('menuUndo');
    uiElementsCache.menuRedo = document.getElementById('menuRedo');
    uiElementsCache.menuSaveProject = document.getElementById('menuSaveProject');
    uiElementsCache.menuLoadProject = document.getElementById('menuLoadProject');
    uiElementsCache.menuExportWav = document.getElementById('menuExportWav');
    uiElementsCache.menuOpenGlobalControls = document.getElementById('menuOpenGlobalControls');
    uiElementsCache.menuOpenMixer = document.getElementById('menuOpenMixer');
    uiElementsCache.menuOpenMasterEffects = document.getElementById('menuOpenMasterEffects');
    uiElementsCache.menuUploadCustomBg = document.getElementById('menuUploadCustomBg');
    uiElementsCache.menuRemoveCustomBg = document.getElementById('menuRemoveCustomBg');
    uiElementsCache.menuToggleFullScreen = document.getElementById('menuToggleFullScreen');

    // Populate effectsRegistryAccess in appServices
    const effectsRegistry = await import('./effectsRegistry.js');
    appServices.effectsRegistryAccess.AVAILABLE_EFFECTS = effectsRegistry.AVAILABLE_EFFECTS;
    appServices.effectsRegistryAccess.getEffectParamDefinitions = effectsRegistry.getEffectParamDefinitions;
    appServices.effectsRegistryAccess.getEffectDefaultParams = effectsRegistry.getEffectDefaultParams; // Make sure this is exported from effectsRegistry

    applyDesktopBackground(localStorage.getItem(DESKTOP_BACKGROUND_KEY));
    if (uiElementsCache.customBgInput) {
        uiElementsCache.customBgInput.addEventListener('change', handleCustomBackgroundUpload);
    }

    // Initialize all modules, passing appServices
    initializeStateModule(appServices);
    initializeUIModule(appServices);
    initializeAudioModule(appServices);
    initializeEventHandlersModule(appServices);


    // Primary event listeners (e.g., Start Menu) now use appServices for actions
    // and uiElementsCache for DOM elements
    initializePrimaryEventListeners(appServices); // eventHandlers.js will use appServices

    // Open global controls and get references to its elements
    openGlobalControlsWindow((elements) => {
        uiElementsCache.playBtnGlobal = elements.playBtnGlobal;
        uiElementsCache.recordBtnGlobal = elements.recordBtnGlobal;
        uiElementsCache.tempoGlobalInput = elements.tempoGlobalInput;
        uiElementsCache.midiInputSelectGlobal = elements.midiInputSelectGlobal;
        uiElementsCache.masterMeterContainerGlobal = elements.masterMeterContainerGlobal;
        uiElementsCache.masterMeterBarGlobal = elements.masterMeterBarGlobal;
        uiElementsCache.midiIndicatorGlobal = elements.midiIndicatorGlobal;
        uiElementsCache.keyboardIndicatorGlobal = elements.keyboardIndicatorGlobal;
        // Pass the now populated globalControlsUI part of uiElementsCache
        attachGlobalControlEvents(elements); // eventHandlers.js will use these
        setupMIDI(); // eventHandlers.js
    }, null /* no saved state for initial open */);

    Object.entries(Constants.soundLibraries).forEach(([name, url]) => fetchSoundLibrary(name, url, true));

    requestAnimationFrame(updateMetersLoop);
    appServices.updateUndoRedoButtonsUI(null, null); // Initial UI state for undo/redo

    showNotification("Welcome to SnugOS!", 2500);
    console.log("[Main] SnugOS Initialized.");
}

function updateMetersLoop() {
    // Pass the cached global master meter bar, and the direct element for mixer if open
    const mixerWindow = getWindowByIdState('mixer');
    const mixerMasterMeterBar = mixerWindow && !mixerWindow.isMinimized && mixerWindow.element ? mixerWindow.element.querySelector('#mixerMasterMeterBar') : null;

    updateMeters(
        uiElementsCache.masterMeterBarGlobal, // Global controls meter bar
        mixerMasterMeterBar,                  // Mixer's master meter bar (if visible)
        getTracksState()                      // Current tracks from state
    );
    requestAnimationFrame(updateMetersLoop);
}

function applyDesktopBackground(imageUrl) {
    if (uiElementsCache.desktop && imageUrl) {
        uiElementsCache.desktop.style.backgroundImage = `url('${imageUrl}')`;
        uiElementsCache.desktop.style.backgroundSize = 'cover';
        uiElementsCache.desktop.style.backgroundPosition = 'center center';
        uiElementsCache.desktop.style.backgroundRepeat = 'no-repeat';
        uiElementsCache.desktop.style.backgroundColor = '';
    } else if (uiElementsCache.desktop) {
        uiElementsCache.desktop.style.backgroundImage = '';
        uiElementsCache.desktop.style.backgroundColor = Constants.defaultDesktopBg || '#101010';
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
        reader.onerror = (err) => {
            console.error("Error reading background file:", err);
            showNotification("Error reading background file.", 3000);
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
    if (getTracksState().length > 0 || getUndoStackState().length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Standard for most browsers
    }
});

console.log("SCRIPT EXECUTION FINISHED - SnugOS (main.js refactored v1)");
