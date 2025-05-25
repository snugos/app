// js/main.js - Main Application Logic Orchestrator
// SnugOS Version 5.5.1 (Modularized)

import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import { showNotification, showCustomModal, showConfirmationDialog } from './utils.js'; // Ensure showNotification is available
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
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, updateDrumPadControlsUI
} from './ui.js';


console.log("SCRIPT EXECUTION STARTED - SnugOS v5.5.1 (Modularized - main.js)");

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
window.openWindows = {};
window.highestZIndex = 100;

const DESKTOP_BACKGROUND_KEY = 'snugosDesktopBackground'; // localStorage key

// --- DOM Elements ---
// ... (no changes here)

window.playBtn = null; window.recordBtn = null; window.tempoInput = null;
// ... (no changes here)

// --- Desktop Background Functions ---
function applyDesktopBackground(imageUrl) {
    const desktopEl = document.getElementById('desktop');
    if (desktopEl && imageUrl) {
        desktopEl.style.backgroundImage = `url('${imageUrl}')`;
        desktopEl.style.backgroundSize = 'cover';
        desktopEl.style.backgroundPosition = 'center center';
        desktopEl.style.backgroundRepeat = 'no-repeat';
        desktopEl.style.backgroundColor = ''; // Clear background color if an image is set
    } else if (desktopEl) { // Clear background image and revert to default color
        desktopEl.style.backgroundImage = '';
        desktopEl.style.backgroundColor = Constants.defaultDesktopBg || '#FFB6C1'; // Apply default color
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
                applyDesktopBackground(dataURL); // Still apply for current session
            }
        };
        reader.onerror = () => {
            showNotification("Error reading image file.", 3000);
        };
        reader.readAsDataURL(file);
    } else if (file) {
        showNotification("Invalid file type. Please select an image.", 3000);
    }
    if (event.target) event.target.value = null; // Reset file input
}

function removeCustomDesktopBackground() {
    localStorage.removeItem(DESKTOP_BACKGROUND_KEY);
    applyDesktopBackground(null); // Clears the inline style and applies default color via applyDesktopBackground
    showNotification("Custom background removed.", 2000);
}


// --- Exposing functions globally ---
// ... (existing exposed functions)
window.updateSoundBrowserDisplayForLibrary = updateSoundBrowserDisplayForLibrary;


// --- Core Application Initialization ---
async function initializeSnugOS() {
    console.log("[Main] Window loaded. Initializing SnugOS...");

    // Load custom background at startup or apply default
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
        addTrack: addTrackToState,
        openSoundBrowserWindow: openSoundBrowserWindow,
        undoLastAction: undoLastAction,
        redoLastAction: redoLastAction,
        saveProject: saveProject,
        loadProject: loadProject,
        exportToWav: exportToWav,
        openGlobalControlsWindow: openGlobalControlsWindow,
        openMixerWindow: openMixerWindow,
        handleProjectFileLoad: handleProjectFileLoad,
        // Add new handlers for background management to appContext
        triggerCustomBackgroundUpload: () => document.getElementById('customBgInput').click(),
        removeCustomDesktopBackground: removeCustomDesktopBackground,
    };
    initializePrimaryEventListeners(appContext);

    // Attach listener for the file input here in main.js after DOM is ready
    document.getElementById('customBgInput')?.addEventListener('change', handleCustomBackgroundUpload);


    await openGlobalControlsWindow();
    await setupMIDI();

    // --- Autofetch Sound Libraries ---
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
    // --- End Autofetch ---

    requestAnimationFrame(updateMetersLoop);
    updateUndoRedoButtons();

    showNotification("Welcome to SnugOS!", 2500);
    console.log("[Main] SnugOS Initialized.");
}

// Meter Update Loop
// ... (no changes here)

// --- Global Event Listeners ---
// ... (no changes here)

console.log("SCRIPT EXECUTION FINISHED - SnugOS v5.5.1");
