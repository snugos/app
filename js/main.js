// js/main.js - Main Application Logic Orchestrator

import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import { showNotification as utilShowNotification, createContextMenu, showCustomModal, drawWaveform } from './utils.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenPianoRoll,
    handleTimelineLaneDrop, handleOpenYouTubeImporter
} from './eventHandlers.js';
import {
    initializeStateModule, getTracksState, getTrackByIdState, getOpenWindowsState,
    getWindowByIdState, addTrackToStateInternal, removeTrackFromStateInternal,
    setHighestZState, getHighestZState, incrementHighestZState,
    addWindowToStoreState, removeWindowFromStoreState,
    getArmedTrackIdState, setArmedTrackIdState, getSoloedTrackIdState, setSoloedTrackIdState,
    getMasterEffectsState, addMasterEffectToState, removeMasterEffectFromState,
    updateMasterEffectParamInState, reorderMasterEffectInState,
    getMasterGainValueState, setMasterGainValueState,
    captureStateForUndoInternal, undoLastActionInternal, redoLastActionInternal,
    gatherProjectDataInternal, reconstructDAWInternal,
    getIsReconstructingDAWState, setIsReconstructingDAWState,
    saveProjectInternal, loadProjectInternal, handleProjectFileLoadInternal, exportToWavInternal,
    getLoadedZipFilesState, setLoadedZipFilesState, setSoundLibraryFileTreesState, getSoundLibraryFileTreesState,
    setCurrentLibraryNameState, getCurrentLibraryNameState, setCurrentSoundBrowserPathState,
    getPreviewPlayerState, setPreviewPlayerState,
    setSelectedTimelineClipInfoState,
    setPlaybackModeState, getPlaybackModeState,
    setIsRecordingState, isTrackRecordingState, setRecordingTrackIdState, getRecordingTrackIdState, setRecordingStartTimeState,
    getCurrentUserThemePreferenceState, setCurrentUserThemePreferenceState,
    addFileToSoundLibraryInternal,
    setMidiAccessState, getMidiAccessState,
    getMidiRecordModeState, setMidiRecordModeState
} from './state.js';
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
import { storeAudio as dbStoreAudio, getAudio as dbGetAudio, deleteAudio as dbDeleteAudio } from './db.js';
import {
    initializeUIModule, openTrackInspectorWindow, openMixerWindow, openTrackEffectsRackWindow,
    openMasterEffectsRackWindow, openTimelineWindow, openSoundBrowserWindow, openPianoRollWindow,
    openYouTubeImporterWindow, updateMixerWindow, renderEffectsList, renderEffectControls,
    renderTimeline, updatePlayheadPosition, updatePianoRollPlayhead,
    renderDirectoryView,
    renderSoundBrowser,
    renderSamplePads, updateSliceEditorUI,
    renderDrumSamplerPads, updateDrumPadControlsUI, createKnob, openProfileWindow
} from './ui.js';
import { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions } from './effectsRegistry.js';
import { initializeMetronome, toggleMetronome } from './audio/metronome.js';
import { initializeAuth, handleBackgroundUpload } from './auth.js'; 

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

        const timelineHeight = 220;
        const mixerHeight = 160;
        const sidePanelWidth = 350;
        const leftPanelWidth = Math.floor(desktopEl.clientWidth * 0.5);

        const timelineY = margin;
        const row2Y = timelineY + timelineHeight + gap;
        const row3Y = row2Y + mixerHeight + gap;
        
        // Ensure timeline window is created and added to store before rendering
        const timelineWindow = appServices.createWindow('timeline', 'Timeline', `
            <div id="timeline-container" class="h-full w-full overflow-hidden relative flex flex-col bg-white dark:bg-black">
                <div id="timeline-header" class="h-5 bg-white dark:bg-black border-b border-black dark:border-white relative overflow-hidden flex-shrink-0">
                    <div id="timeline-ruler" class="absolute top-0 left-0 h-full" style="width: 4000px;"></div>
                </div>
                <div id="timeline-tracks-and-playhead-container" class="flex-grow relative overflow-auto">
                    <div id="timeline-playhead" class="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events:none" style="left: 120px;"></div>
                    <div id="timeline-tracks-area" class="relative h-full"></div>
                </div>
            </div>
        `, { // Pass content HTML directly
            x: margin,
            y: timelineY,
            width: rect.width - (margin * 2),
            height: timelineHeight
        });

        // Now that the timelineWindow is created and stored, call renderTimeline
        if (timelineWindow?.element) {
            appServices.renderTimeline(); // Explicitly call render for the timeline
        }
        
        // Continue with other windows, they don't have the same immediate render dependency
        appServices.openMixerWindow({
            x: margin,
            y: row2Y,
            width: leftPanelWidth,
            height: mixerHeight
        });

        appServices.openMasterEffectsRackWindow({
            x: margin,
            y: row3Y,
        });
        
        const soundBrowserX = rect.width - sidePanelWidth - margin;
        appServices.openSoundBrowserWindow({
            x: soundBrowserX,
            y: row2Y,
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
        // Instead of trying to update individual buttons, re-initialize the common controls.
        // This ensures all button states are correctly set and listeners are fresh.
        // Pass inspectorWindow.getWindowState() to preserve its position/size/state on re-open.
        appServices.openTrackInspectorWindow(trackId, inspectorWindow.getWindowState()); //
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
        const rackWindow = getWindowByIdState(`effectsRack-${trackId}`);
        rackWindow?.refresh();
    }
    
    if (reason === 'nameChanged' || reason === 'clipsChanged') {
        appServices.renderTimeline(); // Ensure this calls renderTimeline without issue
    }
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
            if (mode === 'timeline') {
                updatePlayheadPosition(transportTime);
            } else { // 'piano-roll'
                updatePianoRollPlayhead(transportTime);
            }
            
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
        openMasterEffectsRackWindow, renderEffectsList, renderEffectControls, createKnob,
        openTimelineWindow, renderTimeline, updatePlayheadPosition, openPianoRollWindow, updatePianoRollPlayhead, openYouTubeImporterWindow,
        openProfileWindow, // Add the new profile window opener to services
        renderSamplePads, updateSliceEditorUI,
        renderDrumSamplerPads, updateDrumPadControlsUI, setSelectedTimelineClipInfo: setSelectedTimelineClipInfoState,
        openSoundBrowserWindow, renderSoundBrowser, renderDirectoryView,
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
