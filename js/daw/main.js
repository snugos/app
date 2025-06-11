// js/daw/main.js - Main Application Logic Orchestrator

import { SnugWindow } from './SnugWindow.js';
import * as Constants from '../constants.js';
import { showNotification as utilShowNotification, createContextMenu, showCustomModal, drawWaveform } from '../utils.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenPianoRoll,
    handleTimelineLaneDrop, handleOpenYouTubeImporter
} from './eventHandlers.js';
import {
    // Importing from decomposed state modules (these remain the same relative to main.js)
    getTracks as getTracksState, getTrackById as getTrackByIdState,
    getOpenWindows as getOpenWindowsState, getWindowById as getWindowByIdState,
    getArmedTrackId as getArmedTrackIdState, setArmedTrackId as setArmedTrackIdState,
    getSoloedTrackId as getSoloedTrackIdState, setSoloedTrackId as setSoloedTrackIdState,
    getMasterEffects as getMasterEffectsState, addMasterEffect as addMasterEffectToState,
    removeMasterEffect as removeMasterEffectFromState, updateMasterEffectParam as updateMasterEffectParamInState,
    reorderMasterEffect as reorderMasterEffectInState, getMasterGainValue as getMasterGainValueState,
    setMasterGainValue as setMasterGainValueState, getPlaybackMode as getPlaybackModeState,
    setPlaybackMode as setPlaybackModeState, setIsRecording as setIsRecordingState,
    isTrackRecording as isTrackRecordingState, setRecordingTrackId as setRecordingTrackIdState,
    getRecordingTrackId as getRecordingTrackIdState, setRecordingStartTime as setRecordingStartTimeState,
    getCurrentUserThemePreference as getCurrentUserThemePreferenceState, setCurrentUserThemePreference as setCurrentUserThemePreferenceState,
    getIsReconstructingDAW as getIsReconstructingDAWState, setIsReconstructingDAW as setIsReconstructingDAWState,
    captureStateForUndo as captureStateForUndoInternal, undoLastAction as undoLastActionInternal,
    redoLastAction as redoLastActionInternal, gatherProjectData as gatherProjectDataInternal,
    reconstructDAW as reconstructDAWInternal, saveProject as saveProjectInternal, loadProject as loadProjectInternal,
    handleProjectFileLoad as handleProjectFileLoadInternal, exportToWav as exportToWavInternal,
    getLoadedZipFiles as getLoadedZipFilesState, setLoadedZipFiles as setLoadedZipFilesState,
    setSoundLibraryFileTrees as setSoundLibraryFileTreesState, getSoundLibraryFileTrees as getSoundLibraryFileTreesState,
    setCurrentLibraryName as setCurrentLibraryNameState, getCurrentLibraryName as getCurrentLibraryNameState,
    setCurrentSoundBrowserPath as setCurrentSoundBrowserPathState, getPreviewPlayer as getPreviewPlayerState,
    setPreviewPlayer as setPreviewPlayerState,
    setSelectedTimelineClipInfo as setSelectedTimelineClipInfoState,
    addFileToSoundLibrary as addFileToSoundLibraryInternal,
    getMidiAccess as getMidiAccessState, setMidiAccess as setMidiAccessState,
    getMidiRecordModeState, setMidiRecordModeState,
    // Add specific imports for track and window state where needed
    addTrack as addTrackToStateInternal,
    removeTrack as removeTrackFromStateInternal,
    setTracks as setTracksState,
    setTrackIdCounter as setTrackIdCounterState,
    addWindowToStore as addWindowToStoreState,
    removeWindowFromStore as removeWindowFromStoreState,
    setHighestZ as setHighestZState,
    incrementHighestZ as incrementHighestZState,
    initializeProjectState,
    initializeTrackState,
    initializeWindowState,
    initializeAppState,
    initializeMasterState,
    initializeSoundLibraryState
} from '../state.js';
import {
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters,
    rebuildMasterEffectChain, addMasterEffectToAudio, removeMasterEffectFromAudio,
    updateMasterEffectParamInAudio, reorderMasterEffectInAudio, setActualMasterVolume,
    getMasterBusInputNode, forceStopAllAudio
} from './audio.js';
import { initializePlayback, playSlicePreview, playDrumSamplerPadPreview, scheduleTimelinePlayback } from './audio/playback.js';
import { initializeRecording, startAudioRecording, stopAudioRecording } from './audio/recording.js';
import { 
    initializeSampleManager, loadSampleFile, loadDrumSamplerPadFile, loadSoundFromBrowserToTarget,
    getAudioBlobFromSoundBrowserItem, autoSliceSample, fetchSoundLibrary
} from './audio/sampleManager.js';
import { storeAudio as dbStoreAudio, getAudio as dbGetAudio, deleteAudio as dbDeleteAudio } from '../db.js';
import {
    initializeUIModule, openTrackInspectorWindow, openMixerWindow, openTrackEffectsRackWindow,
    openMasterEffectsRackWindow, /* Removed openTimelineWindow */ openSoundBrowserWindow, openPianoRollWindow,
    openYouTubeImporterWindow, updateMixerWindow, renderEffectsList, renderEffectControls,
    /* Removed renderTimeline, updatePlayheadPosition */ updatePianoRollPlayhead, /* Renamed renderDirectoryView for clarity below */
    renderDirectoryView, /* Added new render functions for SoundBrowser */
    renderSoundBrowser,
    renderSamplePads, updateSliceEditorUI,
    renderDrumSamplerPads, updateDrumPadControlsUI, createKnob, openProfileWindow
} from './ui.js'; /* Changed import for renderTimeline to be specific or removed */
import { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions } from '../effectsRegistry.js';
import { initializeMetronome, toggleMetronome } from './metronome.js';
import { initializeAuth, handleBackgroundUpload } from '../auth.js'; 

let appServices = {};

// UPDATED: Can now handle a URL string or a File object
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
    const preference = getCurrentUserThemePreferenceState();
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
    const rackWindow = getWindowByIdState('masterEffectsRack');
    if (rackWindow && rackWindow.element && !rackWindow.isMinimized) {
        rackWindow.refresh();
    }
}

function handleTrackUIUpdate(trackId, reason, detail) {
    const track = getTrackByIdState(trackId);
    if (!track) return;

    const soloedTrackId = getSoloedTrackIdState();
    const isEffectivelyMuted = track.isMuted || (soloedTrackId !== null && soloedTrackId !== track.id);

    const inspectorWindow = getWindowByIdState(`trackInspector-${track.id}`);
    if (inspectorWindow && inspectorWindow.element && !inspectorWindow.isMinimized) {
        // Find the specific buttons within this inspector window
        const muteBtn = inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
        const soloBtn = inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
        const armBtn = inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);

        if (reason === 'armChanged') {
            if (armBtn) armBtn.classList.toggle('armed', getArmedTrackIdState() === track.id);
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
    
    // The mixer window update logic is already robust as it re-renders
    const mixerWindow = getWindowByIdState('mixer');
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
        const rackWindow = getWindowByIdById(`effectsRack-${trackId}`);
        rackWindow?.refresh();
    }
    
    // Removed renderTimeline call
    // if (reason === 'nameChanged' || reason === 'clipsChanged') {
    //     appServices.renderTimeline();
    // }
}

function onPlaybackModeChange(newMode, oldMode) {
    console.log(`Playback mode changed from ${oldMode} to ${newMode}`);
    const tracks = getTracksState();

    if (Tone.Transport.state === 'started') {
        Tone.Transport.stop();
    }
    
    tracks.forEach(track => track.sequences.stopSequence?.());

    if (newMode === 'timeline') {
        scheduleTimelinePlayback();
    } else { 
        tracks.forEach(track => track.sequences.recreateToneSequence?.());
    }

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
            // No updatePlayheadPosition if timeline is removed
            // if (mode === 'timeline') {
            //     updatePlayheadPosition(transportTime);
            // } else { // 'piano-roll'
                updatePianoRollPlayhead(transportTime);
            // }
            
            updateMeters(document.getElementById('masterMeterBarGlobalTop'), null, getTracksState());
        }
        requestAnimationFrame(drawLoop);
    }
    
    appServices = {
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        showNotification: utilShowNotification, createContextMenu, updateTrackUI: handleTrackUIUpdate,
        showCustomModal, applyUserThemePreference: applyUserTheme, updateMasterEffectsUI: handleMasterEffectsUIUpdate,
        applyCustomBackground,
        handleBackgroundUpload, // NEW service for handling uploads
        getTracks: getTracksState, getTrackById: getTrackByIdState, addTrack: addTrackToStateInternal,
        removeTrack: removeTrackFromStateInternal, getOpenWindows: getOpenWindowsState, getWindowById: getWindowByIdState,
        addWindowToStore: addWindowToStoreState, removeWindowFromStore: removeWindowFromStoreState,
        getHighestZ: getHighestZState, setHighestZ: setHighestZState, incrementHighestZ: incrementHighestZState,
        getMidiAccess: getMidiAccessState, setMidiAccess: setMidiAccessState,
        getArmedTrackId: getArmedTrackIdState,
        setArmedTrackId: setArmedTrackIdState,
        getSoloedTrackId: getSoloedTrackIdState, setSoloedTrackId: setSoloedTrackIdState,
        getMasterEffects: getMasterEffectsState, addMasterEffect: addMasterEffectToState,
        removeMasterEffect: removeMasterEffectFromState, updateMasterEffectParam: updateMasterEffectParamInState,
        reorderMasterEffect: reorderMasterEffectInState, getMasterGainValue: getMasterGainValueState,
        setMasterGainValue: setMasterGainValueState, getPlaybackMode: getPlaybackModeState,
        setPlaybackMode: setPlaybackModeState, setIsRecording: setIsRecordingState,
        isTrackRecording: isTrackRecordingState, setRecordingTrackId: setRecordingTrackIdState,
        getRecordingTrackId: getRecordingTrackIdState, setRecordingStartTime: setRecordingStartTimeState,
        setCurrentUserThemePreference: setCurrentUserThemePreferenceState,
        getIsReconstructingDAW: getIsReconstructingDAWState, setIsReconstructingDAW: setIsReconstructingDAWState,
        captureStateForUndo: captureStateForUndoInternal, undoLastAction: undoLastActionInternal,
        redoLastAction: redoLastActionInternal, gatherProjectData: gatherProjectDataInternal,
        reconstructDAW: reconstructDAWInternal, saveProject: saveProjectInternal, loadProject: loadProjectInternal,
        handleProjectFileLoad: handleProjectFileLoadInternal, exportToWav: exportToWavInternal,
        initAudioContextAndMasterMeter, getMasterBusInputNode, updateMeters, rebuildMasterEffectChain,
        addMasterEffectToAudio, removeMasterEffectFromAudio, updateMasterEffectParamInAudio,
        reorderMasterEffectInAudio, setActualMasterVolume, startAudioRecording, stopAudioRecording,
        forceStopAllAudio,
        addFileToSoundLibrary: addFileToSoundLibraryInternal,
        fetchSoundLibrary, getLoadedZipFiles: getLoadedZipFilesState, setLoadedZipFiles: setLoadedZipFilesState,
        getSoundLibraryFileTrees: getSoundLibraryFileTreesState, setSoundLibraryFileTrees: setSoundLibraryFileTreesState,
        setCurrentLibraryName: setCurrentLibraryNameState, getCurrentLibraryName: getCurrentLibraryNameState,
        setCurrentSoundBrowserPath: setCurrentSoundBrowserPathState, getPreviewPlayer: getPreviewPlayerState,
        setPreviewPlayer: setPreviewPlayerState, loadSampleFile, loadDrumSamplerPadFile,
        loadSoundFromBrowserToTarget, getAudioBlobFromSoundBrowserItem, autoSliceSample,
        playSlicePreview, playDrumSamplerPadPreview, dbStoreAudio, dbGetAudio, dbDeleteAudio,
        openTrackInspectorWindow, openMixerWindow, updateMixerWindow, openTrackEffectsRackWindow,
        openMasterEffectsRackWindow, /* Removed openTimelineWindow */ openSoundBrowserWindow, openPianoRollWindow, updatePianoRollPlayhead, /* Removed renderTimeline, updatePlayheadPosition for timeline */
        renderDirectoryView, /* Added new render functions for SoundBrowser */
        renderSoundBrowser,
        renderSamplePads, updateSliceEditorUI,
        renderDrumSamplerPads, updateDrumPadControlsUI, createKnob, openProfileWindow,
        /* Removed renderTimeline for timeline */
        drawWaveform,
        handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
        handleOpenEffectsRack, 
        handleOpenPianoRoll: handleOpenPianoRoll,
        onPlaybackModeChange: onPlaybackModeChange,
        handleTimelineLaneDrop, 
        handleOpenYouTubeImporter,
        toggleMetronome: toggleMetronome,
        effectsRegistryAccess: { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions },
        uiElementsCache: {},
        context: Tone.context,
        getMidiRecordModeState, // Added from state.js
        setMidiRecordModeState  // Added from state.js
    };

    initializeStateModule(appServices);
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
        setCurrentUserThemePreferenceState(savedTheme);
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
