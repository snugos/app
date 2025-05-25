// js/main.js - Main Application Logic Orchestrator
// SnugOS Version 5.5.1 (Modularized)

import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import { showNotification, showCustomModal, showConfirmationDialog } from './utils.js';
import { 
    initializePrimaryEventListeners, 
    setupMIDI, 
    attachGlobalControlEvents,
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer,
} from './eventHandlers.js';
import {
    getTracks, getTrackById,
    addTrackToState,
    updateUndoRedoButtons, captureStateForUndo, undoLastAction, redoLastAction,
    gatherProjectData, reconstructDAW, saveProject, loadProject, handleProjectFileLoad, exportToWav,
    // Ensuring all expected state getters are imported
    getArmedTrackId, getSoloedTrackId, getActiveSequencerTrackId, isTrackRecording, getRecordingTrackId 
} from './state.js';
import { 
    initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary, 
    loadSoundFromBrowserToTarget, playSlicePreview, playDrumSamplerPadPreview, 
    loadSampleFile, loadDrumSamplerPadFile, autoSliceSample 
} from './audio.js';
import {
    openTrackEffectsRackWindow, openTrackSequencerWindow,
    openGlobalControlsWindow, openTrackInspectorWindow,
    openMixerWindow, updateMixerWindow,
    openSoundBrowserWindow, renderSoundBrowserDirectory, 
    highlightPlayingStep
} from './ui.js';


console.log("SCRIPT EXECUTION STARTED - SnugOS v5.5.1 (Modularized - main.js with Diagnostics)");

// --- Global Variables & Initialization ---
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


// --- DIAGNOSTIC LOG ---
console.log("--- MAIN.JS DIAGNOSTICS (before global assignments) ---");
console.log("Type of getTracks (from state.js):", typeof getTracks, getTracks);
console.log("Type of getTrackById (from state.js):", typeof getTrackById, getTrackById);
console.log("Type of getArmedTrackId (from state.js):", typeof getArmedTrackId, getArmedTrackId); // Check this one specifically
console.log("Type of addTrackToState (from state.js):", typeof addTrackToState, addTrackToState);
console.log("Type of openTrackInspectorWindow (from ui.js):", typeof openTrackInspectorWindow, openTrackInspectorWindow);
console.log("Type of handleTrackMute (from eventHandlers.js):", typeof handleTrackMute, handleTrackMute);
console.log("Type of autoSliceSample (from audio.js):", typeof autoSliceSample, autoSliceSample);
console.log("--- END MAIN.JS DIAGNOSTICS ---");


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
window.autoSliceSample = autoSliceSample;

// State functions
window.captureStateForUndo = captureStateForUndo;
window.handleProjectFileLoad = handleProjectFileLoad; 
window.undoLastAction = undoLastAction;
window.redoLastAction = redoLastAction;
window.saveProject = saveProject;
window.loadProject = loadProject;
window.exportToWav = exportToWav;
window.addTrack = addTrackToState;

// Event Handler functions
window.handleTrackMute = handleTrackMute;
window.handleTrackSolo = handleTrackSolo;
window.handleTrackArm = handleTrackArm;
window.removeTrack = handleRemoveTrack;
window.handleOpenTrackInspector = handleOpenTrackInspector;
window.handleOpenEffectsRack = handleOpenEffectsRack;
window.handleOpenSequencer = handleOpenSequencer;
window.attachGlobalControlEvents = attachGlobalControlEvents;

// Expose state getters
window.getTracks = getTracks;
window.getTrackById = getTrackById;
window.getArmedTrackId = getArmedTrackId; // Line ~118
window.getSoloedTrackId = getSoloedTrackId;
window.getActiveSequencerTrackId = getActiveSequencerTrackId;
window.isTrackRecording = isTrackRecording;
window.getRecordingTrackId = getRecordingTrackId;

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
        loadProject: loadProject,
        exportToWav: exportToWav,
        openGlobalControlsWindow: openGlobalControlsWindow,
        openMixerWindow: openMixerWindow,
        handleProjectFileLoad: handleProjectFileLoad
    };
    initializePrimaryEventListeners(appContext);
    
    await openGlobalControlsWindow();
    await setupMIDI();
    requestAnimationFrame(updateMetersLoop);
    updateUndoRedoButtons();

    showNotification("Welcome to SnugOS! (Diagnostics Added)", 2500);
    console.log("SnugOS Initialized (Diagnostics Added).");
}

// Meter Update Loop
function updateMetersLoop() {
    updateMeters(window.masterMeter, window.masterMeterBar, document.getElementById('mixerMasterMeterBar'), getTracks());
    requestAnimationFrame(updateMetersLoop);
}

// --- Global Event Listeners ---
window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    if (getTracks().length > 0 && (typeof undoStack !== 'undefined' && undoStack.length > 0 || Object.keys(window.openWindows).length > 1)) { // Check if undoStack is defined
        e.preventDefault();
        e.returnValue = '';
    }
});

console.log("SCRIPT EXECUTION FINISHED - SnugOS v5.5.1 (Modularized - main.js with Diagnostics)");
