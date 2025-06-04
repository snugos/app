// js/main.js - Main Application Logic Orchestrator (Revised appServices and Init Order)

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
    // Other services will be populated by initializeCoreServices
};

// --- Module Initialization Functions ---
function initializeCoreServices() {
    // State services
    Object.assign(appServices, {
        getTracksState: State.getTracksState,
        getTrackById: State.getTrackByIdState,
        getOpenWindowsState: State.getOpenWindowsState,
        getWindowById: State.getWindowByIdState,
        addWindowToStoreState: State.addWindowToStoreState,
        removeWindowFromStoreState: State.removeWindowFromStoreState,
        getHighestZState: State.getHighestZState,
        incrementHighestZState: State.incrementHighestZState,
        setHighestZState: State.setHighestZState,
        captureStateForUndoInternal: State.captureStateForUndoInternal,
        undo: State.undoLastActionInternal,
        redo: State.redoLastActionInternal,
        getUndoStackState: State.getUndoStackState,
        getRedoStackState: State.getRedoStackState,
        gatherProjectDataInternal: State.gatherProjectDataInternal,
        reconstructDAWInternal: State.reconstructDAWInternal,
        saveProject: State.saveProjectInternal,
        loadProject: State.loadProjectInternal,
        handleProjectFileLoad: State.handleProjectFileLoadInternal,
        exportToWav: State.exportToWavInternal,
        getCurrentThemeState: State.getCurrentThemeState,
        setCurrentThemeState: State.setCurrentThemeState,
        addTrack: (type, initialData) => State.addTrackToStateInternal(type, initialData, true, appServices),
        removeTrack: State.removeTrackFromStateInternal,
        getMasterEffects: State.getMasterEffectsState,
        addMasterEffectToState: State.addMasterEffectToState,
        removeMasterEffectFromState: State.removeMasterEffectFromState,
        updateMasterEffectParamInState: State.updateMasterEffectParamInState,
        reorderMasterEffectInState: State.reorderMasterEffectInState,
        getMidiAccess: State.getMidiAccessState,
        setMidiAccessState: State.setMidiAccessState, // Added for completeness if needed by EventHandlers directly
        setActiveMIDIInput: State.setActiveMIDIInputState,
        getActiveMIDIInput: State.getActiveMIDIInputState,
        getLoadedZipFiles: State.getLoadedZipFilesState,
        setLoadedZipFiles: State.setLoadedZipFilesState,
        getSoundLibraryFileTrees: State.getSoundLibraryFileTreesState,
        setSoundLibraryFileTrees: State.setSoundLibraryFileTreesState,
        getCurrentLibraryName: State.getCurrentLibraryNameState,
        setCurrentLibraryName: State.setCurrentLibraryNameState,
        getCurrentSoundFileTree: State.getCurrentSoundFileTreeState,
        setCurrentSoundBrowserPath: State.setCurrentSoundBrowserPathState,
        getCurrentSoundBrowserPath: State.getCurrentSoundBrowserPathState,
        pushToSoundBrowserPath: State.pushToSoundBrowserPath,
        popFromSoundBrowserPath: State.popFromSoundBrowserPath,
        getPreviewPlayer: State.getPreviewPlayerState,
        setPreviewPlayer: State.setPreviewPlayerState,
        getPlaybackMode: State.getPlaybackModeState,
        setPlaybackMode: State.setPlaybackModeState,
        getArmedTrackId: State.getArmedTrackIdState,
        setArmedTrackId: State.setArmedTrackIdState,
        getSoloedTrackId: State.getSoloedTrackIdState,
        setSoloedTrackId: State.setSoloedTrackIdState,
        getSelectedTimelineClipInfo: State.getSelectedTimelineClipInfoState,
        setSelectedTimelineClip: State.setSelectedTimelineClipInfoState,
        getRecordingTrackId: State.getRecordingTrackIdState,
        setRecordingTrackId: State.setRecordingTrackIdState,
        getRecordingStartTime: State.getRecordingStartTimeState,
        setRecordingStartTime: State.setRecordingStartTimeState,
        isTrackRecording: State.isTrackRecordingState,
        isGlobalRecordingActiveState: State.isGlobalRecordingActiveState, // Added for completeness
        setIsRecording: State.setIsRecordingState,
        getActiveSequencerTrackId: State.getActiveSequencerTrackIdState,
        setActiveSequencerTrackId: State.setActiveSequencerTrackIdState,
        getMasterGainValue: State.getMasterGainValueState,
        setMasterGainValueState: State.setMasterGainValueState,
    });

    // Audio services
    Object.assign(appServices, {
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
        getActualMasterGainNode: AudioModule.getActualMasterGainNode,
        clearAllMasterEffectNodes: AudioModule.clearAllMasterEffectNodes,
        startAudioRecording: AudioModule.startAudioRecording,
        stopAudioRecording: AudioModule.stopAudioRecording,
        addMasterEffectToAudio: AudioModule.addMasterEffectToAudio,
        removeMasterEffectFromAudio: AudioModule.removeMasterEffectFromAudio,
        updateMasterEffectParamInAudio: AudioModule.updateMasterEffectParamInAudio,
        reorderMasterEffectInAudio: AudioModule.reorderMasterEffectInAudio,
        _rechainMasterEffectsAudio: AudioModule._rechainMasterEffectsAudio, // Expose for bypass toggle
    });

    // DB services
    Object.assign(appServices, {
        dbStoreItem: DB.storeAudio,
        dbGetItem: DB.getAudio,
        dbDeleteItem: DB.deleteAudio,
    });

    // Effects Management (Combined logic)
    Object.assign(appServices, {
        addMasterEffect: async (effectType) => {
            if (!appServices.getIsReconstructingDAW()) appServices.captureStateForUndoInternal(`Add Master Effect: ${effectType}`);
            const defaultParams = EffectsRegistry.getEffectDefaultParams(effectType);
            const id = appServices.addMasterEffectToState(effectType, defaultParams); // from State
            await appServices.addMasterEffectToAudio(id, effectType, defaultParams); // from AudioModule
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        },
        removeMasterEffect: async (effectId) => {
            const effect = appServices.getMasterEffects().find(e => e.id === effectId);
            if (effect && !appServices.getIsReconstructingDAW()) appServices.captureStateForUndoInternal(`Remove Master Effect: ${effect.type}`);
            appServices.removeMasterEffectFromState(effectId); // from State
            await appServices.removeMasterEffectFromAudio(effectId); // from AudioModule
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        },
        updateMasterEffectParam: (effectId, paramPath, value) => {
            appServices.updateMasterEffectParamInState(effectId, paramPath, value); // from State
            appServices.updateMasterEffectParamInAudio(effectId, paramPath, value); // from AudioModule
             // No direct UI update here, specific effect UI should update if open
        },
        reorderMasterEffect: (effectId, newIndex) => {
            if (!appServices.getIsReconstructingDAW()) appServices.captureStateForUndoInternal(`Reorder Master Effects`);
            appServices.reorderMasterEffectInState(effectId, newIndex); // from State
            appServices.reorderMasterEffectInAudio(effectId, newIndex); // from AudioModule (triggers rechain)
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        },
        toggleBypassMasterEffect: (effectId) => {
            const effect = appServices.getMasterEffects().find(e => e.id === effectId);
            if (effect) {
                if (!appServices.getIsReconstructingDAW()) appServices.captureStateForUndoInternal(`Toggle Bypass Master Effect: ${effect.type}`);
                const newBypassState = !effect.isBypassed;
                appServices.updateMasterEffectParamInState(effectId, 'isBypassed', newBypassState); // from State
                // AudioModule._rechainMasterEffectsAudio is called by state setter or explicitly after this
                if(appServices._rechainMasterEffectsAudio) appServices._rechainMasterEffectsAudio();
                if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
            }
        },
        getMasterEffectParamValue: (effectId, paramPath) => State.getMasterEffectParamValue(effectId, paramPath), // from State
    });

    // Event Handler connections that appServices needs to provide
     Object.assign(appServices, {
        selectMIDIInput: EventHandlers.selectMIDIInput, // from EventHandlers
        handleTimelineLaneDrop: (data, trackId, startTime) => EventHandlers.handleTimelineLaneDrop(data, trackId, startTime, appServices), // from EventHandlers
        handleTrackMute: EventHandlers.handleTrackMute,
        handleTrackSolo: EventHandlers.handleTrackSolo,
        handleTrackArm: EventHandlers.handleTrackArm,
        handleRemoveTrack: EventHandlers.handleRemoveTrack,
        handleOpenTrackInspector: EventHandlers.handleOpenTrackInspector,
        handleOpenEffectsRack: EventHandlers.handleOpenEffectsRack,
        handleOpenSequencer: EventHandlers.handleOpenSequencer,
    });

    // UI services (functions from UI modules, mostly browserCoreUI which re-exports)
    Object.assign(appServices, {
        // From browserCoreUI directly or via its sub-modules
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
        // From globalControlsUI
        openGlobalControlsWindow: GlobalControlsUI.openGlobalControlsWindow,
        updateMasterEffectsRackUI: () => {
            const rackWindow = appServices.getWindowById('masterEffectsRack');
            if (rackWindow?.element && !rackWindow.isMinimized && typeof UI.renderEffectsList === 'function') {
                const listDiv = rackWindow.element.querySelector('#effectsList-master');
                const controlsContainer = rackWindow.element.querySelector('#effectControlsContainer-master');
                if (listDiv && controlsContainer && UI.renderEffectsList) {
                     UI.renderEffectsList(null, 'master', listDiv, controlsContainer);
                }
            }
        },
    });

    // Misc local appServices functions (defined in main.js, can use other appServices)
    Object.assign(appServices, {
        panicStopAllAudio: () => {
            if (typeof Tone !== 'undefined') {
                Tone.Transport.stop(); Tone.Transport.cancel(0);
            }
            appServices.getTracksState().forEach(track => track.stopPlayback && track.stopPlayback());
            if (uiElementsCache.playBtn) uiElementsCache.playBtn.innerHTML = '<i class="fas fa-play"></i>';
            if (uiElementsCache.playBtnGlobal) uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>';
            appServices.showNotification("All audio stopped.", "info", 1500);
        },
        updateTaskbarTempoDisplay: (tempo) => {
            if (uiElementsCache.tempoDisplay) uiElementsCache.tempoDisplay.textContent = `${parseFloat(tempo).toFixed(1)} BPM`;
        },
        updateUndoRedoButtonsUI: (undoStateParam, redoStateParam) => {
            const undoBtn = uiElementsCache.menuUndo; const redoBtn = uiElementsCache.menuRedo;
            const undoStackCurrent = appServices.getUndoStackState ? appServices.getUndoStackState() : [];
            const redoStackCurrent = appServices.getRedoStackState ? appServices.getRedoStackState() : [];
            if (undoBtn) { const canUndo = undoStackCurrent.length > 0; undoBtn.classList.toggle('disabled', !canUndo); undoBtn.title = canUndo && undoStateParam ? `Undo: ${undoStateParam.actionName || 'action'}` : "Undo"; }
            if (redoBtn) { const canRedo = redoStackCurrent.length > 0; redoBtn.classList.toggle('disabled', !canRedo); redoBtn.title = canRedo && redoStateParam ? `Redo: ${redoStateParam.actionName || 'action'}` : "Redo"; }
        },
        updateRecordButtonUI: (isRec, isArmed) => {
            const recActive = isRec && isArmed;
            if (uiElementsCache.recordBtn) uiElementsCache.recordBtn.classList.toggle('text-red-700', recActive); // Assuming Tailwind class for active
            if (uiElementsCache.recordBtnGlobal) uiElementsCache.recordBtnGlobal.classList.toggle('bg-red-700', recActive); // Assuming Tailwind class for active
        },
        closeAllWindows: (isReconstruction = false) => {
            appServices.getOpenWindowsState().forEach(win => win.close(isReconstruction));
            if(appServices.clearOpenWindowsMap) appServices.clearOpenWindowsMap(); else State.getOpenWindowsState().clear();
        },
        clearOpenWindowsMap: () => State.getOpenWindowsState().clear(),
        triggerCustomBackgroundUpload: () => {
            const input = document.getElementById('file-input-background');
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
            const playbackBtn = document.getElementById('playbackModeToggleBtnGlobal'); // Direct DOM access, or cache it
            if (playbackBtn) playbackBtn.textContent = newMode === 'timeline' ? 'Timeline Mode' : 'Sequencer Mode';
            if(appServices.renderTimeline) appServices.renderTimeline();
        },
        _transportEventsInitialized_flag: false,
        getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
        setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },
        // Add selected sound for preview to appServices, used by browserCoreUI
        getSelectedSoundForPreview: () => State.getSelectedSoundForPreviewState(), // Assuming state.js handles this
        setSelectedSoundForPreview: (data) => State.setSelectedSoundForPreviewState(data), // Assuming state.js handles this
    });
}

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
    uiElementsCache.masterMeter = document.getElementById('master-meter'); // Used by updateMeters
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
    // Note: Global Controls window elements (playBtnGlobal, etc.) are cached when the window is created
}

async function initializeSnugOS() {
    console.log(`[Main initializeSnugOS] Initializing SnugOS v${Constants.APP_VERSION}...`);
    cacheUIElements();

    // 1. Populate appServices with all function references
    initializeCoreServices();

    // 2. Initialize modules that NEED appServices.
    // These modules usually store 'appServices' locally for their own use.
    State.initializeStateModule(appServices);
    AudioModule.initializeAudioModule(appServices);
    UI.initializeUIModule(appServices); // This will also init its sub-modules like inspectorEffectsUI and arrangementMixingUI
    GlobalControlsUI.initializeGlobalControlsUIModule(appServices);
    EventHandlers.initializeEventHandlersModule(appServices);

    // 3. Setup primary event listeners (like start menu, global keydowns)
    // These might rely on basic appServices like showNotification or state access.
    EventHandlers.initializePrimaryEventListeners();

    // 4. Initialize Audio Context and Master Meter (Crucial for Tone.js readiness)
    try {
        await appServices.initAudioContextAndMasterMeter(true); // Force start
    } catch (error) {
        console.error("[Main initializeSnugOS] CRITICAL: Failed to initialize audio context.", error);
        appServices.showNotification("Fatal Audio Error. Please refresh.", "error", 0);
        return; // Stop further initialization if audio fails
    }


    // 5. Open Global Controls Window and attach its specific events
    // The callback ensures that elements inside this window are ready before event listeners are attached.
    appServices.openGlobalControlsWindow((elements) => {
        if (elements) {
            uiElementsCache.playBtnGlobal = elements.playBtnGlobal;
            uiElementsCache.recordBtnGlobal = elements.recordBtnGlobal;
            uiElementsCache.stopBtnGlobal = elements.stopBtnGlobal;
            uiElementsCache.tempoGlobalInput = elements.tempoGlobalInput;
            uiElementsCache.midiInputSelectGlobal = elements.midiInputSelectGlobal;
            uiElementsCache.masterMeterContainerGlobal = elements.masterMeterContainerGlobal;
            uiElementsCache.masterMeterBarGlobal = elements.masterMeterBarGlobal; // Cached for updateMeters
            uiElementsCache.midiIndicatorGlobal = elements.midiIndicatorGlobal;
            uiElementsCache.keyboardIndicatorGlobal = elements.keyboardIndicatorGlobal;
            uiElementsCache.playbackModeToggleBtnGlobal = elements.playbackModeToggleBtnGlobal;

            // Attach events specific to these global controls
            EventHandlers.attachGlobalControlEvents(elements);
            // Now that midiInputSelectGlobal is confirmed to exist, setup MIDI inputs.
            EventHandlers.setupMIDI();
        } else {
            console.error("[Main initializeSnugOS] GlobalControlsWindow onReadyCallback received null elements.");
        }
    }, null /* no saved state for initial load here */);

    // 6. Initialize other UI aspects and utilities
    updateClock();
    setInterval(updateClock, 10000);
    if (appServices.updateUndoRedoButtonsUI) {
        appServices.updateUndoRedoButtonsUI(null, null);
    }
    Utils.setupGenericDropZoneListeners(uiElementsCache.desktop, (file) => handleDesktopDrop(file)); // Pass appServices if needed by handler

    try {
        const storedImageBlob = await appServices.dbGetItem(DESKTOP_BACKGROUND_IDB_KEY);
        if (storedImageBlob) {
            if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
            currentBackgroundImageObjectURL = URL.createObjectURL(storedImageBlob);
            applyDesktopBackground(currentBackgroundImageObjectURL);
        } else { applyDesktopBackground(null); }
    } catch (error) { console.error("Error loading initial desktop background:", error); applyDesktopBackground(null); }

    // 7. Open other initial windows (Timeline, Sound Browser, etc.)
    // These are called after the core systems are up and appServices is stable.
    if (appServices.openArrangementWindow) {
        appServices.openArrangementWindow(null, null /* no saved state for initial load */);
    } else {
        console.error("[Main initializeSnugOS] appServices.openArrangementWindow is not available.");
    }

    if (appServices.openSoundBrowserWindow) {
        appServices.openSoundBrowserWindow(null, null /* no saved state for initial load */);
    } else {
        console.error("[Main initializeSnugOS] appServices.openSoundBrowserWindow is not available.");
    }

    console.log("[Main initializeSnugOS] SnugOS Initialized and Ready.");

    // 8. Start performance monitor loop last, once everything else is set up.
    startPerformanceMonitor();
}


function handleDesktopDrop(file) {
    if (!file) return;
    if (file.name.endsWith('.snug')) {
        appServices.handleProjectFileLoad(file); // Pass the file directly if handler expects it
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
                uiElementsCache.masterMeter,      // From topTaskbar
                uiElementsCache.masterMeterBarGlobal, // From GlobalControls window
                appServices.getTracksState ? appServices.getTracksState() : []
            );
        }
        if (appServices.updatePlayheadPosition) appServices.updatePlayheadPosition();

        if (performance.now() - lastMeterUpdateTime > 500) {
            // Corrected: Removed the problematic Tone.context.draw.getValue()
            if (uiElementsCache.cpuUsage) {
                // uiElementsCache.cpuUsage.textContent = `CPU: --%`; // Placeholder or remove
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
    if ((tracksExist || undoStackExists) && !appServices.getIsReconstructingDAW()) { // Only show if not in programmatic reload
        e.preventDefault(); e.returnValue = '';
        return "You have unsaved changes. Are you sure you want to leave?";
    }
    if (currentBackgroundImageObjectURL) URL.revokeObjectURL(currentBackgroundImageObjectURL);
});

console.log(`[Main] SnugOS v${Constants.APP_VERSION} - Script Execution Finished (end of file)`);
