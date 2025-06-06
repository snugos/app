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
    handleOpenPianoRoll as eventHandleOpenPianoRoll, // CORRECTED: Import the renamed handler
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
    initializeUIModule,
    openTrackEffectsRackWindow,
    openPianoRollWindow, // This function is from ui.js and will be used for appServices
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
    highlightPlayingStep
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
        applyDesktopBackground(null); // Revert to default
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
function applyThemeCSS(themeName) {
    document.body.classList.remove('theme-light', 'theme-dark');
    if (themeName === 'light') {
        document.body.classList.add('theme-light');
    } else { 
        document.body.classList.add('theme-dark');
    }
    console.log(`[Theme] Applied CSS class for: ${themeName}`);
}

function applyUserThemePreference() {
    const preference = appServices.getCurrentUserThemePreference ? appServices.getCurrentUserThemePreference() : 'system';
    let actualThemeToApply = 'dark'; 
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
    openTrackInspectorWindow, 
    openTrackEffectsRackWindow, 
    openPianoRollWindow, 
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
    handleOpenPianoRoll: eventHandleOpenPianoRoll, // CORRECTED: Use the imported handler for the service
    handleTimelineLaneDrop: (event, targetTrackId, startTime) => handleTimelineLaneDrop(event, targetTrackId, startTime, appServices),
    getAudioBlobFromSoundBrowserItem: async (soundData) => {
        if (!soundData || !soundData.libraryName || !soundData.fullPath) {
            console.error("[Main getAudioBlobFromSoundBrowserItem] Invalid soundData:", soundData);
            return null;
        }
        try {
            const blob = await dbGetAudio(soundData.fullPath); 
            if (!blob) {
                console.warn(`[Main getAudioBlobFromSoundBrowserItem] Blob not found in DB for key: ${soundData.fullPath}`);
                if (appServices.fetchSoundLibrary && typeof appServices.fetchSoundLibrary === 'function') {
                    console.log(`[Main getAudioBlobFromSoundBrowserItem] Attempting to re-fetch library ${soundData.libraryName} for missing blob.`);
                    await appServices.fetchSoundLibrary(soundData.libraryName, Constants.soundLibraries[soundData.libraryName], false);
                    const reBlob = await dbGetAudio(soundData.fullPath);
                    if (reBlob) return reBlob;
                    else console.warn(`[Main getAudioBlobFromSoundBrowserItem] Blob still not found after re-fetch for: ${soundData.fullPath}`);
                }
            }
            return blob;
        } catch (err) {
            console.error(`[Main getAudioBlobFromSoundBrowserItem] Error fetching blob for ${soundData.fullPath}:`, err);
            return null;
        }
    },
    panicStopAllAudio: () => {
        console.warn("[Main panicStopAllAudio] PANIC! Stopping all audio.");
        Tone.Transport.stop();
        Tone.Transport.cancel(0);
        getTracksState().forEach(track => {
            if (track && typeof track.stopPlayback === 'function') track.stopPlayback();
            if (track && track.instrument && typeof track.instrument.releaseAll === 'function') track.instrument.releaseAll(0);
            if (track && track.toneSampler && typeof track.toneSampler.releaseAll === 'function') track.toneSampler.releaseAll(0);
        });
        if (isTrackRecordingState()) {
            if (appServices.stopAudioRecording) appServices.stopAudioRecording(true); 
            else { setIsRecordingState(false); setRecordingTrackIdState(null); }
        }
        if (uiElementsCache.playBtnGlobal) {
            uiElementsCache.playBtnGlobal.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-play"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        }
         if (appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(false);
    },
    updateTaskbarTempoDisplay: (tempo) => { if (uiElementsCache.taskbarTempoDisplay) uiElementsCache.taskbarTempoDisplay.textContent = `${parseFloat(tempo).toFixed(1)} BPM`; },
    updateUndoRedoButtonsUI: (undoState, redoState) => {
        if (uiElementsCache.menuUndo) {
            uiElementsCache.menuUndo.classList.toggle('disabled', !undoState);
            uiElementsCache.menuUndo.title = undoState ? `Undo: ${undoState.action}` : "Undo";
        }
        if (uiElementsCache.menuRedo) {
            uiElementsCache.menuRedo.classList.toggle('disabled', !redoState);
            uiElementsCache.menuRedo.title = redoState ? `Redo: ${redoState.action}` : "Redo";
        }
    },
    updateRecordButtonUI: (isRec) => {
        const recordBtn = uiElementsCache.recordBtnGlobal;
        if (recordBtn) {
            recordBtn.classList.toggle('recording', isRec);
            if (isRec) {
                recordBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-square"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`; 
            } else {
                recordBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="red" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-circle"><circle cx="12" cy="12" r="10"></circle></svg>`;
            }
        }
    },
    closeAllWindows: (isReconstruction = false) => {
        const openWindows = getOpenWindowsState();
        Array.from(openWindows.values()).forEach(win => {
            if (win && typeof win.close === 'function') {
                try {
                    win.close(isReconstruction); 
                } catch(e) { console.warn(`Error closing window ${win.id}:`, e); }
            }
        });
    },
    clearOpenWindowsMap: () => { 
        const openWindows = getOpenWindowsState();
        if (openWindows && typeof openWindows.clear === 'function') {
            openWindows.clear();
        }
    },
    closeAllTrackWindows: (trackIdToClose) => {
        const openWindows = getOpenWindowsState();
        Array.from(openWindows.values()).forEach(winInstance => {
            if (winInstance && winInstance.id.includes(`-${trackIdToClose}`)) {
                if (typeof winInstance.close === 'function') winInstance.close(true); 
            }
        });
    },
    updateTrackUI: handleTrackUIUpdate,
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
    uiElementsCache: uiElementsCache,
    addMasterEffect: async (effectType) => { await addMasterEffectToState(effectType); if (typeof addMasterEffectToAudio === 'function') addMasterEffectToAudio(effectType); },
    removeMasterEffect: async (effectId) => { await removeMasterEffectFromState(effectId); if (typeof removeMasterEffectFromAudio === 'function') removeMasterEffectFromAudio(effectId); },
    updateMasterEffectParam: (effectId, paramPath, value) => { updateMasterEffectParamInState(effectId, paramPath, value); if (typeof updateMasterEffectParamInAudio === 'function') updateMasterEffectParamInAudio(effectId, paramPath, value); },
    reorderMasterEffect: (effectId, newIndex) => { reorderMasterEffectInState(effectId, newIndex); if (typeof reorderMasterEffectInAudio === 'function') reorderMasterEffectInAudio(effectId, newIndex); },
    setActualMasterVolume: (volumeValue) => { 
        const masterGainNode = getActualMasterGainNodeFromAudio();
        if (masterGainNode) masterGainNode.gain.value = volumeValue; 
    },
    effectsRegistryAccess: { AVAILABLE_EFFECTS: null, getEffectParamDefinitions: null, getEffectDefaultParams: null, synthEngineControlDefinitions: null, },
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag === true,
    _isReconstructingDAW_flag: false,
    _transportEventsInitialized_flag: false,
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },
    updateTrackMeterUI: (trackId, level, isClipping) => {
        const inspectorWindow = appServices.getWindowById(`trackInspector-${trackId}`);
        const inspectorMeter = inspectorWindow?.element?.querySelector(`#trackMeterBar-${trackId}`);
        if (inspectorMeter) {
            inspectorMeter.style.width = `${Math.max(0, Math.min(100, (level + 60) / 60 * 100))}%`;
            inspectorMeter.classList.toggle('clipping', isClipping);
        }
        const mixerMeter = document.getElementById(`mixerTrackMeterBar-${trackId}`); 
        if (mixerMeter) {
            mixerMeter.style.width = `${Math.max(0, Math.min(100, (level + 60) / 60 * 100))}%`;
            mixerMeter.classList.toggle('clipping', isClipping);
        }
    },
    updateMasterEffectsRackUI: () => {
        const rackWindow = appServices.getWindowById('masterEffectsRack');
        if (rackWindow?.element && !rackWindow.isMinimized) {
            const listDiv = rackWindow.element.querySelector('#effectsList-master');
            const controlsContainer = rackWindow.element.querySelector('#effectControlsContainer-master');
            if (listDiv && controlsContainer && typeof renderEffectsList === 'function') {
                renderEffectsList(null, 'master', listDiv, controlsContainer);
            }
        }
    },
    triggerCustomBackgroundUpload: () => { if (uiElementsCache.customBgInput) uiElementsCache.customBgInput.click(); else console.warn("Custom background input element not found in cache."); },
    removeCustomDesktopBackground: removeCustomDesktopBackground,
    onPlaybackModeChange: (newMode) => {
        const playbackModeToggle = uiElementsCache.playbackModeToggleBtnGlobal;
        if (playbackModeToggle) {
            playbackModeToggle.textContent = `Mode: ${newMode.charAt(0).toUpperCase() + newMode.slice(1)}`;
        }
        console.log(`[Main onPlaybackModeChange] Mode changed to ${newMode}. Re-initializing sequences/playback for ${getTracksState().length} tracks.`);
        const currentPlayheadPosition = Tone.Transport.seconds;
        Tone.Transport.stop();
        Tone.Transport.cancel(0);

        getTracksState().forEach(async track => {
            if (track && typeof track.recreateToneSequence === 'function' && track.type !== 'Audio') {
                 track.recreateToneSequence(true); 
            }
            if(track && typeof track.stopPlayback === 'function') {
                track.stopPlayback(); 
            }
        });
        if(uiElementsCache.playBtnGlobal) {
            uiElementsCache.playBtnGlobal.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-play"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        }
        console.log(`[Main onPlaybackModeChange] Playback mode changed to ${newMode}. UI updated.`);
    }
};

// --- Centralized UI Update Handler ---
function handleTrackUIUpdate(trackId, reason, detail) { 
    console.log(`[Main UI Update] Track ${trackId} reason: ${reason}`, detail || '');
    const track = appServices.getTrackById(trackId); 
    if (!track) {
        console.warn(`[Main UI Update] Track ${trackId} not found for reason: ${reason}`);
        return;
    }

    const inspectorWindow = appServices.getWindowById(`trackInspector-${trackId}`);
    if (inspectorWindow && inspectorWindow.element && !inspectorWindow.isMinimized) {
        const inspectorContent = inspectorWindow.element.querySelector('.track-inspector-content');
        if (inspectorContent) {
            const buildContentFunc = localAppServices.buildTrackInspectorContentDOM || (typeof buildTrackInspectorContentDOM !== 'undefined' ? buildTrackInspectorContentDOM : null);
            const initCommonFunc = localAppServices.initializeCommonInspectorControls || (typeof initializeCommonInspectorControls !== 'undefined' ? initializeCommonInspectorControls : null);
            const initTypeSpecificFunc = localAppServices.initializeTypeSpecificInspectorControls || (typeof initializeTypeSpecificInspectorControls !== 'undefined' ? initializeTypeSpecificInspectorControls : null);


            if (reason === 'nameChanged' || reason === 'typeSpecificControlsChanged' || reason === 'effectsListChanged' || reason === 'sampleLoaded' || reason === 'slicesUpdated' || reason === 'drumPadsUpdated') {
                const scrollY = inspectorContent.scrollTop;
                if (buildContentFunc && initCommonFunc && initTypeSpecificFunc) {
                        inspectorContent.innerHTML = buildContentFunc(track); 
                        initCommonFunc(track, inspectorContent);
                        initTypeSpecificFunc(track, inspectorContent);
                        inspectorContent.scrollTop = scrollY;
                        console.log(`[Main UI Update] Inspector for ${track.name} re-rendered due to ${reason}.`);
                } else {
                     console.warn("[Main UI Update] Inspector rebuild functions not found. Full inspector refresh might not occur.");
                }
            }
            const muteBtn = inspectorContent.querySelector(`#muteBtn-${trackId}`);
            if (muteBtn) { muteBtn.textContent = track.isMuted ? 'Unmute' : 'Mute'; muteBtn.classList.toggle('muted', track.isMuted); }
            
            const soloBtn = inspectorContent.querySelector(`#soloBtn-${trackId}`);
            if (soloBtn) { soloBtn.textContent = track.isSoloed ? 'Unsolo' : 'Solo'; soloBtn.classList.toggle('soloed', track.isSoloed); }
            
            const armBtn = inspectorContent.querySelector(`#armInputBtn-${trackId}`);
            if (armBtn) armBtn.classList.toggle('armed', appServices.getArmedTrackId && appServices.getArmedTrackId() === trackId);

            const monitorBtn = inspectorContent.querySelector(`#monitorBtn-${trackId}`);
            if (monitorBtn && track.type === 'Audio') monitorBtn.classList.toggle('active', track.isMonitoringEnabled);


            if (track.inspectorControls?.volume && typeof track.inspectorControls.volume.setValue === 'function') {
                 track.inspectorControls.volume.setValue(track.isMuted ? 0 : track.previousVolumeBeforeMute, false);
            }
        }
    }

    if (reason === 'sequencerContentChanged' || reason === 'activeSequenceChanged') {
        const pianoRollWindow = appServices.getWindowById(`pianoRollWin-${trackId}`);
        if (pianoRollWindow && pianoRollWindow.element && !pianoRollWindow.isMinimized && pianoRollWindow.konvaStage) {
            console.log(`[Main UI Update] Triggering Piano Roll redraw for track ${trackId} due to ${reason}.`);
            const backgroundLayer = pianoRollWindow.konvaStage.findOne('Layer'); 
            if (backgroundLayer) backgroundLayer.batchDraw();
        }
    }

    if (appServices.updateMixerWindow) { 
        appServices.updateMixerWindow(); 
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
                    !key.startsWith('menu') && !key.endsWith('Global') && key !== 'menuOpenPianoRoll' 
                ) {
                    console.warn(`[Main initializeSnugOS] Critical UI Element ID "${key}" not found in DOM.`);
                } else if (key === 'menuOpenPianoRoll' && !element) {
                    console.warn("[Main initializeSnugOS] Start menu item 'menuOpenPianoRoll' not found.");
                }
            }
        });
        
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
        uiElementsCache.themeToggleBtn = document.getElementById('themeToggleBtn');
        uiElementsCache.menuOpenPianoRoll = document.getElementById('menuOpenPianoRoll'); 


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

        // Module initializations
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
        } else { console.warn("appServices.openTimelineWindow not available to open by default after UI module initialization."); }

        requestAnimationFrame(updateMetersLoop);
        if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI(null, null);

        // Theme Initialization
        const savedThemePreference = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedThemePreference && appServices.setCurrentUserThemePreference) {
            console.log(`[Theme Init] Found saved preference: ${savedThemePreference}`);
            appServices.setCurrentUserThemePreference(savedThemePreference); 
        } else if (appServices.setCurrentUserThemePreference) {
            console.log(`[Theme Init] No saved preference, defaulting to 'system'.`);
            appServices.setCurrentUserThemePreference('system'); 
        } else { 
            console.warn(`[Theme Init] appServices.setCurrentUserThemePreference not available. Applying theme directly.`);
            applyUserThemePreference();
        }

        const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQueryList.addEventListener('change', handleSystemThemeChange);
        console.log("[Theme Init] System theme change listener added.");

        const cycleThemeMenuItem = document.getElementById('menuToggleTheme');
        if (cycleThemeMenuItem && cycleThemeMenuItem.parentElement) {
            const prevHr = cycleThemeMenuItem.previousElementSibling;
            if (prevHr && prevHr.tagName === 'HR' && prevHr.nextElementSibling === cycleThemeMenuItem) {
                prevHr.remove();
            }
            cycleThemeMenuItem.remove();
            console.log("[Theme Init] Removed old 'Cycle Theme' menu item from Start Menu.");
        }
        
        if (uiElementsCache.themeToggleBtn) {
            uiElementsCache.themeToggleBtn.addEventListener('click', () => {
                const currentPreference = appServices.getCurrentUserThemePreference ? appServices.getCurrentUserThemePreference() : 'system';
                const bodyClassList = document.body.classList;
                let actualCurrentTheme = 'dark'; 
                if (bodyClassList.contains('theme-light')) actualCurrentTheme = 'light';
                else if (bodyClassList.contains('theme-dark')) actualCurrentTheme = 'dark';
                
                let nextPreferenceToStore;

                if (currentPreference === 'system') {
                    nextPreferenceToStore = actualCurrentTheme === 'light' ? 'dark' : 'light';
                } else if (currentPreference === 'light') {
                    nextPreferenceToStore = 'dark';
                } else { // currentPreference === 'dark'
                    nextPreferenceToStore = 'system';
                }

                if (appServices.setCurrentUserThemePreference) {
                    appServices.setCurrentUserThemePreference(nextPreferenceToStore);
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
            const mixerWindow = getOpenWindowsState ? getOpenWindowsState().get('mixer') : null;
            const mixerMasterMeterBar = mixerWindow?.element && !mixerWindow.isMinimized ? mixerWindow.element.querySelector('#mixerMasterMeterBar') : null;
            const tracks = getTracksState ? getTracksState() : [];
            updateMeters(uiElementsCache.masterMeterBarGlobal, mixerMasterMeterBar, tracks);
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
