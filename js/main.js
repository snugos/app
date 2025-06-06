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
    openPianoRollWindow, // This is from ui.js, which handles opening the actual window
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

async function handleCustomBackgroundUpload(event) { /* ... (implementation unchanged) ... */ }
async function removeCustomDesktopBackground() { /* ... (implementation unchanged) ... */ }
function showSafeNotification(message, duration) { /* ... (implementation unchanged) ... */ }
function applyThemeCSS(themeName) { /* ... (implementation unchanged) ... */ }
function applyUserThemePreference() { /* ... (implementation unchanged) ... */ }
function handleSystemThemeChange(event) { /* ... (implementation unchanged) ... */ }

// --- AppServices Object (Centralized DI Container) ---
const appServices = {
    dbStoreItem: dbStoreAudio,
    dbGetItem: dbGetAudio,
    dbDeleteItem: dbDeleteAudio,
    openTrackInspectorWindow, 
    openTrackEffectsRackWindow, 
    openPianoRollWindow, // This function is imported from ui.js
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
    getAudioBlobFromSoundBrowserItem: async (soundData) => { /* ... (implementation unchanged) ... */ },
    panicStopAllAudio: () => { /* ... (implementation unchanged) ... */ },
    updateTaskbarTempoDisplay: (tempo) => { /* ... (implementation unchanged) ... */ },
    updateUndoRedoButtonsUI: (undoState, redoState) => { /* ... (implementation unchanged) ... */ },
    updateRecordButtonUI: (isRec) => { /* ... (implementation unchanged) ... */ },
    closeAllWindows: (isReconstruction = false) => { /* ... (implementation unchanged) ... */ },
    clearOpenWindowsMap: () => { /* ... (implementation unchanged) ... */ },
    closeAllTrackWindows: (trackIdToClose) => { /* ... (implementation unchanged) ... */ },
    updateTrackUI: handleTrackUIUpdate,
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
    uiElementsCache: uiElementsCache,
    addMasterEffect: async (effectType) => { /* ... (implementation unchanged) ... */ },
    removeMasterEffect: async (effectId) => { /* ... (implementation unchanged) ... */ },
    updateMasterEffectParam: (effectId, paramPath, value) => { /* ... (implementation unchanged) ... */ },
    reorderMasterEffect: (effectId, newIndex) => { /* ... (implementation unchanged) ... */ },
    setActualMasterVolume: (volumeValue) => { /* ... (implementation unchanged) ... */ },
    effectsRegistryAccess: { AVAILABLE_EFFECTS: null, getEffectParamDefinitions: null, getEffectDefaultParams: null, synthEngineControlDefinitions: null, },
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag === true,
    _isReconstructingDAW_flag: false,
    _transportEventsInitialized_flag: false,
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },
    updateTrackMeterUI: (trackId, level, isClipping) => { /* ... (implementation unchanged) ... */ },
    updateMasterEffectsRackUI: () => { /* ... (implementation unchanged) ... */ },
    triggerCustomBackgroundUpload: () => { /* ... (implementation unchanged) ... */ },
    removeCustomDesktopBackground: removeCustomDesktopBackground,
    onPlaybackModeChange: (newMode) => { /* ... (implementation unchanged) ... */ }
};

// --- Centralized UI Update Handler ---
function handleTrackUIUpdate(trackId, reason, detail) { /* ... (implementation unchanged, will need piano roll specific updates later) ... */ }

// --- Application Initialization ---
async function initializeSnugOS() { /* ... (implementation unchanged, but should now load without JSZip error) ... */ }
function updateMetersLoop() { /* ... (implementation unchanged) ... */ }
function applyDesktopBackground(imageUrlOrObjectUrl) { /* ... (implementation unchanged) ... */ }
// --- Global Event Listeners ---
window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => { /* ... (unchanged) ... */ });

console.log(`SCRIPT EXECUTION FINISHED - SnugOS (main.js - Version ${Constants.APP_VERSION})`);
