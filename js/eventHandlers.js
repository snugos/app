// js/eventHandlers.js - DIAGNOSTIC VERSION

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
    isTrackRecordingState,
    setRecordingTrackIdState as setRecordingTrackId,
    getRecordingTrackIdState as getRecordingTrackId,
    setRecordingStartTimeState as setRecordingStartTime,
    removeTrackFromStateInternal as coreRemoveTrackFromState,
    getPlaybackModeState,
    setPlaybackModeState,
    getMidiAccessState,
    setActiveMIDIInputState,
    getUndoStackState, 
    getRedoStackState  
} from './state.js';

let localAppServices = {};
const currentlyPressedKeys = new Set();

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
}

export function initializePrimaryEventListeners() {
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

    // --- Start of Corrected Code ---
    // This is a special test. We are only wiring up ONE button.
    uiCache.menuAddSynthTrack?.addEventListener('click', () => {
        console.log('[DIAGNOSTIC] "Add Synth Track" was clicked.');
        // Test if the notification service works.
        localAppServices.showNotification?.('Add Track button is working!', 3000);
        
        // All other logic is temporarily disabled for this test.
        // const newTrack = localAppServices.addTrack('Synth');
        // if (newTrack) { localAppServices.openTrackInspectorWindow?.(newTrack.id); }

        uiCache.startMenu.classList.add('hidden');
    });
    // --- End of Corrected Code ---
}

// All other functions are left empty for this test to ensure they don't interfere.
export function attachGlobalControlEvents(uiCache) {}
function updateUndoRedoButtons() {}
function toggleFullScreen() {}
export function setupMIDI() {}
function onMIDISuccess(midiAccess) {}
function onMIDIFailure(msg) {}
function populateMIDIInputSelector() {}
export function selectMIDIInput(event) {}
function onMIDIMessage(message) {}
export function handleTrackMute(trackId) {}
export function handleTrackSolo(trackId) {}
export function handleTrackArm(trackId) {}
export function handleRemoveTrack(trackId) {}
export function handleOpenTrackInspector(trackId) {}
export function handleOpenEffectsRack(trackId) {}
export function handleOpenPianoRoll(trackId) {}
export async function handleTimelineLaneDrop(event, targetTrackId, startTime) {}
export function handleOpenYouTubeImporter() {}
