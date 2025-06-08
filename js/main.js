// js/main.js - Main Application Logic Orchestrator

import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import { showNotification as utilShowNotification, createContextMenu, showCustomModal } from './utils.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    selectMIDIInput,
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
import {
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary,
    rebuildMasterEffectChain, addMasterEffectToAudio, removeMasterEffectFromAudio,
    updateMasterEffectParamInAudio, reorderMasterEffectInAudio,
    loadSampleFile, loadDrumSamplerPadFile, loadSoundFromBrowserToTarget,
    getAudioBlobFromSoundBrowserItem,
    autoSliceSample, setActualMasterVolume,
    playSlicePreview, playDrumSamplerPadPreview,
    startAudioRecording, stopAudioRecording
} from './audio.js';
import {
    storeAudio as dbStoreAudio,
    getAudio as dbGetAudio,
    deleteAudio as dbDeleteAudio
} from './db.js';
import {
    initializeUIModule,
    openTrackInspectorWindow,
    openMixerWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    openTimelineWindow,
    openSoundBrowserWindow,
    openPianoRollWindow,
    openYouTubeImporterWindow,
    updateMixerWindow,
    renderEffectsList,
    renderEffectControls,
    renderTimeline,
    updatePlayheadPosition,
    updatePianoRollPlayhead, // --- Start of New Code ---
    renderSoundBrowserDirectory,
    drawWaveform,
    drawInstrumentWaveform,
    renderSamplePads,
    updateSliceEditorUI,
    renderDrumSamplerPads,
    updateDrumPadControlsUI,
    createKnob
} from './ui.js';
// --- End of New Code ---
import { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions } from './effectsRegistry.js';

let appServices = {};

function applyUserTheme() {
    // ... (no changes in this function)
}

function handleMasterEffectsUIUpdate() {
    // ... (no changes in this function)
}

function handleTrackUIUpdate(trackId, reason, detail) {
    // ... (no changes in this function)
}


async function initializeSnugOS() {
    
    appServices = {
        // ... (no changes in this large object)
    };
    
    // --- Start of New Code ---
    // Main animation loop
    function drawLoop() {
        if (typeof Tone !== 'undefined') {
            const transportTime = Tone.Transport.seconds;
            updatePlayheadPosition(transportTime);
            updatePianoRollPlayhead(transportTime);
            
            const globalMasterMeterBar = document.getElementById('masterMeterBarGlobalTop');
            updateMeters(globalMasterMeterBar, null, getTracksState());
        }
        requestAnimationFrame(drawLoop);
    }
    // --- End of New Code ---


    initializeStateModule(appServices);
    initializeAudioModule(appServices);
    initializeUIModule(appServices);
    initializeEventHandlersModule(appServices);

    const a = appServices.uiElementsCache;
    // ... cache elements ...

    initializePrimaryEventListeners();
    attachGlobalControlEvents(a);
    setupMIDI();
    
    // Set initial theme
    const savedTheme = localStorage.getItem('snugos-theme');
    if (savedTheme) {
        setCurrentUserThemePreferenceState(savedTheme);
    } else {
        applyUserTheme();
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyUserTheme);
    
    console.log("SnugOS Initialized Successfully.");
    
    // --- Start of New Code ---
    // Start the animation loop
    drawLoop();
    // --- End of New Code ---
}

document.addEventListener('DOMContentLoaded', initializeSnugOS);
