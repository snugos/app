// js/state.js - Application State Management
import * as Constants from './constants.js';
import { Track } from './Track.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
import {
    initAudioContextAndMasterMeter as audioInitAudioContextAndMasterMeter
} from './audio.js'; // Assuming audio.js is in the same root js/ folder

let tracks = [];
let trackIdCounter = 0;
let openWindowsMap = new Map();
let highestZ = 100;
let masterEffectsChainState = [];
let masterGainValueState = (typeof Tone !== 'undefined' && Tone.dbToGain) ? Tone.dbToGain(0) : 0.707;
let midiAccessGlobal = null;
let activeMIDIInputGlobal = null; // Can be a device ID string, or 'computerKeyboard', or null
let loadedZipFilesGlobal = {};
let soundLibraryFileTreesGlobal = {};
let currentLibraryNameGlobal = null;
let currentSoundFileTreeGlobal = null; // Derived from soundLibraryFileTreesGlobal[currentLibraryNameGlobal]
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
let currentTheme = 'dark';
let undoStack = [];
let redoStack = [];
let appServicesInstance = {}; // Populated by main.js

export function initializeStateModule(services) {
    appServicesInstance = services || {};
    try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            currentTheme = savedTheme;
        }
        // Trigger initial theme application if appServices is ready
        if (appServicesInstance.updateTheme) {
            appServicesInstance.updateTheme(currentTheme);
        }
    } catch (e) {
        console.warn("[State] Could not read/apply theme from localStorage:", e.message);
    }
    console.log("[State] State module initialized. AppServices keys:", Object.keys(appServicesInstance));
}

// --- Getters ---
export const getTracksState = () => tracks;
export const getTrackByIdState = (id) => tracks.find(t => t.id.toString() === id.toString());
export const getOpenWindowsState = () => openWindowsMap;
export const getWindowByIdState = (id) => openWindowsMap.get(id); // Used by appServices.getWindowById
export const getHighestZState = () => highestZ;
export const getMasterEffectsState = () => masterEffectsChainState; // Used by appServices.getMasterEffects
export const getMasterGainValueState = () => masterGainValueState; // Used by appServices.getMasterGainValue
export const getMidiAccessState = () => midiAccessGlobal; // Used by appServices.getMidiAccess
export const getActiveMIDIInputState = () => activeMIDIInputGlobal; // Used by appServices.getActiveMIDIInput
export const getLoadedZipFilesState = () => loadedZipFilesGlobal;
export const getSoundLibraryFileTreesState = () => soundLibraryFileTreesGlobal;
export const getCurrentLibraryNameState = () => currentLibraryNameGlobal;
export const getCurrentSoundFileTreeState = () => soundLibraryFileTreesGlobal[currentLibraryNameGlobal] || null;
export const getCurrentSoundBrowserPathState = () => currentSoundBrowserPathGlobal;
export const getPreviewPlayerState = () => previewPlayerGlobal;
export const getClipboardDataState = () => clipboardDataGlobal;
export const getArmedTrackIdState = () => armedTrackId;
export const getSoloedTrackIdState = () => soloedTrackId;
export const isTrackRecordingState = (trackId) => isRecordingGlobal && recordingTrackIdGlobal === trackId.toString(); // Ensure string comparison
export const isGlobalRecordingActiveState = () => isRecordingGlobal;
export const getRecordingTrackIdState = () => recordingTrackIdGlobal;
export const getRecordingStartTimeState = () => recordingStartTime;
export const getPlaybackModeState = () => globalPlaybackMode; // Used by appServices.getPlaybackMode
export const getSelectedTimelineClipInfoState = () => selectedTimelineClipInfoGlobal;
export const getCurrentThemeState = () => currentTheme;
export const getUndoStackState = () => undoStack;
export const getRedoStackState = () => redoStack;
export const getMasterEffectParamValue = (effectId, paramPath) => {
    const effect = masterEffectsChainState.find(e => e.id === effectId);
    if (effect && effect.params) {
        let value = effect.params; const keys = paramPath.split('.');
        for (const key of keys) { if (value && typeof value === 'object' && key in value) value = value[key]; else return undefined; }
        return value;
    } return undefined;
};

// --- Setters / Core Actions ---
export function addWindowToStoreState(id, windowInstance) { openWindowsMap.set(id, windowInstance); }
export function removeWindowFromStoreState(id) { openWindowsMap.delete(id); }
export function incrementHighestZState() { return ++highestZ; }
export function setHighestZState(value) { if (Number.isFinite(value) && value > highestZ) highestZ = value; }
export function setMasterGainValueState(value) {
    masterGainValueState = Number.isFinite(value) ? value : Tone.dbToGain(0);
    if (appServicesInstance.setMasterVolume) appServicesInstance.setMasterVolume(masterGainValueState);
}
export function setMidiAccessState(midi) { midiAccessGlobal = midi; }
export function setActiveMIDIInputState(inputPortOrTypeString) { // input can be MIDIInput object or string like 'computerKeyboard'
    activeMIDIInputGlobal = inputPortOrTypeString;
    const isActive = inputPortOrTypeString && inputPortOrTypeString !== 'none';
    if (appServicesInstance.uiElementsCache?.midiIndicatorGlobal) {
        appServicesInstance.uiElementsCache.midiIndicatorGlobal.classList.toggle('active', isActive && inputPortOrTypeString !== 'computerKeyboard');
    }
}
export function setLoadedZipFilesState(files) { loadedZipFilesGlobal = typeof files === 'object' && files !== null ? files : {}; }
export function setSoundLibraryFileTreesState(trees) { soundLibraryFileTreesGlobal = typeof trees === 'object' && trees !== null ? trees : {}; }
export function setCurrentLibraryNameState(name) {
    currentLibraryNameGlobal = name;
    currentSoundBrowserPathGlobal = [];
    currentSoundFileTreeGlobal = soundLibraryFileTreesGlobal[name] || null; // Update derived state
    if (appServicesInstance.updateSoundBrowserDisplayForLibrary) {
        appServicesInstance.updateSoundBrowserDisplayForLibrary(name);
    }
}
export function setCurrentSoundBrowserPathState(pathArray) {
    currentSoundBrowserPathGlobal = Array.isArray(pathArray) ? pathArray : [];
    let tempTree = soundLibraryFileTreesGlobal[currentLibraryNameGlobal];
    for (const folderName of currentSoundBrowserPathGlobal) {
        if (tempTree && tempTree[folderName] && tempTree[folderName].type === 'folder') {
            tempTree = tempTree[folderName].children;
        } else { tempTree = null; break; }
    }
    currentSoundFileTreeGlobal = tempTree;
    // UI update for path display is usually handled by renderSoundBrowserDirectory
}
export function pushToSoundBrowserPath(folderName) {
    currentSoundBrowserPathGlobal.push(folderName);
    if (currentSoundFileTreeGlobal && currentSoundFileTreeGlobal[folderName]?.type === 'folder') {
        currentSoundFileTreeGlobal = currentSoundFileTreeGlobal[folderName].children;
    } else { currentSoundFileTreeGlobal = null; }
    if (appServicesInstance.renderSoundBrowserDirectory && typeof appServicesInstance.renderSoundBrowserDirectory === 'function') {
        appServicesInstance.renderSoundBrowserDirectory(currentSoundBrowserPathGlobal, currentSoundFileTreeGlobal);
    }
}
export function popFromSoundBrowserPath() {
    currentSoundBrowserPathGlobal.pop();
    let tempTree = soundLibraryFileTreesGlobal[currentLibraryNameGlobal];
    for (const folderName of currentSoundBrowserPathGlobal) {
        if (tempTree && tempTree[folderName] && tempTree[folderName].type === 'folder') {
            tempTree = tempTree[folderName].children;
        } else { tempTree = null; break; }
    }
    currentSoundFileTreeGlobal = tempTree;
    if (appServicesInstance.renderSoundBrowserDirectory && typeof appServicesInstance.renderSoundBrowserDirectory === 'function') {
        appServicesInstance.renderSoundBrowserDirectory(currentSoundBrowserPathGlobal, currentSoundFileTreeGlobal);
    }
}
export function setPreviewPlayerState(player) { previewPlayerGlobal = player; }
export function setClipboardDataState(data) { clipboardDataGlobal = typeof data === 'object' && data !== null ? data : { type: null, data: null }; }
export function setActiveSequencerTrackIdState(id) { activeSequencerTrackId = id; }
export function setSoloedTrackIdState(trackId) {
    const previouslySoloed = soloedTrackId;
    soloedTrackId = (soloedTrackId === trackId) ? null : trackId;
    tracks.forEach(t => {
        const isNowThisTrackSoloed = (t.id === soloedTrackId);
        if (t.isSoloed !== isNowThisTrackSoloed || (previouslySoloed && t.id === previouslySoloed && !isNowThisTrackSoloed)) {
            t.isSoloed = isNowThisTrackSoloed;
            if (typeof t.applySoloState === 'function') t.applySoloState(); // Track's internal audio update
            if (appServicesInstance.updateTrackUI) appServicesInstance.updateTrackUI(t.id, 'soloChanged');
        }
    });
    if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
}
export function setArmedTrackIdState(trackId) {
    const previouslyArmed = armedTrackId;
    armedTrackId = (armedTrackId === trackId) ? null : trackId;
    if (previouslyArmed !== null && previouslyArmed !== armedTrackId) {
        const prevTrack = getTrackByIdState(previouslyArmed);
        if (prevTrack) { prevTrack.isArmedForRec = false; if (appServicesInstance.updateTrackUI) appServicesInstance.updateTrackUI(prevTrack.id, 'armChanged'); }
    }
    if (armedTrackId !== null) {
        const currentTrack = getTrackByIdState(armedTrackId);
        if (currentTrack) { currentTrack.isArmedForRec = true; if (appServicesInstance.updateTrackUI) appServicesInstance.updateTrackUI(currentTrack.id, 'armChanged'); }
    }
    if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
    if (appServicesInstance.updateRecordButtonUI) appServicesInstance.updateRecordButtonUI(isRecordingGlobal, !!armedTrackId);
}
export function setIsRecordingState(status) {
    isRecordingGlobal = !!status;
    if (!isRecordingGlobal && recordingTrackIdGlobal !== null) recordingTrackIdGlobal = null;
    if (appServicesInstance.updateRecordButtonUI) appServicesInstance.updateRecordButtonUI(isRecordingGlobal, !!armedTrackId);
}
export function setRecordingTrackIdState(id) { recordingTrackIdGlobal = id; }
export function setRecordingStartTimeState(time) { recordingStartTime = Number.isFinite(time) ? time : 0; }
export function setPlaybackModeState(mode) { // Renamed from setPlaybackModeStateInternal
    if (globalPlaybackMode !== mode && (mode === 'sequencer' || mode === 'timeline')) {
        if (appServicesInstance.captureStateForUndoInternal) appServicesInstance.captureStateForUndoInternal(`Set Playback Mode to ${mode}`);
        globalPlaybackMode = mode;
        if (appServicesInstance.onPlaybackModeChange) appServicesInstance.onPlaybackModeChange(globalPlaybackMode);
        if (typeof Tone !== 'undefined' && Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) {
            if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Playback mode changed. Transport stopped.`, "info", 2000);
            appServicesInstance.stopPlayback();
        }
    }
}
export function setSelectedTimelineClipInfoState(trackId, clipId) {
    selectedTimelineClipInfoGlobal = { trackId, clipId };
    if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
}
export function setCurrentThemeState(theme) {
    if (currentTheme !== theme && (theme === 'light' || theme === 'dark')) {
        currentTheme = theme; try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (e) { console.warn("[State] Could not save theme:", e.message); }
        if (appServicesInstance.updateTheme) appServicesInstance.updateTheme(theme);
    }
}

export async function addTrackToStateInternal(type, initialData = null, captureUndo = true, servicesPassedToTrack) {
    const isUserAction = !appServicesInstance.getIsReconstructingDAW(); // Check reconstruction flag
    if (isUserAction && captureUndo) {
        if(appServicesInstance.captureStateForUndoInternal) appServicesInstance.captureStateForUndoInternal(`Add ${type} Track`);
    }
    trackIdCounter++;
    const newTrackId = initialData?.id ?? trackIdCounter;
    if (initialData?.id != null && newTrackId >= trackIdCounter) trackIdCounter = newTrackId + 1;

    const track = new Track(newTrackId, type, initialData, servicesPassedToTrack || appServicesInstance);
    tracks.push(track);
    // ADDED LOG
    console.log(`[State addTrackToStateInternal] Track added: ID=${track.id}, Name="${track.name}", Type=${track.type}. Total tracks: ${tracks.length}`);

    if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
    if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
    return track;
}

export function removeTrackFromStateInternal(trackId) { /* ... from your state.js, ensure appServicesInstance.captureStateForUndoInternal ... */ 
    const trackIndex = tracks.findIndex(t => t.id.toString() === trackId.toString());
    if (trackIndex > -1) {
        const trackToRemove = tracks[trackIndex];
        if (!appServicesInstance.getIsReconstructingDAW() && appServicesInstance.captureStateForUndoInternal) {
            appServicesInstance.captureStateForUndoInternal(`Remove Track: ${trackToRemove.name}`);
        }
        if (typeof trackToRemove.dispose === 'function') trackToRemove.dispose();
        tracks.splice(trackIndex, 1);
        if (soloedTrackId === trackId) setSoloedTrackIdState(null);
        if (armedTrackId === trackId) setArmedTrackIdState(null);
        if (activeSequencerTrackId === trackId) setActiveSequencerTrackIdState(null);
        if (recordingTrackIdGlobal === trackId) setIsRecordingState(false);
        if (selectedTimelineClipInfoGlobal.trackId === trackId) setSelectedTimelineClipInfoState(null, null);
        if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
        if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
        if (appServicesInstance.closeAllTrackWindows) appServicesInstance.closeAllTrackWindows(trackId);
    }
}

export function addMasterEffectToState(effectType, params) { /* ... from your state.js ... */ 
    const effectId = `masterEffect-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const effectInstanceParams = params || (appServicesInstance.effectsRegistryAccess?.getEffectDefaultParams ? appServicesInstance.effectsRegistryAccess.getEffectDefaultParams(effectType) : getEffectDefaultParamsFromRegistry(effectType)) || {};
    masterEffectsChainState.push({ id: effectId, type: effectType, params: JSON.parse(JSON.stringify(effectInstanceParams)), isBypassed: false });
    return effectId;
}
export function removeMasterEffectFromState(effectId) { /* ... from your state.js ... */ 
    masterEffectsChainState = masterEffectsChainState.filter(e => e.id !== effectId);
}
export function updateMasterEffectParamInState(effectId, paramPath, value) { /* ... from your state.js ... */ 
    const effect = masterEffectsChainState.find(e => e.id === effectId);
    if (effect) {
        if (paramPath === 'isBypassed') { effect.isBypassed = value; }
        else { let target = effect.params; const keys = paramPath.split('.'); for (let i = 0; i < keys.length - 1; i++) { if (!target[keys[i]] || typeof target[keys[i]] !== 'object') target[keys[i]] = {}; target = target[keys[i]]; } target[keys[keys.length - 1]] = value; }
    }
}
export function reorderMasterEffectInState(effectId, newIndex) { /* ... from your state.js ... */ 
    const effectIndex = masterEffectsChainState.findIndex(e => e.id === effectId);
    if (effectIndex === -1 || newIndex < 0 || newIndex >= masterEffectsChainState.length) return;
    const [effect] = masterEffectsChainState.splice(effectIndex, 1);
    masterEffectsChainState.splice(newIndex, 0, effect);
}
export function setMasterEffectsState(effects) { /* ... from your state.js ... */ 
    masterEffectsChainState = effects.map(e => JSON.parse(JSON.stringify(e)));
}

// --- Undo/Redo ---
function _getCurrentStateSnapshot(actionName) { /* ... from your state.js, ensure Tone guard ... */ 
    if (typeof Tone === 'undefined') { console.error("[State _getCurrentStateSnapshot] Tone is not defined.");}
    try {
        const clonedTracks = tracks.map(track => track.serializeState ? track.serializeState() : JSON.parse(JSON.stringify(track)));
        const clonedMasterEffects = JSON.parse(JSON.stringify(masterEffectsChainState));
        const clonedOpenWindows = Array.from(openWindowsMap.values()).map(win => {
            if (!win || !win.element) return null; 
            return { id: win.id, title: win.title, left: win.element.style.left, top: win.element.style.top, width: win.element.style.width, height: win.element.style.height, zIndex: parseInt(win.element.style.zIndex, 10) || 100, isMinimized: win.isMinimized, isMaximized: win.isMaximized, restoreState: JSON.parse(JSON.stringify(win.restoreState || {})), initialContentKey: win.initialContentKey || win.id };
        }).filter(ws => ws !== null);
        return { actionName: actionName, tracks: clonedTracks, trackIdCounter: trackIdCounter, openWindows: clonedOpenWindows, highestZ: highestZ, masterEffectsChain: clonedMasterEffects, masterGainValue: masterGainValueState, activeSequencerTrackId: activeSequencerTrackId, soloedTrackId: soloedTrackId, armedTrackId: armedTrackId, globalPlaybackMode: globalPlaybackMode, tempo: (typeof Tone !== 'undefined' && Tone.Transport) ? Tone.Transport.bpm.value : Constants.MIN_TEMPO, currentLibraryName: currentLibraryNameGlobal, currentSoundBrowserPath: JSON.parse(JSON.stringify(currentSoundBrowserPathGlobal)), selectedTimelineClipInfo: JSON.parse(JSON.stringify(selectedTimelineClipInfoGlobal)) };
    } catch (error) { console.error("[State _getCurrentStateSnapshot] Error creating state snapshot:", error); if(appServicesInstance.showNotification) appServicesInstance.showNotification("Error capturing state for undo.", "error", 4000); return null; }
}
async function _applyStateSnapshot(snapshot, isUndoRedo = true) { /* ... from your state.js, ensure Tone guard ... */
    if (!snapshot) { console.error("[State _applyStateSnapshot] Attempted to apply a null snapshot."); if(appServicesInstance.showNotification) appServicesInstance.showNotification("Error applying state.", "error", 4000); return; }
    if (typeof Tone === 'undefined') { console.error("[State _applyStateSnapshot] Tone is not defined."); if (appServicesInstance.showNotification) appServicesInstance.showNotification("Critical error applying state: Tone.js missing.", "error"); return; }
    console.log(`[State _applyStateSnapshot] Applying snapshot for action: ${snapshot.actionName}`);
    try {
        if (appServicesInstance) appServicesInstance._isReconstructingDAW_flag = true;
        if (Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) appServicesInstance.stopPlayback();
        Tone.Transport.cancel(0);
        tracks.forEach(track => { if (typeof track.dispose === 'function') track.dispose(); }); tracks = [];
        openWindowsMap.forEach(win => { if (win.element) win.close(true); }); openWindowsMap.clear();
        highestZ = snapshot.highestZ || 100; trackIdCounter = snapshot.trackIdCounter || 0;
        masterGainValueState = snapshot.masterGainValue !== undefined ? snapshot.masterGainValue : Tone.dbToGain(0);
        if (appServicesInstance.setMasterVolume) appServicesInstance.setMasterVolume(masterGainValueState);
        Tone.Transport.bpm.value = snapshot.tempo || 120;
        if (appServicesInstance.updateTaskbarTempoDisplay) appServicesInstance.updateTaskbarTempoDisplay(snapshot.tempo || 120);
        masterEffectsChainState = [];
        if (appServicesInstance.clearAllMasterEffectNodes) await appServicesInstance.clearAllMasterEffectNodes();
        if(snapshot.masterEffectsChain) {
            for (const effectState of snapshot.masterEffectsChain) {
                masterEffectsChainState.push(JSON.parse(JSON.stringify(effectState)));
                if (appServicesInstance.addMasterEffectToAudio) {
                    await appServicesInstance.addMasterEffectToAudio(effectState.id, effectState.type, effectState.params);
                    if (effectState.isBypassed && appServicesInstance._rechainMasterEffectsAudio) await appServicesInstance._rechainMasterEffectsAudio();
                }
            }
        }
        if (appServicesInstance.updateMasterEffectsRackUI) appServicesInstance.updateMasterEffectsRackUI();
        if (snapshot.tracks) { for (const trackData of snapshot.tracks) if (trackData) addTrackToStateInternal(trackData.type, trackData, false, appServicesInstance); }
        if (snapshot.openWindows) {
            const sortedWindows = snapshot.openWindows.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            for (const winState of sortedWindows) { if (winState) { /* ... window reconstruction logic ... */ } }
        }
        activeSequencerTrackId = snapshot.activeSequencerTrackId || null;
        setSoloedTrackIdState(snapshot.soloedTrackId || null); 
        setArmedTrackIdState(snapshot.armedTrackId || null);   
        setPlaybackModeState(snapshot.globalPlaybackMode || 'sequencer');
        setSelectedTimelineClipInfoState(snapshot.selectedTimelineClipInfo?.trackId, snapshot.selectedTimelineClipInfo?.clipId);
        if (snapshot.currentLibraryName && appServicesInstance.setCurrentLibraryNameState) appServicesInstance.setCurrentLibraryNameState(snapshot.currentLibraryName);
        if (snapshot.currentSoundBrowserPath && appServicesInstance.setCurrentSoundBrowserPathState) appServicesInstance.setCurrentSoundBrowserPathState(snapshot.currentSoundBrowserPath);
        if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
        if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
        if (appServicesInstance.updateSoundBrowserDisplayForLibrary) appServicesInstance.updateSoundBrowserDisplayForLibrary();
        tracks.forEach(track => { if (typeof track.recreateToneSequence === 'function') track.recreateToneSequence(false); if (track.type === 'Audio' && typeof track.scheduleTimelinePlayback === 'function') track.scheduleTimelinePlayback(0, globalPlaybackMode); });
    } catch (error) { console.error("[State _applyStateSnapshot] Error applying state snapshot:", error); if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error restoring state.", "error", 5000);
    } finally { if (appServicesInstance) appServicesInstance._isReconstructingDAW_flag = false; if (appServicesInstance.updateUndoRedoButtonsUI) appServicesInstance.updateUndoRedoButtonsUI(); }
}
export function captureStateForUndoInternal(actionName) { /* ... from your state.js, ensure no direct Tone access if problematic ... */
    if (appServicesInstance._isReconstructingDAW_flag) return; 
    const snapshot = _getCurrentStateSnapshot(actionName);
    if (snapshot) { undoStack.push(snapshot); if (undoStack.length > Constants.MAX_HISTORY_STATES) undoStack.shift(); redoStack = []; if (appServicesInstance.updateUndoRedoButtonsUI) appServicesInstance.updateUndoRedoButtonsUI(snapshot, null); }
}
export async function undoLastActionInternal() { /* ... from your state.js ... */
    if (appServicesInstance._isReconstructingDAW_flag || undoStack.length === 0) return;
    const lastState = undoStack.pop(); const currentStateForRedo = _getCurrentStateSnapshot(`Redo state for: ${lastState.actionName}`); 
    if (currentStateForRedo) redoStack.push(currentStateForRedo); if (redoStack.length > Constants.MAX_HISTORY_STATES) redoStack.shift();
    await _applyStateSnapshot(lastState, true); if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Undid: ${lastState.actionName}`, "info", 1500);
}
export async function redoLastActionInternal() { /* ... from your state.js ... */
    if (appServicesInstance._isReconstructingDAW_flag || redoStack.length === 0) return;
    const nextState = redoStack.pop(); const currentStateForUndo = _getCurrentStateSnapshot(`Undo state for: ${nextState.actionName}`); 
    if (currentStateForUndo) undoStack.push(currentStateForUndo); if (undoStack.length > Constants.MAX_HISTORY_STATES) undoStack.shift();
    await _applyStateSnapshot(nextState, true); if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Redid: ${nextState.actionName}`, "info", 1500);
}

// --- Project Data Handling ---
export function gatherProjectDataInternal() { /* ... from your state.js, ensure Tone guard ... */
    if (typeof Tone === 'undefined') { console.error("[State gatherProjectDataInternal] Tone is not defined."); }
    try {
        const projectData = { version: Constants.APP_VERSION, projectName: Constants.defaultProjectName, createdAt: new Date().toISOString(), globalSettings: { tempo: (typeof Tone !== 'undefined' && Tone.Transport) ? Tone.Transport.bpm.value : Constants.MIN_TEMPO, masterVolume: masterGainValueState, playbackMode: globalPlaybackMode, activeSequencerTrackId: activeSequencerTrackId, soloedTrackId: soloedTrackId, armedTrackId: armedTrackId, selectedTimelineClipInfo: selectedTimelineClipInfoGlobal, currentLibraryName: currentLibraryNameGlobal, currentSoundBrowserPath: currentSoundBrowserPathGlobal, }, masterEffectsChain: masterEffectsChainState.map(effect => ({ id: effect.id, type: effect.type, params: effect.params ? JSON.parse(JSON.stringify(effect.params)) : {}, isBypassed: effect.isBypassed })), tracks: tracks.map(track => track.serializeState ? track.serializeState() : null).filter(td => td !== null), windowStates: Array.from(openWindowsMap.values()).map(win => { if (!win || !win.element) return null; return { id: win.id, title: win.title, left: win.element.style.left, top: win.element.style.top, width: win.element.style.width, height: win.element.style.height, zIndex: parseInt(win.element.style.zIndex, 10), isMinimized: win.isMinimized, isMaximized: win.isMaximized, restoreState: JSON.parse(JSON.stringify(win.restoreState || {})), initialContentKey: win.initialContentKey || win.id }; }).filter(ws => ws !== null) };
        return projectData;
    } catch (error) { console.error("[State gatherProjectDataInternal] Error:", error); if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error preparing project data.", "error", 4000); return null; }
}
export async function reconstructDAWInternal(projectData, isUndoRedo = false) { /* ... from your state.js, ensure Tone guard and careful appServices calls ... */
    if (!projectData) { if (appServicesInstance.showNotification) appServicesInstance.showNotification("Cannot load project: No data.", "error"); return; }
    if (typeof Tone === 'undefined') { console.error("[State reconstructDAWInternal] Tone.js missing."); if (appServicesInstance.showNotification) appServicesInstance.showNotification("Critical error: Tone.js missing.", "error"); return; }
    if(appServicesInstance) appServicesInstance._isReconstructingDAW_flag = true;
    try {
        undoStack = []; redoStack = []; if(appServicesInstance.updateUndoRedoButtonsUI) appServicesInstance.updateUndoRedoButtonsUI(null, null);
        if (Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) appServicesInstance.stopPlayback(); Tone.Transport.cancel(0);
        if(appServicesInstance.closeAllWindows) appServicesInstance.closeAllWindows(true);
        tracks.forEach(track => { if (typeof track.dispose === 'function') track.dispose(); }); tracks = []; trackIdCounter = 0;
        if (appServicesInstance.clearAllMasterEffectNodes) await appServicesInstance.clearAllMasterEffectNodes(); masterEffectsChainState = [];
        if (projectData.globalSettings) { /* ... apply global settings ... */ }
        if (projectData.masterEffectsChain) { for (const effectState of projectData.masterEffectsChain) { /* ... add master effects ... */ } }
        if (appServicesInstance.updateMasterEffectsRackUI) appServicesInstance.updateMasterEffectsRackUI();
        let maxTrackId = 0; if (projectData.tracks) { for (const trackData of projectData.tracks) { if (trackData) { const newTrack = await addTrackToStateInternal(trackData.type, trackData, false, appServicesInstance); if (newTrack && newTrack.id > maxTrackId) maxTrackId = newTrack.id; } } } trackIdCounter = maxTrackId;
        highestZ = 100; if (projectData.windowStates) { /* ... reconstruct windows ... */ }
        if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
        if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
        // ... other UI updates and finalizations ...
        if (!isUndoRedo && appServicesInstance.showNotification) appServicesInstance.showNotification(`Project "${projectData.projectName || 'Untitled'}" loaded.`, "success");
    } catch (error) { console.error("[State reconstructDAWInternal] Error:", error); if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error loading project.", "error", 5000);
    } finally { if(appServicesInstance) appServicesInstance._isReconstructingDAW_flag = false; }
}
export function saveProjectInternal() { /* ... from your state.js ... */
    const projectData = gatherProjectDataInternal(); if (!projectData) return;
    try { const projectString = JSON.stringify(projectData, null, 2); const blob = new Blob([projectString], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); a.download = `snugos-project-${timestamp}.snug`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); if (appServicesInstance.showNotification) appServicesInstance.showNotification("Project saved!", "success");
    } catch (error) { console.error("[State saveProjectInternal] Error:", error); if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error saving project.", "error"); }
}
export function loadProjectInternal() { /* ... from your state.js, ensure uiElementsCache.projectFileInput ... */
    const fileInput = appServicesInstance.uiElementsCache?.projectFileInput || document.getElementById('loadProjectInput'); // Use correct ID from cache
    if (fileInput) { fileInput.onchange = async (event) => { if (event.target.files && event.target.files[0]) { await handleProjectFileLoadInternal(event.target.files[0]); fileInput.value = ''; } }; fileInput.click(); }
    else { if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error: Project file input not found.", "error"); }
}
export async function handleProjectFileLoadInternal(file) { /* ... from your state.js ... */
    if (!file) return;
    if (appServicesInstance.showConfirmationDialog) {
        appServicesInstance.showConfirmationDialog("Loading a new project will discard unsaved changes. Continue?", async () => {
            const reader = new FileReader();
            reader.onload = async (e) => { try { const projectData = JSON.parse(e.target.result); undoStack = []; redoStack = []; await reconstructDAWInternal(projectData, false); captureStateForUndoInternal("Load Project: " + file.name.substring(0,20)); } catch (error) { console.error("Error parsing/loading project:", error); if (appServicesInstance.showNotification) appServicesInstance.showNotification("Failed to load project file.", "error"); } };
            reader.onerror = () => { if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error reading project file.", "error"); };
            reader.readAsText(file);
        });
    }
}
export async function exportToWavInternal() { /* ... from your state.js, ensure Tone guard and appServices calls ... */ 
    if (typeof Tone === 'undefined') { if (appServicesInstance.showNotification) appServicesInstance.showNotification("Audio engine not ready (Tone.js missing).", "error"); return; }
    if (!appServicesInstance.initAudioContextAndMasterMeter || !appServicesInstance.getActualMasterGainNode) { if (appServicesInstance.showNotification) appServicesInstance.showNotification("Audio system not ready for export.", "error"); return; }
    await appServicesInstance.initAudioContextAndMasterMeter(true);
    try {
        if (Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) appServicesInstance.stopPlayback();
        Tone.Transport.cancel(0); let projectDuration = 0;
        tracks.forEach(track => { track.timelineClips.forEach(clip => { projectDuration = Math.max(projectDuration, clip.startTime + clip.duration); }); });
        if (projectDuration === 0) { if (appServicesInstance.showNotification) appServicesInstance.showNotification("Project empty. Nothing to export.", "info"); return; }
        projectDuration = Math.min(projectDuration + 2, 600); 
        if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Exporting ${projectDuration.toFixed(1)}s... Please wait.`, "info", projectDuration * 1000 + 2000);
        const masterOutputNode = appServicesInstance.getActualMasterGainNode(); if (!masterOutputNode) throw new Error("Master output node not available.");
        const recorder = new Tone.Recorder(); masterOutputNode.connect(recorder);
        tracks.forEach(track => { if (typeof track.recreateToneSequence === 'function') track.recreateToneSequence(false); if (typeof track.scheduleTimelinePlayback === 'function') track.scheduleTimelinePlayback(0, 'timeline'); });
        recorder.start(); Tone.Transport.position = 0; Tone.Transport.start();
        await new Promise(resolve => setTimeout(resolve, projectDuration * 1000));
        const recording = await recorder.stop(); Tone.Transport.stop();
        if (masterOutputNode && !masterOutputNode.disposed && recorder && !recorder.disposed) { try { masterOutputNode.disconnect(recorder); } catch(e) {/* ignore */} }
        if (recorder && !recorder.disposed) recorder.dispose();
        const url = URL.createObjectURL(recording); const a = document.createElement('a'); a.href = url; const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); a.download = `snugos-export-${timestamp}.wav`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Export to WAV successful!", "success");
    } catch (error) { console.error("[State exportToWavInternal] Error:", error); if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Error exporting WAV: ${error.message}.`, "error", 5000); if (typeof Tone !== 'undefined' && Tone.Transport) { Tone.Transport.stop(); Tone.Transport.cancel(0); } }
}
