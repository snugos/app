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
    getSelectedTimelineClipInfoState, // Import getter for selected clip
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
}
export function initializePrimaryEventListeners() {
    console.log('[EventHandlers] Initializing primary event listeners...');
    document.getElementById('startMenuButton').addEventListener('click', toggleStartMenu);
    document.getElementById('playBtn').addEventListener('click', () => localAppServices.togglePlayback ? localAppServices.togglePlayback() : console.warn("togglePlayback not available"));
    document.getElementById('stopBtn').addEventListener('click', () => localAppServices.stopPlayback ? localAppServices.stopPlayback() : console.warn("stopPlayback not available"));
    document.getElementById('recordBtn').addEventListener('click', () => localAppServices.toggleRecording ? localAppServices.toggleRecording() : console.warn("toggleRecording not available"));
    document.getElementById('menuUndo').addEventListener('click', () => localAppServices.undo ? localAppServices.undo() : console.warn("undo not available"));
    document.getElementById('menuRedo').addEventListener('click', () => localAppServices.redo ? localAppServices.redo() : console.warn("redo not available"));
    document.getElementById('menuSaveProject').addEventListener('click', () => localAppServices.saveProject ? localAppServices.saveProject() : console.warn("saveProject not available"));
    document.getElementById('menuLoadProject').addEventListener('click', () => localAppServices.loadProject ? localAppServices.loadProject() : console.warn("loadProject not available"));
    document.getElementById('menuExportWav').addEventListener('click', () => localAppServices.exportToWav ? localAppServices.exportToWav() : console.warn("exportToWav not available"));
    document.getElementById('menuToggleFullScreen').addEventListener('click', toggleFullScreen);
    document.getElementById('menuNewProject').addEventListener('click', () => localAppServices.newProject ? localAppServices.newProject() : console.warn("newProject not available"));

    window.addEventListener('keydown', handleGlobalKeyDown);
    console.log('[EventHandlers] Primary event listeners initialized.');
}
function toggleStartMenu() {
    const startMenu = document.getElementById('startMenu');
    if (startMenu) {
        const isHidden = startMenu.classList.contains('hidden');
        if (isHidden) {
            startMenu.classList.remove('hidden');
            setTimeout(() => { // Add listener after menu is shown to prevent immediate self-closing
                document.addEventListener('click', closeStartMenuOnClickOutside, { once: true });
            }, 0);
        } else {
            startMenu.classList.add('hidden');
            document.removeEventListener('click', closeStartMenuOnClickOutside);
        }
    }
}
function closeStartMenuOnClickOutside(event) {
    const startMenu = document.getElementById('startMenu');
    const startButton = document.getElementById('startMenuButton');
    if (startMenu && !startMenu.contains(event.target) && !startButton.contains(event.target)) {
        startMenu.classList.add('hidden');
    } else {
        // If the menu is still open, re-attach the listener
        document.addEventListener('click', closeStartMenuOnClickOutside, { once: true });
    }
}

function handleGlobalKeyDown(e) {
    // Basic Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
            if (localAppServices.redo) localAppServices.redo();
        } else {
            if (localAppServices.undo) localAppServices.undo();
        }
        return;
    }
     if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (localAppServices.newProject) localAppServices.newProject();
        return;
    }

    // Play/Stop with spacebar, but not if a text input is focused
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
        if (localAppServices.togglePlayback) localAppServices.togglePlayback();
        return;
    }
    
    // Delete selected clip
    if (e.key === 'Delete' || e.key === 'Backspace') {
         if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return; // Don't delete clips while typing
        e.preventDefault();
        
        const selectedClipInfo = getSelectedTimelineClipInfoState();
        if (selectedClipInfo && selectedClipInfo.clipId) {
             const track = getTrackById(selectedClipInfo.trackId);
             if (track) {
                 showConfirmationDialog('Are you sure you want to delete this clip?', () => {
                     track.removeClip(selectedClipInfo.clipId);
                     if (localAppServices.updateArrangementView) localAppServices.updateArrangementView();
                     if (localAppServices.setSelectedTimelineClip) localAppServices.setSelectedTimelineClip(null, null); // Deselect
                 });
             }
        }
    }


    // Synth note playing with computer keyboard
    if (localAppServices.getArmedTrackId && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        const armedTrackId = getArmedTrackId();
        if (armedTrackId) {
            const track = getTrackById(armedTrackId);
            if (track && track.type === 'Synth' && track.playNote && Constants.computerKeySynthMap[e.key]) {
                e.preventDefault();
                // To prevent re-triggering on key hold, we can check e.repeat
                if (!e.repeat) {
                    track.playNote(Constants.computerKeySynthMap[e.key], '8n');
                }
            }
        }
    }
}
export function setupMIDI(onMIDISuccess, onMIDIFailure) { /* ... same as previous ... */ }
export function selectMIDIInput(deviceId) { /* ... same as previous ... */ }
function onMIDIMessage(event) { /* ... same as previous ... */ }
export function attachGlobalControlEvents(uiElements) { /* ... same as previous ... */ }
export function handleTrackMute(trackId) { /* ... same as previous ... */ }
export function handleTrackSolo(trackId) { /* ... same as previous ... */ }
export function handleTrackArm(trackId) { /* ... same as previous ... */ }
export function handleRemoveTrack(trackId) { /* ... same as previous ... */ }
export function handleOpenTrackInspector(trackId) {
    console.log(`[EventHandlers handleOpenTrackInspector] Called for trackId: ${trackId}`); // LOG ADDED
    if (localAppServices.openTrackInspectorWindow && typeof localAppServices.openTrackInspectorWindow === 'function') {
        localAppServices.openTrackInspectorWindow(trackId);
    } else { console.error("[EventHandlers] openTrackInspectorWindow service not available or not a function."); }
}
export function handleOpenEffectsRack(trackId) {
    console.log(`[EventHandlers handleOpenEffectsRack] Called for trackId: ${trackId}`); // LOG ADDED
    if (localAppServices.openTrackEffectsRackWindow && typeof localAppServices.openTrackEffectsRackWindow === 'function') {
        localAppServices.openTrackEffectsRackWindow(trackId);
    } else { console.error("[EventHandlers] openTrackEffectsRackWindow service not available or not a function."); }
}
export function handleOpenSequencer(trackId) {
    console.log(`[EventHandlers handleOpenSequencer] Called for trackId: ${trackId}`); // LOG ADDED
    if (localAppServices.openSequencerWindow && typeof localAppServices.openSequencerWindow === 'function') {
        localAppServices.openSequencerWindow(trackId);
    } else { console.error("[EventHandlers] openSequencerWindow service not available or not a function."); }
}

function toggleFullScreen() { /* ... same as response #30 ... */ }
export async function processTimelineDrop(droppedItemData, targetTrackId, startTime, appServicesPassed) { /* ... same as response #30 ... */ }
export { processTimelineDrop as handleTimelineLaneDrop };
