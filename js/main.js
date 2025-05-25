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
    selectMIDIInput // Exposing selectMIDIInput for reconstructDAW in state.js
} from './eventHandlers.js';
import {
    getTracks, getTrackById,
    addTrackToState,
    updateUndoRedoButtons, captureStateForUndo, undoLastAction, redoLastAction,
    gatherProjectData, reconstructDAW, saveProject, loadProject, handleProjectFileLoad, exportToWav,
    getArmedTrackId, getSoloedTrackId, getActiveSequencerTrackId, isTrackRecording, getRecordingTrackId, getUndoStack
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
    highlightPlayingStep,
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, updateDrumPadControlsUI 
} from './ui.js';


console.log("SCRIPT EXECUTION STARTED - SnugOS v5.5.1 (Modularized - main.js)");

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


// --- DIAGNOSTIC LOG (Confirming key imports) ---
// console.log("--- MAIN.JS DIAGNOSTICS (Confirming Imports) ---");
// console.log("typeof getArmedTrackId (from state.js):", typeof getArmedTrackId);
// console.log("typeof addTrackToState (from state.js):", typeof addTrackToState);
// console.log("typeof openTrackInspectorWindow (from ui.js):", typeof openTrackInspectorWindow);
// console.log("typeof handleTrackMute (from eventHandlers.js):", typeof handleTrackMute);
// console.log("typeof autoSliceSample (from audio.js):", typeof autoSliceSample);
// console.log("typeof reconstructDAW (from state.js):", typeof reconstructDAW);
// console.log("--- END MAIN.JS DIAGNOSTICS ---");


// --- Exposing functions globally (TEMPORARY - Reduce these as modules import directly) ---
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
window.drawWaveform = drawWaveform;
window.drawInstrumentWaveform = drawInstrumentWaveform;
window.renderSamplePads = renderSamplePads;
window.updateSliceEditorUI = updateSliceEditorUI;
window.updateDrumPadControlsUI = updateDrumPadControlsUI;

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
window.addTrack = addTrackToState; // For Start Menu via appContext

// Event Handler functions
window.handleTrackMute = handleTrackMute;
window.handleTrackSolo = handleTrackSolo;
window.handleTrackArm = handleTrackArm;
window.removeTrack = handleRemoveTrack; 
window.handleOpenTrackInspector = handleOpenTrackInspector;
window.handleOpenEffectsRack = handleOpenEffectsRack;
window.handleOpenSequencer = handleOpenSequencer;
window.attachGlobalControlEvents = attachGlobalControlEvents;
window.selectMIDIInput = selectMIDIInput;

// State getters
window.getTracks = getTracks;
window.getTrackById = getTrackById;
window.getArmedTrackId = getArmedTrackId;
window.getSoloedTrackId = getSoloedTrackId;
window.getActiveSequencerTrackId = getActiveSequencerTrackId;
window.isTrackRecording = isTrackRecording;
window.getRecordingTrackId = getRecordingTrackId;
window.getUndoStack = getUndoStack;

// UI Update stubs
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
    console.log("[Main] Window loaded. Initializing SnugOS...");
    
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

    showNotification("Welcome to SnugOS!", 2500);
    console.log("[Main] SnugOS Initialized.");
}

// Meter Update Loop
function updateMetersLoop() {
    const currentTracks = typeof getTracks === 'function' ? getTracks() : [];
    updateMeters(window.masterMeter, window.masterMeterBar, document.getElementById('mixerMasterMeterBar'), currentTracks);
    requestAnimationFrame(updateMetersLoop);
}

// --- Global Event Listeners ---
window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    const currentUndoStack = getUndoStack();
    if (getTracks().length > 0 && (currentUndoStack.length > 0 || Object.keys(window.openWindows).length > 1)) {
        e.preventDefault();
        e.returnValue = '';
    }
});

console.log("SCRIPT EXECUTION FINISHED - SnugOS v5.5.1");
