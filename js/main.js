// js/main.js - Main Application Logic Orchestrator (MODIFIED - Removed setCurrentSoundFileTreeState)

// --- Module Imports ---
import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import {
    showNotification as utilShowNotification,
    createContextMenu,
    createDropZoneHTML,
    setupGenericDropZoneListeners,
    showConfirmationDialog,
    snapTimeToGrid
} from './utils.js';
import {
    initializeEventHandlersModule,
    initializePrimaryEventListeners,
    setupMIDI,
    attachGlobalControlEvents,
    selectMIDIInput as eventSelectMIDIInput,
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer,
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
    getSelectedTimelineClipInfoState, getCurrentThemeState,
    // State Setters / Core Actions
    addWindowToStoreState, removeWindowFromStoreState, setHighestZState, incrementHighestZState,
    setMasterEffectsState, setMasterGainValueState,
    setMidiAccessState, setActiveMIDIInputState,
    setLoadedZipFilesState,
    setSoundLibraryFileTreesState,
    setCurrentLibraryNameState, /* setCurrentSoundFileTreeState, -- REMOVED */ setCurrentSoundBrowserPathState, setPreviewPlayerState,
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
import {
    initializeUIModule,
    openSoundBrowserWindow,
    updateSoundBrowserDisplayForLibrary,
    showAddTrackModal,
    showAddEffectModal,
    openTrackInspectorWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    openArrangementWindow,
    openSequencerWindow,
    openMixerWindow,
    updateMixerWindow,
    updateTheme, 
    getTheme,
    closeAllTrackWindows,
    updateTrackUI,
    highlightPlayingStep,
    drawWaveform,
    drawInstrumentWaveform,
    renderSamplePads,
    updateSliceEditorUI,
    updateDrumPadControlsUI,
    renderDrumSamplerPads,
    renderEffectsList,
    renderEffectControls,
    createKnob,
    updateSequencerCellUI,
    renderTimeline,
    updatePlayheadPosition,
} from './ui_modules/browserCoreUI.js';

import { initializeGlobalControlsUIModule, openGlobalControlsWindow } from './globalControlsUI.js';
import * as EffectsRegistry from './effectsRegistry.js';

console.log(`[Main] SnugOS v${Constants.APP_VERSION} - Script Execution Started (after imports)`);

const uiElementsCache = {};
let currentBackgroundImageObjectURL = null;
const DESKTOP_BACKGROUND_IDB_KEY = 'snugosDesktopBackground_IDB_v2';

const appServices = {
    // --- Core App & Utilities ---
    uiElementsCache,
    showNotification: utilShowNotification,
    showConfirmationDialog,
    createContextMenu,
    snapTimeToGrid,
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag === true,
    _isReconstructingDAW_flag: false, 
    newProject: () => {
        showConfirmationDialog("Create a new project? All unsaved changes will be lost.", () => {
            window.location.reload(); 
        });
    },
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),

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
    getCurrentThemeState, setCurrentThemeState, updateTheme, getTheme, 

    // --- Track Management ---
    addTrack: (type, initialData) => addTrackToStateInternal(type, initialData, true, appServices),
    removeTrack: removeTrackFromStateInternal,

    // --- Audio Engine ---
    initAudioContextAndMasterMeter, updateMeters,
    togglePlayback: audioTogglePlayback, stopPlayback: audioStopPlayback,
    toggleRecording: audioToggleRecording,
    setMasterVolume: audioSetMasterVolume,
    getMasterGainValue: getMasterGainValueState,
    setMasterGainValueState, 
    loadAndPreviewSample, getPreviewPlayer: getPreviewPlayerState, setPreviewPlayer: setPreviewPlayerState,
    fetchSoundLibrary, loadSoundFromBrowserToTarget, playSlicePreview, playDrumSamplerPadPreview,
    loadSampleFile, loadDrumSamplerPadFile, autoSliceSample,
    getMimeTypeFromFilename, getMasterEffectsBusInputNode,
    getActualMasterGainNode: getActualMasterGainNodeFromAudio,
    clearAllMasterEffectNodes: clearAllMasterEffectNodesInAudio,
    startAudioRecording, stopAudioRecording,

    // --- UI Modules & Functions ---
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
    openGlobalControlsWindow, 

    // --- Effects Management ---
    effectsRegistryAccess: EffectsRegistry, 
    getMasterEffects: getMasterEffectsState,
    addMasterEffect: async (effectType) => { 
        if (!appServices.getIsReconstructingDAW()) captureStateForUndoInternal(`Add Master Effect: ${effectType}`);
        const defaultParams = EffectsRegistry.getEffectDefaultParams(effectType);
        const id = addMasterEffectToState(effectType, defaultParams); 
        await addMasterEffectToAudio(id, effectType, defaultParams);    
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    removeMasterEffect: async (effectId) => { 
        const effect = getMasterEffectsState().find(e => e.id === effectId);
        if (effect && !appServices.getIsReconstructingDAW()) captureStateForUndoInternal(`Remove Master Effect: ${effect.type}`);
        removeMasterEffectFromState(effectId);
        await removeMasterEffectFromAudio(effectId);
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    updateMasterEffectParam: (effectId, paramPath, value) => { 
        updateMasterEffectParamInState(effectId, paramPath, value); 
        updateMasterEffectParamInAudio(effectId, paramPath, value);  
    },
    reorderMasterEffect: (effectId, newIndex) => { 
        if (!appServices.getIsReconstructingDAW()) captureStateForUndoInternal(`Reorder Master Effects`);
        reorderMasterEffectInState(effectId, newIndex);
        reorderMasterEffectInAudio(effectId, newIndex); 
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    toggleBypassMasterEffect: (effectId) => { 
        const effect = getMasterEffectsState().find(e => e.id === effectId);
        if (effect) {
            if (!appServices.getIsReconstructingDAW()) captureStateForUndoInternal(`Toggle Bypass Master Effect: ${effect.type}`);
            const newBypassState = !effect.isBypassed;
            updateMasterEffectParamInState(effectId, 'isBypassed', newBypassState); // Assuming 'isBypassed' is a direct param in state
            // Audio module needs to implement bypass on the Tone.js node
            // updateMasterEffectBypassInAudio(effectId, newBypassState);
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        }
    },
    getMasterEffectParamValue: (effectId, paramPath) => { 
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
            const listDiv = rackWindow.element.querySelector('#effectsList-master'); 
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
    getCurrentSoundFileTree: getCurrentSoundFileTreeState, 
    // setCurrentSoundFileTreeState, // REMOVED - managed by setCurrentLibraryNameState
    setCurrentSoundBrowserPath: setCurrentSoundBrowserPathState,
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

    // --- Event Handlers (for direct calls if needed) ---
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer,

    // --- DB Access ---
    dbStoreItem: dbStoreAudio, dbGetItem: dbGetAudio, dbDeleteItem: dbDeleteAudio,

    // --- Misc UI helpers passed to modules ---
    panicStopAllAudio: () => { 
        Tone.Transport.stop(); Tone.Transport.cancel(0);
        getTracksState().forEach(track => track.stopPlayback && track.stopPlayback());
        if (uiElementsCache.playBtn) uiElementsCache.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        if (uiElementsCache.playBtnGlobal) uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>';
        utilShowNotification("All audio stopped.", "info", 1500);
    },
    updateTaskbarTempoDisplay: (tempo) => {
        if (uiElementsCache.tempoDisplay) uiElementsCache.tempoDisplay.textContent = `${parseFloat(tempo).toFixed(1)} BPM`;
    },
    updateUndoRedoButtonsUI: (undoState, redoState) => {
        const undoBtn = uiElementsCache.menuUndo; const redoBtn = uiElementsCache.menuRedo;
        if (undoBtn) { 
            const canUndo = undoState && undoStack.length > 0; // Check stack directly too
            undoBtn.classList.toggle('disabled', !canUndo); 
            undoBtn.title = canUndo ? `Undo: ${undoState.actionName || 'action'}` : "Undo"; 
        }
        if (redoBtn) { 
            const canRedo = redoState && redoStack.length > 0; // Check stack directly too
            redoBtn.classList.toggle('disabled', !canRedo); 
            redoBtn.title = canRedo ? `Redo: ${redoState.actionName || 'action'}` : "Redo"; 
        }
    },
    updateRecordButtonUI: (isRec, isArmed) => { // Added isArmed parameter
        const recActive = isRec && isArmed;
        if (uiElementsCache.recordBtn) uiElementsCache.recordBtn.classList.toggle('text-red-700', recActive);
        if (uiElementsCache.recordBtnGlobal) uiElementsCache.recordBtnGlobal.classList.toggle('bg-red-700', recActive); 
    },
    closeAllWindows: (isReconstruction = false) => {
        getOpenWindowsState().forEach(win => win.close(isReconstruction));
        getOpenWindowsState().clear(); 
    },
    clearOpenWindowsMap: () => getOpenWindowsState().clear(),
    triggerCustomBackgroundUpload: () => {
        const input = document.getElementById('file-input-background'); 
        if (input) input.click();
    },
    removeCustomDesktopBackground: async () => {
        await appServices.dbDeleteItem(DESKTOP_BACKGROUND_IDB_KEY);
        if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
        currentBackgroundImageObjectURL = null;
        applyDesktopBackground(null);
        utilShowNotification("Background removed.", "info", 2000);
    },
    onPlaybackModeChange: (newMode) => {
        const playbackBtn = document.getElementById('playbackModeToggleBtnGlobal'); 
        if (playbackBtn) {
             playbackBtn.textContent = newMode === 'timeline' ? 'Timeline Mode' : 'Sequencer Mode';
        }
        if(appServices.renderTimeline) appServices.renderTimeline(); 
    },
     _transportEventsInitialized_flag: false, 
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },
};

function cacheUIElements() {
    uiElementsCache.desktop = document.getElementById('desktop');
    uiElementsCache.taskbar = document.getElementById('taskbar');
    uiElementsCache.topTaskbar = document.getElementById('topTaskbar');
    uiElementsCache.startMenuButton = document.getElementById('startMenuButton');
    uiElementsCache.startMenu = document.getElementById('startMenu');
    uiElementsCache.tempoDisplay = document.getElementById('tempoDisplay');
    uiElementsCache.playBtn = document.getElementById('playBtn'); 
    uiElementsCache.stopBtn = document.getElementById('stopBtn'); 
    uiElementsCache.recordBtn = document.getElementById('recordBtn'); 
    uiElementsCache.masterMeter = document.getElementById('master-meter');
    uiElementsCache.cpuUsage = document.getElementById('cpu-usage');
    uiElementsCache.clock = document.getElementById('clock');
    uiElementsCache.menuNewProject = document.getElementById('menuNewProject');
    uiElementsCache.menuUndo = document.getElementById('menuUndo');
    uiElementsCache.menuRedo = document.getElementById('menuRedo');
    uiElementsCache.menuSaveProject = document.getElementById('menuSaveProject');
    uiElementsCache.menuLoadProject = document.getElementById('menuLoadProject');
    uiElementsCache.menuExportWav = document.getElementById('menuExportWav');
    uiElementsCache.menuToggleFullScreen = document.getElementById('menuToggleFullScreen');
    uiElementsCache.projectFileInput = document.getElementById('file-input-project');
    uiElementsCache.audioFileInput = document.getElementById('file-input-audio');
    // Global controls elements will be cached by its own UI module callback
}

async function initializeSnugOS() {
    console.log(`[Main initializeSnugOS] Initializing SnugOS v${Constants.APP_VERSION}...`);
    cacheUIElements();

    initializeStateModule(appServices);
    initializeAudioModule(appServices);
    initializeUIModule(appServices); 
    initializeGlobalControlsUIModule(appServices); 
    initializeEventHandlersModule(appServices);

    initializePrimaryEventListeners(); 

    // Global controls elements are cached and events attached via its window's onReadyCallback
    openGlobalControlsWindow((elements) => {
        if (elements) {
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
            attachGlobalControlEvents(elements); 
        }
    });

    setupMIDI(); 

    updateClock();
    setInterval(updateClock, 10000);
    if (appServices.updateUndoRedoButtonsUI) { // Ensure service is available
        appServices.updateUndoRedoButtonsUI(null, null); // Initial update with no actions
    }


    setupGenericDropZoneListeners(uiElementsCache.desktop, handleDesktopDrop);
    
    try {
        const storedImageBlob = await appServices.dbGetItem(DESKTOP_BACKGROUND_IDB_KEY);
        if (storedImageBlob) {
            if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
            currentBackgroundImageObjectURL = URL.createObjectURL(storedImageBlob);
            applyDesktopBackground(currentBackgroundImageObjectURL);
        } else { applyDesktopBackground(null); }
    } catch (error) { console.error("Error loading initial desktop background:", error); applyDesktopBackground(null); }

    if (appServices.openArrangementWindow) appServices.openArrangementWindow();
    if (appServices.openSoundBrowserWindow) appServices.openSoundBrowserWindow();

    console.log("[Main initializeSnugOS] SnugOS Initialized and Ready.");
    startPerformanceMonitor();
}

function handleDesktopDrop(file) {
    if (!file) return;
    if (file.name.endsWith('.snug')) {
        appServices.handleProjectFileLoad({ target: { files: [file] } }); 
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
        if (appServices.updateMeters) {
            appServices.updateMeters(
                uiElementsCache.masterMeter, 
                uiElementsCache.masterMeterBarGlobal, 
                appServices.getTracksState ? appServices.getTracksState() : []
            );
        }
        if (appServices.updatePlayheadPosition) appServices.updatePlayheadPosition();

        if (performance.now() - lastMeterUpdateTime > 500) {
            if (uiElementsCache.cpuUsage && typeof Tone !== 'undefined' && Tone.context?.draw) {
                const cpu = Tone.context.draw.getValue() * 100;
                uiElementsCache.cpuUsage.textContent = `CPU: ${cpu.toFixed(0)}%`;
            }
            if (appServices.updateUndoRedoButtonsUI) {
                const undoStack = appServices.getUndoStackState ? appServices.getUndoStackState() : [];
                const redoStack = appServices.getRedoStackState ? appServices.getRedoStackState() : [];
                appServices.updateUndoRedoButtonsUI(undoStack.length > 0 ? undoStack[undoStack.length-1] : null,
                                                    redoStack.length > 0 ? redoStack[redoStack.length-1] : null);
            }
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
    const tracksExist = appServices.getTracksState && appServices.getTracksState().length > 0;
    const undoStackExists = appServices.getUndoStackState && appServices.getUndoStackState().length > 0;
    if (tracksExist || undoStackExists) {
        e.preventDefault(); e.returnValue = '';
        return "You have unsaved changes. Are you sure you want to leave?";
    }
    if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
});

console.log(`[Main] SnugOS v${Constants.APP_VERSION} - Script Execution Finished (end of file)`);
