// js/daw/main.js - Main Application Logic Orchestrator

import { SnugWindow } from './SnugWindow.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenPianoRoll,
    handleTimelineLaneDrop, handleOpenYouTubeImporter
} from './eventHandlers.js';

// Global files loaded via script tags in snaw.html.
// Their contents are globally available, but for modularity, some are explicitly imported or accessed via appServices.
// Tone, Konva, JSZip are global via script tags.
// Constants, db, effectsRegistry, utils are also loaded globally via script tags.

import {
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters,
    rebuildMasterEffectChain, addMasterEffectToAudio, removeMasterEffectFromAudio,
    updateMasterEffectParamInAudio, reorderMasterEffectInAudio, setActualMasterVolume,
    getMasterBusInputNode, forceStopAllAudio
} from './audio/audio.js';
import { initializePlayback, playSlicePreview, playDrumSamplerPadPreview, scheduleTimelinePlayback } from './audio/playback.js';
import { initializeRecording, startAudioRecording, stopAudioRecording } from './audio/recording.js';
import {
    initializeSampleManager, loadSampleFile, loadDrumSamplerPadFile, loadSoundFromBrowserToTarget,
    getAudioBlobFromSoundBrowserItem, autoSliceSample, fetchSoundLibrary
} from './audio/sampleManager.js';

import {
    initializeUIModule, openTrackInspectorWindow, openMixerWindow, openTrackEffectsRackWindow,
    openMasterEffectsRackWindow, openSoundBrowserWindow, openPianoRollWindow,
    openYouTubeImporterWindow, updateMixerWindow, renderEffectsList, renderEffectControls,
    renderDirectoryView, renderSoundBrowser,
    renderSamplePads, updateSliceEditorUI,
    renderDrumSamplerPads, updateDrumPadControlsUI, createKnob
} from './ui/ui.js';

import { initializeMetronome, toggleMetronome } from './audio/metronome.js';

// NEW: Import from backgroundManager and auth.js
import { initializeBackgroundManager, applyCustomBackground, handleBackgroundUpload, loadAndApplyUserBackground } from '../backgroundManager.js';
import { initializeAuth, checkLocalAuth } from '../auth.js'; 

// Import all state management modules
import { initializeAppState, getMidiAccess, setActiveMIDIInput, getPlaybackMode, setPlaybackMode, getCurrentUserThemePreference, setCurrentUserThemePreference, getSelectedTimelineClipInfo, setSelectedTimelineClipInfo, getMidiRecordModeState, setMidiRecordModeState } from './state/appState.js';
import { initializeMasterState, getMasterEffects, setMasterEffects, addMasterEffect, removeMasterEffect, updateMasterEffectParam, reorderMasterEffect, getMasterGainValue, setMasterGainValue } from './state/masterState.js';
import { initializeProjectState, getIsReconstructingDAW, setIsReconstructingDAW, getUndoStack, getRedoStack, getClipboardData, setClipboardData, captureStateForUndo, undoLastAction, redoLastAction, gatherProjectData, reconstructDAW, saveProject, loadProject, handleProjectFileLoad, exportToWav } from './state/projectState.js';
import { initializeSoundLibraryState, getLoadedZipFiles, setLoadedZipFiles, getSoundLibraryFileTrees, setSoundLibraryFileTrees, getCurrentLibraryName, setCurrentLibraryName, getCurrentSoundBrowserPath, setCurrentSoundBrowserPath, getPreviewPlayer, setPreviewPlayer, addFileToSoundLibrary } from './state/soundLibraryState.js';
import { initializeTrackState, getTracks, getTrackById, getSoloedTrackId, setSoloedTrackId, getArmedTrackId, setArmedTrackId, isRecording, setIsRecording, getRecordingTrackId, setRecordingTrackId, getRecordingStartTime, setRecordingStartTime, addTrack, removeTrack, setTracks, setTrackIdCounter } from './state/trackState.js';
import { initializeWindowState, getOpenWindows, getWindowById, addWindowToStore, removeWindowFromStore, getHighestZ, setHighestZ, incrementHighestZ } from './state/windowState.js';


let appServices = {};
let loggedInUser = null; 

function openDefaultLayout() {
    setTimeout(() => {
        const desktopEl = appServices.uiElementsCache?.desktop || document.getElementById('desktop');
        if (!desktopEl) {
            console.error("[main.js] Desktop element not found for openDefaultLayout.");
            return;
        }

        const rect = desktopEl.getBoundingClientRect();
        const margin = 10;
        const gap = 10;

        const topTaskbarHeight = appServices.uiElementsCache.topTaskbar?.offsetHeight || 40;
        const taskbarHeight = appServices.uiElementsCache.taskbar?.offsetHeight || 32;

        const availableHeight = rect.height - topTaskbarHeight - taskbarHeight - (margin * 2);

        const mixerHeight = Math.floor(availableHeight * 0.5); 
        const masterEffectsHeight = availableHeight - mixerHeight - gap; 

        const sidePanelWidth = 350;
        const leftPanelWidth = Math.floor(desktopEl.clientWidth * 0.5);

        const row1Y = topTaskbarHeight + margin; 

        appServices.openMixerWindow({
            x: margin,
            y: row1Y,
            width: leftPanelWidth,
            height: mixerHeight
        });

        appServices.openMasterEffectsRackWindow({
            x: margin,
            y: row1Y + mixerHeight + gap, 
            width: leftPanelWidth,
            height: masterEffectsHeight 
        });

        const soundBrowserX = rect.width - sidePanelWidth - margin;
        appServices.openSoundBrowserWindow({
            x: soundBrowserX,
            y: row1Y,
            height: availableHeight 
        });
    }, 100);
}

function handleMasterEffectsUIUpdate() {
    const rackWindow = appServices.getWindowById('masterEffectsRack');
    if (rackWindow && rackWindow.element && !rackWindow.isMinimized) {
        rackWindow.refresh();
    }
}

function handleTrackUIUpdate(trackId, reason, detail) {
    const track = appServices.getTrackById(trackId);
    if (!track) return;

    const soloedTrackId = appServices.getSoloedTrackId();
    const isEffectivelyMuted = track.isMuted || (soloedTrackId !== null && soloedTrackId !== track.id);

    const inspectorWindow = appServices.getWindowById(`trackInspector-${track.id}`);
    if (inspectorWindow && inspectorWindow.element && !inspectorWindow.isMinimized) {
        const muteBtn = inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
        const soloBtn = inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
        const armBtn = inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);

        if (reason === 'armChanged') {
            if (armBtn) armBtn.classList.toggle('armed', appServices.getArmedTrackId() === track.id);
        }
        if (reason === 'soloChanged' || reason === 'muteChanged') {
            if (muteBtn) {
                muteBtn.classList.toggle('muted', isEffectivelyMuted);
                muteBtn.textContent = track.isMuted ? 'Unmute' : 'Mute';
            }
            if (soloBtn) {
                soloBtn.classList.toggle('soloed', track.isSoloed);
                soloBtn.textContent = track.isSoloed ? 'Unsolo' : 'Solo';
            }
        }
        if (reason === 'nameChanged') {
            const titleSpan = inspectorWindow.titleBar.querySelector('span');
            if (titleSpan) titleSpan.textContent = `Inspector: ${track.name}`;
            if (inspectorWindow.taskbarButton) inspectorWindow.taskbarButton.textContent = `Inspector: ${track.name}`;
        }
        if (reason === 'instrumentSamplerLoaded') {
            const canvas = inspectorWindow.element.querySelector(`#waveform-canvas-instrument-${track.id}`);
            if (canvas && track.instrumentSamplerSettings.audioBuffer) {
                appServices.drawWaveform(canvas, track.instrumentSamplerSettings.audioBuffer); 
            }
        }
    }

    const mixerWindow = appServices.getWindowById('mixer');
    if (mixerWindow && mixerWindow.element && !mixerWindow.isMinimized) {
        const trackDiv = mixerWindow.element.querySelector(`.mixer-track[data-track-id='${track.id}']`);
        if(trackDiv) {
            const muteBtn = trackDiv.querySelector(`#mixerMuteBtn-${track.id}`);
            if (muteBtn) muteBtn.classList.toggle('muted', isEffectivelyMuted);
            const soloBtn = trackDiv.querySelector(`#mixerSoloBtn-${track.id}`);
            if (soloBtn) soloBtn.classList.toggle('soloed', track.isSoloed);
            const trackNameDiv = trackDiv.querySelector('.track-name');
            if (trackNameDiv && reason === 'nameChanged') {
                trackNameDiv.textContent = track.name;
                trackNameDiv.title = track.name;
            }
        }
    }

    if (reason === 'effectsChanged') {
        const rackWindow = appServices.getWindowById(`effectsRack-${trackId}`);
        rackWindow?.refresh();
    }
}

function onPlaybackModeChange(newMode, oldMode) {
    console.log(`Playback mode changed from ${oldMode} to ${newMode}`);
    const tracks = appServices.getTracks();

    if (Tone.Transport.state === 'started') {
        Tone.Transport.stop();
    }

    tracks.forEach(track => track.sequences.stopSequence?.());

    tracks.forEach(track => track.sequences.recreateToneSequence?.());

    const playbackModeToggle = document.getElementById('playbackModeToggleBtnGlobalTop');
    if (playbackModeToggle) {
        const modeText = newMode.charAt(0).toUpperCase() + newMode.slice(1);
        playbackModeToggle.textContent = `Mode: ${modeText}`;
    }
}

async function initializeSnugOS() {
    console.log("[main.js] Initializing SnugOS...");

    // Cache UI elements that are accessed frequently for performance
    appServices.uiElementsCache = {
        desktop: document.getElementById('desktop'),
        taskbar: document.getElementById('taskbar'),
        topTaskbar: document.getElementById('topTaskbar'),
        taskbarButtons: document.getElementById('taskbarButtons'),
        startButton: document.getElementById('startButton'),
        startMenu: document.getElementById('startMenu'),
        taskbarClockDisplay: document.getElementById('taskbarClockDisplay'),
        userAuthContainer: document.getElementById('userAuthContainer'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        notificationArea: document.getElementById('notification-area'),
        modalContainer: document.getElementById('modalContainer'),
        customBgInput: document.getElementById('customBgInput'),
        loadProjectInput: document.getElementById('loadProjectInput'),
        sampleFileInput: document.getElementById('sampleFileInput'),
    };

    function drawLoop() {
        if (typeof Tone !== 'undefined') {
            const transportTime = Tone.Transport.seconds;
            
            const mode = appServices.getPlaybackMode(); // Access via appServices
            appServices.updatePianoRollPlayhead(transportTime); 
            
            appServices.updateMeters(appServices.uiElementsCache.masterMeterBarGlobalTop, null, appServices.getTracks());
        }
        requestAnimationFrame(drawLoop);
    }

    // --- CRITICAL: Populate appServices with ALL necessary functions immediately ---
    // Core utilities (from utils.js, assumed globally available)
    appServices.showNotification = showNotification; 
    appServices.showCustomModal = showCustomModal;   
    appServices.createContextMenu = createContextMenu;
    appServices.drawWaveform = drawWaveform; // From utils.js
    
    // Window State functions (imported from windowState.js)
    appServices.addWindowToStore = addWindowToStore;
    appServices.removeWindowFromStore = removeWindowFromStore;
    appServices.incrementHighestZ = incrementHighestZ;
    appServices.getHighestZ = getHighestZ;
    appServices.setHighestZ = setHighestZ;
    appServices.getOpenWindows = getOpenWindows;
    appServices.getWindowById = getWindowById;

    // Auth related services (auth.js will implement the logic)
    appServices.getLoggedInUser = () => loggedInUser; // Exposed for other modules
    appServices.setLoggedInUser = (user) => { loggedInUser = user; }; // Exposed for auth.js to set

    // Background Management services (from backgroundManager.js)
    appServices.applyCustomBackground = applyCustomBackground;
    appServices.handleBackgroundUpload = handleBackgroundUpload;
    appServices.loadAndApplyUserBackground = loadAndApplyUserBackground;
    
    // IndexedDB Access (from db.js, assumed globally available)
    appServices.dbStoreAudio = storeAudio;
    appServices.dbGetAudio = getAudio;
    appServices.dbDeleteAudio = deleteAudio;
    appServices.storeAsset = storeAsset; // For local user assets like background
    appServices.getAsset = getAsset;     // For local user assets like background

    // Initialize core state management modules
    initializeAppState(appServices);
    initializeMasterState(appServices);
    initializeProjectState(appServices);
    initializeSoundLibraryState(appServices);
    initializeTrackState(appServices);
    initializeWindowState(appServices); // Important for windowState functions
    console.log("[main.js] Core state modules initialized.");

    // Initialize background manager module (it depends on appServices, but also takes loadAndApplyUserBackground)
    initializeBackgroundManager(appServices, loadAndApplyUserBackground); 
    console.log("[main.js] backgroundManager initialized.");

    // Initialize core application modules, passing appServices
    initializeAudioModule(appServices);
    initializePlayback(appServices);
    initializeRecording(appServices);
    initializeSampleManager(appServices);
    initializeMetronome(appServices);
    console.log("[main.js] Audio and core modules initialized.");

    // Initialize UI modules, passing the full appServices object
    initializeUIModule(appServices);
    console.log("[main.js] UI modules initialized.");

    // Initialize Event Handlers (relying on fully populated appServices)
    initializeEventHandlersModule(appServices);
    initializePrimaryEventListeners(); // Attaches main document listeners
    attachGlobalControlEvents({}); // Attaches DAW control listeners (play, stop, record, etc.)
    setupMIDI(); // Sets up MIDI input
    console.log("[main.js] Event handlers and MIDI setup complete.");

    // Initialize Auth (this will set the loggedInUser and load the background via appServices)
    initializeAuth(appServices); // From ../auth.js
    console.log("[main.js] Auth module initialized.");

    // Apply initial theme preference (theme state managed by appState/auth)
    // The actual background loading is now handled by initializeAuth which calls loadAndApplyUserBackground
    // `applyUserThemePreference` is a function from auth.js, but also potentially in other files.
    // Ensure the one called is the auth module's one or a consistent one.
    // window.matchMedia is for system theme changes, typically handled in auth or central theme module.
    // For consistency, ensure `applyUserThemePreference` is accessible via appServices if needed.
    // (This line might need to be removed if it's already handled within `auth.js` or elsewhere)
    // window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', appServices.applyUserThemePreference); 

    // Open default layout windows
    openDefaultLayout();
    console.log("[main.js] Default layout opened.");

    console.log("SnugOS Initialized Successfully.");

    // Tone.js settings
    appServices.context.lookAhead = 0.02;
    appServices.context.updateInterval = 0.01;
    console.log(`[Latency] lookAhead set to: ${appServices.context.lookAhead}`);
    console.log(`[Latency] updateInterval set to: ${appServices.context.updateInterval}`);

    // Start main drawing loop
    drawLoop();
    console.log("[main.js] Draw loop started.");
}

document.addEventListener('DOMContentLoaded', initializeSnugOS);
