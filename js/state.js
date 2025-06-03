// js/state.js - Application State Management (MODIFIED)
import * as Constants from './constants.js';
import { Track } from './Track.js'; // Ensure Track class is correctly imported
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';

// --- Centralized State Variables ---
let tracks = [];
let trackIdCounter = 0;

let openWindowsMap = new Map(); // Stores SnugWindow instances by ID
let highestZ = 100;

let masterEffectsChainState = []; // Stores master effect configurations {id, type, params, isBypassed}
let masterGainValueState = typeof Tone !== 'undefined' ? Tone.dbToGain(0) : 0.707; // Linear gain

let midiAccessGlobal = null;
let activeMIDIInputGlobal = null;

let loadedZipFilesGlobal = {}; // { libraryName: JSZipInstance | "loading" | "error" }
let soundLibraryFileTreesGlobal = {}; // { libraryName: fileTree }
let currentLibraryNameGlobal = null;
let currentSoundFileTreeGlobal = null; // This might be redundant if derived from currentLibraryNameGlobal
let currentSoundBrowserPathGlobal = []; // Array of folder names representing current path
let previewPlayerGlobal = null; // Tone.Player instance for previewing sounds

let clipboardDataGlobal = { type: null, data: null, sourceTrackType: null, sequenceLength: null };

let activeSequencerTrackId = null;
let soloedTrackId = null;
let armedTrackId = null;
let isRecordingGlobal = false; // Global recording state (master record button)
let recordingTrackIdGlobal = null; // ID of the track currently being recorded onto (for audio tracks)
let recordingStartTime = 0; // Tone.Transport.seconds when recording started

let globalPlaybackMode = 'sequencer'; // 'sequencer' or 'timeline'
let selectedTimelineClipInfoGlobal = { trackId: null, clipId: null };

const THEME_STORAGE_KEY = 'snugosThemePreference_v1'; // Added v1
let currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark'; // Load preference

let undoStack = [];
let redoStack = [];

let appServices = {}; // To be injected by main.js

// --- Initialization ---
export function initializeStateModule(services) {
    appServices = services;
    // Attempt to load saved theme, otherwise default to 'dark'
    currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
    if (appServices.updateTheme) appServices.updateTheme(currentTheme); // Update UI based on theme
    console.log("[State] Module initialized.");
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
export const getClipboardDataState = () => clipboardDataGlobal;
export const getActiveSequencerTrackIdState = () => activeSequencerTrackId;
export const getSoloedTrackIdState = () => soloedTrackId;
export const getArmedTrackIdState = () => armedTrackId;
export const isTrackRecordingState = (trackId) => isRecordingGlobal && recordingTrackIdGlobal === trackId; // More specific
export const isGlobalRecordingActiveState = () => isRecordingGlobal;
export const getRecordingTrackIdState = () => recordingTrackIdGlobal;
export const getRecordingStartTimeState = () => recordingStartTime;
export const getPlaybackModeState = () => globalPlaybackMode;
export const getSelectedTimelineClipInfoState = () => selectedTimelineClipInfoGlobal;
export const getCurrentThemeState = () => currentTheme;
export const getUndoStackState = () => undoStack;
export const getRedoStackState = () => redoStack;

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

export function setMasterGainValueState(value) { // value is linear gain
    masterGainValueState = value;
    if (appServices.setMasterVolume && typeof Tone !== 'undefined') { // Ensure Tone is loaded
        appServices.setMasterVolume(value); // This will call Tone.Master.volume.value
    }
}

export function setMidiAccessState(midi) { midiAccessGlobal = midi; }
export function setActiveMIDIInputState(deviceId) {
    activeMIDIInputGlobal = deviceId;
    // If appServices has a UI update function for MIDI device change, call it
    if (appServices.updateMIDIIndicator) appServices.updateMIDIIndicator(deviceId !== 'none' && deviceId !== null);
}
export function setLoadedZipFilesState(zipFiles) { loadedZipFilesGlobal = zipFiles; }
export function setSoundLibraryFileTreesState(trees) { soundLibraryFileTreesGlobal = trees; }
export function setCurrentLibraryNameState(name) {
    currentLibraryNameGlobal = name;
    currentSoundFileTreeGlobal = soundLibraryFileTreesGlobal[name] || null;
    currentSoundBrowserPathGlobal = []; // Reset path when library changes
    if (appServices.updateSoundBrowserDisplayForLibrary) {
        appServices.updateSoundBrowserDisplayForLibrary(name);
    }
}
export function setCurrentSoundBrowserPathState(pathArray) { currentSoundBrowserPathGlobal = pathArray; }
export function pushToSoundBrowserPath(folderName) {
    currentSoundBrowserPathGlobal.push(folderName);
    if (appServices.updateSoundBrowserDisplayForLibrary) appServices.updateSoundBrowserDisplayForLibrary();
}
export function popFromSoundBrowserPath() {
    currentSoundBrowserPathGlobal.pop();
    if (appServices.updateSoundBrowserDisplayForLibrary) appServices.updateSoundBrowserDisplayForLibrary();
}
export function setPreviewPlayerState(player) { previewPlayerGlobal = player; }
export function setClipboardDataState(data) { clipboardDataGlobal = data; }

export function setActiveSequencerTrackIdState(trackId) {
    activeSequencerTrackId = trackId;
    // Potentially notify UI or other modules
}
export function setSoloedTrackIdState(trackId) {
    const previouslySoloed = soloedTrackId;
    soloedTrackId = (soloedTrackId === trackId) ? null : trackId; // Toggle behavior

    tracks.forEach(t => {
        if (t.id === previouslySoloed && previouslySoloed !== soloedTrackId) t.isSoloed = false;
        if (t.id === soloedTrackId) t.isSoloed = true;
        // Update track's internal solo state for audio routing
        if (typeof t.updateSoloState === 'function') t.updateSoloState(soloedTrackId);
        if (appServices.updateTrackUI) appServices.updateTrackUI(t.id, 'muteSoloChange');
    });
    if (appServices.updateMixerWindow) appServices.updateMixerWindow();
}
export function setArmedTrackIdState(trackId) {
    const previouslyArmed = armedTrackId;
    armedTrackId = (armedTrackId === trackId) ? null : trackId;

    if (previouslyArmed !== null && previouslyArmed !== armedTrackId) {
        const prevTrack = getTrackByIdState(previouslyArmed);
        if (prevTrack) {
            prevTrack.isArmedForRec = false;
            if (appServices.updateTrackUI) appServices.updateTrackUI(prevTrack.id, 'armChange');
        }
    }
    if (armedTrackId !== null) {
        const currentTrack = getTrackByIdState(armedTrackId);
        if (currentTrack) {
            currentTrack.isArmedForRec = true;
            if (appServices.updateTrackUI) appServices.updateTrackUI(currentTrack.id, 'armChange');
        }
    }
     if (appServices.updateMixerWindow) appServices.updateMixerWindow();
     if (appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(isRecordingGlobal, !!armedTrackId);
}

export function setIsRecordingState(isRec) {
    isRecordingGlobal = isRec;
    if (!isRec && recordingTrackIdGlobal) { // If stopping recording for a specific track
        if (appServices.stopAudioRecording) appServices.stopAudioRecording(); // Audio module handles blob processing
        recordingTrackIdGlobal = null;
    }
    // Update global UI record button
    if (appServices.updateRecordButtonUI) appServices.updateRecordButtonUI(isRecordingGlobal, !!armedTrackId);
}
export function setRecordingTrackIdState(trackId) { recordingTrackIdGlobal = trackId; }
export function setRecordingStartTimeState(time) { recordingStartTime = time; }

export function setPlaybackModeState(mode) { // 'sequencer' or 'timeline'
    if (globalPlaybackMode !== mode) {
        globalPlaybackMode = mode;
        if (appServices.onPlaybackModeChange) {
            appServices.onPlaybackModeChange(mode);
        }
        // If playback is active, might need to stop and restart or re-schedule
        if (Tone.Transport.state === 'started' && appServices.togglePlayback) {
            appServices.showNotification(`Playback mode changed. Stopping and restarting transport.`, "info", 2000);
            appServices.stopPlayback(); // Stop first
            // Consider if auto-restart is desired or if user should restart
            // For now, let user restart if they wish.
        }
    }
}
export function setSelectedTimelineClipInfoState(trackId, clipId) {
    selectedTimelineClipInfoGlobal = { trackId, clipId };
    // Notify UI to update selection visuals on timeline
    if(appServices.renderTimeline) appServices.renderTimeline();
}
export function setCurrentThemeState(theme) {
    currentTheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    if (appServices.updateTheme) appServices.updateTheme(theme); // For main.js to update body class
}


// --- Track Management ---
export function addTrackToStateInternal(type, initialData = null, captureUndo = true, services = appServices) {
    if (!services || !services.getTrackById) { // Basic check for appServices
        console.error("[State addTrackToStateInternal] appServices not properly injected or core functions missing!");
        return null;
    }
    trackIdCounter++;
    const newTrack = new Track(trackIdCounter, type, initialData, services);
    tracks.push(newTrack);

    if (captureUndo && services.captureStateForUndoInternal) {
        services.captureStateForUndoInternal(`Add Track: ${newTrack.name}`);
    }
    if (services.updateMixerWindow) services.updateMixerWindow();
    if (services.updateArrangementView) services.updateArrangementView();
    return newTrack;
}

export function removeTrackFromStateInternal(trackId, captureUndo = true) {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    if (trackIndex > -1) {
        const trackToRemove = tracks[trackIndex];
        if (captureUndo && appServices.captureStateForUndoInternal) {
            appServices.captureStateForUndoInternal(`Remove Track: ${trackToRemove.name}`);
        }
        if (typeof trackToRemove.dispose === 'function') {
            trackToRemove.dispose(); // Call track's own cleanup
        }
        tracks.splice(trackIndex, 1);

        // Clean up related state
        if (soloedTrackId === trackId) setSoloedTrackIdState(null); // Unsolo if removed track was soloed
        if (armedTrackId === trackId) setArmedTrackIdState(null);   // Unarm if removed track was armed
        if (activeSequencerTrackId === trackId) setActiveSequencerTrackIdState(null);
        if (recordingTrackIdGlobal === trackId) {
            setIsRecordingState(false); // Stop global recording if the recording track is removed
        }

        if (appServices.updateMixerWindow) appServices.updateMixerWindow();
        if (appServices.updateArrangementView) appServices.updateArrangementView();
        if (appServices.closeAllTrackWindows) appServices.closeAllTrackWindows(trackId); // Close windows associated with this track
    }
}

// --- Master Effects Chain Management ---
export function addMasterEffectToState(effectType, params = null) {
    const effectId = `masterEffect-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const effectInstanceParams = params || getEffectDefaultParamsFromRegistry(effectType) || {};
    masterEffectsChainState.push({
        id: effectId,
        type: effectType,
        params: effectInstanceParams,
        isBypassed: false
    });
    // No undo capture here, should be handled by the caller (e.g., appServices.addMasterEffect)
    return effectId;
}

export function removeMasterEffectFromState(effectId) {
    masterEffectsChainState = masterEffectsChainState.filter(e => e.id !== effectId);
}

export function updateMasterEffectParamInState(effectId, paramPath, value) {
    const effect = masterEffectsChainState.find(e => e.id === effectId);
    if (effect) {
        let target = effect.params;
        const keys = paramPath.split('.');
        for (let i = 0; i < keys.length - 1; i++) {
            if (!target[keys[i]] || typeof target[keys[i]] !== 'object') target[keys[i]] = {}; // Create path if not exists
            target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
    }
}
export function reorderMasterEffectInState(effectId, newIndex) {
    const effectIndex = masterEffectsChainState.findIndex(e => e.id === effectId);
    if (effectIndex === -1) return;
    const [effect] = masterEffectsChainState.splice(effectIndex, 1);
    masterEffectsChainState.splice(newIndex, 0, effect);
}
export function setMasterEffectsState(effects) { // Used for project reconstruction
    masterEffectsChainState = effects;
}

// --- Undo/Redo ---
function _getCurrentStateSnapshot(actionName) {
    try {
        // Deep clone critical parts of the state
        const clonedTracks = tracks.map(track => track.serializeState ? track.serializeState() : JSON.parse(JSON.stringify(track)));
        const clonedMasterEffects = JSON.parse(JSON.stringify(masterEffectsChainState));
        const clonedOpenWindows = Array.from(openWindowsMap.values()).map(win => {
            if (!win || !win.element) return null; // Skip if window or element is gone
            return {
                id: win.id,
                title: win.title,
                left: win.element.style.left,
                top: win.element.style.top,
                width: win.element.style.width,
                height: win.element.style.height,
                zIndex: parseInt(win.element.style.zIndex, 10) || 100,
                isMinimized: win.isMinimized,
                isMaximized: win.isMaximized,
                restoreState: JSON.parse(JSON.stringify(win.restoreState || {})),
                initialContentKey: win.initialContentKey || win.id // Important for re-creating content
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
            // Add other relevant global states here (e.g., tempo from Tone.Transport.bpm.value)
            tempo: Tone.Transport.bpm.value, // Capture tempo
        };
    } catch (error) {
        console.error("[State _getCurrentStateSnapshot] Error creating state snapshot:", error);
        if(appServices.showNotification) appServices.showNotification("Error capturing state for undo. Undo might be unreliable.", "error", 4000);
        return null; // Return null if snapshot fails
    }
}

async function _applyStateSnapshot(snapshot, isUndoRedo = true) {
    if (!snapshot) {
        console.error("[State _applyStateSnapshot] Attempted to apply a null snapshot.");
        if(appServices.showNotification) appServices.showNotification("Error applying state. State might be inconsistent.", "error", 4000);
        return;
    }
    try {
        appServices._isReconstructingDAW_flag = true; // Prevent further undo captures during apply

        // Stop playback and clear transport before major state changes
        if (Tone.Transport.state === 'started' && appServices.stopPlayback) {
            appServices.stopPlayback();
        }
        Tone.Transport.cancel(0); // Clear all scheduled Tone.js events

        // 1. Dispose existing tracks and clear array
        tracks.forEach(track => track.dispose());
        tracks = [];

        // 2. Close all existing windows (silently, without capturing undo)
        openWindowsMap.forEach(win => { if (win.element) win.close(true); });
        openWindowsMap.clear();

        // 3. Apply global settings from snapshot
        highestZ = snapshot.highestZ || 100;
        trackIdCounter = snapshot.trackIdCounter || 0;
        masterGainValueState = snapshot.masterGainValue !== undefined ? snapshot.masterGainValue : Tone.dbToGain(0);
        if (appServices.setMasterVolume) appServices.setMasterVolume(masterGainValueState);

        Tone.Transport.bpm.value = snapshot.tempo || 120;
        if (appServices.updateTaskbarTempoDisplay) appServices.updateTaskbarTempoDisplay(snapshot.tempo || 120);


        // 4. Reconstruct Master Effects
        masterEffectsChainState = JSON.parse(JSON.stringify(snapshot.masterEffectsChain || []));
        if (appServices.clearAllMasterEffectNodes) appServices.clearAllMasterEffectNodes(); // Clear existing audio nodes
        for (const effectState of masterEffectsChainState) {
            if (appServices.addMasterEffectToAudio) { // Ensure this service adds to audio engine only
                await appServices.addMasterEffectToAudio(effectState.id, effectState.type, effectState.params);
                // Bypass state should be handled by audio module if it's part of initial setup
            }
        }
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();


        // 5. Reconstruct Tracks
        for (const trackData of snapshot.tracks) {
            if (trackData) {
                // The addTrackToStateInternal should NOT capture undo during this phase.
                // Pass 'false' for captureUndo if the function signature allows, or manage via _isReconstructingDAW_flag
                const newTrack = addTrackToStateInternal(trackData.type, trackData, false, appServices);
                // Track constructor should handle applying its detailed state, including effects, sequences, clips.
            }
        }

        // 6. Reconstruct Windows (after tracks, as some windows depend on track data)
        for (const winState of snapshot.openWindows) {
            if (winState) {
                // Use a mapping or switch to call the correct 'open' function based on initialContentKey or id pattern
                let openedWindow = null;
                if (winState.id === 'soundBrowser' && appServices.openSoundBrowserWindow) openedWindow = appServices.openSoundBrowserWindow(null, winState);
                else if (winState.id === 'mixer' && appServices.openMixerWindow) openedWindow = appServices.openMixerWindow(winState);
                else if (winState.id === 'timeline' && appServices.openArrangementWindow) openedWindow = appServices.openArrangementWindow(null, winState);
                else if (winState.id === 'globalControls' && appServices.openGlobalControlsWindow) {
                    // Global controls might need special handling if its content is static
                    appServices.openGlobalControlsWindow(() => {}, winState); // Empty callback
                } else if (winState.id === 'masterEffectsRack' && appServices.openMasterEffectsRackWindow) {
                    openedWindow = appServices.openMasterEffectsRackWindow(winState);
                } else if (winState.id.startsWith('trackInspector-')) {
                    const trackId = winState.id.split('-')[1];
                    if (getTrackByIdState(trackId) && appServices.openTrackInspectorWindow) openedWindow = appServices.openTrackInspectorWindow(trackId, winState);
                } else if (winState.id.startsWith('effectsRack-')) {
                    const trackId = winState.id.split('-')[1];
                    if (getTrackByIdState(trackId) && appServices.openTrackEffectsRackWindow) openedWindow = appServices.openTrackEffectsRackWindow(trackId, winState);
                } else if (winState.id.startsWith('sequencer-')) {
                    const trackId = winState.id.split('-')[1];
                    if (getTrackByIdState(trackId) && appServices.openSequencerWindow) openedWindow = appServices.openSequencerWindow(trackId, winState);
                }
                // SnugWindow's constructor or an applyState method should handle position, size, zIndex, minimized state.
                if (openedWindow && openedWindow.element) { // Ensure window was created and has an element
                    if (typeof openedWindow.applyState === 'function') { // If SnugWindow has applyState
                         openedWindow.applyState(winState);
                    } else { // Manual application if no applyState
                        openedWindow.element.style.left = winState.left;
                        openedWindow.element.style.top = winState.top;
                        openedWindow.element.style.width = winState.width;
                        openedWindow.element.style.height = winState.height;
                        openedWindow.element.style.zIndex = winState.zIndex;
                        if (winState.isMinimized) openedWindow.minimize(true);
                        else if (winState.isMaximized) openedWindow.toggleMaximize(); // This should handle restoreState
                    }
                }
            }
        }
        
        // 7. Restore other global UI states
        activeSequencerTrackId = snapshot.activeSequencerTrackId || null;
        // For solo and arm, re-apply through setters to ensure UI and audio routing updates
        setSoloedTrackIdState(snapshot.soloedTrackId || null); // This will trigger updates
        setArmedTrackIdState(snapshot.armedTrackId || null);   // This will trigger updates
        setPlaybackModeState(snapshot.globalPlaybackMode || 'sequencer');


        // 8. Refresh UI elements that depend on the new state
        if (appServices.updateMixerWindow) appServices.updateMixerWindow();
        if (appServices.updateArrangementView) appServices.updateArrangementView();
        if (appServices.updateSoundBrowserDisplayForLibrary) appServices.updateSoundBrowserDisplayForLibrary();
        if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI();

        // Re-schedule playback for all tracks based on the new state
        tracks.forEach(track => {
            if (typeof track.recreateToneSequence === 'function') track.recreateToneSequence(false); // false = don't auto-play
            // For timeline-based tracks, ensure clips are re-scheduled if necessary
            if (track.type === 'Audio' && typeof track.scheduleTimelinePlayback === 'function') {
                 track.scheduleTimelinePlayback(Tone.Transport.seconds, globalPlaybackMode);
            }
        });


    } catch (error) {
        console.error("[State _applyStateSnapshot] Error applying state snapshot:", error);
        if (appServices.showNotification) appServices.showNotification("Error restoring state. Application might be unstable.", "error", 5000);
    } finally {
        appServices._isReconstructingDAW_flag = false;
    }
}


export function captureStateForUndoInternal(actionName) {
    if (appServices._isReconstructingDAW_flag) return; // Don't capture during reconstruction

    const snapshot = _getCurrentStateSnapshot(actionName);
    if (snapshot) {
        undoStack.push(snapshot);
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift(); // Limit history size
        }
        redoStack = []; // Clear redo stack on new action
        if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI();
        // console.log(`[State Undo] Captured: ${actionName}. Stack size: ${undoStack.length}`);
    }
}

export async function undoLastActionInternal() {
    if (appServices._isReconstructingDAW_flag || undoStack.length === 0) return;
    const lastState = undoStack.pop();
    const currentStateForRedo = _getCurrentStateSnapshot(`Redo state for: ${lastState.actionName}`); // Capture current state for redo

    if (currentStateForRedo) redoStack.push(currentStateForRedo);
    if (redoStack.length > Constants.MAX_HISTORY_STATES) redoStack.shift();
    
    await _applyStateSnapshot(lastState, true); // true for isUndoRedo
    if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI();
    if (appServices.showNotification) appServices.showNotification(`Undid: ${lastState.actionName}`, "info", 1500);
}

export async function redoLastActionInternal() {
    if (appServices._isReconstructingDAW_flag || redoStack.length === 0) return;
    const nextState = redoStack.pop();
    const currentStateForUndo = _getCurrentStateSnapshot(`Undo state for: ${nextState.actionName}`); // Capture current state for undo

    if (currentStateForUndo) undoStack.push(currentStateForUndo);
    if (undoStack.length > Constants.MAX_HISTORY_STATES) undoStack.shift();

    await _applyStateSnapshot(nextState, true); // true for isUndoRedo
    if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI();
    if (appServices.showNotification) appServices.showNotification(`Redid: ${nextState.actionName}`, "info", 1500);
}

// --- Project Data Management ---
export function gatherProjectDataInternal() {
    try {
        const projectData = {
            version: Constants.APP_VERSION,
            projectName: "My SnugOS Project", // Allow user to set this later
            createdAt: new Date().toISOString(),
            globalSettings: {
                tempo: Tone.Transport.bpm.value,
                masterVolume: masterGainValueState, // Linear gain
                playbackMode: globalPlaybackMode,
                // Potentially other global settings like time signature if implemented
                activeSequencerTrackId: activeSequencerTrackId,
                soloedTrackId: soloedTrackId,
                armedTrackId: armedTrackId,
                selectedTimelineClipInfo: selectedTimelineClipInfoGlobal,
            },
            masterEffectsChain: masterEffectsChainState.map(effect => ({
                id: effect.id, type: effect.type,
                params: effect.params ? JSON.parse(JSON.stringify(effect.params)) : {}, // Deep clone params
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
        if (appServices.showNotification) appServices.showNotification("Error preparing project data for saving.", "error", 4000);
        return null;
    }
}

export async function reconstructDAWInternal(projectData) {
    if (!projectData) {
        if (appServices.showNotification) appServices.showNotification("Cannot load project: No data provided.", "error");
        return;
    }
    console.log("[State reconstructDAWInternal] Starting project reconstruction...");
    appServices._isReconstructingDAW_flag = true; // Set flag

    try {
        // 0. Reset undo/redo stacks
        undoStack = [];
        redoStack = [];
        if(appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI();

        // 1. Stop playback & clear transport
        if (Tone.Transport.state === 'started' && appServices.stopPlayback) {
            appServices.stopPlayback();
        }
        Tone.Transport.cancel(0);

        // 2. Close all existing windows and clear tracks (without triggering undo)
        openWindowsMap.forEach(win => win.close(true)); // true for silent close
        openWindowsMap.clear();
        tracks.forEach(track => track.dispose()); // Dispose existing Tone.js objects
        tracks = [];
        trackIdCounter = 0; // Reset counter, will be updated by max ID from project tracks

        // 3. Apply Global Settings
        if (projectData.globalSettings) {
            Tone.Transport.bpm.value = projectData.globalSettings.tempo || 120;
            if (appServices.updateTaskbarTempoDisplay) appServices.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);

            masterGainValueState = projectData.globalSettings.masterVolume !== undefined ? projectData.globalSettings.masterVolume : Tone.dbToGain(0);
            if (appServices.setMasterVolume) appServices.setMasterVolume(masterGainValueState);
            
            globalPlaybackMode = projectData.globalSettings.playbackMode || 'sequencer';
            if(appServices.onPlaybackModeChange) appServices.onPlaybackModeChange(globalPlaybackMode);

            activeSequencerTrackId = projectData.globalSettings.activeSequencerTrackId || null;
            soloedTrackId = projectData.globalSettings.soloedTrackId || null;
            armedTrackId = projectData.globalSettings.armedTrackId || null;
            selectedTimelineClipInfoGlobal = projectData.globalSettings.selectedTimelineClipInfo || { trackId: null, clipId: null };
        }

        // 4. Reconstruct Master Effects
        masterEffectsChainState = []; // Clear current state
        if (appServices.clearAllMasterEffectNodes) appServices.clearAllMasterEffectNodes(); // Clear audio nodes
        if (projectData.masterEffectsChain) {
            for (const effectState of projectData.masterEffectsChain) {
                masterEffectsChainState.push(JSON.parse(JSON.stringify(effectState))); // Add to state
                if (appServices.addMasterEffectToAudio) { // This adds to audio engine
                    await appServices.addMasterEffectToAudio(effectState.id, effectState.type, effectState.params);
                    // TODO: Handle bypass state in audio module when effect is added/reconstructed
                    // if (effectState.isBypassed && appServices.toggleBypassMasterEffectAudio) {
                    // appServices.toggleBypassMasterEffectAudio(effectState.id, true);
                    // }
                }
            }
        }
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();


        // 5. Reconstruct Tracks
        let maxTrackId = 0;
        if (projectData.tracks) {
            for (const trackData of projectData.tracks) {
                if (trackData) {
                    // Add track to state without capturing undo, passing appServices
                    const newTrack = addTrackToStateInternal(trackData.type, trackData, false, appServices);
                    if (newTrack && newTrack.id > maxTrackId) maxTrackId = newTrack.id;
                }
            }
        }
        trackIdCounter = maxTrackId; // Ensure new tracks get unique IDs

        // 6. Reconstruct Windows
        highestZ = 100; // Reset Z-index base
        if (projectData.windowStates) {
            // Sort windows by zIndex to restore focus order (optional but good)
            const sortedWindows = projectData.windowStates.sort((a,b) => (a.zIndex || 0) - (b.zIndex || 0));

            for (const winState of sortedWindows) {
                if (winState) {
                    // Use a mapping or switch to call the correct 'open' function
                    let openedWindow = null;
                    if (winState.id === 'soundBrowser' && appServices.openSoundBrowserWindow) openedWindow = appServices.openSoundBrowserWindow(null, winState);
                    else if (winState.id === 'mixer' && appServices.openMixerWindow) openedWindow = appServices.openMixerWindow(winState);
                    else if (winState.id === 'timeline' && appServices.openArrangementWindow) openedWindow = appServices.openArrangementWindow(null, winState);
                    else if (winState.id === 'globalControls' && appServices.openGlobalControlsWindow) appServices.openGlobalControlsWindow(() => {}, winState);
                    else if (winState.id === 'masterEffectsRack' && appServices.openMasterEffectsRackWindow) openedWindow = appServices.openMasterEffectsRackWindow(winState);
                    else if (winState.id.startsWith('trackInspector-')) {
                        const trackId = winState.id.split('-')[1];
                        if (getTrackByIdState(trackId) && appServices.openTrackInspectorWindow) openedWindow = appServices.openTrackInspectorWindow(trackId, winState);
                    } else if (winState.id.startsWith('effectsRack-')) {
                        const trackId = winState.id.split('-')[1];
                        if (getTrackByIdState(trackId) && appServices.openTrackEffectsRackWindow) openedWindow = appServices.openTrackEffectsRackWindow(trackId, winState);
                    } else if (winState.id.startsWith('sequencer-')) {
                        const trackId = winState.id.split('-')[1];
                        if (getTrackByIdState(trackId) && appServices.openSequencerWindow) openedWindow = appServices.openSequencerWindow(trackId, winState);
                    }
                    // SnugWindow's constructor or an applyState method should handle detailed state
                     if (openedWindow && openedWindow.element && typeof openedWindow.applyState === 'function') {
                         openedWindow.applyState(winState); // Let the window instance apply its detailed state
                     }
                    if (winState.zIndex && winState.zIndex > highestZ) highestZ = winState.zIndex;
                }
            }
        }
        // After all windows are opened, ensure focus and taskbar states are correct
        const topWindowId = openWindowsMap.size > 0 ? Array.from(openWindowsMap.values()).sort((a, b) => (parseInt(b.element.style.zIndex) || 0) - (parseInt(a.element.style.zIndex) || 0))[0]?.id : null;
        if(topWindowId && getWindowByIdState(topWindowId)) getWindowByIdState(topWindowId).focus(true); // Focus top window silently

        // 7. Final UI updates
        if (appServices.updateMixerWindow) appServices.updateMixerWindow();
        if (appServices.updateArrangementView) appServices.updateArrangementView(); // For timeline
        if (appServices.updateSoundBrowserDisplayForLibrary) appServices.updateSoundBrowserDisplayForLibrary();
        
        // Apply solo and arm states after all tracks are loaded
        tracks.forEach(t => {
            if (t.id === soloedTrackId) t.isSoloed = true; else t.isSoloed = false;
            if (t.id === armedTrackId) t.isArmedForRec = true; else t.isArmedForRec = false;
            if(typeof t.updateSoloState === 'function') t.updateSoloState(soloedTrackId); // Ensures audio routing for solo
        });


        if (appServices.showNotification) appServices.showNotification(`Project "${projectData.projectName || 'Untitled'}" loaded.`, "success");
        console.log("[State reconstructDAWInternal] Project reconstruction complete.");

    } catch (error) {
        console.error("[State reconstructDAWInternal] Error reconstructing project:", error);
        if (appServices.showNotification) appServices.showNotification("Error loading project. Project might be corrupted or incompatible.", "error", 5000);
    } finally {
        appServices._isReconstructingDAW_flag = false; // Clear flag
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
        a.download = `snugos-project-${timestamp}.snug`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (appServices.showNotification) appServices.showNotification("Project saved successfully!", "success");
    } catch (error) {
        console.error("[State saveProjectInternal] Error saving project:", error);
        if (appServices.showNotification) appServices.showNotification("Error saving project. See console for details.", "error");
    }
}

export function loadProjectInternal() {
    const fileInput = document.getElementById('file-input-project'); // Use dedicated input from index.html
    if (fileInput) {
        fileInput.onchange = async (event) => {
            if (event.target.files && event.target.files[0]) {
                await handleProjectFileLoadInternal(event.target.files[0]);
                fileInput.value = ''; // Reset input for subsequent loads
            }
        };
        fileInput.click();
    } else {
        if (appServices.showNotification) appServices.showNotification("Error: Project file input not found.", "error");
    }
}

export async function handleProjectFileLoadInternal(file) {
    if (!file) return;
    if (appServices.showConfirmationDialog) {
        appServices.showConfirmationDialog("Loading a new project will discard unsaved changes. Continue?", async () => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const projectData = JSON.parse(e.target.result);
                    await reconstructDAWInternal(projectData);
                } catch (error) {
                    console.error("Error parsing or loading project file:", error);
                    if (appServices.showNotification) appServices.showNotification("Failed to load project file. It might be corrupt or invalid.", "error");
                }
            };
            reader.onerror = () => {
                 if (appServices.showNotification) appServices.showNotification("Error reading project file.", "error");
            };
            reader.readAsText(file);
        });
    }
}

export async function exportToWavInternal() {
    if (!appServices.initAudioContextAndMasterMeter || !appServices.getActualMasterGainNode) {
         if (appServices.showNotification) appServices.showNotification("Audio system not ready for export.", "error");
        return;
    }
    await appServices.initAudioContextAndMasterMeter(true); // Ensure audio context is running

    try {
        if (Tone.Transport.state === 'started' && appServices.stopPlayback) {
            appServices.stopPlayback(); // Stop current playback
        }
        Tone.Transport.cancel(0); // Clear any scheduled events

        // Determine the total duration of the project by finding the end of the last clip/sequence
        let projectDuration = 0;
        tracks.forEach(track => {
            track.timelineClips.forEach(clip => {
                projectDuration = Math.max(projectDuration, clip.startTime + clip.duration);
            });
            // Consider sequence lengths if not represented as clips directly
            // track.sequences.forEach(seq => { /* ... if sequences contribute to duration ... */});
        });

        if (projectDuration === 0) {
            if (appServices.showNotification) appServices.showNotification("Project is empty. Nothing to export.", "info");
            return;
        }
        projectDuration = Math.min(projectDuration + 2, 600); // Add a 2s tail, max 10 mins for sanity

        if (appServices.showNotification) appServices.showNotification(`Exporting ${projectDuration.toFixed(1)}s to WAV... Please wait.`, "info", projectDuration * 1000 + 2000);

        const masterOutputNode = appServices.getActualMasterGainNode(); // Get the node before final destination
        if (!masterOutputNode) {
            throw new Error("Master output node is not available for recording export.");
        }

        // Temporarily disconnect masterOutputNode from Tone.Destination to avoid double output during offline render
        // Note: This can be tricky if Tone.Destination is the only output.
        // A safer approach might be to use an OfflineAudioContext if Tone.js supports it easily,
        // or ensure the recorder captures from the correct point. For now, assume direct capture.

        const recorder = new Tone.Recorder();
        masterOutputNode.connect(recorder);

        // Prepare tracks for offline rendering
        tracks.forEach(track => {
            if (typeof track.prepareForOfflineRender === 'function') track.prepareForOfflineRender();
            if (typeof track.recreateToneSequence === 'function') track.recreateToneSequence(false); // Rebuild sequences without auto-start
            if (typeof track.scheduleTimelinePlayback === 'function') {
                 track.scheduleTimelinePlayback(0, 'timeline'); // Schedule all timeline clips
            }
        });
        
        recorder.start();
        Tone.Transport.position = 0;
        Tone.Transport.start();

        await Tone.Offline(() => {
            // This block runs in an offline context, scheduling everything as if it were real-time.
            // However, with Tone.Recorder, we typically record in real-time from the main context.
            // So, we'll use a delay based on projectDuration for the main context.
        }, projectDuration); // This might not be how Tone.Recorder is intended with Offline.
                             // Let's rely on real-time recording for now and stop manually.

        // Wait for projectDuration in real-time then stop
        await new Promise(resolve => setTimeout(resolve, projectDuration * 1000));

        const recording = await recorder.stop();
        Tone.Transport.stop(); // Stop transport after recording

        // Clean up: disconnect recorder, dispose
        if (masterOutputNode && !masterOutputNode.disposed && recorder && !recorder.disposed) {
            try { masterOutputNode.disconnect(recorder); } catch(e) {/* ignore */}
        }
        if (recorder && !recorder.disposed) recorder.dispose();
        
        // Re-connect masterOutputNode to destination if it was disconnected (not done in this simplified version)

        // Restore transport position if needed
        // Tone.Transport.position = 0; (Or previous position)

        const url = URL.createObjectURL(recording);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `snugos-export-${timestamp}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (appServices.showNotification) appServices.showNotification("Export to WAV successful!", "success");

    } catch (error) {
        console.error("[State exportToWavInternal] Error exporting WAV:", error);
        if (appServices.showNotification) appServices.showNotification(`Error exporting WAV: ${error.message}. See console.`, "error", 5000);
        // Ensure transport is stopped on error
        Tone.Transport.stop();
        Tone.Transport.cancel(0);
    }
}
