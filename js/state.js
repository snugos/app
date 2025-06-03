// js/state.js - Application State Management
import * as Constants from './constants.js';
import { Track } from './Track.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
import {
    initAudioContextAndMasterMeter as audioInitAudioContextAndMasterMeter
} from './audio.js';

// --- Centralized State Variables ---
let tracks = [];
let trackIdCounter = 0;

let openWindowsMap = new Map();
let highestZ = 100;

let masterEffectsChainState = [];
let masterGainValueState = typeof Tone !== 'undefined' ? Tone.dbToGain(0) : 0.707;

let midiAccessGlobal = null;
let activeMIDIInputGlobal = null;

let loadedZipFilesGlobal = {};
let soundLibraryFileTreesGlobal = {};
let currentLibraryNameGlobal = null;
let currentSoundFileTreeGlobal = null;
let currentSoundBrowserPathGlobal = [];
let previewPlayerGlobal = null;

let clipboardDataGlobal = { type: null, data: null, sourceTrackType: null, sequenceLength: null };

let activeSequencerTrackId = null;
let soloedTrackId = null;
let armedTrackId = null;
let isRecordingGlobal = false;
let recordingTrackIdGlobal = null;
let recordingStartTime = 0;

let globalPlaybackMode = 'sequencer';
let selectedTimelineClipInfoGlobal = { trackId: null, clipId: null };

const THEME_STORAGE_KEY = 'snugosThemePreference';
let currentTheme = 'dark';

let undoStack = [];
let redoStack = [];

let appServices = {};

export function initializeStateModule(services) {
    appServices = services || {};
    if (!Array.isArray(masterEffectsChainState)) {
        masterEffectsChainState = [];
    }
    if (appServices && typeof appServices.getPlaybackMode !== 'function') {
        appServices.getPlaybackMode = getPlaybackModeState;
    }
    if (appServices && typeof appServices.setPlaybackMode !== 'function') {
        appServices.setPlaybackMode = setPlaybackModeStateInternal;
    }

    try {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        currentTheme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';
    } catch (e) {
        console.warn("[State Init] Could not read theme from localStorage, defaulting to dark.", e);
        currentTheme = 'dark';
    }
    applyThemeToDocument(currentTheme);
    // console.log("[State] State module initialized.");
}

// --- Getters for Centralized State ---
// ... (getters remain the same)
export function getTracksState() { return tracks; }
export function getTrackByIdState(id) { return tracks.find(t => t.id === id); }
export function getOpenWindowsState() { return openWindowsMap; }
export function getWindowByIdState(id) { return openWindowsMap.get(id); }
export function getHighestZState() { return highestZ; }
export function getMasterEffectsState() { return masterEffectsChainState; }
export function getMasterGainValueState() { return masterGainValueState; }
export function getMidiAccessState() { return midiAccessGlobal; }
export function getActiveMIDIInputState() { return activeMIDIInputGlobal; }
export function getLoadedZipFilesState() { return loadedZipFilesGlobal; }
export function getSoundLibraryFileTreesState() { return soundLibraryFileTreesGlobal; }
export function getCurrentLibraryNameState() { return currentLibraryNameGlobal; }
export function getCurrentSoundFileTreeState() { return currentSoundFileTreeGlobal; }
export function getCurrentSoundBrowserPathState() { return currentSoundBrowserPathGlobal; }
export function getPreviewPlayerState() { return previewPlayerGlobal; }
export function getClipboardDataState() { return clipboardDataGlobal; }
export function getArmedTrackIdState() { return armedTrackId; }
export function getSoloedTrackIdState() { return soloedTrackId; }
export function isTrackRecordingState() { return isRecordingGlobal; }
export function getRecordingTrackIdState() { return recordingTrackIdGlobal; }
export function getRecordingStartTimeState() { return recordingStartTime; }
export function getActiveSequencerTrackIdState() { return activeSequencerTrackId; }
export function getUndoStackState() { return undoStack; }
export function getRedoStackState() { return redoStack; }
export function getPlaybackModeState() { return globalPlaybackMode; }
export function getSelectedTimelineClipInfoState() { return selectedTimelineClipInfoGlobal; }
export function getCurrentThemeState() { return currentTheme; }


// --- Setters for Centralized State (called internally or via appServices) ---
// ... (setters remain the same)
export function addWindowToStoreState(id, instance) { openWindowsMap.set(id, instance); }
export function removeWindowFromStoreState(id) { openWindowsMap.delete(id); }
export function setHighestZState(value) { highestZ = Number.isFinite(value) ? value : 100; }
export function incrementHighestZState() { return ++highestZ; }
export function setMasterEffectsState(newChain) { masterEffectsChainState = Array.isArray(newChain) ? newChain : []; }
export function setMasterGainValueState(value) { masterGainValueState = Number.isFinite(value) ? value : (typeof Tone !== 'undefined' ? Tone.dbToGain(0) : 0.707); }
export function setMidiAccessState(access) { midiAccessGlobal = access; }
export function setActiveMIDIInputState(input) { activeMIDIInputGlobal = input; }
export function setLoadedZipFilesState(files) { loadedZipFilesGlobal = typeof files === 'object' && files !== null ? files : {}; }
export function setSoundLibraryFileTreesState(trees) { soundLibraryFileTreesGlobal = typeof trees === 'object' && trees !== null ? trees : {}; }
export function setCurrentLibraryNameState(name) { currentLibraryNameGlobal = name; }
export function setCurrentSoundFileTreeState(tree) { currentSoundFileTreeGlobal = tree; }
export function setCurrentSoundBrowserPathState(path) { currentSoundBrowserPathGlobal = Array.isArray(path) ? path : []; }
export function setPreviewPlayerState(player) { previewPlayerGlobal = player; }
export function setClipboardDataState(data) { clipboardDataGlobal = typeof data === 'object' && data !== null ? data : { type: null, data: null }; }
export function setArmedTrackIdState(id) { armedTrackId = id; }
export function setSoloedTrackIdState(id) { soloedTrackId = id; }
export function setIsRecordingState(status) { isRecordingGlobal = !!status; }
export function setRecordingTrackIdState(id) { recordingTrackIdGlobal = id; }
export function setRecordingStartTimeState(time) { recordingStartTime = Number.isFinite(time) ? time : 0; }
export function setActiveSequencerTrackIdState(id) { activeSequencerTrackId = id; }
export function setSelectedTimelineClipInfoState(trackId, clipId) {
    if (trackId === null && clipId === null) {
        selectedTimelineClipInfoGlobal = { trackId: null, clipId: null };
    } else {
        selectedTimelineClipInfoGlobal = { trackId, clipId };
    }
}

function applyThemeToDocument(themeToApply) {
    if (document && document.documentElement) {
        if (themeToApply === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.add('dark');
        }
    } else {
        console.warn("[State applyThemeToDocument] Document or documentElement not available.");
    }
}

export function setCurrentThemeState(theme) {
    const newTheme = (theme === 'light' || theme === 'dark') ? theme : 'dark';
    if (currentTheme !== newTheme) {
        const oldTheme = currentTheme;
        currentTheme = newTheme;
        try {
            localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
        } catch (e) {
            console.warn("[State] Could not save theme preference to localStorage:", e);
        }
        applyThemeToDocument(currentTheme);

        if (appServices.onThemeChanged && typeof appServices.onThemeChanged === 'function') {
            appServices.onThemeChanged(currentTheme, oldTheme);
        }
    } else {
        applyThemeToDocument(currentTheme);
    }
}

export function setPlaybackModeStateInternal(mode) {
    // ... (remains the same)
    const displayMode = typeof mode === 'string' ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Unknown';

    if (mode === 'sequencer' || mode === 'timeline') {
        if (globalPlaybackMode !== mode) {
            if (appServices.captureStateForUndo && typeof appServices.captureStateForUndo === 'function') {
                appServices.captureStateForUndo(`Set Playback Mode to ${displayMode}`);
            } else {
                captureStateForUndoInternal(`Set Playback Mode to ${displayMode}`);
            }
            globalPlaybackMode = mode;

            if (typeof Tone !== 'undefined' && Tone.Transport && Tone.Transport.state === 'started') {
                Tone.Transport.stop();
            }
            if (typeof Tone !== 'undefined' && Tone.Transport) {
                Tone.Transport.cancel(0);
            }

            if (appServices.uiElementsCache?.playBtnGlobal) {
                appServices.uiElementsCache.playBtnGlobal.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>`;
            }

            document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));

            const currentTracks = getTracksState();
            try {
                (currentTracks || []).forEach(track => {
                    if (track && track.type !== 'Audio' && typeof track.recreateToneSequence === 'function') {
                        track.recreateToneSequence(true);
                    }
                    if (globalPlaybackMode === 'sequencer' && track && track.type === 'Audio' && typeof track.stopPlayback === 'function') {
                        track.stopPlayback();
                    }
                });
            } catch (error) {
                console.error("[State setPlaybackModeStateInternal] Error during track sequence/playback re-initialization:", error);
                if(appServices.showNotification && typeof appServices.showNotification === 'function') appServices.showNotification("Error updating track playback for new mode.", 3000);
            }

            if (appServices.onPlaybackModeChange && typeof appServices.onPlaybackModeChange === 'function') {
                appServices.onPlaybackModeChange(globalPlaybackMode);
            }
             if (appServices.renderTimeline && typeof appServices.renderTimeline === 'function') {
                appServices.renderTimeline();
            }
        }
    } else {
        console.warn(`[State setPlaybackModeStateInternal] Invalid playback mode attempted: ${mode}. Expected 'sequencer' or 'timeline'.`);
    }
}
export { setPlaybackModeStateInternal as setPlaybackModeState };

export async function addTrackToStateInternal(type, initialData = null, isUserAction = true) {
    const isBrandNewUserTrack = isUserAction && (!initialData || initialData._isUserActionPlaceholder);
    // console.log(`[State addTrackToStateInternal] Adding ${type} track. User Action: ${isUserAction}, Brand New: ${isBrandNewUserTrack}`);

    if (isBrandNewUserTrack) {
        captureStateForUndoInternal(`Add ${type} Track`);
        if (initialData && initialData._isUserActionPlaceholder) initialData = null;
    }

    let newTrack;
    try {
        let newTrackId;
        if (initialData && initialData.id != null && Number.isFinite(initialData.id)) {
            newTrackId = initialData.id;
            if (newTrackId >= trackIdCounter) trackIdCounter = newTrackId + 1;
        } else {
            newTrackId = trackIdCounter++;
        }

        const trackAppServices = {
            getSoloedTrackId: getSoloedTrackIdState,
            captureStateForUndo: captureStateForUndoInternal,
            updateTrackUI: appServices.updateTrackUI,
            highlightPlayingStep: appServices.highlightPlayingStep,
            autoSliceSample: appServices.autoSliceSample,
            closeAllTrackWindows: appServices.closeAllTrackWindows,
            getMasterEffectsBusInputNode: appServices.getMasterEffectsBusInputNode,
            showNotification: appServices.showNotification,
            effectsRegistryAccess: appServices.effectsRegistryAccess,
            renderTimeline: appServices.renderTimeline,
            getPlaybackMode: getPlaybackModeState,
            getTrackById: getTrackByIdState,
            getTracks: getTracksState
        };

        newTrack = new Track(newTrackId, type, initialData, trackAppServices);
        tracks.push(newTrack);

        if (typeof newTrack.initializeAudioNodes === 'function') {
            await newTrack.initializeAudioNodes();
        } else {
            console.warn(`[State addTrackToStateInternal] Track type ${type} ID ${newTrackId} has no initializeAudioNodes method.`);
        }

        if (typeof newTrack.fullyInitializeAudioResources === 'function') {
            await newTrack.fullyInitializeAudioResources();
        } else {
             console.warn(`[State addTrackToStateInternal] Track type ${type} ID ${newTrackId} has no fullyInitializeAudioResources method.`);
        }

        // MODIFICATION: Call initializeDefaultSequence after other initializations
        if (typeof newTrack.initializeDefaultSequence === 'function') {
            newTrack.initializeDefaultSequence();
            console.log(`[State addTrackToStateInternal] Called initializeDefaultSequence for track ${newTrack.id}`);
        } else {
            console.warn(`[State addTrackToStateInternal] Track type ${type} ID ${newTrackId} has no initializeDefaultSequence method.`);
        }


        if (isBrandNewUserTrack && appServices.showNotification && typeof appServices.showNotification === 'function') {
            appServices.showNotification(`${newTrack.name} added successfully.`, 2000);
        }
        if (isBrandNewUserTrack && appServices.openTrackInspectorWindow && typeof appServices.openTrackInspectorWindow === 'function') {
            setTimeout(() => appServices.openTrackInspectorWindow(newTrack.id), 50);
        }

        if (appServices.updateMixerWindow && typeof appServices.updateMixerWindow === 'function') appServices.updateMixerWindow();
        if (appServices.renderTimeline && typeof appServices.renderTimeline === 'function') appServices.renderTimeline();

    } catch (error) {
        console.error(`[State addTrackToStateInternal] Error adding ${type} track:`, error);
        if (appServices.showNotification && typeof appServices.showNotification === 'function') {
            appServices.showNotification(`Failed to add ${type} track: ${error.message}`, 4000);
        }
        if (newTrack && tracks.includes(newTrack)) {
            tracks = tracks.filter(t => t.id !== newTrack.id);
        }
        return null;
    }
    return newTrack;
}

export function removeTrackFromStateInternal(trackId) {
    // ... (remains the same as your last provided version with enhanced logging and error handling)
    console.log(`[State removeTrackFromStateInternal] Initiating removal for track ID: ${trackId}`);
    const showUINotification = (appServices && typeof appServices.showNotification === 'function')
        ? appServices.showNotification
        : (typeof utilShowNotification !== 'undefined' ? utilShowNotification : console.warn); // Fallback

    try {
        const trackIndex = tracks.findIndex(t => t.id === trackId);
        if (trackIndex === -1) {
            console.warn(`[State removeTrackFromStateInternal] Track ID ${trackId} not found for removal.`);
            showUINotification(`Error: Track ${trackId} not found. Cannot remove.`, 3000);
            return;
        }

        const track = tracks[trackIndex];
        console.log(`[State removeTrackFromStateInternal] Track "${track.name}" found. Capturing undo state.`);
        captureStateForUndoInternal(`Remove Track "${track.name}"`);

        console.log(`[State removeTrackFromStateInternal] Disposing track "${track.name}"...`);
        try {
            if (track && typeof track.dispose === 'function') {
                track.dispose();
                console.log(`[State removeTrackFromStateInternal] Track "${track.name}" disposed.`);
            } else {
                console.warn(`[State removeTrackFromStateInternal] Track "${track.name}" (ID: ${trackId}) has no dispose method or track object is invalid.`);
            }
        } catch (disposeError) {
            console.error(`[State removeTrackFromStateInternal] Error during track.dispose() for "${track.name}" (ID: ${trackId}):`, disposeError);
            showUINotification(`Error disposing track "${track.name}". Some resources may not be freed. Check console.`, 4000);
        }

        tracks.splice(trackIndex, 1);
        console.log(`[State removeTrackFromStateInternal] Track "${track.name}" removed from tracks array. Current track count: ${tracks.length}`);

        if (armedTrackId === trackId) { setArmedTrackIdState(null); console.log(`[State removeTrackFromStateInternal] Disarmed track ${trackId}.`); }
        if (soloedTrackId === trackId) {
            setSoloedTrackIdState(null);
            console.log(`[State removeTrackFromStateInternal] Unsoloed track ${trackId}. Updating other tracks.`);
            (getTracksState() || []).forEach(t => {
                if (t) {
                    t.isSoloed = false;
                    if (typeof t.applySoloState === 'function') t.applySoloState();
                    if (appServices.updateTrackUI && typeof appServices.updateTrackUI === 'function') appServices.updateTrackUI(t.id, 'soloChanged');
                }
            });
        }
        if (activeSequencerTrackId === trackId) { setActiveSequencerTrackIdState(null); console.log(`[State removeTrackFromStateInternal] Cleared active sequencer for track ${trackId}.`);}
        if (selectedTimelineClipInfoGlobal.trackId === trackId) {
            setSelectedTimelineClipInfoState(null, null);
            console.log(`[State removeTrackFromStateInternal] Cleared timeline selection for track ${trackId}.`);
        }

        showUINotification(`Track "${track.name}" removed.`, 2000);

        if (appServices.updateMixerWindow && typeof appServices.updateMixerWindow === 'function') {
            appServices.updateMixerWindow();
        } else { console.warn("[State removeTrackFromStateInternal] appServices.updateMixerWindow is not available."); }

        updateInternalUndoRedoState();

        if (appServices.renderTimeline && typeof appServices.renderTimeline === 'function') {
            appServices.renderTimeline();
        } else { console.warn("[State removeTrackFromStateInternal] appServices.renderTimeline is not available."); }
        console.log(`[State removeTrackFromStateInternal] Track removal process completed for "${track.name}".`);

    } catch (error) {
        console.error(`[State removeTrackFromStateInternal] General error during track ${trackId} removal:`, error);
        showUINotification(`Error removing track: ${error.message || 'Unknown error.'}. Please check console.`, 4000);
    }
}

// ... (Master Effects, Undo/Redo, Project Data Handling methods remain the same as your last provided version)
export function addMasterEffectToState(effectType, initialParams) {
    const effectId = `mastereffect_${effectType}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
    const getDefaults = appServices.effectsRegistryAccess?.getEffectDefaultParams || getEffectDefaultParamsFromRegistry;
    const defaultParams = getDefaults ? getDefaults(effectType) : {};

    masterEffectsChainState.push({
        id: effectId,
        type: effectType,
        params: initialParams || defaultParams
    });
    return effectId;
}
export function removeMasterEffectFromState(effectId) {
    const effectIndex = masterEffectsChainState.findIndex(e => e.id === effectId);
    if (effectIndex > -1) {
        masterEffectsChainState.splice(effectIndex, 1);
    }
}
export function updateMasterEffectParamInState(effectId, paramPath, value) {
    const effectWrapper = masterEffectsChainState.find(e => e.id === effectId);
    if (!effectWrapper || !effectWrapper.params) {
        console.warn(`[State updateMasterEffectParamInState] Effect wrapper or params not found for ID: ${effectId}`);
        return;
    }
    try {
