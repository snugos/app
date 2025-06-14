// js/daw/main.js - Main Application Logic Orchestrator

import { SnugWindow } from './SnugWindow.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenPianoRoll,
    handleTimelineLaneDrop, handleOpenYouTubeImporter
} from './eventHandlers.js';

// CORRECTED IMPORTS: Now directly import from their new 'js/daw/' location
import * as Constants from './constants.js';
import { storeAudio, getAudio, deleteAudio } from './db.js';
import { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions } from './effectsRegistry.js';
import { showNotification, showCustomModal, createContextMenu, base64ToBlob, drawWaveform, setupGenericDropZoneListeners, createDropZoneHTML, showConfirmationDialog } from './utils.js';
import { initializeAuth, handleBackgroundUpload, handleLogout } from './auth.js';

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
    renderDrumSamplerPads, updateDrumPadControlsUI, createKnob,
    openFileViewerWindow
} from './ui/ui.js';

import { initializeMetronome, toggleMetronome } from './audio/metronome.js';

// State modules (paths are already relative to js/daw/, which is correct)
import { initializeAppState, getPlaybackMode, setPlaybackMode, getCurrentUserThemePreference, setCurrentUserThemePreference, getMidiRecordModeState, setMidiRecordModeState, getSelectedTimelineClipInfo, setSelectedTimelineClipInfo } from './state/appState.js';
import { initializeMasterState, getMasterEffects, addMasterEffect, removeMasterEffect, updateMasterEffectParam, reorderMasterEffect, getMasterGainValue, setMasterGainValue } from './state/masterState.js';
import { initializeProjectState, getIsReconstructingDAW, setIsReconstructingDAW, getUndoStack, getRedoStack, getClipboardData, setClipboardData, captureStateForUndo, undoLastAction, redoLastAction, gatherProjectData, reconstructDAW, saveProject, loadProject, handleProjectFileLoad, exportToWav } from './state/projectState.js';
import { initializeSoundLibraryState, getLoadedZipFiles, setLoadedZipFiles, getSoundLibraryFileTrees, setSoundLibraryFileTrees, getCurrentLibraryName, setCurrentLibraryName, getCurrentSoundBrowserPath, setCurrentSoundBrowserPath, getPreviewPlayer, setPreviewPlayer, addFileToSoundLibrary } from './state/soundLibraryState.js';
import { initializeTrackState, getTracks, getTrackById, getSoloedTrackId, setSoloedTrackId, getArmedTrackId, setArmedTrackId, isRecording, setIsRecording, getRecordingTrackId, setRecordingTrackId, getRecordingStartTime, setRecordingStartTime, addTrack, removeTrack, setTracks, setTrackIdCounter } from './state/trackState.js';
import { initializeWindowState, getOpenWindows, getWindowById, addWindowToStore, removeWindowFromStore, getHighestZ, setHighestZ, incrementHighestZ } from './state/windowState.js';

let appServices = {};

// Centralized applyCustomBackground function (copied from welcome.js/profile.js pattern)
// This should be the single source of truth for applying backgrounds
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
            fileType = 'image/jpeg'; // Assume image for other URLs
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

        const timelineHeight = 0; // Set to 0 as timeline is removed
        const mixerHeight = Math.floor((rect.height - 40 - 32 - (margin * 2) - gap) * 0.5); // Use full remaining height
        const sidePanelHeight = Math.floor(rect.height - 40 - 32 - (margin * 2) - gap) * 0.5; // Use full remaining height for master effects
        const soundBrowserHeight = Math.floor(rect.height - 40 - 32 - (margin * 2) - gap); // Use full remaining height for sound browser
        const sidePanelWidth = 350;
        const leftPanelWidth = Math.floor(desktopEl.clientWidth * 0.5);

        const row1Y = margin; // Top-most row starts at margin
        
        // Mixer now starts higher and potentially fills more vertical space
        appServices.openMixerWindow({
            x: margin,
            y: row1Y, // Starts at the top now
            width: leftPanelWidth,
            height: mixerHeight
        });

        // Master Effects Rack also adjusts its position and height
        appServices.openMasterEffectsRackWindow({
            x: margin,
            y: row1Y + mixerHeight + gap, // Position below mixer
            width: leftPanelWidth,
            height: sidePanelHeight // Adjust height to fill remaining space
        });
        
        // Sound Browser also adjusts its position and height
        const soundBrowserX = rect.width - sidePanelWidth - margin;
        appServices.openSoundBrowserWindow({
            x: soundBrowserX,
            y: row1Y, // Starts at the top now
            height: soundBrowserHeight // Use full remaining height for side panel
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
    
    function drawLoop() {
        if (typeof Tone !== 'undefined') {
            const transportTime = Tone.Transport.seconds;
            
            const mode = appServices.getPlaybackMode();
            appServices.updatePianoRollPlayhead(transportTime);
            
            appServices.updateMeters(document.getElementById('masterMeterBarGlobalTop'), null, appServices.getTracks());
        }
        requestAnimationFrame(drawLoop);
    }
    
    appServices = {
        // Core application services
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        
        // Utilities (from js/daw/utils.js)
        showNotification: showNotification, 
        showCustomModal: showCustomModal,
        createContextMenu: createContextMenu, 
        drawWaveform: drawWaveform,
        // (assuming base64ToBlob, setupGenericDropZoneListeners, createDropZoneHTML, showConfirmationDialog are exposed via utils.js and accessed directly where needed)

        // Auth related functions (from js/daw/auth.js)
        initializeAuth: initializeAuth,
        handleBackgroundUpload: handleBackgroundUpload,
        handleLogout: handleLogout,

        // DB functions (from js/daw/db.js)
        dbStoreAudio: storeAudio, 
        dbGetAudio: getAudio,     
        dbDeleteAudio: deleteAudio, 
        getAsset: getAsset, // Assumed to be from db.js
        storeAsset: storeAsset, // Assumed to be from db.js

        // Tone.js related contexts and registries (from js/daw/effectsRegistry.js, etc.)
        effectsRegistryAccess: { AVAILABLE_EFFECTs, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions }, 
        context: Tone.context, // Global Tone object

        // State Module Accessors (from js/daw/state/)
        getTracks: getTracks, getTrackById: getTrackById, addTrack: addTrack, removeTrack: removeTrack, setTracks: setTracks, setTrackIdCounter: setTrackIdCounter,
        getOpenWindows: getOpenWindows, getWindowById: getWindowById, addWindowToStore: addWindowToStore, removeWindowFromStore: removeWindowFromStore, getHighestZ: getHighestZ, setHighestZ: setHighestZ, incrementHighestZ: incrementHighestZ,
        getMidiAccess: getMidiAccess, setMidiAccess: setMidiAccess, getActiveMIDIInput: getActiveMIDIInput, setActiveMIDIInput: setActiveMIDIInput, getPlaybackMode: getPlaybackMode, setPlaybackMode: setPlaybackMode, getCurrentUserThemePreference: getCurrentUserThemePreference, setCurrentUserThemePreference: setCurrentUserThemePreference, getSelectedTimelineClipInfo: getSelectedTimelineClipInfo, setSelectedTimelineClipInfo: setSelectedTimelineClipInfo, getMidiRecordModeState: getMidiRecordModeState, setMidiRecordModeState: setMidiRecordModeState,
        getMasterEffects: getMasterEffects, addMasterEffect: addMasterEffect, removeMasterEffect: removeMasterEffect, updateMasterEffectParam: updateMasterEffectParam, reorderMasterEffect: reorderMasterEffect, getMasterGainValue: getMasterGainValue, setMasterGainValue: setMasterGainValue,
        getIsReconstructingDAW: getIsReconstructingDAW, setIsReconstructingDAW: setIsReconstructingDAW, getUndoStack: getUndoStack, getRedoStack: getRedoStack, getClipboardData: getClipboardData, setClipboardData: setClipboardData, captureStateForUndo: captureStateForUndo, undoLastAction: undoLastAction, redoLastAction: redoLastAction, gatherProjectData: gatherProjectData, reconstructDAW: reconstructDAW, saveProject: saveProject, loadProject: loadProject, handleProjectFileLoad: handleProjectFileLoad, exportToWav: exportToWav,
        getLoadedZipFiles: getLoadedZipFiles, setLoadedZipFiles: setLoadedZipFiles, getSoundLibraryFileTrees: getSoundLibraryFileTrees, setSoundLibraryFileTrees: setSoundLibraryFileTrees, getCurrentLibraryName: getCurrentLibraryName, setCurrentLibraryName: setCurrentLibraryName, getCurrentSoundBrowserPath: getCurrentSoundBrowserPath, setCurrentSoundBrowserPath: setCurrentSoundBrowserPath, getPreviewPlayer: getPreviewPlayer, setPreviewPlayer: setPreviewPlayer, addFileToSoundLibrary: addFileToSoundLibrary, 

        // Audio Module Functions (from js/daw/audio/)
        initAudioContextAndMasterMeter, getMasterBusInputNode, updateMeters, rebuildMasterEffectChain,
        addMasterEffectToAudio, removeMasterEffectFromAudio, updateMasterEffectParamInAudio,
        reorderMasterEffectInAudio, setActualMasterVolume, startAudioRecording, stopAudioRecording,
        forceStopAllAudio, fetchSoundLibrary, loadSampleFile, loadDrumSamplerPadFile,
        loadSoundFromBrowserToTarget, getAudioBlobFromSoundBrowserItem, autoSliceSample,
        playSlicePreview, playDrumSamplerPadPreview, 

        // UI Module Functions (from js/daw/ui/)
        openTrackInspectorWindow, openMixerWindow, updateMixerWindow, openTrackEffectsRackWindow,
        openMasterEffectsRackWindow, openSoundBrowserWindow, openPianoRollWindow, updatePianoRollPlayhead, 
        openYouTubeImporterWindow, openFileViewerWindow, renderSamplePads, updateSliceEditorUI,
        renderDrumSamplerPads, updateDrumPadControlsUI, createKnob, renderDirectoryView, renderSoundBrowser,

        // Event Handlers (from js/daw/eventHandlers.js)
        handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
        handleOpenEffectsRack, handleOpenPianoRoll, onPlaybackModeChange,
        handleTimelineLaneDrop, handleOpenYouTubeImporter, toggleMetronome,

        // Other
        uiElementsCache: {},
        applyCustomBackground: applyCustomBackground,
    };

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
    initializeEventHandlersModule(appServices);
    initializeMetronome(appServices);
    initializeAuth(appServices);

    initializePrimaryEventListeners();
    attachGlobalControlEvents({});
    setupMIDI();
    
    const savedTheme = localStorage.getItem('snugos-theme');
    if (savedTheme) {
        appServices.setCurrentUserThemePreference(savedTheme);
    } else {
        applyUserTheme();
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', appServices.applyUserThemePreference);
    
    openDefaultLayout();
    
    console.log("SnugOS Initialized Successfully.");

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
