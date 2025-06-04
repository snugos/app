// js/state.js - Application State Management (MODIFIED - Ensured appServices reference)
import * as Constants from './constants.js';
import { Track } from './Track.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
// NOTE: Explicitly importing AudioModule here is not ideal if trying to keep modules decoupled.
// It's better if _rechainMasterEffectsAudio is called via appServices if possible.
// However, for toggleBypassMasterEffect, if it needs immediate rechaining and is called
// from a context where appServices isn't fully settled (less likely now), this direct call was a workaround.
// With appServices._rechainMasterEffectsAudio = AudioModule._rechainMasterEffectsAudio in main.js,
// calls via appServicesInstance._rechainMasterEffectsAudio are preferred.
import * as AudioModule from './audio.js';


// --- Centralized State Variables ---
let tracks = [];
let trackIdCounter = 0;

let openWindowsMap = new Map();
let highestZ = 100;

let masterEffectsChainState = [];
let masterGainValueState = (typeof Tone !== 'undefined' && Tone.dbToGain) ? Tone.dbToGain(0) : 0.707; // Default to 0dB

let midiAccessGlobal = null;
let activeMIDIInputGlobal = null; // Stores the ID of the active MIDI input or 'computerKeyboard' or 'none'

let loadedZipFilesGlobal = {}; // Stores JSZip instances, or "loading"/"error" states
let soundLibraryFileTreesGlobal = {}; // Stores parsed file trees for each library
let currentLibraryNameGlobal = null;
// currentSoundFileTreeGlobal is derived: soundLibraryFileTreesGlobal[currentLibraryNameGlobal]
let currentSoundBrowserPathGlobal = []; // Array of folder names representing current path
let previewPlayerGlobal = null; // Stores the Tone.Player instance for previews
let selectedSoundForPreviewState = null; // Stores data of the sound selected for preview

let clipboardDataGlobal = { type: null, data: null, sourceTrackType: null, sequenceLength: null };

let activeSequencerTrackId = null; // Track ID whose sequencer is currently active/focused
let soloedTrackId = null; // Track ID that is currently soloed, null if none
let armedTrackId = null; // Track ID that is currently armed for recording, null if none
let isRecordingGlobal = false; // Global recording state (MIDI or Audio)
let recordingTrackIdGlobal = null; // Specifically for audio recording, which track is being recorded to
let recordingStartTime = 0; // Tone.Transport.seconds when audio recording started

let globalPlaybackMode = 'sequencer'; // 'sequencer' or 'timeline'
let selectedTimelineClipInfoGlobal = { trackId: null, clipId: null };

const THEME_STORAGE_KEY = 'snugosThemePreference_v1';
let currentTheme = 'dark'; // Default, will be overridden by localStorage if present

let undoStack = [];
let redoStack = [];

// This will be the single appServices instance from main.js
let appServicesInstance = {};

// --- Initialization ---
export function initializeStateModule(services) {
    appServicesInstance = services; // Use the direct reference

    try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            currentTheme = savedTheme;
        }
    } catch (e) {
        console.warn("[State] Could not read theme from localStorage:", e.message);
    }
    // Actual theme application is handled by UI module using appServices.updateTheme
    // console.log("[State] Module initialized. Current theme:", currentTheme);
}

// --- Getters ---
export const getTracksState = () => tracks;
export const getTrackByIdState = (id) => tracks.find(t => t.id.toString() === id.toString());
export const getOpenWindowsState = () => openWindowsMap;
export const getWindowByIdState = (id) => openWindowsMap.get(id);
export const getHighestZState = () => highestZ;
export const getMasterEffectsState = () => masterEffectsChainState;
export const getMasterGainValueState = () => masterGainValueState;
export const getMidiAccessState = () => midiAccessGlobal;
export const getActiveMIDIInputState = () => activeMIDIInputGlobal;
export const getLoadedZipFilesState = () => loadedZipFilesGlobal;
export const getSoundLibraryFileTreesState = () => soundLibraryFileTreesGlobal;
export const getCurrentLibraryNameState = () => currentLibraryNameGlobal;
export const getCurrentSoundFileTreeState = () => soundLibraryFileTreesGlobal[currentLibraryNameGlobal] || null;
export const getCurrentSoundBrowserPathState = () => currentSoundBrowserPathGlobal;
export const getPreviewPlayerState = () => previewPlayerGlobal;
export const getSelectedSoundForPreviewState = () => selectedSoundForPreviewState; // Getter for main.js
export const getClipboardDataState = () => clipboardDataGlobal;
export const getActiveSequencerTrackIdState = () => activeSequencerTrackId;
export const getSoloedTrackIdState = () => soloedTrackId;
export const getArmedTrackIdState = () => armedTrackId;
export const isTrackRecordingState = (trackId) => isRecordingGlobal && recordingTrackIdGlobal === trackId; // Specifically for audio clip recording
export const isGlobalRecordingActiveState = () => isRecordingGlobal; // General recording state
export const getRecordingTrackIdState = () => recordingTrackIdGlobal;
export const getRecordingStartTimeState = () => recordingStartTime;
export const getPlaybackModeState = () => globalPlaybackMode;
export const getSelectedTimelineClipInfoState = () => selectedTimelineClipInfoGlobal;
export const getCurrentThemeState = () => currentTheme;
export const getUndoStackState = () => undoStack;
export const getRedoStackState = () => redoStack;
export const getMasterEffectParamValue = (effectId, paramPath) => { // New getter
    const effect = masterEffectsChainState.find(e => e.id === effectId);
    if (effect && effect.params) {
        let value = effect.params;
        const keys = paramPath.split('.');
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined; // Path not found
            }
        }
        return value;
    }
    return undefined;
};


// --- Setters / Core Actions ---
export function addWindowToStoreState(id, windowInstance) {
    openWindowsMap.set(id, windowInstance);
}
export function removeWindowFromStoreState(id) {
    openWindowsMap.delete(id);
}
export function incrementHighestZState() {
    highestZ++;
    return highestZ;
}
export function setHighestZState(val) {
    if (val > highestZ) highestZ = val;
}

export function setMasterGainValueState(value) {
    masterGainValueState = value;
    // Audio actual update is handled by appServices.setMasterVolume in main.js which calls AudioModule.setMasterVolume
    if (appServicesInstance.setMasterVolume) { // Ensure service exists
        appServicesInstance.setMasterVolume(value);
    }
}

export function setMidiAccessState(midi) { midiAccessGlobal = midi; }
export function setActiveMIDIInputState(deviceId) {
    activeMIDIInputGlobal = deviceId;
    // UI update for indicator can be handled by main.js observing this state change or directly if a UI service exists.
}
export function setLoadedZipFilesState(zipFiles) { loadedZipFilesGlobal = zipFiles; }
export function setSoundLibraryFileTreesState(trees) { soundLibraryFileTreesGlobal = trees; }
export function setCurrentLibraryNameState(name) {
    currentLibraryNameGlobal = name;
    currentSoundBrowserPathGlobal = []; // Reset path when library changes
    if (appServicesInstance.updateSoundBrowserDisplayForLibrary) {
        appServicesInstance.updateSoundBrowserDisplayForLibrary(name); // Pass name to ensure it updates for that lib
    }
}
export function setCurrentSoundBrowserPathState(pathArray) { currentSoundBrowserPathGlobal = pathArray; }
export function pushToSoundBrowserPath(folderName) {
    currentSoundBrowserPathGlobal.push(folderName);
    if (appServicesInstance.updateSoundBrowserDisplayForLibrary) appServicesInstance.updateSoundBrowserDisplayForLibrary();
}
export function popFromSoundBrowserPath() {
    currentSoundBrowserPathGlobal.pop();
    if (appServicesInstance.updateSoundBrowserDisplayForLibrary) appServicesInstance.updateSoundBrowserDisplayForLibrary();
}
export function setPreviewPlayerState(player) { previewPlayerGlobal = player; }
export function setSelectedSoundForPreviewState(data) { selectedSoundForPreviewState = data; } // Setter for main.js
export function setClipboardDataState(data) { clipboardDataGlobal = data; }

export function setActiveSequencerTrackIdState(trackId) {
    activeSequencerTrackId = trackId;
    // UI update (e.g., highlighting in sequencer window) would be triggered from here or by observation
}
export function setSoloedTrackIdState(trackId) {
    const previouslySoloed = soloedTrackId;
    soloedTrackId = (soloedTrackId === trackId) ? null : trackId;

    tracks.forEach(t => {
        const isNowThisTrackSoloed = (t.id.toString() === (soloedTrackId || "").toString());
        // Update if this track's solo state changed OR if it was the previously soloed track and now isn't
        if (t.isSoloed !== isNowThisTrackSoloed || (previouslySoloed && t.id.toString() === previouslySoloed.toString() && !isNowThisTrackSoloed)) {
            t.isSoloed = isNowThisTrackSoloed;
            if (typeof t.updateSoloState === 'function') t.updateSoloState(soloedTrackId);
            if (appServicesInstance.updateTrackUI) appServicesInstance.updateTrackUI(t.id, 'muteSoloChange');
        }
    });
    if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
}
export function setArmedTrackIdState(trackId) {
    const previouslyArmed = armedTrackId;
    armedTrackId = (armedTrackId === trackId) ? null : trackId;

    if (previouslyArmed !== null && previouslyArmed !== armedTrackId) {
        const prevTrack = getTrackByIdState(previouslyArmed);
        if (prevTrack) {
            prevTrack.isArmedForRec = false;
            if (appServicesInstance.updateTrackUI) appServicesInstance.updateTrackUI(prevTrack.id, 'armChange');
        }
    }
    if (armedTrackId !== null) {
        const currentTrack = getTrackByIdState(armedTrackId);
        if (currentTrack) {
            currentTrack.isArmedForRec = true;
            if (appServicesInstance.updateTrackUI) appServicesInstance.updateTrackUI(currentTrack.id, 'armChange');
        }
    }
     if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
     if (appServicesInstance.updateRecordButtonUI) appServicesInstance.updateRecordButtonUI(isRecordingGlobal, !!armedTrackId);
}

export function setIsRecordingState(isRec) {
    isRecordingGlobal = isRec;
    if (!isRec && recordingTrackIdGlobal) { // If stopping global recording, and it was an audio recording
        // Actual audio stop (saving file etc.) is handled by AudioModule via appServices.stopAudioRecording
        // This state setter just updates the global flag and UI.
        recordingTrackIdGlobal = null; // Clear the specific audio recording track ID
    }
    if (appServicesInstance.updateRecordButtonUI) appServicesInstance.updateRecordButtonUI(isRecordingGlobal, !!armedTrackId);
}
export function setRecordingTrackIdState(trackId) { recordingTrackIdGlobal = trackId; }
export function setRecordingStartTimeState(time) { recordingStartTime = time; }

export function setPlaybackModeState(mode) {
    if (globalPlaybackMode !== mode && (mode === 'sequencer' || mode === 'timeline')) {
        globalPlaybackMode = mode;
        if (appServicesInstance.onPlaybackModeChange) {
            appServicesInstance.onPlaybackModeChange(mode);
        }
        if (typeof Tone !== 'undefined' && Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) {
            if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Playback mode changed to "${mode}". Transport stopped.`, "info", 2000);
            appServicesInstance.stopPlayback(); // Stop playback when mode changes
        }
    }
}
export function setSelectedTimelineClipInfoState(trackId, clipId) {
    selectedTimelineClipInfoGlobal = { trackId, clipId };
    if(appServicesInstance.renderTimeline) appServicesInstance.renderTimeline(); // Re-render to show selection
}
export function setCurrentThemeState(theme) {
    if (currentTheme !== theme && (theme === 'light' || theme === 'dark')) {
        currentTheme = theme;
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch(e) {
            console.warn("[State] Could not save theme to localStorage:", e.message);
            if (appServicesInstance.showNotification) appServicesInstance.showNotification("Could not save theme preference.", "warning");
        }
        // The actual DOM class manipulation should be handled by a UI service that observes this state or is called from here.
        if (appServicesInstance.updateTheme) appServicesInstance.updateTheme(theme);
        else document.documentElement.className = theme; // Fallback
    }
}

// --- Track Management ---
export function addTrackToStateInternal(type, initialData = null, captureUndo = true, servicesPassedToTrack) {
    if (!servicesPassedToTrack || !servicesPassedToTrack.getTrackById) {
        console.error("[State addTrackToStateInternal] appServices for Track constructor not properly provided!");
        if(appServicesInstance.showNotification) appServicesInstance.showNotification("Error creating track: internal services missing.", "error");
        return null;
    }
    trackIdCounter++;
    const newTrackId = initialData?.id ? initialData.id : trackIdCounter; // Use existing ID if provided (e.g. project load)
    if (initialData?.id && initialData.id > trackIdCounter) trackIdCounter = initialData.id; // Ensure counter is up-to-date

    const newTrack = new Track(newTrackId, type, initialData, servicesPassedToTrack);
    tracks.push(newTrack);

    if (captureUndo && appServicesInstance.captureStateForUndoInternal && !appServicesInstance.getIsReconstructingDAW()) {
        appServicesInstance.captureStateForUndoInternal(`Add Track: ${newTrack.name}`);
    }
    if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
    if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
    return newTrack;
}

export function removeTrackFromStateInternal(trackId, captureUndo = true) {
    const trackIndex = tracks.findIndex(t => t.id.toString() === trackId.toString());
    if (trackIndex > -1) {
        const trackToRemove = tracks[trackIndex];
        if (captureUndo && appServicesInstance.captureStateForUndoInternal && !appServicesInstance.getIsReconstructingDAW()) {
            appServicesInstance.captureStateForUndoInternal(`Remove Track: ${trackToRemove.name}`);
        }

        // Critical: Ensure track resources are released
        if (typeof trackToRemove.dispose === 'function') {
            trackToRemove.dispose();
        }
        tracks.splice(trackIndex, 1);

        // Reset states if the removed track was active in them
        if (soloedTrackId === trackId) setSoloedTrackIdState(null); // This will update other tracks
        if (armedTrackId === trackId) setArmedTrackIdState(null); // This will update UI
        if (activeSequencerTrackId === trackId) setActiveSequencerTrackIdState(null);
        if (recordingTrackIdGlobal === trackId) { // If it was being audio recorded
            if (appServicesInstance.stopAudioRecording) appServicesInstance.stopAudioRecording(); // Stop and clean up audio recording
            setIsRecordingState(false);
        }
        if (selectedTimelineClipInfoGlobal.trackId === trackId) setSelectedTimelineClipInfoState(null, null);


        if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
        if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
        if (appServicesInstance.closeAllTrackWindows) appServicesInstance.closeAllTrackWindows(trackId);
    }
}

// --- Master Effects Chain Management ---
export function addMasterEffectToState(effectType, params = null) {
    const effectId = `masterEffect-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const effectInstanceParams = params || getEffectDefaultParamsFromRegistry(effectType) || {};
    masterEffectsChainState.push({
        id: effectId,
        type: effectType,
        params: JSON.parse(JSON.stringify(effectInstanceParams)), // Store a copy
        isBypassed: false
    });
    return effectId; // Return ID so main.js can pass it to addMasterEffectToAudio
}

export function removeMasterEffectFromState(effectId) {
    masterEffectsChainState = masterEffectsChainState.filter(e => e.id !== effectId);
}

export function updateMasterEffectParamInState(effectId, paramPath, value) {
    const effect = masterEffectsChainState.find(e => e.id === effectId);
    if (effect) {
        if (paramPath === 'isBypassed') { // Directly handle isBypassed on the state object
            effect.isBypassed = value;
        } else { // Handle other params potentially nested in effect.params
            let target = effect.params;
            const keys = paramPath.split('.');
            for (let i = 0; i < keys.length - 1; i++) {
                if (!target[keys[i]] || typeof target[keys[i]] !== 'object') target[keys[i]] = {};
                target = target[keys[i]];
            }
            target[keys[keys.length - 1]] = value;
        }
    }
}
export function reorderMasterEffectInState(effectId, newIndex) {
    const effectIndex = masterEffectsChainState.findIndex(e => e.id === effectId);
    if (effectIndex === -1 || newIndex < 0 || newIndex >= masterEffectsChainState.length) return;
    const [effect] = masterEffectsChainState.splice(effectIndex, 1);
    masterEffectsChainState.splice(newIndex, 0, effect);
}
export function setMasterEffectsState(effects) { // Used during project loading
    masterEffectsChainState = effects.map(e => JSON.parse(JSON.stringify(e))); // Deep copy
}

// --- Undo/Redo ---
function _getCurrentStateSnapshot(actionName) {
    if (typeof Tone === 'undefined' || typeof Tone.Transport === 'undefined') {
        console.error("[State _getCurrentStateSnapshot] Tone.js or Tone.Transport not defined. Snapshot might be incomplete.");
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error capturing undo state: Audio engine issue.", "error");
    }
    try {
        const clonedTracks = tracks.map(track => track.serializeState ? track.serializeState() : JSON.parse(JSON.stringify(track)));
        const clonedMasterEffects = JSON.parse(JSON.stringify(masterEffectsChainState));
        const clonedOpenWindows = Array.from(openWindowsMap.values()).map(win => {
            if (!win || !win.element) return null;
            return {
                id: win.id, title: win.title,
                left: win.element.style.left, top: win.element.style.top,
                width: win.element.style.width, height: win.element.style.height,
                zIndex: parseInt(win.element.style.zIndex, 10) || 100,
                isMinimized: win.isMinimized, isMaximized: win.isMaximized,
                restoreState: JSON.parse(JSON.stringify(win.restoreState || {})),
                initialContentKey: win.initialContentKey || win.id
            };
        }).filter(ws => ws !== null);

        return {
            actionName: actionName,
            tracks: clonedTracks,
            trackIdCounter: trackIdCounter,
            openWindows: clonedOpenWindows,
            highestZ: highestZ,
            masterEffectsChain: clonedMasterEffects,
            masterGainValue: masterGainValueState,
            activeSequencerTrackId: activeSequencerTrackId,
            soloedTrackId: soloedTrackId,
            armedTrackId: armedTrackId,
            globalPlaybackMode: globalPlaybackMode,
            tempo: (typeof Tone !== 'undefined' && Tone.Transport) ? Tone.Transport.bpm.value : Constants.MIN_TEMPO,
            currentLibraryName: currentLibraryNameGlobal,
            currentSoundBrowserPath: JSON.parse(JSON.stringify(currentSoundBrowserPathGlobal)),
            selectedTimelineClipInfo: JSON.parse(JSON.stringify(selectedTimelineClipInfoGlobal)),
            // Note: Not saving/restoring active MIDI input, loaded zips, file trees, preview player as these are more transient or environment-dependent.
        };
    } catch (error) {
        console.error("[State _getCurrentStateSnapshot] Error creating state snapshot:", error);
        if(appServicesInstance.showNotification) appServicesInstance.showNotification("Error capturing state for undo. Undo might be unreliable.", "error", 4000);
        return null;
    }
}

async function _applyStateSnapshot(snapshot, isUndoRedo = true) {
    if (!snapshot) {
        console.error("[State _applyStateSnapshot] Attempted to apply a null snapshot.");
        if(appServicesInstance.showNotification) appServicesInstance.showNotification("Error applying state. State might be inconsistent.", "error", 4000);
        return;
    }
    if (typeof Tone === 'undefined' || typeof Tone.Transport === 'undefined') {
        console.error("[State _applyStateSnapshot] Tone.js or Tone.Transport not defined. Cannot apply snapshot.");
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Critical error applying state: Audio engine issue.", "error");
        return;
    }
    console.log(`[State _applyStateSnapshot] Applying snapshot for action: ${snapshot.actionName}`);
    try {
        if (appServicesInstance) appServicesInstance._isReconstructingDAW_flag = true;

        if (Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) {
            appServicesInstance.stopPlayback(); // Stop playback before major state changes
        }
        Tone.Transport.cancel(0); // Clear any scheduled Tone.Transport events

        // Close all windows first (reconstruction will reopen them)
        openWindowsMap.forEach(win => { if (win.element) win.close(true); }); // true for reconstruction
        openWindowsMap.clear();

        // Dispose existing tracks before recreating
        tracks.forEach(track => { if (typeof track.dispose === 'function') track.dispose(); });
        tracks = [];

        highestZ = snapshot.highestZ || 100;
        trackIdCounter = snapshot.trackIdCounter || 0;
        masterGainValueState = snapshot.masterGainValue !== undefined ? snapshot.masterGainValue : Tone.dbToGain(0);
        if (appServicesInstance.setMasterVolume) appServicesInstance.setMasterVolume(masterGainValueState);

        Tone.Transport.bpm.value = snapshot.tempo || 120;
        if (appServicesInstance.updateTaskbarTempoDisplay) appServicesInstance.updateTaskbarTempoDisplay(snapshot.tempo || 120);

        // Reconstruct Master Effects
        masterEffectsChainState = []; // Clear local state
        if (appServicesInstance.clearAllMasterEffectNodes) await appServicesInstance.clearAllMasterEffectNodes(); // Clear audio nodes
        if(snapshot.masterEffectsChain) {
            for (const effectState of snapshot.masterEffectsChain) {
                masterEffectsChainState.push(JSON.parse(JSON.stringify(effectState))); // Add to state
                if (appServicesInstance.addMasterEffectToAudio) {
                    await appServicesInstance.addMasterEffectToAudio(effectState.id, effectState.type, effectState.params);
                    if (effectState.isBypassed && appServicesInstance._rechainMasterEffectsAudio) {
                        // Rechain after adding, taking bypass state into account.
                        // addMasterEffectToAudio already re-chains, but an explicit call here ensures bypass is considered if the add didn't.
                        await appServicesInstance._rechainMasterEffectsAudio();
                    }
                }
            }
        }
        if (appServicesInstance.updateMasterEffectsRackUI) appServicesInstance.updateMasterEffectsRackUI();


        // Reconstruct Tracks
        if (snapshot.tracks) {
            for (const trackData of snapshot.tracks) {
                if (trackData) {
                    // Pass appServicesInstance to the Track constructor
                    addTrackToStateInternal(trackData.type, trackData, false, appServicesInstance);
                }
            }
        }


        // Reconstruct Windows (must happen after tracks are potentially recreated)
        if (snapshot.openWindows) {
            const sortedWindows = snapshot.openWindows.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            for (const winState of sortedWindows) {
                if (winState) {
                    let openedWindow = null;
                    const services = appServicesInstance; // Use the main instance

                    // Simplified window opening logic, assuming appServices methods exist
                    if (winState.id === 'soundBrowser' && services.openSoundBrowserWindow) openedWindow = services.openSoundBrowserWindow(null, winState);
                    else if (winState.id === 'mixer' && services.openMixerWindow) openedWindow = services.openMixerWindow(winState);
                    else if (winState.id === 'timeline' && services.openArrangementWindow) openedWindow = services.openArrangementWindow(null, winState);
                    else if (winState.id === 'globalControls' && services.openGlobalControlsWindow) {
                        // For GlobalControls, elements need to be re-cached and events re-attached
                        services.openGlobalControlsWindow((elements) => {
                            if (elements) {
                                services.uiElementsCache.playBtnGlobal = elements.playBtnGlobal;
                                // ... re-cache other elements ...
                                services.uiElementsCache.midiInputSelectGlobal = elements.midiInputSelectGlobal; // Important for MIDI setup
                                if (EventHandlers && EventHandlers.attachGlobalControlEvents) EventHandlers.attachGlobalControlEvents(elements);
                                if (EventHandlers && EventHandlers.setupMIDI) EventHandlers.setupMIDI(); // Re-setup MIDI with new selector
                            }
                        }, winState);
                        // The window instance itself is already in openWindowsMap via createWindow
                        openedWindow = services.getWindowById(winState.id);

                    } else if (winState.id === 'masterEffectsRack' && services.openMasterEffectsRackWindow) openedWindow = services.openMasterEffectsRackWindow(winState);
                    else if (winState.id.startsWith('trackInspector-')) {
                        const trackId = winState.id.split('-')[1];
                        if (getTrackByIdState(trackId) && services.openTrackInspectorWindow) openedWindow = services.openTrackInspectorWindow(trackId, winState);
                    } else if (winState.id.startsWith('effectsRack-')) {
                        const trackId = winState.id.split('-')[1];
                        if (getTrackByIdState(trackId) && services.openTrackEffectsRackWindow) openedWindow = services.openTrackEffectsRackWindow(trackId, winState);
                    } else if (winState.id.startsWith('sequencer-')) {
                        const trackId = winState.id.split('-')[1];
                        if (getTrackByIdState(trackId) && services.openSequencerWindow) openedWindow = services.openSequencerWindow(trackId, winState);
                    }

                    if (openedWindow && openedWindow.element && typeof openedWindow.applyState === 'function') {
                        openedWindow.applyState(winState); // Apply geometry and other states
                    }
                     if (winState.zIndex && winState.zIndex > highestZ) highestZ = winState.zIndex;
                }
            }
        }
         // Focus the top-most window after reconstruction
        const topWindowId = openWindowsMap.size > 0 ? Array.from(openWindowsMap.values()).sort((a, b) => (parseInt(b.element?.style.zIndex || "0") || 0) - (parseInt(a.element?.style.zIndex || "0") || 0))[0]?.id : null;
        if(topWindowId && getWindowByIdState(topWindowId)) getWindowByIdState(topWindowId).focus(true);


        // Restore other global states
        activeSequencerTrackId = snapshot.activeSequencerTrackId || null;
        // setSoloedTrackIdState and setArmedTrackIdState will handle UI updates internally
        setSoloedTrackIdState(snapshot.soloedTrackId); // Pass null if snapshot.soloedTrackId is null/undefined
        setArmedTrackIdState(snapshot.armedTrackId);   // Pass null if snapshot.armedTrackId is null/undefined
        setPlaybackModeState(snapshot.globalPlaybackMode || 'sequencer');
        setSelectedTimelineClipInfoState(snapshot.selectedTimelineClipInfo?.trackId, snapshot.selectedTimelineClipInfo?.clipId);
        if (snapshot.currentLibraryName && appServicesInstance.setCurrentLibraryNameState) {
            appServicesInstance.setCurrentLibraryNameState(snapshot.currentLibraryName);
        }
        if (snapshot.currentSoundBrowserPath && appServicesInstance.setCurrentSoundBrowserPathState) {
            appServicesInstance.setCurrentSoundBrowserPathState(snapshot.currentSoundBrowserPath);
        }


        // Final UI refreshes
        if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
        if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
        if (appServicesInstance.updateSoundBrowserDisplayForLibrary) appServicesInstance.updateSoundBrowserDisplayForLibrary();

        // Recreate Tone.Sequence/Part for each track
        tracks.forEach(track => {
            if (typeof track.recreateToneSequence === 'function') track.recreateToneSequence(false); // false = don't auto-start
            if (track.type === 'Audio' && typeof track.scheduleTimelinePlayback === 'function') {
                 track.scheduleTimelinePlayback(0, globalPlaybackMode); // Reschedule from start
            }
        });
        console.log(`[State _applyStateSnapshot] Snapshot for "${snapshot.actionName}" applied.`);

    } catch (error) {
        console.error("[State _applyStateSnapshot] Error applying state snapshot:", error, snapshot);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error restoring state. Application might be unstable.", "error", 5000);
    } finally {
        if (appServicesInstance) appServicesInstance._isReconstructingDAW_flag = false;
        if (appServicesInstance.updateUndoRedoButtonsUI) appServicesInstance.updateUndoRedoButtonsUI();
    }
}

export function captureStateForUndoInternal(actionName) {
    if (appServicesInstance._isReconstructingDAW_flag === true) return;

    const snapshot = _getCurrentStateSnapshot(actionName);
    if (snapshot) {
        undoStack.push(snapshot);
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift();
        }
        redoStack = []; // Clear redo stack on new action
        if (appServicesInstance.updateUndoRedoButtonsUI) appServicesInstance.updateUndoRedoButtonsUI(snapshot, null);
        // console.log(`[State Undo] Captured: ${actionName}. Stack size: ${undoStack.length}`);
    } else {
        console.warn(`[State Undo] Failed to capture snapshot for action: ${actionName}`);
    }
}

export async function undoLastActionInternal() {
    if (appServicesInstance._isReconstructingDAW_flag === true || undoStack.length === 0) return;
    const lastState = undoStack.pop();
    const currentStateForRedo = _getCurrentStateSnapshot(`Redo state for: ${lastState.actionName}`);

    if (currentStateForRedo) redoStack.push(currentStateForRedo);
    if (redoStack.length > Constants.MAX_HISTORY_STATES) redoStack.shift();

    await _applyStateSnapshot(lastState, true);
    if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Undid: ${lastState.actionName}`, "info", 1500);
}

export async function redoLastActionInternal() {
    if (appServicesInstance._isReconstructingDAW_flag === true || redoStack.length === 0) return;
    const nextState = redoStack.pop();
    const currentStateForUndo = _getCurrentStateSnapshot(`Undo state for: ${nextState.actionName}`);

    if (currentStateForUndo) undoStack.push(currentStateForUndo);
    if (undoStack.length > Constants.MAX_HISTORY_STATES) undoStack.shift();

    await _applyStateSnapshot(nextState, true);
    if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Redid: ${nextState.actionName}`, "info", 1500);
}

// --- Project Data Management ---
export function gatherProjectDataInternal() {
    if (typeof Tone === 'undefined' || typeof Tone.Transport === 'undefined') {
        console.error("[State gatherProjectDataInternal] Tone.js or Tone.Transport not defined. Project data might be incomplete.");
    }
    try {
        const projectData = {
            version: Constants.APP_VERSION,
            projectName: Constants.defaultProjectName, // Allow renaming later
            createdAt: new Date().toISOString(),
            globalSettings: {
                tempo: (typeof Tone !== 'undefined' && Tone.Transport) ? Tone.Transport.bpm.value : Constants.MIN_TEMPO,
                masterVolume: masterGainValueState,
                playbackMode: globalPlaybackMode,
                activeSequencerTrackId: activeSequencerTrackId,
                soloedTrackId: soloedTrackId,
                armedTrackId: armedTrackId,
                selectedTimelineClipInfo: selectedTimelineClipInfoGlobal,
                currentLibraryName: currentLibraryNameGlobal,
                currentSoundBrowserPath: currentSoundBrowserPathGlobal,
            },
            masterEffectsChain: masterEffectsChainState.map(effect => ({
                id: effect.id, type: effect.type,
                params: effect.params ? JSON.parse(JSON.stringify(effect.params)) : {},
                isBypassed: effect.isBypassed
            })),
            tracks: tracks.map(track => track.serializeState ? track.serializeState() : null).filter(td => td !== null),
            windowStates: Array.from(openWindowsMap.values())
                .map(win => {
                    if (!win || !win.element) return null;
                    return {
                        id: win.id, title: win.title,
                        left: win.element.style.left, top: win.element.style.top,
                        width: win.element.style.width, height: win.element.style.height,
                        zIndex: parseInt(win.element.style.zIndex, 10),
                        isMinimized: win.isMinimized, isMaximized: win.isMaximized,
                        restoreState: JSON.parse(JSON.stringify(win.restoreState || {})),
                        initialContentKey: win.initialContentKey || win.id
                    };
                }).filter(ws => ws !== null)
        };
        return projectData;
    } catch (error) {
        console.error("[State gatherProjectDataInternal] Error gathering project data:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error preparing project data for saving.", "error", 4000);
        return null;
    }
}

export async function reconstructDAWInternal(projectData) {
    if (!projectData) {
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Cannot load project: No data provided.", "error");
        return;
    }
     if (typeof Tone === 'undefined' || typeof Tone.Transport === 'undefined') {
        console.error("[State reconstructDAWInternal] Tone.js or Tone.Transport not defined. Cannot reconstruct project.");
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Critical error: Audio engine issue. Cannot load project.", "error");
        return;
    }
    console.log("[State reconstructDAWInternal] Starting project reconstruction...");
    if(appServicesInstance) appServicesInstance._isReconstructingDAW_flag = true;

    try {
        // Reset core state variables
        undoStack = []; redoStack = [];
        if(appServicesInstance.updateUndoRedoButtonsUI) appServicesInstance.updateUndoRedoButtonsUI(null, null);

        // Stop playback and clear transport
        if (Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) {
            appServicesInstance.stopPlayback();
        }
        Tone.Transport.cancel(0);

        // Close all windows and dispose tracks
        if(appServicesInstance.closeAllWindows) appServicesInstance.closeAllWindows(true); // true for reconstruction
        tracks.forEach(track => { if (typeof track.dispose === 'function') track.dispose(); });
        tracks = [];
        trackIdCounter = 0;

        // Restore global settings
        if (projectData.globalSettings) {
            Tone.Transport.bpm.value = projectData.globalSettings.tempo || 120;
            if (appServicesInstance.updateTaskbarTempoDisplay) appServicesInstance.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
            masterGainValueState = projectData.globalSettings.masterVolume !== undefined ? projectData.globalSettings.masterVolume : Tone.dbToGain(0);
            if (appServicesInstance.setMasterVolume) appServicesInstance.setMasterVolume(masterGainValueState);

            globalPlaybackMode = projectData.globalSettings.playbackMode || 'sequencer';
            if(appServicesInstance.onPlaybackModeChange) appServicesInstance.onPlaybackModeChange(globalPlaybackMode);

            activeSequencerTrackId = projectData.globalSettings.activeSequencerTrackId || null;
            // Solo and Arm state will be set after tracks are created
            selectedTimelineClipInfoGlobal = projectData.globalSettings.selectedTimelineClipInfo || { trackId: null, clipId: null };
            if (projectData.globalSettings.currentLibraryName && appServicesInstance.setCurrentLibraryNameState) {
                appServicesInstance.setCurrentLibraryNameState(projectData.globalSettings.currentLibraryName);
            }
            if (projectData.globalSettings.currentSoundBrowserPath && appServicesInstance.setCurrentSoundBrowserPathState) {
                 appServicesInstance.setCurrentSoundBrowserPathState(projectData.globalSettings.currentSoundBrowserPath);
            }
        }

        // Reconstruct Master Effects
        masterEffectsChainState = [];
        if (appServicesInstance.clearAllMasterEffectNodes) await appServicesInstance.clearAllMasterEffectNodes();
        if (projectData.masterEffectsChain) {
            for (const effectState of projectData.masterEffectsChain) {
                 // Add to state first
                masterEffectsChainState.push(JSON.parse(JSON.stringify(effectState)));
                // Then create audio node
                if (appServicesInstance.addMasterEffectToAudio) {
                    await appServicesInstance.addMasterEffectToAudio(effectState.id, effectState.type, effectState.params);
                }
            }
            // After all effects are added and potentially connected in a default way,
            // do a final rechain to ensure bypass states are correctly applied.
            if (appServicesInstance._rechainMasterEffectsAudio) {
                await appServicesInstance._rechainMasterEffectsAudio();
            }
        }
        if (appServicesInstance.updateMasterEffectsRackUI) appServicesInstance.updateMasterEffectsRackUI();


        // Reconstruct Tracks
        let maxTrackIdFound = 0;
        if (projectData.tracks) {
            for (const trackData of projectData.tracks) {
                if (trackData) {
                    // Pass appServicesInstance to Track constructor
                    const newTrack = addTrackToStateInternal(trackData.type, trackData, false, appServicesInstance);
                    if (newTrack && newTrack.id > maxTrackIdFound) maxTrackIdFound = newTrack.id;
                }
            }
        }
        trackIdCounter = maxTrackIdFound; // Update global counter


        // Set Solo and Arm state AFTER tracks are recreated
        if (projectData.globalSettings) {
            setSoloedTrackIdState(projectData.globalSettings.soloedTrackId); // Will iterate tracks and update
            setArmedTrackIdState(projectData.globalSettings.armedTrackId);   // Will iterate tracks and update
        }


        // Reconstruct Windows
        highestZ = 100; // Reset highestZ before reconstructing windows
        if (projectData.windowStates) {
            const sortedWindows = projectData.windowStates.sort((a,b) => (a.zIndex || 0) - (b.zIndex || 0));
            for (const winState of sortedWindows) {
                if (winState) {
                    let openedWindow = null;
                    // Use appServices for opening windows
                    if (winState.id === 'soundBrowser' && appServicesInstance.openSoundBrowserWindow) openedWindow = appServicesInstance.openSoundBrowserWindow(null, winState);
                    else if (winState.id === 'mixer' && appServicesInstance.openMixerWindow) openedWindow = appServicesInstance.openMixerWindow(winState);
                    else if (winState.id === 'timeline' && appServicesInstance.openArrangementWindow) openedWindow = appServicesInstance.openArrangementWindow(null, winState);
                    else if (winState.id === 'globalControls' && appServicesInstance.openGlobalControlsWindow) {
                         appServicesInstance.openGlobalControlsWindow((elements) => {
                            if (elements) {
                                // Re-cache and re-attach events for global controls
                                appServicesInstance.uiElementsCache.playBtnGlobal = elements.playBtnGlobal;
                                // ... other elements ...
                                appServicesInstance.uiElementsCache.midiInputSelectGlobal = elements.midiInputSelectGlobal;
                                if(EventHandlers && EventHandlers.attachGlobalControlEvents) EventHandlers.attachGlobalControlEvents(elements);
                                if(EventHandlers && EventHandlers.setupMIDI) EventHandlers.setupMIDI(); // Re-setup MIDI
                            }
                        }, winState);
                        openedWindow = appServicesInstance.getWindowById(winState.id); // Get instance after creation
                    }
                    else if (winState.id === 'masterEffectsRack' && appServicesInstance.openMasterEffectsRackWindow) openedWindow = appServicesInstance.openMasterEffectsRackWindow(winState);
                    else if (winState.id.startsWith('trackInspector-')) {
                        const trackId = winState.id.split('-')[1];
                        if (getTrackByIdState(trackId) && appServicesInstance.openTrackInspectorWindow) openedWindow = appServicesInstance.openTrackInspectorWindow(trackId, winState);
                    }
                    else if (winState.id.startsWith('effectsRack-')) {
                        const trackId = winState.id.split('-')[1];
                        if (getTrackByIdState(trackId) && appServicesInstance.openTrackEffectsRackWindow) openedWindow = appServicesInstance.openTrackEffectsRackWindow(trackId, winState);
                    }
                     else if (winState.id.startsWith('sequencer-')) {
                        const trackId = winState.id.split('-')[1];
                        if (getTrackByIdState(trackId) && appServicesInstance.openSequencerWindow) openedWindow = appServicesInstance.openSequencerWindow(trackId, winState);
                    }

                    if (openedWindow && openedWindow.element && typeof openedWindow.applyState === 'function') {
                         openedWindow.applyState(winState); // Apply geometry and visibility
                    }
                    if (winState.zIndex && winState.zIndex > highestZ) highestZ = winState.zIndex;
                }
            }
        }
        // Focus the top-most window after reconstruction
        const topWindow = Array.from(openWindowsMap.values()).filter(w => w && w.element && !w.isMinimized).sort((a,b) => parseInt(b.element.style.zIndex) - parseInt(a.element.style.zIndex))[0];
        if (topWindow) topWindow.focus(true);


        // Final UI refreshes
        if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
        if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
        if (appServicesInstance.updateSoundBrowserDisplayForLibrary) appServicesInstance.updateSoundBrowserDisplayForLibrary();

        console.log("[State reconstructDAWInternal] Project reconstruction complete.");
        if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Project "${projectData.projectName || 'Untitled'}" loaded.`, "success");

    } catch (error) {
        console.error("[State reconstructDAWInternal] Error reconstructing project:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error loading project. Project might be corrupted or incompatible.", "error", 5000);
        // Potentially reset to a new project state if loading fails catastrophically
        // if (appServicesInstance.newProject) appServicesInstance.newProject();
    } finally {
        if(appServicesInstance) appServicesInstance._isReconstructingDAW_flag = false;
    }
}

export function saveProjectInternal() {
    const projectData = gatherProjectDataInternal();
    if (!projectData) return;
    try {
        const projectString = JSON.stringify(projectData, null, 2);
        const blob = new Blob([projectString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `${(projectData.projectName || "SnugOS-Project").replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${timestamp}.snug`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Project saved successfully!", "success");
    } catch (error) {
        console.error("[State saveProjectInternal] Error saving project:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error saving project. See console for details.", "error");
    }
}
export function loadProjectInternal() {
    const fileInput = document.getElementById('file-input-project');
    if (fileInput) {
        fileInput.onchange = async (event) => { // event, not e
            if (event.target.files && event.target.files[0]) {
                await handleProjectFileLoadInternal(event.target.files[0]); // Pass the file object
                fileInput.value = ''; // Reset for next load
            }
        };
        fileInput.click();
    } else {
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error: Project file input not found.", "error");
    }
}
export async function handleProjectFileLoadInternal(file) { // Expects a File object
    if (!file) return;
    if (appServicesInstance.showConfirmationDialog) {
        appServicesInstance.showConfirmationDialog("Loading a new project will discard unsaved changes. Continue?", async () => {
            const reader = new FileReader();
            reader.onload = async (e_reader) => { // e_reader to avoid conflict with outer scope 'e' if any
                try {
                    const projectData = JSON.parse(e_reader.target.result);
                    await reconstructDAWInternal(projectData);
                } catch (error) {
                    console.error("Error parsing or loading project file:", error);
                    if (appServicesInstance.showNotification) appServicesInstance.showNotification("Failed to load project file. It might be corrupt or invalid.", "error");
                }
            };
            reader.onerror = () => {
                 if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error reading project file.", "error");
            };
            reader.readAsText(file);
        });
    }
}
export async function exportToWavInternal() {
    if (typeof Tone === 'undefined' || typeof Tone.Transport === 'undefined') {
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Audio engine not ready for export.", "error");
        return;
    }
    if (!appServicesInstance.initAudioContextAndMasterMeter || !appServicesInstance.getActualMasterGainNode) {
         if (appServicesInstance.showNotification) appServicesInstance.showNotification("Audio system not ready for export.", "error");
        return;
    }

    await appServicesInstance.initAudioContextAndMasterMeter(true); // Ensure context is running

    try {
        if (Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) {
            appServicesInstance.stopPlayback(); // Stop current playback
        }
        Tone.Transport.cancel(0); // Clear transport schedule

        let projectDuration = 0;
        tracks.forEach(track => {
            track.timelineClips.forEach(clip => {
                // Assuming clip.duration is in seconds and reliable
                projectDuration = Math.max(projectDuration, clip.startTime + clip.duration);
            });
            // If using sequences, determine max sequence length
             if (track.getActiveSequence && track.getActiveSequence()) {
                const seq = track.getActiveSequence();
                const seqDuration = Tone.Time(`${seq.bars}m`).toSeconds();
                projectDuration = Math.max(projectDuration, seqDuration);
            }
        });

        if (projectDuration === 0) {
            projectDuration = 5; // Default to 5 seconds if project is effectively empty
            if (appServicesInstance.showNotification) appServicesInstance.showNotification("Project seems empty. Exporting 5 seconds.", "info");
        }

        projectDuration = Math.min(projectDuration + 2, 600); // Add a 2s tail, max 10 mins

        if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Exporting ${projectDuration.toFixed(1)}s to WAV... Please wait. This may take a moment.`, "info", projectDuration * 1000 + 5000); // Longer notification

        const masterOutputNode = appServicesInstance.getActualMasterGainNode();
        if (!masterOutputNode || masterOutputNode.disposed) {
            throw new Error("Master output node is not available for recording export.");
        }

        const recorder = new Tone.Recorder();
        masterOutputNode.connect(recorder);

        // Prepare tracks for offline rendering
        tracks.forEach(track => {
            if (typeof track.prepareForOfflineRender === 'function') track.prepareForOfflineRender();
            if (typeof track.recreateToneSequence === 'function') track.recreateToneSequence(false); // Rebuild sequences, don't start
            if (typeof track.scheduleTimelinePlayback === 'function') {
                 track.scheduleTimelinePlayback(0, 'timeline'); // Schedule all clips from t=0 in 'timeline' mode
            }
        });

        await Tone.Offline(async (offlineContext) => {
            // All scheduling for Tone.Transport happens here, using offlineContext.currentTime
            // Re-trigger all track events within this offline context.
            // This is complex because Tone.Transport is global.
            // The current approach relies on global Tone.Transport and rendering its output.
            // For true offline rendering independent of global transport, each track's playback
            // logic would need to be callable with an offline context and specific timing.

            // Start the global transport which should trigger scheduled events.
            Tone.Transport.position = 0;
            Tone.Transport.start(0); // Start at the beginning of the offline context
            await recorder.start(); // Start recorder slightly before or at the same time

            // Let it run for the project duration within the offline context
            // This part is tricky as Tone.Offline typically runs a self-contained function.
            // The current implementation renders the live Tone.Transport.
        }, projectDuration);


        // Start recording and transport (outside Tone.Offline, for live rendering)
        Tone.Transport.position = 0;
        await recorder.start();
        Tone.Transport.start();


        await new Promise(resolve => setTimeout(resolve, projectDuration * 1000)); // Wait for duration

        const recording = await recorder.stop();
        Tone.Transport.stop(); // Stop global transport

        if (masterOutputNode && !masterOutputNode.disposed && recorder && !recorder.disposed) {
            try { masterOutputNode.disconnect(recorder); } catch(e) {/* ignore */}
        }
        if (recorder && !recorder.disposed) recorder.dispose();

        // Create download link
        const url = URL.createObjectURL(recording);
        const a = document.createElement('a');
        a.style.display = "none";
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `snugos-export-${timestamp}.wav`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Export to WAV successful!", "success");

    } catch (error) {
        console.error("[State exportToWavInternal] Error exporting WAV:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Error exporting WAV: ${error.message}. See console.`, "error", 5000);
        if (typeof Tone !== 'undefined' && Tone.Transport) { Tone.Transport.stop(); Tone.Transport.cancel(0); }
    }
}
