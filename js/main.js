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
    updatePianoRollPlayhead,
    renderSoundBrowserDirectory,
    drawWaveform,
    drawInstrumentWaveform,
    renderSamplePads,
    updateSliceEditorUI,
    renderDrumSamplerPads,
    updateDrumPadControlsUI,
    createKnob
} from './ui.js';
import { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions } from './effectsRegistry.js';

let appServices = {};

function applyUserTheme() {
    const preference = getCurrentUserThemePreferenceState();
    const body = document.body;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (preference === 'light' || (preference === 'system' && !prefersDark)) {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
    } else {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
    }
}

function handleMasterEffectsUIUpdate() {
    const rackWindow = getWindowByIdState('masterEffectsRack');
    if (rackWindow && rackWindow.element && !rackWindow.isMinimized) {
        rackWindow.refresh();
    }
}

function handleTrackUIUpdate(trackId, reason, detail) {
    const track = getTrackByIdState(trackId);
    if (!track) return;

    const soloedTrackId = getSoloedTrackIdState();
    const isEffectivelyMuted = track.isMuted || (soloedTrackId !== null && soloedTrackId !== track.id);

    const inspectorWindow = getWindowByIdState(`trackInspector-${trackId}`);
    if (inspectorWindow && inspectorWindow.element && !inspectorWindow.isMinimized) {
        if (reason === 'armChanged') {
            const armBtn = inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);
            if (armBtn) armBtn.classList.toggle('armed', getArmedTrackIdState() === track.id);
        }
        if (reason === 'soloChanged' || reason === 'muteChanged') {
            const muteBtn = inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
            if (muteBtn) {
                muteBtn.classList.toggle('muted', isEffectivelyMuted);
                muteBtn.textContent = track.isMuted ? 'Unmute' : 'Mute';
            }
            const soloBtn = inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
            if (soloBtn) {
                soloBtn.classList.toggle('soloed', track.isSoloed);
                soloBtn.textContent = track.isSoloed ? 'Unsolo' : 'Solo';
            }
        }
        if (reason === 'nameChanged') {
            const titleSpan = inspectorWindow.titleBar.querySelector('span');
            if (titleSpan) titleSpan.textContent = `Inspector: ${track.name}`;
            if (inspectorWindow.taskbarButton) inspectorWindow.taskbarButton.textContent = `Inspector: ${track.name}`;
        }
    }
    
    const mixerWindow = getWindowByIdState('mixer');
    if (mixerWindow && mixerWindow.element && !mixerWindow.isMinimized) {
        const trackDiv = mixerWindow.element.querySelector(`.mixer-track[data-track-id='${track.id}']`);
        if(trackDiv) {
            const muteBtn = trackDiv.querySelector(`#mixerMuteBtn-${track.id}`);
            if (muteBtn) muteBtn.classList.toggle('muted', isEffectivelyMuted);
            const soloBtn = trackDiv.querySelector(`#mixerSoloBtn-${track.id}`);
            if (soloBtn) soloBtn.classList.toggle('soloed', track.isSoloed);
            const trackNameDiv = trackDiv.querySelector('.track-name');
            if (trackNameDiv) trackNameDiv.textContent = track.name;
        }
    }

    if (reason === 'effectsChanged') {
        const rackWindow = getWindowByIdState(`effectsRack-${trackId}`);
        rackWindow?.refresh();
    }
    
    if (reason === 'nameChanged' || reason === 'clipsChanged') {
        renderTimeline();
    }
}

async function initializeSnugOS() {

    // --- Start of Corrected Code ---
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
    
    // Step 1: Define the appServices object completely.
    appServices = {
        // Core
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        showNotification: utilShowNotification,
        createContextMenu,
        updateTrackUI: handleTrackUIUpdate,
        showCustomModal,
        applyUserThemePreference: applyUserTheme,
        updateMasterEffectsUI: handleMasterEffectsUIUpdate,

        // State Access & Actions
        getTracks: getTracksState,
        getTrackById: getTrackByIdState,
        addTrack: addTrackToStateInternal,
        removeTrack: removeTrackFromStateInternal,
        getOpenWindows: getOpenWindowsState,
        getWindowById: getWindowByIdState,
        addWindowToStore: addWindowToStoreState,
        removeWindowFromStore: removeWindowFromStoreState,
        getHighestZ: getHighestZState,
        setHighestZ: setHighestZState,
        incrementHighestZ: incrementHighestZState,
        getArmedTrackId: getArmedTrackIdState,
        setArmedTrackId: setArmedTrackIdState,
        getSoloedTrackId: getSoloedTrackIdState,
        setSoloedTrackId: setSoloedTrackIdState,
        getMasterEffects: getMasterEffectsState,
        addMasterEffect: addMasterEffectToState,
        removeMasterEffect: removeMasterEffectFromState,
        updateMasterEffectParam: updateMasterEffectParamInState,
        reorderMasterEffect: reorderMasterEffectInState,
        getMasterGainValue: getMasterGainValueState,
        setMasterGainValue: setMasterGainValueState,
        getPlaybackMode: getPlaybackModeState,
        setPlaybackMode: setPlaybackModeState,
        setIsRecording: setIsRecordingState,
        isTrackRecording: isTrackRecordingState,
        setRecordingTrackId: setRecordingTrackIdState,
        getRecordingTrackId: getRecordingTrackIdState,
        setRecordingStartTime: setRecordingStartTimeState,
        setCurrentUserThemePreference: setCurrentUserThemePreferenceState,

        // Project, Undo/Redo, I/O
        getIsReconstructingDAW: getIsReconstructingDAWState,
        setIsReconstructingDAW: setIsReconstructingDAWState,
        captureStateForUndo: captureStateForUndoInternal,
        undoLastAction: undoLastActionInternal,
        redoLastAction: redoLastActionInternal,
        gatherProjectData: gatherProjectDataInternal,
        reconstructDAW: reconstructDAWInternal,
        saveProject: saveProjectInternal,
        loadProject: loadProjectInternal,
        handleProjectFileLoad: handleProjectFileLoadInternal,
        exportToWav: exportToWavInternal,

        // Audio Engine
        initAudioContextAndMasterMeter,
        updateMeters,
        rebuildMasterEffectChain,
        addMasterEffectToAudio,
        removeMasterEffectFromAudio,
        updateMasterEffectParamInAudio,
        reorderMasterEffectInAudio,
        setActualMasterVolume,
        startAudioRecording,
        stopAudioRecording,

        // Sample & Library Management
        fetchSoundLibrary,
        getLoadedZipFiles: getLoadedZipFilesState,
        setLoadedZipFiles: setLoadedZipFilesState,
        getSoundLibraryFileTrees: getSoundLibraryFileTreesState,
        setSoundLibraryFileTrees: setSoundLibraryFileTreesState,
        setCurrentLibraryName: setCurrentLibraryNameState,
        getCurrentLibraryName: getCurrentLibraryNameState,
        setCurrentSoundBrowserPath: setCurrentSoundBrowserPathState,
        getPreviewPlayer: getPreviewPlayerState,
        setPreviewPlayer: setPreviewPlayerState,
        loadSampleFile,
        loadDrumSamplerPadFile,
        loadSoundFromBrowserToTarget,
        getAudioBlobFromSoundBrowserItem,
        autoSliceSample,
        playSlicePreview,
        playDrumSamplerPadPreview,
        dbStoreAudio,
        dbGetAudio,
        dbDeleteAudio,

        // UI Modules
        openTrackInspectorWindow,
        openMixerWindow,
        updateMixerWindow,
        openTrackEffectsRackWindow,
        openMasterEffectsRackWindow,
        renderEffectsList,
        renderEffectControls,
        createKnob,
        openTimelineWindow,
        renderTimeline,
        updatePlayheadPosition,
        updatePianoRollPlayhead,
        openSoundBrowserWindow,
        renderSoundBrowserDirectory,
        openPianoRollWindow,
        openYouTubeImporterWindow,
        drawWaveform,
        drawInstrumentWaveform,
        renderSamplePads,
        updateSliceEditorUI,
        renderDrumSamplerPads,
        updateDrumPadControlsUI,
        setSelectedTimelineClipInfo: setSelectedTimelineClipInfoState,

        // Event Handlers
        handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
        handleOpenEffectsRack, handleOpenSequencer: handleOpenPianoRoll,
        handleTimelineLaneDrop, handleOpenYouTubeImporter,

        // Registries
        effectsRegistryAccess: { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions },
        uiElementsCache: {}
    };

    // Step 2: Now that appServices is complete, initialize all modules with it.
    initializeStateModule(appServices);
    initializeAudioModule(appServices);
    initializeUIModule(appServices);
    initializeEventHandlersModule(appServices);
    // --- End of Corrected Code ---

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
    
    // Start the animation loop
    drawLoop();
}

document.addEventListener('DOMContentLoaded', initializeSnugOS);
