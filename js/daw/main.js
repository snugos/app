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
// Tone, Konva, JSZip are global.
// Constants, db, effectsRegistry, utils, auth are also loaded globally.

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

// NEW: Import from backgroundManager
import { initializeBackgroundManager, applyCustomBackground, handleBackgroundUpload, loadAndApplyUserBackground } from '../backgroundManager.js';
// Removed specific auth imports as it's primarily used for handling loggedInUser state, now centralized.
// import { initializeAuth, handleBackgroundUpload } from '../auth.js'; 


// Import the new state modules
import { initializeAppState, getMidiAccess, setActiveMIDIInput, getPlaybackMode, setPlaybackMode, getCurrentUserThemePreference, setCurrentUserThemePreference, getSelectedTimelineClipInfo, setSelectedTimelineClipInfo, getMidiRecordModeState, setMidiRecordModeState } from './state/appState.js';
import { initializeMasterState, getMasterEffects, setMasterEffects, addMasterEffect, removeMasterEffect, updateMasterEffectParam, reorderMasterEffect, getMasterGainValue, setMasterGainValue } from './state/masterState.js';
import { initializeProjectState, getIsReconstructingDAW, setIsReconstructingDAW, getUndoStack, getRedoStack, getClipboardData, setClipboardData, captureStateForUndo, undoLastAction, redoLastAction, gatherProjectData, reconstructDAW, saveProject, loadProject, handleProjectFileLoad, exportToWav } from './state/projectState.js';
import { initializeSoundLibraryState, getLoadedZipFiles, setLoadedZipFiles, getSoundLibraryFileTrees, setSoundLibraryFileTrees, getCurrentLibraryName, setCurrentLibraryName, getCurrentSoundBrowserPath, setCurrentSoundBrowserPath, getPreviewPlayer, setPreviewPlayer, addFileToSoundLibrary } from './state/soundLibraryState.js';
import { initializeTrackState, getTracks, getTrackById, getSoloedTrackId, setSoloedTrackId, getArmedTrackId, setArmedTrackId, isRecording, setIsRecording, getRecordingTrackId, setRecordingTrackId, getRecordingStartTime, addTrack, removeTrack, setTracks, setTrackIdCounter } from './state/trackState.js';
import { initializeWindowState, getOpenWindows, getWindowById, addWindowToStore, removeWindowFromStore, getHighestZ, setHighestZ, incrementHighestZ } from './state/windowState.js';
import { initializeAuth as initializeAuthFromAuthModule, checkLocalAuth } from '../auth.js'; // Re-import initializeAuth and checkLocalAuth
import { storeAsset, getAsset } from '../db.js'; // Re-import from central db.js for local storage


let appServices = {};
let loggedInUser = null; // Will be set after auth check

// Removed applyCustomBackground from here, it's now in backgroundManager.js

function openDefaultLayout() {
    setTimeout(() => {
        const desktopEl = document.getElementById('desktop');
        if (!desktopEl) return;

        const rect = desktopEl.getBoundingClientRect();
        const margin = 10;
        const gap = 10;

        const timelineHeight = 0; // Set to 0 as timeline is removed
        // Adjusted heights to fill remaining vertical space when timeline is removed
        const availableHeight = rect.height - appServices.uiElementsCache.topTaskbar.offsetHeight - appServices.uiElementsCache.taskbar.offsetHeight - (margin * 2);

        const mixerHeight = Math.floor(availableHeight * 0.5); 
        const masterEffectsHeight = availableHeight - mixerHeight - gap; // Remaining height for Master Effects

        const sidePanelWidth = 350;
        const leftPanelWidth = Math.floor(desktopEl.clientWidth * 0.5);

        const row1Y = appServices.uiElementsCache.topTaskbar.offsetHeight + margin; // Top-most row starts at margin below top taskbar

        // Mixer now starts higher and potentially fills more vertical space
        appServices.openMixerWindow({
            x: margin,
            y: row1Y,
            width: leftPanelWidth,
            height: mixerHeight
        });

        // Master Effects Rack also adjusts its position and height
        appServices.openMasterEffectsRackWindow({
            x: margin,
            y: row1Y + mixerHeight + gap, // Position below mixer
            width: leftPanelWidth,
            height: masterEffectsHeight // Adjust height to fill remaining space
        });

        // Sound Browser also adjusts its position and height
        const soundBrowserX = rect.width - sidePanelWidth - margin;
        appServices.openSoundBrowserWindow({
            x: soundBrowserX,
            y: row1Y,
            height: availableHeight // Use full available height for side panel
        });
    }, 100);
}


function handleMasterEffectsUIUpdate() {
    const rackWindow = getWindowById('masterEffectsRack');
    if (rackWindow && rackWindow.element && !rackWindow.isMinimized) {
        rackWindow.refresh();
    }
}

function handleTrackUIUpdate(trackId, reason, detail) {
    const track = getTrackById(trackId);
    if (!track) return;

    const soloedTrackId = getSoloedTrackId();
    const isEffectivelyMuted = track.isMuted || (soloedTrackId !== null && soloedTrackId !== track.id);

    const inspectorWindow = getWindowById(`trackInspector-${track.id}`);
    if (inspectorWindow && inspectorWindow.element && !inspectorWindow.isMinimized) {
        const muteBtn = inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
        const soloBtn = inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
        const armBtn = inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);

        if (reason === 'armChanged') {
            if (armBtn) armBtn.classList.toggle('armed', getArmedTrackId() === track.id);
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
                appServices.drawWaveform(canvas, track.instrumentSamplerSettings.audioBuffer); // Use appServices
            }
        }
    }

    const mixerWindow = getWindowById('mixer');
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
        const rackWindow = getWindowById(`effectsRack-${trackId}`);
        rackWindow?.refresh();
    }
}

function onPlaybackModeChange(newMode, oldMode) {
    console.log(`Playback mode changed from ${oldMode} to ${newMode}`);
    const tracks = getTracks();

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
            
            const mode = getPlaybackMode();
            appServices.updatePianoRollPlayhead(transportTime); // CORRECTED: Access via appServices
            
            updateMeters(document.getElementById('masterMeterBarGlobalTop'), null, getTracks());
        }
        requestAnimationFrame(drawLoop);
    }

    // Assign core app services
    Object.assign(appServices, {
        // Core OS-like services
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        showNotification: showNotification, // From utils.js
        showCustomModal: showCustomModal,   // From utils.js
        createContextMenu: createContextMenu, // From utils.js

        // Background Management
        applyCustomBackground: applyCustomBackground, // From backgroundManager.js
        handleBackgroundUpload: handleBackgroundUpload, // From backgroundManager.js
        loadAndApplyUserBackground: loadAndApplyUserBackground, // From backgroundManager.js

        // Authentication & User State (managed by auth.js)
        getLoggedInUser: () => { /* This will be set by initializeAuth */ }, // Placeholder
        
        // Theme Management
        getCurrentUserThemePreference: getCurrentUserThemePreference,
        setCurrentUserThemePreference: setCurrentUserThemePreference,
        // The actual applyUserThemePreference function will be called via appServices.applyUserThemePreference
        // in appState.js when the preference changes.

        // Global Track State Management
        getTracks: getTracks,
        getTrackById: getTrackById,
        addTrack: addTrack,
        removeTrack: removeTrack,
        setTracks: setTracks,
        setTrackIdCounter: setTrackIdCounter,
        getSoloedTrackId: getSoloedTrackId,
        setSoloedTrackId: setSoloedTrackId,
        getArmedTrackId: getArmedTrackId,
        setArmedTrackId: setArmedTrackId,
        isRecording: isRecording,
        setIsRecording: setIsRecording,
        getRecordingTrackId: getRecordingTrackId,
        setRecordingTrackId: setRecordingTrackId,
        setRecordingStartTime: setRecordingStartTime, // This is a setter, not a getter for the value
        
        // Master Audio State Management
        getMasterEffects: getMasterEffects,
        setMasterEffects: setMasterEffects,
        addMasterEffect: addMasterEffect,
        removeMasterEffect: removeMasterEffect,
        updateMasterEffectParam: updateMasterEffectParam,
        reorderMasterEffect: reorderMasterEffect,
        getMasterGainValue: getMasterGainValue,
        setMasterGainValue: setMasterGainValue, // This is a setter, not a getter for the value

        // App-wide State
        getMidiAccess: getMidiAccess,
        setMidiAccess: setMidiAccess,
        getActiveMIDIInput: getActiveMIDIInput,
        setActiveMIDIInput: setActiveMIDIInput,
        getPlaybackMode: getPlaybackMode,
        setPlaybackMode: setPlaybackMode,
        getMidiRecordModeState: getMidiRecordModeState,
        setMidiRecordModeState: setMidiRecordModeState,
        getSelectedTimelineClipInfo: getSelectedTimelineClipInfo,
        setSelectedTimelineClipInfo: setSelectedTimelineClipInfo,

        // Window State Management
        getOpenWindows: getOpenWindows,
        getWindowById: getWindowById,
        addWindowToStore: addWindowToStore,
        removeWindowFromStore: removeWindowFromStore,
        getHighestZ: getHighestZ,
        setHighestZ: setHighestZ, // This is a setter, not a getter for the value
        incrementHighestZ: incrementHighestZ,

        // Project State Management (Undo/Redo, Save/Load)
        getIsReconstructingDAW: getIsReconstructingDAW,
        setIsReconstructingDAW: setIsReconstructingDAW,
        getUndoStack: getUndoStack,
        getRedoStack: getRedoStack,
        getClipboardData: getClipboardData,
        setClipboardData: setClipboardData,
        captureStateForUndo: captureStateForUndo,
        undoLastAction: undoLastAction,
        redoLastAction: redoLastAction,
        gatherProjectData: gatherProjectData,
        reconstructDAW: reconstructDAW,
        saveProject: saveProject,
        loadProject: loadProject,
        handleProjectFileLoad: handleProjectFileLoad,
        exportToWav: exportToWav,
        
        // Sound Library State
        getLoadedZipFiles: getLoadedZipFiles,
        setLoadedZipFiles: setLoadedZipFiles,
        getSoundLibraryFileTrees: getSoundLibraryFileTrees,
        setSoundLibraryFileTrees: setSoundLibraryFileTrees,
        getCurrentLibraryName: getCurrentLibraryName,
        setCurrentLibraryName: setCurrentLibraryName,
        getCurrentSoundBrowserPath: getCurrentSoundBrowserPath,
        setCurrentSoundBrowserPath: setCurrentSoundBrowserPath,
        getPreviewPlayer: getPreviewPlayer,
        setPreviewPlayer: setPreviewPlayer, // This is a setter, not a getter for the value
        addFileToSoundLibrary: addFileToSoundLibrary, // Note: this is for local IndexedDB

        // Audio Engine Interactions (from audio.js)
        initAudioContextAndMasterMeter: initAudioContextAndMasterMeter,
        getMasterBusInputNode: getMasterBusInputNode,
        updateMeters: updateMeters,
        rebuildMasterEffectChain: rebuildMasterEffectChain,
        addMasterEffectToAudio: addMasterEffectToAudio,
        removeMasterEffectFromAudio: removeMasterEffectFromAudio,
        updateMasterEffectParamInAudio: updateMasterEffectParamInAudio,
        reorderMasterEffectInAudio: reorderMasterEffectInAudio,
        setActualMasterVolume: setActualMasterVolume,
        forceStopAllAudio: forceStopAllAudio,

        // Playback (from playback.js)
        playSlicePreview: playSlicePreview,
        playDrumSamplerPadPreview: playDrumSamplerPadPreview,
        scheduleTimelinePlayback: scheduleTimelinePlayback, // Only used when playbackMode is 'timeline'
        onPlaybackModeChange: onPlaybackModeChange, // Callback for when playback mode changes

        // Recording (from recording.js)
        startAudioRecording: startAudioRecording,
        stopAudioRecording: stopAudioRecording,

        // Sample Management (from sampleManager.js)
        loadSampleFile: loadSampleFile,
        loadDrumSamplerPadFile: loadDrumSamplerPadFile,
        loadSoundFromBrowserToTarget: loadSoundFromBrowserToTarget,
        getAudioBlobFromSoundBrowserItem: getAudioBlobFromSoundBrowserItem,
        autoSliceSample: autoSliceSample,
        fetchSoundLibrary: fetchSoundLibrary, // For loading zip libraries

        // IndexedDB Access (direct from db.js)
        dbStoreAudio: storeAudio,
        dbGetAudio: getAudio,
        dbDeleteAudio: deleteAudio,
        storeAsset: storeAsset, // For local user assets like background
        getAsset: getAsset,     // For local user assets like background

        // UI Interactions (from ui.js and sub-modules)
        openTrackInspectorWindow: openTrackInspectorWindow,
        openMixerWindow: openMixerWindow,
        updateMixerWindow: updateMixerWindow,
        openTrackEffectsRackWindow: openTrackEffectsRackWindow,
        openMasterEffectsRackWindow: openMasterEffectsRackWindow,
        renderEffectsList: renderEffectsList,
        renderEffectControls: renderEffectControls,
        openSoundBrowserWindow: openSoundBrowserWindow,
        renderSoundBrowser: renderSoundBrowser,
        renderDirectoryView: renderDirectoryView,
        openPianoRollWindow: openPianoRollWindow,
        updatePianoRollPlayhead: updatePianoRollPlayhead,
        openYouTubeImporterWindow: openYouTubeImporterWindow,
        renderSamplePads: renderSamplePads,
        updateSliceEditorUI: updateSliceEditorUI,
        renderDrumSamplerPads: renderDrumSamplerPads,
        updateDrumPadControlsUI: updateDrumPadControlsUI,
        drawWaveform: drawWaveform, // From utils.js
        createKnob: createKnob, // From knobUI.js

        // DAW-specific Event Handlers (from eventHandlers.js)
        handleTrackMute: handleTrackMute,
        handleTrackSolo: handleTrackSolo,
        handleTrackArm: handleTrackArm,
        handleRemoveTrack: handleRemoveTrack,
        handleOpenEffectsRack: handleOpenEffectsRack,
        handleOpenPianoRoll: handleOpenPianoRoll,
        handleTimelineLaneDrop: handleTimelineLaneDrop,
        handleOpenYouTubeImporter: handleOpenYouTubeImporter,

        // Metronome
        toggleMetronome: toggleMetronome,

        // Access to effect definitions and synth controls
        effectsRegistryAccess: { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions },

        // Tone.js context (direct access)
        context: Tone.context,

        // Placeholder for the logged-in user object. This will be set by the auth module.
        // It's defined here for appServices.getLoggedInUser.
        setLoggedInUser: (user) => { loggedInUser = user; }
    });

    // Initialize state management modules
    initializeAppState(appServices);
    initializeMasterState(appServices);
    initializeProjectState(appServices);
    initializeSoundLibraryState(appServices);
    initializeTrackState(appServices);
    initializeWindowState(appServices);

    // Initialize core application modules
    initializeAudioModule(appServices);
    initializePlayback(appServices);
    initializeRecording(appServices);
    initializeSampleManager(appServices);
    initializeMetronome(appServices);
    
    // Initialize UI modules, passing the full appServices object
    initializeUIModule(appServices);

    // Initialize Event Handlers (relying on fully populated appServices)
    initializeEventHandlersModule(appServices);
    initializePrimaryEventListeners(); // Attaches main document listeners
    attachGlobalControlEvents({}); // Attaches DAW control listeners (play, stop, record, etc.)
    setupMIDI(); // Sets up MIDI input

    // Initialize Auth (this will set the loggedInUser and load the background)
    initializeAuthFromAuthModule(appServices); // Renamed from initializeAuth to avoid conflict

    // Apply initial theme preference
    // The actual background loading is now handled by initializeAuth which calls loadAndApplyUserBackground
    // applyUserThemePreference(); // This should be called by the auth module's initialization
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', appServices.applyUserThemePreference); // Use appServices for consistency

    // Open default layout windows
    openDefaultLayout();

    console.log("SnugOS Initialized Successfully.");

    // Tone.js settings
    appServices.context.lookAhead = 0.02;
    appServices.context.updateInterval = 0.01;
    console.log(`[Latency] lookAhead set to: ${appServices.context.lookAhead}`);
    console.log(`[Latency] updateInterval set to: ${appServices.context.updateInterval}`);

    // Start main drawing loop
    drawLoop();
}

document.addEventListener('DOMContentLoaded', initializeSnugOS);
