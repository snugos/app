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
    handleOpenPianoRoll as eventHandleOpenPianoRoll,
    handleTimelineLaneDrop,
    handleOpenYouTubeImporter
} from './eventHandlers.js';
import {
    initializeStateModule,
    getTracksState, getTrackByIdState, getOpenWindowsState, getWindowByIdState, getHighestZState,
    getMasterEffectsState, getMasterGainValueState,
    getMidiAccessState, getActiveMIDIInputState,
    getLoadedZipFilesState, getSoundLibraryFileTreesState, getCurrentLibraryNameState,
    getCurrentSoundFileTreeState, getCurrentSoundBrowserPathState, getPreviewPlayerState,
    getClipboardDataState, getArmedTrackIdState, getSoloedTrackIdState, isTrackRecordingState,
    getRecordingTrackIdState, getRecordingStartTimeState,
    getActiveSequencerTrackIdState, getUndoStackState, getRedoStackState, getPlaybackModeState,
    getSelectedTimelineClipInfoState,
    getCurrentUserThemePreferenceState,
    addWindowToStoreState, removeWindowFromStoreState, setHighestZState, incrementHighestZState,
    setMasterEffectsState, setMasterGainValueState,
    setMidiAccessState, setActiveMIDIInputState,
    setLoadedZipFilesState,
    setSoundLibraryFileTreesState,
    setCurrentLibraryNameState, setCurrentSoundFileTreeState, setCurrentSoundBrowserPathState, setPreviewPlayerState,
    setClipboardDataState, setArmedTrackIdState, setSoloedTrackIdState, setIsRecordingState,
    setRecordingTrackIdState, setRecordingStartTimeState, setActiveSequencerTrackIdState,
    setPlaybackModeState,
    setSelectedTimelineClipInfoState,
    setCurrentUserThemePreferenceState,
    addMasterEffectToState, removeMasterEffectFromState,
    updateMasterEffectParamInState, reorderMasterEffectInState,
    addTrackToStateInternal, removeTrackFromStateInternal,
    captureStateForUndoInternal, undoLastActionInternal, redoLastActionInternal,
    gatherProjectDataInternal, reconstructDAWInternal, saveProjectInternal,
    loadProjectInternal, handleProjectFileLoadInternal, exportToWavInternal
} from './state.js';
import {
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
    initializeUIModule,
    openTrackEffectsRackWindow,
    openPianoRollWindow,
    openTrackInspectorWindow,
    openMixerWindow,
    updateMixerWindow,
    openTimelineWindow,         
    renderTimeline,             
    updatePlayheadPosition,     
    openSoundBrowserWindow,     
    updateSoundBrowserDisplayForLibrary, 
    renderSoundBrowserDirectory, 
    renderEffectsList,
    renderEffectControls,
    createKnob,                 
    updateSequencerCellUI, 
    openMasterEffectsRackWindow,
    drawWaveform,
    drawInstrumentWaveform,
    renderSamplePads,
    updateSliceEditorUI,
    renderDrumSamplerPads,
    updateDrumPadControlsUI,
    highlightPlayingStep,
    openYouTubeImporterWindow
} from './ui.js';

console.log(`SCRIPT EXECUTION STARTED - SnugOS (main.js - Version ${Constants.APP_VERSION})`);

// --- Global UI Elements Cache ---
const uiElementsCache = {
    desktop: null, taskbar: null, startButton: null, startMenu: null,
    taskbarButtonsContainer: null, taskbarTempoDisplay: null, loadProjectInput: null,
    customBgInput: null, sampleFileInput: null, notificationArea: null, modalContainer: null,
    menuAddSynthTrack: null, menuAddSamplerTrack: null, menuAddDrumSamplerTrack: null,
    menuAddInstrumentSamplerTrack: null, menuAddAudioTrack: null,
    menuOpenSoundBrowser: null, menuOpenTimeline: null, menuOpenPianoRoll: null,
    menuOpenYouTubeImporter: null,
    menuUndo: null, menuRedo: null,
    menuSaveProject: null, menuLoadProject: null, menuExportWav: null,
    menuOpenMixer: null, menuOpenMasterEffects: null,
    menuToggleFullScreen: null,
    topTaskbar: null,
    playBtnGlobal: null,
    recordBtnGlobal: null,
    stopBtnGlobal: null,
    tempoGlobalInput: null,
    midiInputSelectGlobal: null,
    masterMeterContainerGlobal: null,
    masterMeterBarGlobal: null,
    midiIndicatorGlobal: null,
    keyboardIndicatorGlobal: null,
    playbackModeToggleBtnGlobal: null,
    themeToggleBtn: null,
};

const DESKTOP_BACKGROUND_LS_KEY = 'snugosDesktopBackground_LS';
const DESKTOP_BACKGROUND_IDB_KEY = 'snugosDesktopBackground_IDB';
const THEME_STORAGE_KEY = 'snugosThemePreference_v2';
let currentBackgroundImageObjectURL = null;

async function handleCustomBackgroundUpload(event) { 
    if (!event?.target?.files?.[0]) return;
    const file = event.target.files[0];
    if (file.type.startsWith('image/')) {
        try {
            await appServices.dbStoreItem(DESKTOP_BACKGROUND_IDB_KEY, file); 
            if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
            currentBackgroundImageObjectURL = URL.createObjectURL(file);
            applyDesktopBackground(currentBackgroundImageObjectURL);
            showSafeNotification("Custom background applied.", 2000);
        } catch (error) {
            showSafeNotification("Could not save background.", 4000);
        }
    } else {
        showSafeNotification("Invalid file type. Please select an image.", 3000);
    }
    if (event.target) event.target.value = null; 
}

async function removeCustomDesktopBackground() {
    try {
        await appServices.dbDeleteItem(DESKTOP_BACKGROUND_IDB_KEY);
        if (currentBackgroundImageObjectURL) {
            URL.revokeObjectURL(currentBackgroundImageObjectURL);
            currentBackgroundImageObjectURL = null;
        }
        applyDesktopBackground(null);
        showSafeNotification("Custom background removed.", 2000);
    } catch (error) {
        showSafeNotification("Could not remove background.", 3000);
    }
}

function showSafeNotification(message, duration) {
    if (typeof utilShowNotification === 'function') {
        utilShowNotification(message, duration);
    } else {
        console.warn("showNotification utility not available, logging to console:", message);
    }
}

// --- Theme Switching Logic ---
function applyThemeCSS(themeName) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(themeName === 'light' ? 'theme-light' : 'theme-dark');
}

function applyUserThemePreference() {
    const preference = appServices.getCurrentUserThemePreference?.() || 'system';
    let actualThemeToApply = 'dark'; 
    if (preference === 'system') {
        actualThemeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
        actualThemeToApply = preference;
    }
    applyThemeCSS(actualThemeToApply);
}

function handleSystemThemeChange(event) {
    if (appServices.getCurrentUserThemePreference?.() === 'system') {
        applyThemeCSS(event.matches ? 'dark' : 'light');
    }
}

// --- START OF ADDED FUNCTION ---

// --- Centralized UI Update Handler ---
function handleTrackUIUpdate(trackId, reason, detail) {
    const track = getTrackByIdState(trackId);
    if (!track) return;

    const inspectorWindow = getWindowByIdState(`trackInspector-${trackId}`);
    if (inspectorWindow && inspectorWindow.element && !inspectorWindow.isMinimized) {
        if (reason === 'armChanged') {
            const armBtn = inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);
            if (armBtn) {
                const isArmed = getArmedTrackIdState() === track.id;
                armBtn.classList.toggle('armed', isArmed);
            }
        }
        if (reason === 'soloChanged' || reason === 'muteChanged') {
            const muteBtn = inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
            if (muteBtn) {
                muteBtn.classList.toggle('muted', track.isMuted);
                muteBtn.textContent = track.isMuted ? 'Unmute' : 'Mute';
            }
            const soloBtn = inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
            if (soloBtn) {
                soloBtn.classList.toggle('soloed', track.isSoloed);
                soloBtn.textContent = track.isSoloed ? 'Unsolo' : 'Solo';
            }
        }
    }
    
    const mixerWindow = getWindowByIdState('mixer');
    if (mixerWindow && mixerWindow.element && !mixerWindow.isMinimized) {
        const muteBtn = mixerWindow.element.querySelector(`#mixerMuteBtn-${track.id}`);
        if (muteBtn) muteBtn.classList.toggle('muted', track.isMuted);
        const soloBtn = mixerWindow.element.querySelector(`#mixerSoloBtn-${track.id}`);
        if (soloBtn) soloBtn.classList.toggle('soloed', track.isSoloed);
    }

    if (reason === 'effectsChanged') {
        const rackWindow = getWindowByIdState(`effectsRack-${trackId}`);
        if (rackWindow && rackWindow.element && !rackWindow.isMinimized) {
            const listDiv = rackWindow.element.querySelector(`#effectsList-${trackId}`);
            const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-${trackId}`);
            renderEffectsList(track, 'track', listDiv, controlsContainer);
        }
    }
}
// --- END OF ADDED FUNCTION ---


// --- AppServices Object (Centralized DI Container) ---
const appServices = {
    dbStoreItem: dbStoreAudio,
    dbGetItem: dbGetAudio,
    dbDeleteItem: dbDeleteAudio,
    openTrackInspectorWindow, 
    openTrackEffectsRackWindow, 
    openPianoRollWindow, 
    openYouTubeImporterWindow,
    openMixerWindow, updateMixerWindow,
    openSoundBrowserWindow,
    updateSoundBrowserDisplayForLibrary,
    renderSoundBrowserDirectory,
    openTimelineWindow,
    renderTimeline,
    updatePlayheadPosition,
    highlightPlayingStep,
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI,
    updateDrumPadControlsUI, renderDrumSamplerPads, renderEffectsList, renderEffectControls,
    createKnob,
    updateSequencerCellUI, 
    openMasterEffectsRackWindow,
    showNotification: showSafeNotification,
    createContextMenu, showConfirmationDialog,
    initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary, loadSoundFromBrowserToTarget,
    playSlicePreview, playDrumSamplerPadPreview, loadSampleFile, loadDrumSamplerPadFile,
    autoSliceSample, getMimeTypeFromFilename,
    getMasterEffectsBusInputNode,
    getActualMasterGainNode: getActualMasterGainNodeFromAudio,
    clearAllMasterEffectNodes: clearAllMasterEffectNodesInAudio,
    startAudioRecording, stopAudioRecording,
    getTracks: getTracksState, getTrackById: getTrackByIdState,
    getOpenWindows: getOpenWindowsState, getWindowById: getWindowByIdState,
    getHighestZ: getHighestZState,
    getMasterEffects: getMasterEffectsState, getMasterGainValue: getMasterGainValueState,
    getMidiAccess: getMidiAccessState, getActiveMIDIInput: getActiveMIDIInputState,
    getLoadedZipFiles: getLoadedZipFilesState, getSoundLibraryFileTrees: getSoundLibraryFileTreesState,
    getCurrentLibraryName: getCurrentLibraryNameState, getCurrentSoundFileTree: getCurrentSoundFileTreeState,
    getCurrentSoundBrowserPath: getCurrentSoundBrowserPathState, getPreviewPlayer: getPreviewPlayerState,
    getClipboardData: getClipboardDataState, getArmedTrackId: getArmedTrackIdState,
    getSoloedTrackId: getSoloedTrackIdState, isTrackRecording: isTrackRecordingState,
    getRecordingTrackId: getRecordingTrackIdState, getRecordingStartTime: getRecordingStartTimeState,
    getActiveSequencerTrackId: getActiveSequencerTrackIdState, 
    getUndoStack: getUndoStackState, getRedoStack: getRedoStackState,
    getPlaybackMode: getPlaybackModeState,
    getSelectedTimelineClipInfoState: getSelectedTimelineClipInfoState,
    getCurrentUserThemePreference: getCurrentUserThemePreferenceState,
    addWindowToStore: addWindowToStoreState, removeWindowFromStore: removeWindowFromStoreState,
    setHighestZ: setHighestZState, incrementHighestZ: incrementHighestZState,
    setMasterEffects: setMasterEffectsState, setMasterGainValue: setMasterGainValueState,
    setMidiAccess: setMidiAccessState, setActiveMIDIInput: setActiveMIDIInputState,
    setLoadedZipFilesState: setLoadedZipFilesState,
    setSoundLibraryFileTreesState: setSoundLibraryFileTreesState,
    setCurrentLibraryName: setCurrentLibraryNameState, setCurrentSoundFileTree: setCurrentSoundFileTreeState,
    setCurrentSoundBrowserPath: setCurrentSoundBrowserPathState, setPreviewPlayer: setPreviewPlayerState,
    setClipboardData: setClipboardDataState, setArmedTrackId: setArmedTrackIdState,
    setSoloedTrackId: setSoloedTrackIdState, setIsRecording: setIsRecordingState,
    setRecordingTrackId: setRecordingTrackIdState, setRecordingStartTime: setRecordingStartTimeState,
    setActiveSequencerTrackId: setActiveSequencerTrackIdState, 
    setPlaybackMode: setPlaybackModeState,
    setSelectedTimelineClipInfo: setSelectedTimelineClipInfoState,
    setCurrentUserThemePreference: setCurrentUserThemePreferenceState,
    applyUserThemePreference: applyUserThemePreference,
    addTrack: addTrackToStateInternal, removeTrack: removeTrackFromStateInternal,
    captureStateForUndo: captureStateForUndoInternal, undoLastAction: undoLastActionInternal,
    redoLastAction: redoLastActionInternal, gatherProjectData: gatherProjectDataInternal,
    reconstructDAW: reconstructDAWInternal, saveProject: saveProjectInternal,
    loadProject: loadProjectInternal, handleProjectFileLoad: handleProjectFileLoadInternal,
    exportToWav: exportToWavInternal,
    selectMIDIInput: eventSelectMIDIInput,
    handleTrackMute: eventHandleTrackMute,
    handleTrackSolo: eventHandleTrackSolo,
    handleTrackArm: eventHandleTrackArm,
    handleRemoveTrack: eventHandleRemoveTrack,
    handleOpenTrackInspector: eventHandleOpenTrackInspector,
    handleOpenEffectsRack: eventHandleOpenEffectsRack,
    handleOpenPianoRoll: eventHandleOpenPianoRoll,
    handleOpenYouTubeImporter: handleOpenYouTubeImporter,
    handleTimelineLaneDrop: (event, targetTrackId, startTime) => handleTimelineLaneDrop(event, targetTrackId, startTime, appServices),
    updateTrackUI: handleTrackUIUpdate, // Connect the new handler to appServices
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
    uiElementsCache: uiElementsCache,
    //... other services
};


// --- Application Initialization ---
async function initializeSnugOS() {
    console.log("[Main initializeSnugOS] Initializing SnugOS...");

    try {
        Object.keys(uiElementsCache).forEach(key => {
            const element = document.getElementById(key);
            if (element) { uiElementsCache[key] = element; }
            else {
                // Simplified warning
                if (!key.startsWith('menu') && !key.endsWith('Global') && ['desktop', 'taskbar'].includes(key)) {
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
            }
        }
        catch (registryError) {
            console.error("[Main initializeSnugOS] Failed to import effectsRegistry.js:", registryError);
        }

        initializeStateModule(appServices);
        initializeUIModule(appServices);
        initializeAudioModule(appServices);
        initializeEventHandlersModule(appServices);
        initializePrimaryEventListeners(appServices);
        attachGlobalControlEvents(uiElementsCache);
        setupMIDI();

        // Open timeline by default
        if (appServices.openTimelineWindow) appServices.openTimelineWindow();

        requestAnimationFrame(updateMetersLoop);

        // Theme Initialization
        const savedThemePreference = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedThemePreference) {
            appServices.setCurrentUserThemePreference(savedThemePreference); 
        } else {
            appServices.setCurrentUserThemePreference('system'); 
        }

        const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQueryList.addEventListener('change', handleSystemThemeChange);
        
        if (uiElementsCache.themeToggleBtn) {
            uiElementsCache.themeToggleBtn.addEventListener('click', () => {
                const currentPreference = appServices.getCurrentUserThemePreference();
                let nextPreferenceToStore = 'system';
                if (currentPreference === 'system') {
                    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    nextPreferenceToStore = systemPrefersDark ? 'light' : 'dark';
                } else if (currentPreference === 'light') {
                    nextPreferenceToStore = 'dark';
                } else { // dark
                    nextPreferenceToStore = 'system';
                }
                appServices.setCurrentUserThemePreference(nextPreferenceToStore);
            });
        }
        
        showSafeNotification(`Welcome to SnugOS ${Constants.APP_VERSION}!`, 2500);
        console.log(`[Main initializeSnugOS] SnugOS Version ${Constants.APP_VERSION} Initialized.`);

    } catch (initError) {
        console.error("CRITICAL ERROR during SnugOS Initialization:", initError);
    }
}

function updateMetersLoop() {
    try {
        if (typeof updateMeters === 'function') {
            const mixerWindow = getOpenWindowsState().get('mixer');
            const mixerMasterMeterBar = mixerWindow?.element && !mixerWindow.isMinimized ? mixerWindow.element.querySelector('#mixerMasterMeterBar') : null;
            updateMeters(uiElementsCache.masterMeterBarGlobal, mixerMasterMeterBar, getTracksState());
        }
        if (typeof appServices.updatePlayheadPosition === 'function') {
            appServices.updatePlayheadPosition();
        }
    } catch (loopError) {
        console.warn("[Main updateMetersLoop] Error in UI update loop:", loopError);
    }
    requestAnimationFrame(updateMetersLoop);
}

function applyDesktopBackground(imageUrlOrObjectUrl) {
    if (uiElementsCache.desktop) {
        if (imageUrlOrObjectUrl) {
            uiElementsCache.desktop.style.backgroundImage = `url('${imageUrlOrObjectUrl}')`;
            uiElementsCache.desktop.style.backgroundSize = 'cover';
        } else {
            uiElementsCache.desktop.style.backgroundImage = '';
        }
    }
}

// --- Global Event Listeners ---
window.addEventListener('load', initializeSnugOS);
// ... other listeners
