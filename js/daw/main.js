// js/daw/main.js - Main Application Logic Orchestrator

import { SnugWindow } from './SnugWindow.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenPianoRoll,
    handleTimelineLaneDrop, handleOpenYouTubeImporter
} from './eventHandlers.js'; // path relative to js/daw/

// CORRECTED IMPORTS: All core utilities are now directly relative to js/daw/
import * as Constants from './constants.js'; // This is now in js/daw/constants.js
import { storeAudio, getAudio, deleteAudio, storeAsset, getAsset } from './db.js'; // Fix: Added storeAsset and getAsset imports
import { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions } from './effectsRegistry.js'; // This is now in js/daw/effectsRegistry.js
import { showNotification, showCustomModal, createContextMenu, base64ToBlob, drawWaveform, setupGenericDropZoneListeners, createDropZoneHTML, showConfirmationDialog, getThemeColors } from './utils.js'; // This is now in js/daw/utils.js, added getThemeColors
import { initializeAuth, handleBackgroundUpload, handleLogout } from './auth.js'; // This is now in js/daw/auth.js

import {
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters,
    rebuildMasterEffectChain, addMasterEffectToAudio, removeMasterEffectFromAudio,
    updateMasterEffectParamInAudio, reorderMasterEffectInAudio, setActualMasterVolume,
    getMasterBusInputNode, forceStopAllAudio
} from './audio/audio.js'; // path relative to js/daw/
import { initializePlayback, playSlicePreview, playDrumSamplerPadPreview, scheduleTimelinePlayback } from './audio/playback.js'; // path relative to js/daw/
import { initializeRecording, startAudioRecording, stopAudioRecording } from './audio/recording.js'; // path relative to js/daw/
import { 
    initializeSampleManager, loadSampleFile, loadDrumSamplerPadFile, loadSoundFromBrowserToTarget,
    getAudioBlobFromSoundBrowserItem, autoSliceSample, fetchSoundLibrary
} from './audio/sampleManager.js'; // path relative to js/daw/

// FIX: Import ALL individual UI functions that are assigned to appServices or called directly
import {
    initializeUIModule, 
    openTrackInspectorWindow, 
    openMixerWindow, 
    updateMixerWindow, 
    openTrackEffectsRackWindow, 
    openMasterEffectsRackWindow, 
    renderEffectsList, 
    renderEffectControls,
    openSoundBrowserWindow, 
    renderSoundBrowser, 
    renderDirectoryView,
    openPianoRollWindow, 
    updatePianoRollPlayhead, 
    openYouTubeImporterWindow, 
    openFileViewerWindow, 
    renderSamplePads, 
    updateSliceEditorUI,
    renderDrumSamplerPads, 
    updateDrumPadControlsUI, 
    createKnob 
} from './ui/ui.js'; // path relative to js/daw/

import { initializeMetronome, toggleMetronome } from './audio/metronome.js'; // path relative to js/daw/

// CORRECTED IMPORTS: All state modules are now directly relative to js/daw/state/
// Import individual functions used by appServices directly
import { initializeAppState, getPlaybackMode, setPlaybackMode, getCurrentUserThemePreference, setCurrentUserThemePreference, getMidiRecordModeState, setMidiRecordModeState, getSelectedTimelineClipInfo, setSelectedTimelineClipInfo, getMidiAccess, setMidiAccess, getActiveMIDIInput, setActiveMIDIInput } from './state/appState.js';
import { initializeMasterState, getMasterEffects, addMasterEffect, removeMasterEffect, updateMasterEffectParam, reorderMasterEffect, getMasterGainValue, setMasterGainValue } from './state/masterState.js'; // Fix: Corrected import for masterState functions
import { initializeProjectState, getIsReconstructingDAW, setIsReconstructingDAW, getUndoStack, getRedoStack, getClipboardData, setClipboardData, captureStateForUndo, undoLastAction, redoLastAction, gatherProjectData, reconstructDAW, saveProject, loadProject, handleProjectFileLoad, exportToWav } from './state/projectState.js';
import { initializeSoundLibraryState, getLoadedZipFiles, setLoadedZipFiles, getSoundLibraryFileTrees, setSoundLibraryFileTrees, getCurrentLibraryName, setCurrentLibraryName, getCurrentSoundBrowserPath, setCurrentSoundBrowserPath, getPreviewPlayer, setPreviewPlayer, addFileToSoundLibrary } from './state/soundLibraryState.js';
import { initializeTrackState, getTracks, getTrackById, getSoloedTrackId, setSoloedTrackId, getArmedTrackId, setArmedTrackId, isRecording, setIsRecording, getRecordingTrackId, setRecordingTrackId, getRecordingStartTime, setRecordingStartTime, addTrack, removeTrack, setTracks, setTrackIdCounter } from './state/trackState.js';
import { initializeWindowState, getOpenWindows, getWindowById, addWindowToStore, removeWindowFromStore, getHighestZ, setHighestZ, incrementHighestZ, serializeWindows, reconstructWindows } from './state/windowState.js'; // Import new windowState functions

let appServices = {};

// Centralized applyCustomBackground function 
function applyCustomBackground(source) {
    const desktopEl = document.getElementById('desktop');
    if (!desktopEl) return;

    desktopEl.style.backgroundImage = '';
    const existingVideo = desktopEl.querySelector('#desktop-video-bg');
    if (existingVideo) {
        existingVideo.remove();
    }

    let url;
    let fileType;

    if (typeof source === 'string') {
        url = source;
        const extension = source.split('.').pop().toLowerCase().split('?')[0];
        if (['mp4', 'webm', 'mov'].includes(extension)) {
            fileType = `video/${extension}`;
        } else {
            fileType = 'image/jpeg';
        }
    } else { // It's a File object
        url = URL.createObjectURL(source);
        fileType = source.type;
    }

    if (fileType.startsWith('image/')) {
        desktopEl.style.backgroundImage = `url(${url})`;
        desktopEl.style.backgroundSize = 'cover';
        desktopEl.style.backgroundPosition = 'center';
    } else if (fileType.startsWith('video/')) {
        const videoEl = document.createElement('video');
        videoEl.id = 'desktop-video-bg';
        videoEl.style.position = 'absolute';
        videoEl.style.top = '0';
        videoEl.style.left = '0';
        videoEl.style.width = '100%';
        videoEl.style.height = '100%';
        videoEl.style.objectFit = 'cover';
        videoEl.src = url;
        videoEl.autoplay = true;
        videoEl.loop = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        desktopEl.appendChild(videoEl);
    }
}


function openDefaultLayout() {
    setTimeout(() => {
        const desktopEl = document.getElementById('desktop');
        if (!desktopEl) return;

        const rect = desktopEl.getBoundingClientRect();
        const margin = 10;
        const gap = 10;

        const mixerHeight = Math.floor((rect.height - 40 - 32 - (margin * 2) - gap) * 0.5);
        const sidePanelHeight = Math.floor(rect.height - 40 - 32 - (margin * 2) - gap) * 0.5;
        const soundBrowserHeight = Math.floor(rect.height - 40 - 32 - (margin * 2) - gap);
        const sidePanelWidth = 350;
        const leftPanelWidth = Math.floor(desktopEl.clientWidth * 0.5);

        const row1Y = margin;
        
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
            height: sidePanelHeight
        });
        
        const soundBrowserX = rect.width - sidePanelWidth - margin;
        appServices.openSoundBrowserWindow({
            x: soundBrowserX,
            y: row1Y,
            height: soundBrowserHeight
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
                drawWaveform(canvas, track.instrumentSamplerSettings.audioBuffer);
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

    if (appServices.Tone.Transport.state === 'started') {
        appServices.Tone.Transport.stop();
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
    // Define the appServices object here to ensure all core functionalities are assigned
    // before any SnugWindow (or other components that rely on appServices) are created.
    appServices = {
        // Core application services
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        
        // Utilities (from js/daw/utils.js)
        showNotification: showNotification, 
        showCustomModal: showCustomModal,
        createContextMenu: createContextMenu, 
        drawWaveform: drawWaveform,
        base64ToBlob: base64ToBlob, // Explicitly pass base64ToBlob
        setupGenericDropZoneListeners: setupGenericDropZoneListeners, // Explicitly pass setupGenericDropZoneListeners
        createDropZoneHTML: createDropZoneHTML, // Explicitly pass createDropZoneHTML
        showConfirmationDialog: showConfirmationDialog, // Explicitly pass showConfirmationDialog
        getThemeColors: getThemeColors, // Make getThemeColors available

        // Auth related functions (from js/daw/auth.js)
        initializeAuth: initializeAuth,
        handleBackgroundUpload: handleBackgroundUpload,
        handleLogout: handleLogout,
        updateUserAuthContainer: null, // Placeholder, will be set in auth.js

        // DB functions (from js/daw/db.js)
        dbStoreAudio: storeAudio, 
        dbGetAudio: getAudio,     
        dbDeleteAudio: deleteAudio, 
        getAsset: getAsset, 
        storeAsset: storeAsset, 

        // Tone.js related contexts and registries (from js/daw/effectsRegistry.js, etc.)
        effectsRegistryAccess: { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions }, 
        context: Tone.context, // Global Tone object
        Tone: Tone, 
        // Tone.js utilities (also part of Tone.js global)
        ToneTime: Tone.Time,
        ToneMidi: Tone.Midi,
        ToneTransport: Tone.Transport,
        TonePlayer: Tone.Player,
        ToneMeter: Tone.Meter,
        ToneGain: Tone.Gain,
        ToneSampler: Tone.Sampler,
        TonePolySynth: Tone.PolySynth,
        ToneSynth: Tone.Synth,
        ToneRecorder: Tone.Recorder,
        ToneUserMedia: Tone.UserMedia,
        ToneMembraneSynth: Tone.MembraneSynth,
        ToneBuffer: Tone.Buffer,
        ToneTicks: Tone.Ticks,
        TonePart: Tone.Part,
        ToneWaveShaper: Tone.WaveShaper, // Added for completeness if needed elsewhere
        ToneFilter: Tone.Filter, // Added for completeness if needed elsewhere

        // State Module Accessors (from js/daw/state/)
        // Directly import and assign the functions needed for appServices
        getTracks: getTracks, getTrackById: getTrackById, addTrack: addTrack, removeTrack: removeTrack, setTracks: setTracks, setTrackIdCounter: setTrackIdCounter,
        getOpenWindows: getOpenWindows, getWindowById: getWindowById, addWindowToStore: addWindowToStore, removeWindowFromStore: removeWindowFromStore, getHighestZ: getHighestZ, setHighestZ: setHighestZ, incrementHighestZ: incrementHighestZ, serializeWindows: serializeWindows, reconstructWindows: reconstructWindows, // Added serialize/reconstruct
        getMidiAccess: getMidiAccess, setMidiAccess: setMidiAccess, getActiveMIDIInput: setActiveMIDIInput, setActiveMIDIInput: setActiveMIDIInput, getPlaybackMode: getPlaybackMode, setPlaybackMode: setPlaybackMode, getCurrentUserThemePreference: getCurrentUserThemePreference, setCurrentUserThemePreference: setCurrentUserThemePreference, getSelectedTimelineClipInfo: getSelectedTimelineClipInfo, setSelectedTimelineClipInfo: setSelectedTimelineClipInfo, getMidiRecordModeState: getMidiRecordModeState, setMidiRecordModeState: setMidiRecordModeState,
        getMasterEffects: getMasterEffects, addMasterEffect: addMasterEffect, removeMasterEffect: removeMasterEffect, updateMasterEffectParam: updateMasterEffectParam, reorderMasterEffect: reorderMasterEffect, getMasterGainValue: getMasterGainValue, setMasterGainValue: setMasterGainValue,
        getIsReconstructingDAW: getIsReconstructingDAW, setIsReconstructingDAW: setIsReconstructingDAW, getUndoStack: getUndoStack, getRedoStack: getRedoStack, getClipboardData: getClipboardData, setClipboardData: setClipboardData, captureStateForUndo: captureStateForUndo, undoLastAction: undoLastAction, redoLastAction: redoLastAction, gatherProjectData: gatherProjectData, reconstructDAW: reconstructDAW, saveProject: saveProject, loadProject: loadProject, handleProjectFileLoad: handleProjectFileLoad, exportToWav: exportToWav,
        getLoadedZipFiles: getLoadedZipFiles, setLoadedZipFiles: setLoadedZipFiles, getSoundLibraryFileTrees: getSoundLibraryFileTrees, setSoundLibraryFileTrees: setSoundLibraryFileTrees, getCurrentLibraryName: getCurrentLibraryName, setCurrentLibraryName: setCurrentLibraryName, getCurrentSoundBrowserPath: getCurrentSoundBrowserPath, setCurrentSoundBrowserPath: setCurrentSoundBrowserPath, getPreviewPlayer: getPreviewPlayer, setPreviewPlayer: setPreviewPlayer, addFileToSoundLibrary: addFileToSoundLibrary, 
        getSoloedTrackId: getSoloedTrackId, setSoloedTrackId: setSoloedTrackId, getArmedTrackId: getArmedTrackId, setArmedTrackId: setArmedTrackId, isRecording: isRecording, setIsRecording: setIsRecording, getRecordingTrackId: getRecordingTrackId, setRecordingTrackId: setRecordingTrackId, getRecordingStartTime: getRecordingStartTime, setRecordingStartTime: setRecordingStartTime, // Added these trackState functions to appServices directly
        Track: null, // Placeholder for Track class, assigned below

        // Audio Module Functions (from js/daw/audio/)
        initAudioContextAndMasterMeter, getMasterBusInputNode, updateMeters, rebuildMasterEffectChain,
        addMasterEffectToAudio, removeMasterEffectFromAudio, updateMasterEffectParamInAudio,
        reorderMasterEffectInAudio, setActualMasterVolume, startAudioRecording, stopAudioRecording,
        forceStopAllAudio, fetchSoundLibrary, loadSampleFile, loadDrumSamplerPadFile,
        loadSoundFromBrowserToTarget, getAudioBlobFromSoundBrowserItem, autoSliceSample,
        playSlicePreview, playDrumSamplerPadPreview, 

        // UI Module Functions (initializers passed to initializeUIModule)
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
        openFileViewerWindow: openFileViewerWindow, 
        renderSamplePads: renderSamplePads, 
        updateSliceEditorUI: updateSliceEditorUI, 
        renderDrumSamplerPads: renderDrumSamplerPads, 
        updateDrumPadControlsUI: updateDrumPadControlsUI, 
        createKnob: createKnob, 

        // Event Handlers (from js/daw/eventHandlers.js)
        handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
        handleOpenEffectsRack, handleOpenPianoRoll, onPlaybackModeChange,
        handleTimelineLaneDrop, handleOpenYouTubeImporter, toggleMetronome,
        updateUndoRedoButtons: null, // Placeholder, set in eventHandlers

        // Other
        uiElementsCache: {
            desktop: document.getElementById('desktop'),
            topTaskbar: document.getElementById('topTaskbar'),
            taskbar: document.getElementById('taskbar'),
        },
        applyCustomBackground: applyCustomBackground,
        updateMasterEffectsUI: handleMasterEffectsUIUpdate, 
    };

    // Import Track class and assign it to appServices here, after appServices is defined.
    // This resolves circular dependency if Track needs appServices in its constructor.
    const { Track } = await import('./Track.js');
    appServices.Track = Track;

    // Initialize all state modules with appServices
    initializeAppState(appServices);
    initializeMasterState(appServices);
    initializeProjectState(appServices);
    initializeSoundLibraryState(appServices);
    initializeTrackState(appServices);
    initializeWindowState(appServices);
    
    // Initialize other modules
    initializeAudioModule(appServices);
    initializePlayback(appServices);
    initializeRecording(appServices);
    initializeSampleManager(appServices);
    initializeUIModule(appServices);
    initializeEventHandlersModule(appServices); // This module needs updateUndoRedoButtons
    initializeMetronome(appServices);
    initializeAuth(appServices); // This module needs updateUserAuthContainer

    // Set functions that require full appServices setup
    appServices.updateUserAuthContainer = appServices.initializeAuth.updateAuthUI; // Correct way to assign updateAuthUI
    appServices.updateUndoRedoButtons = appServices.initializeEventHandlersModule.updateUndoRedoButtons; // Assign updateUndoRedoButtons

    initializePrimaryEventListeners();
    attachGlobalControlEvents({}); // This still takes an empty object, should it take appServices? (eventHandlers.js already gets appServices via its init)
    setupMIDI();
    
    const savedTheme = localStorage.getItem('snugos-theme');
    if (savedTheme) {
        appServices.setCurrentUserThemePreference(savedTheme);
    } else {
        applyUserTheme(); // Apply system preference if no saved theme
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', appServices.applyUserThemePreference);
    
    // Check if there's a saved window layout in local storage or project data
    const lastProjectData = localStorage.getItem('snugos_last_project');
    if (lastProjectData) {
        try {
            const parsedData = JSON.parse(lastProjectData);
            if (parsedData.openWindows && parsedData.openWindows.length > 0) {
                appServices.reconstructWindows(parsedData.openWindows);
            } else {
                openDefaultLayout();
            }
        } catch (e) {
            console.error("Error parsing last project data from local storage:", e);
            openDefaultLayout();
        }
    } else {
        openDefaultLayout();
    }
    
    console.log("SnugOS Initialized Successfully.");

    // Tone.js context settings
    appServices.context.lookAhead = 0.02;
    appServices.context.updateInterval = 0.01;
    console.log(`[Latency] lookAhead set to: ${appServices.context.lookAhead}`);
    console.log(`[Latency] updateInterval set to: ${appServices.context.updateInterval}`);
    
    drawLoop();
}

function applyUserTheme() {
    const preference = localStorage.getItem('snugos-theme');
    const body = document.body;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeToApply = preference || (prefersDark ? 'dark' : 'light');
    if (themeToApply === 'light') {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
    } else {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
    }
}

document.addEventListener('DOMContentLoaded', initializeSnugOS);