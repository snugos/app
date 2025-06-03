// js/state.js - Application State Management (MODIFIED - Ensured appServices reference)
import * as Constants from './constants.js';
import { Track } from './Track.js'; 
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';

// --- Centralized State Variables ---
let tracks = [];
let trackIdCounter = 0;

let openWindowsMap = new Map(); 
let highestZ = 100;

let masterEffectsChainState = []; 
let masterGainValueState = (typeof Tone !== 'undefined' && Tone.dbToGain) ? Tone.dbToGain(0) : 0.707;

let midiAccessGlobal = null;
let activeMIDIInputGlobal = null;

let loadedZipFilesGlobal = {}; 
let soundLibraryFileTreesGlobal = {}; 
let currentLibraryNameGlobal = null;
// currentSoundFileTreeGlobal is derived, not independent state: soundLibraryFileTreesGlobal[currentLibraryNameGlobal]
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

const THEME_STORAGE_KEY = 'snugosThemePreference_v1';
let currentTheme = 'dark'; // Default, will be overridden by localStorage if present

let undoStack = [];
let redoStack = [];

// This will be the single appServices instance from main.js
let appServicesInstance = {}; 

// --- Initialization ---
export function initializeStateModule(services) {
    appServicesInstance = services; // Use the direct reference
    
    // Load theme preference after appServices (which contains showNotification) is set.
    try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            currentTheme = savedTheme;
        }
    } catch (e) {
        console.warn("[State] Could not read theme from localStorage:", e.message);
    }
    // UI update for theme will be handled by main.js or UI module after state is initialized
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
export const getClipboardDataState = () => clipboardDataGlobal;
export const getActiveSequencerTrackIdState = () => activeSequencerTrackId;
export const getSoloedTrackIdState = () => soloedTrackId;
export const getArmedTrackIdState = () => armedTrackId;
export const isTrackRecordingState = (trackId) => isRecordingGlobal && recordingTrackIdGlobal === trackId;
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

export function setMasterGainValueState(value) { 
    masterGainValueState = value;
    // Audio actual update is handled by appServices.setMasterVolume in main.js calling AudioModule
}

export function setMidiAccessState(midi) { midiAccessGlobal = midi; }
export function setActiveMIDIInputState(deviceId) {
    activeMIDIInputGlobal = deviceId;
    if (appServicesInstance.updateMIDIIndicator) appServicesInstance.updateMIDIIndicator(deviceId !== 'none' && deviceId !== null);
}
export function setLoadedZipFilesState(zipFiles) { loadedZipFilesGlobal = zipFiles; }
export function setSoundLibraryFileTreesState(trees) { soundLibraryFileTreesGlobal = trees; }
export function setCurrentLibraryNameState(name) {
    currentLibraryNameGlobal = name;
    currentSoundBrowserPathGlobal = []; 
    if (appServicesInstance.updateSoundBrowserDisplayForLibrary) {
        appServicesInstance.updateSoundBrowserDisplayForLibrary(name);
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
export function setClipboardDataState(data) { clipboardDataGlobal = data; }

export function setActiveSequencerTrackIdState(trackId) {
    activeSequencerTrackId = trackId;
}
export function setSoloedTrackIdState(trackId) {
    const previouslySoloed = soloedTrackId;
    soloedTrackId = (soloedTrackId === trackId) ? null : trackId; 

    tracks.forEach(t => {
        const isNowThisTrackSoloed = (t.id === soloedTrackId);
        if (t.isSoloed !== isNowThisTrackSoloed || (previouslySoloed && t.id === previouslySoloed && !isNowThisTrackSoloed)) {
            t.isSoloed = isNowThisTrackSoloed;
            if (typeof t.updateSoloState === 'function') t.updateSoloState(soloedTrackId); // Track updates its own audio
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
    if (!isRec && recordingTrackIdGlobal) { 
        // Actual audio stop is handled by AudioModule via appServices
        recordingTrackIdGlobal = null;
    }
    if (appServicesInstance.updateRecordButtonUI) appServicesInstance.updateRecordButtonUI(isRecordingGlobal, !!armedTrackId);
}
export function setRecordingTrackIdState(trackId) { recordingTrackIdGlobal = trackId; }
export function setRecordingStartTimeState(time) { recordingStartTime = time; }

export function setPlaybackModeState(mode) { 
    if (globalPlaybackMode !== mode) {
        globalPlaybackMode = mode;
        if (appServicesInstance.onPlaybackModeChange) {
            appServicesInstance.onPlaybackModeChange(mode);
        }
        if (typeof Tone !== 'undefined' && Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) {
            if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Playback mode changed. Transport stopped.`, "info", 2000);
            appServicesInstance.stopPlayback();
        }
    }
}
export function setSelectedTimelineClipInfoState(trackId, clipId) {
    selectedTimelineClipInfoGlobal = { trackId, clipId };
    if(appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
}
export function setCurrentThemeState(theme) {
    if (currentTheme !== theme && (theme === 'light' || theme === 'dark')) {
        currentTheme = theme;
        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch(e) {
            console.warn("[State] Could not save theme to localStorage:", e.message);
        }
        if (appServicesInstance.updateTheme) appServicesInstance.updateTheme(theme); 
    }
}

// --- Track Management ---
export function addTrackToStateInternal(type, initialData = null, captureUndo = true, servicesPassedToTrack) {
    if (!servicesPassedToTrack || !servicesPassedToTrack.getTrackById) { 
        console.error("[State addTrackToStateInternal] appServices for Track constructor not properly provided!");
        return null;
    }
    trackIdCounter++;
    const newTrack = new Track(trackIdCounter, type, initialData, servicesPassedToTrack); // Pass full appServices here
    tracks.push(newTrack);

    if (captureUndo && appServicesInstance.captureStateForUndoInternal) {
        appServicesInstance.captureStateForUndoInternal(`Add Track: ${newTrack.name}`);
    }
    if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
    if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline(); // Use renderTimeline
    return newTrack;
}

export function removeTrackFromStateInternal(trackId, captureUndo = true) {
    const trackIndex = tracks.findIndex(t => t.id.toString() === trackId.toString());
    if (trackIndex > -1) {
        const trackToRemove = tracks[trackIndex];
        if (captureUndo && appServicesInstance.captureStateForUndoInternal) {
            appServicesInstance.captureStateForUndoInternal(`Remove Track: ${trackToRemove.name}`);
        }
        if (typeof trackToRemove.dispose === 'function') {
            trackToRemove.dispose(); 
        }
        tracks.splice(trackIndex, 1);

        if (soloedTrackId === trackId) setSoloedTrackIdState(null); 
        if (armedTrackId === trackId) setArmedTrackIdState(null);   
        if (activeSequencerTrackId === trackId) setActiveSequencerTrackIdState(null);
        if (recordingTrackIdGlobal === trackId) {
            setIsRecordingState(false); 
        }

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
        params: effectInstanceParams,
        isBypassed: false
    });
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
            if (!target[keys[i]] || typeof target[keys[i]] !== 'object') target[keys[i]] = {}; 
            target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
        // If the param was 'isBypassed', the audio chain needs reevaluation
        if (paramPath === 'isBypassed' && appServicesInstance._rechainMasterEffectsAudio) {
           // This is handled by appServices.toggleBypassMasterEffect calling AudioModule._rechainMasterEffectsAudio
        }
    }
}
export function reorderMasterEffectInState(effectId, newIndex) {
    const effectIndex = masterEffectsChainState.findIndex(e => e.id === effectId);
    if (effectIndex === -1) return;
    const [effect] = masterEffectsChainState.splice(effectIndex, 1);
    masterEffectsChainState.splice(newIndex, 0, effect);
}
export function setMasterEffectsState(effects) { 
    masterEffectsChainState = effects;
}

// --- Undo/Redo ---
function _getCurrentStateSnapshot(actionName) {
    if (typeof Tone === 'undefined') { // Guard against Tone not being defined
        console.error("[State _getCurrentStateSnapshot] Tone is not defined. Cannot capture BPM. Snapshot might be incomplete.");
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error capturing undo state: Tone.js missing.", "error");
        // Allow snapshot without Tone-dependent parts if necessary, or return null
        // For now, let's proceed but log the issue. Some state might be lost.
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
    if (typeof Tone === 'undefined') {
        console.error("[State _applyStateSnapshot] Tone is not defined. Cannot apply snapshot requiring Tone.js operations.");
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Critical error applying state: Tone.js missing.", "error");
        return; // Cannot proceed without Tone
    }
    try {
        if (appServicesInstance) appServicesInstance._isReconstructingDAW_flag = true;

        if (Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) {
            appServicesInstance.stopPlayback();
        }
        Tone.Transport.cancel(0); 

        tracks.forEach(track => track.dispose());
        tracks = [];

        openWindowsMap.forEach(win => { if (win.element) win.close(true); });
        openWindowsMap.clear();

        highestZ = snapshot.highestZ || 100;
        trackIdCounter = snapshot.trackIdCounter || 0;
        masterGainValueState = snapshot.masterGainValue !== undefined ? snapshot.masterGainValue : Tone.dbToGain(0);
        if (appServicesInstance.setMasterVolume) appServicesInstance.setMasterVolume(masterGainValueState);

        Tone.Transport.bpm.value = snapshot.tempo || 120;
        if (appServicesInstance.updateTaskbarTempoDisplay) appServicesInstance.updateTaskbarTempoDisplay(snapshot.tempo || 120);

        masterEffectsChainState = [];
        if (appServicesInstance.clearAllMasterEffectNodes) appServicesInstance.clearAllMasterEffectNodes();
        if(snapshot.masterEffectsChain) {
            for (const effectState of snapshot.masterEffectsChain) {
                masterEffectsChainState.push(JSON.parse(JSON.stringify(effectState)));
                if (appServicesInstance.addMasterEffectToAudio) { 
                    await appServicesInstance.addMasterEffectToAudio(effectState.id, effectState.type, effectState.params);
                    if (effectState.isBypassed && AudioModule && typeof AudioModule._rechainMasterEffectsAudio === 'function') {
                        // The bypass state is part of effectState.params. Audio module should read it.
                        // Rechain will apply it.
                        AudioModule._rechainMasterEffectsAudio();
                    }
                }
            }
        }
        if (appServicesInstance.updateMasterEffectsRackUI) appServicesInstance.updateMasterEffectsRackUI();

        for (const trackData of snapshot.tracks) {
            if (trackData) {
                addTrackToStateInternal(trackData.type, trackData, false, appServicesInstance);
            }
        }

        for (const winState of snapshot.openWindows) {
            if (winState) {
                let openedWindow = null;
                if (winState.id === 'soundBrowser' && appServicesInstance.openSoundBrowserWindow) openedWindow = appServicesInstance.openSoundBrowserWindow(null, winState);
                else if (winState.id === 'mixer' && appServicesInstance.openMixerWindow) openedWindow = appServicesInstance.openMixerWindow(winState);
                else if (winState.id === 'timeline' && appServicesInstance.openArrangementWindow) openedWindow = appServicesInstance.openArrangementWindow(null, winState);
                else if (winState.id === 'globalControls' && appServicesInstance.openGlobalControlsWindow) appServicesInstance.openGlobalControlsWindow(() => {}, winState);
                else if (winState.id === 'masterEffectsRack' && appServicesInstance.openMasterEffectsRackWindow) openedWindow = appServicesInstance.openMasterEffectsRackWindow(winState);
                else if (winState.id.startsWith('trackInspector-')) {
                    const trackId = winState.id.split('-')[1];
                    if (getTrackByIdState(trackId) && appServicesInstance.openTrackInspectorWindow) openedWindow = appServicesInstance.openTrackInspectorWindow(trackId, winState);
                } else if (winState.id.startsWith('effectsRack-')) {
                    const trackId = winState.id.split('-')[1];
                    if (getTrackByIdState(trackId) && appServicesInstance.openTrackEffectsRackWindow) openedWindow = appServicesInstance.openTrackEffectsRackWindow(trackId, winState);
                } else if (winState.id.startsWith('sequencer-')) {
                    const trackId = winState.id.split('-')[1];
                    if (getTrackByIdState(trackId) && appServicesInstance.openSequencerWindow) openedWindow = appServicesInstance.openSequencerWindow(trackId, winState);
                }
                if (openedWindow && openedWindow.element && typeof openedWindow.applyState === 'function') {
                     openedWindow.applyState(winState);
                }
            }
        }
        
        activeSequencerTrackId = snapshot.activeSequencerTrackId || null;
        setSoloedTrackIdState(snapshot.soloedTrackId || null); 
        setArmedTrackIdState(snapshot.armedTrackId || null);   
        setPlaybackModeState(snapshot.globalPlaybackMode || 'sequencer');

        if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
        if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
        if (appServicesInstance.updateSoundBrowserDisplayForLibrary) appServicesInstance.updateSoundBrowserDisplayForLibrary();
        
        tracks.forEach(track => {
            if (typeof track.recreateToneSequence === 'function') track.recreateToneSequence(false);
            if (track.type === 'Audio' && typeof track.scheduleTimelinePlayback === 'function') {
                 track.scheduleTimelinePlayback(0, globalPlaybackMode); // Reschedule from start
            }
        });

    } catch (error) {
        console.error("[State _applyStateSnapshot] Error applying state snapshot:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error restoring state. Application might be unstable.", "error", 5000);
    } finally {
        if (appServicesInstance) appServicesInstance._isReconstructingDAW_flag = false;
        if (appServicesInstance.updateUndoRedoButtonsUI) appServicesInstance.updateUndoRedoButtonsUI(); // Ensure this is called AFTER flag is false
    }
}

export function captureStateForUndoInternal(actionName) {
    if (appServicesInstance._isReconstructingDAW_flag) return; 

    const snapshot = _getCurrentStateSnapshot(actionName);
    if (snapshot) {
        undoStack.push(snapshot);
        if (undoStack.length > Constants.MAX_HISTORY_STATES) {
            undoStack.shift(); 
        }
        redoStack = []; 
        if (appServicesInstance.updateUndoRedoButtonsUI) appServicesInstance.updateUndoRedoButtonsUI(snapshot, null);
    }
}

export async function undoLastActionInternal() {
    if (appServicesInstance._isReconstructingDAW_flag || undoStack.length === 0) return;
    const lastState = undoStack.pop();
    const currentStateForRedo = _getCurrentStateSnapshot(`Redo state for: ${lastState.actionName}`); 

    if (currentStateForRedo) redoStack.push(currentStateForRedo);
    if (redoStack.length > Constants.MAX_HISTORY_STATES) redoStack.shift();
    
    await _applyStateSnapshot(lastState, true); 
    if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Undid: ${lastState.actionName}`, "info", 1500);
}

export async function redoLastActionInternal() {
    if (appServicesInstance._isReconstructingDAW_flag || redoStack.length === 0) return;
    const nextState = redoStack.pop();
    const currentStateForUndo = _getCurrentStateSnapshot(`Undo state for: ${nextState.actionName}`); 

    if (currentStateForUndo) undoStack.push(currentStateForUndo);
    if (undoStack.length > Constants.MAX_HISTORY_STATES) undoStack.shift();

    await _applyStateSnapshot(nextState, true); 
    if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Redid: ${nextState.actionName}`, "info", 1500);
}

// --- Project Data Management ---
export function gatherProjectDataInternal() {
    // ... (Ensure Tone is defined before accessing Tone.Transport, same as in _getCurrentStateSnapshot)
    if (typeof Tone === 'undefined') {
        console.error("[State gatherProjectDataInternal] Tone is not defined. Cannot get BPM. Project data might be incomplete.");
        // Allow to proceed but tempo might be default or missing
    }
    try {
        const projectData = {
            version: Constants.APP_VERSION,
            projectName: "My SnugOS Project", 
            createdAt: new Date().toISOString(),
            globalSettings: {
                tempo: (typeof Tone !== 'undefined' && Tone.Transport) ? Tone.Transport.bpm.value : Constants.MIN_TEMPO,
                masterVolume: masterGainValueState, 
                playbackMode: globalPlaybackMode,
                activeSequencerTrackId: activeSequencerTrackId,
                soloedTrackId: soloedTrackId,
                armedTrackId: armedTrackId,
                selectedTimelineClipInfo: selectedTimelineClipInfoGlobal,
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
    // ... (same as response #56, ensure Tone guard for transport access)
    if (!projectData) {
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Cannot load project: No data provided.", "error");
        return;
    }
    if (typeof Tone === 'undefined') {
        console.error("[State reconstructDAWInternal] Tone is not defined. Cannot reconstruct project accurately.");
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Critical error: Tone.js missing. Cannot load project.", "error");
        return;
    }
    console.log("[State reconstructDAWInternal] Starting project reconstruction...");
    if(appServicesInstance) appServicesInstance._isReconstructingDAW_flag = true; 

    try {
        undoStack = []; redoStack = [];
        if(appServicesInstance.updateUndoRedoButtonsUI) appServicesInstance.updateUndoRedoButtonsUI(null, null);

        if (Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) {
            appServicesInstance.stopPlayback();
        }
        Tone.Transport.cancel(0);

        openWindowsMap.forEach(win => win.close(true)); 
        openWindowsMap.clear();
        tracks.forEach(track => track.dispose()); 
        tracks = [];
        trackIdCounter = 0; 

        if (projectData.globalSettings) {
            Tone.Transport.bpm.value = projectData.globalSettings.tempo || 120;
            if (appServicesInstance.updateTaskbarTempoDisplay) appServicesInstance.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
            masterGainValueState = projectData.globalSettings.masterVolume !== undefined ? projectData.globalSettings.masterVolume : Tone.dbToGain(0);
            if (appServicesInstance.setMasterVolume) appServicesInstance.setMasterVolume(masterGainValueState);
            globalPlaybackMode = projectData.globalSettings.playbackMode || 'sequencer';
            if(appServicesInstance.onPlaybackModeChange) appServicesInstance.onPlaybackModeChange(globalPlaybackMode);
            activeSequencerTrackId = projectData.globalSettings.activeSequencerTrackId || null;
            soloedTrackId = projectData.globalSettings.soloedTrackId || null;
            armedTrackId = projectData.globalSettings.armedTrackId || null;
            selectedTimelineClipInfoGlobal = projectData.globalSettings.selectedTimelineClipInfo || { trackId: null, clipId: null };
        }

        masterEffectsChainState = []; 
        if (appServicesInstance.clearAllMasterEffectNodes) appServicesInstance.clearAllMasterEffectNodes(); 
        if (projectData.masterEffectsChain) {
            for (const effectState of projectData.masterEffectsChain) {
                masterEffectsChainState.push(JSON.parse(JSON.stringify(effectState))); 
                if (appServicesInstance.addMasterEffectToAudio) { 
                    await appServicesInstance.addMasterEffectToAudio(effectState.id, effectState.type, effectState.params);
                    if (effectState.isBypassed && AudioModule && typeof AudioModule._rechainMasterEffectsAudio === 'function') {
                         AudioModule._rechainMasterEffectsAudio(); // Rechain will consider bypass state
                    }
                }
            }
        }
        if (appServicesInstance.updateMasterEffectsRackUI) appServicesInstance.updateMasterEffectsRackUI();

        let maxTrackId = 0;
        if (projectData.tracks) {
            for (const trackData of projectData.tracks) {
                if (trackData) {
                    const newTrack = addTrackToStateInternal(trackData.type, trackData, false, appServicesInstance);
                    if (newTrack && newTrack.id > maxTrackId) maxTrackId = newTrack.id;
                }
            }
        }
        trackIdCounter = maxTrackId; 

        highestZ = 100; 
        if (projectData.windowStates) {
            const sortedWindows = projectData.windowStates.sort((a,b) => (a.zIndex || 0) - (b.zIndex || 0));
            for (const winState of sortedWindows) {
                if (winState) {
                    let openedWindow = null;
                    if (winState.id === 'soundBrowser' && appServicesInstance.openSoundBrowserWindow) openedWindow = appServicesInstance.openSoundBrowserWindow(null, winState);
                    else if (winState.id === 'mixer' && appServicesInstance.openMixerWindow) openedWindow = appServicesInstance.openMixerWindow(winState);
                    else if (winState.id === 'timeline' && appServicesInstance.openArrangementWindow) openedWindow = appServicesInstance.openArrangementWindow(null, winState);
                    else if (winState.id === 'globalControls' && appServicesInstance.openGlobalControlsWindow) appServicesInstance.openGlobalControlsWindow(() => {}, winState);
                    else if (winState.id === 'masterEffectsRack' && appServicesInstance.openMasterEffectsRackWindow) openedWindow = appServicesInstance.openMasterEffectsRackWindow(winState);
                    else if (winState.id.startsWith('trackInspector-')) { /* ... */ }
                    else if (winState.id.startsWith('effectsRack-')) { /* ... */ }
                    else if (winState.id.startsWith('sequencer-')) { /* ... */ }
                    
                    if (openedWindow && openedWindow.element && typeof openedWindow.applyState === 'function') {
                         openedWindow.applyState(winState);
                    }
                    if (winState.zIndex && winState.zIndex > highestZ) highestZ = winState.zIndex;
                }
            }
        }
        const topWindowId = openWindowsMap.size > 0 ? Array.from(openWindowsMap.values()).sort((a, b) => (parseInt(b.element?.style.zIndex || "0") || 0) - (parseInt(a.element?.style.zIndex || "0") || 0))[0]?.id : null;
        if(topWindowId && getWindowByIdState(topWindowId)) getWindowByIdState(topWindowId).focus(true);

        if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
        if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
        if (appServicesInstance.updateSoundBrowserDisplayForLibrary) appServicesInstance.updateSoundBrowserDisplayForLibrary();
        
        tracks.forEach(t => {
            if (t.id.toString() === (soloedTrackId || "").toString()) t.isSoloed = true; else t.isSoloed = false;
            if (t.id.toString() === (armedTrackId || "").toString()) t.isArmedForRec = true; else t.isArmedForRec = false;
            if(typeof t.updateSoloState === 'function') t.updateSoloState(soloedTrackId);
        });

        if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Project "${projectData.projectName || 'Untitled'}" loaded.`, "success");
        console.log("[State reconstructDAWInternal] Project reconstruction complete.");

    } catch (error) {
        console.error("[State reconstructDAWInternal] Error reconstructing project:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error loading project. Project might be corrupted or incompatible.", "error", 5000);
    } finally {
        if(appServicesInstance) appServicesInstance._isReconstructingDAW_flag = false; 
    }
}

export function saveProjectInternal() { /* ... same as response #56 ... */ 
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
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Project saved successfully!", "success");
    } catch (error) {
        console.error("[State saveProjectInternal] Error saving project:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error saving project. See console for details.", "error");
    }
}
export function loadProjectInternal() { /* ... same as response #56 ... */
    const fileInput = document.getElementById('file-input-project'); 
    if (fileInput) {
        fileInput.onchange = async (event) => {
            if (event.target.files && event.target.files[0]) {
                await handleProjectFileLoadInternal(event.target.files[0]);
                fileInput.value = ''; 
            }
        };
        fileInput.click();
    } else {
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error: Project file input not found.", "error");
    }
}
export async function handleProjectFileLoadInternal(file) { /* ... same as response #56 ... */
    if (!file) return;
    if (appServicesInstance.showConfirmationDialog) {
        appServicesInstance.showConfirmationDialog("Loading a new project will discard unsaved changes. Continue?", async () => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const projectData = JSON.parse(e.target.result);
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
export async function exportToWavInternal() { /* ... same as response #56, ensure Tone is checked ... */
    if (typeof Tone === 'undefined') {
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Audio engine not ready for export (Tone.js missing).", "error");
        return;
    }
    if (!appServicesInstance.initAudioContextAndMasterMeter || !appServicesInstance.getActualMasterGainNode) {
         if (appServicesInstance.showNotification) appServicesInstance.showNotification("Audio system not ready for export.", "error");
        return;
    }
    await appServicesInstance.initAudioContextAndMasterMeter(true); 
    try {
        if (Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) {
            appServicesInstance.stopPlayback(); 
        }
        Tone.Transport.cancel(0); 
        let projectDuration = 0;
        tracks.forEach(track => {
            track.timelineClips.forEach(clip => {
                projectDuration = Math.max(projectDuration, clip.startTime + clip.duration);
            });
        });
        if (projectDuration === 0) {
            if (appServicesInstance.showNotification) appServicesInstance.showNotification("Project is empty. Nothing to export.", "info");
            return;
        }
        projectDuration = Math.min(projectDuration + 2, 600); 
        if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Exporting ${projectDuration.toFixed(1)}s to WAV... Please wait.`, "info", projectDuration * 1000 + 2000);
        const masterOutputNode = appServicesInstance.getActualMasterGainNode(); 
        if (!masterOutputNode) {
            throw new Error("Master output node is not available for recording export.");
        }
        const recorder = new Tone.Recorder();
        masterOutputNode.connect(recorder);
        tracks.forEach(track => {
            if (typeof track.prepareForOfflineRender === 'function') track.prepareForOfflineRender();
            if (typeof track.recreateToneSequence === 'function') track.recreateToneSequence(false); 
            if (typeof track.scheduleTimelinePlayback === 'function') {
                 track.scheduleTimelinePlayback(0, 'timeline'); 
            }
        });
        recorder.start();
        Tone.Transport.position = 0;
        Tone.Transport.start();
        await new Promise(resolve => setTimeout(resolve, projectDuration * 1000));
        const recording = await recorder.stop();
        Tone.Transport.stop(); 
        if (masterOutputNode && !masterOutputNode.disposed && recorder && !recorder.disposed) {
            try { masterOutputNode.disconnect(recorder); } catch(e) {/* ignore */}
        }
        if (recorder && !recorder.disposed) recorder.dispose();
        const url = URL.createObjectURL(recording);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `snugos-export-${timestamp}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Export to WAV successful!", "success");
    } catch (error) {
        console.error("[State exportToWavInternal] Error exporting WAV:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Error exporting WAV: ${error.message}. See console.`, "error", 5000);
        if (typeof Tone !== 'undefined' && Tone.Transport) { Tone.Transport.stop(); Tone.Transport.cancel(0); }
    }
}
