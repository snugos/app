// js/main.js - Main Application Logic Orchestrator

// --- Module Imports ---
import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import { showNotification as utilShowNotification, createContextMenu, createDropZoneHTML, setupGenericDropZoneListeners, showConfirmationDialog } from './utils.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    selectMIDIInput as eventSelectMIDIInput,
    handleTrackMute as eventHandleTrackMute,
    handleTrackSolo as eventHandleTrackSolo,
    handleTrackArm as eventHandleTrackArm,
    handleRemoveTrack as eventHandleRemoveTrack,
    handleOpenTrackInspector as eventHandleOpenTrackInspector,
    handleOpenEffectsRack as eventHandleOpenEffectsRack,
    handleOpenSequencer as eventHandleOpenSequencer,
    handleTimelineLaneDrop
} from './eventHandlers.js';
import {
    initializeStateModule,
    // State Getters
    getTracksState, getTrackByIdState, getOpenWindowsState, getWindowByIdState, getHighestZState,
    getMasterEffectsState, getMasterGainValueState,
    getMidiAccessState, getActiveMIDIInputState,
    getLoadedZipFilesState, getSoundLibraryFileTreesState, getCurrentLibraryNameState,
    getCurrentSoundFileTreeState, getCurrentSoundBrowserPathState, getPreviewPlayerState,
    getClipboardDataState, getArmedTrackIdState, getSoloedTrackIdState, isTrackRecordingState,
    getRecordingTrackIdState, getRecordingStartTimeState,
    getActiveSequencerTrackIdState, getUndoStackState, getRedoStackState, getPlaybackModeState,
    getSelectedTimelineClipInfoState, getCurrentThemeState,
    // State Setters
    addWindowToStoreState, removeWindowFromStoreState, setHighestZState, incrementHighestZState,
    setMasterEffectsState, setMasterGainValueState,
    setMidiAccessState, setActiveMIDIInputState,
    setLoadedZipFilesState,
    setSoundLibraryFileTreesState,
    setCurrentLibraryNameState, setCurrentSoundFileTreeState, setCurrentSoundBrowserPathState, setPreviewPlayerState,
    setClipboardDataState, setArmedTrackIdState, setSoloedTrackIdState, setIsRecordingState,
    setRecordingTrackIdState, setRecordingStartTimeState, setActiveSequencerTrackIdState,
    setPlaybackModeState,
    setSelectedTimelineClipInfoState, setCurrentThemeState,
    addMasterEffectToState, removeMasterEffectFromState,
    updateMasterEffectParamInState, reorderMasterEffectInState,
    // Core State Actions
    addTrackToStateInternal, removeTrackFromStateInternal,
    captureStateForUndoInternal, undoLastActionInternal, redoLastActionInternal,
    gatherProjectDataInternal, reconstructDAWInternal, saveProjectInternal,
    loadProjectInternal, handleProjectFileLoadInternal, exportToWavInternal
} from './state.js';
import {
    // Audio functions
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary,
    loadSoundFromBrowserToTarget, playSlicePreview, playDrumSamplerPadPreview,
    loadSampleFile, loadDrumSamplerPadFile, autoSliceSample,
    addMasterEffectToAudio,
    removeMasterEffectFromAudio,
    updateMasterEffectParamInAudio,
    reorderMasterEffectInAudio,
    getMimeTypeFromFilename, getMasterEffectsBusInputNode,
    getActualMasterGainNode as getActualMasterGainNodeFromAudio,
    clearAllMasterEffectNodes as clearAllMasterEffectNodesInAudio,
    startAudioRecording,
    stopAudioRecording
} from './audio.js';
import {
    storeAudio as dbStoreAudio,
    getAudio as dbGetAudio,
    deleteAudio as dbDeleteAudio
} from './db.js';
import {
    initializeInspectorEffectsUI, createKnob, openTrackInspectorWindow,
    openTrackEffectsRackWindow, openMasterEffectsRackWindow,
    renderEffectsList, renderEffectControls,
    drawWaveform, drawInstrumentWaveform,
    renderSamplePads, updateSliceEditorUI,
    renderDrumSamplerPads, updateDrumPadControlsUI
} from './ui_modules/inspectorEffectsUI.js';
import {
    initializeArrangementMixingUI, openTimelineWindow, renderTimeline, updatePlayheadPosition,
    openTrackSequencerWindow, updateSequencerCellUI, highlightPlayingStep,
    openMixerWindow, updateMixerWindow
} from './ui_modules/arrangementMixingUI.js';
import {
    initializeUIModule, openSoundBrowserWindow,
    updateSoundBrowserDisplayForLibrary, renderSoundBrowserDirectory,
    showAddEffectModal
} from './ui_modules/browserCoreUI.js';

// globalcontrolsui.js is deprecated and its functionalities are integrated or removed.
// import { initializeGlobalControlsUIModule, openGlobalControlsWindow } from './globalControlsUI.js';

console.log(`SCRIPT EXECUTION STARTED - SnugOS (main.js - Version ${Constants.APP_VERSION})`);

const uiElementsCache = {
    desktop: null, taskbar: null, startButton: null, startMenu: null,
    taskbarButtonsContainer: null, taskbarTempoDisplay: null, loadProjectInput: null,
    customBgInput: null, sampleFileInput: null, notificationArea: null, modalContainer: null,
    topTaskbar: null, themeToggleLight: null, themeToggleDark: null,
    globalControlsContainer: null,
    menuAddSynthTrack: null, menuAddSamplerTrack: null, menuAddDrumSamplerTrack: null,
    menuAddInstrumentSamplerTrack: null, menuAddAudioTrack: null,
    menuOpenSoundBrowser: null, menuOpenTimeline: null,
    menuUndo: null, menuRedo: null,
    menuSaveProject: null, menuLoadProject: null, menuExportWav: null,
    menuOpenMixer: null, menuOpenMasterEffects: null,
    menuToggleFullScreen: null,
    playBtnGlobal: null, recordBtnGlobal: null, stopBtnGlobal: null,
    tempoGlobalInput: null, midiInputSelectGlobal: null, masterMeterContainerGlobal: null,
    masterMeterBarGlobal: null, midiIndicatorGlobal: null, keyboardIndicatorGlobal: null,
    playbackModeToggleBtnGlobal: null,
};

const DESKTOP_BACKGROUND_LS_KEY = 'snugosDesktopBackground_LS';
const DESKTOP_BACKGROUND_IDB_KEY = 'snugosDesktopBackground_IDB';
let currentBackgroundImageObjectURL = null;

async function handleCustomBackgroundUpload(event) { /* ... (same as response #26) ... */ }
async function removeCustomDesktopBackground() { /* ... (same as response #26) ... */ }

function showSafeNotification(message, duration) {
    if (typeof utilShowNotification === 'function') {
        utilShowNotification(message, duration);
    } else {
        console.warn("showNotification utility not available, logging to console:", message);
    }
}

const appServices = {
    dbStoreItem: dbStoreAudio, dbGetItem: dbGetAudio, dbDeleteItem: dbDeleteAudio,
    openTrackInspectorWindow, openTrackEffectsRackWindow, openMasterEffectsRackWindow,
    renderEffectsList, renderEffectControls, createKnob,
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI,
    renderDrumSamplerPads, updateDrumPadControlsUI,
    openTimelineWindow, renderTimeline, updatePlayheadPosition,
    openTrackSequencerWindow, updateSequencerCellUI, highlightPlayingStep,
    openMixerWindow, updateMixerWindow,
    openSoundBrowserWindow, updateSoundBrowserDisplayForLibrary, renderSoundBrowserDirectory,
    showAddEffectModal, showNotification: showSafeNotification, createContextMenu, showConfirmationDialog,
    initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary, loadSoundFromBrowserToTarget,
    playSlicePreview, playDrumSamplerPadPreview, loadSampleFile, loadDrumSamplerPadFile,
    autoSliceSample, getMimeTypeFromFilename, getMasterEffectsBusInputNode,
    getActualMasterGainNode: getActualMasterGainNodeFromAudio,
    clearAllMasterEffectNodes: clearAllMasterEffectNodesInAudio,
    startAudioRecording, stopAudioRecording,
    getTracks: getTracksState, getTrackById: getTrackByIdState,
    getOpenWindows: getOpenWindowsState, getWindowById: getWindowByIdState,
    getHighestZ: getHighestZState, getMasterEffects: getMasterEffectsState,
    getMasterGainValue: getMasterGainValueState, getMidiAccess: getMidiAccessState,
    getActiveMIDIInput: getActiveMIDIInputState, getLoadedZipFiles: getLoadedZipFilesState,
    getSoundLibraryFileTrees: getSoundLibraryFileTreesState, getCurrentLibraryName: getCurrentLibraryNameState,
    getCurrentSoundFileTree: getCurrentSoundFileTreeState, getCurrentSoundBrowserPath: getCurrentSoundBrowserPathState,
    getPreviewPlayer: getPreviewPlayerState, getClipboardData: getClipboardDataState,
    getArmedTrackId: getArmedTrackIdState, getSoloedTrackId: getSoloedTrackIdState,
    isTrackRecording: isTrackRecordingState, getRecordingTrackId: getRecordingTrackIdState,
    getRecordingStartTime: getRecordingStartTimeState, getActiveSequencerTrackId: getActiveSequencerTrackIdState,
    getUndoStack: getUndoStackState, getRedoStack: getRedoStackState,
    getPlaybackMode: getPlaybackModeState, getSelectedTimelineClipInfo: getSelectedTimelineClipInfoState,
    getCurrentTheme: getCurrentThemeState, addWindowToStore: addWindowToStoreState,
    removeWindowFromStore: removeWindowFromStoreState, setHighestZ: setHighestZState,
    incrementHighestZ: incrementHighestZState, setMasterEffects: setMasterEffectsState,
    setMasterGainValue: setMasterGainValueState, setMidiAccess: setMidiAccessState,
    setActiveMIDIInput: setActiveMIDIInputState, setLoadedZipFilesState: setLoadedZipFilesState,
    setSoundLibraryFileTreesState: setSoundLibraryFileTreesState, setCurrentLibraryName: setCurrentLibraryNameState,
    setCurrentSoundFileTree: setCurrentSoundFileTreeState, setCurrentSoundBrowserPath: setCurrentSoundBrowserPathState,
    setPreviewPlayer: setPreviewPlayerState, setClipboardData: setClipboardDataState,
    setArmedTrackId: setArmedTrackIdState, setSoloedTrackId: setSoloedTrackIdState,
    setIsRecording: setIsRecordingState, setRecordingTrackId: setRecordingTrackIdState,
    setRecordingStartTime: setRecordingStartTimeState, setActiveSequencerTrackId: setActiveSequencerTrackIdState,
    setPlaybackMode: setPlaybackModeState, setSelectedTimelineClipInfo: setSelectedTimelineClipInfoState,
    setCurrentTheme: setCurrentThemeState, addTrack: addTrackToStateInternal,
    removeTrack: removeTrackFromStateInternal, captureStateForUndo: captureStateForUndoInternal,
    undoLastAction: undoLastActionInternal, redoLastAction: redoLastActionInternal,
    gatherProjectData: gatherProjectDataInternal, reconstructDAW: reconstructDAWInternal,
    saveProject: saveProjectInternal, loadProject: loadProjectInternal,
    handleProjectFileLoad: handleProjectFileLoadInternal, exportToWav: exportToWavInternal,
    selectMIDIInput: eventSelectMIDIInput, handleTrackMute: eventHandleTrackMute,
    handleTrackSolo: eventHandleTrackSolo, handleTrackArm: eventHandleTrackArm,
    handleRemoveTrack: eventHandleRemoveTrack, handleOpenTrackInspector: eventHandleOpenTrackInspector,
    handleOpenEffectsRack: eventHandleOpenEffectsRack, handleOpenSequencer: eventHandleOpenSequencer,
    handleTimelineLaneDrop: (droppedItemData, targetTrackId, startTime) => handleTimelineLaneDrop(droppedItemData, targetTrackId, startTime, appServices),
    getAudioBlobFromSoundBrowserItem: async (soundData) => { /* ... */ },
    panicStopAllAudio: () => { /* ... */ },
    updateTaskbarTempoDisplay: (tempo) => { /* ... */ },
    updateUndoRedoButtonsUI: (undoState, redoState) => { /* ... */ },
    updateRecordButtonUI: (isRec) => { /* ... */ },
    closeAllWindows: (isReconstruction = false) => { /* ... */ },
    clearOpenWindowsMap: () => { /* ... */ },
    closeAllTrackWindows: (trackIdToClose) => { /* ... */ },
    updateTrackUI: handleTrackUIUpdate,
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
    uiElementsCache: uiElementsCache,
    addMasterEffect: async (effectType) => { /* ... */ },
    removeMasterEffect: async (effectId) => { /* ... */ },
    updateMasterEffectParam: (effectId, paramPath, value) => { /* ... */ },
    reorderMasterEffect: (effectId, newIndex) => { /* ... */ },
    setActualMasterVolume: (volumeValue) => { /* ... */ },
    effectsRegistryAccess: { AVAILABLE_EFFECTS: null, getEffectParamDefinitions: null, getEffectDefaultParams: null, synthEngineControlDefinitions: null, },
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag === true,
    _isReconstructingDAW_flag: false, _transportEventsInitialized_flag: false,
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },
    updateTrackMeterUI: (trackId, level, isClipping) => { /* ... */ },
    updateMasterEffectsRackUI: () => { /* ... */ },
    triggerCustomBackgroundUpload: () => { if (uiElementsCache.customBgInput) uiElementsCache.customBgInput.click(); },
    removeCustomDesktopBackground: removeCustomDesktopBackground,
    onThemeChanged: (newTheme, oldTheme) => {
        document.body.classList.remove(`theme-${oldTheme}`);
        document.body.classList.add(`theme-${newTheme}`);
        const tracks = getTracksState();
        (tracks || []).forEach(track => {
            if (track && track.type === 'Sampler' && track.waveformCanvasCtx && typeof drawWaveform === 'function') {
                drawWaveform(track);
            } else if (track && track.type === 'InstrumentSampler' && track.instrumentWaveformCanvasCtx && typeof drawInstrumentWaveform === 'function') {
                drawInstrumentWaveform(track);
            }
        });
        if(typeof renderTimeline === 'function') renderTimeline();
    },
    toggleTheme: () => {
        const current = getCurrentThemeState();
        if (appServices.setCurrentTheme && typeof appServices.setCurrentTheme === 'function') {
            appServices.setCurrentTheme(current === 'dark' ? 'light' : 'dark');
        }
    },
    onPlaybackModeChange: (newMode) => { /* ... */ }
};

function handleTrackUIUpdate(trackId, reason, detail) { /* ... (same as response #26) ... */ }

async function initializeSnugOS() {
    console.log("[Main initializeSnugOS] Initializing SnugOS...");
    try {
        Object.keys(uiElementsCache).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                 uiElementsCache[key] = element;
            } else {
                if (['desktop', 'taskbar', 'taskbarButtonsContainer', 'notificationArea', 'modalContainer', 'topTaskbar'].includes(key)) { // Added taskbarButtonsContainer here
                    console.warn(`[Main initializeSnugOS] Critical UI Element ID "${key}" not found in DOM.`);
                }
            }
        });

        try {
            const effectsRegistry = await import('./effectsRegistry.js');
            if (appServices.effectsRegistryAccess) {
                appServices.effectsRegistryAccess.AVAILABLE_EFFECTS = effectsRegistry.AVAILABLE_EFFECTS || {};
                appServices.effectsRegistryAccess.getEffectParamDefinitions = effectsRegistry.getEffectParamDefinitions || (() => []);
                appServices.effectsRegistryAccess.getEffectDefaultParams = effectsRegistry.getEffectDefaultParams || (() => ({}));
                appServices.effectsRegistryAccess.synthEngineControlDefinitions = effectsRegistry.synthEngineControlDefinitions || {};
                // console.log("[Main initializeSnugOS] Effects registry dynamically imported.");
            } else {
                console.error("[Main initializeSnugOS] appServices.effectsRegistryAccess is not defined.");
            }
        } catch (registryError) {
            console.error("[Main initializeSnugOS] Failed to import effectsRegistry.js:", registryError);
            showSafeNotification("Critical error: Failed to load audio effects definitions.", 5000);
        }

        if (uiElementsCache.customBgInput) { uiElementsCache.customBgInput.addEventListener('change', handleCustomBackgroundUpload); }
        try {
            const storedImageBlob = await appServices.dbGetItem(DESKTOP_BACKGROUND_IDB_KEY);
            if (storedImageBlob) {
                if (currentBackgroundImageObjectURL) { URL.revokeObjectURL(currentBackgroundImageObjectURL); }
                currentBackgroundImageObjectURL = URL.createObjectURL(storedImageBlob);
                applyDesktopBackground(currentBackgroundImageObjectURL);
            } else { /* ... localStorage fallback ... */ }
        } catch (error) { console.error("Error loading desktop background on init:", error); applyDesktopBackground(null); }

        if (typeof initializeStateModule === 'function') initializeStateModule(appServices);
        else console.error("initializeStateModule is not a function");

        const initialTheme = appServices.getCurrentTheme ? appServices.getCurrentTheme() : 'dark';
        if (appServices.setCurrentTheme && typeof appServices.setCurrentTheme === 'function') appServices.setCurrentTheme(initialTheme);
        else console.warn("[Main initializeSnugOS] setCurrentTheme service not available.");

        if (typeof initializeUIModule === 'function') initializeUIModule(appServices); // Initializes browserCoreUI and its sub-modules
        else console.error("initializeUIModule (browserCoreUI) is not a function");

        // globalcontrolsui.js is deprecated, its initialization call is removed.

        if (typeof initializeAudioModule === 'function') initializeAudioModule(appServices);
        else console.error("initializeAudioModule is not a function");
        if (typeof initializeEventHandlersModule === 'function') initializeEventHandlersModule(appServices);
        else console.error("initializeEventHandlersModule is not a function");

        if (typeof initializePrimaryEventListeners === 'function') {
             initializePrimaryEventListeners(appServices);
        } else { console.error("initializePrimaryEventListeners is not a function");}

        const globalControlElements = {
            playBtnGlobal: uiElementsCache.playBtnGlobal, recordBtnGlobal: uiElementsCache.recordBtnGlobal,
            stopBtnGlobal: uiElementsCache.stopBtnGlobal, tempoGlobalInput: uiElementsCache.tempoGlobalInput,
            midiInputSelectGlobal: uiElementsCache.midiInputSelectGlobal,
            masterMeterContainerGlobal: uiElementsCache.masterMeterContainerGlobal,
            masterMeterBarGlobal: uiElementsCache.masterMeterBarGlobal,
            midiIndicatorGlobal: uiElementsCache.midiIndicatorGlobal,
            keyboardIndicatorGlobal: uiElementsCache.keyboardIndicatorGlobal,
            playbackModeToggleBtnGlobal: uiElementsCache.playbackModeToggleBtnGlobal
        };
        if (typeof attachGlobalControlEvents === 'function') {
            attachGlobalControlEvents(globalControlElements);
        } else { console.error("attachGlobalControlEvents is not a function"); }
        if (typeof setupMIDI === 'function') setupMIDI(); else console.error("setupMIDI is not a function");

        if (uiElementsCache.themeToggleLight) {
            uiElementsCache.themeToggleLight.addEventListener('click', () => {
                if (appServices.toggleTheme && typeof appServices.toggleTheme === 'function') appServices.toggleTheme();
                else console.warn("toggleTheme service not available.");
            });
        }
        if (uiElementsCache.themeToggleDark) {
            uiElementsCache.themeToggleDark.addEventListener('click', () => {
                 if (appServices.toggleTheme && typeof appServices.toggleTheme === 'function') appServices.toggleTheme();
                 else console.warn("toggleTheme service not available.");
            });
        }

        if (Constants.soundLibraries && typeof fetchSoundLibrary === 'function') {
            Object.entries(Constants.soundLibraries).forEach(([name, url]) => fetchSoundLibrary(name, url, true));
        }

        if (appServices.openTimelineWindow && typeof appServices.openTimelineWindow === 'function') {
            // console.log("[Main initializeSnugOS] Opening default Timeline window.");
            appServices.openTimelineWindow();
        } else { console.warn("[Main initializeSnugOS] appServices.openTimelineWindow not available."); }

        requestAnimationFrame(updateMetersLoop);
        if (appServices.updateUndoRedoButtonsUI && typeof appServices.updateUndoRedoButtonsUI === 'function') appServices.updateUndoRedoButtonsUI(null, null);
        if (appServices.onPlaybackModeChange && typeof getPlaybackModeState === 'function') {
            appServices.onPlaybackModeChange(getPlaybackModeState());
        }

        showSafeNotification(`Welcome to SnugOS ${Constants.APP_VERSION}! Theme: ${initialTheme}`, 2500);
        console.log(`[Main initializeSnugOS] SnugOS Version ${Constants.APP_VERSION} Initialized. Theme: ${initialTheme}`);

    } catch (initError) {
        console.error("CRITICAL ERROR during SnugOS Initialization:", initError);
        showSafeNotification("A critical error occurred during application startup. Please refresh.", 7000);
        // Fallback UI for critical error
        const body = document.body;
        if (body) {
            body.innerHTML = `<div style="padding: 20px; text-align: center; font-family: sans-serif; color: #ccc; background-color: #101010; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;"><h1>Initialization Error</h1><p>SnugOS could not start. Check console.</p><p style="font-size: 0.8em; margin-top: 20px;">Error: ${initError.message}</p></div>`;
        }
    }
}

function updateMetersLoop() {
    try {
        if (typeof updateMeters === 'function' && typeof getWindowByIdState === 'function' && typeof getTracksState === 'function') {
            const mixerWindow = getWindowByIdState('mixer');
            const mixerMasterMeterBar = mixerWindow?.element && !mixerWindow.isMinimized ? mixerWindow.element.querySelector('#mixerMasterMeterBar') : null;
            const tracks = getTracksState();
            updateMeters(uiElementsCache.masterMeterBarGlobal, mixerMasterMeterBar, tracks);
        }
        if (typeof updatePlayheadPosition === 'function') {
            updatePlayheadPosition();
        }
    } catch (loopError) {
        console.warn("[Main updateMetersLoop] Error:", loopError);
    }
    requestAnimationFrame(updateMetersLoop);
}

function applyDesktopBackground(imageUrlOrObjectUrl) {
    if (uiElementsCache.desktop) {
        try {
            if (imageUrlOrObjectUrl) {
                uiElementsCache.desktop.style.backgroundImage = `url('${imageUrlOrObjectUrl}')`;
                uiElementsCache.desktop.style.backgroundSize = 'cover';
                uiElementsCache.desktop.style.backgroundPosition = 'center center';
                uiElementsCache.desktop.style.backgroundRepeat = 'no-repeat';
                uiElementsCache.desktop.style.backgroundColor = '';
            } else {
                uiElementsCache.desktop.style.backgroundImage = '';
            }
        } catch (e) { console.error("Error applying desktop background style:", e); }
    } else { console.warn("Desktop element not found for background."); }
}

window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    const tracksExist = typeof getTracksState === 'function' && getTracksState().length > 0;
    const undoStackExists = typeof getUndoStackState === 'function' && getUndoStackState().length > 0;
    if (tracksExist || undoStackExists) {
        e.preventDefault(); e.returnValue = '';
        return "You have unsaved changes. Are you sure you want to leave?";
    }
    if (currentBackgroundImageObjectURL) { URL.revokeObjectURL(currentBackgroundImageObjectURL); }
});

// console.log(`SCRIPT EXECUTION FINISHED - SnugOS (main.js - Version ${Constants.APP_VERSION})`);
