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
    getMasterEffectsState, removeMasterEffectFromState,
    addMasterEffectToState, updateMasterEffectParamInState, reorderMasterEffectInState,
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
    setIsRecordingState, isTrackRecordingState, setRecordingTrackIdState, getRecordingTrackIdState, setRecordingStartTimeState
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
    // Window openers
    openTrackInspectorWindow,
    openMixerWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    openTimelineWindow,
    openSoundBrowserWindow,
    openPianoRollWindow,
    openYouTubeImporterWindow,
    // UI updaters and renderers
    updateMixerWindow,
    renderEffectsList,
    renderEffectControls,
    renderTimeline,
    updatePlayheadPosition,
    updateSoundBrowserDisplayForLibrary,
    renderSoundBrowserDirectory,
    drawWaveform,
    drawInstrumentWaveform,
    renderSamplePads,
    updateSliceEditorUI,
    renderDrumSamplerPads,
    updateDrumPadControlsUI,
    // Component creators
    createKnob
} from './ui.js';
import { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions } from './effectsRegistry.js';

// --- App Services Object (Dependency Injection) ---
let appServices = {};

// --- Core UI Update Handler ---
function handleTrackUIUpdate(trackId, reason, detail) {
    const track = getTrackByIdState(trackId);
    if (!track) return;

    // --- Start of Corrected Code (Bug Fix) ---
    // This now correctly uses getSoloedTrackIdState, not getArmedTrackIdState
    const soloedTrackId = getSoloedTrackIdState();
    // --- End of Corrected Code (Bug Fix) ---

    const isEffectivelyMuted = track.isMuted || (soloedTrackId !== null && soloedTrackId !== track.id);

    const inspectorWindow = getWindowByIdState(`trackInspector-${trackId}`);
    if (inspectorWindow && inspectorWindow.element && !inspectorWindow.isMinimized) {
        if (reason === 'armChanged') {
            // --- Start of Corrected Code (Debug Log) ---
            console.log(`[handleTrackUIUpdate] Received 'armChanged' for track ${trackId}.`);
            // --- End of Corrected Code (Debug Log) ---
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
        if (rackWindow && rackWindow.element && !rackWindow.isMinimized) {
            const listDiv = rackWindow.element.querySelector(`#effectsList-${trackId}`);
            const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-${trackId}`);
            renderEffectsList(track, 'track', listDiv, controlsContainer);
        }
    }
    
    if (reason === 'nameChanged' || reason === 'clipsChanged') {
        renderTimeline();
    }
}


// --- Main Application Initialization ---
async function initializeSnugOS() {
    
    appServices = {
        // Core
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        showNotification: utilShowNotification,
        createContextMenu,
        updateTrackUI: handleTrackUIUpdate,
        showCustomModal,

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
        openSoundBrowserWindow,
        updateSoundBrowserDisplayForLibrary,
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
        effectsRegistryAccess: { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions },
        uiElementsCache: {}
    };

    // --- Module Initializations ---
    initializeStateModule(appServices);
    initializeAudioModule(appServices);
    initializeUIModule(appServices);
    initializeEventHandlersModule(appServices);

    // Cache DOM elements
    const a = appServices.uiElementsCache;
    a.desktop = document.getElementById('desktop');
    a.taskbar = document.getElementById('taskbar');
    a.startButton = document.getElementById('startButton');
    a.startMenu = document.getElementById('startMenu');
    a.taskbarButtonsContainer = document.getElementById('taskbarButtons');
    a.loadProjectInput = document.getElementById('loadProjectInput');
    a.menuAddSynthTrack = document.getElementById('menuAddSynthTrack');
    a.menuAddSamplerTrack = document.getElementById('menuAddSamplerTrack');
    a.menuAddDrumSamplerTrack = document.getElementById('menuAddDrumSamplerTrack');
    a.menuAddInstrumentSamplerTrack = document.getElementById('menuAddInstrumentSamplerTrack');
    a.menuAddAudioTrack = document.getElementById('menuAddAudioTrack');
    a.menuOpenSoundBrowser = document.getElementById('menuOpenSoundBrowser');
    a.menuOpenTimeline = document.getElementById('menuOpenTimeline');
    a.menuOpenPianoRoll = document.getElementById('menuOpenPianoRoll');
    a.menuOpenMixer = document.getElementById('menuOpenMixer');
    a.menuOpenMasterEffects = document.getElementById('menuOpenMasterEffects');
    a.menuUndo = document.getElementById('menuUndo');
    a.menuRedo = document.getElementById('menuRedo');
    a.menuSaveProject = document.getElementById('menuSaveProject');
    a.menuLoadProject = document.getElementById('menuLoadProject');
    a.menuExportWav = document.getElementById('menuExportWav');
    a.menuToggleFullScreen = document.getElementById('menuToggleFullScreen');

    // Attach all event listeners
    initializePrimaryEventListeners();
    attachGlobalControlEvents(a);
    setupMIDI();
    
    console.log("SnugOS Initialized Successfully.");
}

document.addEventListener('DOMContentLoaded', initializeSnugOS);
