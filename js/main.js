// js/main.js - Main Application Logic Orchestrator

import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import { showNotification as utilShowNotification, createContextMenu } from './utils.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    selectMIDIInput as eventSelectMIDIInput,
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenPianoRoll,
    handleTimelineLaneDrop, handleOpenYouTubeImporter
} from './eventHandlers.js';
import {
    initializeStateModule, getTracksState, getTrackByIdState, getOpenWindowsState,
    getWindowByIdState, addTrackToStateInternal, removeTrackFromStateInternal,
    setHighestZState, getHighestZState, incrementHighestZState,
    addWindowToStoreState, removeWindowFromStoreState,
    getArmedTrackIdState, getMasterEffectsState, removeMasterEffectFromState,
    addMasterEffectToState, updateMasterEffectParamInState, reorderMasterEffectInState,
    getMasterGainValueState, setMasterGainValueState,
    captureStateForUndoInternal, undoLastActionInternal, redoLastActionInternal,
    gatherProjectDataInternal, reconstructDAWInternal,
    getIsReconstructingDAWState,
    saveProjectInternal, loadProjectInternal, handleProjectFileLoadInternal, exportToWavInternal,
    getLoadedZipFilesState, setLoadedZipFilesState, setSoundLibraryFileTreesState, getSoundLibraryFileTreesState,
    setCurrentLibraryNameState, getCurrentLibraryNameState, setCurrentSoundBrowserPathState,
    getPreviewPlayerState, setPreviewPlayerState,
    setSelectedTimelineClipInfoState,
    setPlaybackModeState, getPlaybackModeState
} from './state.js';
import {
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary,
    rebuildMasterEffectChain, addMasterEffectToAudio, removeMasterEffectFromAudio,
    updateMasterEffectParamInAudio, reorderMasterEffectInAudio,
    loadSampleFile, loadDrumSamplerPadFile, loadSoundFromBrowserToTarget,
    getAudioBlobFromSoundBrowserItem,
    autoSliceSample, setActualMasterVolume,
    playSlicePreview, playDrumSamplerPadPreview
} from './audio.js';
import {
    storeAudio as dbStoreAudio,
    getAudio as dbGetAudio,
    deleteAudio as dbDeleteAudio
} from './db.js';
import {
    initializeUIModule, openTrackInspectorWindow, openMixerWindow, updateMixerWindow,
    openTrackEffectsRackWindow, openMasterEffectsRackWindow, renderEffectsList, renderEffectControls,

    createKnob, renderTimeline, updatePlayheadPosition,
    openSoundBrowserWindow, updateSoundBrowserDisplayForLibrary, renderSoundBrowserDirectory,
    openPianoRollWindow,
    openYouTubeImporterWindow,
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, renderDrumSamplerPads, updateDrumPadControlsUI,
} from './ui.js';
import { AVAILABLE_EFFECTS, getEffectDefaultParams } from './effectsRegistry.js';

// --- App Services Object (Dependency Injection) ---
// This object passes functions between modules to avoid circular dependencies.
let appServices = {};

// --- Core UI Update Handler ---

/**
 * Handles all UI updates for a given track based on a reason.
 * THIS FUNCTION CONTAINS THE CRITICAL FIX for the mute/solo UI.
 * @param {number} trackId - The ID of the track to update.
 * @param {string} reason - A string indicating why the update is needed (e.g., 'soloChanged', 'effectsChanged').
 * @param {*} [detail] - Optional additional data for the update.
 */
function handleTrackUIUpdate(trackId, reason, detail) {
    const track = getTrackByIdState(trackId);
    if (!track) return;

    // Get the global solo state to determine the visual state of buttons
    const soloedTrackId = getArmedTrackIdState();
    const isEffectivelyMuted = track.isMuted || (soloedTrackId !== null && soloedTrackId !== track.id);

    // Update the inspector window's buttons
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
    
    // Update the mixer window
    const mixerWindow = getWindowByIdState('mixer');
    if (mixerWindow && mixerWindow.element && !mixerWindow.isMinimized) {
        const muteBtn = mixerWindow.element.querySelector(`#mixerMuteBtn-${track.id}`);
        if (muteBtn) muteBtn.classList.toggle('muted', isEffectivelyMuted);
        const soloBtn = mixerWindow.element.querySelector(`#mixerSoloBtn-${track.id}`);
        if (soloBtn) soloBtn.classList.toggle('soloed', track.isSoloed);
        const trackNameDiv = mixerWindow.element.querySelector(`.mixer-track[data-track-id='${track.id}'] .track-name`);
        if (trackNameDiv) trackNameDiv.textContent = track.name;
    }

    // Update effects rack if open
    if (reason === 'effectsChanged') {
        const rackWindow = getWindowByIdState(`effectsRack-${trackId}`);
        if (rackWindow && rackWindow.element && !rackWindow.isMinimized) {
            const listDiv = rackWindow.element.querySelector(`#effectsList-${trackId}`);
            const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-${trackId}`);
            renderEffectsList(track, 'track', listDiv, controlsContainer);
        }
    }
    
    // Update Timeline
    if (reason === 'nameChanged' || reason === 'clipsChanged') {
        renderTimeline();
    }
}


// --- Main Application Initialization ---
async function initializeSnugOS() {
    
    // Populate the appServices object
    appServices = {
        // Core
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        showNotification: utilShowNotification,
        createContextMenu,
        updateTrackUI: handleTrackUIUpdate,

        // State Access
        getTracks: getTracksState,
        getTrackById: getTrackByIdState,
        getOpenWindows: getOpenWindowsState,
        getWindowById: getWindowByIdState,
        getHighestZ: getHighestZState,
        setHighestZ: setHighestZState,
        incrementHighestZ: incrementHighestZState,
        addWindowToStore: addWindowToStoreState,
        removeWindowFromStore: removeWindowFromStoreState,
        getArmedTrackId: getArmedTrackIdState,
        getMasterEffects: getMasterEffectsState,
        getMasterGainValue: getMasterGainValueState,
        setMasterGainValue: setMasterGainValueState,
        getIsReconstructingDAW: getIsReconstructingDAWState,
        getLoadedZipFiles: getLoadedZipFilesState,
        setLoadedZipFiles: setLoadedZipFilesState,
        getSoundLibraryFileTrees: getSoundLibraryFileTreesState,
        setSoundLibraryFileTrees: setSoundLibraryFileTreesState,
        setCurrentLibraryName: setCurrentLibraryNameState,
        getCurrentLibraryName: getCurrentLibraryNameState,
        setCurrentSoundBrowserPath: setCurrentSoundBrowserPathState,
        getPreviewPlayer: getPreviewPlayerState,
        setPreviewPlayer: setPreviewPlayerState,
        setSelectedTimelineClipInfo: setSelectedTimelineClipInfoState,
        setPlaybackMode: setPlaybackModeState,
        getPlaybackMode: getPlaybackModeState,

        // State Actions
        addTrack: addTrackToStateInternal,
        removeTrack: removeTrackFromStateInternal,
        removeMasterEffect: removeMasterEffectFromState,
        addMasterEffect: addMasterEffectToState,
        updateMasterEffectParam: updateMasterEffectParamInState,
        reorderMasterEffect: reorderMasterEffectInState,
        
        // Undo/Redo
        captureStateForUndo: captureStateForUndoInternal,
        undoLastAction: undoLastActionInternal,
        redoLastAction: redoLastActionInternal,

        // Project I/O
        gatherProjectData: gatherProjectDataInternal,
        reconstructDAW: reconstructDAWInternal,
        saveProject: saveProjectInternal,
        loadProject: loadProjectInternal,
        handleProjectFileLoad: handleProjectFileLoadInternal,
        exportToWav: exportToWavInternal,

        // Audio
        initAudioContextAndMasterMeter,
        updateMeters,
        fetchSoundLibrary,
        rebuildMasterEffectChain,
        addMasterEffectToAudio,
        removeMasterEffectFromAudio,
        updateMasterEffectParamInAudio,
        reorderMasterEffectInAudio,
        loadSampleFile,
        loadDrumSamplerPadFile,
        loadSoundFromBrowserToTarget,
        getAudioBlobFromSoundBrowserItem,
        autoSliceSample,
        setActualMasterVolume,
        playSlicePreview,
        playDrumSamplerPadPreview,

        // DB
        dbStoreAudio,
        dbGetAudio,
        dbDeleteAudio,

        // UI
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

        // Event Handlers (for context menus, etc.)
        handleTrackMute,
        handleTrackSolo,
        handleTrackArm,
        handleRemoveTrack,
        handleOpenEffectsRack,
        handleOpenSequencer: handleOpenPianoRoll,
        handleTimelineLaneDrop,
        handleOpenYouTubeImporter,

        // Registries
        effectsRegistryAccess: { AVAILABLE_EFFECTS, getEffectDefaultParams },

        // UI Elements Cache
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
    // ... cache all other frequently accessed elements ...
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
    attachGlobalControlEvents(a); // Pass the cache to the event handler setup
    setupMIDI();
    
    console.log("SnugOS Initialized Successfully.");
}

// --- Start the Application ---
document.addEventListener('DOMContentLoaded', initializeSnugOS);
