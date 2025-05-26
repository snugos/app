// js/main.js - Main Application Logic Orchestrator
// js/main.js - Main Application Logic Orchestrator

import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
// ... (all your other imports for main.js) ...
import { 
    openTrackEffectsRackWindow, openTrackSequencerWindow, 
    openGlobalControlsWindow, /* ... other ui.js imports ... */ 
    highlightPlayingStep 
} from './ui.js';


// --- IMMEDIATE TEST AT THE VERY TOP ---
console.log('[Main.js Direct Test] Attempting to create a test SnugWindow immediately after imports.');
try {
    if (typeof SnugWindow === 'function' && document.getElementById('desktop')) {
        const testContent = document.createElement('div');
        testContent.innerHTML = '<p>Test Window Content</p>';
        const testWin = new SnugWindow('__testWin', 'Test Window', testContent, {width: 200, height: 100});
        if (testWin && testWin.element) {
            console.log('[Main.js Direct Test] Test SnugWindow instance created successfully:', testWin);
        } else {
            console.error('[Main.js Direct Test] Test SnugWindow created, but instance or element is invalid:', testWin);
        }
    } else {
        if (typeof SnugWindow !== 'function') {
            console.error('[Main.js Direct Test] SnugWindow class is NOT a function here.');
        }
        if (!document.getElementById('desktop')) {
            console.error('[Main.js Direct Test] #desktop element is NOT available here (this is unexpected).');
        }
    }
} catch (e) {
    console.error('[Main.js Direct Test] CRITICAL ERROR during direct SnugWindow instantiation:', e);
}
console.log('[Main.js Direct Test] Finished immediate test.');
// --- END IMMEDIATE TEST ---


console.log("SCRIPT EXECUTION STARTED - SnugOS (main.js)"); // Your existing log

// --- Global Variables & Initialization ---
// ... (rest of your main.js file as it was in daw_main_js_window_robustness) ...

import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import { showNotification, showCustomModal, showConfirmationDialog } from './utils.js';
import { 
    initializePrimaryEventListeners,
    setupMIDI,
    attachGlobalControlEvents,
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer,
    selectMIDIInput
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
    openSoundBrowserWindow, renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary,
    highlightPlayingStep,
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, updateDrumPadControlsUI, renderDrumSamplerPads
} from './ui.js';


console.log("SCRIPT EXECUTION STARTED - SnugOS (main.js)");

// --- Global Variables & Initialization ---
window.loadedZipFiles = {};
window.soundLibraryFileTrees = {};
window.currentLibraryName = null;
window.currentSoundFileTree = null;
window.currentSoundBrowserPath = [];
window.previewPlayer = null;
window.midiAccess = null;
window.activeMIDIInput = null;
window.transportEventsInitialized = false;
window.masterMeter = null;
window.openWindows = {}; // Critical for SnugWindow
window.highestZIndex = 100; // Critical for SnugWindow

const DESKTOP_BACKGROUND_KEY = 'snugosDesktopBackground';

// --- DOM Elements ---
// These are generally not needed as globals if accessed within functions after DOM load
// const desktop = document.getElementById('desktop'); 
// ... other elements

// Globals for controls that might be accessed frequently from various places
window.playBtn = null; 
window.recordBtn = null; 
window.tempoInput = null;
window.masterMeterBar = null; 
window.midiInputSelectGlobal = null;
window.midiIndicatorGlobalEl = null; 
window.keyboardIndicatorGlobalEl = null;


// --- Desktop Background Functions ---
function applyDesktopBackground(imageUrl) {
    const desktopEl = document.getElementById('desktop');
    if (desktopEl && imageUrl) {
        desktopEl.style.backgroundImage = `url('${imageUrl}')`;
        desktopEl.style.backgroundSize = 'cover';
        desktopEl.style.backgroundPosition = 'center center';
        desktopEl.style.backgroundRepeat = 'no-repeat';
        desktopEl.style.backgroundColor = ''; 
    } else if (desktopEl) { 
        desktopEl.style.backgroundImage = '';
        desktopEl.style.backgroundColor = Constants.defaultDesktopBg || '#FFB6C1'; 
    }
}

function handleCustomBackgroundUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataURL = e.target.result;
            try {
                localStorage.setItem(DESKTOP_BACKGROUND_KEY, dataURL);
                applyDesktopBackground(dataURL);
                showNotification("Custom background applied.", 2000);
            } catch (error) {
                console.error("Error saving background to localStorage:", error);
                showNotification("Could not save background: Storage full or image too large.", 4000);
                applyDesktopBackground(dataURL); 
            }
        };
        reader.onerror = () => {
            showNotification("Error reading image file.", 3000);
        };
        reader.readAsDataURL(file);
    } else if (file) {
        showNotification("Invalid file type. Please select an image.", 3000);
    }
    if (event.target) event.target.value = null; 
}

function removeCustomDesktopBackground() {
    localStorage.removeItem(DESKTOP_BACKGROUND_KEY);
    applyDesktopBackground(null); 
    showNotification("Custom background removed.", 2000);
}

// --- Exposing functions globally ---
// This section makes functions available on the window object, which is often necessary
// for event handlers set in HTML or for calls between loosely coupled modules if not using ES6 module system fully.
// Given you are using ES6 modules, direct export/import is preferred, but some might be for legacy or specific interop.
window.openTrackEffectsRackWindow = openTrackEffectsRackWindow;
window.openTrackSequencerWindow = openTrackSequencerWindow;
window.createWindow = (id, title, contentHTMLOrElement, options = {}) => {
    if (window.openWindows[id] && !window.openWindows[id].element.classList.contains('minimized')) { // Check if not minimized
        window.openWindows[id].restore(); return window.openWindows[id];
    }
    // If minimized or not existing, create new or restore if it exists but was closed/problematic
    if (window.openWindows[id]) { // If it exists but was problematic or closed, try to re-init
        try { window.openWindows[id].close(); } catch(e) { /* ignore error if already removed */ }
    }
    const newWindow = new SnugWindow(id, title, contentHTMLOrElement, options);
    return newWindow.element ? newWindow : null;
};
window.updateMixerWindow = updateMixerWindow;
window.highlightPlayingStep = highlightPlayingStep;
window.renderSoundBrowserDirectory = renderSoundBrowserDirectory;
window.updateSoundBrowserDisplayForLibrary = updateSoundBrowserDisplayForLibrary;
window.openGlobalControlsWindow = openGlobalControlsWindow;
window.openMixerWindow = openMixerWindow;
window.openSoundBrowserWindow = openSoundBrowserWindow;
window.openTrackInspectorWindow = openTrackInspectorWindow;
window.drawWaveform = drawWaveform;
window.drawInstrumentWaveform = drawInstrumentWaveform;
window.renderSamplePads = renderSamplePads;
window.updateSliceEditorUI = updateSliceEditorUI;
window.updateDrumPadControlsUI = updateDrumPadControlsUI;
window.renderDrumSamplerPads = renderDrumSamplerPads;


window.playSlicePreview = playSlicePreview;
window.playDrumSamplerPadPreview = playDrumSamplerPadPreview;
window.loadSampleFile = loadSampleFile;
window.loadDrumSamplerPadFile = loadDrumSamplerPadFile;
window.loadSoundFromBrowserToTarget = loadSoundFromBrowserToTarget;
window.fetchSoundLibrary = fetchSoundLibrary;
window.initAudioContextAndMasterMeter = initAudioContextAndMasterMeter;
window.autoSliceSample = autoSliceSample;

window.captureStateForUndo = captureStateForUndo;
window.handleProjectFileLoad = handleProjectFileLoad;
window.undoLastAction = undoLastAction;
window.redoLastAction = redoLastAction;
window.saveProject = saveProject;
window.loadProject = loadProject;
window.exportToWav = exportToWav;
window.addTrack = addTrackToState; // Exposing the async version

window.handleTrackMute = handleTrackMute;
window.handleTrackSolo = handleTrackSolo;
window.handleTrackArm = handleTrackArm;
window.removeTrack = handleRemoveTrack;
window.handleOpenTrackInspector = handleOpenTrackInspector;
window.handleOpenEffectsRack = handleOpenEffectsRack;
window.handleOpenSequencer = handleOpenSequencer;
window.attachGlobalControlEvents = attachGlobalControlEvents;
window.selectMIDIInput = selectMIDIInput;

window.getTracks = getTracks;
window.getTrackById = getTrackById;
window.getArmedTrackId = getArmedTrackId;
window.getSoloedTrackId = getSoloedTrackId;
window.getActiveSequencerTrackId = getActiveSequencerTrackId;
window.isTrackRecording = isTrackRecording;
window.getRecordingTrackId = getRecordingTrackId;
window.getUndoStack = getUndoStack;

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

    // Ensure critical globals for SnugWindow are set, though they are already at top level
    if (typeof window.openWindows === 'undefined') window.openWindows = {};
    if (typeof window.highestZIndex === 'undefined') window.highestZIndex = 100;


    const savedBg = localStorage.getItem(DESKTOP_BACKGROUND_KEY);
    if (savedBg) {
        applyDesktopBackground(savedBg);
    } else {
        const desktopEl = document.getElementById('desktop');
        if (desktopEl && Constants.defaultDesktopBg) {
            desktopEl.style.backgroundColor = Constants.defaultDesktopBg;
        }
    }

    const appContext = {
        addTrack: addTrackToState, // Pass the async version
        openSoundBrowserWindow: openSoundBrowserWindow,
        undoLastAction: undoLastAction,
        redoLastAction: redoLastAction,
        saveProject: saveProject,
        loadProject: loadProject,
        exportToWav: exportToWav,
        openGlobalControlsWindow: openGlobalControlsWindow,
        openMixerWindow: openMixerWindow,
        handleProjectFileLoad: handleProjectFileLoad,
        triggerCustomBackgroundUpload: () => {
            const bgInput = document.getElementById('customBgInput');
            if (bgInput) bgInput.click(); else console.error("Custom background input not found.");
        },
        removeCustomDesktopBackground: removeCustomDesktopBackground,
    };
    initializePrimaryEventListeners(appContext);

    document.getElementById('customBgInput')?.addEventListener('change', handleCustomBackgroundUpload);

    // Attempt to open global controls and make it more robust
    try {
        const globalControlsWindowInstance = await openGlobalControlsWindow();
        if (!globalControlsWindowInstance || !globalControlsWindowInstance.element) {
            console.error("[Main] CRITICAL: Failed to initialize Global Controls Window. App functionality will be severely limited.");
            showNotification("CRITICAL Error: Global controls window failed. App may not function.", 8000);
            // Depending on how critical this window is, you might return here or try to continue
        } else {
            console.log("[Main] Global Controls Window initialized successfully.");
            // Assign to window globals only if the window and its element exist
            window.playBtn = globalControlsWindowInstance.element.querySelector('#playBtnGlobal');
            window.recordBtn = globalControlsWindowInstance.element.querySelector('#recordBtnGlobal');
            window.tempoInput = globalControlsWindowInstance.element.querySelector('#tempoGlobalInput');
            window.masterMeterBar = globalControlsWindowInstance.element.querySelector('#masterMeterBarGlobal');
            window.midiInputSelectGlobal = globalControlsWindowInstance.element.querySelector('#midiInputSelectGlobal');
            window.midiIndicatorGlobalEl = globalControlsWindowInstance.element.querySelector('#midiIndicatorGlobal');
            window.keyboardIndicatorGlobalEl = globalControlsWindowInstance.element.querySelector('#keyboardIndicatorGlobal');
        }
    } catch (error) {
        console.error("[Main] Error during openGlobalControlsWindow call:", error);
        showNotification("Error initializing global controls. Please check console.", 5000);
    }
    
    // Setup MIDI (should ideally happen after global controls UI elements are confirmed)
    if (window.midiInputSelectGlobal) { // Check if MIDI select is available before setting up
        await setupMIDI();
    } else {
        console.warn("[Main] MIDI input select element not found, skipping MIDI setup for now.");
    }


    const libraryPromises = [];
    let librariesToFetchCount = 0;
    if (Constants.soundLibraries) {
        for (const libName in Constants.soundLibraries) {
            if (Object.hasOwnProperty.call(Constants.soundLibraries, libName)) {
                librariesToFetchCount++;
                libraryPromises.push(fetchSoundLibrary(libName, Constants.soundLibraries[libName], true));
            }
        }
    }

    if (librariesToFetchCount > 0) {
        showNotification(`Pre-loading ${librariesToFetchCount} sound libraries...`, 2000);
        Promise.allSettled(libraryPromises).then(results => {
            let successCount = 0;
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    successCount++;
                } else {
                    console.warn(`[Main] Autofetch failed for one library: ${result.reason}`);
                }
            });
            if (successCount === librariesToFetchCount && librariesToFetchCount > 0) {
                showNotification("All sound library pre-load attempts finished.", 2500);
            } else if (successCount > 0) {
                showNotification(`${successCount} of ${librariesToFetchCount} sound library pre-load attempts finished. Some may have had issues.`, 3000);
            } else if (librariesToFetchCount > 0) {
                showNotification("Failed to pre-load sound libraries. Check console.", 3000);
            }
        });
    }

    requestAnimationFrame(updateMetersLoop);
    updateUndoRedoButtons();

    showNotification("Welcome to SnugOS!", 2500);
    console.log("[Main] SnugOS Initialized.");
}

function updateMetersLoop() {
    const currentTracks = typeof getTracks === 'function' ? getTracks() : [];
    updateMeters(window.masterMeter, window.masterMeterBar, document.getElementById('mixerMasterMeterBar'), currentTracks);
    requestAnimationFrame(updateMetersLoop);
}

window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    const currentUndoStack = getUndoStack ? getUndoStack() : [];
    const currentTracks = getTracks ? getTracks() : [];
    if (currentTracks.length > 0 && (currentUndoStack.length > 0 || (window.openWindows && Object.keys(window.openWindows).length > 1))) {
        e.preventDefault();
        e.returnValue = ''; // Standard for most browsers
    }
});

console.log("SCRIPT EXECUTION FINISHED - SnugOS (main.js)");
