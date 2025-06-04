// js/main.js - Main Application Logic Orchestrator

// --- Module Imports ---
import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import * as Utils from './utils.js';
import * as EventHandlers from './eventHandlers.js';
import * as State from './state.js';
import * as AudioModule from './audio.js';
// Corrected import based on your file structure:
import * as UI from './ui_modules/browserCoreUI.js'; // ENSURE THIS PATH IS CORRECT
import * as GlobalControlsUI from './globalControlsUI.js';
import * as EffectsRegistry from './effectsRegistry.js';
import * as DB from './db.js';

console.log(`[Main] SnugOS v${Constants.APP_VERSION} - Script Execution Started (after imports)`);

const uiElementsCache = {};
let currentBackgroundImageObjectURL = null;
const DESKTOP_BACKGROUND_IDB_KEY = 'snugosDesktopBackground_IDB_v2';

// --- appServices Definition ---
const appServices = {
    uiElementsCache,
    _isReconstructingDAW_flag: false,
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag === true,
    effectsRegistryAccess: EffectsRegistry,
    showNotification: Utils.showNotification,
    showConfirmationDialog: Utils.showConfirmationDialog,
    createContextMenu: Utils.createContextMenu,
    snapTimeToGrid: Utils.snapTimeToGrid,
    newProject: () => {
        Utils.showConfirmationDialog("Create a new project? All unsaved changes will be lost.", () => {
            window.location.reload();
        });
    },
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
    getTracksState: State.getTracksState,
    getTrackById: State.getTrackByIdState,
    getOpenWindowsState: State.getOpenWindowsState,
    getWindowById: State.getWindowByIdState,
    getHighestZState: State.getHighestZState,
    getMasterEffectsState: State.getMasterEffectsState,
    getMasterGainValueState: State.getMasterGainValueState,
    getMidiAccess: State.getMidiAccessState,
    getActiveMIDIInput: State.getActiveMIDIInputState,
    getLoadedZipFiles: State.getLoadedZipFilesState,
    getSoundLibraryFileTrees: State.getSoundLibraryFileTreesState,
    getCurrentLibraryName: State.getCurrentLibraryNameState,
    getCurrentSoundFileTree: State.getCurrentSoundFileTreeState,
    getCurrentSoundBrowserPath: State.getCurrentSoundBrowserPathState,
    getPreviewPlayer: State.getPreviewPlayerState,
    getPlaybackMode: State.getPlaybackModeState,
    getArmedTrackId: State.getArmedTrackIdState,
    getSoloedTrackId: State.getSoloedTrackIdState,
    getSelectedTimelineClipInfo: State.getSelectedTimelineClipInfoState,
    getRecordingTrackId: State.getRecordingTrackIdState,
    getRecordingStartTime: State.getRecordingStartTimeState,
    isGlobalRecordingActiveState: State.isGlobalRecordingActiveState,
    getUndoStackState: State.getUndoStackState,
    getRedoStackState: State.getRedoStackState,
    getCurrentThemeState: State.getCurrentThemeState,
    addWindowToStoreState: State.addWindowToStoreState,
    removeWindowFromStoreState: State.removeWindowFromStoreState,
    setHighestZState: State.setHighestZState,
    incrementHighestZState: State.incrementHighestZState,
    captureStateForUndoInternal: State.captureStateForUndoInternal,
    undo: State.undoLastActionInternal,
    redo: State.redoLastActionInternal,
    gatherProjectDataInternal: State.gatherProjectDataInternal,
    reconstructDAWInternal: State.reconstructDAWInternal,
    saveProject: State.saveProjectInternal,
    loadProject: State.loadProjectInternal,
    handleProjectFileLoad: State.handleProjectFileLoadInternal,
    exportToWav: State.exportToWavInternal,
    setCurrentThemeState: State.setCurrentThemeState,
    addTrack: (type, initialData) => State.addTrackToStateInternal(type, initialData, true, appServices),
    removeTrack: State.removeTrackFromStateInternal,
    addMasterEffectToState: State.addMasterEffectToState,
    removeMasterEffectFromState: State.removeMasterEffectFromState,
    updateMasterEffectParamInState: State.updateMasterEffectParamInState,
    reorderMasterEffectInState: State.reorderMasterEffectInState,
    setMidiAccessState: State.setMidiAccessState,
    setActiveMIDIInput: State.setActiveMIDIInputState,
    setLoadedZipFiles: State.setLoadedZipFilesState,
    setSoundLibraryFileTrees: State.setSoundLibraryFileTreesState,
    setCurrentLibraryName: State.setCurrentLibraryNameState,
    setCurrentSoundBrowserPath: State.setCurrentSoundBrowserPathState,
    setPreviewPlayer: State.setPreviewPlayerState,
    setPlaybackMode: State.setPlaybackModeState,
    setArmedTrackId: State.setArmedTrackIdState,
    setSoloedTrackId: State.setSoloedTrackIdState,
    setSelectedTimelineClip: State.setSelectedTimelineClipInfoState,
    setRecordingTrackId: State.setRecordingTrackIdState,
    setRecordingStartTime: State.setRecordingStartTimeState,
    setIsRecording: State.setIsRecordingState,
    setActiveSequencerTrackId: State.setActiveSequencerTrackIdState,
    setMasterGainValueState: State.setMasterGainValueState,
    initAudioContextAndMasterMeter: AudioModule.initAudioContextAndMasterMeter,
    updateMeters: AudioModule.updateMeters,
    togglePlayback: AudioModule.togglePlayback,
    stopPlayback: AudioModule.stopPlayback,
    toggleRecording: AudioModule.toggleRecording,
    setMasterVolume: AudioModule.setMasterVolume,
    loadAndPreviewSample: AudioModule.loadAndPreviewSample,
    fetchSoundLibrary: AudioModule.fetchSoundLibrary,
    loadSoundFromBrowserToTarget: AudioModule.loadSoundFromBrowserToTarget,
    playSlicePreview: AudioModule.playSlicePreview,
    playDrumSamplerPadPreview: AudioModule.playDrumSamplerPadPreview,
    loadSampleFile: AudioModule.loadSampleFile,
    loadDrumSamplerPadFile: AudioModule.loadDrumSamplerPadFile,
    autoSliceSample: AudioModule.autoSliceSample,
    getMimeTypeFromFilename: AudioModule.getMimeTypeFromFilename,
    getMasterEffectsBusInputNode: AudioModule.getMasterEffectsBusInputNode,
    getActualMasterGainNode: AudioModule.getActualMasterGainNodeFromAudio, // From your audio.js
    clearAllMasterEffectNodes: AudioModule.clearAllMasterEffectNodesInAudio, // From your audio.js
    startAudioRecording: AudioModule.startAudioRecording,
    stopAudioRecording: AudioModule.stopAudioRecording,
    addMasterEffectToAudio: AudioModule.addMasterEffectToAudio,
    removeMasterEffectFromAudio: AudioModule.removeMasterEffectFromAudio,
    updateMasterEffectParamInAudio: AudioModule.updateMasterEffectParamInAudio,
    reorderMasterEffectInAudio: AudioModule.reorderMasterEffectInAudio,
    _rechainMasterEffectsAudio: AudioModule._rechainMasterEffectsAudio,
    dbStoreItem: DB.storeAudio,
    dbGetItem: DB.getAudio,
    dbDeleteItem: DB.deleteAudio,
    addMasterEffect: async (effectType) => {
        if (!appServices.getIsReconstructingDAW()) appServices.captureStateForUndoInternal(`Add Master Effect: ${effectType}`);
        const defaultParams = appServices.effectsRegistryAccess.getEffectDefaultParams(effectType);
        const id = appServices.addMasterEffectToState(effectType, defaultParams);
        await appServices.addMasterEffectToAudio(id, effectType, defaultParams);
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    removeMasterEffect: async (effectId) => {
        const effect = appServices.getMasterEffectsState().find(e => e.id === effectId);
        if (effect && !appServices.getIsReconstructingDAW()) appServices.captureStateForUndoInternal(`Remove Master Effect: ${effect.type}`);
        appServices.removeMasterEffectFromState(effectId);
        await appServices.removeMasterEffectFromAudio(effectId);
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    updateMasterEffectParam: (effectId, paramPath, value) => {
        appServices.updateMasterEffectParamInState(effectId, paramPath, value);
        appServices.updateMasterEffectParamInAudio(effectId, paramPath, value);
    },
    reorderMasterEffect: (effectId, newIndex) => {
        if (!appServices.getIsReconstructingDAW()) appServices.captureStateForUndoInternal(`Reorder Master Effects`);
        appServices.reorderMasterEffectInState(effectId, newIndex);
        appServices.reorderMasterEffectInAudio(effectId, newIndex);
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    toggleBypassMasterEffect: (effectId) => {
        const effect = appServices.getMasterEffectsState().find(e => e.id === effectId);
        if (effect) {
            if (!appServices.getIsReconstructingDAW()) appServices.captureStateForUndoInternal(`Toggle Bypass Master Effect: ${effect.type}`);
            const newBypassState = !effect.isBypassed;
            appServices.updateMasterEffectParamInState(effectId, 'isBypassed', newBypassState);
            if(appServices._rechainMasterEffectsAudio) appServices._rechainMasterEffectsAudio();
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        }
    },
    getMasterEffectParamValue: (effectId, paramPath) => State.getMasterEffectParamValue(effectId, paramPath),
    initializeUIModule: UI.initializeUIModule,
    openSoundBrowserWindow: UI.openSoundBrowserWindow,
    updateSoundBrowserDisplayForLibrary: UI.updateSoundBrowserDisplayForLibrary,
    showAddTrackModal: UI.showAddTrackModal,
    showAddEffectModal: UI.showAddEffectModal,
    openTrackInspectorWindow: UI.openTrackInspectorWindow,
    openTrackEffectsRackWindow: UI.openTrackEffectsRackWindow,
    openMasterEffectsRackWindow: UI.openMasterEffectsRackWindow,
    openArrangementWindow: UI.openArrangementWindow, // This is UI.openArrangementWindow from browserCoreUI
    openTimelineWindow: UI.openTimelineWindow, // From your ui.js (browserCoreUI)
    openSequencerWindow: UI.openSequencerWindow,
    openMixerWindow: UI.openMixerWindow,
    updateMixerWindow: UI.updateMixerWindow,
    updateTheme: UI.updateTheme,
    getTheme: UI.getTheme,
    closeAllTrackWindows: UI.closeAllTrackWindows,
    updateTrackUI: UI.updateTrackUI,
    highlightPlayingStep: UI.highlightPlayingStep,
    drawWaveform: UI.drawWaveform,
    drawInstrumentWaveform: UI.drawInstrumentWaveform,
    renderSamplePads: UI.renderSamplePads,
    updateSliceEditorUI: UI.updateSliceEditorUI,
    updateDrumPadControlsUI: UI.updateDrumPadControlsUI,
    renderDrumSamplerPads: UI.renderDrumSamplerPads,
    renderEffectsList: UI.renderEffectsList,
    renderEffectControls: UI.renderEffectControls,
    createKnob: UI.createKnob,
    updateSequencerCellUI: UI.updateSequencerCellUI,
    renderTimeline: UI.renderTimeline,
    updatePlayheadPosition: UI.updatePlayheadPosition,
    openGlobalControlsWindow: GlobalControlsUI.openGlobalControlsWindow,
    updateMasterEffectsRackUI: () => { /* ... same as your main.js ... */
        const rackWindow = appServices.getWindowById('masterEffectsRack');
        if (rackWindow?.element && !rackWindow.isMinimized && typeof UI.renderEffectsList === 'function') {
            const listDiv = rackWindow.element.querySelector('#effectsList-master');
            const controlsContainer = rackWindow.element.querySelector('#effectControlsContainer-master');
            if (listDiv && controlsContainer) UI.renderEffectsList(null, 'master', listDiv, controlsContainer);
        }
    },
    selectMIDIInput: EventHandlers.selectMIDIInput,
    handleTimelineLaneDrop: (event, targetTrackId, startTime) => EventHandlers.handleTimelineLaneDrop(event, targetTrackId, startTime, appServices),
    handleTrackMute: EventHandlers.handleTrackMute,
    handleTrackSolo: EventHandlers.handleTrackSolo,
    handleTrackArm: EventHandlers.handleTrackArm,
    handleRemoveTrack: EventHandlers.handleRemoveTrack,
    handleOpenTrackInspector: EventHandlers.handleOpenTrackInspector,
    handleOpenEffectsRack: EventHandlers.handleOpenEffectsRack,
    handleOpenSequencer: EventHandlers.handleOpenSequencer,
    panicStopAllAudio: () => { /* ... same as your main.js ... */
        if (typeof Tone !== 'undefined') {
            Tone.Transport.stop(); Tone.Transport.cancel(0);
        }
        const tracks = appServices.getTracksState();
        if (tracks) {
            tracks.forEach(track => {
                if (track && typeof track.stopPlayback === 'function') { try { track.stopPlayback(); } catch (e) { console.warn(`Error stopping playback for track ${track.id}:`, e); } }
                if (track && track.instrument && !track.instrument.disposed && typeof track.instrument.releaseAll === 'function') { try {track.instrument.releaseAll(Tone.now());} catch(e) {console.warn(`Error releasing all on instrument for track ${track.id}:`, e);} }
            });
        }
        if (uiElementsCache.playBtnGlobal) uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>';
        if (uiElementsCache.playBtn) uiElementsCache.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        const isRec = appServices.isGlobalRecordingActiveState ? appServices.isGlobalRecordingActiveState() : false;
        if (isRec) {
            if (appServices.stopAudioRecording) appServices.stopAudioRecording();
            if (appServices.setIsRecording) appServices.setIsRecording(false);
            if (appServices.setRecordingTrackId) appServices.setRecordingTrackId(null);
            if (appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(false, !!(appServices.getArmedTrackId && appServices.getArmedTrackId()));
        }
        appServices.showNotification("All audio stopped.", "info", 1500);
    },
    updateTaskbarTempoDisplay: (tempo) => { /* ... same as your main.js ... */
        if (uiElementsCache.taskbarTempoDisplay) uiElementsCache.taskbarTempoDisplay.textContent = `${parseFloat(tempo).toFixed(1)} BPM`;
    },
    updateUndoRedoButtonsUI: (undoStateParam, redoStateParam) => { /* ... same as your main.js ... */
        const undoBtn = uiElementsCache.menuUndo; const redoBtn = uiElementsCache.menuRedo;
        const undoStackCurrent = appServices.getUndoStackState ? appServices.getUndoStackState() : [];
        const redoStackCurrent = appServices.getRedoStackState ? appServices.getRedoStackState() : [];
        if (undoBtn) { const canUndo = undoStackCurrent.length > 0; undoBtn.classList.toggle('disabled', !canUndo); undoBtn.title = canUndo && undoStateParam ? `Undo: ${undoStateParam.actionName || 'action'}` : "Undo"; }
        if (redoBtn) { const canRedo = redoStackCurrent.length > 0; redoBtn.classList.toggle('disabled', !canRedo); redoBtn.title = canRedo && redoStateParam ? `Redo: ${redoStateParam.actionName || 'action'}` : "Redo"; }
    },
    updateRecordButtonUI: (isRec, isArmed) => { /* ... same as your main.js ... */
        const recActive = isRec && isArmed;
        if (uiElementsCache.recordBtn) uiElementsCache.recordBtn.classList.toggle('text-red-500', recActive);
        if (uiElementsCache.recordBtnGlobal) uiElementsCache.recordBtnGlobal.classList.toggle('bg-red-700', recActive);
    },
    closeAllWindows: (isReconstruction = false) => { /* ... same as your main.js ... */
        const openWindows = appServices.getOpenWindowsState();
        if (openWindows) openWindows.forEach(win => win.close(isReconstruction));
        if(appServices.clearOpenWindowsMap) appServices.clearOpenWindowsMap();
    },
    clearOpenWindowsMap: () => State.getOpenWindowsState().clear(),
    triggerCustomBackgroundUpload: () => { /* ... same as your main.js ... */
        const input = uiElementsCache.customBgInput;
        if (input) input.click();
    },
    removeCustomDesktopBackground: async () => { /* ... same as your main.js ... */
        await appServices.dbDeleteItem(DESKTOP_BACKGROUND_IDB_KEY);
        if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
        currentBackgroundImageObjectURL = null;
        applyDesktopBackground(null);
        appServices.showNotification("Background removed.", "info", 2000);
    },
    onPlaybackModeChange: (newMode) => { /* ... same as your main.js ... */
        const playbackBtn = uiElementsCache.playbackModeToggleBtnGlobal;
        if (playbackBtn) playbackBtn.textContent = newMode === 'timeline' ? 'Mode: Timeline' : 'Mode: Sequencer';
        if(appServices.renderTimeline) appServices.renderTimeline();
    },
    _transportEventsInitialized_flag: false,
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },
    getSelectedSoundForPreview: State.getSelectedSoundForPreviewState,
    setSelectedSoundForPreview: State.setSelectedSoundForPreviewState,
    // Added from your new ui.js file, assuming it should be here
    getAudioBlobFromSoundBrowserItem: async (soundData) => {
        if (!soundData || !soundData.libraryName || !soundData.fullPath) {
            console.warn("[AppServices getAudioBlob] Invalid soundData:", soundData);
            return null;
        }
        const loadedZips = appServices.getLoadedZipFiles(); // Use appService getter
        if (loadedZips?.[soundData.libraryName] && loadedZips[soundData.libraryName] !== "loading") {
            const zipEntry = loadedZips[soundData.libraryName].file(soundData.fullPath);
            if (zipEntry) {
                try {
                    const blob = await zipEntry.async("blob");
                    return new File([blob], soundData.fileName, { type: appServices.getMimeTypeFromFilename(soundData.fileName) });
                } catch (e) {
                    console.error("[AppServices getAudioBlob] Error getting blob from zipEntry:", e);
                    return null;
                }
            } else {
                console.warn(`[AppServices getAudioBlob] ZipEntry not found for ${soundData.fullPath} in ${soundData.libraryName}`);
            }
        } else {
            console.warn(`[AppServices getAudioBlob] Library ${soundData.libraryName} not loaded or is loading.`);
        }
        return null;
    }
};

function initializeCoreServices() {
    // This function is now largely decorative as appServices is built with direct assignments.
    // However, if there was specific logic (e.g. conditional assignments) it would go here.
    // For now, we ensure EffectsRegistry is available on appServices if it wasn't directly assigned.
    if (!appServices.effectsRegistryAccess && EffectsRegistry) {
        appServices.effectsRegistryAccess = EffectsRegistry;
    }
}

function cacheUIElements() {
    uiElementsCache.desktop = document.getElementById('desktop');
    uiElementsCache.topTaskbar = document.getElementById('topTaskbar');
    uiElementsCache.taskbar = document.getElementById('taskbar');
    uiElementsCache.startMenuButton = document.getElementById('startMenuButton');
    uiElementsCache.startMenu = document.getElementById('startMenu');
    console.log("[Main cacheUIElements] startMenu found in DOM:", !!uiElementsCache.startMenu);

    uiElementsCache.taskbarTempoDisplay = document.getElementById('taskbarTempoDisplay');
    
    uiElementsCache.tempoDisplay = document.getElementById('tempoDisplay'); // In topTaskbar
    uiElementsCache.playBtn = document.getElementById('playBtn'); // In topTaskbar
    uiElementsCache.stopBtn = document.getElementById('stopBtn'); // In topTaskbar
    uiElementsCache.recordBtn = document.getElementById('recordBtn'); // In topTaskbar
    uiElementsCache.masterMeter = document.getElementById('master-meter');
    uiElementsCache.cpuUsage = document.getElementById('cpu-usage');
    uiElementsCache.clock = document.getElementById('clock');

    // Start Menu items from your index.html
    const menuItemsToCache = [
        'menuNewProject', 'menuAddSynthTrack', 'menuAddSamplerTrack', 
        'menuAddDrumSamplerTrack', 'menuAddInstrumentSamplerTrack', 'menuAddAudioTrack',
        'menuOpenSoundBrowser', 'menuOpenTimeline', 'menuOpenGlobalControls', 
        'menuOpenMixer', 'menuOpenMasterEffects', 'menuUndo', 'menuRedo', 
        'menuSaveProject', 'menuLoadProject', 'menuExportWav', 'menuToggleFullScreen'
    ];
    menuItemsToCache.forEach(id => {
        uiElementsCache[id] = document.getElementById(id);
        console.log(`[Main cacheUIElements] ${id} found in DOM:`, !!uiElementsCache[id]); // ADDED LOG
    });
    
    uiElementsCache.projectFileInput = document.getElementById('loadProjectInput');
    uiElementsCache.customBgInput = document.getElementById('customBgInput'); // Matching your index.html
    uiElementsCache.sampleFileInput = document.getElementById('sampleFileInput'); // Matching your index.html
    uiElementsCache.notificationArea = document.getElementById('notification-area');
    uiElementsCache.modalContainer = document.getElementById('modalContainer');
}

async function initializeSnugOS() {
    console.log(`[Main initializeSnugOS] Initializing SnugOS v${Constants.APP_VERSION}...`);
    cacheUIElements();
    
    initializeCoreServices(); 

    State.initializeStateModule(appServices);
    AudioModule.initializeAudioModule(appServices);
    // Assuming UI is browserCoreUI.js from ui_modules
    UI.initializeUIModule(appServices); 
    GlobalControlsUI.initializeGlobalControlsUIModule(appServices);
    EventHandlers.initializeEventHandlersModule(appServices);

    // Corrected call to EventHandlers' exported function
    if (typeof EventHandlers.initializePrimaryEventListeners === 'function') {
        EventHandlers.initializePrimaryEventListeners(appServices); 
    } else {
        console.error("EventHandlers.initializePrimaryEventListeners is not a function");
    }

    await appServices.initAudioContextAndMasterMeter(true);

    appServices.openGlobalControlsWindow((elements) => {
        if (elements) {
            uiElementsCache.playBtnGlobal = elements.playBtnGlobal;
            uiElementsCache.recordBtnGlobal = elements.recordBtnGlobal;
            uiElementsCache.stopBtnGlobal = elements.stopBtnGlobal;
            uiElementsCache.tempoGlobalInput = elements.tempoGlobalInput;
            uiElementsCache.midiInputSelectGlobal = elements.midiInputSelectGlobal;
            uiElementsCache.masterMeterBarGlobal = elements.masterMeterBarGlobal;
            uiElementsCache.midiIndicatorGlobal = elements.midiIndicatorGlobal;
            uiElementsCache.keyboardIndicatorGlobal = elements.keyboardIndicatorGlobal;
            uiElementsCache.playbackModeToggleBtnGlobal = elements.playbackModeToggleBtnGlobal;
            
            if (typeof EventHandlers.attachGlobalControlEvents === 'function') {
                EventHandlers.attachGlobalControlEvents(elements);
            } else { console.error("EventHandlers.attachGlobalControlEvents is not a function");}
            
            if (typeof EventHandlers.setupMIDI === 'function') {
                EventHandlers.setupMIDI();
            } else { console.error("EventHandlers.setupMIDI is not a function");}
        } else {
            console.error("[Main initializeSnugOS] GlobalControlsWindow onReadyCallback received null elements.");
        }
    }, null /* No saved state for initial global controls */ );
    
    updateClock();
    setInterval(updateClock, 10000);
    if (appServices.updateUndoRedoButtonsUI) {
        appServices.updateUndoRedoButtonsUI(null, null);
    }
    // Corrected setupGenericDropZoneListeners call
    if (uiElementsCache.desktop && typeof Utils.setupGenericDropZoneListeners === 'function') {
        // The third argument to setupGenericDropZoneListeners in your utils.js was fileInputId
        // For the desktop, we might not have a single file input ID, or it might be for background
        Utils.setupGenericDropZoneListeners(uiElementsCache.desktop, handleDesktopDrop, 'file-input-background', appServices);
    }
    
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

    console.log(`[Main initializeSnugOS] SnugOS Initialized and Ready.`);
    startPerformanceMonitor();
}

function handleDesktopDrop(file) {
    if (!file) return;
    if (file.name.endsWith('.snug')) {
        const eventLike = { target: { files: [file] } };
        appServices.handleProjectFileLoad(eventLike); 
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
            if (uiElementsCache.cpuUsage) uiElementsCache.cpuUsage.textContent = "CPU: --%"; 

            if (appServices.updateUndoRedoButtonsUI && appServices.getUndoStackState && appServices.getRedoStackState) {
                const undoStack = appServices.getUndoStackState();
                const redoStack = appServices.getRedoStackState();
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
        try {
            if (imageUrlOrObjectUrl) {
                uiElementsCache.desktop.style.backgroundImage = `url('${imageUrlOrObjectUrl}')`;
                uiElementsCache.desktop.style.backgroundSize = 'cover';
                uiElementsCache.desktop.style.backgroundPosition = 'center center';
                uiElementsCache.desktop.style.backgroundRepeat = 'no-repeat';
                uiElementsCache.desktop.style.backgroundColor = '';
            } else {
                uiElementsCache.desktop.style.backgroundImage = '';
                uiElementsCache.desktop.style.backgroundColor = Constants.defaultDesktopBg || '#101010';
            }
        } catch (e) {
            console.error("Error applying desktop background style:", e);
        }
    } else {
        console.warn("Desktop element not found in cache for applying background.");
    }
}

window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    const tracksExist = appServices.getTracksState && appServices.getTracksState().length > 0;
    const undoStackExists = appServices.getUndoStackState && appServices.getUndoStackState().length > 0;

    // Check if getIsReconstructingDAW exists and use it
    const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;

    if ((tracksExist || undoStackExists) && !isReconstructing) {
        e.preventDefault(); 
        e.returnValue = ''; 
        return "You have unsaved changes. Are you sure you want to leave?"; 
    }
    if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
});

console.log(`[Main] SnugOS v${Constants.APP_VERSION} - Script Execution Finished (end of file)`);
