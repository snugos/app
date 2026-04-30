// force rebuild
// js/main.js - Main Application Logic Orchestrator

// --- Module Imports ---
import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';
import { DESKTOP_BACKGROUND_KEY, DESKTOP_BG_TYPE_KEY } from './constants.js';
import { getAudio as bgDbGetAudio, storeAudio as bgDbStoreAudio, deleteAudio as bgDbDeleteAudio } from './db.js';
import { 
    startMetronome, stopMetronome, setMetronomeVolume,
    initAudioContextAndMasterMeter, clearAllMasterEffectNodes, 
    addMasterEffectToAudio, getActualMasterGainNode,
    createSendBusInAudio, deleteSendBusFromAudio, addEffectToSendBus, removeEffectFromSendBus,
    reorderEffectInSendBus, updateSendBusEffectParam, setSendBusLevel, setSendBusMuted,
    connectTrackToSendBus, disconnectTrackFromSendBus, setTrackSendLevel,
    getSendBusNodes, getTrackSendNodes, getMasterEffectsBusInputNode, getMimeTypeFromFilename
} from './audio.js';
// setupGenericDropZoneListeners is imported here but used via appServices by ui.js
import { showNotification as utilShowNotification, createContextMenu, createDropZoneHTML, setupGenericDropZoneListeners } from './utils.js';
import {
    initializeEventHandlersModule, initializePrimaryEventListeners, setupMIDI, attachGlobalControlEvents,
    selectMIDIInput as eventSelectMIDIInput, 
    handleTrackMute as eventHandleTrackMute,
    handleTrackSolo as eventHandleTrackSolo,
    handleTrackArm as eventHandleTrackArm,
    handleRemoveTrack as eventHandleRemoveTrack,
    handleOpenTrackInspector as eventHandleOpenTrackInspector,
    handleOpenEffectsRack as eventHandleOpenEffectsRack,
    handleOpenSequencer as eventHandleOpenSequencer,
    handleTimelineLaneDrop
} from './eventHandlers.js';
import {
    openTrackSequencerWindow, openTrackInspectorWindow, openTrackEffectsRackWindow,
    openMasterEffectsRackWindow, openSendEffectsWindow, openGlobalControlsWindow,
    openSoundBrowserWindow, openMixerWindow, updateMixerWindow, openTrackTemplatesWindow,
    openAudioClipEditorWindow, openTimelineWindow,
    showKeyboardShortcutsHelpWindow
} from './ui.js';
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
    getMetronomeEnabledState,
    getMetronomeVolumeState,
    getScaleModeState,
    getScaleModeEnabledState,
    getScaleModeScaleState,
    getScaleModeRootState,
    getScaleModeLockState,
    // Chord Mode state
    getChordModeState,
    getChordModeEnabledState,
    getChordModeRootState,
    getChordModeTypeState,
    getChordModeLockState,
    getChordVoicingState,
    // Ghost Track state
    getGhostTrackIdState,
    // Swing state
    getSwingState,
    getSwingEnabledState,
    getSwingAmountState,
    // Timeline Markers state
    getTimelineMarkersState,
    getTimelineMarkerByIdState,
    addTimelineMarkerState,
    setTimelineMarkerState,
    removeTimelineMarkerState,
    clearTimelineMarkersState,
    // Timeline Zoom state
    getTimelineZoomState,
    getTimelineZoomLevelState,
    setTimelineZoomLevelState,
    getTimelineVerticalZoomState,
    setTimelineVerticalZoomState,
    zoomInTimeline,
    zoomOutTimeline,
    zoomInVerticalTimeline,
    zoomOutVerticalTimeline,
    resetTimelineZoom,
    // Send Tracks state
    getSendTracksState,
    getSendTrackByIdState,
    getTrackSendsState,
    getTrackSendLevelState,
    getTrackSendPreFaderState,
    // State Setters & Core Actions
    addWindowToStoreState, removeWindowFromStoreState, setHighestZState, incrementHighestZState,
    setMasterEffectsState, setMasterGainValueState,
    setMidiAccessState, setActiveMIDIInputState,
    setLoadedZipFilesState,
    setSoundLibraryFileTreesState,
    setCurrentLibraryNameState, setCurrentSoundFileTreeState, setCurrentSoundBrowserPathState, setPreviewPlayerState,
    setClipboardDataState, setArmedTrackIdState, setSoloedTrackIdState, setIsRecordingState,
    setRecordingTrackIdState, setRecordingStartTimeState, setActiveSequencerTrackIdState,
    setPlaybackModeState,
    setMetronomeEnabledState,
    setMetronomeVolumeState,
    setScaleModeEnabledState,
    setScaleModeScaleState,
    setScaleModeRootState,
    setScaleModeLockState,
    // Chord Mode state setters
    setChordModeEnabledState,
    setChordModeRootState,
    setChordModeTypeState,
    setChordModeLockState,
    // Ghost Track state setters
    setGhostTrackIdState,
    // Swing state setters
    setSwingState,
    setSwingEnabledState,
    setSwingAmountState,
    // Send Tracks setters
    addSendTrackState,
    removeSendTrackState,
    setSendTrackNameState,
    setSendTrackLevelState,
    setSendTrackMutedState,
    setSendTrackEffectsState,
    setTrackSendLevelState,
    addSendTrackState as addSendTrack,
    setSendTrackMutedState as setSendTrackMuted,
    setSendTrackLevelState as setSendTrackLevel,
    // Master Effects state actions
    addMasterEffectToState,
    removeMasterEffectFromState,
    updateMasterEffectParamInState,
    reorderMasterEffectInState,
    removeMasterEffectFromAudio,
    updateMasterEffectParamInAudio,
    reorderMasterEffectInAudio,
    // Track Groups
    getTrackGroupsState,
    getTrackGroupByIdState,
    addTrackGroupState,
    setTrackGroupNameState,
    setTrackGroupColorState,
    addTrackToGroupState,
    removeTrackFromGroupState,
    setTrackGroupMutedState,
    setTrackGroupSoloedState,
    removeTrackGroupState,
    // Track Templates
    getTrackTemplatesState,
    getTrackTemplateByIdState,
    addTrackTemplateState,
    updateTrackTemplateState,
    removeTrackTemplateState,
    // Track Actions
    addTrackToStateInternal,
    // Project Save/Load/Export
    saveProjectInternal,
    loadProjectInternal,
    handleProjectFileLoadInternal,
    exportToWavInternal,
    exportToMidiInternal,
    importFromMidiInternal,
    // Undo/Redo
    undoLastActionInternal,
    redoLastActionInternal,
    captureStateForUndoInternal,
} from './state.js';

// --- Global UI Elements Cache ---
let uiElementsCache = {};

// --- App Services Object ---
const appServices = {
    // Event Handler Passthroughs
    selectMIDIInput: eventSelectMIDIInput, 
    handleTrackMute: eventHandleTrackMute,
    handleTrackSolo: eventHandleTrackSolo,
    handleTrackArm: eventHandleTrackArm,
    handleRemoveTrack: eventHandleRemoveTrack,
    handleOpenTrackInspector: eventHandleOpenTrackInspector,
    handleOpenEffectsRack: eventHandleOpenEffectsRack,
    handleOpenSequencer: eventHandleOpenSequencer,
    handleTimelineLaneDrop: handleTimelineLaneDrop,
    attachGlobalControlEvents: attachGlobalControlEvents, // FIX: Expose for reconstruction
    getTrackById: getTrackByIdState, // Expose track lookup for UI components
    getTracks: getTracksState, // Expose tracks for Track.js and other modules
    getSoloedTrackId: getSoloedTrackIdState, // Expose solo state for Track.js
    getArmedTrackId: getArmedTrackIdState, // Expose armed state for Track.js

    // Add Track - orchestrator that calls state.js function and opens sequencer if needed
    addTrack: async (type, options = {}) => {
        if (appServices.captureStateForUndo) {
            appServices.captureStateForUndo(`Add ${type} Track`);
        }
        const newTrack = await addTrackToStateInternal(type, { name: options.name });
        if (newTrack && appServices.updateTrackUI) {
            appServices.updateTrackUI(newTrack.id, 'trackAdded');
        }
        if (newTrack && type !== 'Audio' && appServices.openTrackSequencerWindow) {
            appServices.openTrackSequencerWindow(newTrack.id, true);
        }
        return newTrack;
    },

    // Project Save/Load/Export
    saveProject: saveProjectInternal,
    loadProject: loadProjectInternal,
    handleProjectFileLoad: handleProjectFileLoadInternal,
    exportToWav: exportToWavInternal,
    exportToMidi: exportToMidiInternal,
    importFromMidi: importFromMidiInternal,

    // Undo/Redo
    undoLastAction: undoLastActionInternal,
    redoLastAction: redoLastActionInternal,
    captureStateForUndo: captureStateForUndoInternal,

    getAudioBlobFromSoundBrowserItem: async (soundData) => {
        if (!soundData || !soundData.libraryName || !soundData.fullPath) {
            console.warn("[AppServices getAudioBlob] Invalid soundData:", soundData);
            return null;
        }
        const loadedZips = getLoadedZipFilesState(); 
        if (loadedZips?.[soundData.libraryName] && loadedZips[soundData.libraryName] !== "loading") {
            const zipEntry = loadedZips[soundData.libraryName].file(soundData.fullPath);
            if (zipEntry) {
                try {
                    const blob = await zipEntry.async("blob");
                    return new File([blob], soundData.fileName, { type: getMimeTypeFromFilename(soundData.fileName) });
                } catch (e) {
                    console.error("[AppServices getAudioBlob] Error getting blob from zipEntry:", e);
                    return null;
                }
            } else {
                console.warn(`[AppServices getAudioBlob] ZipEntry not found for ${soundData.fullPath} in ${soundData.libraryName}`);
            }
        } else {
            console.warn(`[AppServices getAudioBlob] Library ${soundData.libraryName} not loaded or is loading.`);
        }
        return null;
    },

    loadAudioBufferSource: async (sampleSource) => {
        // Load audio from Sound Browser (sampleSource has filePath, libraryName, fullPath, fileName)
        if (!sampleSource || !sampleSource.filePath) {
            console.warn("[AppServices loadAudioBufferSource] Invalid sampleSource:", sampleSource);
            return null;
        }
        try {
            const file = await appServices.getAudioBlobFromSoundBrowserItem(sampleSource);
            if (file) {
                const arrayBuffer = await file.arrayBuffer();
                return arrayBuffer;
            }
        } catch (e) {
            console.error("[AppServices loadAudioBufferSource] Error loading audio from Sound Browser:", e);
        }
        return null;
    },

    panicStopAllAudio: () => {
        
        if (typeof Tone !== 'undefined') {
            Tone.Transport.stop();
            Tone.Transport.cancel(0); 
        }

        // Reset play button state
        const playBtn = uiElementsCache.playBtnGlobal;
        if (playBtn) {
            playBtn.textContent = 'Play';
            playBtn.classList.remove('playing');
        }

        const tracks = getTracksState();
        if (tracks) {
            tracks.forEach(track => {
                if (track && typeof track.stopPlayback === 'function') {
                    try {
                        track.stopPlayback(); 
                    } catch (e) {
                        console.warn(`Error in track.stopPlayback() for track ${track.id}:`, e);
                    }
                }

                if (track && track.instrument && !track.instrument.disposed) {
                    if (typeof track.instrument.releaseAll === 'function') {
                        try {
                            track.instrument.releaseAll(Tone.now()); 
                        } catch (e) {
                            console.warn(`Error during instrument.releaseAll() for track ${track.id}:`, e);
                        }
                    }
                    // Aggressive gain ramp-down for synth types
                    if ((track.type === 'Synth' || track.type === 'InstrumentSampler') && 
                        track.gainNode && track.gainNode.gain && 
                        typeof track.gainNode.gain.cancelScheduledValues === 'function' &&
                        typeof track.gainNode.gain.linearRampToValueAtTime === 'function' &&
                        !track.gainNode.disposed) {
                        try {
                            track.gainNode.gain.cancelScheduledValues(Tone.now());
                            track.gainNode.gain.linearRampToValueAtTime(0, Tone.now() + 0.02); 
                        } catch (e) {
                            console.warn(`Error ramping down gain for track ${track.id}:`, e);
                        }
                    }
                }
                
                if (track && track.type === 'Sampler' && track.slicerIsPolyphonic && track.slicerMonoPlayer && track.slicerMonoEnvelope) {
                    if (track.slicerMonoPlayer.state === 'started' && !track.slicerMonoPlayer.disposed) {
                        try { track.slicerMonoPlayer.stop(Tone.now()); } catch(e) { console.warn("Error stopping mono slicer player during panic", e); }
                    }
                    if (!track.slicerMonoEnvelope.disposed) {
                        try { track.slicerMonoEnvelope.triggerRelease(Tone.now()); } catch(e) { console.warn("Error releasing mono slicer envelope during panic", e); }
                    }
                }
                if (track && track.type === 'DrumSampler' && track.drumPadPlayers) {
                    track.drumPadPlayers.forEach(player => {
                        if (player && player.state === 'started' && !player.disposed) {
                            try { player.stop(Tone.now()); } catch(e) { console.warn("Error stopping drum pad player during panic", e); }
                        }
                    });
                }
            });
        }

        showSafeNotification("All audio stopped.", 1500);
    },

    updateTaskbarTempoDisplay: (tempo) => {
        if (uiElementsCache.taskbarTempoDisplay) {
            uiElementsCache.taskbarTempoDisplay.textContent = `${parseFloat(tempo).toFixed(1)} BPM`;
        } else { console.warn("Taskbar tempo display element not found in cache."); }
    },
    updateUndoRedoButtonsUI: (undoState, redoState) => {
        if (uiElementsCache.menuUndo) {
            uiElementsCache.menuUndo.classList.toggle('disabled', !undoState);
            uiElementsCache.menuUndo.title = undoState ? `Undo: ${undoState.description || 'action'}` : 'Undo (Nothing to undo)';
        } else { console.warn("Undo menu item not found in cache."); }
        if (uiElementsCache.menuRedo) {
            uiElementsCache.menuRedo.classList.toggle('disabled', !redoState);
            uiElementsCache.menuRedo.title = redoState ? `Redo: ${redoState.description || 'action'}` : 'Redo (Nothing to redo)';
        } else { console.warn("Redo menu item not found in cache."); }
    },
    updateRecordButtonUI: (isRec) => {
        if (uiElementsCache.recordBtnGlobal) {
            uiElementsCache.recordBtnGlobal.textContent = isRec ? 'Stop Rec' : 'Record';
            uiElementsCache.recordBtnGlobal.classList.toggle('recording', isRec);
        } else { console.warn("Global record button not found in cache."); }
    },
    closeAllWindows: (isReconstructing = false) => {
        const openWindows = getOpenWindowsState();
        if (openWindows && typeof openWindows.forEach === 'function') {
            openWindows.forEach(win => {
                if (win && typeof win.close === 'function') win.close(isReconstructing);
            });
        }
        if (appServices.clearOpenWindowsMap) appServices.clearOpenWindowsMap();
    },
    clearOpenWindowsMap: () => {
        const map = getOpenWindowsState();
        if(map && typeof map.clear === 'function') map.clear();
    },
    closeAllTrackWindows: (trackIdToClose) => {
        const windowIdsToClose = [
            `trackInspector-${trackIdToClose}`, `effectsRack-${trackIdToClose}`, `sequencerWin-${trackIdToClose}`
        ];
        windowIdsToClose.forEach(winId => {
            const win = getWindowByIdState(winId);
            if (win && typeof win.close === 'function') {
                win.close(true); 
            }
        });
    },
    updateTrackUI: handleTrackUIUpdate, 
    createWindow: (id, title, content, options) => new SnugWindow(id, title, content, options, appServices),
    uiElementsCache: uiElementsCache, 
    // Window management services - exposed for SnugWindow and other UI components
    getOpenWindows: () => getOpenWindowsState(),
    getHighestZ: () => getHighestZState(),
    setHighestZ: (z) => setHighestZState(z),
    incrementHighestZ: () => incrementHighestZState(),
    addWindowToStore: (id, win) => addWindowToStoreState(id, win),
    removeWindowFromStore: (id) => removeWindowFromStoreState(id),
    // Add getOpenWindowElement for mixer
    getOpenWindowElement: (winId) => {
        if (!getWindowByIdState) return null;
        const win = getWindowByIdState(winId);
        return (win?.element && !win.isMinimized) ? win.element : null;
    },

    addMasterEffect: async (effectType) => {
        try {
            const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;
            if (!isReconstructing && appServices.captureStateForUndo) appServices.captureStateForUndo(`Add ${effectType} to Master`);

            if (!appServices.effectsRegistryAccess?.getEffectDefaultParams) {
                console.error("effectsRegistryAccess.getEffectDefaultParams not available."); return;
            }
            const defaultParams = appServices.effectsRegistryAccess.getEffectDefaultParams(effectType);
            const effectIdInState = addMasterEffectToState(effectType, defaultParams);
            await addMasterEffectToAudio(effectIdInState, effectType, defaultParams);
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        } catch (error) {
            console.error(`[Main addMasterEffect] Error adding ${effectType}:`, error);
            showSafeNotification(`Failed to add master effect ${effectType}.`, 3000);
        }
    },
    removeMasterEffect: async (effectId) => {
        try {
            const effects = getMasterEffectsState();
            const effect = effects ? effects.find(e => e.id === effectId) : null;
            if (effect) {
                const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;
                if (!isReconstructing && appServices.captureStateForUndo) appServices.captureStateForUndo(`Remove ${effect.type} from Master`);
                removeMasterEffectFromState(effectId);
                await removeMasterEffectFromAudio(effectId);
                if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
            }
        } catch (error) {
            console.error(`[Main removeMasterEffect] Error removing ${effectId}:`, error);
            showSafeNotification("Failed to remove master effect.", 3000);
        }
    },
    updateMasterEffectParam: (effectId, paramPath, value) => {
        updateMasterEffectParamInState(effectId, paramPath, value);
        updateMasterEffectParamInAudio(effectId, paramPath, value);
    },
    reorderMasterEffect: (effectId, newIndex) => {
        try {
            const isReconstructing = appServices.getIsReconstructingDAW ? appServices.getIsReconstructingDAW() : false;
            if (!isReconstructing && appServices.captureStateForUndo) appServices.captureStateForUndo(`Reorder Master effect`);
            reorderMasterEffectInState(effectId, newIndex);
            reorderMasterEffectInAudio(effectId, newIndex); 
            if (appServices.updateMasterEffectsRackUI) appServices.updateMasterEffectsRackUI();
        } catch (error) {
            console.error(`[Main reorderMasterEffect] Error reordering ${effectId}:`, error);
            showSafeNotification("Failed to reorder master effect.", 3000);
        }
    },
    setActualMasterVolume: (volumeValue) => {
        if (typeof getActualMasterGainNode === 'function') {
            const actualMasterNode = getActualMasterGainNode();
            if (actualMasterNode && actualMasterNode.gain && typeof actualMasterNode.gain.setValueAtTime === 'function') {
                try {
                    actualMasterNode.gain.setValueAtTime(volumeValue, Tone.now());
                } catch (e) { console.error("Error setting master volume via Tone:", e); }
            } else { console.warn("Master gain node or its gain property not available."); }
        } else { console.warn("getActualMasterGainNode function not available."); }
    },
    effectsRegistryAccess: {
        AVAILABLE_EFFECTS: null, getEffectParamDefinitions: null,
        getEffectDefaultParams: null, synthEngineControlDefinitions: null,
    },
    updateMidiLearnMappingsList: null, // Will be set by attachGlobalControlEvents
    getIsReconstructingDAW: () => appServices._isReconstructingDAW_flag === true, 
    _isReconstructingDAW_flag: false,
    _transportEventsInitialized_flag: false,
    getTransportEventsInitialized: () => appServices._transportEventsInitialized_flag,
    setTransportEventsInitialized: (value) => { appServices._transportEventsInitialized_flag = !!value; },
    updateTrackMeterUI: (trackId, level, isClipping) => {
        try {
            const inspectorWindow = getWindowByIdState(`trackInspector-${trackId}`);
            const mixerWindow = getWindowByIdState('mixer');
            if (inspectorWindow?.element && !inspectorWindow.isMinimized) {
                const meterBar = inspectorWindow.element.querySelector(`#trackMeterBar-${trackId}`);
                if (meterBar) {
                    meterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
                    meterBar.classList.toggle('clipping', isClipping);
                }
            }
            if (mixerWindow?.element && !mixerWindow.isMinimized) {
                const meterBar = mixerWindow.element.querySelector(`#mixerTrackMeterBar-${trackId}`);
                if (meterBar) {
                    meterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
                    meterBar.classList.toggle('clipping', isClipping);
                }
            }
        } catch (error) { console.warn(`[Main updateTrackMeterUI] Error for track ${trackId}:`, error); }
    },
    updateMasterEffectsRackUI: () => {
        try {
            const masterRackWindow = getWindowByIdState('masterEffectsRack');
            if (masterRackWindow?.element && !masterRackWindow.isMinimized && typeof renderEffectsList === 'function') {
                const listDiv = masterRackWindow.element.querySelector('#effectsList-master');
                const controlsContainer = masterRackWindow.element.querySelector('#effectControlsContainer-master');
                if (listDiv && controlsContainer) {
                    renderEffectsList(null, 'master', listDiv, controlsContainer);
                } else { console.warn("Master effects rack UI elements not found for update."); }
            }
        } catch (error) { console.warn("[Main updateMasterEffectsRackUI] Error:", error); }
    },
    updateMidiLearnMappingsUI: () => {
        try {
            if (appServices.updateMidiLearnMappingsList) {
                appServices.updateMidiLearnMappingsList();
            } else {
                console.warn("[Main updateMidiLearnMappingsUI] updateMidiLearnMappingsList not available");
            }
        } catch (error) { console.warn("[Main updateMidiLearnMappingsUI] Error:", error); }
    },
    triggerCustomBackgroundUpload: () => {
        if (uiElementsCache.customBgInput) uiElementsCache.customBgInput.click();
        else console.warn("Custom background input element not found in cache.");
    },
    removeCustomDesktopBackground: removeCustomDesktopBackground,
    onPlaybackModeChange: (newMode) => {
        if (uiElementsCache.playbackModeToggleBtnGlobal) {
            uiElementsCache.playbackModeToggleBtnGlobal.textContent = newMode === 'timeline' ? 'Mode: Timeline' : 'Mode: Sequencer';
            uiElementsCache.playbackModeToggleBtnGlobal.classList.toggle('active', newMode === 'timeline');
        } else {
            console.warn("[Main appServices.onPlaybackModeChange] Playback mode toggle button not found in UI cache.");
        }
        if (appServices.renderTimeline && typeof appServices.renderTimeline === 'function') {
            appServices.renderTimeline(); 
        }
    },
    startMetronome: startMetronome,
    stopMetronome: stopMetronome,
    setMetronomeVolume: setMetronomeVolume,
    // Send Bus functions
    createSendBusInAudio,
    deleteSendBusFromAudio,
    addEffectToSendBus,
    removeEffectFromSendBus,
    reorderEffectInSendBus,
    updateSendBusEffectParam,
    setSendBusLevel,
    setSendBusMuted,
    connectTrackToSendBus,
    disconnectTrackFromSendBus,
    setTrackSendLevel,
    getSendBusNodes,
    getTrackSendNodes,
    getMasterEffectsBusInputNode,
    updateMixerWindow,
    getTempo: () => typeof Tone !== 'undefined' ? Tone.Transport.bpm.value : 120,
    loadSampleFile: async (e, trackId, trackType) => {
        if (!e || !e.target || !e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (!file) return;
        const track = getTrackByIdState(trackId);
        if (!track) return;
        try {
            const blob = await file.arrayBuffer();
            const audioBuffer = await Tone.context.decodeAudioData(blob);
            if (trackType === 'Sampler') {
                track.samplerAudioData = { fileName: file.name, audioBuffer };
                if (typeof drawWaveform === 'function' && typeof renderSamplePads === 'function' && typeof updateSliceEditorUI === 'function') {
                    drawWaveform(track); renderSamplePads(track); updateSliceEditorUI(track);
                }
            } else if (trackType === 'InstrumentSampler') {
                track.instrumentSamplerSettings = { fileName: file.name, audioBuffer };
                if (typeof drawInstrumentWaveform === 'function') {
                    drawInstrumentWaveform(track);
                }
            }
        } catch (error) {
            console.error(`[AppServices loadSampleFile] Error loading file ${file.name}:`, error);
            showSafeNotification(`Failed to load ${file.name}.`, 3000);
        }
    },
    loadSoundFromBrowserToTarget: async (e, trackId, trackType) => {
        if (!e || !e.target || !e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (!file) return;
        const track = getTrackByIdState(trackId);
        if (!track) return;
        try {
            const blob = await file.arrayBuffer();
            const audioBuffer = await Tone.context.decodeAudioData(blob);
            if (trackType === 'Sampler') {
                track.samplerAudioData = { fileName: file.name, audioBuffer };
                if (typeof drawWaveform === 'function' && typeof renderSamplePads === 'function' && typeof updateSliceEditorUI === 'function') {
                    drawWaveform(track); renderSamplePads(track); updateSliceEditorUI(track);
                }
            } else if (trackType === 'InstrumentSampler') {
                track.instrumentSamplerSettings = { fileName: file.name, audioBuffer };
                if (typeof drawInstrumentWaveform === 'function') {
                    drawInstrumentWaveform(track);
                }
            }
        } catch (error) {
            console.error(`[AppServices loadSoundFromBrowserToTarget] Error loading file ${file.name}:`, error);
            showSafeNotification(`Failed to load ${file.name}.`, 3000);
        }
    },

    // --- Missing appServices - Added to fix incomplete features ---
    getActiveTrackForInteraction: () => {
        const activeId = getActiveSequencerTrackIdState();
        if (activeId) {
            const track = getTrackByIdState(activeId);
            if (track) return track;
        }
        const tracks = getTracksState();
        return tracks && tracks.length > 0 ? tracks[0] : null;
    },

    openTrackSequencerWindow: (trackId, forceRedraw = false, savedState = null) => {
        openTrackSequencerWindow(trackId, forceRedraw, savedState);
    },

    openTrackInspectorWindow: (trackId, savedState = null) => {
        openTrackInspectorWindow(trackId, savedState);
    },

    openTrackEffectsRackWindow: (trackId, savedState = null) => {
        openTrackEffectsRackWindow(trackId, savedState);
    },

    showKeyboardShortcutsHelp: () => {
        showKeyboardShortcutsHelpWindow();
    },

    openMixerWindow: (savedState = null) => {
        openMixerWindow(savedState);
    },

    openSoundBrowserWindow: (savedState = null) => {
        openSoundBrowserWindow(savedState);
    },

    openGlobalControlsWindow: (onReadyCallback = null, savedState = null) => {
        openGlobalControlsWindow(onReadyCallback, savedState);
    },

    openMasterEffectsRackWindow: (savedState = null) => {
        openMasterEffectsRackWindow(savedState);
    },

    openTimelineWindow: (savedState = null) => {
        openTimelineWindow(savedState);
    },

    openSendEffectsWindow: (sendId, savedState = null) => {
        openSendEffectsWindow(sendId, savedState);
    },

    openTrackTemplatesWindow: (savedState = null) => {
        openTrackTemplatesWindow(savedState);
    },

    openAudioClipEditorWindow: (trackId, clipId, savedState = null) => {
        openAudioClipEditorWindow(trackId, clipId, savedState);
    }
};

// ============================================
// Missing appServices - Added to fix incomplete features
// ============================================

// Show notification function - wraps utility function with error handling
appServices.showNotification = (message, duration = 3000) => {
    try {
        if (typeof utilShowNotification === 'function') {
            utilShowNotification(message, duration);
        } else {
            console.warn("[AppServices showNotification] utilShowNotification not available");
        }
    } catch (e) {
        console.warn("[AppServices showNotification] Error:", e);
    }
};

// Create file input for MIDI import - dynamically creates and triggers file input
appServices.createFileInputForMidiImport = () => {
    try {
        const existingInput = document.getElementById('midiFileInputImport');
        if (existingInput) existingInput.remove();
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'midiFileInputImport';
        fileInput.accept = '.mid,.midi,audio/midi,audio/x-midi';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            
            try {
                const arrayBuffer = await file.arrayBuffer();
                
                // Parse MIDI file and import notes
                const midiData = parseMidiFile(new Uint8Array(arrayBuffer));
                
                if (!midiData || midiData.tracks.length === 0) {
                    appServices.showNotification(`No MIDI data found in "${file.name}".`, 3000);
                    return;
                }
                
                // Import MIDI data into the DAW
                const result = await importMidiDataToTracks(midiData);
                
                if (result && result.totalNotes > 0) {
                    appServices.showNotification(`Imported ${result.totalNotes} notes into ${result.tracksCreated} track(s) from "${file.name}".`, 4000);
                } else {
                    appServices.showNotification(`No notes found in "${file.name}".`, 3000);
                }
            } catch (err) {
                console.error("[AppServices createFileInputForMidiImport] Error reading file:", err);
                appServices.showNotification(`Failed to read MIDI file: ${err.message}`, 5000);
            }
            
            fileInput.remove();
        });
        
        fileInput.click();
    } catch (error) {
        console.error("[AppServices createFileInputForMidiImport] Error:", error);
        throw error;
    }
};

// MIDI file parser - parses Standard MIDI File format 0 or 1
function parseMidiFile(data) {
    // Helper to read variable-length quantity
    function readVLQ(buffer, offset) {
        let value = 0;
        let bytesRead = 0;
        while (offset < buffer.length) {
            const byte = buffer[offset++];
            bytesRead++;
            value = (value << 7) | (byte & 0x7F);
            if (!(byte & 0x80)) break;
        }
        return { value, bytesRead };
    }
    
    // Helper to read 32-bit big-endian
    function readInt32(buffer, offset) {
        return (buffer[offset] << 24) | (buffer[offset + 1] << 16) | 
               (buffer[offset + 2] << 8) | buffer[offset + 3];
    }
    
    // Helper to read 16-bit big-endian
    function readInt16(buffer, offset) {
        return (buffer[offset] << 8) | buffer[offset + 1];
    }
    
    // Verify header
    const header = String.fromCharCode(...data.slice(0, 4));
    if (header !== 'MThd') {
        throw new Error('Invalid MIDI file: missing MThd header');
    }
    
    const headerLength = readInt32(data, 4);
    const format = readInt16(data, 8);
    const numTracks = readInt16(data, 10);
    const division = readInt16(data, 12);
    
    // Get ticks per quarter note (if bit 15 is set, it's SMPTE, otherwise it's ticks per quarter)
    let ticksPerQuarter = division;
    if (division & 0x8000) {
        // SMPTE format - use default 480
        ticksPerQuarter = 480;
    }
    
    const tracks = [];
    let offset = 8 + headerLength;
    
    for (let t = 0; t < numTracks && offset < data.length; t++) {
        const trackHeader = String.fromCharCode(...data.slice(offset, offset + 4));
        if (trackHeader !== 'MTrk') break;
        
        offset += 4;
        const trackLength = readInt32(data, offset);
        offset += 4;
        
        const trackEnd = offset + trackLength;
        const events = [];
        let currentTime = 0;
        let runningStatus = 0;
        
        while (offset < trackEnd) {
            // Read delta time
            const deltaResult = readVLQ(data, offset);
            currentTime += deltaResult.value;
            offset += deltaResult.bytesRead;
            
            if (offset >= data.length) break;
            
            let status = data[offset];
            
            // Handle running status
            if (!(status & 0x80)) {
                // Data byte, use last running status
                status = runningStatus;
            } else {
                offset++;
                if (status < 0xF0) {
                    runningStatus = status;
                }
            }
            
            // Parse events based on status
            if (status === 0xFF) {
                // Meta event
                const metaType = data[offset++];
                const lengthResult = readVLQ(data, offset);
                offset += lengthResult.bytesRead;
                
                if (metaType === 0x51 && lengthResult.value === 3) {
                    // Tempo change
                    const tempo = ((data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2]);
                    events.push({ type: 'tempo', time: currentTime, tempo });
                }
                offset += lengthResult.value;
            } else if ((status & 0xF0) === 0x90) {
                // Note On (or Note Off with velocity 0)
                const channel = status & 0x0F;
                const note = data[offset++];
                const velocity = data[offset++];
                
                if (velocity > 0) {
                    events.push({ type: 'noteOn', time: currentTime, channel, note, velocity });
                } else {
                    events.push({ type: 'noteOff', time: currentTime, channel, note, velocity: 0 });
                }
            } else if ((status & 0xF0) === 0x80) {
                // Note Off
                const channel = status & 0x0F;
                const note = data[offset++];
                const velocity = data[offset++];
                events.push({ type: 'noteOff', time: currentTime, channel, note, velocity });
            } else if ((status & 0xF0) === 0xA0) {
                // Aftertouch
                offset += 2;
            } else if ((status & 0xF0) === 0xB0) {
                // Control Change
                offset += 2;
            } else if ((status & 0xF0) === 0xC0) {
                // Program Change
                offset++;
            } else if ((status & 0xF0) === 0xD0) {
                // Channel Aftertouch
                offset++;
            } else if ((status & 0xF0) === 0xE0) {
                // Pitch Bend
                offset += 2;
            } else if (status === 0xF0 || status === 0xF7) {
                // SysEx - skip
                const lengthResult = readVLQ(data, offset);
                offset += lengthResult.bytesRead + lengthResult.value;
            } else if (status === 0xFE) {
                // Real time - skip
            } else {
                // Unknown - try to recover
                if (offset < data.length && data[offset] < 0x80) {
                    offset++;
                }
            }
            
            // Check for end of track
            if (offset < trackEnd && data[offset] === 0xFF && data[offset + 1] === 0x2F) {
                offset += 3;
                break;
            }
        }
        
        tracks.push({ events });
        offset = trackEnd;
    }
    
    return { tracks, ticksPerQuarter };
}

// Import parsed MIDI data into DAW tracks
async function importMidiDataToTracks(midiData) {
    const { tracks: midiTracks, ticksPerQuarter } = midiData;
    const { addTrackToStateInternal, getTracksState, showNotification } = await import('./state.js');
    
    // Collect all note events across all tracks
    const allNoteEvents = [];
    let defaultTempo = 500000; // 120 BPM default
    
    for (const midiTrack of midiTracks) {
        for (const event of midiTrack.events) {
            if (event.type === 'tempo') {
                defaultTempo = event.tempo;
            } else if (event.type === 'noteOn') {
                allNoteEvents.push(event);
            }
        }
    }
    
    if (allNoteEvents.length === 0) {
        return { totalNotes: 0, tracksCreated: 0 };
    }
    
    // Group notes by channel
    const channelNotes = {};
    for (const noteEvent of allNoteEvents) {
        const ch = noteEvent.channel;
        if (!channelNotes[ch]) channelNotes[ch] = [];
        channelNotes[ch].push(noteEvent);
    }
    
    // Create tracks per channel (or consolidate if just one)
    const existingTracks = getTracksState() || [];
    let tracksCreated = 0;
    let totalNotes = 0;
    
    for (const [channel, notes] of Object.entries(channelNotes)) {
        if (notes.length === 0) continue;
        
        // Determine track type based on note range
        const notesInChannel = notes.filter(n => n.type === 'noteOn');
        const noteNumbers = notesInChannel.map(n => n.note);
        const minNote = Math.min(...noteNumbers);
        const maxNote = Math.max(...noteNumbers);
        
        // Determine if drum track (notes 36-43 are GM drums) or melodic
        const isDrumTrack = (minNote >= 35 && maxNote <= 57) || (minNote >= 36 && maxNote <= 43);
        const trackType = isDrumTrack ? 'DrumSampler' : 'Synth';
        
        // Create new track
        const trackName = isDrumTrack ? `Drums (Ch ${parseInt(channel) + 1})` : `MIDI (Ch ${parseInt(channel) + 1})`;
        const newTrack = await addTrackToStateInternal(trackType, { name: trackName });
        
        if (!newTrack) continue;
        tracksCreated++;
        
        // Get or create a sequence for the track
        let sequence = newTrack.getActiveSequence ? newTrack.getActiveSequence() : null;
        if (!sequence && newTrack.sequences && newTrack.sequences.length > 0) {
            sequence = newTrack.sequences[0];
        }
        
        if (!sequence) continue;
        
        // Convert note times to steps (assuming 16 steps per bar at 480 ticks per quarter)
        const stepsPerQuarter = 4; // 16th notes
        const ticksPerStep = ticksPerQuarter / stepsPerQuarter;
        const stepsPerBar = 16;
        
        // Calculate the maximum time to determine sequence length
        const maxTicks = Math.max(...notesInChannel.map(n => n.time));
        const estimatedBars = Math.ceil(maxTicks / (ticksPerQuarter * 4)) + 1;
        
        // Process each note
        for (const noteEvent of notesInChannel) {
            const absoluteTicks = noteEvent.time;
            const step = Math.floor(absoluteTicks / ticksPerStep);
            const bar = Math.floor(step / stepsPerBar);
            const stepInBar = step % stepsPerBar;
            
            // Determine row based on note number
            let row;
            if (isDrumTrack) {
                // Map drum notes to rows 0-7
                row = noteEvent.note - 36;
                if (row < 0) row = 0;
                if (row > 7) row = 7;
            } else {
                // Map melodic notes to rows (C3 = row 0 as base)
                const baseNote = 48; // C3
                row = noteEvent.note - baseNote;
                if (row < 0) row = 0;
                if (row > 15) row = 15;
            }
            
            // Find corresponding note-off event
            const noteOffEvents = allNoteEvents.filter(n => 
                n.type === 'noteOff' && 
                n.note === noteEvent.note && 
                n.channel === noteEvent.channel &&
                n.time > noteEvent.time
            );
            
            let noteLength = 1;
            if (noteOffEvents.length > 0) {
                const firstOff = noteOffEvents.reduce(( earliest, e) => 
                    e.time < earliest.time ? e : earliest
                );
                const offStep = Math.floor(firstOff.time / ticksPerStep);
                noteLength = Math.max(1, offStep - step);
            }
            
            // Set the cell in the sequence data
            if (sequence.data && sequence.data[row]) {
                // Ensure column exists
                while (sequence.data[row].length <= stepInBar + bar * stepsPerBar) {
                    sequence.data[row].push(null);
                }
                
                sequence.data[row][stepInBar + bar * stepsPerBar] = {
                    active: true,
                    velocity: noteEvent.velocity / 127,
                    length: noteLength
                };
                totalNotes++;
            }
        }
        
        // Notify UI to update
        if (appServices.updateTrackUI) {
            appServices.updateTrackUI(newTrack.id, 'sequencerContentChanged');
        }
    }
    
    return { totalNotes, tracksCreated };
}

// Audio functions exposed from audio.js
appServices.initAudioContextAndMasterMeter = initAudioContextAndMasterMeter;
appServices.clearAllMasterEffectNodes = clearAllMasterEffectNodes;
appServices.addMasterEffectToAudio = addMasterEffectToAudio;
appServices.getActualMasterGainNode = getActualMasterGainNode;

// --- Internal helpers (avoid name collisions) ---
function handleTrackUIUpdate(trackId, reason, detail) {
    if (!getTrackByIdState) { console.warn("[Main UI Update] getTrackByIdState service not available."); return; }
    const track = getTrackByIdState(trackId);
    if (!track) {
        console.warn(`[Main UI Update] Track ${trackId} not found for reason: ${reason}`);
        return;
    }

    const getOpenWindowElement = (winId) => {
        if (!getWindowByIdState) return null;
        const win = getWindowByIdState(winId);
        return (win?.element && !win.isMinimized) ? win.element : null;
    };

    const inspectorElement = getOpenWindowElement(`trackInspector-${trackId}`);
    const effectsRackElement = getOpenWindowElement(`effectsRack-${trackId}`);
    const sequencerElement = getOpenWindowElement(`sequencerWin-${trackId}`);
    const mixerElement = getOpenWindowElement('mixer');

    try {
        switch(reason) {
            case 'muteChanged':
            case 'soloChanged':
            case 'armChanged':
                if (inspectorElement) {
                    const muteBtn = inspectorElement.querySelector(`#muteBtn-${track.id}`);
                    if (muteBtn) muteBtn.classList.toggle('muted', track.isMuted);
                    const soloBtn = inspectorElement.querySelector(`#soloBtn-${track.id}`);
                    if (soloBtn) soloBtn.classList.toggle('soloed', getSoloedTrackIdState() === track.id);
                    const armBtn = inspectorElement.querySelector(`#armInputBtn-${track.id}`);
                    if (armBtn) armBtn.classList.toggle('armed', getArmedTrackIdState() === track.id);
                }
                if (mixerElement && typeof updateMixerWindow === 'function') updateMixerWindow();
                break;
            case 'effectsListChanged':
                 if (effectsRackElement && typeof renderEffectsList === 'function') {
                    const listDiv = effectsRackElement.querySelector(`#effectsList-${track.id}`);
                    const controlsContainer = effectsRackElement.querySelector(`#effectControlsContainer-${track.id}`);
                    if (listDiv && controlsContainer) {
                        if (typeof renderEffectsList === 'function') renderEffectsList(track, 'track', listDiv, controlsContainer);
                    }
                 }
                break;
            case 'samplerLoaded':
            case 'instrumentSamplerLoaded':
                if (inspectorElement) {
                    if (track.type === 'Sampler' && typeof drawWaveform === 'function' && typeof renderSamplePads === 'function' && typeof updateSliceEditorUI === 'function') {
                        drawWaveform(track); renderSamplePads(track); updateSliceEditorUI(track);
                    } else if (track.type === 'InstrumentSampler' && typeof drawInstrumentWaveform === 'function') {
                        drawInstrumentWaveform(track);
                    }
                    const dzContainerId = track.type === 'Sampler' ? `#dropZoneContainer-${track.id}-sampler` : `#dropZoneContainer-${track.id}-instrumentsampler`;
                    const dzContainer = inspectorElement.querySelector(dzContainerId);
                    if(dzContainer) {
                        const audioData = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                        const inputId = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;
                        dzContainer.innerHTML = createDropZoneHTML(track.id, inputId, track.type, null, {originalFileName: audioData?.fileName, status: 'loaded'});
                        const fileInputEl = dzContainer.querySelector(`#${inputId}`);
                        const loadFn = appServices.loadSampleFile;
                        if (fileInputEl && loadFn) fileInputEl.onchange = (e) => loadFn(e, track.id, track.type);
                        const newDropZoneDiv = dzContainer.querySelector('.drop-zone');
                        if (newDropZoneDiv && typeof setupGenericDropZoneListeners === 'function') {
                            setupGenericDropZoneListeners(newDropZoneDiv, track.id, track.type, null, appServices.loadSoundFromBrowserToTarget, loadFn, appServices.getTrackById);
                        }
                    }
                }
                break;
            case 'drumPadLoaded':
                 if (inspectorElement && typeof updateDrumPadControlsUI === 'function' && typeof renderDrumSamplerPads === 'function') {
                    updateDrumPadControlsUI(track); renderDrumSamplerPads(track);
                 }
                break;
            case 'sequencerContentChanged':
                if (sequencerElement && typeof openTrackSequencerWindow === 'function') {
                    const seqWinInstance = getWindowByIdState(`sequencerWin-${trackId}`);
                    if(seqWinInstance) openTrackSequencerWindow(trackId, true, seqWinInstance.options);
                }
                if (appServices.renderTimeline && typeof appServices.renderTimeline === 'function') appServices.renderTimeline();
                break;
            case 'sampleLoadError':
                if (inspectorElement) {
                    console.warn(`[Main UI Update] sampleLoadError for track ${trackId}, detail: ${detail}. Inspector UI update for dropzone needed.`);
                    if (track.type === 'DrumSampler' && typeof detail === 'number' && typeof updateDrumPadControlsUI === 'function') {
                        updateDrumPadControlsUI(track); 
                    } else if ((track.type === 'Sampler' || track.type === 'InstrumentSampler')) {
                        const dzKey = track.type === 'Sampler' ? 'sampler' : 'instrumentsampler';
                        const dzContainer = inspectorElement.querySelector(`#dropZoneContainer-${track.id}-${dzKey}`);
                        const audioDataSource = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                        const inputIdForError = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;

                        if(dzContainer && audioDataSource) {
                            dzContainer.innerHTML = createDropZoneHTML(track.id, inputIdForError, track.type, null, {originalFileName: audioDataSource.fileName, status: 'error'});
                            const fileInputEl = dzContainer.querySelector(`#${inputIdForError}`);
                            const loadFn = appServices.loadSampleFile;
                            if (fileInputEl && loadFn) fileInputEl.onchange = (e) => loadFn(e, track.id, track.type);
                            const newDropZoneDiv = dzContainer.querySelector('.drop-zone');
                            if (newDropZoneDiv && typeof setupGenericDropZoneListeners === 'function') {
                               setupGenericDropZoneListeners(newDropZoneDiv, track.id, track.type, null, appServices.loadSoundFromBrowserToTarget, loadFn, appServices.getTrackById);
                            }
                        }
                    }
                }
                break;
            default:
                console.warn(`[Main UI Update] Unhandled reason: ${reason} for track ${trackId}`);
        }
    } catch (error) {
        console.error(`[Main handleTrackUIUpdate] Error updating UI for track ${trackId}, reason ${reason}:`, error);
    }
}

function showSafeNotification(message, duration = 3000) {
    try {
        utilShowNotification(message, duration);
    } catch (e) {
        console.warn("[showSafeNotification] Failed to show notification:", e);
    }
}

async function initializeSnugOS() {

    try {
        // Cache UI elements - including the fixed global controls bar
        Object.keys(uiElementsCache).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                 uiElementsCache[key] = element;
            } else {
                if (['desktop', 'taskbar', 'notification-area', 'modal-container'].includes(key)) {
                    console.warn(`[Main initializeSnugOS] Critical UI Element ID "${key}" not found in DOM.`);
                }
            }
        });

        // The global controls are now in a fixed bar, not a window
        // Wire them up directly
        const globalElements = {
            playBtnGlobal: document.getElementById('playBtnGlobal'),
            recordBtnGlobal: document.getElementById('recordBtnGlobal'),
            stopBtnGlobal: document.getElementById('stopBtnGlobal'),
            tempoGlobalInput: document.getElementById('tempoGlobalInput'),
            midiInputSelectGlobal: document.getElementById('midiInputSelectGlobal'),
            masterMeterContainerGlobal: document.getElementById('masterMeterContainerGlobal'),
            masterMeterBarGlobal: document.getElementById('masterMeterBarGlobal'),
            midiIndicatorGlobal: document.getElementById('midiIndicatorGlobal'),
            keyboardIndicatorGlobal: document.getElementById('keyboardIndicatorGlobal'),
            playbackModeToggleBtnGlobal: document.getElementById('playbackModeToggleBtnGlobal'),
            tapBtnGlobal: document.getElementById('tapBtnGlobal'),
            metronomeBtnGlobal: document.getElementById('metronomeBtnGlobal')
        };
        
        // Add to cache
        Object.assign(uiElementsCache, globalElements);
        

        try {
            const effectsRegistry = await import('./effectsRegistry.js');
            if (appServices.effectsRegistryAccess) {
                appServices.effectsRegistryAccess.AVAILABLE_EFFECTS = effectsRegistry.AVAILABLE_EFFECTS || {};
                appServices.effectsRegistryAccess.getEffectParamDefinitions = effectsRegistry.getEffectParamDefinitions || (() => []);
                appServices.effectsRegistryAccess.getEffectDefaultParams = effectsRegistry.getEffectDefaultParams || (() => ({}));
                appServices.effectsRegistryAccess.synthEngineControlDefinitions = effectsRegistry.synthEngineControlDefinitions || {};
            } else {
                console.error("[Main initializeSnugOS] appServices.effectsRegistryAccess is not defined before assigning registry.");
            }
        } catch (registryError) {
            console.error("[Main initializeSnugOS] Failed to import effectsRegistry.js:", registryError);
            showSafeNotification("Critical error: Failed to load audio effects definitions.", 5000);
        }

        if (uiElementsCache.customBgInput) {
            uiElementsCache.customBgInput.addEventListener('change', handleCustomBackgroundUpload);
        }
        // Restore saved background (image or video)
        await restoreDesktopBackground();

        if (typeof initializeStateModule === 'function') initializeStateModule(appServices); else console.error("initializeStateModule is not a function");
        if (typeof initializeUIModule === 'function') initializeUIModule(appServices); else console.error("initializeUIModule is not a function");
        if (typeof initializeAudioModule === 'function') initializeAudioModule(appServices); else console.error("initializeAudioModule is not a function");
        if (typeof initializeEventHandlersModule === 'function') initializeEventHandlersModule(appServices); else console.error("initializeEventHandlersModule is not a function");

        if (typeof initializePrimaryEventListeners === 'function') {
             initializePrimaryEventListeners(appServices);
        } else { console.error("initializePrimaryEventListeners is not a function");}

        // Attach global controls event listeners directly to the fixed bar
        if (typeof attachGlobalControlEvents === 'function') {
            attachGlobalControlEvents(globalElements);
        } else {
            console.error("attachGlobalControlEvents is not a function");
        }
        
        if (typeof setupMIDI === 'function') setupMIDI(); else console.error("setupMIDI is not a function");

        if (Constants.soundLibraries && typeof fetchSoundLibrary === 'function') {
            Object.entries(Constants.soundLibraries).forEach(([name, url]) => fetchSoundLibrary(name, url, true)); 
        }

        if (appServices.openTimelineWindow && typeof appServices.openTimelineWindow === 'function') {
            appServices.openTimelineWindow();
        } else { console.warn("appServices.openTimelineWindow not available to open by default."); }

        requestAnimationFrame(updateMetersLoop);
        if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI(null, null);
        if (appServices.onPlaybackModeChange && typeof getPlaybackModeState === 'function') {
            appServices.onPlaybackModeChange(getPlaybackModeState());
        }

        showSafeNotification(`Welcome to SnugOS ${Constants.APP_VERSION}!`, 2500);

    } catch (initError) {
        console.error("CRITICAL ERROR during SnugOS Initialization:", initError);
        showSafeNotification("A critical error occurred during application startup. Please refresh.", 7000);
        const body = document.body;
        if (body) {
            body.innerHTML = `<div style="padding: 20px; text-align: center; font-family: sans-serif; color: #ccc; background-color: #101010; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;"><h1>Initialization Error</h1><p>SnugOS could not start due to a critical error. Please check the console for details and try refreshing the page.</p><p style="font-size: 0.8em; margin-top: 20px;">Error: ${initError.message}</p></div>`;
        }
    }
}

function updateMetersLoop() {
    try {
        if (typeof updateMeters === 'function') {
            const mixerWindow = getWindowByIdState ? getWindowByIdState('mixer') : null;
            const mixerMasterMeterBar = mixerWindow?.element && !mixerWindow.isMinimized ? mixerWindow.element.querySelector('#mixerMasterMeterBar') : null;
            const tracks = getTracksState ? getTracksState() : [];
            updateMeters(uiElementsCache.masterMeterBarGlobal, mixerMasterMeterBar, tracks);
        }
        if (typeof updatePlayheadPosition === 'function') {
            updatePlayheadPosition();
        }
    } catch (loopError) {
        console.warn("[Main updateMetersLoop] Error in UI update loop:", loopError);
    }
    requestAnimationFrame(updateMetersLoop);
}

function applyDesktopBackground(sourceUrl, bgType = 'image') {
    const desktop = uiElementsCache.desktop;
    const videoBg = document.getElementById('desktopVideoBg');
    
    if (!desktop) {
        console.warn("Desktop element not found in cache for applying background.");
        return;
    }
    
    try {
        // Reset both image and video backgrounds
        desktop.style.backgroundImage = '';
        if (videoBg) {
            videoBg.style.display = 'none';
            videoBg.pause();
            videoBg.src = '';
        }
        
        if (bgType === 'image' && sourceUrl) {
            // Image background
            desktop.style.backgroundImage = `url('${sourceUrl}')`;
            desktop.style.backgroundSize = 'cover';
            desktop.style.backgroundPosition = 'center center';
            desktop.style.backgroundRepeat = 'no-repeat';
            desktop.style.backgroundColor = '';
        } else if (bgType === 'video' && sourceUrl && videoBg) {
            // Video background
            videoBg.src = sourceUrl;
            videoBg.style.display = 'block';
            videoBg.play().catch(e => console.warn("Video autoplay prevented:", e));
            desktop.style.backgroundColor = '';
        } else {
            // No background - use default
            desktop.style.backgroundColor = Constants.defaultDesktopBg || '#101010';
        }
    } catch (e) {
        console.error("Error applying desktop background style:", e);
    }
}

function removeCustomDesktopBackground() {
    const desktop = uiElementsCache?.desktop;
    const videoBg = document.getElementById('desktopVideoBg');
    
    try {
        // Clear localStorage
        localStorage.removeItem(DESKTOP_BACKGROUND_KEY);
        localStorage.removeItem(DESKTOP_BG_TYPE_KEY);
        
        // Clear desktop background styles
        if (desktop) {
            desktop.style.backgroundImage = '';
            desktop.style.backgroundColor = Constants.defaultDesktopBg || '#101010';
        }
        
        // Stop and clear video
        if (videoBg) {
            videoBg.pause();
            videoBg.src = '';
            videoBg.style.display = 'none';
        }
        
        // Remove from db if exists
        bgDbDeleteAudio('desktopVideo').catch(() => {});
        
        console.log("[removeCustomDesktopBackground] Custom background removed.");
    } catch (e) {
        console.error("Error removing custom desktop background:", e);
    }
}

// Handle custom background upload from file input
async function handleCustomBackgroundUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
        const isVideo = file.type.startsWith('video/');
        
        if (isVideo) {
            // Store video blob for persistence
            await bgDbStoreAudio('desktopVideo', file);
            localStorage.setItem(DESKTOP_BG_TYPE_KEY, 'video');
            const objectUrl = URL.createObjectURL(file);
            applyDesktopBackground(objectUrl, 'video');
            appServices.showNotification('Video background applied.', 2000);
        } else {
            // Handle image - read as data URL for localStorage persistence
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target?.result;
                if (imageUrl) {
                    localStorage.setItem(DESKTOP_BACKGROUND_KEY, imageUrl);
                    localStorage.setItem(DESKTOP_BG_TYPE_KEY, 'image');
                    applyDesktopBackground(imageUrl, 'image');
                    appServices.showNotification('Image background applied.', 2000);
                }
            };
            reader.onerror = () => {
                appServices.showNotification('Failed to read image file.', 3000);
            };
            reader.readAsDataURL(file);
        }
    } catch (err) {
        console.error("[Main handleCustomBackgroundUpload] Error:", err);
        appServices.showNotification('Failed to apply background.', 3000);
    }
    
    // Reset input so same file can be selected again
    e.target.value = '';
}

// Restore background on load
async function restoreDesktopBackground() {
    const bgType = localStorage.getItem(DESKTOP_BG_TYPE_KEY);
    
    if (bgType === 'video') {
        try {
            const videoBlob = await bgDbGetAudio('desktopVideo');
            if (videoBlob) {
                const objectUrl = URL.createObjectURL(videoBlob);
                applyDesktopBackground(objectUrl, 'video');
            }
        } catch (e) {
            console.warn("Could not restore video background:", e);
        }
    } else if (bgType === 'image' || !bgType) {
        const imageUrl = localStorage.getItem(DESKTOP_BACKGROUND_KEY);
        if (imageUrl) {
            applyDesktopBackground(imageUrl, 'image');
        }
    }
}


// --- Expose appServices globally for UI and Audio modules ---
window.appServices = appServices;

// --- Global Event Listeners ---
if (typeof window !== 'undefined') {
window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    const tracksExist = getTracksState && getTracksState().length > 0;
    const undoStackExists = getUndoStackState && getUndoStackState().length > 0;

    if (tracksExist || undoStackExists) {
        e.preventDefault(); 
        e.returnValue = ''; 
        return "You have unsaved changes. Are you sure you want to leave?"; 
    }
});
}
