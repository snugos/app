// js/eventHandlers.js - Global Event Listeners and Input Handling Module
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog, createContextMenu } from './utils.js';
import {
    getTracksState as getTracks,
    getTrackByIdState as getTrackById,
    captureStateForUndoInternal as captureStateForUndo,
    setSoloedTrackIdState as setSoloedTrackId,
    getSoloedTrackIdState as getSoloedTrackId,
    setArmedTrackIdState as setArmedTrackId,
    getArmedTrackIdState as getArmedTrackId,
    setActiveSequencerTrackIdState as setActiveSequencerTrackId,
    setIsRecordingState as setIsRecording,
    isTrackRecordingState as isTrackRecording,
    setRecordingTrackIdState as setRecordingTrackId,
    getRecordingTrackIdState as getRecordingTrackId,
    setRecordingStartTimeState as setRecordingStartTime,
    removeTrackFromStateInternal as coreRemoveTrackFromState,
    getPlaybackModeState,
    setPlaybackModeState,
    getMidiAccessState,
    getActiveMIDIInputState,
    getUndoStackState, 
    getRedoStackState  
} from './state.js';

let localAppServices = {};
let transportKeepAliveBufferSource = null;
let silentKeepAliveBuffer = null;

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    if (!localAppServices.setPlaybackMode && setPlaybackModeState) {
        localAppServices.setPlaybackMode = setPlaybackModeState;
    }
    if (!localAppServices.getPlaybackMode && getPlaybackModeState) {
        localAppServices.getPlaybackMode = getPlaybackModeState;
    }
     if (!localAppServices.getTracks && getTracks) {
        localAppServices.getTracks = getTracks;
    }
    if (!localAppServices.getTrackById && getTrackById) {
        localAppServices.getTrackById = getTrackById;
    }
     if (!localAppServices.captureStateForUndo && captureStateForUndo) {
        localAppServices.captureStateForUndo = captureStateForUndo;
    }
}

export function initializePrimaryEventListeners() {
    console.log("[EventHandlers initializePrimaryEventListeners] Initializing. uiCache keys:", Object.keys(localAppServices.uiElementsCache || {}));

    const uiCache = localAppServices.uiElementsCache || {};

    uiCache.startButton?.addEventListener('click', () => {
        uiCache.startMenu?.classList.toggle('hidden');
        if (!uiCache.startMenu?.classList.contains('hidden')) {
            updateUndoRedoButtons();
        }
    });

    document.addEventListener('click', (e) => {
        if (uiCache.startMenu && !uiCache.startMenu.classList.contains('hidden')) {
            if (!uiCache.startMenu.contains(e.target) && e.target !== uiCache.startButton) {
                uiCache.startMenu.classList.add('hidden');
            }
        }
    });

    // Start Menu Actions
    uiCache.menuAddSynthTrack?.addEventListener('click', () => {
        if(localAppServices.initAudioContextAndMasterMeter) localAppServices.initAudioContextAndMasterMeter();
        const newTrack = localAppServices.addTrack('Synth');
        if (newTrack && localAppServices.openTrackInspectorWindow) { localAppServices.openTrackInspectorWindow(newTrack.id); }
        uiCache.startMenu.classList.add('hidden');
    });
    uiCache.menuAddSamplerTrack?.addEventListener('click', () => {
        if(localAppServices.initAudioContextAndMasterMeter) localAppServices.initAudioContextAndMasterMeter();
        const newTrack = localAppServices.addTrack('Sampler');
        if (newTrack && localAppServices.openTrackInspectorWindow) { localAppServices.openTrackInspectorWindow(newTrack.id); }
        uiCache.startMenu.classList.add('hidden');
    });
    uiCache.menuAddDrumSamplerTrack?.addEventListener('click', () => {
        if(localAppServices.initAudioContextAndMasterMeter) localAppServices.initAudioContextAndMasterMeter();
        const newTrack = localAppServices.addTrack('DrumSampler');
        if (newTrack && localAppServices.openTrackInspectorWindow) { localAppServices.openTrackInspectorWindow(newTrack.id); }
        uiCache.startMenu.classList.add('hidden');
    });
    uiCache.menuAddInstrumentSamplerTrack?.addEventListener('click', () => {
        if(localAppServices.initAudioContextAndMasterMeter) localAppServices.initAudioContextAndMasterMeter();
        const newTrack = localAppServices.addTrack('InstrumentSampler');
        if (newTrack && localAppServices.openTrackInspectorWindow) { localAppServices.openTrackInspectorWindow(newTrack.id); }
        uiCache.startMenu.classList.add('hidden');
    });
     uiCache.menuAddAudioTrack?.addEventListener('click', () => {
        if(localAppServices.initAudioContextAndMasterMeter) localAppServices.initAudioContextAndMasterMeter();
        const newTrack = localAppServices.addTrack('Audio');
        if (newTrack && localAppServices.openTrackInspectorWindow) { localAppServices.openTrackInspectorWindow(newTrack.id); }
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuOpenSoundBrowser?.addEventListener('click', () => {
        if (localAppServices.openSoundBrowserWindow) localAppServices.openSoundBrowserWindow();
        uiCache.startMenu.classList.add('hidden');
    });
    // ADDED: YouTube Importer listener
    const menuOpenYouTubeImporter = document.getElementById('menuOpenYouTubeImporter');
    menuOpenYouTubeImporter?.addEventListener('click', () => {
        handleOpenYouTubeImporter(); // Call the new handler
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuOpenTimeline?.addEventListener('click', () => {
        if (localAppServices.openTimelineWindow) localAppServices.openTimelineWindow();
        uiCache.startMenu.classList.add('hidden');
    });
    
    // Corrected for Piano Roll - Get element by its new ID
    const menuOpenPianoRollItem = document.getElementById('menuOpenPianoRoll');
    menuOpenPianoRollItem?.addEventListener('click', () => {
        const currentTracks = getTracks(); 
        const firstInstrumentTrack = currentTracks.find(t => t.type !== 'Audio' && t.type !== 'Master'); 
        if (firstInstrumentTrack) {
            handleOpenPianoRoll(firstInstrumentTrack.id); // Use the exported handler
        } else {
            showNotification("Add an instrument track first to open Piano Roll.", 2000);
        }
        if (uiCache.startMenu) uiCache.startMenu.classList.add('hidden');
    });


    uiCache.menuOpenMixer?.addEventListener('click', () => {
        if (localAppServices.openMixerWindow) localAppServices.openMixerWindow();
        uiCache.startMenu.classList.add('hidden');
    });
    uiCache.menuOpenMasterEffects?.addEventListener('click', () => {
        if (localAppServices.openMasterEffectsRackWindow) localAppServices.openMasterEffectsRackWindow();
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuUndo?.addEventListener('click', () => {
        if (localAppServices.undoLastAction) localAppServices.undoLastAction();
        updateUndoRedoButtons(); 
        uiCache.startMenu.classList.add('hidden');
    });
    uiCache.menuRedo?.addEventListener('click', () => {
        if (localAppServices.redoLastAction) localAppServices.redoLastAction();
        updateUndoRedoButtons();
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuSaveProject?.addEventListener('click', () => {
        if (localAppServices.saveProject) localAppServices.saveProject();
        uiCache.startMenu.classList.add('hidden');
    });
    uiCache.menuLoadProject?.addEventListener('click', () => {
        uiCache.loadProjectInput?.click();
        uiCache.startMenu.classList.add('hidden');
    });
     uiCache.menuExportWav?.addEventListener('click', () => {
        if (localAppServices.exportToWav) localAppServices.exportToWav();
        uiCache.startMenu.classList.add('hidden');
    });
     uiCache.menuToggleFullScreen?.addEventListener('click', () => {
        toggleFullScreen();
        uiCache.startMenu.classList.add('hidden');
    });

    if (uiCache.loadProjectInput && localAppServices.handleProjectFileLoad) {
        uiCache.loadProjectInput.addEventListener('change', localAppServices.handleProjectFileLoad);
    }
}

// ... (attachGlobalControlEvents and other functions remain the same)
export function attachGlobalControlEvents(uiCache) { /* ... (implementation unchanged) ... */ }
function calculateScheduleEndTime(tracks, currentPlayheadPosition) { /* ... (implementation unchanged) ... */ }
function updateUndoRedoButtons() { /* ... (implementation unchanged) ... */ }
function audioContextInitialized() { /* ... (implementation unchanged) ... */ }
function toggleFullScreen() { /* ... (implementation unchanged) ... */ }

// --- MIDI Handling ---
export function setupMIDI() { /* ... (implementation unchanged) ... */ }
function onMIDISuccess(midiAccess) { /* ... (implementation unchanged) ... */ }
function onMIDIFailure(msg) { /* ... (implementation unchanged) ... */ }
function populateMIDIInputSelector() { /* ... (implementation unchanged) ... */ }
export function selectMIDIInput(event) { /* ... (implementation unchanged) ... */ }
function onMIDIMessage(message) { /* ... (implementation unchanged) ... */ }

// --- Track Context Menu and Actions ---
export function handleTrackMute(trackId) { /* ... (implementation unchanged) ... */ }
export function handleTrackSolo(trackId) { /* ... (implementation unchanged) ... */ }
export function handleTrackArm(trackId) { /* ... (implementation unchanged) ... */ }
export function handleRemoveTrack(trackId) { /* ... (implementation unchanged) ... */ }
export function handleOpenTrackInspector(trackId) { /* ... (implementation unchanged) ... */ }
export function handleOpenEffectsRack(trackId) { /* ... (implementation unchanged) ... */ }

export function handleOpenPianoRoll(trackId) {
    if (localAppServices.openPianoRollWindow) { // Call the new function name in appServices
        localAppServices.openPianoRollWindow(trackId);
    } else {
        console.error("openPianoRollWindow service not available in appServices.");
        if (localAppServices.showNotification) {
            localAppServices.showNotification("Piano Roll UI is currently unavailable.", 3000);
        }
    }
}


// --- Timeline Lane Drop Handling ---
export async function handleTimelineLaneDrop(event, targetTrackId, startTime, services = localAppServices) { /* ... (implementation unchanged) ... */ }

// ADDED: New handler for YouTube Importer
export function handleOpenYouTubeImporter() {
    if (localAppServices.openYouTubeImporterWindow) {
        localAppServices.openYouTubeImporterWindow();
    } else {
        console.error("openYouTubeImporterWindow service not available.");
        if (localAppServices.showNotification) {
            localAppServices.showNotification("YouTube Importer UI is currently unavailable.", 3000);
        }
    }
}
