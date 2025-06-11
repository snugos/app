// js/state.js - Main State Aggregator Module

// Import all functions from the new state modules
import { initializeTrackState, getTracks, getTrackById, getSoloedTrackId, setSoloedTrackId, getArmedTrackId, setArmedTrackId, isRecording, setIsRecording, getRecordingTrackId, setRecordingTrackId, getRecordingStartTime, setRecordingStartTime, addTrack, removeTrack, setTracks, setTrackIdCounter } from './state/trackState.js';
import { initializeWindowState, getOpenWindows, getWindowById, addWindowToStore, removeWindowFromStore, getHighestZ, setHighestZ, incrementHighestZ } from './state/windowState.js';
import { initializeMasterState, getMasterEffects, setMasterEffects, addMasterEffect, removeMasterEffect, updateMasterEffectParam, reorderMasterEffect, getMasterGainValue, setMasterGainValue } from './state/masterState.js';
import { initializeProjectState, getIsReconstructingDAW, setIsReconstructingDAW, getUndoStack, getRedoStack, getClipboardData, setClipboardData, captureStateForUndo, undoLastAction, redoLastAction, gatherProjectData, reconstructDAW, saveProject, loadProject, handleProjectFileLoad, exportToWav } from './state/projectState.js';
import { initializeSoundLibraryState, getLoadedZipFiles, setLoadedZipFiles, getSoundLibraryFileTrees, setSoundLibraryFileTrees, getCurrentLibraryName, setCurrentLibraryName, getCurrentSoundBrowserPath, setCurrentSoundBrowserPath, getPreviewPlayer, setPreviewPlayer, addFileToSoundLibrary } from './state/soundLibraryState.js';
import { initializeAppState, getMidiAccess, setMidiAccess, getActiveMIDIInput, setActiveMIDIInput, getPlaybackMode, setPlaybackMode, getCurrentUserThemePreference, setCurrentUserThemePreference, getSelectedTimelineClipInfo, setSelectedTimelineClipInfo, getMidiRecordModeState, setMidiRecordModeState } from './state/appState.js';

/**
 * Initializes all state sub-modules by passing them the appServices object.
 * This is the single entry point for state initialization.
 * @param {object} appServices 
 */
export function initializeStateModule(appServices) {
    initializeTrackState(appServices);
    initializeWindowState(appServices);
    initializeMasterState(appServices);
    initializeProjectState(appServices);
    initializeSoundLibraryState(appServices);
    initializeAppState(appServices);
}

// Export all functions again for the rest of the application to use.
// This preserves the original API of the state module.
export {
    // trackState exports
    getTracks as getTracksState,
    getTrackById as getTrackByIdState,
    getSoloedTrackId as getSoloedTrackIdState,
    setSoloedTrackId as setSoloedTrackIdState,
    getArmedTrackId as getArmedTrackIdState,
    setArmedTrackId as setArmedTrackIdState,
    isRecording as isTrackRecordingState,
    setIsRecording as setIsRecordingState,
    getRecordingTrackId as getRecordingTrackIdState,
    setRecordingTrackId as setRecordingTrackIdState,
    getRecordingStartTime as getRecordingStartTimeState,
    setRecordingStartTime as setRecordingStartTimeState,
    addTrack as addTrackToStateInternal,
    removeTrack as removeTrackFromStateInternal,
    setTracks as setTracksState,
    setTrackIdCounter as setTrackIdCounterState,

    // windowState exports
    getOpenWindows as getOpenWindowsState,
    getWindowById as getWindowByIdState,
    addWindowToStore as addWindowToStoreState,
    removeWindowFromStore as removeWindowFromStoreState,
    getHighestZ as getHighestZState,
    setHighestZ as setHighestZState,
    incrementHighestZ as incrementHighestZState,

    // masterState exports
    getMasterEffects as getMasterEffectsState,
    setMasterEffects as setMasterEffectsState,
    addMasterEffect as addMasterEffectToState,
    removeMasterEffect as removeMasterEffectFromState,
    updateMasterEffectParam as updateMasterEffectParamInState,
    reorderMasterEffect as reorderMasterEffectInState,
    getMasterGainValue as getMasterGainValueState,
    setMasterGainValue as setMasterGainValueState,

    // projectState exports
    getIsReconstructingDAW as getIsReconstructingDAWState,
    setIsReconstructingDAW as setIsReconstructingDAWState,
    getUndoStack as getUndoStackState,
    getRedoStack as getRedoStackState,
    getClipboardData as getClipboardDataState,
    setClipboardData as setClipboardDataState,
    captureStateForUndo as captureStateForUndoInternal,
    undoLastAction as undoLastActionInternal,
    redoLastAction as redoLastActionInternal,
    gatherProjectData as gatherProjectDataInternal,
    reconstructDAW as reconstructDAWInternal,
    saveProject as saveProjectInternal,
    loadProject as loadProjectInternal,
    handleProjectFileLoad as handleProjectFileLoadInternal,
    exportToWav as exportToWavInternal,

    // soundLibraryState exports
    getLoadedZipFiles as getLoadedZipFilesState,
    setLoadedZipFiles as setLoadedZipFilesState,
    getSoundLibraryFileTrees as getSoundLibraryFileTreesState,
    setSoundLibraryFileTrees as setSoundLibraryFileTreesState,
    getCurrentLibraryName as getCurrentLibraryNameState,
    setCurrentLibraryName as setCurrentLibraryNameState,
    getCurrentSoundBrowserPath as getCurrentSoundBrowserPathState,
    setCurrentSoundBrowserPath as setCurrentSoundBrowserPathState,
    getPreviewPlayer as getPreviewPlayerState,
    setPreviewPlayer as setPreviewPlayerState,
    addFileToSoundLibrary as addFileToSoundLibraryInternal,

    // appState exports
    getMidiAccess as getMidiAccessState,
    setMidiAccess as setMidiAccessState,
    getActiveMIDIInput as getActiveMIDIInputState,
    setActiveMIDIInput as setActiveMIDIInputState,
    getPlaybackMode as getPlaybackModeState,
    setPlaybackMode as setPlaybackModeState,
    getCurrentUserThemePreference as getCurrentUserThemePreferenceState,
    setCurrentUserThemePreference as setCurrentUserThemePreferenceState,
    getSelectedTimelineClipInfo as getSelectedTimelineClipInfoState,
    setSelectedTimelineClipInfo as setSelectedTimelineClipInfoState,
    getMidiRecordModeState,
    setMidiRecordModeState
};
