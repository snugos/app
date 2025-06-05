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
    getSelectedTimelineClipInfoState,
    getCurrentUserThemePreferenceState,
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
    setSelectedTimelineClipInfoState,
    setCurrentUserThemePreferenceState,
    addMasterEffectToState, removeMasterEffectFromState,
    updateMasterEffectParamInState, reorderMasterEffectInState,
    // Core State Actions
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
    initializeUIModule, openTrackEffectsRackWindow, openTrackSequencerWindow,
    openTrackInspectorWindow, openMixerWindow, updateMixerWindow, openSoundBrowserWindow,
    renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary, highlightPlayingStep, drawWaveform,
    drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, updateDrumPadControlsUI, renderDrumSamplerPads,
    renderEffectsList, renderEffectControls, createKnob,
    updateSequencerCellUI,
    openMasterEffectsRackWindow,
    renderTimeline,
    updatePlayheadPosition,
    openTimelineWindow
} from './ui.js';

console.log(`SCRIPT EXECUTION STARTED - SnugOS (main.js - Version ${Constants.APP_VERSION})`);

// --- Global UI Elements Cache ---
const uiElementsCache = {
    desktop: null, taskbar: null, startButton: null, startMenu: null,
    taskbarButtonsContainer: null, taskbarTempoDisplay: null, loadProjectInput: null,
    customBgInput: null, sampleFileInput: null, notificationArea: null, modalContainer: null,
    menuAddSynthTrack: null, menuAddSamplerTrack: null, menuAddDrumSamplerTrack: null,
    menuAddInstrumentSamplerTrack: null, menuAddAudioTrack: null,
    menuOpenSoundBrowser: null, menuOpenTimeline: null,
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
    themeToggleBtn: null, // Single theme toggle button in top taskbar
    // SVGs inside the button are not directly manipulated by JS for display, CSS handles it
    // themeIconSun: null,
    // themeIconMoon: null,
};

const DESKTOP_BACKGROUND_LS_KEY = 'snugosDesktopBackground_LS';
const DESKTOP_BACKGROUND_IDB_KEY = 'snugosDesktopBackground_IDB';
const THEME_STORAGE_KEY = 'snugosThemePreference_v2'; // Consistent key

let currentBackgroundImageObjectURL = null;

async function handleCustomBackgroundUpload(event) {
    if (!event?.target?.files?.[0]) return;
    const file = event.target.files[0];
    if (file.type.startsWith('image/')) {
        try {
            localStorage.removeItem(DESKTOP_BACKGROUND_LS_KEY);
            await appServices.dbStoreItem(DESKTOP_BACKGROUND_IDB_KEY, file);
            if (currentBackgroundImageObjectURL) {
                URL.revokeObjectURL(currentBackgroundImageObjectURL);
            }
            currentBackgroundImageObjectURL = URL.createObjectURL(file);
            applyDesktopBackground(currentBackgroundImageObjectURL);
            showSafeNotification("Custom background applied.", 2000);
        } catch (error) {
            console.error("Error saving background to IndexedDB:", error);
            showSafeNotification("Could not save background. Storage error or image too large for DB.", 4000);
        }
    } else {
        showSafeNotification("Invalid file type. Please select an image.", 3000);
    }
    if (event.target) event.target.value = null;
}

async function removeCustomDesktopBackground() {
    try {
        localStorage.removeItem(DESKTOP_BACKGROUND_LS_KEY);
        await appServices.dbDeleteItem(DESKTOP_BACKGROUND_IDB_KEY);
        if (currentBackgroundImageObjectURL) {
            URL.revokeObjectURL(currentBackgroundImageObjectURL);
            currentBackgroundImageObjectURL = null;
        }
        applyDesktopBackground(null);
        showSafeNotification("Custom background removed.", 2000);
    } catch (error) {
        console.error("Error removing background:", error);
        showSafeNotification("Could not remove background from storage.", 3000);
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
function applyThemeCSS(themeName) { // themeName is 'light' or 'dark'
    document.body.classList.remove('theme-light', 'theme-dark');
    if (themeName === 'light') {
        document.body.classList.add('theme-light');
    } else {
        document.body.classList.add('theme-dark'); // Default to dark if not explicitly light
    }
    console.log(`[Theme] Applied CSS class for: ${themeName}`);
    // The CSS in style.css will handle showing/hiding the correct SVG icon inside #themeToggleBtn
}

function applyUserThemePreference() {
    const preference = appServices.getCurrentUserThemePreference ? appServices.getCurrentUserThemePreference() : 'system';
    let actualThemeToApply = 'dark'; // Default to dark

    if (preference === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        actualThemeToApply = systemPrefersDark ? 'dark' : 'light';
    } else {
        actualThemeToApply = preference;
    }
    applyThemeCSS(actualThemeToApply);
    console.log(`[Theme] User preference '${preference}' resulted in '${actualThemeToApply}' theme.`);
}

function handleSystemThemeChange(event) {
    const preference = appServices.getCurrentUserThemePreference ? appServices.getCurrentUserThemePreference() : 'system';
    if (preference === 'system') {
        const newSystemTheme = event.matches ? 'dark' : 'light';
        console.log(`[Theme] System theme changed. Applying: ${newSystemTheme}`);
        applyThemeCSS(newSystemTheme);
    }
}

// --- AppServices Object (Centralized DI Container) ---
const appServices = {
    dbStoreItem: dbStoreAudio,
    dbGetItem: dbGetAudio,
    dbDeleteItem: dbDeleteAudio,
    openTrackInspectorWindow, openTrackEffectsRackWindow, openTrackSequencerWindow,
    openMixerWindow, updateMixerWindow, openSoundBrowserWindow, openMasterEffectsRackWindow,
    renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary, highlightPlayingStep,
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI,
    updateDrumPadControlsUI, renderDrumSamplerPads, renderEffectsList, renderEffectControls,
    createKnob, updateSequencerCellUI,
    renderTimeline, openTimelineWindow, updatePlayheadPosition,
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
    getSelectedTimelineClipInfo: getSelectedTimelineClipInfoState,
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
    handleOpenSequencer: eventHandleOpenSequencer,
    handleTimelineLaneDrop: (event, targetTrackId, startTime) => handleTimelineLaneDrop(event, targetTrackId, startTime, appServices),
    getAudioBlobFromSoundBrowserItem: async (soundData) => { /* ... (no change) ... */ },
    panicStopAllAudio: () => { /* ... (no change) ... */ },
    updateTaskbarTempoDisplay: (tempo) => { /* ... (no change) ... */ },
    updateUndoRedoButtonsUI: (undoState, redoState) => { /* ... (no change) ... */ },
    updateRecordButtonUI: (isRec) => { /* ... (no change) ... */ },
    closeAllWindows: (isReconstruction = false) => { /* ... (no change) ... */ },
    clearOpenWindowsMap: () => { /* ... (no change) ... */ },
    closeAllTrackWindows: (trackIdToClose) => { /* ... (no change) ... */ },
    updateTrackUI: handleTrackUIUpdate,
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
    uiElementsCache: uiElementsCache,
    addMasterEffect: async (effectType) => { /* ... (no change) ... */ },
    removeMasterEffect: async (effectId) => { /* ... (no change) ... */ },
    updateMasterEffectParam: (effectId, paramPath, value) => { /* ... (no change) ... */ },
    reorderMasterEffect: (effectId, newIndex) => { /* ... (no change) ... */ },
    setActualMasterVolume: (volumeValue) => { /* ... (no change) ... */ },
    effectsRegistryAccess: { AVAILABLE_EFFECTS: null, getEffectParamDefinitions: null, getEffectDefaultParams: null, synthEngineControlDefinitions: null, },
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag === true,
    _isReconstructingDAW_flag: false,
    _transportEventsInitialized_flag: false,
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },
    updateTrackMeterUI: (trackId, level, isClipping) => { /* ... (no change) ... */ },
    updateMasterEffectsRackUI: () => { /* ... (no change) ... */ },
    triggerCustomBackgroundUpload: () => { if (uiElementsCache.customBgInput) uiElementsCache.customBgInput.click(); else console.warn("Custom background input element not found in cache."); },
    removeCustomDesktopBackground: removeCustomDesktopBackground,
    onPlaybackModeChange: (newMode) => { /* ... (no change) ... */ }
};

// --- Centralized UI Update Handler ---
function handleTrackUIUpdate(trackId, reason, detail) { /* ... (no change) ... */ }

// --- Application Initialization ---
async function initializeSnugOS() {
    console.log("[Main initializeSnugOS] Initializing SnugOS...");

    try {
        Object.keys(uiElementsCache).forEach(key => {
            const element = document.getElementById(key);
            if (element) { uiElementsCache[key] = element; }
            else {
                const criticalDesktopUI = ['desktop', 'taskbar', 'notification-area', 'modalContainer'];
                const criticalTopTaskbarUI = [
                    'topTaskbar', 'playBtnGlobalTop', 'stopBtnGlobalTop', 'recordBtnGlobalTop',
                    'tempoGlobalInputTop', 'midiInputSelectGlobalTop', 'masterMeterContainerGlobalTop',
                    'masterMeterBarGlobalTop', 'midiIndicatorGlobalTop', 'keyboardIndicatorGlobalTop',
                    'playbackModeToggleBtnGlobalTop', 'themeToggleBtn'
                ];
                if ((criticalDesktopUI.includes(key) || criticalTopTaskbarUI.includes(key)) &&
                    !key.startsWith('menu') && !key.endsWith('Global')
                ) {
                    console.warn(`[Main initializeSnugOS] Critical UI Element ID "${key}" not found in DOM.`);
                }
            }
        });

        // Assign new top taskbar element IDs to their "Global" counterparts in uiElementsCache
        uiElementsCache.topTaskbar = document.getElementById('topTaskbar');
        uiElementsCache.playBtnGlobal = document.getElementById('playBtnGlobalTop');
        uiElementsCache.recordBtnGlobal = document.getElementById('recordBtnGlobalTop');
        uiElementsCache.stopBtnGlobal = document.getElementById('stopBtnGlobalTop');
        uiElementsCache.tempoGlobalInput = document.getElementById('tempoGlobalInputTop');
        uiElementsCache.midiInputSelectGlobal = document.getElementById('midiInputSelectGlobalTop');
        uiElementsCache.masterMeterContainerGlobal = document.getElementById('masterMeterContainerGlobalTop');
        uiElementsCache.masterMeterBarGlobal = document.getElementById('masterMeterBarGlobalTop');
        uiElementsCache.midiIndicatorGlobal = document.getElementById('midiIndicatorGlobalTop');
        uiElementsCache.keyboardIndicatorGlobal = document.getElementById('keyboardIndicatorGlobalTop');
        uiElementsCache.playbackModeToggleBtnGlobal = document.getElementById('playbackModeToggleBtnGlobalTop');
        uiElementsCache.themeToggleBtn = document.getElementById('themeToggleBtn'); // Cache the single theme button
        // SVGs inside #themeToggleBtn are controlled by CSS, direct caching not strictly needed for display logic


        try { /* ... (effects registry loading - no change) ... */ }
        catch (registryError) { /* ... */ }
        if (uiElementsCache.customBgInput) { /* ... (background upload - no change) ... */ }
        try { /* ... (background restore - no change) ... */ }
        catch (error) { /* ... */ }

        if (typeof initializeStateModule === 'function') initializeStateModule(appServices); else console.error("initializeStateModule is not a function");
        if (typeof initializeUIModule === 'function') initializeUIModule(appServices); else console.error("initializeUIModule is not a function");
        if (typeof initializeAudioModule === 'function') initializeAudioModule(appServices); else console.error("initializeAudioModule is not a function");
        if (typeof initializeEventHandlersModule === 'function') initializeEventHandlersModule(appServices); else console.error("initializeEventHandlersModule is not a function");

        if (typeof initializePrimaryEventListeners === 'function') {
             initializePrimaryEventListeners(appServices);
        } else { console.error("initializePrimaryEventListeners is not a function");}

        if (typeof attachGlobalControlEvents === 'function') {
            attachGlobalControlEvents(uiElementsCache);
        } else { console.error("attachGlobalControlEvents is not a function"); }
        if (typeof setupMIDI === 'function') {
            setupMIDI();
        } else { console.error("setupMIDI is not a function"); }

        if (Constants.soundLibraries && typeof fetchSoundLibrary === 'function') { /* ... (sound library loading - no change) ... */ }
        if (appServices.openTimelineWindow && typeof appServices.openTimelineWindow === 'function') { /* ... (open timeline - no change) ... */ }

        requestAnimationFrame(updateMetersLoop);
        if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI(null, null);

        // Theme Initialization
        const savedThemePreference = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedThemePreference && appServices.setCurrentUserThemePreference) {
            console.log(`[Theme Init] Found saved preference: ${savedThemePreference}`);
            appServices.setCurrentUserThemePreference(savedThemePreference); // This will trigger applyUserThemePreference
        } else if (appServices.setCurrentUserThemePreference) {
            console.log(`[Theme Init] No saved preference, defaulting to 'system'.`);
            appServices.setCurrentUserThemePreference('system'); // This will trigger applyUserThemePreference
        } else {
            console.warn(`[Theme Init] appServices.setCurrentUserThemePreference not available. Applying theme directly.`);
            applyUserThemePreference(); // Fallback
        }

        const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQueryList.addEventListener('change', handleSystemThemeChange);
        console.log("[Theme Init] System theme change listener added.");

        // Remove old "Cycle Theme" from Start Menu if it exists by ID
        const cycleThemeMenuItem = document.getElementById('menuToggleTheme');
        if (cycleThemeMenuItem && cycleThemeMenuItem.parentElement) {
            const prevHr = cycleThemeMenuItem.previousElementSibling;
            // Check if the previous sibling is an HR and also remove it if it seems to be paired
            if (prevHr && prevHr.tagName === 'HR' && prevHr.nextElementSibling === cycleThemeMenuItem) {
                prevHr.remove();
            }
            cycleThemeMenuItem.remove();
            console.log("[Theme Init] Removed old 'Cycle Theme' menu item from Start Menu.");
        }

        // Add click listener for the new single theme toggle button in the top taskbar
        if (uiElementsCache.themeToggleBtn) {
            uiElementsCache.themeToggleBtn.addEventListener('click', () => {
                const currentPreference = appServices.getCurrentUserThemePreference ? appServices.getCurrentUserThemePreference() : 'system';
                // Determine the currently *applied* theme by checking the body class
                const isCurrentlyLight = document.body.classList.contains('theme-light');
                const actualCurrentTheme = isCurrentlyLight ? 'light' : 'dark';
                let nextPreferenceToStore;

                if (currentPreference === 'system') {
                    // If system is current, clicking should switch to the *opposite* of the *current actual theme*
                    // and set the preference to that explicit theme.
                    nextPreferenceToStore = actualCurrentTheme === 'light' ? 'dark' : 'light';
                } else if (currentPreference === 'light') {
                    // If light, switch preference to dark
                    nextPreferenceToStore = 'dark';
                } else { // currentPreference === 'dark'
                    // If dark, switch preference back to system
                    nextPreferenceToStore = 'system';
                }

                if (appServices.setCurrentUserThemePreference) {
                    appServices.setCurrentUserThemePreference(nextPreferenceToStore); // This will save and apply
                }
                showSafeNotification(`Theme preference set to: ${nextPreferenceToStore.charAt(0).toUpperCase() + nextPreferenceToStore.slice(1)}`, 1500);
            });
            console.log("[Theme Init] Event listener added to new theme toggle button.");
        } else {
            console.warn("[Theme Init] New theme toggle button (themeToggleBtn) not found in cache.");
        }

        if (appServices.onPlaybackModeChange && typeof getPlaybackModeState === 'function') {
            appServices.onPlaybackModeChange(getPlaybackModeState());
        }

        showSafeNotification(`Welcome to SnugOS ${Constants.APP_VERSION}!`, 2500);
        console.log(`[Main initializeSnugOS] SnugOS Version ${Constants.APP_VERSION} Initialized.`);

    } catch (initError) {
        console.error("CRITICAL ERROR during SnugOS Initialization:", initError);
        showSafeNotification("A critical error occurred during application startup. Please refresh.", 7000);
        const body = document.body;
        if (body) {
            body.innerHTML = `<div style="padding: 20px; text-align: center; font-family: sans-serif; color: #ccc; background-color: #101010; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;"><h1>Initialization Error</h1><p>SnugOS could not start due to a critical error. Please check the console for details and try refreshing the page.</p><p style="font-size: 0.8em; margin-top: 20px;">Error: ${initError.message}</p></div>`;
        }
    }
}

function updateMetersLoop() {
    try {
        if (typeof updateMeters === 'function') {
            const mixerWindow = getWindowByIdState ? getWindowByIdState('mixer') : null;
            const mixerMasterMeterBar = mixerWindow?.element && !mixerWindow.isMinimized ? mixerWindow.element.querySelector('#mixerMasterMeterBar') : null;
            const tracks = getTracksState ? getTracksState() : [];
            updateMeters(uiElementsCache.masterMeterBarGlobal, mixerMasterMeterBar, tracks);
        }
        if (typeof updatePlayheadPosition === 'function') {
            updatePlayheadPosition();
        }
    } catch (loopError) {
        console.warn("[Main updateMetersLoop] Error in UI update loop:", loopError);
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
                uiElementsCache.desktop.style.backgroundColor = Constants.defaultDesktopBg || '#101010';
            }
        } catch (e) {
            console.error("Error applying desktop background style:", e);
        }
    } else {
        console.warn("Desktop element not found in cache for applying background.");
    }
}


// --- Global Event Listeners ---
window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    const tracksExist = getTracksState && getTracksState().length > 0;
    const undoStackExists = getUndoStackState && getUndoStackState().length > 0;

    if (tracksExist || undoStackExists) {
        e.preventDefault();
        e.returnValue = '';
        return "You have unsaved changes. Are you sure you want to leave?";
    }
    if (currentBackgroundImageObjectURL) {
        URL.revokeObjectURL(currentBackgroundImageObjectURL);
    }
});

console.log(`SCRIPT EXECUTION FINISHED - SnugOS (main.js - Version ${Constants.APP_VERSION})`);
