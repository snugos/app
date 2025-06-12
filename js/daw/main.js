// js/daw/main.js - Main Application Logic Orchestrator

import { SnugWindow } from './SnugWindow.js'; // Path updated
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenPianoRoll,
    handleTimelineLaneDrop, handleOpenYouTubeImporter
} from './eventHandlers.js'; // Path updated

// Removed imports for now-global variables/functions from constants.js, utils.js, db.js, effectsRegistry.js, state.js, auth.js
// They are now globally available because they are loaded via <script> tags in snaw.html

import {
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters,
    rebuildMasterEffectChain, addMasterEffectToAudio, removeMasterEffectFromAudio,
    updateMasterEffectParamInAudio, reorderMasterEffectInAudio, setActualMasterVolume,
    getMasterBusInputNode, forceStopAllAudio
} from './audio/audio.js'; // Path updated
import { initializePlayback, playSlicePreview, playDrumSamplerPadPreview, scheduleTimelinePlayback } from './audio/playback.js'; // Path updated
import { initializeRecording, startAudioRecording, stopAudioRecording } from './audio/recording.js'; // Path updated
import { 
    initializeSampleManager, loadSampleFile, loadDrumSamplerPadFile, loadSoundFromBrowserToTarget,
    getAudioBlobFromSoundBrowserItem, autoSliceSample, fetchSoundLibrary
} from './audio/sampleManager.js'; // Path updated
// Removed dbStoreAudio, dbGetAudio, dbDeleteAudio imports as they are global

import {
    initializeUIModule, openTrackInspectorWindow, openMixerWindow, openTrackEffectsRackWindow,
    openMasterEffectsRackWindow, openSoundBrowserWindow, openPianoRollWindow,
    openYouTubeImporterWindow, updateMixerWindow, renderEffectsList, renderEffectControls,
    renderDirectoryView, renderSoundBrowser,
    renderSamplePads, updateSliceEditorUI,
    renderDrumSamplerPads, updateDrumPadControlsUI, createKnob // NOTE: openProfileWindow removed from this line
} from './ui/ui.js'; // Path updated
// Removed AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions imports as they are global

import { initializeMetronome, toggleMetronome } from './audio/metronome.js'; // Path updated
// Removed initializeAuth, handleBackgroundUpload imports as they are global

// Import the new state modules
import { initializeAppState, getPlaybackMode, setPlaybackMode, getCurrentUserThemePreference, setCurrentUserThemePreference, getMidiRecordModeState, setMidiRecordModeState, getSelectedTimelineClipInfo, setSelectedTimelineClipInfo } from '../state/appState.js';
import { initializeMasterState, getMasterEffects, addMasterEffect, removeMasterEffect, updateMasterEffectParam, reorderMasterEffect, getMasterGainValue, setMasterGainValue } from '../state/masterState.js';
import { initializeProjectState, getIsReconstructingDAW, setIsReconstructingDAW, getUndoStack, getRedoStack, getClipboardData, setClipboardData, captureStateForUndo, undoLastAction, redoLastAction, gatherProjectData, reconstructDAW, saveProject, loadProject, handleProjectFileLoad, exportToWav } from '../state/projectState.js';
import { initializeSoundLibraryState, getLoadedZipFiles, setLoadedZipFiles, getSoundLibraryFileTrees, setSoundLibraryFileTrees, getCurrentLibraryName, setCurrentLibraryName, getCurrentSoundBrowserPath, setCurrentSoundBrowserPath, getPreviewPlayer, setPreviewPlayer, addFileToSoundLibrary } from '../state/soundLibraryState.js';
import { initializeTrackState, getTracks, getTrackById, getSoloedTrackId, setSoloedTrackId, getArmedTrackId, setArmedTrackId, isRecording, setIsRecording, getRecordingTrackId, setRecordingTrackId, getRecordingStartTime, setRecordingStartTime, addTrack, removeTrack, setTracks, setTrackIdCounter } from '../state/trackState.js';
import { initializeWindowState, getOpenWindows, getWindowById, addWindowToStore, removeWindowFromStore, getHighestZ, setHighestZ, incrementHighestZ } from '../state/windowState.js';


let appServices = {};

// applyCustomBackground is now global
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
        const sidePanelHeight = Math.floor(rect.height - 40 - 32 - (margin * 2) - gap); // Use full remaining height
        const sidePanelWidth = 350;
        const leftPanelWidth = Math.floor(desktopEl.clientWidth * 0.5);

        const row1Y = margin; // Top-most row starts at margin
        const row2Y = row1Y + mixerHeight + gap; // Second row starts after mixer + gap
        
        // Removed openTimelineWindow call
        // appServices.openTimelineWindow({
        //     x: margin,
        //     y: row1Y,
        //     width: rect.width - (margin * 2),
        //     height: timelineHeight
        // });
        
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
            height: sidePanelHeight - mixerHeight - gap // Adjust height to fill remaining space
        });
        
        // Sound Browser also adjusts its position and height
        const soundBrowserX = rect.width - sidePanelWidth - margin;
        appServices.openSoundBrowserWindow({
            x: soundBrowserX,
            y: row1Y, // Starts at the top now
            height: sidePanelHeight // Use full remaining height for side panel
        });
    }, 100); 
}


function applyUserTheme() {
    // Access via appServices
    const preference = appServices.getCurrentUserThemePreference();
    const body = document.body;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (preference === 'light' || (preference === 'system' && !prefersDark)) {
        body.classList.remove('theme-dark');
        body.classList.add('theme-light');
    } else {
        body.classList.remove('theme-light');
        body.classList.add('theme-dark');
    }
}

function handleMasterEffectsUIUpdate() {
    // Access via appServices
    const rackWindow = appServices.getWindowById('masterEffectsRack');
    if (rackWindow && rackWindow.element && !rackWindow.isMinimized) {
        rackWindow.refresh();
    }
}

function handleTrackUIUpdate(trackId, reason, detail) {
    // Access via appServices
    const track = appServices.getTrackById(trackId);
    if (!track) return;

    const soloedTrackId = appServices.getSoloedTrackId();
    const isEffectivelyMuted = track.isMuted || (soloedTrackId !== null && soloedTrackId !== track.id);

    const inspectorWindow = appServices.getWindowById(`trackInspector-${track.id}`);
    if (inspectorWindow && inspectorWindow.element && !inspectorWindow.isMinimized) {
        // Find the specific buttons within this inspector window
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
    
    // The mixer window update logic is already robust as it re-renders
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
    
    // Removed renderTimeline call
    // if (reason === 'nameChanged' || reason === 'clipsChanged') {
    //     appServices.renderTimeline();
    // }
}

function onPlaybackModeChange(newMode, oldMode) {
    console.log(`Playback mode changed from ${oldMode} to ${newMode}`);
    // Access via appServices
    const tracks = appServices.getTracks();

    if (Tone.Transport.state === 'started') {
        Tone.Transport.stop();
    }
    
    tracks.forEach(track => track.sequences.stopSequence?.());

    // scheduleTimelinePlayback is not needed as timeline is removed
    // if (newMode === 'timeline') {
    //     scheduleTimelinePlayback();
    // } else { 
        tracks.forEach(track => track.sequences.recreateToneSequence?.());
    // }

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
            
            // Access via appServices
            const mode = appServices.getPlaybackMode();
            // No updatePlayheadPosition if timeline is removed
            // if (mode === 'timeline') {
            //     updatePlayheadPosition(transportTime);
            // } else { // 'piano-roll'
                appServices.updatePianoRollPlayhead(transportTime);
            // }
            
            // Access via appServices
            appServices.updateMeters(document.getElementById('masterMeterBarGlobalTop'), null, appServices.getTracks());
        }
        requestAnimationFrame(drawLoop);
    }
    
    appServices = {
        // createWindow assumes SnugWindow is global
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        // showNotification, createContextMenu, showCustomModal, drawWaveform are global
        showNotification: showNotification, 
        createContextMenu: createContextMenu, 
        updateTrackUI: handleTrackUIUpdate,
        showCustomModal: showCustomModal, 
        applyUserThemePreference: applyUserTheme, 
        updateMasterEffectsUI: handleMasterEffectsUIUpdate,
        // applyCustomBackground, handleBackgroundUpload are global
        applyCustomBackground: applyCustomBackground,
        handleBackgroundUpload: handleBackgroundUpload,

        // State Module Accessors
        getTracks: getTracks,
        getTrackById: getTrackById,
        addTrack: addTrack,
        removeTrack: removeTrack,
        setTracks: setTracks,
        setTrackIdCounter: setTrackIdCounter,

        getOpenWindows: getOpenWindows,
        getWindowById: getWindowById,
        addWindowToStore: addWindowToStore,
        removeWindowFromStore: removeWindowFromStore,
        getHighestZ: getHighestZ,
        setHighestZ: setHighestZ,
        incrementHighestZ: incrementHighestZ,
        
        getMidiAccess: getMidiAccess,
        setMidiAccess: setMidiAccess,
        getActiveMIDIInput: getActiveMIDIInput,
        setActiveMIDIInput: setActiveMIDIInput,
        getPlaybackMode: getPlaybackMode,
        setPlaybackMode: setPlaybackMode,
        getCurrentUserThemePreference: getCurrentUserThemePreference,
        setCurrentUserThemePreference: setCurrentUserThemePreference,
        getSelectedTimelineClipInfo: getSelectedTimelineClipInfo,
        setSelectedTimelineClipInfo: setSelectedTimelineClipInfo,
        getMidiRecordModeState: getMidiRecordModeState,
        setMidiRecordModeState: setMidiRecordModeState,

        getMasterEffects: getMasterEffects,
        addMasterEffect: addMasterEffect,
        removeMasterEffect: removeMasterEffect,
        updateMasterEffectParam: updateMasterEffectParam,
        reorderMasterEffect: reorderMasterEffect,
        getMasterGainValue: getMasterGainValue,
        setMasterGainValue: setMasterGainValue,

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

        getLoadedZipFiles: getLoadedZipFiles,
        setLoadedZipFiles: setLoadedZipFiles,
        getSoundLibraryFileTrees: getSoundLibraryFileTrees,
        setSoundLibraryFileTrees: setSoundLibraryFileTrees,
        getCurrentLibraryName: getCurrentLibraryName,
        setCurrentLibraryName: setCurrentLibraryName,
        getCurrentSoundBrowserPath: getCurrentSoundBrowserPath,
        setCurrentSoundBrowserPath: setCurrentSoundBrowserPath,
        getPreviewPlayer: getPreviewPlayer,
        setPreviewPlayer: setPreviewPlayer,
        addFileToSoundLibrary: addFileToSoundLibrary, // from soundLibraryState

        // Audio and Sample Management
        initAudioContextAndMasterMeter, 
        getMasterBusInputNode, 
        updateMeters, 
        rebuildMasterEffectChain,
        addMasterEffectToAudio, 
        removeMasterEffectFromAudio, 
        updateMasterEffectParamInAudio,
        reorderMasterEffectInAudio, 
        setActualMasterVolume, 
        startAudioRecording, 
        stopAudioRecording,
        forceStopAllAudio,
        fetchSoundLibrary, 
        loadSampleFile, 
        loadDrumSamplerPadFile,
        loadSoundFromBrowserToTarget, 
        getAudioBlobFromSoundBrowserItem, 
        autoSliceSample,
        playSlicePreview, 
        playDrumSamplerPadPreview, 
        dbStoreAudio: storeAudio, // global in main.js scope
        dbGetAudio: getAudio,     // global in main.js scope
        dbDeleteAudio: deleteAudio, // global in main.js scope

        // UI Functions
        openTrackInspectorWindow, 
        openMixerWindow, 
        updateMixerWindow, 
        openTrackEffectsRackWindow,
        openMasterEffectsRackWindow, 
        openSoundBrowserWindow, 
        openPianoRollWindow, 
        updatePianoRollPlayhead, 
        openYouTubeImporterWindow,
        renderSamplePads, 
        updateSliceEditorUI,
        renderDrumSamplerPads, 
        updateDrumPadControlsUI, 
        renderDirectoryView, 
        renderSoundBrowser,
        // openProfileWindow is removed from here

        // Event Handlers
        handleTrackMute: handleTrackMute, 
        handleTrackSolo: handleTrackSolo, 
        handleTrackArm: handleTrackArm, 
        handleRemoveTrack: handleRemoveTrack,
        handleOpenEffectsRack: handleOpenEffectsRack, 
        handleOpenPianoRoll: handleOpenPianoRoll,
        onPlaybackModeChange: onPlaybackModeChange,
        handleTimelineLaneDrop: handleTimelineLaneDrop, 
        handleOpenYouTubeImporter: handleOpenYouTubeImporter,
        toggleMetronome: toggleMetronome,

        // Direct Access to Registries/Context
        effectsRegistryAccess: { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions }, // AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions are global
        uiElementsCache: {},
        context: Tone.context,
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
    initializeAuth(appServices); // This one should be made a module eventually too

    initializePrimaryEventListeners();
    attachGlobalControlEvents({});
    setupMIDI();
    
    const savedTheme = localStorage.getItem('snugos-theme');
    if (savedTheme) {
        appServices.setCurrentUserThemePreference(savedTheme);
    } else {
        applyUserTheme();
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyUserTheme);
    
    openDefaultLayout();
    
    console.log("SnugOS Initialized Successfully.");

    appServices.context.lookAhead = 0.02;
    appServices.context.updateInterval = 0.01;
    console.log(`[Latency] lookAhead set to: ${appServices.context.lookAhead}`);
    console.log(`[Latency] updateInterval set to: ${appServices.context.updateInterval}`);
    
    drawLoop();
}

document.addEventListener('DOMContentLoaded', initializeSnugOS);
