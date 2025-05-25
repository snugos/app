// js/main.js - Main Application Logic Orchestrator
// SnugOS Version 5.5.1 (Modularized)

// Import core classes and functions from modules
import { SnugWindow } from './SnugWindow.js';
import { Track } from './Track.js';
import { showNotification, showCustomModal, showConfirmationDialog, createDropZoneHTML, setupDropZoneListeners } from './utils.js';
import { createKnob } from './ui.js'; // Assuming createKnob will be moved to ui.js
import * as Constants from './constants.js';
import { initializeCoreEventListeners, setupMIDI, handleMIDIMessage, computerKeySynthMap, computerKeySamplerMap, currentlyPressedComputerKeys } from './eventHandlers.js';
import { updateUndoRedoButtons, captureStateForUndo, undoLastAction, redoLastAction, gatherProjectData, reconstructDAW, saveProject, loadProject, exportToWav } from './state.js';
import { initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary, renderSoundBrowserDirectory, loadSoundFromBrowserToTarget, playSlicePreview, playDrumSamplerPadPreview, loadSampleFile, loadDrumSamplerPadFile, autoSliceSample } from './audio.js';
import { buildTrackInspectorContentDOM, initializeCommonInspectorControls, initializeTypeSpecificInspectorControls, buildEffectsRackContentDOM, openTrackEffectsRackWindow, buildSequencerContentDOM, openTrackSequencerWindow, highlightPlayingStep, openGlobalControlsWindow, openTrackInspectorWindow, openMixerWindow, updateMixerWindow, renderMixer, openSoundBrowserWindow, renderSamplePads, updateSliceEditorUI, applySliceEdits, drawWaveform, drawInstrumentWaveform, updateDrumPadControlsUI, renderDrumSamplerPads } from './ui.js';


console.log("SCRIPT EXECUTION STARTED - SnugOS v5.5.1 (Modularized - main.js)");

// --- Global Variables & Initialization (Moved from original app.js, some will be managed by state.js) ---
// These will be gradually refactored to be less global or managed by specific modules.
// For now, they are declared here to maintain functionality during refactoring.
window.tracks = []; // Array to store all tracks (eventually managed by state.js or trackManager.js)
window.trackIdCounter = 0; // Simple counter for unique track IDs (managed by state.js)
window.activeSequencerTrackId = null; // ID of the track whose sequencer is currently active/focused
window.loadedZipFiles = {}; // Cache for loaded JSZip instances (managed by audio.js)
window.currentLibraryName = null; // Name of the currently selected sound library (managed by audio.js)
window.currentSoundFileTree = null; // Parsed file tree of the current library (managed by audio.js)
window.currentSoundBrowserPath = []; // Current path within the sound browser (managed by audio.js)
window.previewPlayer = null; // Tone.Player instance for sound previews (managed by audio.js)
window.midiAccess = null, window.activeMIDIInput = null, window.armedTrackId = null, window.soloedTrackId = null; // (managed by eventHandlers.js and state.js)
window.transportEventsInitialized = false; // (managed by eventHandlers.js)
window.undoStack = []; // (managed by state.js)
window.redoStack = []; // (managed by state.js)
window.isRecording = false; // (managed by state.js or a recordingManager.js)
window.recordingTrackId = null; // (managed by state.js)
window.recordingStartTime = 0; // (managed by state.js)
window.masterMeter = null; // (managed by audio.js)
window.openWindows = {}; // Stores SnugWindow instances by ID (managed by ui.js or windowManager.js)
window.highestZIndex = 100; // (managed by ui.js or windowManager.js)


// --- DOM Elements (Many will be passed to functions or managed by ui.js) ---
// It's better to query these when needed or pass them around, rather than keeping them all global.
// For now, keeping them for easier transition.
const desktop = document.getElementById('desktop');
const startButton = document.getElementById('startButton');
const startMenu = document.getElementById('startMenu');
const taskbarButtonsContainer = document.getElementById('taskbarButtons');
const taskbarTempoDisplay = document.getElementById('taskbarTempoDisplay');
const menuAddSynthTrack = document.getElementById('menuAddSynthTrack');
const menuAddSamplerTrack = document.getElementById('menuAddSamplerTrack');
const menuAddDrumSamplerTrack = document.getElementById('menuAddDrumSamplerTrack');
const menuAddInstrumentSamplerTrack = document.getElementById('menuAddInstrumentSamplerTrack');
const menuOpenSoundBrowser = document.getElementById('menuOpenSoundBrowser');
const menuUndo = document.getElementById('menuUndo');
const menuRedo = document.getElementById('menuRedo');
const menuSaveProject = document.getElementById('menuSaveProject');
const menuLoadProject = document.getElementById('menuLoadProject');
const menuExportWav = document.getElementById('menuExportWav');
const menuOpenGlobalControls = document.getElementById('menuOpenGlobalControls');
const menuOpenMixer = document.getElementById('menuOpenMixer');
const menuToggleFullScreen = document.getElementById('menuToggleFullScreen');
const loadProjectInputEl = document.getElementById('loadProjectInput');

// Global control elements (will be assigned when Global Controls window is created by ui.js)
// These should ideally be scoped within the module/function that creates/manages them.
window.playBtn = null;
window.recordBtn = null;
window.tempoInput = null;
window.masterMeterBar = null;
window.midiInputSelectGlobal = null;
window.midiIndicatorGlobalEl = null;
window.keyboardIndicatorGlobalEl = null;


// --- Making functions globally available for now (for HTML onclicks and easier refactoring) ---
// Ideally, event listeners should be attached programmatically.
window.openTrackEffectsRackWindow = openTrackEffectsRackWindow;
window.openTrackSequencerWindow = openTrackSequencerWindow;
window.createWindow = (id, title, contentHTMLOrElement, options = {}) => {
    // This is a simplified version. The full createWindow logic is in SnugWindow.js or ui.js
    if (window.openWindows[id]) {
        window.openWindows[id].restore();
        return window.openWindows[id];
    }
    const newWindow = new SnugWindow(id, title, contentHTMLOrElement, options);
    return newWindow.element ? newWindow : null;
};

// --- Core Application Initialization ---
async function initializeSnugOS() {
    console.log("Window loaded. Initializing SnugOS (Modular)...");
    
    initializeCoreEventListeners({ // Pass necessary elements and functions
        startButton, startMenu, taskbarTempoDisplay,
        menuAddSynthTrack, menuAddSamplerTrack, menuAddDrumSamplerTrack, menuAddInstrumentSamplerTrack,
        menuOpenSoundBrowser, menuUndo, menuRedo, menuSaveProject, menuLoadProject, menuExportWav,
        menuOpenGlobalControls, menuOpenMixer, menuToggleFullScreen,
        loadProjectInputEl,
        addTrack, // This function will be defined below or imported from a trackManager module
        openSoundBrowserWindow, undoLastAction, redoLastAction, saveProject, loadProject, exportToWav,
        openGlobalControlsWindow, openMixerWindow
    });

    await openGlobalControlsWindow(); // Open Global Controls by default
    await setupMIDI(); // Initialize MIDI
    requestAnimationFrame(updateMetersLoop); // Start meter animation loop

    updateUndoRedoButtons(); // Set initial state of undo/redo buttons

    showNotification("Welcome to SnugOS! (Modular)", 2500);
    console.log("SnugOS Initialized (Modular).");
}

// --- Track Management (Example - to be fleshed out or moved to trackManager.js) ---
// This is a simplified version of addTrack for now.
export function addTrack(type, initialData = null) {
    if (initialData === null || (initialData && initialData._isUserActionPlaceholder)) {
        captureStateForUndo(`Add ${type} Track`);
        if (initialData && initialData._isUserActionPlaceholder) initialData = null;
    }

    window.trackIdCounter++;
    const newTrack = new Track(window.trackIdCounter, type, initialData);
    window.tracks.push(newTrack);

    if (initialData === null) {
        showNotification(`${type} Track "${newTrack.name}" added.`, 2000);
        openTrackInspectorWindow(newTrack.id);
        updateMixerWindow();
    }
    return newTrack;
}

// --- Meter Update Loop ---
function updateMetersLoop() {
    updateMeters(window.masterMeter, window.masterMeterBar, document.getElementById('mixerMasterMeterBar'), window.tracks);
    requestAnimationFrame(updateMetersLoop);
}


// --- Global Event Listeners (Example - to be moved to eventHandlers.js) ---
window.addEventListener('load', initializeSnugOS);

window.addEventListener('beforeunload', (e) => {
    if (window.tracks.length > 0 && (window.undoStack.length > 0 || Object.keys(window.openWindows).length > 1)) {
        e.preventDefault();
        e.returnValue = '';
    }
});

console.log("SCRIPT EXECUTION FINISHED - SnugOS v5.5.1 (Modularized - main.js)");
