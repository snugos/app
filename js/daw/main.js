// js/daw/main.js - Main Application Logic Orchestrator

// Import SnugWindow class
import { SnugWindow } from './SnugWindow.js';

// Import all functions from eventHandlers.js module
import * as EventHandlersModule from './eventHandlers.js';

// All core utilities are now directly relative to js/daw/
import * as Constants from './constants.js';
import { storeAudio, getAudio, deleteAudio, storeAsset, getAsset } from './db.js';
import { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions } from './effectsRegistry.js';
import { showNotification, showCustomModal, createContextMenu, base64ToBlob, drawWaveform, setupGenericDropZoneListeners, createDropZoneHTML, showConfirmationDialog, getThemeColors } from './utils.js';
import { initializeAuth, handleBackgroundUpload, handleLogout } from './auth.js';

// Audio module imports
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

// UI module imports
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
} from './ui/ui.js';

import { initializeMetronome, toggleMetronome } from './audio/metronome.js';

// State module imports
import { initializeAppState, getPlaybackMode, setPlaybackMode, getCurrentUserThemePreference, setCurrentUserThemePreference, getMidiRecordModeState, setMidiRecordModeState, getSelectedTimelineClipInfo, setSelectedTimelineClipInfo, getMidiAccess, setMidiAccess, getActiveMIDIInput, setActiveMIDIInput } from './state/appState.js';
import { initializeMasterState, getMasterEffects, addMasterEffect, removeMasterEffect, updateMasterEffectParam, reorderMasterEffect, getMasterGainValue, setMasterGainValue } from './state/masterState.js';
import { initializeProjectState, getIsReconstructingDAW, setIsReconstructingDAW, getUndoStack, getRedoStack, getClipboardData, setClipboardData, captureStateForUndo, undoLastAction, redoLastAction, gatherProjectData, reconstructDAW, saveProject, loadProject, handleProjectFileLoad, exportToWav } from './state/projectState.js';
import { initializeSoundLibraryState, getLoadedZipFiles, setLoadedZipFiles, getSoundLibraryFileTrees, setSoundLibraryFileTrees, getCurrentLibraryName, setCurrentLibraryName, getCurrentSoundBrowserPath, setCurrentSoundBrowserPath, getPreviewPlayer, setPreviewPlayer, addFileToSoundLibrary } from './state/soundLibraryState.js';
import { initializeTrackState, getTracks, getTrackById, getSoloedTrackId, setSoloedTrackId, getArmedTrackId, setArmedTrackId, isRecording, setIsRecording, getRecordingTrackId, setRecordingTrackId, getRecordingStartTime, setRecordingStartTime, addTrack, removeTrack, setTracks, setTrackIdCounter } from './state/trackState.js';
import { initializeWindowState, getOpenWindows, getWindowById, addWindowToStore, removeWindowFromStore, getHighestZ, setHighestZ, incrementHighestZ, serializeWindows, reconstructWindows } from './state/windowState.js';

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
    // This is crucial for resolving circular dependencies and ensuring functions are available.
    appServices = {
        // Core application services
        createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
        
        // Utilities (from js/daw/utils.js)
        showNotification: showNotification, 
        showCustomModal: showCustomModal,
        createContextMenu: createContextMenu, 
        drawWaveform: drawWaveform,
        base64ToBlob: base64ToBlob, 
        setupGenericDropZoneListeners: setupGenericDropZoneListeners, 
        createDropZoneHTML: createDropZoneHTML, 
        showConfirmationDialog: showConfirmationDialog, 
        getThemeColors: getThemeColors, 

        // Auth related functions (from js/daw/auth.js)
        // initializeAuth needs to be called to set these, but we can pre-define them
        initializeAuth: null, // Placeholder, assigned after import
        handleBackgroundUpload: handleBackgroundUpload,
        handleLogout: handleLogout,
        updateUserAuthContainer: null, // Placeholder, assigned after auth module initialization

        // DB functions (from js/daw/db.js)
        dbStoreAudio: storeAudio, 
        dbGetAudio: getAudio,     
        dbDeleteAudio: deleteAudio, 
        getAsset: getAsset, 
        storeAsset: storeAsset, 

        // Tone.js related contexts and registries (from js/daw/effectsRegistry.js, etc.)
        effectsRegistryAccess: { AVAILABLE_EFFECTS, getEffectDefaultParams, synthEngineControlDefinitions, getEffectParamDefinitions }, 
        context: Tone.context, // Global Tone object
        Tone: Tone, // The global Tone object itself
        // Directly assign commonly used Tone.js sub-objects/classes for consistent access
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
        ToneWaveShaper: Tone.WaveShaper, 
        ToneFilter: Tone.Filter, 
        ToneDbToGain: Tone.dbToGain, 
        ToneGainToDb: Tone.gainToDb, 

        // State Module Accessors (from js/daw/state/)
        // These are functions that are initialized by their respective state modules
        // and are then made available through appServices.
        getTracks: null, getTrackById: null, addTrack: null, removeTrack: null, setTracks: null, setTrackIdCounter: null,
        getOpenWindows: null, getWindowById: null, addWindowToStore: null, removeWindowFromStore: null, getHighestZ: null, setHighestZ: null, incrementHighestZ: null, serializeWindows: null, reconstructWindows: null,
        getMidiAccess: null, setMidiAccess: null, getActiveMIDIInput: null, setActiveMIDIInput: null, getPlaybackMode: null, setPlaybackMode: null, getCurrentUserThemePreference: null, setCurrentUserThemePreference: null, getSelectedTimelineClipInfo: null, setSelectedTimelineClipInfo: null, getMidiRecordModeState: null, setMidiRecordModeState: null,
        getMasterEffects: null, addMasterEffect: null, removeMasterEffect: null, updateMasterEffectParam: null, reorderMasterEffect: null, getMasterGainValue: null, setMasterGainValue: null,
        getIsReconstructingDAW: null, setIsReconstructingDAW: null, getUndoStack: null, getRedoStack: null, getClipboardData: null, setClipboardData: null, captureStateForUndo: null, undoLastAction: null, redoLastAction: null, gatherProjectData: null, reconstructDAW: null, saveProject: null, loadProject: null, handleProjectFileLoad: null, exportToWav: null,
        getLoadedZipFiles: null, setLoadedZipFiles: null, getSoundLibraryFileTrees: null, setSoundLibraryFileTrees: null, getCurrentLibraryName: null, setCurrentLibraryName: null, getCurrentSoundBrowserPath: null, setCurrentSoundBrowserPath: null, getPreviewPlayer: null, setPreviewPlayer: null, addFileToSoundLibrary: null, 
        getSoloedTrackId: null, setSoloedTrackId: null, getArmedTrackId: null, setArmedTrackId: null, isRecording: null, setIsRecording: null, getRecordingTrackId: null, setRecordingTrackId: null, getRecordingStartTime: null, setRecordingStartTime: null, 
        Track: null, // Placeholder for Track class, assigned after import

        // Audio Module Functions (from js/daw/audio/)
        initializeAudioModule: null, initAudioContextAndMasterMeter: null, updateMeters: null, rebuildMasterEffectChain: null,
        addMasterEffectToAudio: null, removeMasterEffectFromAudio: null, updateMasterEffectParamInAudio: null,
        reorderMasterEffectInAudio: null, setActualMasterVolume: null, getMasterBusInputNode: null, forceStopAllAudio: null, 
        initializePlayback: null, playSlicePreview: null, playDrumSamplerPadPreview: null, scheduleTimelinePlayback: null,
        initializeRecording: null, startAudioRecording: null, stopAudioRecording: null,
        initializeSampleManager: null, loadSampleFile: null, loadDrumSamplerPadFile: null, loadSoundFromBrowserToTarget: null,
        getAudioBlobFromSoundBrowserItem: null, autoSliceSample: null, fetchSoundLibrary: null,

        // UI Module Functions (initializers passed to initializeUIModule)
        initializeUIModule: null, 
        openTrackInspectorWindow: null, openMixerWindow: null, updateMixerWindow: null, 
        openTrackEffectsRackWindow: null, openMasterEffectsRackWindow: null, 
        renderEffectsList: null, renderEffectControls: null,
        openSoundBrowserWindow: null, renderSoundBrowser: null, renderDirectoryView: null,
        openPianoRollWindow: null, updatePianoRollPlayhead: null, 
        openYouTubeImporterWindow: null, openFileViewerWindow: null, 
        renderSamplePads: null, updateSliceEditorUI: null, 
        renderDrumSamplerPads: null, updateDrumPadControlsUI: null, 
        createKnob: null, 

        // Event Handlers (from js/daw/eventHandlers.js)
        // These are functions that are EXPORTED from eventHandlers.js and need to be called by main.js
        // The `initializeEventHandlersModule` function itself is also imported and called.
        initializeEventHandlersModule: null, 
        initializePrimaryEventListeners: null, 
        attachGlobalControlEvents: null, 
        setupMIDI: null, 
        handleTrackMute: null, handleTrackSolo: null, handleTrackArm: null, handleRemoveTrack: null,
        handleOpenEffectsRack: null, handleOpenPianoRoll: null, onPlaybackModeChange: null,
        handleTimelineLaneDrop: null, handleOpenYouTubeImporter: null, 

        // Metronome (from js/daw/audio/metronome.js)
        initializeMetronome: null, toggleMetronome: null,

        // Other utility references
        uiElementsCache: {
            desktop: document.getElementById('desktop'),
            topTaskbar: document.getElementById('topTaskbar'),
            taskbar: document.getElementById('taskbar'),
        },
        applyCustomBackground: applyCustomBackground,
        updateMasterEffectsUI: handleMasterEffectsUIUpdate, 
    };

    // Dynamically import modules and assign their exports to appServices
    // This pattern ensures all functions are correctly assigned to appServices after their
    // module has been loaded and potentially initialized.
    const [
        trackStateModule, windowStateModule, appStateModule, masterStateModule, projectStateModule, soundLibraryStateModule,
        audioModule, playbackModule, recordingModule, sampleManagerModule,
        uiModule, eventHandlersModuleExports, metronomeModule, authModuleExports, 
        { Track } // Directly import Track class from its module
    ] = await Promise.all([
        import('./state/trackState.js'), import('./state/windowState.js'), import('./state/appState.js'), import('./state/masterState.js'), import('./state/projectState.js'), import('./state/soundLibraryState.js'),
        import('./audio/audio.js'), import('./audio/playback.js'), import('./audio/recording.js'), import('./audio/sampleManager.js'),
        import('./ui/ui.js'), import('./eventHandlers.js'), import('./audio/metronome.js'), import('./auth.js'),
        import('./Track.js') // Track.js needs to be imported here to get the class
    ]);

    // Assign exports of Track class directly
    appServices.Track = Track;

    // Assign all exported functions from each module to appServices
    // These `Object.assign` calls ensure that functions like `getTracks`, `getWindowById`, etc.,
    // are available directly on `appServices`.
    Object.assign(appServices, trackStateModule);
    Object.assign(appServices, windowStateModule);
    Object.assign(appServices, appStateModule);
    Object.assign(appServices, masterStateModule);
    Object.assign(appServices, projectStateModule);
    Object.assign(appServices, soundLibraryStateModule);
    Object.assign(appServices, audioModule);
    Object.assign(appServices, playbackModule);
    Object.assign(appServices, recordingModule);
    Object.assign(appServices, sampleManagerModule);
    Object.assign(appServices, uiModule); 
    Object.assign(appServices, metronomeModule); 
    
    // Event Handlers and Auth modules have specific initialization patterns
    // where their `initialize` function sets up internal state and returns
    // an object of functions to be exposed (if any).
    const eventHandlersReturn = eventHandlersModuleExports.initializeEventHandlersModule(appServices); 
    Object.assign(appServices, eventHandlersReturn); // Assign functions returned by the initializer

    const authModuleReturn = authModuleExports.initializeAuth(appServices); 
    Object.assign(appServices, authModuleReturn); // Assign functions returned by the initializer (if any)

    // Now, call the top-level initialization functions. They are now directly on `appServices`.
    appServices.initializeAppState(appServices);
    appServices.initializeMasterState(appServices);
    appServices.initializeProjectState(appServices);
    appServices.initializeSoundLibraryState(appServices);
    appServices.initializeTrackState(appServices);
    appServices.initializeWindowState(appServices);
    
    appServices.initializeAudioModule(appServices);
    appServices.initializePlayback(appServices);
    appServices.initializeRecording(appServices);
    appServices.initializeSampleManager(appServices);
    appServices.initializeUIModule(appServices);
    appServices.initializeMetronome(appServices);

    // Call the EXPORTED functions from eventHandlers.js which are now on appServices
    // These functions were previously called *inside* initializeEventHandlersModule
    // but are now called directly from main.js as part of the main setup flow.
    appServices.initializePrimaryEventListeners(); 
    appServices.attachGlobalControlEvents(); 
    appServices.setupMIDI(); 
    
    // Theme application and system preference listening
    const savedTheme = localStorage.getItem('snugos-theme');
    if (savedTheme) {
        appServices.setCurrentUserThemePreference(savedTheme); 
    } else {
        appServices.setCurrentUserThemePreference('system'); 
    }
    // Listen for system theme changes and re-apply "system" preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => appServices.setCurrentUserThemePreference('system')); 

    // Open default layout or restore saved window state
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

    // Tone.js context settings for latency
    appServices.context.lookAhead = 0.02; 
    appServices.context.updateInterval = 0.01; 
    console.log(`[Latency] lookAhead set to: ${appServices.context.lookAhead}`);
    console.log(`[Latency] updateInterval set to: ${appServices.context.updateInterval}`);
    
    // Start the main draw loop for UI updates (e.g., meters, playhead)
    function drawLoop() {
        if (typeof appServices.Tone !== 'undefined') {
            const transportTime = appServices.Tone.Transport.seconds;
            
            const mode = appServices.getPlaybackMode(); 
            appServices.updatePianoRollPlayhead(transportTime); 
            
            // Update master and track meters
            const masterMixerMeterBar = document.getElementById('mixerTrackMeterBar-master');
            appServices.updateMeters(document.getElementById('masterMeterBarGlobalTop'), masterMixerMeterBar, appServices.getTracks());
        }
        requestAnimationFrame(drawLoop); 
    }
    drawLoop(); 
}

// Ensure initializeSnugOS runs when the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', initializeSnugOS);