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
    openTrackInspectorWindow, openMixerWindow, updateMixerWindow,
    // Timeline and Sound Browser functions are now imported from their specific modules
    openTimelineWindow, renderTimeline, updatePlayheadPosition, // MODIFICATION: Uncommented
    openSoundBrowserWindow, updateSoundBrowserDisplayForLibrary, renderSoundBrowserDirectory, // MODIFICATION: Uncommented
    renderEffectsList, renderEffectControls, createKnob,
    updateSequencerCellUI,
    openMasterEffectsRackWindow,
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI,
    renderDrumSamplerPads, updateDrumPadControlsUI, highlightPlayingStep
} from './ui.js'; // Main ui.js imports the sub-modules

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
    openMixerWindow, updateMixerWindow,
    openSoundBrowserWindow, // This will now be from the re-exported functions in ui.js
    updateSoundBrowserDisplayForLibrary, // from ui.js (which imports from soundBrowserUI.js)
    renderSoundBrowserDirectory, // from ui.js (which imports from soundBrowserUI.js)
    openTimelineWindow, // from ui.js (which imports from timelineUI.js)
    renderTimeline, // from ui.js (which imports from timelineUI.js)
    updatePlayheadPosition, // from ui.js (which imports from timelineUI.js)
    highlightPlayingStep,
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI,
    updateDrumPadControlsUI, renderDrumSamplerPads, renderEffectsList, renderEffectControls,
    createKnob, // from ui.js (which imports from knobUI.js)
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
    getAudioBlobFromSoundBrowserItem: async (soundData) => {
        if (!soundData || !soundData.libraryName || !soundData.fullPath) {
            console.warn("[AppServices getAudioBlob] Invalid soundData:", soundData);
            return null;
        }
        const loadedZips = getLoadedZipFilesState();
        if (loadedZips?.[soundData.libraryName] && loadedZips[soundData.libraryName] !== "loading") {
            const zipEntry = loadedZips[soundData.libraryName].file(soundData.fullPath);
            if (zipEntry) {
                try {
                    const blob = await zipEntry.async("blob");
                    return new File([blob], soundData.fileName, { type: getMimeTypeFromFilename(soundData.fileName) });
                } catch (e) {
                    console.error("[AppServices getAudioBlob] Error getting blob from zipEntry:", e);
                    return null;
                }
            } else {
                console.warn(`[AppServices getAudioBlob] ZipEntry not found for ${soundData.fullPath} in ${soundData.libraryName}`);
            }
        } else {
            console.warn(`[AppServices getAudioBlob] Library ${soundData.libraryName} not loaded or is loading.`);
        }
        return null;
    },
    panicStopAllAudio: () => {
        console.log("[AppServices] Panic Stop All Audio requested.");
        if (typeof Tone !== 'undefined') {
            Tone.Transport.stop();
            Tone.Transport.cancel(0);
        }
        const tracks = getTracksState();
        if (tracks) {
            tracks.forEach(track => {
                if (track && typeof track.stopPlayback === 'function') {
                    try { track.stopPlayback(); } catch (e) { console.warn(`Error in track.stopPlayback() for track ${track.id}:`, e); }
                }
                if (track && track.instrument && !track.instrument.disposed) {
                    if (typeof track.instrument.releaseAll === 'function') {
                        try { track.instrument.releaseAll(Tone.now()); } catch (e) { console.warn(`Error during instrument.releaseAll() for track ${track.id}:`, e); }
                    }
                    if ((track.type === 'Synth' || track.type === 'InstrumentSampler') && track.gainNode && track.gainNode.gain && typeof track.gainNode.gain.cancelScheduledValues === 'function' && typeof track.gainNode.gain.linearRampToValueAtTime === 'function' && !track.gainNode.disposed) {
                        console.log(`[AppServices Panic] Ramping down gain for synth track ${track.id}`);
                        try { track.gainNode.gain.cancelScheduledValues(Tone.now()); track.gainNode.gain.linearRampToValueAtTime(0, Tone.now() + 0.02); } catch (e) { console.warn(`Error ramping down gain for track ${track.id}:`, e); }
                    }
                }
                if (track && track.type === 'Sampler' && !track.slicerIsPolyphonic && track.slicerMonoPlayer && track.slicerMonoEnvelope) {
                    if (track.slicerMonoPlayer.state === 'started' && !track.slicerMonoPlayer.disposed) { try { track.slicerMonoPlayer.stop(Tone.now()); } catch(e) { console.warn("Error stopping mono slicer player during panic", e); } }
                    if (!track.slicerMonoEnvelope.disposed) { try { track.slicerMonoEnvelope.triggerRelease(Tone.now()); } catch(e) { console.warn("Error releasing mono slicer envelope during panic", e); } }
                }
                if (track && track.type === 'DrumSampler' && track.drumPadPlayers) {
                    track.drumPadPlayers.forEach(player => { if (player && player.state === 'started' && !player.disposed) { try { player.stop(Tone.now()); } catch(e) { console.warn("Error stopping drum pad player during panic", e); } } });
                }
            });
        }
        if (uiElementsCache.playBtnGlobal) { uiElementsCache.playBtnGlobal.textContent = 'Play'; }
        if (isTrackRecordingState()) {
            const recTrackId = getRecordingTrackIdState();
            const recTrack = recTrackId !== null ? getTrackByIdState(recTrackId) : null;
            if (appServices.stopAudioRecording && recTrackId !== null && recTrack?.type === 'Audio') { appServices.stopAudioRecording(); }
            setIsRecordingState(false); setRecordingTrackIdState(null);
            if(appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(false);
        }
        console.log("All audio and transport stopped via panic.");
        showSafeNotification("All audio stopped.", 1500);
    },
    updateTaskbarTempoDisplay: (tempo) => {
        if (uiElementsCache.taskbarTempoDisplay) { uiElementsCache.taskbarTempoDisplay.textContent = `${parseFloat(tempo).toFixed(1)} BPM`; }
        if (uiElementsCache.tempoGlobalInput) { if (uiElementsCache.tempoGlobalInput.value !== parseFloat(tempo).toFixed(1)) { uiElementsCache.tempoGlobalInput.value = parseFloat(tempo).toFixed(1); } }
        else { console.warn("Taskbar tempo display or global input element not found in cache."); }
    },
    updateUndoRedoButtonsUI: (undoState, redoState) => {
        if (uiElementsCache.menuUndo) { uiElementsCache.menuUndo.classList.toggle('disabled', !undoState); uiElementsCache.menuUndo.title = undoState ? `Undo: ${undoState.description || 'action'}` : 'Undo (Nothing to undo)'; } else { console.warn("Undo menu item not found in cache."); }
        if (uiElementsCache.menuRedo) { uiElementsCache.menuRedo.classList.toggle('disabled', !redoState); uiElementsCache.menuRedo.title = redoState ? `Redo: ${redoState.description || 'action'}` : 'Redo (Nothing to redo)'; } else { console.warn("Redo menu item not found in cache."); }
    },
    updateRecordButtonUI: (isRec) => {
        if (uiElementsCache.recordBtnGlobal) { uiElementsCache.recordBtnGlobal.textContent = isRec ? 'Stop Rec' : 'Record'; uiElementsCache.recordBtnGlobal.classList.toggle('recording', isRec); } else { console.warn("Global record button not found in cache."); }
    },
    closeAllWindows: (isReconstruction = false) => {
        const openWindows = getOpenWindowsState();
        if (openWindows && typeof openWindows.forEach === 'function') { openWindows.forEach(win => { if (win && typeof win.close === 'function') win.close(isReconstruction); }); }
        if (appServices.clearOpenWindowsMap) appServices.clearOpenWindowsMap();
    },
    clearOpenWindowsMap: () => { const map = getOpenWindowsState(); if(map && typeof map.clear === 'function') map.clear(); },
    closeAllTrackWindows: (trackIdToClose) => {
        console.log(`[Main appServices.closeAllTrackWindows] Called for trackId: ${trackIdToClose}`);
        const windowIdsToClose = [ `trackInspector-${trackIdToClose}`, `effectsRack-${trackIdToClose}`, `sequencerWin-${trackIdToClose}` ];
        windowIdsToClose.forEach(winId => { const win = getWindowByIdState(winId); if (win && typeof win.close === 'function') { win.close(true); } });
    },
    updateTrackUI: handleTrackUIUpdate,
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
    uiElementsCache: uiElementsCache,
    addMasterEffect: async (effectType) => {
        try {
            const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;
            if (!isReconstructing && appServices.captureStateForUndo) appServices.captureStateForUndo(`Add ${effectType} to Master`);

            if (!appServices.effectsRegistryAccess?.getEffectDefaultParams) {
                console.error("effectsRegistryAccess.getEffectDefaultParams not available."); return;
            }
            const defaultParams = appServices.effectsRegistryAccess.getEffectDefaultParams(effectType);
            const effectIdInState = addMasterEffectToState(effectType, defaultParams);
            await addMasterEffectToAudio(effectIdInState, effectType, defaultParams);
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        } catch (error) {
            console.error(`[Main addMasterEffect] Error adding ${effectType}:`, error);
            showSafeNotification(`Failed to add master effect ${effectType}.`, 3000);
        }
    },
    removeMasterEffect: async (effectId) => {
        try {
            const effects = getMasterEffectsState();
            const effect = effects ? effects.find(e => e.id === effectId) : null;
            if (effect) {
                const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;
                if (!isReconstructing && appServices.captureStateForUndo) appServices.captureStateForUndo(`Remove ${effect.type} from Master`);
                removeMasterEffectFromState(effectId);
                await removeMasterEffectFromAudio(effectId);
                if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
            }
        } catch (error) {
            console.error(`[Main removeMasterEffect] Error removing ${effectId}:`, error);
            showSafeNotification("Failed to remove master effect.", 3000);
        }
    },
    updateMasterEffectParam: (effectId, paramPath, value) => {
        updateMasterEffectParamInState(effectId, paramPath, value);
        updateMasterEffectParamInAudio(effectId, paramPath, value);
    },
    reorderMasterEffect: (effectId, newIndex) => {
        try {
            const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;
            if (!isReconstructing && appServices.captureStateForUndo) appServices.captureStateForUndo(`Reorder Master effect`);
            reorderMasterEffectInState(effectId, newIndex);
            reorderMasterEffectInAudio(effectId, newIndex);
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        } catch (error) {
            console.error(`[Main reorderMasterEffect] Error reordering ${effectId}:`, error);
            showSafeNotification("Failed to reorder master effect.", 3000);
        }
    },
    setActualMasterVolume: (volumeValue) => {
        if (typeof getActualMasterGainNodeFromAudio === 'function') {
            const actualMasterNode = getActualMasterGainNodeFromAudio();
            if (actualMasterNode && actualMasterNode.gain && typeof actualMasterNode.gain.setValueAtTime === 'function') {
                try {
                    actualMasterNode.gain.setValueAtTime(volumeValue, Tone.now());
                } catch (e) { console.error("Error setting master volume via Tone:", e); }
            } else { console.warn("Master gain node or its gain property not available."); }
        } else { console.warn("getActualMasterGainNodeFromAudio service missing."); }
    },
    effectsRegistryAccess: { AVAILABLE_EFFECTS: null, getEffectParamDefinitions: null, getEffectDefaultParams: null, synthEngineControlDefinitions: null, },
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag === true,
    _isReconstructingDAW_flag: false,
    _transportEventsInitialized_flag: false,
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },
    updateTrackMeterUI: (trackId, level, isClipping) => {
        try {
            const inspectorWindow = getWindowByIdState(`trackInspector-${trackId}`);
            const mixerWindow = getWindowByIdState('mixer');
            if (inspectorWindow?.element && !inspectorWindow.isMinimized) {
                const meterBar = inspectorWindow.element.querySelector(`#trackMeterBar-${trackId}`);
                if (meterBar) {
                    meterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
                    meterBar.classList.toggle('clipping', isClipping);
                }
            }
            if (mixerWindow?.element && !mixerWindow.isMinimized) {
                const meterBar = mixerWindow.element.querySelector(`#mixerTrackMeterBar-${trackId}`);
                if (meterBar) {
                    meterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
                    meterBar.classList.toggle('clipping', isClipping);
                }
            }
        } catch (error) { console.warn(`[Main updateTrackMeterUI] Error for track ${trackId}:`, error); }
    },
    updateMasterEffectsRackUI: () => {
        try {
            const masterRackWindow = getWindowByIdState('masterEffectsRack');
            if (masterRackWindow?.element && !masterRackWindow.isMinimized && typeof renderEffectsList === 'function') {
                const listDiv = masterRackWindow.element.querySelector('#effectsList-master');
                const controlsContainer = masterRackWindow.element.querySelector('#effectControlsContainer-master');
                if (listDiv && controlsContainer) {
                    renderEffectsList(null, 'master', listDiv, controlsContainer);
                } else { console.warn("Master effects rack UI elements not found for update."); }
            }
        } catch (error) { console.warn("[Main updateMasterEffectsRackUI] Error:", error); }
    },
    triggerCustomBackgroundUpload: () => { if (uiElementsCache.customBgInput) uiElementsCache.customBgInput.click(); else console.warn("Custom background input element not found in cache."); },
    removeCustomDesktopBackground: removeCustomDesktopBackground,
    onPlaybackModeChange: (newMode) => {
        console.log(`[Main appServices.onPlaybackModeChange] Called with newMode: ${newMode}`);
        if (uiElementsCache.playbackModeToggleBtnGlobal) {
            uiElementsCache.playbackModeToggleBtnGlobal.textContent = newMode === 'timeline' ? 'Mode: Timeline' : 'Mode: Sequencer';
            uiElementsCache.playbackModeToggleBtnGlobal.classList.toggle('active', newMode === 'timeline');
        } else {
            console.warn("[Main appServices.onPlaybackModeChange] Playback mode toggle button not found in UI cache.");
        }
        if (appServices.renderTimeline && typeof appServices.renderTimeline === 'function') {
            appServices.renderTimeline();
        }
    }
};

// --- Centralized UI Update Handler ---
function handleTrackUIUpdate(trackId, reason, detail) {
    if (!getTrackByIdState) { console.warn("[Main UI Update] getTrackByIdState service not available."); return; }
    const track = getTrackByIdState(trackId);
    if (!track) {
        console.warn(`[Main UI Update] Track ${trackId} not found for reason: ${reason}`);
        return;
    }

    const getOpenWindowElement = (winId) => {
        if (!getWindowByIdState) return null;
        const win = getWindowByIdState(winId);
        return (win?.element && !win.isMinimized) ? win.element : null;
    };

    const inspectorElement = getOpenWindowElement(`trackInspector-${trackId}`);
    const effectsRackElement = getOpenWindowElement(`effectsRack-${trackId}`);
    const sequencerElement = getOpenWindowElement(`sequencerWin-${trackId}`);
    const mixerElement = getOpenWindowElement('mixer');

    try {
        switch(reason) {
            case 'nameChanged':
                if (inspectorElement) {
                    const inspectorWindowInstance = getWindowByIdState(`trackInspector-${trackId}`);
                    if (inspectorWindowInstance) {
                        inspectorWindowInstance.title = `Inspector: ${track.name}`;
                        const titleSpan = inspectorElement.querySelector('.window-title-bar span');
                        if (titleSpan) titleSpan.textContent = `Inspector: ${track.name}`;
                        if (inspectorWindowInstance.taskbarButton) {
                             inspectorWindowInstance.taskbarButton.textContent = `Inspector: ${track.name}`.substring(0, 20) + (`Inspector: ${track.name}`.length > 20 ? '...' : '');
                             inspectorWindowInstance.taskbarButton.title = `Inspector: ${track.name}`;
                        }
                    }
                }
                if (effectsRackElement) {
                     const effectsRackWindowInstance = getWindowByIdState(`effectsRack-${trackId}`);
                    if (effectsRackWindowInstance) {
                        effectsRackWindowInstance.title = `Effects: ${track.name}`;
                        const titleSpan = effectsRackElement.querySelector('.window-title-bar span');
                        if (titleSpan) titleSpan.textContent = `Effects: ${track.name}`;
                         if (effectsRackWindowInstance.taskbarButton) {
                             effectsRackWindowInstance.taskbarButton.textContent = `Effects: ${track.name}`.substring(0, 20) + (`Effects: ${track.name}`.length > 20 ? '...' : '');
                             effectsRackWindowInstance.taskbarButton.title = `Effects: ${track.name}`;
                        }
                        const rackTitle = effectsRackElement.querySelector(`#effectsRackContent-${track.id} h3`);
                        if (rackTitle) rackTitle.textContent = `Effects Rack: ${track.name}`;
                    }
                }
                if (sequencerElement) {
                    const sequencerWindowInstance = getWindowByIdState(`sequencerWin-${trackId}`);
                    const activeSequence = track.getActiveSequence();
                    const seqTitleText = activeSequence ? `${track.name} - ${activeSequence.name}` : track.name;
                    if (sequencerWindowInstance) {
                        sequencerWindowInstance.title = `Sequencer: ${seqTitleText}`;
                        const titleSpan = sequencerElement.querySelector('.window-title-bar span');
                        if (titleSpan) titleSpan.textContent = `Sequencer: ${seqTitleText}`;
                        if (sequencerWindowInstance.taskbarButton) {
                             sequencerWindowInstance.taskbarButton.textContent = `Sequencer: ${seqTitleText}`.substring(0, 20) + (`Sequencer: ${seqTitleText}`.length > 20 ? '...' : '');
                             sequencerWindowInstance.taskbarButton.title = `Sequencer: ${seqTitleText}`;
                        }
                        const seqControlsTitle = sequencerElement.querySelector(`.sequencer-container .controls span`);
                        if (seqControlsTitle) {
                             const numBars = activeSequence ? (activeSequence.length > 0 ? Math.max(1, activeSequence.length / Constants.STEPS_PER_BAR) : 1) : 1;
                             const totalSteps = activeSequence ? (activeSequence.length > 0 ? activeSequence.length : Constants.defaultStepsPerBar) : Constants.defaultStepsPerBar;
                             seqControlsTitle.textContent = `${track.name} - ${numBars} Bar${numBars > 1 ? 's' : ''} (${totalSteps} steps)`;
                        }
                    }
                }
                if (mixerElement && typeof updateMixerWindow === 'function') {
                    updateMixerWindow();
                }
                if (typeof renderTimeline === 'function' && appServices.renderTimeline) { // Ensure service exists
                    appServices.renderTimeline();
                }
                break;
            case 'muteChanged':
            case 'soloChanged':
            case 'armChanged':
                if (inspectorElement) {
                    const muteBtn = inspectorElement.querySelector(`#muteBtn-${track.id}`);
                    if (muteBtn) muteBtn.classList.toggle('muted', track.isMuted);
                    const soloBtn = inspectorElement.querySelector(`#soloBtn-${track.id}`);
                    if (soloBtn) soloBtn.classList.toggle('soloed', getSoloedTrackIdState() === track.id);
                    const armBtn = inspectorElement.querySelector(`#armInputBtn-${track.id}`);
                    if (armBtn) armBtn.classList.toggle('armed', getArmedTrackIdState() === track.id);
                }
                if (mixerElement && typeof updateMixerWindow === 'function') updateMixerWindow();
                break;
            case 'effectsListChanged':
                 if (effectsRackElement && typeof renderEffectsList === 'function') {
                    const listDiv = effectsRackElement.querySelector(`#effectsList-${track.id}`);
                    const controlsContainer = effectsRackElement.querySelector(`#effectControlsContainer-${track.id}`);
                    if (listDiv && controlsContainer) renderEffectsList(track, 'track', listDiv, controlsContainer);
                 }
                break;
            case 'samplerLoaded':
            case 'instrumentSamplerLoaded':
                if (inspectorElement) {
                    if (track.type === 'Sampler' && typeof drawWaveform === 'function' && typeof renderSamplePads === 'function' && typeof updateSliceEditorUI === 'function') {
                        drawWaveform(track); renderSamplePads(track); updateSliceEditorUI(track);
                    } else if (track.type === 'InstrumentSampler' && typeof drawInstrumentWaveform === 'function') {
                        drawInstrumentWaveform(track);
                    }
                    const dzContainerId = track.type === 'Sampler' ? `#dropZoneContainer-${track.id}-sampler` : `#dropZoneContainer-${track.id}-instrumentsampler`;
                    const dzContainer = inspectorElement.querySelector(dzContainerId);
                    if(dzContainer) {
                        const audioData = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                        const inputId = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;
                        dzContainer.innerHTML = createDropZoneHTML(track.id, inputId, track.type, null, {originalFileName: audioData?.fileName || audioData?.originalFileName, status: 'loaded'});
                        const fileInputEl = dzContainer.querySelector(`#${inputId}`);
                        const loadFn = appServices.loadSampleFile;
                        if (fileInputEl && loadFn) fileInputEl.onchange = (e) => loadFn(e, track.id, track.type);
                        const newDropZoneDiv = dzContainer.querySelector('.drop-zone');
                        if (newDropZoneDiv && typeof setupGenericDropZoneListeners === 'function') {
                           setupGenericDropZoneListeners(newDropZoneDiv, track.id, track.type, null, appServices.loadSoundFromBrowserToTarget, appServices.loadSampleFile, appServices.getTrackById);
                        }
                    }
                }
                break;
            case 'drumPadLoaded':
                 if (inspectorElement && typeof updateDrumPadControlsUI === 'function' && typeof renderDrumSamplerPads === 'function') {
                    updateDrumPadControlsUI(track); renderDrumSamplerPads(track);
                 }
                break;
            case 'sequencerContentChanged':
                const seqWinInstance = getWindowByIdState(`sequencerWin-${trackId}`);
                if (seqWinInstance && seqWinInstance.element && typeof openTrackSequencerWindow === 'function') {
                    const currentStateForRedraw = {
                        id: seqWinInstance.id,
                        title: seqWinInstance.title,
                        left: seqWinInstance.element.style.left,
                        top: seqWinInstance.element.style.top,
                        width: seqWinInstance.element.style.width,
                        height: seqWinInstance.element.style.height,
                        zIndex: parseInt(seqWinInstance.element.style.zIndex, 10) || seqWinInstance.options.zIndex,
                        isMinimized: seqWinInstance.isMinimized,
                        isMaximized: seqWinInstance.isMaximized,
                        restoreState: seqWinInstance.isMaximized ? JSON.parse(JSON.stringify(seqWinInstance.restoreState)) : {},
                        initialContentKey: seqWinInstance.initialContentKey || seqWinInstance.id
                    };
                    openTrackSequencerWindow(trackId, true, currentStateForRedraw);
                } else if (seqWinInstance && !seqWinInstance.element && typeof openTrackSequencerWindow === 'function') {
                    console.warn(`[Main UI Update] Sequencer window instance for ${trackId} found but element missing. Reopening fresh.`);
                    openTrackSequencerWindow(trackId, true, null);
                }
                if (appServices.renderTimeline && typeof appServices.renderTimeline === 'function') {
                    appServices.renderTimeline();
                }
                break;
            case 'sampleLoadError':
                if (inspectorElement) {
                    console.warn(`[Main UI Update] sampleLoadError for track ${trackId}, detail: ${detail}. Inspector UI update for dropzone needed.`);
                    if (track.type === 'DrumSampler' && typeof detail === 'number' && typeof updateDrumPadControlsUI === 'function') {
                        updateDrumPadControlsUI(track);
                    } else if ((track.type === 'Sampler' || track.type === 'InstrumentSampler')) {
                        const dzKey = track.type === 'Sampler' ? 'sampler' : 'instrumentsampler';
                        const dzContainer = inspectorElement.querySelector(`#dropZoneContainer-${track.id}-${dzKey}`);
                        const audioDataSource = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                        const inputIdForError = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;

                        if(dzContainer && audioDataSource) {
                            dzContainer.innerHTML = createDropZoneHTML(track.id, inputIdForError, track.type, null, {originalFileName: audioDataSource.fileName || audioDataSource.originalFileName, status: 'error'});
                            const fileInputEl = dzContainer.querySelector(`#${inputIdForError}`);
                            const loadFn = appServices.loadSampleFile;
                            if (fileInputEl && loadFn) fileInputEl.onchange = (e) => loadFn(e, track.id, track.type);
                            const newDropZoneDiv = dzContainer.querySelector('.drop-zone');
                            if (newDropZoneDiv && typeof setupGenericDropZoneListeners === 'function') {
                               setupGenericDropZoneListeners(newDropZoneDiv, track.id, track.type, null, appServices.loadSoundFromBrowserToTarget, loadFn, appServices.getTrackById);
                            }
                        }
                    }
                }
                break;
            default:
                console.warn(`[Main UI Update] Unhandled reason: ${reason} for track ${trackId}`);
        }
    } catch (error) {
        console.error(`[Main handleTrackUIUpdate] Error updating UI for track ${trackId}, reason ${reason}:`, error);
    }
}

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


        try {
            const effectsRegistry = await import('./effectsRegistry.js');
            if (appServices.effectsRegistryAccess) {
                appServices.effectsRegistryAccess.AVAILABLE_EFFECTS = effectsRegistry.AVAILABLE_EFFECTS || {};
                appServices.effectsRegistryAccess.getEffectParamDefinitions = effectsRegistry.getEffectParamDefinitions || (() => []);
                appServices.effectsRegistryAccess.getEffectDefaultParams = effectsRegistry.getEffectDefaultParams || (() => ({}));
                appServices.effectsRegistryAccess.synthEngineControlDefinitions = effectsRegistry.synthEngineControlDefinitions || {};
                console.log("[Main initializeSnugOS] Effects registry dynamically imported and assigned.");
            } else {
                console.error("[Main initializeSnugOS] appServices.effectsRegistryAccess is not defined before assigning registry.");
            }
        }
        catch (registryError) {
            console.error("[Main initializeSnugOS] Failed to import effectsRegistry.js:", registryError);
            showSafeNotification("Critical error: Failed to load audio effects definitions.", 5000);
        }
        if (uiElementsCache.customBgInput) {
            uiElementsCache.customBgInput.addEventListener('change', handleCustomBackgroundUpload);
        }
        try {
            const storedImageBlob = await appServices.dbGetItem(DESKTOP_BACKGROUND_IDB_KEY);
            if (storedImageBlob) {
                if (currentBackgroundImageObjectURL) { URL.revokeObjectURL(currentBackgroundImageObjectURL); }
                currentBackgroundImageObjectURL = URL.createObjectURL(storedImageBlob);
                applyDesktopBackground(currentBackgroundImageObjectURL);
                console.log("[Main initializeSnugOS] Loaded background from IndexedDB.");
            } else {
                const storedDataURL = localStorage.getItem(DESKTOP_BACKGROUND_LS_KEY);
                if (storedDataURL) {
                    console.log("[Main initializeSnugOS] Loaded background from localStorage (fallback).");
                    applyDesktopBackground(storedDataURL);
                } else {
                    applyDesktopBackground(null);
                }
            }
        }
        catch (error) {
            console.error("Error loading desktop background on init:", error);
            applyDesktopBackground(null);
        }

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

        if (Constants.soundLibraries && typeof fetchSoundLibrary === 'function') {
            Object.entries(Constants.soundLibraries).forEach(([name, url]) => fetchSoundLibrary(name, url, true));
        }
        if (appServices.openTimelineWindow && typeof appServices.openTimelineWindow === 'function') {
            appServices.openTimelineWindow();
        } else { console.warn("appServices.openTimelineWindow not available to open by default."); }

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
        if (typeof updatePlayheadPosition === 'function' && appServices.updatePlayheadPosition) { // Check service exists
            appServices.updatePlayheadPosition();
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
