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
    renderDrumSamplerPushInputBtn, updateDrumPadControlsUI, createKnob
} from './ui/ui.js';

import { initializeMetronome, toggleMetronome } from './audio/metronome.js';

// NEW: Explicitly import functions from auth.js as it is now a module
import { initializeAuth, handleBackgroundUpload } from '../auth.js'; // CORRECTED: Added import

// Import the new state modules
import { initializeAppState, getMidiAccess, setActiveMIDIInput, getPlaybackMode, setPlaybackMode, getCurrentUserThemePreference, setCurrentUserThemePreference, getSelectedTimelineClipInfo, setSelectedTimelineClipInfo, getMidiRecordModeState, setMidiRecordModeState } from './state/appState.js';
import { initializeMasterState, getMasterEffects, setMasterEffects, addMasterEffect, removeMasterEffect, updateMasterEffectParam, reorderMasterEffect, getMasterGainValue, setMasterGainValue } from './state/masterState.js';
import { initializeProjectState, getIsReconstructingDAW, setIsReconstructingDAW, getUndoStack, getRedoStack, getClipboardData, setClipboardData, captureStateForUndo, undoLastAction, redoLastAction, gatherProjectData, reconstructDAW, saveProject, loadProject, handleProjectFileLoad, exportToWav } from './state/projectState.js';
import { initializeSoundLibraryState, getLoadedZipFiles, setLoadedZipFiles, getSoundLibraryFileTrees, setSoundLibraryFileTrees, getCurrentLibraryName, setCurrentLibraryName, getCurrentSoundBrowserPath, setCurrentSoundBrowserPath, getPreviewPlayer, setPreviewPlayer, addFileToSoundLibrary } from './state/soundLibraryState.js';
import { initializeTrackState, getTracks, getTrackById, getSoloedTrackId, setSoloedTrackId, getArmedTrackId, setArmedTrackId, isRecording, setIsRecording, getRecordingTrackId, setRecordingTrackId, getRecordingStartTime, addTrack, removeTrack, setTracks, setTrackIdCounter } from './state/trackState.js';
import { initializeWindowState, getOpenWindows, getWindowById, addWindowToStore, removeWindowFromStore, getHighestZ, setHighestZ, incrementHighestZ } from './state/windowState.js';


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
    const preference = getCurrentUserThemePreference();
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
                drawWaveform(canvas, track.instrumentSamplerSettings.audioBuffer);
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

    function drawLoop() {
        if (typeof Tone !== 'undefined') {
            const transportTime = Tone.Transport.seconds;
            
            const mode = getPlaybackMode();
            updatePianoRollPlayhead(transportTime);
            
            updateMeters(document.getElementById('masterMeterBarGlobalTop'), null, getTracks());
        }
        requestAnimationFrame(drawLoop);
    }

    appServices = {
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        showNotification: showNotification, createContextMenu: createContextMenu, updateTrackUI: handleTrackUIUpdate,
        showCustomModal: showCustomModal, applyUserThemePreference: applyUserTheme, updateMasterEffectsUI: handleMasterEffectsUIUpdate,
        applyCustomBackground: applyCustomBackground,
        handleBackgroundUpload: handleBackgroundUpload, // This now references the imported handleBackgroundUpload
        getTracks: getTracks, getTrackById: getTrackById, addTrack: addTrack,
        removeTrack: removeTrack, getOpenWindows: getOpenWindows, getWindowById: getWindowById,
        getHighestZ: getHighestZ, setHighestZ: setHighestZ, incrementHighestZ: incrementHighestZ,
        addWindowToStore: addWindowToStore, removeWindowFromStore: removeWindowFromStore,
        getMidiAccess: getMidiAccess, setMidiAccess: setMidiAccess,
        getArmedTrackId: getArmedTrackId,
        setArmedTrackId: setArmedTrackId,
        getSoloedTrackId: getSoloedTrackId, setSoloedTrackId: setSoloedTrackId,
        getMasterEffects: getMasterEffects, addMasterEffect: addMasterEffect,
        removeMasterEffect: removeMasterEffect, updateMasterEffectParam: updateMasterEffectParam,
        reorderMasterEffect: reorderMasterEffect, getMasterGainValue: getMasterGainValue,
        setMasterGainValue: setMasterGainValue, getPlaybackMode: getPlaybackMode,
        setPlaybackMode: setPlaybackMode, setIsRecording: setIsRecording,
        isTrackRecording: isRecording, setRecordingTrackId: setRecordingTrackId,
        getRecordingTrackId: getRecordingTrackId, setRecordingStartTime: getRecordingStartTime,
        setCurrentUserThemePreference: setCurrentUserThemePreference,
        getIsReconstructingDAW: getIsReconstructingDAW, setIsReconstructingDAW: setIsReconstructingDAW,
        captureStateForUndo: captureStateForUndo, undoLastAction: undoLastAction,
        redoLastAction: redoLastAction, gatherProjectData: gatherProjectData,
        reconstructDAW: reconstructDAW, saveProject: saveProject, loadProject: loadProject,
        handleProjectFileLoad: handleProjectFileLoad, exportToWav: exportToWav,
        initAudioContextAndMasterMeter, getMasterBusInputNode, updateMeters, rebuildMasterEffectChain,
        addMasterEffectToAudio, removeMasterEffectFromAudio, updateMasterEffectParamInAudio,
        reorderMasterEffectInAudio, setActualMasterVolume, startAudioRecording, stopAudioRecording,
        forceStopAllAudio,
        addFileToSoundLibrary: addFileToSoundLibrary,
        fetchSoundLibrary, getLoadedZipFiles: getLoadedZipFiles, setLoadedZipFiles: setLoadedZipFiles,
        getSoundLibraryFileTrees: getSoundLibraryFileTrees, setSoundLibraryFileTrees: setSoundLibraryFileTrees,
        setCurrentLibraryName: setCurrentLibraryName, getCurrentLibraryName: getCurrentLibraryName,
        setCurrentSoundBrowserPath: setCurrentSoundBrowserPath, getPreviewPlayer: getPreviewPlayer,
        setPreviewPlayer: setPreviewPlayer, loadSampleFile, loadDrumSamplerPadFile,
        loadSoundFromBrowserToTarget, getAudioBlobFromSoundBrowserItem, autoSliceSample,
        playSlicePreview, playDrumSamplerPadPreview, dbStoreAudio: storeAudio, dbGetAudio: getAudio, dbDeleteAudio: deleteAudio,
        openTrackInspectorWindow, openMixerWindow, updateMixerWindow, openTrackEffectsRackWindow,
        openMasterEffectsRackWindow, openSoundBrowserWindow, openPianoRollWindow, updatePianoRollPlayhead, openYouTubeImporterWindow,
        renderSamplePads, updateSliceEditorUI,
        renderDrumSamplerPads, updateDrumPadControlsUI, setSelectedTimelineClipInfo: setSelectedTimelineClipInfo,
        renderDirectoryView, renderSoundBrowser,
        drawWaveform: drawWaveform,
        handleTrackMute: handleTrackMute, handleTrackSolo: handleTrackSolo, handleTrackArm: handleTrackArm, handleRemoveTrack: handleRemoveTrack,
        handleOpenEffectsRack: handleOpenEffectsRack,
        handleOpenPianoRoll: handleOpenPianoRoll,
        onPlaybackModeChange: onPlaybackModeChange,
        handleTimelineLaneDrop: handleTimelineLaneDrop,
        handleOpenYouTubeImporter: handleOpenYouTubeImporter,
        toggleMetronome: toggleMetronome,
        effectsRegistryAccess: { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions },
        uiElementsCache: {},
        context: Tone.context,
        getMidiRecordModeState: getMidiRecordModeState,
        setMidiRecordModeState: setMidiRecordModeState
    };

    initializeAppState(appServices);
    initializeMasterState(appServices);
    initializeProjectState(appServices);
    initializeSoundLibraryState(appServices);
    initializeTrackState(appServices);
    initializeWindowState(appServices);

    initializeAudioModule(appServices);
    initializePlayback(appServices);
    initializeRecording(appServices);
    initializeSampleManager(appServices);
    initializeUIModule(appServices);
    initializeEventHandlersModule(appServices);
    initializeMetronome(appServices);
    initializeAuth(appServices); // This now references the imported initializeAuth

    initializePrimaryEventListeners();
    attachGlobalControlEvents({});
    setupMIDI();

    const savedTheme = localStorage.getItem('snugos-theme');
    if (savedTheme) {
        setCurrentUserThemePreference(savedTheme);
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
