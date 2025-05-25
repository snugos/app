// js/main.js - Main Application Logic Orchestrator
// SnugOS Version 5.5.1 (Modularized)

import { SnugWindow } from './SnugWindow.js';
// Constants are imported directly where needed or via the * as Constants import
import * as Constants from './constants.js';
// Import specific constants if main.js uses them directly (it doesn't seem to in this version)
// import { computerKeySynthMap, computerKeySamplerMap } from './constants.js'; 

import { showNotification, showCustomModal, showConfirmationDialog } from './utils.js';
// Import initializers and specific handlers
import { 
    initializePrimaryEventListeners, 
    setupMIDI, 
    attachGlobalControlEvents,
    // These specific handlers are now primarily used by ui.js via direct import from eventHandlers.js
    // So, main.js might not need to import them directly unless it's also calling them.
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer,
    // currentlyPressedComputerKeys is internal to eventHandlers.js now
} from './eventHandlers.js';
import {
    getTracks, getTrackById,
    addTrackToState,
    updateUndoRedoButtons, captureStateForUndo, undoLastAction, redoLastAction,
    gatherProjectData, reconstructDAW, saveProject, loadProject, handleProjectFileLoad, exportToWav
} from './state.js';
import { initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary, loadSoundFromBrowserToTarget, playSlicePreview, playDrumSamplerPadPreview, loadSampleFile, loadDrumSamplerPadFile, autoSliceSample } from './audio.js';
import {
    openTrackEffectsRackWindow, openTrackSequencerWindow,
    openGlobalControlsWindow, openTrackInspectorWindow,
    openMixerWindow, updateMixerWindow,
    openSoundBrowserWindow, renderSoundBrowserDirectory,
    highlightPlayingStep
} from './ui.js';


console.log("SCRIPT EXECUTION STARTED - SnugOS v5.5.1 (Modularized - main.js)");

// --- Global Variables & Initialization ---
// These are largely managed by their respective modules now.
// `window.` prefix is for values that ui.js or eventHandlers.js might still expect globally during transition.
window.loadedZipFiles = {};
window.currentLibraryName = null;
window.currentSoundFileTree = null;
window.currentSoundBrowserPath = [];
window.previewPlayer = null;
window.midiAccess = null; 
window.activeMIDIInput = null; 
window.transportEventsInitialized = false;
window.masterMeter = null;
window.openWindows = {};
window.highestZIndex = 100;

// --- DOM Elements ---
const desktop = document.getElementById('desktop');
const startButton = document.getElementById('startButton');
const startMenu = document.getElementById('startMenu');
const taskbarButtonsContainer = document.getElementById('taskbarButtons');
const taskbarTempoDisplay = document.getElementById('taskbarTempoDisplay');
const loadProjectInputEl = document.getElementById('loadProjectInput');

window.playBtn = null; window.recordBtn = null; window.tempoInput = null;
window.masterMeterBar = null; window.midiInputSelectGlobal = null;
window.midiIndicatorGlobalEl = null; window.keyboardIndicatorGlobalEl = null;

// --- Exposing functions globally (TEMPORARY) ---
// UI functions
window.openTrackEffectsRackWindow = openTrackEffectsRackWindow;
window.openTrackSequencerWindow = openTrackSequencerWindow;
window.createWindow = (id, title, contentHTMLOrElement, options = {}) => {
    if (window.openWindows[id]) {
        window.openWindows[id].restore(); return window.openWindows[id];
    }
    const newWindow = new SnugWindow(id, title, contentHTMLOrElement, options);
    return newWindow.element ? newWindow : null;
};
window.updateMixerWindow = updateMixerWindow;
window.highlightPlayingStep = highlightPlayingStep; 
window.renderSoundBrowserDirectory = renderSoundBrowserDirectory;
window.openGlobalControlsWindow = openGlobalControlsWindow;
window.openMixerWindow = openMixerWindow;
window.openSoundBrowserWindow = openSoundBrowserWindow;
window.openTrackInspectorWindow = openTrackInspectorWindow;

// Audio functions
window.playSlicePreview = playSlicePreview;
window.playDrumSamplerPadPreview = playDrumSamplerPadPreview;
window.loadSampleFile = loadSampleFile;
window.loadDrumSamplerPadFile = loadDrumSamplerPadFile;
window.loadSoundFromBrowserToTarget = loadSoundFromBrowserToTarget;
window.fetchSoundLibrary = fetchSoundLibrary;
window.initAudioContextAndMasterMeter = initAudioContextAndMasterMeter;

// State functions
window.captureStateForUndo = captureStateForUndo;
window.handleProjectFileLoad = handleProjectFileLoad; 
window.undoLastAction = undoLastAction;
window.redoLastAction = redoLastAction;
window.saveProject = saveProject;
window.loadProject = loadProject;
window.exportToWav = exportToWav;
window.addTrack = addTrackToState;

// Event Handler functions (programmatic attachment in ui.js is preferred)
window.handleTrackMute = handleTrackMute;
window.handleTrackSolo = handleTrackSolo;
window.handleTrackArm = handleTrackArm;
window.removeTrack = handleRemoveTrack; // This is the handler from eventHandlers.js
window.handleOpenTrackInspector = handleOpenTrackInspector;
window.handleOpenEffectsRack = handleOpenEffectsRack;
window.handleOpenSequencer = handleOpenSequencer;
window.attachGlobalControlEvents = attachGlobalControlEvents;

// Expose state getters needed by other modules if they are still accessing via window
window.getTracks = getTracks;
window.getTrackById = getTrackById;
window.getArmedTrackId = getArmedTrackId;
window.getSoloedTrackId = getSoloedTrackId;
window.getActiveSequencerTrackId = getActiveSequencerTrackId;
window.isTrackRecording = isTrackRecording; // from state.js
window.getRecordingTrackId = getRecordingTrackId; // from state.js

window.updateSequencerCellUI = (cell, trackType, isActive) => {
    if (!cell) return;
    cell.classList.remove('active-synth', 'active-sampler', 'active-drum-sampler', 'active-instrument-sampler');
    if (isActive) {
        let activeClass = '';
        if (trackType === 'Synth') activeClass = 'active-synth';
        else if (trackType === 'Sampler') activeClass = 'active-sampler';
        else if (trackType === 'DrumSampler') activeClass = 'active-drum-sampler';
        else if (trackType === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
        if (activeClass) cell.classList.add(activeClass);
    }
};
window.updateTaskbarTempoDisplay = (newTempo) => {
    const display = document.getElementById('taskbarTempoDisplay');
    if (display) display.textContent = `${parseFloat(newTempo).toFixed(1)} BPM`;
};


// --- Core Application Initialization ---
async function initializeSnugOS() {
    console.log("Window loaded. Initializing SnugOS (Modular)...");
    
    const appContext = {
        addTrack: addTrackToState,
        openSoundBrowserWindow: openSoundBrowserWindow,
        undoLastAction: undoLastAction,
        redoLastAction: redoLastAction,
        saveProject: saveProject,
        loadProject: loadProject, // state.js loadProject just triggers input click
        exportToWav: exportToWav,
        openGlobalControlsWindow: openGlobalControlsWindow,
        openMixerWindow: openMixerWindow,
        handleProjectFileLoad: handleProjectFileLoad // from state.js
    };
    initializePrimaryEventListeners(appContext);
    
    await openGlobalControlsWindow();
    await setupMIDI();
    requestAnimationFrame(updateMetersLoop);
    updateUndoRedoButtons();

    showNotification("Welcome to SnugOS! (Imports Corrected)", 2500);
    console.log("SnugOS Initialized (Imports Corrected).");
}

// Meter Update Loop
function updateMetersLoop() {
    updateMeters(window.masterMeter, window.masterMeterBar, document.getElementById('mixerMasterMeterBar'), getTracks());
    requestAnimationFrame(updateMetersLoop);
}

// --- Global Event Listeners ---
window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    if (getTracks().length > 0 && (window.undoStack.length > 0 || Object.keys(window.openWindows).length > 1)) {
        e.preventDefault();
        e.returnValue = '';
    }
});

console.log("SCRIPT EXECUTION FINISHED - SnugOS v5.5.1 (Modularized - main.js with Corrected Imports)");
