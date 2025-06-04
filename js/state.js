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
let selectedSoundForPreviewGlobal = null; // ADDED: For selected sound preview state

export function initializeStateModule(services) {
    appServicesInstance = services || {};
    try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
            currentTheme = savedTheme;
        }
        // MODIFIED: Do NOT apply theme here immediately, let main.js do it
        // if (appServicesInstance.updateTheme) {
        //     appServicesInstance.updateTheme(currentTheme);
        // }
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
export const getSelectedSoundForPreviewState = () => selectedSoundForPreviewGlobal; // ADDED: Getter for selected sound
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
            if (typeof t.updateSoloState === 'function') t.updateSoloState(soloedTrackId); // Call track's internal method
            else if (typeof t.applySoloState === 'function') t.applySoloState(); // Fallback if old name used
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
export function setPlaybackModeState(mode) {
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
export function setSelectedSoundForPreviewState(soundData) { // ADDED: Setter for selected sound
    selectedSoundForPreviewGlobal = soundData;
    const browserWindow = appServicesInstance.getWindowById?.('soundBrowser');
    if (browserWindow?.element) {
        const previewButton = browserWindow.element.querySelector('#soundBrowserPreviewBtn');
        if (previewButton) {
            previewButton.disabled = !soundData;
        }
    }
}


export async function addTrackToStateInternal(type, initialData = null, captureUndo = true, servicesPassedToTrack) {
    const isUserAction = !appServicesInstance.getIsReconstructingDAW?.();
    if (isUserAction && captureUndo) {
        if(appServicesInstance.captureStateForUndoInternal) appServicesInstance.captureStateForUndoInternal(`Add ${type} Track`);
    }
    trackIdCounter++;
    const newTrackId = initialData?.id ?? trackIdCounter.toString(); // Ensure string ID
    if (initialData?.id != null) {
        const numericId = parseInt(newTrackId, 10);
        if (!isNaN(numericId) && numericId >= trackIdCounter) {
            trackIdCounter = numericId + 1;
        }
    }


    const track = new Track(newTrackId, type, initialData, servicesPassedToTrack || appServicesInstance);
    tracks.push(track);
    console.log(`[State addTrackToStateInternal] Track added: ID=${track.id}, Name="${track.name}", Type=${track.type}. Total tracks: ${tracks.length}`);

    if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
    if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
    return track;
}

export function removeTrackFromStateInternal(trackId) {
    const trackIdStr = trackId.toString();
    const trackIndex = tracks.findIndex(t => t.id.toString() === trackIdStr);
    if (trackIndex > -1) {
        const trackToRemove = tracks[trackIndex];
        if (!appServicesInstance.getIsReconstructingDAW?.() && appServicesInstance.captureStateForUndoInternal) {
            appServicesInstance.captureStateForUndoInternal(`Remove Track: ${trackToRemove.name}`);
        }
        if (typeof trackToRemove.dispose === 'function') trackToRemove.dispose();
        tracks.splice(trackIndex, 1);

        if (soloedTrackId === trackIdStr) setSoloedTrackIdState(null);
        if (armedTrackId === trackIdStr) setArmedTrackIdState(null);
        if (activeSequencerTrackId === trackIdStr) setActiveSequencerTrackIdState(null);
        if (recordingTrackIdGlobal === trackIdStr) setIsRecordingState(false); // This will also nullify recordingTrackIdGlobal
        if (selectedTimelineClipInfoGlobal.trackId === trackIdStr) setSelectedTimelineClipInfoState(null, null);

        if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
        if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
        if (appServicesInstance.closeAllTrackWindows) appServicesInstance.closeAllTrackWindows(trackIdStr);
    }
}

export function addMasterEffectToState(effectType, params) {
    const effectId = `masterEffect-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const effectInstanceParams = params || (appServicesInstance.effectsRegistryAccess?.getEffectDefaultParams ? appServicesInstance.effectsRegistryAccess.getEffectDefaultParams(effectType) : getEffectDefaultParamsFromRegistry(effectType)) || {};
    masterEffectsChainState.push({ id: effectId, type: effectType, params: JSON.parse(JSON.stringify(effectInstanceParams)), isBypassed: false });
    return effectId;
}
export function removeMasterEffectFromState(effectId) {
    masterEffectsChainState = masterEffectsChainState.filter(e => e.id !== effectId);
}
export function updateMasterEffectParamInState(effectId, paramPath, value) {
    const effect = masterEffectsChainState.find(e => e.id === effectId);
    if (effect) {
        if (paramPath === 'isBypassed') { effect.isBypassed = value; }
        else {
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
export function setMasterEffectsState(effects) {
    masterEffectsChainState = effects.map(e => JSON.parse(JSON.stringify(e)));
}

// --- Undo/Redo ---
function _getCurrentStateSnapshot(actionName) {
    if (typeof Tone === 'undefined') { console.error("[State _getCurrentStateSnapshot] Tone is not defined.");}
    try {
        const clonedTracks = tracks.map(track => track.serializeState ? track.serializeState() : JSON.parse(JSON.stringify(track)));
        const clonedMasterEffects = JSON.parse(JSON.stringify(masterEffectsChainState));
        const clonedOpenWindows = Array.from(openWindowsMap.values()).map(win => {
            if (!win || !win.element) return null;
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
            selectedTimelineClipInfo: JSON.parse(JSON.stringify(selectedTimelineClipInfoGlobal))
        };
    } catch (error) {
        console.error("[State _getCurrentStateSnapshot] Error creating state snapshot:", error);
        if(appServicesInstance.showNotification) appServicesInstance.showNotification("Error capturing state for undo.", "error", 4000);
        return null;
    }
}

async function _applyStateSnapshot(snapshot, isUndoRedo = true) {
    if (!snapshot) {
        console.error("[State _applyStateSnapshot] Attempted to apply a null snapshot.");
        if(appServicesInstance.showNotification) appServicesInstance.showNotification("Error applying state.", "error", 4000);
        return;
    }
    if (typeof Tone === 'undefined') {
        console.error("[State _applyStateSnapshot] Tone is not defined.");
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Critical error applying state: Tone.js missing.", "error");
        return;
    }
    console.log(`[State _applyStateSnapshot] Applying snapshot for action: ${snapshot.actionName}`);

    try {
        if (appServicesInstance) appServicesInstance._isReconstructingDAW_flag = true;

        if (Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) {
            appServicesInstance.stopPlayback();
        }
        Tone.Transport.cancel(0);

        tracks.forEach(track => { if (typeof track.dispose === 'function') track.dispose(); });
        tracks = [];

        if (appServicesInstance.closeAllWindows) appServicesInstance.closeAllWindows(true);
        else openWindowsMap.forEach(win => { if (win.element) win.close(true); }); // Fallback
        openWindowsMap.clear();


        highestZ = snapshot.highestZ || 100;
        trackIdCounter = snapshot.trackIdCounter || 0;
        masterGainValueState = snapshot.masterGainValue !== undefined ? snapshot.masterGainValue : (Tone.dbToGain ? Tone.dbToGain(0) : 0.707);
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
                    if (effectState.isBypassed && appServicesInstance._rechainMasterEffectsAudio) {
                         await appServicesInstance._rechainMasterEffectsAudio();
                    }
                }
            }
        }
        if (appServicesInstance.updateMasterEffectsRackUI) appServicesInstance.updateMasterEffectsRackUI();

        if (snapshot.tracks) {
            for (const trackData of snapshot.tracks) {
                if (trackData) {
                     await addTrackToStateInternal(trackData.type, trackData, false, appServicesInstance);
                }
            }
        }

        if (snapshot.openWindows) {
            const sortedWindows = snapshot.openWindows.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
            for (const winState of sortedWindows) {
                if (winState && typeof appServicesInstance.createWindow === 'function') {
                    let openFunc = null;
                    // Determine which function to call based on initialContentKey or id pattern
                    if (winState.id === 'soundBrowser') openFunc = appServicesInstance.openSoundBrowserWindow;
                    else if (winState.id === 'timeline' || winState.id === 'arrangement') openFunc = appServicesInstance.openArrangementWindow;
                    else if (winState.id === 'mixer') openFunc = appServicesInstance.openMixerWindow;
                    else if (winState.id === 'globalControls') openFunc = appServicesInstance.openGlobalControlsWindow;
                    else if (winState.id === 'masterEffectsRack') openFunc = appServicesInstance.openMasterEffectsRackWindow;
                    else if (winState.id.startsWith('trackInspector-')) openFunc = () => appServicesInstance.openTrackInspectorWindow(winState.initialContentKey.split('-')[1], winState);
                    else if (winState.id.startsWith('effectsRack-')) openFunc = () => appServicesInstance.openTrackEffectsRackWindow(winState.initialContentKey.split('-')[1], winState);
                    else if (winState.id.startsWith('sequencer-')) openFunc = () => appServicesInstance.openSequencerWindow(winState.initialContentKey.split('-')[1], winState);

                    if (openFunc) {
                        try { openFunc(winState); }
                        catch(e){ console.warn(`Error reopening window ${winState.id} during state apply:`, e); }
                    } else {
                        // Fallback for generic windows or if specific opener isn't found
                        // This might miss specific initialization logic within those openXWindow functions.
                        const contentDiv = document.createElement('div');
                        contentDiv.innerHTML = `Content for ${winState.title} (ID: ${winState.id}) - Restore manually if needed.`;
                        appServicesInstance.createWindow(winState.id, winState.title, contentDiv, winState);
                    }
                }
            }
        }


        activeSequencerTrackId = snapshot.activeSequencerTrackId || null;
        setSoloedTrackIdState(snapshot.soloedTrackId || null);
        setArmedTrackIdState(snapshot.armedTrackId || null);
        setPlaybackModeState(snapshot.globalPlaybackMode || 'sequencer');
        setSelectedTimelineClipInfoState(snapshot.selectedTimelineClipInfo?.trackId, snapshot.selectedTimelineClipInfo?.clipId);

        if (snapshot.currentLibraryName && appServicesInstance.setCurrentLibraryNameState) {
             appServicesInstance.setCurrentLibraryNameState(snapshot.currentLibraryName);
        }
        if (snapshot.currentSoundBrowserPath && appServicesInstance.setCurrentSoundBrowserPathState) {
            appServicesInstance.setCurrentSoundBrowserPathState(snapshot.currentSoundBrowserPath);
        }


        if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
        if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
        if (appServicesInstance.updateSoundBrowserDisplayForLibrary) appServicesInstance.updateSoundBrowserDisplayForLibrary();

        tracks.forEach(track => {
             if (typeof track.recreateToneSequence === 'function') track.recreateToneSequence(false);
             if (track.type === 'Audio' && typeof track.scheduleTimelinePlayback === 'function') {
                 track.scheduleTimelinePlayback(0, globalPlaybackMode);
             }
        });

    } catch (error) {
        console.error("[State _applyStateSnapshot] Error applying state snapshot:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error restoring state.", "error", 5000);
    } finally {
        if (appServicesInstance) appServicesInstance._isReconstructingDAW_flag = false;
        if (appServicesInstance.updateUndoRedoButtonsUI) appServicesInstance.updateUndoRedoButtonsUI();
    }
}

export function captureStateForUndoInternal(actionName) {
    if (appServicesInstance._isReconstructingDAW_flag) return;
    const snapshot = _getCurrentStateSnapshot(actionName);
    if (snapshot) {
        undoStack.push(snapshot);
        if (undoStack.length > Constants.MAX_HISTORY_STATES) undoStack.shift();
        redoStack = [];
        if (appServicesInstance.updateUndoRedoButtonsUI) appServicesInstance.updateUndoRedoButtonsUI(snapshot, null);
    }
}
export async function undoLastActionInternal() {
    if (appServicesInstance._isReconstructingDAW_flag || undoStack.length === 0) return;
    const lastState = undoStack.pop();
    const currentStateForRedo = _getCurrentStateSnapshot(`Redo state for: ${lastState.actionName}`);
    if (currentStateForRedo) {
        redoStack.push(currentStateForRedo);
        if (redoStack.length > Constants.MAX_HISTORY_STATES) redoStack.shift();
    }
    await _applyStateSnapshot(lastState, true);
    if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Undid: ${lastState.actionName}`, "info", 1500);
}
export async function redoLastActionInternal() {
    if (appServicesInstance._isReconstructingDAW_flag || redoStack.length === 0) return;
    const nextState = redoStack.pop();
    const currentStateForUndo = _getCurrentStateSnapshot(`Undo state for: ${nextState.actionName}`);
    if (currentStateForUndo) {
        undoStack.push(currentStateForUndo);
        if (undoStack.length > Constants.MAX_HISTORY_STATES) undoStack.shift();
    }
    await _applyStateSnapshot(nextState, true);
    if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Redid: ${nextState.actionName}`, "info", 1500);
}

// --- Project Data Handling ---
export function gatherProjectDataInternal() {
    if (typeof Tone === 'undefined') { console.error("[State gatherProjectDataInternal] Tone is not defined."); }
    try {
        const projectData = {
            version: Constants.APP_VERSION,
            projectName: Constants.defaultProjectName, // Consider making this dynamic later
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
            windowStates: Array.from(openWindowsMap.values()).map(win => {
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
        console.error("[State gatherProjectDataInternal] Error:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error preparing project data.", "error", 4000);
        return null;
    }
}

export async function reconstructDAWInternal(projectData, isUndoRedo = false) {
    if (!projectData) {
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Cannot load project: No data.", "error");
        return;
    }
    if (typeof Tone === 'undefined') {
        console.error("[State reconstructDAWInternal] Tone.js missing.");
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Critical error: Tone.js missing.", "error");
        return;
    }

    if(appServicesInstance) appServicesInstance._isReconstructingDAW_flag = true;

    try {
        if (!isUndoRedo) { // Don't clear undo/redo if this is part of an undo/redo operation
            undoStack = [];
            redoStack = [];
            if(appServicesInstance.updateUndoRedoButtonsUI) appServicesInstance.updateUndoRedoButtonsUI(null, null);
        }

        if (Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) {
            appServicesInstance.stopPlayback();
        }
        Tone.Transport.cancel(0);

        if(appServicesInstance.closeAllWindows) appServicesInstance.closeAllWindows(true);
        else openWindowsMap.forEach(win => { if (win.element) win.close(true);}); // Fallback
        openWindowsMap.clear();

        tracks.forEach(track => { if (typeof track.dispose === 'function') track.dispose(); });
        tracks = [];
        trackIdCounter = 0;


        if (appServicesInstance.clearAllMasterEffectNodes) await appServicesInstance.clearAllMasterEffectNodes();
        masterEffectsChainState = [];

        if (projectData.globalSettings) {
            Tone.Transport.bpm.value = projectData.globalSettings.tempo || Constants.MIN_TEMPO;
            if (appServicesInstance.updateTaskbarTempoDisplay) appServicesInstance.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
            setMasterGainValueState(projectData.globalSettings.masterVolume !== undefined ? projectData.globalSettings.masterVolume : (Tone.dbToGain? Tone.dbToGain(0) : 0.707) );
            setPlaybackModeState(projectData.globalSettings.playbackMode || 'sequencer');
            setActiveSequencerTrackIdState(projectData.globalSettings.activeSequencerTrackId || null);
            setSoloedTrackIdState(projectData.globalSettings.soloedTrackId || null);
            setArmedTrackIdState(projectData.globalSettings.armedTrackId || null);
            setSelectedTimelineClipInfoState(projectData.globalSettings.selectedTimelineClipInfo?.trackId, projectData.globalSettings.selectedTimelineClipInfo?.clipId);
            if(projectData.globalSettings.currentLibraryName && appServicesInstance.setCurrentLibraryNameState) appServicesInstance.setCurrentLibraryNameState(projectData.globalSettings.currentLibraryName);
            if(projectData.globalSettings.currentSoundBrowserPath && appServicesInstance.setCurrentSoundBrowserPathState) appServicesInstance.setCurrentSoundBrowserPathState(projectData.globalSettings.currentSoundBrowserPath);
        }

        if (projectData.masterEffectsChain) {
            for (const effectState of projectData.masterEffectsChain) {
                addMasterEffectToState(effectState.type, effectState.params); // Adds to masterEffectsChainState
                if (appServicesInstance.addMasterEffectToAudio) {
                    await appServicesInstance.addMasterEffectToAudio(effectState.id, effectState.type, effectState.params);
                    if(effectState.isBypassed && appServicesInstance._rechainMasterEffectsAudio) {
                        await appServicesInstance._rechainMasterEffectsAudio();
                    }
                }
            }
        }
        if (appServicesInstance.updateMasterEffectsRackUI) appServicesInstance.updateMasterEffectsRackUI();

        let maxTrackId = 0;
        if (projectData.tracks) {
            for (const trackData of projectData.tracks) {
                if (trackData) {
                    const newTrack = await addTrackToStateInternal(trackData.type, trackData, false, appServicesInstance);
                    const numericId = parseInt(newTrack.id, 10);
                    if (!isNaN(numericId) && numericId > maxTrackId) {
                        maxTrackId = numericId;
                    }
                }
            }
        }
        trackIdCounter = maxTrackId; // Ensure new tracks get unique IDs

        highestZ = 100;
        if (projectData.windowStates) {
            const sortedWindows = projectData.windowStates.sort((a,b) => (a.zIndex || 100) - (b.zIndex || 100));
            for (const winState of sortedWindows) {
                if (winState && typeof appServicesInstance.createWindow === 'function') {
                    let openFunc = null;
                    let trackIdForWindow = null;
                    if (winState.id === 'soundBrowser') openFunc = appServicesInstance.openSoundBrowserWindow;
                    else if (winState.id === 'timeline' || winState.id === 'arrangement') openFunc = appServicesInstance.openArrangementWindow;
                    else if (winState.id === 'mixer') openFunc = appServicesInstance.openMixerWindow;
                    else if (winState.id === 'globalControls') openFunc = appServicesInstance.openGlobalControlsWindow;
                    else if (winState.id === 'masterEffectsRack') openFunc = appServicesInstance.openMasterEffectsRackWindow;
                    else {
                        const parts = (winState.initialContentKey || winState.id).split('-');
                        if (parts.length > 1) trackIdForWindow = parts[parts.length -1];

                        if (winState.id.startsWith('trackInspector-') && trackIdForWindow) openFunc = () => appServicesInstance.openTrackInspectorWindow(trackIdForWindow, winState);
                        else if (winState.id.startsWith('effectsRack-') && trackIdForWindow) openFunc = () => appServicesInstance.openTrackEffectsRackWindow(trackIdForWindow, winState);
                        else if (winState.id.startsWith('sequencer-') && trackIdForWindow) openFunc = () => appServicesInstance.openSequencerWindow(trackIdForWindow, winState);
                    }

                    if (openFunc) {
                        try {
                             // For specific window openers, they usually handle their own savedState if the second arg is for it.
                             // If it's a generic callback (like for track windows), pass winState.
                            if (winState.id.startsWith('trackInspector-') || winState.id.startsWith('effectsRack-') || winState.id.startsWith('sequencer-')) {
                                openFunc(); // The specific opener will use winState
                            } else {
                                openFunc(winState); // For more generic openers that accept savedState directly
                            }
                        } catch(e){ console.warn(`Error reopening window ${winState.id} during state reconstruction:`, e); }
                    } else {
                        const contentDiv = document.createElement('div');
                        contentDiv.innerHTML = `Content for ${winState.title} (ID: ${winState.id}) - Standard restore.`;
                        appServicesInstance.createWindow(winState.id, winState.title, contentDiv, winState);
                    }
                    if (winState.zIndex && winState.zIndex > highestZ) highestZ = winState.zIndex;
                }
            }
        }

        if (appServicesInstance.updateMixerWindow) appServicesInstance.updateMixerWindow();
        if (appServicesInstance.renderTimeline) appServicesInstance.renderTimeline();
        if (appServicesInstance.updateSoundBrowserDisplayForLibrary && projectData.globalSettings?.currentLibraryName) {
            appServicesInstance.updateSoundBrowserDisplayForLibrary(projectData.globalSettings.currentLibraryName);
        }

        tracks.forEach(track => {
            if (typeof track.recreateToneSequence === 'function') track.recreateToneSequence(false);
             if (track.type === 'Audio' && typeof track.scheduleTimelinePlayback === 'function') {
                 track.scheduleTimelinePlayback(0, globalPlaybackMode);
             }
        });

        if (!isUndoRedo && appServicesInstance.showNotification) appServicesInstance.showNotification(`Project "${projectData.projectName || 'Untitled'}" loaded.`, "success");

    } catch (error) {
        console.error("[State reconstructDAWInternal] Error:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error loading project.", "error", 5000);
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
        a.download = `snugos-project-${timestamp}.snug`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Project saved!", "success");
    } catch (error) {
        console.error("[State saveProjectInternal] Error:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error saving project.", "error");
    }
}

export function loadProjectInternal() {
    const fileInput = appServicesInstance.uiElementsCache?.projectFileInput || document.getElementById('loadProjectInput');
    if (fileInput) {
        fileInput.onchange = async (event) => { // Make sure this is an async function
            if (event.target.files && event.target.files[0]) {
                await handleProjectFileLoadInternal(event.target.files[0]); // Await this
                fileInput.value = ''; // Reset file input
            }
        };
        fileInput.click();
    }
    else {
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error: Project file input not found.", "error");
    }
}

export async function handleProjectFileLoadInternal(file) {
    if (!file) return;

    const processFileLoad = async () => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const projectData = JSON.parse(e.target.result);
                if (!appServicesInstance.getIsReconstructingDAW?.()) { // Don't clear undo for initial load during reconstruction
                    undoStack = []; redoStack = [];
                }
                await reconstructDAWInternal(projectData, false);
                // Only capture undo if it's a user action, not part of an internal reconstruction
                if (!appServicesInstance.getIsReconstructingDAW?.()) {
                    captureStateForUndoInternal("Load Project: " + file.name.substring(0,20));
                }
            } catch (error) {
                console.error("Error parsing/loading project:", error);
                if (appServicesInstance.showNotification) appServicesInstance.showNotification("Failed to load project file.", "error");
            }
        };
        reader.onerror = () => {
            if (appServicesInstance.showNotification) appServicesInstance.showNotification("Error reading project file.", "error");
        };
        reader.readAsText(file);
    };

    if (appServicesInstance.showConfirmationDialog) {
        appServicesInstance.showConfirmationDialog(
            "Loading a new project will discard unsaved changes. Continue?",
            async () => { await processFileLoad(); }
        );
    } else {
        await processFileLoad(); // Proceed if no confirmation dialog service
    }
}

export async function exportToWavInternal() {
    if (typeof Tone === 'undefined') {
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Audio engine not ready (Tone.js missing).", "error");
        return;
    }
    if (!appServicesInstance.initAudioContextAndMasterMeter || !appServicesInstance.getActualMasterGainNode) {
        if (appServicesInstance.showNotification) appServicesInstance.showNotification("Audio system not ready for export.", "error");
        return;
    }

    await appServicesInstance.initAudioContextAndMasterMeter(true); // Ensure context is running

    try {
        if (Tone.Transport.state === 'started' && appServicesInstance.stopPlayback) {
            appServicesInstance.stopPlayback();
        }
        Tone.Transport.cancel(0); // Clear any scheduled events

        let projectDuration = 0;
        tracks.forEach(track => {
            (track.timelineClips || []).forEach(clip => {
                projectDuration = Math.max(projectDuration, clip.startTime + clip.duration);
            });
            // If using sequences and no timeline clips, determine max sequence duration
            if ((track.timelineClips || []).length === 0 && track.sequences && track.sequences.length > 0) {
                track.sequences.forEach(seq => {
                    const seqDurationBars = seq.bars || 1;
                    const seqDurationSecs = seqDurationBars * (60 / Tone.Transport.bpm.value) * Tone.Transport.timeSignature;
                    projectDuration = Math.max(projectDuration, seqDurationSecs);
                });
            }
        });

        if (projectDuration === 0) {
            if (appServicesInstance.showNotification) appServicesInstance.showNotification("Project empty. Nothing to export.", "info");
            return;
        }
        projectDuration = Math.min(projectDuration + 2, 600); // Add a 2s tail, max 10 mins

        if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Exporting ${projectDuration.toFixed(1)}s... Please wait.`, "info", Math.max(3000, projectDuration * 1000 + 2000));

        const masterOutputNode = appServicesInstance.getActualMasterGainNode();
        if (!masterOutputNode) throw new Error("Master output node not available.");

        const recorder = new Tone.Recorder();
        masterOutputNode.connect(recorder);

        // Ensure all tracks are ready for playback from the beginning
        tracks.forEach(track => {
            if (typeof track.recreateToneSequence === 'function') track.recreateToneSequence(false);
            if (typeof track.scheduleTimelinePlayback === 'function') track.scheduleTimelinePlayback(0, 'timeline');
        });

        recorder.start();
        Tone.Transport.position = 0;
        Tone.Transport.start();

        await new Promise(resolve => setTimeout(resolve, projectDuration * 1000));

        const recording = await recorder.stop();
        Tone.Transport.stop(); // Ensure transport is stopped

        if (masterOutputNode && !masterOutputNode.disposed && recorder && !recorder.disposed) {
            try { masterOutputNode.disconnect(recorder); } catch(e) {/* ignore if already disconnected */}
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
        console.error("[State exportToWavInternal] Error:", error);
        if (appServicesInstance.showNotification) appServicesInstance.showNotification(`Error exporting WAV: ${error.message}.`, "error", 5000);
        if (typeof Tone !== 'undefined' && Tone.Transport) {
            Tone.Transport.stop();
            Tone.Transport.cancel(0);
        }
    }
}
