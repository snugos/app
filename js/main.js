// js/main.js - Main Application Logic Orchestrator

import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import { showNotification as utilShowNotification, createContextMenu, showCustomModal } from './utils.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenPianoRoll,
    handleTimelineLaneDrop, handleOpenYouTubeImporter
} from './eventHandlers.js';
import {
    initializeStateModule, getTracksState, getTrackByIdState, getOpenWindowsState,
    getWindowByIdState, addTrackToStateInternal, removeTrackFromStateInternal,
    setHighestZState, getHighestZState, incrementHighestZState,
    addWindowToStoreState, removeWindowFromStoreState,
    getArmedTrackIdState, setArmedTrackIdState, getSoloedTrackIdState, setSoloedTrackIdState,
    getMasterEffectsState, addMasterEffectToState, removeMasterEffectFromState,
    updateMasterEffectParamInState, reorderMasterEffectInState,
    getMasterGainValueState, setMasterGainValueState,
    captureStateForUndoInternal, undoLastActionInternal, redoLastActionInternal,
    gatherProjectDataInternal, reconstructDAWInternal,
    getIsReconstructingDAWState, setIsReconstructingDAWState,
    saveProjectInternal, loadProjectInternal, handleProjectFileLoadInternal, exportToWavInternal,
    getLoadedZipFilesState, setLoadedZipFilesState, setSoundLibraryFileTreesState, getSoundLibraryFileTreesState,
    setCurrentLibraryNameState, getCurrentLibraryNameState, setCurrentSoundBrowserPathState,
    getPreviewPlayerState, setPreviewPlayerState,
    setSelectedTimelineClipInfoState,
    setPlaybackModeState, getPlaybackModeState,
    setIsRecordingState, isTrackRecordingState, setRecordingTrackIdState, getRecordingTrackIdState, setRecordingStartTimeState,
    getCurrentUserThemePreferenceState, setCurrentUserThemePreferenceState
} from './state.js';

// --- Start of Corrected Code: Import from new audio modules ---
import {
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters,
    rebuildMasterEffectChain, addMasterEffectToAudio, removeMasterEffectFromAudio,
    updateMasterEffectParamInAudio, reorderMasterEffectInAudio, setActualMasterVolume,
    getMasterBusInputNode
} from './audio.js';
import { initializePlayback, playSlicePreview, playDrumSamplerPadPreview } from './audio/playback.js';
import { initializeRecording, startAudioRecording, stopAudioRecording } from './audio/recording.js';
import { 
    initializeSampleManager, loadSampleFile, loadDrumSamplerPadFile, loadSoundFromBrowserToTarget,
    getAudioBlobFromSoundBrowserItem, autoSliceSample, fetchSoundLibrary
} from './audio/sampleManager.js';
// --- End of Corrected Code ---

import { storeAudio as dbStoreAudio, getAudio as dbGetAudio, deleteAudio as dbDeleteAudio } from './db.js';
import {
    initializeUIModule, openTrackInspectorWindow, openMixerWindow, openTrackEffectsRackWindow,
    openMasterEffectsRackWindow, openTimelineWindow, openSoundBrowserWindow, openPianoRollWindow,
    openYouTubeImporterWindow, updateMixerWindow, renderEffectsList, renderEffectControls,
    renderTimeline, updatePlayheadPosition, updatePianoRollPlayhead, renderSoundBrowserDirectory,
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI,
    renderDrumSamplerPads, updateDrumPadControlsUI, createKnob
} from './ui.js';
import { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions } from './effectsRegistry.js';

let appServices = {};

// ... (keep applyUserTheme, handleMasterEffectsUIUpdate, handleTrackUIUpdate functions)

async function initializeSnugOS() {
    
    function drawLoop() {
        if (typeof Tone !== 'undefined') {
            const transportTime = Tone.Transport.seconds;
            updatePlayheadPosition(transportTime);
            updatePianoRollPlayhead(transportTime);
            updateMeters(document.getElementById('masterMeterBarGlobalTop'), null, getTracksState());
        }
        requestAnimationFrame(drawLoop);
    }
    
    appServices = {
        // Core
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        showNotification: utilShowNotification, createContextMenu, updateTrackUI: handleTrackUIUpdate,
        showCustomModal, applyUserThemePreference: applyUserTheme, updateMasterEffectsUI: handleMasterEffectsUIUpdate,

        // State Access & Actions
        getTracks: getTracksState, getTrackById: getTrackByIdState, addTrack: addTrackToStateInternal,
        removeTrack: removeTrackFromStateInternal, getOpenWindows: getOpenWindowsState, getWindowById: getWindowByIdState,
        addWindowToStore: addWindowToStoreState, removeWindowFromStore: removeWindowFromStoreState,
        getHighestZ: getHighestZState, setHighestZ: setHighestZState, incrementHighestZ: incrementHighestZState,
        getArmedTrackId: getArmedTrackIdState, setArmedTrackId: setArmedTrackIdState,
        getSoloedTrackId: getSoloedTrackIdState, setSoloedTrackId: setSoloedTrackIdState,
        getMasterEffects: getMasterEffectsState, addMasterEffect: addMasterEffectToState,
        removeMasterEffect: removeMasterEffectFromState, updateMasterEffectParam: updateMasterEffectParamInState,
        reorderMasterEffect: reorderMasterEffectInState, getMasterGainValue: getMasterGainValueState,
        setMasterGainValue: setMasterGainValueState, getPlaybackMode: getPlaybackModeState,
        setPlaybackMode: setPlaybackModeState, setIsRecording: setIsRecordingState,
        isTrackRecording: isTrackRecordingState, setRecordingTrackId: setRecordingTrackIdState,
        getRecordingTrackId: getRecordingTrackIdState, setRecordingStartTime: setRecordingStartTimeState,
        setCurrentUserThemePreference: setCurrentUserThemePreferenceState,

        // Project, Undo/Redo, I/O
        getIsReconstructingDAW: getIsReconstructingDAWState, setIsReconstructingDAW: setIsReconstructingDAWState,
        captureStateForUndo: captureStateForUndoInternal, undoLastAction: undoLastActionInternal,
        redoLastAction: redoLastActionInternal, gatherProjectData: gatherProjectDataInternal,
        reconstructDAW: reconstructDAWInternal, saveProject: saveProjectInternal, loadProject: loadProjectInternal,
        handleProjectFileLoad: handleProjectFileLoadInternal, exportToWav: exportToWavInternal,

        // --- Start of Corrected Code: Updated Audio Engine services ---
        initAudioContextAndMasterMeter, getMasterBusInputNode, updateMeters, rebuildMasterEffectChain,
        addMasterEffectToAudio, removeMasterEffectFromAudio, updateMasterEffectParamInAudio,
        reorderMasterEffectInAudio, setActualMasterVolume, startAudioRecording, stopAudioRecording,
        // --- End of Corrected Code ---

        // Sample & Library Management
        fetchSoundLibrary, getLoadedZipFiles: getLoadedZipFilesState, setLoadedZipFiles: setLoadedZipFilesState,
        getSoundLibraryFileTrees: getSoundLibraryFileTreesState, setSoundLibraryFileTrees: setSoundLibraryFileTreesState,
        setCurrentLibraryName: setCurrentLibraryNameState, getCurrentLibraryName: getCurrentLibraryNameState,
        setCurrentSoundBrowserPath: setCurrentSoundBrowserPathState, getPreviewPlayer: getPreviewPlayerState,
        setPreviewPlayer: setPreviewPlayerState, loadSampleFile, loadDrumSamplerPadFile,
        loadSoundFromBrowserToTarget, getAudioBlobFromSoundBrowserItem, autoSliceSample,
        playSlicePreview, playDrumSamplerPadPreview, dbStoreAudio, dbGetAudio, dbDeleteAudio,

        // UI Modules
        openTrackInspectorWindow, openMixerWindow, updateMixerWindow, openTrackEffectsRackWindow,
        openMasterEffectsRackWindow, renderEffectsList, renderEffectControls, createKnob,
        openTimelineWindow, renderTimeline, updatePlayheadPosition, updatePianoRollPlayhead,
        openSoundBrowserWindow, renderSoundBrowserDirectory, openPianoRollWindow, openYouTubeImporterWindow,
        drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI,
        renderDrumSamplerPads, updateDrumPadControlsUI, setSelectedTimelineClipInfo: setSelectedTimelineClipInfoState,

        // Event Handlers
        handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
        handleOpenEffectsRack, handleOpenSequencer: handleOpenPianoRoll,
        handleTimelineLaneDrop, handleOpenYouTubeImporter,

        // Registries
        effectsRegistryAccess: { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions },
        uiElementsCache: {}
    };

    // --- Start of Corrected Code: Initialize new modules ---
    initializeStateModule(appServices);
    initializeAudioModule(appServices);
    initializePlayback(appServices);
    initializeRecording(appServices);
    initializeSampleManager(appServices);
    initializeUIModule(appServices);
    initializeEventHandlersModule(appServices);
    // --- End of Corrected Code ---

    initializePrimaryEventListeners();
    attachGlobalControlEvents({});
    setupMIDI();
    
    const savedTheme = localStorage.getItem('snugos-theme');
    if (savedTheme) {
        setCurrentUserThemePreferenceState(savedTheme);
    } else {
        applyUserTheme();
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyUserTheme);
    
    console.log("SnugOS Initialized Successfully.");
    
    drawLoop();
}

document.addEventListener('DOMContentLoaded', initializeSnugOS);
