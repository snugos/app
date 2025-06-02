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
    handleOpenSequencer as eventHandleOpenSequencer,
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
    initializeUIModule, openTrackEffectsRackWindow, openTrackSequencerWindow,
    openTrackInspectorWindow, openMixerWindow, updateMixerWindow, openSoundBrowserWindow,
    renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary, highlightPlayingStep, drawWaveform,
    drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, updateDrumPadControlsUI, renderDrumSamplerPads,
    renderEffectsList, renderEffectControls, createKnob,
    updateSequencerCellUI,
    openMasterEffectsRackWindow,
    renderTimeline,
    updatePlayheadPosition,
    openTimelineWindow
} from './ui.js';
import { initializeGlobalControlsUIModule, openGlobalControlsWindow } from './globalControlsUI.js';


console.log(`SCRIPT EXECUTION STARTED - SnugOS (main.js - Version ${Constants.APP_VERSION})`);

// --- Global UI Elements Cache ---
const uiElementsCache = {
    desktop: null, taskbar: null, startButton: null, startMenu: null,
    taskbarButtonsContainer: null, taskbarTempoDisplay: null, loadProjectInput: null,
    customBgInput: null, sampleFileInput: null, notificationArea: null, modalContainer: null,
    menuAddSynthTrack: null, menuAddSamplerTrack: null, menuAddDrumSamplerTrack: null,
    menuAddInstrumentSamplerTrack: null, menuAddAudioTrack: null,
    menuOpenSoundBrowser: null, menuOpenTimeline: null,
    menuUndo: null, menuRedo: null,
    menuSaveProject: null, menuLoadProject: null, menuExportWav: null, menuOpenGlobalControls: null,
    menuOpenMixer: null, menuOpenMasterEffects: null,
    menuToggleFullScreen: null, playBtnGlobal: null, recordBtnGlobal: null, stopBtnGlobal: null,
    tempoGlobalInput: null, midiInputSelectGlobal: null, masterMeterContainerGlobal: null,
    masterMeterBarGlobal: null, midiIndicatorGlobal: null, keyboardIndicatorGlobal: null,
    playbackModeToggleBtnGlobal: null,
};

// --- Desktop Background Constants and State ---
const DESKTOP_BACKGROUND_LS_KEY = 'snugosDesktopBackground_LS'; // Kept for potential migration
const DESKTOP_BACKGROUND_IDB_KEY = 'snugosDesktopBackground_IDB';
let currentBackgroundImageObjectURL = null;

// --- AppServices Object (Centralized DI Container) ---
// Moved appServices definition higher to be available for functions below it.
const appServices = {
    // DB Services (already defined, ensure they are used by background functions)
    dbStoreItem: dbStoreAudio,
    dbGetItem: dbGetAudio,
    dbDeleteItem: dbDeleteAudio,

    // UI Services
    openTrackInspectorWindow, openTrackEffectsRackWindow, openTrackSequencerWindow,
    openMixerWindow, updateMixerWindow, openSoundBrowserWindow, openMasterEffectsRackWindow,
    renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary, highlightPlayingStep, drawWaveform,
    drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI,
    updateDrumPadControlsUI, renderDrumSamplerPads, renderEffectsList, renderEffectControls,
    createKnob, updateSequencerCellUI,
    renderTimeline, openTimelineWindow, updatePlayheadPosition,
    showNotification: utilShowNotification, // Use the imported util directly
    createContextMenu, showConfirmationDialog,

    // Audio Services
    initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary, loadSoundFromBrowserToTarget,
    playSlicePreview, playDrumSamplerPadPreview, loadSampleFile, loadDrumSamplerPadFile,
    autoSliceSample, getMimeTypeFromFilename,
    getMasterEffectsBusInputNode,
    getActualMasterGainNode: getActualMasterGainNodeFromAudio,
    clearAllMasterEffectNodes: clearAllMasterEffectNodesInAudio,
    startAudioRecording, stopAudioRecording,

    // State Getters
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
    getSelectedTimelineClipInfo: getSelectedTimelineClipInfoState,

    // State Setters & Core Actions
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
    addTrack: addTrackToStateInternal, removeTrack: removeTrackFromStateInternal,
    captureStateForUndo: captureStateForUndoInternal, undoLastAction: undoLastActionInternal,
    redoLastAction: redoLastActionInternal, gatherProjectData: gatherProjectDataInternal,
    reconstructDAW: reconstructDAWInternal, saveProject: saveProjectInternal,
    loadProject: loadProjectInternal, handleProjectFileLoad: handleProjectFileLoadInternal,
    exportToWav: exportToWavInternal,

    // Event Handler Passthroughs
    selectMIDIInput: eventSelectMIDIInput,
    handleTrackMute: eventHandleTrackMute,
    handleTrackSolo: eventHandleTrackSolo,
    handleTrackArm: eventHandleTrackArm,
    handleRemoveTrack: eventHandleRemoveTrack,
    handleOpenTrackInspector: eventHandleOpenTrackInspector,
    handleOpenEffectsRack: eventHandleOpenEffectsRack,
    handleOpenSequencer: eventHandleOpenSequencer,
    handleTimelineLaneDrop: (event, targetTrackId, startTime) => handleTimelineLaneDrop(event, targetTrackId, startTime, appServices),

    // Audio Blob Helper
    getAudioBlobFromSoundBrowserItem: async (soundData) => {
        if (!soundData || !soundData.libraryName || !soundData.fullPath) {
            console.warn("[AppServices getAudioBlobFromSoundBrowserItem] Invalid soundData:", soundData);
            return null;
        }
        const loadedZips = getLoadedZipFilesState(); // Use getter
        if (loadedZips && loadedZips[soundData.libraryName] && loadedZips[soundData.libraryName] !== "loading") {
            const zipEntry = loadedZips[soundData.libraryName].file(soundData.fullPath);
            if (zipEntry) {
                try {
                    const blob = await zipEntry.async("blob");
                    // Ensure it's a File object with a name for better compatibility
                    return new File([blob], soundData.fileName || 'sound_browser_clip.wav', { type: getMimeTypeFromFilename(soundData.fileName) });
                } catch (e) {
                    console.error("[AppServices getAudioBlobFromSoundBrowserItem] Error getting blob from zipEntry:", e);
                    return null;
                }
            } else {
                console.warn(`[AppServices getAudioBlobFromSoundBrowserItem] ZipEntry not found for ${soundData.fullPath} in ${soundData.libraryName}`);
            }
        } else {
            console.warn(`[AppServices getAudioBlobFromSoundBrowserItem] Library ${soundData.libraryName} not loaded or is loading.`);
        }
        return null;
    },

    // Panic Stop
    panicStopAllAudio: () => {
        console.warn("[AppServices] PANIC STOP ALL AUDIO triggered.");

        if (typeof Tone !== 'undefined') {
            Tone.Transport.stop();
            Tone.Transport.cancel(0);
            console.log("[Panic Stop] Tone.Transport stopped and cancelled.");
        }

        const tracks = getTracksState();
        if (tracks) {
            tracks.forEach(track => {
                if (track && typeof track.stopPlayback === 'function') {
                    try { track.stopPlayback(); }
                    catch (e) { console.warn(`Error in track.stopPlayback() for track ${track.id} during panic:`, e); }
                }
                // More aggressive stop for synth-like instruments
                if (track && track.instrument && !track.instrument.disposed && typeof track.instrument.releaseAll === 'function') {
                    try { track.instrument.releaseAll(Tone.now()); console.log(`[Panic Stop] Released all on instrument for track ${track.id}`); }
                    catch (e) { console.warn(`Error during instrument.releaseAll() for track ${track.id} during panic:`, e); }
                }
                // Specific cleanup for samplers might be needed if they hold voices
            });
            console.log("[Panic Stop] stopPlayback called on all tracks.");
        }

        if (uiElementsCache.playBtnGlobal) {
            uiElementsCache.playBtnGlobal.textContent = 'Play';
        }
        if (isTrackRecordingState()) {
            const recTrackId = getRecordingTrackIdState();
            const recTrack = recTrackId !== null ? getTrackByIdState(recTrackId) : null;
            if (appServices.stopAudioRecording && recTrackId !== null && recTrack?.type === 'Audio') {
                 appServices.stopAudioRecording(); // This is async, but in panic, we might not wait
                 console.log("[Panic Stop] Audio recording stop triggered.");
            }
            setIsRecordingState(false);
            setRecordingTrackIdState(null);
            if(appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(false);
        }

        console.log("[Panic Stop] All audio and transport actions attempted to be stopped.");
        utilShowNotification("All audio stopped (Panic).", 2000);
    },

    // UI Update Callbacks
    updateTaskbarTempoDisplay: (tempo) => {
        if (uiElementsCache.taskbarTempoDisplay) {
            uiElementsCache.taskbarTempoDisplay.textContent = `${parseFloat(tempo).toFixed(1)} BPM`;
        } else { console.warn("[Main] Taskbar tempo display element not found in cache for update."); }
    },
    updateUndoRedoButtonsUI: (undoState, redoState) => {
        if (uiElementsCache.menuUndo) {
            uiElementsCache.menuUndo.classList.toggle('disabled', !undoState);
            uiElementsCache.menuUndo.title = undoState ? `Undo: ${undoState.description || 'action'}` : 'Undo (Nothing to undo)';
        }
        if (uiElementsCache.menuRedo) {
            uiElementsCache.menuRedo.classList.toggle('disabled', !redoState);
            uiElementsCache.menuRedo.title = redoState ? `Redo: ${redoState.description || 'action'}` : 'Redo (Nothing to redo)';
        }
    },
    updateRecordButtonUI: (isRec) => {
        if (uiElementsCache.recordBtnGlobal) {
            uiElementsCache.recordBtnGlobal.textContent = isRec ? 'Stop Rec' : 'Record';
            uiElementsCache.recordBtnGlobal.classList.toggle('recording', isRec); // For potential CSS styling
        }
    },
    closeAllWindows: (isReconstruction = false) => {
        const openWindows = getOpenWindowsState();
        if (openWindows && typeof openWindows.forEach === 'function') {
            openWindows.forEach(win => {
                if (win && typeof win.close === 'function') win.close(isReconstruction);
            });
        }
        // Clearing the map is now handled by removeWindowFromStoreState called by win.close()
    },
    clearOpenWindowsMap: () => { // Kept if direct clearing is needed elsewhere
        const map = getOpenWindowsState();
        if(map && typeof map.clear === 'function') map.clear();
    },
    closeAllTrackWindows: (trackIdToClose) => {
        console.log(`[Main appServices.closeAllTrackWindows] Called for trackId: ${trackIdToClose}`);
        const windowIdsToClose = [
            `trackInspector-${trackIdToClose}`, `effectsRack-${trackIdToClose}`, `sequencerWin-${trackIdToClose}`
        ];
        windowIdsToClose.forEach(winId => {
            const win = getWindowByIdState(winId); // Use getter
            if (win && typeof win.close === 'function') {
                win.close(true); // true for reconstruction context if applicable
            }
        });
    },
    updateTrackUI: handleTrackUIUpdate, // Centralized handler defined below
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
    uiElementsCache: uiElementsCache,

    // Master Effects Management
    addMasterEffect: async (effectType) => {
        try {
            const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;
            if (!isReconstructing && appServices.captureStateForUndo) appServices.captureStateForUndo(`Add ${effectType} to Master`);

            if (!appServices.effectsRegistryAccess?.getEffectDefaultParams) {
                console.error("effectsRegistryAccess.getEffectDefaultParams not available."); return;
            }
            const defaultParams = appServices.effectsRegistryAccess.getEffectDefaultParams(effectType);
            const effectIdInState = addMasterEffectToState(effectType, defaultParams); // Add to state
            await addMasterEffectToAudio(effectIdInState, effectType, defaultParams); // Add to audio engine
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI(); // Update UI
        } catch (error) {
            console.error(`[Main addMasterEffect] Error adding ${effectType}:`, error);
            utilShowNotification(`Failed to add master effect ${effectType}.`, 3000);
        }
    },
    removeMasterEffect: async (effectId) => {
        try {
            const effects = getMasterEffectsState(); // Use getter
            const effect = effects ? effects.find(e => e.id === effectId) : null;
            if (effect) {
                const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;
                if (!isReconstructing && appServices.captureStateForUndo) appServices.captureStateForUndo(`Remove ${effect.type} from Master`);
                removeMasterEffectFromState(effectId); // Remove from state
                await removeMasterEffectFromAudio(effectId); // Remove from audio engine
                if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI(); // Update UI
            }
        } catch (error) {
            console.error(`[Main removeMasterEffect] Error removing ${effectId}:`, error);
            utilShowNotification("Failed to remove master effect.", 3000);
        }
    },
    updateMasterEffectParam: (effectId, paramPath, value) => {
        updateMasterEffectParamInState(effectId, paramPath, value); // Update state
        updateMasterEffectParamInAudio(effectId, paramPath, value); // Update audio engine
        // UI update for effect controls usually happens within the effect rack window itself
    },
    reorderMasterEffect: (effectId, newIndex) => {
        try {
            const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;
            if (!isReconstructing && appServices.captureStateForUndo) appServices.captureStateForUndo(`Reorder Master effect`);
            reorderMasterEffectInState(effectId, newIndex); // Reorder in state
            reorderMasterEffectInAudio(effectId, newIndex); // Reorder in audio engine (effectively rebuilds chain)
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI(); // Update UI
        } catch (error) {
            console.error(`[Main reorderMasterEffect] Error reordering ${effectId}:`, error);
            utilShowNotification("Failed to reorder master effect.", 3000);
        }
    },
    setActualMasterVolume: (volumeValue) => { // For master volume control
        if (typeof getActualMasterGainNodeFromAudio === 'function') {
            const actualMasterNode = getActualMasterGainNodeFromAudio();
            if (actualMasterNode && actualMasterNode.gain && typeof actualMasterNode.gain.setValueAtTime === 'function' && !actualMasterNode.disposed) {
                try {
                    actualMasterNode.gain.setValueAtTime(volumeValue, Tone.now());
                } catch (e) { console.error("Error setting master volume via Tone:", e); }
            } else { console.warn("Master gain node or its gain property not available/disposed."); }
        } else { console.warn("getActualMasterGainNodeFromAudio service missing."); }
    },

    // Effects Registry Access (initialized later)
    effectsRegistryAccess: {
        AVAILABLE_EFFECTS: null, getEffectParamDefinitions: null,
        getEffectDefaultParams: null, synthEngineControlDefinitions: null,
    },

    // Reconstruction Flag
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag === true,
    _isReconstructingDAW_flag: false, // Internal flag

    // Transport Sync Flag
    _transportEventsInitialized_flag: false,
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },

    // UI Update Service for Track Meters
    updateTrackMeterUI: (trackId, level, isClipping) => {
        try {
            const inspectorWindow = getWindowByIdState(`trackInspector-${trackId}`);
            const mixerWindow = getWindowByIdState('mixer'); // Use getter

            if (inspectorWindow?.element && !inspectorWindow.isMinimized) {
                const meterBar = inspectorWindow.element.querySelector(`#trackMeterBar-${trackId}`);
                if (meterBar) {
                    meterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
                    meterBar.classList.toggle('clipping', isClipping);
                }
            }
            if (mixerWindow?.element && !mixerWindow.isMinimized) {
                const meterBar = mixerWindow.element.querySelector(`#mixerTrackMeterBar-${trackId}`);
                if (meterBar) {
                    meterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
                    meterBar.classList.toggle('clipping', isClipping);
                }
            }
        } catch (error) { console.warn(`[Main appServices.updateTrackMeterUI] Error for track ${trackId}:`, error); }
    },
    // UI Update Service for Master Effects Rack
    updateMasterEffectsRackUI: () => {
        try {
            const masterRackWindow = getWindowByIdState('masterEffectsRack'); // Use getter
            if (masterRackWindow?.element && !masterRackWindow.isMinimized && typeof renderEffectsList === 'function') {
                const listDiv = masterRackWindow.element.querySelector('#effectsList-master');
                const controlsContainer = masterRackWindow.element.querySelector('#effectControlsContainer-master');
                if (listDiv && controlsContainer) {
                    renderEffectsList(null, 'master', listDiv, controlsContainer); // Pass null for owner (master)
                } else { console.warn("[Main] Master effects rack UI elements not found for update."); }
            }
        } catch (error) { console.warn("[Main appServices.updateMasterEffectsRackUI] Error:", error); }
    },
    // Desktop Background
    triggerCustomBackgroundUpload: () => {
        if (uiElementsCache.customBgInput) uiElementsCache.customBgInput.click();
        else console.warn("Custom background input element (customBgInput) not found in cache.");
    },
    removeCustomDesktopBackground: async () => { // Make async
        try {
            localStorage.removeItem(DESKTOP_BACKGROUND_LS_KEY); // Legacy cleanup
            await appServices.dbDeleteItem(DESKTOP_BACKGROUND_IDB_KEY); // Use appService

            if (currentBackgroundImageObjectURL) {
                URL.revokeObjectURL(currentBackgroundImageObjectURL);
                currentBackgroundImageObjectURL = null;
            }
            applyDesktopBackground(null); // Apply default
            utilShowNotification("Custom background removed.", 2000);
        } catch (error) {
            console.error("Error removing custom desktop background:", error);
            utilShowNotification("Could not remove background from storage.", 3000);
        }
    },
    // Playback Mode Change Handler
    onPlaybackModeChange: (newMode) => {
        console.log(`[Main appServices.onPlaybackModeChange] Called with newMode: ${newMode}`);
        if (uiElementsCache.playbackModeToggleBtnGlobal) {
            uiElementsCache.playbackModeToggleBtnGlobal.textContent = newMode === 'timeline' ? 'Mode: Timeline' : 'Mode: Sequencer';
            uiElementsCache.playbackModeToggleBtnGlobal.classList.toggle('active', newMode === 'timeline');
        } else {
            console.warn("[Main appServices.onPlaybackModeChange] Playback mode toggle button not found in UI cache.");
        }
        // Re-render timeline to update playhead visibility or other mode-dependent UI
        if (appServices.renderTimeline && typeof appServices.renderTimeline === 'function') {
            appServices.renderTimeline();
        }
         if (appServices.updatePlayheadPosition && typeof appServices.updatePlayheadPosition === 'function') {
            appServices.updatePlayheadPosition(); // Ensure playhead visibility updates
        }
    }
};

// --- Desktop Background Functions ---
async function handleCustomBackgroundUpload(event) {
    if (!event?.target?.files?.[0]) return;
    const file = event.target.files[0];
    if (file.type.startsWith('image/')) {
        try {
            // Clear old localStorage if it exists (migration)
            localStorage.removeItem(DESKTOP_BACKGROUND_LS_KEY);
            // Store new background in IndexedDB via appServices
            await appServices.dbStoreItem(DESKTOP_BACKGROUND_IDB_KEY, file);

            if (currentBackgroundImageObjectURL) {
                URL.revokeObjectURL(currentBackgroundImageObjectURL);
            }
            currentBackgroundImageObjectURL = URL.createObjectURL(file);
            applyDesktopBackground(currentBackgroundImageObjectURL);
            utilShowNotification("Custom background applied.", 2000);
        } catch (error) {
            console.error("Error saving custom background to IndexedDB:", error);
            utilShowNotification("Could not save background. Storage error or image too large.", 4000);
        }
    } else {
        utilShowNotification("Invalid file type. Please select an image.", 3000);
    }
    if (event.target) event.target.value = null; // Reset file input
}

function applyDesktopBackground(imageUrlOrObjectUrl) {
    if (uiElementsCache.desktop) {
        try {
            if (imageUrlOrObjectUrl) {
                uiElementsCache.desktop.style.backgroundImage = `url('${imageUrlOrObjectUrl}')`;
                uiElementsCache.desktop.style.backgroundSize = 'cover';
                uiElementsCache.desktop.style.backgroundPosition = 'center center';
                uiElementsCache.desktop.style.backgroundRepeat = 'no-repeat';
                uiElementsCache.desktop.style.backgroundColor = ''; // Clear solid background color
            } else {
                uiElementsCache.desktop.style.backgroundImage = ''; // Remove image
                uiElementsCache.desktop.style.backgroundColor = Constants.defaultDesktopBg || '#101010'; // Set default solid color
            }
            console.log(`[Main applyDesktopBackground] Applied: ${imageUrlOrObjectUrl || Constants.defaultDesktopBg}`);
        } catch (e) {
            console.error("Error applying desktop background style:", e);
        }
    } else {
        console.warn("[Main applyDesktopBackground] Desktop element not found in cache.");
    }
}


// --- Centralized UI Update Handler ---
function handleTrackUIUpdate(trackId, reason, detail) {
    if (!getTrackByIdState) { console.warn("[Main handleTrackUIUpdate] getTrackByIdState service not available."); return; }
    const track = getTrackByIdState(trackId);
    if (!track) {
        console.warn(`[Main handleTrackUIUpdate] Track ${trackId} not found for reason: ${reason}`);
        return;
    }

    const getOpenWindowElement = (winId) => {
        if (!getWindowByIdState) return null;
        const win = getWindowByIdState(winId);
        return (win?.element && !win.isMinimized) ? win.element : null;
    };

    const inspectorElement = getOpenWindowElement(`trackInspector-${trackId}`);
    const effectsRackElement = getOpenWindowElement(`effectsRack-${trackId}`);
    const sequencerElement = getOpenWindowElement(`sequencerWin-${trackId}`);
    const mixerElement = getOpenWindowElement('mixer'); // Mixer is global

    try {
        switch(reason) {
            case 'nameChanged':
                // Update inspector window title
                if (inspectorElement) {
                    const inspectorWindowInstance = getWindowByIdState(`trackInspector-${trackId}`);
                    if (inspectorWindowInstance) {
                        inspectorWindowInstance.title = `Inspector: ${track.name}`; // Update internal title
                        const titleSpan = inspectorElement.querySelector('.window-title-bar span');
                        if (titleSpan) titleSpan.textContent = inspectorWindowInstance.title;
                        if (inspectorWindowInstance.taskbarButton) {
                             inspectorWindowInstance.taskbarButton.textContent = inspectorWindowInstance.title.substring(0, 20) + (inspectorWindowInstance.title.length > 20 ? '...' : '');
                             inspectorWindowInstance.taskbarButton.title = inspectorWindowInstance.title;
                        }
                    }
                }
                // Update effects rack window title
                if (effectsRackElement) {
                     const effectsRackWindowInstance = getWindowByIdState(`effectsRack-${trackId}`);
                    if (effectsRackWindowInstance) {
                        effectsRackWindowInstance.title = `Effects: ${track.name}`;
                        const titleSpan = effectsRackElement.querySelector('.window-title-bar span');
                        if (titleSpan) titleSpan.textContent = effectsRackWindowInstance.title;
                         if (effectsRackWindowInstance.taskbarButton) {
                             effectsRackWindowInstance.taskbarButton.textContent = effectsRackWindowInstance.title.substring(0, 20) + (effectsRackWindowInstance.title.length > 20 ? '...' : '');
                             effectsRackWindowInstance.taskbarButton.title = effectsRackWindowInstance.title;
                        }
                        const rackTitleHeader = effectsRackElement.querySelector(`#effectsRackContent-${track.id} h3`);
                        if (rackTitleHeader) rackTitleHeader.textContent = `Effects Rack: ${track.name}`;
                    }
                }
                // Update sequencer window title and internal display
                if (sequencerElement) {
                    const sequencerWindowInstance = getWindowByIdState(`sequencerWin-${trackId}`);
                    const activeSequence = track.getActiveSequence();
                    const seqTitleText = activeSequence ? `${track.name} - ${activeSequence.name}` : track.name;
                    if (sequencerWindowInstance) {
                        sequencerWindowInstance.title = `Sequencer: ${seqTitleText}`;
                        const titleSpan = sequencerElement.querySelector('.window-title-bar span');
                        if (titleSpan) titleSpan.textContent = sequencerWindowInstance.title;
                        if (sequencerWindowInstance.taskbarButton) {
                             sequencerWindowInstance.taskbarButton.textContent = sequencerWindowInstance.title.substring(0, 20) + (sequencerWindowInstance.title.length > 20 ? '...' : '');
                             sequencerWindowInstance.taskbarButton.title = sequencerWindowInstance.title;
                        }
                        // Update the title within the sequencer controls
                        const seqControlsTitleSpan = sequencerElement.querySelector(`.sequencer-container .controls span`);
                        if (seqControlsTitleSpan && activeSequence) {
                             const numBars = activeSequence.length > 0 ? Math.max(1, activeSequence.length / Constants.STEPS_PER_BAR) : 1;
                             const totalSteps = activeSequence.length > 0 ? activeSequence.length : Constants.defaultStepsPerBar;
                             seqControlsTitleSpan.textContent = `${track.name} - ${numBars} Bar${numBars > 1 ? 's' : ''} (${totalSteps} steps)`;
                        }
                    }
                }
                // Update mixer display
                if (mixerElement && typeof updateMixerWindow === 'function') {
                    updateMixerWindow(); // This will re-render the whole mixer
                }
                // Update timeline display
                if (typeof renderTimeline === 'function') {
                    renderTimeline();
                }
                break;
            case 'muteChanged':
            case 'soloChanged':
            case 'armChanged':
                if (inspectorElement) {
                    const muteBtn = inspectorElement.querySelector(`#muteBtn-${track.id}`);
                    if (muteBtn) { muteBtn.classList.toggle('muted', track.isMuted); muteBtn.textContent = track.isMuted ? 'Unmute' : 'Mute'; }
                    const soloBtn = inspectorElement.querySelector(`#soloBtn-${track.id}`);
                    if (soloBtn) { soloBtn.classList.toggle('soloed', getSoloedTrackIdState() === track.id); soloBtn.textContent = getSoloedTrackIdState() === track.id ? 'Unsolo' : 'Solo'; }
                    const armBtn = inspectorElement.querySelector(`#armInputBtn-${track.id}`);
                    if (armBtn) armBtn.classList.toggle('armed', getArmedTrackIdState() === track.id);
                }
                if (mixerElement && typeof updateMixerWindow === 'function') updateMixerWindow();
                break;
            case 'effectsListChanged':
                 if (effectsRackElement && typeof renderEffectsList === 'function') {
                    const listDiv = effectsRackElement.querySelector(`#effectsList-${track.id}`);
                    const controlsContainer = effectsRackElement.querySelector(`#effectControlsContainer-${track.id}`);
                    if (listDiv && controlsContainer) {
                        renderEffectsList(track, 'track', listDiv, controlsContainer);
                        // If the currently displayed controls were for an effect that was removed, clear controls
                        if (!track.activeEffects.some(ef => controlsContainer.innerHTML.includes(ef.type))) {
                            controlsContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic">Select an effect.</p>';
                        }
                    }
                 }
                break;
            case 'samplerLoaded':
            case 'instrumentSamplerLoaded':
                if (inspectorElement) {
                    if (track.type === 'Sampler' && typeof drawWaveform === 'function' && typeof renderSamplePads === 'function' && typeof updateSliceEditorUI === 'function') {
                        drawWaveform(track); renderSamplePads(track); updateSliceEditorUI(track);
                    } else if (track.type === 'InstrumentSampler' && typeof drawInstrumentWaveform === 'function') {
                        drawInstrumentWaveform(track);
                        // Potentially update other InstrumentSampler specific UI here if needed
                        const loopStartInput = inspectorElement.querySelector(`#instrumentLoopStart-${track.id}`);
                        if (loopStartInput) loopStartInput.value = track.instrumentSamplerSettings.loopStart?.toFixed(3) || '0.000';
                        const loopEndInput = inspectorElement.querySelector(`#instrumentLoopEnd-${track.id}`);
                        if (loopEndInput) loopEndInput.value = track.instrumentSamplerSettings.loopEnd?.toFixed(3) || (track.instrumentSamplerSettings.audioBuffer?.duration.toFixed(3) || '0.000');
                    }
                    // Update DropZone
                    const dzContainerId = track.type === 'Sampler' ? `#dropZoneContainer-${track.id}-sampler` : `#dropZoneContainer-${track.id}-instrumentsampler`;
                    const dzContainer = inspectorElement.querySelector(dzContainerId);
                    if(dzContainer) {
                        const audioData = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                        const inputId = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;
                        dzContainer.innerHTML = createDropZoneHTML(track.id, inputId, track.type, null, {originalFileName: audioData?.fileName || audioData?.originalFileName, status: 'loaded'});
                        const fileInputEl = dzContainer.querySelector(`#${inputId}`);
                        const loadFn = appServices.loadSampleFile; // General sample loader
                        if (fileInputEl && loadFn) fileInputEl.onchange = (e) => loadFn(e, track.id, track.type); // Pass track.type
                        const newDropZoneDiv = dzContainer.querySelector('.drop-zone');
                        if (newDropZoneDiv && typeof setupGenericDropZoneListeners === 'function') {
                           setupGenericDropZoneListeners(newDropZoneDiv, track.id, track.type, null, appServices.loadSoundFromBrowserToTarget, loadFn, appServices.getTrackById);
                        }
                    }
                }
                break;
            case 'drumPadLoaded': // Detail should be padIndex
                 if (inspectorElement && typeof updateDrumPadControlsUI === 'function' && typeof renderDrumSamplerPads === 'function') {
                    updateDrumPadControlsUI(track); // This should handle the specific pad's dropzone
                    renderDrumSamplerPads(track); // Re-render all pads to reflect loaded status
                 }
                break;
            case 'sequencerContentChanged':
            case 'sliceOrPadCountChanged': // Added to handle recompilation of sequencer
                const seqWinInstance = getWindowByIdState(`sequencerWin-${trackId}`);
                if (seqWinInstance && seqWinInstance.element && typeof openTrackSequencerWindow === 'function') {
                    console.log(`[Main UI Update] Re-opening sequencer for track ${trackId} due to ${reason}.`);
                    const currentWinStateForRedraw = { // Capture current window state before closing
                        id: seqWinInstance.id, title: seqWinInstance.title,
                        left: seqWinInstance.element.style.left, top: seqWinInstance.element.style.top,
                        width: seqWinInstance.element.style.width, height: seqWinInstance.element.style.height,
                        zIndex: parseInt(seqWinInstance.element.style.zIndex, 10) || seqWinInstance.options.zIndex,
                        isMinimized: seqWinInstance.isMinimized, isMaximized: seqWinInstance.isMaximized,
                        restoreState: seqWinInstance.isMaximized ? JSON.parse(JSON.stringify(seqWinInstance.restoreState)) : {},
                        initialContentKey: seqWinInstance.initialContentKey || seqWinInstance.id
                    };
                    // No need to manually close here if openTrackSequencerWindow handles forceRedraw correctly
                    openTrackSequencerWindow(trackId, true, currentWinStateForRedraw); // forceRedraw = true
                } else if (seqWinInstance && !seqWinInstance.element && typeof openTrackSequencerWindow === 'function') {
                    // Window instance exists in map but element is gone (e.g. bad close)
                    console.warn(`[Main UI Update] Sequencer window for ${trackId} was in map but element missing. Reopening fresh.`);
                    openTrackSequencerWindow(trackId, true, null); // Force redraw, no saved state
                }
                // If it's a change that affects timeline representation of sequences
                if (appServices.renderTimeline && typeof appServices.renderTimeline === 'function' && (reason === 'sequencerContentChanged' || reason === 'nameChanged')) {
                    appServices.renderTimeline();
                }
                break;
            case 'sampleSliced': // Sampler specific after auto-slicing
                if (inspectorElement && track.type === 'Sampler') {
                    if (typeof drawWaveform === 'function') drawWaveform(track);
                    if (typeof renderSamplePads === 'function') renderSamplePads(track);
                    if (typeof updateSliceEditorUI === 'function') updateSliceEditorUI(track);
                }
                // If sequencer is open for this sampler track, it also needs to be redrawn due to slice count change
                const samplerSeqWin = getWindowByIdState(`sequencerWin-${trackId}`);
                 if (samplerSeqWin && samplerSeqWin.element && track.type === 'Sampler' && typeof openTrackSequencerWindow === 'function') {
                    console.log(`[Main UI Update] Re-opening sequencer for Sampler track ${trackId} due to sampleSliced.`);
                    const currentSamplerSeqState = { /* ... capture state ... */ }; // As above
                    openTrackSequencerWindow(trackId, true, currentSamplerSeqState);
                }
                break;
            case 'sampleLoadError': // Detail might be padIndex for DrumSampler
                if (inspectorElement) {
                    console.warn(`[Main UI Update] Handling sampleLoadError for track ${trackId}. Detail (padIndex if DrumSampler): ${detail}`);
                    if (track.type === 'DrumSampler' && typeof detail === 'number' && typeof updateDrumPadControlsUI === 'function') {
                        updateDrumPadControlsUI(track); // This will update the specific pad's dropzone to error state
                    } else if (track.type === 'Sampler' || track.type === 'InstrumentSampler') {
                        const dzKey = track.type === 'Sampler' ? 'sampler' : 'instrumentsampler';
                        const dzContainer = inspectorElement.querySelector(`#dropZoneContainer-${track.id}-${dzKey}`);
                        const audioDataSource = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                        const inputIdForError = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;

                        if(dzContainer && audioDataSource) {
                            dzContainer.innerHTML = createDropZoneHTML(track.id, inputIdForError, track.type, null, {originalFileName: audioDataSource.fileName || audioDataSource.originalFileName, status: 'error'});
                            const fileInputEl = dzContainer.querySelector(`#${inputIdForError}`);
                            const loadFn = appServices.loadSampleFile;
                            if (fileInputEl && loadFn) fileInputEl.onchange = (e) => loadFn(e, track.id, track.type);
                            const newDropZoneDiv = dzContainer.querySelector('.drop-zone');
                            if (newDropZoneDiv && typeof setupGenericDropZoneListeners === 'function') {
                               setupGenericDropZoneListeners(newDropZoneDiv, track.id, track.type, null, appServices.loadSoundFromBrowserToTarget, loadFn, appServices.getTrackById);
                            }
                        }
                    }
                }
                break;
            default:
                console.warn(`[Main handleTrackUIUpdate] Unhandled UI update reason: "${reason}" for track ${trackId}`);
        }
    } catch (error) {
        console.error(`[Main handleTrackUIUpdate] Error during UI update for track ${trackId} (Reason: ${reason}):`, error);
    }
}

// --- Application Initialization ---
async function initializeSnugOS() {
    console.log("[Main initializeSnugOS] Starting SnugOS initialization...");

    try {
        // Phase 1: Cache essential DOM elements
        Object.keys(uiElementsCache).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                 uiElementsCache[key] = element;
            } else {
                // Only warn for truly critical elements not found, others might be optional or part of dynamic windows
                if (['desktop', 'taskbar', 'notification-area', 'modalContainer', 'startButton', 'startMenu', 'taskbarButtonsContainer'].includes(key)) {
                    console.error(`[Main initializeSnugOS] CRITICAL UI Element ID "${key}" NOT FOUND in DOM. Application might not function correctly.`);
                }
            }
        });
        console.log("[Main initializeSnugOS] UI elements cached.");

        // Phase 2: Initialize core modules with appServices
        // Effects Registry needs to be loaded first as other modules might depend on its definitions
        try {
            const effectsRegistry = await import('./effectsRegistry.js');
            if (appServices.effectsRegistryAccess) {
                appServices.effectsRegistryAccess.AVAILABLE_EFFECTS = effectsRegistry.AVAILABLE_EFFECTS || {};
                appServices.effectsRegistryAccess.getEffectParamDefinitions = effectsRegistry.getEffectParamDefinitions || (() => []);
                appServices.effectsRegistryAccess.getEffectDefaultParams = effectsRegistry.getEffectDefaultParams || (() => ({}));
                appServices.effectsRegistryAccess.synthEngineControlDefinitions = effectsRegistry.synthEngineControlDefinitions || {};
                console.log("[Main initializeSnugOS] Effects registry dynamically imported and assigned to appServices.");
            } else {
                console.error("[Main initializeSnugOS] appServices.effectsRegistryAccess is not defined before attempting to assign registry data.");
            }
        } catch (registryError) {
            console.error("[Main initializeSnugOS] FATAL: Failed to import effectsRegistry.js:", registryError);
            utilShowNotification("Critical error: Failed to load audio effects definitions. Application may not work.", 7000);
            // Depending on severity, might want to halt further initialization
        }

        // Initialize other modules
        if (typeof initializeStateModule === 'function') initializeStateModule(appServices); else console.error("initializeStateModule is not a function!");
        if (typeof initializeUIModule === 'function') initializeUIModule(appServices); else console.error("initializeUIModule is not a function!");
        if (typeof initializeGlobalControlsUIModule === 'function') initializeGlobalControlsUIModule(appServices); else console.warn("initializeGlobalControlsUIModule not found.");
        if (typeof initializeAudioModule === 'function') initializeAudioModule(appServices); else console.error("initializeAudioModule is not a function!");
        if (typeof initializeEventHandlersModule === 'function') initializeEventHandlersModule(appServices); else console.error("initializeEventHandlersModule is not a function!");
        console.log("[Main initializeSnugOS] Core modules initialized.");

        // Phase 3: Setup primary event listeners (dependent on UI cache and some appServices)
        if (typeof initializePrimaryEventListeners === 'function') {
             initializePrimaryEventListeners(appServices); // Pass appServices here
             console.log("[Main initializeSnugOS] Primary event listeners initialized.");
        } else { console.error("initializePrimaryEventListeners is not a function!");}

        // Phase 4: Setup specific UI components like Global Controls (which then sets up MIDI)
        if (typeof openGlobalControlsWindow === 'function') {
            console.log("[Main initializeSnugOS] Opening Global Controls Window...");
            openGlobalControlsWindow((elements) => { // This callback receives the UI elements from the global controls window
                if (elements) {
                    console.log("[Main initializeSnugOS] Global Controls Window ready, elements received.");
                    // Populate cache with elements from the global controls window
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

                    // Now that these elements are confirmed to exist, attach their specific event handlers
                    if (typeof attachGlobalControlEvents === 'function') attachGlobalControlEvents(elements); else console.error("attachGlobalControlEvents is not a function!");
                    if (typeof setupMIDI === 'function') setupMIDI(); else console.error("setupMIDI is not a function!"); // MIDI setup might depend on midiInputSelectGlobal
                    console.log("[Main initializeSnugOS] Global controls event listeners and MIDI setup initiated.");
                } else { console.error("[Main initializeSnugOS] Global controls elements NOT received in onReadyCallback from openGlobalControlsWindow.");}
            }, null); // null for savedState on initial open
        } else { console.error("openGlobalControlsWindow is not a function!");}

        // Phase 5: Load persistent settings and assets
        if (uiElementsCache.customBgInput) {
            uiElementsCache.customBgInput.addEventListener('change', handleCustomBackgroundUpload);
        }
        try {
            const storedImageBlob = await appServices.dbGetItem(DESKTOP_BACKGROUND_IDB_KEY);
            if (storedImageBlob) {
                if (currentBackgroundImageObjectURL) { URL.revokeObjectURL(currentBackgroundImageObjectURL); }
                currentBackgroundImageObjectURL = URL.createObjectURL(storedImageBlob);
                applyDesktopBackground(currentBackgroundImageObjectURL);
                console.log("[Main initializeSnugOS] Loaded custom desktop background from IndexedDB.");
            } else {
                // No custom background in DB, apply default
                applyDesktopBackground(null);
                console.log("[Main initializeSnugOS] No custom background in DB, applied default.");
            }
        } catch (error) {
            console.error("Error loading desktop background on init:", error);
            applyDesktopBackground(null); // Fallback to default
        }

        if (Constants.soundLibraries && typeof fetchSoundLibrary === 'function') {
            console.log("[Main initializeSnugOS] Auto-fetching sound libraries...");
            Object.entries(Constants.soundLibraries).forEach(([name, url]) => fetchSoundLibrary(name, url, true));
        }

        // Phase 6: Open default windows and start UI loops
        if (appServices.openTimelineWindow && typeof appServices.openTimelineWindow === 'function') {
            appServices.openTimelineWindow();
            console.log("[Main initializeSnugOS] Timeline window opened.");
        } else { console.warn("[Main initializeSnugOS] appServices.openTimelineWindow not available to open by default."); }

        requestAnimationFrame(updateMetersLoop);
        console.log("[Main initializeSnugOS] Meter update loop started.");

        if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI(null, null); // Initialize button states

        if (appServices.onPlaybackModeChange && typeof getPlaybackModeState === 'function') { // Initialize playback mode UI
            appServices.onPlaybackModeChange(getPlaybackModeState());
        }

        utilShowNotification(`Welcome to SnugOS ${Constants.APP_VERSION}! Initializing...`, 2500);
        console.log(`[Main initializeSnugOS] SnugOS Version ${Constants.APP_VERSION} Initialization Sequence Complete.`);

    } catch (initError) {
        console.error("CRITICAL ERROR during SnugOS Initialization:", initError);
        utilShowNotification("A critical error occurred during application startup. Please refresh.", 10000);
        // Display a more user-friendly error message on the page itself
        const body = document.body;
        if (body) {
            body.innerHTML = `<div style="padding: 30px; text-align: center; font-family: 'Inter', sans-serif; color: #e0e0e0; background-color: #101010; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;"><h1>Initialization Error</h1><p>SnugOS could not start due to a critical error. Please check the developer console for details and try refreshing the page. If the issue persists, the application might be unstable.</p><p style="font-size: 0.8em; margin-top: 20px; color: #ff6b6b;">Error: ${initError.message}</p></div>`;
        }
    }
}

function updateMetersLoop() {
    try {
        if (typeof updateMeters === 'function') {
            const mixerWindow = getWindowByIdState ? getWindowByIdState('mixer') : null;
            const mixerMasterMeterBar = mixerWindow?.element && !mixerWindow.isMinimized ? mixerWindow.element.querySelector('#mixerMasterMeterBar') : null;
            const tracks = getTracksState ? getTracksState() : [];
            updateMeters(uiElementsCache.masterMeterBarGlobal, mixerMasterMeterBar, tracks);
        }
        if (typeof updatePlayheadPosition === 'function') {
            updatePlayheadPosition();
        }
    } catch (loopError) {
        console.warn("[Main updateMetersLoop] Error in UI update loop:", loopError);
        // Avoid flooding console if it's a persistent minor issue in the loop
    }
    requestAnimationFrame(updateMetersLoop);
}

// --- Global Event Listeners ---
window.addEventListener('load', initializeSnugOS);

window.addEventListener('beforeunload', (e) => {
    // Check if there's anything worth warning about (e.g., unsaved changes)
    const tracksExist = getTracksState && getTracksState().length > 0;
    const undoStackExists = getUndoStackState && getUndoStackState().length > 0; // Check if undo stack has items

    if (tracksExist || undoStackExists) { // Basic check for "unsaved" work
        const confirmationMessage = "You have unsaved changes. Are you sure you want to leave?";
        e.preventDefault(); // Standard practice
        e.returnValue = confirmationMessage; // For older browsers
        return confirmationMessage; // For modern browsers
    }
    // Clean up object URLs
    if (currentBackgroundImageObjectURL) {
        URL.revokeObjectURL(currentBackgroundImageObjectURL);
        console.log("[Main beforeunload] Revoked currentBackgroundImageObjectURL.");
    }
});

console.log(`SCRIPT EXECUTION FINISHED - SnugOS (main.js - Version ${Constants.APP_VERSION})`);
