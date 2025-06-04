// js/main.js - Main Application Logic Orchestrator

// --- Module Imports ---
import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import * as Utils from './utils.js'; // Assuming full import for appServices
import * as EventHandlers from './eventHandlers.js';
import * as State from './state.js';
import * as AudioModule from './audio.js';
import * as UI from './ui.js'; // Assuming your ui.js is the browserCoreUI equivalent
import * as GlobalControlsUI from './globalControlsUI.js'; // If you have this separated
import * as EffectsRegistry from './effectsRegistry.js';
import * as DB from './db.js';

console.log(`[Main] SnugOS v${Constants.APP_VERSION} - Script Execution Started (after imports)`);

const uiElementsCache = {};
let currentBackgroundImageObjectURL = null;
const DESKTOP_BACKGROUND_IDB_KEY = 'snugosDesktopBackground_IDB_v2'; // From your state.js

// --- appServices Definition (using the structure from your latest main.js) ---
const appServices = {
    uiElementsCache,
    _isReconstructingDAW_flag: false,
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag === true,
    effectsRegistryAccess: EffectsRegistry,
    showNotification: Utils.showNotification, // Direct from your new utils.js
    showConfirmationDialog: Utils.showConfirmationDialog, // Direct
    createContextMenu: Utils.createContextMenu, // Direct
    snapTimeToGrid: Utils.snapTimeToGrid, // Direct

    newProject: () => {
        Utils.showConfirmationDialog("Create a new project? All unsaved changes will be lost.", () => {
            window.location.reload();
        });
    },
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),

    // State Getters (direct mapping from your new main.js)
    getTracksState: State.getTracksState,
    getTrackById: State.getTrackByIdState,
    getOpenWindowsState: State.getOpenWindowsState,
    getWindowById: State.getWindowByIdState, // Corrected name
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
    getPlaybackMode: State.getPlaybackModeState, // Corrected name
    getArmedTrackId: State.getArmedTrackIdState,
    getSoloedTrackId: State.getSoloedTrackIdState,
    getSelectedTimelineClipInfo: State.getSelectedTimelineClipInfoState,
    getRecordingTrackId: State.getRecordingTrackIdState,
    getRecordingStartTime: State.getRecordingStartTimeState,
    isGlobalRecordingActiveState: State.isGlobalRecordingActiveState, // From your state.js
    getUndoStackState: State.getUndoStackState,
    getRedoStackState: State.getRedoStackState,
    getCurrentThemeState: State.getCurrentThemeState,
    
    // State Setters & Core Actions
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

    // Audio services
    initAudioContextAndMasterMeter: AudioModule.initAudioContextAndMasterMeter,
    updateMeters: AudioModule.updateMeters,
    togglePlayback: AudioModule.togglePlayback, // Will be wired up if exists in EventHandlers
    stopPlayback: AudioModule.stopPlayback,     // Will be wired up if exists in EventHandlers
    toggleRecording: AudioModule.toggleRecording, // Will be wired up if exists in EventHandlers
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
    getActualMasterGainNode: AudioModule.getActualMasterGainNode,
    clearAllMasterEffectNodes: AudioModule.clearAllMasterEffectNodes,
    startAudioRecording: AudioModule.startAudioRecording,
    stopAudioRecording: AudioModule.stopAudioRecording,
    addMasterEffectToAudio: AudioModule.addMasterEffectToAudio,
    removeMasterEffectFromAudio: AudioModule.removeMasterEffectFromAudio,
    updateMasterEffectParamInAudio: AudioModule.updateMasterEffectParamInAudio,
    reorderMasterEffectInAudio: AudioModule.reorderMasterEffectInAudio,
    _rechainMasterEffectsAudio: AudioModule._rechainMasterEffectsAudio,

    // DB services
    dbStoreItem: DB.storeAudio,
    dbGetItem: DB.getAudio,
    dbDeleteItem: DB.deleteAudio,

    // Effects Management (Combined logic using state and audio methods above)
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

    // UI services (from UI module - assuming ui.js is your browserCoreUI)
    initializeUIModule: UI.initializeUIModule,
    openSoundBrowserWindow: UI.openSoundBrowserWindow,
    updateSoundBrowserDisplayForLibrary: UI.updateSoundBrowserDisplayForLibrary,
    showAddTrackModal: UI.showAddTrackModal,
    showAddEffectModal: UI.showAddEffectModal,
    openTrackInspectorWindow: UI.openTrackInspectorWindow,
    openTrackEffectsRackWindow: UI.openTrackEffectsRackWindow,
    openMasterEffectsRackWindow: UI.openMasterEffectsRackWindow,
    openArrangementWindow: UI.openArrangementWindow,
    openSequencerWindow: UI.openSequencerWindow,
    openMixerWindow: UI.openMixerWindow,
    updateMixerWindow: UI.updateMixerWindow,
    updateTheme: UI.updateTheme,
    getTheme: UI.getTheme,
    closeAllTrackWindows: UI.closeAllTrackWindows,
    updateTrackUI: UI.updateTrackUI, // This might be your main.js handleTrackUIUpdate
    highlightPlayingStep: UI.highlightPlayingStep,
    drawWaveform: UI.drawWaveform,
    drawInstrumentWaveform: UI.drawInstrumentWaveform,
    renderSamplePads: UI.renderSamplePads,
    updateSliceEditorUI: UI.updateSliceEditorUI,
    updateDrumPadControlsUI: UI.updateDrumPadControlsUI,
    renderDrumSamplerPads: UI.renderDrumSamplerPads,
    renderEffectsList: UI.renderEffectsList,
    renderEffectControls: UI.renderEffectControls,
    createKnob: UI.createKnob, // From UI module
    updateSequencerCellUI: UI.updateSequencerCellUI,
    renderTimeline: UI.renderTimeline,
    updatePlayheadPosition: UI.updatePlayheadPosition,

    // Global Controls UI
    openGlobalControlsWindow: GlobalControlsUI.openGlobalControlsWindow,
    updateMasterEffectsRackUI: () => {
        const rackWindow = appServices.getWindowById('masterEffectsRack');
        if (rackWindow?.element && !rackWindow.isMinimized && typeof UI.renderEffectsList === 'function') {
            const listDiv = rackWindow.element.querySelector('#effectsList-master');
            const controlsContainer = rackWindow.element.querySelector('#effectControlsContainer-master');
            if (listDiv && controlsContainer) UI.renderEffectsList(null, 'master', listDiv, controlsContainer);
        }
    },
    
    // Event Handler Passthroughs (use functions from EventHandlers module)
    selectMIDIInput: EventHandlers.selectMIDIInput,
    handleTimelineLaneDrop: (event, targetTrackId, startTime) => EventHandlers.handleTimelineLaneDrop(event, targetTrackId, startTime, appServices),
    handleTrackMute: EventHandlers.handleTrackMute,
    handleTrackSolo: EventHandlers.handleTrackSolo,
    handleTrackArm: EventHandlers.handleTrackArm,
    handleRemoveTrack: EventHandlers.handleRemoveTrack,
    handleOpenTrackInspector: EventHandlers.handleOpenTrackInspector,
    handleOpenEffectsRack: EventHandlers.handleOpenEffectsRack,
    handleOpenSequencer: EventHandlers.handleOpenSequencer,

    // Misc local appServices functions
    panicStopAllAudio: () => { /* ... as per your new main.js ... */
        console.log("[AppServices] Panic Stop All Audio requested.");
        if (typeof Tone !== 'undefined') {
            Tone.Transport.stop(); Tone.Transport.cancel(0);
        }
        const tracks = appServices.getTracksState();
        if (tracks) {
            tracks.forEach(track => {
                if (track && typeof track.stopPlayback === 'function') {
                    try { track.stopPlayback(); } catch (e) { console.warn(`Error stopping playback for track ${track.id}:`, e); }
                }
                 if (track && track.instrument && !track.instrument.disposed && typeof track.instrument.releaseAll === 'function') {
                    try {track.instrument.releaseAll(Tone.now());} catch(e) {console.warn(`Error releasing all on instrument for track ${track.id}:`, e);}
                }
            });
        }
        if (uiElementsCache.playBtnGlobal) uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>';
        if (uiElementsCache.playBtn) uiElementsCache.playBtn.innerHTML = '<i class="fas fa-play"></i>';

        const isRec = appServices.isGlobalRecordingActiveState ? appServices.isGlobalRecordingActiveState() : false;
        if (isRec) {
            if (appServices.stopAudioRecording) appServices.stopAudioRecording(); // Simplified: just stop any recording
            if (appServices.setIsRecording) appServices.setIsRecording(false);
            if (appServices.setRecordingTrackId) appServices.setRecordingTrackId(null);
            if (appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(false, !!appServices.getArmedTrackId());
        }
        appServices.showNotification("All audio stopped.", "info", 1500);
    },
    updateTaskbarTempoDisplay: (tempo) => {
        if (uiElementsCache.taskbarTempoDisplay) uiElementsCache.taskbarTempoDisplay.textContent = `${parseFloat(tempo).toFixed(1)} BPM`;
    },
    updateUndoRedoButtonsUI: (undoStateParam, redoStateParam) => {
        const undoBtn = uiElementsCache.menuUndo; const redoBtn = uiElementsCache.menuRedo;
        const undoStackCurrent = appServices.getUndoStackState ? appServices.getUndoStackState() : [];
        const redoStackCurrent = appServices.getRedoStackState ? appServices.getRedoStackState() : [];
        if (undoBtn) { const canUndo = undoStackCurrent.length > 0; undoBtn.classList.toggle('disabled', !canUndo); undoBtn.title = canUndo && undoStateParam ? `Undo: ${undoStateParam.actionName || 'action'}` : "Undo"; }
        if (redoBtn) { const canRedo = redoStackCurrent.length > 0; redoBtn.classList.toggle('disabled', !canRedo); redoBtn.title = canRedo && redoStateParam ? `Redo: ${redoStateParam.actionName || 'action'}` : "Redo"; }
    },
    updateRecordButtonUI: (isRec, isArmed) => { // Ensure isArmed is passed
        const recActive = isRec && isArmed;
        if (uiElementsCache.recordBtn) uiElementsCache.recordBtn.classList.toggle('text-red-500', recActive); // Adjusted class from your HTML
        if (uiElementsCache.recordBtnGlobal) uiElementsCache.recordBtnGlobal.classList.toggle('bg-red-700', recActive); // Keep consistency or adjust
    },
    closeAllWindows: (isReconstruction = false) => {
        const openWindows = appServices.getOpenWindowsState();
        if (openWindows) openWindows.forEach(win => win.close(isReconstruction));
        if(appServices.clearOpenWindowsMap) appServices.clearOpenWindowsMap();
    },
    clearOpenWindowsMap: () => State.getOpenWindowsState().clear(),
    triggerCustomBackgroundUpload: () => {
        const input = document.getElementById('file-input-background'); // Changed from customBgInput
        if (input) input.click();
    },
    removeCustomDesktopBackground: async () => {
        await appServices.dbDeleteItem(DESKTOP_BACKGROUND_IDB_KEY);
        if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
        currentBackgroundImageObjectURL = null;
        applyDesktopBackground(null);
        appServices.showNotification("Background removed.", "info", 2000);
    },
    onPlaybackModeChange: (newMode) => {
        const playbackBtn = uiElementsCache.playbackModeToggleBtnGlobal;
        if (playbackBtn) playbackBtn.textContent = newMode === 'timeline' ? 'Mode: Timeline' : 'Mode: Sequencer';
        if(appServices.renderTimeline) appServices.renderTimeline();
    },
    _transportEventsInitialized_flag: false,
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },
    getSelectedSoundForPreview: State.getSelectedSoundForPreviewState, // From state.js
    setSelectedSoundForPreview: State.setSelectedSoundForPreviewState,   // From state.js
};


function cacheUIElements() {
    // Using IDs from your new index.html
    uiElementsCache.desktop = document.getElementById('desktop');
    uiElementsCache.topTaskbar = document.getElementById('topTaskbar'); // New
    uiElementsCache.taskbar = document.getElementById('taskbar'); // Bottom taskbar
    uiElementsCache.startMenuButton = document.getElementById('startMenuButton'); // Corrected from startButton
    uiElementsCache.startMenu = document.getElementById('startMenu');
    // Taskbar buttons container is dynamic in SnugWindow, not cached here typically
    // uiElementsCache.taskbarButtonsContainer = document.getElementById('taskbarButtons');
    uiElementsCache.taskbarTempoDisplay = document.getElementById('taskbarTempoDisplay'); // Corrected from tempoDisplay in top bar
    
    // Top taskbar elements from your new index.html
    uiElementsCache.tempoDisplay = document.getElementById('tempoDisplay'); // This is in topTaskbar
    uiElementsCache.playBtn = document.getElementById('playBtn');
    uiElementsCache.stopBtn = document.getElementById('stopBtn');
    uiElementsCache.recordBtn = document.getElementById('recordBtn');
    uiElementsCache.masterMeter = document.getElementById('master-meter'); // This is the bar element
    uiElementsCache.cpuUsage = document.getElementById('cpu-usage');
    uiElementsCache.clock = document.getElementById('clock');

    // Start Menu items from your new index.html
    uiElementsCache.menuNewProject = document.getElementById('menuNewProject');
    uiElementsCache.menuAddSynthTrack = document.getElementById('menuAddSynthTrack');
    uiElementsCache.menuAddSamplerTrack = document.getElementById('menuAddSamplerTrack');
    uiElementsCache.menuAddDrumSamplerTrack = document.getElementById('menuAddDrumSamplerTrack');
    uiElementsCache.menuAddInstrumentSamplerTrack = document.getElementById('menuAddInstrumentSamplerTrack');
    uiElementsCache.menuAddAudioTrack = document.getElementById('menuAddAudioTrack');
    uiElementsCache.menuOpenSoundBrowser = document.getElementById('menuOpenSoundBrowser');
    uiElementsCache.menuOpenTimeline = document.getElementById('menuOpenTimeline');
    uiElementsCache.menuOpenGlobalControls = document.getElementById('menuOpenGlobalControls');
    uiElementsCache.menuOpenMixer = document.getElementById('menuOpenMixer');
    uiElementsCache.menuOpenMasterEffects = document.getElementById('menuOpenMasterEffects');
    uiElementsCache.menuUndo = document.getElementById('menuUndo');
    uiElementsCache.menuRedo = document.getElementById('menuRedo');
    uiElementsCache.menuSaveProject = document.getElementById('menuSaveProject');
    uiElementsCache.menuLoadProject = document.getElementById('menuLoadProject');
    uiElementsCache.menuExportWav = document.getElementById('menuExportWav');
    uiElementsCache.menuToggleFullScreen = document.getElementById('menuToggleFullScreen');
    
    // Hidden file inputs
    uiElementsCache.projectFileInput = document.getElementById('loadProjectInput'); // Corrected ID
    uiElementsCache.audioFileInput = document.getElementById('file-input-audio'); // New from index.html
    uiElementsCache.customBgInput = document.getElementById('file-input-background'); // Corrected ID
}

async function initializeSnugOS() {
    console.log(`[Main initializeSnugOS] Initializing SnugOS v${Constants.APP_VERSION}...`);
    cacheUIElements();
    
    // Initialize core services that populate appServices
    // This must happen before modules receive appServices
    initializeCoreServices(); 

    // Initialize modules, passing the now more complete appServices object
    State.initializeStateModule(appServices);
    AudioModule.initializeAudioModule(appServices);
    UI.initializeUIModule(appServices); 
    GlobalControlsUI.initializeGlobalControlsUIModule(appServices);
    EventHandlers.initializeEventHandlersModule(appServices);

    // MODIFICATION: Call EventHandlers.initializePrimaryEventListeners correctly
    if (typeof EventHandlers.initializePrimaryEventListeners === 'function') {
        EventHandlers.initializePrimaryEventListeners(appServices); // Pass appServices
    } else {
        console.error("EventHandlers.initializePrimaryEventListeners is not a function");
    }
    // END MODIFICATION

    await appServices.initAudioContextAndMasterMeter(true);

    appServices.openGlobalControlsWindow((elements) => {
        if (elements) {
            uiElementsCache.playBtnGlobal = elements.playBtnGlobal;
            uiElementsCache.recordBtnGlobal = elements.recordBtnGlobal;
            uiElementsCache.stopBtnGlobal = elements.stopBtnGlobal;
            uiElementsCache.tempoGlobalInput = elements.tempoGlobalInput;
            uiElementsCache.midiInputSelectGlobal = elements.midiInputSelectGlobal;
            uiElementsCache.masterMeterBarGlobal = elements.masterMeterBarGlobal; // Cache the bar for updates
            uiElementsCache.midiIndicatorGlobal = elements.midiIndicatorGlobal;
            uiElementsCache.keyboardIndicatorGlobal = elements.keyboardIndicatorGlobal;
            uiElementsCache.playbackModeToggleBtnGlobal = elements.playbackModeToggleBtnGlobal;
            
            if (typeof EventHandlers.attachGlobalControlEvents === 'function') {
                EventHandlers.attachGlobalControlEvents(elements);
            } else { console.error("EventHandlers.attachGlobalControlEvents is not a function");}
            
            if (typeof EventHandlers.setupMIDI === 'function') {
                EventHandlers.setupMIDI(); // setupMIDI uses localAppServices internally
            } else { console.error("EventHandlers.setupMIDI is not a function");}
        } else {
            console.error("[Main initializeSnugOS] GlobalControlsWindow onReadyCallback received null elements.");
        }
    });
    
    updateClock();
    setInterval(updateClock, 10000); // Update clock every 10s
    if (appServices.updateUndoRedoButtonsUI) {
        appServices.updateUndoRedoButtonsUI(null, null);
    }
    Utils.setupGenericDropZoneListeners(uiElementsCache.desktop, handleDesktopDrop);
    
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
    // ... (same as your new main.js)
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
    // ... (same as your new main.js, ensuring it uses uiElementsCache.cpuUsage etc.)
    let lastMeterUpdateTime = performance.now();
    const updateLoop = () => {
        if (appServices.updateMeters) { 
            appServices.updateMeters(
                uiElementsCache.masterMeter, // From topTaskbar
                uiElementsCache.masterMeterBarGlobal, // From GlobalControls window
                appServices.getTracksState ? appServices.getTracksState() : []
            );
        }
        if (appServices.updatePlayheadPosition) appServices.updatePlayheadPosition();

        if (performance.now() - lastMeterUpdateTime > 500) {
            // CPU Usage was removed due to Tone.context.draw.getValue() error
            // if (uiElementsCache.cpuUsage && typeof Tone !== 'undefined' && Tone.context?.draw) {
            //     const cpu = Tone.context.draw.getValue() * 100;
            //     uiElementsCache.cpuUsage.textContent = `CPU: ${cpu.toFixed(0)}%`;
            // }
            if (uiElementsCache.cpuUsage) uiElementsCache.cpuUsage.textContent = "CPU: --%"; // Placeholder

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
    // ... (same as your new main.js)
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
    // ... (same as your new main.js)
    const tracksExist = appServices.getTracksState && appServices.getTracksState().length > 0;
    const undoStackExists = appServices.getUndoStackState && appServices.getUndoStackState().length > 0;
    if ((tracksExist || undoStackExists) && !appServices.getIsReconstructingDAW()) {
        e.preventDefault(); e.returnValue = '';
        return "You have unsaved changes. Are you sure you want to leave?";
    }
    if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
});

console.log(`[Main] SnugOS v${Constants.APP_VERSION} - Script Execution Finished (end of file)`);
