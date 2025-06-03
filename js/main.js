// js/main.js - Main Application Logic Orchestrator (REVISED with new UI modules)

// --- Module Imports ---
import { SnugWindow } from './SnugWindow.js'; // Verified: Using the modified SnugWindow without interact.js
import * as Constants from './constants.js';
import {
    showNotification as utilShowNotification,
    createContextMenu,
    createDropZoneHTML,
    setupGenericDropZoneListeners,
    showConfirmationDialog,
    // MODIFICATION: Added snapTimeToGrid, assuming it might be needed globally or by UI modules
    snapTimeToGrid
} from './utils.js';
import {
    initializeEventHandlersModule,
    initializePrimaryEventListeners,
    setupMIDI,
    attachGlobalControlEvents,
    selectMIDIInput as eventSelectMIDIInput,
    // Explicit event handlers that might be directly called by appServices if needed elsewhere,
    // though usually UI calls these which then call state/audio.
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer,
    handleTimelineLaneDrop // Make sure this is exported from eventHandlers.js
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
    getSelectedTimelineClipInfoState, getCurrentThemeState,
    // State Setters / Core Actions
    addWindowToStoreState, removeWindowFromStoreState, setHighestZState, incrementHighestZState,
    setMasterEffectsState, setMasterGainValueState,
    setMidiAccessState, setActiveMIDIInputState,
    setLoadedZipFilesState,
    setSoundLibraryFileTreesState,
    setCurrentLibraryNameState, setCurrentSoundFileTreeState, setCurrentSoundBrowserPathState, setPreviewPlayerState,
    setClipboardDataState, setArmedTrackIdState, setSoloedTrackIdState, setIsRecordingState,
    setRecordingTrackIdState, setRecordingStartTimeState, setActiveSequencerTrackIdState,
    setPlaybackModeState, setSelectedTimelineClipInfoState, setCurrentThemeState,
    addMasterEffectToState, removeMasterEffectFromState,
    updateMasterEffectParamInState, reorderMasterEffectInState,
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
    startAudioRecording, stopAudioRecording,
    // Explicitly import audio functions that might be assigned to appServices
    togglePlayback as audioTogglePlayback,
    stopPlayback as audioStopPlayback,
    setMasterVolume as audioSetMasterVolume,
    toggleRecording as audioToggleRecording
} from './audio.js';
import {
    storeAudio as dbStoreAudio,
    getAudio as dbGetAudio,
    deleteAudio as dbDeleteAudio
} from './db.js';

// MODIFICATION: Corrected UI module import based on newly provided files
import {
    initializeUIModule,
    // Functions directly exposed by browserCoreUI.js
    openSoundBrowserWindow,
    updateSoundBrowserDisplayForLibrary, // This is exported by browserCoreUI
    showAddTrackModal,
    showAddEffectModal,
    // Functions re-exported by browserCoreUI.js from its submodules
    openTrackInspectorWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    openArrangementWindow, // Likely from arrangementMixingUI, re-exported
    openSequencerWindow,   // Likely from arrangementMixingUI, re-exported
    openMixerWindow,       // This was in the old ui.js, now check browserCoreUI or its subs
    updateMixerWindow,     // This was in the old ui.js
    // Functions that might be new or relocated
    updateTheme, // Assuming this will be handled by browserCoreUI or a sub-module
    getTheme,    // Assuming this will be handled by browserCoreUI or a sub-module
    closeAllTrackWindows, // Assuming this will be handled
    updateTrackUI, // Critical for UI updates
    highlightPlayingStep, // From old ui.js, ensure new UI structure has it
    drawWaveform, // From old ui.js
    drawInstrumentWaveform, // From old ui.js
    renderSamplePads, // From old ui.js
    updateSliceEditorUI, // From old ui.js
    updateDrumPadControlsUI, // From old ui.js
    renderDrumSamplerPads, // From old ui.js
    renderEffectsList, // From old ui.js
    renderEffectControls, // From old ui.js
    createKnob, // From old ui.js
    updateSequencerCellUI, // From old ui.js
    renderTimeline, // From old ui.js / arrangementMixingUI.js
    updatePlayheadPosition, // From old ui.js / arrangementMixingUI.js
    // openTimelineWindow was an alias to openArrangementWindow in old files, ensure consistency
} from './ui_modules/browserCoreUI.js'; // MAIN CHANGE HERE

import { initializeGlobalControlsUIModule, openGlobalControlsWindow } from './globalControlsUI.js';
import * as EffectsRegistry from './effectsRegistry.js';

console.log(`[Main] SnugOS v${Constants.APP_VERSION} - Script Execution Started`);

const uiElementsCache = {};
let currentBackgroundImageObjectURL = null;
const DESKTOP_BACKGROUND_IDB_KEY = 'snugosDesktopBackground_IDB_v2'; // Added v2 for safety

const appServices = {
    // --- Core App & Utilities ---
    uiElementsCache,
    showNotification: utilShowNotification,
    showConfirmationDialog,
    createContextMenu,
    snapTimeToGrid,
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag === true,
    _isReconstructingDAW_flag: false, // Internal flag
    newProject: () => {
        showConfirmationDialog("Create a new project? All unsaved changes will be lost.", () => {
            window.location.reload(); // Simplest way to ensure clean state
        });
    },
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices), // Crucial

    // --- State Management ---
    getTracksState, getTrackById: getTrackByIdState,
    getOpenWindowsState, getWindowById: getWindowByIdState,
    addWindowToStoreState, removeWindowFromStoreState,
    getHighestZState, incrementHighestZState, setHighestZState,
    captureStateForUndoInternal, undo: undoLastActionInternal, redo: redoLastActionInternal,
    getUndoStackState, getRedoStackState,
    gatherProjectDataInternal, reconstructDAWInternal, saveProject: saveProjectInternal,
    loadProject: loadProjectInternal, handleProjectFileLoad: handleProjectFileLoadInternal,
    exportToWav: exportToWavInternal,
    getCurrentThemeState, setCurrentThemeState, updateTheme, getTheme, // Theme related

    // --- Track Management ---
    addTrack: (type, initialData) => addTrackToStateInternal(type, initialData, true, appServices), // Pass appServices
    removeTrack: removeTrackFromStateInternal,

    // --- Audio Engine ---
    initAudioContextAndMasterMeter, updateMeters,
    togglePlayback: audioTogglePlayback, stopPlayback: audioStopPlayback,
    toggleRecording: audioToggleRecording,
    setMasterVolume: audioSetMasterVolume,
    getMasterGainValue: getMasterGainValueState,
    setMasterGainValueState, // Allow direct state setting if needed by audio module
    loadAndPreviewSample, getPreviewPlayer: getPreviewPlayerState, setPreviewPlayer: setPreviewPlayerState,
    fetchSoundLibrary, loadSoundFromBrowserToTarget, playSlicePreview, playDrumSamplerPadPreview,
    loadSampleFile, loadDrumSamplerPadFile, autoSliceSample,
    getMimeTypeFromFilename, getMasterEffectsBusInputNode,
    getActualMasterGainNode: getActualMasterGainNodeFromAudio,
    clearAllMasterEffectNodes: clearAllMasterEffectNodesInAudio,
    startAudioRecording, stopAudioRecording,

    // --- UI Modules & Functions ---
    // These are mostly provided by browserCoreUI now
    initializeUIModule, openSoundBrowserWindow, updateSoundBrowserDisplayForLibrary,
    showAddTrackModal, showAddEffectModal,
    openTrackInspectorWindow, openTrackEffectsRackWindow, openMasterEffectsRackWindow,
    openArrangementWindow, openSequencerWindow,
    openMixerWindow, updateMixerWindow,
    closeAllTrackWindows, updateTrackUI, highlightPlayingStep,
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI,
    updateDrumPadControlsUI, renderDrumSamplerPads, renderEffectsList, renderEffectControls,
    createKnob, updateSequencerCellUI,
    renderTimeline, updatePlayheadPosition,
    openGlobalControlsWindow, // From its own module

    // --- Effects Management (Bridging State and Audio) ---
    effectsRegistryAccess: EffectsRegistry, // Provide direct access
    getMasterEffects: getMasterEffectsState,
    addMasterEffect: async (effectType) => { /* ... (implementation detail, calls state and audio) ... */
        if (!appServices.getIsReconstructingDAW()) captureStateForUndoInternal(`Add Master Effect: ${effectType}`);
        const defaultParams = EffectsRegistry.getEffectDefaultParams(effectType);
        const id = addMasterEffectToState(effectType, defaultParams); // Add to state
        await addMasterEffectToAudio(id, effectType, defaultParams);     // Add to audio engine
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    removeMasterEffect: async (effectId) => { /* ... */
        const effect = getMasterEffectsState().find(e => e.id === effectId);
        if (effect && !appServices.getIsReconstructingDAW()) captureStateForUndoInternal(`Remove Master Effect: ${effect.type}`);
        removeMasterEffectFromState(effectId);
        await removeMasterEffectFromAudio(effectId);
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    updateMasterEffectParam: (effectId, paramPath, value) => { /* ... */
        updateMasterEffectParamInState(effectId, paramPath, value); // Update state representation
        updateMasterEffectParamInAudio(effectId, paramPath, value);   // Update Tone.js node
        // No undo capture here, assumes knob interaction will handle it or it's part of a larger undo
    },
    reorderMasterEffect: (effectId, newIndex) => { /* ... */
        if (!appServices.getIsReconstructingDAW()) captureStateForUndoInternal(`Reorder Master Effects`);
        reorderMasterEffectInState(effectId, newIndex);
        reorderMasterEffectInAudio(effectId, newIndex); // Audio module just rebuilds chain
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    toggleBypassMasterEffect: (effectId) => { /* Needs implementation in state and audio */
        const effect = getMasterEffectsState().find(e => e.id === effectId);
        if (effect) {
            if (!appServices.getIsReconstructingDAW()) captureStateForUndoInternal(`Toggle Bypass Master Effect: ${effect.type}`);
            effect.isBypassed = !effect.isBypassed; // Example state update
            // Audio module needs to implement bypass on the Tone.js node
            // updateMasterEffectBypassInAudio(effectId, effect.isBypassed);
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        }
    },
    getMasterEffectParamValue: (effectId, paramPath) => { /* ... (retrieve from state.masterEffectsChainState) ... */
        const effect = getMasterEffectsState().find(e => e.id === effectId);
        if (effect && effect.params) {
            const keys = paramPath.split('.');
            let val = effect.params;
            for (const key of keys) {
                if (val && typeof val === 'object' && key in val) val = val[key];
                else return undefined;
            }
            return val;
        }
        return undefined;
    },
     updateMasterEffectsRackUI: () => {
        const rackWindow = getWindowByIdState('masterEffectsRack');
        if (rackWindow?.element && !rackWindow.isMinimized && typeof renderEffectsList === 'function') {
            const listDiv = rackWindow.element.querySelector('#effectsList-master'); // Ensure ID matches what's in generated HTML
            const controlsContainer = rackWindow.element.querySelector('#effectControlsContainer-master');
            if (listDiv && controlsContainer) {
                renderEffectsList(null, 'master', listDiv, controlsContainer);
            }
        }
    },


    // --- MIDI ---
    getMidiAccess: getMidiAccessState, setActiveMIDIInput: setActiveMIDIInputState,
    getActiveMIDIInput: getActiveMIDIInputState, selectMIDIInput: eventSelectMIDIInput,

    // --- Sound Library ---
    getLoadedZipFiles: getLoadedZipFilesState, setLoadedZipFiles: setLoadedZipFilesState,
    getSoundLibraryFileTrees: getSoundLibraryFileTreesState, setSoundLibraryFileTrees: setSoundLibraryFileTreesState,
    getCurrentLibraryName: getCurrentLibraryNameState, setCurrentLibraryName: setCurrentLibraryNameState,
    getCurrentSoundFileTree: getCurrentSoundFileTreeState, setCurrentSoundBrowserPath: setCurrentSoundBrowserPathState,
    getCurrentSoundBrowserPath: getCurrentSoundBrowserPathState,
    pushToSoundBrowserPath, popFromSoundBrowserPath,

    // --- Timeline/Sequencer State & Control ---
    getPlaybackMode: getPlaybackModeState, setPlaybackMode: setPlaybackModeState,
    getArmedTrackId: getArmedTrackIdState, setArmedTrackId: setArmedTrackIdState,
    getSoloedTrackId: getSoloedTrackIdState, setSoloedTrackId: setSoloedTrackIdState,
    getSelectedTimelineClipInfo: getSelectedTimelineClipInfoState,
    setSelectedTimelineClip: setSelectedTimelineClipInfoState,
    getRecordingTrackId: getRecordingTrackIdState, setRecordingTrackId: setRecordingTrackIdState,
    getRecordingStartTime: getRecordingStartTimeState, setRecordingStartTime: setRecordingStartTimeState,
    isTrackRecording: isTrackRecordingState, setIsRecording: setIsRecordingState,
    getActiveSequencerTrackId: getActiveSequencerTrackIdState, setActiveSequencerTrackId: setActiveSequencerTrackIdState,
    handleTimelineLaneDrop: (event, targetTrackId, startTime) => handleTimelineLaneDrop(event, targetTrackId, startTime, appServices),


    // --- Event Handlers (for direct calls if needed, though UI usually calls them) ---
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer,

    // --- DB Access ---
    dbStoreItem: dbStoreAudio, dbGetItem: dbGetAudio, dbDeleteItem: dbDeleteAudio,

    // --- Misc UI helpers passed to modules ---
    panicStopAllAudio: () => { /* ... (implementation using Tone.Transport.stop(), etc.) ... */
        Tone.Transport.stop(); Tone.Transport.cancel(0);
        getTracksState().forEach(track => track.stopPlayback && track.stopPlayback());
        if (uiElementsCache.playBtn) uiElementsCache.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        if (uiElementsCache.playBtnGlobal) uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>';
        utilShowNotification("All audio stopped.", 1500);
    },
    updateTaskbarTempoDisplay: (tempo) => {
        if (uiElementsCache.tempoDisplay) uiElementsCache.tempoDisplay.textContent = `${parseFloat(tempo).toFixed(1)} BPM`;
    },
    updateUndoRedoButtonsUI: (undoState, redoState) => {
        const undoBtn = uiElementsCache.menuUndo; const redoBtn = uiElementsCache.menuRedo;
        if (undoBtn) { undoBtn.classList.toggle('disabled', !undoState); undoBtn.title = undoState ? `Undo: ${undoState.description || 'action'}` : "Undo"; }
        if (redoBtn) { redoBtn.classList.toggle('disabled', !redoState); redoBtn.title = redoState ? `Redo: ${redoState.description || 'action'}` : "Redo"; }
    },
    updateRecordButtonUI: (isRec) => {
        if (uiElementsCache.recordBtn) uiElementsCache.recordBtn.classList.toggle('text-red-700', isRec);
        if (uiElementsCache.recordBtnGlobal) uiElementsCache.recordBtnGlobal.classList.toggle('bg-red-700', isRec); // Example for global button
    },
    closeAllWindows: (isReconstruction = false) => {
        getOpenWindowsState().forEach(win => win.close(isReconstruction));
        getOpenWindowsState().clear(); // Clear the map
    },
    // This is a more specific version of closeAllWindows.
    clearOpenWindowsMap: () => getOpenWindowsState().clear(),
    triggerCustomBackgroundUpload: () => {
        const input = document.getElementById('file-input-background'); // Assuming you add this input
        if (input) input.click();
    },
    removeCustomDesktopBackground: async () => {
        await appServices.dbDeleteItem(DESKTOP_BACKGROUND_IDB_KEY);
        if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
        currentBackgroundImageObjectURL = null;
        applyDesktopBackground(null);
        utilShowNotification("Background removed.", 2000);
    },
    onPlaybackModeChange: (newMode) => {
        // This function can be called by the state module when playback mode changes
        // to allow main.js (or UI modules via appServices) to react, e.g., update UI buttons.
        const playbackBtn = document.getElementById('playbackModeToggleBtnGlobal'); // Example
        if (playbackBtn) {
             playbackBtn.textContent = newMode === 'timeline' ? 'Timeline Mode' : 'Sequencer Mode';
        }
        if(appServices.renderTimeline) appServices.renderTimeline(); // Re-render timeline for playhead visibility
    },
     _transportEventsInitialized_flag: false, // Internal flag
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },
};

function cacheUIElements() {
    // Cache all static UI elements from index.html
    uiElementsCache.desktop = document.getElementById('desktop');
    uiElementsCache.taskbar = document.getElementById('taskbar');
    uiElementsCache.topTaskbar = document.getElementById('topTaskbar');
    uiElementsCache.startMenuButton = document.getElementById('startMenuButton');
    uiElementsCache.startMenu = document.getElementById('startMenu');
    // Top taskbar global controls
    uiElementsCache.tempoDisplay = document.getElementById('tempoDisplay');
    uiElementsCache.playBtn = document.getElementById('playBtn'); // Assuming this is the global play
    uiElementsCache.stopBtn = document.getElementById('stopBtn'); // Assuming this is the global stop
    uiElementsCache.recordBtn = document.getElementById('recordBtn'); // Assuming this is the global record
    uiElementsCache.masterMeter = document.getElementById('master-meter');
    uiElementsCache.cpuUsage = document.getElementById('cpu-usage');
    uiElementsCache.clock = document.getElementById('clock');
    // File menu items
    uiElementsCache.menuNewProject = document.getElementById('menuNewProject');
    uiElementsCache.menuUndo = document.getElementById('menuUndo');
    uiElementsCache.menuRedo = document.getElementById('menuRedo');
    uiElementsCache.menuSaveProject = document.getElementById('menuSaveProject');
    uiElementsCache.menuLoadProject = document.getElementById('menuLoadProject');
    uiElementsCache.menuExportWav = document.getElementById('menuExportWav');
    uiElementsCache.menuToggleFullScreen = document.getElementById('menuToggleFullScreen');
    // Hidden file inputs
    uiElementsCache.projectFileInput = document.getElementById('file-input-project');
    uiElementsCache.audioFileInput = document.getElementById('file-input-audio');
    // Assuming a background input might be added:
    // uiElementsCache.backgroundFileInput = document.getElementById('file-input-background');

    // The following will be populated by openGlobalControlsWindow callback
    uiElementsCache.playBtnGlobal = null;
    uiElementsCache.recordBtnGlobal = null;
    uiElementsCache.stopBtnGlobal = null;
    uiElementsCache.tempoGlobalInput = null;
    uiElementsCache.midiInputSelectGlobal = null;
    uiElementsCache.masterMeterContainerGlobal = null;
    uiElementsCache.masterMeterBarGlobal = null;
    uiElementsCache.midiIndicatorGlobal = null;
    uiElementsCache.keyboardIndicatorGlobal = null;
    uiElementsCache.playbackModeToggleBtnGlobal = null;
}

async function initializeSnugOS() {
    console.log(`[Main initializeSnugOS] Initializing SnugOS v${Constants.APP_VERSION}...`);
    cacheUIElements();

    // Initialize core modules, passing appServices for DI
    initializeStateModule(appServices);
    initializeAudioModule(appServices);
    initializeUIModule(appServices); // This will now use browserCoreUI.js
    initializeGlobalControlsUIModule(appServices); // For the separate global controls window
    initializeEventHandlersModule(appServices);

    // Setup primary event listeners after modules are initialized
    initializePrimaryEventListeners(appServices); // Pass appServices

    // Attach listeners for global controls once the window is ready
    // This is a bit tricky as openGlobalControlsWindow is async and creates UI.
    // We might need to move some attachGlobalControlEvents logic into the callback of openGlobalControlsWindow
    // or ensure elements are cached robustly.
    openGlobalControlsWindow((elements) => {
        if (elements) {
            // Cache elements from global controls window
            uiElementsCache.playBtnGlobal = elements.playBtnGlobal;
            uiElementsCache.recordBtnGlobal = elements.recordBtnGlobal;
            uiElementsCache.stopBtnGlobal = elements.stopBtnGlobal;
            uiElementsCache.tempoGlobalInput = elements.tempoGlobalInput;
            uiElementsCache.midiInputSelectGlobal = elements.midiInputSelectGlobal;
            uiElementsCache.masterMeterContainerGlobal = elements.masterMeterContainerGlobal;
            uiElementsCache.masterMeterBarGlobal = elements.masterMeterBarGlobal;
            uiElementsCache.midiIndicatorGlobal = elements.midiIndicatorGlobal;
            uiElementsCache.keyboardIndicatorGlobal = elements.keyboardIndicatorGlobal;
            uiElementsCache.playbackModeToggleBtnGlobal = elements.playbackModeToggleBtnGlobal;
            attachGlobalControlEvents(elements); // Attach listeners to these specific elements
        }
    });

    setupMIDI(); // Initialize MIDI access and populate selector (selector is in global controls)

    updateClock();
    setInterval(updateClock, 10000);
    appServices.updateUndoRedoButtonsUI(); // Initial update

    setupGenericDropZoneListeners(uiElementsCache.desktop, handleDesktopDrop);
    
    // Load default background if any
    try {
        const storedImageBlob = await appServices.dbGetItem(DESKTOP_BACKGROUND_IDB_KEY);
        if (storedImageBlob) {
            if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
            currentBackgroundImageObjectURL = URL.createObjectURL(storedImageBlob);
            applyDesktopBackground(currentBackgroundImageObjectURL);
        } else { applyDesktopBackground(null); }
    } catch (error) { console.error("Error loading initial desktop background:", error); applyDesktopBackground(null); }


    // Default windows (consider making this configurable or part of project state)
    if (appServices.openArrangementWindow) appServices.openArrangementWindow();
    if (appServices.openSoundBrowserWindow) appServices.openSoundBrowserWindow();


    console.log("[Main initializeSnugOS] SnugOS Initialized and Ready.");
    startPerformanceMonitor();
}

function handleDesktopDrop(file) {
    if (!file) return;
    if (file.name.endsWith('.snug')) {
        appServices.handleProjectFileLoad({ target: { files: [file] } }); // Simulate event
    } else if (file.name.endsWith('.zip')) {
        const libraryName = file.name.replace(/\.zip$/i, '');
        const url = URL.createObjectURL(file);
        appServices.fetchSoundLibrary(libraryName, url)
            .then(() => URL.revokeObjectURL(url))
            .catch(err => {
                console.error(`Error processing dropped ZIP ${libraryName}:`, err);
                URL.revokeObjectURL(url);
                appServices.showNotification(`Failed to load library ${libraryName}.`, "error");
            });
        appServices.showNotification(`Loading library: ${libraryName}...`, "info");
    } else if (file.type && file.type.startsWith('image/')) {
        if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
        appServices.dbStoreItem(DESKTOP_BACKGROUND_IDB_KEY, file)
            .then(() => {
                currentBackgroundImageObjectURL = URL.createObjectURL(file);
                applyDesktopBackground(currentBackgroundImageObjectURL);
                appServices.showNotification("Background updated.", "success");
            })
            .catch(err => {
                console.error("Error saving background to DB:", err);
                appServices.showNotification("Failed to save background.", "error");
            });
    } else {
        appServices.showNotification(`Unsupported file type dropped: ${file.name}`, 'warning');
    }
}

function updateClock() {
    if (uiElementsCache.clock) {
        uiElementsCache.clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

function startPerformanceMonitor() {
    let lastMeterUpdateTime = performance.now();
    const updateLoop = () => {
        appServices.updateMeters(
            uiElementsCache.masterMeter, // Global meter bar in top taskbar
            uiElementsCache.masterMeterBarGlobal, // Master meter bar in Global Controls window
            appServices.getTracksState()
        );
        appServices.updatePlayheadPosition();

        if (performance.now() - lastMeterUpdateTime > 500) {
            if (uiElementsCache.cpuUsage && typeof Tone !== 'undefined' && Tone.context?.draw) {
                const cpu = Tone.context.draw.getValue() * 100;
                uiElementsCache.cpuUsage.textContent = `CPU: ${cpu.toFixed(0)}%`;
            }
            appServices.updateUndoRedoButtonsUI(appServices.getUndoStackState().length > 0 ? appServices.getUndoStackState()[appServices.getUndoStackState().length-1] : null,
                                                appServices.getRedoStackState().length > 0 ? appServices.getRedoStackState()[appServices.getRedoStackState().length-1] : null);
            lastMeterUpdateTime = performance.now();
        }
        requestAnimationFrame(updateLoop);
    };
    requestAnimationFrame(updateLoop);
}

function applyDesktopBackground(imageUrlOrObjectUrl) {
    if (uiElementsCache.desktop) {
        uiElementsCache.desktop.style.backgroundImage = imageUrlOrObjectUrl ? `url('${imageUrlOrObjectUrl}')` : '';
        uiElementsCache.desktop.style.backgroundSize = imageUrlOrObjectUrl ? 'cover' : '';
        uiElementsCache.desktop.style.backgroundPosition = imageUrlOrObjectUrl ? 'center center' : '';
        uiElementsCache.desktop.style.backgroundRepeat = imageUrlOrObjectUrl ? 'no-repeat' : '';
        uiElementsCache.desktop.style.backgroundColor = imageUrlOrObjectUrl ? '' : (Constants.defaultDesktopBg || '#101010');
    }
}

window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    if ((getTracksState() && getTracksState().length > 0) || (getUndoStackState() && getUndoStackState().length > 0)) {
        e.preventDefault(); e.returnValue = '';
        return "You have unsaved changes. Are you sure you want to leave?";
    }
    if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
});

console.log(`[Main] SnugOS v${Constants.APP_VERSION} - Script Execution Finished`);
