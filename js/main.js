// js/main.js - Main Application Logic Orchestrator

// --- Module Imports ---\n
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
    getUndoStackState, getRedoStackState,
    getSelectedTimelineClipInfoState,
    getPlaybackModeState,
    // State Setters
    addTrackToState, removeTrackFromState, addWindowToState, removeWindowFromState,
    incrementHighestZ, setMasterGainValueState, setMidiAccessState, setActiveMIDIInputState,
    setLoadedZipFilesState, setSoundLibraryFileTreesState, setCurrentLibraryName,
    setCurrentSoundBrowserPath, pushToSoundBrowserPath, popFromSoundBrowserPath,
    setPreviewPlayerState, setClipboardDataState, setSoloedTrackIdState, setArmedTrackIdState,
    setActiveSequencerTrackIdState, setIsRecordingState, setRecordingTrackIdState, setRecordingStartTimeState,
    setSelectedTimelineClipInfoState,
    setPlaybackModeState,
    // Undo/Redo
    captureStateForUndo, undo, redo,
    // Project Management
    gatherProjectData, reconstructDAW, saveProject, loadProject, exportToWav,
} from './state.js';
import {
    initializeAudioModule, initAudioContextAndMasterMeter, getMasterMeter, loadSample,
    togglePlayback as audioTogglePlayback, stopPlayback as audioStopPlayback,
    setMasterVolume, loadAndPreviewSample, toggleRecording as audioToggleRecording
} from './audio.js';
import {
    initializeUIModule, showAddTrackModal, showAddEffectModal,
    openSoundBrowserWindow, updateSoundBrowserDisplayForLibrary,
    openMixerWindow, updateMixerWindow, openArrangementWindow,
    openTrackInspectorWindow, openTrackEffectsRackWindow, openMasterEffectsRackWindow, openSequencerWindow
} from './ui_modules/browsercoreui.js';
import * as EffectsRegistry from './effectsRegistry.js';


let uiElementsCache = {};
let isReconstructing = false;
let currentBackgroundImageObjectURL = null;

const appServices = {
    // --- Core App ---
    showNotification: utilShowNotification,
    showConfirmationDialog,
    getIsReconstructingDAW: () => isReconstructing,
    newProject: () => {
        showConfirmationDialog("Create a new project? All unsaved changes will be lost.", () => {
            window.location.reload();
        });
    },

    // --- State Access ---
    getTracksState, getTrackById: getTrackByIdState,
    getOpenWindowsState, getWindowById: getWindowByIdState,
        addWindowToStore: addWindowToState, removeWindowFromStore: removeWindowFromState,
    getHighestZ: getHighestZState, incrementHighestZ,
    // Undo/Redo
    captureState: captureStateForUndo, undo, redo,
    getUndoStackState, getRedoStackState,
    // Project I/O
    saveProject, loadProject, exportToWav,

    // --- Track Management ---
    addTrack: (type) => addTrackToState(type, appServices),
    removeTrack: removeTrackFromState,
    
    // --- Audio Engine ---
    initAudioContextAndMasterMeter, getMasterMeter,
    togglePlayback: audioTogglePlayback, stopPlayback: audioStopPlayback,
    toggleRecording: audioToggleRecording,
    setMasterVolume,
    getMasterGainValue: getMasterGainValueState,
    loadAndPreviewSample,
    getPreviewPlayer: getPreviewPlayerState,
    setPreviewPlayer: setPreviewPlayerState,

    // --- UI Modules ---
    uiElementsCache,
    updateArrangementView: () => {
        const arrangementWindow = getWindowByIdState('timeline');
        if (arrangementWindow) {
            // A bit of a hack, but effective.
            // A more elegant solution would be a proper observer pattern.
            openArrangementWindow(); 
        }
    },
    showAddTrackModal,
    showAddEffectModal,
    openSoundBrowserWindow,
    openMixerWindow,
    updateMixerWindow,
    openArrangementWindow,
    openTrackInspectorWindow,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    openSequencerWindow,

    // --- Effects ---
    effectsRegistryAccess: EffectsRegistry,
    addMasterEffect: (effectType) => { /* ... from response 30 ... */ },
    removeMasterEffect: (effectId) => { /* ... from response 30 ... */ },
    updateMasterEffectParam: (effectId, paramKey, value) => { /* ... from response 30 ... */ },
    toggleBypassMasterEffect: (effectId) => { /* ... from response 30 ... */ },
    getMasterEffects: getMasterEffectsState,
    getMasterEffectParamValue: (effectId, paramKey) => { /* ... from response 30 ... */ },
    
    // --- MIDI ---
    getMidiAccess: getMidiAccessState,
    getActiveMIDIInput: getActiveMIDIInputState,
    selectMIDIInput: eventSelectMIDIInput,

    // --- Sound Library ---
    getLoadedZipFiles: getLoadedZipFilesState,
    setLoadedZipFiles: setLoadedZipFilesState,
    getSoundLibraryFileTrees: getSoundLibraryFileTreesState,
    setSoundLibraryFileTrees: setSoundLibraryFileTreesState,
    getCurrentLibraryName: getCurrentLibraryNameState,
    setCurrentLibraryName: (name) => { setCurrentLibraryName(name); updateSoundBrowserDisplayForLibrary(); },
    getCurrentSoundFileTree: getCurrentSoundFileTreeState,
    getCurrentSoundBrowserPath: getCurrentSoundBrowserPathState,
    pushToSoundBrowserPath, popFromSoundBrowserPath,
    setSelectedSoundForPreview: (data) => { /* Should be handled by browsercoreui */ },
    getSelectedSoundForPreview: () => { /* Should be handled by browsercoreui */ },

    // --- Timeline/Sequencer State ---
    getPlaybackMode: getPlaybackModeState,
    setPlaybackMode: setPlaybackModeState,
    getArmedTrackId: getArmedTrackIdState,
    getSoloedTrackId: getSoloedTrackIdState,
    setSelectedTimelineClip: setSelectedTimelineClipInfoState,
    
};
function cacheUIElements() {
    uiElementsCache.desktop = document.getElementById('desktop');
    uiElementsCache.taskbar = document.getElementById('taskbar');
    uiElementsCache.topTaskbar = document.getElementById('topTaskbar');
    uiElementsCache.startMenuButton = document.getElementById('startMenuButton');
    uiElementsCache.startMenu = document.getElementById('startMenu');
    uiElementsCache.playBtn = document.getElementById('playBtn');
    uiElementsCache.stopBtn = document.getElementById('stopBtn');
    uiElementsCache.recordBtn = document.getElementById('recordBtn');
    uiElementsCache.tempoDisplay = document.getElementById('tempoDisplay');
    uiElementsCache.clock = document.getElementById('clock');
    uiElementsCache.masterMeter = document.getElementById('master-meter');
    uiElementsCache.cpuUsage = document.getElementById('cpu-usage');
    uiElementsCache.undoBtn = document.getElementById('menuUndo');
    uiElementsCache.redoBtn = document.getElementById('menuRedo');
}
async function initializeSnugOS() {
    console.log(`SnugOS v${Constants.APP_VERSION} Initializing...`);
    cacheUIElements();

    initializeStateModule(appServices);
    initializeAudioModule(appServices);
    initializeUIModule(appServices); 
    initializeEventHandlersModule(appServices);
    
    initializePrimaryEventListeners();
    attachGlobalControlEvents(uiElementsCache);
    
    setupMIDI(
        (midiAccess) => {
            setMidiAccessState(midiAccess);
            // You might want to auto-select the first device or a stored preference
        },
        (error) => {
            console.warn("MIDI could not be initialized.", error);
            utilShowNotification("MIDI not available or permission denied.", "warning");
        }
    );

    // Initial UI setup
    updateClock();
    setInterval(updateClock, 10000); // Update clock every 10 seconds
    updateUndoRedoButtons();
    
    // Setup desktop drop zone for loading projects/files
    setupGenericDropZoneListeners(uiElementsCache.desktop, handleDesktopDrop);

    // Initial windows
    openArrangementWindow();
    openSoundBrowserWindow();

    console.log("SnugOS Initialized and Ready.");
    startPerformanceMonitor();
}
function handleDesktopDrop(file) {
    if (file.name.endsWith('.snug')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                isReconstructing = true;
                await reconstructDAW(projectData);
                isReconstructing = false;
                utilShowNotification(`Project "${projectData.projectName}" loaded.`, 'success');
            } catch (error) {
                console.error("Error loading project file:", error);
                utilShowNotification("Failed to load project file. It might be corrupt.", "error");
                isReconstructing = false;
            }
        };
        reader.readAsText(file);
    } else if (file.name.endsWith('.zip')) {
        // Handle library zip loading
    } else if (file.type.startsWith('image/')) {
        // Handle background image
        if (currentBackgroundImageObjectURL) {
            URL.revokeObjectURL(currentBackgroundImageObjectURL);
        }
        currentBackgroundImageObjectURL = URL.createObjectURL(file);
        applyDesktopBackground(currentBackgroundImageObjectURL);
    } else {
        utilShowNotification(`Unsupported file type: ${file.name}`, 'warning');
    }
}
function updateClock() {
    if (uiElementsCache.clock) {
        uiElementsCache.clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}
function updateUndoRedoButtons() {
    const undoStack = getUndoStackState();
    const redoStack = getRedoStackState();
    const undoBtn = uiElementsCache.undoBtn;
    const redoBtn = uiElementsCache.redoBtn;

    if (undoBtn) {
        undoBtn.classList.toggle('disabled', undoStack.length === 0);
        undoBtn.classList.toggle('opacity-50', undoStack.length === 0);
        undoBtn.title = undoStack.length > 0 ? `Undo: ${undoStack[undoStack.length - 1].actionName}` : "Undo";
    }
     if (redoBtn) {
        redoBtn.classList.toggle('disabled', redoStack.length === 0);
        redoBtn.classList.toggle('opacity-50', redoStack.length === 0);
        redoBtn.title = redoStack.length > 0 ? `Redo: ${redoStack[redoStack.length - 1].actionName}` : "Redo";
    }
}
function startPerformanceMonitor() {
    let lastMeterUpdateTime = performance.now();
    const updateMetersLoop = () => {
        const now = performance.now();
        const deltaTime = now - lastMeterUpdateTime;

        if (uiElementsCache.masterMeter && getMasterMeter()) {
            const value = getMasterMeter().getValue();
            const db = Tone.gainToDb(value);
            const percentage = (db + 60) / 66 * 100;
            uiElementsCache.masterMeter.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        }

        if (now - lastMeterUpdateTime > 500) { // Update CPU less frequently
            if (uiElementsCache.cpuUsage && Tone.context.draw) {
                 const cpuUsage = Tone.context.draw.getValue() * 100;
                 uiElementsCache.cpuUsage.textContent = `CPU: ${cpuUsage.toFixed(0)}%`;
            }
            lastMeterUpdateTime = now;
        }
        
        // Update Playhead
        const arrangementWindow = getWindowByIdState('timeline');
        if (arrangementWindow && Tone.Transport.state === 'started') {
            const playhead = document.getElementById('timeline-playhead');
            if (playhead) {
                const pixelsPerSecond = 30;
                const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || 120;
                const tracksContainer = document.getElementById('timeline-tracks-container');
                const scrollLeft = tracksContainer ? tracksContainer.scrollLeft : 0;

                const rawNewPosition = Tone.Transport.seconds * pixelsPerSecond;
                playhead.style.left = `${trackNameWidth + rawNewPosition - scrollLeft}px`;
            }
        }
        
        updateUndoRedoButtons();

        requestAnimationFrame(updateMetersLoop);
    };
    requestAnimationFrame(updateMetersLoop);
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
            }
        } catch (e) { console.error("Error applying desktop background style:", e); }
    } else { console.warn("Desktop element not found for background."); }
}

window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    const tracksExist = typeof getTracksState === 'function' && getTracksState().length > 0;
    const undoStackExists = typeof getUndoStackState === 'function' && getUndoStackState().length > 0;
    if (tracksExist || undoStackExists) {
        e.preventDefault(); e.returnValue = '';
        return "You have unsaved changes. Are you sure you want to leave?";
    }
    if (currentBackgroundImageObjectURL) { URL.revokeObjectURL(currentBackgroundImageObjectURL); }
});

// console.log(`SCRIPT EXECUTION FINISHED - SnugOS (main.js - Version ${Constants.APP_VERSION})`);
