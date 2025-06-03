// js/main.js - Main Application Logic Orchestrator (MODIFIED - Robust appServices)

// --- Module Imports ---
import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import * as Utils from './utils.js';
import * as EventHandlers from './eventHandlers.js';
import * as State from './state.js';
import * as AudioModule from './audio.js'; 
import * as UI from './ui_modules/browserCoreUI.js';
import * as GlobalControlsUI from './globalControlsUI.js';
import * as EffectsRegistry from './effectsRegistry.js';
import * as DB from './db.js';

// DEBUG: Log what's imported from AudioModule
console.log("[Main Pre-appServices] AudioModule content:", AudioModule);
console.log("[Main Pre-appServices] typeof AudioModule.loadAndPreviewSample from AudioModule:", typeof AudioModule.loadAndPreviewSample, AudioModule.loadAndPreviewSample);

console.log(`[Main] SnugOS v${Constants.APP_VERSION} - Script Execution Started (after imports)`);

const uiElementsCache = {};
let currentBackgroundImageObjectURL = null;
const DESKTOP_BACKGROUND_IDB_KEY = 'snugosDesktopBackground_IDB_v2';

// Helper for creating service wrappers to catch errors if functions are not defined
const createService = (module, functionName, moduleNameForError) => {
    return (...args) => {
        if (module && typeof module[functionName] === 'function') {
            return module[functionName](...args);
        }
        const errorMsg = `appService Error: ${moduleNameForError}.${functionName} is not available or not a function.`;
        console.error(errorMsg, "Module content:", module);
        if (Utils && typeof Utils.showNotification === 'function') {
            Utils.showNotification(errorMsg, "error", 5000);
        }
        if (functionName.startsWith("get") || functionName.startsWith("is")) return null;
        return Promise.reject(new Error(errorMsg)); 
    };
};

const appServices = {
    // --- Core App & Utilities ---
    uiElementsCache, 
    showNotification: (...args) => Utils.showNotification(...args), 
    showConfirmationDialog: (...args) => Utils.showConfirmationDialog(...args),
    createContextMenu: (...args) => Utils.createContextMenu(...args),
    snapTimeToGrid: (...args) => Utils.snapTimeToGrid(...args),
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag === true,
    _isReconstructingDAW_flag: false,
    newProject: () => { 
        Utils.showConfirmationDialog("Create a new project? All unsaved changes will be lost.", () => {
            window.location.reload();
        });
    },
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices), 

    // --- State Management ---
    getTracksState: () => State.getTracksState(),
    getTrackById: (id) => State.getTrackByIdState(id),
    getOpenWindowsState: () => State.getOpenWindowsState(),
    getWindowById: (id) => State.getWindowByIdState(id), // Directly from State module
    addWindowToStoreState: (id, instance) => State.addWindowToStoreState(id, instance),
    removeWindowFromStoreState: (id) => State.removeWindowFromStoreState(id),
    getHighestZState: () => State.getHighestZState(),
    incrementHighestZState: () => State.incrementHighestZState(),
    setHighestZState: (val) => State.setHighestZState(val),
    captureStateForUndoInternal: (name) => State.captureStateForUndoInternal(name),
    undo: () => State.undoLastActionInternal(),
    redo: () => State.redoLastActionInternal(),
    getUndoStackState: () => State.getUndoStackState(),
    getRedoStackState: () => State.getRedoStackState(),
    gatherProjectDataInternal: () => State.gatherProjectDataInternal(),
    reconstructDAWInternal: (data) => State.reconstructDAWInternal(data),
    saveProject: () => State.saveProjectInternal(),
    loadProject: () => State.loadProjectInternal(),
    handleProjectFileLoad: (file) => State.handleProjectFileLoadInternal(file),
    exportToWav: () => State.exportToWavInternal(),
    getCurrentThemeState: () => State.getCurrentThemeState(),
    setCurrentThemeState: (theme) => State.setCurrentThemeState(theme),

    // --- Track Management ---
    addTrack: (type, initialData) => State.addTrackToStateInternal(type, initialData, true, appServices), 
    removeTrack: (trackId) => State.removeTrackFromStateInternal(trackId),

    // --- Audio Engine ---
    initAudioContextAndMasterMeter: (force) => AudioModule.initAudioContextAndMasterMeter(force),
    updateMeters: (...args) => AudioModule.updateMeters(...args),
    togglePlayback: () => AudioModule.togglePlayback(),
    stopPlayback: () => AudioModule.stopPlayback(),
    toggleRecording: () => AudioModule.toggleRecording(),
    setMasterVolume: (gain) => AudioModule.setMasterVolume(gain),
    getMasterGainValue: () => State.getMasterGainValueState(), 
    setMasterGainValueState: (gain) => State.setMasterGainValueState(gain), 
    loadAndPreviewSample: createService(AudioModule, 'loadAndPreviewSample', 'AudioModule'),
    getPreviewPlayer: () => State.getPreviewPlayerState(),
    setPreviewPlayer: (player) => State.setPreviewPlayerState(player),
    fetchSoundLibrary: createService(AudioModule, 'fetchSoundLibrary', 'AudioModule'),
    loadSoundFromBrowserToTarget: createService(AudioModule, 'loadSoundFromBrowserToTarget', 'AudioModule'),
    playSlicePreview: createService(AudioModule, 'playSlicePreview', 'AudioModule'),
    playDrumSamplerPadPreview: createService(AudioModule, 'playDrumSamplerPadPreview', 'AudioModule'),
    loadSampleFile: createService(AudioModule, 'loadSampleFile', 'AudioModule'),
    loadDrumSamplerPadFile: createService(AudioModule, 'loadDrumSamplerPadFile', 'AudioModule'),
    autoSliceSample: createService(AudioModule, 'autoSliceSample', 'AudioModule'),
    getMimeTypeFromFilename: (filename) => AudioModule.getMimeTypeFromFilename(filename),
    getMasterEffectsBusInputNode: () => AudioModule.getMasterEffectsBusInputNode(),
    getActualMasterGainNode: () => AudioModule.getActualMasterGainNode(),
    clearAllMasterEffectNodes: () => AudioModule.clearAllMasterEffectNodes(),
    startAudioRecording: (trackId) => AudioModule.startAudioRecording(trackId),
    stopAudioRecording: () => AudioModule.stopAudioRecording(),

    // --- UI Modules & Functions ---
    initializeUIModule: (services) => UI.initializeUIModule(services),
    openSoundBrowserWindow: createService(UI, 'openSoundBrowserWindow', 'UI'),
    updateSoundBrowserDisplayForLibrary: createService(UI, 'updateSoundBrowserDisplayForLibrary', 'UI'),
    showAddTrackModal: createService(UI, 'showAddTrackModal', 'UI'),
    showAddEffectModal: createService(UI, 'showAddEffectModal', 'UI'),
    openTrackInspectorWindow: createService(UI, 'openTrackInspectorWindow', 'UI'),
    openTrackEffectsRackWindow: createService(UI, 'openTrackEffectsRackWindow', 'UI'),
    openMasterEffectsRackWindow: createService(UI, 'openMasterEffectsRackWindow', 'UI'),
    openArrangementWindow: createService(UI, 'openArrangementWindow', 'UI'),
    openSequencerWindow: createService(UI, 'openSequencerWindow', 'UI'),
    openMixerWindow: createService(UI, 'openMixerWindow', 'UI'),
    updateMixerWindow: createService(UI, 'updateMixerWindow', 'UI'),
    updateTheme: (theme) => UI.updateTheme(theme), // Assumes UI.updateTheme is robust
    getTheme: () => UI.getTheme(), // Assumes UI.getTheme is robust
    closeAllTrackWindows: (excludeId) => UI.closeAllTrackWindows(excludeId),
    updateTrackUI: createService(UI, 'updateTrackUI', 'UI'),
    highlightPlayingStep: createService(UI, 'highlightPlayingStep', 'UI'),
    drawWaveform: createService(UI, 'drawWaveform', 'UI'),
    drawInstrumentWaveform: createService(UI, 'drawInstrumentWaveform', 'UI'),
    renderSamplePads: createService(UI, 'renderSamplePads', 'UI'),
    updateSliceEditorUI: createService(UI, 'updateSliceEditorUI', 'UI'),
    updateDrumPadControlsUI: createService(UI, 'updateDrumPadControlsUI', 'UI'),
    renderDrumSamplerPads: createService(UI, 'renderDrumSamplerPads', 'UI'),
    renderEffectsList: createService(UI, 'renderEffectsList', 'UI'),
    renderEffectControls: createService(UI, 'renderEffectControls', 'UI'),
    createKnob: createService(UI, 'createKnob', 'UI'),
    updateSequencerCellUI: createService(UI, 'updateSequencerCellUI', 'UI'),
    renderTimeline: createService(UI, 'renderTimeline', 'UI'),
    updatePlayheadPosition: createService(UI, 'updatePlayheadPosition', 'UI'),
    openGlobalControlsWindow: (callback, state) => GlobalControlsUI.openGlobalControlsWindow(callback, state),

    // --- Effects Management ---
    effectsRegistryAccess: EffectsRegistry, 
    getMasterEffects: () => State.getMasterEffectsState(),
    addMasterEffect: async (effectType) => { /* ... same as response #63 ... */
        if (!appServices.getIsReconstructingDAW()) State.captureStateForUndoInternal(`Add Master Effect: ${effectType}`);
        const defaultParams = EffectsRegistry.getEffectDefaultParams(effectType);
        const id = State.addMasterEffectToState(effectType, defaultParams); 
        await AudioModule.addMasterEffectToAudio(id, effectType, defaultParams);    
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    removeMasterEffect: async (effectId) => { /* ... same as response #63 ... */
        const effect = State.getMasterEffectsState().find(e => e.id === effectId);
        if (effect && !appServices.getIsReconstructingDAW()) State.captureStateForUndoInternal(`Remove Master Effect: ${effect.type}`);
        State.removeMasterEffectFromState(effectId);
        await AudioModule.removeMasterEffectFromAudio(effectId);
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    updateMasterEffectParam: (effectId, paramPath, value) => { /* ... same as response #63 ... */
        State.updateMasterEffectParamInState(effectId, paramPath, value); 
        AudioModule.updateMasterEffectParamInAudio(effectId, paramPath, value);  
    },
    reorderMasterEffect: (effectId, newIndex) => { /* ... same as response #63 ... */
        if (!appServices.getIsReconstructingDAW()) State.captureStateForUndoInternal(`Reorder Master Effects`);
        State.reorderMasterEffectInState(effectId, newIndex);
        AudioModule.reorderMasterEffectInAudio(effectId, newIndex); 
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
    },
    toggleBypassMasterEffect: (effectId) => { /* ... same as response #63, ensure AudioModule has way to apply bypass ... */
        const effect = State.getMasterEffectsState().find(e => e.id === effectId);
        if (effect) {
            if (!appServices.getIsReconstructingDAW()) State.captureStateForUndoInternal(`Toggle Bypass Master Effect: ${effect.type}`);
            const newBypassState = !effect.isBypassed; // Assuming isBypassed is a property in state
            State.updateMasterEffectParamInState(effectId, 'isBypassed', newBypassState); 
            AudioModule._rechainMasterEffectsAudio(); // Rechaining will apply bypass based on state
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        }
    },
    getMasterEffectParamValue: (effectId, paramPath) => State.getMasterEffectParamValue(effectId, paramPath), // Delegate
    updateMasterEffectsRackUI: () => { // This is UI related, should call UI module
        const rackWindow = State.getWindowByIdState('masterEffectsRack');
        if (rackWindow?.element && !rackWindow.isMinimized && typeof UI.renderEffectsList === 'function') {
            const listDiv = rackWindow.element.querySelector('#effectsList-master'); 
            const controlsContainer = rackWindow.element.querySelector('#effectControlsContainer-master');
            if (listDiv && controlsContainer) UI.renderEffectsList(null, 'master', listDiv, controlsContainer);
        }
    },

    // --- MIDI ---
    getMidiAccess: () => State.getMidiAccessState(),
    setActiveMIDIInput: (deviceId) => State.setActiveMIDIInputState(deviceId),
    getActiveMIDIInput: () => State.getActiveMIDIInputState(),
    selectMIDIInput: (deviceId) => EventHandlers.selectMIDIInput(deviceId),

    // --- Sound Library ---
    getLoadedZipFiles: () => State.getLoadedZipFilesState(),
    setLoadedZipFiles: (zips) => State.setLoadedZipFilesState(zips),
    getSoundLibraryFileTrees: () => State.getSoundLibraryFileTreesState(),
    setSoundLibraryFileTrees: (trees) => State.setSoundLibraryFileTreesState(trees),
    getCurrentLibraryName: () => State.getCurrentLibraryNameState(),
    setCurrentLibraryName: (name) => State.setCurrentLibraryNameState(name),
    getCurrentSoundFileTree: () => State.getCurrentSoundFileTreeState(),
    setCurrentSoundBrowserPath: (path) => State.setCurrentSoundBrowserPathState(path),
    getCurrentSoundBrowserPath: () => State.getCurrentSoundBrowserPathState(),
    pushToSoundBrowserPath: (name) => State.pushToSoundBrowserPath(name),
    popFromSoundBrowserPath: () => State.popFromSoundBrowserPath(),

    // --- Timeline/Sequencer State & Control ---
    getPlaybackMode: () => State.getPlaybackModeState(),
    setPlaybackMode: (mode) => State.setPlaybackModeState(mode),
    getArmedTrackId: () => State.getArmedTrackIdState(),
    setArmedTrackId: (id) => State.setArmedTrackIdState(id),
    getSoloedTrackId: () => State.getSoloedTrackIdState(),
    setSoloedTrackId: (id) => State.setSoloedTrackIdState(id),
    getSelectedTimelineClipInfo: () => State.getSelectedTimelineClipInfoState(),
    setSelectedTimelineClip: (trackId, clipId) => State.setSelectedTimelineClipInfoState(trackId, clipId),
    getRecordingTrackId: () => State.getRecordingTrackIdState(),
    setRecordingTrackId: (id) => State.setRecordingTrackIdState(id),
    getRecordingStartTime: () => State.getRecordingStartTimeState(),
    setRecordingStartTime: (time) => State.setRecordingStartTimeState(time),
    isTrackRecording: (id) => State.isTrackRecordingState(id),
    setIsRecording: (isRec) => State.setIsRecordingState(isRec),
    getActiveSequencerTrackId: () => State.getActiveSequencerTrackIdState(),
    setActiveSequencerTrackId: (id) => State.setActiveSequencerTrackIdState(id),
    handleTimelineLaneDrop: (data, trackId, startTime) => EventHandlers.handleTimelineLaneDrop(data, trackId, startTime, appServices),

    // --- Event Handlers (for direct calls if needed) ---
    handleTrackMute: (id) => EventHandlers.handleTrackMute(id),
    handleTrackSolo: (id) => EventHandlers.handleTrackSolo(id),
    handleTrackArm: (id) => EventHandlers.handleTrackArm(id),
    handleRemoveTrack: (id) => EventHandlers.handleRemoveTrack(id),
    handleOpenTrackInspector: (id) => EventHandlers.handleOpenTrackInspector(id),
    handleOpenEffectsRack: (id) => EventHandlers.handleOpenEffectsRack(id),
    handleOpenSequencer: (id) => EventHandlers.handleOpenSequencer(id),

    // --- DB Access ---
    dbStoreItem: (id, data) => DB.storeAudio(id, data),
    dbGetItem: (id) => DB.getAudio(id),
    dbDeleteItem: (id) => DB.deleteAudio(id),

    // --- Misc UI helpers defined locally or simple passthroughs ---
    panicStopAllAudio: () => { /* ... same as response #63 ... */
        Tone.Transport.stop(); Tone.Transport.cancel(0);
        State.getTracksState().forEach(track => track.stopPlayback && track.stopPlayback());
        if (uiElementsCache.playBtn) uiElementsCache.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        if (uiElementsCache.playBtnGlobal) uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>';
        Utils.showNotification("All audio stopped.", "info", 1500);
    },
    updateTaskbarTempoDisplay: (tempo) => { /* ... same as response #63 ... */
        if (uiElementsCache.tempoDisplay) uiElementsCache.tempoDisplay.textContent = `${parseFloat(tempo).toFixed(1)} BPM`;
    },
    updateUndoRedoButtonsUI: (undoStateParam, redoStateParam) => { // Renamed params to avoid conflict
        const undoBtn = uiElementsCache.menuUndo; const redoBtn = uiElementsCache.menuRedo;
        const undoStackCurrent = appServices.getUndoStackState ? appServices.getUndoStackState() : [];
        const redoStackCurrent = appServices.getRedoStackState ? appServices.getRedoStackState() : [];
        if (undoBtn) { const canUndo = undoStackCurrent.length > 0; undoBtn.classList.toggle('disabled', !canUndo); undoBtn.title = canUndo && undoStateParam ? `Undo: ${undoStateParam.actionName || 'action'}` : "Undo"; }
        if (redoBtn) { const canRedo = redoStackCurrent.length > 0; redoBtn.classList.toggle('disabled', !canRedo); redoBtn.title = canRedo && redoStateParam ? `Redo: ${redoStateParam.actionName || 'action'}` : "Redo"; }
    },
    updateRecordButtonUI: (isRec, isArmed) => { /* ... same as response #63 ... */
        const recActive = isRec && isArmed;
        if (uiElementsCache.recordBtn) uiElementsCache.recordBtn.classList.toggle('text-red-700', recActive);
        if (uiElementsCache.recordBtnGlobal) uiElementsCache.recordBtnGlobal.classList.toggle('bg-red-700', recActive);
    },
    closeAllWindows: (isReconstruction = false) => { /* ... same as response #63 ... */
        State.getOpenWindowsState().forEach(win => win.close(isReconstruction));
        State.getOpenWindowsState().clear();
    },
    clearOpenWindowsMap: () => State.getOpenWindowsState().clear(),
    triggerCustomBackgroundUpload: () => { /* ... same as response #63 ... */
        const input = document.getElementById('file-input-background');
        if (input) input.click();
    },
    removeCustomDesktopBackground: async () => { /* ... same as response #63 ... */
        await appServices.dbDeleteItem(DESKTOP_BACKGROUND_IDB_KEY);
        if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
        currentBackgroundImageObjectURL = null;
        applyDesktopBackground(null);
        Utils.showNotification("Background removed.", "info", 2000);
    },
    onPlaybackModeChange: (newMode) => { /* ... same as response #63 ... */
        const playbackBtn = document.getElementById('playbackModeToggleBtnGlobal');
        if (playbackBtn) playbackBtn.textContent = newMode === 'timeline' ? 'Timeline Mode' : 'Sequencer Mode';
        if(appServices.renderTimeline) appServices.renderTimeline();
    },
    _transportEventsInitialized_flag: false,
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },
};

function cacheUIElements() {
    // ... (same as response #63) ...
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
}

async function initializeSnugOS() {
    console.log(`[Main initializeSnugOS] Initializing SnugOS v${Constants.APP_VERSION}...`);
    cacheUIElements(); // Cache static elements first

    // Initialize modules, passing the fully defined appServices object
    // These initialize functions will typically store the appServices reference
    // for their own internal use.
    State.initializeStateModule(appServices);
    AudioModule.initializeAudioModule(appServices);
    UI.initializeUIModule(appServices); // This will call initialize on its sub-modules too
    GlobalControlsUI.initializeGlobalControlsUIModule(appServices);
    EventHandlers.initializeEventHandlersModule(appServices);

    // Now that modules have appServices, setup event listeners that might use them
    EventHandlers.initializePrimaryEventListeners(); 

    // Global controls window elements are created dynamically, so events are attached in its callback
    GlobalControlsUI.openGlobalControlsWindow((elements) => {
        if (elements) {
            // Cache these dynamically created elements
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
            // Attach events specifically to these elements from the Global Controls window
            EventHandlers.attachGlobalControlEvents(elements); 
        } else {
            console.error("[Main initializeSnugOS] GlobalControlsWindow onReadyCallback received null elements. Cannot attach events.");
        }
    });

    EventHandlers.setupMIDI();

    updateClock();
    setInterval(updateClock, 10000);
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
    
    // Ensure Audio Context is definitely started (important for iOS/Safari)
    // and master chain is ready BEFORE opening windows that might use Tone.Transport or play audio.
    await AudioModule.initAudioContextAndMasterMeter();

    if (appServices.openArrangementWindow) appServices.openArrangementWindow();
    if (appServices.openSoundBrowserWindow) appServices.openSoundBrowserWindow();

    console.log("[Main initializeSnugOS] SnugOS Initialized and Ready.");
    startPerformanceMonitor();
}

function handleDesktopDrop(file) {
    // ... (same as response #63) ...
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
    // ... (same as response #63) ...
    if (uiElementsCache.clock) {
        uiElementsCache.clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

function startPerformanceMonitor() {
    // ... (same as response #63, ensure checks for appServices functions before calling) ...
    let lastMeterUpdateTime = performance.now();
    const updateLoop = () => {
        if (appServices.updateMeters) { // Check if function exists
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
    // ... (same as response #63) ...
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
    // ... (same as response #63, ensure checks for appServices functions before calling) ...
    const tracksExist = appServices.getTracksState && appServices.getTracksState().length > 0;
    const undoStackExists = appServices.getUndoStackState && appServices.getUndoStackState().length > 0;
    if (tracksExist || undoStackExists) {
        e.preventDefault(); e.returnValue = '';
        return "You have unsaved changes. Are you sure you want to leave?";
    }
    if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
});

console.log(`[Main] SnugOS v${Constants.APP_VERSION} - Script Execution Finished (end of file)`);
