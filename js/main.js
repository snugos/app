// js/main.js - Main Application Logic Orchestrator

// --- Module Imports ---
import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
// setupGenericDropZoneListeners is imported here and will be used for the fix
import { showNotification, createContextMenu, createDropZoneHTML, setupGenericDropZoneListeners } from './utils.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    selectMIDIInput, handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js';
import {
    initializeStateModule,
    // State Getters
    getTracksState, getTrackByIdState, getOpenWindowsState, getWindowByIdState, getHighestZState,
    getMasterEffectsState, getMasterGainValueState,
    getMidiAccessState, getActiveMIDIInputState,
    getLoadedZipFilesState, getSoundLibraryFileTreesState, getCurrentLibraryNameState,
    getCurrentSoundFileTreeState, getCurrentSoundBrowserPathState, getPreviewPlayerState,
    getClipboardDataState, getArmedTrackIdState, getSoloedTrackIdState, isTrackRecordingState,
    getRecordingTrackIdState,
    getActiveSequencerTrackIdState, getUndoStackState, getRedoStackState, getPlaybackModeState, 
    // State Setters
    addWindowToStoreState, removeWindowFromStoreState, setHighestZState, incrementHighestZState,
    setMasterEffectsState, setMasterGainValueState,
    setMidiAccessState, setActiveMIDIInputState,
    setLoadedZipFilesState, setSoundLibraryFileTreesState, setCurrentLibraryNameState,
    setCurrentSoundFileTreeState, setCurrentSoundBrowserPathState, setPreviewPlayerState,
    setClipboardDataState, setArmedTrackIdState, setSoloedTrackIdState, setIsRecordingState,
    setRecordingTrackIdState, setRecordingStartTimeState, setActiveSequencerTrackIdState,
    setPlaybackModeState, 
    addMasterEffectToState, removeMasterEffectFromState,
    updateMasterEffectParamInState, reorderMasterEffectInState,
    // Core State Actions
    addTrackToStateInternal, removeTrackFromStateInternal,
    captureStateForUndoInternal, undoLastActionInternal, redoLastActionInternal,
    gatherProjectDataInternal, reconstructDAWInternal, saveProjectInternal,
    loadProjectInternal, handleProjectFileLoadInternal, exportToWavInternal
} from './state.js';
import {
    initializeAudioModule, initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary,
    loadSoundFromBrowserToTarget, playSlicePreview, playDrumSamplerPadPreview,
    loadSampleFile, loadDrumSamplerPadFile, autoSliceSample,
    addMasterEffectToAudio,
    removeMasterEffectFromAudio,
    updateMasterEffectParamInAudio,
    reorderMasterEffectInAudio,
    getMimeTypeFromFilename, getMasterEffectsBusInputNode,
    getActualMasterGainNode as getActualMasterGainNodeFromAudio,
    clearAllMasterEffectNodes as clearAllMasterEffectNodesInAudio,
    startAudioRecording, 
    stopAudioRecording 
} from './audio.js';
import {
    initializeUIModule, openTrackEffectsRackWindow, openTrackSequencerWindow, openGlobalControlsWindow,
    openTrackInspectorWindow, openMixerWindow, updateMixerWindow, openSoundBrowserWindow,
    renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary, highlightPlayingStep, drawWaveform,
    drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, updateDrumPadControlsUI, renderDrumSamplerPads,
    renderEffectsList, renderEffectControls, createKnob,
    updateSequencerCellUI,
    openMasterEffectsRackWindow,
    renderTimeline, 
    updatePlayheadPosition,
    openTimelineWindow 
} from './ui.js';

console.log("SCRIPT EXECUTION STARTED - SnugOS (main.js refactored v12 - Sequencer Mode & Playback Fixes)");

// --- Global UI Elements Cache ---
const uiElementsCache = {
    desktop: null, taskbar: null, startButton: null, startMenu: null,
    taskbarButtonsContainer: null, taskbarTempoDisplay: null, loadProjectInput: null,
    customBgInput: null, sampleFileInput: null, notificationArea: null, modalContainer: null,
    menuAddSynthTrack: null, menuAddSamplerTrack: null, menuAddDrumSamplerTrack: null,
    menuAddInstrumentSamplerTrack: null, menuAddAudioTrack: null, 
    menuOpenSoundBrowser: null, 
    menuOpenTimeline: null, 
    menuUndo: null, menuRedo: null,
    menuSaveProject: null, menuLoadProject: null, menuExportWav: null, menuOpenGlobalControls: null,
    menuOpenMixer: null, menuOpenMasterEffects: null, 
    menuToggleFullScreen: null, playBtnGlobal: null, recordBtnGlobal: null,
    tempoGlobalInput: null, midiInputSelectGlobal: null, masterMeterContainerGlobal: null,
    masterMeterBarGlobal: null, midiIndicatorGlobal: null, keyboardIndicatorGlobal: null,
    playbackModeToggleBtnGlobal: null, // Added playbackModeToggleBtnGlobal
};

const DESKTOP_BACKGROUND_KEY = 'snugosDesktopBackground';

// Forward declaration for functions used in appServices
function handleCustomBackgroundUpload(event) {
    const file = event.target.files[0];
    if (file?.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataURL = e.target.result;
            try {
                localStorage.setItem(DESKTOP_BACKGROUND_KEY, dataURL);
                applyDesktopBackground(dataURL);
                showNotification("Custom background applied.", 2000);
            } catch (error) {
                console.error("Error saving background to localStorage:", error);
                showNotification("Could not save background: Storage full or image too large.", 4000);
            }
        };
        reader.onerror = (err) => {
            console.error("Error reading background file:", err);
            showNotification("Error reading background file.", 3000);
        };
        reader.readAsDataURL(file);
    } else if (file) {
        showNotification("Invalid file type. Please select an image.", 3000);
    }
    if (event.target) event.target.value = null; // Reset file input
}

function removeCustomDesktopBackground() {
    localStorage.removeItem(DESKTOP_BACKGROUND_KEY);
    applyDesktopBackground(null); // Revert to default
    showNotification("Custom background removed.", 2000);
}


const appServices = {
    // UI Module Functions
    openTrackInspectorWindow, openTrackEffectsRackWindow, openTrackSequencerWindow,
    openMixerWindow, updateMixerWindow, openSoundBrowserWindow, openMasterEffectsRackWindow,
    renderSoundBrowserDirectory, updateSoundBrowserDisplayForLibrary, highlightPlayingStep,
    drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI,
    updateDrumPadControlsUI, renderDrumSamplerPads, renderEffectsList, renderEffectControls,
    createKnob, updateSequencerCellUI, showNotification, createContextMenu,
    renderTimeline, 
    openTimelineWindow, 
    
    // Audio Module Functions
    initAudioContextAndMasterMeter, updateMeters, fetchSoundLibrary, loadSoundFromBrowserToTarget,
    playSlicePreview, playDrumSamplerPadPreview, loadSampleFile, loadDrumSamplerPadFile,
    autoSliceSample, getMimeTypeFromFilename,
    getMasterEffectsBusInputNode,
    getActualMasterGainNode: getActualMasterGainNodeFromAudio,
    clearAllMasterEffectNodes: clearAllMasterEffectNodesInAudio,
    startAudioRecording, 
    stopAudioRecording,  

    // State Module Getters
    getTracks: getTracksState, getTrackById: getTrackByIdState,
    getOpenWindows: getOpenWindowsState, getWindowById: getWindowByIdState,
    getHighestZ: getHighestZState,
    getMasterEffects: getMasterEffectsState, getMasterGainValue: getMasterGainValueState,
    getMidiAccess: getMidiAccessState, getActiveMIDIInput: getActiveMIDIInputState,
    getLoadedZipFiles: getLoadedZipFilesState, getSoundLibraryFileTrees: getSoundLibraryFileTreesState,
    getCurrentLibraryName: getCurrentLibraryNameState, getCurrentSoundFileTree: getCurrentSoundFileTreeState,
    getCurrentSoundBrowserPath: getCurrentSoundBrowserPathState, getPreviewPlayer: getPreviewPlayerState,
    getClipboardData: getClipboardDataState, getArmedTrackId: getArmedTrackIdState,
    getSoloedTrackId: getSoloedTrackIdState, isTrackRecording: isTrackRecordingState,
    getRecordingTrackId: getRecordingTrackIdState,
    getActiveSequencerTrackId: getActiveSequencerTrackIdState,
    getUndoStack: getUndoStackState, getRedoStack: getRedoStackState,
    getPlaybackMode: getPlaybackModeState, // Pass the getter from state.js

    // State Module Setters
    addWindowToStore: addWindowToStoreState, removeWindowFromStore: removeWindowFromStoreState,
    setHighestZ: setHighestZState, incrementHighestZ: incrementHighestZState,
    setMasterEffects: setMasterEffectsState, setMasterGainValue: setMasterGainValueState,
    setMidiAccess: setMidiAccessState, setActiveMIDIInput: setActiveMIDIInputState,
    setLoadedZipFiles: setLoadedZipFilesState, setSoundLibraryFileTrees: setSoundLibraryFileTreesState,
    setCurrentLibraryName: setCurrentLibraryNameState, setCurrentSoundFileTree: setCurrentSoundFileTreeState,
    setCurrentSoundBrowserPath: setCurrentSoundBrowserPathState, setPreviewPlayer: setPreviewPlayerState,
    setClipboardData: setClipboardDataState, setArmedTrackId: setArmedTrackIdState,
    setSoloedTrackId: setSoloedTrackIdState, setIsRecording: setIsRecordingState,
    setRecordingTrackId: setRecordingTrackIdState, setRecordingStartTime: setRecordingStartTimeState,
    setActiveSequencerTrackId: setActiveSequencerTrackIdState,
    setPlaybackMode: setPlaybackModeState, // Pass the setter from state.js

    // Core State Actions
    addTrack: addTrackToStateInternal, removeTrack: removeTrackFromStateInternal,
    captureStateForUndo: captureStateForUndoInternal, undoLastAction: undoLastActionInternal,
    redoLastAction: redoLastActionInternal, gatherProjectData: gatherProjectDataInternal,
    reconstructDAW: reconstructDAWInternal, saveProject: saveProjectInternal,
    loadProject: loadProjectInternal, handleProjectFileLoad: handleProjectFileLoadInternal,
    exportToWav: exportToWavInternal,

    // Event Handler Passthroughs
    selectMIDIInput, handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer,

    // UI Update Triggers / Callbacks
    updateTaskbarTempoDisplay: (tempo) => {
        if (uiElementsCache.taskbarTempoDisplay) {
            uiElementsCache.taskbarTempoDisplay.textContent = `${parseFloat(tempo).toFixed(1)} BPM`;
        }
    },
    updateUndoRedoButtonsUI: (undoState, redoState) => {
        if (uiElementsCache.menuUndo) {
            uiElementsCache.menuUndo.classList.toggle('disabled', !undoState);
            uiElementsCache.menuUndo.title = undoState ? `Undo: ${undoState.description}` : 'Undo (Nothing to undo)';
        }
        if (uiElementsCache.menuRedo) {
            uiElementsCache.menuRedo.classList.toggle('disabled', !redoState);
            uiElementsCache.menuRedo.title = redoState ? `Redo: ${redoState.description}` : 'Redo (Nothing to redo)';
        }
    },
    updateRecordButtonUI: (isRec) => {
        if (uiElementsCache.recordBtnGlobal) {
            uiElementsCache.recordBtnGlobal.textContent = isRec ? 'Stop Rec' : 'Record';
            uiElementsCache.recordBtnGlobal.classList.toggle('recording', isRec); // Use a class for styling
        }
    },
    closeAllWindows: (isReconstruction = false) => {
        getOpenWindowsState().forEach(win => win.close(isReconstruction)); // Pass reconstruction flag
        if (appServices.clearOpenWindowsMap) appServices.clearOpenWindowsMap(); // Ensure map is cleared
    },
    clearOpenWindowsMap: () => { // Helper to clear the map in state
        const map = getOpenWindowsState();
        if(map && typeof map.clear === 'function') map.clear();
    },
    closeAllTrackWindows: (trackIdToClose) => { // Closes windows specific to a track
        console.log(`[Main appServices.closeAllTrackWindows] Called for trackId: ${trackIdToClose}`); 
        const windowIdsToClose = [
            `trackInspector-${trackIdToClose}`, `effectsRack-${trackIdToClose}`, `sequencerWin-${trackIdToClose}`
        ];
        console.log(`[Main appServices.closeAllTrackWindows] Window IDs to attempt closing:`, windowIdsToClose); 
        windowIdsToClose.forEach(winId => {
            const win = getWindowByIdState(winId); // Get window from state
            if (win && typeof win.close === 'function') {
                console.log(`[Main appServices.closeAllTrackWindows] Found window '${winId}'. Calling its close() method.`); 
                win.close(true); // true for isReconstruction to suppress undo
            } else if (win) {
                console.warn(`[Main appServices.closeAllTrackWindows] Found window '${winId}', but it has no close method or is not a function.`); 
            } else {
                // console.log(`[Main appServices.closeAllTrackWindows] Window '${winId}' NOT found in state.`); // Less verbose
            }
        });
    },
    updateTrackUI: handleTrackUIUpdate, // Centralized UI update router
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices), // Pass appServices to SnugWindow
    uiElementsCache: uiElementsCache, // Provide access to cached UI elements

    // Master Effects Chain - State and Audio interaction
    addMasterEffect: async (effectType) => {
        const isReconstructing = appServices.getIsReconstructingDAW();
        if (!isReconstructing) captureStateForUndoInternal(`Add ${effectType} to Master`);
        const defaultParams = appServices.effectsRegistryAccess.getEffectDefaultParams(effectType);
        const effectIdInState = addMasterEffectToState(effectType, defaultParams); // Add to state
        await addMasterEffectToAudio(effectIdInState, effectType, defaultParams); // Add to audio chain
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI(); // Update UI
    },
    removeMasterEffect: async (effectId) => {
        const effect = getMasterEffectsState().find(e => e.id === effectId);
        if (effect) {
            const isReconstructing = appServices.getIsReconstructingDAW();
            if (!isReconstructing) captureStateForUndoInternal(`Remove ${effect.type} from Master`);
            removeMasterEffectFromState(effectId); // Remove from state
            await removeMasterEffectFromAudio(effectId); // Remove from audio chain
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI(); // Update UI
        }
    },
    updateMasterEffectParam: (effectId, paramPath, value) => {
        // No undo capture here; individual knob/control changes might do it or rely on broader action undo
        updateMasterEffectParamInState(effectId, paramPath, value); // Update state
        updateMasterEffectParamInAudio(effectId, paramPath, value); // Update audio node
        // UI update for the specific control should happen in its own callback
    },
    reorderMasterEffect: (effectId, newIndex) => {
        const isReconstructing = appServices.getIsReconstructingDAW();
        if (!isReconstructing) captureStateForUndoInternal(`Reorder Master effect`);
        reorderMasterEffectInState(effectId, newIndex); // Update state
        reorderMasterEffectInAudio(effectId, newIndex); // Update audio chain (effectively a rebuild)
        if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI(); // Update UI
    },
    setActualMasterVolume: (volumeValue) => { // Directly sets the Tone.Gain node for master
        const actualMasterNode = getActualMasterGainNodeFromAudio();
        if (actualMasterNode && actualMasterNode.gain) {
            actualMasterNode.gain.value = volumeValue;
        }
    },
    // Access to effects registry definitions
    effectsRegistryAccess: {
        AVAILABLE_EFFECTS: null, // Populated from effectsRegistry.js
        getEffectParamDefinitions: null,
        getEffectDefaultParams: null,
        synthEngineControlDefinitions: null,
    },
    // Reconstruction flag
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag,
    _isReconstructingDAW_flag: false,
    // Transport events flag (to prevent multiple initializations if Global Controls window is reopened)
    _transportEventsInitialized_flag: false,
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = value; },
    // Metering UI updates
    updateTrackMeterUI: (trackId, level, isClipping) => {
        const inspectorWindow = getWindowByIdState(`trackInspector-${trackId}`);
        const mixerWindow = getWindowByIdState('mixer');
        if (inspectorWindow?.element && !inspectorWindow.isMinimized) {
            const meterBar = inspectorWindow.element.querySelector(`#trackMeterBar-${trackId}`);
            if (meterBar) {
                meterBar.style.width = `${Math.min(100, level * 100)}%`;
                meterBar.classList.toggle('clipping', isClipping);
            }
        }
        if (mixerWindow?.element && !mixerWindow.isMinimized) {
            const meterBar = mixerWindow.element.querySelector(`#mixerTrackMeterBar-${trackId}`);
            if (meterBar) {
                meterBar.style.width = `${Math.min(100, level * 100)}%`;
                meterBar.classList.toggle('clipping', isClipping);
            }
        }
    },
    updateMasterEffectsRackUI: () => { // Specific UI update for master rack
        const masterRackWindow = getWindowByIdState('masterEffectsRack');
        if (masterRackWindow?.element && !masterRackWindow.isMinimized) {
            renderEffectsList(null, 'master', masterRackWindow.element.querySelector('#effectsList-master'), masterRackWindow.element.querySelector('#effectControlsContainer-master'));
        }
    },
    // Custom Desktop Background
    triggerCustomBackgroundUpload: () => {
        if (uiElementsCache.customBgInput) {
            uiElementsCache.customBgInput.click();
        }
    },
    removeCustomDesktopBackground: removeCustomDesktopBackground,
    // Callback for playback mode changes
    onPlaybackModeChange: (newMode) => { // MODIFIED
        console.log(`[Main appServices.onPlaybackModeChange] Called with newMode: ${newMode}`);
        if (uiElementsCache.playbackModeToggleBtnGlobal) {
            // MODIFIED: Display "Sequencer" instead of "Pattern"
            uiElementsCache.playbackModeToggleBtnGlobal.textContent = newMode === 'timeline' ? 'Mode: Timeline' : 'Mode: Sequencer';
            uiElementsCache.playbackModeToggleBtnGlobal.classList.toggle('active', newMode === 'timeline');
            console.log(`[Main appServices.onPlaybackModeChange] Button text updated to: ${uiElementsCache.playbackModeToggleBtnGlobal.textContent}`);
        } else {
            console.warn("[Main appServices.onPlaybackModeChange] Playback mode toggle button not found in UI cache (uiElementsCache.playbackModeToggleBtnGlobal).");
        }
        if (appServices.renderTimeline) { // Ensure timeline UI reflects mode change (e.g., playhead visibility)
            console.log("[Main appServices.onPlaybackModeChange] Calling renderTimeline.");
            appServices.renderTimeline();
        }
    }
};

// --- UI Update Router ---
function handleTrackUIUpdate(trackId, reason, detail) {
    const track = getTrackByIdState(trackId);
    if (!track) {
        console.warn(`[Main UI Update] Track ${trackId} not found for reason: ${reason}`);
        return;
    }

    const inspectorWindow = getWindowByIdState(`trackInspector-${trackId}`);
    const effectsRackWindow = getWindowByIdState(`effectsRack-${trackId}`);
    const sequencerWindow = getWindowByIdState(`sequencerWin-${trackId}`);
    const mixerWindow = getWindowByIdState('mixer'); // Mixer window is global

    switch(reason) {
        case 'muteChanged':
        case 'soloChanged':
        case 'armChanged':
            // Update inspector if open
            if (inspectorWindow?.element && !inspectorWindow.isMinimized) {
                const muteBtn = inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
                const soloBtn = inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
                const armBtn = inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);
                if (muteBtn) muteBtn.classList.toggle('muted', track.isMuted);
                if (soloBtn) soloBtn.classList.toggle('soloed', getSoloedTrackIdState() === track.id);
                if (armBtn) armBtn.classList.toggle('armed', getArmedTrackIdState() === track.id);
            }
            // Update mixer if open
            if (mixerWindow?.element && !mixerWindow.isMinimized) updateMixerWindow();
            break;
        case 'effectsListChanged':
             if (effectsRackWindow?.element && !effectsRackWindow.isMinimized) {
                renderEffectsList(track, 'track', effectsRackWindow.element.querySelector(`#effectsList-${track.id}`), effectsRackWindow.element.querySelector(`#effectControlsContainer-${track.id}`));
             }
            break;
        case 'samplerLoaded': // For Slicer Sampler
        case 'instrumentSamplerLoaded': // For Instrument Sampler
            if (inspectorWindow?.element && !inspectorWindow.isMinimized) {
                if (track.type === 'Sampler') { drawWaveform(track); renderSamplePads(track); updateSliceEditorUI(track); }
                else if (track.type === 'InstrumentSampler') drawInstrumentWaveform(track);

                // Update Drop Zone
                const dzContainerId = track.type === 'Sampler' ? `#dropZoneContainer-${track.id}-sampler` : `#dropZoneContainer-${track.id}-instrumentsampler`;
                const dzContainer = inspectorWindow.element.querySelector(dzContainerId);
                if(dzContainer) {
                    const audioData = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                    const inputId = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;
                    dzContainer.innerHTML = createDropZoneHTML(track.id, inputId, track.type, null, {originalFileName: audioData.fileName, status: 'loaded'});
                    
                    // Re-attach event listeners for the new drop zone elements
                    const fileInputEl = dzContainer.querySelector(`#${inputId}`);
                    const loadFn = appServices.loadSampleFile; // Assuming loadSampleFile handles both Sampler and InstrumentSampler types
                    if (fileInputEl && loadFn) fileInputEl.onchange = (e) => loadFn(e, track.id, track.type);

                    const newDropZoneDiv = dzContainer.querySelector('.drop-zone');
                    if (newDropZoneDiv) {
                        setupGenericDropZoneListeners(
                            newDropZoneDiv,
                            track.id,
                            track.type,
                            null, // padOrSliceIndex is null for main sampler drop zones
                            appServices.loadSoundFromBrowserToTarget,
                            appServices.loadSampleFile, // loadFileCallback for OS drops
                            appServices.getTrackById // To get track instance if needed by callbacks
                        );
                    }
                }
            }
            break;
        case 'drumPadLoaded': // For Drum Sampler
             if (inspectorWindow?.element && !inspectorWindow.isMinimized) { updateDrumPadControlsUI(track); renderDrumSamplerPads(track); }
            break;
        case 'sequencerContentChanged': // When sequence data or length changes
            if (sequencerWindow?.element && !sequencerWindow.isMinimized) {
                // Force redraw of the sequencer window by re-opening it with its current state
                openTrackSequencerWindow(trackId, true, sequencerWindow.options);
            }
            if (appServices.renderTimeline) appServices.renderTimeline(); // Update timeline if sequence clips are affected
            break;
        case 'sampleLoadError': // Handle errors for various sampler types
            if (inspectorWindow?.element && !inspectorWindow.isMinimized) {
                let dzContainerId, audioDataKey, inputIdBase, targetDropZoneElement;
                
                if (track.type === 'DrumSampler' && typeof detail === 'number') { // detail is padIndex
                    dzContainerId = `#drumPadDropZoneContainer-${track.id}-${detail}`;
                    audioDataKey = track.drumSamplerPads[detail];
                    inputIdBase = `drumPadFileInput-${track.id}-${detail}`;
                     targetDropZoneElement = inspectorWindow.element.querySelector(dzContainerId);
                     if (targetDropZoneElement) {
                        targetDropZoneElement.innerHTML = createDropZoneHTML(track.id, inputIdBase, track.type, detail, {originalFileName: audioDataKey.fileName, status: 'error'});
                        const fileInputEl = targetDropZoneElement.querySelector(`#${inputIdBase}`);
                        const loadDrumFn = appServices.loadDrumSamplerPadFile;
                        if (fileInputEl && loadDrumFn) { // Re-attach listener
                            fileInputEl.onchange = (e) => loadDrumFn(e, track.id, detail);
                        }
                        // Re-attach generic drop zone listeners if needed
                        const newDropZoneDiv = targetDropZoneElement.querySelector('.drop-zone');
                        if (newDropZoneDiv) {
                            setupGenericDropZoneListeners(newDropZoneDiv, track.id, track.type, detail, appServices.loadSoundFromBrowserToTarget, loadDrumFn);
                        }
                    }

                } else if (track.type === 'Sampler') {
                    dzContainerId = `#dropZoneContainer-${track.id}-sampler`; 
                    audioDataKey = track.samplerAudioData; 
                    inputIdBase = `fileInput-${track.id}`;
                } else if (track.type === 'InstrumentSampler') {
                    dzContainerId = `#dropZoneContainer-${track.id}-instrumentsampler`; 
                    audioDataKey = track.instrumentSamplerSettings; 
                    inputIdBase = `instrumentFileInput-${track.id}`;
                }

                // Common logic for Sampler and InstrumentSampler error UI update
                if (dzContainerId && audioDataKey && (track.type === 'Sampler' || track.type === 'InstrumentSampler')) {
                    targetDropZoneElement = inspectorWindow.element.querySelector(dzContainerId);
                    if (targetDropZoneElement) {
                        targetDropZoneElement.innerHTML = createDropZoneHTML(track.id, inputIdBase, track.type, null, {originalFileName: audioDataKey.fileName, status: 'error'});
                        const fileInputEl = targetDropZoneElement.querySelector(`#${inputIdBase}`);
                        const loadSampleFn = appServices.loadSampleFile;
                        if (fileInputEl && loadSampleFn) { // Re-attach listener
                            fileInputEl.onchange = (e) => loadSampleFn(e, track.id, track.type);
                        }
                        // Re-attach generic drop zone listeners
                        const newDropZoneDiv = targetDropZoneElement.querySelector('.drop-zone');
                        if (newDropZoneDiv) {
                            setupGenericDropZoneListeners(newDropZoneDiv, track.id, track.type, null, appServices.loadSoundFromBrowserToTarget, loadSampleFn);
                        }
                    }
                }
            }
            break;
        // Add more cases as needed for other UI updates
    }
}

// --- Main Application Initialization ---
async function initializeSnugOS() {
    console.log("[Main] Initializing SnugOS...");

    // Cache essential UI elements from index.html
    Object.keys(uiElementsCache).forEach(key => {
        if (document.getElementById(key)) { // Check if element exists
             uiElementsCache[key] = document.getElementById(key);
        }
        // No warning if not found, as some elements might be dynamically created by windows
    });
    
    // Dynamically import effects registry to make its definitions available
    const effectsRegistry = await import('./effectsRegistry.js');
    appServices.effectsRegistryAccess.AVAILABLE_EFFECTS = effectsRegistry.AVAILABLE_EFFECTS;
    appServices.effectsRegistryAccess.getEffectParamDefinitions = effectsRegistry.getEffectParamDefinitions;
    appServices.effectsRegistryAccess.getEffectDefaultParams = effectsRegistry.getEffectDefaultParams;
    appServices.effectsRegistryAccess.synthEngineControlDefinitions = effectsRegistry.synthEngineControlDefinitions;


    // Apply custom background if saved
    applyDesktopBackground(localStorage.getItem(DESKTOP_BACKGROUND_KEY));
    if (uiElementsCache.customBgInput) { // Attach listener for background changes
        uiElementsCache.customBgInput.addEventListener('change', handleCustomBackgroundUpload);
    }

    // Initialize core modules, passing appServices for inter-module communication
    initializeStateModule(appServices);
    initializeUIModule(appServices);
    initializeAudioModule(appServices);
    initializeEventHandlersModule(appServices); // Depends on other modules being somewhat ready

    // Setup primary event listeners for desktop, start menu, etc.
    initializePrimaryEventListeners(appServices); // Pass appServices context

    // Open and setup the Global Controls window
    openGlobalControlsWindow((elements) => {
        // Cache elements from the global controls window
        uiElementsCache.playBtnGlobal = elements.playBtnGlobal;
        uiElementsCache.recordBtnGlobal = elements.recordBtnGlobal;
        uiElementsCache.tempoGlobalInput = elements.tempoGlobalInput;
        uiElementsCache.midiInputSelectGlobal = elements.midiInputSelectGlobal;
        uiElementsCache.masterMeterContainerGlobal = elements.masterMeterContainerGlobal;
        uiElementsCache.masterMeterBarGlobal = elements.masterMeterBarGlobal;
        uiElementsCache.midiIndicatorGlobal = elements.midiIndicatorGlobal;
        uiElementsCache.keyboardIndicatorGlobal = elements.keyboardIndicatorGlobal;
        uiElementsCache.playbackModeToggleBtnGlobal = elements.playbackModeToggleBtnGlobal; // Cache the button
        // Attach event listeners to these global controls
        attachGlobalControlEvents(elements); // This function is in eventHandlers.js
        setupMIDI(); // Initialize MIDI (eventHandlers.js)
    }, null); // null for savedState initially

    // Fetch sound libraries (can happen in background)
    Object.entries(Constants.soundLibraries).forEach(([name, url]) => fetchSoundLibrary(name, url, true)); // true for autofetch

    // Open timeline window by default
    if (appServices.openTimelineWindow) {
        appServices.openTimelineWindow();
    }
    
    // Start the UI meter update loop
    requestAnimationFrame(updateMetersLoop);
    // Initialize undo/redo button states
    appServices.updateUndoRedoButtonsUI(null, null); // No actions initially
    // Initialize playback mode button display
    if (appServices.onPlaybackModeChange) appServices.onPlaybackModeChange(getPlaybackModeState());


    showNotification("Welcome to SnugOS!", 2500);
    console.log("[Main] SnugOS Initialized.");
}

// Loop to update UI meters
function updateMetersLoop() {
    const mixerWindow = getWindowByIdState('mixer');
    const mixerMasterMeterBar = mixerWindow?.element && !mixerWindow.isMinimized ? mixerWindow.element.querySelector('#mixerMasterMeterBar') : null;
    updateMeters(uiElementsCache.masterMeterBarGlobal, mixerMasterMeterBar, getTracksState()); // updateMeters is in audio.js
    updatePlayheadPosition(); // Update timeline playhead (ui.js)
    requestAnimationFrame(updateMetersLoop);
}

// Applies a saved desktop background or the default
function applyDesktopBackground(imageUrl) {
    if (uiElementsCache.desktop && imageUrl) {
        uiElementsCache.desktop.style.backgroundImage = `url('${imageUrl}')`;
        uiElementsCache.desktop.style.backgroundSize = 'cover';
        uiElementsCache.desktop.style.backgroundPosition = 'center center';
        uiElementsCache.desktop.style.backgroundRepeat = 'no-repeat';
        uiElementsCache.desktop.style.backgroundColor = ''; // Clear solid color if image is set
    } else if (uiElementsCache.desktop) {
        uiElementsCache.desktop.style.backgroundImage = ''; // Remove image
        uiElementsCache.desktop.style.backgroundColor = Constants.defaultDesktopBg || '#101010'; // Default color
    }
}


// --- Global Event Listeners ---
window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    // Warn user if there's unsaved work
    if (getTracksState().length > 0 || getUndoStackState().length > 0) {
        e.preventDefault(); // Standard way to trigger confirmation
        e.returnValue = ''; // For older browsers
    }
});

console.log("SCRIPT EXECUTION FINISHED - SnugOS (main.js refactored v12 - Sequencer Mode & Playback Fixes)");

